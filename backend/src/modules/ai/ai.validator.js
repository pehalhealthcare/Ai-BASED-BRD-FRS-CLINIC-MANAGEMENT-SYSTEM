const { z } = require('zod');

const symptomCheckSchema = z.object({
  body: z.object({
    symptoms: z.string().trim().min(3, 'symptoms must be at least 3 characters long'),
    age: z.coerce.number().int().min(0).max(120).optional(),
    gender: z.string().trim().optional(),
    duration: z.string().trim().optional(),
    known_conditions: z.array(z.string().trim().min(1)).optional(),
    language: z.string().trim().optional()
  })
});

const noShowSchema = z.object({
  body: z.object({
    patient_id: z.string().trim().min(1),
    appointment_time: z.string().trim().min(1),
    appointment_date: z.string().trim().optional(),
    weekday: z.string().trim().optional(),
    doctor_id: z.string().trim().optional(),
    department: z.string().trim().optional(),
    booking_source: z.string().trim().optional(),
    previous_visits: z.coerce.number().int().min(0).default(0),
    previous_no_shows: z.coerce.number().int().min(0).default(0),
    previous_cancellations: z.coerce.number().int().min(0).default(0),
    lead_time_hours: z.coerce.number().min(0).optional(),
    reminder_sent: z.boolean().optional(),
    payment_status: z.string().trim().optional(),
    status: z.enum(['attended', 'no_show', 'cancelled']).optional(),
    previous_appointments: z.coerce.number().int().min(0).default(0),
    missed_appointments: z.coerce.number().int().min(0).default(0),
    cancelled_appointments: z.coerce.number().int().min(0).default(0),
    is_first_visit: z.boolean().optional(),
    booking_channel: z.string().trim().optional(),
    confirmation_status: z.string().trim().optional()
  })
});

const clinicalNoteSchema = z.object({
  body: z.object({
    raw_note: z.string().trim().min(3, 'raw_note must be at least 3 characters long'),
    format: z.literal('SOAP')
  })
});

const safetyMedicationSchema = z.object({
  name: z.string().trim().min(1),
  generic_name: z.string().trim().optional(),
  ingredients: z.array(z.string().trim().min(1)).optional(),
  dosage: z.string().trim().optional(),
  frequency: z.string().trim().optional(),
  duration: z.string().trim().optional()
});

const drugSafetyCheckSchema = z.object({
  body: z.object({
    patient: z.object({
      id: z.string().trim().optional(),
      age: z.coerce.number().int().min(0).max(130).optional().nullable(),
      gender: z.string().trim().optional().nullable(),
      allergies: z.array(z.string().trim()).optional().default([]),
      conditions: z.array(z.string().trim()).optional().default([]),
      pregnancy_status: z.string().trim().optional().nullable(),
      kidney_disease: z.boolean().optional(),
      liver_disease: z.boolean().optional()
    }),
    medications: z.array(safetyMedicationSchema).min(1),
    existing_medications: z.array(safetyMedicationSchema).optional().default([])
  })
});

const diagnosisSuggestionsSchema = z.object({
  body: z.object({
    chiefComplaint: z.string().trim().min(1),
    symptoms: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          severity: z.enum(['mild', 'moderate', 'severe']).optional(),
          duration: z.string().trim().optional(),
          notes: z.string().trim().optional()
        })
      )
      .default([]),
    vitals: z.record(z.any()).optional().default({}),
    clinicalNotes: z.string().trim().optional(),
    patientContext: z
      .object({
        age: z.coerce.number().int().min(0).max(120).nullable().optional(),
        gender: z.string().trim().optional().nullable(),
        previousDiagnoses: z.array(z.string().trim()).optional().default([])
      })
      .optional()
      .default({})
  })
});

const consultationFormatNoteSchema = z.object({
  body: z.object({
    rawNote: z.string().trim().min(3, 'rawNote must be at least 3 characters long'),
    format: z.literal('SOAP').optional()
  })
});

const prescriptionAdviceSchema = z.object({
  body: z.object({
    diagnosis: z.string().trim().optional(),
    doctorNotes: z.string().trim().optional(),
    rawAdvice: z.string().trim().min(1, 'rawAdvice is required')
  })
});

const labTestRecommendationSchema = z.object({
  body: z.object({
    symptoms: z.string().trim().optional(),
    diagnosis: z.string().trim().optional(),
    age: z.coerce.number().int().min(0).max(120).optional(),
    patient_id: z.string().trim().optional(),
    consultation_id: z.string().trim().optional()
  })
});

module.exports = {
  symptomCheckSchema,
  noShowSchema,
  clinicalNoteSchema,
  drugSafetyCheckSchema,
  diagnosisSuggestionsSchema,
  consultationFormatNoteSchema,
  prescriptionAdviceSchema,
  labTestRecommendationSchema
};
