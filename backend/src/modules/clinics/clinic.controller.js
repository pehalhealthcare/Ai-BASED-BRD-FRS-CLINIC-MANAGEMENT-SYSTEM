const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const Clinic = require('./clinic.model');

const User = require('../users/user.model');

const createClinic = asyncHandler(async (req, res) => {
  const { name, code, image, phone, email, password, parentClinicId, address } = req.body;

  // Check if clinic code exists
  const existingClinic = await Clinic.findOne({ code: code.toUpperCase() });
  if (existingClinic) {
    throw new AppError('Clinic code already exists', HTTP_STATUS.CONFLICT);
  }

  // Check if email already exists for user
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('User with this email already exists', HTTP_STATUS.CONFLICT);
  }

  if (parentClinicId) {
    const parentClinic = await Clinic.findById(parentClinicId);
    if (!parentClinic) {
      throw new AppError('Parent clinic not found', HTTP_STATUS.NOT_FOUND);
    }
  }

  const clinic = await Clinic.create({
    name,
    code: code.toUpperCase(),
    image: image || '',
    phone: phone || '',
    parentClinicId: parentClinicId || null,
    address: address || {},
    organizationId: req.user?.organizationId || null
  });

  // Create receptionist user
  const user = await User.create({
    name: `${name} Manager`,
    email: email.toLowerCase(),
    password,
    role: ROLES.RECEPTIONIST,
    clinicId: clinic._id,
    organizationId: req.user?.organizationId || null,
    isActive: true,
    approvalStatus: 'approved'
  });

  return sendSuccess(res, 'Clinic created successfully', { clinic, user }, 201);
});

const listClinics = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.user?.role === ROLES.ADMIN && req.user?.organizationId) {
    filter.organizationId = req.user.organizationId;
  }
  const clinics = await Clinic.find(filter).populate('parentClinicId', 'name code');
  return sendSuccess(res, 'Clinics retrieved successfully', { clinics });
});

module.exports = {
  createClinic,
  listClinics
};
