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
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return sanitizeUser(user);
};

module.exports = {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus
};
