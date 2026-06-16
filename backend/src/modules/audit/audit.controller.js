const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const auditService = require('./audit.service');

const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.listAuditLogs(req.query);
  return sendSuccess(res, 'Audit logs retrieved successfully', result);
});

const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await auditService.getAuditLogById(req.params.id);
  if (!log) {
    throw new AppError('Audit log not found', HTTP_STATUS.NOT_FOUND);
  }
  return sendSuccess(res, 'Audit log retrieved successfully', { log });
});

module.exports = {
  listAuditLogs,
  getAuditLogById
};
