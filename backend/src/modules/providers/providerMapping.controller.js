const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const mappingService = require('./providerMapping.service');

const createMapping = asyncHandler(async (req, res) => {
  const { providerId, mappingType, providerCode, providerName } = req.body;

  if (!providerId || !mappingType || !providerCode || !providerName) {
    throw new AppError('Provider ID, Mapping Type, Code and Name are required', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await mappingService.createMapping(req.user.clinicId, req.body, req.user._id);
  return sendSuccess(res, 'Provider mapping registered successfully', result, HTTP_STATUS.CREATED);
});

const getMappings = asyncHandler(async (req, res) => {
  const result = await mappingService.getMappings(req.user.clinicId, req.params.providerId, req.query);
  return sendSuccess(res, 'Provider mappings retrieved successfully', result);
});

const updateMapping = asyncHandler(async (req, res) => {
  const result = await mappingService.updateMapping(req.user.clinicId, req.params.id, req.body, req.user._id);
  return sendSuccess(res, 'Provider mapping updated successfully', result);
});

const deleteMapping = asyncHandler(async (req, res) => {
  const result = await mappingService.deleteMapping(req.user.clinicId, req.params.id, req.user._id);
  return sendSuccess(res, 'Provider mapping deleted successfully', result);
});

const previewImportMapping = asyncHandler(async (req, res) => {
  const { fileData, mappingType, providerId } = req.body;
  if (!fileData || !mappingType || !providerId) {
    throw new AppError('File data, Mapping Type, and Provider ID are required', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await mappingService.previewImportMapping(req.user.clinicId, providerId, fileData, mappingType);
  return sendSuccess(res, 'Import preview generated successfully', result);
});

module.exports = {
  createMapping,
  getMappings,
  updateMapping,
  deleteMapping,
  previewImportMapping
};
