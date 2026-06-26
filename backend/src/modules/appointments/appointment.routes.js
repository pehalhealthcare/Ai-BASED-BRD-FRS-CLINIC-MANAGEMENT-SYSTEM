const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const appointmentController = require('./appointment.controller');
const {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  calendarQuerySchema,
  availableSlotsQuerySchema,
  appointmentIdParamSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  doctorIdParamSchema
} = require('./appointment.validator');

const router = Router();

/**
 * @swagger
 * /api/v1/appointments:
 *   post:
 *     summary: Create a clinic-scoped appointment
 *   get:
 *     summary: List appointments with filters and pagination
 *
 * /api/v1/appointments/calendar:
 *   get:
 *     summary: Get grouped appointment data for calendar views
 *
 * /api/v1/appointments/available-slots:
 *   get:
 *     summary: Get doctor slots with booked and blocked state
 *
 * /api/v1/appointments/{id}:
 *   get:
 *     summary: Get appointment details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *
 * /api/v1/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status with transition validation
 *
 * /api/v1/appointments/{id}/reschedule:
 *   patch:
 *     summary: Reschedule an appointment and preserve history
 *
 * /api/v1/appointments/{id}/cancel:
 *   patch:
 *     summary: Cancel an appointment without deleting it
 */
router.post(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  validate(createAppointmentSchema),
  appointmentController.createAppointment
);
router.get(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(listAppointmentsQuerySchema),
  appointmentController.listAppointments
);
router.get(
  '/calendar',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(calendarQuerySchema),
  appointmentController.getCalendarAppointments
);
router.get(
  '/available-slots',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(availableSlotsQuerySchema),
  appointmentController.getAvailableSlots
);
router.get(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(appointmentIdParamSchema),
  appointmentController.getAppointmentById
);
router.patch(
  '/:id/status',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(updateAppointmentStatusSchema),
  appointmentController.updateAppointmentStatus
);
router.patch(
  '/:id/reschedule',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(rescheduleAppointmentSchema),
  appointmentController.rescheduleAppointment
);
router.patch(
  '/:id/cancel',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  validate(cancelAppointmentSchema),
  appointmentController.cancelAppointment
);
router.get(
  '/queue/:doctorId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(doctorIdParamSchema),
  appointmentController.getQueueStatus
);

router.post(
  '/:id/verify-payment',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  appointmentController.verifyPayment
);

module.exports = router;
