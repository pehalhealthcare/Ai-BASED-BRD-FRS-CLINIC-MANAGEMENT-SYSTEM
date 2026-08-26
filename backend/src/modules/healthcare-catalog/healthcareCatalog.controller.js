const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const healthcareCatalogService = require('./healthcareCatalog.service');

// Category handlers
const getCategories = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getCategories(req.query.type);
  return sendSuccess(res, 'Categories retrieved successfully', result);
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, type, description } = req.body;
  if (!name || !type) {
    throw new AppError('Name and Type are required', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await healthcareCatalogService.createCategory({ name, type, description }, req.user._id);
  return sendSuccess(res, 'Category created successfully', result, HTTP_STATUS.CREATED);
});

// Lab Test handlers
const getLabTests = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getLabTests(req.query);
  return sendSuccess(res, 'Global laboratory tests retrieved successfully', result);
});

const createLabTest = asyncHandler(async (req, res) => {
  const { name, shortName, alternateNames, department, category, sampleType, sampleVolume, sampleContainer, methodology, clinicalDescription, patientPreparation, referenceRange, normalReportingTime, internalCode, loincCode, investigationType = 'ATOMIC_TEST', collectionInstructions } = req.body;

  if (!name || !department || !category || !sampleType || !normalReportingTime) {
    throw new AppError('Required fields: Name, Department, Category, Sample Type, Normal Reporting Time', HTTP_STATUS.BAD_REQUEST);
  }

  const validTypes = ['ATOMIC_TEST', 'PANEL', 'PROFILE', 'PACKAGE'];
  if (!validTypes.includes(investigationType)) {
    throw new AppError('Invalid investigation type', HTTP_STATUS.BAD_REQUEST);
  }

  const existing = await healthcareCatalogService.checkLabTestDuplicate(name, alternateNames, shortName, investigationType);
  if (existing && existing.type === 'EXACT') {
    const entityLabel = investigationType === 'PANEL' ? 'panel' : (investigationType === 'PROFILE' ? 'profile' : 'test');
    throw new AppError(`A ${entityLabel} with this name, short name or synonym already exists.`, HTTP_STATUS.CONFLICT);
  }

  const result = await healthcareCatalogService.createLabTest({ ...req.body, investigationType }, req.user._id);
  return sendSuccess(res, 'Global laboratory test created successfully', result, HTTP_STATUS.CREATED);
});

const updateLabTest = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.updateLabTest(req.params.id, req.body, req.user._id);
  return sendSuccess(res, 'Global laboratory test updated successfully', result);
});

// Generic Medicine handlers
const getGenericMedicines = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getGenericMedicines(req.query);
  return sendSuccess(res, 'Global generic medicines retrieved successfully', result);
});

const createGenericMedicine = asyncHandler(async (req, res) => {
  const { medicineType, displayName, name, genericName, brandName, strength, dosageForm, category, route } = req.body;

  const nameToCheck = genericName || brandName || displayName || name;
  if (!nameToCheck || !dosageForm || !category) {
    throw new AppError('Required fields: Name, Dosage Form, Category', HTTP_STATUS.BAD_REQUEST);
  }

  const existing = await healthcareCatalogService.checkMedicineDuplicate({
    name: nameToCheck,
    brandName,
    genericName,
    dosageForm
  });
  if (existing && existing.type === 'EXACT') {
    throw new AppError('A medicine with this name and dosage form already exists', HTTP_STATUS.CONFLICT);
  }

  const result = await healthcareCatalogService.createGenericMedicine(req.body, req.user._id);
  return sendSuccess(res, 'Global medicine created successfully', result, HTTP_STATUS.CREATED);
});

const updateGenericMedicine = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.updateGenericMedicine(req.params.id, req.body, req.user._id);
  return sendSuccess(res, 'Global generic medicine updated successfully', result);
});

// Brand handlers
const getBrands = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getBrands(req.query);
  return sendSuccess(res, 'Global brands retrieved successfully', result);
});

