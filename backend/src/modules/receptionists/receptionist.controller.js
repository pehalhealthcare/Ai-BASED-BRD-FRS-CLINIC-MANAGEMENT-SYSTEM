const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const receptionistService = require('./receptionist.service');

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await receptionistService.getMyProfile({ requester: req.user });
  return sendSuccess(res, 'Receptionist profile retrieved successfully', { profile });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await receptionistService.updateMyProfile({
    requester: req.user,
    payload: req.body
  });
  return sendSuccess(res, 'Receptionist profile updated successfully', { profile });
});

const submitMyProfile = asyncHandler(async (req, res) => {
  const profile = await receptionistService.submitMyProfile({
    requester: req.user,
    payload: req.body
  });
  return sendSuccess(res, 'Receptionist profile submitted for approval successfully', { profile });
});

const acceptMySlot = asyncHandler(async (req, res) => {
  const profile = await receptionistService.acceptMySlot({ requester: req.user });
  return sendSuccess(res, 'Receptionist schedule and clinic details accepted successfully', { profile });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  submitMyProfile,
  acceptMySlot
};
