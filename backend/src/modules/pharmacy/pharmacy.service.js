const { roundCurrency } = require('../../common/utils/billingCalculator');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext, ensureUserClinicContext } = require('../../common/utils/clinicContext');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const AIPrediction = require('../ai/aiPrediction.model');
const aiService = require('../ai/ai.service');
const { createAuditLog } = require('../audit/audit.service');
const doctorRepository = require('../doctors/doctor.repository');
const patientRepository = require('../patients/patient.repository');
const prescriptionRepository = require('../prescriptions/prescription.repository');
const pharmacyRepository = require('./pharmacy.repository');
const PharmacyOrder = require('./pharmacyOrder.model');
const MedicineMaster = require('./medicineMaster.model');
const BrandMaster = require('./brandMaster.model');
const MedicineBatch = require('./medicineBatch.model');
const Medicine = require('./medicine.model');
const StockMovementLedger = require('./stockMovementLedger.model');
const Supplier = require('./supplier.model');
const PurchaseOrder = require('./purchaseOrder.model');
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

const serializeDispensingRecord = (dispensingRecord, pharmacySale = null) => {
  const doc = typeof dispensingRecord.toObject === 'function' ? dispensingRecord.toObject() : dispensingRecord;
  return {
    ...doc,
    pharmacySale: pharmacySale
      ? {
          _id: pharmacySale._id,
          amount: pharmacySale.amount,
          paymentStatus: pharmacySale.paymentStatus,
          paymentMethod: pharmacySale.paymentMethod,
          invoiceId: pharmacySale.invoiceId || null
        }
      : null
  };
};

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

  let globalMed = null;
  let brand = null;
  
  if (payload.globalMedicineId) {
    const GlobalMedicine = require('../healthcare-catalog/globalMedicine.model');
    globalMed = await GlobalMedicine.findById(payload.globalMedicineId).populate('category');
    if (!globalMed) {
      throw new AppError('Global medicine not found.', HTTP_STATUS.NOT_FOUND);
    }
  } else {
    if (payload.brandId) {
      brand = await BrandMaster.findById(payload.brandId).populate('genericMedicineId');
      if (!brand) {
        throw new AppError('Brand not found in global master.', HTTP_STATUS.NOT_FOUND);
      }
    } else {
      // Legacy support: resolve or create generic medicine & brand on the fly
      const genericName = payload.genericName || payload.name || 'Unknown Generic';
      const brandName = payload.brandName || payload.name || 'Unknown Brand';

      let masterGen = await MedicineMaster.findOne({ genericName: { $regex: new RegExp(`^${escapeRegex(genericName)}$`, 'i') } });
      if (!masterGen) {
        masterGen = await MedicineMaster.create({
          genericName,
          drugCategory: payload.category || 'General',
          strengths: [payload.strength || '500mg'],
          dosageForms: [payload.form || 'Tablet']
        });
      }

      brand = await BrandMaster.findOne({ brandName: { $regex: new RegExp(`^${escapeRegex(brandName)}$`, 'i') } });
      if (!brand) {
        brand = await BrandMaster.create({
          brandName,
          manufacturer: payload.manufacturer || 'Unknown',
          genericMedicineId: masterGen._id,
          availableStrengths: [payload.strength || '500mg'],
          dosageForm: payload.form || 'Tablet'
        });
      }
      brand = await BrandMaster.findById(brand._id).populate('genericMedicineId');
    }
  }

  // Prevent double import of same global medicine in the same clinic
  if (globalMed) {
    const existing = await Medicine.findOne({ clinicId, globalMedicineId: globalMed._id });
    if (existing) {
      throw new AppError('This medicine has already been imported into your clinic inventory', HTTP_STATUS.CONFLICT);
    }
  }

  const medicine = await pharmacyRepository.createMedicine({
    clinicId,
    brandId: brand ? brand._id : undefined,
    globalMedicineId: globalMed ? globalMed._id : undefined,
    code: payload.code?.trim?.().toUpperCase() || '',
    name: globalMed ? globalMed.displayName : (payload.name || brand.brandName),
    genericName: globalMed ? globalMed.genericName : (brand.genericMedicineId?.genericName || ''),
    brandName: globalMed ? globalMed.brandName : brand.brandName,
    category: globalMed ? (globalMed.category?.name || '') : (brand.genericMedicineId?.drugCategory || payload.category || ''),
    form: globalMed ? globalMed.dosageForm : (brand.dosageForm || payload.form || ''),
    strength: globalMed ? globalMed.strength : (payload.strength || brand.availableStrengths?.[0] || ''),
    manufacturer: globalMed ? globalMed.manufacturer : (brand.manufacturer || payload.manufacturer || ''),
    distributor: payload.distributor || '',
    purchasePrice: typeof payload.purchasePrice !== 'undefined' ? Number(payload.purchasePrice) : (typeof payload.unitPrice !== 'undefined' ? Number(payload.unitPrice) : 0),
    sellingPrice: typeof payload.sellingPrice !== 'undefined' ? Number(payload.sellingPrice) : (typeof payload.unitPrice !== 'undefined' ? Number(payload.unitPrice) : 0),
    unitPrice: typeof payload.unitPrice !== 'undefined' ? Number(payload.unitPrice) : 0,
    gst: typeof payload.gst !== 'undefined' ? Number(payload.gst) : 0,
    discount: typeof payload.discount !== 'undefined' ? Number(payload.discount) : 0,
    minimumStock: typeof payload.minimumStock !== 'undefined' ? Number(payload.minimumStock) : 0,
    maximumStock: typeof payload.maximumStock !== 'undefined' ? Number(payload.maximumStock) : 0,
    reorderLevel: typeof payload.reorderLevel !== 'undefined' ? Number(payload.reorderLevel) : 0,
    rackNumber: payload.rackNumber || '',
    storageLocation: payload.storageLocation || '',
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
    requiresPrescription: typeof payload.requiresPrescription === 'boolean' ? payload.requiresPrescription : true,
    createdBy: requester._id,
    updatedBy: requester._id
  });

  const batches = (payload.batches || []).map(normalizeBatch);
  let totalStock = 0;
  for (const b of batches) {
    await MedicineBatch.create({
      inventoryId: medicine._id,
      batchNumber: b.batchNumber,
      manufacturingDate: b.receivedAt,
      expiryDate: b.expiryDate,
      purchaseQuantity: b.quantity,
      availableStock: b.quantity,
      quantity: b.quantity,
      purchasePrice: b.purchasePrice,
      sellingPrice: b.sellingPrice
    });
    totalStock += b.quantity;
  }

  medicine.totalStock = totalStock;
  await medicine.save();

  const populatedMed = await pharmacyRepository.findMedicineById({ id: medicine._id, clinicId });

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

  return serializeMedicine(populatedMed);
};

