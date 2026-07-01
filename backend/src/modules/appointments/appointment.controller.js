const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const appointmentService = require('./appointment.service');

const createAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.createAppointment({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId || req.body.clinicId,
    req
  });

  return sendSuccess(res, 'Appointment booked successfully', { appointment }, 201);
});

const listAppointments = asyncHandler(async (req, res) => {
  const data = await appointmentService.listAppointments({
    requester: req.user,
    query: req.query
  });

  return sendSuccess(res, 'Appointments retrieved successfully', data);
});

const getCalendarAppointments = asyncHandler(async (req, res) => {
  const data = await appointmentService.getCalendarAppointments({
    requester: req.user,
    query: req.query
  });

  return sendSuccess(res, 'Calendar appointments retrieved successfully', data);
});

const getAvailableSlots = asyncHandler(async (req, res) => {
  const data = await appointmentService.getAvailableSlots({
    requester: req.user,
    query: req.query
  });

  return sendSuccess(res, 'Available slots fetched successfully', data);
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById({
    requester: req.user,
    appointmentId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Appointment retrieved successfully', { appointment });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.updateAppointmentStatus({
    requester: req.user,
    appointmentId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Appointment status updated successfully', { appointment });
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.rescheduleAppointment({
    requester: req.user,
    appointmentId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Appointment rescheduled successfully', { appointment });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment({
    requester: req.user,
    appointmentId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Appointment cancelled successfully', { appointment });
});

const getQueueStatus = asyncHandler(async (req, res) => {
  const data = await appointmentService.getQueueStatus({
    requester: req.user,
    doctorId: req.params.doctorId,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Queue status retrieved successfully', data);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.verifyAppointmentPayment({
    requester: req.user,
    appointmentId: req.params.id,
    payload: req.body,
    req
  });

  return sendSuccess(res, 'Appointment payment verified and confirmed successfully', { appointment });
});

const scanCheckin = asyncHandler(async (req, res) => {
  const data = await appointmentService.scanCheckin({
    requester: req.user,
    token: req.body.token,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Check-in processed successfully', data);
});

module.exports = {
  createAppointment,
  listAppointments,
  getCalendarAppointments,
  getAvailableSlots,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  getQueueStatus,
  scanCheckin
};
