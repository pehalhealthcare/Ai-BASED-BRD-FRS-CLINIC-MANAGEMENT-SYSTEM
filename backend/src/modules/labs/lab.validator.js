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

const normalRangeSchema = z
  .object({
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
    text: optionalTrimmedString(300)
  })
  .partial()
  .optional();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const localParameterValidatorSchema = z.object({
  name: z.string().trim().min(1, 'Parameter name is required'),
  shortName: z.string().trim().optional(),
  resultType: z.enum(['NUMERIC', 'TEXT', 'QUALITATIVE', 'BOOLEAN', 'ENUM', 'PERCENTAGE', 'RATIO']).optional().default('NUMERIC'),
  unit: z.string().trim().optional(),
  decimalPrecision: z.coerce.number().int().min(0).optional(),
  description: z.string().trim().optional(),
  referenceRanges: z.array(
    z.object({
      gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'ALL']).optional(),
      ageFrom: z.coerce.number().optional().nullable(),
      ageTo: z.coerce.number().optional().nullable(),
      ageUnit: z.enum(['DAYS', 'MONTHS', 'YEARS', '']).optional(),
      lowerOperator: z.enum(['>=', '>', '<', '<=', 'Between']).optional(),
      upperOperator: z.enum(['>=', '>', '<', '<=', 'Between']).optional(),
      lowerValue: z.coerce.number().optional().nullable(),
      upperValue: z.coerce.number().optional().nullable()
    })
  ).optional(),
  allowedValues: z.array(
    z.object({
      value: z.string().min(1),
      isAbnormal: z.boolean().optional()
    })
  ).optional()
});

const createLabTestSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, 'code is required').max(30),
    name: z.string().trim().max(200).optional(),
    category: z.string().trim().max(120).optional(),
    specimenType: z.string().trim().max(120).optional(),
    unit: optionalTrimmedString(60),
    normalRange: normalRangeSchema.optional(),
    price: z.coerce.number().min(0).optional(),
    testPrice: z.coerce.number().min(0).optional(),
    globalLabTestId: objectIdSchema.optional(),
    labTestMasterId: objectIdSchema.optional(),
    laboratoryId: objectIdSchema,
    parameterOverrides: z.array(z.object({
      parameterId: objectIdSchema,
      isAvailable: z.boolean()
    })).optional(),
    localParameters: z.array(localParameterValidatorSchema).optional(),
    doctorPrescriptionRequired: z.boolean().optional(),
    importantInstructions: z.string().trim().optional(),
    collectionLocations: z.array(z.string()).optional(),
    turnaroundTime: z.string().optional(),
    homeCollectionAvailable: z.boolean().optional(),
    sampleCollectionFee: z.coerce.number().min(0).optional(),
    processingMode: z.enum(['IN_HOUSE', 'OUTSOURCED']).optional(),
    outsourcedLabName: z.string().trim().max(200).optional(),
    availableDays: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    clinicId: objectIdSchema.optional()
  })
});

const listLabTestQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    isActive: booleanQuerySchema,
    clinicId: objectIdSchema.optional(),
    providerId: objectIdSchema.optional(),
    laboratoryId: objectIdSchema.optional()
  })
});

const labOrderTestSchema = z
  .object({
    labTestId: objectIdSchema.optional(),
    code: z.string().trim().max(30).optional(),
    name: z.string().trim().max(200).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.labTestId && !value.code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'code is required when labTestId is not provided',
        path: ['code']
      });
    }

    if (!value.labTestId && !value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'name is required when labTestId is not provided',
        path: ['name']
      });
    }
  });

