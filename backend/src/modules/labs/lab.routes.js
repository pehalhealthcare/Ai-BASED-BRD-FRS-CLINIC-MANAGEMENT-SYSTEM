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
  adjustConsumableStockSchema
} = require('./lab.validator');

const router = Router();

router.get(
  '/search',
  protect,
  labController.searchAllLabs
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

router.post(
  '/tests',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createLabTestSchema),
  labController.createLabTest
);
router.patch(
  '/tests/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
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
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT),
  validate(createLabOrderSchema),
  labController.createLabOrder
);
router.get(
  '/orders',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN),
  validate(listLabOrderQuerySchema),
  labController.listLabOrders
);
router.get(
  '/orders/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN),
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

module.exports = router;
