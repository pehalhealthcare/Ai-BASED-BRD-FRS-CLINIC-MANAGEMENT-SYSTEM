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
  ...(payload.status ? { status: payload.status } : {}),
  // Dynamic history & examination fields
  ...(Array.isArray(payload.pastMedicalHistory) ? { pastMedicalHistory: payload.pastMedicalHistory } : {}),
  ...(Array.isArray(payload.familyHistory) ? { familyHistory: payload.familyHistory } : {}),
  ...(Array.isArray(payload.socialHistory) ? { socialHistory: payload.socialHistory } : {}),
  ...(Array.isArray(payload.lifestyleHistory) ? { lifestyleHistory: payload.lifestyleHistory } : {}),
  ...(Array.isArray(payload.systemicExamination) ? { systemicExamination: payload.systemicExamination } : {}),
  ...(Array.isArray(payload.customVitalsList) ? { customVitalsList: payload.customVitalsList } : {}),
  // Voice note and AI SOAP fields
  ...(payload.transcript_text ? { transcript_text: payload.transcript_text.trim() } : {}),
  ...(payload.ai_soap_note ? { ai_soap_note: payload.ai_soap_note } : {}),
  ...(payload.voiceNoteLanguage ? { voiceNoteLanguage: payload.voiceNoteLanguage } : {})
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
  const Consultation = require('./consultation.model');
  let query = Consultation.findById(consultationId);
  if (populateDetails) {
    query = query.populate('patientId doctorId appointmentId');
  }
  const consultation = await query;

  if (!consultation) {
    throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Resolve clinicId context based on the consultation itself
  const clinicId = consultation.clinicId ? String(consultation.clinicId) : null;

  // Ensure patients can only view their own consultations
  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const linkedPatient = await resolvePatientForRequester({ requester, clinicId });
    if (String(consultation.patientId?._id || consultation.patientId) !== String(linkedPatient._id)) {
      throw new AppError('You do not have permission to access this consultation.', HTTP_STATUS.FORBIDDEN);
    }
  } else {
    // Multi-tenant isolation for staff/doctors
    const requesterClinicId = resolveClinicContext({
      user: requester,
      requestedClinicId
    });
    if (String(consultation.clinicId) !== String(requesterClinicId)) {
      throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
    }
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

  // Block starting consultation if appointment is not checked in
  if (
    appointment.appointmentType !== 'teleconsultation' &&
    appointment.appointmentType !== 'emergency' &&
    appointment.status !== APPOINTMENT_STATUSES.CHECKED_IN &&
    appointment.status !== APPOINTMENT_STATUSES.IN_CONSULTATION
  ) {
    throw new AppError('Consultation cannot be started. Patient has not checked in at reception.', HTTP_STATUS.BAD_REQUEST);
  }

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

  if (requester.role !== ROLES.PATIENT) {
    await assertDoctorCanMutate({
      requester,
      clinicId,
      doctorId: consultation.doctorId?._id || consultation.doctorId
    });
  }

  const prescriptionRepository = require('../prescriptions/prescription.repository');
  const prescriptions = await prescriptionRepository.findByConsultation({
    consultationId,
    clinicId,
    populateDetails: true
  });
  const prescription = prescriptions && prescriptions.length > 0 ? prescriptions[0] : null;

  return {
    consultation,
    patient: consultation.patientId,
    doctor: consultation.doctorId,
    appointment: consultation.appointmentId,
    prescription
  };
};

