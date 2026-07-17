const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const patientController = require('./patient.controller');
const {
  createPatientSchema,
  updatePatientSchema,
  updateMyPatientSchema,
  listPatientQuerySchema,
  patientIdParamSchema,
  namedPatientIdParamSchema,
  uploadPatientDocumentSchema,
  documentIdParamSchema
} = require('./patient.validator');
const { patientConsultationHistorySchema } = require('../consultations/consultation.validator');
const { patientLabHistorySchema } = require('../labs/lab.validator');
const { patientMedicineHistorySchema } = require('../pharmacy/pharmacy.validator');
const { patientNotificationHistorySchema } = require('../notifications/notification.validator');

const router = Router();

router.post('/', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST), validate(createPatientSchema), patientController.createPatient);
router.get(
  '/check-exists',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  patientController.checkExists
);
router.get(
  '/me/clinics',
  protect,
  authorize(ROLES.PATIENT),
  patientController.getMyClinics
);
router.get(
  '/me',
  protect,
  authorize(ROLES.PATIENT),
  patientController.getMyPatientProfile
);
router.post(
  '/me/verify-history-password',
  protect,
  authorize(ROLES.PATIENT),
  patientController.verifyHistoryPassword
);
router.patch(
  '/me',
  protect,
  authorize(ROLES.PATIENT),
  validate(updateMyPatientSchema),
  patientController.updateMyPatientProfile
);
router.get(
  '/',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(listPatientQuerySchema),
  patientController.listPatients
);
router.post(
  '/:id/associate',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  patientController.associatePatient
);
router.get(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(patientIdParamSchema),
  patientController.getPatientById
);
router.patch(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(updatePatientSchema),
  patientController.updatePatient
);
router.delete(
  '/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(patientIdParamSchema),
  patientController.deletePatient
);
router.get(
  '/:patientId/consultations',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR),
  validate(patientConsultationHistorySchema),
  patientController.getPatientConsultations
);
router.get(
  '/:patientId/labs',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT),
  validate(patientLabHistorySchema),
  patientController.getPatientLabs
);
router.get(
  '/:patientId/medicines',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.PATIENT),
  validate(patientMedicineHistorySchema),
  patientController.getPatientMedicines
);
router.get(
  '/:patientId/notifications',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(patientNotificationHistorySchema),
  patientController.getPatientNotifications
);
router.get(
  '/:patientId/clinical-history',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(namedPatientIdParamSchema),
  patientController.getPatientHistory
);
router.get(
  '/:id/history',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(patientIdParamSchema),
  patientController.getPatientHistory
);

router.post(
  '/:patientId/documents',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(uploadPatientDocumentSchema),
  patientController.uploadPatientDocument
);
router.get(
  '/:patientId/documents',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(namedPatientIdParamSchema),
  patientController.listPatientDocuments
);
router.get(
  '/:patientId/documents/:documentId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(documentIdParamSchema),
  patientController.downloadPatientDocument
);
router.delete(
  '/:patientId/documents/:documentId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  validate(documentIdParamSchema),
  patientController.deletePatientDocument
);

module.exports = router;
