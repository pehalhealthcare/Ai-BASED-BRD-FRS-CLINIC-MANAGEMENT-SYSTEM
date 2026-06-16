const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body, req);
  return sendSuccess(res, 'User registered successfully', data, 201);
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body, req);
  return sendSuccess(res, 'Login successful', data);
});

const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Current user retrieved successfully', {
    user: authService.getCurrentUser(req.user)
  });
});

const logout = asyncHandler(async (_req, res) => {
  return sendSuccess(res, 'Logout successful', {});
});

module.exports = {
  register,
  login,
  me,
  logout
};
