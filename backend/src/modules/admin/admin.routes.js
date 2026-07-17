const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const adminController = require('./admin.controller');
const {
  listBillingAnomaliesQuerySchema,
  billingAnomalyIdParamSchema,
  reviewBillingAnomalySchema,
  approveDoctorSchema,
  approveReceptionistSchema
} = require('./admin.validator');

const router = Router();

/**
 * @swagger
 * /api/v1/admin/billing-anomalies:
 *   get:
 *     summary: List billing anomaly review records for Admin and Super Admin users
 *
 * /api/v1/admin/billing-anomalies/{id}:
 *   get:
 *     summary: Get a single billing anomaly review record
 *
 * /api/v1/admin/billing-anomalies/{id}/review:
 *   patch:
 *     summary: Update billing anomaly review status
 */
router.get(
  '/billing-anomalies',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(listBillingAnomaliesQuerySchema),
  adminController.listBillingAnomalies
);
router.get(
  '/billing-anomalies/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(billingAnomalyIdParamSchema),
  adminController.getBillingAnomalyById
);
router.patch(
  '/billing-anomalies/:id/review',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(reviewBillingAnomalySchema),
  adminController.reviewBillingAnomaly
);

router.get(
  '/my-doctors/dashboard',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  adminController.getMyDoctorsDashboard
);

router.get(
  '/my-receptionists/dashboard',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  adminController.getMyReceptionistsDashboard
);

// Doctor approval workflow
router.get(
  '/pending-doctors',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  adminController.listPendingDoctors
);
router.post(
  '/approve-doctor/:userId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(approveDoctorSchema),
  adminController.approveDoctor
);
router.post(
  '/reject-doctor/:userId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  adminController.rejectDoctor
);
router.post(
  '/doctors/:userId/re-edit',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  adminController.reEditDoctor
);

// Receptionist approval workflow
router.get(
  '/pending-receptionists',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  adminController.listPendingReceptionists
);
router.post(
  '/approve-receptionist/:userId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(approveReceptionistSchema),
  adminController.approveReceptionist
);
router.post(
  '/reject-receptionist/:userId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  adminController.rejectReceptionist
);
router.post(
  '/receptionists/:userId/re-edit',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  adminController.reEditReceptionist
);

module.exports = router;
