const { z } = require('zod');

const { objectIdParamSchema, objectIdSchema } = require('../../common/validators/objectId.validator');

const listBillingAnomaliesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    clinicId: objectIdSchema.optional(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    reviewStatus: z.enum(['pending', 'reviewed', 'dismissed', 'confirmed']).optional(),
    modelStatus: z.enum(['available', 'fallback', 'insufficient_data', 'unavailable']).optional()
  })
});

const billingAnomalyIdParamSchema = objectIdParamSchema('id');

const reviewBillingAnomalySchema = z.object({
  params: billingAnomalyIdParamSchema.shape.params,
  body: z.object({
    reviewStatus: z.enum(['reviewed', 'dismissed', 'confirmed']),
    reviewNotes: z.string().trim().max(2000).optional()
  })
});

const approveDoctorSchema = z.object({
  params: z.object({
    userId: objectIdSchema
  }),
  body: z.object({
    clinicId: objectIdSchema,
    assignedClinics: z.array(objectIdSchema).optional().default([]),
    specialization: z.string().trim().min(2).max(100),
    qualification: z.string().trim().optional().default(''),
    experienceYears: z.number().int().nonnegative().optional().default(0),
    consultationFee: z.number().nonnegative().optional().default(0),
    availability: z.array(z.object({
      dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
      isAvailable: z.boolean().default(false),
      startTime: z.string().trim().default(''),
      endTime: z.string().trim().default(''),
      slotDurationMinutes: z.number().int().default(30),
      clinicId: objectIdSchema.optional().nullable(),
      consultationMode: z.enum(['offline', 'online']).default('offline').optional()
    })).optional().default([])
  })
});

const approveReceptionistSchema = z.object({
  params: z.object({
    userId: objectIdSchema
  }),
  body: z.object({
    clinicId: objectIdSchema,
    assignedClinics: z.array(objectIdSchema).optional().default([]),
    qualification: z.string().trim().optional().default(''),
    experienceYears: z.number().int().nonnegative().optional().default(0),
    availability: z.array(z.object({
      dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
      isAvailable: z.boolean().default(false),
      startTime: z.string().trim().default(''),
      endTime: z.string().trim().default(''),
      clinicId: objectIdSchema.optional().nullable()
    })).optional().default([])
  })
});

module.exports = {
  listBillingAnomaliesQuerySchema,
  billingAnomalyIdParamSchema,
  reviewBillingAnomalySchema,
  approveDoctorSchema,
  approveReceptionistSchema
};
