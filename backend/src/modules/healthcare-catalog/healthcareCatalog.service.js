const xlsx = require('xlsx');
const CatalogCategory = require('./catalogCategory.model');
const GlobalLabTest = require('./globalLabTest.model');
const GlobalMedicine = require('./globalMedicine.model');
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
const checkLabTestDuplicate = async (name, alternateNames = [], shortName = '') => {
  const normName = normalizeString(name);
  const normShort = normalizeString(shortName);
  const normAlts = alternateNames.map(a => normalizeString(a)).filter(Boolean);

  // 1. Check exact match
  const exactMatch = await GlobalLabTest.findOne({
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
  const allTests = await GlobalLabTest.find().populate('category');
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
  const { search, category, department, status, page = 1, limit = 10 } = query;
  const filter = {};

  if (category) filter.category = category;
  if (department) filter.department = department;
  if (status) filter.isActive = status === 'Active';

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
  const globalId = await getNextGlobalId('LAB', 'global_lab_test');
  const test = await GlobalLabTest.create({ ...payload, globalId });

  await createAuditLog({
    actorUserId,
    action: 'CREATE_LAB_TEST',
    entity: 'GlobalLabTest',
    entityId: test._id,
    metadata: { newValues: test },
    status: 'SUCCESS'
  });
  return test;
};

const updateLabTest = async (id, payload, actorUserId) => {
  const oldTest = await GlobalLabTest.findById(id);
  const updatedTest = await GlobalLabTest.findByIdAndUpdate(id, payload, { new: true }).populate('category');

  await createAuditLog({
    actorUserId,
    action: 'UPDATE_LAB_TEST',
    entity: 'GlobalLabTest',
    entityId: updatedTest._id,
    metadata: { previousValues: oldTest, newValues: updatedTest },
    status: 'SUCCESS'
  });
  return updatedTest;
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

module.exports = {
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
  confirmImport
};

