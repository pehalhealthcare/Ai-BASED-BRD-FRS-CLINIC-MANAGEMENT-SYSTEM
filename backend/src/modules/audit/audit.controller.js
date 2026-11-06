const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const auditService = require('./audit.service');

const resolveUserClinicId = (req) => {
  if (req.user?.role === ROLES.SUPER_ADMIN) {
    return req.query.clinicId || null;
  }
  return req.headers['x-clinic-id'] || req.user?.clinicId || req.query.clinicId || null;
};

const listAuditLogs = asyncHandler(async (req, res) => {
  const clinicId = resolveUserClinicId(req);
  const result = await auditService.listAuditLogs({
    ...req.query,
    clinicId
  });
  return sendSuccess(res, 'Audit logs retrieved successfully', result);
});

const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await auditService.getAuditLogById(req.params.id);
  if (!log) {
    throw new AppError('Audit log not found', HTTP_STATUS.NOT_FOUND);
  }
  return sendSuccess(res, 'Audit log retrieved successfully', { log });
});

const exportAuditLogs = asyncHandler(async (req, res) => {
  const clinicId = resolveUserClinicId(req);
  const logs = await auditService.exportAuditLogs({
    ...req.query,
    clinicId
  });

  const format = req.query.format || 'csv';

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=activity_logs_${Date.now()}.json`);
    return res.send(JSON.stringify(logs, null, 2));
  }

  // Generate CSV format
  const headers = ['Date & Time', 'User Name', 'User Role', 'User Email', 'Action', 'Module', 'Details', 'IP Address'];
  const rows = logs.map(l => [
    `"${new Date(l.createdAt || l.date).toLocaleString('en-US')}"`,
    `"${(l.user?.name || '').replace(/"/g, '""')}"`,
    `"${(l.user?.role || '').replace(/"/g, '""')}"`,
    `"${(l.user?.email || '').replace(/"/g, '""')}"`,
    `"${(l.action || '').replace(/"/g, '""')}"`,
    `"${(l.module || '').replace(/"/g, '""')}"`,
    `"${(l.details || '').replace(/"/g, '""')}"`,
    `"${(l.ipAddress || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=activity_logs_${Date.now()}.csv`);
  return res.send(csvContent);
});

module.exports = {
  listAuditLogs,
  getAuditLogById,
  exportAuditLogs
};
