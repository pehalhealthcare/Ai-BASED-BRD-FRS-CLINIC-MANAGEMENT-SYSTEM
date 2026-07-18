const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { PUBLIC_REGISTRATION_ROLES, ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { sanitizeUser } = require('../../common/utils/sanitizeUser');
const { logAuthEvent } = require('../audit/audit.service');
const userRepository = require('../users/user.repository');
const { findDefaultClinicId } = require('../../common/utils/clinicContext');
const { generateAccessToken } = require('./token.service');

const register = async (payload, req) => {
  const requestedRole = payload.role || ROLES.PATIENT;

  if (!PUBLIC_REGISTRATION_ROLES.includes(requestedRole)) {
    throw new AppError('Public registration cannot create the requested role', HTTP_STATUS.FORBIDDEN);
  }

  const existingUser = await userRepository.findByEmail(payload.email);

  if (existingUser) {
    throw new AppError('Email already in use', HTTP_STATUS.CONFLICT, [{ field: 'email', message: 'Email already exists' }]);
  }

  const defaultClinicId = await findDefaultClinicId();
  const isDoctorRole = requestedRole === ROLES.DOCTOR;
  const isReceptionistRole = requestedRole === ROLES.RECEPTIONIST;
  const { STAFF_ROLES } = require('../../common/constants/roles');
  const isStaffRole = STAFF_ROLES.includes(requestedRole);
  const user = await userRepository.createUser({
    ...payload,
    role: requestedRole,
    isActive: true,
    approvalStatus: (isDoctorRole || isStaffRole) ? 'pending_profile' : 'approved',
    ...(defaultClinicId ? { clinicId: defaultClinicId } : {})
  });

  if (isDoctorRole) {
    const Doctor = require('../doctors/doctor.model');
    const parts = user.name ? user.name.split(' ') : ['Doctor'];
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';

    await Doctor.create({
      userId: user._id,
      organizationId: user.organizationId || null,
      firstName,
      lastName,
      fullName: user.name,
      phone: user.phone || '9000000000',
      email: user.email,
      isActive: false,
      approvalStatus: 'pending_profile',
      specialization: '',
      qualification: '',
      medicalRegistrationNumber: '',
      experienceYears: 0,
      consultationFee: 0,
      followUpFee: 0,
      isOnlineAvailable: false,
      image: '',
      documentPdf: '',
      availability: [],
      currentAddress: {
        line1: payload.address?.line1 || '',
        line2: payload.address?.line2 || '',
        city: payload.address?.city || '',
        state: payload.address?.state || '',
        pincode: payload.address?.pincode || '',
        country: payload.address?.country || 'India',
        latitude: payload.address?.latitude || null,
        longitude: payload.address?.longitude || null
      },
      permanentAddress: {
        line1: payload.permanentAddress?.line1 || payload.address?.line1 || '',
        line2: payload.permanentAddress?.line2 || payload.address?.line2 || '',
        city: payload.permanentAddress?.city || payload.address?.city || '',
        state: payload.permanentAddress?.state || payload.address?.state || '',
        pincode: payload.permanentAddress?.pincode || payload.address?.pincode || '',
        country: payload.permanentAddress?.country || payload.address?.country || 'India',
        latitude: payload.permanentAddress?.latitude || payload.address?.latitude || null,
        longitude: payload.permanentAddress?.longitude || payload.address?.longitude || null
      }
    });
  }

  if (isReceptionistRole) {
    const Receptionist = require('../receptionists/receptionist.model');
    const parts = user.name ? user.name.split(' ') : ['Receptionist'];
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';

    await Receptionist.create({
      userId: user._id,
      organizationId: user.organizationId || null,
      firstName,
      lastName,
      fullName: user.name,
      phone: user.phone || '9000000000',
      email: user.email,
      isActive: false,
      approvalStatus: 'pending_profile',
      qualification: '',
      experienceYears: 0,
      image: '',
      documentPdf: '',
      availability: [],
      currentAddress: {
        line1: payload.address?.line1 || '',
        line2: payload.address?.line2 || '',
        city: payload.address?.city || '',
        state: payload.address?.state || '',
        pincode: payload.address?.pincode || '',
        country: payload.address?.country || 'India',
        latitude: payload.address?.latitude || null,
        longitude: payload.address?.longitude || null
      },
      permanentAddress: {
        line1: payload.permanentAddress?.line1 || payload.address?.line1 || '',
        line2: payload.permanentAddress?.line2 || payload.address?.line2 || '',
        city: payload.permanentAddress?.city || payload.address?.city || '',
        state: payload.permanentAddress?.state || payload.address?.state || '',
        pincode: payload.permanentAddress?.pincode || payload.address?.pincode || '',
        country: payload.permanentAddress?.country || payload.address?.country || 'India',
        latitude: payload.permanentAddress?.latitude || payload.address?.latitude || null,
        longitude: payload.permanentAddress?.longitude || payload.address?.longitude || null
      }
    });
  }

  if (isStaffRole) {
    const Staff = require('../staff/staff.model');
    const parts = user.name ? user.name.split(' ') : ['Staff'];
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    const staffCode = `STF-${String(user._id).slice(-4).toUpperCase()}`;

    await Staff.create({
      userId: user._id,
      organizationId: user.organizationId || null,
      firstName,
      lastName,
      fullName: user.name,
      phone: user.phone || '9000000000',
      email: user.email,
      role: requestedRole,
      staffCode,
      isActive: false,
      approvalStatus: 'pending_profile',
      currentAddress: {
        line1: payload.address?.line1 || '',
        line2: payload.address?.line2 || '',
        city: payload.address?.city || '',
        state: payload.address?.state || '',
        pincode: payload.address?.pincode || '',
        country: payload.address?.country || 'India',
        latitude: payload.address?.latitude || null,
        longitude: payload.address?.longitude || null
      },
      permanentAddress: {
        line1: payload.permanentAddress?.line1 || payload.address?.line1 || '',
        line2: payload.permanentAddress?.line2 || payload.address?.line2 || '',
        city: payload.permanentAddress?.city || payload.address?.city || '',
        state: payload.permanentAddress?.state || payload.address?.state || '',
        pincode: payload.permanentAddress?.pincode || payload.address?.pincode || '',
        country: payload.permanentAddress?.country || payload.address?.country || 'India',
        latitude: payload.permanentAddress?.latitude || payload.address?.latitude || null,
        longitude: payload.permanentAddress?.longitude || payload.address?.longitude || null
      }
    });
  }

  if (requestedRole === ROLES.PATIENT) {
    const patientRepository = require('../patients/patient.repository');
    const { generatePatientId } = require('../../common/utils/generatePatientId');
    const parts = user.name ? user.name.split(' ') : ['Patient'];
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || 'Patient';

    await patientRepository.createPatient({
      clinicId: defaultClinicId,
      patientId: await generatePatientId(defaultClinicId),
      firstName,
      lastName,
      fullName: user.name || 'Patient',
      gender: payload.gender || 'other',
      dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
      age: payload.age || null,
      email: user.email,
      phone: user.phone || '9000000000',
      address: {
        line1: payload.address?.line1 || '',
        line2: payload.address?.line2 || '',
        city: payload.address?.city || '',
        state: payload.address?.state || '',
        pincode: payload.address?.pincode || '',
        country: payload.address?.country || 'India',
        latitude: payload.address?.latitude || null,
        longitude: payload.address?.longitude || null
      },
      permanentAddress: {
        line1: payload.permanentAddress?.line1 || payload.address?.line1 || '',
        line2: payload.permanentAddress?.line2 || payload.address?.line2 || '',
        city: payload.permanentAddress?.city || payload.address?.city || '',
        state: payload.permanentAddress?.state || payload.address?.state || '',
        pincode: payload.permanentAddress?.pincode || payload.address?.pincode || '',
        country: payload.permanentAddress?.country || payload.address?.country || 'India',
        latitude: payload.permanentAddress?.latitude || payload.address?.latitude || null,
        longitude: payload.permanentAddress?.longitude || payload.address?.longitude || null
      },
      allergies: payload.allergies || [],
      chronicConditions: payload.chronicConditions || [],
      currentMedications: payload.currentMedications || [],
      pastSurgeries: payload.pastSurgeries || [],
      familyHistory: payload.familyHistory || [],
      lifestyle: payload.lifestyle || undefined,
      pregnancyHistory: payload.pregnancyHistory || '',
      lmpDate: payload.lmpDate ? new Date(payload.lmpDate) : null,
      isActive: true,
      createdBy: user._id,
      updatedBy: user._id
    });
  }

  const accessToken = generateAccessToken(user);

  await logAuthEvent({
    actorUserId: user._id,
    action: 'USER_REGISTERED',
    status: 'SUCCESS',
    req,
    metadata: {
      email: user.email,
      role: user.role
    }
  });

  return {
    user: sanitizeUser(user),
    accessToken
  };
};

const login = async ({ email, password }, req) => {
  const user = await userRepository.findByEmail(email, { includePassword: true });

  if (!user) {
    await logAuthEvent({
      action: 'USER_LOGIN_FAILED',
      status: 'FAILURE',
      req,
      metadata: { email, reason: 'USER_NOT_FOUND' }
    });

    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    await logAuthEvent({
      actorUserId: user._id,
      action: 'USER_LOGIN_FAILED',
      status: 'FAILURE',
      req,
      metadata: { email, reason: 'INVALID_PASSWORD' }
    });

    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
  }

  const { STAFF_ROLES } = require('../../common/constants/roles');
  const isStaffFirstLogin = STAFF_ROLES.includes(user.role) && 
    ['pending_invitation', 'otp_verification_pending'].includes(user.approvalStatus) && 
    !user.isEmailVerified;

  if (isStaffFirstLogin) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailOtp = otp;
    user.emailOtpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.approvalStatus = 'otp_verification_pending';
    await user.save({ validateBeforeSave: false });

    const nodemailer = require('nodemailer');
    const { env } = require('../../config/env');
    const { logger } = require('../../common/utils/logger');
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
        subject: 'AICMS Verification OTP',
        text: `Your verification OTP code is: ${otp}. It is valid for 24 hours.`,
        html: `Your verification OTP code is: <b>${otp}</b>.<br>It is valid for 24 hours.`
      });
      logger.info(`[staff:otp] Sent successfully to ${user.email}`);
    } catch (err) {
      logger.error('[staff:otp] Failed to send email via SMTP', err);
    }
    
    return {
      requiresOtp: true,
      email: user.email,
      role: user.role
    };
  }

  if (user.role === ROLES.DOCTOR && user.approvalStatus === 'pending_profile' && !user.isEmailVerified) {
    const nodemailer = require('nodemailer');
    const { env } = require('../../config/env');
    const { logger } = require('../../common/utils/logger');
    const Clinic = require('../clinics/clinic.model');

    const doctorClinic = user.clinicId ? await Clinic.findById(user.clinicId) : null;
    const isAdminCreated = doctorClinic && doctorClinic.approvalStatus === 'approved';

    if (isAdminCreated) {
      user.isEmailVerified = true;
      await user.save({ validateBeforeSave: false });
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.emailOtp = otp;
      user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

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
          subject: 'AICMS Verification OTP',
          text: `Your verification OTP code is: ${otp}. It is valid for 10 minutes.`,
          html: `Your verification OTP code is: <b>${otp}</b>.<br>It is valid for 10 minutes.`
        });
        logger.info(`[doctor:otp] Sent successfully to ${user.email}`);
      } catch (err) {
        logger.error('[doctor:otp] Failed to send email via SMTP', err);
      }

      return {
        requiresOtp: true,
        email: user.email,
        role: user.role
      };
    }
  }

  const Clinic = require('../clinics/clinic.model');
  let clinicDetails = null;

  if (user.role === ROLES.ADMIN) {
    if (user.clinicId) {
      clinicDetails = await Clinic.findById(user.clinicId).populate('subscription.planId');
    }
  } else if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.PATIENT) {
    // This is staff (DOCTOR, RECEPTIONIST, PHARMACIST, etc.)
    if (!user.clinicId) {
      throw new AppError('Staff user does not belong to any clinic.', HTTP_STATUS.FORBIDDEN);
    }
    const staffClinic = await Clinic.findById(user.clinicId);
    if (!staffClinic || staffClinic.approvalStatus !== 'approved') {
      throw new AppError('Your clinic is not approved yet. Staff login is blocked.', HTTP_STATUS.FORBIDDEN);
    }
    clinicDetails = staffClinic;
    if (staffClinic.subscription?.status === 'Suspended' || staffClinic.approvalStatus === 'suspended') {
      throw new AppError('Your clinic account is suspended. Staff login is blocked.', HTTP_STATUS.FORBIDDEN);
    }
    if (staffClinic.subscription?.status === 'Expired') {
      throw new AppError('Your clinic subscription is expired. Staff login is blocked.', HTTP_STATUS.FORBIDDEN);
    }
  }

  // Bypass inactive/rejection check for ADMIN role so they can see portals
  const isBypassedRole = user.role === ROLES.ADMIN;
  if (!isBypassedRole) {
    const isOnboardingOrPending = [
      'pending_profile',
      'onboarding_in_progress',
      'pending_approval',
      're_edit',
      'changes_requested'
    ].includes(user.approvalStatus);

    if (!isOnboardingOrPending && (!user.isActive || user.deletedAt || user.approvalStatus === 'rejected')) {
      await logAuthEvent({
        actorUserId: user._id,
        action: 'USER_LOGIN_FAILED',
        status: 'FAILURE',
        req,
        metadata: { email, reason: 'ACCOUNT_INACTIVE_OR_REJECTED' }
      });

      throw new AppError('Your account is inactive or rejected. Please contact support.', HTTP_STATUS.FORBIDDEN);
    }
  } else {
    // If ADMIN but inactive/deleted (except rejected/pending which we want to allow for their special portals)
    if (!user.isActive || user.deletedAt) {
      throw new AppError('User account is inactive', HTTP_STATUS.FORBIDDEN);
    }
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const { ensureUserClinicContext } = require('../../common/utils/clinicContext');
  await ensureUserClinicContext(user);

  await logAuthEvent({
    actorUserId: user._id,
    action: 'USER_LOGIN_SUCCESS',
    status: 'SUCCESS',
    req,
    metadata: { email }
  });

  const sanitizedUser = sanitizeUser(user);
  if (clinicDetails) {
    sanitizedUser.clinic = {
      _id: clinicDetails._id,
      name: clinicDetails.name,
      approvalStatus: clinicDetails.approvalStatus,
      isOnboardingCompleted: clinicDetails.isOnboardingCompleted,
      subscription: clinicDetails.subscription,
      rejectionReason: clinicDetails.rejectionReason,
      rejectionComments: clinicDetails.rejectionComments,
      incorrectFields: clinicDetails.incorrectFields,
      requestedDocuments: clinicDetails.requestedDocuments,
      refundStatus: clinicDetails.refundStatus,
      refundReason: clinicDetails.refundReason
    };
  }

  return {
    user: sanitizedUser,
    accessToken: generateAccessToken(user)
  };
};

