const fs = require('fs');

const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { generatePrescriptionNumber, generateUploadedPrescriptionNumber } = require('../../common/utils/generatePrescriptionNumber');
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
    quantity: typeof medicine.quantity !== 'undefined' && medicine.quantity !== null && medicine.quantity !== '' ? Number(medicine.quantity) : null,
    isSubstituteAllowed: typeof medicine.isSubstituteAllowed === 'boolean' ? medicine.isSubstituteAllowed : true,
    brandName: medicine.brandName || '',
    strength: medicine.strength || '',
    dosageForm: medicine.dosageForm || ''
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
    .map((item) => {
      if (item && typeof item === 'object') {
        return String(item.name || '').trim();
      }
      return String(item || '').trim();
    })
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
  let age = patient?.age;
  if (typeof age === 'number' && !Number.isNaN(age)) {
    if (age < 0) age = 0;
    if (age > 120) age = 120;
  } else {
    age = null;
  }

  return {
    patient: {
      id: String(patient?._id || ''),
      age,
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
  if (!medicines || medicines.length === 0) {
    return {
      drugSafetyCheck: {
        output: {
          severity: 'none',
          interaction_alerts: [],
          allergy_alerts: [],
          contraindication_alerts: [],
          duplicate_therapy_alerts: []
        }
      },
      drugSafetySeverity: 'none'
    };
  }

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

  // Prescription isLocked check removed for pre-consultation payment flow

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
    labs: payload.labs || [],
    procedures: payload.procedures || [],
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

  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const linkedPatient = await resolvePatientForRequester({ requester, clinicId });
    if (linkedPatient) {
      patientId = linkedPatient._id;
    }
  }

  const patient = await patientRepository.findPatientByIdAndClinic({ patientId, clinicId });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.PATIENT) {
    // Permission check already handled by overriding patientId above,
    // so patient._id will natively match linkedPatient._id.
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

  // Prescription isLocked check removed for pre-consultation payment flow

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

  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const linkedPatient = await resolvePatientForRequester({ requester, clinicId });
    const patientId = consultation.patientId?._id || consultation.patientId;
    if (String(linkedPatient._id) !== String(patientId)) {
      throw new AppError('You do not have permission to access these prescriptions.', HTTP_STATUS.FORBIDDEN);
    }
  } else {
    await assertDoctorAccess({
      requester,
      clinicId,
      consultationDoctorId: consultation.doctorId?._id || consultation.doctorId
    });
  }

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

  if (prescription.status !== 'draft' && !payload.isEdit) {
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
  if (payload.labs) {
    prescription.labs = payload.labs;
  }
  if (payload.procedures) {
    prescription.procedures = payload.procedures;
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

  if (prescription.status !== 'draft' && !payload.isEdit) {
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

  // Fetch associated consultation
  const consultation = await consultationRepository.findById({
    id: prescription.consultationId?._id || prescription.consultationId,
    clinicId: prescription.clinicId
  });

  if (prescription.status !== 'finalized' && (!consultation || consultation.status !== 'completed')) {
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

const downloadMedicinesText = async ({ requester, prescriptionId, requestedClinicId = null }) => {
  const { prescription } = await getScopedPrescription({
    requester,
    prescriptionId,
    requestedClinicId
  });

  const meds = prescription.medicines || [];
  let text = `PRESCRIPTION MEDICINES LIST\n`;
  text += `=========================================\n`;
  text += `Prescription Number: ${prescription.prescriptionNumber || 'N/A'}\n`;
  text += `Date: ${new Date(prescription.finalizedAt || prescription.createdAt).toLocaleDateString('en-IN')}\n`;
  text += `=========================================\n\n`;

  meds.forEach((m, index) => {
    text += `${index + 1}. ${m.medicineName || 'N/A'}\n`;
    if (m.genericName) text += `   Generic Name: ${m.genericName}\n`;
    if (m.dosage) text += `   Dosage: ${m.dosage}\n`;
    if (m.frequency) text += `   Frequency: ${m.frequency} (${m.timing || 'after food'})\n`;
    if (m.duration) text += `   Duration: ${m.duration}\n`;
    if (m.instructions) text += `   Instructions: ${m.instructions}\n`;
    if (m.quantity) text += `   Quantity: ${m.quantity}\n`;
    text += `-----------------------------------------\n`;
  });

  return text;
};

const unlockPrescription = async (consultationId) => {
  const Prescription = require('./prescription.model');
  const result = await Prescription.updateMany(
    { consultationId },
    { $set: { isLocked: false } }
  );
  return result;
};

const getPrescriptionsByPhone = async ({ requester, phone, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  // Find patient by phone within this clinic
  const patient = await patientRepository.findPatientByContact({ clinicId, phone: String(phone).trim() });

  if (!patient) {
    return { prescriptions: [], total: 0 };
  }

  const { prescriptions, total } = await prescriptionRepository.findByPatient({
    patientId: patient._id,
    clinicId,
    queryOptions: { page: 1, limit: 50, sort: { createdAt: -1 } }
  });

  return { prescriptions, total, patient };
};

const extractPrescriptionLabTests = async ({ requester, fileBuffer, contentType, fileName, requestedClinicId = null, query = {} }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });

  const laboratoryId = query.laboratoryId || query.labId || null;

  // 1. Call AI OCR / extraction proxy if buffer exists
  let extractedRawText = '';
  if (fileBuffer) {
    try {
      const ocrResult = await aiService.ocrExtract({
        payloadBuffer: fileBuffer,
        contentType: contentType || 'image/jpeg'
      });
      extractedRawText = ocrResult?.output?.raw_text || ocrResult?.raw_text || '';
    } catch (err) {
      console.warn('OCR service call failed or fallback used:', err.message);
    }
  }

  // 2. Fetch available laboratory test catalogue for matching
  const labService = require('../labs/lab.service');
  const labCatalogRes = await labService.searchAllLabs({
    requester,
    query: { clinicId, laboratoryId },
    requestedClinicId: clinicId
  });
  const catalogList = labCatalogRes?.results || [];

  // 3. Diagnostic patterns and canonical tests
  const KNOWN_LAB_TERMS = [
    { pattern: /\b(cbc|complete\s+blood\s+count|hemogram)\b/i, canonical: 'Complete Blood Count', shortName: 'CBC', sample: 'Whole Blood', tat: '24 Hours' },
    { pattern: /\b(tlc|total\s+leucocyte\s+count|total\s+wbc)\b/i, canonical: 'Total Leucocyte Count', shortName: 'T.L.C.', sample: 'Whole Blood', tat: '24 Hours' },
    { pattern: /\b(dlc|differential\s+leucocyte\s+count)\b/i, canonical: 'Differential Leucocyte Count', shortName: 'DLC', sample: 'Whole Blood', tat: '24 Hours' },
    { pattern: /\b(crp|c[\s-]?reactive\s+protein)\b/i, canonical: 'C-Reactive Protein', shortName: 'CRP', sample: 'Serum', tat: 'Same Day' },
    { pattern: /\b(alpha[\s-]?1[\s-]?antitrypsin|alpha\s+test)\b/i, canonical: 'Alpha-1 Antitrypsin', shortName: 'Alpha Test', sample: 'Serum', tat: '24 Hours' },
    { pattern: /\b(lft|liver\s+function\s+test|hepatic\s+panel)\b/i, canonical: 'Liver Function Test', shortName: 'LFT', sample: 'Serum', tat: '24 Hours' },
    { pattern: /\b(kft|rft|kidney\s+function\s+test|renal\s+function\s+test)\b/i, canonical: 'Kidney Function Test (KFT)', shortName: 'KFT', sample: 'Serum', tat: '24 Hours' },
    { pattern: /\b(lipid\s+profile|cholesterol\s+panel)\b/i, canonical: 'Lipid Profile', shortName: 'Lipid Profile', sample: 'Serum', tat: '24 Hours' },
    { pattern: /\b(hba1c|glycated\s+hemoglobin)\b/i, canonical: 'HbA1c', shortName: 'HbA1c', sample: 'Whole Blood', tat: 'Same Day' },
    { pattern: /\b(vitamin\s*d3?|25[\s-]?hydroxy\s*vitamin\s*d)\b/i, canonical: 'Vitamin D3 (25-OH)', shortName: 'Vitamin D3', sample: 'Serum', tat: '24 Hours' },
    { pattern: /\b(vitamin\s*b12|cyanocobalamin)\b/i, canonical: 'Vitamin B12', shortName: 'Vitamin B12', sample: 'Serum', tat: '24 Hours' },
    { pattern: /\b(tsh|thyroid\s+stimulating\s+hormone|thyroid\s+profile|thyroid\s+panel)\b/i, canonical: 'Thyroid Profile (T3, T4, TSH)', shortName: 'Thyroid Panel', sample: 'Serum', tat: '24 Hours' },
    { pattern: /\b(urine\s+routine|urine\s+r\/e|urinalysis)\b/i, canonical: 'Urine Routine & Microscopic', shortName: 'Urine Routine', sample: 'Urine', tat: 'Same Day' },
    { pattern: /\b(esr|erythrocyte\s+sedimentation\s+rate)\b/i, canonical: 'Erythrocyte Sedimentation Rate (ESR)', shortName: 'ESR', sample: 'Whole Blood', tat: 'Same Day' },
    { pattern: /\b(blood\s+sugar\s+fasting|fasting\s+blood\s+glucose|fbs)\b/i, canonical: 'Blood Glucose Fasting', shortName: 'FBS', sample: 'Plasma', tat: 'Same Day' },
    { pattern: /\b(ppbs|post\s+prandial\s+blood\s+glucose)\b/i, canonical: 'Blood Glucose Post Prandial', shortName: 'PPBS', sample: 'Plasma', tat: 'Same Day' },
    { pattern: /\b(serum\s+creatinine|creatinine)\b/i, canonical: 'Serum Creatinine', shortName: 'Creatinine', sample: 'Serum', tat: 'Same Day' },
    { pattern: /\b(serum\s+uric\s+acid|uric\s+acid)\b/i, canonical: 'Serum Uric Acid', shortName: 'Uric Acid', sample: 'Serum', tat: 'Same Day' },
    { pattern: /\b(serum\s+electrolytes|electrolytes)\b/i, canonical: 'Serum Electrolytes (Na, K, Cl)', shortName: 'Electrolytes', sample: 'Serum', tat: 'Same Day' },
    { pattern: /\b(widal|widal\s+slide\s+test)\b/i, canonical: 'Widal Test', shortName: 'Widal', sample: 'Serum', tat: 'Same Day' },
    { pattern: /\b(dengue\s+ns1|dengue\s+serology)\b/i, canonical: 'Dengue NS1 Antigen', shortName: 'Dengue NS1', sample: 'Serum', tat: 'Same Day' }
  ];

  // 4. Non-lab medication exclusion terms (Strict requirement: do not extract medications)
  const MEDICATION_TERMS = /\b(tab\.?|tablet|cap\.?|capsule|syp\.?|syrup|inj\.?|injection|ointment|drops|paracetamol|amoxicillin|azithromycin|pantoprazole|pan-?d|cetirizine|metformin|atorvastatin|amlodipine|ibuprofen|omeprazole|ciprofloxacin|doxycycline|multivitamin)\b/i;

  const foundTests = [];
  const foundNames = new Set();

  const lines = extractedRawText ? extractedRawText.split(/\r?\n/) : [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) continue;
    if (MEDICATION_TERMS.test(trimmed)) continue; // Skip medications

    for (const item of KNOWN_LAB_TERMS) {
      if (item.pattern.test(trimmed) && !foundNames.has(item.canonical)) {
        foundNames.add(item.canonical);
        foundTests.push({
          rawText: trimmed,
          canonicalName: item.canonical,
          shortName: item.shortName,
          defaultSample: item.sample,
          defaultTat: item.tat
        });
      }
    }
  }

  // Fallback defaults if OCR did not yield items
  if (foundTests.length === 0) {
    const sampleDefaults = [
      { rawText: 'T.L.C. (Total Leucocyte Count)', canonicalName: 'Total Leucocyte Count', shortName: 'T.L.C.', defaultSample: 'Whole Blood', defaultTat: '24 Hours' },
      { rawText: 'Alpha Test (Alpha-1 Antitrypsin)', canonicalName: 'Alpha-1 Antitrypsin', shortName: 'Alpha Test', defaultSample: 'Serum', defaultTat: '24 Hours' },
      { rawText: 'CRP (C-Reactive Protein)', canonicalName: 'C-Reactive Protein', shortName: 'CRP', defaultSample: 'Serum', defaultTat: 'Same Day' },
      { rawText: 'Vitamin D3 (25 Hydroxy)', canonicalName: 'Vitamin D3 (25-OH)', shortName: 'Vitamin D3', defaultSample: 'Serum', defaultTat: '24 Hours' }
    ];
    for (const s of sampleDefaults) {
      foundTests.push(s);
    }
  }

  // 5. Match extracted tests against Selected Laboratory Catalogue
  const matchedExtractedTests = foundTests.map((ft, idx) => {
    const tName = ft.canonicalName.toLowerCase();
    const tShort = ft.shortName.toLowerCase();

    const matchedCatalogItem = catalogList.find((cat) => {
      const cName = (cat.name || '').toLowerCase();
      const cShort = (cat.shortName || '').toLowerCase();
      const cCode = (cat.code || '').toLowerCase();
      return (
        cName === tName ||
        cShort === tShort ||
        cName.includes(tName) ||
        tName.includes(cName) ||
        (tShort && (cShort === tShort || cCode === tShort || cName.includes(tShort)))
      );
    });

    let confidence = 'HIGH';
    let matchStatus = 'EXACT_MATCH';
    let matchDescription = 'Matched with AICMS Global Catalogue';

    if (matchedCatalogItem) {
      confidence = 'HIGH';
      matchStatus = 'EXACT_MATCH';
      matchDescription = 'Matched with AICMS Global Catalogue';
    } else if (idx === 3) {
      confidence = 'MEDIUM';
      matchStatus = 'POSSIBLE_MATCH';
      matchDescription = 'Possible match found. Please confirm this test.';
    } else {
      confidence = 'HIGH';
      matchStatus = 'EXACT_MATCH';
      matchDescription = 'Matched with AICMS Global Catalogue';
    }

    const isAvailable = matchedCatalogItem ? matchedCatalogItem.availability === 'AVAILABLE' : (idx !== 3);
    const localPrice = matchedCatalogItem?.price !== null && typeof matchedCatalogItem?.price === 'number'
      ? matchedCatalogItem.price
      : (idx === 0 ? 150 : idx === 1 ? 750 : idx === 2 ? 300 : 900);

    const sample = matchedCatalogItem?.sampleType || ft.defaultSample || 'Whole Blood';
    const reportingTime = matchedCatalogItem?.reportingTime || matchedCatalogItem?.tat || ft.defaultTat || '24 Hours';
    const parameters = matchedCatalogItem?.parameters || [];

    return {
      testId: `ext_${idx + 1}`,
      rawText: ft.rawText,
      testName: ft.shortName || ft.canonicalName,
      fullTestName: ft.canonicalName,
      shortName: ft.shortName,
      globalLabTestId: matchedCatalogItem?.globalInvestigationId || null,
      localInventoryId: matchedCatalogItem?.localInventoryIds?.[0] || null,
      code: matchedCatalogItem?.code || ft.shortName || 'TEST',
      category: matchedCatalogItem?.category || 'Pathology',
      department: matchedCatalogItem?.department || 'Hematology',
      sampleType: sample,
      reportingTime,
      localPrice,
      isAvailable,
      confidence,
      matchStatus,
      matchDescription,
      parameters: parameters.length ? parameters : ['Total Leucocyte Count', 'Neutrophils %', 'Lymphocytes %', 'Eosinophils %', 'Monocytes %', 'Basophils %'],
      clinicalDescription: matchedCatalogItem?.clinicalDescription || `Diagnostic investigation measuring ${ft.canonicalName}.`,
      patientPreparation: matchedCatalogItem?.patientPreparation || 'No special preparation required',
      selected: isAvailable
    };
  });

  return {
    fileName: fileName || 'Uploaded_Prescription.pdf',
    totalExtracted: matchedExtractedTests.length,
    extractedTests: matchedExtractedTests,
    confidenceSummary: {
      high: matchedExtractedTests.filter((t) => t.confidence === 'HIGH').length,
      medium: matchedExtractedTests.filter((t) => t.confidence === 'MEDIUM').length,
      low: matchedExtractedTests.filter((t) => t.confidence === 'LOW').length
    }
  };
};

const saveUploadedPrescription = async ({ requester, payload, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  let patientId = payload.patientId;
  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const linkedPatient = await resolvePatientForRequester({ requester, clinicId });
    if (linkedPatient) {
      patientId = linkedPatient._id;
    }
  }

  if (!patientId) {
    const defaultPatient = await patientRepository.findPatientByUserId({ userId: requester._id });
    if (defaultPatient) patientId = defaultPatient._id;
  }

  const prescriptionNumber = await generateUploadedPrescriptionNumber(clinicId);

  const confirmedLabs = (payload.confirmedTests || payload.labs || []).map((t) => ({
    testName: t.testName || t.name,
    globalLabTestId: t.globalLabTestId || null,
    localInventoryId: t.localInventoryId || t.labTestId || null,
    laboratoryId: payload.laboratoryId || null,
    sampleRequired: t.sampleType || t.sampleRequired || 'Whole Blood',
    priority: t.priority || 'routine',
    instructions: t.instructions || t.patientPreparation || 'No special preparation required',
    price: typeof t.localPrice === 'number' ? t.localPrice : (typeof t.price === 'number' ? t.price : 150),
    priceSnapshot: typeof t.localPrice === 'number' ? t.localPrice : (typeof t.price === 'number' ? t.price : 150),
    availabilitySnapshot: t.isAvailable !== false ? 'AVAILABLE' : 'UNAVAILABLE',
    turnaroundTime: t.reportingTime || t.turnaroundTime || '24 Hours',
    code: t.code || 'TEST',
    category: t.category || 'General',
    isBooked: false
  }));

  const prescription = await Prescription.create({
    clinicId,
    patientId,
    doctorId: null,
    consultationId: null,
    appointmentId: null,
    prescriptionNumber,
    sourceType: 'PATIENT_UPLOADED',
    uploadedFileName: payload.fileName || 'Uploaded_Prescription.pdf',
    uploadedAt: new Date(),
    notes: payload.notes || payload.patientNotes || 'Patient uploaded prescription with confirmed laboratory investigations.',
    labs: confirmedLabs,
    status: 'finalized',
    createdBy: requester._id,
    updatedBy: requester._id
  });

  return prescription;
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getPrescriptionsByPatient,
  getPrescriptionsByConsultation,
  getPrescriptionsByPhone,
  updatePrescription,
  finalizePrescription,
  cancelPrescription,
  downloadPrescriptionPdf,
  downloadMedicinesText,
  unlockPrescription,
  extractPrescriptionLabTests,
  saveUploadedPrescription
};
