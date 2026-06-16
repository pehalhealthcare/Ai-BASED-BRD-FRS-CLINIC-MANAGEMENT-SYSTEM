const { z } = require('zod');

const { DATE_ONLY_PATTERN } = require('../../common/utils/analyticsDateRange');
const { objectIdSchema } = require('../../common/validators/objectId.validator');

const dateQuerySchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().regex(DATE_ONLY_PATTERN, 'Use YYYY-MM-DD date format').optional()
);

const dashboardRangeQuerySchema = z.object({
  query: z.object({
    from: dateQuerySchema,
    to: dateQuerySchema,
    clinicId: objectIdSchema.optional()
  })
});

const dashboardActivityQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(50).default(20),
    clinicId: objectIdSchema.optional()
  })
});

module.exports = {
  dashboardRangeQuerySchema,
  dashboardActivityQuerySchema
};
