const { Router } = require('express');
const { ROLES } = require('../../../common/constants/roles');
const { protect } = require('../../../common/middlewares/auth.middleware');
const { authorize } = require('../../../common/middlewares/role.middleware');
const { validate } = require('../../../common/middlewares/validate.middleware');

const settlementsController = require('../controllers/settlements.controller');
const {
  markPaidSchema,
  generateSettlementSchema,
  updateDoctorPayoutSettingsSchema,
  updateOrgFinancialSettingsSchema
} = require('../validators/settlements.validator');

const router = Router();

// Settlements endpoints
router.get(
  '/settlements/organization',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  settlementsController.getOrganizationEarnings
);

router.post(
  '/settlements/mark-paid',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(markPaidSchema),
  settlementsController.markPaid
);

router.post(
  '/settlements/generate',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(generateSettlementSchema),
  settlementsController.generate
);

router.get(
  '/settlements/history',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  settlementsController.getSettlementsHistory
);

// Doctor Earnings & Payout Settings
router.get(
  '/doctor/:doctorId/earnings',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  settlementsController.getDoctorEarnings
);

router.get(
  '/doctor/:doctorId/payouts',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  settlementsController.getDoctorPayouts
);

router.put(
  '/doctor/:doctorId/payment-settings',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateDoctorPayoutSettingsSchema),
  settlementsController.updateDoctorPayoutSettings
);

router.get(
  '/doctor/:doctorId/payment-settings',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  settlementsController.getDoctorPayoutSettings
);

// Organization Financial Settings
router.put(
  '/organization/:organizationId/financial-settings',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateOrgFinancialSettingsSchema),
  settlementsController.updateOrgFinancialSettings
);

router.get(
  '/organization/:organizationId/financial-settings',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  settlementsController.getOrgFinancialSettings
);

module.exports = router;
