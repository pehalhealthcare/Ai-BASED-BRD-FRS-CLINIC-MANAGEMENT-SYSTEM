const Organization = require('./organization.model');
const User = require('../users/user.model');
const Clinic = require('../clinics/clinic.model');
const Doctor = require('../doctors/doctor.model');
const Patient = require('../patients/patient.model');
const Invoice = require('../billing/invoice.model');
const PharmacySale = require('../pharmacy/pharmacySale.model');
const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');

const createOrganization = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if organization or user exists
  const existingOrg = await Organization.findOne({ email: email.toLowerCase() });
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingOrg || existingUser) {
    throw new AppError('Organization/User with this email already exists', HTTP_STATUS.CONFLICT);
  }

  // Create Organization
  const organization = await Organization.create({
    name,
    email: email.toLowerCase(),
    isActive: true
  });

  // Create corresponding ADMIN user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: ROLES.ADMIN,
    organizationId: organization._id,
    isActive: true,
    approvalStatus: 'approved'
  });

  return sendSuccess(res, 'Organization created successfully', { organization, user }, 201);
});

const listOrganizations = asyncHandler(async (req, res) => {
  const organizations = await Organization.find();
  return sendSuccess(res, 'Organizations retrieved successfully', { organizations });
});

const getOrganizationDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await Organization.findById(id);

  if (!organization) {
    throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);
  }

  // Fetch clinics in this organization
  const clinics = await Clinic.find({ organizationId: organization._id });

  const clinicData = [];
  let totalRevenue = 0;
  let totalPatients = 0;
  let totalDoctors = 0;

  for (const clinic of clinics) {
    const doctorCount = await Doctor.countDocuments({ clinicId: clinic._id, isActive: true });
    const patientCount = await Patient.countDocuments({ clinicId: clinic._id });

    // Aggregate Invoice Revenue
    const invoices = await Invoice.aggregate([
      { $match: { clinicId: clinic._id, invoiceStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const invRev = invoices[0]?.total || 0;

    // Aggregate Pharmacy Revenue
    const pharmacySales = await PharmacySale.aggregate([
      { $match: { clinicId: clinic._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pharmRev = pharmacySales[0]?.total || 0;

    const clinicRevenue = invRev + pharmRev;

    totalRevenue += clinicRevenue;
    totalPatients += patientCount;
    totalDoctors += doctorCount;

    clinicData.push({
      _id: clinic._id,
      name: clinic.name,
      code: clinic.code,
      phone: clinic.phone,
      address: clinic.address,
      image: clinic.image,
      isActive: clinic.isActive,
      doctorCount,
      patientCount,
      revenue: clinicRevenue
    });
  }

  return sendSuccess(res, 'Organization metrics retrieved successfully', {
    organization: {
      _id: organization._id,
      name: organization.name,
      email: organization.email,
      isActive: organization.isActive,
      createdAt: organization.createdAt
    },
    metrics: {
      totalClinics: clinics.length,
      totalRevenue,
      totalPatients,
      totalDoctors,
      clinics: clinicData
    }
  });
});

const updateOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  const organization = await Organization.findById(id);
  if (!organization) {
    throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);
  }

  const oldEmail = organization.email;

  if (email && email.toLowerCase() !== oldEmail) {
    const existingOrg = await Organization.findOne({ email: email.toLowerCase() });
    const existingUser = await User.findOne({ email: email.toLowerCase(), organizationId: { $ne: organization._id } });

    if (existingOrg || existingUser) {
      throw new AppError('Email is already in use by another organization or user', HTTP_STATUS.CONFLICT);
    }
  }

  if (name) organization.name = name;
  if (email) organization.email = email.toLowerCase();
  await organization.save();

  // Sync with Admin User
  const adminUser = await User.findOne({ organizationId: organization._id, role: ROLES.ADMIN });
  if (adminUser) {
    if (name) adminUser.name = name;
    if (email) adminUser.email = email.toLowerCase();
    if (password) adminUser.password = password; // pre-save hook will hash it
    await adminUser.save();
  }

  return sendSuccess(res, 'Organization updated successfully', { organization });
});

const toggleOrganizationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new AppError('isActive field must be a boolean', HTTP_STATUS.BAD_REQUEST);
  }

  const organization = await Organization.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!organization) {
    throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);
  }

  // Deactivate/activate corresponding Admin user
  await User.updateMany({ organizationId: organization._id }, { isActive });

  return sendSuccess(res, `Organization ${isActive ? 'enabled' : 'disabled'} successfully`, { organization });
});

