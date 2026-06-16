const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const doctorService = require('./doctor.service');

const createDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorService.createDoctor({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Doctor created successfully', { doctor }, 201);
});

const listDoctors = asyncHandler(async (req, res) => {
  const data = await doctorService.listDoctors({
    requester: req.user,
    query: req.query
  });

  return sendSuccess(res, 'Doctors retrieved successfully', data);
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorById({
    requester: req.user,
    doctorId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Doctor retrieved successfully', { doctor });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorService.updateDoctor({
    requester: req.user,
    doctorId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Doctor updated successfully', { doctor });
});

const updateDoctorAvailability = asyncHandler(async (req, res) => {
  const doctor = await doctorService.updateDoctorAvailability({
    requester: req.user,
    doctorId: req.params.id,
    availability: req.body.availability,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Doctor availability updated successfully', { doctor });
});

const getDoctorAvailability = asyncHandler(async (req, res) => {
  const data = await doctorService.getDoctorAvailability({
    requester: req.user,
    doctorId: req.params.doctorId,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Doctor availability retrieved successfully', data);
});

const replaceDoctorAvailability = asyncHandler(async (req, res) => {
  const doctor = await doctorService.updateDoctorAvailability({
    requester: req.user,
    doctorId: req.params.doctorId,
    availability: req.body.availability,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Doctor availability updated successfully', { doctor });
});

const addDoctorBlockedSlot = asyncHandler(async (req, res) => {
  const doctor = await doctorService.addDoctorBlockedSlot({
    requester: req.user,
    doctorId: req.params.doctorId,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Doctor slot blocked successfully', { doctor });
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorService.deleteDoctor({
    requester: req.user,
    doctorId: req.params.id,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Doctor deactivated successfully', { doctor });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getMyProfile({
    requester: req.user
  });
  return sendSuccess(res, 'Doctor profile fetched successfully', { doctor });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorService.updateMyProfile({
    requester: req.user,
    payload: req.body
  });
  return sendSuccess(res, 'Doctor profile draft updated successfully', { doctor });
});

const submitMyProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorService.submitMyProfile({
    requester: req.user,
    payload: req.body
  });
  return sendSuccess(res, 'Doctor profile submitted for approval successfully', { doctor });
});

const acceptMySlot = asyncHandler(async (req, res) => {
  const doctor = await doctorService.acceptMySlot({
    requester: req.user
  });
  return sendSuccess(res, 'Doctor clinic slot details accepted successfully', { doctor });
});

module.exports = {
  createDoctor,
  listDoctors,
  getDoctorById,
  updateDoctor,
  getDoctorAvailability,
  updateDoctorAvailability,
  replaceDoctorAvailability,
  addDoctorBlockedSlot,
  deleteDoctor,
  getMyProfile,
  updateMyProfile,
  submitMyProfile,
  acceptMySlot
};
