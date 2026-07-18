const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const procedureController = require('./procedure.controller');

const router = Router();

router.get(
  '/',
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
    ROLES.NURSE,
    ROLES.LAB_TECHNICIAN
  ),
  procedureController.getProcedures
);

router.get(
  '/reports',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLINIC_MANAGER),
  procedureController.getProcedureReports
);

router.get(
  '/:id',
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
    ROLES.NURSE,
    ROLES.LAB_TECHNICIAN
  ),
  procedureController.getProcedureById
);

router.post(
  '/pay/:invoiceId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  procedureController.payProcedureInvoice
);

router.post(
  '/:id/start',
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.LAB_TECHNICIAN
  ),
  procedureController.startProcedure
);

router.post(
  '/:id/complete',
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.DOCTOR,
    ROLES.NURSE,
    ROLES.LAB_TECHNICIAN
  ),
  procedureController.completeProcedure
);

router.post(
  '/:id/cancel',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  procedureController.cancelProcedure
);

router.post(
  '/:id/refund-approve',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  procedureController.approveRefund
);

module.exports = router;
