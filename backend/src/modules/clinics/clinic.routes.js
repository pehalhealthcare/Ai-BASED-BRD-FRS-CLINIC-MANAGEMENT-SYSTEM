const { Router } = require('express');
const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const clinicController = require('./clinic.controller');
const { createClinicSchema } = require('./clinic.validator');

const router = Router();

router.post(
  '/',
  protect,
  authorize(ROLES.ADMIN),
  validate(createClinicSchema),
  clinicController.createClinic
);

router.get(
  '/',
  protect,
  clinicController.listClinics
);

module.exports = router;
