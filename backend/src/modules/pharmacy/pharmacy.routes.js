const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const pharmacyController = require('./pharmacy.controller');
const {
  createMedicineSchema,
  updateMedicineSchema,
  addBatchSchema,
  listMedicinesQuerySchema,
  dispenseSchema,
  listDispensingsQuerySchema,
  medicineIdParamSchema,
  dispensingIdParamSchema,
  cancelDispensingSchema
} = require('./pharmacy.validator');

const router = Router();

router.post(
  '/medicines',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(createMedicineSchema),
  pharmacyController.createMedicine
);
router.get(
  '/medicines',
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.PHARMACIST,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
    ROLES.PATIENT
  ),
  validate(listMedicinesQuerySchema),
  pharmacyController.listMedicines
);
router.get(
  '/medicines/:id',
  protect,
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.PHARMACIST,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
    ROLES.PATIENT
  ),
  validate(medicineIdParamSchema),
  pharmacyController.getMedicineById
);
router.get(
  '/medicines/:id/forecast',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(medicineIdParamSchema),
  pharmacyController.getMedicineDemandForecast
);
router.patch(
  '/medicines/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(updateMedicineSchema),
  pharmacyController.updateMedicine
);
router.post(
  '/medicines/:id/batches',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(addBatchSchema),
  pharmacyController.addMedicineBatch
);
router.post(
  '/dispense',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(dispenseSchema),
  pharmacyController.dispensePrescription
);
router.get(
  '/dispensings',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(listDispensingsQuerySchema),
  pharmacyController.listDispensings
);
router.get(
  '/dispensings/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PHARMACIST),
  validate(dispensingIdParamSchema),
  pharmacyController.getDispensingById
);
router.patch(
  '/dispensings/:id/cancel',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(cancelDispensingSchema),
  pharmacyController.cancelDispensing
);

module.exports = router;
