const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ADMIN_ROLES, ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { sanitizeUser } = require('../../common/utils/sanitizeUser');
const { createAuditLog } = require('../audit/audit.service');
const userRepository = require('./user.repository');

const buildUserFilter = ({ role, isActive, search }) => {
  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  return filter;
};

const listUsers = async (query) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const filter = buildUserFilter(query);
  const { users, total } = await userRepository.listUsers({ filter, page, limit });

  return {
    users: users.map(sanitizeUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const getUserById = async ({ requester, userId }) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const isSelf = String(requester._id) === String(user._id);
  const isAdmin = ADMIN_ROLES.includes(requester.role);

  if (!isSelf && !isAdmin) {
    throw new AppError('You do not have permission to view this user', HTTP_STATUS.FORBIDDEN);
  }

  return sanitizeUser(user);
};

const updateUserRole = async ({ requester, userId, role, req }) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.role === ROLES.SUPER_ADMIN && role !== ROLES.SUPER_ADMIN) {
    const superAdminCount = await userRepository.countByRole(ROLES.SUPER_ADMIN);

    if (superAdminCount <= 1) {
      throw new AppError('Cannot change role of the last SUPER_ADMIN', HTTP_STATUS.BAD_REQUEST);
    }
  }

  user.role = role;
  user.updatedBy = requester._id;
  await user.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'USER_ROLE_UPDATED',
    entity: 'User',
    entityId: user._id,
    metadata: { newRole: role },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return sanitizeUser(user);
};

