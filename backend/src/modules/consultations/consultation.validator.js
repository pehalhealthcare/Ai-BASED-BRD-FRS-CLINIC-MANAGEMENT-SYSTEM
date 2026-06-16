const { z } = require('zod');

const { objectIdSchema, objectIdParamSchema } = require('../../common/validators/objectId.validator');

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const futureOrTodayDateSchema = dateStringSchema.refine((value) => {
  const selected = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return selected >= today;
}, 'followUp.date cannot be in the past');

const optionalTrimmedString = (max = 5000) => z.string().trim().max(max).optional();

const symptomObjectSchema = z.object({
  name: z.string().trim().min(1, 'symptom name is required'),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  duration: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional()
});

const symptomSchema = z.union([z.string().trim().min(1), symptomObjectSchema]);

const vitalsSchema = z
  .object({
    temperature: z.coerce.number().min(80).max(115).optional(),
    bloodPressure: z
      .string()
      .trim()
      .regex(/^\d{2,3}\/\d{2,3}$/, 'bloodPressure must be in systolic/diastolic format')
      .optional(),
    pulse: z.coerce.number().min(20).max(250).optional(),
    respiratoryRate: z.coerce.number().min(0).max(120).optional(),
    oxygenSaturation: z.coerce.number().min(0).max(100).optional(),
    spo2: z.coerce.number().min(0).max(100).optional(),
    weight: z.coerce.number().min(0).max(500).optional(),
    height: z.coerce.number().min(0).max(300).optional()
  })
  .partial()
  .optional();

const formattedClinicalNotesSchema = z
  .object({
    subjective: optionalTrimmedString(3000),
    objective: optionalTrimmedString(3000),
    assessment: optionalTrimmedString(3000),
    plan: optionalTrimmedString(3000)
  })
  .partial()
  .optional();

const diagnosisSchema = z
  .object({
    primary: z.string().trim().max(500).optional(),
    secondary: z.array(z.string().trim().min(1)).optional(),
    notes: z.string().trim().max(3000).optional()
  })
  .partial()
  .optional();

const followUpSchema = z
  .object({
    required: z.boolean().optional(),
    date: futureOrTodayDateSchema.optional(),
    notes: z.string().trim().max(2000).optional()
  })
  .partial()
  .optional();

const consultationStatusSchema = z.enum(['draft', 'in_progress', 'completed', 'cancelled']);

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

const createConsultationSchema = z.object({
  body: z.object({
    appointmentId: objectIdSchema,
    patientId: objectIdSchema,
    doctorId: objectIdSchema.optional(),
    chiefComplaint: z.string().trim().min(1, 'chiefComplaint is required').max(500),
    symptoms: z.array(symptomSchema).optional(),
    vitals: vitalsSchema,
    clinicalNotes: optionalTrimmedString(5000),
    diagnosis: diagnosisSchema,
    treatmentPlan: optionalTrimmedString(5000),
    followUp: followUpSchema,
    formattedClinicalNotes: formattedClinicalNotesSchema,
    status: z.enum(['draft', 'in_progress']).optional()
  })
});

const consultationIdParamSchema = objectIdParamSchema('id');
const appointmentIdParamSchema = objectIdParamSchema('appointmentId');
const patientHistoryParamSchema = z.object({
  params: z.object({
    patientId: objectIdSchema
  })
});

const updateConsultationSchema = z.object({
  params: consultationIdParamSchema.shape.params,
  body: z
    .object({
      chiefComplaint: z.string().trim().min(1).max(500).optional(),
      symptoms: z.array(symptomSchema).optional(),
      vitals: vitalsSchema,
      clinicalNotes: optionalTrimmedString(5000),
      formattedClinicalNotes: formattedClinicalNotesSchema,
      diagnosis: diagnosisSchema,
      treatmentPlan: optionalTrimmedString(5000),
      followUp: followUpSchema,
      status: z.enum(['draft', 'in_progress', 'cancelled']).optional()
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: 'At least one field must be provided for update'
    })
});

const listConsultationQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    status: consultationStatusSchema.optional(),
    patientId: objectIdSchema.optional(),
    doctorId: objectIdSchema.optional(),
    appointmentId: objectIdSchema.optional(),
    clinicId: objectIdSchema.optional()
  })
});

const requestAiSuggestionsSchema = z.object({
  params: consultationIdParamSchema.shape.params,
  body: z
    .object({
      includePatientHistory: z.boolean().optional(),
      includeVitals: z.boolean().optional()
    })
    .optional()
    .default({})
});

const reviewAiSuggestionsSchema = z.object({
  params: consultationIdParamSchema.shape.params,
  body: z.object({
    decision: z.enum(['accepted', 'partially_accepted', 'rejected']),
    acceptedSuggestions: z.array(z.string().trim().min(1)).optional(),
    rejectedSuggestions: z.array(z.string().trim().min(1)).optional(),
    doctorComment: z.string().trim().max(3000).optional()
  })
});

const completeConsultationSchema = z.object({
  params: consultationIdParamSchema.shape.params,
  body: z.object({
    diagnosis: z.object({
      primary: z.string().trim().min(1, 'diagnosis.primary is required'),
      secondary: z.array(z.string().trim().min(1)).optional(),
      notes: z.string().trim().max(3000).optional()
    }),
    treatmentPlan: z.string().trim().min(1, 'treatmentPlan is required').max(5000),
    followUp: followUpSchema.optional()
  })
});

const formatClinicalNoteSchema = z.object({
  params: consultationIdParamSchema.shape.params,
  body: z.object({
    rawNote: z.string().trim().min(3, 'rawNote must be at least 3 characters long'),
    format: z.literal('SOAP').optional(),
    save: z.boolean().optional()
  })
});

const aiSoapNoteSchema = z.object({
  note_type: z.literal('SOAP').optional(),
  subjective: z.string().trim().min(1).max(5000),
  objective: z.string().trim().min(1).max(5000),
  assessment: z.string().trim().min(1).max(5000),
  plan: z.string().trim().min(1).max(5000),
  draft_ai_note: z.boolean().optional(),
  missing_information: z.array(z.string().trim().min(1)).optional()
});

const voiceNoteParamSchema = z.object({
  params: consultationIdParamSchema.shape.params
});

const editAiNoteSchema = z.object({
  params: consultationIdParamSchema.shape.params,
  body: z
    .object({
      transcript_text: z.string().trim().min(1).max(10000).optional(),
      ai_soap_note: aiSoapNoteSchema.optional()
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: 'At least one AI note field must be provided'
    })
});

const approveAiNoteSchema = z.object({
  params: consultationIdParamSchema.shape.params,
  body: z
    .object({
      transcript_text: z.string().trim().min(1).max(10000).optional(),
      approved_note: aiSoapNoteSchema.optional()
    })
    .optional()
    .default({})
});

const rejectAiNoteSchema = z.object({
  params: consultationIdParamSchema.shape.params,
  body: z
    .object({
      reason: z.string().trim().max(1000).optional()
    })
    .optional()
    .default({})
});

const patientConsultationHistorySchema = z.object({
  params: patientHistoryParamSchema.shape.params,
  query: paginationQuerySchema.extend({
    clinicId: objectIdSchema.optional()
  })
});

module.exports = {
  createConsultationSchema,
  consultationIdParamSchema,
  appointmentIdParamSchema,
  updateConsultationSchema,
  listConsultationQuerySchema,
  requestAiSuggestionsSchema,
  reviewAiSuggestionsSchema,
  completeConsultationSchema,
  formatClinicalNoteSchema,
  patientConsultationHistorySchema,
  voiceNoteParamSchema,
  editAiNoteSchema,
  approveAiNoteSchema,
  rejectAiNoteSchema
};
