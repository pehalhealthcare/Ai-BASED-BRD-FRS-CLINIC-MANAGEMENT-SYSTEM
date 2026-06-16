const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const userService = require('./user.service');

const listUsers = asyncHandler(async (req, res) => {
  const data = await userService.listUsers(req.query);
  return sendSuccess(res, 'Users retrieved successfully', data);
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById({
    requester: req.user,
    userId: req.params.id
  });

  return sendSuccess(res, 'User retrieved successfully', { user });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const user = await userService.updateUserRole({
    requester: req.user,
    userId: req.params.id,
    role: req.body.role,
    req
  });

  return sendSuccess(res, 'User role updated successfully', { user });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateUserStatus({
    requester: req.user,
    userId: req.params.id,
    isActive: req.body.isActive,
    req
  });

  return sendSuccess(res, 'User status updated successfully', { user });
});

module.exports = {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus
};
