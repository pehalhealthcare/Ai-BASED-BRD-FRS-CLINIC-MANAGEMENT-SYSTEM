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
  smartPackagesQuerySchema,
  // LIMS
  singleResultUpdateSchema,
  batchResultEntrySchema,
  finalizeOrderSchema,
  amendOrderSchema,
  generateReportPdfSchema
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
  '/promo-codes/validate',
  protect,
  labController.validatePromoCode
);

router.post(
  '/custom-request',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT),
  labController.createCustomLabRequest
);

router.get(
  '/custom-requests',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.PATIENT),
  labController.listCustomLabRequests
);

router.post(
  '/tests/bulk-activate',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  labController.bulkActivateGlobalTests
);

router.get(
  '/tests/available-global',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  labController.listAvailableGlobalTests
);

router.post(
  '/tests',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  validate(createLabTestSchema),
  labController.createLabTest
);

router.get(
  '/tests',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT),
  validate(listLabTestQuerySchema),
  labController.listLabTests
);

router.get(
  '/test-masters',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN, ROLES.PATIENT),
  labController.listLabTestMasters
);

router.put(
  '/tests/:id',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN),
  validate(updateLabTestSchema),
  labController.updateLabTest
);

router.post(
  '/orders',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT),
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
router.patch(
  '/orders/:id/cancel',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.PATIENT),
  validate(labOrderIdParamSchema),
  labController.cancelLabOrder
);
router.patch(
  '/orders/:id/reschedule',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.PATIENT),
  validate(labOrderIdParamSchema),
  labController.rescheduleLabOrder
);

// LIMS Result Entry & Finalization Routes
router.post(
  '/orders/:id/results/initialize',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(labOrderIdParamSchema),
  labController.initializeOrderResults
);

router.get(
  '/orders/:id/results',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT),
  validate(labOrderIdParamSchema),
  labController.getOrderResults
);

router.patch(
  '/orders/:id/results/batch',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(batchResultEntrySchema),
  labController.saveResultsBatch
);

router.patch(
  '/orders/:id/results/:resultId',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(singleResultUpdateSchema),
  labController.updateSingleResult
);

router.get(
  '/orders/:id/completion-check',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.DOCTOR),
  validate(labOrderIdParamSchema),
  labController.checkOrderCompletion
);

router.patch(
  '/orders/:id/finalize',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(finalizeOrderSchema),
  labController.finalizeOrder
);

router.patch(
  '/orders/:id/amend',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(amendOrderSchema),
  labController.amendOrder
);

router.post(
  '/reports/:id/generate-pdf',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  validate(generateReportPdfSchema),
  labController.generateOrderPdf
);

router.get(
  '/orders/:id/report-document',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT, ROLES.RECEPTIONIST),
  validate(labOrderIdParamSchema),
  labController.getGeneratedReportDocument
);

router.get(
  '/orders/:id/report/pdf',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT, ROLES.RECEPTIONIST),
  validate(labOrderIdParamSchema),
  labController.downloadLabReportPdf
);

router.post(
  '/orders/:id/report/activity',
  protect,
  validate(labOrderIdParamSchema),
  labController.recordReportActivity
);

// Public Report Verification (No Auth Required for QR Scan verification)
router.get(
  '/reports/verify/:reportId',
  labController.verifyPublicLabReport
);

router.get(
  '/verify/:reportId',
  labController.verifyPublicLabReport
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

// ============================================================================
// PHASE 7: SAMPLE COLLECTION, TOKEN MANAGEMENT, HOME COLLECTION & SCAN ROUTES
// ============================================================================

router.post(
  '/orders/:id/start-collection-session',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST),
  labController.startCollectionSession
);

router.post(
  '/orders/:id/verify-patient',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST),
  labController.verifyPatientForCollection
);

router.get(
  '/orders/:id/collection-session',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST, ROLES.PATIENT),
  labController.getCollectionSession
);

router.get(
  '/collection-queue',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST),
  labController.getCollectionQueue
);

router.get(
  '/orders/:orderId/required-samples',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST, ROLES.PATIENT),
  labController.calculateRequiredSpecimens
);

router.post(
  '/tokens/generate',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST, ROLES.PATIENT),
  labController.generateQueueToken
);

router.patch(
  '/tokens/:id/call',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.callQueueToken
);

router.patch(
  '/tokens/:id/recall',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.recallQueueToken
);

router.patch(
  '/tokens/:id/skip',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.skipQueueToken
);

router.get(
  '/tokens/public-display',
  labController.getPublicTokenDisplay
);

router.post(
  '/orders/:orderId/collect-samples',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.collectOrderSamples
);

router.post(
  '/samples/:id/reject',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.rejectSample
);

router.post(
  '/samples/:id/recollect',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.recollectSample
);

router.get(
  '/samples/timeline',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT),
  labController.getSampleTimeline
);

router.get(
  '/home-collections',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.PATIENT),
  labController.listHomeCollectionTasks
);

router.patch(
  '/home-collections/:id/assign',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.assignHomeCollector
);

router.patch(
  '/home-collections/:id/status',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.updateHomeCollectionStatus
);

router.post(
  '/home-collections/:id/receive',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR),
  labController.receiveHomeCollectionAtLab
);

router.get(
  '/lookup-scan',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST),
  labController.universalScanLookup
);

router.post(
  '/lookup-scan',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ROLES.RECEPTIONIST),
  labController.universalScanLookup
);

module.exports = router;


