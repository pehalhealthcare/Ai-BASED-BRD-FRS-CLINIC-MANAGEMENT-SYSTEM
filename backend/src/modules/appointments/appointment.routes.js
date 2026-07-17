const { Router } = require('express');

const { ROLES, STAFF_ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const appointmentController = require('./appointment.controller');
const queueController = require('./queue.controller');
const discountController = require('./discount.controller');
const {
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
  '/pending-approvals',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  discountController.getPendingApprovals
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
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
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
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ...STAFF_ROLES, ROLES.DOCTOR, ROLES.PATIENT),
  validate(doctorIdParamSchema),
  appointmentController.getQueueStatus
);

router.post(
  '/scan-checkin',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ...STAFF_ROLES),
  appointmentController.scanCheckin
);

// Queue & Check-In endpoints
router.post(
  '/:id/checkin',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ...STAFF_ROLES),
  validate(checkInAppointmentSchema),
  queueController.checkInPatient
);

router.get(
  '/queue-sorted/:doctorId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ...STAFF_ROLES, ROLES.DOCTOR, ROLES.PATIENT),
  validate(doctorIdParamSchema),
  queueController.getDoctorQueue
);

router.post(
  '/queue-sorted/:doctorId/call-next',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ...STAFF_ROLES, ROLES.DOCTOR),
  validate(doctorIdParamSchema),
  queueController.callNext
);

router.post(
  '/queue-sorted/start/:tokenId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ...STAFF_ROLES, ROLES.DOCTOR),
  queueController.startConsultation
);

router.post(
  '/queue-sorted/complete/:tokenId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ...STAFF_ROLES, ROLES.DOCTOR),
  queueController.completeConsultation
);

router.post(
  '/queue-sorted/skip/:tokenId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ...STAFF_ROLES, ROLES.DOCTOR),
  queueController.skipPatient
);

router.post(
  '/queue-sorted/recall/:tokenId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  queueController.recallPatient
);

router.post(
  '/queue-sorted/reorder',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(reorderQueueSchema),
  queueController.reorderPatient
);

router.put(
  '/queue-sorted/settings/:doctorId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(updateDoctorQueueSettingsSchema),
  queueController.updateDoctorSettings
);

router.get(
  '/queue-sorted/settings/:doctorId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(doctorIdParamSchema),
  queueController.getDoctorSettings
);

router.post(
  '/queue-sorted/verify-otp',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  queueController.verifyOtp
);

router.post(
  '/queue-sorted/reassign',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  queueController.reassignSkipped
);

router.post(
  '/:id/verify-payment',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  appointmentController.verifyPayment
);

router.post(
  '/:id/waiver',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  appointmentController.applyWaiver
);

router.post(
  '/:id/request-refund',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PATIENT),
  appointmentController.requestRefund
);

router.post(
  '/daily-refunds',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  appointmentController.runDailyRefunds
);

router.get(
  '/check-follow-up/:patientId/:doctorId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  appointmentController.checkFollowUp
);

// ── Discount / Waiver / Billing endpoints ─────────────────────────────────

router.post(
  '/:id/request-discount',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  discountController.requestDiscount
);

router.post(
  '/:id/decide-discount',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  discountController.decideDiscount
);

router.post(
  '/:id/collect-payment',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  discountController.collectPayment
);

module.exports = router;
