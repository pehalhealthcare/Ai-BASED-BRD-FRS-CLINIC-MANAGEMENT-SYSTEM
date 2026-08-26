const mongoose = require('mongoose');
const GlobalLabTest = require('../healthcare-catalog/globalLabTest.model');
const InvestigationParameter = require('../healthcare-catalog/investigationParameter.model');
const LabTest = require('../labs/labTest.model');
const Prescription = require('./prescription.model');
const LabOrder = require('../labs/labOrder.model');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');

/**
 * Searches global catalogue and resolves availability status for doctor consultation.
 */
const discoverLabTestsForDoctor = async ({ clinicId, search, category, department }) => {
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (department) filter.department = department;
  if (search) {
    const pattern = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: pattern }, { shortName: pattern }, { globalId: pattern }];
  }

  const globals = await GlobalLabTest.find(filter).populate('category').limit(20).lean();
  const globalIds = globals.map(g => g._id);

  // Load clinic actual configurations
  const clinicConfigs = await LabTest.find({
    clinicId,
    isActive: true,
    globalLabTestId: { $in: globalIds }
  }).lean();
  const clinicMap = new Map(clinicConfigs.map(c => [String(c.globalLabTestId), c]));

  // Load external estimated configs (all other clinics)
  const externalConfigs = await LabTest.find({
    clinicId: { $ne: clinicId },
    isActive: true,
    globalLabTestId: { $in: globalIds }
  }).lean();

  const externalMap = new Map();
  for (const ec of externalConfigs) {
    const gid = String(ec.globalLabTestId);
    if (!externalMap.has(gid)) {
      externalMap.set(gid, []);
    }
    externalMap.get(gid).push(ec);
  }

  // Trace parameter counts
  const mappings = await InvestigationParameter.find({ investigationId: { $in: globalIds } }).lean();
  const paramsCountMap = new Map();
  for (const m of mappings) {
    const invId = String(m.investigationId);
    paramsCountMap.set(invId, (paramsCountMap.get(invId) || 0) + 1);
  }

  return globals.map(g => {
    const gid = String(g._id);
    const local = clinicMap.get(gid);
    const externals = externalMap.get(gid) || [];
    const paramCount = paramsCountMap.get(gid) || 0;

    let availability = 'UNAVAILABLE';
    let price = 0;
    let tat = '';
    let estimatedPriceMin = 0;
    let estimatedPriceMax = 0;

    if (local) {
      availability = 'AVAILABLE';
      price = local.price || g.testPrice || 0;
      tat = local.turnaroundTime || g.normalReportingTime || '24 Hours';
    } else if (externals.length > 0) {
      availability = 'ALTERNATIVE_AVAILABLE';
      const prices = externals.map(e => e.price).filter(Boolean);
      estimatedPriceMin = Math.min(...prices, g.testPrice || 300);
      estimatedPriceMax = Math.max(...prices, g.testPrice || 500);
      tat = externals[0].turnaroundTime || '24-48 Hours';
    }

    return {
      _id: g._id,
      globalId: g.globalId,
      name: g.name,
      shortName: g.shortName,
      department: g.department,
      category: g.category?.name || '',
      sampleType: g.sampleType,
      parameterCount: paramCount,
      availability,
      price,
      tat,
      estimatedPriceRange: availability === 'ALTERNATIVE_AVAILABLE' ? `₹${estimatedPriceMin}–₹${estimatedPriceMax}` : null
    };
  });
};

/**
 * Intelligent package suggestions based on recommended tests.
 */
const getSmartSuggestions = async ({ clinicId, testIds }) => {
  if (!testIds || testIds.length === 0) return [];
  const selectedGlobals = await GlobalLabTest.find({ _id: { $in: testIds } }).lean();

  // Find all packages or panels that are active in this clinic's lab
  const packages = await LabTest.find({
    clinicId,
    isActive: true
  }).populate('globalLabTestId').lean();

  const suggestions = [];

  for (const pkg of packages) {
    const g = pkg.globalLabTestId;
    if (!g || g.investigationType !== 'PACKAGE') continue;

    // A package includes multiple parameter/tests. Let's see how many of the recommended tests are covered.
    const mappings = await InvestigationParameter.find({ investigationId: g._id }).populate('parameterId').lean();
    const coveredTests = selectedGlobals.filter(sg => 
      mappings.some(m => String(m.parameterId?._id) === String(sg._id))
    );

    if (coveredTests.length >= 2) {
      const packagePrice = pkg.price || g.testPrice || 1200;
      const individualTotal = selectedGlobals.reduce((sum, sg) => sum + (sg.testPrice || 350), 0);
      const savings = individualTotal - packagePrice;

      suggestions.push({
        packageId: pkg._id,
        name: g.name,
        code: pkg.code,
        price: packagePrice,
        coveredTestsCount: coveredTests.length,
        savings: savings > 0 ? savings : 0,
        includes: mappings.map(m => m.parameterId?.name).filter(Boolean)
      });
    }
  }

  return suggestions.sort((a, b) => b.coveredTestsCount - a.coveredTestsCount);
};

module.exports = {
  discoverLabTestsForDoctor,
  getSmartSuggestions
};
