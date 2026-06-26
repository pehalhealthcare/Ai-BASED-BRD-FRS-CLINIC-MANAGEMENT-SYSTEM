const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const consultationService = require('./consultation.service');

const createConsultation = asyncHandler(async (req, res) => {
  const consultation = await consultationService.createConsultation({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Consultation created successfully', { consultation }, 201);
});

const listConsultations = asyncHandler(async (req, res) => {
  const data = await consultationService.listConsultations({
    requester: req.user,
    query: req.query
  });

  return sendSuccess(res, 'Consultations retrieved successfully', data);
});

const getConsultationById = asyncHandler(async (req, res) => {
  const data = await consultationService.getConsultationById({
    requester: req.user,
    consultationId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Consultation retrieved successfully', data);
});

const getAppointmentConsultation = asyncHandler(async (req, res) => {
  const data = await consultationService.getAppointmentConsultation({
    requester: req.user,
    appointmentId: req.params.appointmentId,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Appointment consultation retrieved successfully', data);
});

const updateConsultation = asyncHandler(async (req, res) => {
  const consultation = await consultationService.updateConsultation({
    requester: req.user,
    consultationId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Consultation updated successfully', { consultation });
});

const getPatientConsultationHistory = asyncHandler(async (req, res) => {
  const data = await consultationService.getPatientConsultationHistory({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient consultation history retrieved successfully', data);
});

const requestAiSuggestions = asyncHandler(async (req, res) => {
  const consultation = await consultationService.requestAiSuggestions({
    requester: req.user,
    consultationId: req.params.id,
    options: req.body || {},
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'AI suggestions generated successfully', { consultation });
});

const reviewAiSuggestions = asyncHandler(async (req, res) => {
  const consultation = await consultationService.reviewAiSuggestions({
    requester: req.user,
    consultationId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'AI suggestion review saved successfully', { consultation });
});

const formatClinicalNote = asyncHandler(async (req, res) => {
  const data = await consultationService.formatClinicalNote({
    requester: req.user,
    consultationId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Clinical note formatted successfully', data);
});

const uploadVoiceNote = asyncHandler(async (req, res) => {
  const consultation = await consultationService.uploadVoiceNote({
    requester: req.user,
    consultationId: req.params.id,
    rawBody: req.body,
    contentType: req.headers['content-type'],
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Voice note processed successfully', { consultation });
});

const editAiNote = asyncHandler(async (req, res) => {
  const consultation = await consultationService.editAiNote({
    requester: req.user,
    consultationId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'AI draft note updated successfully', { consultation });
});

const approveAiNote = asyncHandler(async (req, res) => {
  const consultation = await consultationService.approveAiNote({
    requester: req.user,
    consultationId: req.params.id,
    payload: req.body || {},
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'AI draft note approved successfully', { consultation });
});

const rejectAiNote = asyncHandler(async (req, res) => {
  const consultation = await consultationService.rejectAiNote({
    requester: req.user,
    consultationId: req.params.id,
    payload: req.body || {},
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'AI draft note rejected successfully', { consultation });
});

const completeConsultation = asyncHandler(async (req, res) => {
  const consultation = await consultationService.completeConsultation({
    requester: req.user,
    consultationId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Consultation completed successfully', { consultation });
});

const downloadConsultationPdf = asyncHandler(async (req, res) => {
  const fs = require('fs');
  const { filePath } = await consultationService.downloadConsultationPdf({
    requester: req.user,
    consultationId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="consultation_note.pdf"');
  fs.createReadStream(filePath).pipe(res);
});

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
  // Backward-compatible alias
  getPatientConsultations: getPatientConsultationHistory
};
