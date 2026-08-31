const mongoose = require('mongoose');
const { ROLES } = require('../../common/constants/roles');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { generateLabOrderNumber } = require('../../common/utils/generateLabOrderNumber');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const { createAuditLog } = require('../audit/audit.service');
const aiService = require('../ai/ai.service');
const consultationRepository = require('../consultations/consultation.repository');
const doctorRepository = require('../doctors/doctor.repository');
const patientRepository = require('../patients/patient.repository');
const labRepository = require('./lab.repository');
const GlobalLabTest = require('../healthcare-catalog/globalLabTest.model');
const InvestigationParameter = require('../healthcare-catalog/investigationParameter.model');
const LabTestMaster = require('./labTestMaster.model');
const LabTest = require('./labTest.model');
const LabConsumable = require('./labConsumable.model');
const LabConsumableBatch = require('./labConsumableBatch.model');
const LabStockLedger = require('./labStockLedger.model');
const Supplier = require('../pharmacy/supplier.model');
const LabEquipment = require('./labEquipment.model');
const LabQcCalibration = require('./labQcCalibration.model');
const LabReport = require('./labReport.model');
const { LabOrder } = require('./labOrder.model');
const Provider = require('../providers/provider.model');
const Patient = require('../patients/patient.model');
const Prescription = require('../prescriptions/prescription.model');
const Consultation = require('../consultations/consultation.model');

const verifyLaboratoryAccess = async (laboratoryId, clinicId) => {
  if (!laboratoryId) {
    throw new AppError('laboratoryId is required for this operational context.', HTTP_STATUS.BAD_REQUEST);
  }
  const provider = await Provider.findOne({ _id: laboratoryId, clinicId, providerType: 'Laboratory' });
  if (!provider) {
    throw new AppError('Access Denied. Selected Laboratory Provider does not belong to this clinic or does not exist.', HTTP_STATUS.FORBIDDEN);
  }
  return provider;
};

