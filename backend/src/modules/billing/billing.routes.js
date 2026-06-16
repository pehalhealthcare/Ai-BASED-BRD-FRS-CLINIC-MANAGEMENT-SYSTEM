const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const billingController = require('./billing.controller');
const {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  recordRefundSchema,
  generateInvoicePdfSchema,
  cancelInvoiceSchema,
  invoiceIdParamSchema,
  patientInvoiceHistorySchema,
  listInvoiceQuerySchema
} = require('./billing.validator');

const router = Router();

router.post(
  '/invoices',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(createInvoiceSchema),
  billingController.createInvoice
);
router.get(
  '/invoices',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(listInvoiceQuerySchema),
  billingController.listInvoices
);
router.get(
  '/summary',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  billingController.getBillingSummary
);
router.get(
  '/patient/:patientId/invoices',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(patientInvoiceHistorySchema),
  billingController.getPatientInvoices
);
router.post(
  '/invoices/:id/payments',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(recordPaymentSchema),
  billingController.recordPayment
);
router.post(
  '/invoices/:id/refund',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(recordRefundSchema),
  billingController.recordRefund
);
router.post(
  '/invoices/:id/razorpay-order',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  validate(invoiceIdParamSchema),
  billingController.createRazorpayOrder
);
router.post(
  '/invoices/:id/razorpay-verify',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  validate(invoiceIdParamSchema),
  billingController.verifyRazorpayPayment
);
router.post(
  '/invoices/:id/generate-pdf',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(generateInvoicePdfSchema),
  billingController.generateInvoicePdf
);
router.get(
  '/invoices/:id/pdf',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(invoiceIdParamSchema),
  billingController.downloadInvoicePdf
);
router.patch(
  '/invoices/:id/cancel',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(cancelInvoiceSchema),
  billingController.cancelInvoice
);
router.get(
  '/invoices/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(invoiceIdParamSchema),
  billingController.getInvoiceById
);
router.put(
  '/invoices/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(updateInvoiceSchema),
  billingController.updateInvoice
);

module.exports = router;
