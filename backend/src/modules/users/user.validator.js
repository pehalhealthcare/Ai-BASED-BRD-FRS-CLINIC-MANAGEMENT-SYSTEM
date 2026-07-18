const { z } = require('zod');

const { ROLES } = require('../../common/constants/roles');
const { objectIdParamSchema } = require('../../common/validators/objectId.validator');

const booleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());

const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    role: z.enum(Object.values(ROLES)).optional(),
    isActive: booleanQuerySchema,
    search: z.string().trim().optional()
  })
});

const updateRoleSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    role: z.enum(Object.values(ROLES))
  })
});

const updateStatusSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    isActive: z.boolean()
  })
});

const updateProviderSchema = z.object({
  params: objectIdParamSchema('id').shape.params,
  body: z.object({
    providerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID').nullable().optional()
  })
});

const userIdParamSchema = objectIdParamSchema('id');

module.exports = {
  listUsersQuerySchema,
  updateRoleSchema,
  updateStatusSchema,
  updateProviderSchema,
  userIdParamSchema
};