const createBrand = asyncHandler(async (req, res) => {
  const { name, manufacturer, genericMedicineId, packSize, barcode } = req.body;

  if (!name || !manufacturer || !genericMedicineId) {
    throw new AppError('Required fields: Name, Manufacturer, Generic Medicine Reference', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await healthcareCatalogService.createBrand(req.body, req.user._id);
  return sendSuccess(res, 'Global brand mapping created successfully', result, HTTP_STATUS.CREATED);
});

// Import Engine pre-flight validation and matching
const previewImport = asyncHandler(async (req, res) => {
  const { fileData, importType, fileName } = req.body;

  if (!fileData || !importType) {
    throw new AppError('File data (base64) and Import Type are required', HTTP_STATUS.BAD_REQUEST);
  }

  const preview = await healthcareCatalogService.previewImport(fileData, importType, fileName);
  return sendSuccess(res, 'Import preview generated successfully', preview);
});

// Confirm import execution with user decision map
const confirmImport = asyncHandler(async (req, res) => {
  const { items, importType, batchName, fileName } = req.body;

  if (!items || !importType) {
    throw new AppError('Items array and Import Type are required', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await healthcareCatalogService.confirmImport(items, importType, req.user._id, batchName, fileName);
  return sendSuccess(res, 'Import completed successfully', result);
});

const classifyMedicine = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.classifyMedicine(req.params.id, req.body, req.user._id);
  return sendSuccess(res, 'Medicine classified and verified successfully', result);
});

const createMedicineDraft = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    classificationStatus: 'Pending Classification'
  };
  const result = await healthcareCatalogService.createGenericMedicine(payload, req.user._id);
  return sendSuccess(res, 'Draft medicine created and submitted for verification successfully', result, HTTP_STATUS.CREATED);
});

const createLabTestDraft = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    isActive: false
  };
  const result = await healthcareCatalogService.createLabTest(payload, req.user._id);
  return sendSuccess(res, 'Draft laboratory test created and submitted for verification successfully', result, HTTP_STATUS.CREATED);
});

const deleteGenericMedicine = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.deleteGenericMedicine(req.params.id, req.user._id);
  return sendSuccess(res, 'Global generic medicine deleted successfully', result);
});

// Global Parameters Handlers
const getParameters = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getParameters(req.query);
  return sendSuccess(res, 'Global parameters retrieved successfully', result);
});

const createParameter = asyncHandler(async (req, res) => {
  const { name, resultType } = req.body;
  if (!name || !resultType) {
    throw new AppError('Name and Result Type are required', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await healthcareCatalogService.createParameter(req.body, req.user._id);
  return sendSuccess(res, 'Global parameter created successfully', result, HTTP_STATUS.CREATED);
});

const updateParameter = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.updateParameter(req.params.id, req.body, req.user._id);
  return sendSuccess(res, 'Global parameter updated successfully', result);
});

// Mappings Handlers
const getParametersForInvestigation = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getParametersForInvestigation(req.params.investigationId);
  return sendSuccess(res, 'Parameters for investigation retrieved successfully', result);
});

const mapParameterToInvestigation = asyncHandler(async (req, res) => {
  const { parameterId } = req.body;
  if (!parameterId) {
    throw new AppError('Parameter ID is required', HTTP_STATUS.BAD_REQUEST);
  }
  const payload = {
    ...req.body,
    investigationId: req.params.investigationId
  };
  const result = await healthcareCatalogService.mapParameterToInvestigation(payload, req.user._id);
  return sendSuccess(res, 'Parameter mapped to investigation successfully', result);
});

const unmapParameterFromInvestigation = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.unmapParameterFromInvestigation(req.params.investigationId, req.params.parameterId, req.user._id);
  return sendSuccess(res, 'Parameter unmapped from investigation successfully', result);
});

