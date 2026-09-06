const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const labService = require('./lab.service');
const LabTestMaster = require('./labTestMaster.model');

const createLabTest = asyncHandler(async (req, res) => {
  const labTest = await labService.createLabTest({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Lab test created successfully', { labTest }, 201);
});

const listLabTests = asyncHandler(async (req, res) => {
  const data = await labService.listLabTests({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Lab tests retrieved successfully', data);
});

const createLabOrder = asyncHandler(async (req, res) => {
  const labOrder = await labService.createLabOrder({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Lab order created successfully', { labOrder }, 201);
});

const listLabOrders = asyncHandler(async (req, res) => {
  const data = await labService.listLabOrders({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Lab orders retrieved successfully', data);
});

const getLabOrderById = asyncHandler(async (req, res) => {
  const data = await labService.getLabOrderById({
    requester: req.user,
    labOrderId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Lab order retrieved successfully', data);
});

const updateLabOrderStatus = asyncHandler(async (req, res) => {
  const labOrder = await labService.updateLabOrderStatus({
    requester: req.user,
    labOrderId: req.params.id,
    status: req.body.status,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Lab order status updated successfully', { labOrder });
});

const cancelLabOrder = asyncHandler(async (req, res) => {
  const labOrder = await labService.cancelLabOrder({
    requester: req.user,
    orderId: req.params.id,
    clinicId: req.query.clinicId,
    reason: req.body.reason
  });

  return sendSuccess(res, 'Lab order cancelled successfully', { labOrder });
});

const rescheduleLabOrder = asyncHandler(async (req, res) => {
  const labOrder = await labService.rescheduleLabOrder({
    requester: req.user,
    orderId: req.params.id,
    clinicId: req.query.clinicId,
    payload: req.body
  });

  return sendSuccess(res, 'Lab order rescheduled successfully', { labOrder });
});

const createLabReport = asyncHandler(async (req, res) => {
  const labReport = await labService.createLabReport({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Lab report created successfully', { labReport }, 201);
});

const getLabReportById = asyncHandler(async (req, res) => {
  const data = await labService.getLabReportById({
    requester: req.user,
    labReportId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Lab report retrieved successfully', data);
});

const updateLabReport = asyncHandler(async (req, res) => {
  const labReport = await labService.updateLabReport({
    requester: req.user,
    labReportId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Lab report updated successfully', { labReport });
});

const reviewLabAnalysis = asyncHandler(async (req, res) => {
  const labReport = await labService.reviewLabAnalysis({
    requester: req.user,
    labReportId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Lab AI review updated successfully', { labReport });
});

const finalizeLabReport = asyncHandler(async (req, res) => {
  const labReport = await labService.finalizeLabReport({
    requester: req.user,
    labReportId: req.params.id,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Lab report finalized successfully', { labReport });
});

const getPatientLabHistory = asyncHandler(async (req, res) => {
  const data = await labService.getPatientLabHistory({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient lab history retrieved successfully', data);
});

const updateLabTest = asyncHandler(async (req, res) => {
  const labTest = await labService.updateLabTest({
    requester: req.user,
    labTestId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Lab test updated successfully', { labTest });
});

const listLabTestMasters = asyncHandler(async (req, res) => {
  const query = req.query.search
    ? { name: { $regex: new RegExp(req.query.search, 'i') } }
    : {};
  const masters = await LabTestMaster.find(query).limit(100);
  return sendSuccess(res, 'Lab test masters retrieved', { masters });
});

// ─── LABORATORY CONSUMABLE CONTROLLERS ─────────────────────────────────────────

const createLabConsumable = asyncHandler(async (req, res) => {
  const consumable = await labService.createLabConsumable({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Consumable created successfully', { consumable }, 201);
});

const listLabConsumables = asyncHandler(async (req, res) => {
  const consumables = await labService.listLabConsumables({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Consumables retrieved successfully', { consumables });
});

const updateLabConsumable = asyncHandler(async (req, res) => {
  const consumable = await labService.updateLabConsumable({
    requester: req.user,
    consumableId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Consumable updated successfully', { consumable });
});

const addConsumableBatch = asyncHandler(async (req, res) => {
  const consumable = await labService.addConsumableBatch({
    requester: req.user,
    consumableId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Consumable batch registered successfully', { consumable });
});

const adjustConsumableStock = asyncHandler(async (req, res) => {
  const result = await labService.adjustConsumableStock({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });
  return sendSuccess(res, 'Consumable stock adjusted successfully', result);
});

const listLabStockLedgers = asyncHandler(async (req, res) => {
  const ledgers = await labService.listLabStockLedgers({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Stock ledgers retrieved successfully', { ledgers });
});

const getLabInventoryDashboard = asyncHandler(async (req, res) => {
  const stats = await labService.getLabInventoryDashboard({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Laboratory inventory dashboard statistics retrieved', stats);
});

const searchAllLabs = asyncHandler(async (req, res) => {
  const data = await labService.searchAllLabs({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Laboratory search results retrieved', data);
});

const createCustomLabRequest = asyncHandler(async (req, res) => {
  const data = await labService.createCustomLabRequest({
    requester: req.user,
    payload: req.body
  });
  return sendSuccess(res, 'Custom laboratory request created', data, 201);
});

const listCustomLabRequests = asyncHandler(async (req, res) => {
  const data = await labService.listCustomLabRequests({
    requester: req.user
  });
  return sendSuccess(res, 'Custom laboratory requests retrieved', { requests: data });
});

const listEquipment = asyncHandler(async (req, res) => {
  const data = await labService.listEquipment({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Equipment list retrieved successfully', data);
});

const createEquipment = asyncHandler(async (req, res) => {
  const data = await labService.createEquipment({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Equipment registered successfully', data, 201);
});

const listQcCalibrations = asyncHandler(async (req, res) => {
  const data = await labService.listQcCalibrations({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'QC and Calibrations retrieved successfully', data);
});

const createQcCalibration = asyncHandler(async (req, res) => {
  const data = await labService.createQcCalibration({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'QC or Calibration log created successfully', data, 201);
});

const getLabAlerts = asyncHandler(async (req, res) => {
  const data = await labService.getLabAlerts({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Critical laboratory alerts retrieved', data);
});

const listAvailableGlobalTests = asyncHandler(async (req, res) => {
  const data = await labService.listAvailableGlobalTests({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Available global lab tests retrieved successfully', data);
});

const bulkActivateGlobalTests = asyncHandler(async (req, res) => {
  const activated = await labService.bulkActivateGlobalTests({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId
  });
  return sendSuccess(res, 'Bulk activation of lab tests completed successfully', { activated });
});

const lookupPrescriptionForLab = asyncHandler(async (req, res) => {
  const data = await labService.lookupPrescriptionForLab({
    requester: req.user,
    query: req.query
  });
  return sendSuccess(res, 'Prescription and patient lookup completed successfully', data);
});

const getSmartPackageSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await labService.getSmartPackageSuggestions({
    requester: req.user,
    query: req.query
  });
  return sendSuccess(res, 'Smart package suggestions retrieved successfully', { suggestions, packages: suggestions });
});

const validatePromoCode = asyncHandler(async (req, res) => {
  const result = await labService.validateLabPromoCode({
    code: req.body.code,
    cartTotal: typeof req.body.cartTotal === 'number' ? req.body.cartTotal : (typeof req.body.subtotal === 'number' ? req.body.subtotal : 0),
    laboratoryId: req.body.laboratoryId,
    clinicId: req.body.clinicId || req.query.clinicId,
    patientId: req.user?._id
  });
  return sendSuccess(res, result.message, result);
});

// Phase 7 Controller Handlers
const getCollectionQueue = asyncHandler(async (req, res) => {
  const data = await labService.getCollectionQueueDashboard({
    clinicId: req.query.clinicId,
    laboratoryId: req.query.laboratoryId,
    date: req.query.date,
    requester: req.user
  });
  return sendSuccess(res, 'Collection queue dashboard loaded successfully', data);
});

const calculateRequiredSpecimens = asyncHandler(async (req, res) => {
  const data = await labService.calculateRequiredSpecimens({
    orderId: req.params.orderId,
    clinicId: req.query.clinicId,
    requester: req.user
  });
  return sendSuccess(res, 'Specimen requirements calculated successfully', data);
});

const generateQueueToken = asyncHandler(async (req, res) => {
  const token = await labService.generateQueueToken({
    clinicId: req.body.clinicId || req.query.clinicId,
    laboratoryId: req.body.laboratoryId,
    orderId: req.body.orderId,
    patientId: req.body.patientId,
    queueType: req.body.queueType,
    priority: req.body.priority,
    deskNumber: req.body.deskNumber,
    counterPrefix: req.body.counterPrefix,
    requester: req.user
  });
  return sendSuccess(res, 'Queue token generated successfully', { token }, 201);
});

const callQueueToken = asyncHandler(async (req, res) => {
  const token = await labService.callQueueToken({
    tokenId: req.params.id,
    deskNumber: req.body.deskNumber,
    requester: req.user
  });
  return sendSuccess(res, `Token ${token.tokenNumber} called to ${token.deskNumber}`, { token });
});

const recallQueueToken = asyncHandler(async (req, res) => {
  const token = await labService.recallQueueToken({
    tokenId: req.params.id,
    deskNumber: req.body.deskNumber,
    requester: req.user
  });
  return sendSuccess(res, `Token ${token.tokenNumber} recalled`, { token });
});

const skipQueueToken = asyncHandler(async (req, res) => {
  const token = await labService.skipQueueToken({
    tokenId: req.params.id,
    requester: req.user
  });
  return sendSuccess(res, `Token ${token.tokenNumber} marked as skipped`, { token });
});

const getPublicTokenDisplay = asyncHandler(async (req, res) => {
  const data = await labService.getPublicTokenDisplay({
    clinicId: req.query.clinicId,
    laboratoryId: req.query.laboratoryId
  });
  return sendSuccess(res, 'Public token display loaded successfully', data);
});

const collectOrderSamples = asyncHandler(async (req, res) => {
  const data = await labService.collectOrderSamples({
    orderId: req.params.orderId,
    specimens: req.body.specimens || [],
    deskNumber: req.body.deskNumber,
    notes: req.body.notes,
    requester: req.user
  });
  return sendSuccess(res, 'Samples collected successfully and barcodes generated', data, 201);
});

const rejectSample = asyncHandler(async (req, res) => {
  const sample = await labService.rejectSample({
    sampleId: req.params.id,
    reason: req.body.reason,
    notes: req.body.notes,
    requester: req.user
  });
  return sendSuccess(res, 'Sample rejected and recollection flagged', { sample });
});

const recollectSample = asyncHandler(async (req, res) => {
  const sample = await labService.recollectSample({
    sampleId: req.params.id,
    deskNumber: req.body.deskNumber,
    notes: req.body.notes,
    requester: req.user
  });
  return sendSuccess(res, 'Sample recollected successfully', { sample }, 201);
});

const getSampleTimeline = asyncHandler(async (req, res) => {
  const data = await labService.getSampleTimeline({
    sampleId: req.query.sampleId,
    orderId: req.query.orderId
  });
  return sendSuccess(res, 'Sample timeline retrieved successfully', data);
});

const listHomeCollectionTasks = asyncHandler(async (req, res) => {
  const tasks = await labService.listHomeCollectionTasks({
    clinicId: req.query.clinicId,
    laboratoryId: req.query.laboratoryId,
    scheduledDate: req.query.scheduledDate,
    status: req.query.status,
    collectorId: req.query.collectorId
  });
  return sendSuccess(res, 'Home collection tasks retrieved successfully', { tasks });
});

const assignHomeCollector = asyncHandler(async (req, res) => {
  const task = await labService.assignHomeCollector({
    taskId: req.params.id,
    collectorId: req.body.collectorId,
    collectorName: req.body.collectorName,
    collectorPhone: req.body.collectorPhone,
    requester: req.user
  });
  return sendSuccess(res, 'Collector assigned successfully', { task });
});

const updateHomeCollectionStatus = asyncHandler(async (req, res) => {
  const task = await labService.updateHomeCollectionStatus({
    taskId: req.params.id,
    status: req.body.status,
    failureReason: req.body.failureReason,
    notes: req.body.notes,
    requester: req.user
  });
  return sendSuccess(res, 'Home collection status updated successfully', { task });
});

const receiveHomeCollectionAtLab = asyncHandler(async (req, res) => {
  const task = await labService.receiveHomeCollectionAtLab({
    taskId: req.params.id,
    sampleCondition: req.body.sampleCondition,
    notes: req.body.notes,
    requester: req.user
  });
  return sendSuccess(res, 'Home collected sample received at laboratory', { task });
});

const universalScanLookup = asyncHandler(async (req, res) => {
  const data = await labService.universalScanLookup({
    code: req.query.code || req.body.code,
    clinicId: req.query.clinicId || req.body.clinicId,
    laboratoryId: req.query.laboratoryId || req.body.laboratoryId,
    requester: req.user
  });
  return sendSuccess(res, 'Scan code resolved successfully', data);
});

// ============================================================================
// LIMS — Result Entry Controller Handlers
// ============================================================================

const initializeOrderResults = asyncHandler(async (req, res) => {
  const results = await labService.initializeOrderResults({
    requester: req.user,
    labOrderId: req.params.id,
    requestedClinicId: req.body?.clinicId || req.query?.clinicId || null
  });
  return sendSuccess(res, 'Order results initialized successfully', { results });
});

const getOrderResults = asyncHandler(async (req, res) => {
  const data = await labService.getOrderResults({
    requester: req.user,
    labOrderId: req.params.id,
    requestedClinicId: req.query?.clinicId || null
  });
  return sendSuccess(res, 'Order results retrieved successfully', data);
});

const saveResultsBatch = asyncHandler(async (req, res) => {
  const data = await labService.saveResultsBatch({
    requester: req.user,
    labOrderId: req.params.id,
    results: req.body.results,
    notes: req.body.notes || req.body.overallComment,
    requestedClinicId: req.body?.clinicId || null
  });
  return sendSuccess(res, 'Results saved successfully', data);
});

const updateSingleResult = asyncHandler(async (req, res) => {
  const result = await labService.updateSingleResult({
    requester: req.user,
    labOrderId: req.params.id,
    resultId: req.params.resultId,
    payload: req.body,
    requestedClinicId: req.body?.clinicId || null
  });
  return sendSuccess(res, 'Result updated successfully', { result });
});

const checkOrderCompletion = asyncHandler(async (req, res) => {
  const data = await labService.checkOrderCompletion({
    requester: req.user,
    labOrderId: req.params.id,
    requestedClinicId: req.query?.clinicId || null
  });
  return sendSuccess(res, 'Order completion check performed', data);
});

const finalizeOrder = asyncHandler(async (req, res) => {
  const data = await labService.finalizeOrder({
    requester: req.user,
    labOrderId: req.params.id,
    generatePdf: req.body?.generatePdf !== false,
    notes: req.body?.notes || '',
    requestedClinicId: req.body?.clinicId || null,
    req
  });
  return sendSuccess(res, 'Lab order finalized and completed successfully', data);
});

const amendOrder = asyncHandler(async (req, res) => {
  const labOrder = await labService.amendOrder({
    requester: req.user,
    labOrderId: req.params.id,
    reason: req.body.reason,
    requestedClinicId: req.body?.clinicId || null
  });
  return sendSuccess(res, 'Lab order unlocked for amendment', { labOrder });
});

const generateOrderPdf = asyncHandler(async (req, res) => {
  const data = await labService.generateOrderPdf({
    requester: req.user,
    labReportId: req.params.id,
    requestedClinicId: req.body?.clinicId || null
  });
  return sendSuccess(res, 'Report PDF generated successfully', data);
});

const getGeneratedReportDocument = asyncHandler(async (req, res) => {
  const data = await labService.getGeneratedLabReportDocument({
    requester: req.user,
    labOrderId: req.params.id,
    testCode: req.query.testCode || null,
    testId: req.query.testId || null,
    requestedClinicId: req.query.clinicId || null
  });
  return sendSuccess(res, 'Generated laboratory report document retrieved', data);
});

const downloadLabReportPdf = asyncHandler(async (req, res) => {
  const testCode = req.query.testCode || null;
  const testId = req.query.testId || null;
  const isInline = req.query.inline === 'true';

  const docData = await labService.getGeneratedLabReportDocument({
    requester: req.user,
    labOrderId: req.params.id,
    testCode,
    testId,
    requestedClinicId: req.query.clinicId || null
  });

  const orderNumber = docData.order?.orderNumber || 'LAB-REPORT';
  const testNameClean = (docData.test?.code || docData.test?.name || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${orderNumber}_${testNameClean}_Report.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${isInline ? 'inline' : 'attachment'}; filename="${filename}"`
  );

  await labService.streamLabReportPdfForOrder({
    requester: req.user,
    labOrderId: req.params.id,
    testCode,
    testId,
    requestedClinicId: req.query.clinicId || null,
    outputStream: res
  });
});

const verifyPublicLabReport = asyncHandler(async (req, res) => {
  const data = await labService.verifyPublicLabReport({
    reportId: req.params.reportId || req.params.id
  });
  return sendSuccess(res, 'Laboratory report verification processed', data);
});

const recordReportActivity = asyncHandler(async (req, res) => {
  const data = await labService.recordReportActivity({
    requester: req.user,
    labOrderId: req.params.id,
    action: req.body.action,
    metadata: req.body.metadata || {}
  });
  return sendSuccess(res, 'Report activity logged successfully', data);
});

module.exports = {
  listAvailableGlobalTests,
  bulkActivateGlobalTests,
  createLabTest,
  updateLabTest,
  listLabTests,
  createLabOrder,
  listLabOrders,
  getLabOrderById,
  updateLabOrderStatus,
  createLabReport,
  getLabReportById,
  updateLabReport,
  reviewLabAnalysis,
  finalizeLabReport,
  getPatientLabHistory,
  listLabTestMasters,
  createLabConsumable,
  listLabConsumables,
  updateLabConsumable,
  addConsumableBatch,
  adjustConsumableStock,
  listLabStockLedgers,
  getLabInventoryDashboard,
  searchAllLabs,
  createCustomLabRequest,
  listCustomLabRequests,
  listEquipment,
  createEquipment,
  listQcCalibrations,
  createQcCalibration,
  getLabAlerts,
  lookupPrescriptionForLab,
  cancelLabOrder,
  rescheduleLabOrder,
  getSmartPackageSuggestions,
  validatePromoCode,
  // Phase 7 Exports
  getCollectionQueue,
  calculateRequiredSpecimens,
  generateQueueToken,
  callQueueToken,
  recallQueueToken,
  skipQueueToken,
  getPublicTokenDisplay,
  collectOrderSamples,
  rejectSample,
  recollectSample,
  getSampleTimeline,
  listHomeCollectionTasks,
  assignHomeCollector,
  updateHomeCollectionStatus,
  receiveHomeCollectionAtLab,
  universalScanLookup,
  // LIMS Result Entry Exports
  initializeOrderResults,
  getOrderResults,
  saveResultsBatch,
  updateSingleResult,
  checkOrderCompletion,
  finalizeOrder,
  amendOrder,
  generateOrderPdf,
  getGeneratedReportDocument,
  downloadLabReportPdf,
  verifyPublicLabReport,
  recordReportActivity
};


