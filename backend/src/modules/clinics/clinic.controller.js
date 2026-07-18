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
const nodemailer = require('nodemailer');
const { env } = require('../../config/env');
const { logger } = require('../../common/utils/logger');
const OnboardingOtp = require('./onboardingOtp.model');

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
  const clinics = await Clinic.find(filter)
    .populate('parentClinicId', 'name code')
    .populate('specializations', 'name description isActive')
    .populate('subscription.planId');
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
  if (req.body.isOnboardingCompleted !== undefined) clinic.isOnboardingCompleted = req.body.isOnboardingCompleted;
  if (req.body.clinicDetails) {
    clinic.clinicDetails = {
      ...clinic.clinicDetails,
      ...req.body.clinicDetails
    };
  }

  await clinic.save();

  return sendSuccess(res, 'Clinic updated successfully', { clinic });
});

const bcrypt = require('bcryptjs');

const getPlans = asyncHandler(async (req, res) => {
  const SubscriptionPlan = require('../subscriptions/subscriptionPlan.model');
  const plans = await SubscriptionPlan.find({ isActive: true, isArchived: { $ne: true } }).sort({ displayOrder: 1 });
  return sendSuccess(res, 'Subscription plans retrieved successfully', { plans });
});

const submitRegistration = asyncHandler(async (req, res) => {
  const { ownerDetails, clinicDetails, selectedPlan } = req.body;

  // Basic validations
  if (!ownerDetails || !clinicDetails || !selectedPlan) {
    throw new AppError('Owner details, clinic details, and plan selection are required', HTTP_STATUS.BAD_REQUEST);
  }

  const email = ownerDetails.email?.toLowerCase();
  const phone = ownerDetails.phone;

  // Check if owner email exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('A user with this email address already exists', HTTP_STATUS.CONFLICT);
  }

  // Generate code if not provided
  let code = clinicDetails.name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);
  if (!code) code = 'CLINIC';
  
  // Ensure unique code
  let finalCode = code;
  let counter = 1;
  while (await Clinic.findOne({ code: finalCode })) {
    finalCode = `${code}${counter}`;
    counter++;
  }

  const SubscriptionPlan = require('../subscriptions/subscriptionPlan.model');
  const plan = await SubscriptionPlan.findById(selectedPlan.planId);
  if (!plan) {
    throw new AppError('Selected subscription plan not found', HTTP_STATUS.NOT_FOUND);
  }

  // Hash password for storing
  const hashedPassword = await bcrypt.hash(ownerDetails.password, 10);

  // Set subscription dates starting immediately
  const now = new Date();
  const expiry = new Date();
  const billingCycle = selectedPlan.billingCycle || 'monthly';
  if (billingCycle === 'yearly') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setDate(expiry.getDate() + 30);
  }

  const clinic = await Clinic.create({
    name: clinicDetails.name,
    code: finalCode,
    phone: clinicDetails.contactNumber || phone,
    image: clinicDetails.logo || '',
    address: {
      line1: clinicDetails.addressLine1 || '',
      line2: clinicDetails.addressLine2 || '',
      city: clinicDetails.city || '',
      state: clinicDetails.state || '',
      pincode: clinicDetails.pincode || '',
      country: clinicDetails.country || 'India',
      latitude: clinicDetails.latitude || null,
      longitude: clinicDetails.longitude || null
    },
    ownerDetails: {
      ...ownerDetails,
      password: hashedPassword,
      email
    },
    clinicDetails: {
      registrationNumber: clinicDetails.registrationNumber || '',
      establishedYear: clinicDetails.establishedYear || '',
      timings: clinicDetails.timings || [],
      consultationMode: clinicDetails.consultationMode || 'In-Clinic',
      languagesSpoken: clinicDetails.languagesSpoken || [],
      shortDescription: clinicDetails.shortDescription || '',
      images: clinicDetails.images || [],
      logo: clinicDetails.logo || '',
      description: clinicDetails.description || ''
    },
    approvalStatus: 'approved',
    isActive: true,
    subscription: {
      planId: plan._id,
      billingCycle,
      startDate: now,
      renewalDate: expiry,
      expiryDate: expiry,
      status: 'Active'
    }
  });

  // Create Owner User account immediately in 'approved' status
  await User.create({
    name: ownerDetails.name,
    email,
    phone: ownerDetails.phone,
    password: hashedPassword, // already hashed
    role: ROLES.ADMIN,
    clinicId: clinic._id,
    isActive: true,
    approvalStatus: 'approved'
  });

  return sendSuccess(res, 'Clinic registration submitted successfully', { clinic }, 201);
});

const getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await Clinic.find({ approvalStatus: 'pending_approval' }).populate('subscription.planId');
  return sendSuccess(res, 'Pending clinic registrations retrieved successfully', { requests });
});

const approveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic registration request not found', HTTP_STATUS.NOT_FOUND);
  }

  if (clinic.approvalStatus !== 'pending_approval') {
    throw new AppError('This clinic request has already been processed', HTTP_STATUS.BAD_REQUEST);
  }

  // Set subscription dates
  const now = new Date();
  const expiry = new Date();
  if (clinic.subscription.billingCycle === 'yearly') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setDate(expiry.getDate() + 30);
  }

  clinic.approvalStatus = 'approved';
  clinic.isActive = true;
  clinic.subscription.status = 'Active';
  clinic.subscription.startDate = now;
  clinic.subscription.renewalDate = expiry;
  clinic.subscription.expiryDate = expiry;

  await clinic.save();

  // Find and update the Owner User account (role: ADMIN)
  const ownerEmail = (clinic.ownerDetails?.email || clinic.email || '').toLowerCase();
  if (!ownerEmail) {
    throw new AppError('Clinic owner email is missing, cannot approve registration.', HTTP_STATUS.BAD_REQUEST);
  }

  let user = await User.findOne({ email: ownerEmail });
  if (user) {
    if (user.clinicId && user.clinicId.toString() !== clinic._id.toString()) {
      throw new AppError('A user with this email address already exists for another clinic. Approval aborted.', HTTP_STATUS.CONFLICT);
    }
    user.clinicId = clinic._id;
    user.role = ROLES.ADMIN; // Explicitly ensure the clinic owner has the ADMIN role
    user.approvalStatus = 'approved';
    user.isActive = true;
    await user.save();
  } else {
    // Generate a fallback temporary password if owner password is empty/not present
    const tempPassword = clinic.ownerDetails?.password || clinic.ownerDetails?.phone || 'ClinicOwner@123';
    user = await User.create({
      name: clinic.ownerDetails?.name || clinic.name,
      email: ownerEmail,
      phone: clinic.ownerDetails?.phone || clinic.phone || '',
      password: tempPassword,
      role: ROLES.ADMIN,
      clinicId: clinic._id,
      isActive: true,
      approvalStatus: 'approved'
    });
  }

  // Try to create audit log
  try {
    const { createAuditLog } = require('../audit/audit.service');
    await createAuditLog({
      actorUserId: req.user?._id || user._id,
      action: 'CLINIC_APPROVED',
      entity: 'Clinic',
      entityId: clinic._id,
      metadata: {
        clinicName: clinic.name,
        ownerEmail: clinic.ownerDetails.email
      },
      status: 'SUCCESS'
    });
  } catch (auditErr) {
    console.error('Audit log failed during clinic approval:', auditErr);
  }

  return sendSuccess(res, 'Clinic registration approved successfully', { clinic, user });
});

const rejectRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason, rejectionComments, incorrectFields, requestedDocuments } = req.body;
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic registration request not found', HTTP_STATUS.NOT_FOUND);
  }

  clinic.approvalStatus = 'rejected';
  clinic.subscription.status = 'Cancelled';
  clinic.rejectionReason = rejectionReason || 'Information correction required';
  clinic.rejectionComments = rejectionComments || '';
  clinic.incorrectFields = incorrectFields || [];
  clinic.requestedDocuments = requestedDocuments || [];
  await clinic.save();

  // Find owner user and update approvalStatus to 'rejected'
  const user = await User.findOne({ email: clinic.ownerDetails.email.toLowerCase() });
  if (user) {
    user.approvalStatus = 'rejected';
    await user.save();
  }

  return sendSuccess(res, 'Clinic registration rejected successfully', { clinic });
});

