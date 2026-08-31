const { Router } = require('express');

const { ROLES } = require('../../common/constants/roles');
const { protect } = require('../../common/middlewares/auth.middleware');
const { authorize } = require('../../common/middlewares/role.middleware');
const { validate } = require('../../common/middlewares/validate.middleware');
const labController = require('./lab.controller');
const {
  createLabTestSchema,
  listLabTestQuerySchema,
  createLabOrderSchema,
  listLabOrderQuerySchema,
  labOrderIdParamSchema,
  updateLabOrderStatusSchema,
  createLabReportSchema,
  labReportIdParamSchema,
  updateLabReportSchema,
  reviewLabAnalysisSchema,
  finalizeLabReportSchema,
  updateLabTestSchema,
  createLabConsumableSchema,
  updateLabConsumableSchema,
  addConsumableBatchSchema,
  adjustConsumableStockSchema,
  lookupPrescriptionQuerySchema,
  smartPackagesQuerySchema
} = require('./lab.validator');

const router = Router();

router.get(
  '/search',
  protect,
  labController.searchAllLabs
);

router.get(
  '/lookup-prescription',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST),
  validate(lookupPrescriptionQuerySchema),
  labController.lookupPrescriptionForLab
);

router.get(
  '/smart-packages',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(smartPackagesQuerySchema),
  labController.getSmartPackageSuggestions
);

router.post(
  '/custom-request',
  protect,
  labController.createCustomLabRequest
);

router.get(
  '/custom-requests',
  protect,
  labController.listCustomLabRequests
);

router.get(
  '/masters/tests',
  protect,
  labController.listLabTestMasters
);

router.get(
  '/tests/available-global',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.listAvailableGlobalTests
);

router.post(
  '/tests/bulk-activate',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.bulkActivateGlobalTests
);

router.post(
  '/tests',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(createLabTestSchema),
  labController.createLabTest
);
router.patch(
  '/tests/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(updateLabTestSchema),
  labController.updateLabTest
);
router.get(
  '/tests',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN, ROLES.PATIENT),
  validate(listLabTestQuerySchema),
  labController.listLabTests
);
router.post(
  '/orders',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(createLabOrderSchema),
  labController.createLabOrder
);
router.get(
  '/orders',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT),
  validate(listLabOrderQuerySchema),
  labController.listLabOrders
);
router.get(
  '/orders/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT),
  validate(labOrderIdParamSchema),
  labController.getLabOrderById
);
router.patch(
  '/orders/:id/status',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN),
  validate(updateLabOrderStatusSchema),
  labController.updateLabOrderStatus
);
router.post(
  '/reports',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN),
  validate(createLabReportSchema),
  labController.createLabReport
);
router.get(
  '/reports/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN),
  validate(labReportIdParamSchema),
  labController.getLabReportById
);
router.patch(
  '/reports/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN),
  validate(updateLabReportSchema),
  labController.updateLabReport
);
router.patch(
  '/reports/:id/ai-review',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN),
  validate(reviewLabAnalysisSchema),
  labController.reviewLabAnalysis
);
router.patch(
  '/reports/:id/finalize',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN),
  validate(finalizeLabReportSchema),
  labController.finalizeLabReport
);

// Consumables routes
router.get(
  '/inventory/dashboard',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  labController.getLabInventoryDashboard
);

router.post(
  '/consumables',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  validate(createLabConsumableSchema),
  labController.createLabConsumable
);

router.get(
  '/consumables',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.DOCTOR),
  labController.listLabConsumables
);

router.put(
  '/consumables/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  validate(updateLabConsumableSchema),
  labController.updateLabConsumable
);

router.post(
  '/consumables/:id/batches',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  validate(addConsumableBatchSchema),
  labController.addConsumableBatch
);

router.post(
  '/consumables/adjust',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  validate(adjustConsumableStockSchema),
  labController.adjustConsumableStock
);

router.get(
  '/consumables/ledger',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  labController.listLabStockLedgers
);

// Equipment routes
router.get(
  '/equipment',
  protect,
  labController.listEquipment
);

router.post(
  '/equipment',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  labController.createEquipment
);

// QC & Calibration routes
router.get(
  '/qc-calibrations',
  protect,
  labController.listQcCalibrations
);

router.post(
  '/qc-calibrations',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  labController.createQcCalibration
);

// Alerts route
router.get(
  '/dashboard/alerts',
  protect,
  labController.getLabAlerts
);

module.exports = router;

