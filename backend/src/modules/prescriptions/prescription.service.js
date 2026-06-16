const fs = require('fs');

const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { generatePrescriptionNumber } = require('../../common/utils/generatePrescriptionNumber');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const { env } = require('../../config/env');
const aiService = require('../ai/ai.service');
const { createAuditLog } = require('../audit/audit.service');
const appointmentRepository = require('../appointments/appointment.repository');
const Clinic = require('../clinics/clinic.model');
const consultationRepository = require('../consultations/consultation.repository');
const Consultation = require('../consultations/consultation.model');
const doctorRepository = require('../doctors/doctor.repository');
const patientRepository = require('../patients/patient.repository');
const prescriptionRepository = require('./prescription.repository');
const { generatePrescriptionPdf } = require('./prescriptionPdf.service');

const DEFAULT_AI_DISCLAIMER = 'AI formatted this text only. Doctor approval is mandatory.';

const normalizeDateInput = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(`${value}T00:00:00.000Z`);
};

const normalizeMedicines = (medicines = []) =>
  (medicines || []).map((medicine) => ({
    medicineName: medicine.medicineName.trim(),
    genericName: medicine.genericName?.trim?.() || '',
    dosage: medicine.dosage.trim(),
    frequency: medicine.frequency.trim(),
    duration: medicine.duration.trim(),
    route: medicine.route || 'oral',
    timing: medicine.timing?.trim?.() || '',
    instructions: medicine.instructions?.trim?.() || '',
    quantity: typeof medicine.quantity !== 'undefined' ? Number(medicine.quantity) : null,
    isSubstituteAllowed: Boolean(medicine.isSubstituteAllowed)
  }));

const symptomsToSnapshot = (symptoms = []) =>
  (symptoms || [])
    .map((symptom) => {
      if (typeof symptom === 'string') {
        return symptom.trim();
      }

      return symptom?.name?.trim?.() || '';
    })
    .filter(Boolean)
    .join(', ');

const normalizeAiAssist = (value = {}) => ({
  used: Boolean(value?.used),
  suggestionId: value?.suggestionId?.trim?.() || '',
  disclaimer: value?.disclaimer?.trim?.() || DEFAULT_AI_DISCLAIMER,
  doctorReviewed: Boolean(value?.doctorReviewed)
});

const extractConditionFlags = (conditions = []) => {
  const normalized = (conditions || []).map((item) => String(item || '').trim().toLowerCase());
  return {
    kidney_disease: normalized.some((item) => ['kidney disease', 'kidney_disease', 'ckd', 'renal disease'].includes(item)),
    liver_disease: normalized.some((item) => ['liver disease', 'liver_disease', 'hepatic disease'].includes(item))
  };
};