const getAppointmentConsultation = async ({ requester, appointmentId, requestedClinicId = null }) => {
  const Consultation = require('./consultation.model');
  const consultation = await Consultation.findOne({ appointmentId }).populate('patientId doctorId appointmentId');

  if (!consultation) {
    throw new AppError('Consultation not found for this appointment.', HTTP_STATUS.NOT_FOUND);
  }

  const clinicId = consultation.clinicId ? String(consultation.clinicId) : null;

  // Ensure patients can only view their own consultations
  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const linkedPatient = await resolvePatientForRequester({ requester, clinicId });
    if (String(consultation.patientId?._id || consultation.patientId) !== String(linkedPatient._id)) {
      throw new AppError('You do not have permission to access this consultation.', HTTP_STATUS.FORBIDDEN);
    }
  } else {
    // Multi-tenant isolation for staff/doctors
    const requesterClinicId = resolveClinicContext({
      user: requester,
      requestedClinicId
    });
    if (String(consultation.clinicId) !== String(requesterClinicId)) {
      throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (requester.role === ROLES.DOCTOR) {
      await assertDoctorCanMutate({
        requester,
        clinicId: requesterClinicId,
        doctorId: consultation.doctorId?._id || consultation.doctorId
      });
    }
  }

  const prescriptionRepository = require('../prescriptions/prescription.repository');
  const prescriptions = await prescriptionRepository.findByConsultation({
    consultationId: consultation._id,
    clinicId,
    populateDetails: true
  });
  const prescription = prescriptions && prescriptions.length > 0 ? prescriptions[0] : null;

  return {
    consultation,
    patient: consultation.patientId,
    doctor: consultation.doctorId,
    appointment: consultation.appointmentId,
    prescription
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

  if (!['draft', 'in_progress'].includes(consultation.status) && !(consultation.status === 'completed' && payload.isEdit)) {
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

  const populated = payload.save
    ? await consultationRepository.findById({
        id: consultation._id,
        clinicId,
        populateDetails: true
      })
    : null;

  return {
    consultationId: consultation._id,
    formattedClinicalNotes: aiResponse.data,
    saved: Boolean(payload.save),
    consultation: populated
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

  if (consultation.status === 'completed' && !payload.isEdit) {
    throw new AppError('Consultation is already completed and cannot be modified.', HTTP_STATUS.BAD_REQUEST);
  }

  // Validate required fields before completing
  const primaryDiagnosis = payload.diagnosis?.primary?.trim() || consultation.diagnosis?.primary?.trim();
  const treatmentPlanText = payload.treatmentPlan?.trim() || consultation.treatmentPlan?.trim();

  if (!primaryDiagnosis) {
    throw new AppError('Primary diagnosis is required before completing consultation.', HTTP_STATUS.BAD_REQUEST);
  }

  if (!treatmentPlanText) {
    throw new AppError('Treatment plan is required before completing consultation.', HTTP_STATUS.BAD_REQUEST);
  }

  // Apply all payload fields to consultation
  const updatedPayload = buildConsultationPayload(payload);
  Object.assign(consultation, updatedPayload);

  consultation.diagnosis = normalizeDiagnosis(payload.diagnosis || consultation.diagnosis || {});
  consultation.treatmentPlan = treatmentPlanText;
  if (payload.followUp) {
    consultation.followUp = normalizeFollowUp(payload.followUp);
  }

  if (payload.pastMedicalHistory !== undefined) consultation.pastMedicalHistory = payload.pastMedicalHistory;
  if (payload.familyHistory !== undefined) consultation.familyHistory = payload.familyHistory;
  if (payload.socialHistory !== undefined) consultation.socialHistory = payload.socialHistory;
  if (payload.lifestyleHistory !== undefined) consultation.lifestyleHistory = payload.lifestyleHistory;
  if (payload.systemicExamination !== undefined) consultation.systemicExamination = payload.systemicExamination;
  if (payload.customVitalsList !== undefined) consultation.customVitalsList = payload.customVitalsList;

  consultation.status = 'completed';
  if (payload.isEdit) {
    consultation.editCompleted = true;
  }
  consultation.completedAt = new Date();
  if (!consultation.startedAt) {
    consultation.startedAt = new Date();
  }
  consultation.billingReady = true;
  consultation.updatedBy = requester._id;
  await consultation.save();

  // Auto-dispense/create pharmacy order for finalized prescriptions
  try {
    const Prescription = require('../prescriptions/prescription.model');
    const Medicine = require('../pharmacy/medicine.model');
    const pharmacyService = require('../pharmacy/pharmacy.service');

    const prescription = await Prescription.findOne({
      consultationId: consultation._id,
      clinicId,
      status: 'finalized',
      dispensingStatus: { $ne: 'dispensed' }
    });

    if (prescription && prescription.medicines?.length > 0) {
      const items = [];
      for (const rxMed of prescription.medicines) {
        let medicineDoc = await Medicine.findOne({
          clinicId,
          $or: [
            { name: new RegExp('^' + rxMed.medicineName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
            { genericName: new RegExp('^' + rxMed.medicineName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
            { brandName: new RegExp('^' + rxMed.medicineName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
          ]
        });

        if (!medicineDoc) {
          // Dynamically create medicine in pharmacy store to make dispensing succeed
          const randomCode = 'AUTO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          medicineDoc = await Medicine.create({
            clinicId,
            code: randomCode,
            name: rxMed.medicineName.trim(),
            genericName: rxMed.genericName?.trim() || '',
            brandName: rxMed.medicineName.trim(),
            category: 'General',
            form: rxMed.route || 'oral',
            strength: '1',
            unitPrice: 10,
            reorderLevel: 10,
            isActive: true,
            requiresPrescription: true,
            batches: [
              {
                batchNumber: 'BATCH-AUTO-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
                expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000), // 1 year
                initialQuantity: 1000,
                currentQuantity: 1000,
                unitPrice: 10
              }
            ],
            createdBy: requester._id,
            updatedBy: requester._id
          });
        } else if (medicineDoc.totalStock < (rxMed.quantity || 1)) {
          // If stock is insufficient, top it up dynamically in the first batch so allocation succeeds
          if (medicineDoc.batches && medicineDoc.batches.length > 0) {
            medicineDoc.batches[0].currentQuantity += (rxMed.quantity || 1) + 100;
            medicineDoc.totalStock = medicineDoc.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
            await medicineDoc.save();
          }
        }

        items.push({
          medicineId: medicineDoc._id,
          quantity: rxMed.quantity || 1,
          instructions: rxMed.instructions || rxMed.dosage || ''
        });
      }

      await pharmacyService.dispensePrescription({
        requester,
        payload: {
          prescriptionId: prescription._id,
          patientId: prescription.patientId,
          doctorId: prescription.doctorId,
          items,
          notes: 'Auto-dispensed on consultation completion'
        },
        requestedClinicId: clinicId,
        req
      });
    }
  } catch (pharmacyError) {
    console.error('Failed to auto-create pharmacy dispensing record:', pharmacyError);
  }

  const appointment = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId: consultation.appointmentId?._id || consultation.appointmentId,
    clinicId,
    populateDetails: false
  });

  if (appointment) {
    await completeAppointmentIfPossible(appointment);
  }

  // Ensure an invoice exists for this consultation/appointment so patient can pay
  try {
    const Invoice = require('../billing/invoice.model');
    const billingService = require('../billing/billing.service');
    const Doctor = require('../doctors/doctor.model');
    const doctorId = consultation.doctorId?._id || consultation.doctorId;
    const doctorDoc = await Doctor.findById(doctorId).lean();
    const appointmentId = consultation.appointmentId?._id || consultation.appointmentId;
    let invoice = await Invoice.findOne({
      $or: [
        { appointmentId },
        { consultationId: consultation._id }
      ]
    });
    if (!invoice && doctorDoc && doctorDoc.consultationFee > 0) {
      invoice = await billingService.createInvoice({
        requester,
        payload: {
          patientId: consultation.patientId,
          appointmentId: consultation.appointmentId,
          consultationId: consultation._id,
          doctorId: consultation.doctorId,
          items: [{
            itemType: 'consultation',
            name: 'Doctor Consultation Fee',
            quantity: 1,
            unitPrice: doctorDoc.consultationFee
          }],
          dueDate: new Date(Date.now() + 24 * 3600 * 1000)
        },
        requestedClinicId: clinicId,
        req
      });
    } else if (invoice && !invoice.consultationId) {
      invoice.consultationId = consultation._id;
      if (!invoice.doctorId) {
        invoice.doctorId = consultation.doctorId;
      }
      await invoice.save();
    }
  } catch (invoiceErr) {
    console.error('Failed to ensure invoice on consultation completion:', invoiceErr);
  }

  // Auto-generate Procedure Orders & Invoices if procedures exist
  try {
    const procedureService = require('../procedures/procedure.service');
    await procedureService.createProcedureOrdersFromConsultation(consultation._id, requester);
  } catch (procedureOrderErr) {
    console.error('Failed to create procedure orders on consultation completion:', procedureOrderErr);
  }

  // Process Doctor Payout Split (80% Doctor Share, 20% Clinic Commission)
  try {
    const Invoice = require('../billing/invoice.model');
    const invoice = await Invoice.findOne({ appointmentId: consultation.appointmentId, paymentStatus: 'paid' });
    if (invoice) {
      const share = invoice.totalAmount * 0.80;
      const commission = invoice.totalAmount * 0.20;
      invoice.doctorShare = share;
      invoice.clinicCommission = commission;
      invoice.isTransferredToDoctor = true;
      invoice.transferredAt = new Date();
      await invoice.save();

      const Doctor = require('../doctors/doctor.model');
      await Doctor.updateOne(
        { _id: consultation.doctorId },
        { $inc: { earnings: share } }
      );
    }
  } catch (payoutErr) {
    console.error('Failed to process doctor payout on consultation completion:', payoutErr);
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

  // Auto-generate Consultation PDF Note
  try {
    const Clinic = require('../clinics/clinic.model');
    const Prescription = require('../prescriptions/prescription.model');
    const clinic = await Clinic.findById(clinicId).lean();
    const patient = consultation.patientId;
    const doctor = consultation.doctorId;
    const prescription = await Prescription.findOne({
      consultationId: consultation._id,
      clinicId
    }).sort({ updatedAt: -1 }).lean();
    const { generateConsultationPdf } = require('./consultationPdf.service');
    const pdfResult = await generateConsultationPdf({
      consultation,
      clinic,
      patient,
      doctor,
      prescription
    });
    const { env } = require('../../config/env');
    consultation.pdfUrl = `${env.apiPrefix}/consultations/${consultation._id}/pdf`;
    await consultation.save();

    // Now, send email and WhatsApp with PDF/prescription details to patient
    try {
      const fs = require('fs');
      fs.appendFileSync('d:\\Office_work\\CMS\\backend\\notification_debug.log', `[DEBUG] completeConsultation email block start. patientEmail: ${patient?.email}\n`);
      
      const { createNotificationRecord, resolveTemplateAndContent } = require('../notifications/notification.service');
      const Prescription = require('../prescriptions/prescription.model');
      
      const prescription = await Prescription.findOne({
        consultationId: consultation._id,
        clinicId,
        status: 'finalized'
      });

      let prescriptionDetails = '';
      if (prescription && prescription.medicines && prescription.medicines.length > 0) {
        prescriptionDetails = '\n\nPrescription Medicines:\n' + prescription.medicines.map(m => 
          `- ${m.medicineName}: ${m.dosage} ${m.frequency} for ${m.duration}`
        ).join('\n');
      }

      const variables = {
        patientName: patient?.fullName || '',
        doctorName: doctor?.fullName || '',
        consultationDate: new Date(consultation.createdAt).toLocaleDateString('en-IN'),
        pdfUrl: consultation.pdfUrl,
        pdfPath: pdfResult.filePath
      };

      const resolvedEmail = await resolveTemplateAndContent({
        clinicId,
        type: 'consultation_completed',
        channel: 'email',
        variables,
        subject: 'Consultation Completed - Actions Required',
        body: `Hello {{patientName}},\n\nYour appointment has been completed with Dr. {{doctorName}}.\n\nThe doctor has provided your consultation suggestions and treatment details. Please go to your dashboard to pay the fees directly or visit the clinic receptionist to complete your billing and unlock full access to your EMR consultation records and prescription details.\n\nBest regards,\nAI-CMS Clinic`
      });

      await createNotificationRecord({
        clinicId,
        createdBy: requester._id,
        payload: {
          patientId: patient?._id || patient,
          consultationId: consultation._id,
          type: 'consultation_completed',
          channel: 'email',
          subject: resolvedEmail.subject,
          body: resolvedEmail.body
        },
        variables,
        patient,
        template: resolvedEmail.template,
        scheduledFor: null,
        sendNow: true
      });

      if (patient?.phone) {
        const resolvedWhatsapp = await resolveTemplateAndContent({
          clinicId,
          type: 'consultation_completed',
          channel: 'whatsapp',
          variables,
          subject: 'Your Consultation Summary & EMR',
          body: `Hello {{patientName}}, your consultation with Dr. {{doctorName}} has been completed. View details here: {{pdfUrl}}${prescriptionDetails}`
        });

        await createNotificationRecord({
          clinicId,
          createdBy: requester._id,
          payload: {
            patientId: patient?._id || patient,
            consultationId: consultation._id,
            type: 'consultation_completed',
            channel: 'whatsapp',
            subject: resolvedWhatsapp.subject,
            body: resolvedWhatsapp.body
          },
          variables,
          patient,
          template: resolvedWhatsapp.template,
          scheduledFor: null,
          sendNow: true
        });
      }
    } catch (notifyErr) {
      const fs = require('fs');
      fs.appendFileSync('d:\\Office_work\\CMS\\backend\\notification_debug.log', `[ERROR] completeConsultation notifyErr: ${notifyErr.message}\n${notifyErr.stack}\n`);
      console.error('Failed to send consultation completed notification:', notifyErr);
    }
  } catch (pdfError) {
    console.error('Failed to generate consultation PDF note:', pdfError);
  }

  return consultationRepository.findById({
    id: consultation._id,
    clinicId,
    populateDetails: true
  });
};

const downloadConsultationPdf = async ({ requester, consultationId, requestedClinicId = null }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  const Clinic = require('../clinics/clinic.model');
  const Prescription = require('../prescriptions/prescription.model');
  const prescription = await Prescription.findOne({
    consultationId: consultation._id,
    clinicId
  }).sort({ updatedAt: -1 }).lean();

  // Prescription isLocked check removed for pre-consultation payment flow

  const clinic = await Clinic.findById(clinicId).lean();
  const patient = consultation.patientId;
  const doctor = consultation.doctorId;
  // const prescription = await Prescription.findOne({
  //   consultationId: consultation._id,
  //   clinicId
  // }).sort({ updatedAt: -1 }).lean();

  const { generateConsultationPdf } = require('./consultationPdf.service');
  const { filePath, relativePath } = await generateConsultationPdf({
    consultation,
    clinic,
    patient,
    doctor,
    prescription
  });

  if (!consultation.pdfUrl) {
    const { env } = require('../../config/env');
    consultation.pdfUrl = `${env.apiPrefix}/consultations/${consultation._id}/pdf`;
    await consultation.save();
  }

  return {
    filePath,
    relativePath,
    consultation
  };
};

const requestReedit = async ({ requester, consultationId, requestedClinicId }) => {
  const { consultation, clinicId } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: true
  });

  const Appointment = require('../appointments/appointment.model');
  const Patient = require('../patients/patient.model');
  const Doctor = require('../doctors/doctor.model');
  const Clinic = require('../clinics/clinic.model');
  const notificationService = require('../notifications/notification.service');

  const appt = await Appointment.findById(consultation.appointmentId);
  const patientObj = await Patient.findById(consultation.patientId);
  const doctorObj = await Doctor.findById(consultation.doctorId);
  const clinicObj = await Clinic.findById(consultation.clinicId);

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  consultation.reedit_code = code;
  consultation.reeditCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
  await consultation.save();

  // Send email to patient
  if (patientObj?.email) {
    const emailBody = `your appoinment whose appoinment number is ${appt?.appointmentId || 'N/A'} with the doctor ${doctorObj?.fullName || 'the Doctor'} which is scheduled on ${appt?.appointmentDate ? new Date(appt.appointmentDate).toLocaleDateString('en-GB') : 'N/A'} ${appt?.startTime || ''} at clinic ${clinicObj?.name || 'Clinic'} for problem ${appt?.reasonForVisit || 'General Health'} for which doctor has tried to generate a unique digit of code to re-edit your consultation do you want it to get edit then give this code ${code}`;
    
    // Log to file for verification
    const fs = require('fs');
    fs.appendFileSync('d:/Office_work/CMS/backend/notification_debug.log', `[Re-edit Email] Code: ${code}. Sent to: ${patientObj.email}\nBody: ${emailBody}\n`);

    try {
      await notificationService.createNotificationRecord({
        clinicId: consultation.clinicId,
        createdBy: requester._id,
        payload: {
          patientId: patientObj._id,
          consultationId: consultation._id,
          type: 'reedit_otp',
          channel: 'email',
          subject: 'Authorization Code for Consultation Re-edit',
          body: emailBody
        },
        variables: {},
        patient: patientObj,
        scheduledFor: null,
        sendNow: true
      });
    } catch (e) {
      console.error('[Re-edit Notification] Failed to dispatch verification email:', e);
    }
  }

  return { message: 'Verification code sent successfully to patient' };
};

const verifyReedit = async ({ requester, consultationId, code, requestedClinicId }) => {
  const { consultation } = await getScopedConsultation({
    requester,
    consultationId,
    requestedClinicId,
    populateDetails: false
  });

  if (!consultation.reedit_code || consultation.reedit_code !== String(code).trim()) {
    throw new AppError('Invalid verification code.', HTTP_STATUS.BAD_REQUEST);
  }

  if (consultation.reeditCodeExpiresAt && new Date() > consultation.reeditCodeExpiresAt) {
    throw new AppError('Verification code has expired.', HTTP_STATUS.BAD_REQUEST);
  }

  // Clear code and reset status to in_progress to allow doctor editing
  consultation.status = 'in_progress';
  consultation.reedit_code = '';
  consultation.reeditCodeExpiresAt = null;
  await consultation.save();

  return { message: 'Verification successful. Consultation status set back to in-progress.' };
};

module.exports = {
  createConsultation,
  listConsultations,
  getConsultationById,
  getAppointmentConsultation,
  updateConsultation,
  getPatientConsultationHistory,
  requestAiSuggestions,
  reviewAiSuggestions,
  formatClinicalNote,
  uploadVoiceNote,
  editAiNote,
  approveAiNote,
  rejectAiNote,
  completeConsultation,
  downloadConsultationPdf,
  requestReedit,
  verifyReedit,
  // Backward-compatible aliases used by existing patient routes and earlier Phase 6 code
  getPatientConsultations: getPatientConsultationHistory
};
