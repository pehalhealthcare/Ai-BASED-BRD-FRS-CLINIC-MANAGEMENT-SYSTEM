const NotificationTemplate = require('./notificationTemplate.model');
const NotificationLog = require('./notificationLog.model');
const FollowUpTask = require('./followUpTask.model');

const populateTemplate = (query) =>
  query.populate('createdBy', 'name email role').populate('updatedBy', 'name email role');

const populateNotificationLog = (query) =>
  query
    .populate('patientId', 'patientId firstName lastName fullName phone email')
    .populate('appointmentId', 'appointmentDate startTime endTime status reasonForVisit doctorId')
    .populate('consultationId', 'chiefComplaint status followUp diagnosis doctorId')
    .populate('prescriptionId', 'prescriptionNumber status finalizedAt dispensingStatus')
    .populate('invoiceId', 'invoiceNumber paymentStatus dueAmount totalAmount invoiceStatus')
    .populate('labOrderId', 'orderNumber status orderedAt')
    .populate('templateId', 'name type channel subject body variables')
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

const populateFollowUpTask = (query) =>
  query
    .populate('patientId', 'patientId firstName lastName fullName phone email')
    .populate('consultationId', 'chiefComplaint status followUp diagnosis')
    .populate('doctorId', 'doctorCode firstName lastName fullName specialization')
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

const createNotificationTemplate = (data) => NotificationTemplate.create(data);

const findNotificationTemplateById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  let query = NotificationTemplate.findOne({ _id: id, clinicId });

  if (populateDetails) {
    query = populateTemplate(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const listNotificationTemplates = async ({
  filter,
  page = 1,
  limit = 10,
  sort = { createdAt: -1 }
}) => {
  const skip = (page - 1) * limit;
  const [templates, total] = await Promise.all([
    populateTemplate(NotificationTemplate.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    NotificationTemplate.countDocuments(filter)
  ]);

  return { templates, total };
};

const findActiveTemplate = ({ clinicId, type, channel = null }) => {
  const filter = {
    clinicId,
    type,
    isActive: true
  };

  if (channel) {
    filter.channel = channel;
  }

  return populateTemplate(NotificationTemplate.findOne(filter).sort({ updatedAt: -1 }));
};

const createNotificationLog = (data) => NotificationLog.create(data);

const findNotificationLogById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  let query = NotificationLog.findOne({ _id: id, clinicId });

  if (populateDetails) {
    query = populateNotificationLog(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const updateNotificationLog = ({ id, clinicId, data, populateDetails = true }) => {
  let query = NotificationLog.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populateNotificationLog(query);
  }

  return query;
};

const listNotificationLogs = async ({
  filter,
  page = 1,
  limit = 10,
  sort = { createdAt: -1 }
}) => {
  const skip = (page - 1) * limit;
  const [notificationLogs, total] = await Promise.all([
    populateNotificationLog(NotificationLog.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    NotificationLog.countDocuments(filter)
  ]);

  return { notificationLogs, total };
};

const findNotificationLogsByPatient = async ({
  clinicId,
  patientId,
  page = 1,
  limit = 10,
  sort = { createdAt: -1 }
}) => {
  const skip = (page - 1) * limit;
  const filter = { clinicId, patientId };
  const [notificationLogs, total] = await Promise.all([
    populateNotificationLog(NotificationLog.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    NotificationLog.countDocuments(filter)
  ]);

  return { notificationLogs, total };
};

const findRecentSentNotification = ({ filter, since }) =>
  NotificationLog.findOne({
    ...filter,
    status: 'sent',
    createdAt: { $gte: since }
  })
    .sort({ createdAt: -1 })
    .lean();

const findExistingNotificationByRelation = ({ filter, statuses = ['pending', 'sent'] }) =>
  NotificationLog.findOne({
    ...filter,
    status: { $in: statuses }
  })
    .sort({ createdAt: -1 })
    .lean();

const findPendingNotificationLogsDue = ({ clinicId, before = new Date(), limit = 50 }) =>
  NotificationLog.find({
    clinicId,
    status: 'pending',
    scheduledFor: { $ne: null, $lte: before }
  })
    .sort({ scheduledFor: 1, createdAt: 1 })
    .limit(limit)
    .lean();

const createFollowUpTask = (data) => FollowUpTask.create(data);

const findFollowUpTaskById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  let query = FollowUpTask.findOne({ _id: id, clinicId });

  if (populateDetails) {
    query = populateFollowUpTask(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const listFollowUpTasks = async ({
  filter,
  page = 1,
  limit = 10,
  sort = { dueDate: 1, createdAt: -1 }
}) => {
  const skip = (page - 1) * limit;
  const [followUpTasks, total] = await Promise.all([
    populateFollowUpTask(FollowUpTask.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    FollowUpTask.countDocuments(filter)
  ]);

  return { followUpTasks, total };
};

const updateFollowUpTask = ({ id, clinicId, data, populateDetails = true }) => {
  let query = FollowUpTask.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populateFollowUpTask(query);
  }

  return query;
};

const findExistingFollowUpTask = ({ clinicId, patientId, consultationId = null, dueDate, title }) => {
  const filter = {
    clinicId,
    patientId,
    dueDate,
    title,
    status: { $ne: 'cancelled' }
  };

  if (consultationId) {
    filter.consultationId = consultationId;
  }

  return FollowUpTask.findOne(filter).lean();
};

module.exports = {
  createNotificationTemplate,
  findNotificationTemplateById,
  listNotificationTemplates,
  findActiveTemplate,
  createNotificationLog,
  findNotificationLogById,
  updateNotificationLog,
  listNotificationLogs,
  findNotificationLogsByPatient,
  findRecentSentNotification,
  findExistingNotificationByRelation,
  findPendingNotificationLogsDue,
  createFollowUpTask,
  findFollowUpTaskById,
  listFollowUpTasks,
  updateFollowUpTask,
  findExistingFollowUpTask
};