const getSuperAdminStats = asyncHandler(async (req, res) => {
  const totalClinics = await Clinic.countDocuments();
  const activeClinics = await Clinic.countDocuments({ approvalStatus: 'approved', isActive: true });
  const pendingClinics = await Clinic.countDocuments({ approvalStatus: 'pending_approval' });
  const suspendedClinics = await Clinic.countDocuments({
    $or: [{ approvalStatus: 'suspended' }, { 'subscription.status': 'Suspended' }]
  });
  const expiredSubscriptions = await Clinic.countDocuments({ 'subscription.status': 'Expired' });

  // Calculate estimated monthly revenue from active subscriptions
  const clinics = await Clinic.find({ 'subscription.status': 'Active' }).populate('subscription.planId');
  let monthlyRevenue = 0;
  for (const c of clinics) {
    const plan = c.subscription?.planId;
    if (plan) {
      if (c.subscription.billingCycle === 'yearly') {
        monthlyRevenue += Math.round(plan.priceYearly / 12);
      } else {
        monthlyRevenue += plan.priceMonthly;
      }
    }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newRegistrations = await Clinic.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

  const tenDaysHence = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const renewalRequests = await Clinic.countDocuments({
    'subscription.status': 'Active',
    'subscription.expiryDate': { $lte: tenDaysHence, $gte: new Date() }
  });

  return sendSuccess(res, 'Super admin stats retrieved successfully', {
    totalClinics,
    activeClinics,
    pendingClinics,
    suspendedClinics,
    expiredSubscriptions,
    monthlyRevenue,
    newRegistrations,
    renewalRequests
  });
});

const suspendClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  clinic.approvalStatus = 'suspended';
  clinic.subscription.status = 'Suspended';
  await clinic.save();

  // Deactivate all users of this clinic
  await User.updateMany({ clinicId: clinic._id }, { isActive: false });

  return sendSuccess(res, 'Clinic suspended successfully', { clinic });
});

const activateClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  clinic.approvalStatus = 'approved';
  clinic.subscription.status = 'Active';
  await clinic.save();

  // Activate all users of this clinic
  await User.updateMany({ clinicId: clinic._id }, { isActive: true });

  return sendSuccess(res, 'Clinic activated successfully', { clinic });
});

const changeClinicPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { planId, billingCycle } = req.body;
  const SubscriptionPlan = require('../subscriptions/subscriptionPlan.model');

  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
  }

  clinic.subscription.planId = plan._id;
  if (billingCycle) {
    clinic.subscription.billingCycle = billingCycle;
  }
  await clinic.save();

  return sendSuccess(res, 'Clinic subscription plan updated successfully', { clinic });
});

const extendClinicSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { months } = req.body;

  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  const currentExpiry = clinic.subscription.expiryDate || new Date();
  const newExpiry = new Date(currentExpiry);
  newExpiry.setMonth(newExpiry.getMonth() + (months || 1));

  clinic.subscription.expiryDate = newExpiry;
  clinic.subscription.renewalDate = newExpiry;
  clinic.subscription.status = 'Active';
  await clinic.save();

  return sendSuccess(res, 'Clinic subscription extended successfully', { clinic });
});

const resetClinicPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', HTTP_STATUS.BAD_REQUEST);
  }

  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  const adminUser = await User.findOne({ clinicId: clinic._id, role: ROLES.ADMIN });
  if (!adminUser) {
    throw new AppError('Clinic administrator user account not found', HTTP_STATUS.NOT_FOUND);
  }

  adminUser.password = password;
  await adminUser.save();

  return sendSuccess(res, 'Clinic administrator password reset successfully');
});

const deleteClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  await Clinic.findByIdAndDelete(id);
  await User.deleteMany({ clinicId: id });

  return sendSuccess(res, 'Clinic and associated users deleted successfully');
});

