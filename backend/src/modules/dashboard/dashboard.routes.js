const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const dashboardController = require('./dashboard.controller');
const { dashboardRangeQuerySchema, dashboardActivityQuerySchema } = require('./dashboard.validator');

const router = Router();

router.get(
  '/overview',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(dashboardRangeQuerySchema),
  dashboardController.getOverview
);
router.get(
  '/appointments',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(dashboardRangeQuerySchema),
  dashboardController.getAppointmentsAnalytics
);
router.get(
  '/revenue',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(dashboardRangeQuerySchema),
  dashboardController.getRevenueAnalytics
);
router.get(
  '/patients',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(dashboardRangeQuerySchema),
  dashboardController.getPatientsAnalytics
);
router.get(
  '/labs',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(dashboardRangeQuerySchema),
  dashboardController.getLabsAnalytics
);
router.get(
  '/pharmacy',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(dashboardRangeQuerySchema),
  dashboardController.getPharmacyAnalytics
);
router.get(
  '/notifications',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(dashboardRangeQuerySchema),
  dashboardController.getNotificationsAnalytics
);
router.get(
  '/doctor-workload',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(dashboardRangeQuerySchema),
  dashboardController.getDoctorWorkload
);
router.get(
  '/no-show',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(dashboardRangeQuerySchema),
  dashboardController.getNoShowAnalytics
);
router.get(
  '/activity-feed',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.RECEPTIONIST),
  validate(dashboardActivityQuerySchema),
  dashboardController.getActivityFeed
);

router.get(
  '/super-admin/overview',
  protect,
  authorize(ROLES.ADMIN),
  dashboardController.getSuperAdminOverview
);

module.exports = router;