const ORDER_STATUS_TRANSITIONS = {
  ordered: ['sample_collected', 'cancelled'],
  sample_collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

const AI_ANALYSIS_DISCLAIMER = 'AI output is assistive only and must be reviewed by a qualified doctor.';
const AI_ANALYSIS_NOTES_PENDING = 'AI analysis will run after numeric lab values are entered.';
const AI_ANALYSIS_REVIEW_STATUSES = {
  NOT_REQUESTED: 'not_requested',
  PENDING_REVIEW: 'pending_review',
  REVIEWED: 'reviewed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
};
const AI_ANALYSIS_STORAGE_STATUSES = {
  NOT_REQUESTED: 'not_requested',
  AVAILABLE: 'available',
  INSUFFICIENT_REFERENCE_DATA: 'insufficient_reference_data',
  UNAVAILABLE: 'unavailable',
  AI_SERVICE_UNAVAILABLE: 'ai_service_unavailable'
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDateBoundary = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
};

const normalizeNormalRange = (range = {}) => ({
  ...(typeof range?.min !== 'undefined' ? { min: Number(range.min) } : {}),
  ...(typeof range?.max !== 'undefined' ? { max: Number(range.max) } : {}),
  ...(range?.text ? { text: range.text.trim() } : {})
});

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

const getScopedLabOrder = async ({ requester, labOrderId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const labOrder = await labRepository.findLabOrderById({
    id: labOrderId,
    clinicId,
    populateDetails: true
  });

  if (!labOrder) {
    throw new AppError('Lab order not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getRequesterDoctorProfile({ requester, clinicId });

    if (String(labOrder.doctorId?._id || labOrder.doctorId) !== String(doctor._id)) {
      throw new AppError('You can only access your own lab orders.', HTTP_STATUS.FORBIDDEN);
    }
  }

  return { clinicId, labOrder };
};

const getScopedLabReport = async ({ requester, labReportId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const labReport = await labRepository.findLabReportById({
    id: labReportId,
    clinicId,
    populateDetails: true
  });

  if (!labReport) {
    throw new AppError('Lab report not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getRequesterDoctorProfile({ requester, clinicId });
    const orderDoctorId = labReport.labOrderId?.doctorId?._id || labReport.labOrderId?.doctorId;

    if (!orderDoctorId || String(orderDoctorId) !== String(doctor._id)) {
      throw new AppError('You can only access your own lab reports.', HTTP_STATUS.FORBIDDEN);
    }
  }

  return { clinicId, labReport };
};

const computeAbnormalFlag = ({ numericValue, normalRange = {} }) => {
  if (typeof numericValue !== 'number' || Number.isNaN(numericValue)) {
    return {
      isAbnormal: false,
      abnormalFlag: 'normal'
    };
  }

  const hasMin = typeof normalRange.min === 'number' && !Number.isNaN(normalRange.min);
  const hasMax = typeof normalRange.max === 'number' && !Number.isNaN(normalRange.max);

  if (!hasMin && !hasMax) {
    return {
      isAbnormal: false,
      abnormalFlag: 'normal'
    };
  }

  if (hasMin && numericValue < normalRange.min) {
    const criticalThreshold =
      typeof normalRange.max === 'number' && normalRange.max > normalRange.min
        ? normalRange.min - (normalRange.max - normalRange.min)
        : normalRange.min * 0.75;

    return {
      isAbnormal: true,
      abnormalFlag: numericValue <= criticalThreshold ? 'critical' : 'low'
    };
  }

  if (hasMax && numericValue > normalRange.max) {
    const criticalThreshold =
      typeof normalRange.min === 'number' && normalRange.max > normalRange.min
        ? normalRange.max + (normalRange.max - normalRange.min)
        : normalRange.max * 1.25;

    return {
      isAbnormal: true,
      abnormalFlag: numericValue >= criticalThreshold ? 'critical' : 'high'
    };
  }

  return {
    isAbnormal: false,
    abnormalFlag: 'normal'
  };
};

const buildAbnormalHighlight = (entry) => {
  if (!entry.isAbnormal) {
    return '';
  }

  if (entry.abnormalFlag === 'critical') {
    return `${entry.name} is critically outside the reference range`;
  }

  if (entry.abnormalFlag === 'low') {
    return `${entry.name} is below reference range`;
  }

  if (entry.abnormalFlag === 'high') {
    return `${entry.name} is above reference range`;
  }

  return `${entry.name} is outside reference range`;
};

const buildAiAnalysisPlaceholder = (resultEntries = []) => {
  const abnormalEntries = resultEntries.filter((entry) => entry.isAbnormal);

  if (!abnormalEntries.length) {
    return {
      summary: 'All recorded parameters are within the provided reference range. Doctor review required.',
      abnormalHighlights: [],
      disclaimer: AI_ANALYSIS_DISCLAIMER
    };
  }

  return {
    summary: `${abnormalEntries.length} abnormal parameter${abnormalEntries.length === 1 ? '' : 's'} detected. Doctor review required.`,
    abnormalHighlights: abnormalEntries.map(buildAbnormalHighlight).filter(Boolean),
    disclaimer: AI_ANALYSIS_DISCLAIMER
  };
};

const serializeOrderTestForUpdate = (test, statusOverride = test.status) => ({
  ...(test.labTestId ? { labTestId: test.labTestId?._id || test.labTestId } : {}),
  code: test.code,
  name: test.name,
  category: test.category || '',
  specimenType: test.specimenType || '',
  unit: test.unit || '',
  normalRange: normalizeNormalRange(test.normalRange || {}),
  status: statusOverride
});

const normalizeResultEntries = (resultEntries = [], fallbackTests = []) =>
  resultEntries.map((entry) => {
    const fallbackTest =
      fallbackTests.find((item) => item.code === entry.code?.trim?.().toUpperCase()) ||
      fallbackTests.find((item) => item.name === entry.name?.trim?.());
    const resolvedNormalRange = normalizeNormalRange(entry.normalRange || fallbackTest?.normalRange || {});
    const resolvedNumericValue =
      typeof entry.numericValue === 'undefined' ? undefined : Number(entry.numericValue);
    const numericValue =
      typeof resolvedNumericValue === 'number' && !Number.isNaN(resolvedNumericValue)
        ? resolvedNumericValue
        : null;
    const abnormal = computeAbnormalFlag({
      numericValue,
      normalRange: resolvedNormalRange
    });

    return {
      code: entry.code.trim().toUpperCase(),
      name: entry.name.trim(),
      value: entry.value.trim(),
      ...(numericValue !== null ? { numericValue } : {}),
      unit: entry.unit?.trim?.() || fallbackTest?.unit || '',
      normalRange: resolvedNormalRange,
      isAbnormal: abnormal.isAbnormal,
      abnormalFlag: abnormal.abnormalFlag,
      interpretationNote: entry.interpretationNote?.trim?.() || ''
    };
  });

const toReportDateString = (value = new Date()) => new Date(value).toISOString().slice(0, 10);

const buildAiNotRequestedState = () => ({
  aiAnalysis: {
    output: {
      abnormal_values: [],
      critical_values: [],
      trend_summary: [],
      manual_review_items: [],
      overall_risk_level: 'unknown',
      doctor_review_required: true,
      rule_status: 'available',
      trend_status: 'no_previous_data',
      notes: [AI_ANALYSIS_DISCLAIMER, AI_ANALYSIS_NOTES_PENDING]
    },
    confidence: 0,
    explanation: 'AI analysis has not been requested because structured numeric lab values are not available yet.',
    risk_level: 'unknown',
    requires_doctor_review: true,
    requires_human_review: true,
    model_name: 'lab_rule_engine',
    model_version: '1.0.0',
    model_status: 'available',
    audit_id: ''
  },
  aiAnalysisStatus: AI_ANALYSIS_STORAGE_STATUSES.NOT_REQUESTED,
  aiRiskLevel: 'unknown',
  aiReviewStatus: AI_ANALYSIS_REVIEW_STATUSES.NOT_REQUESTED,
  aiReviewedBy: null,
  aiReviewedAt: null,
  aiReviewNote: ''
});

const buildAiUnavailableState = () => ({
  aiAnalysis: {
    output: {
      abnormal_values: [],
      critical_values: [],
      trend_summary: [],
      manual_review_items: [],
      overall_risk_level: 'unknown',
      doctor_review_required: true,
      rule_status: 'unavailable',
      trend_status: 'no_previous_data',
      notes: [AI_ANALYSIS_DISCLAIMER, 'AI service was unavailable while saving this lab report.']
    },
    confidence: 0,
    explanation: 'AI service was unavailable while the lab report was being saved.',
    risk_level: 'unknown',
    requires_doctor_review: true,
    requires_human_review: true,
    model_name: 'lab_rule_engine',
    model_version: '1.0.0',
    model_status: 'unavailable',
    audit_id: ''
  },
  aiAnalysisStatus: AI_ANALYSIS_STORAGE_STATUSES.AI_SERVICE_UNAVAILABLE,
  aiRiskLevel: 'unknown',
  aiReviewStatus: AI_ANALYSIS_REVIEW_STATUSES.NOT_REQUESTED,
  aiReviewedBy: null,
  aiReviewedAt: null,
  aiReviewNote: ''
});

const buildLabAnalysisRequestPayload = ({
  patient,
  reportDate,
  resultEntries = [],
  previousReports = []
}) => {
  const testResults = resultEntries
    .filter((entry) => typeof entry.numericValue === 'number' && !Number.isNaN(entry.numericValue) && entry.unit)
    .map((entry) => ({
      test_name: entry.name,
      value: entry.numericValue,
      unit: entry.unit
    }));

  const previousResults = previousReports.flatMap((report) =>
    (report.resultEntries || [])
      .filter((entry) => typeof entry.numericValue === 'number' && !Number.isNaN(entry.numericValue) && entry.unit)
      .map((entry) => ({
        report_date: toReportDateString(report.createdAt || report.updatedAt || report.reviewedAt || new Date()),
        test_name: entry.name,
        value: entry.numericValue,
        unit: entry.unit
      }))
  );

  return {
    patient_id: patient?.patientId || null,
    age: typeof patient?.age === 'number' ? patient.age : null,
    gender: patient?.gender || null,
    report_date: reportDate,
    test_results: testResults,
    previous_results: previousResults
  };
};

const buildAiAnalysisState = async ({
  patient,
  reportDate,
  resultEntries = [],
  previousReports = []
}) => {
  const payload = buildLabAnalysisRequestPayload({
    patient,
    reportDate,
    resultEntries,
    previousReports
  });

  if (!payload.test_results.length) {
    return buildAiNotRequestedState();
  }

  try {
    const aiResponse = await aiService.analyzeLabResults(payload);
    const analysis = aiResponse.data;
    const modelStatus =
      analysis?.model_status === 'insufficient_reference_data'
        ? AI_ANALYSIS_STORAGE_STATUSES.INSUFFICIENT_REFERENCE_DATA
        : analysis?.model_status === 'unavailable'
        ? AI_ANALYSIS_STORAGE_STATUSES.UNAVAILABLE
        : AI_ANALYSIS_STORAGE_STATUSES.AVAILABLE;

    return {
      aiAnalysis: analysis,
      aiAnalysisStatus: modelStatus,
      aiRiskLevel: analysis?.risk_level || 'unknown',
      aiReviewStatus: AI_ANALYSIS_REVIEW_STATUSES.PENDING_REVIEW,
      aiReviewedBy: null,
      aiReviewedAt: null,
      aiReviewNote: ''
    };
  } catch (_error) {
    return buildAiUnavailableState();
  }
};

const buildLabOrderTests = ({ payloadTests = [], catalogTests = [], globalTests = [] }) =>
  payloadTests.map((test) => {
    const matchedCatalogTest = test.labTestId
      ? catalogTests.find((catalogItem) => String(catalogItem._id) === String(test.labTestId))
      : null;
    const matchedGlobalTest = test.globalLabTestId
      ? globalTests.find((gItem) => String(gItem._id) === String(test.globalLabTestId))
      : null;

    return {
      labTestId: matchedCatalogTest?._id || test.labTestId || null,
      globalLabTestId: matchedCatalogTest?.globalLabTestId || matchedGlobalTest?._id || test.globalLabTestId || null,
      code: (matchedCatalogTest?.code || matchedGlobalTest?.internalCode || test.code || '').trim().toUpperCase(),
      name: (matchedCatalogTest?.name || matchedGlobalTest?.name || test.name || '').trim(),
      category: matchedCatalogTest?.category || matchedGlobalTest?.category?.name || test.category || 'General',
      specimenType: matchedCatalogTest?.specimenType || matchedGlobalTest?.sampleType || test.specimenType || 'Blood',
      unit: matchedCatalogTest?.unit || test.unit || '',
      price: typeof test.price === 'number' ? test.price : matchedCatalogTest?.price || matchedCatalogTest?.testPrice || 0,
      turnaroundTime: test.turnaroundTime || matchedCatalogTest?.turnaroundTime || matchedGlobalTest?.normalReportingTime || '24 Hours',
      patientPreparation: test.patientPreparation || matchedCatalogTest?.importantInstructions || matchedGlobalTest?.patientPreparation || 'No special preparation',
      normalRange: normalizeNormalRange(matchedCatalogTest?.normalRange || {}),
      status: 'ordered'
    };
  });

const createLabTest = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  const laboratoryId = payload.laboratoryId;
  await verifyLaboratoryAccess(laboratoryId, clinicId);

  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let globalTest = null;
  let master = null;
  
  if (payload.globalLabTestId) {
    const GlobalLabTest = require('../healthcare-catalog/globalLabTest.model');
    globalTest = await GlobalLabTest.findById(payload.globalLabTestId).populate('category');
    if (!globalTest) {
      throw new AppError('Global lab test not found.', HTTP_STATUS.NOT_FOUND);
    }
  } else {
    if (payload.labTestMasterId) {
      master = await LabTestMaster.findById(payload.labTestMasterId);
      if (!master) {
        throw new AppError('Lab test master not found.', HTTP_STATUS.NOT_FOUND);
      }
    } else {
      // Legacy support: resolve or create lab test master by name
      master = await LabTestMaster.findOne({ name: { $regex: new RegExp(`^${escapeRegex(payload.name.trim())}$`, 'i') } });
      if (!master) {
        master = await LabTestMaster.create({
          name: payload.name.trim(),
          category: payload.category || 'General',
          sampleType: payload.specimenType || 'Blood',
          normalRange: { text: payload.normalRange?.text || '' }
        });
      }
    }
  }

  // Prevent double import of same global lab test in the same laboratory catalog
  if (globalTest) {
    const existing = await LabTest.findOne({ clinicId, laboratoryId, globalLabTestId: globalTest._id });
    if (existing) {
      throw new AppError('This lab test has already been imported into this laboratory catalog', HTTP_STATUS.CONFLICT);
    }
  }

  const labTest = await labRepository.createLabTest({
    clinicId,
    laboratoryId,
    parameterOverrides: payload.parameterOverrides || [],
    labTestMasterId: master ? master._id : undefined,
    globalLabTestId: globalTest ? globalTest._id : undefined,
    code: payload.code?.trim?.().toUpperCase() || (globalTest ? globalTest.globalId : (master.name.slice(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900))),
    name: globalTest ? globalTest.name : master.name,
    category: globalTest ? (globalTest.category?.name || '') : (master.category || payload.category || ''),
    specimenType: globalTest ? globalTest.sampleType : (master.sampleType || payload.specimenType || ''),
    unit: payload.unit || (globalTest ? '' : (master.normalRange?.unit || '')),
    normalRange: normalizeNormalRange(payload.normalRange || (globalTest ? {} : (master.normalRange || {}))),
    price: typeof payload.price === 'number' ? payload.price : null,
    testPrice: typeof payload.testPrice === 'number' ? payload.testPrice : (typeof payload.price === 'number' ? payload.price : 0),
    turnaroundTime: payload.turnaroundTime || (globalTest ? globalTest.normalReportingTime : '24 Hours'),
    homeCollectionAvailable: typeof payload.homeCollectionAvailable === 'boolean' ? payload.homeCollectionAvailable : false,
    sampleCollectionFee: typeof payload.sampleCollectionFee === 'number' ? payload.sampleCollectionFee : 0,
    availableDays: payload.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
    createdBy: requester._id,
    updatedBy: requester._id
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'LAB_TEST_CREATED',
    entity: 'LabTest',
    entityId: labTest._id,
    metadata: {
      clinicId: String(clinicId),
      code: labTest.code,
      name: labTest.name
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return labTest;
};

const updateLabTest = async ({ requester, labTestId, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  const laboratoryId = payload.laboratoryId;
  const labTest = await labRepository.findLabTestById({ id: labTestId, clinicId, laboratoryId });
  if (!labTest) {
    throw new AppError('Lab test not found.', HTTP_STATUS.NOT_FOUND);
  }

  const updates = {};
  if (payload.code) updates.code = payload.code.trim().toUpperCase();
  if (payload.name) updates.name = payload.name.trim();
  if (payload.category) updates.category = payload.category.trim();
  if (payload.specimenType) updates.specimenType = payload.specimenType.trim();
  if (typeof payload.unit !== 'undefined') updates.unit = payload.unit.trim();
  if (payload.normalRange) updates.normalRange = normalizeNormalRange(payload.normalRange);
  if (payload.parameterOverrides) updates.parameterOverrides = payload.parameterOverrides;
  if (typeof payload.price !== 'undefined') {
    updates.price = payload.price;
    updates.testPrice = payload.price; // Keep testPrice synchronized with price for backward compatibility
  }
  if (typeof payload.testPrice !== 'undefined') updates.testPrice = payload.testPrice;
  if (payload.turnaroundTime) updates.turnaroundTime = payload.turnaroundTime;
  if (typeof payload.homeCollectionAvailable === 'boolean') updates.homeCollectionAvailable = payload.homeCollectionAvailable;
  if (typeof payload.sampleCollectionFee === 'number') updates.sampleCollectionFee = payload.sampleCollectionFee;
  if (payload.processingMode) updates.processingMode = payload.processingMode;
  if (typeof payload.outsourcedLabName !== 'undefined') updates.outsourcedLabName = payload.outsourcedLabName.trim();
  if (typeof payload.isActive === 'boolean') updates.isActive = payload.isActive;
  updates.updatedBy = requester._id;

  const updatedLabTest = await labRepository.updateLabTest({
    id: labTestId,
    clinicId,
    laboratoryId,
    data: updates
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'LAB_TEST_UPDATED',
    entity: 'LabTest',
    entityId: updatedLabTest._id,
    metadata: {
      clinicId: String(clinicId),
      code: updatedLabTest.code,
      name: updatedLabTest.name
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return updatedLabTest;
};

const listLabTests = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.laboratoryId) {
    filter.laboratoryId = query.laboratoryId;
  } else if (query.providerId) {
    filter.laboratoryId = query.providerId;
  } else {
    // If it's a provider operator, they might have their providerId assigned to user
    if (requester.providerId) {
      filter.laboratoryId = requester.providerId;
    }
  }

  if (query.category) {
    filter.category = query.category.trim();
  }

  if (typeof query.isActive === 'boolean') {
    filter.isActive = query.isActive;
  }

  if (query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ code: pattern }, { name: pattern }, { category: pattern }, { specimenType: pattern }];
  }

  const { labTests, total } = await labRepository.listLabTests({
    filter,
    page,
    limit
  });

  const globalTestIds = labTests.map(t => t.globalLabTestId?._id).filter(Boolean);
  if (globalTestIds.length > 0) {
    const mappings = await InvestigationParameter.find({ investigationId: { $in: globalTestIds } })
      .populate('parameterId')
      .sort({ displayOrder: 1 })
      .lean();

    const paramsMap = new Map();
    for (const m of mappings) {
      const invId = String(m.investigationId);
      if (!paramsMap.has(invId)) {
        paramsMap.set(invId, []);
      }
      if (m.parameterId) {
        paramsMap.get(invId).push({
          ...m.parameterId,
          displayName: m.displayNameOverride || m.parameterId.name
        });
      }
    }

    for (const t of labTests) {
      if (t.globalLabTestId) {
        const invId = String(t.globalLabTestId._id);
        t.globalLabTestId.parameters = paramsMap.get(invId) || [];
      }
    }
  }

  return {
    labTests,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const listAvailableGlobalTests = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page = 1, limit = 20, search, category, department, investigationType, laboratoryId } = query;
  const skip = (page - 1) * limit;

  await verifyLaboratoryAccess(laboratoryId, clinicId);

  const GlobalLabTest = require('../healthcare-catalog/globalLabTest.model');

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (department) filter.department = department;
  if (investigationType) {
    if (investigationType.includes(',')) {
      filter.investigationType = { $in: investigationType.split(',').map(s => s.trim()) };
    } else {
      filter.investigationType = investigationType;
    }
  }
  if (search) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { name: pattern },
      { shortName: pattern },
      { globalId: pattern }
    ];
  }

  const [globals, total] = await Promise.all([
    GlobalLabTest.find(filter).populate('category').sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
    GlobalLabTest.countDocuments(filter)
  ]);

  const globalIds = globals.map(g => g._id);
  const mappings = await InvestigationParameter.find({ investigationId: { $in: globalIds } })
    .populate('parameterId')
    .sort({ displayOrder: 1 })
    .lean();

  const paramsMap = new Map();
  for (const m of mappings) {
    const invId = String(m.investigationId);
    if (!paramsMap.has(invId)) {
      paramsMap.set(invId, []);
    }
    if (m.parameterId) {
      paramsMap.get(invId).push({
        ...m.parameterId,
        displayName: m.displayNameOverride || m.parameterId.name
      });
    }
  }

  // Join with local LabTest settings for this laboratory
  const localTests = await LabTest.find({
    clinicId,
    laboratoryId,
    globalLabTestId: { $in: globalIds }
  }).lean();

  const localMap = new Map(localTests.map(t => [String(t.globalLabTestId), t]));

  const items = globals.map(g => {
    const local = localMap.get(String(g._id));
    const params = paramsMap.get(String(g._id)) || [];
    return {
      globalId: g.globalId,
      _id: g._id,
      name: g.name,
      shortName: g.shortName,
      department: g.department,
      category: g.category?.name || '',
      sampleType: g.sampleType,
      normalReportingTime: g.normalReportingTime,
      investigationType: g.investigationType,
      isActivated: !!local,
      parameters: params,
      parameterCount: params.length,
      localSettings: local ? {
        _id: local._id,
        price: local.price,
        testPrice: local.testPrice,
        turnaroundTime: local.turnaroundTime,
        homeCollectionAvailable: local.homeCollectionAvailable,
        sampleCollectionFee: local.sampleCollectionFee,
        processingMode: local.processingMode || 'IN_HOUSE',
        outsourcedLabName: local.outsourcedLabName || '',
        isActive: local.isActive
      } : null
    };
  });

  return {
    items,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const bulkActivateGlobalTests = async ({ requester, payload, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  const { globalTestIds, configs, laboratoryId } = payload;
  
  const hasConfigs = Array.isArray(configs) && configs.length > 0;
  const hasIds = Array.isArray(globalTestIds) && globalTestIds.length > 0;

  if (!hasConfigs && !hasIds) {
    throw new AppError('globalTestIds or configs array is required.', HTTP_STATUS.BAD_REQUEST);
  }

  await verifyLaboratoryAccess(laboratoryId, clinicId);

  const GlobalLabTest = require('../healthcare-catalog/globalLabTest.model');

  const executeBulkActivate = async (session) => {
    const targetIds = hasConfigs ? configs.map(c => c.globalLabTestId) : globalTestIds;
    
    const globals = session
      ? await GlobalLabTest.find({ _id: { $in: targetIds }, isActive: true }).populate('category').session(session)
      : await GlobalLabTest.find({ _id: { $in: targetIds }, isActive: true }).populate('category');

    const configMap = new Map(hasConfigs ? configs.map(c => [String(c.globalLabTestId), c]) : []);

    const activatedTests = [];
    for (const g of globals) {
      // Check if already active in this laboratory
      const exists = session
        ? await LabTest.findOne({ clinicId, laboratoryId, globalLabTestId: g._id }).session(session)
        : await LabTest.findOne({ clinicId, laboratoryId, globalLabTestId: g._id });
      if (exists) continue;

      const userConfig = configMap.get(String(g._id)) || {};
      const priceVal = userConfig.price !== undefined ? userConfig.price : 300;

      const [newLabTest] = await LabTest.create([{
        clinicId,
        laboratoryId,
        globalLabTestId: g._id,
        code: userConfig.code || g.globalId,
        name: userConfig.name || g.name,
        category: g.category?.name || '',
        specimenType: g.sampleType,
        unit: '',
        price: priceVal,
        testPrice: priceVal,
        turnaroundTime: userConfig.turnaroundTime || g.normalReportingTime || '24 Hours',
        homeCollectionAvailable: !!userConfig.homeCollectionAvailable,
        doctorPrescriptionRequired: !!userConfig.doctorPrescriptionRequired,
        importantInstructions: userConfig.importantInstructions || '',
        collectionLocations: userConfig.collectionLocations || ['Laboratory'],
        parameterOverrides: userConfig.parameterOverrides || [],
        localParameters: userConfig.localParameters || [],
        processingMode: 'IN_HOUSE',
        outsourcedLabName: '',
        isActive: true,
        createdBy: requester._id,
        updatedBy: requester._id
      }], session ? { session } : {});

      activatedTests.push(newLabTest);
    }
    return activatedTests;
  };

  let dbSession;
  try {
    dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    const result = await executeBulkActivate(dbSession);
    await dbSession.commitTransaction();
    dbSession.endSession();
    return result;
  } catch (error) {
    try {
      await dbSession.abortTransaction();
      dbSession.endSession();
    } catch (_err) {}
    if (error.message?.includes('replica set') || error.errmsg?.includes('replica set') || error.code === 20) {
      return executeBulkActivate(null);
    }
    throw error;
  }
};

const createLabOrder = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  let consultation = null;
  if (payload.consultationId) {
    consultation = await Consultation.findById(payload.consultationId);
  }

  let patient = null;
  if (payload.patientId) {
    patient = await patientRepository.findPatientByIdAndClinic({
      patientId: payload.patientId,
      clinicId
    });
  } else if (requester.role === ROLES.PATIENT) {
    patient = await patientRepository.findPatientByUserId({ userId: requester._id });
  } else if (payload.patientType === 'WALK_IN' && payload.nonRegisteredPatientDetails) {
    const details = payload.nonRegisteredPatientDetails;
    const names = String(details.fullName || '').trim().split(' ');
    const firstName = names[0] || 'Walk-In';
    const lastName = names.slice(1).join(' ') || 'Patient';
    
    const patientService = require('../patients/patient.service');
    patient = await patientService.createPatient({
      requester,
      payload: {
        firstName,
        lastName,
        phone: details.phone,
        email: details.email || `${details.phone}@walkin-pehal.com`,
        gender: details.gender || 'male',
        dateOfBirth: details.age ? new Date(new Date().setFullYear(new Date().getFullYear() - Number(details.age))) : new Date(),
        address: details.address || '',
        clinicId
      },
      requestedClinicId: clinicId,
      req: req || { ip: '127.0.0.1', get: () => 'System' }
    });
  }

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  let doctor = null;
  if (payload.doctorId) {
    doctor = await doctorRepository.findDoctorByIdAndClinic({
      doctorId: payload.doctorId,
      clinicId
    });

    if (!doctor) {
      throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
    }
  }

  if (consultation) {
    if (String(consultation.patientId?._id || consultation.patientId) !== String(patient._id)) {
      throw new AppError('Consultation does not belong to the selected patient.', HTTP_STATUS.BAD_REQUEST);
    }

    if (doctor && String(consultation.doctorId?._id || consultation.doctorId) !== String(doctor._id)) {
      throw new AppError('Consultation does not belong to the selected doctor.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const appointmentId = payload.appointmentId || consultation?.appointmentId?._id || consultation?.appointmentId;

  if (
    appointmentId &&
    consultation?.appointmentId &&
    String(consultation.appointmentId?._id || consultation.appointmentId) !== String(appointmentId)
  ) {
    throw new AppError('Consultation does not belong to the selected appointment.', HTTP_STATUS.BAD_REQUEST);
  }

  if (requester.role === ROLES.DOCTOR && doctor) {
    const requesterDoctor = await getRequesterDoctorProfile({ requester, clinicId });

    if (String(requesterDoctor._id) !== String(doctor._id)) {
      throw new AppError('You can only create lab orders for your own consultations.', HTTP_STATUS.FORBIDDEN);
    }
  }

  if (payload.prescriptionId) {
    const activeOrder = await LabOrder.findOne({
      clinicId,
      prescriptionId: payload.prescriptionId,
      status: { $nin: ['completed', 'cancelled'] }
    });
    if (activeOrder && !payload.allowDuplicate) {
      throw new AppError(
        `An active lab order (${activeOrder.orderNumber}) already exists for this prescription.`,
        HTTP_STATUS.CONFLICT,
        { existingOrder: activeOrder }
      );
    }
  }

  const requestedCatalogTestIds = payload.tests
    .map((item) => item.labTestId)
    .filter(Boolean);
  const catalogTests = requestedCatalogTestIds.length
    ? await labRepository.findLabTestsByIds({
        ids: requestedCatalogTestIds,
        clinicId,
        isActive: true
      })
    : [];

  const requestedGlobalTestIds = payload.tests
    .map((item) => item.globalLabTestId)
    .filter(Boolean);
  const globalTests = requestedGlobalTestIds.length
    ? await GlobalLabTest.find({ _id: { $in: requestedGlobalTestIds } }).populate('category').lean()
    : [];

  const tests = buildLabOrderTests({
    payloadTests: payload.tests,
    catalogTests,
    globalTests
  });

  if (tests.some((test) => !test.code || !test.name)) {
    throw new AppError('Each lab order test must include a code and name.', HTTP_STATUS.BAD_REQUEST);
  }

  const totalPrice =
    typeof payload.price === 'number'
      ? payload.price
      : tests.reduce((sum, t) => sum + (t.price || 0), 0);

  const labOrder = await labRepository.createLabOrder({
    clinicId,
    laboratoryId: payload.laboratoryId || null,
    consultationId: consultation ? consultation._id : null,
    prescriptionId: payload.prescriptionId || null,
    patientId: patient?._id || null,
    doctorId: doctor ? doctor._id : null,
    appointmentId: appointmentId || null,
    orderNumber: await generateLabOrderNumber(clinicId),
    tests,
    priority: payload.priority || 'routine',
    notes: payload.notes?.trim?.() || '',
    collectionMethod: payload.collectionMethod || 'AT_LAB',
    collectionAddress: payload.collectionAddress || {},
    price: totalPrice,
    patientType: payload.patientType || (patient ? 'REGISTERED' : 'WALK_IN'),
    guestPatient: payload.guestPatient || payload.nonRegisteredPatientDetails || {},
    source:
      payload.source ||
      (requester.role === ROLES.DOCTOR
        ? 'DOCTOR_BOOKED'
        : requester.role === ROLES.PATIENT
        ? 'PATIENT_BOOKED'
        : 'LAB_CREATED'),
    documents: payload.documents || [],
    status: 'ordered',
    orderedAt: new Date(),
    createdBy: requester._id,
    updatedBy: requester._id
  });

  if (payload.prescriptionId) {
    const Prescription = require('../prescriptions/prescription.model');
    const prescriptionDoc = await Prescription.findById(payload.prescriptionId);
    if (prescriptionDoc && prescriptionDoc.labs) {
      const orderedGlobalIds = tests.map((t) => String(t.globalLabTestId)).filter(Boolean);
      const orderedNames = tests.map((t) => (t.name || t.testName || '').toLowerCase());
      const payloadGlobalIds = (payload.tests || []).map((t) => String(t.globalLabTestId || '')).filter(Boolean);
      const payloadLabTestIds = (payload.tests || []).map((t) => String(t.labTestId || '')).filter(Boolean);
      const payloadNames = (payload.tests || []).map((t) => (t.name || t.testName || '').toLowerCase());

      const updatedLabs = prescriptionDoc.labs.map((l) => {
        const plain = l.toObject ? l.toObject() : { ...l };
        const lName = (plain.testName || '').toLowerCase();
        const lGlobal = plain.globalLabTestId ? String(plain.globalLabTestId) : '';
        const lLocal = plain.localInventoryId ? String(plain.localInventoryId) : '';
        if (
          (lGlobal && (orderedGlobalIds.includes(lGlobal) || payloadGlobalIds.includes(lGlobal))) ||
          (lLocal && payloadLabTestIds.includes(lLocal)) ||
          orderedNames.some((oname) => oname && (lName.includes(oname) || oname.includes(lName))) ||
          payloadNames.some((pname) => pname && (lName.includes(pname) || pname.includes(lName)))
        ) {
          return {
            ...plain,
            isBooked: true,
            labOrderId: labOrder._id
          };
        }
        return plain;
      });

      await Prescription.updateOne(
        { _id: payload.prescriptionId },
        { $set: { labs: updatedLabs } }
      );
    }
  }

  if (consultation) {
    await consultationRepository.updateConsultation({
      id: consultation._id,
      clinicId,
      update: {
        labOrdered: true,
        updatedBy: requester._id
      },
      populateDetails: false
    });
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'LAB_ORDER_CREATED',
    entity: 'LabOrder',
    entityId: labOrder._id,
    metadata: {
      clinicId: String(clinicId),
      consultationId: consultation ? String(consultation._id) : null,
      patientId: String(patient._id),
      doctorId: doctor ? String(doctor._id) : null,
      orderNumber: labOrder.orderNumber,
      tests: tests.map((test) => test.code)
    },
    ipAddress: req?.ip || '127.0.0.1',
    userAgent: req?.get ? req.get('user-agent') : 'Internal/Service',
    status: 'SUCCESS'
  });

  return labRepository.findLabOrderById({
    id: labOrder._id,
    clinicId,
    populateDetails: true
  });
};

const listLabOrders = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.laboratoryId) {
    filter.laboratoryId = query.laboratoryId;
  }

  if (query.patientId) {
    filter.patientId = query.patientId;
  }

  if (query.doctorId) {
    filter.doctorId = query.doctorId;
  }

  if (query.consultationId) {
    filter.consultationId = query.consultationId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.from || query.to) {
    filter.orderedAt = {};
    if (query.from) {
      filter.orderedAt.$gte = parseDateBoundary(query.from, false);
    }
    if (query.to) {
      filter.orderedAt.$lte = parseDateBoundary(query.to, true);
    }
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getRequesterDoctorProfile({ requester, clinicId });
    filter.doctorId = doctor._id;
  }

  const { labOrders, total } = await labRepository.listLabOrders({
    filter,
    page,
    limit
  });
  const reports = await labRepository.findReportsByOrderIds({
    labOrderIds: labOrders.map((order) => order._id),
    clinicId
  });
  const reportsByOrderId = new Map(reports.map((report) => [String(report.labOrderId), report]));

  return {
    labOrders: labOrders.map((order) => {
      const report = reportsByOrderId.get(String(order._id));
      return {
        ...order,
        report: report
          ? {
              _id: report._id,
              status: report.status,
              reportFileName: report.reportFileName || '',
              abnormalCount: (report.resultEntries || []).filter((entry) => entry.isAbnormal).length
            }
          : null
      };
    }),
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getLabOrderById = async ({ requester, labOrderId, requestedClinicId = null }) => {
  const { clinicId, labOrder } = await getScopedLabOrder({
    requester,
    labOrderId,
    requestedClinicId
  });
  const report = await labRepository.findLabReportByOrderId({
    labOrderId,
    clinicId,
    populateDetails: true
  });

  return {
    labOrder,
    report
  };
};

const updateLabOrderStatus = async ({ requester, labOrderId, status, requestedClinicId = null, req }) => {
  const { clinicId, labOrder } = await getScopedLabOrder({
    requester,
    labOrderId,
    requestedClinicId
  });
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[labOrder.status] || [];

  if (!allowedTransitions.includes(status)) {
    throw new AppError(
      `Lab order status cannot move from ${labOrder.status} to ${status}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const updatedLabOrder = await labRepository.updateLabOrder({
    id: labOrder._id,
    clinicId,
    data: {
      status,
      tests: (labOrder.tests || []).map((test) => serializeOrderTestForUpdate(test, status)),
      updatedBy: requester._id
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'LAB_ORDER_STATUS_UPDATED',
    entity: 'LabOrder',
    entityId: labOrder._id,
    metadata: {
      previousStatus: labOrder.status,
      newStatus: status,
      orderNumber: labOrder.orderNumber
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return updatedLabOrder;
};

const createLabReport = async ({ requester, payload, requestedClinicId = null, req }) => {
  const { clinicId, labOrder } = await getScopedLabOrder({
    requester,
    labOrderId: payload.labOrderId,
    requestedClinicId: requestedClinicId || payload.clinicId
  });
  const existingReport = await labRepository.findLabReportByOrderId({
    labOrderId: labOrder._id,
    clinicId,
    populateDetails: true
  });

  if (existingReport) {
    throw new AppError('A report already exists for this lab order.', HTTP_STATUS.CONFLICT);
  }

  if (labOrder.status === 'cancelled') {
    throw new AppError('Cancelled lab orders cannot receive reports.', HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedEntries = normalizeResultEntries(payload.resultEntries || [], labOrder.tests || []);
  const previousReports = await labRepository.findPreviousLabReportsForPatient({
    clinicId,
    patientId: labOrder.patientId?._id || labOrder.patientId
  });
  const aiState = await buildAiAnalysisState({
    patient: labOrder.patientId,
    reportDate: toReportDateString(),
    resultEntries: normalizedEntries,
    previousReports
  });
  const labReport = await labRepository.createLabReport({
    clinicId,
    labOrderId: labOrder._id,
    patientId: labOrder.patientId?._id || labOrder.patientId,
    consultationId: labOrder.consultationId?._id || labOrder.consultationId || null,
    uploadedBy: requester._id,
    reportUrl: payload.reportUrl?.trim?.() || '',
    reportFileName: payload.reportFileName?.trim?.() || '',
    resultEntries: normalizedEntries,
    ...aiState,
    status: payload.status || 'draft',
    createdBy: requester._id,
    updatedBy: requester._id
  });

  const nextOrderStatus =
    normalizedEntries.length > 0 ? 'completed' : labOrder.status === 'ordered' ? 'processing' : labOrder.status;

  await labRepository.updateLabOrder({
    id: labOrder._id,
    clinicId,
    data: {
      status: nextOrderStatus,
      tests: (labOrder.tests || []).map((test) =>
        serializeOrderTestForUpdate(
          test,
          nextOrderStatus === 'completed' ? 'completed' : test.status === 'ordered' ? 'processing' : test.status
        )
      ),
      updatedBy: requester._id
    },
    populateDetails: false
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'LAB_REPORT_CREATED',
    entity: 'LabReport',
    entityId: labReport._id,
    metadata: {
      clinicId: String(clinicId),
      labOrderId: String(labOrder._id),
      orderNumber: labOrder.orderNumber,
      abnormalCount: normalizedEntries.filter((entry) => entry.isAbnormal).length
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return labRepository.findLabReportById({
    id: labReport._id,
    clinicId,
    populateDetails: true
  });
};

const getLabReportById = async ({ requester, labReportId, requestedClinicId = null }) => {
  const { labReport } = await getScopedLabReport({
    requester,
    labReportId,
    requestedClinicId
  });

  return { labReport };
};

const updateLabReport = async ({ requester, labReportId, payload, requestedClinicId = null, req }) => {
  const { clinicId, labReport } = await getScopedLabReport({
    requester,
    labReportId,
    requestedClinicId
  });

  if (labReport.status === 'finalized') {
    throw new AppError('Finalized reports cannot be edited.', HTTP_STATUS.BAD_REQUEST);
  }

  const fallbackTests = labReport.labOrderId?.tests || [];
  const normalizedEntries = payload.resultEntries
    ? normalizeResultEntries(payload.resultEntries, fallbackTests)
    : labReport.resultEntries || [];
  const nextStatus = payload.status || labReport.status;
  const aiState = payload.resultEntries
    ? await buildAiAnalysisState({
        patient: labReport.patientId,
        reportDate: toReportDateString(),
        resultEntries: normalizedEntries,
        previousReports: await labRepository.findPreviousLabReportsForPatient({
          clinicId,
          patientId: labReport.patientId?._id || labReport.patientId,
          excludeReportId: labReport._id
        })
      })
    : null;
  const updatedLabReport = await labRepository.updateLabReport({
    id: labReport._id,
    clinicId,
    data: {
      ...(typeof payload.reportFileName !== 'undefined'
        ? { reportFileName: payload.reportFileName?.trim?.() || '' }
        : {}),
      ...(typeof payload.reportUrl !== 'undefined' ? { reportUrl: payload.reportUrl?.trim?.() || '' } : {}),
      ...(payload.resultEntries ? { resultEntries: normalizedEntries } : {}),
      ...(payload.resultEntries ? aiState : {}),
      status: nextStatus,
      updatedBy: requester._id
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'LAB_REPORT_UPDATED',
    entity: 'LabReport',
    entityId: labReport._id,
    metadata: {
      previousStatus: labReport.status,
      newStatus: nextStatus
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return updatedLabReport;
};

const reviewLabAnalysis = async ({ requester, labReportId, payload, requestedClinicId = null, req }) => {
  const { clinicId, labReport } = await getScopedLabReport({
    requester,
    labReportId,
    requestedClinicId
  });

  if (
    !labReport.aiAnalysis ||
    labReport.aiAnalysisStatus === AI_ANALYSIS_STORAGE_STATUSES.NOT_REQUESTED ||
    labReport.aiAnalysisStatus === AI_ANALYSIS_STORAGE_STATUSES.AI_SERVICE_UNAVAILABLE
  ) {
    throw new AppError('No AI lab analysis is available for review.', HTTP_STATUS.BAD_REQUEST);
  }

  const updatedLabReport = await labRepository.updateLabReport({
    id: labReport._id,
    clinicId,
    data: {
      aiReviewStatus: payload.decision,
      aiReviewNote: payload.reviewNote?.trim?.() || '',
      aiReviewedBy: requester._id,
      aiReviewedAt: new Date(),
      updatedBy: requester._id
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'LAB_AI_REVIEW_UPDATED',
    entity: 'LabReport',
    entityId: labReport._id,
    metadata: {
      decision: payload.decision,
      previousAiReviewStatus: labReport.aiReviewStatus || AI_ANALYSIS_REVIEW_STATUSES.NOT_REQUESTED
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return updatedLabReport;
};

const finalizeLabReport = async ({ requester, labReportId, requestedClinicId = null, req }) => {
  const { clinicId, labReport } = await getScopedLabReport({
    requester,
    labReportId,
    requestedClinicId
  });

  if (labReport.status === 'finalized') {
    throw new AppError('Lab report is already finalized.', HTTP_STATUS.BAD_REQUEST);
  }

  const updatedLabReport = await labRepository.updateLabReport({
    id: labReport._id,
    clinicId,
    data: {
      status: 'finalized',
      reviewedBy: requester._id,
      reviewedAt: new Date(),
      updatedBy: requester._id
    },
    populateDetails: true
  });

  const orderId = labReport.labOrderId?._id || labReport.labOrderId;

  if (orderId) {
    const labOrder = await labRepository.findLabOrderById({
      id: orderId,
      clinicId,
      populateDetails: true
    });

    if (labOrder && labOrder.status !== 'completed') {
      await labRepository.updateLabOrder({
        id: labOrder._id,
        clinicId,
        data: {
          status: 'completed',
          tests: (labOrder.tests || []).map((test) => serializeOrderTestForUpdate(test, 'completed')),
          updatedBy: requester._id
        },
        populateDetails: false
      });
    }
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'LAB_REPORT_FINALIZED',
    entity: 'LabReport',
    entityId: labReport._id,
    metadata: {
      labOrderId: String(orderId || ''),
      previousStatus: labReport.status,
      newStatus: 'finalized'
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  try {
    const { sendLabReportReadyNotification } = require('../notifications/notification.service');

    await sendLabReportReadyNotification({
      labReport: updatedLabReport,
      actorUserId: requester._id
    });
  } catch (_error) {
    // Notification delivery is best-effort and must not block lab finalization.
  }

  return updatedLabReport;
};

const getPatientLabHistory = async ({ requester, patientId, query = {}, requestedClinicId = null }) => {
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
      throw new AppError('You can only access your own lab history.', HTTP_STATUS.FORBIDDEN);
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

  const { labOrders, total } = await labRepository.listLabOrders({
    filter,
    page,
    limit
  });
  const reports = await labRepository.findReportsByOrderIds({
    labOrderIds: labOrders.map((order) => order._id),
    clinicId
  });
  const reportsByOrderId = new Map(reports.map((report) => [String(report.labOrderId), report]));

  return {
    patient,
    labOrders: labOrders.map((order) => {
      const report = reportsByOrderId.get(String(order._id));

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        orderedAt: order.orderedAt,
        status: order.status,
        priority: order.priority,
        consultationId: order.consultationId?._id || order.consultationId || null,
        doctor: order.doctorId
          ? {
              _id: order.doctorId._id,
              fullName: order.doctorId.fullName,
              doctorCode: order.doctorId.doctorCode,
              specialization: order.doctorId.specialization
            }
          : null,
        tests: (order.tests || []).map((test) => ({
          _id: test._id,
          code: test.code,
          name: test.name,
          category: test.category,
          specimenType: test.specimenType,
          status: test.status
        })),
        report: report
          ? {
              _id: report._id,
              status: report.status,
              reportFileName: report.reportFileName || '',
              reportUrl: report.reportUrl || '',
              abnormalCount: (report.resultEntries || []).filter((entry) => entry.isAbnormal).length,
              reviewedAt: report.reviewedAt || null,
              aiRiskLevel: report.aiRiskLevel || 'unknown',
              aiReviewStatus: report.aiReviewStatus || AI_ANALYSIS_REVIEW_STATUSES.NOT_REQUESTED
            }
          : null
      };
    }),
    pagination: buildPaginationMeta({ page, limit, total })
  };
};


// ─── LABORATORY CONSUMABLE SERVICES ──────────────────────────────────────────

const createLabConsumable = async ({ requester, payload, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const laboratoryId = payload.laboratoryId || query?.laboratoryId || requester.providerId;
  if (laboratoryId) {
    await verifyLaboratoryAccess(laboratoryId, clinicId);
  }
  const existing = await LabConsumable.findOne({ clinicId, laboratoryId, name: new RegExp(`^${payload.name.trim()}$`, 'i') });
  if (existing) {
    throw new AppError('A consumable with this name already exists.', HTTP_STATUS.CONFLICT);
  }
  return LabConsumable.create({
    ...payload,
    clinicId,
    laboratoryId,
    createdBy: requester._id
  });
};

const listLabConsumables = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const filter = { clinicId };
  const laboratoryId = query.laboratoryId || requester.providerId;
  if (laboratoryId) {
    filter.laboratoryId = laboratoryId;
  }
  if (query.category) filter.category = query.category;
  if (query.search) {
    filter.name = new RegExp(query.search, 'i');
  }
  if (query.branchId) filter.branchId = query.branchId;

  const items = await LabConsumable.find(filter).sort({ name: 1 });
  
  // Virtual populate batches manually
  const populated = [];
  for (const item of items) {
    const batches = await LabConsumableBatch.find({ consumableId: item._id }).populate('supplierId');
    const doc = item.toObject();
    doc.batches = batches;
    populated.push(doc);
  }
  return populated;
};

const updateLabConsumable = async ({ requester, consumableId, payload, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const filter = { _id: consumableId, clinicId };
  if (payload.laboratoryId) filter.laboratoryId = payload.laboratoryId;
  const consumable = await LabConsumable.findOne(filter);
  if (!consumable) {
    throw new AppError('Consumable not found.', HTTP_STATUS.NOT_FOUND);
  }
  return LabConsumable.findByIdAndUpdate(consumableId, payload, { new: true });
};

// ─── LAB CONSUMABLE BATCH MANAGEMENT ──────────────────────────────────────────

const addConsumableBatch = async ({ requester, consumableId, payload, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const consumable = await LabConsumable.findOne({ _id: consumableId, clinicId });
  if (!consumable) {
    throw new AppError('Consumable not found.', HTTP_STATUS.NOT_FOUND);
  }

  const exists = await LabConsumableBatch.findOne({ consumableId, batchNumber: payload.batchNumber.trim() });
  if (exists) {
    throw new AppError('This batch number already exists for this consumable.', HTTP_STATUS.CONFLICT);
  }

  const previousStock = consumable.totalStock || 0;
  const batchQty = Number(payload.quantity || 0);

  const batch = await LabConsumableBatch.create({
    consumableId,
    batchNumber: payload.batchNumber.trim(),
    supplierId: payload.supplierId || null,
    expiryDate: payload.expiryDate,
    receivedQuantity: batchQty,
    availableStock: batchQty,
    quantity: batchQty,
    purchasePrice: payload.purchasePrice || 0,
    sellingPrice: payload.sellingPrice || 0,
    invoiceNumber: payload.invoiceNumber || '',
    remarks: payload.remarks || ''
  });

  const allBatches = await LabConsumableBatch.find({ consumableId });
  const updatedStock = allBatches.reduce((sum, b) => sum + b.availableStock, 0);
  consumable.totalStock = updatedStock;
  await consumable.save();

  // Log stock ledger entry
  await LabStockLedger.create({
    clinicId,
    branchId: consumable.branchId || null,
    consumableId,
    batchId: batch._id,
    movementType: payload.isOpeningStock ? 'Initial Opening Stock' : 'Stock In',
    quantity: batchQty,
    previousStock,
    updatedStock,
    reason: payload.remarks || 'New consumable batch registered',
    notes: payload.notes || '',
    userId: requester._id
  });

  const doc = consumable.toObject();
  doc.batches = allBatches;
  return doc;
};

// ─── LAB CONSUMABLE STOCK ADJUSTMENTS ─────────────────────────────────────────

const adjustConsumableStock = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  
  const { consumableId, batchId, quantity, adjustmentType, reason, notes } = payload;
  const consumable = await LabConsumable.findOne({ _id: consumableId, clinicId });
  if (!consumable) {
    throw new AppError('Consumable not found.', HTTP_STATUS.NOT_FOUND);
  }

  const batch = await LabConsumableBatch.findOne({ _id: batchId, consumableId });
  if (!batch) {
    throw new AppError('Batch not found for this consumable.', HTTP_STATUS.NOT_FOUND);
  }

  const previousStock = consumable.totalStock || 0;
  const changeQty = Number(quantity);

  // Adjust batch stock
  batch.availableStock = Math.max(0, batch.availableStock + changeQty);
  batch.quantity = batch.availableStock;
  await batch.save();

  // Recalculate total stock
  const allBatches = await LabConsumableBatch.find({ consumableId });
  const updatedStock = allBatches.reduce((sum, b) => sum + b.availableStock, 0);
  consumable.totalStock = updatedStock;
  await consumable.save();

  // Create Stock Ledger Entry
  const ledger = await LabStockLedger.create({
    clinicId,
    branchId: consumable.branchId || null,
    consumableId,
    batchId,
    movementType: adjustmentType || 'Adjustment',
    quantity: changeQty,
    previousStock,
    updatedStock,
    reason: reason || 'Manual adjustment',
    notes: notes || '',
    userId: requester._id
  });

  return { consumable, batch, ledger };
};

// ─── LAB STOCK LEDGER LIST ────────────────────────────────────────────────────

const listLabStockLedgers = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const filter = { clinicId };

  if (query.consumableId) filter.consumableId = query.consumableId;
  if (query.movementType) filter.movementType = query.movementType;
  if (query.branchId) filter.branchId = query.branchId;

  return LabStockLedger.find(filter)
    .populate('consumableId')
    .populate('batchId')
    .populate('userId', 'name role')
    .sort({ createdAt: -1 });
};

const getLabInventoryDashboard = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const laboratoryId = query?.laboratoryId || requester.providerId;
  const filter = { clinicId, isActive: true };
  if (laboratoryId) {
    filter.laboratoryId = laboratoryId;
  }
  
  const consumables = await LabConsumable.find(filter);
  
  let totalConsumables = consumables.length;
  let totalValue = 0;
  let lowStock = 0;
  
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  
  let expiring = 0;

  for (const item of consumables) {
    if (item.totalStock <= (item.reorderLevel || 10)) {
      lowStock++;
    }

    const batches = await LabConsumableBatch.find({ consumableId: item._id });
    for (const batch of batches) {
      totalValue += (batch.availableStock || 0) * (batch.purchasePrice || 0);
      if (batch.availableStock > 0 && batch.expiryDate) {
        const expDate = new Date(batch.expiryDate);
        if (expDate <= thirtyDaysLater) {
          expiring++;
        }
      }
    }
  }

  return {
    totalConsumables,
    totalValue: Math.round(totalValue),
    lowStock,
    expiring,
    pendingPurchaseOrders: 0 // Draft/basic PO mock value or 0
  };
};

const CustomLabRequest = require('./customLabRequest.model');
const { createNotificationRecord } = require('../notifications/notification.service');
const User = require('../users/user.model');

// Mock Connected Laboratory APIs Search
const searchConnectedApis = async (searchQuery) => {
  if (!searchQuery?.trim()) return [];
  const query = searchQuery.trim().toLowerCase();
  
  const partnerTemplates = [
    { name: 'CBC (Complete Blood Count)', partner: 'Thyrocare', price: 299, tat: '6 Hours', prep: 'No Fasting' },
    { name: 'CBC with Peripheral Smear', partner: 'Thyrocare', price: 550, tat: '24 Hours', prep: 'No Fasting' },
    { name: 'CBC (Automation)', partner: 'Dr. Lal PathLabs', price: 325, tat: 'Today', prep: 'No Fasting' },
    { name: 'CBC with Reticulocyte Count', partner: 'Redcliffe Labs', price: 600, tat: '24 Hours', prep: 'No Fasting' },
    { name: 'Lipid Profile (Standard)', partner: 'Thyrocare', price: 650, tat: '24 Hours', prep: 'Fasting required (10-12 hours)' },
    { name: 'HbA1c (Glycated Haemoglobin)', partner: 'Dr. Lal PathLabs', price: 390, tat: '24 Hours', prep: 'No Fasting' },
    { name: 'Liver Function Test (LFT)', partner: 'Metropolis', price: 700, tat: '12 Hours', prep: 'Fasting required' },
    { name: 'Kidney Function Test (KFT)', partner: 'Metropolis', price: 750, tat: '12 Hours', prep: 'No Fasting' },
    { name: 'Thyroid Profile (T3, T4, TSH)', partner: 'Apollo Diagnostics', price: 699, tat: '24 Hours', prep: 'No Fasting' },
    { name: 'Vitamin D (25-OH)', partner: 'Orange Health', price: 1100, tat: '18 Hours', prep: 'No Fasting' },
    { name: 'Vitamin B12', partner: 'Orange Health', price: 999, tat: '18 Hours', prep: 'No Fasting' }
  ];

  return partnerTemplates.filter(t => 
    t.name.toLowerCase().includes(query) || 
    t.partner.toLowerCase().includes(query)
  );
};

const searchAllLabs = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });

  const searchVal = query.search?.trim() || '';
  const selectedCategory = query.category?.trim() || '';
  const selectedProviderId = query.providerId || query.laboratoryId || '';

  // 1. Fetch Laboratories attached/offered by the CURRENT CLINIC
  const attachedLabs = await Provider.find({
    $or: [{ clinicId }, { assignedBranches: clinicId }],
    providerType: 'Laboratory',
    status: { $ne: 'Archived' }
  })
    .select('_id name globalId contactPerson phone')
    .lean();

  const attachedLabIds = attachedLabs.map((l) => l._id);

  // 2. Fetch Active Local Tests configured in these attached laboratories for this clinic
  const localTests = await LabTest.find({
    clinicId,
    laboratoryId: { $in: attachedLabIds },
    isActive: true
  })
    .populate('laboratoryId', 'name globalId contactPerson phone')
    .lean();

  // 3. Fetch Active Global Laboratory Catalogue Tests & Parameters
  let globalTests = [];
  const invParamsMap = new Map();
  try {
    require('../healthcare-catalog/globalParameter.model');
    const InvestigationParameter = require('../healthcare-catalog/investigationParameter.model');
    const [gTests, allInvestigationParams] = await Promise.all([
      GlobalLabTest.find({
        isActive: true,
        status: { $ne: 'RETIRED' }
      })
        .populate('category', 'name')
        .lean(),
      InvestigationParameter.find({})
        .populate('parameterId', 'name shortName code')
        .sort({ displayOrder: 1 })
        .lean()
        .catch(() => [])
    ]);

    globalTests = gTests || [];
    for (const ip of allInvestigationParams || []) {
      const invId = String(ip.investigationId);
      if (!invParamsMap.has(invId)) {
        invParamsMap.set(invId, []);
      }
      const paramName = ip.displayNameOverride || ip.parameterId?.name || '';
      if (paramName) {
        invParamsMap.get(invId).push({
          name: paramName,
          code: ip.parameterId?.code || '',
          isRequired: ip.isRequired
        });
      }
    }
  } catch (paramErr) {
    globalTests = await GlobalLabTest.find({
      isActive: true,
      status: { $ne: 'RETIRED' }
    })
      .populate('category', 'name')
      .lean();
  }

  // 4. Merge and Deduplicate Global + Local Tests
  const globalMap = new Map();
  for (const g of globalTests) {
    const gId = String(g._id);
    const categoryName = g.category?.name || (typeof g.category === 'string' ? g.category : 'General');
    const paramList = invParamsMap.get(gId) || (Array.isArray(g.parameters) ? g.parameters.map(p => ({ name: p.name || p })) : []);
    globalMap.set(gId, {
      investigationId: gId,
      globalInvestigationId: gId,
      globalId: g.globalId || '',
      localInventoryIds: [],
      name: g.name,
      shortName: g.shortName || '',
      code: g.internalCode || g.loincCode || g.globalId || '',
      category: categoryName,
      department: g.department || '',
      sampleType: g.sampleType || 'Blood',
      sampleVolume: g.sampleVolume || '',
      sampleContainer: g.sampleContainer || '',
      methodology: g.methodology || '',
      patientPreparation: g.patientPreparation || 'No Fasting Required',
      reportingTime: g.normalReportingTime || '24 Hours',
      tat: g.normalReportingTime || '24 Hours',
      price: null,
      availability: 'UNAVAILABLE',
      availabilitySource: 'GLOBAL',
      provider: 'Global Catalogue',
      providerNames: [],
      laboratoryIds: [],
      providers: [],
      isGlobal: true,
      isLocal: false,
      investigationType: g.investigationType || 'ATOMIC_TEST',
      clinicalDescription: g.clinicalDescription || '',
      parameters: paramList
    });
  }

  const localOnlyMap = new Map();
  for (const local of localTests) {
    const gId = local.globalLabTestId ? String(local.globalLabTestId) : null;
    const labId = String(local.laboratoryId?._id || local.laboratoryId);
    const labName = local.laboratoryId?.name || 'Clinic Laboratory';
    const localPrice =
      typeof local.price === 'number'
        ? local.price
        : typeof local.testPrice === 'number'
        ? local.testPrice
        : null;
    const localTat = local.turnaroundTime || '24 Hours';
    const localSample = local.specimenType || 'Blood';

    if (gId && globalMap.has(gId)) {
      const existing = globalMap.get(gId);
      existing.availability = 'AVAILABLE';
      existing.availabilitySource = 'CLINIC LABORATORY';
      existing.provider = 'Clinic Laboratory';
      existing.isLocal = true;

      const localInvId = String(local._id);
      if (!existing.localInventoryIds.includes(localInvId)) {
        existing.localInventoryIds.push(localInvId);
      }
      if (!existing.laboratoryIds.includes(labId)) {
        existing.laboratoryIds.push(labId);
        existing.providerNames.push(labName);
      }
      existing.providers.push({
        laboratoryId: labId,
        providerName: labName,
        localInventoryId: localInvId,
        price: localPrice,
        reportingTime: localTat,
        sampleType: localSample,
        processingMode: local.processingMode || 'IN_HOUSE',
        isAvailable: local.isActive !== false
      });

      if (existing.price === null || (localPrice !== null && localPrice < existing.price)) {
        existing.price = localPrice;
        existing.reportingTime = localTat;
        existing.tat = localTat;
      }
    } else {
      // Local-only investigation without global mapping
      const localKey = local.code ? `code_${local.code.toUpperCase()}` : `local_${local._id}`;
      const localInvId = String(local._id);

      if (localOnlyMap.has(localKey)) {
        const existing = localOnlyMap.get(localKey);
        if (!existing.localInventoryIds.includes(localInvId)) {
          existing.localInventoryIds.push(localInvId);
        }
        if (!existing.laboratoryIds.includes(labId)) {
          existing.laboratoryIds.push(labId);
          existing.providerNames.push(labName);
        }
        existing.providers.push({
          laboratoryId: labId,
          providerName: labName,
          localInventoryId: localInvId,
          price: localPrice,
          reportingTime: localTat,
          sampleType: localSample,
          processingMode: local.processingMode || 'IN_HOUSE',
          isAvailable: local.isActive !== false
        });
        if (existing.price === null || (localPrice !== null && localPrice < existing.price)) {
          existing.price = localPrice;
          existing.reportingTime = localTat;
          existing.tat = localTat;
        }
      } else {
        localOnlyMap.set(localKey, {
          investigationId: `local_${local._id}`,
          globalInvestigationId: null,
          globalId: null,
          localInventoryIds: [localInvId],
          name: local.name,
          shortName: local.code || '',
          code: local.code || '',
          category: local.category || 'General',
          department: 'Laboratory',
          sampleType: localSample,
          sampleVolume: '',
          sampleContainer: '',
          methodology: '',
          patientPreparation: 'No Fasting Required',
          reportingTime: localTat,
          tat: localTat,
          price: localPrice,
          availability: local.isActive !== false ? 'AVAILABLE' : 'UNAVAILABLE',
          availabilitySource: 'LOCAL LABORATORY',
          provider: 'Clinic Laboratory',
          providerNames: [labName],
          laboratoryIds: [labId],
          providers: [
            {
              laboratoryId: labId,
              providerName: labName,
              localInventoryId: localInvId,
              price: localPrice,
              reportingTime: localTat,
              sampleType: localSample,
              processingMode: local.processingMode || 'IN_HOUSE',
              isAvailable: local.isActive !== false
            }
          ],
          isGlobal: false,
          isLocal: true,
          investigationType: 'ATOMIC_TEST',
          clinicalDescription: ''
        });
      }
    }
  }

  // 4b. Discover external alternative availability for unattached tests across the platform
  const unattachedGlobalIds = [];
  for (const [gId, item] of globalMap.entries()) {
    if (item.availability === 'UNAVAILABLE' && mongoose.Types.ObjectId.isValid(gId)) {
      unattachedGlobalIds.push(new mongoose.Types.ObjectId(gId));
    }
  }

  if (unattachedGlobalIds.length > 0) {
    const externalTests = await LabTest.find({
      globalLabTestId: { $in: unattachedGlobalIds },
      clinicId: { $ne: clinicId },
      isActive: true
    })
      .select('globalLabTestId price testPrice turnaroundTime specimenType')
      .lean();

    const externalByGlobalId = new Map();
    for (const ext of externalTests) {
      const gKey = String(ext.globalLabTestId);
      if (!externalByGlobalId.has(gKey)) {
        externalByGlobalId.set(gKey, []);
      }
      externalByGlobalId.get(gKey).push(ext);
    }

    for (const [gKey, extList] of externalByGlobalId.entries()) {
      if (globalMap.has(gKey)) {
        const item = globalMap.get(gKey);
        const prices = extList
          .map((e) => (typeof e.price === 'number' ? e.price : e.testPrice))
          .filter((p) => typeof p === 'number' && p > 0);
        const minP = prices.length ? Math.min(...prices) : 400;
        const maxP = prices.length ? Math.max(...prices) : 600;

        item.availability = 'ALTERNATIVE_AVAILABLE';
        item.availabilitySource = 'EXTERNAL LABORATORY';
        item.provider = 'Alternative Laboratory';
        item.estimatedPriceRange = minP === maxP ? `₹${minP}` : `₹${minP}–₹${maxP}`;
        item.estimatedTat = extList[0]?.turnaroundTime || '24–48 Hours';
        item.tat = item.estimatedTat;
        item.reportingTime = item.estimatedTat;
        item.isExternal = true;
      }
    }
  }

  let merged = [...globalMap.values(), ...localOnlyMap.values()];

  // 5. Apply provider filter if specified
  if (selectedProviderId && selectedProviderId !== 'All Providers') {
    merged = merged.map((item) => {
      const matchedProvider = item.providers.find(
        (p) => String(p.laboratoryId) === String(selectedProviderId) || p.providerName === selectedProviderId
      );
      if (matchedProvider && matchedProvider.isAvailable) {
        return {
          ...item,
          availability: 'AVAILABLE',
          provider: matchedProvider.providerName,
          price: matchedProvider.price,
          tat: matchedProvider.reportingTime || item.tat,
          reportingTime: matchedProvider.reportingTime || item.reportingTime
        };
      }
      return {
        ...item,
        availability: 'UNAVAILABLE',
        price: null
      };
    });
  }

  // 6. Apply search filter if specified
  if (searchVal) {
    const pattern = new RegExp(escapeRegex(searchVal), 'i');
    merged = merged.filter(
      (item) =>
        pattern.test(item.name) ||
        pattern.test(item.shortName) ||
        pattern.test(item.code) ||
        pattern.test(item.globalId) ||
        pattern.test(item.category)
    );
  }

  // 7. Apply category filter if specified
  if (selectedCategory && selectedCategory !== 'All Categories') {
    merged = merged.filter(
      (item) => item.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }

  return {
    results: merged,
    total: merged.length,
    attachedLaboratories: attachedLabs.map((l) => ({
      _id: l._id,
      name: l.name,
      globalId: l.globalId
    }))
  };
};

const createCustomLabRequest = async ({ requester, payload }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: payload.clinicId
  });

  const request = await CustomLabRequest.create({
    clinicId,
    doctorId: requester._id,
    testName: payload.testName,
    isGlobalRequest: !!payload.isGlobalRequest
  });

  // Notify Clinic Admins
  const admins = await User.find({ clinicId, role: ROLES.ADMIN, isActive: true });
  for (const admin of admins) {
    await createNotificationRecord({
      clinicId,
      payload: {
        type: 'custom_lab_request',
        channel: 'in_app',
        subject: 'Custom Lab Test Requested',
        body: `Doctor Dr. ${requester.name} has requested a new laboratory test: **${payload.testName}** (Type: ${payload.isGlobalRequest ? 'Global Catalogue Request' : 'Custom Laboratory Test'}).\n\nRequested On: ${new Date().toLocaleString()}\n\nAction Required: Add to Clinic Laboratory Catalogue or review.`,
        metadata: {
          doctorId: requester._id,
          doctorName: requester.name,
          testName: payload.testName,
          requestId: request._id
        }
      }
    });
  }

  return request;
};

const listCustomLabRequests = async ({ requester }) => {
  const clinicId = resolveClinicContext({
    user: requester
  });
  const list = await CustomLabRequest.find({ clinicId }).populate('doctorId', 'name email');
  return list;
};

const listEquipment = async ({ requester, query = {}, requestedClinicId }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const filter = { clinicId };
  const laboratoryId = query.laboratoryId || requester.providerId;
  if (laboratoryId) {
    filter.laboratoryId = laboratoryId;
  }

  return LabEquipment.find(filter);
};

const createEquipment = async ({ requester, payload, requestedClinicId }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  return LabEquipment.create({
    ...payload,
    clinicId,
    laboratoryId: payload.laboratoryId || null
  });
};

const listQcCalibrations = async ({ requester, query = {}, requestedClinicId }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const filter = { clinicId };
  const laboratoryId = query.laboratoryId || requester.providerId;
  
  // Scoping check
  if (laboratoryId) {
    const equipmentIds = await LabEquipment.find({ clinicId, laboratoryId }).select('_id');
    filter.equipmentId = { $in: equipmentIds.map(e => e._id) };
  }
  return LabQcCalibration.find(filter).populate('equipmentId').sort({ createdAt: -1 });
};

const createQcCalibration = async ({ requester, payload, requestedClinicId }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  return LabQcCalibration.create({
    ...payload,
    clinicId,
    performedBy: requester._id
  });
};

const getLabAlerts = async ({ requester, query = {}, requestedClinicId }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const laboratoryId = query.laboratoryId || requester.providerId;

  const alerts = [];

  const reportFilter = {
    clinicId,
    status: { $ne: 'finalized' },
    $or: [
      { 'resultEntries.isAbnormal': true },
      { 'resultEntries.abnormalFlag': 'critical' }
    ]
  };

  if (laboratoryId) {
    // get order ids matching laboratoryId
    const LabOrderModule = require('./labOrder.model');
    const matchingOrders = await LabOrderModule.LabOrder.find({ clinicId, laboratoryId }).select('_id');
    reportFilter.labOrderId = { $in: matchingOrders.map(o => o._id) };
  }

  const abnormalReportsCount = await LabReport.countDocuments(reportFilter);

  if (abnormalReportsCount > 0) {
    alerts.push({
      id: 'alert_critical_results',
      msg: `${abnormalReportsCount} Critical test results pending review`,
      desc: `Across pending work orders`,
      time: 'Just now',
      priority: 'Emergency',
      type: 'critical_results'
    });
  }

  const consumableFilter = {
    clinicId,
    $expr: { $lte: ['$stock', '$reorderLevel'] }
  };
  if (laboratoryId) {
    consumableFilter.laboratoryId = laboratoryId;
  }

  const lowStockConsumables = await LabConsumable.find(consumableFilter);

  for (const item of lowStockConsumables) {
    alerts.push({
      id: `alert_low_stock_${item._id}`,
      msg: `Reagent Low Stock Alert`,
      desc: `${item.name} (${item.stock} left, reorder level ${item.reorderLevel})`,
      time: '10 min ago',
      priority: 'Urgent',
      type: 'low_stock',
      entityId: item._id
    });
  }

  const equipmentFilter = {
    clinicId,
    $or: [
      { status: 'Maintenance' },
      { status: 'Calibration Due' },
      { calibrationStatus: 'Due' },
      { nextMaintenance: { $lte: new Date() } }
    ]
  };
  if (laboratoryId) {
    equipmentFilter.laboratoryId = laboratoryId;
  }

  const maintenanceDueEquipments = await LabEquipment.find(equipmentFilter);

  for (const eq of maintenanceDueEquipments) {
    alerts.push({
      id: `alert_maintenance_${eq._id}`,
      msg: `Equipment Maintenance/Calibration Due`,
      desc: `${eq.name} (${eq.status})`,
      time: '1 hour ago',
      priority: 'Routine',
      type: 'equipment_maintenance',
      entityId: eq._id
    });
  }

  return alerts;
};

const lookupPrescriptionForLab = async ({ requester, query = {} }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });

  const { phone, email, patientId, patientNumber, prescriptionNumber, consultationId, scanCode, search } = query;

  const Patient = require('../patients/patient.model');
  const Prescription = require('../prescriptions/prescription.model');
  const Consultation = require('../consultations/consultation.model');

  let matchedPatient = null;
  let targetPrescription = null;

  // 1. Match by Prescription Number or direct ID or Scan Token
  const directPrescriptionQuery = prescriptionNumber || scanCode || query.prescriptionId || search;
  if (directPrescriptionQuery) {
    const qStr = String(directPrescriptionQuery).trim();
    targetPrescription = await Prescription.findOne({
      $or: [
        { prescriptionNumber: qStr },
        { prescriptionNumber: { $regex: new RegExp(`^${qStr}$`, 'i') } },
        ...(mongoose.Types.ObjectId.isValid(qStr) ? [{ _id: qStr }] : [])
      ]
    })
      .populate('patientId')
      .populate('doctorId', 'firstName lastName name specialization doctorCode')
      .populate('clinicId', 'name code')
      .lean();

    if (targetPrescription?.patientId) {
      matchedPatient = targetPrescription.patientId;
    }
  }

  // 2. Match by Consultation ID
  if (!matchedPatient && consultationId && mongoose.Types.ObjectId.isValid(consultationId)) {
    const cons = await Consultation.findById(consultationId).populate('patientId').lean();
    if (cons) {
      matchedPatient = cons.patientId;
      targetPrescription = await Prescription.findOne({ consultationId })
        .populate('patientId')
        .populate('doctorId', 'firstName lastName name specialization doctorCode')
        .populate('clinicId', 'name code')
        .lean();
    }
  }

  // 3. Match by Patient ID or Number
  const patientSearch = patientId || patientNumber || search;
  if (!matchedPatient && patientSearch) {
    const pStr = String(patientSearch).trim();
    matchedPatient = await Patient.findOne({
      $or: [
        { patientId: pStr },
        { patientId: { $regex: new RegExp(`^${pStr}$`, 'i') } },
        ...(mongoose.Types.ObjectId.isValid(pStr) ? [{ _id: pStr }] : []),
        { phone: pStr },
        { email: pStr.toLowerCase() }
      ]
    }).lean();
  }

  // 4. Match by Phone Number or Email
  if (!matchedPatient && (phone || email)) {
    const rawDigits = (phone || '').replace(/\D/g, '');
    const matchCriteria = [];
    if (phone) {
      matchCriteria.push({ phone: phone.trim() });
      if (rawDigits.length >= 10) {
        matchCriteria.push({ phone: { $regex: rawDigits.slice(-10) } });
      }
    }
    if (email) {
      matchCriteria.push({ email: email.trim().toLowerCase() });
    }

    if (matchCriteria.length > 0) {
      matchedPatient = await Patient.findOne({
        ...(clinicId ? { clinicId } : {}),
        $or: matchCriteria
      }).lean();

      if (!matchedPatient && clinicId) {
        matchedPatient = await Patient.findOne({ $or: matchCriteria }).lean();
      }
    }
  }

  if (!matchedPatient && !targetPrescription) {
    throw new AppError('No matching patient or prescription found.', HTTP_STATUS.NOT_FOUND);
  }

  const patientRecId = matchedPatient?._id || targetPrescription?.patientId?._id || targetPrescription?.patientId;

  // Find all prescriptions for this patient
  const prescriptions = await Prescription.find({
    ...(patientRecId ? { patientId: patientRecId } : targetPrescription ? { _id: targetPrescription._id } : {}),
    status: { $ne: 'cancelled' }
  })
    .sort({ createdAt: -1 })
    .populate('doctorId', 'firstName lastName name specialization doctorCode')
    .populate('clinicId', 'name code')
    .lean();

  const prescriptionsWithLabs = prescriptions.filter((p) => p.labs && p.labs.length > 0);
  const latestPrescription = targetPrescription || prescriptionsWithLabs[0] || prescriptions[0] || null;
  const previousPrescriptions = prescriptionsWithLabs.filter((p) => String(p._id) !== String(latestPrescription?._id));

  // Find any active orders
  const activeOrders = await LabOrder.find({
    ...(patientRecId ? { patientId: patientRecId } : {}),
    status: { $nin: ['completed', 'cancelled'] }
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    patient: matchedPatient || targetPrescription?.patientId || null,
    latestPrescription,
    previousPrescriptions,
    activeOrders,
    totalPrescriptions: prescriptionsWithLabs.length
  };
};

const getSmartPackageSuggestions = async ({ requester, query = {} }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });

  let testIds = [];
  if (query.testIds) {
    testIds = String(query.testIds)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (query.prescriptionId) {
    const Prescription = require('../prescriptions/prescription.model');
    const prescription = await Prescription.findById(query.prescriptionId).lean();
    if (prescription?.labs) {
      const pTestIds = prescription.labs
        .map((l) => l.globalLabTestId || l.investigationId || l.code)
        .filter(Boolean);
      testIds = [...new Set([...testIds, ...pTestIds])];
    }
  }

  const packages = await LabTest.find({
    clinicId,
    isActive: true
  })
    .populate('globalLabTestId')
    .lean();

  const selectedGlobalTests = await GlobalLabTest.find({
    $or: [
      { _id: { $in: testIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) } },
      { internalCode: { $in: testIds } },
      { shortName: { $in: testIds } }
    ]
  }).lean();

  const packageCandidates = packages.filter((pkg) => {
    const name = (pkg.name || pkg.globalLabTestId?.name || '').toLowerCase();
    const cat = (pkg.category || pkg.globalLabTestId?.category?.name || '').toLowerCase();
    return pkg.isPackage || pkg.isHealthPackage || name.includes('package') || name.includes('panel') || name.includes('profile') || cat.includes('package') || cat.includes('panel');
  });

  const suggestions = [];

  for (const pkg of packageCandidates) {
    const g = pkg.globalLabTestId;
    const packageName = pkg.name || g?.name || 'Complete Health Package';
    const includedNames = (g?.parameters || []).map((p) => p.name || p).filter(Boolean);

    const covered = selectedGlobalTests.filter((st) => {
      const stName = st.name.toLowerCase();
      const stCode = (st.shortName || st.internalCode || '').toLowerCase();
      return (
        packageName.toLowerCase().includes(stCode) ||
        packageName.toLowerCase().includes(stName) ||
        includedNames.some((inc) => inc.toLowerCase().includes(stName) || stName.includes(inc.toLowerCase()))
      );
    });

    const packagePrice = pkg.price || pkg.testPrice || 900;
    const individualTotal = selectedGlobalTests.reduce((sum, t) => sum + (t.testPrice || t.price || 400), 0) || 1200;
    const savings = individualTotal > packagePrice ? individualTotal - packagePrice : 300;

    suggestions.push({
      packageId: pkg._id,
      globalPackageId: g?._id || null,
      packageName,
      packageCode: pkg.code || g?.globalId || 'PKG',
      packagePrice,
      individualTotal,
      savings,
      coveredTests: covered.map((c) => c.name),
      coveredTestsCount: covered.length || selectedGlobalTests.length,
      extraInvestigations: ['Lipid Profile', 'Kidney Function Test (KFT)'].filter((ex) => !packageName.includes(ex)),
      turnaroundTime: pkg.turnaroundTime || '24 Hours',
      suggestedOption: true,
      isDoctorPrescribed: false
    });
  }

  return suggestions.sort((a, b) => b.savings - a.savings);
};

module.exports = {
  createLabConsumable,
  listLabConsumables,
  updateLabConsumable,
  addConsumableBatch,
  adjustConsumableStock,
  listLabStockLedgers,
  getLabInventoryDashboard,
  createLabTest,
  updateLabTest,
  listLabTests,
  createLabOrder,
  listLabOrders,
  getLabOrderById,
  updateLabOrderStatus,
  createLabReport,
  getLabReportById,
  updateLabReport,
  reviewLabAnalysis,
  finalizeLabReport,
  getPatientLabHistory,
  searchAllLabs,
  createCustomLabRequest,
  listCustomLabRequests,
  listEquipment,
  createEquipment,
  listQcCalibrations,
  createQcCalibration,
  getLabAlerts,
  listAvailableGlobalTests,
  bulkActivateGlobalTests,
  lookupPrescriptionForLab,
  getSmartPackageSuggestions
};

