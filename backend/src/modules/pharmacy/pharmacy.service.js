const { roundCurrency } = require('../../common/utils/billingCalculator');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const AIPrediction = require('../ai/aiPrediction.model');
const aiService = require('../ai/ai.service');
const { createAuditLog } = require('../audit/audit.service');
const doctorRepository = require('../doctors/doctor.repository');
const patientRepository = require('../patients/patient.repository');
const prescriptionRepository = require('../prescriptions/prescription.repository');
const pharmacyRepository = require('./pharmacy.repository');
const {
  allocateDispensingBatches,
  getMedicineStockFlags,
  getNearExpiryStatus,
  isBatchExpired,
  recalculateTotalStock
} = require('./pharmacy.utils');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDateBoundary = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
};

const normalizeDateInput = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
};

const normalizeBatch = (batch = {}) => ({
  batchNumber: batch.batchNumber.trim(),
  quantity: Number(batch.quantity),
  expiryDate: batch.expiryDate ? normalizeDateInput(batch.expiryDate) : null,
  purchasePrice: typeof batch.purchasePrice !== 'undefined' ? Number(batch.purchasePrice) : 0,
  sellingPrice: typeof batch.sellingPrice !== 'undefined' ? Number(batch.sellingPrice) : 0,
  receivedAt: batch.receivedAt ? new Date(batch.receivedAt) : new Date()
});

const PHARMACY_AI_DISCLAIMER =
  'Pharmacy demand forecasting is assistive only for admins and pharmacists and must be reviewed before stock decisions.';

const roundForecastValue = (value) => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  return Number(Number(value).toFixed(2));
};

const getSeasonFromMonth = (month) => {
  if ([3, 4, 5, 6].includes(month)) {
    return 'summer';
  }

  if ([7, 8, 9, 10].includes(month)) {
    return 'monsoon';
  }

  return 'winter';
};

const getNearestExpiryDate = (medicine, today = new Date()) => {
  const validBatches = (medicine.batches || []).filter(
    (batch) => Number(batch.quantity || 0) > 0 && batch.expiryDate && !isBatchExpired(batch.expiryDate, today)
  );

  if (!validBatches.length) {
    return null;
  }

  validBatches.sort((left, right) => new Date(left.expiryDate).getTime() - new Date(right.expiryDate).getTime());
  return validBatches[0].expiryDate;
};

