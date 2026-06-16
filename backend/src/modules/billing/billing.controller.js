const path = require('path');

const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const billingService = require('./billing.service');

const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.createInvoice({
    requester: req.user,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Invoice created successfully', { invoice }, 201);
});

const listInvoices = asyncHandler(async (req, res) => {
  const data = await billingService.listInvoices({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Invoices retrieved successfully', data);
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const data = await billingService.getInvoiceById({
    requester: req.user,
    invoiceId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Invoice retrieved successfully', data);
});

const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.updateInvoice({
    requester: req.user,
    invoiceId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Invoice updated successfully', { invoice });
});

const recordPayment = asyncHandler(async (req, res) => {
  const invoice = await billingService.recordPayment({
    requester: req.user,
    invoiceId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Payment recorded successfully', { invoice });
});

const recordRefund = asyncHandler(async (req, res) => {
  const invoice = await billingService.recordRefund({
    requester: req.user,
    invoiceId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Refund recorded successfully', { invoice });
});

const generateInvoicePdf = asyncHandler(async (req, res) => {
  const data = await billingService.generateInvoicePdfFile({
    requester: req.user,
    invoiceId: req.params.id,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Invoice PDF generated successfully', {
    invoice: data.invoice
  });
});

const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const { filePath } = await billingService.downloadInvoicePdf({
    requester: req.user,
    invoiceId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return res.download(filePath, path.basename(filePath));
});

const cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.cancelInvoice({
    requester: req.user,
    invoiceId: req.params.id,
    reason: req.body.reason,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Invoice cancelled successfully', { invoice });
});

const getPatientInvoices = asyncHandler(async (req, res) => {
  const data = await billingService.getPatientInvoices({
    requester: req.user,
    patientId: req.params.patientId,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Patient invoices retrieved successfully', data);
});

const getBillingSummary = asyncHandler(async (req, res) => {
  const summary = await billingService.getBillingSummary({
    requester: req.user,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Billing summary retrieved successfully', summary);
});

const createRazorpayOrder = asyncHandler(async (req, res) => {
  const data = await billingService.createRazorpayOrder({
    requester: req.user,
    invoiceId: req.params.id,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Razorpay order created successfully', data);
});

const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const data = await billingService.verifyRazorpayPayment({
    requester: req.user,
    invoiceId: req.params.id,
    payload: req.body,
    requestedClinicId: req.query.clinicId,
    req
  });

  return sendSuccess(res, 'Razorpay payment verified and recorded successfully', data);
});

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceById,
  updateInvoice,
  recordPayment,
  recordRefund,
  generateInvoicePdf,
  downloadInvoicePdf,
  cancelInvoice,
  getPatientInvoices,
  getBillingSummary,
  createRazorpayOrder,
  verifyRazorpayPayment
};
