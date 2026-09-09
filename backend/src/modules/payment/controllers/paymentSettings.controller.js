const { sendSuccess } = require('../../../common/utils/apiResponse');
const { asyncHandler } = require('../../../common/utils/asyncHandler');
const paymentSettingsService = require('../services/paymentSettings.service');

/**
 * @desc    Get administrative Payment Settings (Super Admin Only)
 * @route   GET /api/v1/admin/payment-settings
 * @access  Private (Super Admin)
 */
const getAdminPaymentSettings = asyncHandler(async (req, res) => {
  const activeSettings = await paymentSettingsService.getOrSeedActiveSettings();
  const decrypted = await paymentSettingsService.getDecryptedSettings(activeSettings);
  const recentChanges = await paymentSettingsService.getAuditHistory(10);

  return sendSuccess(res, 'Payment settings retrieved successfully', {
    paymentSettings: decrypted,
    recentChanges
  });
});

/**
 * @desc    Update administrative Bank Details & UPI (Super Admin Only)
 * @route   PUT /api/v1/admin/payment-settings
 * @access  Private (Super Admin)
 */
const updateAdminPaymentSettings = asyncHandler(async (req, res) => {
  const { accountName, bankName, accountNumber, ifscCode, branch, upiId, supportEmail, supportPhone } = req.body;

  const updated = await paymentSettingsService.updatePaymentSettings({
    accountName,
    bankName,
    accountNumber,
    ifscCode,
    branch,
    upiId,
    supportEmail,
    supportPhone,
    user: req.user,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent')
  });

  const recentChanges = await paymentSettingsService.getAuditHistory(10);

  return sendSuccess(res, 'Payment settings updated successfully', {
    paymentSettings: updated,
    recentChanges
  });
});

/**
 * @desc    Upload or Replace Payment QR Code (Super Admin Only)
 * @route   POST /api/v1/admin/payment-settings/qr
 * @access  Private (Super Admin)
 */
const uploadAdminQrCode = asyncHandler(async (req, res) => {
  const { base64Data, fileName, fileSize, detectedUpiId } = req.body;

  const updated = await paymentSettingsService.uploadQrCode({
    base64Data,
    fileName,
    fileSize,
    detectedUpiId,
    user: req.user,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent')
  });

  const recentChanges = await paymentSettingsService.getAuditHistory(10);

  return sendSuccess(res, 'Payment QR code uploaded successfully', {
    paymentSettings: updated,
    recentChanges
  });
});

/**
 * @desc    Remove Payment QR Code (Super Admin Only)
 * @route   DELETE /api/v1/admin/payment-settings/qr
 * @access  Private (Super Admin)
 */
const removeAdminQrCode = asyncHandler(async (req, res) => {
  const updated = await paymentSettingsService.removeQrCode({
    user: req.user,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent')
  });

  const recentChanges = await paymentSettingsService.getAuditHistory(10);

  return sendSuccess(res, 'Payment QR code removed successfully', {
    paymentSettings: updated,
    recentChanges
  });
});

/**
 * @desc    Get active payment details for clinic payment workflows (Registration, Plan Change, Renewal)
 * @route   GET /api/v1/payment-details
 * @access  Public / Authenticated Clinic
 */
const getPublicPaymentDetails = asyncHandler(async (req, res) => {
  const { amount, clinicCode, planName } = req.query;
  const paymentDetails = await paymentSettingsService.getSanitizedActiveDetails({
    amount,
    clinicCode,
    planName
  });

  return sendSuccess(res, 'Active payment details retrieved successfully', {
    paymentDetails
  });
});

module.exports = {
  getAdminPaymentSettings,
  updateAdminPaymentSettings,
  uploadAdminQrCode,
  removeAdminQrCode,
  getPublicPaymentDetails
};
