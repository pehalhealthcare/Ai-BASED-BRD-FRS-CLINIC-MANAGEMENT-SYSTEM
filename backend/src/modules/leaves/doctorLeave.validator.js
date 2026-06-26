const { z } = require('zod');
const { objectIdSchema } = require('../../common/validators/objectId.validator');

const listLeaveQuerySchema = z.object({
  query: z.object({
    doctorId: objectIdSchema.optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional()
  })
});

const createLeaveSchema = z.object({
  body: z.object({
    start_datetime: z.string().transform((val) => new Date(val)),
    end_datetime: z.string().transform((val) => new Date(val)),
    leave_type: z.string().min(1),
    reason: z.string().trim().max(1000).optional().default('')
  })
});

const reviewLeaveSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    conflictPolicy: z.enum(['cancel', 'reschedule', 'reassign']).optional().default('cancel')
  })
});

module.exports = {
  listLeaveQuerySchema,
  createLeaveSchema,
  reviewLeaveSchema
};
