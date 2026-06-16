const { Router } = require('express');

const { authorize } = require('../../common/middlewares/role.middleware');
const { protect } = require('../../common/middlewares/auth.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const { ROLES } = require('../../common/constants/roles');
const auditController = require('./audit.controller');
const {
  listAuditLogsQuerySchema,
  auditLogIdParamSchema
} = require('./audit.validator');

const router = Router();

router.get(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(listAuditLogsQuerySchema),
  auditController.listAuditLogs
);

router.get(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(auditLogIdParamSchema),
  auditController.getAuditLogById
);

module.exports = router;