const reorderInvestigationParameters = asyncHandler(async (req, res) => {
  const { orderArray } = req.body;
  if (!orderArray || !Array.isArray(orderArray)) {
    throw new AppError('orderArray is required and must be an array', HTTP_STATUS.BAD_REQUEST);
  }
  const result = await healthcareCatalogService.reorderInvestigationParameters(req.params.investigationId, orderArray, req.user._id);
  return sendSuccess(res, 'Investigation parameters reordered successfully', result);
});

const resolveInvestigationComposition = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.resolveInvestigationComposition(req.params.investigationId);
  return sendSuccess(res, 'Investigation composition resolved successfully', result);
});

const getUnits = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getUnits();
  return sendSuccess(res, 'Global laboratory units retrieved successfully', result);
});

const createUnit = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.createUnit(req.body);
  return sendSuccess(res, 'Global laboratory unit created successfully', result, HTTP_STATUS.CREATED);
});

const getConditions = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getConditions();
  return sendSuccess(res, 'Reference range conditions retrieved successfully', result);
});

const createCondition = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.createCondition(req.body);
  return sendSuccess(res, 'Reference range condition created successfully', result, HTTP_STATUS.CREATED);
});

const getCatalogueUpdates = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.getCatalogueUpdates();
  return sendSuccess(res, 'Catalogue updates retrieved successfully', result);
});

const importCatalogueUpdate = asyncHandler(async (req, res) => {
  const result = await healthcareCatalogService.importCatalogueUpdate(req.body, req.user._id);
  return sendSuccess(res, 'Catalogue update imported successfully', result, HTTP_STATUS.CREATED);
});

const applyCatalogueUpdate = asyncHandler(async (req, res) => {
  const { approvedChangeIds = [] } = req.body;
  const result = await healthcareCatalogService.applyCatalogueUpdate(req.params.id, approvedChangeIds, req.user._id);
  return sendSuccess(res, 'Catalogue update applied successfully', result);
});

const getParameterClinicalRules = asyncHandler(async (req, res) => {
  const parameter = await healthcareCatalogService.getParameterById(req.params.id);
  if (!parameter) {
    throw new AppError('Global parameter not found', HTTP_STATUS.NOT_FOUND);
  }
  return sendSuccess(res, 'Parameter clinical rules retrieved successfully', {
    resultType: parameter.resultType,
    unit: parameter.defaultUnitId,
    decimalPrecision: parameter.decimalPrecision,
    technicalMin: parameter.technicalMin,
    technicalMax: parameter.technicalMax,
    criticalLow: parameter.criticalLow,
    criticalHigh: parameter.criticalHigh,
    referenceRanges: parameter.referenceRanges,
    allowedValues: parameter.allowedValues
  });
});

const validateParameterResult = asyncHandler(async (req, res) => {
  const { value, patientContext = {}, specimenContext = {} } = req.body;
  const parameter = await healthcareCatalogService.getParameterById(req.params.id);
  if (!parameter) {
    throw new AppError('Global parameter not found', HTTP_STATUS.NOT_FOUND);
  }
  const { classifyResult } = require('./resultValidation.service');
  const result = classifyResult(parameter, value, patientContext, specimenContext);
  return sendSuccess(res, 'Result validated and classified successfully', result);
});

module.exports = {
  getParameterClinicalRules,
  validateParameterResult,
  getCategories,
  createCategory,
  getLabTests,
  createLabTest,
  updateLabTest,
  getGenericMedicines,
  createGenericMedicine,
  updateGenericMedicine,
  deleteGenericMedicine,
  getBrands,
  createBrand,
  previewImport,
  confirmImport,
  classifyMedicine,
  createMedicineDraft,
  createLabTestDraft,
  getParameters,
  createParameter,
  updateParameter,
  getParametersForInvestigation,
  mapParameterToInvestigation,
  unmapParameterFromInvestigation,
  reorderInvestigationParameters,
  resolveInvestigationComposition,
  getUnits,
  createUnit,
  getConditions,
  createCondition,
  getCatalogueUpdates,
  importCatalogueUpdate,
  applyCatalogueUpdate
};
