const { z } = require('zod');

const { objectIdParamSchema, objectIdSchema } = require('../../common/validators/objectId.validator');

const futureOrTodayDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').refine((value) => {
  const selected = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return selected >= today;
}, 'followUpDate cannot be in the past');

const prescriptionItemSchema = z.object({
  medicineName: z.string().trim().min(1, 'medicineName is required'),
  genericName: z.string().trim().optional(),
  dosage: z.string().trim().min(1, 'dosage is required'),
  frequency: z.string().trim().min(1, 'frequency is required'),
  duration: z.string().trim().min(1, 'duration is required'),
  route: z.enum(['oral', 'topical', 'injection', 'inhalation', 'other']).optional(),
  timing: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  quantity: z.coerce.number().positive().optional(),
  isSubstituteAllowed: z.boolean().optional(),
  isManualEntry: z.boolean().optional(),
  globalMedicineId: objectIdSchema.nullish(),
  brandName: z.string().trim().optional(),
  strength: z.string().trim().optional(),
  dosageForm: z.string().trim().optional()
});

const aiAssistSchema = z
  .object({
    used: z.boolean().optional(),
    suggestionId: z.string().trim().optional(),
    disclaimer: z.string().trim().optional(),
    doctorReviewed: z.boolean().optional()
  })
  .partial()
  .optional();

const labItemSchema = z.object({
  testName: z.string().trim().min(1, 'testName is required'),
  priority: z.enum(['routine', 'urgent', 'stat']).optional(),
  sampleRequired: z.string().trim().optional(),
  reason: z.string().trim().optional(),
  globalLabTestId: objectIdSchema.nullish(),
  code: z.string().trim().optional()
});

const procedureItemSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  code: z.string().trim().optional(),
  fee: z.coerce.number().min(0).optional(),
  status: z.string().trim().optional()
});

const createPrescriptionSchema = z.object({
  body: z.object({
    patientId: objectIdSchema,
    consultationId: objectIdSchema,
    appointmentId: objectIdSchema.optional(),
    doctorId: objectIdSchema.optional(),
    notes: z.string().trim().max(4000).optional(),
    medicines: z.array(prescriptionItemSchema).optional(),
    labs: z.array(labItemSchema).optional(),
    procedures: z.array(procedureItemSchema).optional(),
    advice: z.string().trim().max(4000).optional(),
    followUpDate: futureOrTodayDateSchema.nullish(),
    aiAssist: aiAssistSchema,
    overrideReason: z.string().trim().max(1000).optional()
  })
});

const updatePrescriptionSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z
    .object({
      notes: z.string().trim().max(4000).optional(),
      medicines: z.array(prescriptionItemSchema).optional(),
      labs: z.array(labItemSchema).optional(),
      procedures: z.array(procedureItemSchema).optional(),
      advice: z.string().trim().max(4000).optional(),
      followUpDate: futureOrTodayDateSchema.nullish(),
      aiAssist: aiAssistSchema,
      overrideReason: z.string().trim().max(1000).optional()
    })
    .passthrough()
    .refine((payload) => Object.keys(payload).length > 0, {
      message: 'At least one field must be provided for update'
    })
});

const finalizePrescriptionSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    followUpDate: futureOrTodayDateSchema.nullish(),
    finalAdvice: z.string().trim().max(4000).optional(),
    overrideReason: z.string().trim().max(1000).optional(),
    doctorConfirmation: z.literal(true, {
      errorMap: () => ({
        message: 'doctorConfirmation must be true to finalize the prescription'
      })
    })
  }).passthrough()
});

const cancelPrescriptionSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    reason: z.string().trim().min(1, 'Cancellation reason is required').max(1000)
  })
});

const prescriptionIdParamSchema = objectIdParamSchema('id');
const patientIdParamSchema = objectIdParamSchema('patientId');
const consultationIdParamSchema = objectIdParamSchema('consultationId');

const listPrescriptionQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    status: z.enum(['draft', 'finalized', 'cancelled']).optional()
  })
});

const patientPrescriptionQuerySchema = z.object({
  params: patientIdParamSchema.shape.params,
  query: listPrescriptionQuerySchema.shape.query
});

module.exports = {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  finalizePrescriptionSchema,
  cancelPrescriptionSchema,
  prescriptionIdParamSchema,
  patientIdParamSchema,
  consultationIdParamSchema,
  listPrescriptionQuerySchema,
  patientPrescriptionQuerySchema
};
