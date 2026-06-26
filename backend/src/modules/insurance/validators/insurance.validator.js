const { z } = require('zod');

// Helpers for validation
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

const verifyPolicySchema = z.object({
  body: z.object({
    providerCode: z.string({ required_error: 'Provider code is required.' }).trim().min(2),
    policyNumber: z.string({ required_error: 'Policy number is required.' }).trim().min(4)
  })
});

const submitClaimSchema = z.object({
  body: z.object({
    patientId: objectIdSchema,
    invoiceId: objectIdSchema,
    policyNumber: z.string({ required_error: 'Policy number is required.' }).trim().min(4),
    clinicId: objectIdSchema,
    claimAmount: z.number({ required_error: 'Claim amount is required.' }).min(0),
    documents: z.array(z.string()).optional()
  })
});

const approveClaimSchema = z.object({
  body: z.object({
    approvedAmount: z.number({ required_error: 'Approved amount is required.' }).min(0)
  })
});

const rejectClaimSchema = z.object({
  body: z.object({
    rejectionReason: z.string({ required_error: 'Rejection reason is required.' }).trim().min(3)
  })
});

const linkPolicySchema = z.object({
  body: z.object({
    providerId: objectIdSchema,
    policyNumber: z.string({ required_error: 'Policy number is required.' }).trim().min(4),
    memberId: z.string({ required_error: 'Member ID is required.' }).trim().min(3),
    groupId: z.string().optional(),
    policyHolderName: z.string({ required_error: 'Policy holder name is required.' }).trim().min(2),
    relationship: z.string().default('Self'),
    policyStartDate: z.string({ required_error: 'Start date is required.' }).datetime({ precision: 3, offset: true }),
    policyEndDate: z.string({ required_error: 'End date is required.' }).datetime({ precision: 3, offset: true }),
    coverageAmount: z.number({ required_error: 'Coverage amount is required.' }).min(0),
    nominee: z.string().optional(),
    benefits: z.object({
      consultation: z.boolean().default(true),
      lab: z.boolean().default(true),
      pharmacy: z.boolean().default(false),
      hospitalization: z.boolean().default(true),
      roomRent: z.boolean().default(true),
      surgery: z.boolean().default(true),
      emergency: z.boolean().default(true)
    }).optional()
  })
});

module.exports = {
  verifyPolicySchema,
  submitClaimSchema,
  approveClaimSchema,
  rejectClaimSchema,
  linkPolicySchema
};