const getCurrentUser = async (user) => {
  const sanitizedUser = sanitizeUser(user);
  if (user.clinicId) {
    const Clinic = require('../clinics/clinic.model');
    const clinicDetails = await Clinic.findById(user.clinicId).populate('subscription.planId');
    if (clinicDetails) {
      sanitizedUser.clinic = {
        _id: clinicDetails._id,
        name: clinicDetails.name,
        approvalStatus: clinicDetails.approvalStatus,
        isOnboardingCompleted: clinicDetails.isOnboardingCompleted,
        subscription: clinicDetails.subscription,
        rejectionReason: clinicDetails.rejectionReason,
        rejectionComments: clinicDetails.rejectionComments,
        incorrectFields: clinicDetails.incorrectFields,
        requestedDocuments: clinicDetails.requestedDocuments,
        refundStatus: clinicDetails.refundStatus,
        refundReason: clinicDetails.refundReason
      };
    }
  }
  return sanitizedUser;
};

const logout = () => ({
  message: 'Logout successful'
});

const resetPassword = async (payload, req) => {
  const { email, password } = payload;

  const User = require('../users/user.model');
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new AppError('User not found with this email address', HTTP_STATUS.NOT_FOUND);
  }

  // TODO: FUTURE SECURITY INTEGRATION
  // ---------------------------------
  // At this point in a production environment, before allowing a password reset,
  // you must verify the user's identity. For example:
  // 1. Verify a one-time OTP sent to their registered phone number/email.
  // 2. Validate a cryptographically secure token sent via a password reset email.
  // 3. Perform security questions or MFA verification.
  // 4. Ensure the request is within a valid time window and has not been expired/revoked.

  user.password = password;
  await user.save();

  await logAuthEvent({
    actorUserId: user._id,
    action: 'USER_PASSWORD_RESET',
    status: 'SUCCESS',
    req,
    metadata: { email }
  });

  return { message: 'Password updated successfully' };
};

