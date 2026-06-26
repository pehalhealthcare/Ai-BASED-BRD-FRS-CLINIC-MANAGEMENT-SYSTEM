const paymentRepository = require('../repositories/payment.repository');
const paymentService = require('../services/payment.service');
const { sendSuccess } = require('../../../common/utils/apiResponse');
const { asyncHandler } = require('../../../common/utils/asyncHandler');
const { createAuditLog } = require('../../audit/audit.service');

const handleWebhook = asyncHandler(async (req, res) => {
  const { event, payload } = req.body;
  
  // Simulate Webhook Signature validation (always valid in development)
  const webhookSignature = req.headers['x-razorpay-signature'];
  if (!webhookSignature && process.env.NODE_ENV === 'production') {
    return res.status(400).json({ success: false, message: 'Invalid signature header' });
  }

  console.log(`Razorpay Webhook Event Received: ${event}`);

  if (event === 'payment.captured') {
    const paymentEntity = payload.payment.entity;
    const gatewayOrderId = paymentEntity.order_id;
    const gatewayPaymentId = paymentEntity.id;

    const payment = await paymentRepository.findPaymentByGatewayOrderId(gatewayOrderId);
    if (payment) {
      await paymentService.verifyPayment({
        gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature: 'webhook_verified',
        req
      });
    }
  } else if (event === 'payment.failed') {
    const paymentEntity = payload.payment.entity;
    const gatewayOrderId = paymentEntity.order_id;
    const payment = await paymentRepository.findPaymentByGatewayOrderId(gatewayOrderId);
    if (payment) {
      await paymentRepository.updatePaymentStatus(payment._id, { status: 'FAILED' });
      
      // Log Audit
      await createAuditLog({
        action: 'PAYMENT_FAILURE',
        entity: 'Payment',
        entityId: payment._id,
        metadata: { paymentId: payment.paymentId, gatewayOrderId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'SUCCESS'
      }).catch(() => null);
    }
  } else if (event === 'refund.processed') {
    const refundEntity = payload.refund.entity;
    const gatewayPaymentId = refundEntity.payment_id;
    const payment = await paymentRepository.findOne({ gatewayPaymentId });
    if (payment) {
      await paymentService.processRefund({
        paymentId: payment.paymentId,
        amount: refundEntity.amount / 100,
        req
      });
    }
  }

  return sendSuccess(res, 'Webhook event processed', { received: true });
});

module.exports = { handleWebhook };
