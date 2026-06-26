const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

const createOrderSchema = z.object({
  body: z.object({
    invoiceId: z.union([objectIdSchema, z.literal('all')]),
    method: z.enum(['UPI', 'CARD', 'NET_BANKING', 'CASH']).default('UPI'),
    useInsurance: z.boolean().optional()
  })
});

const verifyPaymentSchema = z.object({
  body: z.object({
    gatewayOrderId: z.string().min(1, 'Order ID is required.'),
    gatewayPaymentId: z.string().min(1, 'Payment ID is required.'),
    gatewaySignature: z.string().min(1, 'Signature is required.')
  })
});

const refundPaymentSchema = z.object({
  body: z.object({
    paymentId: z.string().min(1, 'Payment ID is required.'),
    amount: z.number().positive('Refund amount must be positive.')
  })
});

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
  refundPaymentSchema
};
