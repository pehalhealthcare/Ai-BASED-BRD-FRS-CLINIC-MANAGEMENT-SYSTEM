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

module.exports = {
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
  listCustomLabRequests
};
