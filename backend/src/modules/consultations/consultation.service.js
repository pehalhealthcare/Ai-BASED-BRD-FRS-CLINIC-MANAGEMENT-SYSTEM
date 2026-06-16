const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');
const { ROLES } = require('../../common/constants/roles');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const { createAuditLog } = require('../audit/audit.service');
const aiService = require('../ai/ai.service');
const AIPrediction = require('../ai/aiPrediction.model');
const appointmentRepository = require('../appointments/appointment.repository');
const doctorRepository = require('../doctors/doctor.repository');
const patientRepository = require('../patients/patient.repository');
const consultationRepository = require('./consultation.repository');

const DEFAULT_AI_DISCLAIMER = 'AI-generated suggestions are assistive only and require doctor validation.';

const normalizeDateInput = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(`${value}T00:00:00.000Z`);
};

const normalizeSymptoms = (symptoms = []) =>
  (symptoms || [])
    .map((symptom) => {
      if (typeof symptom === 'string') {
        return {
          name: symptom.trim(),
          severity: 'mild',
          duration: '',
          notes: ''
        };
      }

      return {
        name: symptom?.name?.trim?.() || '',
        severity: symptom?.severity || 'mild',
        duration: symptom?.duration?.trim?.() || '',
        notes: symptom?.notes?.trim?.() || ''
      };
    })
    .filter((symptom) => symptom.name);

const normalizeVitals = (vitals = {}) => {
  const oxygenSaturation = vitals.oxygenSaturation ?? vitals.spo2;
  return {
    ...(typeof vitals.temperature !== 'undefined' ? { temperature: Number(vitals.temperature) } : {}),
    ...(vitals.bloodPressure ? { bloodPressure: vitals.bloodPressure } : {}),
    ...(typeof vitals.pulse !== 'undefined' ? { pulse: Number(vitals.pulse) } : {}),
    ...(typeof vitals.respiratoryRate !== 'undefined' ? { respiratoryRate: Number(vitals.respiratoryRate) } : {}),
    ...(typeof oxygenSaturation !== 'undefined' ? { oxygenSaturation: Number(oxygenSaturation) } : {}),
    ...(typeof vitals.weight !== 'undefined' ? { weight: Number(vitals.weight) } : {}),
    ...(typeof vitals.height !== 'undefined' ? { height: Number(vitals.height) } : {})
  };
};

const normalizeFormattedClinicalNotes = (formattedClinicalNotes = {}) => ({
  subjective: formattedClinicalNotes.subjective?.trim?.() || '',
  objective: formattedClinicalNotes.objective?.trim?.() || '',
  assessment: formattedClinicalNotes.assessment?.trim?.() || '',
  plan: formattedClinicalNotes.plan?.trim?.() || ''
});

const normalizeAiSoapNote = (aiSoapNote = {}) => ({
  note_type: 'SOAP',
  subjective: aiSoapNote.subjective?.trim?.() || 'Not mentioned',
  objective: aiSoapNote.objective?.trim?.() || 'Not mentioned',
  assessment: aiSoapNote.assessment?.trim?.() || 'Not mentioned',
  plan: aiSoapNote.plan?.trim?.() || 'Not mentioned',
  draft_ai_note: typeof aiSoapNote.draft_ai_note === 'boolean' ? aiSoapNote.draft_ai_note : true,
  missing_information: Array.isArray(aiSoapNote.missing_information)
    ? aiSoapNote.missing_information.map((item) => item?.trim?.()).filter(Boolean)
    : []
});

const normalizeDiagnosis = (diagnosis = {}) => ({
  primary: diagnosis.primary?.trim?.() || '',
  secondary: Array.isArray(diagnosis.secondary)
    ? diagnosis.secondary.map((item) => item.trim()).filter(Boolean)
    : [],
  notes: diagnosis.notes?.trim?.() || ''
});

const normalizeFollowUp = (followUp = {}) => {
  const date = normalizeDateInput(followUp.date);
  const required = typeof followUp.required === 'boolean' ? followUp.required : Boolean(date);

  return {
    required,
    ...(date ? { date } : {}),
    notes: followUp.notes?.trim?.() || ''
  };
};

