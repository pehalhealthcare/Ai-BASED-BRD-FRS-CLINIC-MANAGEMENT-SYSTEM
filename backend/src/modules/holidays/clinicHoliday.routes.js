const { Router } = require('express');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const { ROLES } = require('../../common/constants/roles');
const holidayController = require('./clinicHoliday.controller');
const { createHolidaySchema, updateHolidaySchema, listHolidayQuerySchema } = require('./clinicHoliday.validator');

const router = Router();

// List holidays (optionally include deleted)
router.get(
  '/',
  protect,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT),
  validate(listHolidayQuerySchema),
  holidayController.list
);

// Create holiday
router.post(
  '/',
  protect,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(createHolidaySchema),
  holidayController.create
);

// Update holiday
router.put(
  '/:id',
  protect,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(updateHolidaySchema),
  holidayController.update
);

// Delete holiday (supports ?permanent=true)
router.delete(
  '/:id',
  protect,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  holidayController.remove
);

module.exports = router;
