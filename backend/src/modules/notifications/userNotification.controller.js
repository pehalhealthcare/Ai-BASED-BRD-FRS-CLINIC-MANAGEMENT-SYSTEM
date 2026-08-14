const UserNotification = require('./userNotification.model');
const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { AppError } = require('../../common/utils/AppError');

// Emit socket updates to a clinic room
const emitSocketUpdate = (clinicId, event, payload) => {
  if (global.io) {
    global.io.to(String(clinicId)).emit(event, payload);
  }
};

// Seed realistic demo notifications if count is 0
const seedDemoNotificationsIfNeeded = async (clinicId) => {
  const count = await UserNotification.countDocuments({ clinicId });
  if (count > 0) return;

  const demoItems = [
    {
      clinicId,
      title: 'New Appointment',
      message: 'by Ram',
      type: 'appointment',
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 mins ago
    },
    {
      clinicId,
      title: 'Invoice Paid',
      message: 'for Invoice #1234',
      type: 'billing',
      isRead: false,
      createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 mins ago
    },
    {
      clinicId,
      title: 'Actionable',
      message: 'Update System Settings - requires approval.',
      type: 'alert',
      isRead: false,
      actionable: true,
      actionLabel: 'Go to Task',
      actionTask: '/clinic/settings',
      createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 mins ago
    },
    {
      clinicId,
      title: 'Patient Record Update',
      message: 'Update - new labs',
      type: 'lab',
      isRead: true,
      createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 mins ago
    },
    {
      clinicId,
      title: 'Medicine Stock Low',
      message: 'Paracetamol stock falls below threshold (50 remaining)',
      type: 'inventory',
      isRead: true,
      createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    }
  ];

  await UserNotification.insertMany(demoItems);
};

const listUserNotifications = asyncHandler(async (req, res) => {
  const clinicId = req.user?.clinicId || req.user?.clinic?._id || req.query.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic context required', HTTP_STATUS.BAD_REQUEST);
  }

  await seedDemoNotificationsIfNeeded(clinicId);

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const items = await UserNotification.find({ clinicId, isArchived: false })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await UserNotification.countDocuments({ clinicId, isArchived: false });
  const hasMore = skip + items.length < total;

  return sendSuccess(res, 'Notifications retrieved successfully', {
    items,
    total,
    page,
    limit,
    hasMore
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const clinicId = req.user?.clinicId || req.user?.clinic?._id || req.query.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic context required', HTTP_STATUS.BAD_REQUEST);
  }

  const count = await UserNotification.countDocuments({ clinicId, isRead: false, isArchived: false });
  return sendSuccess(res, 'Unread count retrieved successfully', { count });
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinicId = req.user?.clinicId || req.user?.clinic?._id;

  const notification = await UserNotification.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND);
  }

  const unreadCount = await UserNotification.countDocuments({ clinicId: notification.clinicId, isRead: false, isArchived: false });
  
  emitSocketUpdate(notification.clinicId, 'notification:read', { id, isRead: true });
  emitSocketUpdate(notification.clinicId, 'notification:count', unreadCount);

  return sendSuccess(res, 'Notification marked as read', { notification });
});

const archiveNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await UserNotification.findByIdAndUpdate(
    id,
    { isArchived: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND);
  }

  const unreadCount = await UserNotification.countDocuments({ clinicId: notification.clinicId, isRead: false, isArchived: false });

  emitSocketUpdate(notification.clinicId, 'notification:update', notification);
  emitSocketUpdate(notification.clinicId, 'notification:count', unreadCount);

  return sendSuccess(res, 'Notification archived successfully', { notification });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await UserNotification.findByIdAndDelete(id);

  if (!notification) {
    throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND);
  }

  const unreadCount = await UserNotification.countDocuments({ clinicId: notification.clinicId, isRead: false, isArchived: false });

  emitSocketUpdate(notification.clinicId, 'notification:delete', id);
  emitSocketUpdate(notification.clinicId, 'notification:count', unreadCount);

  return sendSuccess(res, 'Notification deleted successfully');
});

const clearAllNotifications = asyncHandler(async (req, res) => {
  const clinicId = req.user?.clinicId || req.user?.clinic?._id;
  if (!clinicId) {
    throw new AppError('Clinic context required', HTTP_STATUS.BAD_REQUEST);
  }

  await UserNotification.deleteMany({ clinicId });
  emitSocketUpdate(clinicId, 'notification:count', 0);

  return sendSuccess(res, 'All notifications deleted successfully');
});

module.exports = {
  listUserNotifications,
  getUnreadCount,
  markAsRead,
  archiveNotification,
  deleteNotification,
  clearAllNotifications
};