const buildConsultationPayload = (payload = {}) => ({
  ...(payload.chiefComplaint ? { chiefComplaint: payload.chiefComplaint.trim() } : {}),
  ...(payload.symptoms ? { symptoms: normalizeSymptoms(payload.symptoms) } : {}),
  ...(payload.vitals ? { vitals: normalizeVitals(payload.vitals) } : {}),
  ...(typeof payload.clinicalNotes !== 'undefined' ? { clinicalNotes: payload.clinicalNotes?.trim?.() || '' } : {}),
  ...(payload.formattedClinicalNotes
    ? { formattedClinicalNotes: normalizeFormattedClinicalNotes(payload.formattedClinicalNotes) }
    : {}),
  ...(payload.diagnosis ? { diagnosis: normalizeDiagnosis(payload.diagnosis) } : {}),
  ...(typeof payload.treatmentPlan !== 'undefined'
    ? { treatmentPlan: payload.treatmentPlan?.trim?.() || '' }
    : {}),
  ...(payload.followUp ? { followUp: normalizeFollowUp(payload.followUp) } : {}),
  ...(payload.status ? { status: payload.status } : {})
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

const ensureClinicEntities = async ({ clinicId, appointmentId, patientId, doctorId }) => {
  const [appointment, patient, doctor] = await Promise.all([
    appointmentRepository.findAppointmentByIdAndClinic({
      appointmentId,
      clinicId,
      populateDetails: false
    }),
    patientRepository.findPatientByIdAndClinic({ patientId, clinicId }),
    doctorRepository.findDoctorByIdAndClinic({ doctorId, clinicId })
  ]);

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!patient || !patient.isActive) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!doctor || !doctor.isActive) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (appointment.status === APPOINTMENT_STATUSES.CANCELLED) {
    throw new AppError('Cancelled appointments cannot start a consultation.', HTTP_STATUS.BAD_REQUEST);
  }

  if (String(appointment.patientId) !== String(patient._id)) {
    throw new AppError('Appointment does not belong to the selected patient.', HTTP_STATUS.BAD_REQUEST);
  }

  if (String(appointment.doctorId) !== String(doctor._id)) {
    throw new AppError('Appointment does not belong to the selected doctor.', HTTP_STATUS.BAD_REQUEST);
  }

  return { appointment, patient, doctor };
};

const setAppointmentInConsultation = async (appointment) => {
  if (
    [
      APPOINTMENT_STATUSES.BOOKED,
      APPOINTMENT_STATUSES.CONFIRMED,
      APPOINTMENT_STATUSES.CHECKED_IN
    ].includes(appointment.status)
  ) {
    appointment.status = APPOINTMENT_STATUSES.IN_CONSULTATION;
    await appointment.save();
  }
};

const completeAppointmentIfPossible = async (appointment) => {
  if (
    ![
      APPOINTMENT_STATUSES.CANCELLED,
      APPOINTMENT_STATUSES.NO_SHOW,
      APPOINTMENT_STATUSES.RESCHEDULED,
      APPOINTMENT_STATUSES.COMPLETED
    ].includes(appointment.status)
  ) {
    appointment.status = APPOINTMENT_STATUSES.COMPLETED;
    await appointment.save();
  }
};

const getScopedConsultation = async ({
  requester,
  consultationId,
  requestedClinicId = null,
  populateDetails = true
}) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const consultation = await consultationRepository.findById({
    id: consultationId,
    clinicId,
    populateDetails
  });

  if (!consultation) {
    throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
  }

  return { consultation, clinicId };
};

const assertDoctorCanMutate = async ({ requester, clinicId, doctorId }) => {
  if (requester.role !== ROLES.DOCTOR) {
    return null;
  }

  const doctorProfile = await getRequesterDoctorProfile({ requester, clinicId });

  if (String(doctorProfile._id) !== String(doctorId)) {
    throw new AppError('You can only manage your own consultations.', HTTP_STATUS.FORBIDDEN);
  }

  return doctorProfile;
};

