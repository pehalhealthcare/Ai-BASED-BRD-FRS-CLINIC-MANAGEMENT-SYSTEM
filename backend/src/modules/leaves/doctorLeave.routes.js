const { Router } = require('express');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const { ROLES } = require('../../common/constants/roles');
const leaveController = require('./doctorLeave.controller');
const { createLeaveSchema, reviewLeaveSchema, listLeaveQuerySchema } = require('./doctorLeave.validator');

const router = Router();

// Apply for leave (Doctor)
router.post(
  '/',
  protect,
  authorize(ROLES.DOCTOR),
  validate(createLeaveSchema),
  leaveController.apply
);

// List leaves (Doctor or Admin)
router.get(
  '/',
  protect,
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  validate(listLeaveQuerySchema),
  leaveController.list
);

// Get leave policy (Doctor or Admin)
router.get(
  '/policy',
  protect,
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  leaveController.getPolicy
);

// Update leave policy (Admin only)
router.put(
  '/policy',
  protect,
  authorize(ROLES.ADMIN),
  leaveController.updatePolicy
);

// Get doctor leave balances (Doctor or Admin)
router.get(
  '/balances',
  protect,
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  leaveController.getBalances
);

// Review leave request (Admin)
router.patch(
  '/:id/review',
  protect,
  authorize(ROLES.ADMIN),
  validate(reviewLeaveSchema),
  leaveController.review
);

// Cancel leave request (Doctor or Admin)
router.post(
  '/:id/cancel',
  protect,
  authorize(ROLES.DOCTOR, ROLES.ADMIN),
  leaveController.cancel
);

module.exports = router;