const verifyFirstLoginOtp = async ({ email, otp, newPassword }) => {
  const User = require('../users/user.model');
  const bcrypt = require('bcryptjs');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const isDoctorEligible = user.role === ROLES.DOCTOR && user.approvalStatus === 'pending_profile';
  const { STAFF_ROLES } = require('../../common/constants/roles');
  const isStaffEligible = STAFF_ROLES.includes(user.role) && 
    ['pending_invitation', 'otp_verification_pending'].includes(user.approvalStatus);

  if (!isDoctorEligible && !isStaffEligible) {
    throw new AppError('User is not eligible for first-time OTP verification', HTTP_STATUS.BAD_REQUEST);
  }

  if (!user.emailOtp || user.emailOtp !== otp) {
    throw new AppError('Invalid OTP code', HTTP_STATUS.BAD_REQUEST);
  }

  if (user.emailOtpExpires < new Date()) {
    throw new AppError('OTP code has expired', HTTP_STATUS.BAD_REQUEST);
  }

  // OTP is valid!
  user.isEmailVerified = true;
  user.emailOtp = null;
  user.emailOtpExpires = null;

  if (isStaffEligible) {
    user.approvalStatus = 'onboarding_in_progress';
    const Staff = require('../staff/staff.model');
    await Staff.updateOne({ userId: user._id }, { approvalStatus: 'onboarding_in_progress' });
  }

  // Force password update
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save({ validateBeforeSave: false });

  // Return generated access token for seamless experience
  const sanitizedUser = sanitizeUser(user);
  return {
    user: sanitizedUser,
    accessToken: generateAccessToken(user)
  };
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  resetPassword,
  verifyFirstLoginOtp
};