const listMedicines = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { page, limit } = getPagination(query);
  const filter = {};

  if (
    (query.allClinics === true || query.allClinics === 'true') &&
    requester?.organizationId &&
    (requester.role === ROLES.SUPER_ADMIN || requester.role === ROLES.ADMIN || requester.role === ROLES.PHARMACIST)
  ) {
    const Clinic = require('../clinics/clinic.model');
    const clinics = await Clinic.find({ organizationId: requester.organizationId, isActive: true }).select('_id');
    const clinicIds = clinics.map(c => c._id);
    filter.clinicId = { $in: clinicIds };
  } else {
    const clinicId = resolveClinicContext({
      user: requester,
      requestedClinicId: requestedClinicId || query.clinicId
    });
    filter.clinicId = clinicId;
  }

  console.log('listMedicines QUERY FILTER:', JSON.stringify(filter));

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
  console.log('listMedicines RAW DB RESULT LENGTH:', medicines.length);
  console.log('listMedicines RAW DB RESULT:', JSON.stringify(medicines));
  let serializedMedicines = medicines.map((medicine) => serializeMedicine(medicine));

  if (typeof query.lowStock !== 'undefined') {
    const isLowStock = query.lowStock === true || query.lowStock === 'true';
    serializedMedicines = serializedMedicines.filter(
      (medicine) => medicine.stockFlags.lowStock === isLowStock
    );
  }

  if (typeof query.nearExpiry !== 'undefined') {
    const isNearExpiry = query.nearExpiry === true || query.nearExpiry === 'true';
    serializedMedicines = serializedMedicines.filter(
      (medicine) => medicine.stockFlags.nearExpiry === isNearExpiry
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
    await MedicineBatch.deleteMany({ inventoryId: medicine._id });
    const normalizedBatches = payload.batches.map(normalizeBatch);
    for (const b of normalizedBatches) {
      await MedicineBatch.create({
        inventoryId: medicine._id,
        batchNumber: b.batchNumber,
        manufacturingDate: b.receivedAt,
        expiryDate: b.expiryDate,
        purchaseQuantity: b.quantity,
        availableStock: b.quantity,
        quantity: b.quantity,
        purchasePrice: b.purchasePrice,
        sellingPrice: b.sellingPrice
      });
    }
  }
  
  const allBatches = await MedicineBatch.find({ inventoryId: medicine._id });
  medicine.totalStock = allBatches.reduce((sum, b) => sum + b.availableStock, 0);
  medicine.updatedBy = requester._id;
  await medicine.save();

  const populatedMed = await pharmacyRepository.findMedicineById({ id: medicine._id, clinicId });

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

  return serializeMedicine(populatedMed);
};

