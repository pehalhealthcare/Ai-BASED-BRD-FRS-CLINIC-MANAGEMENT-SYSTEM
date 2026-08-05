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

const EventEmitter = require('events');
class OnboardingEmitter extends EventEmitter {}
const onboardingEmitter = new OnboardingEmitter();
const onboardingProgressMap = new Map();

const updateProgress = (clinicId, data) => {
  const current = onboardingProgressMap.get(clinicId) || { checklist: [], emailsSent: [] };
  const next = {
    percent: data.percent ?? current.percent,
    currentTask: data.currentTask ?? current.currentTask,
    checklist: data.checklistItem ? [...current.checklist, data.checklistItem] : current.checklist,
    emailsSent: data.emailItem ? [...current.emailsSent, data.emailItem] : current.emailsSent,
    status: data.status ?? current.status,
    error: data.error ?? current.error
  };
  onboardingProgressMap.set(clinicId, next);
  onboardingEmitter.emit(`progress:${clinicId}`, next);
};

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
  // Super Admins see all clinics (including pending/inactive); other roles only see active ones
  const filter = req.user?.role === ROLES.SUPER_ADMIN ? {} : { isActive: true };
  if (req.user?.role === ROLES.ADMIN && req.user?.organizationId) {
    filter.organizationId = req.user.organizationId;
  }
  const clinics = await Clinic.find(filter)
    .populate('parentClinicId', 'name code')
    .populate('specializations', 'name description isActive')
    .populate('subscription.planId')
    .sort({ createdAt: -1 }); // Newest registrations first
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
  if (req.body.isOnboardingCompleted !== undefined) {
    clinic.isOnboardingCompleted = req.body.isOnboardingCompleted;
    if (req.body.isOnboardingCompleted === true) {
      clinic.isActive = true;
      
      // Activate all branch offices
      try {
        await Clinic.updateMany({ parentClinicId: clinic._id }, { isActive: true });
      } catch (err) {
        console.error('Failed to activate branch offices:', err);
      }

      // Activate all pending healthcare providers and send invitations
      try {
        const Provider = require('../providers/provider.model');
        const User = require('../users/user.model');
        const Staff = require('../staff/staff.model');
        const { sendOperatorOnboardingEmail } = require('../providers/providerOperatorHelper');
        
        const pendingProviders = await Provider.find({ clinicId: clinic._id, status: { $in: ['Pending Activation', 'Draft'] } });
        for (const provider of pendingProviders) {
          provider.status = 'Active';
          await provider.save();
          
          const user = await User.findOne({ assignedProviderId: provider._id });
          const staff = await Staff.findOne({ assignedProviderId: provider._id });
          
          if (user) {
            user.isActive = true;
            user.approvalStatus = 'pending_invitation';
            await user.save();
          }
          
          if (staff) {
            staff.isActive = true;
            staff.approvalStatus = 'pending_invitation';
            await staff.save();
          }
          
          if (user) {
            try {
              await sendOperatorOnboardingEmail(clinic._id, provider, user, req.user?._id || user._id);
            } catch (mailErr) {
              console.error(`Failed to send deferred operator email to ${user.email}:`, mailErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to activate healthcare providers or send invitations:', err);
      }
    }
  }
  if (req.body.clinicDetails) {
    clinic.clinicDetails = {
      ...clinic.clinicDetails,
      ...req.body.clinicDetails
    };
  }
  if (req.body.billingSettings) {
    clinic.billingSettings = {
      ...clinic.clinicSettings,
      ...clinic.billingSettings,
      ...req.body.billingSettings
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

  const billingCycle = selectedPlan.billingCycle || 'monthly';

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
    approvalStatus: 'pending_approval',
    isActive: false,
    subscription: {
      planId: plan._id,
      billingCycle,
      startDate: null,
      renewalDate: null,
      expiryDate: null,
      status: 'Pending Approval'
    }
  });

  // Create Owner User account in 'pending_approval' status — activated only after Super Admin approves
  await User.create({
    name: ownerDetails.name,
    email,
    phone: ownerDetails.phone,
    password: hashedPassword, // already hashed
    role: ROLES.ADMIN,
    clinicId: clinic._id,
    isActive: false,
    approvalStatus: 'pending_approval'
  });

  return sendSuccess(res, 'Clinic registration submitted successfully. Awaiting Super Admin approval.', { clinic }, 201);
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
  
  const Provider = require('../providers/provider.model');
  const Staff = require('../staff/staff.model');
  
  await Provider.deleteMany({ clinicId: id });
  await Staff.deleteMany({ clinicId: id });
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

const validatePhone = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    throw new AppError('Phone number is required', HTTP_STATUS.BAD_REQUEST);
  }
  const existingUser = await User.findOne({ phone: phone.trim() });
  return sendSuccess(res, 'Phone status checked', { isUnique: !existingUser });
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
  
  // Parse Patient Check-In Policy fields
  const { allowEarlyCheckIn, restrictEarlyCheckIn, earlyCheckInWindowMinutes } = req.body;
  if (allowEarlyCheckIn !== undefined)            update['billingSettings.allowEarlyCheckIn']           = allowEarlyCheckIn;
  if (restrictEarlyCheckIn !== undefined)         update['billingSettings.restrictEarlyCheckIn']        = restrictEarlyCheckIn;
  if (earlyCheckInWindowMinutes !== undefined)    update['billingSettings.earlyCheckInWindowMinutes']   = earlyCheckInWindowMinutes;

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

const gridFsStorage = require('../../common/utils/gridFsStorage.service');
const OnboardingDraft = require('./onboardingDraft.model');

const validateRegistrationNumber = asyncHandler(async (req, res) => {
  const { registrationNumber } = req.body;
  if (!registrationNumber) {
    throw new AppError('Registration number is required', HTTP_STATUS.BAD_REQUEST);
  }
  const exists = await Clinic.findOne({ registrationNumber });
  return sendSuccess(res, 'Registration number validated', { isUnique: !exists });
});

const uploadFile = asyncHandler(async (req, res) => {
  const { file_data, file_name } = req.body;
  if (!file_data || !file_name) {
    throw new AppError('file_data and file_name are required', HTTP_STATUS.BAD_REQUEST);
  }
  const fileRef = await gridFsStorage.uploadBase64(file_data, file_name);
  return sendSuccess(res, 'File uploaded successfully', { fileRef }, HTTP_STATUS.CREATED);
});

const deleteFile = asyncHandler(async (req, res) => {
  const { fileRef } = req.body;
  if (!fileRef) {
    throw new AppError('fileRef is required', HTTP_STATUS.BAD_REQUEST);
  }
  await gridFsStorage.deleteFile(fileRef).catch(() => {});
  return sendSuccess(res, 'File deleted successfully');
});

const saveDraft = asyncHandler(async (req, res) => {
  const { email, step, ownerForm, clinicForm, selectedPlanId, billingCycle } = req.body;
  if (!email) {
    throw new AppError('Email is required to save draft', HTTP_STATUS.BAD_REQUEST);
  }
  const draft = await OnboardingDraft.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    {
      email: email.toLowerCase().trim(),
      step,
      ownerForm,
      clinicForm,
      selectedPlanId,
      billingCycle,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );
  return sendSuccess(res, 'Draft saved successfully', { draft });
});

const getDraft = asyncHandler(async (req, res) => {
  const { email } = req.params;
  if (!email) {
    throw new AppError('Email is required to fetch draft', HTTP_STATUS.BAD_REQUEST);
  }
  const draft = await OnboardingDraft.findOne({ email: email.toLowerCase().trim() });
  if (draft) {
    // Hydrate base64 data for references
    if (draft.ownerForm && draft.ownerForm.profilePhoto && !draft.ownerForm.profilePhoto.startsWith('data:')) {
      const base64 = await gridFsStorage.downloadAsBase64(draft.ownerForm.profilePhoto).catch(() => null);
      if (base64) draft.ownerForm.profilePhoto = base64;
    }
    if (draft.clinicForm && draft.clinicForm.logo && !draft.clinicForm.logo.startsWith('data:')) {
      const base64 = await gridFsStorage.downloadAsBase64(draft.clinicForm.logo).catch(() => null);
      if (base64) draft.clinicForm.logo = base64;
    }
    if (draft.clinicForm && Array.isArray(draft.clinicForm.images)) {
      const resolvedImages = [];
      for (const img of draft.clinicForm.images) {
        if (img && !img.startsWith('data:')) {
          const base64 = await gridFsStorage.downloadAsBase64(img).catch(() => null);
          resolvedImages.push(base64 || img);
        } else {
          resolvedImages.push(img);
        }
      }
      draft.clinicForm.images = resolvedImages;
    }
  }
  return sendSuccess(res, 'Draft retrieved successfully', { draft });
});

const ClinicOnboardingDraft = require('./clinicOnboardingDraft.model');

const saveOnboardingDraft = asyncHandler(async (req, res) => {
  const { currentStep, draftData } = req.body;
  const clinicId = req.user.clinicId || req.user.clinic?._id;
  const adminId = req.user._id;

  if (!clinicId) {
    throw new AppError('Clinic ID is required to save onboarding draft', HTTP_STATUS.BAD_REQUEST);
  }

  const draft = await ClinicOnboardingDraft.findOneAndUpdate(
    { clinicId },
    {
      clinicId,
      adminId,
      currentStep,
      draftData,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return sendSuccess(res, 'Onboarding draft saved successfully', { draft });
});

const getFreshDraftData = async (clinicId, adminId) => {
  const Provider = require('../providers/provider.model');
  
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) return null;

  const owner = await User.findById(adminId);
  if (!owner) return null;

  const doctors = await Doctor.find({ clinicId });
  const staffUsers = await User.find({ clinicId, role: { $in: ['RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN'] } });
  const branches = await Clinic.find({ parentClinicId: clinicId });
  const providers = await Provider.find({ clinicId });

  const scheduleDays = (clinic.clinicDetails?.timings || []).map((t, idx) => ({
    id: String(idx + 1),
    dayRange: t.dayRange || 'Monday - Friday',
    shifts: [{ startTime: t.startTime || '09:00 AM', endTime: t.endTime || '05:00 PM' }],
    closed: false
  }));

  return {
    currentStep: 0,
    ownerForm: {
      name: owner.name || clinic.ownerDetails?.name || '',
      designation: clinic.ownerDetails?.designation || 'Medical Director',
      phone: owner.phone || clinic.ownerDetails?.phone || '',
      email: owner.email,
      dob: clinic.ownerDetails?.dob ? new Date(clinic.ownerDetails.dob).toISOString().split('T')[0] : '',
      gender: clinic.ownerDetails?.gender || 'Male',
      nationality: 'Indian',
      preferredLanguage: 'English',
      aadhaar: clinic.ownerDetails?.aadhaar || '',
      pan: clinic.ownerDetails?.pan || '',
      address: clinic.ownerDetails?.address || clinic.address?.line1 || '',
      city: clinic.address?.city || '',
      state: clinic.address?.state || '',
      pincode: clinic.address?.pincode || '',
      country: clinic.address?.country || 'India',
      profilePhoto: clinic.ownerDetails?.profilePhoto || ''
    },
    clinicForm: {
      name: clinic.name,
      registrationNumber: clinic.clinicDetails?.registrationNumber || '',
      establishedYear: clinic.clinicDetails?.establishedYear || '',
      consultationMode: clinic.clinicDetails?.consultationMode || 'Hybrid',
      languagesSpoken: Array.isArray(clinic.clinicDetails?.languagesSpoken)
        ? clinic.clinicDetails.languagesSpoken.join(', ')
        : clinic.clinicDetails?.languagesSpoken || 'English, Hindi',
      addressLine1: clinic.address?.line1 || '',
      city: clinic.address?.city || '',
      state: clinic.address?.state || '',
      pincode: clinic.address?.pincode || '',
      contactNumber: clinic.phone || '',
      shortDescription: clinic.clinicDetails?.shortDescription || '',
      logo: clinic.clinicDetails?.logo || clinic.image || '',
      specialties: clinic.specializations && clinic.specializations.length > 0 ? 'Specialized' : 'General Medicine',
      latitude: clinic.address?.latitude || 12.9716,
      longitude: clinic.address?.longitude || 77.5946
    },
    selectedPlanId: clinic.subscription?.planId ? clinic.subscription.planId.toString() : '',
    doctors: doctors.map(d => ({
      title: d.title || 'Dr.',
      name: d.fullName || `${d.firstName} ${d.lastName}`,
      specialty: d.specializationName || 'General Medicine',
      email: d.email,
      phone: d.phone,
      _id: d._id
    })),
    departments: (clinic.clinicDetails?.departments || []).map(d => ({
      name: d.name,
      doctorsCount: 0,
      active: d.active !== false
    })),
    branches: branches.map(b => ({
      name: b.name,
      address: b.address?.line1 || '',
      city: b.address?.city || '',
      state: b.address?.state || '',
      pincode: b.address?.pincode || '',
      contact: b.phone || '',
      email: b.ownerDetails?.email || '',
      manager: b.ownerDetails?.name || '',
      active: b.isActive !== false,
      _id: b._id
    })),
    staff: staffUsers.map(s => ({
      name: s.name,
      role: s.role,
      email: s.email,
      phone: s.phone,
      active: s.isActive !== false,
      _id: s._id
    })),
    createdProviders: providers,
    aiFeatures: {
      voiceTranscription: true,
      consultationAssistant: true,
      symptomChecker: true,
      prescriptionSuggestions: true,
      riskScoring: false,
      labRecommendation: false,
      appointmentIntel: false,
      followUpReminders: false
    },
    videoProvider: 'Zoom',
    videoFee: '500',
    videoDuration: '15',
    videoWaitingRoom: true,
    scheduleType: 'Monday - Friday',
    scheduleDays: scheduleDays.length > 0 ? scheduleDays : [
      { id: '1', dayRange: 'Monday - Friday', shifts: [{ startTime: '09:00 AM', endTime: '05:00 PM' }], closed: false }
    ]
  };
};

const getOnboardingDraft = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId || req.user.clinic?._id;
  const adminId = req.user._id;
  if (!clinicId) {
    throw new AppError('Clinic ID is required to fetch onboarding draft', HTTP_STATUS.BAD_REQUEST);
  }

  const ClinicOnboardingDraft = require('./clinicOnboardingDraft.model');
  let draft = await ClinicOnboardingDraft.findOne({ clinicId });
  
  if (!draft) {
    logger.info(`Draft not found for clinic ${clinicId}, initializing new draft from DB`);
    const freshDraftData = await getFreshDraftData(clinicId, adminId);
    if (freshDraftData) {
      draft = await ClinicOnboardingDraft.create({
        clinicId,
        adminId,
        currentStep: 0,
        draftData: freshDraftData,
        updatedAt: new Date()
      });
    }
  } else {
    // Merge missing information into existing draft data without overwriting newer draft changes
    const freshDraftData = await getFreshDraftData(clinicId, adminId);
    if (freshDraftData) {
      let changed = false;
      for (const key of Object.keys(freshDraftData)) {
        if (
          draft.draftData[key] === undefined ||
          draft.draftData[key] === null ||
          (Array.isArray(draft.draftData[key]) && draft.draftData[key].length === 0 && freshDraftData[key].length > 0) ||
          (typeof draft.draftData[key] === 'object' && Object.keys(draft.draftData[key]).length === 0 && Object.keys(freshDraftData[key]).length > 0)
        ) {
          draft.draftData[key] = freshDraftData[key];
          changed = true;
        }
      }
      if (changed) {
        draft.markModified('draftData');
        await draft.save();
      }
    }
  }

  return sendSuccess(res, 'Onboarding draft retrieved successfully', { draft });
});

const deleteOnboardingDraft = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId || req.user.clinic?._id;
  if (!clinicId) {
    throw new AppError('Clinic ID is required to delete onboarding draft', HTTP_STATUS.BAD_REQUEST);
  }

  await ClinicOnboardingDraft.deleteOne({ clinicId });
  return sendSuccess(res, 'Onboarding draft deleted successfully');
});

