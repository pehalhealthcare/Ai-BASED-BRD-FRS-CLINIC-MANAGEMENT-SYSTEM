const { z } = require('zod');
const { objectIdParamSchema } = require('../../common/validators/objectId.validator');

const listAuditLogsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    action: z.string().trim().optional(),
    entity: z.string().trim().optional(),
    actorUserId: z.string().trim().optional(),
    status: z.enum(['SUCCESS', 'FAILURE']).optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional()
  })
});

const auditLogIdParamSchema = objectIdParamSchema('id');

module.exports = {
  listAuditLogsQuerySchema,
  auditLogIdParamSchema
};
