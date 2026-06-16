const { z } = require('zod');

const { objectIdParamSchema, objectIdSchema } = require('../../common/validators/objectId.validator');

const booleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());

const optionalTrimmedString = (max = 500) => z.string().trim().max(max).optional();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const futureOrPresentDateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid expiryDate'
  })
  .refine((value) => {
    const inputDate = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return inputDate.getTime() >= today.getTime();
  }, 'expiryDate cannot be in the past');

const batchSchema = z.object({
  batchNumber: z.string().trim().min(1, 'batchNumber is required').max(80),
  quantity: z.coerce.number().int().positive('quantity must be a positive integer'),
  expiryDate: futureOrPresentDateSchema.optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  receivedAt: z.string().trim().optional()
});

const createMedicineSchema = z.object({
  body: z.object({
    code: z.string().trim().max(40).optional(),
    name: z.string().trim().min(1, 'name is required').max(200),
    genericName: optionalTrimmedString(200),
    brandName: optionalTrimmedString(200),
    category: optionalTrimmedString(120),
    form: optionalTrimmedString(120),
    strength: optionalTrimmedString(120),
    manufacturer: optionalTrimmedString(160),
    unitPrice: z.coerce.number().min(0).optional(),
    reorderLevel: z.coerce.number().int().min(0).optional(),
    supplierLeadTimeDays: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    requiresPrescription: z.boolean().optional(),
    batches: z.array(batchSchema).optional().default([]),
    clinicId: objectIdSchema.optional()
  })
});

const updateMedicineSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z
    .object({
      code: z.string().trim().max(40).optional(),
      name: z.string().trim().min(1).max(200).optional(),
      genericName: optionalTrimmedString(200),
      brandName: optionalTrimmedString(200),
      category: optionalTrimmedString(120),
      form: optionalTrimmedString(120),
      strength: optionalTrimmedString(120),
      manufacturer: optionalTrimmedString(160),
      unitPrice: z.coerce.number().min(0).optional(),
      reorderLevel: z.coerce.number().int().min(0).optional(),
      supplierLeadTimeDays: z.coerce.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
      requiresPrescription: z.boolean().optional(),
      batches: z.array(batchSchema).optional()
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: 'At least one field must be provided for update'
    })
});

const addBatchSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: batchSchema
});

const listMedicinesQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    lowStock: booleanQuerySchema,
    nearExpiry: booleanQuerySchema,
    isActive: booleanQuerySchema,
    clinicId: objectIdSchema.optional()
  })
});

const dispenseItemSchema = z.object({
  medicineId: objectIdSchema,
  quantity: z.coerce.number().int().positive('quantity must be a positive integer'),
  instructions: optionalTrimmedString(300)
});

const dispenseSchema = z.object({
  body: z.object({
    prescriptionId: objectIdSchema,
    patientId: objectIdSchema,
    doctorId: objectIdSchema.optional(),
    items: z.array(dispenseItemSchema).min(1, 'At least one medicine item is required'),
    notes: optionalTrimmedString(2000),
    clinicId: objectIdSchema.optional()
  })
});

const listDispensingsQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    patientId: objectIdSchema.optional(),
    prescriptionId: objectIdSchema.optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    status: z.enum(['draft', 'dispensed', 'cancelled']).optional(),
    clinicId: objectIdSchema.optional()
  })
});

const dispensingIdParamSchema = objectIdParamSchema('id');
const medicineIdParamSchema = objectIdParamSchema('id');

const cancelDispensingSchema = z.object({
  params: dispensingIdParamSchema.shape.params,
  body: z
    .object({
      reason: optionalTrimmedString(300)
    })
    .optional()
    .default({})
});

const patientMedicineHistorySchema = z.object({
  params: z.object({
    patientId: objectIdSchema
  }),
  query: paginationQuerySchema.extend({
    clinicId: objectIdSchema.optional()
  })
});

module.exports = {
  createMedicineSchema,
  updateMedicineSchema,
  addBatchSchema,
  listMedicinesQuerySchema,
  dispenseSchema,
  listDispensingsQuerySchema,
  medicineIdParamSchema,
  dispensingIdParamSchema,
  cancelDispensingSchema,
  patientMedicineHistorySchema
};
