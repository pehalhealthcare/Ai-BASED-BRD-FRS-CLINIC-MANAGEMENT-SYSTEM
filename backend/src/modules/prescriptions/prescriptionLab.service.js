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
const discoverLabTestsForDoctor = async ({ clinicId, search, category, department, requester }) => {
  const labService = require('../labs/lab.service');
  const res = await labService.searchAllLabs({
    requester: requester || { clinicId },
    query: { clinicId, search, category, department },
    requestedClinicId: clinicId
  });
  return res.results;
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
