const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const patientService = require('./patient.service');
const consultationService = require('../consultations/consultation.service');
const labService = require('../labs/lab.service');
const pharmacyService = require('../pharmacy/pharmacy.service');
const notificationService = require('../notifications/notification.service');

const createPatient = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Patient created successfully', { patient }, 201);
});

const listPatients = asyncHandler(async (req, res) => {
  const data = await patientService.listPatients({
    requester: req.user,
    query: req.query
  });

  return sendSuccess(res, 'Patients retrieved successfully', data);
});

const getPatientById = asyncHandler(async (req, res) => {
  const data = await patientService.getPatientById({
    requester: req.user,
    patientId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient retrieved successfully', data);
});

const getMyPatientProfile = asyncHandler(async (req, res) => {
  const data = await patientService.getMyPatientProfile({
    requester: req.user,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient profile retrieved successfully', data);
});

const updatePatient = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient({
    requester: req.user,
    patientId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Patient updated successfully', { patient });
});

const deletePatient = asyncHandler(async (req, res) => {
  const patient = await patientService.deletePatient({
    requester: req.user,
    patientId: req.params.id,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Patient deactivated successfully', { patient });
});

const getPatientHistory = asyncHandler(async (req, res) => {
  const data = await patientService.getPatientHistory({
    requester: req.user,
    patientId: req.params.id || req.params.patientId,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient history retrieved successfully', data);
});

const getPatientConsultations = asyncHandler(async (req, res) => {
  const data = await consultationService.getPatientConsultations({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient consultations retrieved successfully', data);
});

const getPatientLabs = asyncHandler(async (req, res) => {
  const data = await labService.getPatientLabHistory({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient lab history retrieved successfully', data);
});

const getPatientMedicines = asyncHandler(async (req, res) => {
  const data = await pharmacyService.getPatientMedicineHistory({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient medicine history retrieved successfully', data);
});

const getPatientNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.getPatientNotificationHistory({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient notification history retrieved successfully', data);
});

const updateMyPatientProfile = asyncHandler(async (req, res) => {
  const patient = await patientService.updateMyPatientProfile({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Patient profile updated successfully', { patient });
});

const uploadPatientDocument = asyncHandler(async (req, res) => {
  const document = await patientService.uploadPatientDocument({
    requester: req.user,
    patientId: req.params.patientId,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Document uploaded successfully', { document }, 201);
});

const listPatientDocuments = asyncHandler(async (req, res) => {
  const documents = await patientService.listPatientDocuments({
    requester: req.user,
    patientId: req.params.patientId,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Documents retrieved successfully', { documents });
});

const downloadPatientDocument = asyncHandler(async (req, res) => {
  const data = await patientService.downloadPatientDocument({
    requester: req.user,
    patientId: req.params.patientId,
    documentId: req.params.documentId,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Document downloaded successfully', data);
});

const deletePatientDocument = asyncHandler(async (req, res) => {
  const result = await patientService.deletePatientDocument({
    requester: req.user,
    patientId: req.params.patientId,
    documentId: req.params.documentId,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Document deleted successfully', result);
});

const verifyHistoryPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const result = await patientService.verifyHistoryPassword({
    requester: req.user,
    password,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Medical history password verified successfully', { verified: true });
});

module.exports = {
  createPatient,
  listPatients,
  getMyPatientProfile,
  updateMyPatientProfile,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientHistory,
  getPatientConsultations,
  getPatientLabs,
  getPatientMedicines,
  getPatientNotifications,
  uploadPatientDocument,
  listPatientDocuments,
  downloadPatientDocument,
  deletePatientDocument,
  verifyHistoryPassword
};
