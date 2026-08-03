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
  mrp: z.coerce.number().min(0).optional(),
  receivedAt: z.string().trim().optional(),
  isOpeningStock: z.boolean().optional(),
  supplier: z.string().trim().optional(),
  supplierId: objectIdSchema.optional(),
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
    clinicId: objectIdSchema.optional(),
    globalMedicineId: objectIdSchema.optional(),
    brandId: objectIdSchema.optional(),
    manufacturerId: objectIdSchema.optional(),
    supplierIds: z.array(objectIdSchema).optional()
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
      batches: z.array(batchSchema).optional(),
      manufacturerId: objectIdSchema.optional(),
      supplierIds: z.array(objectIdSchema).optional()
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
    providerId: objectIdSchema.optional(),
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
    patientId: objectIdSchema.optional(),
    deliveryMethod: z.enum(['Home Delivery', 'Pickup']).optional(),
    deliveryAddress: z.any().optional(),
    pickupLocation: z.string().optional(),
    pickupAddress: z.string().optional(),
    preparationTime: z.string().optional(),
    pickupSlot: z.string().optional(),
    pickupCode: z.string().optional(),
    qrCode: z.string().optional(),
    rejectionReason: z.string().optional()
  })
});

const listPharmacyOrdersQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    patientId: objectIdSchema.optional(),
    status: z.enum([
      'pending',
      'confirmed',
      'preparing',
      'packed',
      'ready_for_pickup',
      'ready_for_delivery',
      'out_for_delivery',
      'completed',
      'cancelled',
      'rejected'
    ]).optional(),
    clinicId: objectIdSchema.optional(),
    providerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID').optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    deliveryMethod: z.enum(['Home Delivery', 'Pickup']).optional()
  })
});

const updatePharmacyOrderStatusSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    status: z.enum([
      'pending',
      'confirmed',
      'preparing',
      'packed',
      'ready_for_pickup',
      'ready_for_delivery',
      'out_for_delivery',
      'completed',
      'cancelled',
      'rejected'
    ]),
    rejectionReason: z.string().optional(),
    preparationTime: z.string().optional(),
    deliveryPartner: z.string().optional()
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
    companyName: z.string().trim().optional(),
    code: z.string().trim().optional(),
    type: z.enum(['manufacturer', 'distributor', 'wholesaler', 'local_vendor', 'importer', 'other']).optional(),
    alternatePhone: z.string().trim().optional(),
    website: z.string().trim().optional(),
    drugLicenseNumber: z.string().trim().optional(),
    pan: z.string().trim().optional(),
    creditDays: z.coerce.number().int().min(0).optional(),
    preferredCurrency: z.string().trim().optional(),
    bankDetails: z.object({
      bankName: z.string().trim().optional(),
      accountHolder: z.string().trim().optional(),
      accountNumber: z.string().trim().optional(),
      ifsc: z.string().trim().optional(),
      upi: z.string().trim().optional()
    }).optional(),
    preferredSupplier: z.boolean().optional(),
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
    createdSource: z.string().trim().optional(),
    createdFrom: z.string().trim().optional()
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
    companyName: z.string().trim().optional(),
    code: z.string().trim().optional(),
    type: z.enum(['manufacturer', 'distributor', 'wholesaler', 'local_vendor', 'importer', 'other']).optional(),
    alternatePhone: z.string().trim().optional(),
    website: z.string().trim().optional(),
    drugLicenseNumber: z.string().trim().optional(),
    pan: z.string().trim().optional(),
    creditDays: z.coerce.number().int().min(0).optional(),
    preferredCurrency: z.string().trim().optional(),
    bankDetails: z.object({
      bankName: z.string().trim().optional(),
      accountHolder: z.string().trim().optional(),
      accountNumber: z.string().trim().optional(),
      ifsc: z.string().trim().optional(),
      upi: z.string().trim().optional()
    }).optional(),
    preferredSupplier: z.boolean().optional(),
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
    createdSource: z.string().trim().optional(),
    createdFrom: z.string().trim().optional()
  }).optional()
});

const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: objectIdSchema,
    branchId: objectIdSchema.optional(),
    remarks: z.string().trim().optional(),
    status: z.enum(['Draft', 'Pending Approval', 'Submitted', 'Supplier Accepted', 'Partially Received', 'Fully Received', 'Completed', 'Cancelled']).optional(),
    expectedDeliveryDate: z.string().trim().optional().nullable(),
    paymentTerms: z.string().trim().optional(),
    billingAddress: z.string().trim().optional(),
    deliveryAddress: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    items: z.array(z.object({
      medicineId: objectIdSchema,
      quantity: z.coerce.number().int().positive(),
      unitCost: z.coerce.number().min(0)
    })).min(1, 'At least one medicine is required')
  })
});

const updatePurchaseOrderStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    status: z.enum(['Draft', 'Pending Approval', 'Submitted', 'Supplier Accepted', 'Partially Received', 'Fully Received', 'Completed', 'Cancelled']),
    notes: z.string().trim().optional()
  })
});

const recordPoPaymentSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    paymentMethod: z.string().trim().default('Cash'),
    transactionReference: z.string().trim().optional().default(''),
    amountPaid: z.coerce.number().positive('Amount paid must be positive')
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

const walkinSaleItemSchema = z.object({
  medicineId: objectIdSchema,
  batchNumber: z.string().trim().min(1, 'batchNumber is required'),
  quantity: z.coerce.number().int().positive('quantity must be a positive integer'),
  unitPrice: z.coerce.number().min(0),
  totalPrice: z.coerce.number().min(0)
});

const walkinSaleSchema = z.object({
  body: z.object({
    patientName: z.string().trim().optional(),
    patientPhone: z.string().trim().optional(),
    items: z.array(walkinSaleItemSchema).min(1, 'At least one medicine item is required'),
    subtotal: z.coerce.number().min(0),
    paymentMethod: z.enum(['cash', 'card', 'upi', 'other']),
    notes: optionalTrimmedString(2000)
  })
});

const createManufacturerSchema = z.object({
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
    companyName: z.string().trim().optional(),
    code: z.string().trim().optional(),
    alternatePhone: z.string().trim().optional(),
    website: z.string().trim().optional(),
    drugLicenseNumber: z.string().trim().optional(),
    pan: z.string().trim().optional(),
    status: z.enum(['Active', 'Blocked']).optional(),
    isPreferred: z.boolean().optional(),
    outstandingAmount: z.coerce.number().optional(),
    leadTimeDays: z.coerce.number().int().min(0).optional(),
    createdSource: z.string().trim().optional(),
    createdFrom: z.string().trim().optional()
  })
});

const updateManufacturerSchema = z.object({
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
    companyName: z.string().trim().optional(),
    code: z.string().trim().optional(),
    alternatePhone: z.string().trim().optional(),
    website: z.string().trim().optional(),
    drugLicenseNumber: z.string().trim().optional(),
    pan: z.string().trim().optional(),
    status: z.enum(['Active', 'Blocked']).optional(),
    isPreferred: z.boolean().optional(),
    outstandingAmount: z.coerce.number().optional(),
    leadTimeDays: z.coerce.number().int().min(0).optional(),
    createdSource: z.string().trim().optional(),
    createdFrom: z.string().trim().optional()
  }).optional()
});

module.exports = {
  walkinSaleSchema,
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
  updatePurchaseOrderStatusSchema,
  recordPoPaymentSchema,
  receivePurchaseOrderSchema,
  adjustStockSchema,
  createManufacturerSchema,
  updateManufacturerSchema
};

