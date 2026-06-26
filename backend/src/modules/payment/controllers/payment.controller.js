const paymentService = require('../services/payment.service');
const { handleWebhook } = require('../webhooks/webhook');
const { sendSuccess } = require('../../../common/utils/apiResponse');
const { asyncHandler } = require('../../../common/utils/asyncHandler');

const createOrder = asyncHandler(async (req, res) => {
  const orderDetails = await paymentService.createOrder({
    ...req.body,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Gateway payment order created successfully', orderDetails, 201);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.verifyPayment({
    ...req.body,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Payment verified successfully', { payment });
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.paymentId);
  return sendSuccess(res, 'Payment details retrieved', { payment });
});

const getPaymentsByPatient = asyncHandler(async (req, res) => {
  const payments = await paymentService.getPaymentsByPatient(req.params.patientId);
  return sendSuccess(res, 'Payment history retrieved', { payments });
});

const processRefund = asyncHandler(async (req, res) => {
  const payment = await paymentService.processRefund({
    ...req.body,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Payment refund processed successfully', { payment });
});

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentById,
  getPaymentsByPatient,
  processRefund,
  handleWebhook
};