const assertDoctorReviewer = async ({ requester, clinicId, doctorId }) => {
  if (requester.role !== ROLES.DOCTOR) {
    throw new AppError('Only a doctor can approve or reject AI draft notes.', HTTP_STATUS.FORBIDDEN);
  }

  const doctorProfile = await getRequesterDoctorProfile({ requester, clinicId });

  if (String(doctorProfile._id) !== String(doctorId)) {
    throw new AppError('You can only review AI draft notes for your own consultations.', HTTP_STATUS.FORBIDDEN);
  }

  return doctorProfile;
};

const extractAiResponseData = (response = {}) => response.data || response;

const buildAiNoteMetadata = (responseData = {}) => ({
  model_name: responseData.model_name || '',
  model_version: responseData.model_version || '',
  confidence: Number(responseData.confidence || 0),
  audit_id: responseData.audit_id || '',
  created_at: new Date()
});

const buildPreviousDiagnoses = async ({ clinicId, patientId, excludeConsultationId = null }) => {
  const recentConsultations = await consultationRepository.findRecentPatientConsultations({
    clinicId,
    patientId,
    excludeConsultationId,
    limit: 5
  });

  return recentConsultations
    .map((item) => item.diagnosis?.primary || item.diagnosis?.secondary?.[0] || '')
    .filter(Boolean);
};

const appendAiReviewToDiagnosisNotes = ({ consultation, acceptedSuggestions = [], doctorComment = '' }) => {
  if (!acceptedSuggestions.length || !doctorComment.trim()) {
    return;
  }

  const existingNotes = consultation.diagnosis?.notes?.trim?.() || '';
  const reviewLine = `AI review accepted suggestions: ${acceptedSuggestions.join(', ')}. Doctor comment: ${doctorComment.trim()}`;

  consultation.diagnosis = {
    ...normalizeDiagnosis(consultation.diagnosis),
    notes: existingNotes ? `${existingNotes}\n${reviewLine}` : reviewLine
  };
};

const createConsultation = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  const appointment = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId: payload.appointmentId,
    clinicId,
    populateDetails: false
  });

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  const doctorId =
    payload.doctorId ||
    (requester.role === ROLES.DOCTOR
      ? (await getRequesterDoctorProfile({ requester, clinicId }))?._id?.toString()
      : appointment.doctorId?.toString?.() || appointment.doctorId);

  const { patient, doctor } = await ensureClinicEntities({
    clinicId,
    appointmentId: payload.appointmentId,
    patientId: payload.patientId,
    doctorId
  });

  await assertDoctorCanMutate({
    requester,
    clinicId,
    doctorId: doctor._id
  });

  const existingConsultation = await consultationRepository.findByAppointmentId({
    appointmentId: appointment._id,
    clinicId
  });

  if (existingConsultation) {
    throw new AppError('Consultation already exists for this appointment.', HTTP_STATUS.CONFLICT);
  }

  const consultation = await consultationRepository.createConsultation({
    clinicId,
    appointmentId: appointment._id,
    patientId: patient._id,
    doctorId: doctor._id,
    ...buildConsultationPayload(payload),
    status: 'in_progress',
    startedAt: new Date(),
    aiSuggestions: {
      requested: false,
      generatedAt: null,
      status: 'not_requested',
      suggestions: [],
      rawResponse: {},
      errorMessage: ''
    },
    aiReview: {
      decision: 'pending',
      acceptedSuggestions: [],
      rejectedSuggestions: [],
      doctorComment: '',
      reviewedAt: null,
      reviewedBy: null
    },
    createdBy: requester._id,
    updatedBy: requester._id
  });

  await setAppointmentInConsultation(appointment);

  await createAuditLog({
    actorUserId: requester._id,
    action: 'CONSULTATION_CREATED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      appointmentId: String(appointment._id),
      patientId: String(patient._id),
      doctorId: String(doctor._id)
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  const updatedConsultation = await consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });

  try {
    const { createFollowUpTaskFromConsultation } = require('../notifications/notification.service');

    await createFollowUpTaskFromConsultation({
      consultation: updatedConsultation,
      requester,
      req
    });
  } catch (_error) {
    // Follow-up creation is best-effort and must not block consultation completion.
  }

  return updatedConsultation;
};