const deriveMedicationIngredients = (medicine = {}) => {
  const raw = medicine.genericName || medicine.medicineName || '';
  return raw
    .split(/[+/,&]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const buildDrugSafetyMedication = (medicine = {}) => ({
  name: medicine.medicineName || medicine.name || '',
  generic_name: medicine.genericName || medicine.generic_name || medicine.medicineName || medicine.name || '',
  ingredients: medicine.ingredients?.length ? medicine.ingredients : deriveMedicationIngredients(medicine),
  dosage: medicine.dosage || '',
  frequency: medicine.frequency || '',
  duration: medicine.duration || ''
});

const buildExistingDrugSafetyMedications = (patient) =>
  (patient?.currentMedications || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => ({
      name: item,
      generic_name: item,
      ingredients: item
        .split(/[+/,&]/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    }));

const buildDrugSafetyPayload = ({ patient, medicines }) => {
  const conditionFlags = extractConditionFlags(patient?.chronicConditions || []);

  return {
    patient: {
      id: String(patient?._id || ''),
      age: patient?.age ?? null,
      gender: patient?.gender || null,
      allergies: patient?.allergies || [],
      conditions: patient?.chronicConditions || [],
      pregnancy_status: null,
      kidney_disease: conditionFlags.kidney_disease,
      liver_disease: conditionFlags.liver_disease
    },
    medications: (medicines || []).map(buildDrugSafetyMedication),
    existing_medications: buildExistingDrugSafetyMedications(patient)
  };
};

const normalizeDrugSafetyResult = (response) => response?.data || response;

const summarizeDrugSafetyForAudit = (drugSafetyCheck) => ({
  severity: drugSafetyCheck?.output?.severity || 'unknown',
  interactionCount: drugSafetyCheck?.output?.interaction_alerts?.length || 0,
  allergyCount: drugSafetyCheck?.output?.allergy_alerts?.length || 0,
  contraindicationCount: drugSafetyCheck?.output?.contraindication_alerts?.length || 0,
  duplicateTherapyCount: drugSafetyCheck?.output?.duplicate_therapy_alerts?.length || 0,
  auditId: drugSafetyCheck?.audit_id || ''
});

const ensureHighSeverityOverride = ({ requester, drugSafetyCheck, overrideReason, prescriptionId = null }) => {
  const severity = drugSafetyCheck?.output?.severity || 'none';

  if (!['high', 'critical'].includes(severity)) {
    return;
  }

  if (!overrideReason?.trim()) {
    throw new AppError('Potential safety alert. Doctor review required.', HTTP_STATUS.CONFLICT, [
      {
        code: 'DRUG_SAFETY_OVERRIDE_REQUIRED',
        prescriptionId: prescriptionId ? String(prescriptionId) : null,
        drugSafetyCheck
      }
    ]);
  }

  if (requester.role !== ROLES.DOCTOR) {
    throw new AppError('Only a doctor can override a high-severity drug safety alert.', HTTP_STATUS.FORBIDDEN);
  }
};

const evaluateDrugSafety = async ({ requester, patient, medicines, req, prescriptionId = null }) => {
  const payload = buildDrugSafetyPayload({ patient, medicines });
  const response = await aiService.checkDrugSafety(payload);
  const drugSafetyCheck = normalizeDrugSafetyResult(response);

  if (prescriptionId) {
    await createAuditLog({
      actorUserId: requester._id,
      action: 'PRESCRIPTION_DRUG_SAFETY_CHECK',
      entity: 'Prescription',
      entityId: prescriptionId,
      metadata: summarizeDrugSafetyForAudit(drugSafetyCheck),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });
  }

  return {
    drugSafetyCheck,
    drugSafetySeverity: drugSafetyCheck?.output?.severity || 'unknown'
  };
};

const buildPrescriptionPdfUrl = (prescriptionId) => `${env.apiPrefix}/prescriptions/${prescriptionId}/download`;

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

const assertDoctorAccess = async ({ requester, clinicId, consultationDoctorId }) => {
  if (requester.role !== ROLES.DOCTOR) {
    return null;
  }

  const doctorProfile = await getRequesterDoctorProfile({ requester, clinicId });

  if (String(doctorProfile._id) !== String(consultationDoctorId)) {
    throw new AppError('You can only prescribe for your own consultations.', HTTP_STATUS.FORBIDDEN);
  }

  return doctorProfile;
};

const getScopedPrescription = async ({ requester, prescriptionId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const prescription = await prescriptionRepository.findPrescriptionById({
    id: prescriptionId,
    clinicId,
    populateDetails: true
  });

  if (!prescription) {
    throw new AppError('Prescription not found.', HTTP_STATUS.NOT_FOUND);
  }

  await assertDoctorAccess({
    requester,
    clinicId,
    consultationDoctorId: prescription.doctorId?._id || prescription.doctorId
  });

  return { prescription, clinicId };
};

const ensurePrescriptionPdf = async (prescriptionDocument) => {
  const clinic = await Clinic.findById(prescriptionDocument.clinicId).lean();
  const patient = prescriptionDocument.patientId?.fullName
    ? prescriptionDocument.patientId
    : await patientRepository.findPatientByIdAndClinic({
        patientId: prescriptionDocument.patientId,
        clinicId: prescriptionDocument.clinicId
      });
  const doctor = prescriptionDocument.doctorId?.fullName
    ? prescriptionDocument.doctorId
    : await doctorRepository.findDoctorByIdAndClinic({
        doctorId: prescriptionDocument.doctorId,
        clinicId: prescriptionDocument.clinicId
      });

  const { filePath } = await generatePrescriptionPdf({
    prescription: prescriptionDocument,
    clinic,
    patient,
    doctor
  });

  if (!prescriptionDocument.pdfUrl) {
    prescriptionDocument.pdfUrl = buildPrescriptionPdfUrl(prescriptionDocument._id);
    await prescriptionDocument.save();
  }

  return filePath;
};

const createPrescription = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  const consultation = await consultationRepository.findById({
    id: payload.consultationId,
    clinicId,
    populateDetails: true
  });

  if (!consultation) {
    throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
  }

  const patient = await patientRepository.findPatientByIdAndClinic({
    patientId: payload.patientId,
    clinicId
  });

  if (!patient || !patient.isActive) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (String(consultation.patientId?._id || consultation.patientId) !== String(patient._id)) {
    throw new AppError('Consultation does not belong to the selected patient.', HTTP_STATUS.BAD_REQUEST);
  }

  await assertDoctorAccess({
    requester,
    clinicId,
    consultationDoctorId: consultation.doctorId?._id || consultation.doctorId
  });

  const doctorId = consultation.doctorId?._id || consultation.doctorId;

  if (payload.doctorId && String(payload.doctorId) !== String(doctorId)) {
    throw new AppError('Prescription doctor must match the consultation doctor.', HTTP_STATUS.BAD_REQUEST);
  }

  const doctor = await doctorRepository.findDoctorByIdAndClinic({ doctorId, clinicId });

  if (!doctor || !doctor.isActive) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  const appointmentId = payload.appointmentId || consultation.appointmentId?._id || consultation.appointmentId || null;

  if (appointmentId) {
    const appointment = await appointmentRepository.findAppointmentByIdAndClinic({
      appointmentId,
      clinicId,
      populateDetails: false
    });

    if (!appointment) {
      throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
    }
  }

  const normalizedMedicines = normalizeMedicines(payload.medicines);
  const { drugSafetyCheck, drugSafetySeverity } = await evaluateDrugSafety({
    requester,
    patient,
    medicines: normalizedMedicines,
    req
  });

  const prescription = await prescriptionRepository.createPrescription({
    clinicId,
    patientId: patient._id,
    doctorId: doctor._id,
    consultationId: consultation._id,
    appointmentId,
    prescriptionNumber: await generatePrescriptionNumber(clinicId),
    diagnosisSnapshot: consultation.diagnosis?.primary || consultation.diagnosis?.notes || '',
    symptomsSnapshot: symptomsToSnapshot(consultation.symptoms || []),
    notes: payload.notes?.trim?.() || consultation.clinicalNotes || '',
    medicines: normalizedMedicines,
    advice: payload.advice?.trim?.() || consultation.treatmentPlan || '',
    drugSafetyCheck,
    drugSafetySeverity,
    followUpDate: normalizeDateInput(payload.followUpDate),
    status: 'draft',
    createdBy: requester._id,
    updatedBy: requester._id,
    aiAssist: payload.aiAssist ? normalizeAiAssist(payload.aiAssist) : undefined
  });

  await Consultation.findOneAndUpdate(
    { _id: consultation._id, clinicId },
    { prescriptionCreated: true, updatedBy: requester._id },
    { new: true }
  );

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PRESCRIPTION_CREATED',
    entity: 'Prescription',
    entityId: prescription._id,
    metadata: {
      prescriptionNumber: prescription.prescriptionNumber,
      patientId: String(patient._id),
      consultationId: String(consultation._id),
      drugSafetySeverity
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PRESCRIPTION_DRUG_SAFETY_CHECK',
    entity: 'Prescription',
    entityId: prescription._id,
    metadata: summarizeDrugSafetyForAudit(drugSafetyCheck),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  const finalizedPrescription = await prescriptionRepository.findPrescriptionById({
    id: prescription._id,
    clinicId,
    populateDetails: true
  });

  try {
    const { sendPrescriptionReadyNotification } = require('../notifications/notification.service');

    await sendPrescriptionReadyNotification({
      prescription: finalizedPrescription,
      actorUserId: requester._id
    });
  } catch (_error) {
    // Notification delivery is best-effort and must not block prescription finalization.
  }

  return finalizedPrescription;
};

const getPrescriptionById = async ({ requester, prescriptionId, requestedClinicId = null }) => {
  const { prescription } = await getScopedPrescription({
    requester,
    prescriptionId,
    requestedClinicId
  });

  return { prescription };
};

const getPrescriptionsByPatient = async ({ requester, patientId, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const patient = await patientRepository.findPatientByIdAndClinic({ patientId, clinicId });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const linkedPatient = await resolvePatientForRequester({ requester, clinicId });

    if (String(linkedPatient._id) !== String(patient._id)) {
      throw new AppError('You do not have permission to access these prescriptions.', HTTP_STATUS.FORBIDDEN);
    }
  }

  const { page, limit } = getPagination(query);
  const { prescriptions, total } = await prescriptionRepository.findByPatient({
    patientId,
    clinicId,
    queryOptions: {
      page,
      limit,
      status: query.status
    }
  });

  return {
    patient,
    prescriptions,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getPrescriptionsByConsultation = async ({ requester, consultationId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  const consultation = await consultationRepository.findById({
    id: consultationId,
    clinicId,
    populateDetails: true
  });

  if (!consultation) {
    throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
  }

  await assertDoctorAccess({
    requester,
    clinicId,
    consultationDoctorId: consultation.doctorId?._id || consultation.doctorId
  });

  const prescriptions = await prescriptionRepository.findByConsultation({
    consultationId,
    clinicId,
    populateDetails: true
  });

  return {
    consultation,
    prescriptions
  };
};

const updatePrescription = async ({ requester, prescriptionId, payload, requestedClinicId = null, req }) => {
  const { prescription, clinicId } = await getScopedPrescription({
    requester,
    prescriptionId,
    requestedClinicId
  });

  if (prescription.status !== 'draft') {
    throw new AppError('Only draft prescriptions can be updated.', HTTP_STATUS.BAD_REQUEST);
  }

  const patient = await patientRepository.findPatientByIdAndClinic({
    patientId: prescription.patientId?._id || prescription.patientId,
    clinicId
  });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  prescription.notes = typeof payload.notes === 'string' ? payload.notes.trim() : prescription.notes;
  prescription.advice = typeof payload.advice === 'string' ? payload.advice.trim() : prescription.advice;
  if (typeof payload.followUpDate !== 'undefined') {
    prescription.followUpDate = payload.followUpDate ? normalizeDateInput(payload.followUpDate) : null;
  }
  if (payload.medicines) {
    prescription.medicines = normalizeMedicines(payload.medicines);
  }
  if (payload.aiAssist) {
    prescription.aiAssist = normalizeAiAssist(payload.aiAssist);
  }
  const { drugSafetyCheck, drugSafetySeverity } = await evaluateDrugSafety({
    requester,
    patient,
    medicines: prescription.medicines,
    req,
    prescriptionId: prescription._id
  });
  prescription.drugSafetyCheck = drugSafetyCheck;
  prescription.drugSafetySeverity = drugSafetySeverity;
  prescription.updatedBy = requester._id;
  await prescription.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PRESCRIPTION_UPDATED',
    entity: 'Prescription',
    entityId: prescription._id,
    metadata: {
      prescriptionNumber: prescription.prescriptionNumber,
      drugSafetySeverity
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return prescriptionRepository.findPrescriptionById({
    id: prescription._id,
    clinicId,
    populateDetails: true
  });
};

const finalizePrescription = async ({ requester, prescriptionId, payload, requestedClinicId = null, req }) => {
  const { prescription, clinicId } = await getScopedPrescription({
    requester,
    prescriptionId,
    requestedClinicId
  });

  if (prescription.status !== 'draft') {
    throw new AppError('Only draft prescriptions can be finalized.', HTTP_STATUS.BAD_REQUEST);
  }

  if (!prescription.medicines?.length) {
    throw new AppError('At least one medicine is required before finalizing.', HTTP_STATUS.BAD_REQUEST);
  }

  const patient = await patientRepository.findPatientByIdAndClinic({
    patientId: prescription.patientId?._id || prescription.patientId,
    clinicId
  });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (payload.followUpDate) {
    prescription.followUpDate = normalizeDateInput(payload.followUpDate);
  }

  if (typeof payload.finalAdvice === 'string') {
    prescription.advice = payload.finalAdvice.trim();
  }

  const { drugSafetyCheck, drugSafetySeverity } = await evaluateDrugSafety({
    requester,
    patient,
    medicines: prescription.medicines,
    req,
    prescriptionId: prescription._id
  });
  ensureHighSeverityOverride({
    requester,
    drugSafetyCheck,
    overrideReason: payload.overrideReason,
    prescriptionId: prescription._id
  });

  prescription.status = 'finalized';
  prescription.finalizedAt = new Date();
  prescription.updatedBy = requester._id;
  prescription.pdfUrl = buildPrescriptionPdfUrl(prescription._id);
  prescription.drugSafetyCheck = drugSafetyCheck;
  prescription.drugSafetySeverity = drugSafetySeverity;
  prescription.doctorOverride = {
    used: Boolean(payload.overrideReason?.trim()),
    reason: payload.overrideReason?.trim?.() || ''
  };
  prescription.overrideReason = payload.overrideReason?.trim?.() || '';
  prescription.overrideBy = payload.overrideReason?.trim() ? requester._id : null;
  prescription.overrideAt = payload.overrideReason?.trim() ? new Date() : null;
  await prescription.save();

  await ensurePrescriptionPdf(prescription);

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PRESCRIPTION_FINALIZED',
    entity: 'Prescription',
    entityId: prescription._id,
    metadata: {
      prescriptionNumber: prescription.prescriptionNumber,
      drugSafetySeverity
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  if (payload.overrideReason?.trim()) {
    await createAuditLog({
      actorUserId: requester._id,
      action: 'PRESCRIPTION_DRUG_SAFETY_OVERRIDE',
      entity: 'Prescription',
      entityId: prescription._id,
      metadata: {
        prescriptionNumber: prescription.prescriptionNumber,
        overrideReason: payload.overrideReason.trim(),
        drugSafetySeverity
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });
  }

  return prescriptionRepository.findPrescriptionById({
    id: prescription._id,
    clinicId,
    populateDetails: true
  });
};

const cancelPrescription = async ({ requester, prescriptionId, reason, requestedClinicId = null, req }) => {
  const { prescription, clinicId } = await getScopedPrescription({
    requester,
    prescriptionId,
    requestedClinicId
  });

  if (prescription.status === 'cancelled') {
    throw new AppError('Prescription is already cancelled.', HTTP_STATUS.BAD_REQUEST);
  }

  const updatedPrescription = await prescriptionRepository.cancelPrescription({
    id: prescription._id,
    clinicId,
    reason: reason.trim(),
    updatedBy: requester._id,
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PRESCRIPTION_CANCELLED',
    entity: 'Prescription',
    entityId: prescription._id,
    metadata: {
      prescriptionNumber: prescription.prescriptionNumber,
      reason: reason.trim()
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return updatedPrescription;
};

const downloadPrescriptionPdf = async ({ requester, prescriptionId, requestedClinicId = null, req }) => {
  const { prescription } = await getScopedPrescription({
    requester,
    prescriptionId,
    requestedClinicId
  });

  if (prescription.status !== 'finalized') {
    throw new AppError('Only finalized prescriptions can be downloaded.', HTTP_STATUS.BAD_REQUEST);
  }

  const filePath = await ensurePrescriptionPdf(prescription);

  if (!fs.existsSync(filePath)) {
    throw new AppError('Prescription PDF could not be generated.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PRESCRIPTION_PDF_DOWNLOADED',
    entity: 'Prescription',
    entityId: prescription._id,
    metadata: {
      prescriptionNumber: prescription.prescriptionNumber
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return {
    prescription,
    filePath
  };
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getPrescriptionsByPatient,
  getPrescriptionsByConsultation,
  updatePrescription,
  finalizePrescription,
  cancelPrescription,
  downloadPrescriptionPdf
};
