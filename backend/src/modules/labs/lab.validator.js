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

const createLabTestSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, 'code is required').max(30),
    name: z.string().trim().min(1, 'name is required').max(200),
    category: z.string().trim().min(1, 'category is required').max(120),
    specimenType: z.string().trim().min(1, 'specimenType is required').max(120),
    unit: optionalTrimmedString(60),
    normalRange: normalRangeSchema,
    price: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
    clinicId: objectIdSchema.optional()
  })
});

const listLabTestQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    isActive: booleanQuerySchema,
    clinicId: objectIdSchema.optional()
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
    consultationId: objectIdSchema,
    patientId: objectIdSchema,
    doctorId: objectIdSchema,
    appointmentId: objectIdSchema.optional(),
    priority: z.enum(['routine', 'urgent']).optional(),
    notes: optionalTrimmedString(2000),
    tests: z.array(labOrderTestSchema).min(1, 'At least one lab test is required'),
    clinicId: objectIdSchema.optional()
  })
});

const listLabOrderQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    patientId: objectIdSchema.optional(),
    doctorId: objectIdSchema.optional(),
    consultationId: objectIdSchema.optional(),
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
  patientLabHistorySchema
};
