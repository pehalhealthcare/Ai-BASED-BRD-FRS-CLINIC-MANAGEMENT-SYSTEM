const { logger } = require('../../common/utils/logger');
const auditRepository = require('./audit.repository');

const createAuditLog = async (payload) => {
  try {
    return await auditRepository.create(payload);
  } catch (error) {
    logger.warn('Audit logging failed.', error instanceof Error ? error.message : error);
    return null;
  }
};

const logAuthEvent = async ({ actorUserId = null, action, status = 'SUCCESS', req, metadata = {} }) =>
  createAuditLog({
    actorUserId,
    action,
    entity: 'Auth',
    metadata,
    ipAddress: req?.ip,
    userAgent: req?.get ? req.get('user-agent') : null,
    status
  });

const listAuditLogs = async (filters) => {
  return auditRepository.listLogs(filters);
};

const getAuditLogById = async (id) => {
  return auditRepository.getById(id);
};

module.exports = {
  createAuditLog,
  logAuthEvent,
  listAuditLogs,
  getAuditLogById
};