const listConsultations = async ({ requester, query = {} }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filters = {
    status: query.status,
    patientId: query.patientId,
    doctorId: query.doctorId,
    appointmentId: query.appointmentId
  };

  if (requester.role === ROLES.DOCTOR) {
    const doctorProfile = await getRequesterDoctorProfile({ requester, clinicId });
    filters.doctorId = doctorProfile._id;
  }

  const { consultations, total } = await consultationRepository.listConsultations({
    clinicId,
    filters,
    pagination: { page, limit }
  });

  return {
    consultations,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getConsultationById = async ({ requester, consultationId, requestedClinicId = null }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorCanMutate({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  return {
    consultation,
    patient: consultation.patientId,
    doctor: consultation.doctorId,
    appointment: consultation.appointmentId
  };
};

const getAppointmentConsultation = async ({ requester, appointmentId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const consultation = await consultationRepository.findByAppointmentId({
    appointmentId,
    clinicId,
    populateDetails: true
  });

  if (!consultation) {
    throw new AppError('Consultation not found for this appointment.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.DOCTOR) {
    await assertDoctorCanMutate({
      requester,
      clinicId,
      doctorId: consultation.doctorId?._id || consultation.doctorId
    });
  }

  return {
    consultation,
    patient: consultation.patientId,
    doctor: consultation.doctorId,
    appointment: consultation.appointmentId
  };
};

const updateConsultation = async ({ requester, consultationId, payload, requestedClinicId = null, req }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorCanMutate({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  if (!['draft', 'in_progress'].includes(consultation.status)) {
    throw new AppError('Only draft or in-progress consultations can be updated.', HTTP_STATUS.BAD_REQUEST);
  }

  const nextPayload = buildConsultationPayload(payload);

  Object.assign(consultation, nextPayload, {
    updatedBy: requester._id
  });

  if (!consultation.startedAt) {
    consultation.startedAt = new Date();
  }

  if (!consultation.status || consultation.status === 'draft') {
    consultation.status = payload.status || 'in_progress';
  }

  await consultation.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'CONSULTATION_UPDATED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      updatedFields: Object.keys(payload)
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });
};

const getPatientConsultationHistory = async ({ requester, patientId, query, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query?.clinicId
  });
  const patient = await patientRepository.findPatientByIdAndClinic({ patientId, clinicId });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  const { page, limit } = getPagination(query || {});
  const { consultations, total } = await consultationRepository.findByPatientId({
    clinicId,
    patientId,
    options: { page, limit }
  });

  return {
    patient,
    consultations: consultations.map((consultation) => ({
      _id: consultation._id,
      createdAt: consultation.createdAt,
      date: consultation.createdAt,
      doctor: consultation.doctorId
        ? {
            _id: consultation.doctorId._id,
            fullName: consultation.doctorId.fullName,
            doctorCode: consultation.doctorId.doctorCode,
            specialization: consultation.doctorId.specialization
          }
        : null,
      chiefComplaint: consultation.chiefComplaint,
      diagnosis: consultation.diagnosis,
      treatmentPlan: consultation.treatmentPlan,
      followUp: consultation.followUp,
      status: consultation.status
    })),
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const requestAiSuggestions = async ({
  requester,
  consultationId,
  options = {},
  requestedClinicId = null,
  req
}) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorCanMutate({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  const patient = consultation.patientId;
  const previousDiagnoses = options.includePatientHistory === false
    ? []
    : await buildPreviousDiagnoses({
        clinicId,
        patientId: patient._id,
        excludeConsultationId: consultation._id
      });

  const aiPayload = {
    chiefComplaint: consultation.chiefComplaint,
    symptoms: (consultation.symptoms || []).map((item) => ({
      name: item.name,
      severity: item.severity || 'mild',
      duration: item.duration || '',
      notes: item.notes || ''
    })),
    vitals: options.includeVitals === false ? {} : normalizeVitals(consultation.vitals || {}),
    clinicalNotes: consultation.clinicalNotes || '',
    patientContext: {
      age: patient?.age ?? null,
      gender: patient?.gender || null,
      previousDiagnoses
    }
  };

  consultation.aiSuggestions = {
    requested: true,
    generatedAt: new Date(),
    status: 'pending',
    suggestions: [],
    rawResponse: {},
    errorMessage: ''
  };
  consultation.updatedBy = requester._id;
  await consultation.save();

  try {
    const aiResponse = await aiService.getDiagnosisSuggestions(aiPayload);
    const aiOutput = aiResponse.output || aiResponse.data?.output || {};
    const rawSuggestions = aiOutput.top_3_diagnosis_suggestions || aiResponse.data?.suggestions || [];

    const suggestionItems = rawSuggestions.map((item) => ({
      condition: item.condition || item.diagnosis,
      confidence: item.confidence || (item.likelihood === 'high' ? 0.8 : item.likelihood === 'medium' ? 0.6 : 0.4),
      reasoning: item.reasoning || item.supporting_evidence?.[0] || 'Clinical review is required',
      recommendedSpecialization: item.recommendedSpecialization || '',
      redFlags: item.redFlags || item.contraindications_or_warnings || [],
      recommendedTests: item.recommendedTests || item.missing_information || [],
      safetyNote: item.safetyNote || DEFAULT_AI_DISCLAIMER
    }));

    consultation.aiSuggestions = {
      requested: true,
      generatedAt: new Date(),
      status: 'generated',
      suggestions: suggestionItems,
      rawResponse: aiResponse.data || {},
      errorMessage: ''
    };
    consultation.updatedBy = requester._id;
    await consultation.save();

    await AIPrediction.create({
      clinicId,
      patientId: patient._id,
      appointmentId: consultation.appointmentId?._id || consultation.appointmentId,
      consultationId: consultation._id,
      predictionType: 'diagnosis_suggestion',
      inputData: aiPayload,
      outputData: aiResponse.data,
      confidenceScore: Math.max(0, ...suggestionItems.map((item) => item.confidence || 0)),
      modelName: aiResponse.data.modelName || 'rule-based-mvp-clinical-assistant',
      modelVersion: aiResponse.data.modelVersion || '0.1.0',
      disclaimer: aiResponse.data.disclaimer || DEFAULT_AI_DISCLAIMER,
      createdBy: requester._id
    });

    await createAuditLog({
      actorUserId: requester._id,
      action: 'AI_SUGGESTION_REQUESTED',
      entity: 'Consultation',
      entityId: consultation._id,
      metadata: {
        suggestionCount: suggestionItems.length,
        modelName: aiResponse.data.modelName || 'rule-based-mvp-clinical-assistant'
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    return consultationRepository.findById({
      id: consultation._id,
      clinicId,
      populateDetails: true
    });
  } catch (error) {
    consultation.aiSuggestions = {
      requested: true,
      generatedAt: new Date(),
      status: 'failed',
      suggestions: [],
      rawResponse: {},
      errorMessage: error.message || 'AI service is temporarily unavailable'
    };
    consultation.updatedBy = requester._id;
    await consultation.save();

    await createAuditLog({
      actorUserId: requester._id,
      action: 'AI_SUGGESTION_REQUESTED',
      entity: 'Consultation',
      entityId: consultation._id,
      metadata: {
        errorMessage: consultation.aiSuggestions.errorMessage
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'FAILED'
    });

    throw error;
  }
};

const reviewAiSuggestions = async ({ requester, consultationId, payload, requestedClinicId = null, req }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorCanMutate({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  if (!consultation.aiSuggestions?.suggestions?.length) {
    throw new AppError('No AI suggestions are available for review.', HTTP_STATUS.BAD_REQUEST);
  }

  consultation.aiReview = {
    decision: payload.decision,
    acceptedSuggestions: payload.acceptedSuggestions || [],
    rejectedSuggestions: payload.rejectedSuggestions || [],
    doctorComment: payload.doctorComment?.trim?.() || '',
    reviewedAt: new Date(),
    reviewedBy: requester._id
  };
  consultation.aiSuggestions.status = payload.decision;
  consultation.updatedBy = requester._id;

  appendAiReviewToDiagnosisNotes({
    consultation,
    acceptedSuggestions: consultation.aiReview.acceptedSuggestions,
    doctorComment: consultation.aiReview.doctorComment
  });

  await consultation.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'AI_SUGGESTION_REVIEWED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      decision: payload.decision,
      acceptedSuggestions: payload.acceptedSuggestions || [],
      rejectedSuggestions: payload.rejectedSuggestions || []
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });
};

const formatClinicalNote = async ({ requester, consultationId, payload, requestedClinicId = null, req }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorCanMutate({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  const aiResponse = await aiService.formatConsultationNote({
    rawNote: payload.rawNote,
    format: payload.format || 'SOAP'
  });

  if (payload.save) {
    consultation.formattedClinicalNotes = normalizeFormattedClinicalNotes(aiResponse.data || {});
    consultation.updatedBy = requester._id;
    await consultation.save();
  }

  await AIPrediction.create({
    clinicId,
    patientId: consultation.patientId?._id || consultation.patientId,
    appointmentId: consultation.appointmentId?._id || consultation.appointmentId,
    consultationId: consultation._id,
    predictionType: 'clinical_note',
    inputData: {
      rawNote: payload.rawNote,
      format: payload.format || 'SOAP'
    },
    outputData: aiResponse.data,
    confidenceScore: 0,
    modelName: aiResponse.data?.modelName || 'rule-based-mvp-clinical-assistant',
    modelVersion: aiResponse.data?.modelVersion || '0.1.0',
    disclaimer: aiResponse.data?.disclaimer || 'AI-generated formatting. Doctor review required.',
    createdBy: requester._id
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'CONSULTATION_NOTE_FORMATTED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      saved: Boolean(payload.save)
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return {
    consultationId: consultation._id,
    formattedClinicalNotes: aiResponse.data,
    saved: Boolean(payload.save)
  };
};

const uploadVoiceNote = async ({
  requester,
  consultationId,
  rawBody,
  contentType,
  requestedClinicId = null,
  req
}) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorReviewer({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  if (!contentType || !contentType.includes('multipart/form-data') || !Buffer.isBuffer(rawBody) || !rawBody.length) {
    throw new AppError('A multipart audio file is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const transcriptionResponse = await aiService.transcribeVoiceNote({
    payloadBuffer: rawBody,
    contentType
  });
  const transcriptionData = extractAiResponseData(transcriptionResponse);
  const transcriptionOutput = transcriptionData.output || transcriptionData;

  const formattedResponse = await aiService.formatClinicalNoteDraft({
    transcript: transcriptionOutput.transcript || '',
    patient_id: consultation.patientId?._id?.toString?.() || consultation.patientId?.toString?.(),
    doctor_id: requester._id.toString(),
    consultation_id: consultation._id.toString(),
    format: 'SOAP'
  });
  const formattedData = extractAiResponseData(formattedResponse);
  const formattedOutput = formattedData.output || {};

  consultation.transcript_text = transcriptionOutput.transcript || '';
  consultation.ai_soap_note = normalizeAiSoapNote(formattedOutput);
  consultation.ai_note_status = 'draft';
  consultation.ai_note_metadata = buildAiNoteMetadata(formattedData);
  consultation.updatedBy = requester._id;
  await consultation.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'CONSULTATION_VOICE_NOTE_PROCESSED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      auditId: formattedData.audit_id || transcriptionData.audit_id || '',
      modelName: formattedData.model_name || transcriptionData.model_name || '',
      transcriptionStatus: transcriptionData.model_status || 'unknown',
      noteStatus: formattedData.model_status || 'unknown'
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });
};

const editAiNote = async ({ requester, consultationId, payload, requestedClinicId = null, req }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorReviewer({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  if (payload.transcript_text) {
    consultation.transcript_text = payload.transcript_text.trim();
  }

  if (payload.ai_soap_note) {
    consultation.ai_soap_note = normalizeAiSoapNote(payload.ai_soap_note);
  }

  consultation.ai_note_status = 'edited';
  consultation.updatedBy = requester._id;
  await consultation.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'CONSULTATION_AI_NOTE_EDITED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      updatedFields: Object.keys(payload)
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });
};

const approveAiNote = async ({ requester, consultationId, payload = {}, requestedClinicId = null, req }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorReviewer({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  if (payload.transcript_text) {
    consultation.transcript_text = payload.transcript_text.trim();
  }

  if (payload.approved_note) {
    consultation.approved_note = normalizeAiSoapNote(payload.approved_note);
  } else if (consultation.ai_soap_note) {
    consultation.approved_note = normalizeAiSoapNote(consultation.ai_soap_note);
  }

  if (!consultation.approved_note?.subjective && !consultation.ai_soap_note?.subjective) {
    throw new AppError('No AI SOAP note is available to approve.', HTTP_STATUS.BAD_REQUEST);
  }

  consultation.formattedClinicalNotes = normalizeFormattedClinicalNotes({
    subjective: consultation.approved_note.subjective,
    objective: consultation.approved_note.objective,
    assessment: consultation.approved_note.assessment,
    plan: consultation.approved_note.plan
  });
  consultation.clinicalNotes = consultation.transcript_text || consultation.clinicalNotes;
  consultation.ai_note_status = 'approved';
  consultation.approved_by = requester._id;
  consultation.approved_at = new Date();
  consultation.updatedBy = requester._id;
  await consultation.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'CONSULTATION_AI_NOTE_APPROVED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      auditId: consultation.ai_note_metadata?.audit_id || '',
      modelName: consultation.ai_note_metadata?.model_name || ''
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });
};

const rejectAiNote = async ({ requester, consultationId, payload = {}, requestedClinicId = null, req }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorReviewer({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  consultation.ai_note_status = 'rejected';
  consultation.updatedBy = requester._id;
  await consultation.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'CONSULTATION_AI_NOTE_REJECTED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      reason: payload.reason || ''
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });
};

const completeConsultation = async ({ requester, consultationId, payload, requestedClinicId = null, req }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  await assertDoctorCanMutate({
    requester,
    clinicId,
    doctorId: consultation.doctorId?._id || consultation.doctorId
  });

  consultation.diagnosis = normalizeDiagnosis(payload.diagnosis);
  consultation.treatmentPlan = payload.treatmentPlan.trim();
  if (payload.followUp) {
    consultation.followUp = normalizeFollowUp(payload.followUp);
  }

  if (!consultation.diagnosis?.primary?.trim()) {
    throw new AppError('diagnosis.primary is required before completing a consultation.', HTTP_STATUS.BAD_REQUEST);
  }

  if (!consultation.treatmentPlan?.trim()) {
    throw new AppError('treatmentPlan is required before completing a consultation.', HTTP_STATUS.BAD_REQUEST);
  }

  consultation.status = 'completed';
  consultation.completedAt = new Date();
  if (!consultation.startedAt) {
    consultation.startedAt = new Date();
  }
  consultation.billingReady = true;
  consultation.updatedBy = requester._id;
  await consultation.save();

  const appointment = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId: consultation.appointmentId?._id || consultation.appointmentId,
    clinicId,
    populateDetails: false
  });

  if (appointment) {
    await completeAppointmentIfPossible(appointment);
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'CONSULTATION_COMPLETED',
    entity: 'Consultation',
    entityId: consultation._id,
    metadata: {
      diagnosisPrimary: consultation.diagnosis.primary,
      billingReady: true
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });
};

module.exports = {
  createConsultation,
  listConsultations,
  getConsultationById,
  getAppointmentConsultation,
  getPatientConsultationHistory,
  requestAiSuggestions,
  reviewAiSuggestions,
  formatClinicalNote,
  uploadVoiceNote,
  editAiNote,
  approveAiNote,
  rejectAiNote,
  completeConsultation,
  // Backward-compatible aliases used by existing patient routes and earlier Phase 6 code
  getPatientConsultations: getPatientConsultationHistory
};
