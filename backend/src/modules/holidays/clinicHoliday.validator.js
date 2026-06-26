const { z } = require('zod');

const listHolidayQuerySchema = z.object({
  query: z.object({
    includeDeleted: z.string().optional().default('false')
  })
});

const createHolidaySchema = z.object({
  body: z.object({
    holiday_name: z.string().min(1, 'Holiday name is required').trim(),
    holiday_date: z.string().transform((val) => new Date(val)),
    is_recurring: z.boolean().optional().default(false),
    all_clinics: z.boolean().optional().default(false),
    allow_emergency: z.boolean().optional().default(false),
    closed_portions: z.array(z.string()).optional().default(['all']),
    clinicIds: z.array(z.string()).optional()
  })
});

const updateHolidaySchema = z.object({
  body: z.object({
    holiday_name: z.string().min(1, 'Holiday name is required').trim().optional(),
    holiday_date: z.string().transform((val) => new Date(val)).optional(),
    is_recurring: z.boolean().optional(),
    all_clinics: z.boolean().optional(),
    allow_emergency: z.boolean().optional(),
    closed_portions: z.array(z.string()).optional(),
    clinicIds: z.array(z.string()).optional()
  })
});

module.exports = {
  listHolidayQuerySchema,
  createHolidaySchema,
  updateHolidaySchema
};