const sendStaffWelcomeEmail = async (clinicId, staff, user) => {
  const nodemailer = require('nodemailer');
  const { env } = require('../../config/env');
  const { logger } = require('../../common/utils/logger');
  const Clinic = require('./clinic.model');

  const clinic = await Clinic.findById(clinicId);
  const clinicName = clinic ? clinic.name : 'AICMS Clinic';
  const onboardingLink = `${env.frontendUrl || 'http://localhost:3000'}/staff-onboarding?token=${user._id}`;

  const subject = `Welcome to ${clinicName} - Complete Your Onboarding`;
  const body = `Hello ${staff.fullName || user.name},

Welcome to ${clinicName}! An account has been prepared for you with the role of ${staff.role}.

To complete your onboarding profile, please click the secure link below to verify your email, set your password, and enter your details:
Onboarding Link: ${onboardingLink}

Once you submit your onboarding form, the Clinic Admin will review and approve your profile to activate your login.`;

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
      to: user.email,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });
    logger.info(`[onboarding:staff-invite] Sent successfully to ${user.email}`);
  } catch (error) {
    logger.error('[onboarding:staff-invite] Failed to send welcome email', error);
  }
};

const launchOnboarding = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { doctors, staffList, branches, clinicDetails, skipDoctors, skipStaff, skipBranches } = req.body;

  const Clinic = require('./clinic.model');
  const User = require('../users/user.model');
  const Staff = require('../staff/staff.model');
  const Doctor = require('../doctors/doctor.model');
  const Provider = require('../providers/provider.model');
  const SubscriptionPlan = require('../subscriptions/subscriptionPlan.model');
  const EmailJob = require('../notifications/emailJob.model');
  const AuditLog = require('../audit/audit.model');
  const NotificationLog = require('../notifications/notificationLog.model');
  const bcrypt = require('bcryptjs');
  const { generateDoctorCode } = require('../../common/utils/generateDoctorCode');

  onboardingProgressMap.delete(id);
  logger.info(`[Launch] Validation Started for clinic: ${id}`);
  updateProgress(id, { percent: 0, currentTask: 'Validating Clinic Information', status: 'RUNNING' });

  // 1. Fetch clinic & active plan
  const clinic = await Clinic.findById(id);
  if (!clinic) throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);

  // STEP 1: Validate entire onboarding payload
  if (!clinic.ownerDetails?.name || !clinic.ownerDetails?.email) {
    throw new AppError('Onboarding validation failed: Owner Profile details are incomplete.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!skipDoctors && (!Array.isArray(doctors) || doctors.length === 0)) {
    throw new AppError('Onboarding validation failed: At least one doctor must be configured.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!clinicDetails?.departments || !Array.isArray(clinicDetails.departments) || clinicDetails.departments.filter(d => d.active).length === 0) {
    throw new AppError('Onboarding validation failed: At least one active department is required.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!skipBranches && (!Array.isArray(branches) || branches.length === 0)) {
    throw new AppError('Onboarding validation failed: At least one branch must be configured.', HTTP_STATUS.BAD_REQUEST);
  }

  // STEP 2: Validate plan limits
  const plan = await SubscriptionPlan.findById(clinic.subscription?.planId);
  const planName = (plan?.name || '').toLowerCase();
  
  let maxDocs = 999999;
  let maxStaff = 999999;
  let maxBranches = 999999;
  let maxDepts = 999999;
  let aiEnabled = true;
  let videoEnabled = true;
  let healthcareEnabled = true;

  if (planName.includes('starter')) {
    maxDocs = 1;
    maxStaff = 2;
    maxBranches = 1;
    maxDepts = 2;
    aiEnabled = false;
    videoEnabled = false;
    healthcareEnabled = false;
  } else if (planName.includes('professional')) {
    maxDocs = 3;
    maxStaff = 5;
    maxBranches = 2;
    maxDepts = 5;
    aiEnabled = false;
    videoEnabled = true;
    healthcareEnabled = true;
  }

  if (!skipDoctors && Array.isArray(doctors) && doctors.length > maxDocs) {
    throw new AppError(`Subscription plan limit exceeded: Maximum allowed doctors is ${maxDocs}.`, HTTP_STATUS.BAD_REQUEST);
  }
  if (!skipStaff && Array.isArray(staffList) && staffList.length > maxStaff) {
    throw new AppError(`Subscription plan limit exceeded: Maximum allowed staff is ${maxStaff}.`, HTTP_STATUS.BAD_REQUEST);
  }
  if (!skipBranches && Array.isArray(branches) && branches.length > maxBranches) {
    throw new AppError(`Subscription plan limit exceeded: Maximum allowed branches is ${maxBranches}.`, HTTP_STATUS.BAD_REQUEST);
  }
  if (clinicDetails?.departments && Array.isArray(clinicDetails.departments) && clinicDetails.departments.length > maxDepts) {
    throw new AppError(`Subscription plan limit exceeded: Maximum allowed departments is ${maxDepts}.`, HTTP_STATUS.BAD_REQUEST);
  }
  if (!aiEnabled && clinicDetails?.aiConfig && Object.values(clinicDetails.aiConfig).some(Boolean)) {
    throw new AppError('Subscription plan limit exceeded: AI modules are not included in your starter/professional subscription plan.', HTTP_STATUS.BAD_REQUEST);
  }

  // STEP 3: Validate duplicates against database & payload
  const payloadEmails = [clinic.ownerDetails?.email, ...((skipDoctors ? [] : doctors) || []).map(d => d.email), ...((skipStaff ? [] : staffList) || []).map(s => s.email)].filter(Boolean).map(e => e.toLowerCase().trim());
  const payloadPhones = [clinic.ownerDetails?.phone, ...((skipDoctors ? [] : doctors) || []).map(d => d.phone), ...((skipStaff ? [] : staffList) || []).map(s => s.phone)].filter(Boolean).map(p => p.replace(/\D/g, '').trim());

  // Check unique in payload
  const emailSet = new Set(payloadEmails);
  if (emailSet.size !== payloadEmails.length) {
    throw new AppError('Onboarding validation failed: Duplicate emails detected inside your onboarding payload.', HTTP_STATUS.BAD_REQUEST);
  }
  const phoneSet = new Set(payloadPhones);
  if (phoneSet.size !== payloadPhones.length) {
    throw new AppError('Onboarding validation failed: Duplicate phone numbers detected inside your onboarding payload.', HTTP_STATUS.BAD_REQUEST);
  }

  // Check against database (excluding records belonging to the current clinic context)
  for (const email of payloadEmails) {
    const existingUser = await User.findOne({ email });
    if (existingUser && String(existingUser.clinicId) !== String(id)) {
      throw new AppError(`Email address ${email} is already registered to another user account.`, HTTP_STATUS.CONFLICT);
    }
  }
  for (const phone of payloadPhones) {
    const existingUser = await User.findOne({ phone });
    if (existingUser && String(existingUser.clinicId) !== String(id)) {
      throw new AppError(`Phone number ${phone} is already registered to another user account.`, HTTP_STATUS.CONFLICT);
    }
  }

  logger.info('[Launch] Validation Passed');
  updateProgress(id, { percent: 10, currentTask: 'Creating Clinic' });

  // STEP 4: Transaction configuration
  const session = await mongoose.startSession();
  let useTransaction = true;
  try {
    session.startTransaction();
  } catch (tErr) {
    logger.warn('[launchOnboarding] Transactions not supported by environment. Falling back to non-transactional execution.');
    useTransaction = false;
  }
  const opts = useTransaction ? { session } : {};

  const createdDocIds = [];
  const createdStaffIds = [];
  const createdUserIds = [];
  const createdBranchIds = [];
  const queuedEmails = [];

  try {
    // Update Clinic Details & Activate Clinic
    clinic.clinicDetails = {
      ...clinic.clinicDetails,
      ...clinicDetails
    };
    clinic.isOnboardingCompleted = true;
    clinic.isActive = true;
    await clinic.save(opts);
    logger.info('[Launch] Clinic Created');

    // Create Departments
    updateProgress(id, { percent: 20, currentTask: 'Creating Departments', checklistItem: 'Clinic Created' });
    // In our Option B schema, departments are embedded directly in the Clinic model's clinicDetails.departments array,
    // which has been saved successfully above.
    logger.info('[Launch] Departments Created');

    // Create Branches
    updateProgress(id, { percent: 30, currentTask: 'Creating Branches', checklistItem: 'Departments Created' });
    if (!skipBranches && Array.isArray(branches)) {
      for (const br of branches) {
        let branchObj = await Clinic.findOne({
          parentClinicId: id,
          code: br.code.toUpperCase().trim()
        }).session(session);

        if (!branchObj) {
          const newBranch = await Clinic.create([{
            ...br,
            name: br.name.trim(),
            code: br.code.toUpperCase().trim(),
            parentClinicId: id,
            isActive: true,
            approvalStatus: 'approved'
          }], opts);
          branchObj = newBranch[0];
        }
        createdBranchIds.push(branchObj._id);
      }
    }
    logger.info('[Launch] Branches Created');

    // Create Doctors
    updateProgress(id, { percent: 40, currentTask: 'Creating Doctors', checklistItem: 'Branches Created' });
    if (!skipDoctors && Array.isArray(doctors)) {
      for (const doc of doctors) {
        const fullName = doc.fullName.trim();
        const email = doc.email.toLowerCase().trim();
        const phone = doc.phone.trim();
        const hashedPassword = await bcrypt.hash(phone, 10);

        // Check if user already exists
        let userObj = await User.findOne({ email }).session(session);
        if (!userObj) {
          const userArr = await User.create([{
            name: fullName,
            email,
            phone,
            password: hashedPassword,
            role: ROLES.DOCTOR,
            clinicId: id,
            isActive: true,
            approvalStatus: 'pending_profile'
          }], opts);
          userObj = userArr[0];
          createdUserIds.push(userObj._id);
        }

        const parts = fullName.split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || '';

        // Check if doctor already exists
        let docObj = await Doctor.findOne({ userId: userObj._id }).session(session);
        if (!docObj) {
          const docArr = await Doctor.create([{
            title: doc.title || 'Dr.',
            firstName,
            lastName,
            fullName,
            clinicId: id,
            userId: userObj._id,
            assignedClinics: [id],
            email,
            phone,
            approvalStatus: 'pending_profile',
            isActive: false,
            doctorCode: await generateDoctorCode(id),
            createdBy: req.user?._id || clinic.ownerDetails?._id || clinic._id,
            updatedBy: req.user?._id || clinic.ownerDetails?._id || clinic._id
          }], opts);
          docObj = docArr[0];
        }
        createdDocIds.push(docObj._id);

        // Queue doctor welcome email if approvalStatus is pending_profile
        if (docObj.approvalStatus === 'pending_profile') {
          const existingJob = await EmailJob.findOne({ clinicId: id, recipient: email, status: 'Pending' }).session(session);
          if (!existingJob) {
            const onboardingLink = `${env.frontendUrl || 'http://localhost:3000'}/login`;
            const emailBody = `Hello ${fullName},\n\nWelcome to AICMS at ${clinic.name}! Your doctor profile has been created.\n\nLogin credentials:\nEmail: ${email}\nTemporary Password: ${phone}\nLogin URL: ${onboardingLink}\n\nSupport team: support@pehalhealth.com`;
            const emailJob = await EmailJob.create([{
              clinicId: id,
              recipient: email,
              subject: 'Welcome to AICMS - Doctor Activation',
              body: emailBody,
              status: 'Pending'
            }], opts);
            queuedEmails.push(emailJob[0]);
          }
        }
      }
    }
    logger.info('[Launch] Doctors Created');

    // Create Staff Accounts
    updateProgress(id, { percent: 50, currentTask: 'Creating Staff Accounts', checklistItem: 'Doctors Created' });
    if (!skipStaff && Array.isArray(staffList)) {
      for (const st of staffList) {
        const email = st.email.toLowerCase().trim();
        const phone = st.phone.trim();
        const hashedPassword = await bcrypt.hash(phone, 10);

        let userObj = await User.findOne({ email }).session(session);
        if (!userObj) {
          const userArr = await User.create([{
            name: st.name.trim(),
            email,
            phone,
            password: hashedPassword,
            role: st.role || 'RECEPTIONIST',
            clinicId: id,
            isActive: false,
            approvalStatus: 'pending_onboarding'
          }], opts);
          userObj = userArr[0];
          createdUserIds.push(userObj._id);
        }

        let staffObj = await Staff.findOne({ userId: userObj._id }).session(session);
        if (!staffObj) {
          const newStaff = await Staff.create([{
            userId: userObj._id,
            fullName: st.name.trim(),
            firstName: st.name.trim().split(' ')[0],
            lastName: st.name.trim().split(' ').slice(1).join(' ') || '',
            email,
            phone,
            role: st.role || 'RECEPTIONIST',
            clinicId: id,
            isActive: false,
            approvalStatus: 'pending_onboarding',
            staffCode: `STF-${String(userObj._id).slice(-4).toUpperCase()}`,
            creationSource: 'CLINIC_SETUP',
            invitationStatus: 'Draft'
          }], opts);
          staffObj = newStaff[0];
        }
        createdStaffIds.push(staffObj._id);

        // Queue staff welcome email if approvalStatus is pending_onboarding
        if (staffObj.approvalStatus === 'pending_onboarding') {
          const existingJob = await EmailJob.findOne({ clinicId: id, recipient: email, status: 'Pending' }).session(session);
          if (!existingJob) {
            const onboardingLink = `${env.frontendUrl || 'http://localhost:3000'}/login`;
            const emailBody = `Hello ${st.name},\n\nAn account has been prepared for you at ${clinic.name} as ${st.role}.\n\nLogin credentials:\nEmail: ${email}\nTemporary Password: ${phone}\nLogin URL: ${onboardingLink}\n\nSupport team: support@pehalhealth.com`;
            const emailJob = await EmailJob.create([{
              clinicId: id,
              recipient: email,
              subject: `Welcome to AICMS - Staff Activation (${st.role})`,
              body: emailBody,
              status: 'Pending'
            }], opts);
            queuedEmails.push(emailJob[0]);
          }
        }
      }
    }
    logger.info('[Launch] Staff Created');

    // Configure Pharmacy / Lab
    updateProgress(id, { percent: 60, currentTask: 'Configuring Pharmacy', checklistItem: 'Staff Accounts Created' });
    const pendingProviders = await Provider.find({ clinicId: id, status: { $in: ['Pending Activation', 'Draft', 'Active'] } }).session(session);
    
    let pharmacyCount = 0;
    let laboratoryCount = 0;
    
    for (const provider of pendingProviders) {
      provider.status = 'Active';
      await provider.save(opts);

      if (provider.providerType === 'Pharmacy') pharmacyCount++;
      if (provider.providerType === 'Laboratory') laboratoryCount++;

      const providerUser = await User.findOne({ assignedProviderId: provider._id }).session(session);
      const providerStaff = await Staff.findOne({ assignedProviderId: provider._id }).session(session);

      if (providerUser) {
        providerUser.isActive = true;
        providerUser.approvalStatus = 'pending_invitation';
        await providerUser.save(opts);

        // Queue welcome email for pharmacy/lab manager
        const onboardingLink = `${env.frontendUrl || 'http://localhost:3000'}/login`;
        const emailBody = `Hello ${provider.contactPerson || 'Manager'},\n\nYour facility (${provider.name}) has been activated at ${clinic.name}.\n\nLogin credentials:\nEmail: ${providerUser.email}\nTemporary Password: ${providerUser.phone}\nLogin URL: ${onboardingLink}\n\nSupport team: support@pehalhealth.com`;
        const emailJob = await EmailJob.create([{
          clinicId: id,
          recipient: providerUser.email,
          subject: `Welcome to AICMS - Provider Activation (${provider.providerType})`,
          body: emailBody,
          status: 'Pending'
        }], opts);
        queuedEmails.push(emailJob[0]);
      }

      if (providerStaff) {
        providerStaff.isActive = true;
        providerStaff.approvalStatus = 'pending_invitation';
        await providerStaff.save(opts);
      }
    }
    updateProgress(id, { percent: 70, currentTask: 'Configuring Laboratory', checklistItem: 'Pharmacy Configured' });

    // Step 8 & 9: Configure AI settings & Video Consultation
    updateProgress(id, { percent: 75, currentTask: 'Configuring AI Modules', checklistItem: 'Laboratory Configured' });
    updateProgress(id, { percent: 80, currentTask: 'Configuring Video Consultation', checklistItem: 'AI Modules Configured' });

    // Step 10 & 11: Generating Dashboard & Permissions
    updateProgress(id, { percent: 85, currentTask: 'Generating Dashboard', checklistItem: 'Video Consultation Configured' });
    updateProgress(id, { percent: 90, currentTask: 'Configuring Permissions', checklistItem: 'Dashboard Generated' });

    // Create Notifications & Audit Logs
    updateProgress(id, { percent: 95, currentTask: 'Creating Notifications', checklistItem: 'Permissions Configured' });

    // Super admin & owner activation notification
    await NotificationLog.create([{
      clinicId: id,
      type: 'custom',
      channel: 'in_app',
      recipient: { name: clinic.ownerDetails.name, email: clinic.ownerDetails.email, phone: clinic.ownerDetails.phone },
      subject: 'Clinic Workspace Activated',
      body: `Congratulations! ${clinic.name} is now live and fully activated.`,
      status: 'sent'
    }], opts);

    // Create Audit Log
    await AuditLog.create([{
      actorUserId: req.user?._id || clinic.ownerDetails?._id || clinic._id,
      action: 'CLINIC_ACTIVATION',
      entity: 'Clinic',
      entityId: id,
      metadata: {
        activatedAt: new Date(),
        plan: planName,
        doctorsCount: createdDocIds.length,
        staffCount: createdStaffIds.length
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Mozilla',
      status: 'SUCCESS'
    }], opts);
    logger.info('[Launch] Permissions Created');

    // Queue welcome email for Clinic Owner
    const ownerEmailBody = `Congratulations!\n\nYour clinic "${clinic.name}" is now live and ready.\n\nClinic ID: ${clinic._id}\nSubscription Plan: ${plan?.name || 'Trial'}\nActivation Time: ${new Date().toLocaleString()}\n\nSupport team: support@pehalhealth.com`;
    const ownerEmailJob = await EmailJob.create([{
      clinicId: id,
      recipient: clinic.ownerDetails.email,
      subject: 'Congratulations! Your Clinic is Activated - AICMS',
      body: ownerEmailBody,
      status: 'Pending'
    }], opts);
    queuedEmails.push(ownerEmailJob[0]);

    updateProgress(id, { percent: 98, currentTask: 'Sending Emails', checklistItem: 'Notifications Created' });

    // Clean up draft onboarding record
    const OnboardingDraft = require('./onboardingDraft.model');
    await OnboardingDraft.deleteOne({ email: clinic.ownerDetails?.email?.toLowerCase() }).session(session);

    if (useTransaction) {
      await session.commitTransaction();
    }
    session.endSession();

    logger.info('[Launch] Activation Completed');
    updateProgress(id, { percent: 100, currentTask: 'Finalizing Setup', checklistItem: 'Emails Queued', status: 'SUCCESS' });

    return sendSuccess(res, 'Clinic activated and launch workflow completed successfully.', {
      success: true,
      clinicActivated: true,
      dashboardCreated: true,
      activationId: clinic._id,
      emailsQueued: queuedEmails.length,
      emailsSent: 0,
      failedEmails: 0,
      redirect: '/clinic/dashboard',
      summary: {
        doctors: createdDocIds.length,
        staff: createdStaffIds.length,
        departments: clinicDetails?.departments?.length || 0,
        branches: createdBranchIds.length,
        pharmacy: pharmacyCount,
        laboratory: laboratoryCount
      }
    });

  } catch (error) {
    if (useTransaction) {
      await session.abortTransaction();
    }
    session.endSession();

    logger.error('[Launch] Activation Failed', error);
    updateProgress(id, { percent: 100, status: 'FAILED', error: error.message || 'Setup could not be completed.' });
    throw error;
  }
});

const getOnboardingProgressStream = (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const current = onboardingProgressMap.get(id) || {
    percent: 0,
    currentTask: 'Connecting to onboarding stream...',
    checklist: [],
    emailsSent: [],
    status: 'CONNECTING',
    error: null
  };
  res.write(`data: ${JSON.stringify(current)}\n\n`);

  const onProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  onboardingEmitter.on(`progress:${id}`, onProgress);

  req.on('close', () => {
    onboardingEmitter.off(`progress:${id}`, onProgress);
  });
};

const getSubscriptionModules = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const planIdParam = req.query.planId;

  let planCode = '';
  let planName = '';

  const clinic = await Clinic.findById(id).populate('subscription.planId');
  if (clinic && clinic.subscription?.planId) {
    planCode = (clinic.subscription.planId.code || '').toUpperCase();
    planName = (clinic.subscription.planId.name || '').toLowerCase();
  } else if (planIdParam) {
    const SubscriptionPlan = require('../subscriptions/subscriptionPlan.model');
    const plan = await SubscriptionPlan.findById(planIdParam);
    if (plan) {
      planCode = (plan.code || '').toUpperCase();
      planName = (plan.name || '').toLowerCase();
    }
  }

  const allModules = [
    {
      moduleId: 'voiceTranscription',
      moduleName: 'Voice Transcription',
      description: 'Convert doctor speech into structured clinical notes in real time.',
      category: 'Documentation',
      icon: '🎙',
      tags: ['Real-time', 'Voice AI', 'Clinical Notes']
    },
    {
      moduleId: 'consultationAssistant',
      moduleName: 'AI Consultation Assistant',
      description: 'Generates automated clinical SOAP notes and treatment suggestions.',
      category: 'Assistant',
      icon: '✨',
      tags: ['Documentation', 'SOAP Notes', 'Automation']
    },
    {
      moduleId: 'symptomChecker',
      moduleName: 'Symptom Checker',
      description: 'Predicts diagnostic risk pathways using clinical AI models.',
      category: 'Diagnostics',
      icon: '🩺',
      tags: ['Diagnostics', 'Risk Analysis', 'Symptom AI']
    },
    {
      moduleId: 'prescriptionSuggestions',
      moduleName: 'Prescription Suggestions',
      description: 'Checks drug-drug interaction warnings and dosage recommendations.',
      category: 'Prescriptions',
      icon: '💊',
      tags: ['Safety', 'Drug Interactions', 'Prescriptions']
    },
    {
      moduleId: 'riskScoring',
      moduleName: 'Patient Risk Scoring',
      description: 'Analyzes post-op readmission risks and patient deterioration.',
      category: 'Diagnostics',
      icon: '📊',
      tags: ['Risk Analysis', 'Clinical Metrics', 'Predictive']
    },
    {
      moduleId: 'labRecommendation',
      moduleName: 'Lab Test Recommendation',
      description: 'Auto recommends relevant diagnostics based on patient symptoms.',
      category: 'Diagnostics',
      icon: '🧪',
      tags: ['Labs', 'Diagnostics', 'Lab Recommendations']
    },
    {
      moduleId: 'soapGenerator',
      moduleName: 'Clinical SOAP Generator',
      description: 'Generates highly structured SOAP summaries from text inputs.',
      category: 'Documentation',
      icon: '📄',
      tags: ['SOAP', 'Clinical Notes', 'Documentation']
    },
    {
      moduleId: 'prescriptionOcr',
      moduleName: 'Prescription OCR',
      description: 'Extracts medicine names and dosages from prescription images.',
      category: 'Scanning',
      icon: '📷',
      tags: ['OCR', 'Prescription Reader', 'Computer Vision']
    },
    {
      moduleId: 'diseaseAnalytics',
      moduleName: 'Disease Analytics',
      description: 'Tracks epidemiologic trends and patient demographic analytics.',
      category: 'Analytics',
      icon: '📈',
      tags: ['Analytics', 'Trends', 'Epidemiology']
    },
    {
      moduleId: 'smartFollowUp',
      moduleName: 'Smart Follow-up Reminder',
      description: 'Determines optimal follow-up dates based on clinical history.',
      category: 'Assistant',
      icon: '🤖',
      tags: ['Reminders', 'Follow-up', 'Automation']
    },
    {
      moduleId: 'patientChat',
      moduleName: 'AI Patient Chat Assistant',
      description: 'Handles basic scheduling queries and health information for patients.',
      category: 'Communication',
      icon: '💬',
      tags: ['Chatbot', 'Support', 'Engagement']
    },
    {
      moduleId: 'clinicalDocumentation',
      moduleName: 'Clinical Documentation Assistant',
      description: 'Drafts discharge summaries, referral letters, and lab instructions.',
      category: 'Documentation',
      icon: '📋',
      tags: ['Documentation', 'Letters', 'Discharge Summary']
    }
  ];

  const modules = allModules.map((mod, index) => {
    let included = true;
    if (planName.includes('starter') || planCode === 'STARTER') {
      included = false;
    } else if (planName.includes('professional') || planCode === 'PROFESSIONAL') {
      included = index < 6;
    }

    return {
      ...mod,
      includedInPlan: included,
      requiresUpgrade: !included,
      availability: included ? 'Included in Plan' : 'Upgrade Required'
    };
  });

  return sendSuccess(res, 'Subscription modules retrieved successfully', { modules });
});