const calculateBackendFallbackForecast = ({
  medicine,
  salesHistory,
  explanationPrefix = 'Forecast unavailable. Showing rule-based reorder status.'
}) => {
  const averageDailySales = salesHistory.length
    ? salesHistory.reduce((sum, item) => sum + Number(item.quantity_sold || 0), 0) / salesHistory.length
    : 0;
  const next7DaysDemand = roundForecastValue(averageDailySales * 7) || 0;
  const next30DaysDemand = roundForecastValue(averageDailySales * 30) || 0;
  const expectedLeadTimeDemand =
    roundForecastValue(averageDailySales * Number(medicine.supplierLeadTimeDays || 0)) || 0;
  const reorderQuantity =
    roundForecastValue(Math.max(0, next30DaysDemand + expectedLeadTimeDemand - Number(medicine.totalStock || 0))) || 0;
  const daysUntilStockout =
    averageDailySales > 0 ? roundForecastValue(Number(medicine.totalStock || 0) / averageDailySales) : null;
  const expiryDate = getNearestExpiryDate(medicine);
  const today = new Date();
  const daysUntilExpiry = expiryDate
    ? Math.ceil((new Date(expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const hasExcessStock = Number(medicine.totalStock || 0) > next30DaysDemand;

  let expiryRisk = 'low';
  if (daysUntilExpiry !== null && daysUntilExpiry <= 30 && hasExcessStock) {
    expiryRisk = 'high';
  } else if (daysUntilExpiry !== null && daysUntilExpiry <= 60 && hasExcessStock) {
    expiryRisk = 'medium';
  }

  let stockoutRisk = 'low';
  if (Number(medicine.totalStock || 0) <= expectedLeadTimeDemand) {
    stockoutRisk = 'high';
  } else if (Number(medicine.totalStock || 0) <= next7DaysDemand) {
    stockoutRisk = 'medium';
  }

  const reasonCodes = [];
  if (Number(medicine.totalStock || 0) < Number(medicine.reorderLevel || 0)) {
    reasonCodes.push('BELOW_REORDER_LEVEL');
  }
  if (Number(medicine.totalStock || 0) <= expectedLeadTimeDemand) {
    reasonCodes.push('HIGH_LEAD_TIME_DEMAND');
  }
  if (Number(medicine.totalStock || 0) <= next7DaysDemand) {
    reasonCodes.push('LOW_STOCK');
  }
  if (expiryRisk !== 'low') {
    reasonCodes.push('EXPIRY_WITH_EXCESS_STOCK');
  }
  if (!salesHistory.length || salesHistory.length < 14) {
    reasonCodes.push('INSUFFICIENT_HISTORY');
  }
  reasonCodes.push('FALLBACK_FORECAST_USED');

  let riskLevel = 'low';
  if (Number(medicine.totalStock || 0) === 0 && averageDailySales > 0) {
    riskLevel = 'critical';
  } else if (stockoutRisk === 'high' || expiryRisk === 'high') {
    riskLevel = 'high';
  } else if (stockoutRisk === 'medium' || expiryRisk === 'medium') {
    riskLevel = 'medium';
  }

  return {
    output: {
      medicine_id: String(medicine._id),
      medicine_name: medicine.name,
      next_7_days_demand: next7DaysDemand,
      next_30_days_demand: next30DaysDemand,
      stockout_risk: stockoutRisk,
      reorder_alert:
        Number(medicine.totalStock || 0) < Number(medicine.reorderLevel || 0) ||
        Number(medicine.totalStock || 0) <= expectedLeadTimeDemand ||
        reorderQuantity > 0,
      reorder_quantity: reorderQuantity,
      expiry_risk: expiryRisk,
      days_until_stockout: daysUntilStockout,
      reason_codes: reasonCodes
    },
    confidence: salesHistory.length >= 14 ? 0.45 : 0.0,
    explanation: `${explanationPrefix} Fallback estimates use recent average daily sales and reorder rules only.`,
    risk_level: riskLevel,
    requires_doctor_review: false,
    requires_admin_review: true,
    model_name: 'backend_rule_fallback',
    model_version: 'v1',
    model_status: salesHistory.length >= 14 ? 'fallback' : 'unavailable',
    audit_id: '',
    disclaimer: PHARMACY_AI_DISCLAIMER
  };
};

const persistPharmacyPrediction = async ({
  clinicId,
  medicineId,
  requesterId,
  inputData,
  responseData
}) => {
  await AIPrediction.create({
    clinicId,
    patientId: null,
    appointmentId: null,
    consultationId: null,
    medicineId,
    predictionType: 'pharmacy_demand',
    inputData,
    outputData: responseData,
    confidenceScore: Number(responseData?.confidence || 0),
    modelName: responseData?.model_name || '',
    modelVersion: responseData?.model_version || '',
    disclaimer: responseData?.disclaimer || PHARMACY_AI_DISCLAIMER,
    createdBy: requesterId
  });
};

const getRequesterDoctorProfile = async ({ requester, clinicId }) => {
  if (requester.role !== ROLES.DOCTOR) {
    return null;
  }

  const doctor = await doctorRepository.findDoctorByUserIdAndClinic({
    userId: requester._id,
    clinicId
  });

  if (!doctor) {
    throw new AppError('Doctor profile is not linked to this account.', HTTP_STATUS.FORBIDDEN);
  }

  return doctor;
};

const serializeMedicine = (medicine, today = new Date()) => {
  const medicineData = typeof medicine.toObject === 'function' ? medicine.toObject() : { ...medicine };
  const totalStock = recalculateTotalStock(medicineData, today);
  const stockFlags = getMedicineStockFlags(
    {
      ...medicineData,
      totalStock
    },
    today
  );

  return {
    ...medicineData,
    totalStock,
    stockFlags,
    batches: (medicineData.batches || []).map((batch) => ({
      ...batch,
      isExpired: isBatchExpired(batch.expiryDate, today),
      isNearExpiry: getNearExpiryStatus(batch.expiryDate, today)
    }))
  };
};

const serializeDispensingRecord = (dispensingRecord, pharmacySale = null) => ({
  ...dispensingRecord,
  pharmacySale: pharmacySale
    ? {
        _id: pharmacySale._id,
        amount: pharmacySale.amount,
        paymentStatus: pharmacySale.paymentStatus,
        paymentMethod: pharmacySale.paymentMethod,
        invoiceId: pharmacySale.invoiceId || null
      }
    : null
});

const getScopedMedicine = async ({ medicineId, requester, requestedClinicId = null, asDocument = false }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const medicine = asDocument
    ? await pharmacyRepository.findMedicineDocumentById({ id: medicineId, clinicId })
    : await pharmacyRepository.findMedicineById({
        id: medicineId,
        clinicId,
        populateDetails: true
      });

  if (!medicine) {
    throw new AppError('Medicine not found.', HTTP_STATUS.NOT_FOUND);
  }

  return { clinicId, medicine };
};

const getScopedDispensingRecord = async ({ dispensingId, requester, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const dispensingRecord = await pharmacyRepository.findDispensingRecordById({
    id: dispensingId,
    clinicId,
    populateDetails: true
  });

  if (!dispensingRecord) {
    throw new AppError('Dispensing record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return { clinicId, dispensingRecord };
};

const createMedicine = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });
  const medicine = await pharmacyRepository.createMedicine({
    clinicId,
    code: payload.code?.trim?.().toUpperCase() || '',
    name: payload.name.trim(),
    genericName: payload.genericName?.trim?.() || '',
    brandName: payload.brandName?.trim?.() || '',
    category: payload.category?.trim?.() || '',
    form: payload.form?.trim?.() || '',
    strength: payload.strength?.trim?.() || '',
    manufacturer: payload.manufacturer?.trim?.() || '',
    unitPrice: typeof payload.unitPrice !== 'undefined' ? Number(payload.unitPrice) : 0,
    reorderLevel: typeof payload.reorderLevel !== 'undefined' ? Number(payload.reorderLevel) : 0,
    supplierLeadTimeDays:
      typeof payload.supplierLeadTimeDays !== 'undefined' ? Number(payload.supplierLeadTimeDays) : 7,
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
    requiresPrescription:
      typeof payload.requiresPrescription === 'boolean' ? payload.requiresPrescription : true,
    batches: (payload.batches || []).map(normalizeBatch),
    createdBy: requester._id,
    updatedBy: requester._id
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'MEDICINE_CREATED',
    entity: 'Medicine',
    entityId: medicine._id,
    metadata: {
      clinicId: String(clinicId),
      code: medicine.code,
      name: medicine.name
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return serializeMedicine(medicine);
};

const listMedicines = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.category) {
    filter.category = query.category.trim();
  }

  if (typeof query.isActive === 'boolean') {
    filter.isActive = query.isActive;
  }

  if (query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [
      { code: pattern },
      { name: pattern },
      { genericName: pattern },
      { brandName: pattern },
      { category: pattern }
    ];
  }

  const medicines = await pharmacyRepository.listMedicines({ filter });
  let serializedMedicines = medicines.map((medicine) => serializeMedicine(medicine));

  if (typeof query.lowStock === 'boolean') {
    serializedMedicines = serializedMedicines.filter(
      (medicine) => medicine.stockFlags.lowStock === query.lowStock
    );
  }

  if (typeof query.nearExpiry === 'boolean') {
    serializedMedicines = serializedMedicines.filter(
      (medicine) => medicine.stockFlags.nearExpiry === query.nearExpiry
    );
  }

  const total = serializedMedicines.length;
  const start = (page - 1) * limit;

  return {
    medicines: serializedMedicines.slice(start, start + limit),
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getMedicineById = async ({ requester, medicineId, requestedClinicId = null }) => {
  const { medicine } = await getScopedMedicine({
    requester,
    medicineId,
    requestedClinicId
  });

  return { medicine: serializeMedicine(medicine) };
};

const getMedicineDemandForecast = async ({ requester, medicineId, requestedClinicId = null }) => {
  const { clinicId, medicine } = await getScopedMedicine({
    requester,
    medicineId,
    requestedClinicId,
    asDocument: true
  });
  const serializedMedicine = serializeMedicine(medicine);
  const salesHistory = await pharmacyRepository.getMedicineSalesHistory({
    clinicId,
    medicineId: medicine._id
  });
  const today = new Date();
  const inputData = {
    medicine_id: String(medicine._id),
    medicine_name: medicine.name,
    current_stock: Number(serializedMedicine.totalStock || 0),
    reorder_level: Number(medicine.reorderLevel || 0),
    supplier_lead_time_days: Number(medicine.supplierLeadTimeDays || 0),
    expiry_date: getNearestExpiryDate(medicine)?.toISOString?.().slice(0, 10) || undefined,
    sales_history: salesHistory,
    context: {
      season: getSeasonFromMonth(today.getUTCMonth() + 1),
      month: today.getUTCMonth() + 1,
      clinic_id: String(clinicId)
    }
  };

  let responseData;

  try {
    const aiResponse = await aiService.getPharmacyDemandForecast(inputData);
    responseData = aiResponse?.data || aiResponse;
  } catch (_error) {
    responseData = calculateBackendFallbackForecast({
      medicine: {
        ...medicine.toObject(),
        totalStock: serializedMedicine.totalStock
      },
      salesHistory
    });
  }

  try {
    await persistPharmacyPrediction({
      clinicId,
      medicineId: medicine._id,
      requesterId: requester._id,
      inputData,
      responseData
    });
  } catch (_error) {
    // Prediction persistence is best-effort and must not block inventory intelligence.
  }

  return {
    medicine: serializedMedicine,
    forecast: responseData
  };
};

const updateMedicine = async ({ requester, medicineId, payload, requestedClinicId = null, req }) => {
  const { clinicId, medicine } = await getScopedMedicine({
    requester,
    medicineId,
    requestedClinicId,
    asDocument: true
  });

  if (typeof payload.code !== 'undefined') {
    medicine.code = payload.code?.trim?.().toUpperCase() || '';
  }
  if (typeof payload.name !== 'undefined') {
    medicine.name = payload.name.trim();
  }
  if (typeof payload.genericName !== 'undefined') {
    medicine.genericName = payload.genericName?.trim?.() || '';
  }
  if (typeof payload.brandName !== 'undefined') {
    medicine.brandName = payload.brandName?.trim?.() || '';
  }
  if (typeof payload.category !== 'undefined') {
    medicine.category = payload.category?.trim?.() || '';
  }
  if (typeof payload.form !== 'undefined') {
    medicine.form = payload.form?.trim?.() || '';
  }
  if (typeof payload.strength !== 'undefined') {
    medicine.strength = payload.strength?.trim?.() || '';
  }
  if (typeof payload.manufacturer !== 'undefined') {
    medicine.manufacturer = payload.manufacturer?.trim?.() || '';
  }
  if (typeof payload.unitPrice !== 'undefined') {
    medicine.unitPrice = Number(payload.unitPrice);
  }
  if (typeof payload.reorderLevel !== 'undefined') {
    medicine.reorderLevel = Number(payload.reorderLevel);
  }
  if (typeof payload.supplierLeadTimeDays !== 'undefined') {
    medicine.supplierLeadTimeDays = Number(payload.supplierLeadTimeDays);
  }
  if (typeof payload.isActive !== 'undefined') {
    medicine.isActive = Boolean(payload.isActive);
  }
  if (typeof payload.requiresPrescription !== 'undefined') {
    medicine.requiresPrescription = Boolean(payload.requiresPrescription);
  }
  if (payload.batches) {
    medicine.batches = payload.batches.map(normalizeBatch);
  }
  medicine.updatedBy = requester._id;
  medicine.totalStock = recalculateTotalStock(medicine);
  await medicine.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'MEDICINE_UPDATED',
    entity: 'Medicine',
    entityId: medicine._id,
    metadata: {
      clinicId: String(clinicId),
      code: medicine.code,
      name: medicine.name
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return serializeMedicine(medicine);
};

const addMedicineBatch = async ({ requester, medicineId, payload, requestedClinicId = null, req }) => {
  const { clinicId, medicine } = await getScopedMedicine({
    requester,
    medicineId,
    requestedClinicId,
    asDocument: true
  });

  if ((medicine.batches || []).some((batch) => batch.batchNumber === payload.batchNumber.trim())) {
    throw new AppError('This batchNumber already exists for the selected medicine.', HTTP_STATUS.CONFLICT);
  }

  medicine.batches.push(normalizeBatch(payload));
  medicine.updatedBy = requester._id;
  medicine.totalStock = recalculateTotalStock(medicine);
  await medicine.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'BATCH_ADDED',
    entity: 'Medicine',
    entityId: medicine._id,
    metadata: {
      clinicId: String(clinicId),
      batchNumber: payload.batchNumber.trim(),
      name: medicine.name
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return serializeMedicine(medicine);
};

const findPrescriptionInstructions = ({ prescription, medicine }) => {
  const prescriptionItems = prescription?.medicines || [];
  const normalizedNames = [
    medicine.name,
    medicine.genericName,
    medicine.brandName
  ]
    .filter(Boolean)
    .map((value) => value.trim().toLowerCase());

  const matchedPrescriptionItem = prescriptionItems.find((item) => {
    const candidateNames = [item.medicineName, item.genericName]
      .filter(Boolean)
      .map((value) => value.trim().toLowerCase());

    return candidateNames.some((candidateName) => normalizedNames.includes(candidateName));
  });

  return matchedPrescriptionItem?.instructions || '';
};

const dispensePrescription = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });
  const prescription = await prescriptionRepository.findPrescriptionById({
    id: payload.prescriptionId,
    clinicId,
    populateDetails: true
  });

  if (!prescription) {
    throw new AppError('Prescription not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (prescription.status !== 'finalized') {
    throw new AppError('Only finalized prescriptions can be dispensed.', HTTP_STATUS.BAD_REQUEST);
  }

  if (String(prescription.patientId?._id || prescription.patientId) !== String(payload.patientId)) {
    throw new AppError('Prescription does not belong to the selected patient.', HTTP_STATUS.BAD_REQUEST);
  }

  if (payload.doctorId && String(prescription.doctorId?._id || prescription.doctorId) !== String(payload.doctorId)) {
    throw new AppError('Prescription does not belong to the selected doctor.', HTTP_STATUS.BAD_REQUEST);
  }

  if (prescription.dispensingStatus === 'dispensed') {
    throw new AppError('This prescription has already been dispensed.', HTTP_STATUS.BAD_REQUEST);
  }

  const existingDispensing = await pharmacyRepository.findDispensingByPrescriptionId({
    prescriptionId: prescription._id,
    clinicId,
    populateDetails: false,
    lean: true
  });

  if (existingDispensing && existingDispensing.status !== 'cancelled') {
    throw new AppError('A dispensing record already exists for this prescription.', HTTP_STATUS.CONFLICT);
  }

  const patient = await patientRepository.findPatientByIdAndClinic({
    patientId: payload.patientId,
    clinicId
  });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  const requestedMedicineIds = [...new Set(payload.items.map((item) => item.medicineId))];
  const medicines = await pharmacyRepository.findMedicineDocumentsByIds({
    ids: requestedMedicineIds,
    clinicId
  });

  if (medicines.length !== requestedMedicineIds.length) {
    throw new AppError('One or more selected medicines were not found.', HTTP_STATUS.BAD_REQUEST);
  }

  const medicineMap = new Map(medicines.map((medicine) => [String(medicine._id), medicine]));
  const originalMedicineSnapshots = new Map(
    medicines.map((medicine) => [
      String(medicine._id),
      {
        batches: JSON.parse(JSON.stringify(medicine.batches || [])),
        totalStock: medicine.totalStock
      }
    ])
  );

  const dispensingItems = [];
  let subtotal = 0;
  let medicinesSaved = false;

  try {
    for (const requestedItem of payload.items) {
      const medicine = medicineMap.get(String(requestedItem.medicineId));

      if (!medicine || !medicine.isActive) {
        throw new AppError('Selected medicine is not available for dispensing.', HTTP_STATUS.BAD_REQUEST);
      }

      const { allocations, remainingQuantity } = allocateDispensingBatches({
        medicine,
        requestedQuantity: requestedItem.quantity
      });

      if (remainingQuantity > 0) {
        throw new AppError(
          `Insufficient non-expired stock for ${medicine.name}.`,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const fallbackInstructions = findPrescriptionInstructions({
        prescription,
        medicine
      });
      const itemInstructions = requestedItem.instructions?.trim?.() || fallbackInstructions;

      for (const allocation of allocations) {
        const totalPrice = roundCurrency(allocation.quantity * allocation.unitPrice);

        dispensingItems.push({
          medicineId: medicine._id,
          medicineName: medicine.name,
          batchNumber: allocation.batchNumber,
          quantity: allocation.quantity,
          unitPrice: allocation.unitPrice,
          totalPrice,
          instructions: itemInstructions
        });
        subtotal = roundCurrency(subtotal + totalPrice);
      }

      medicine.totalStock = recalculateTotalStock(medicine);
      medicine.updatedBy = requester._id;
    }

    for (const medicine of medicines) {
      await medicine.save();
    }
    medicinesSaved = true;

    const dispensedAt = new Date();
    const dispensingRecord = await pharmacyRepository.createDispensingRecord({
      clinicId,
      prescriptionId: prescription._id,
      patientId: patient._id,
      doctorId: prescription.doctorId?._id || prescription.doctorId || null,
      dispensedBy: requester._id,
      items: dispensingItems,
      subtotal,
      notes: payload.notes?.trim?.() || '',
      status: 'dispensed',
      dispensedAt
    });

    const pharmacySale = await pharmacyRepository.createPharmacySale({
      clinicId,
      dispensingRecordId: dispensingRecord._id,
      patientId: patient._id,
      invoiceId: null,
      amount: subtotal,
      paymentStatus: 'pending',
      paymentMethod: null,
      notes: payload.notes?.trim?.() || '',
      createdBy: requester._id,
      updatedBy: requester._id
    });

    await prescriptionRepository.updatePrescription({
      id: prescription._id,
      clinicId,
      data: {
        dispensingStatus: 'dispensed',
        dispensedAt,
        updatedBy: requester._id
      },
      populateDetails: false
    });

    await createAuditLog({
      actorUserId: requester._id,
      action: 'DISPENSING_CREATED',
      entity: 'DispensingRecord',
      entityId: dispensingRecord._id,
      metadata: {
        clinicId: String(clinicId),
        prescriptionId: String(prescription._id),
        patientId: String(patient._id),
        subtotal
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    await createAuditLog({
      actorUserId: requester._id,
      action: 'PHARMACY_SALE_CREATED',
      entity: 'PharmacySale',
      entityId: pharmacySale._id,
      metadata: {
        clinicId: String(clinicId),
        dispensingRecordId: String(dispensingRecord._id),
        amount: subtotal
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    const populatedDispensingRecord = await pharmacyRepository.findDispensingRecordById({
      id: dispensingRecord._id,
      clinicId,
      populateDetails: true,
      lean: true
    });
    const populatedSale = await pharmacyRepository.findSaleByDispensingId({
      dispensingRecordId: dispensingRecord._id,
      clinicId,
      populateDetails: true,
      lean: true
    });

    return {
      dispensingRecord: serializeDispensingRecord(populatedDispensingRecord, populatedSale),
      pharmacySale: populatedSale
    };
  } catch (error) {
    if (medicinesSaved) {
      await Promise.all(
        medicines.map(async (medicine) => {
          const snapshot = originalMedicineSnapshots.get(String(medicine._id));

          if (!snapshot) {
            return;
          }

          medicine.batches = snapshot.batches;
          medicine.totalStock = snapshot.totalStock;
          medicine.updatedBy = requester._id;

          try {
            await medicine.save();
          } catch (_rollbackError) {
            // Best-effort rollback only.
          }
        })
      );
    }

    throw error;
  }
};

const listDispensings = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.patientId) {
    filter.patientId = query.patientId;
  }

  if (query.prescriptionId) {
    filter.prescriptionId = query.prescriptionId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.from || query.to) {
    filter.dispensedAt = {};
    if (query.from) {
      filter.dispensedAt.$gte = parseDateBoundary(query.from, false);
    }
    if (query.to) {
      filter.dispensedAt.$lte = parseDateBoundary(query.to, true);
    }
  }

  const { dispensingRecords, total } = await pharmacyRepository.listDispensingRecords({
    filter,
    page,
    limit
  });
  const sales = await pharmacyRepository.findSalesByDispensingIds({
    dispensingRecordIds: dispensingRecords.map((record) => record._id),
    clinicId
  });
  const salesByDispensingId = new Map(
    sales.map((sale) => [String(sale.dispensingRecordId), sale])
  );

  return {
    dispensingRecords: dispensingRecords.map((record) =>
      serializeDispensingRecord(record, salesByDispensingId.get(String(record._id)))
    ),
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getDispensingById = async ({ requester, dispensingId, requestedClinicId = null }) => {
  const { clinicId, dispensingRecord } = await getScopedDispensingRecord({
    requester,
    dispensingId,
    requestedClinicId
  });
  const pharmacySale = await pharmacyRepository.findSaleByDispensingId({
    dispensingRecordId: dispensingRecord._id,
    clinicId,
    populateDetails: true,
    lean: true
  });

  return {
    dispensingRecord: serializeDispensingRecord(
      typeof dispensingRecord.toObject === 'function' ? dispensingRecord.toObject() : dispensingRecord,
      pharmacySale
    ),
    pharmacySale
  };
};

const cancelDispensing = async ({ requester, dispensingId, requestedClinicId = null, req }) => {
  const { clinicId, dispensingRecord } = await getScopedDispensingRecord({
    requester,
    dispensingId,
    requestedClinicId
  });

  if (dispensingRecord.status === 'cancelled') {
    throw new AppError('Dispensing record is already cancelled.', HTTP_STATUS.BAD_REQUEST);
  }

  if (dispensingRecord.status !== 'draft') {
    throw new AppError(
      'Only draft dispensing records can be cancelled in this MVP.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const updatedDispensingRecord = await pharmacyRepository.updateDispensingRecord({
    id: dispensingRecord._id,
    clinicId,
    data: {
      status: 'cancelled'
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'DISPENSING_CANCELLED',
    entity: 'DispensingRecord',
    entityId: dispensingRecord._id,
    metadata: {
      clinicId: String(clinicId),
      prescriptionId: String(dispensingRecord.prescriptionId?._id || dispensingRecord.prescriptionId)
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return serializeDispensingRecord(
    typeof updatedDispensingRecord.toObject === 'function'
      ? updatedDispensingRecord.toObject()
      : updatedDispensingRecord
  );
};

const getPatientMedicineHistory = async ({ requester, patientId, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const patient = await patientRepository.findPatientByIdAndClinic({
    patientId,
    clinicId
  });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  const { page, limit } = getPagination(query);
  const filter = {
    clinicId,
    patientId
  };

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getRequesterDoctorProfile({ requester, clinicId });
    filter.doctorId = doctor._id;
  }

  const { dispensingRecords, total } = await pharmacyRepository.listDispensingRecords({
    filter,
    page,
    limit
  });
  const sales = await pharmacyRepository.findSalesByDispensingIds({
    dispensingRecordIds: dispensingRecords.map((record) => record._id),
    clinicId
  });
  const salesByDispensingId = new Map(
    sales.map((sale) => [String(sale.dispensingRecordId), sale])
  );

  return {
    patient,
    dispensingRecords: dispensingRecords.map((record) =>
      serializeDispensingRecord(record, salesByDispensingId.get(String(record._id)))
    ),
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

module.exports = {
  createMedicine,
  listMedicines,
  getMedicineById,
  getMedicineDemandForecast,
  updateMedicine,
  addMedicineBatch,
  dispensePrescription,
  listDispensings,
  getDispensingById,
  cancelDispensing,
  getPatientMedicineHistory
};