const superAdminCreateClinic = asyncHandler(async (req, res) => {
  const { ownerDetails, clinicDetails, selectedPlan, status } = req.body;
  const SubscriptionPlan = require('../subscriptions/subscriptionPlan.model');

  // Check if owner email exists
  const existingUser = await User.findOne({ email: ownerDetails.email.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user with this email address already exists', HTTP_STATUS.CONFLICT);
  }

  // Generate code
  let code = clinicDetails.name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);
  if (!code) code = 'CLINIC';

  let finalCode = code;
  let counter = 1;
  while (await Clinic.findOne({ code: finalCode })) {
    finalCode = `${code}${counter}`;
    counter++;
  }

  const plan = await SubscriptionPlan.findById(selectedPlan.planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
  }

  const hashedPassword = await bcrypt.hash(ownerDetails.password, 10);

  const expiry = new Date();
  if (selectedPlan.billingCycle === 'yearly') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setDate(expiry.getDate() + 30);
  }

  const clinic = await Clinic.create({
    name: clinicDetails.name,
    code: finalCode,
    phone: clinicDetails.contactNumber || ownerDetails.phone,
    image: clinicDetails.logo || '',
    address: {
      line1: clinicDetails.addressLine1 || '',
      line2: clinicDetails.addressLine2 || '',
      city: clinicDetails.city || '',
      state: clinicDetails.state || '',
      pincode: clinicDetails.pincode || '',
      country: clinicDetails.country || 'India',
      latitude: clinicDetails.latitude || null,
      longitude: clinicDetails.longitude || null
    },
    ownerDetails: {
      ...ownerDetails,
      password: hashedPassword,
      email: ownerDetails.email.toLowerCase()
    },
    clinicDetails: {
      registrationNumber: clinicDetails.registrationNumber || '',
      establishedYear: clinicDetails.establishedYear || '',
      timings: clinicDetails.timings || [],
      consultationMode: clinicDetails.consultationMode || 'In-Clinic',
      languagesSpoken: clinicDetails.languagesSpoken || [],
      shortDescription: clinicDetails.shortDescription || '',
      images: clinicDetails.images || [],
      logo: clinicDetails.logo || '',
      description: clinicDetails.description || ''
    },
    approvalStatus: status === 'Active' ? 'approved' : status === 'Suspended' ? 'suspended' : 'pending_approval',
    isActive: status === 'Active',
    subscription: {
      planId: plan._id,
      billingCycle: selectedPlan.billingCycle || 'monthly',
      startDate: new Date(),
      renewalDate: expiry,
      expiryDate: expiry,
      status: status === 'Active' ? 'Active' : status === 'Suspended' ? 'Suspended' : 'Pending Approval'
    }
  });

  if (status === 'Active') {
    await User.create({
      name: ownerDetails.name,
      email: ownerDetails.email.toLowerCase(),
      phone: ownerDetails.phone,
      password: hashedPassword,
      role: ROLES.ADMIN,
      clinicId: clinic._id,
      isActive: true,
      approvalStatus: 'approved'
    });
  }

  return sendSuccess(res, 'Clinic created successfully by admin', { clinic }, 201);
});

const validateEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Email is required', HTTP_STATUS.BAD_REQUEST);
  }
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  return sendSuccess(res, 'Email status checked', { isUnique: !existingUser });
});

