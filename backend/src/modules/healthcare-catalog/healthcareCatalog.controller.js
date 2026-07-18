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
  const { name, shortName, alternateNames, department, category, sampleType, sampleVolume, sampleContainer, methodology, clinicalDescription, patientPreparation, referenceRange, normalReportingTime, internalCode, loincCode } = req.body;

  if (!name || !department || !category || !sampleType || !normalReportingTime) {
    throw new AppError('Required fields: Name, Department, Category, Sample Type, Normal Reporting Time', HTTP_STATUS.BAD_REQUEST);
  }

  const existing = await healthcareCatalogService.checkLabTestDuplicate(name, alternateNames, shortName);
  if (existing && existing.type === 'EXACT') {
    throw new AppError('A test with this name, short name or synonym already exists', HTTP_STATUS.CONFLICT);
  }

  const result = await healthcareCatalogService.createLabTest(req.body, req.user._id);
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

module.exports = {
  getCategories,
  createCategory,
  getLabTests,
  createLabTest,
  updateLabTest,
  getGenericMedicines,
  createGenericMedicine,
  updateGenericMedicine,
  getBrands,
  createBrand,
  previewImport,
  confirmImport,
  classifyMedicine,
  createMedicineDraft,
  createLabTestDraft
};
