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

module.exports = {
  getMyProfile,
  updateMyProfile,
  submitMyProfile,
  acceptMySlot
};
