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
    user: await authService.getCurrentUser(req.user)
  });
});

const logout = asyncHandler(async (_req, res) => {
  return sendSuccess(res, 'Logout successful', {});
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body, req);
  return sendSuccess(res, data.message || 'Password changed successfully', data);
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const data = await authService.requestPasswordReset(req.body, req);
  return sendSuccess(res, data.message || 'OTP sent successfully', data);
});

const verifyPasswordReset = asyncHandler(async (req, res) => {
  const data = await authService.verifyPasswordReset(req.body, req);
  return sendSuccess(res, data.message || 'Password changed successfully', data);
});

const verifyFirstLoginOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyFirstLoginOtp(req.body, req);
  return sendSuccess(res, 'OTP verified and password updated successfully', data);
});

const sendLoginOtp = asyncHandler(async (req, res) => {
  const data = await authService.sendLoginOtp(req.body, req);
  return sendSuccess(res, data.message || 'OTP sent successfully', data);
});

const verifyLoginOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyLoginOtp(req.body, req);
  return sendSuccess(res, 'Login successful', data);
});

const sendClinicAdminOtp = asyncHandler(async (req, res) => {
  const data = await authService.sendClinicAdminOtp(req.body, req);
  return sendSuccess(res, data.message || 'OTP sent successfully', data);
});

const verifyClinicAdminOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyClinicAdminOtp(req.body, req);
  return sendSuccess(res, 'Login successful', data);
});

module.exports = {
  register,
  login,
  me,
  logout,
  resetPassword,
  requestPasswordReset,
  verifyPasswordReset,
  verifyFirstLoginOtp,
  sendLoginOtp,
  verifyLoginOtp,
  sendClinicAdminOtp,
  verifyClinicAdminOtp
};


