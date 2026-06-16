const { z } = require('zod');

const { objectIdParamSchema, objectIdSchema } = require('../../common/validators/objectId.validator');

const notificationTypeSchema = z.enum([
  'appointment_reminder',
  'follow_up',
  'prescription_ready',
  'billing_due',
  'lab_report_ready',
  'custom'
]);
const notificationChannelSchema = z.enum(['sms', 'whatsapp', 'email', 'in_app', 'mock']);
const notificationStatusSchema = z.enum(['pending', 'sent', 'failed', 'cancelled']);
const followUpTypeSchema = z.enum(['follow_up_visit', 'lab_review', 'medication_review', 'custom']);
const followUpStatusSchema = z.enum(['pending', 'completed', 'cancelled']);

const optionalTrimmedString = (max = 500) => z.string().trim().max(max).optional();
const booleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});
const isoDateSchema = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const createNotificationTemplateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'name is required').max(120),
    type: notificationTypeSchema,
    channel: notificationChannelSchema,
    subject: optionalTrimmedString(200),
    body: z.string().trim().min(1, 'body is required').max(4000),
    variables: z.array(z.string().trim().min(1).max(120)).optional().default([]),
    isActive: z.boolean().optional(),
    clinicId: objectIdSchema.optional()
  })
});

const listNotificationTemplatesQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    search: z.string().trim().optional(),
    type: notificationTypeSchema.optional(),
    channel: notificationChannelSchema.optional(),
    isActive: booleanQuerySchema,
    clinicId: objectIdSchema.optional()
  })
});

const sendNotificationSchema = z.object({
  body: z.object({
    patientId: objectIdSchema.optional(),
    appointmentId: objectIdSchema.optional(),
    consultationId: objectIdSchema.optional(),
    prescriptionId: objectIdSchema.optional(),
    invoiceId: objectIdSchema.optional(),
    labOrderId: objectIdSchema.optional(),
    templateId: objectIdSchema.optional(),
    type: notificationTypeSchema,
    channel: notificationChannelSchema,
    subject: optionalTrimmedString(200),
    body: z.string().trim().min(1, 'body is required').max(4000),
    renderedVariables: z.record(z.any()).optional(),
    scheduledFor: isoDateSchema.optional().nullable(),
    clinicId: objectIdSchema.optional()
  })
});

const sendAppointmentReminderSchema = z.object({
  body: z.object({
    appointmentId: objectIdSchema,
    clinicId: objectIdSchema.optional()
  })
});

const createFollowUpTaskSchema = z.object({
  body: z.object({
    patientId: objectIdSchema,
    consultationId: objectIdSchema.optional(),
    doctorId: objectIdSchema.optional(),
    title: z.string().trim().min(1, 'title is required').max(200),
    description: optionalTrimmedString(1000),
    dueDate: isoDateSchema,
    type: followUpTypeSchema.optional(),
    channel: notificationChannelSchema.optional(),
    clinicId: objectIdSchema.optional()
  })
});

const listNotificationLogsQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    patientId: objectIdSchema.optional(),
    type: notificationTypeSchema.optional(),
    status: notificationStatusSchema.optional(),
    channel: notificationChannelSchema.optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    clinicId: objectIdSchema.optional()
  })
});

const notificationLogIdParamSchema = objectIdParamSchema('id');

const cancelNotificationSchema = z.object({
  params: notificationLogIdParamSchema.shape.params,
  body: z.object({}).optional().default({})
});

const patientNotificationHistorySchema = z.object({
  params: z.object({
    patientId: objectIdSchema
  }),
  query: paginationQuerySchema.extend({
    clinicId: objectIdSchema.optional()
  })
});

const listFollowUpTasksQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    patientId: objectIdSchema.optional(),
    doctorId: objectIdSchema.optional(),
    status: followUpStatusSchema.optional(),
    dueFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    clinicId: objectIdSchema.optional()
  })
});

const followUpTaskIdParamSchema = objectIdParamSchema('id');

const updateFollowUpStatusSchema = z.object({
  params: followUpTaskIdParamSchema.shape.params,
  body: z.object({
    status: followUpStatusSchema
  })
});

const dispatchPendingNotificationsSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({
    clinicId: objectIdSchema.optional()
  }).optional().default({})
});

module.exports = {
  notificationTypeSchema,
  notificationChannelSchema,
  notificationStatusSchema,
  followUpStatusSchema,
  createNotificationTemplateSchema,
  listNotificationTemplatesQuerySchema,
  sendNotificationSchema,
  sendAppointmentReminderSchema,
  createFollowUpTaskSchema,
  listNotificationLogsQuerySchema,
  notificationLogIdParamSchema,
  cancelNotificationSchema,
  patientNotificationHistorySchema,
  listFollowUpTasksQuerySchema,
  followUpTaskIdParamSchema,
  updateFollowUpStatusSchema,
  dispatchPendingNotificationsSchema
};
