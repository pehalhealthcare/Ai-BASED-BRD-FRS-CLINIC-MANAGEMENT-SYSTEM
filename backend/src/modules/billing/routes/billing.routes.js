const { Router } = require('express');
const { ROLES } = require('../../../common/constants/roles');
const { protect } = require('../../../common/middlewares/auth.middleware');
const { authorize } = require('../../../common/middlewares/role.middleware');
const { validate } = require('../../../common/middlewares/validate.middleware');

const billingController = require('../controllers/billing.controller');
const { createInvoiceSchema } = require('../validators/billing.validator');

const router = Router();

/**
 * @swagger
 * /api/v1/billing/appointment:
 *   post:
 *     summary: Create invoice for an appointment consultation
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/appointment',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(createInvoiceSchema),
  billingController.createAppointmentInvoice
);

/**
 * @swagger
 * /api/v1/billing/pharmacy:
 *   post:
 *     summary: Create invoice for pharmacy order
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/pharmacy',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.PHARMACIST),
  validate(createInvoiceSchema),
  billingController.createPharmacyInvoice
);

/**
 * @swagger
 * /api/v1/billing/lab:
 *   post:
 *     summary: Create invoice for laboratory test
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/lab',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN),
  validate(createInvoiceSchema),
  billingController.createLabInvoice
);

/**
 * @swagger
 * /api/v1/billing/invoice/{id}:
 *   get:
 *     summary: Get invoice details by ID
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/invoice/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.LAB_TECHNICIAN, ROLES.PATIENT),
  billingController.getInvoiceById
);

/**
 * @swagger
 * /api/v1/billing/patient/{patientId}:
 *   get:
 *     summary: Get all invoices linked to a patient
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/patient/:patientId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  billingController.getInvoicesByPatient
);

/**
 * @swagger
 * /api/v1/billing/organization/{organizationId}:
 *   get:
 *     summary: Get all invoices linked to an organization
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/organization/:organizationId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  billingController.getInvoicesByOrganization
);

module.exports = router;
