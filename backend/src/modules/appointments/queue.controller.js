const queueService = require('./queue.service');
const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const Doctor = require('../doctors/doctor.model');
const AppError = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');

const checkInPatient = asyncHandler(async (req, res) => {
  const result = await queueService.checkInAppointment({
    appointmentId: req.params.id,
    method: req.body.method,
    isEmergency: req.body.isEmergency,
    requester: req.user
  });
  return sendSuccess(res, 'Patient checked in successfully and token generated.', result);
});

const getDoctorQueue = asyncHandler(async (req, res) => {
  const queue = await queueService.getSortedQueue(req.params.doctorId);
  return sendSuccess(res, 'Queue retrieved successfully.', { queue });
});

const callNext = asyncHandler(async (req, res) => {
  const result = await queueService.callNextPatient(req.params.doctorId);
  return sendSuccess(res, 'Next patient called successfully.', { token: result });
});

const startConsultation = asyncHandler(async (req, res) => {
  const result = await queueService.startTokenConsultation(req.params.tokenId);
  return sendSuccess(res, 'Consultation started successfully.', { token: result });
});

const completeConsultation = asyncHandler(async (req, res) => {
  const result = await queueService.completeTokenConsultation(req.params.tokenId);
  return sendSuccess(res, 'Consultation completed successfully.', { token: result });
});

const skipPatient = asyncHandler(async (req, res) => {
  const result = await queueService.skipToken(req.params.tokenId);
  return sendSuccess(res, 'Patient marked as skipped.', { token: result });
});

const recallPatient = asyncHandler(async (req, res) => {
  const result = await queueService.recallToken(req.params.tokenId, req.body.moveToQueueEnd);
  return sendSuccess(res, 'Patient recalled successfully.', { token: result });
});

const reorderPatient = asyncHandler(async (req, res) => {
  const result = await queueService.reorderQueue({
    tokenId: req.body.tokenId,
    newPosition: req.body.newPosition,
    reason: req.body.reason,
    changedBy: req.user
  });
  return sendSuccess(res, 'Queue position updated successfully.', { token: result });
});

const updateDoctorSettings = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }
  doctor.queueSettings = {
    earlyCheckInMins: req.body.earlyCheckInMins,
    lateGraceMins: req.body.lateGraceMins,
    noShowTimeoutMins: req.body.noShowTimeoutMins,
    tokenFormat: req.body.tokenFormat
  };
  await doctor.save();
  return sendSuccess(res, 'Doctor settings updated successfully.', { doctor });
});

const getDoctorSettings = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }
  return sendSuccess(res, 'Doctor settings fetched successfully.', { queueSettings: doctor.queueSettings });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { tokenId, enteredOtp } = req.body;
  const token = await queueService.verifyPatientOtp(tokenId, enteredOtp);
  return sendSuccess(res, 'Patient OTP verified successfully.', { token });
});

const reassignSkipped = asyncHandler(async (req, res) => {
  const { tokenId } = req.body;
  const token = await queueService.reassignSkippedToken(tokenId);
  return sendSuccess(res, 'New token reassigned successfully.', { token });
});

module.exports = {
  checkInPatient,
  getDoctorQueue,
  callNext,
  startConsultation,
  completeConsultation,
  skipPatient,
  recallPatient,
  reorderPatient,
  updateDoctorSettings,
  getDoctorSettings,
  verifyOtp,
  reassignSkipped
};
