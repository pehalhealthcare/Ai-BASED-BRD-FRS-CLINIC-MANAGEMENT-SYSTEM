const { z } = require('zod');

const { objectIdParamSchema, objectIdSchema } = require('../../common/validators/objectId.validator');

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10,15}$/, 'Phone number must be between 10 and 15 digits');

const optionalTrimmedString = z.string().trim().optional();
const genderSchema = z.enum(['male', 'female', 'other']);

const booleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());

const addressSchema = z
  .object({
    line1: optionalTrimmedString,
    line2: optionalTrimmedString,
    city: optionalTrimmedString,
    state: optionalTrimmedString,
    pincode: optionalTrimmedString,
    country: optionalTrimmedString
  })
  .partial()
  .optional();

const emergencyContactSchema = z
  .object({
    name: optionalTrimmedString,
    relation: optionalTrimmedString,
    phone: phoneSchema.optional()
  })
  .partial()
  .optional();

const documentSchema = z.object({
  type: optionalTrimmedString,
  fileName: optionalTrimmedString,
  fileUrl: optionalTrimmedString,
  uploadedAt: z.coerce.date().optional()
});

const insuranceDetailsSchema = z
  .object({
    provider: optionalTrimmedString,
    policyNumber: optionalTrimmedString,
    groupNumber: optionalTrimmedString,
    subscriberName: optionalTrimmedString,
    subscriberDob: z.coerce.string().nullable().optional(),
    autoClaimAutomation: z.boolean().optional()
  })
  .partial()
  .optional();

const paymentMethodSchema = z.object({
  cardholderName: optionalTrimmedString,
  cardNumber: optionalTrimmedString,
  expiryDate: optionalTrimmedString,
  cardType: optionalTrimmedString
});

const patientPayloadSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().max(100).optional(),
  gender: genderSchema,
  dateOfBirth: z.coerce.date().optional(),
  phone: phoneSchema,
  email: z.string().trim().email('Invalid email address').optional(),
  address: addressSchema,
  profileImage: optionalTrimmedString,
  bloodGroup: optionalTrimmedString,
  allergies: z.array(z.string().trim().min(1)).optional(),
  chronicConditions: z.array(z.string().trim().min(1)).optional(),
  currentMedications: z.array(z.string().trim().min(1)).optional(),
  emergencyContact: emergencyContactSchema,
  documents: z.array(documentSchema).optional(),
  isActive: z.boolean().optional(),
  clinicId: objectIdSchema.optional(),
  insuranceDetails: insuranceDetailsSchema,
  paymentMethods: z.array(paymentMethodSchema).optional()
});

const createPatientSchema = z.object({
  body: patientPayloadSchema
});

const patientUpdatePayloadSchema = patientPayloadSchema.omit({
  clinicId: true
});

const updatePatientSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: patientUpdatePayloadSchema.partial()
});

const updateMyPatientSchema = z.object({
  body: patientUpdatePayloadSchema.partial()
});

const listPatientQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().optional(),
    gender: genderSchema.optional(),
    isActive: booleanQuerySchema,
    clinicId: objectIdSchema.optional()
  })
});

const patientIdParamSchema = objectIdParamSchema('id');
const namedPatientIdParamSchema = objectIdParamSchema('patientId');

module.exports = {
  createPatientSchema,
  updatePatientSchema,
  updateMyPatientSchema,
  listPatientQuerySchema,
  patientIdParamSchema,
  namedPatientIdParamSchema
};
