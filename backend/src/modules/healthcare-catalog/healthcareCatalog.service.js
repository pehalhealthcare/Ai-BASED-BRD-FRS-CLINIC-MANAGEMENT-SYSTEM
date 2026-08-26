const xlsx = require('xlsx');
const mongoose = require('mongoose');
const CatalogCategory = require('./catalogCategory.model');
const GlobalLabTest = require('./globalLabTest.model');
const GlobalMedicine = require('./globalMedicine.model');
const GlobalParameter = require('./globalParameter.model');
const GlobalLaboratoryUnit = require('./globalLaboratoryUnit.model');
const ReferenceRangeCondition = require('./referenceRangeCondition.model');
const InvestigationParameter = require('./investigationParameter.model');
const PanelInvestigation = require('./panelInvestigation.model');
const ProfileComposition = require('./profileComposition.model');
const Counter = require('../counters/counter.model');
const { createAuditLog } = require('../audit/audit.service');

// Generate unique sequential IDs (LAB-000001, MED-000001, BRD-000001)
const getNextGlobalId = async (prefix, counterKey) => {
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(6, '0')}`;
};

// String normalization for clean duplicate detection
const normalizeString = (str) => {
  if (!str) return '';
  return str.toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

const runWithTransactionSession = async (fn) => {
  let dbSession;
  try {
    dbSession = await mongoose.startSession();
    dbSession.startTransaction();
  } catch (err) {
    return fn(null);
  }

  try {
    const result = await fn(dbSession);
    await dbSession.commitTransaction();
    dbSession.endSession();
    return result;
  } catch (error) {
    try {
      await dbSession.abortTransaction();
      dbSession.endSession();
    } catch (_err) {}
    
    if (error.message?.includes('replica set') || error.errmsg?.includes('replica set') || error.code === 20) {
      return fn(null);
    }
    throw error;
  }
};

// Levenshtein distance for fuzzy matching
const getLevenshteinDistance = (a, b) => {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
};

const getSimilarity = (a, b) => {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  const dist = getLevenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - dist / maxLen;
};

// Category operations
const getCategories = async (type) => {
  const filter = {};
  if (type) filter.type = type;
  return CatalogCategory.find(filter).sort({ name: 1 });
};

const createCategory = async (payload, actorUserId) => {
  const category = await CatalogCategory.create(payload);
  await createAuditLog({
    actorUserId,
    action: 'CREATE_CATEGORY',
    entity: 'CatalogCategory',
    entityId: category._id,
    metadata: { newValues: category },
    status: 'SUCCESS'
  });
  return category;
};

// Lab Test duplication check
const checkLabTestDuplicate = async (name, alternateNames = [], shortName = '', investigationType = 'ATOMIC_TEST') => {
  const normName = normalizeString(name);
  const normShort = normalizeString(shortName);
  const normAlts = alternateNames.map(a => normalizeString(a)).filter(Boolean);

  // 1. Check exact match
  const exactMatch = await GlobalLabTest.findOne({
    investigationType,
    $or: [
      { name: new RegExp(`^${name.trim()}$`, 'i') },
      { shortName: new RegExp(`^${shortName.trim()}$`, 'i') },
      { alternateNames: { $in: [new RegExp(`^${name.trim()}$`, 'i')] } }
    ]
  }).populate('category');

  if (exactMatch) {
    return { type: 'EXACT', match: exactMatch };
  }

  // 2. Perform fuzzy & synonym check on existing records
  const allTests = await GlobalLabTest.find({ investigationType }).populate('category');
  for (const test of allTests) {
    // Check similarity with test name
    if (getSimilarity(test.name, name) > 0.8) {
      return { type: 'FUZZY', match: test };
    }
    if (shortName && test.shortName && getSimilarity(test.shortName, shortName) > 0.8) {
      return { type: 'FUZZY', match: test };
    }
    // Check alternate names
    for (const alt of test.alternateNames) {
      if (getSimilarity(alt, name) > 0.8) {
        return { type: 'FUZZY', match: test };
      }
    }
  }

  return null;
};

// Lab Test management
const getLabTests = async (query = {}) => {
  const { search, category, department, status, investigationType, source, page = 1, limit = 10 } = query;
  const filter = {};

  if (category) filter.category = category;
  if (department) filter.department = department;
  if (status) filter.isActive = status === 'Active';
  if (source) filter.source = source;

  if (investigationType) {
    if (investigationType.includes(',')) {
      filter.investigationType = { $in: investigationType.split(',').map(s => s.trim()) };
    } else {
      filter.investigationType = investigationType;
    }
  }

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { shortName: new RegExp(search, 'i') },
      { alternateNames: new RegExp(search, 'i') },
      { globalId: new RegExp(search, 'i') }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await GlobalLabTest.countDocuments(filter);
  const items = await GlobalLabTest.find(filter)
    .populate('category')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  return { total, items, page, limit };
};

const createLabTest = async (payload, actorUserId) => {
  const { parameters, investigations, composition, ...testData } = payload;

  return runWithTransactionSession(async (session) => {
    const globalId = await getNextGlobalId('LAB', 'global_lab_test');
    const source = payload.source || (['PANEL', 'PROFILE'].includes(payload.investigationType) ? 'USER_CREATED' : 'SYSTEM_CATALOGUE');
    
    // Create the test record inside the session
    const [test] = await GlobalLabTest.create([{ ...testData, globalId, source }], session ? { session } : {});

    if (Array.isArray(parameters) && test.investigationType === 'ATOMIC_TEST') {
      for (let idx = 0; idx < parameters.length; idx++) {
        const p = parameters[idx];
        await InvestigationParameter.create([{
          investigationId: test._id,
          parameterId: p.parameterId || p._id,
          isRequired: p.isRequired !== false,
          displayOrder: idx + 1
        }], session ? { session } : {});
      }
    } else if (Array.isArray(investigations) && test.investigationType === 'PANEL') {
      const seenIds = new Set();
      for (let idx = 0; idx < investigations.length; idx++) {
        const inv = investigations[idx];
        const invId = String(inv.investigationId || inv._id);
        
        if (seenIds.has(invId)) {
          throw new Error('One or more investigations are already associated with this panel.');
        }
        seenIds.add(invId);

        const dbInv = session
          ? await GlobalLabTest.findById(invId).session(session)
          : await GlobalLabTest.findById(invId);
        if (!dbInv) {
          throw new Error('One or more selected investigations could not be found.');
        }
        if (!dbInv.isActive) {
          throw new Error(`Selected investigation ${dbInv.name} is not active.`);
        }
        if (dbInv.investigationType !== 'ATOMIC_TEST') {
          throw new Error(`Selected item ${dbInv.name} is not an Investigation/Test.`);
        }

        await PanelInvestigation.create([{
          panelId: test._id,
          investigationId: invId,
          isRequired: inv.isRequired !== false,
          displayOrder: idx + 1
        }], session ? { session } : {});
      }
    } else if (Array.isArray(composition) && test.investigationType === 'PROFILE') {
      const seenPanels = new Set();
      const seenInvs = new Set();
      for (let idx = 0; idx < composition.length; idx++) {
        const c = composition[idx];
        const panelId = c.panelId ? String(c.panelId) : null;
        const invId = c.investigationId ? String(c.investigationId) : null;

        if (panelId) {
          if (seenPanels.has(panelId)) {
            throw new Error('One or more panels/investigations are already associated with this profile.');
          }
          seenPanels.add(panelId);
          
          const dbPanel = session
            ? await GlobalLabTest.findById(panelId).session(session)
            : await GlobalLabTest.findById(panelId);
          if (!dbPanel) {
            throw new Error('One or more selected panels could not be found.');
          }
          if (!dbPanel.isActive) {
            throw new Error(`Selected panel ${dbPanel.name} is not active.`);
          }
          if (dbPanel.investigationType !== 'PANEL') {
            throw new Error(`Selected item ${dbPanel.name} is not a Panel.`);
          }
        }

        if (invId) {
          if (seenInvs.has(invId)) {
            throw new Error('One or more panels/investigations are already associated with this profile.');
          }
          seenInvs.add(invId);

          const dbInv = session
            ? await GlobalLabTest.findById(invId).session(session)
            : await GlobalLabTest.findById(invId);
          if (!dbInv) {
            throw new Error('One or more selected investigations could not be found.');
          }
          if (!dbInv.isActive) {
            throw new Error(`Selected investigation ${dbInv.name} is not active.`);
          }
          if (dbInv.investigationType !== 'ATOMIC_TEST') {
            throw new Error(`Selected item ${dbInv.name} is not an Investigation/Test.`);
          }
        }

        await ProfileComposition.create([{
          profileId: test._id,
          panelId,
          investigationId: invId,
          isRequired: c.isRequired !== false,
          displayOrder: idx + 1
        }], session ? { session } : {});
      }
    }

    await createAuditLog({
      actorUserId,
      action: 'CREATE_LAB_TEST',
      entity: 'GlobalLabTest',
      entityId: test._id,
      metadata: { newValues: test },
      status: 'SUCCESS'
    });

    return test;
  });
};

const updateLabTest = async (id, payload, actorUserId) => {
  const { parameters, investigations, composition, ...testData } = payload;

  return runWithTransactionSession(async (session) => {
    const oldTest = session
      ? await GlobalLabTest.findById(id).session(session)
      : await GlobalLabTest.findById(id);
    const updatedTest = await GlobalLabTest.findByIdAndUpdate(id, testData, { new: true, session: session || undefined }).populate('category');

    if (Array.isArray(parameters) && updatedTest.investigationType === 'ATOMIC_TEST') {
      if (session) {
        await InvestigationParameter.deleteMany({ investigationId: id }, { session });
      } else {
        await InvestigationParameter.deleteMany({ investigationId: id });
      }
      for (let idx = 0; idx < parameters.length; idx++) {
        const p = parameters[idx];
        await InvestigationParameter.create([{
          investigationId: id,
          parameterId: p.parameterId || p._id,
          isRequired: p.isRequired !== false,
          displayOrder: idx + 1
        }], session ? { session } : {});
      }
    } else if (Array.isArray(investigations) && updatedTest.investigationType === 'PANEL') {
      if (session) {
        await PanelInvestigation.deleteMany({ panelId: id }, { session });
      } else {
        await PanelInvestigation.deleteMany({ panelId: id });
      }
      const seenIds = new Set();
      for (let idx = 0; idx < investigations.length; idx++) {
        const inv = investigations[idx];
        const invId = String(inv.investigationId || inv._id);
        
        if (seenIds.has(invId)) {
          throw new Error('One or more investigations are already associated with this panel.');
        }
        seenIds.add(invId);

        const dbInv = session
          ? await GlobalLabTest.findById(invId).session(session)
          : await GlobalLabTest.findById(invId);
        if (!dbInv) {
          throw new Error('One or more selected investigations could not be found.');
        }
        if (!dbInv.isActive) {
          throw new Error(`Selected investigation ${dbInv.name} is not active.`);
        }
        if (dbInv.investigationType !== 'ATOMIC_TEST') {
          throw new Error(`Selected item ${dbInv.name} is not an Investigation/Test.`);
        }

        await PanelInvestigation.create([{
          panelId: id,
          investigationId: invId,
          isRequired: inv.isRequired !== false,
          displayOrder: idx + 1
        }], session ? { session } : {});
      }
    } else if (Array.isArray(composition) && updatedTest.investigationType === 'PROFILE') {
      if (session) {
        await ProfileComposition.deleteMany({ profileId: id }, { session });
      } else {
        await ProfileComposition.deleteMany({ profileId: id });
      }
      const seenPanels = new Set();
      const seenInvs = new Set();
      for (let idx = 0; idx < composition.length; idx++) {
        const c = composition[idx];
        const panelId = c.panelId ? String(c.panelId) : null;
        const invId = c.investigationId ? String(c.investigationId) : null;

        if (panelId) {
          if (seenPanels.has(panelId)) {
            throw new Error('One or more panels/investigations are already associated with this profile.');
          }
          seenPanels.add(panelId);
          
          const dbPanel = session
            ? await GlobalLabTest.findById(panelId).session(session)
            : await GlobalLabTest.findById(panelId);
          if (!dbPanel) {
            throw new Error('One or more selected panels could not be found.');
          }
          if (!dbPanel.isActive) {
            throw new Error(`Selected panel ${dbPanel.name} is not active.`);
          }
          if (dbPanel.investigationType !== 'PANEL') {
            throw new Error(`Selected item ${dbPanel.name} is not a Panel.`);
          }
        }

        if (invId) {
          if (seenInvs.has(invId)) {
            throw new Error('One or more panels/investigations are already associated with this profile.');
          }
          seenInvs.add(invId);

          const dbInv = session
            ? await GlobalLabTest.findById(invId).session(session)
            : await GlobalLabTest.findById(invId);
          if (!dbInv) {
            throw new Error('One or more selected investigations could not be found.');
          }
          if (!dbInv.isActive) {
            throw new Error(`Selected investigation ${dbInv.name} is not active.`);
          }
          if (dbInv.investigationType !== 'ATOMIC_TEST') {
            throw new Error(`Selected item ${dbInv.name} is not an Investigation/Test.`);
          }
        }

        await ProfileComposition.create([{
          profileId: id,
          panelId,
          investigationId: invId,
          isRequired: c.isRequired !== false,
          displayOrder: idx + 1
        }], session ? { session } : {});
      }
    }

    await createAuditLog({
      actorUserId,
      action: 'UPDATE_LAB_TEST',
      entity: 'GlobalLabTest',
      entityId: updatedTest._id,
      metadata: { previousValues: oldTest, newValues: updatedTest },
      status: 'SUCCESS'
    });

    return updatedTest;
  });
};

// Medicine duplicate detection based on Brand Name, Generic Name, Manufacturer, Strength, Dosage Form, Active Ingredients
const checkMedicineDuplicate = async ({ name, brandName, genericName, manufacturer, strength, dosageForm, activeIngredients = [], medicineType }) => {
  const nameToCheck = name || brandName || genericName || '';
  if (!nameToCheck) return null;

  // 1. Exact Match Check (case-insensitive, same dosage form)
  const existingExact = await GlobalMedicine.findOne({
    $or: [
      { displayName: new RegExp(`^${nameToCheck.trim()}$`, 'i') },
      { genericName: new RegExp(`^${nameToCheck.trim()}$`, 'i') },
      { brandName: new RegExp(`^${nameToCheck.trim()}$`, 'i') }
    ],
    dosageForm: new RegExp(`^${dosageForm?.trim()}$`, 'i')
  }).populate('category');

  if (existingExact) {
    return { type: 'EXACT', match: existingExact };
  }

  // 2. Fuzzy Match Check (similarity > 0.85 on any of the display/generic/brand names)
  const allMeds = await GlobalMedicine.find().populate('category');
  for (const med of allMeds) {
    const matchNames = [med.displayName, med.genericName, med.brandName].filter(Boolean);
    for (const mName of matchNames) {
      if (getSimilarity(mName, nameToCheck) > 0.85) {
        if (normalizeString(med.dosageForm) === normalizeString(dosageForm)) {
          return { type: 'FUZZY', match: med };
        }
      }
    }
  }

  return null;
};

// Medicine & Brand Catalog management
const getGenericMedicines = async (query = {}) => {
  const { search, category, status, classificationStatus, medicineType, page = 1, limit = 10 } = query;
  const filter = {};

  if (category) filter.category = category;
  if (status) filter.isActive = status === 'Active';
  if (classificationStatus) filter.classificationStatus = classificationStatus;
  if (medicineType) filter.medicineType = medicineType;

  if (search) {
    filter.$or = [
      { displayName: new RegExp(search, 'i') },
      { genericName: new RegExp(search, 'i') },
      { brandName: new RegExp(search, 'i') },
      { manufacturer: new RegExp(search, 'i') },
      { globalId: new RegExp(search, 'i') },
      { 'activeIngredients.name': new RegExp(search, 'i') }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await GlobalMedicine.countDocuments(filter);
  const items = await GlobalMedicine.find(filter)
    .populate('category')
    .sort({ displayName: 1 })
    .skip(skip)
    .limit(limit);

  return { total, items, page, limit };
};

const createGenericMedicine = async (payload, actorUserId) => {
  const globalId = await getNextGlobalId('MED', 'global_medicine_seq');
  
  const medicineType = payload.medicineType || 'Generic';
  let displayName = payload.displayName || payload.name || '';
  if (medicineType === 'Generic') {
    displayName = payload.genericName || displayName;
  } else if (medicineType === 'Brand-First') {
    displayName = payload.brandName || displayName;
  } else if (medicineType === 'Combination') {
    displayName = payload.displayName || payload.name || 'Combination';
  }

  let classificationStatus = payload.classificationStatus || 'Verified';
  if (medicineType === 'Brand-First') {
    if (!payload.genericName) {
      classificationStatus = 'Pending Classification';
    }
  }

  const medicine = await GlobalMedicine.create({
    ...payload,
    displayName,
    globalId,
    classificationStatus,
    createdBy: actorUserId,
    updatedBy: actorUserId
  });

  await createAuditLog({
    actorUserId,
    action: 'CREATE_MEDICINE',
    entity: 'GlobalMedicine',
    entityId: medicine._id,
    metadata: { newValues: medicine },
    status: 'SUCCESS'
  });
  return medicine;
};

const updateGenericMedicine = async (id, payload, actorUserId) => {
  const oldMed = await GlobalMedicine.findById(id);
  
  if (payload.displayName || payload.name || payload.genericName || payload.brandName) {
    const type = payload.medicineType || oldMed.medicineType;
    if (type === 'Generic') {
      payload.displayName = payload.genericName || payload.displayName || oldMed.genericName;
    } else if (type === 'Brand-First') {
      payload.displayName = payload.brandName || payload.displayName || oldMed.brandName;
    }
  }

  const updatedMed = await GlobalMedicine.findByIdAndUpdate(
    id,
    { ...payload, updatedBy: actorUserId },
    { new: true }
  ).populate('category');

  await createAuditLog({
    actorUserId,
    action: 'UPDATE_MEDICINE',
    entity: 'GlobalMedicine',
    entityId: updatedMed._id,
    metadata: { previousValues: oldMed, newValues: updatedMed },
    status: 'SUCCESS'
  });
  return updatedMed;
};

const deleteGenericMedicine = async (id, actorUserId) => {
  const medicine = await GlobalMedicine.findById(id);
  if (!medicine) {
    throw new Error('Medicine not found in global catalogue');
  }

  await GlobalMedicine.findByIdAndDelete(id);

  await createAuditLog({
    actorUserId,
    action: 'DELETE_MEDICINE',
    entity: 'GlobalMedicine',
    entityId: id,
    metadata: { deletedValues: medicine },
    status: 'SUCCESS'
  });

  return { id };
};

const classifyMedicine = async (id, payload, actorUserId) => {
  const oldMed = await GlobalMedicine.findById(id);
  
  const updatePayload = {
    ...payload,
    classificationStatus: payload.classificationStatus || 'Verified',
    updatedBy: actorUserId
  };

  if (payload.medicineType === 'Generic') {
    updatePayload.displayName = payload.genericName || oldMed.displayName;
  } else if (payload.medicineType === 'Brand-First') {
    updatePayload.displayName = payload.brandName || oldMed.displayName;
  }

  const updatedMed = await GlobalMedicine.findByIdAndUpdate(
    id,
    updatePayload,
    { new: true }
  ).populate('category');

  await createAuditLog({
    actorUserId,
    action: 'CLASSIFY_MEDICINE',
    entity: 'GlobalMedicine',
    entityId: updatedMed._id,
    metadata: { previousValues: oldMed, newValues: updatedMed },
    status: 'SUCCESS'
  });
  return updatedMed;
};

// Placeholder for getBrands mapping back to GlobalMedicine search
const getBrands = async (query = {}) => {
  // To keep compatibility, query GlobalMedicine where medicineType is Brand-First or Combination
  const { search, genericMedicineId, status } = query;
  const filter = { medicineType: { $in: ['Brand-First', 'Combination'] } };

  if (status) filter.isActive = status === 'Active';
  if (search) {
    filter.$or = [
      { displayName: new RegExp(search, 'i') },
      { brandName: new RegExp(search, 'i') },
      { manufacturer: new RegExp(search, 'i') }
    ];
  }

  return GlobalMedicine.find(filter).populate('category').sort({ displayName: 1 });
};

const createBrand = async (payload, actorUserId) => {
  // Create a brand-first medicine
  return createGenericMedicine({
    ...payload,
    medicineType: 'Brand-First',
    classificationStatus: 'Pending Classification'
  }, actorUserId);
};

const { getParser } = require('./parsers/parserRegistry');

// Robust Ingredient parser helper
const parseActiveIngredients = (genericName, strengthStr) => {
  if (!genericName) return [];
  const nameParts = genericName.split(/[+\/]/).map(n => n.trim()).filter(Boolean);
  const strengthParts = strengthStr ? strengthStr.split(/[+\/]/).map(s => s.trim()).filter(Boolean) : [];

  return nameParts.map((name, index) => {
    let strength = 'N/A';
    if (strengthParts[index]) {
      strength = strengthParts[index];
    } else if (strengthParts[0]) {
      strength = strengthParts[0];
    }
    return { name, strength };
  });
};

// Route detection based on dosage form
const detectRouteFromDosageForm = (dosageForm) => {
  if (!dosageForm) return 'Oral';
  const form = dosageForm.toLowerCase();
  if (form.includes('tablet') || form.includes('capsule') || form.includes('oral') || form.includes('syrup') || form.includes('suspension') || form.includes('liquid')) {
    return 'Oral';
  }
  if (form.includes('injection') || form.includes('infusion') || form.includes('vial') || form.includes('ampoule') || form.includes('iv') || form.includes('im')) {
    return 'Injection';
  }
  if (form.includes('eye') || form.includes('ophthalmic') || form.includes('drops')) {
    return 'Ophthalmic';
  }
  if (form.includes('cream') || form.includes('ointment') || form.includes('gel') || form.includes('topical') || form.includes('lotion')) {
    return 'Topical';
  }
  if (form.includes('inhaler') || form.includes('inhalation') || form.includes('respules')) {
    return 'Inhalation';
  }
  if (form.includes('nasal') || form.includes('spray')) {
    return 'Nasal';
  }
  return 'Oral';
};

// Universal import preview layer
const previewImport = async (fileBase64, importType, fileName = '') => {
  const buffer = Buffer.from(fileBase64, 'base64');
  
  // Auto-detect parser using the registry
  const parser = await getParser(buffer, fileName || (importType === 'LAB' ? 'catalog.xlsx' : 'catalog.xlsx'), importType);
  if (!parser) {
    throw new Error('Unsupported file type or no matching parser found for this import source');
  }

  const rawRecords = await parser.parse(buffer);
  const previewRows = [];
  const seenKeys = new Set();

  for (let i = 0; i < rawRecords.length; i++) {
    const raw = rawRecords[i];
    if (!raw) continue;

    if (importType === 'LAB') {
      const name = raw.name ? raw.name.toString().trim() : '';
      if (!name) continue;

      const categoryName = raw.categoryName || raw.department || 'General';
      const normKey = `${normalizeString(name)}_${normalizeString(categoryName)}`;
      if (seenKeys.has(normKey)) continue;
      seenKeys.add(normKey);

      const dupCheck = await checkLabTestDuplicate(name, raw.alternateNames || [], raw.shortName || '');
      let matchStatus = 'NEW';
      if (dupCheck) {
        matchStatus = dupCheck.type === 'EXACT' ? 'EXISTING' : 'CONFLICT';
      }

      previewRows.push({
        index: i,
        data: {
          name,
          shortName: raw.shortName || '',
          alternateNames: raw.alternateNames || [],
          department: categoryName,
          categoryName,
          sampleType: raw.sampleType || 'Blood',
          sampleVolume: raw.sampleVolume || '2 ml',
          sampleContainer: raw.sampleContainer || 'Vaccutainer',
          methodology: raw.methodology || 'Automated',
          clinicalDescription: raw.clinicalDescription || '',
          patientPreparation: raw.patientPreparation || 'Fasting not required',
          referenceRange: raw.referenceRange || 'Normal',
          normalReportingTime: raw.normalReportingTime || '24 Hours',
          internalCode: raw.internalCode || '',
          loincCode: raw.loincCode || '',
          isActive: true
        },
        matchStatus,
        matchedRecord: dupCheck ? dupCheck.match : null
      });

    } else if (importType === 'MEDICINE') {
      const rawName = raw.brandName ? raw.brandName.toString().trim() : '';
      const rawGeneric = raw.genericName ? raw.genericName.toString().trim() : '';
      
      if (!rawName && !rawGeneric) continue;

      const strength = raw.strength ? raw.strength.toString().trim() : 'N/A';
      const dosageForm = raw.dosageForm ? raw.dosageForm.toString().trim() : 'Tablet';
      const categoryName = raw.categoryName || raw.category || 'General';

      // Auto Classify Medicine Type
      let medicineType = 'Generic';
      if (rawGeneric && (rawGeneric.includes('+') || rawGeneric.includes('/'))) {
        medicineType = 'Combination';
      } else if (!rawGeneric && rawName) {
        medicineType = 'Brand-First';
      }

      const displayName = medicineType === 'Brand-First' ? rawName : (rawGeneric || rawName);
      
      const normKey = `${normalizeString(displayName)}_${normalizeString(strength)}_${normalizeString(dosageForm)}`;
      if (seenKeys.has(normKey)) continue;
      seenKeys.add(normKey);

      // Auto detect route
      const route = raw.route || detectRouteFromDosageForm(dosageForm);

      // Parse ingredients
      const activeIngredients = medicineType === 'Combination'
        ? parseActiveIngredients(rawGeneric, strength)
        : (rawGeneric ? [{ name: rawGeneric, strength }] : []);

      // Classification Status
      const classificationStatus = medicineType === 'Brand-First' ? 'Pending Classification' : 'Verified';

      const dupCheck = await checkMedicineDuplicate({
        name: displayName,
        brandName: rawName,
        genericName: rawGeneric,
        dosageForm
      });

      let matchStatus = 'NEW';
      if (dupCheck) {
        matchStatus = dupCheck.type === 'EXACT' ? 'EXISTING' : 'CONFLICT';
      }

      previewRows.push({
        index: i,
        data: {
          name: displayName,
          displayName,
          medicineType,
          brandName: rawName,
          genericName: rawGeneric,
          strength,
          dosageForm,
          categoryName,
          route,
          drugSchedule: raw.drugSchedule || '',
          activeIngredients,
          classificationStatus,
          description: raw.description || '',
          isActive: true
        },
        matchStatus,
        matchedRecord: dupCheck ? dupCheck.match : null
      });
    }
  }

  return previewRows;
};

// Confirm import after decision mappings are supplied
const confirmImport = async (items, importType, actorUserId, batchName = 'Manual Import', fileName = 'imported_file.xlsx') => {
  const results = {
    totalRead: items.length,
    created: 0,
    mapped: 0,
    skipped: 0,
    errors: 0
  };

  const importBatch = `${batchName}-${Date.now()}`;
  const importedTests = [];
  const skippedTests = [];
  const duplicateMappings = [];

  for (const item of items) {
    try {
      const { decision, existingId, data } = item;

      if (decision === 'SKIP') {
        results.skipped++;
        skippedTests.push(data.name || data.displayName);
        continue;
      }

      let categoryId;
      const categoryName = data.categoryName || 'General';
      
      let cat = await CatalogCategory.findOne({
        name: new RegExp(`^${categoryName.trim()}$`, 'i'),
        type: importType === 'LAB' ? 'LAB' : 'MEDICINE'
      });
      if (!cat) {
        cat = await CatalogCategory.create({
          name: categoryName.trim(),
          type: importType === 'LAB' ? 'LAB' : 'MEDICINE',
          description: `Auto-created during import: ${batchName}`
        });
      }
      categoryId = cat._id;

      if (decision === 'MAP' && existingId) {
        results.mapped++;
        duplicateMappings.push({
          importedName: data.name || data.displayName,
          mappedToId: existingId
        });
      } else {
        if (importType === 'LAB') {
          const globalId = await getNextGlobalId('LAB', 'global_lab_test');
          const test = await GlobalLabTest.create({
            ...data,
            category: categoryId,
            globalId
          });
          results.created++;
          importedTests.push({
            name: test.name,
            globalId: test.globalId
          });
        } else {
          const globalId = await getNextGlobalId('MED', 'global_medicine_seq');
          const generic = await GlobalMedicine.create({
            ...data,
            category: categoryId,
            globalId,
            createdBy: actorUserId,
            updatedBy: actorUserId
          });
          results.created++;
          importedTests.push({
            name: generic.displayName,
            globalId: generic.globalId
          });
        }
      }
    } catch (err) {
      results.errors++;
    }
  }

  await createAuditLog({
    actorUserId,
    action: 'IMPORT_BATCH_COMPLETE',
    entity: importType === 'LAB' ? 'GlobalLabTest' : 'GlobalMedicine',
    metadata: {
      importBatch,
      fileName,
      importDate: new Date(),
      importedTests,
      skippedTests,
      duplicateMappings,
      summary: results
    },
    status: 'SUCCESS'
  });

  return results;
};

const getParameters = async (query = {}) => {
  const { search, resultType, status, excludeIds, page = 1, limit = 10 } = query;
  const filter = {};

  if (resultType) filter.resultType = resultType;
  if (status) filter.isActive = status === 'Active';
  if (excludeIds) {
    const ids = excludeIds.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length > 0) {
      filter._id = { $nin: ids };
    }
  }

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { shortName: new RegExp(search, 'i') },
      { alternateNames: new RegExp(search, 'i') },
      { parameterId: new RegExp(search, 'i') },
      { code: new RegExp(search, 'i') },
      { loincCode: new RegExp(search, 'i') }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await GlobalParameter.countDocuments(filter);
  const items = await GlobalParameter.find(filter)
    .populate('defaultUnitId')
    .populate('referenceRanges.unitId')
    .populate('referenceRanges.conditionId')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const mappingsCount = await InvestigationParameter.countDocuments({ parameterId: item._id });
      return {
        ...item.toObject(),
        usedInCount: mappingsCount
      };
    })
  );

  return { total, items: enrichedItems, page, limit };
};

const { AppError } = require('../../common/utils/AppError');

const sanitizeParameterPayload = (payload) => {
  const sanitized = { ...payload };
  if (sanitized.defaultUnitId === '') {
    sanitized.defaultUnitId = null;
  }

  // 1. Qualitative Allowed Values Uniqueness Validation
  if (sanitized.resultType === 'QUALITATIVE' && Array.isArray(sanitized.allowedValues)) {
    const seenValues = new Set();
    for (const av of sanitized.allowedValues) {
      if (!av.value || av.isActive === false) continue;
      const normalizedVal = av.value.toString().trim().toLowerCase();
      if (seenValues.has(normalizedVal)) {
        throw new AppError(`Duplicate allowed value '${av.value}' is not permitted.`, 400);
      }
      seenValues.add(normalizedVal);
    }
  }

  // 2. Technical acceptable limits range validation
  if (sanitized.technicalMin !== null && sanitized.technicalMin !== undefined &&
      sanitized.technicalMax !== null && sanitized.technicalMax !== undefined) {
    if (Number(sanitized.technicalMin) > Number(sanitized.technicalMax)) {
      throw new AppError('Technical minimum limit cannot be greater than technical maximum limit.', 400);
    }
  }

  if (Array.isArray(sanitized.referenceRanges)) {
    // Sanitize empty strings to null for ObjectId fields
    const mapped = sanitized.referenceRanges.map(range => ({
      ...range,
      conditionId: range.conditionId === '' ? null : range.conditionId,
      unitId: range.unitId === '' ? null : range.unitId,
      lowerValue: range.lowerValue !== undefined ? range.lowerValue : range.fromValue,
      upperValue: range.upperValue !== undefined ? range.upperValue : range.toValue,
      fromValue: range.lowerValue !== undefined ? range.lowerValue : range.fromValue,
      toValue: range.upperValue !== undefined ? range.upperValue : range.toValue
    }));

    // Validate boundaries bounds (e.g. 10-20, not 20-10)
    for (const range of mapped) {
      const lower = range.lowerValue !== null && range.lowerValue !== undefined ? Number(range.lowerValue) : null;
      const upper = range.upperValue !== null && range.upperValue !== undefined ? Number(range.upperValue) : null;
      if (lower !== null && upper !== null && lower > upper) {
        throw new AppError(`Invalid range limits: lower value (${lower}) cannot be greater than upper value (${upper}).`, 400);
      }
    }

    // Validate uniqueness based on: gender, ageFrom, ageTo, ageUnit, conditionId, pregnancyStatus, specimenType
    const seen = new Set();
    for (const range of mapped) {
      const key = [
        range.gender || 'ALL',
        range.ageFrom ?? '',
        range.ageTo ?? '',
        range.ageUnit ?? '',
        String(range.conditionId ?? ''),
        range.pregnancyStatus || 'ANY',
        range.specimenType || ''
      ].join('|');

      if (seen.has(key)) {
        throw new AppError(
          `Duplicate Reference Range: A range already exists for gender: ${range.gender || 'ALL'}, age: ${range.ageFrom ?? '0'}–${range.ageTo ?? 'any'} ${range.ageUnit || 'Years'}, condition: ${range.conditionId || 'None'}, pregnancy: ${range.pregnancyStatus || 'ANY'}, specimen: ${range.specimenType || 'None'}.`,
          409
        );
      }
      seen.add(key);
    }

    // 3. Overlapping Rules Check
    const { checkOverlappingRanges } = require('./resultValidation.service');
    checkOverlappingRanges(mapped);

    sanitized.referenceRanges = mapped;
  }
  return sanitized;
};

const createParameter = async (payload, actorUserId) => {
  const existing = await GlobalParameter.findOne({ name: new RegExp(`^${payload.name.trim()}$`, 'i') });
  if (existing) {
    throw new Error('A parameter with this name already exists');
  }

  const sanitized = sanitizeParameterPayload(payload);
  const parameterId = await getNextGlobalId('PAR', 'global_parameter_seq');
  const parameter = await GlobalParameter.create({ ...sanitized, parameterId });

  await createAuditLog({
    actorUserId,
    action: 'CREATE_PARAMETER',
    entity: 'GlobalParameter',
    entityId: parameter._id,
    metadata: { newValues: parameter },
    status: 'SUCCESS'
  });
  return parameter;
};

const updateParameter = async (id, payload, actorUserId) => {
  const oldParam = await GlobalParameter.findById(id);
  if (!oldParam) {
    throw new Error('Parameter not found');
  }

  const sanitized = sanitizeParameterPayload(payload);
  const updatedParam = await GlobalParameter.findByIdAndUpdate(id, sanitized, { new: true });

  await createAuditLog({
    actorUserId,
    action: 'UPDATE_PARAMETER',
    entity: 'GlobalParameter',
    entityId: updatedParam._id,
    metadata: { previousValues: oldParam, newValues: updatedParam },
    status: 'SUCCESS'
  });
  return updatedParam;
};

const getParametersForInvestigation = async (investigationId) => {
  return InvestigationParameter.find({ investigationId })
    .populate({
      path: 'parameterId',
      populate: [
        { path: 'defaultUnitId' },
        { path: 'referenceRanges.unitId' },
        { path: 'referenceRanges.conditionId' }
      ]
    })
    .sort({ displayOrder: 1 });
};

const mapParameterToInvestigation = async (payload, actorUserId) => {
  const { investigationId, parameterId, isRequired, displayOrder, displayNameOverride } = payload;

  const parameter = await GlobalParameter.findById(parameterId);
  if (!parameter || !parameter.isActive) {
    throw new Error('Active parameter not found');
  }

  let order = displayOrder;
  if (order === undefined || order === null) {
    const lastMapping = await InvestigationParameter.findOne({ investigationId })
      .sort({ displayOrder: -1 });
    order = lastMapping ? lastMapping.displayOrder + 1 : 1;
  }

  const mapping = await InvestigationParameter.findOneAndUpdate(
    { investigationId, parameterId },
    { isRequired, displayOrder: order, displayNameOverride },
    { new: true, upsert: true }
  ).populate({
    path: 'parameterId',
    populate: [
      { path: 'defaultUnitId' },
      { path: 'referenceRanges.unitId' },
      { path: 'referenceRanges.conditionId' }
    ]
  });

  await createAuditLog({
    actorUserId,
    action: 'MAP_PARAMETER_TO_INVESTIGATION',
    entity: 'InvestigationParameter',
    entityId: mapping._id,
    metadata: { newValues: mapping },
    status: 'SUCCESS'
  });
  return mapping;
};

const unmapParameterFromInvestigation = async (investigationId, parameterId, actorUserId) => {
  const mapping = await InvestigationParameter.findOne({ investigationId, parameterId });
  if (!mapping) {
    throw new Error('Mapping not found');
  }

  await InvestigationParameter.findByIdAndDelete(mapping._id);

  await createAuditLog({
    actorUserId,
    action: 'UNMAP_PARAMETER_FROM_INVESTIGATION',
    entity: 'InvestigationParameter',
    entityId: mapping._id,
    metadata: { deletedValues: mapping },
    status: 'SUCCESS'
  });
  return { id: mapping._id };
};

const reorderInvestigationParameters = async (investigationId, orderArray, actorUserId) => {
  const updatedMappings = [];
  for (const item of orderArray) {
    const mapping = await InvestigationParameter.findOneAndUpdate(
      { investigationId, parameterId: item.parameterId },
      { displayOrder: item.displayOrder },
      { new: true }
    ).populate('parameterId');
    if (mapping) {
      updatedMappings.push(mapping);
    }
  }

  await createAuditLog({
    actorUserId,
    action: 'REORDER_INVESTIGATION_PARAMETERS',
    entity: 'InvestigationParameter',
    metadata: { investigationId, orderArray },
    status: 'SUCCESS'
  });

  return updatedMappings;
};

const resolveInvestigationComposition = async (investigationId) => {
  const test = await GlobalLabTest.findById(investigationId).populate('category');
  if (!test) {
    throw new Error('Global Lab Test not found');
  }

  if (test.investigationType === 'ATOMIC_TEST') {
    const mappings = await InvestigationParameter.find({ investigationId })
      .populate({
        path: 'parameterId',
        populate: [
          { path: 'defaultUnitId' },
          { path: 'referenceRanges.unitId' },
          { path: 'referenceRanges.conditionId' }
        ]
      })
      .sort({ displayOrder: 1 });

    return {
      investigation: test,
      parameters: mappings.map(m => ({
        parameterId: m.parameterId?._id,
        parameterGlobalId: m.parameterId?.parameterId,
        name: m.displayNameOverride || m.parameterId?.name,
        shortName: m.parameterId?.shortName,
        resultType: m.parameterId?.resultType,
        unit: m.parameterId?.defaultUnitId?.symbol || '',
        displayOrder: m.displayOrder,
        isRequired: m.isRequired,
        referenceRanges: (m.parameterId?.referenceRanges || []).map(r => ({
          gender: r.gender,
          ageFrom: r.ageFrom,
          ageTo: r.ageTo,
          ageUnit: r.ageUnit,
          fromValue: r.fromValue,
          toValue: r.toValue,
          unit: r.unitId?.symbol || '',
          condition: r.conditionId?.name || 'None'
        })),
        allowedValues: m.parameterId?.allowedValues || []
      }))
    };
  }

  if (test.investigationType === 'PANEL') {
    const mappings = await PanelInvestigation.find({ panelId: investigationId })
      .populate({
        path: 'investigationId',
        populate: { path: 'category' }
      })
      .sort({ displayOrder: 1 });

    const investigations = await Promise.all(mappings.map(async (m) => {
      let invComp = { parameters: [] };
      try {
        if (m.investigationId) {
          invComp = await resolveInvestigationComposition(m.investigationId._id);
        }
      } catch (err) {
        console.error(err);
      }
      return {
        investigationId: m.investigationId?._id,
        globalId: m.investigationId?.globalId,
        name: m.investigationId?.name,
        shortName: m.investigationId?.shortName,
        department: m.investigationId?.department,
        category: m.investigationId?.category?.name,
        isRequired: m.isRequired,
        displayOrder: m.displayOrder,
        parameters: invComp.parameters || []
      };
    }));

    return {
      investigation: test,
      investigations
    };
  }

  if (test.investigationType === 'PROFILE') {
    const mappings = await ProfileComposition.find({ profileId: investigationId })
      .populate({
        path: 'panelId',
        populate: { path: 'category' }
      })
      .populate({
        path: 'investigationId',
        populate: { path: 'category' }
      })
      .sort({ displayOrder: 1 });

    const composition = await Promise.all(mappings.map(async (m) => {
      let resolvedDetails = null;
      try {
        if (m.panelId) {
          resolvedDetails = await resolveInvestigationComposition(m.panelId._id);
        } else if (m.investigationId) {
          resolvedDetails = await resolveInvestigationComposition(m.investigationId._id);
        }
      } catch (err) {
        console.error(err);
      }
      return {
        panelId: m.panelId?._id || null,
        investigationId: m.investigationId?._id || null,
        name: m.panelId?.name || m.investigationId?.name,
        shortName: m.panelId?.shortName || m.investigationId?.shortName,
        type: m.panelId ? 'PANEL' : 'INVESTIGATION',
        isRequired: m.isRequired,
        displayOrder: m.displayOrder,
        details: resolvedDetails
      };
    }));

    return {
      investigation: test,
      composition
    };
  }

  return { investigation: test };
};

const getUnits = async () => {
  return GlobalLaboratoryUnit.find().sort({ symbol: 1 });
};

const createUnit = async (payload) => {
  const existing = await GlobalLaboratoryUnit.findOne({ symbol: payload.symbol.trim() });
  if (existing) {
    throw new Error('A unit with this symbol already exists');
  }
  return GlobalLaboratoryUnit.create(payload);
};

const getConditions = async () => {
  return ReferenceRangeCondition.find().sort({ name: 1 });
};

const createCondition = async (payload) => {
  const existing = await ReferenceRangeCondition.findOne({ name: payload.name.trim() });
  if (existing) {
    throw new Error('A condition with this name already exists');
  }
  return ReferenceRangeCondition.create(payload);
};

const CatalogueUpdate = require('./catalogueUpdate.model');

const getCatalogueUpdates = async () => {
  return CatalogueUpdate.find().sort({ importedAt: -1 });
};

const importCatalogueUpdate = async (payload, actorUserId) => {
  const { version, source, sourceVersion, sourceYear, parameters = [], investigations = [] } = payload;

  const existingUpdate = await CatalogueUpdate.findOne({ version });
  if (existingUpdate) {
    throw new Error(`Catalogue update version ${version} has already been imported.`);
  }

  const diff = {
    new: [],
    modified: [],
    retired: []
  };

  // Compare Parameters
  for (const newParam of parameters) {
    const existing = await GlobalParameter.findOne({ name: newParam.name });
    if (!existing) {
      diff.new.push({
        type: 'PARAMETER',
        name: newParam.name,
        shortName: newParam.shortName,
        data: newParam
      });
    } else {
      let isModified = false;
      const changes = {};

      if (newParam.shortName !== existing.shortName) {
        isModified = true;
        changes.shortName = { old: existing.shortName, new: newParam.shortName };
      }

      if (isModified) {
        diff.modified.push({
          type: 'PARAMETER',
          _id: existing._id,
          name: existing.name,
          customized: existing.customized || false,
          changes,
          data: newParam
        });
      }
    }
  }

  // Detect retired parameters
  const currentParams = await GlobalParameter.find({ sourceType: 'ICMR_NEDL', status: { $ne: 'RETIRED' } });
  for (const cp of currentParams) {
    const stillExists = parameters.some(p => p.name === cp.name);
    if (!stillExists) {
      diff.retired.push({
        type: 'PARAMETER',
        _id: cp._id,
        name: cp.name,
        reason: 'Removed from newer NEDL edition'
      });
    }
  }

  // Compare Investigations
  for (const newInv of investigations) {
    const existing = await GlobalLabTest.findOne({ name: newInv.name, investigationType: 'ATOMIC_TEST' });
    if (!existing) {
      diff.new.push({
        type: 'INVESTIGATION',
        name: newInv.name,
        shortName: newInv.shortName,
        data: newInv
      });
    } else {
      let isModified = false;
      const changes = {};

      if (newInv.shortName !== existing.shortName) {
        isModified = true;
        changes.shortName = { old: existing.shortName, new: newInv.shortName };
      }
      if (newInv.department !== existing.department) {
        isModified = true;
        changes.department = { old: existing.department, new: newInv.department };
      }

      if (isModified) {
        diff.modified.push({
          type: 'INVESTIGATION',
          _id: existing._id,
          name: existing.name,
          customized: existing.customized || false,
          changes,
          data: newInv
        });
      }
    }
  }

  // Detect retired investigations
  const currentInvs = await GlobalLabTest.find({ sourceType: 'ICMR_NEDL', investigationType: 'ATOMIC_TEST', status: { $ne: 'RETIRED' } });
  for (const ci of currentInvs) {
    const stillExists = investigations.some(i => i.name === ci.name);
    if (!stillExists) {
      diff.retired.push({
        type: 'INVESTIGATION',
        _id: ci._id,
        name: ci.name,
        reason: 'Removed from newer NEDL edition'
      });
    }
  }

  const update = await CatalogueUpdate.create({
    version,
    source,
    sourceVersion,
    sourceYear,
    status: 'PENDING_REVIEW',
    changes: diff,
    overrides: {}
  });

  return update;
};

const applyCatalogueUpdate = async (updateId, approvedChangeIds = [], actorUserId) => {
  const update = await CatalogueUpdate.findById(updateId);
  if (!update) throw new Error('Catalogue update not found');
  if (update.status !== 'PENDING_REVIEW') {
    throw new Error(`Catalogue update is currently in status: ${update.status}`);
  }

  // Perform updates inside manual Mongoose transaction try-catch block
  const dbSession = await mongoose.startSession();
  try {
    dbSession.startTransaction();

    const { changes } = update;
    const approvedSet = new Set(approvedChangeIds);

    // Apply NEW additions
    for (const item of changes.new) {
      const uniqueKey = `${item.type}_${item.name}`;
      if (approvedSet.size > 0 && !approvedSet.has(uniqueKey)) continue;

      if (item.type === 'PARAMETER') {
        const defaultUnitId = item.data.defaultUnit ? (await GlobalLaboratoryUnit.findOne({ symbol: item.data.defaultUnit }))?._id : null;
        await GlobalParameter.create([{
          ...item.data,
          defaultUnit: defaultUnitId,
          sourceType: 'ICMR_NEDL',
          sourceVersion: update.sourceVersion,
          sourceYear: update.sourceYear,
          status: 'ACTIVE',
          isActive: true
        }], { session: dbSession });
      } else if (item.type === 'INVESTIGATION') {
        const catId = item.data.categoryName ? (await CatalogCategory.findOne({ name: item.data.categoryName }))?._id : null;
        await GlobalLabTest.create([{
          ...item.data,
          category: catId,
          investigationType: 'ATOMIC_TEST',
          source: 'SYSTEM_CATALOGUE',
          sourceType: 'ICMR_NEDL',
          sourceVersion: update.sourceVersion,
          sourceYear: update.sourceYear,
          status: 'ACTIVE',
          isActive: true
        }], { session: dbSession });
      }
    }

    // Apply MODIFIED records
    for (const item of changes.modified) {
      const uniqueKey = `${item.type}_${item._id}`;
      if (approvedSet.size > 0 && !approvedSet.has(uniqueKey)) continue;

      if (item.type === 'PARAMETER') {
        await GlobalParameter.findByIdAndUpdate(item._id, {
          shortName: item.data.shortName,
          sourceVersion: update.sourceVersion,
          sourceYear: update.sourceYear
        }, { session: dbSession });
      } else if (item.type === 'INVESTIGATION') {
        await GlobalLabTest.findByIdAndUpdate(item._id, {
          shortName: item.data.shortName,
          department: item.data.department,
          sourceVersion: update.sourceVersion,
          sourceYear: update.sourceYear
        }, { session: dbSession });
      }
    }

    // Apply RETIRED/REMOVED records (soft retirement, do not delete)
    for (const item of changes.retired) {
      const uniqueKey = `${item.type}_${item._id}`;
      if (approvedSet.size > 0 && !approvedSet.has(uniqueKey)) continue;

      if (item.type === 'PARAMETER') {
        await GlobalParameter.findByIdAndUpdate(item._id, {
          status: 'RETIRED',
          isActive: false,
          retiredAt: new Date(),
          retiredSourceVersion: update.sourceVersion,
          retirementReason: item.reason
        }, { session: dbSession });
      } else if (item.type === 'INVESTIGATION') {
        await GlobalLabTest.findByIdAndUpdate(item._id, {
          status: 'RETIRED',
          isActive: false,
          retiredAt: new Date(),
          retiredSourceVersion: update.sourceVersion,
          retirementReason: item.reason
        }, { session: dbSession });
      }
    }

    // Commit changes
    await dbSession.commitTransaction();
    dbSession.endSession();

    update.status = 'APPLIED';
    update.approvedAt = new Date();
    update.approvedBy = actorUserId;
    await update.save();

    return update;
  } catch (err) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    throw err;
  }
};

const getParameterById = async (id) => {
  return GlobalParameter.findById(id)
    .populate('defaultUnitId')
    .populate('referenceRanges.unitId')
    .populate('referenceRanges.conditionId');
};

module.exports = {
  getParameterById,
  getCategories,
  createCategory,
  checkLabTestDuplicate,
  getLabTests,
  createLabTest,
  updateLabTest,
  checkMedicineDuplicate,
  getGenericMedicines,
  createGenericMedicine,
  updateGenericMedicine,
  deleteGenericMedicine,
  classifyMedicine,
  getBrands,
  createBrand,
  previewImport,
  confirmImport,
  getParameters,
  createParameter,
  updateParameter,
  getParametersForInvestigation,
  mapParameterToInvestigation,
  unmapParameterFromInvestigation,
  reorderInvestigationParameters,
  resolveInvestigationComposition,
  getUnits,
  createUnit,
  getConditions,
  createCondition,
  getCatalogueUpdates,
  importCatalogueUpdate,
  applyCatalogueUpdate
};

