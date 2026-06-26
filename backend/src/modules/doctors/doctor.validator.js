const { z } = require('zod');

const { objectIdParamSchema, objectIdSchema } = require('../../common/validators/objectId.validator');
const { normalizeDayOfWeek } = require('../../common/utils/slotUtils');

const genderSchema = z.enum(['male', 'female', 'other']);
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const dayOfWeekSchema = z.preprocess((value) => normalizeDayOfWeek(value), z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));

const booleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10,15}$/, 'Phone number must be between 10 and 15 digits');

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format');

const availabilityItemSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    isAvailable: z.boolean().default(false),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    slotDurationMinutes: z.coerce
      .number()
      .int()
      .refine((value) => [15, 30, 45, 60].includes(value), 'Slot duration must be one of 15, 30, 45, or 60')
      .default(30),
    clinicId: objectIdSchema.optional().nullable(),
    consultationMode: z.enum(['offline', 'online']).default('offline').optional()
  })
  .superRefine((value, context) => {
    if (value.isAvailable && (!value.startTime || !value.endTime)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time and end time are required when a doctor is available'
      });
    }

    if (value.startTime && value.endTime && value.startTime >= value.endTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be later than start time',
        path: ['endTime']
      });
    }
  });

const blockedSlotSchema = z
  .object({
    date: dateStringSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    reason: z.string().trim().max(500).optional()
  })
  .superRefine((value, context) => {
    if (value.startTime >= value.endTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be later than start time',
        path: ['endTime']
      });
    }
  });

const bankAccountSchema = z
  .object({
    accountNumber: z.string().trim().optional(),
    ifscCode: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
    accountHolderName: z.string().trim().optional(),
    passbookCopy: z.string().trim().optional()
  })
  .partial()
  .optional();

const doctorPayloadSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().optional(),
  gender: genderSchema.optional(),
  phone: phoneSchema,
  email: z.string().trim().email('Invalid email address').optional(),
  specialization: z.string().trim().min(1, 'Specialization is required'),
  qualification: z.string().trim().optional(),
  experienceYears: z.coerce.number().min(0, 'Experience cannot be negative').optional(),
  consultationFee: z.coerce.number().min(0, 'Consultation fee cannot be negative').optional(),
  availability: z.array(availabilityItemSchema).optional(),
  userId: objectIdSchema.optional(),
  clinicId: objectIdSchema.optional(),
  assignedClinics: z.array(objectIdSchema).optional(),
  isActive: z.boolean().optional(),
  bankAccount: bankAccountSchema
});

const createDoctorSchema = z.object({
  body: doctorPayloadSchema
});

const doctorUpdatePayloadSchema = doctorPayloadSchema;

const updateDoctorSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: doctorUpdatePayloadSchema.partial()
});

const updateDoctorAvailabilitySchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    availability: z.array(availabilityItemSchema).min(1, 'Availability is required')
  })
});

const doctorAvailabilityParamSchema = objectIdParamSchema('doctorId');

const getDoctorAvailabilitySchema = doctorAvailabilityParamSchema;

const replaceDoctorAvailabilitySchema = z.object({
  params: doctorAvailabilityParamSchema.shape.params,
  body: z.object({
    availability: z.array(availabilityItemSchema).min(1, 'Availability is required')
  })
});

const createDoctorBlockedSlotSchema = z.object({
  params: doctorAvailabilityParamSchema.shape.params,
  body: blockedSlotSchema
});

const listDoctorQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    isActive: booleanQuerySchema,
    clinicId: objectIdSchema.optional()
  })
});

const doctorIdParamSchema = objectIdParamSchema('id');

module.exports = {
  createDoctorSchema,
  updateDoctorSchema,
  updateDoctorAvailabilitySchema,
  getDoctorAvailabilitySchema,
  replaceDoctorAvailabilitySchema,
  createDoctorBlockedSlotSchema,
  listDoctorQuerySchema,
  doctorIdParamSchema
};