const createLabOrderSchema = z.object({
  body: z.object({
    consultationId: objectIdSchema.optional(),
    patientId: objectIdSchema.optional(),
    doctorId: objectIdSchema.optional(),
    appointmentId: objectIdSchema.optional(),
    laboratoryId: objectIdSchema.optional(),
    priority: z.enum(['routine', 'urgent']).optional(),
    notes: optionalTrimmedString(2000),
    tests: z.array(labOrderTestSchema).min(1, 'At least one lab test is required'),
    clinicId: objectIdSchema.optional(),
    collectionMethod: z.enum(['AT_LAB', 'HOME_COLLECTION']).optional(),
    price: z.number().optional(),
    patientType: z.enum(['REGISTERED', 'WALK_IN']).optional(),
    prescriptionId: objectIdSchema.optional(),
    source: z.enum(['DOCTOR_BOOKED', 'PATIENT_BOOKED', 'PRESCRIPTION', 'WALK_IN', 'LAB_CREATED', 'EXTERNAL_REFERRAL']).optional(),
    documents: z.array(z.string()).optional(),
    nonRegisteredPatientDetails: z.object({
      fullName: z.string(),
      phone: z.string(),
      email: z.string().optional(),
      age: z.string().optional(),
      gender: z.string().optional(),
      address: z.string().optional()
    }).optional()
  })
});

const listLabOrderQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    patientId: objectIdSchema.optional(),
    doctorId: objectIdSchema.optional(),
    consultationId: objectIdSchema.optional(),
    laboratoryId: objectIdSchema.optional(),
    status: z.enum(['ordered', 'sample_collected', 'processing', 'completed', 'cancelled']).optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    clinicId: objectIdSchema.optional()
  })
});

const labOrderIdParamSchema = objectIdParamSchema('id');

const updateLabOrderStatusSchema = z.object({
  params: labOrderIdParamSchema.shape.params,
  body: z.object({
    status: z.enum(['sample_collected', 'processing', 'completed', 'cancelled'])
  })
});

const resultEntrySchema = z.object({
  code: z.string().trim().min(1, 'code is required').max(30),
  name: z.string().trim().min(1, 'name is required').max(200),
  value: z.string().trim().min(1, 'value is required').max(100),
  numericValue: z.coerce.number().optional(),
  unit: optionalTrimmedString(60),
  normalRange: normalRangeSchema,
  interpretationNote: optionalTrimmedString(500)
});

const createLabReportSchema = z.object({
  body: z.object({
    labOrderId: objectIdSchema,
    reportFileName: optionalTrimmedString(255),
    reportUrl: optionalTrimmedString(500),
    resultEntries: z.array(resultEntrySchema).optional().default([]),
    status: z.enum(['draft', 'reviewed']).optional(),
    clinicId: objectIdSchema.optional()
  })
});

const labReportIdParamSchema = objectIdParamSchema('id');

const updateLabReportSchema = z.object({
  params: labReportIdParamSchema.shape.params,
  body: z
    .object({
      reportFileName: optionalTrimmedString(255),
      reportUrl: optionalTrimmedString(500),
      resultEntries: z.array(resultEntrySchema).optional(),
      status: z.enum(['draft', 'reviewed']).optional()
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: 'At least one field must be provided for update'
    })
});

const reviewLabAnalysisSchema = z.object({
  params: labReportIdParamSchema.shape.params,
  body: z.object({
    decision: z.enum(['reviewed', 'accepted', 'rejected']),
    reviewNote: optionalTrimmedString(1000)
  })
});

const finalizeLabReportSchema = z.object({
  params: labReportIdParamSchema.shape.params,
  body: z.object({}).optional().default({})
});

const patientLabHistorySchema = z.object({
  params: z.object({
    patientId: objectIdSchema
  }),
  query: paginationQuerySchema.extend({
    clinicId: objectIdSchema.optional()
  })
});

const updateLabTestSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    code: z.string().trim().max(30).optional(),
    name: z.string().trim().max(200).optional(),
    category: z.string().trim().max(120).optional(),
    specimenType: z.string().trim().max(120).optional(),
    unit: optionalTrimmedString(60),
    normalRange: normalRangeSchema,
    price: z.coerce.number().min(0).optional(),
    testPrice: z.coerce.number().min(0).optional(),
    turnaroundTime: z.string().optional(),
    homeCollectionAvailable: z.boolean().optional(),
    sampleCollectionFee: z.coerce.number().min(0).optional(),
    processingMode: z.enum(['IN_HOUSE', 'OUTSOURCED']).optional(),
    outsourcedLabName: z.string().trim().max(200).optional(),
    isActive: z.boolean().optional(),
    laboratoryId: objectIdSchema.optional(),
    parameterOverrides: z.array(z.object({
      parameterId: objectIdSchema,
      isAvailable: z.boolean()
    })).optional(),
    localParameters: z.array(localParameterValidatorSchema).optional(),
    doctorPrescriptionRequired: z.boolean().optional(),
    importantInstructions: z.string().trim().optional(),
    collectionLocations: z.array(z.string()).optional(),
    clinicId: objectIdSchema.optional()
  }).partial()
});

module.exports = {
  createLabTestSchema,
  listLabTestQuerySchema,
  createLabOrderSchema,
  listLabOrderQuerySchema,
  labOrderIdParamSchema,
  updateLabOrderStatusSchema,
  createLabReportSchema,
  labReportIdParamSchema,
  updateLabReportSchema,
  reviewLabAnalysisSchema,
  finalizeLabReportSchema,
  patientLabHistorySchema,
  updateLabTestSchema
};

const createLabConsumableSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(150),
    category: z.enum([
      'Test Kit',
      'Reagent',
      'Chemical',
      'Collection Tube',
      'Slide',
      'Needle',
      'Syringe',
      'Container',
      'PPE',
      'Other Consumable'
    ]),
    unit: z.string().trim().min(1, 'Unit is required').max(60),
    minimumStock: z.coerce.number().min(0).optional(),
    reorderLevel: z.coerce.number().min(0).optional(),
    maximumStock: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
    branchId: objectIdSchema.optional()
  })
});

const updateLabConsumableSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    name: z.string().trim().max(150).optional(),
    category: z.enum([
      'Test Kit',
      'Reagent',
      'Chemical',
      'Collection Tube',
      'Slide',
      'Needle',
      'Syringe',
      'Container',
      'PPE',
      'Other Consumable'
    ]).optional(),
    unit: z.string().trim().max(60).optional(),
    minimumStock: z.coerce.number().min(0).optional(),
    reorderLevel: z.coerce.number().min(0).optional(),
    maximumStock: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional()
  }).optional()
});

const addConsumableBatchSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    batchNumber: z.string().trim().min(1, 'Batch number is required').max(80),
    supplierId: objectIdSchema.optional().nullable(),
    expiryDate: z.string().trim(),
    quantity: z.coerce.number().int().positive(),
    purchasePrice: z.coerce.number().min(0).optional(),
    sellingPrice: z.coerce.number().min(0).optional(),
    invoiceNumber: z.string().trim().max(80).optional(),
    remarks: z.string().trim().max(250).optional(),
    isOpeningStock: z.boolean().optional()
  })
});

const adjustConsumableStockSchema = z.object({
  body: z.object({
    consumableId: objectIdSchema,
    batchId: objectIdSchema,
    quantity: z.coerce.number(),
    adjustmentType: z.enum(['Adjustment', 'Damage', 'Expired', 'Returned']),
    reason: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
});

module.exports = {
  createLabTestSchema,
  listLabTestQuerySchema,
  createLabOrderSchema,
  listLabOrderQuerySchema,
  labOrderIdParamSchema,
  updateLabOrderStatusSchema,
  createLabReportSchema,
  labReportIdParamSchema,
  updateLabReportSchema,
  reviewLabAnalysisSchema,
  finalizeLabReportSchema,
  patientLabHistorySchema,
  updateLabTestSchema,
  createLabConsumableSchema,
  updateLabConsumableSchema,
  addConsumableBatchSchema,
  adjustConsumableStockSchema
};
