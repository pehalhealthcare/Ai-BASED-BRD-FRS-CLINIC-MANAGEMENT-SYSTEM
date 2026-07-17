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
const LabTestMaster = require('./labTestMaster.model');
const LabTest = require('./labTest.model');
const LabConsumable = require('./labConsumable.model');
const LabConsumableBatch = require('./labConsumableBatch.model');
const LabStockLedger = require('./labStockLedger.model');
const Supplier = require('../pharmacy/supplier.model');

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

const buildLabOrderTests = ({ payloadTests = [], catalogTests = [] }) =>
  payloadTests.map((test) => {
    const matchedCatalogTest = test.labTestId
      ? catalogTests.find((catalogItem) => String(catalogItem._id) === String(test.labTestId))
      : null;

    return {
      ...(matchedCatalogTest ? { labTestId: matchedCatalogTest._id } : {}),
      code: (matchedCatalogTest?.code || test.code || '').trim().toUpperCase(),
      name: (matchedCatalogTest?.name || test.name || '').trim(),
      category: matchedCatalogTest?.category || '',
      specimenType: matchedCatalogTest?.specimenType || '',
      unit: matchedCatalogTest?.unit || '',
      normalRange: normalizeNormalRange(matchedCatalogTest?.normalRange || {}),
      status: 'ordered'
    };
  });

