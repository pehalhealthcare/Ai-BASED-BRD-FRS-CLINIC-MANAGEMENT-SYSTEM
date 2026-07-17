const { asyncHandler } = require('../../common/utils/asyncHandler');
const { sendSuccess } = require('../../common/utils/apiResponse');
const discountService = require('./discount.service');

/**
 * POST /appointments/:id/request-discount
 * Receptionist submits a discount or waiver request.
 */
const requestDiscount = asyncHandler(async (req, res) => {
  const result = await discountService.requestDiscount({
    requester: req.user,
    appointmentId: req.params.id,
    payload: req.body
  });
  return sendSuccess(res, 'Discount request submitted. Waiting for approval.', result);
});

/**
 * POST /appointments/:id/decide-discount
 * Doctor or Admin approves or rejects a discount request.
 * Body: { decision: 'approved' | 'rejected', rejectionReason?: string }
 */
const decideDiscount = asyncHandler(async (req, res) => {
  const { decision, rejectionReason, overrideDiscountType, overrideDiscountValue } = req.body;
  const appointment = await discountService.decideDiscount({
    requester: req.user,
    appointmentId: req.params.id,
    decision,
    rejectionReason,
    overrideDiscountType,
    overrideDiscountValue
  });
  return sendSuccess(res, `Discount request ${decision}.`, { appointment });
});

/**
 * POST /appointments/:id/collect-payment
 * Receptionist marks payment as collected for a payment_pending appointment.
 * Body: { paymentMethod: 'cash' | 'upi' | 'card' | ..., transactionId?: string }
 */
const collectPayment = asyncHandler(async (req, res) => {
  const { paymentMethod, transactionId } = req.body;
  const appointment = await discountService.collectPayment({
    requester: req.user,
    appointmentId: req.params.id,
    paymentMethod,
    transactionId
  });
  return sendSuccess(res, 'Payment collected. Appointment confirmed.', { appointment });
});

/**
 * GET /appointments/pending-approvals
 * Returns list of appointments awaiting discount/waiver approval.
 */
const getPendingApprovals = asyncHandler(async (req, res) => {
  const appointments = await discountService.getPendingApprovals({ requester: req.user });
  return sendSuccess(res, 'Pending approvals fetched.', { appointments });
});

module.exports = {
  requestDiscount,
  decideDiscount,
  collectPayment,
  getPendingApprovals
};
