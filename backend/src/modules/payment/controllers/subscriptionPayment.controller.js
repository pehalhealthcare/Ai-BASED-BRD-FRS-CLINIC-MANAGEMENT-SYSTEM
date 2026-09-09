const { asyncHandler } = require('../../../common/utils/asyncHandler');
const { sendSuccess } = require('../../../common/utils/apiResponse');
const subscriptionPaymentService = require('../services/subscriptionPayment.service');

/**
 * Clinic Admin submits payment attempt (UTR)
 */
const submitPayment = asyncHandler(async (req, res) => {
  const {
    clinicId,
    planId,
    billingCycle,
    utr,
    transactionId,
    paymentProofUrl,
    metadata
  } = req.body;

  // Use user's clinic ID if not explicitly provided or if restricted
  const targetClinicId = clinicId || req.user?.clinicId || req.user?.clinic?._id;

  const paymentAttempt = await subscriptionPaymentService.submitPaymentAttempt({
    clinicId: targetClinicId,
    planId,
    billingCycle,
    utr,
    transactionId,
    paymentProofUrl,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    metadata
  });

  return sendSuccess(res, 'Payment submitted successfully. Awaiting Super Admin verification.', { payment: paymentAttempt }, 201);
});

/**
 * Super Admin lists all payment submissions
 */
const listPayments = asyncHandler(async (req, res) => {
  const result = await subscriptionPaymentService.listPayments(req.query);
  return sendSuccess(res, 'Payments retrieved successfully', result);
});

/**
 * Super Admin gets single payment details
 */
const getPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await subscriptionPaymentService.getPaymentById(id);
  return sendSuccess(res, 'Payment details retrieved', result);
});

/**
 * Super Admin verifies payment attempt
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body || {};
  const result = await subscriptionPaymentService.verifyPaymentAttempt(id, req.user, { notes });
  return sendSuccess(res, '✓ Payment verified successfully. Clinic subscription updated.', result);
});

/**
 * Super Admin rejects payment attempt with mandatory reason
 */
const rejectPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, notes } = req.body;
  const result = await subscriptionPaymentService.rejectPaymentAttempt(id, req.user, { reason, notes });
  return sendSuccess(res, 'Payment rejected. Clinic placed in Repayment Required status.', result);
});

/**
 * Get payment attempts for a specific clinic (Clinic 360° Payments Tab / Clinic Admin)
 */
const getClinicPaymentHistory = asyncHandler(async (req, res) => {
  const { clinicId } = req.params;
  const targetClinicId = clinicId || req.user?.clinicId || req.user?.clinic?._id;
  const result = await subscriptionPaymentService.getClinicPaymentHistory(targetClinicId);
  return sendSuccess(res, 'Clinic payment history retrieved', result);
});

/**
 * Initiate payment attempt for clinic setup (fetches plan, calculates price, generates dynamic QR)
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { clinicId, planId, billingCycle } = req.body;
  const targetClinicId = clinicId || req.user?.clinicId || req.user?.clinic?._id;

  const result = await subscriptionPaymentService.initiatePaymentAttempt({
    clinicId: targetClinicId,
    planId,
    billingCycle
  });

  return sendSuccess(res, 'Payment attempt initiated successfully', result);
});

module.exports = {
  initiatePayment,
  submitPayment,
  listPayments,
  getPaymentById,
  verifyPayment,
  rejectPayment,
  getClinicPaymentHistory
};