const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Email is required', HTTP_STATUS.BAD_REQUEST);
  }

  // Generate 6 digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  // Save/update OTP
  await OnboardingOtp.findOneAndUpdate(
    { email: email.toLowerCase() },
    { otp, createdAt: new Date() },
    { upsert: true, new: true }
  );

  // Send Email
  const subject = 'Your AICMS Clinic Onboarding Verification Code';
  const body = `Hello,\n\nYour OTP (One-Time Password) for verifying your clinic onboarding is: ${otp}\n\nThis code is valid for 5 minutes.\n\nThank you!`;

  if (!env.emailHost || !env.emailUser || !env.emailPass) {
    logger.warn('[onboarding:otp] Missing SMTP credentials, falling back to console log.');
    console.info('\n=======================================');
    console.info(`[ONBOARDING OTP] Sent to: ${email}`);
    console.info(`[ONBOARDING OTP] Code: ${otp}`);
    console.info('=======================================\n');
  } else {
    try {
      const transporter = nodemailer.createTransport({
        host: env.emailHost,
        port: env.emailPort || 587,
        secure: !!env.emailSecure,
        auth: {
          user: env.emailUser,
          pass: env.emailPass
        }
      });
      await transporter.sendMail({
        from: env.emailFrom || `"AI-CMS Clinic" <noreply@aicms.local>`,
        to: email.toLowerCase(),
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
      });
      logger.info(`[onboarding:otp] Sent successfully to ${email}`);
    } catch (error) {
      logger.error('[onboarding:otp] Failed to send email via SMTP', error);
      throw new AppError('Failed to send verification code email', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  return sendSuccess(res, 'Verification OTP sent successfully');
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new AppError('Email and OTP are required', HTTP_STATUS.BAD_REQUEST);
  }

  const record = await OnboardingOtp.findOne({ email: email.toLowerCase() });
  if (!record || record.otp !== String(otp).trim()) {
    throw new AppError('Invalid or expired verification code', HTTP_STATUS.BAD_REQUEST);
  }

  // Delete the OTP upon successful verification so it can't be reused
  await OnboardingOtp.deleteOne({ _id: record._id });

  return sendSuccess(res, 'OTP verified successfully');
});

const resubmitRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ownerDetails, clinicDetails } = req.body;
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic registration request not found', HTTP_STATUS.NOT_FOUND);
  }

  if (clinic.approvalStatus !== 'rejected') {
    throw new AppError('Only rejected clinic registrations can be resubmitted', HTTP_STATUS.BAD_REQUEST);
  }

  // Update details
  if (ownerDetails) {
    // If password is being updated, hash it
    if (ownerDetails.password) {
      const bcrypt = require('bcryptjs');
      ownerDetails.password = await bcrypt.hash(ownerDetails.password, 10);
    }
    clinic.ownerDetails = {
      ...clinic.ownerDetails,
      ...ownerDetails
    };
  }
  if (clinicDetails) {
    clinic.clinicDetails = {
      ...clinic.clinicDetails,
      ...clinicDetails
    };
  }

  // Reset statuses
  clinic.approvalStatus = 'pending_approval';
  clinic.subscription.status = 'Pending Approval';
  clinic.rejectionReason = '';
  clinic.rejectionComments = '';
  clinic.incorrectFields = [];
  clinic.requestedDocuments = [];
  await clinic.save();

  // Update associated user's approval status
  const user = await User.findOne({ email: clinic.ownerDetails.email.toLowerCase() });
  if (user) {
    user.approvalStatus = 'pending_approval';
    if (ownerDetails && ownerDetails.password) {
      user.password = ownerDetails.password;
    }
    await user.save();
  }

  return sendSuccess(res, 'Clinic registration resubmitted successfully', { clinic });
});

const requestRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { refundReason } = req.body;
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic registration request not found', HTTP_STATUS.NOT_FOUND);
  }

  if (clinic.approvalStatus !== 'rejected') {
    throw new AppError('Refunds can only be requested for rejected registrations', HTTP_STATUS.BAD_REQUEST);
  }

  clinic.refundStatus = 'Pending';
  clinic.refundReason = refundReason || 'No reason provided';
  clinic.refundRequestedAt = new Date();
  await clinic.save();

  return sendSuccess(res, 'Refund requested successfully', { clinic });
});

const updateRefundStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { refundStatus } = req.body; // Approved, Rejected, Refunded
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    throw new AppError('Clinic registration request not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!['Approved', 'Rejected', 'Refunded'].includes(refundStatus)) {
    throw new AppError('Invalid refund status', HTTP_STATUS.BAD_REQUEST);
  }

  clinic.refundStatus = refundStatus;
  await clinic.save();

  return sendSuccess(res, 'Refund status updated successfully', { clinic });
});

const getOnboardingFlow = asyncHandler(async (req, res) => {
  const onboardingService = require('./onboarding.service');
  const data = await onboardingService.getOnboardingFlow(req.params.id);
  return sendSuccess(res, 'Onboarding configuration retrieved successfully', data);
});

const activateTrialFeature = asyncHandler(async (req, res) => {
  const onboardingService = require('./onboarding.service');
  const data = await onboardingService.activateTrialFeature(req.params.id, req.body.featureCode);
  return sendSuccess(res, 'Trial feature activated successfully', data);
});

