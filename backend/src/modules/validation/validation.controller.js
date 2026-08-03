const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const User = require('../users/user.model');
const Provider = require('../providers/provider.model');
const Clinic = require('../clinics/clinic.model');

/**
 * GET /validation/email
 * Validates email uniqueness across User, Provider, and Clinic Owner records.
 */
const validateEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    throw new AppError('Email query parameter is required', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanEmail = email.toLowerCase().trim();

  // 1. Check User collection
  const existingUser = await User.findOne({ email: cleanEmail }).select('role');
  if (existingUser) {
    let typeName = 'User';
    if (existingUser.role === 'doctor') typeName = 'Doctor';
    else if (existingUser.role === 'staff') typeName = 'Staff';
    else if (existingUser.role === 'receptionist') typeName = 'Receptionist';
    else if (existingUser.role === 'clinic_admin') typeName = 'Clinic Admin';
    else if (existingUser.role === 'super_admin') typeName = 'Super Admin';
    else if (existingUser.role === 'patient') typeName = 'Patient';

    return sendSuccess(res, 'Validation checked', {
      exists: true,
      accountType: typeName
    });
  }

  // 2. Check Provider collection
  const existingProvider = await Provider.findOne({ email: cleanEmail }).select('providerType');
  if (existingProvider) {
    return sendSuccess(res, 'Validation checked', {
      exists: true,
      accountType: existingProvider.providerType || 'Provider'
    });
  }

  // 3. Check Clinic Owners
  const existingClinicOwner = await Clinic.findOne({ 'ownerDetails.email': cleanEmail }).select('name');
  if (existingClinicOwner) {
    return sendSuccess(res, 'Validation checked', {
      exists: true,
      accountType: 'Clinic Owner'
    });
  }

  return sendSuccess(res, 'Validation checked', {
    exists: false
  });
});

/**
 * GET /validation/phone
 * Validates phone number uniqueness across User, Provider, and Clinic Owner records.
 */
const validatePhone = asyncHandler(async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    throw new AppError('Phone query parameter is required', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanPhone = phone.replace(/\D/g, '').trim();

  // 1. Check User collection
  const existingUser = await User.findOne({ phone: cleanPhone }).select('role');
  if (existingUser) {
    let typeName = 'User';
    if (existingUser.role === 'doctor') typeName = 'Doctor';
    else if (existingUser.role === 'staff') typeName = 'Staff';
    else if (existingUser.role === 'receptionist') typeName = 'Receptionist';
    else if (existingUser.role === 'clinic_admin') typeName = 'Clinic Admin';
    else if (existingUser.role === 'super_admin') typeName = 'Super Admin';
    else if (existingUser.role === 'patient') typeName = 'Patient';

    return sendSuccess(res, 'Validation checked', {
      exists: true,
      accountType: typeName
    });
  }

  // 2. Check Provider collection
  const existingProvider = await Provider.findOne({ phone: cleanPhone }).select('providerType');
  if (existingProvider) {
    return sendSuccess(res, 'Validation checked', {
      exists: true,
      accountType: existingProvider.providerType || 'Provider'
    });
  }

  // 3. Check Clinic Owners
  const existingClinicOwner = await Clinic.findOne({ 'ownerDetails.phone': cleanPhone }).select('name');
  if (existingClinicOwner) {
    return sendSuccess(res, 'Validation checked', {
      exists: true,
      accountType: 'Clinic Owner'
    });
  }

  return sendSuccess(res, 'Validation checked', {
    exists: false
  });
});

module.exports = {
  validateEmail,
  validatePhone
};
