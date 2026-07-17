const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const planController = require('./subscriptionPlan.controller');
const promoController = require('./promoCode.controller');
const subAdminController = require('./subscriptionAdmin.controller');

const router = Router();

// ─── Clinic Subscription Management (Clinic Admin only) ──────────────────────
router.get('/current', protect, authorize(ROLES.ADMIN), subAdminController.getCurrentSubscription);
router.post('/upgrade/preview', protect, authorize(ROLES.ADMIN), subAdminController.previewUpgrade);
router.post('/upgrade', protect, authorize(ROLES.ADMIN), subAdminController.upgradeSubscription);
router.post('/auto-recharge', protect, authorize(ROLES.ADMIN), subAdminController.toggleAutoRecharge);
router.get('/billing-history', protect, authorize(ROLES.ADMIN), subAdminController.getBillingHistory);
router.post('/renew', protect, authorize(ROLES.ADMIN), subAdminController.renewSubscription);

// ─── Subscription Plans ───────────────────────────────────────────────────────
// Public
router.get('/plans', planController.getPublicPlans);

// Super Admin only
router.get('/plans/all', protect, authorize(ROLES.SUPER_ADMIN), planController.getAllPlans);
router.post('/plans', protect, authorize(ROLES.SUPER_ADMIN), planController.createPlan);
router.put('/plans/:id', protect, authorize(ROLES.SUPER_ADMIN), planController.updatePlan);
router.post('/plans/:id/duplicate', protect, authorize(ROLES.SUPER_ADMIN), planController.duplicatePlan);
router.post('/plans/:id/archive', protect, authorize(ROLES.SUPER_ADMIN), planController.archivePlan);

// ─── Promo Codes ─────────────────────────────────────────────────────────────
// Public validate
router.post('/promo-codes/validate', promoController.validatePromoCode);

// Super Admin only
router.get('/promo-codes', protect, authorize(ROLES.SUPER_ADMIN), promoController.getAllPromoCodes);
router.post('/promo-codes', protect, authorize(ROLES.SUPER_ADMIN), promoController.createPromoCode);
router.put('/promo-codes/:id', protect, authorize(ROLES.SUPER_ADMIN), promoController.updatePromoCode);
router.delete('/promo-codes/:id', protect, authorize(ROLES.SUPER_ADMIN), promoController.deletePromoCode);

module.exports = router;
