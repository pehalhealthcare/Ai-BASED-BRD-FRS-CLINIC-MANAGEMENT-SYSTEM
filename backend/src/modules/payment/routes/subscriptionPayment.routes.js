const express = require('express');
const router = express.Router();
const { protect } = require('../../../common/middlewares/auth.middleware');
const { authorize } = require('../../../common/middlewares/role.middleware');
const { ROLES } = require('../../../common/constants/roles');
const subscriptionPaymentController = require('../controllers/subscriptionPayment.controller');

// Initiate payment attempt (Clinic Admin, Super Admin, or Onboarding)
router.post(
  ['/subscription/initiate', '/payment/subscription/initiate'],
  protect,
  subscriptionPaymentController.initiatePayment
);

// Submit payment attempt (Clinic Admin, Super Admin, or Onboarding)
router.post(
  ['/subscription/submit', '/payment/subscription/submit'],
  protect,
  subscriptionPaymentController.submitPayment
);

// Get payment attempts for a specific clinic (Clinic 360° Payments Tab & Clinic Admin)
router.get(
  ['/subscription/history/:clinicId', '/payment/subscription/history/:clinicId'],
  protect,
  subscriptionPaymentController.getClinicPaymentHistory
);

// Super Admin: List all payments with filtering and search
router.get(
  '/admin/payments',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  subscriptionPaymentController.listPayments
);

// Super Admin: Get single payment
router.get(
  '/admin/payments/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  subscriptionPaymentController.getPaymentById
);

// Super Admin: Verify payment
router.post(
  '/admin/payments/:id/verify',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  subscriptionPaymentController.verifyPayment
);

// Super Admin: Reject payment
router.post(
  '/admin/payments/:id/reject',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  subscriptionPaymentController.rejectPayment
);

module.exports = router;
