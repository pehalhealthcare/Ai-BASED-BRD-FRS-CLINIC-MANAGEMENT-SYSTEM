const { sendSuccess } = require('../../../common/utils/apiResponse');
const { asyncHandler } = require('../../../common/utils/asyncHandler');
const insuranceService = require('../services/insurance.service');

const listProviders = asyncHandler(async (req, res) => {
  const providers = await insuranceService.listProviders();
  return sendSuccess(res, 'Providers retrieved successfully', { providers });
});

const getProviderById = asyncHandler(async (req, res) => {
  const provider = await insuranceService.getProviderById(req.params.id);
  return sendSuccess(res, 'Provider details retrieved successfully', { provider });
});

const verifyPolicy = asyncHandler(async (req, res) => {
  const { providerCode, policyNumber } = req.body;
  const result = await insuranceService.verifyPolicy({
    providerCode,
    policyNumber,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Policy verification completed', result);
});

const getCoverage = asyncHandler(async (req, res) => {
  const { policyNumber } = req.params;
  const coverage = await insuranceService.getCoverage({
    policyNumber,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Policy benefits coverage retrieved successfully', coverage);
});

const submitClaim = asyncHandler(async (req, res) => {
  const claim = await insuranceService.submitClaim({
    payload: req.body,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Claim submitted and registered successfully', { claim }, 201);
});

const getClaimStatus = asyncHandler(async (req, res) => {
  const claim = await insuranceService.getClaimStatus({ claimId: req.params.claimId });
  return sendSuccess(res, 'Claim details retrieved successfully', { claim });
});

const approveClaim = asyncHandler(async (req, res) => {
  const { claimId } = req.params;
  const { approvedAmount } = req.body;
  const claim = await insuranceService.approveClaim({
    claimId,
    approvedAmount,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Claim approved successfully', { claim });
});

const rejectClaim = asyncHandler(async (req, res) => {
  const { claimId } = req.params;
  const { rejectionReason } = req.body;
  const claim = await insuranceService.rejectClaim({
    claimId,
    rejectionReason,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Claim rejected successfully', { claim });
});

const listClaims = asyncHandler(async (req, res) => {
  const data = await insuranceService.listClaims({ query: req.query });
  return sendSuccess(res, 'Claims retrieved successfully', data);
});

// Patient policy handlers
const getPatientInsurance = asyncHandler(async (req, res) => {
  const policy = await insuranceService.getPatientInsurance(req.params.patientId);
  return sendSuccess(res, 'Patient insurance policy retrieved', { policy });
});

const createPatientInsurance = asyncHandler(async (req, res) => {
  const policy = await insuranceService.createPatientInsurance(
    req.params.patientId,
    req.body,
    req.user,
    req
  );
  return sendSuccess(res, 'Insurance policy linked successfully', { policy }, 201);
});

const updatePatientInsurance = asyncHandler(async (req, res) => {
  const policy = await insuranceService.updatePatientInsurance(
    req.params.patientId,
    req.body,
    req.user,
    req
  );
  return sendSuccess(res, 'Insurance policy updated successfully', { policy });
});

const deletePatientInsurance = asyncHandler(async (req, res) => {
  const result = await insuranceService.deletePatientInsurance(
    req.params.patientId,
    req.user,
    req
  );
  return sendSuccess(res, result.message, null);
});

module.exports = {
  listProviders,
  getProviderById,
  verifyPolicy,
  getCoverage,
  submitClaim,
  getClaimStatus,
  approveClaim,
  rejectClaim,
  listClaims,
  getPatientInsurance,
  createPatientInsurance,
  updatePatientInsurance,
  deletePatientInsurance
};
