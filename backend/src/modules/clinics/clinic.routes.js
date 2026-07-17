const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const clinicController = require('./clinic.controller');
const { createClinicSchema } = require('./clinic.validator');

const router = Router();

// Public routes for onboarding
router.get('/register/plans', clinicController.getPlans);
router.post('/register/submit', clinicController.submitRegistration);
router.post('/register/validate-email', clinicController.validateEmail);
router.post('/register/send-otp', clinicController.sendOtp);
router.post('/register/verify-otp', clinicController.verifyOtp);

// Super admin clinic management & approval routes
router.get(
  '/requests/pending',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.getPendingRequests
);

router.post(
  '/requests/:id/approve',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.approveRequest
);

router.post(
  '/requests/:id/reject',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.rejectRequest
);

router.post(
  '/requests/:id/resubmit',
  protect,
  authorize(ROLES.ADMIN),
  clinicController.resubmitRegistration
);

router.post(
  '/requests/:id/refund',
  protect,
  authorize(ROLES.ADMIN),
  clinicController.requestRefund
);

router.post(
  '/requests/:id/refund/status',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.updateRefundStatus
);

router.get(
  '/dashboard/stats',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.getSuperAdminStats
);

router.post(
  '/super-admin/create',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.superAdminCreateClinic
);

router.post(
  '/:id/suspend',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.suspendClinic
);

router.post(
  '/:id/activate',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.activateClinic
);

router.post(
  '/:id/change-plan',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.changeClinicPlan
);

router.post(
  '/:id/extend',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.extendClinicSubscription
);

router.post(
  '/:id/reset-password',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.resetClinicPassword
);

router.delete(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  clinicController.deleteClinic
);

// Standard clinic routes
router.post(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createClinicSchema),
  clinicController.createClinic
);

router.get(
  '/',
  protect,
  clinicController.listClinics
);

router.get(
  '/:id/details',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  clinicController.getClinicDetails
);

router.put(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  clinicController.updateClinic
);

router.get(
  '/:id/onboarding-flow',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  clinicController.getOnboardingFlow
);

router.post(
  '/:id/trial-features',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  clinicController.activateTrialFeature
);

// Feature access control & upgrade requests routes
const featureAccessController = require('./featureAccess.controller');

router.get(
  '/features/access',
  protect,
  featureAccessController.getFeatureAccess
);

router.post(
  '/features/request-access',
  protect,
  featureAccessController.requestFeatureAccess
);

router.get(
  '/features/requests',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  featureAccessController.getFeatureRequests
);

router.patch(
  '/features/requests/:id/dismiss',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  featureAccessController.dismissFeatureRequest
);

// Billing Settings — Consultation Fee Approval Policy
router.get(
  '/:id/billing-settings',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  clinicController.getBillingSettings
);

router.patch(
  '/:id/billing-settings',
  protect,
  authorize(ROLES.ADMIN),
  clinicController.updateBillingSettings
);

module.exports = router;
