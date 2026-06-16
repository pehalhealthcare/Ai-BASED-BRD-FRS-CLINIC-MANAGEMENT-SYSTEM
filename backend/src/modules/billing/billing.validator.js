const { z } = require('zod');

const { PAYMENT_MODES } = require('../../common/constants/paymentModes');
const { objectIdParamSchema, objectIdSchema } = require('../../common/validators/objectId.validator');
const { BILLING_ITEM_TYPES, DISCOUNT_TYPES, PAYMENT_STATUSES, INVOICE_STATUSES } = require('./billing.constants');

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const invoiceItemSchema = z.object({
  itemType: z.enum(BILLING_ITEM_TYPES),
  name: z.string().trim().min(1, 'name is required'),
  description: z.string().trim().optional(),
  quantity: z.coerce.number().positive('quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'unitPrice must be 0 or greater')
});

const createInvoiceSchema = z.object({
  body: z.object({
    patientId: objectIdSchema,
    appointmentId: objectIdSchema.optional(),
    consultationId: objectIdSchema.optional(),
    dueDate: isoDateSchema.optional(),
    items: z.array(invoiceItemSchema).min(1, 'At least one invoice item is required'),
    discountType: z.enum(DISCOUNT_TYPES).default('none'),
    discountValue: z.coerce.number().min(0).optional(),
    gstRate: z.coerce.number().min(0).max(28).optional(),
    notes: z.string().trim().max(2000).optional(),
    metadata: z.record(z.any()).optional()
  })
});

const updateInvoiceSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z
    .object({
      dueDate: isoDateSchema.nullish(),
      items: z.array(invoiceItemSchema).min(1).optional(),
      discountType: z.enum(DISCOUNT_TYPES).optional(),
      discountValue: z.coerce.number().min(0).optional(),
      gstRate: z.coerce.number().min(0).max(28).optional(),
      notes: z.string().trim().max(2000).optional(),
      invoiceStatus: z.enum(INVOICE_STATUSES).optional(),
      metadata: z.record(z.any()).optional()
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: 'At least one field must be provided for update'
    })
});

const recordPaymentSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    amount: z.coerce.number().positive('amount must be greater than 0'),
    paymentMode: z.enum(PAYMENT_MODES),
    transactionId: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(1000).optional()
  })
});

const recordRefundSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    amount: z.coerce.number().positive('amount must be greater than 0'),
    reason: z.string().trim().min(1, 'Refund reason is required').max(1000)
  })
});

const generateInvoicePdfSchema = z.object({
  params: objectIdParamSchema('id').shape.params
});

const cancelInvoiceSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    reason: z.string().trim().min(1, 'Cancellation reason is required').max(1000)
  })
});

const invoiceIdParamSchema = objectIdParamSchema('id');
const patientIdParamSchema = objectIdParamSchema('patientId');

const listInvoiceQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    patientId: objectIdSchema.optional(),
    status: z.enum(INVOICE_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    fromDate: isoDateSchema.optional(),
    toDate: isoDateSchema.optional(),
    search: z.string().trim().optional()
  })
});

const patientInvoiceHistorySchema = z.object({
  params: patientIdParamSchema.shape.params,
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    invoiceStatus: z.enum(INVOICE_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional()
  })
});

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  recordRefundSchema,
  generateInvoicePdfSchema,
  cancelInvoiceSchema,
  invoiceIdParamSchema,
  patientIdParamSchema,
  listInvoiceQuerySchema,
  patientInvoiceHistorySchema
};
