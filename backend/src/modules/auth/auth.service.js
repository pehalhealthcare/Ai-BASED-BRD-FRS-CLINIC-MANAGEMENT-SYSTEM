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
  const user = await userRepository.createUser({
    ...payload,
    role: requestedRole,
    isActive: true,
    approvalStatus: isDoctorRole ? 'pending_profile' : 'approved',
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
      availability: []
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
        country: payload.address?.country || 'India'
      },
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

  if (!user.isActive || user.deletedAt || user.approvalStatus === 'rejected') {
    await logAuthEvent({
      actorUserId: user._id,
      action: 'USER_LOGIN_FAILED',
      status: 'FAILURE',
      req,
      metadata: { email, reason: user.approvalStatus === 'rejected' ? 'REJECTED' : 'INACTIVE_OR_DELETED' }
    });

    throw new AppError(
      user.approvalStatus === 'rejected'
        ? 'Your registration request has been rejected.'
        : 'User account is inactive',
      HTTP_STATUS.FORBIDDEN
    );
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

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user)
  };
};

const getCurrentUser = (user) => sanitizeUser(user);

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

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  resetPassword
};
