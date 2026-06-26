const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

const bankDetailsSchema = z.object({
  accountNumber: z.string().min(8).optional(),
  ifscCode: z.string().min(4).optional(),
  bankName: z.string().min(2).optional(),
  accountHolderName: z.string().min(2).optional()
}).optional();

const markPaidSchema = z.object({
  body: z.object({
    doctorEarningId: objectIdSchema,
    transactionRef: z.string().min(1, 'Transaction reference is required.'),
    paymentDate: z.string().optional(),
    remarks: z.string().optional()
  })
});

const generateSettlementSchema = z.object({
  body: z.object({
    organizationId: objectIdSchema
  })
});

const updateDoctorPayoutSettingsSchema = z.object({
  body: z.object({
    paymentMode: z.enum(['REVENUE_SHARE', 'MONTHLY_SALARY', 'MANUAL']).default('REVENUE_SHARE'),
    revenuePercentage: z.number().min(0).max(100).default(80),
    monthlySalary: z.number().min(0).default(0),
    bankDetails: bankDetailsSchema
  })
});

const updateOrgFinancialSettingsSchema = z.object({
  body: z.object({
    automaticSettlement: z.boolean().default(false),
    doctorRevenuePercentage: z.number().min(0).max(100).default(80),
    clinicRevenuePercentage: z.number().min(0).max(100).default(20),
    paymentCycle: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('WEEKLY'),
    bankDetails: bankDetailsSchema
  })
});

module.exports = {
  markPaidSchema,
  generateSettlementSchema,
  updateDoctorPayoutSettingsSchema,
  updateOrgFinancialSettingsSchema
};
