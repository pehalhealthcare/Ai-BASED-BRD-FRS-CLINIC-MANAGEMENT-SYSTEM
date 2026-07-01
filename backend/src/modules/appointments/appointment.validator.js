const { z } = require('zod');

const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');
const { objectIdParamSchema, objectIdSchema } = require('../../common/validators/objectId.validator');

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format');
const durationSchema = z.coerce.number().int().refine((value) => [15, 30, 45, 60].includes(value), {
  message: 'durationMinutes must be one of 15, 30, 45, or 60'
});

const appointmentTypeSchema = z.enum(['scheduled', 'walk_in', 'follow_up', 'teleconsultation', 'emergency']);
const appointmentStatusSchema = z.enum(Object.values(APPOINTMENT_STATUSES));

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

const createAppointmentSchema = z.object({
  body: z.object({
    patientId: objectIdSchema,
    doctorId: objectIdSchema,
    appointmentDate: dateStringSchema,
    startTime: timeStringSchema,
    durationMinutes: durationSchema.default(30),
    appointmentType: appointmentTypeSchema.default('scheduled'),
    reasonForVisit: z.string().trim().max(500).optional(),
    symptomsSummary: z.string().trim().max(1000).optional(),
    source: z.enum(['reception', 'patient_app', 'chatbot', 'admin']).optional(),
    notes: z.string().trim().max(1000).optional(),
    isEarlyBooking: z.boolean().optional(),
    earlyBookingReason: z.enum(['doctor_request', 'receptionist_discretion', 'none']).optional()
  })
});

const listAppointmentsQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    date: dateStringSchema.optional(),
    doctorId: objectIdSchema.optional(),
    patientId: objectIdSchema.optional(),
    status: appointmentStatusSchema.optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    clinicId: objectIdSchema.optional()
  })
});

const calendarQuerySchema = z.object({
  query: z.object({
    view: z.enum(['day', 'week', 'month']).default('day'),
    date: dateStringSchema,
    doctorId: objectIdSchema.optional(),
    clinicId: objectIdSchema.optional()
  })
});

const availableSlotsQuerySchema = z.object({
  query: z.object({
    doctorId: objectIdSchema,
    date: dateStringSchema,
    durationMinutes: durationSchema.default(30),
    clinicId: objectIdSchema.optional(),
    appointmentType: appointmentTypeSchema.optional()
  })
});

const appointmentIdParamSchema = objectIdParamSchema('id');
const doctorIdParamSchema = objectIdParamSchema('doctorId');

const updateAppointmentStatusSchema = z.object({
  params: appointmentIdParamSchema.shape.params,
  body: z.object({
    status: appointmentStatusSchema,
    note: z.string().trim().max(1000).optional()
  })
});

const rescheduleAppointmentSchema = z.object({
  params: appointmentIdParamSchema.shape.params,
  body: z.object({
    appointmentDate: dateStringSchema,
    startTime: timeStringSchema,
    durationMinutes: durationSchema.default(30),
    reason: z.string().trim().min(1, 'Reason is required').max(500),
    isEarlyBooking: z.boolean().optional(),
    earlyBookingReason: z.enum(['doctor_request', 'receptionist_discretion', 'none']).optional()
  })
});

const cancelAppointmentSchema = z.object({
  params: appointmentIdParamSchema.shape.params,
  body: z.object({
    cancellationReason: z.string().trim().min(1, 'Cancellation reason is required').max(500)
  })
});

const checkInAppointmentSchema = z.object({
  params: appointmentIdParamSchema.shape.params,
  body: z.object({
    method: z.enum(['QR', 'Reception']).default('Reception'),
    isEmergency: z.boolean().optional()
  })
});

const reorderQueueSchema = z.object({
  body: z.object({
    tokenId: z.string(),
    newPosition: z.number(),
    reason: z.string().trim().min(1, 'Reason is required')
  })
});

const updateDoctorQueueSettingsSchema = z.object({
  body: z.object({
    earlyCheckInMins: z.number().min(0),
    lateGraceMins: z.number().min(0),
    noShowTimeoutMins: z.number().min(0),
    tokenFormat: z.string().trim().min(1)
  })
});

module.exports = {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  calendarQuerySchema,
  availableSlotsQuerySchema,
  appointmentIdParamSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  doctorIdParamSchema,
  checkInAppointmentSchema,
  reorderQueueSchema,
  updateDoctorQueueSettingsSchema
};
