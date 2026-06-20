const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const Clinic = require('./clinic.model');
const User = require('../users/user.model');
const Doctor = require('../doctors/doctor.model');
const Patient = require('../patients/patient.model');
const FollowUpTask = require('../notifications/followUpTask.model');
const Invoice = require('../billing/invoice.model');
const Medicine = require('../pharmacy/medicine.model');
const { LabOrder } = require('../labs/labOrder.model');
const mongoose = require('mongoose');

const createClinic = asyncHandler(async (req, res) => {
  const { name, code, image, phone, email, password, parentClinicId, address, specializations } = req.body;

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
    organizationId: req.user?.organizationId || null,
    specializations: specializations || []
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
  const clinics = await Clinic.find(filter).populate('parentClinicId', 'name code').populate('specializations', 'name description isActive');
  return sendSuccess(res, 'Clinics retrieved successfully', { clinics });
});

const getClinicDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const clinic = await Clinic.findById(id).populate('specializations', 'name description isActive');
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  // Security check for organization scope
  if (req.user?.role === ROLES.ADMIN && req.user?.organizationId) {
    if (clinic.organizationId && clinic.organizationId.toString() !== req.user.organizationId.toString()) {
      throw new AppError('Access Denied: Clinic does not belong to your organization', HTTP_STATUS.FORBIDDEN);
    }
  }

  if (req.user?.role === ROLES.RECEPTIONIST) {
    if (req.user.clinicId?.toString() !== id) {
      throw new AppError('Access Denied: You can only view your own clinic details', HTTP_STATUS.FORBIDDEN);
    }
  }

  // Fetch clinic manager email
  const managerUser = await User.findOne({ clinicId: clinic._id, role: ROLES.RECEPTIONIST }).select('email');
  const clinicEmail = managerUser ? managerUser.email : 'N/A';

  // 1. Doctors in this clinic
  const doctors = await Doctor.find({ clinicId: clinic._id, isActive: true }).select('fullName specialization experienceYears phone email consultationFee followUpFee');

  // 2. Patients registered in this clinic
  const patients = await Patient.find({ clinicId: clinic._id, isActive: true }).select('fullName patientId email phone gender age');

  // 3. Follow-up tasks/patients
  const followUps = await FollowUpTask.find({ clinicId: clinic._id })
    .populate('patientId', 'fullName patientId email phone')
    .populate('doctorId', 'fullName specialization')
    .sort({ dueDate: 1 });

  // 4. Pharmacy out of stock / unavailable items (totalStock = 0)
  const unavailableMedicines = await Medicine.find({ clinicId: clinic._id, totalStock: 0 }).select('code name genericName category form strength manufacturer reorderLevel');

  // 5. Lab technicians
  const labTechnicians = await User.find({ clinicId: clinic._id, role: ROLES.LAB_TECHNICIAN, isActive: true }).select('name email phone');

  // 6. Recent Lab orders with creator details
  const recentLabOrders = await LabOrder.find({ clinicId: clinic._id })
    .populate('patientId', 'fullName patientId')
    .populate('doctorId', 'fullName')
    .populate('createdBy', 'name role')
    .sort({ createdAt: -1 })
    .limit(10);

  // 7. Revenue Aggregates from Invoices
  const revenueAggregate = await Invoice.aggregate([
    { $match: { clinicId: clinic._id } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$paidAmount' },
        totalBilled: { $sum: '$totalAmount' }
      }
    }
  ]);
  const totalRevenue = revenueAggregate[0]?.totalRevenue || 0;
  const totalBilled = revenueAggregate[0]?.totalBilled || 0;

  const recentInvoices = await Invoice.find({ clinicId: clinic._id })
    .populate('patientId', 'fullName patientId')
    .sort({ createdAt: -1 })
    .limit(10);

  return sendSuccess(res, 'Clinic details retrieved successfully', {
    clinic,
    clinicEmail,
    doctors,
    patients,
    followUps,
    unavailableMedicines,
    labTechnicians,
    recentLabOrders,
    revenue: {
      totalRevenue,
      totalBilled,
      recentInvoices
    }
  });
});

const updateClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, code, image, phone, address, specializations, isActive, isHeadquarters } = req.body;

  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  // Security check
  if (req.user?.role === ROLES.ADMIN && req.user?.organizationId) {
    if (clinic.organizationId && clinic.organizationId.toString() !== req.user.organizationId.toString()) {
      throw new AppError('Access Denied: Clinic does not belong to your organization', HTTP_STATUS.FORBIDDEN);
    }
  }

  if (req.user?.role === ROLES.RECEPTIONIST) {
    if (req.user.clinicId?.toString() !== id) {
      throw new AppError('Access Denied: You can only update your own clinic details', HTTP_STATUS.FORBIDDEN);
    }
  }

  if (code && code.toUpperCase() !== clinic.code) {
    const existingClinic = await Clinic.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
    if (existingClinic) {
      throw new AppError('Clinic code already exists', HTTP_STATUS.CONFLICT);
    }
    clinic.code = code.toUpperCase();
  }

  if (name) clinic.name = name;
  if (image !== undefined) clinic.image = image;
  if (phone !== undefined) clinic.phone = phone;
  if (address) clinic.address = { ...clinic.address, ...address };
  if (specializations) clinic.specializations = specializations;
  if (isActive !== undefined) clinic.isActive = isActive;
  if (isHeadquarters !== undefined) clinic.isHeadquarters = isHeadquarters;

  await clinic.save();

  return sendSuccess(res, 'Clinic updated successfully', { clinic });
});

module.exports = {
  createClinic,
  listClinics,
  getClinicDetails,
  updateClinic
};