const createLabTest = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

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

  // Prevent double import of same global lab test in the same clinic
  if (globalTest) {
    const existing = await LabTest.findOne({ clinicId, globalLabTestId: globalTest._id });
    if (existing) {
      throw new AppError('This lab test has already been imported into your clinic catalog', HTTP_STATUS.CONFLICT);
    }
  }

  const labTest = await labRepository.createLabTest({
    clinicId,
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

  const labTest = await labRepository.findLabTestById({ id: labTestId, clinicId });
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
  if (typeof payload.price !== 'undefined') updates.price = payload.price;
  if (typeof payload.isActive === 'boolean') updates.isActive = payload.isActive;
  updates.updatedBy = requester._id;

  const updatedLabTest = await labRepository.updateLabTest({
    id: labTestId,
    clinicId,
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

  return {
    labTests,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const createLabOrder = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  let consultation = null;
  if (payload.consultationId) {
    consultation = await consultationRepository.findById({
      id: payload.consultationId,
      clinicId,
      populateDetails: true
    });

    if (!consultation) {
      throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
    }
  }

  let patient = null;
  if (payload.patientId) {
    patient = await patientRepository.findPatientByIdAndClinic({
      patientId: payload.patientId,
      clinicId
    });
  } else if (requester.role === ROLES.PATIENT) {
    patient = await patientRepository.findPatientByUserId({ userId: requester._id });
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

  if (catalogTests.length !== requestedCatalogTestIds.length) {
    throw new AppError('One or more selected lab tests were not found or are inactive.', HTTP_STATUS.BAD_REQUEST);
  }

  const tests = buildLabOrderTests({
    payloadTests: payload.tests,
    catalogTests
  });

  if (tests.some((test) => !test.code || !test.name)) {
    throw new AppError('Each lab order test must include a code and name.', HTTP_STATUS.BAD_REQUEST);
  }

  const labOrder = await labRepository.createLabOrder({
    clinicId,
    consultationId: consultation ? consultation._id : null,
    patientId: patient._id,
    doctorId: doctor ? doctor._id : null,
    appointmentId: appointmentId || null,
    orderNumber: await generateLabOrderNumber(clinicId),
    tests,
    priority: payload.priority || 'routine',
    notes: payload.notes?.trim?.() || '',
    status: 'ordered',
    orderedAt: new Date(),
    createdBy: requester._id,
    updatedBy: requester._id
  });

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
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
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
  const existing = await LabConsumable.findOne({ clinicId, name: new RegExp(`^${payload.name.trim()}$`, 'i') });
  if (existing) {
    throw new AppError('A consumable with this name already exists.', HTTP_STATUS.CONFLICT);
  }
  return LabConsumable.create({
    ...payload,
    clinicId,
    createdBy: requester._id
  });
};

const listLabConsumables = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  const filter = { clinicId };
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
  const consumable = await LabConsumable.findOne({ _id: consumableId, clinicId });
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

// ─── LAB INVENTORY DASHBOARD STATISTICS ───────────────────────────────────────

const getLabInventoryDashboard = async ({ requester, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({ user: requester, requestedClinicId });
  
  const consumables = await LabConsumable.find({ clinicId, isActive: true });
  
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
  
  // 1. Fetch Clinic Laboratory Catalog (Priority 1)
  let localFilter = { clinicId };
  if (searchVal) {
    const pattern = new RegExp(escapeRegex(searchVal), 'i');
    localFilter.$or = [{ code: pattern }, { name: pattern }, { category: pattern }, { specimenType: pattern }];
  }
  const locals = await LabTest.find(localFilter).lean();
  
  const clinicResults = locals.map(t => ({
    _id: t._id,
    name: t.name,
    code: t.code,
    category: t.category || 'General',
    sampleType: t.specimenType || 'Blood',
    tat: t.turnaroundTime || 'Same Day',
    preparation: 'No Fasting Required',
    price: t.price || 300,
    provider: 'Clinic Laboratory',
    availability: t.isActive ? 'Available' : 'Unavailable',
    source: 'Clinic Laboratory',
    inHouse: true
  }));

  // 2. Fetch Connected APIs (Priority 2)
  const partnerResults = [];
  if (searchVal) {
    const apis = await searchConnectedApis(searchVal);
    apis.forEach((p, idx) => {
      partnerResults.push({
        _id: `partner-${idx}-${Date.now()}`,
        name: p.name,
        code: p.name.split(' ')[0].toUpperCase(),
        category: 'Diagnostic',
        sampleType: 'Blood',
        tat: p.tat,
        preparation: p.prep,
        price: p.price,
        provider: p.partner,
        availability: 'Available',
        source: 'Connected API',
        inHouse: false
      });
    });
  }

  // 3. Fetch Global Master (Priority 3)
  let globalFilter = { isActive: true };
  if (searchVal) {
    const pattern = new RegExp(escapeRegex(searchVal), 'i');
    globalFilter.$or = [{ name: pattern }, { category: pattern }, { department: pattern }];
  }
  const globals = await LabTestMaster.find(globalFilter).limit(50).lean();
  const globalResults = globals.map(g => ({
    _id: g._id,
    name: g.name,
    code: g.name.slice(0, 5).toUpperCase(),
    category: g.category || 'Diagnostic',
    sampleType: g.sampleType || 'Blood',
    tat: '24 Hours',
    preparation: g.preparationInstructions || 'No Fasting Required',
    price: null,
    provider: 'No Laboratory Assigned',
    availability: 'Global Test',
    source: 'Global Diagnostic Master',
    inHouse: false
  }));

  // 4. Fetch Custom Requested Tests (Priority 4)
  let customFilter = { clinicId };
  if (searchVal) {
    customFilter.testName = new RegExp(escapeRegex(searchVal), 'i');
  }
  const customs = await CustomLabRequest.find(customFilter).lean();
  const customResults = customs.map(c => ({
    _id: c._id,
    name: c.testName,
    code: 'CUSTOM',
    category: 'Custom',
    sampleType: 'Blood',
    tat: 'Pending Verification',
    preparation: 'N/A',
    price: null,
    provider: 'Clinic Custom',
    availability: 'Limited Availability',
    source: 'Custom Test',
    inHouse: false
  }));

  // Merge and Deduplicate by name/provider
  const merged = [];
  const seenKeys = new Set();

  const addUnique = (list) => {
    for (const item of list) {
      const key = `${item.name.toLowerCase()}-${(item.provider || '').toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        merged.push(item);
      }
    }
  };

  // Rank in order: Clinic -> Connected -> Global -> Custom
  addUnique(clinicResults);
  addUnique(partnerResults);
  addUnique(globalResults);
  addUnique(customResults);

  return { results: merged };
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
  listCustomLabRequests
};
