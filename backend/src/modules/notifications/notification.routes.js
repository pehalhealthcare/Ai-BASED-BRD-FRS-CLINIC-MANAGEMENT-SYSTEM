const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const notificationController = require('./notification.controller');
const {
  createNotificationTemplateSchema,
  listNotificationTemplatesQuerySchema,
  sendNotificationSchema,
  sendAppointmentReminderSchema,
  createFollowUpTaskSchema,
  listNotificationLogsQuerySchema,
  notificationLogIdParamSchema,
  cancelNotificationSchema,
  listFollowUpTasksQuerySchema,
  updateFollowUpStatusSchema,
  dispatchPendingNotificationsSchema
} = require('./notification.validator');

const notificationRouter = Router();
const followUpRouter = Router();

notificationRouter.post(
  '/templates',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createNotificationTemplateSchema),
  notificationController.createNotificationTemplate
);
notificationRouter.get(
  '/templates',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(listNotificationTemplatesQuerySchema),
  notificationController.listNotificationTemplates
);
notificationRouter.post(
  '/send',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(sendNotificationSchema),
  notificationController.sendNotification
);
notificationRouter.post(
  '/appointment-reminder',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(sendAppointmentReminderSchema),
  notificationController.sendAppointmentReminder
);
notificationRouter.post(
  '/follow-up',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(createFollowUpTaskSchema),
  notificationController.createFollowUpTask
);
notificationRouter.get(
  '/logs',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(listNotificationLogsQuerySchema),
  notificationController.listNotificationLogs
);
notificationRouter.get(
  '/logs/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(notificationLogIdParamSchema),
  notificationController.getNotificationLogById
);
notificationRouter.patch(
  '/logs/:id/cancel',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(cancelNotificationSchema),
  notificationController.cancelNotificationLog
);
notificationRouter.post(
  '/dispatch-pending',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(dispatchPendingNotificationsSchema),
  notificationController.dispatchPendingNotifications
);

followUpRouter.get(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(listFollowUpTasksQuerySchema),
  notificationController.listFollowUpTasks
);
followUpRouter.patch(
  '/:id/status',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(updateFollowUpStatusSchema),
  notificationController.updateFollowUpStatus
);

module.exports = {
  notificationRouter,
  followUpRouter
};
