const staffService = require('./staff.service');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { sendSuccess } = require('../../common/utils/apiResponse');

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await staffService.getMyProfile({ requester: req.user });
  return sendSuccess(res, 'Staff profile retrieved successfully', { profile });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await staffService.updateMyProfile({
    requester: req.user,
    payload: req.body
  });
  return sendSuccess(res, 'Staff profile updated successfully', { profile });
});

const submitMyProfile = asyncHandler(async (req, res) => {
  const profile = await staffService.submitMyProfile({
    requester: req.user,
    payload: req.body
  });
  return sendSuccess(res, 'Staff profile submitted for approval successfully', { profile });
});

const acceptMySlot = asyncHandler(async (req, res) => {
  const profile = await staffService.acceptMySlot({ requester: req.user });
  return sendSuccess(res, 'Staff offer accepted successfully', { profile });
});

const getOnboardingDetailsByToken = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const data = await staffService.getOnboardingDetailsByToken(token);
  return sendSuccess(res, 'Onboarding details retrieved successfully', data);
});

const submitOnboardingByToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const data = await staffService.submitOnboardingByToken({ token, payload: req.body });
  return sendSuccess(res, 'Onboarding profile submitted successfully', data);
});

const acceptOfferByToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const data = await staffService.acceptOfferByToken(token);
  return sendSuccess(res, 'Offer accepted successfully', data);
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  submitMyProfile,
  acceptMySlot,
  getOnboardingDetailsByToken,
  submitOnboardingByToken,
  acceptOfferByToken
};
