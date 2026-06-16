const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const notificationService = require('./notification.service');

const createNotificationTemplate = asyncHandler(async (req, res) => {
  const notificationTemplate = await notificationService.createNotificationTemplate({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Notification template created successfully', { notificationTemplate }, 201);
});

const listNotificationTemplates = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotificationTemplates({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Notification templates retrieved successfully', data);
});

const sendNotification = asyncHandler(async (req, res) => {
  const notificationLog = await notificationService.sendNotification({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Notification processed successfully', { notificationLog }, 201);
});

const sendAppointmentReminder = asyncHandler(async (req, res) => {
  const notificationLog = await notificationService.sendAppointmentReminder({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Appointment reminder processed successfully', { notificationLog }, 201);
});

const createFollowUpTask = asyncHandler(async (req, res) => {
  const data = await notificationService.createFollowUpTask({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Follow-up task created successfully', data, 201);
});

const listNotificationLogs = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotificationLogs({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Notification logs retrieved successfully', data);
});

const getNotificationLogById = asyncHandler(async (req, res) => {
  const data = await notificationService.getNotificationLogById({
    requester: req.user,
    notificationLogId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Notification log retrieved successfully', data);
});

const cancelNotificationLog = asyncHandler(async (req, res) => {
  const notificationLog = await notificationService.cancelNotificationLog({
    requester: req.user,
    notificationLogId: req.params.id,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Notification cancelled successfully', { notificationLog });
});

const dispatchPendingNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.dispatchPendingNotifications({
    requester: req.user,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Pending notifications dispatched successfully', data);
});

const getPatientNotificationHistory = asyncHandler(async (req, res) => {
  const data = await notificationService.getPatientNotificationHistory({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient notification history retrieved successfully', data);
});

const listFollowUpTasks = asyncHandler(async (req, res) => {
  const data = await notificationService.listFollowUpTasks({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Follow-up tasks retrieved successfully', data);
});

const updateFollowUpStatus = asyncHandler(async (req, res) => {
  const followUpTask = await notificationService.updateFollowUpStatus({
    requester: req.user,
    followUpTaskId: req.params.id,
    status: req.body.status,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Follow-up task updated successfully', { followUpTask });
});

module.exports = {
  createNotificationTemplate,
  listNotificationTemplates,
  sendNotification,
  sendAppointmentReminder,
  createFollowUpTask,
  listNotificationLogs,
  getNotificationLogById,
  cancelNotificationLog,
  dispatchPendingNotifications,
  getPatientNotificationHistory,
  listFollowUpTasks,
  updateFollowUpStatus
};
