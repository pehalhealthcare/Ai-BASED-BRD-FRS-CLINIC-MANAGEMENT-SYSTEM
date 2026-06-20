const { z } = require('zod');

const { PUBLIC_REGISTRATION_ROLES, ROLES } = require('../../common/constants/roles');

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include uppercase, lowercase, and number');

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    phone: z.string().trim().optional(),
    password: passwordSchema,
    role: z.enum(PUBLIC_REGISTRATION_ROLES).optional().default(ROLES.PATIENT),
    organizationId: z.string().trim().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    dateOfBirth: z.string().trim().optional(),
    age: z.number().optional(),
    address: z.object({
      line1: z.string().trim().optional(),
      line2: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      pincode: z.string().trim().optional(),
      country: z.string().trim().optional()
    }).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1)
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  resetPasswordSchema
};
