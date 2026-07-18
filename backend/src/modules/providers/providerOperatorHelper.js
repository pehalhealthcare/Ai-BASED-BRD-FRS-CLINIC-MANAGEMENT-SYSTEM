const User = require('../users/user.model');
const Staff = require('../staff/staff.model');
const Clinic = require('../clinics/clinic.model');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { env } = require('../../config/env');
const { logger } = require('../../common/utils/logger');
const { createAuditLog } = require('../audit/audit.service');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');

const mapProviderTypeToRole = (providerType) => {
  if (providerType === 'Pharmacy') return 'Pharmacy Store Operator';
  if (providerType === 'Laboratory') return 'Laboratory Operator';
  if (providerType === 'Imaging Center') return 'Imaging Operator';
  if (providerType === 'Physiotherapy Center' || providerType === 'Physiotherapy') return 'Physiotherapy Operator';
  if (providerType === 'Ambulance Service' || providerType === 'Ambulance') return 'Ambulance Coordinator';
  if (providerType === 'Home Care Provider' || providerType === 'Home Care') return 'Home Care Operator';
  return `${providerType} Operator`;
};

const createOperatorStaff = async (clinicId, provider, actorUserId) => {
  const role = mapProviderTypeToRole(provider.providerType);
  const department = provider.providerType;

  // Validate email availability
  const existingUser = await User.findOne({ email: provider.email.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user with this operator email address already exists', HTTP_STATUS.CONFLICT);
  }

  // Create User
  const tempPassword = provider.phone;
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await User.create({
    name: provider.contactPerson,
    email: provider.email.toLowerCase(),
    phone: provider.phone,
    password: hashedPassword,
    role,
    department,
    clinicId,
    providerId: provider._id,
    assignedProviderId: provider._id,
    origin: 'provider_operator',
    isActive: false,
    approvalStatus: 'pending_invitation',
    isEmailVerified: false
  });

  // Create Staff
  const parts = provider.contactPerson ? provider.contactPerson.split(' ') : ['Operator'];
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || '';
  const staffCode = `OPR-${String(user._id).slice(-4).toUpperCase()}`;

  const staff = await Staff.create({
    userId: user._id,
    firstName,
    lastName,
    fullName: provider.contactPerson,
    phone: provider.phone,
    email: provider.email.toLowerCase(),
    role,
    department,
    clinicId,
    assignedClinics: [clinicId],
    staffCode,
    isActive: false,
    approvalStatus: 'pending_invitation',
    origin: 'provider_operator',
    assignedProviderId: provider._id,
    createdBy: actorUserId,
    updatedBy: actorUserId
  });

  // Update Provider linkage
  provider.operatorStaffId = staff._id;
  await provider.save();

  // Send onboarding email
  const clinic = await Clinic.findById(clinicId);
  const clinicName = clinic ? clinic.name : 'AICMS Clinic';
  const secureLoginLink = `${env.frontendUrl || 'http://localhost:3000'}/login?type=staff`;

  const subject = `Welcome to ${clinicName} - Operator Account Created`;
  const body = `Hello ${provider.contactPerson},

An operator account has been created for you at ${clinicName} for the operational unit: "${provider.name}" (${provider.providerType}).

Assigned Role: ${role}

Please use the following credentials to log in and verify your account:
- Login ID (Email): ${provider.email.toLowerCase()}
- Temporary Password (Registered Phone Number): ${tempPassword}

Secure Login Link: ${secureLoginLink}

On your first login, enter your Login ID and Temporary Password. A verification OTP code will be sent to your email to verify and complete your onboarding profile.`;

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
    logger.info(`[provider:operator-invite] Sent successfully to ${user.email}`);
  } catch (error) {
    logger.error('[provider:operator-invite] Failed to send email via SMTP', error);
  }

  // Audit Logs
  await createAuditLog({
    actorUserId,
    action: 'OPERATOR_STAFF_CREATED',
    entity: 'Staff',
    entityId: staff._id,
    metadata: { providerId: provider._id, email: user.email },
    status: 'SUCCESS'
  });

  await createAuditLog({
    actorUserId,
    action: 'INVITATION_SENT',
    entity: 'User',
    entityId: user._id,
    metadata: { email: user.email },
    status: 'SUCCESS'
  });

  return staff;
};

const replaceOperatorStaff = async (clinicId, provider, oldProvider, actorUserId) => {
  // If operator details changed
  const detailsChanged =
    provider.contactPerson !== oldProvider.contactPerson ||
    provider.email.toLowerCase() !== oldProvider.email.toLowerCase() ||
    provider.phone !== oldProvider.phone;

  if (!detailsChanged) return;

  // Unlink & deactivate old operator staff if exists
  if (oldProvider.operatorStaffId) {
    const oldStaff = await Staff.findById(oldProvider.operatorStaffId);
    if (oldStaff) {
      oldStaff.isActive = false;
      oldStaff.assignedProviderId = null;
      // Keep record but mark disabled/unassigned
      oldStaff.approvalStatus = 'disabled';
      await oldStaff.save();

      const oldUser = await User.findById(oldStaff.userId);
      if (oldUser) {
        oldUser.isActive = false;
        oldUser.assignedProviderId = null;
        oldUser.providerId = null;
        oldUser.approvalStatus = 'disabled';
        await oldUser.save();
      }

      await createAuditLog({
        actorUserId,
        action: 'PROVIDER_REASSIGNED',
        entity: 'Provider',
        entityId: provider._id,
        metadata: { unlinkedStaffId: oldStaff._id },
        status: 'SUCCESS'
      });
    }
  }

  // Create new operator staff
  await createOperatorStaff(clinicId, provider, actorUserId);
};

const handleStatusChange = async (clinicId, provider, newStatus, actorUserId) => {
  if (!provider.operatorStaffId) return;

  const staff = await Staff.findById(provider.operatorStaffId);
  if (!staff) return;

  const user = await User.findById(staff.userId);

  if (newStatus === 'Inactive' || newStatus === 'Suspended') {
    staff.isActive = false;
    staff.approvalStatus = 'disabled';
    staff.reEditComments = 'Healthcare Provider Disabled';
    await staff.save();

    if (user) {
      user.isActive = false;
      user.approvalStatus = 'disabled';
      await user.save();
    }

    await createAuditLog({
      actorUserId,
      action: 'OPERATOR_DISABLED',
      entity: 'Staff',
      entityId: staff._id,
      metadata: { reason: 'Healthcare Provider Disabled' },
      status: 'SUCCESS'
    });
  } else if (newStatus === 'Active') {
    // Reactivate
    staff.isActive = true;
    staff.approvalStatus = 'approved';
    staff.reEditComments = 'Healthcare Provider Activated';
    await staff.save();

    if (user) {
      user.isActive = true;
      user.approvalStatus = 'approved';
      await user.save();
    }

    await createAuditLog({
      actorUserId,
      action: 'OPERATOR_ACTIVATED',
      entity: 'Staff',
      entityId: staff._id,
      metadata: { reason: 'Healthcare Provider Activated' },
      status: 'SUCCESS'
    });
  }
};

module.exports = {
  createOperatorStaff,
  replaceOperatorStaff,
  handleStatusChange
};