const getMyOrganizationProfile = asyncHandler(async (req, res) => {
  if (!req.user.organizationId) {
    throw new AppError('User is not associated with an organization', HTTP_STATUS.BAD_REQUEST);
  }

  const organization = await Organization.findById(req.user.organizationId);
  if (!organization) {
    throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);
  }

  return sendSuccess(res, 'Organization profile retrieved successfully', { organization });
});

const updateMyOrganizationProfile = asyncHandler(async (req, res) => {
  if (!req.user.organizationId) {
    throw new AppError('User is not associated with an organization', HTTP_STATUS.BAD_REQUEST);
  }

  const organization = await Organization.findById(req.user.organizationId);
  if (!organization) {
    throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);
  }

  const {
    name,
    logo,
    headOfficeImage,
    headOfficeAddress,
    headOfficeEmail,
    headOfficePassword,
    mission,
    achievements,
    facilities
  } = req.body;

  if (name) {
    organization.name = name;
    // Sync to user record
    await User.updateOne({ _id: req.user._id }, { name });
  }
  if (logo !== undefined) organization.logo = logo;
  if (headOfficeImage !== undefined) organization.headOfficeImage = headOfficeImage;
  if (headOfficeAddress !== undefined) organization.headOfficeAddress = headOfficeAddress;
  if (mission !== undefined) organization.mission = mission;
  if (achievements !== undefined) organization.achievements = achievements;
  if (facilities !== undefined) organization.facilities = facilities;

  if (headOfficeEmail) {
    const oldEmail = organization.headOfficeEmail;
    organization.headOfficeEmail = headOfficeEmail.toLowerCase();

    // Check / Sync with Headquarters clinic
    let hqClinic = await Clinic.findOne({ organizationId: organization._id, isHeadquarters: true });
    const hqCode = `HQ-${(name || organization.name).substring(0, 3).toUpperCase()}`;

    if (!hqClinic) {
      hqClinic = await Clinic.create({
        name: `${name || organization.name} Headquarters`,
        code: hqCode,
        image: headOfficeImage || logo || '',
        phone: '9999999999',
        isHeadquarters: true,
        organizationId: organization._id,
        address: headOfficeAddress || {}
      });
    } else {
      hqClinic.name = `${name || organization.name} Headquarters`;
      hqClinic.image = headOfficeImage || logo || hqClinic.image;
      if (headOfficeAddress) hqClinic.address = headOfficeAddress;
      await hqClinic.save();
    }

    // Now find or create HQ Receptionist/Manager User
    let hqUser = await User.findOne({ clinicId: hqClinic._id, role: ROLES.RECEPTIONIST });
    if (!hqUser) {
      // Check if email already in use
      const existingUser = await User.findOne({ email: headOfficeEmail.toLowerCase() });
      if (existingUser) {
        throw new AppError('Headquarters login email is already in use by another user', HTTP_STATUS.CONFLICT);
      }
      if (!headOfficePassword) {
        throw new AppError('Password is required to set up headquarters login details', HTTP_STATUS.BAD_REQUEST);
      }
      hqUser = await User.create({
        name: `${name || organization.name} HQ Manager`,
        email: headOfficeEmail.toLowerCase(),
        password: headOfficePassword,
        role: ROLES.RECEPTIONIST,
        clinicId: hqClinic._id,
        organizationId: organization._id,
        isActive: true,
        approvalStatus: 'approved'
      });
    } else {
      if (headOfficeEmail.toLowerCase() !== oldEmail?.toLowerCase()) {
        const existingUser = await User.findOne({ email: headOfficeEmail.toLowerCase(), _id: { $ne: hqUser._id } });
        if (existingUser) {
          throw new AppError('Headquarters login email is already in use by another user', HTTP_STATUS.CONFLICT);
        }
      }
      hqUser.email = headOfficeEmail.toLowerCase();
      if (headOfficePassword) {
        hqUser.password = headOfficePassword;
      }
      await hqUser.save();
    }
  }

  await organization.save();

  return sendSuccess(res, 'Organization profile updated successfully', { organization });
});

const getPublicOrganizations = asyncHandler(async (req, res) => {
  const organizations = await Organization.find({ isActive: true }, { _id: 1, name: 1 });
  return sendSuccess(res, 'Public organizations list retrieved successfully', { organizations });
});

module.exports = {
  createOrganization,
  listOrganizations,
  getOrganizationDetails,
  updateOrganization,
  toggleOrganizationStatus,
  getMyOrganizationProfile,
  updateMyOrganizationProfile,
  getPublicOrganizations
};
