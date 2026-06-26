const billingService = require('../services/billing.service');
const { sendSuccess } = require('../../../common/utils/apiResponse');
const { asyncHandler } = require('../../../common/utils/asyncHandler');

const createAppointmentInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.createInvoice({
    ...req.body,
    serviceType: 'CONSULTATION',
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Appointment Invoice created successfully', { invoice }, 201);
});

const createPharmacyInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.createInvoice({
    ...req.body,
    serviceType: 'PHARMACY',
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Pharmacy Invoice created successfully', { invoice }, 201);
});

const createLabInvoice = asyncHandler(async (req, res) => {
  const invoice = await billingService.createInvoice({
    ...req.body,
    serviceType: 'LAB',
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Lab Invoice created successfully', { invoice }, 201);
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await billingService.getInvoiceById(req.params.id);
  return sendSuccess(res, 'Invoice retrieved successfully', { invoice });
});

const getInvoicesByPatient = asyncHandler(async (req, res) => {
  const invoices = await billingService.getInvoicesByPatient(req.params.patientId);
  return sendSuccess(res, 'Patient invoices retrieved successfully', { invoices });
});

const getInvoicesByOrganization = asyncHandler(async (req, res) => {
  const invoices = await billingService.getInvoicesByOrganization(req.params.organizationId);
  return sendSuccess(res, 'Organization invoices retrieved successfully', { invoices });
});

module.exports = {
  createAppointmentInvoice,
  createPharmacyInvoice,
  createLabInvoice,
  getInvoiceById,
  getInvoicesByPatient,
  getInvoicesByOrganization
};
