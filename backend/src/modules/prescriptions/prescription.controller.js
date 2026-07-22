const path = require('path');

const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const prescriptionService = require('./prescription.service');

const createPrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.createPrescription({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Prescription created successfully', { prescription }, 201);
});

const getPrescriptionById = asyncHandler(async (req, res) => {
  const data = await prescriptionService.getPrescriptionById({
    requester: req.user,
    prescriptionId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Prescription retrieved successfully', data);
});

const getPrescriptionsByPatient = asyncHandler(async (req, res) => {
  const data = await prescriptionService.getPrescriptionsByPatient({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient prescriptions retrieved successfully', data);
});

const getPrescriptionsByConsultation = asyncHandler(async (req, res) => {
  const data = await prescriptionService.getPrescriptionsByConsultation({
    requester: req.user,
    consultationId: req.params.consultationId,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Consultation prescriptions retrieved successfully', data);
});

const updatePrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.updatePrescription({
    requester: req.user,
    prescriptionId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Prescription updated successfully', { prescription });
});

const finalizePrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.finalizePrescription({
    requester: req.user,
    prescriptionId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Prescription finalized successfully', { prescription });
});

const cancelPrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.cancelPrescription({
    requester: req.user,
    prescriptionId: req.params.id,
    reason: req.body.reason,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Prescription cancelled successfully', { prescription });
});

const downloadPrescriptionPdf = asyncHandler(async (req, res) => {
  const { filePath } = await prescriptionService.downloadPrescriptionPdf({
    requester: req.user,
    prescriptionId: req.params.id,
    requestedClinicId: req.query.clinicId,
    req
  });

  return res.download(filePath, path.basename(filePath));
});

const downloadMedicines = asyncHandler(async (req, res) => {
  const fileContent = await prescriptionService.downloadMedicinesText({
    requester: req.user,
    prescriptionId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="medicines_${req.params.id}.txt"`);
  return res.send(fileContent);
});

const getPrescriptionsByPhone = asyncHandler(async (req, res) => {
  const data = await prescriptionService.getPrescriptionsByPhone({
    requester: req.user,
    phone: req.params.phone,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Prescriptions retrieved by phone successfully', data);
});

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
  downloadMedicines
};