const getHealthcareProviders = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const Provider = require('../providers/provider.model');
  const ProviderDraft = require('../providers/providerDraft.model');

  const [providers, drafts] = await Promise.all([
    Provider.find({ clinicId: id }),
    ProviderDraft.find({ clinicId: id })
  ]);

  const mappedProviders = providers.map(p => {
    let completionPercentage = 33;
    let managerStatus = 'Manager Pending';
    if (p.contactPerson && p.managerEmail && p.managerPhone) {
      completionPercentage += 33;
      managerStatus = 'Manager Assigned';
    }
    if (p.drugLicenseNumber || (p.workingHours && p.workingHours.openingTime)) {
      completionPercentage += 34;
    }

    return {
      providerId: p._id,
      _id: p._id,
      providerType: p.providerType,
      status: p.status,
      name: p.name,
      draftStatus: completionPercentage === 100 ? 'Completed' : 'Draft',
      branch: p.assignedBranchName || 'Main Branch',
      manager: p.contactPerson || null,
      email: p.email,
      phone: p.phone,
      ownership: p.providerSubtype || 'Internal',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      completionPercentage,
      // For expand view:
      contactPerson: p.contactPerson || '',
      managerPhone: p.managerPhone || '',
      managerEmail: p.managerEmail || '',
      managerGender: p.managerGender || '',
      managerEmployeeId: p.managerEmployeeId || '',
      workingHours: p.workingHours || { openingTime: '09:00', closingTime: '21:00' },
      gstNumber: p.gstNumber || p.gstin || '',
      drugLicenseNumber: p.drugLicenseNumber || p.licenseNumber || '',
      licenseExpiry: p.licenseExpiry || '',
      emergencyContact: p.emergencyContact || '',
      reorderThreshold: p.reorderThreshold || 10,
      barcodeEnabled: !!p.barcodeEnabled,
      printerEnabled: !!p.printerEnabled,
      invoicePrefix: p.invoicePrefix || ''
    };
  });

  const mappedDrafts = drafts.map(d => {
    let completionPercentage = 25;
    if (d.currentStep === 2) completionPercentage = 50;
    if (d.currentStep === 3) completionPercentage = 75;
    if (d.currentStep === 4) completionPercentage = 100;

    return {
      providerId: d._id,
      _id: d._id,
      providerType: d.providerType,
      status: d.status || 'Draft',
      name: d.basicInfo?.name || 'New Draft',
      draftStatus: 'Draft',
      branch: d.basicInfo?.assignedBranchName || 'Main Branch',
      manager: d.manager?.contactPerson || null,
      email: d.basicInfo?.email || '',
      phone: d.basicInfo?.phone || '',
      ownership: d.basicInfo?.providerSubtype || 'Internal',
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      completionPercentage,
      currentStep: d.currentStep,
      // For expand view:
      contactPerson: d.manager?.contactPerson || '',
      managerPhone: d.manager?.managerPhone || '',
      managerEmail: d.manager?.managerEmail || '',
      managerGender: d.manager?.managerGender || '',
      managerEmployeeId: d.manager?.managerEmployeeId || '',
      workingHours: d.operationalSetup?.workingHours || { openingTime: '09:00', closingTime: '21:00' },
      gstNumber: d.operationalSetup?.gstNumber || '',
      drugLicenseNumber: d.operationalSetup?.drugLicenseNumber || '',
      licenseExpiry: d.operationalSetup?.licenseExpiry || '',
      emergencyContact: d.operationalSetup?.emergencyContact || '',
      reorderThreshold: d.operationalSetup?.reorderThreshold || 10,
      barcodeEnabled: !!d.operationalSetup?.barcodeEnabled,
      printerEnabled: !!d.operationalSetup?.printerEnabled,
      invoicePrefix: d.operationalSetup?.invoicePrefix || ''
    };
  });

  return sendSuccess(res, 'Healthcare providers retrieved successfully', {
    providers: [...mappedProviders, ...mappedDrafts]
  });
});

module.exports = {
  getHealthcareProviders,
  getSubscriptionModules,
  createClinic,
  listClinics,
  getClinicDetails,
  updateClinic,
  launchOnboarding,
  getOnboardingProgressStream,
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
  validatePhone,
  sendOtp,
  verifyOtp,
  resubmitRegistration,
  requestRefund,
  updateRefundStatus,
  getOnboardingFlow,
  activateTrialFeature,
  updateBillingSettings,
  getBillingSettings,
  validateRegistrationNumber,
  uploadFile,
  deleteFile,
  saveDraft,
  getDraft,
  saveOnboardingDraft,
  getOnboardingDraft,
  deleteOnboardingDraft
};
