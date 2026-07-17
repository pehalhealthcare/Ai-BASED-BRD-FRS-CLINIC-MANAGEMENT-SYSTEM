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
  receivedAt: z.string().trim().optional(),
  isOpeningStock: z.boolean().optional(),
  supplier: z.string().trim().optional(),
  invoiceNumber: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  branchId: objectIdSchema.optional()
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
    clinicId: objectIdSchema.optional(),
    allClinics: booleanQuerySchema
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

const createPharmacyOrderSchema = z.object({
  body: z.object({
    medicineId: objectIdSchema,
    quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
    prescriptionType: z.enum(['system', 'manual']),
    prescriptionId: objectIdSchema.optional().nullable(),
    prescriptionFile: z.string().optional(),
    clinicId: objectIdSchema.optional(),
    patientId: objectIdSchema.optional()
  })
});

const listPharmacyOrdersQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    patientId: objectIdSchema.optional(),
    status: z.enum(['pending', 'completed', 'cancelled']).optional(),
    clinicId: objectIdSchema.optional()
  })
});

const updatePharmacyOrderStatusSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    status: z.enum(['pending', 'completed', 'cancelled'])
  })
});

const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(150),
    contactPerson: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().max(100).optional(),
    gstNumber: z.string().trim().max(40).optional(),
    address: z.object({
      line1: z.string().trim().optional(),
      line2: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      pincode: z.string().trim().optional(),
      country: z.string().trim().optional()
    }).optional(),
    paymentTerms: z.string().trim().max(100).optional(),
    isActive: z.boolean().optional()
  })
});

const updateSupplierSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    name: z.string().trim().max(150).optional(),
    contactPerson: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().max(100).optional(),
    gstNumber: z.string().trim().max(40).optional(),
    address: z.object({
      line1: z.string().trim().optional(),
      line2: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      pincode: z.string().trim().optional(),
      country: z.string().trim().optional()
    }).optional(),
    paymentTerms: z.string().trim().max(100).optional(),
    isActive: z.boolean().optional()
  }).optional()
});

const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: objectIdSchema,
    branchId: objectIdSchema.optional(),
    remarks: z.string().trim().optional(),
    status: z.enum(['Draft', 'Pending Approval', 'Submitted']).optional(),
    items: z.array(z.object({
      medicineId: objectIdSchema,
      quantity: z.coerce.number().int().positive(),
      unitCost: z.coerce.number().min(0)
    })).min(1, 'At least one medicine is required')
  })
});

const receivePurchaseOrderSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    invoiceNumber: z.string().trim().optional(),
    items: z.array(z.object({
      medicineId: objectIdSchema,
      quantityReceived: z.coerce.number().int().positive(),
      batchNumber: z.string().trim().min(1, 'Batch number is required'),
      manufacturingDate: z.string().trim().optional(),
      expiryDate: z.string().trim(),
      purchasePrice: z.coerce.number().min(0).optional(),
      sellingPrice: z.coerce.number().min(0).optional()
    })).min(1, 'At least one item is required')
  })
});

const adjustStockSchema = z.object({
  body: z.object({
    medicineId: objectIdSchema,
    batchId: objectIdSchema,
    branchId: objectIdSchema.optional(),
    quantity: z.coerce.number(), // positive to add, negative to subtract
    adjustmentType: z.enum(['Adjustment', 'Damage', 'Expired', 'Returned']),
    reason: z.string().trim().optional(),
    notes: z.string().trim().optional()
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
  patientMedicineHistorySchema,
  createPharmacyOrderSchema,
  listPharmacyOrdersQuerySchema,
  updatePharmacyOrderStatusSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
  adjustStockSchema
};

