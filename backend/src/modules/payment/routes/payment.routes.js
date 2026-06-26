const { Router } = require('express');
const { ROLES } = require('../../../common/constants/roles');
const { protect } = require('../../../common/middlewares/auth.middleware');
const { authorize } = require('../../../common/middlewares/role.middleware');
const { validate } = require('../../../common/middlewares/validate.middleware');

const paymentController = require('../controllers/payment.controller');
const {
  createOrderSchema,
  verifyPaymentSchema,
  refundPaymentSchema
} = require('../validators/payment.validator');

const router = Router();

/**
 * @swagger
 * /api/v1/payment/create-order:
 *   post:
 *     summary: Create order checkout details for client integration
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/create-order',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  validate(createOrderSchema),
  paymentController.createOrder
);

/**
 * @swagger
 * /api/v1/payment/verify:
 *   post:
 *     summary: Verify payment signature and mark payment successful
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/verify',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

/**
 * @swagger
 * /api/v1/payment/webhook:
 *   post:
 *     summary: Webhook endpoint for Razorpay capture failures and refunds
 *     tags: [Payment]
 */
router.post(
  '/webhook',
  paymentController.handleWebhook
);

/**
 * @swagger
 * /api/v1/payment/{paymentId}:
 *   get:
 *     summary: Fetch single payment record details
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:paymentId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  paymentController.getPaymentById
);

/**
 * @swagger
 * /api/v1/payment/history/{patientId}:
 *   get:
 *     summary: Get patient payment transaction history
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/history/:patientId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  paymentController.getPaymentsByPatient
);

/**
 * @swagger
 * /api/v1/payment/refund:
 *   post:
 *     summary: Process and record a payment refund
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/refund',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(refundPaymentSchema),
  paymentController.processRefund
);

module.exports = router;
