const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const prescriptionController = require('./prescription.controller');
const {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  finalizePrescriptionSchema,
  cancelPrescriptionSchema,
  prescriptionIdParamSchema,
  patientPrescriptionQuerySchema,
  consultationIdParamSchema
} = require('./prescription.validator');

const router = Router();

router.post(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(createPrescriptionSchema),
  prescriptionController.createPrescription
);
router.get(
  '/patient/:patientId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.PATIENT),
  validate(patientPrescriptionQuerySchema),
  prescriptionController.getPrescriptionsByPatient
);
router.get(
  '/consultation/:consultationId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.PATIENT),
  validate(consultationIdParamSchema),
  prescriptionController.getPrescriptionsByConsultation
);
router.get(
  '/:id/download',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.PATIENT),
  validate(prescriptionIdParamSchema),
  prescriptionController.downloadPrescriptionPdf
);
router.get(
  '/:id/medicines/download',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.PATIENT),
  validate(prescriptionIdParamSchema),
  prescriptionController.downloadMedicines
);
router.post(
  '/:id/finalize',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(finalizePrescriptionSchema),
  prescriptionController.finalizePrescription
);
router.post(
  '/:id/cancel',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(cancelPrescriptionSchema),
  prescriptionController.cancelPrescription
);
router.get(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.PATIENT),
  validate(prescriptionIdParamSchema),
  prescriptionController.getPrescriptionById
);
router.patch(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(updatePrescriptionSchema),
  prescriptionController.updatePrescription
);

module.exports = router;
