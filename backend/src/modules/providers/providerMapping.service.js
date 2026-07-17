const ProviderMapping = require('./providerMapping.model');
const GlobalMedicine = require('../healthcare-catalog/globalMedicine.model');
const GlobalLabTest = require('../healthcare-catalog/globalLabTest.model');
const xlsx = require('xlsx');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { createAuditLog } = require('../audit/audit.service');

const getSimilarity = (str1, str2) => {
  const s1 = (str1 || '').toLowerCase().trim();
  const s2 = (str2 || '').toLowerCase().trim();
  if (s1 === s2) return 1.0;

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - distance / maxLen;
};

const createMapping = async (clinicId, payload, actorUserId) => {
  const { providerId, mappingType, globalMedicineId, globalLabTestId } = payload;

  const existingQuery = { providerId, mappingType };
  if (mappingType === 'Medicine') {
    existingQuery.globalMedicineId = globalMedicineId;
  } else {
    existingQuery.globalLabTestId = globalLabTestId;
  }

  const existing = await ProviderMapping.findOne(existingQuery);
  if (existing) {
    throw new AppError('This catalog item is already mapped to this provider', HTTP_STATUS.CONFLICT);
  }

  const mapping = await ProviderMapping.create({
    ...payload,
    clinicId,
    createdBy: actorUserId,
    updatedBy: actorUserId
  });

  await createAuditLog({
    actorUserId,
    action: 'CREATE_PROVIDER_MAPPING',
    entity: 'ProviderMapping',
    entityId: mapping._id,
    metadata: { newValues: mapping },
    status: 'SUCCESS'
  });

  return mapping;
};

