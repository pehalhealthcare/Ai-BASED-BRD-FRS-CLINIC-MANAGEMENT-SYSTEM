const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const doctorController = require('./doctor.controller');
const {
  createDoctorSchema,
  updateDoctorSchema,
  updateDoctorAvailabilitySchema,
  getDoctorAvailabilitySchema,
  replaceDoctorAvailabilitySchema,
  createDoctorBlockedSlotSchema,
  listDoctorQuerySchema,
  doctorIdParamSchema
} = require('./doctor.validator');

const router = Router();

/**
 * @swagger
 * /api/v1/doctors/{doctorId}/availability:
 *   get:
 *     summary: Get doctor availability and blocked slots
 *   put:
 *     summary: Replace doctor weekly availability
 *
 * /api/v1/doctors/{doctorId}/blocked-slots:
 *   post:
 *     summary: Block a doctor slot for leave, break, or emergency
 */
router.post('/', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(createDoctorSchema), doctorController.createDoctor);
router.get(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(listDoctorQuerySchema),
  doctorController.listDoctors
);

router.get('/me/profile', protect, authorize(ROLES.DOCTOR), doctorController.getMyProfile);
router.put('/me/profile', protect, authorize(ROLES.DOCTOR), doctorController.updateMyProfile);
router.post('/me/submit', protect, authorize(ROLES.DOCTOR), doctorController.submitMyProfile);
router.post('/me/accept-slot', protect, authorize(ROLES.DOCTOR), doctorController.acceptMySlot);
router.get(
  '/:doctorId/availability',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(getDoctorAvailabilitySchema),
  doctorController.getDoctorAvailability
);
router.put(
  '/:doctorId/availability',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(replaceDoctorAvailabilitySchema),
  doctorController.replaceDoctorAvailability
);
router.post(
  '/:doctorId/blocked-slots',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(createDoctorBlockedSlotSchema),
  doctorController.addDoctorBlockedSlot
);
router.get(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(doctorIdParamSchema),
  doctorController.getDoctorById
);
router.patch(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(updateDoctorSchema),
  doctorController.updateDoctor
);
router.delete(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(doctorIdParamSchema),
  doctorController.deleteDoctor
);
router.patch(
  '/:id/availability',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(updateDoctorAvailabilitySchema),
  doctorController.updateDoctorAvailability
);

module.exports = router;