const updateUserStatus = async ({ requester, userId, isActive, req }) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(requester._id) === String(user._id) && isActive === false) {
    throw new AppError('You cannot deactivate your own account', HTTP_STATUS.BAD_REQUEST);
  }

  if (requester.role === ROLES.ADMIN && user.role === ROLES.SUPER_ADMIN) {
    throw new AppError('ADMIN cannot modify SUPER_ADMIN status', HTTP_STATUS.FORBIDDEN);
  }

  user.isActive = isActive;
  user.updatedBy = requester._id;
  await user.save();

  if (user.role === ROLES.DOCTOR) {
    const Doctor = require('../doctors/doctor.model');
    await Doctor.updateOne({ userId: user._id }, { isActive });
  }

  const { STAFF_ROLES } = require('../../common/constants/roles');
  if (STAFF_ROLES.includes(user.role)) {
    const Staff = require('../staff/staff.model');
    await Staff.updateOne({ userId: user._id }, { isActive });
    // Also keep receptionist for backward compatibility
    if (user.role === ROLES.RECEPTIONIST) {
      const Receptionist = require('../receptionists/receptionist.model');
      await Receptionist.updateOne({ userId: user._id }, { isActive });
    }
  }

  if (user.role === ROLES.DOCTOR && isActive) {
    const doctorRepository = require('../doctors/doctor.repository');
    const existingDoctor = await doctorRepository.findDoctorByUserId({ userId: user._id });
    if (!existingDoctor) {
      const parts = user.name ? user.name.split(' ') : ['Doctor'];
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || 'Doctor';
      
      const demoAvailability = [
        { dayOfWeek: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
        { dayOfWeek: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
        { dayOfWeek: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
        { dayOfWeek: 'thursday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
        { dayOfWeek: 'friday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true }
      ];

      await doctorRepository.createDoctor({
        clinicId: user.clinicId,
        userId: user._id,
        doctorCode: `DOC-${String(user._id).slice(-4).toUpperCase()}`,
        firstName,
        lastName,
        fullName: user.name || 'Doctor',
        email: user.email,
        phone: user.phone || '9000000000',
        specialization: 'General Physician',
        consultationFee: 500,
        availability: demoAvailability,
        blockedSlots: [],
        isActive: true,
        createdBy: requester._id,
        updatedBy: requester._id
      });
    }
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'USER_STATUS_UPDATED',
    entity: 'User',
    entityId: user._id,
    metadata: { isActive },
    ipAddress: req.ip,
    userAgent: req.get.bind(req) ? req.get('user-agent') : '',
    status: 'SUCCESS'
  });

  return sanitizeUser(user);
};

const createStaffByAdmin = async ({ name, email, phone, password, role, requester, requestedClinicId = null }) => {
  const { resolveClinicContext } = require('../../common/utils/clinicContext');
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  const { STAFF_ROLES } = require('../../common/constants/roles');
  if (!STAFF_ROLES.includes(role)) {
    throw new AppError('Invalid staff role selected', HTTP_STATUS.BAD_REQUEST);
  }

  const User = require('./user.model');
  const bcrypt = require('bcryptjs');
  const nodemailer = require('nodemailer');
  const { env } = require('../../config/env');
  const { logger } = require('../../common/utils/logger');
  const Clinic = require('../clinics/clinic.model');

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user with this email address already exists', HTTP_STATUS.CONFLICT);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    password: hashedPassword,
    role,
    clinicId,
    isActive: false, // Inactive until approved
    approvalStatus: 'pending_invitation',
    emailOtp: null,
    emailOtpExpires: null,
    isEmailVerified: false
  });

  const Staff = require('../staff/staff.model');
  const parts = name ? name.split(' ') : ['Staff'];
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || '';
  const staffCode = `STF-${String(user._id).slice(-4).toUpperCase()}`;

  const staff = await Staff.create({
    userId: user._id,
    firstName,
    lastName,
    fullName: name,
    phone: phone || '9000000000',
    email: email.toLowerCase(),
    role,
    clinicId,
    assignedClinics: [clinicId],
    staffCode,
    isActive: false,
    approvalStatus: 'pending_invitation',
    createdBy: requester._id,
    updatedBy: requester._id
  });

  // For backward compatibility, if role is RECEPTIONIST, also create the receptionist profile document
  if (role === ROLES.RECEPTIONIST) {
    const Receptionist = require('../receptionists/receptionist.model');
    await Receptionist.create({
      userId: user._id,
      firstName,
      lastName,
      fullName: name,
      phone: phone || '9000000000',
      email: email.toLowerCase(),
      clinicId,
      assignedClinics: [clinicId],
      receptionistCode: staffCode,
      isActive: false,
      approvalStatus: 'pending_invitation'
    });
  }

  // Send email invitation
  const clinic = await Clinic.findById(clinicId);
  const clinicName = clinic ? clinic.name : 'AICMS Clinic';
  const subject = `Welcome to ${clinicName} - Staff Account Created`;
  
  const secureLoginLink = `${env.frontendUrl || 'http://localhost:3000'}/login?type=staff`;
  
  const body = `Hello ${name},

An account has been created for you as a ${role} at ${clinicName}.

Please use the following credentials to verify your account:
- Login ID (Email): ${email.toLowerCase()}
- Temporary Password (Registered Phone Number): ${phone}

Secure Login Link: ${secureLoginLink}

On your first login, enter your Login ID and Temporary Password. A verification OTP code will be generated and sent to your email at that time. Verify the OTP code, then set your new password to complete your profile onboarding.`;

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
    logger.info(`[staff:invite] Sent successfully to ${user.email}`);
  } catch (error) {
    logger.error('[staff:invite] Failed to send email via SMTP', error);
  }

  return sanitizeUser(user);
};

const deleteUser = async ({ requester, userId }) => {
  const User = require('./user.model');
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (String(requester._id) === String(user._id)) {
    throw new AppError('You cannot delete your own account', 400);
  }

  if (requester.role === ROLES.ADMIN) {
    if (String(user.clinicId) !== String(requester.clinicId)) {
      throw new AppError('You are not authorized to delete users outside of your clinic', 403);
    }
  }

  const { STAFF_ROLES } = require('../../common/constants/roles');
  if (STAFF_ROLES.includes(user.role)) {
    const Staff = require('../staff/staff.model');
    await Staff.deleteMany({ userId: user._id });
    
    if (user.role === ROLES.RECEPTIONIST) {
      const Receptionist = require('../receptionists/receptionist.model');
      await Receptionist.deleteMany({ userId: user._id });
    }
  }

  await User.deleteOne({ _id: user._id });
  return { id: userId };
};

module.exports = {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  createStaffByAdmin,
  deleteUser
};
