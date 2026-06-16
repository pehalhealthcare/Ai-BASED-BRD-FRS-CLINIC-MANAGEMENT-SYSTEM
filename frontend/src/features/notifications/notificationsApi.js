import { followUpApi, notificationApi, patientApi } from '../../lib/api';

export const createNotificationTemplate = (payload) => notificationApi.createTemplate(payload);
export const listNotificationTemplates = (params) => notificationApi.listTemplates(params);
export const sendNotification = (payload) => notificationApi.send(payload);
export const sendAppointmentReminder = (payload) => notificationApi.sendAppointmentReminder(payload);
export const listNotificationLogs = (params) => notificationApi.listLogs(params);
export const getNotificationLog = (id) => notificationApi.getLog(id);
export const cancelNotificationLog = (id, payload) => notificationApi.cancelLog(id, payload);
export const dispatchPendingNotifications = (payload) => notificationApi.dispatchPending(payload);
export const createFollowUpTask = (payload) => followUpApi.create(payload);
export const listFollowUpTasks = (params) => followUpApi.list(params);
export const updateFollowUpTaskStatus = (id, payload) => followUpApi.updateStatus(id, payload);
export const getPatientNotificationHistory = (patientId, params) => patientApi.notifications(patientId, params);

export default notificationApi;
