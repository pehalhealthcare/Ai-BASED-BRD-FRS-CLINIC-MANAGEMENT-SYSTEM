const AuditLog = require('./audit.model');

const create = (payload) => AuditLog.create(payload);

const listLogs = async ({ action, entity, actorUserId, status, startDate, endDate, page = 1, limit = 20 }) => {
  const query = {};

  if (action) {
    query.action = action;
  }
  if (entity) {
    query.entity = entity;
  }
  if (actorUserId) {
    query.actorUserId = actorUserId;
  }
  if (status) {
    query.status = status;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  const limitNumber = Math.max(1, parseInt(limit, 10));
  const pageNumber = Math.max(1, parseInt(page, 10));
  const skip = (pageNumber - 1) * limitNumber;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actorUserId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    AuditLog.countDocuments(query)
  ]);

  return {
    logs,
    total,
    page: pageNumber,
    limit: limitNumber,
    totalPages: Math.ceil(total / limitNumber)
  };
};

const getById = (id) =>
  AuditLog.findById(id).populate('actorUserId', 'name email role');

module.exports = { create, listLogs, getById };
