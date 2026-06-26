const { Router } = require('express');
const { ROLES } = require('../../../common/constants/roles');
const { protect } = require('../../../common/middlewares/auth.middleware');
const { authorize } = require('../../../common/middlewares/role.middleware');
const { validate } = require('../../../common/middlewares/validate.middleware');

const insuranceController = require('../controllers/insurance.controller');
const {
  verifyPolicySchema,
  submitClaimSchema,
  approveClaimSchema,
  rejectClaimSchema,
  linkPolicySchema
} = require('../validators/insurance.validator');

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     InsuranceProvider:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         providerCode:
 *           type: string
 *         providerName:
 *           type: string
 *         logo:
 *           type: string
 *         contactEmail:
 *           type: string
 *         contactPhone:
 *           type: string
 *         website:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         supportedClaimTypes:
 *           type: array
 *           items:
 *             type: string
 *     PatientInsurance:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         patientId:
 *           type: string
 *         providerId:
 *           type: string
 *         policyNumber:
 *           type: string
 *         memberId:
 *           type: string
 *         groupId:
 *           type: string
 *         policyHolderName:
 *           type: string
 *         relationship:
 *           type: string
 *         policyStartDate:
 *           type: string
 *           format: date-time
 *         policyEndDate:
 *           type: string
 *           format: date-time
 *         coverageAmount:
 *           type: number
 *         remainingCoverage:
 *           type: number
 *         status:
 *           type: string
 *           enum: [ACTIVE, EXPIRED, SUSPENDED]
 *         nominee:
 *           type: string
 *     InsuranceClaim:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         claimId:
 *           type: string
 *         patientId:
 *           type: string
 *         invoiceId:
 *           type: string
 *         policyNumber:
 *           type: string
 *         clinicId:
 *           type: string
 *         claimAmount:
 *           type: number
 *         approvedAmount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [PENDING, UNDER_REVIEW, APPROVED, REJECTED, SETTLED]
 *         rejectionReason:
 *           type: string
 *         documents:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/v1/insurance/providers:
 *   get:
 *     summary: Get all active insurance providers
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     providers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InsuranceProvider'
 */
router.get(
  '/insurance/providers',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  insuranceController.listProviders
);

/**
 * @swagger
 * /api/v1/insurance/providers/{id}:
 *   get:
 *     summary: Get insurance provider by ID
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 */
router.get(
  '/insurance/providers/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  insuranceController.getProviderById
);

/**
 * @swagger
 * /api/v1/insurance/verify:
 *   post:
 *     summary: Verify policy validity and matching provider code
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerCode
 *               - policyNumber
 *             properties:
 *               providerCode:
 *                 type: string
 *               policyNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification response
 */
router.post(
  '/insurance/verify',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(verifyPolicySchema),
  insuranceController.verifyPolicy
);

/**
 * @swagger
 * /api/v1/insurance/coverage/{policyNumber}:
 *   get:
 *     summary: Fetch policy benefits coverage details
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: policyNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coverage response
 */
router.get(
  '/insurance/coverage/:policyNumber',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  insuranceController.getCoverage
);

/**
 * @swagger
 * /api/v1/insurance/claim:
 *   post:
 *     summary: Submit a new insurance claim
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - invoiceId
 *               - policyNumber
 *               - clinicId
 *               - claimAmount
 *             properties:
 *               patientId:
 *                 type: string
 *               invoiceId:
 *                 type: string
 *               policyNumber:
 *                 type: string
 *               clinicId:
 *                 type: string
 *               claimAmount:
 *                 type: number
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Claim created
 */
router.post(
  '/insurance/claim',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(submitClaimSchema),
  insuranceController.submitClaim
);

/**
 * @swagger
 * /api/v1/insurance/claim/{claimId}:
 *   get:
 *     summary: Retrieve claim details by claim ID
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claim details
 */
router.get(
  '/insurance/claim/:claimId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  insuranceController.getClaimStatus
);

/**
 * @swagger
 * /api/v1/insurance/claim/{claimId}/approve:
 *   put:
 *     summary: Approve a claim and deduct from remaining coverage
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approvedAmount
 *             properties:
 *               approvedAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Claim approved
 */
router.put(
  '/insurance/claim/:claimId/approve',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(approveClaimSchema),
  insuranceController.approveClaim
);

/**
 * @swagger
 * /api/v1/insurance/claim/{claimId}/reject:
 *   put:
 *     summary: Reject a claim with a reason
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Claim rejected
 */
router.put(
  '/insurance/claim/:claimId/reject',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(rejectClaimSchema),
  insuranceController.rejectClaim
);

/**
 * @swagger
 * /api/v1/insurance/claims:
 *   get:
 *     summary: Retrieve claims list with pagination, search, sorting and filters
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claims list
 */
router.get(
  '/insurance/claims',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  insuranceController.listClaims
);

/**
 * @swagger
 * /api/v1/patients/{patientId}/insurance:
 *   get:
 *     summary: Get patient insurance policy link
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Retrieve policy details
 *   post:
 *     summary: Link a policy to a patient
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - policyNumber
 *               - memberId
 *               - policyHolderName
 *               - policyStartDate
 *               - policyEndDate
 *               - coverageAmount
 *             properties:
 *               providerId:
 *                 type: string
 *               policyNumber:
 *                 type: string
 *               memberId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               policyHolderName:
 *                 type: string
 *               relationship:
 *                 type: string
 *               policyStartDate:
 *                 type: string
 *                 format: date-time
 *               policyEndDate:
 *                 type: string
 *                 format: date-time
 *               coverageAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Policy linked
 *   put:
 *     summary: Update patient insurance policy details
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Policy updated
 *   delete:
 *     summary: Unlink patient insurance policy
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Policy deleted
 */
router.get(
  '/patients/:patientId/insurance',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT),
  insuranceController.getPatientInsurance
);

router.post(
  '/patients/:patientId/insurance',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(linkPolicySchema),
  insuranceController.createPatientInsurance
);

router.put(
  '/patients/:patientId/insurance',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(linkPolicySchema),
  insuranceController.updatePatientInsurance
);

router.delete(
  '/patients/:patientId/insurance',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  insuranceController.deletePatientInsurance
);

module.exports = router;
