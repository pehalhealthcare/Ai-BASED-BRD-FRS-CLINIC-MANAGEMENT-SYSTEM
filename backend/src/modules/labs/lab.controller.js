const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const labService = require('./lab.service');

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

module.exports = {
  createLabTest,
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
  getPatientLabHistory
};
