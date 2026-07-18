const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const providerService = require('./provider.service');
const Clinic = require('../clinics/clinic.model');

const createProvider = asyncHandler(async (req, res) => {
  const { name, providerType, contactPerson, phone, email, address } = req.body;

  if (!name || !providerType || !contactPerson || !phone || !email || !address) {
    throw new AppError('Missing required fields for operational unit', HTTP_STATUS.BAD_REQUEST);
  }

  const payload = {
    providerSubtype: 'Internal',
    providerCategory: 'Own Provider',
    ...req.body
  };

  const result = await providerService.createProvider(req.user.clinicId, payload, req.user._id);
  return sendSuccess(res, 'Provider created successfully', result, HTTP_STATUS.CREATED);
});

const getProviders = asyncHandler(async (req, res) => {
  const result = await providerService.getProviders(req.user.clinicId, req.query);
  return sendSuccess(res, 'Providers retrieved successfully', result);
});

const getProvider = asyncHandler(async (req, res) => {
  const result = await providerService.getProviderById(req.user.clinicId, req.params.id);
  return sendSuccess(res, 'Provider retrieved successfully', result);
});

const updateProvider = asyncHandler(async (req, res) => {
  const result = await providerService.updateProvider(req.user.clinicId, req.params.id, req.body, req.user._id);
  return sendSuccess(res, 'Provider updated successfully', result);
});

const archiveProvider = asyncHandler(async (req, res) => {
  const result = await providerService.archiveProvider(req.user.clinicId, req.params.id, req.user._id);
  return sendSuccess(res, 'Provider archived successfully', result);
});

const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new AppError('Status is required', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await providerService.changeStatus(req.user.clinicId, req.params.id, status, req.user._id);
  return sendSuccess(res, 'Provider status updated successfully', result);
});

const getClinicBranches = asyncHandler(async (req, res) => {
  const branches = await Clinic.find({
    $or: [
      { _id: req.user.clinicId },
      { parentClinicId: req.user.clinicId }
    ],
    isActive: true
  }).select('name code');
  return sendSuccess(res, 'Clinic branches retrieved successfully', branches);
});

module.exports = {
  createProvider,
  getProviders,
  getProvider,
  updateProvider,
  archiveProvider,
  changeStatus,
  getClinicBranches
};