const VALID_POLICIES = [
  'admin_only',
  'doctor_first',
  'doctor_first_with_limits',
  'doctor_then_admin',
  'doctor_or_admin',
  'dual_approval'
];

/**
 * PATCH /clinics/:id/billing-settings
 * Update the consultation fee approval policy and related billing configuration.
 * Admin only.
 */
const updateBillingSettings = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findById(req.params.id);
  if (!clinic) throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);

  // Ensure the requesting admin belongs to this clinic
  if (
    req.user.role !== ROLES.SUPER_ADMIN &&
    String(req.user.clinicId) !== String(clinic._id)
  ) {
    throw new AppError('You do not have permission to modify this clinic', HTTP_STATUS.FORBIDDEN);
  }

  const {
    procedureBillingPolicy,
    approvalPolicy,
    doctorMaxDiscountPercent,
    doctorMaxDiscountAmount,
    allowDoctorFullWaiver,
    escalateWhenLimitExceeds,
    slotReservationTimeoutMinutes
  } = req.body;

  if (approvalPolicy && !VALID_POLICIES.includes(approvalPolicy)) {
    throw new AppError(
      `Invalid approval policy. Must be one of: ${VALID_POLICIES.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (procedureBillingPolicy && !['payment_before_procedure', 'payment_after_procedure'].includes(procedureBillingPolicy)) {
    throw new AppError('Invalid procedure billing policy', HTTP_STATUS.BAD_REQUEST);
  }

  // Build update object with only provided fields
  const update = {};
  if (procedureBillingPolicy !== undefined)       update['billingSettings.procedureBillingPolicy']     = procedureBillingPolicy;
  if (approvalPolicy !== undefined)               update['billingSettings.approvalPolicy']              = approvalPolicy;
  if (doctorMaxDiscountPercent !== undefined)      update['billingSettings.doctorMaxDiscountPercent']   = doctorMaxDiscountPercent;
  if (doctorMaxDiscountAmount !== undefined)       update['billingSettings.doctorMaxDiscountAmount']    = doctorMaxDiscountAmount;
  if (allowDoctorFullWaiver !== undefined)         update['billingSettings.allowDoctorFullWaiver']      = allowDoctorFullWaiver;
  if (escalateWhenLimitExceeds !== undefined)      update['billingSettings.escalateWhenLimitExceeds']   = escalateWhenLimitExceeds;
  if (slotReservationTimeoutMinutes !== undefined) update['billingSettings.slotReservationTimeoutMinutes'] = slotReservationTimeoutMinutes;

  const updated = await Clinic.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true }
  ).select('billingSettings name');

  logger.info(`Billing settings updated for clinic ${clinic.name} by user ${req.user._id}`);

  return sendSuccess(res, 'Billing settings updated successfully', {
    billingSettings: updated.billingSettings
  });
});

/**
 * GET /clinics/:id/billing-settings
 * Return current billing settings and auto-detected doctor count for default policy suggestion.
 */
const getBillingSettings = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findById(req.params.id).select('billingSettings name');
  if (!clinic) throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);

  const activeDoctorCount = await Doctor.countDocuments({
    clinicId: clinic._id,
    isActive: true
  });

  const suggestedDefaultPolicy = activeDoctorCount <= 1 ? 'doctor_first' : 'admin_only';

  return sendSuccess(res, 'Billing settings retrieved', {
    billingSettings: clinic.billingSettings,
    activeDoctorCount,
    suggestedDefaultPolicy
  });
});

module.exports = {
  createClinic,
  listClinics,
  getClinicDetails,
  updateClinic,
  getPlans,
  submitRegistration,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getSuperAdminStats,
  suspendClinic,
  activateClinic,
  changeClinicPlan,
  extendClinicSubscription,
  resetClinicPassword,
  deleteClinic,
  superAdminCreateClinic,
  validateEmail,
  sendOtp,
  verifyOtp,
  resubmitRegistration,
  requestRefund,
  updateRefundStatus,
  getOnboardingFlow,
  activateTrialFeature,
  updateBillingSettings,
  getBillingSettings
};