const addMedicineBatch = async ({ requester, medicineId, payload, requestedClinicId = null, req }) => {
  const { clinicId, medicine } = await getScopedMedicine({
    requester,
    medicineId,
    requestedClinicId,
    asDocument: true
  });

  const exists = await MedicineBatch.findOne({ inventoryId: medicine._id, batchNumber: payload.batchNumber.trim() });
  if (exists) {
    throw new AppError('This batchNumber already exists for the selected medicine.', HTTP_STATUS.CONFLICT);
  }

  const normalized = normalizeBatch(payload);
  const previousStock = medicine.totalStock || 0;
  
  const batch = await MedicineBatch.create({
    inventoryId: medicine._id,
    batchNumber: normalized.batchNumber,
    manufacturingDate: normalized.receivedAt,
    expiryDate: normalized.expiryDate,
    purchaseQuantity: normalized.quantity,
    availableStock: normalized.quantity,
    quantity: normalized.quantity,
    purchasePrice: normalized.purchasePrice,
    sellingPrice: normalized.sellingPrice,
    supplier: payload.supplier || '',
    invoiceNumber: payload.invoiceNumber || ''
  });

  const allBatches = await MedicineBatch.find({ inventoryId: medicine._id });
  const updatedStock = allBatches.reduce((sum, b) => sum + b.availableStock, 0);
  medicine.totalStock = updatedStock;
  medicine.updatedBy = requester._id;
  await medicine.save();

  // Create Stock Ledger Entry
  await StockMovementLedger.create({
    clinicId,
    branchId: payload.branchId || null,
    medicineId: medicine._id,
    batchId: batch._id,
    movementType: payload.isOpeningStock ? 'Initial Opening Stock' : 'Stock In',
    quantity: normalized.quantity,
    previousStock,
    updatedStock,
    reason: payload.remarks || 'New stock batch added',
    notes: payload.notes || '',
    userId: requester._id
  });

  const populatedMed = await pharmacyRepository.findMedicineById({ id: medicine._id, clinicId });

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

  return serializeMedicine(populatedMed);
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
      if (medicine.batches && medicine.batches.length > 0) {
        for (const batch of medicine.batches) {
          if (batch.save) {
            await batch.save();
          }
        }
      }
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
      action: 'PRESCRIPTION_DISPENSED',
      entity: 'DispensingRecord',
      entityId: dispensingRecord._id,
      metadata: {
        clinicId: String(clinicId),
        prescriptionId: String(prescription._id)
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    const [populatedDispensingRecord, populatedSale] = await Promise.all([
      pharmacyRepository.findDispensingRecordById({
        id: dispensingRecord._id,
        clinicId,
        populateDetails: true
      }),
      pharmacyRepository.findSaleByDispensingId({
        dispensingRecordId: dispensingRecord._id,
        clinicId,
        populateDetails: true,
        lean: true
      })
    ]);

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

          await MedicineBatch.deleteMany({ inventoryId: medicine._id });
          for (const b of snapshot.batches) {
            await MedicineBatch.create({
              inventoryId: medicine._id,
              batchNumber: b.batchNumber,
              manufacturingDate: b.receivedAt || b.manufacturingDate,
              expiryDate: b.expiryDate,
              purchaseQuantity: b.purchaseQuantity || b.quantity || 0,
              availableStock: b.availableStock || b.quantity || 0,
              quantity: b.quantity || b.availableStock || 0,
              purchasePrice: b.purchasePrice || 0,
              sellingPrice: b.sellingPrice || 0
            });
          }

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

  if (requester.role === ROLES.PATIENT) {
    const patientProfile = await patientRepository.findPatientByUserId({ userId: requester._id });
    if (!patientProfile || String(patientProfile._id) !== String(patientId)) {
      throw new AppError('You can only access your own medicine history.', HTTP_STATUS.FORBIDDEN);
    }
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

const createPharmacyOrder = async ({ requester, payload, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: payload.clinicId
  });

  let patientId = payload.patientId;
  if (requester.role === ROLES.PATIENT) {
    const patient = await patientRepository.findPatientByUserId({ userId: requester._id });
    if (!patient) {
      throw new AppError('Patient profile not found for this user.', HTTP_STATUS.NOT_FOUND);
    }
    patientId = patient._id;
  }

  if (!patientId) {
    throw new AppError('Patient ID is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const medicine = await Medicine.findOne({ _id: payload.medicineId, clinicId });
  if (!medicine) {
    throw new AppError('Medicine not found in this clinic.', HTTP_STATUS.NOT_FOUND);
  }

  if (!medicine.isActive) {
    throw new AppError('This medicine is currently unavailable.', HTTP_STATUS.BAD_REQUEST);
  }

  if (medicine.totalStock < payload.quantity) {
    throw new AppError('Insufficient stock available.', HTTP_STATUS.BAD_REQUEST);
  }

  // Deduct stock immediately to hold the reservation
  const { allocations, remainingQuantity } = allocateDispensingBatches({
    medicine,
    requestedQuantity: payload.quantity
  });

  if (remainingQuantity > 0) {
    throw new AppError('Failed to allocate medicine from batches. Insufficient active/unexpired stock.', HTTP_STATUS.BAD_REQUEST);
  }

  await medicine.save();
  if (medicine.batches && medicine.batches.length > 0) {
    for (const batch of medicine.batches) {
      if (batch.save) await batch.save();
    }
  }

  const totalPrice = Number((medicine.unitPrice || 0) * payload.quantity);

  const order = await PharmacyOrder.create({
    clinicId,
    patientId,
    medicineId: medicine._id,
    quantity: payload.quantity,
    prescriptionType: payload.prescriptionType,
    prescriptionId: payload.prescriptionId || null,
    prescriptionFile: payload.prescriptionFile || '',
    totalPrice,
    status: 'pending'
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PHARMACY_ORDER_CREATED',
    entity: 'PharmacyOrder',
    entityId: order._id,
    metadata: {
      clinicId: String(clinicId),
      medicineId: String(medicine._id),
      quantity: payload.quantity
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return order;
};

const listPharmacyOrders = async ({ requester, query = {} }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });

  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.patientId) {
    filter.patientId = query.patientId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    PharmacyOrder.find(filter)
      .populate('patientId', 'firstName lastName fullName phone email')
      .populate({
        path: 'medicineId',
        select: 'name genericName brandName form strength manufacturer unitPrice'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PharmacyOrder.countDocuments(filter)
  ]);

  return {
    orders,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const updatePharmacyOrderStatus = async ({ requester, orderId, status, req }) => {
  const order = await PharmacyOrder.findById(orderId);
  if (!order) {
    throw new AppError('Order not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (order.status === status) {
    return order;
  }

  const oldStatus = order.status;
  order.status = status;
  await order.save();

  // If order is cancelled, return the stock
  if (status === 'cancelled' && oldStatus !== 'cancelled') {
    const medicine = await Medicine.findById(order.medicineId);
    if (medicine) {
      let batch = await MedicineBatch.findOne({ inventoryId: medicine._id }).sort({ expiryDate: -1 });
      if (batch) {
        batch.quantity += order.quantity;
        batch.availableStock += order.quantity;
        await batch.save();
      } else {
        await MedicineBatch.create({
          inventoryId: medicine._id,
          batchNumber: `RESTOCK-ORD-${order._id}`,
          expiryDate: new Date('2028-12-31'),
          purchaseQuantity: order.quantity,
          availableStock: order.quantity,
          quantity: order.quantity,
          purchasePrice: Math.round(medicine.unitPrice * 0.7),
          sellingPrice: medicine.unitPrice
        });
      }
      const allBatches = await MedicineBatch.find({ inventoryId: medicine._id });
      medicine.totalStock = allBatches.reduce((sum, b) => sum + b.availableStock, 0);
      await medicine.save();
    }
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PHARMACY_ORDER_STATUS_UPDATED',
    entity: 'PharmacyOrder',
    entityId: order._id,
    metadata: {
      clinicId: String(order.clinicId),
      oldStatus,
      newStatus: status
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return order;
};

// ─── SUPPLIER MANAGEMENT SERVICES ──────────────────────────────────────────────

const createSupplier = async ({ requester, payload, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const existing = await Supplier.findOne({ clinicId, name: new RegExp(`^${payload.name.trim()}$`, 'i') });
  if (existing) {
    throw new AppError('A supplier with this name already exists.', HTTP_STATUS.CONFLICT);
  }
  return Supplier.create({ ...payload, clinicId });
};

const listSuppliers = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const filter = { clinicId };
  if (query.search) {
    filter.name = new RegExp(query.search, 'i');
  }
  if (typeof query.isActive === 'boolean') {
    filter.isActive = query.isActive;
  }
  return Supplier.find(filter).sort({ name: 1 });
};

const updateSupplier = async ({ requester, supplierId, payload, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const supplier = await Supplier.findOne({ _id: supplierId, clinicId });
  if (!supplier) {
    throw new AppError('Supplier not found.', HTTP_STATUS.NOT_FOUND);
  }
  return Supplier.findByIdAndUpdate(supplierId, payload, { new: true });
};

const deleteSupplier = async ({ requester, supplierId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const supplier = await Supplier.findOne({ _id: supplierId, clinicId });
  if (!supplier) {
    throw new AppError('Supplier not found.', HTTP_STATUS.NOT_FOUND);
  }
  await Supplier.findByIdAndDelete(supplierId);
  return { success: true };
};

// ─── PURCHASE ORDER SERVICES ──────────────────────────────────────────────────

const createPurchaseOrder = async ({ requester, payload, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  
  // Generate PO number
  const count = await PurchaseOrder.countDocuments({ clinicId });
  const poNumber = `PO-${String(count + 1).padStart(6, '0')}`;

  const po = await PurchaseOrder.create({
    poNumber,
    clinicId,
    branchId: payload.branchId || null,
    supplierId: payload.supplierId,
    items: payload.items || [],
    status: payload.status || 'Draft',
    remarks: payload.remarks || '',
    createdBy: requester._id
  });

  return po;
};

const listPurchaseOrders = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const filter = { clinicId };
  
  if (query.status) filter.status = query.status;
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.branchId) filter.branchId = query.branchId;

  return PurchaseOrder.find(filter)
    .populate('supplierId')
    .populate('items.medicineId')
    .sort({ createdAt: -1 });
};

const receivePurchaseOrder = async ({ requester, poId, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const po = await PurchaseOrder.findOne({ _id: poId, clinicId });
  if (!po) {
    throw new AppError('Purchase order not found.', HTTP_STATUS.NOT_FOUND);
  }

  // payload.items format: [{ medicineId, quantityReceived, batchNumber, manufacturingDate, expiryDate, purchasePrice, sellingPrice }]
  for (const item of payload.items || []) {
    const poItem = po.items.find(i => String(i.medicineId) === String(item.medicineId));
    if (!poItem) continue;

    poItem.receivedQuantity = (poItem.receivedQuantity || 0) + Number(item.quantityReceived);
    if (poItem.receivedQuantity >= poItem.quantity) {
      poItem.status = 'Received';
    } else if (poItem.receivedQuantity > 0) {
      poItem.status = 'Partially Received';
    }

    // Add batch to medicine
    const medicine = await Medicine.findOne({ _id: item.medicineId, clinicId });
    if (medicine) {
      const exists = await MedicineBatch.findOne({ inventoryId: medicine._id, batchNumber: item.batchNumber.trim() });
      let batch;
      if (exists) {
        exists.quantity += Number(item.quantityReceived);
        exists.availableStock += Number(item.quantityReceived);
        await exists.save();
        batch = exists;
      } else {
        batch = await MedicineBatch.create({
          inventoryId: medicine._id,
          batchNumber: item.batchNumber.trim(),
          manufacturingDate: item.manufacturingDate || null,
          expiryDate: item.expiryDate,
          purchaseQuantity: Number(item.quantityReceived),
          availableStock: Number(item.quantityReceived),
          quantity: Number(item.quantityReceived),
          purchasePrice: item.purchasePrice || poItem.unitCost || 0,
          sellingPrice: item.sellingPrice || medicine.sellingPrice || 0,
          supplier: po.supplierId ? (await Supplier.findById(po.supplierId))?.name : '',
          invoiceNumber: payload.invoiceNumber || ''
        });
      }

      // Recalculate totalStock
      const previousStock = medicine.totalStock || 0;
      const allBatches = await MedicineBatch.find({ inventoryId: medicine._id });
      const updatedStock = allBatches.reduce((sum, b) => sum + b.availableStock, 0);
      medicine.totalStock = updatedStock;
      await medicine.save();

      // Create Ledger Record
      await StockMovementLedger.create({
        clinicId,
        branchId: po.branchId || null,
        medicineId: medicine._id,
        batchId: batch._id,
        movementType: 'Stock In',
        quantity: Number(item.quantityReceived),
        previousStock,
        updatedStock,
        reason: `Received from Purchase Order ${po.poNumber}`,
        notes: po.remarks || '',
        userId: requester._id
      });
    }
  }

  // Update PO status
  const allReceived = po.items.every(i => i.status === 'Received');
  const someReceived = po.items.some(i => i.status === 'Received' || i.status === 'Partially Received');
  po.status = allReceived ? 'Received' : (someReceived ? 'Partially Received' : 'Submitted');
  await po.save();

  return po;
};

// ─── STOCK ADJUSTMENT SERVICES ───────────────────────────────────────────────

const adjustStock = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  
  const { medicineId, batchId, quantity, adjustmentType, reason, notes } = payload;
  const medicine = await Medicine.findOne({ _id: medicineId, clinicId });
  if (!medicine) {
    throw new AppError('Medicine not found.', HTTP_STATUS.NOT_FOUND);
  }

  const batch = await MedicineBatch.findOne({ _id: batchId, inventoryId: medicineId });
  if (!batch) {
    throw new AppError('Batch not found for this medicine.', HTTP_STATUS.NOT_FOUND);
  }

  const previousStock = medicine.totalStock || 0;
  const changeQty = Number(quantity); // can be positive or negative

  // Adjust batch stock
  batch.availableStock = Math.max(0, batch.availableStock + changeQty);
  batch.quantity = batch.availableStock;
  await batch.save();

  // Recalculate medicine total stock
  const allBatches = await MedicineBatch.find({ inventoryId: medicineId });
  const updatedStock = allBatches.reduce((sum, b) => sum + b.availableStock, 0);
  medicine.totalStock = updatedStock;
  await medicine.save();

  // Log stock movement ledger entry
  const ledger = await StockMovementLedger.create({
    clinicId,
    branchId: payload.branchId || null,
    medicineId,
    batchId,
    movementType: adjustmentType || 'Adjustment', // e.g. 'Adjustment', 'Damage', 'Expired', 'Returned'
    quantity: changeQty,
    previousStock,
    updatedStock,
    reason: reason || 'Manual adjustment',
    notes: notes || '',
    userId: requester._id
  });

  return { medicine, batch, ledger };
};

// ─── STOCK LEDGER SERVICES ────────────────────────────────────────────────────

const listStockLedgers = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const filter = { clinicId };

  if (query.medicineId) filter.medicineId = query.medicineId;
  if (query.movementType) filter.movementType = query.movementType;
  if (query.branchId) filter.branchId = query.branchId;

  return StockMovementLedger.find(filter)
    .populate('medicineId')
    .populate('batchId')
    .populate('userId', 'name role')
    .sort({ createdAt: -1 });
};

// ─── INVENTORY DASHBOARD STATISTICS ──────────────────────────────────────────

const getPharmacyInventoryDashboard = async ({ requester, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  
  const medicines = await Medicine.find({ clinicId, isActive: true }).populate('batches');
  
  let totalMedicines = medicines.length;
  let totalInventoryValue = 0;
  let availableStock = 0;
  let lowStock = 0;
  let outOfStock = 0;

  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  let expiring30Days = 0;
  let expiredMedicines = 0;

  for (const med of medicines) {
    const stock = med.totalStock || 0;
    availableStock += stock;
    
    if (stock === 0) {
      outOfStock++;
    } else if (stock <= (med.reorderLevel || 10)) {
      lowStock++;
    }

    let purchasePrice = med.purchasePrice || 0;
    
    // Add up value from batches
    if (med.batches && med.batches.length > 0) {
      for (const batch of med.batches) {
        totalInventoryValue += (batch.availableStock || 0) * (batch.purchasePrice || purchasePrice);
        
        if (batch.availableStock > 0 && batch.expiryDate) {
          const expDate = new Date(batch.expiryDate);
          if (expDate < now) {
            expiredMedicines++;
          } else if (expDate <= thirtyDaysLater) {
            expiring30Days++;
          }
        }
      }
    } else {
      totalInventoryValue += stock * purchasePrice;
    }
  }

  const purchaseOrdersPending = await PurchaseOrder.countDocuments({
    clinicId,
    status: { $in: ['Draft', 'Pending Approval', 'Submitted', 'Partially Received'] }
  });

  return {
    totalMedicines,
    totalInventoryValue: Math.round(totalInventoryValue),
    availableStock,
    lowStock,
    outOfStock,
    expiring30Days,
    expiredMedicines,
    purchaseOrdersPending
  };
};

module.exports = {
  createSupplier,
  listSuppliers,
  updateSupplier,
  deleteSupplier,
  createPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  adjustStock,
  listStockLedgers,
  getPharmacyInventoryDashboard,
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
  getPatientMedicineHistory,
  createPharmacyOrder,
  listPharmacyOrders,
  updatePharmacyOrderStatus,
  searchAllMedicines: async ({ requester, search, clinicId: requestedClinicId }) => {
    // Use async ensureUserClinicContext so that if clinicId is missing from the JWT
    // (e.g. token issued before the field was set), the Doctor collection is consulted.
    const clinicId = requestedClinicId
      ? String(requestedClinicId)
      : await ensureUserClinicContext(requester);

    if (!clinicId) {
      throw new AppError('Clinic context is required for this operation.', HTTP_STATUS.FORBIDDEN);
    }

    const cleanSearch = (search || '').trim();
    if (!cleanSearch) {
      return { generics: [], brands: [], clinicInventory: [] };
    }

    const regex = new RegExp(escapeRegex(cleanSearch), 'i');

    // 1. Search Medicine Masters (Generics)
    const generics = await MedicineMaster.find({
      genericName: regex
    }).limit(10);

    // 2. Search Brand Masters (Brands)
    const brands = await BrandMaster.find({
      $or: [{ brandName: regex }, { manufacturer: regex }]
    }).populate('genericMedicineId').limit(10);

    // 3. Search Clinic Inventory
    const clinicInventory = await Medicine.find({
      clinicId,
      $or: [{ name: regex }, { genericName: regex }, { brandName: regex }]
    }).populate('batches').limit(10);

    return {
      generics,
      brands,
      clinicInventory: clinicInventory.map(med => serializeMedicine(med))
    };
  },
  createProcurementRequest: async ({ requester, payload, clinicId: requestedClinicId }) => {
    const clinicId = requestedClinicId
      ? String(requestedClinicId)
      : await ensureUserClinicContext(requester);

    if (!clinicId) {
      throw new AppError('Clinic context is required for this operation.', HTTP_STATUS.FORBIDDEN);
    }

    const PharmacyProcurementRequest = require('./pharmacyProcurementRequest.model');

    // Use findOneAndUpdate to increment count if same generic, strength, dosageForm exists
    const request = await PharmacyProcurementRequest.findOneAndUpdate(
      {
        clinicId,
        genericName: payload.genericName.trim(),
        strength: (payload.strength || '').trim(),
        dosageForm: (payload.dosageForm || '').trim()
      },
      {
        $addToSet: {
          prescribedBy: requester._id,
          patients: payload.patientId ? payload.patientId : []
        },
        $inc: { requestCount: 1 },
        $set: { status: 'Pending' }
      },
      { new: true, upsert: true }
    );

    return request;
  },
  listProcurementRequests: async ({ requester, clinicId: requestedClinicId }) => {
    const clinicId = requestedClinicId
      ? String(requestedClinicId)
      : await ensureUserClinicContext(requester);

    if (!clinicId) {
      throw new AppError('Clinic context is required for this operation.', HTTP_STATUS.FORBIDDEN);
    }

    const PharmacyProcurementRequest = require('./pharmacyProcurementRequest.model');
    return PharmacyProcurementRequest.find({ clinicId })
      .populate('prescribedBy', 'fullName name')
      .populate('patients', 'fullName patientId')
      .sort({ requestCount: -1 });
  },
  updateProcurementRequestStatus: async ({ requester, requestId, status, clinicId: requestedClinicId }) => {
    const clinicId = requestedClinicId
      ? String(requestedClinicId)
      : await ensureUserClinicContext(requester);

    if (!clinicId) {
      throw new AppError('Clinic context is required for this operation.', HTTP_STATUS.FORBIDDEN);
    }

    const PharmacyProcurementRequest = require('./pharmacyProcurementRequest.model');
    const request = await PharmacyProcurementRequest.findOneAndUpdate(
      { _id: requestId, clinicId },
      { $set: { status } },
      { new: true }
    );

    if (!request) {
      throw new AppError('Procurement request not found.', HTTP_STATUS.NOT_FOUND);
    }

    return request;
  }
};