const getMappings = async (clinicId, providerId, query = {}) => {
  const { search, mappingType, status, page = 1, limit = 10 } = query;

  const filter = { clinicId, providerId };
  if (mappingType) filter.mappingType = mappingType;
  if (status) filter.status = status;

  if (search) {
    // 1. Fetch matching catalog entities
    const catalogMatches = [];
    if (!mappingType || mappingType === 'Medicine') {
      const meds = await GlobalMedicine.find({
        $or: [
          { displayName: new RegExp(search, 'i') },
          { genericName: new RegExp(search, 'i') },
          { brandName: new RegExp(search, 'i') }
        ]
      }).select('_id');
      meds.forEach(m => catalogMatches.push({ globalMedicineId: m._id }));
    }
    if (!mappingType || mappingType === 'LabTest') {
      const tests = await GlobalLabTest.find({
        $or: [
          { name: new RegExp(search, 'i') },
          { shortName: new RegExp(search, 'i') }
        ]
      }).select('_id');
      tests.forEach(t => catalogMatches.push({ globalLabTestId: t._id }));
    }

    filter.$or = [
      { providerCode: new RegExp(search, 'i') },
      { providerName: new RegExp(search, 'i') },
      ...catalogMatches
    ];
  }

  const skip = (page - 1) * limit;
  const total = await ProviderMapping.countDocuments(filter);
  const items = await ProviderMapping.find(filter)
    .populate('globalMedicineId')
    .populate('globalLabTestId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { total, items, page, limit };
};

const updateMapping = async (clinicId, id, payload, actorUserId) => {
  const oldMapping = await ProviderMapping.findOne({ _id: id, clinicId });
  if (!oldMapping) {
    throw new AppError('Mapping not found', HTTP_STATUS.NOT_FOUND);
  }

  const updatedMapping = await ProviderMapping.findByIdAndUpdate(
    id,
    { ...payload, updatedBy: actorUserId },
    { new: true }
  ).populate('globalMedicineId').populate('globalLabTestId');

  await createAuditLog({
    actorUserId,
    action: 'UPDATE_PROVIDER_MAPPING',
    entity: 'ProviderMapping',
    entityId: id,
    metadata: { previousValues: oldMapping, newValues: updatedMapping },
    status: 'SUCCESS'
  });

  return updatedMapping;
};

const deleteMapping = async (clinicId, id, actorUserId) => {
  const mapping = await ProviderMapping.findOne({ _id: id, clinicId });
  if (!mapping) {
    throw new AppError('Mapping not found', HTTP_STATUS.NOT_FOUND);
  }

  await ProviderMapping.deleteOne({ _id: id });

  await createAuditLog({
    actorUserId,
    action: 'DELETE_PROVIDER_MAPPING',
    entity: 'ProviderMapping',
    entityId: id,
    metadata: { providerName: mapping.providerName, providerCode: mapping.providerCode },
    status: 'SUCCESS'
  });

  return mapping;
};

// Smart Excel Pre-flight import matcher
const previewImportMapping = async (clinicId, providerId, fileBase64, mappingType) => {
  const buffer = Buffer.from(fileBase64, 'base64');
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) {
    throw new AppError('Sheet must contain a header row and at least one data row', HTTP_STATUS.BAD_REQUEST);
  }

  const previewRows = [];
  const headers = rows[0].map(h => (h || '').toString().trim().toUpperCase());

  // Find column indexes
  const codeIdx = headers.findIndex(h => h.includes('CODE') || h.includes('ID'));
  const nameIdx = headers.findIndex(h => h.includes('NAME') || h.includes('BRAND') || h.includes('TEST'));

  if (nameIdx === -1) {
    throw new AppError('Could not locate a valid Name/Brand column header', HTTP_STATUS.BAD_REQUEST);
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawCode = codeIdx !== -1 && row[codeIdx] ? row[codeIdx].toString().trim() : `AUTO-${i}`;
    const rawName = row[nameIdx] ? row[nameIdx].toString().trim() : '';

    if (!rawName) continue;

    // Search Global Catalog for match
    let matchStatus = 'NEW';
    let matchedRecord = null;
    let suggestions = [];

    if (mappingType === 'Medicine') {
      // Find exact matches
      const exact = await GlobalMedicine.findOne({
        $or: [
          { displayName: new RegExp(`^${rawName}$`, 'i') },
          { brandName: new RegExp(`^${rawName}$`, 'i') },
          { genericName: new RegExp(`^${rawName}$`, 'i') }
        ]
      });

      if (exact) {
        matchStatus = 'EXISTING';
        matchedRecord = exact;
      } else {
        // Collect fuzzy suggestion matches
        const allMeds = await GlobalMedicine.find().limit(200);
        for (const m of allMeds) {
          const names = [m.displayName, m.brandName, m.genericName].filter(Boolean);
          for (const n of names) {
            if (getSimilarity(n, rawName) > 0.75) {
              suggestions.push(m);
              break;
            }
          }
        }
        if (suggestions.length > 0) {
          matchStatus = 'CONFLICT'; // Possible Matches Found
          matchedRecord = suggestions[0];
        }
      }

      // Check if already mapped
      if (matchedRecord) {
        const alreadyMapped = await ProviderMapping.findOne({
          providerId,
          globalMedicineId: matchedRecord._id
        });
        if (alreadyMapped) matchStatus = 'MAPPED';
      }

    } else {
      // Lab Test Matching
      const exact = await GlobalLabTest.findOne({
        $or: [
          { name: new RegExp(`^${rawName}$`, 'i') },
          { shortName: new RegExp(`^${rawName}$`, 'i') }
        ]
      });

      if (exact) {
        matchStatus = 'EXISTING';
        matchedRecord = exact;
      } else {
        // Collect fuzzy suggestion matches
        const allTests = await GlobalLabTest.find().limit(200);
        for (const t of allTests) {
          const names = [t.name, t.shortName].filter(Boolean);
          for (const n of names) {
            if (getSimilarity(n, rawName) > 0.75) {
              suggestions.push(t);
              break;
            }
          }
        }
        if (suggestions.length > 0) {
          matchStatus = 'CONFLICT';
          matchedRecord = suggestions[0];
        }
      }

      // Check if already mapped
      if (matchedRecord) {
        const alreadyMapped = await ProviderMapping.findOne({
          providerId,
          globalLabTestId: matchedRecord._id
        });
        if (alreadyMapped) matchStatus = 'MAPPED';
      }
    }

    previewRows.push({
      index: i,
      data: {
        providerCode: rawCode,
        providerName: rawName,
        // Carry forward remaining row values as notes or configurations
        packSize: headers.includes('PACK SIZE') ? row[headers.indexOf('PACK SIZE')] || '' : '',
        manufacturer: headers.includes('MANUFACTURER') ? row[headers.indexOf('MANUFACTURER')] || '' : '',
        dosageForm: headers.includes('DOSAGE FORM') ? row[headers.indexOf('DOSAGE FORM')] || '' : '',
        strength: headers.includes('STRENGTH') ? row[headers.indexOf('STRENGTH')] || '' : '',
        sampleType: headers.includes('SAMPLE TYPE') ? row[headers.indexOf('SAMPLE TYPE')] || '' : '',
        methodology: headers.includes('METHODOLOGY') ? row[headers.indexOf('METHODOLOGY')] || '' : '',
        normalReportingTime: headers.includes('REPORTING TIME') ? row[headers.indexOf('REPORTING TIME')] || '' : ''
      },
      matchStatus,
      matchedRecord,
      suggestions: suggestions.slice(0, 3)
    });
  }

  return previewRows;
};

module.exports = {
  createMapping,
  getMappings,
  updateMapping,
  deleteMapping,
  previewImportMapping
};
