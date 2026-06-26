const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

const createInvoiceSchema = z.object({
  body: z.object({
    patientId: objectIdSchema,
    organizationId: objectIdSchema.optional(),
    clinicId: objectIdSchema,
    doctorId: objectIdSchema.optional(),
    appointmentId: objectIdSchema.optional(),
    items: z.array(
      z.object({
        name: z.string().min(1, 'Item name is required.'),
        quantity: z.number().int().positive().default(1),
        unitPrice: z.number().min(0, 'Unit price cannot be negative.')
      })
    ).min(1, 'Invoice must have at least one item.'),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0),
    policyNumber: z.string().optional()
  })
});

module.exports = { createInvoiceSchema };
