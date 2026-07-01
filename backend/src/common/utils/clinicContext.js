const { ROLES } = require('../constants/roles');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { AppError } = require('./AppError');

const normalizeClinicId = (value) => {
  if (!value) {
    return null;
  }

  return String(value);
};

const resolveClinicContext = ({ user, requestedClinicId = null }) => {
  const userClinicId = normalizeClinicId(user?.clinicId);
  const requested = normalizeClinicId(requestedClinicId);

  // If user is receptionist or doctor, restrict access to their assigned clinicId ONLY
  if (user && (user.role === ROLES.RECEPTIONIST || user.role === ROLES.DOCTOR)) {
    if (!userClinicId) {
      throw new AppError('Clinic context is required for this operation.', HTTP_STATUS.FORBIDDEN);
    }
    return userClinicId;
  }

  if (requested) {
    return requested;
  }

  if (userClinicId) {
    return userClinicId;
  }

  throw new AppError('Clinic context is required for this operation.', HTTP_STATUS.FORBIDDEN);
};

const findPatientClinicId = async (user) => {
  const Patient = require('../../modules/patients/patient.model');
  const filters = [];

  if (user?.email) {
    filters.push({ email: String(user.email).trim().toLowerCase() });
  }

  if (user?.phone) {
    filters.push({ phone: String(user.phone).trim() });
  }

  if (!filters.length) {
    return null;
  }

  const patient = await Patient.findOne({
    isActive: { $ne: false },
    $or: filters
  }).sort({ updatedAt: -1 });

  return patient?.clinicId ? String(patient.clinicId) : null;
};

const findDoctorClinicId = async (user) => {
  const Doctor = require('../../modules/doctors/doctor.model');
  const doctor = await Doctor.findOne({
    userId: user._id,
    isActive: { $ne: false }
  }).sort({ updatedAt: -1 });

  return doctor?.clinicId ? String(doctor.clinicId) : null;
};

const findDefaultClinicId = async () => {
  const Clinic = require('../../modules/clinics/clinic.model');
  const clinic = await Clinic.findOne({ isActive: true }).sort({ createdAt: 1 });

  return clinic?._id ? String(clinic._id) : null;
};

const resolveMissingClinicIdForUser = async (user) => {
  if (user?.role === ROLES.PATIENT) {
    return findPatientClinicId(user);
  }

  if (user?.role === ROLES.DOCTOR) {
    const doctorClinicId = await findDoctorClinicId(user);

    if (doctorClinicId) {
      return doctorClinicId;
    }
  }

  return findDefaultClinicId();
};

const ensureUserClinicContext = async (user) => {
  if (!user) {
    return null;
  }

  let clinicId = normalizeClinicId(user.clinicId);

  if (!clinicId) {
    clinicId = await resolveMissingClinicIdForUser(user);

    if ((user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN) && !clinicId) {
      clinicId = await findDefaultClinicId();
    }

    if (clinicId) {
      user.clinicId = clinicId;

      const User = require('../../modules/users/user.model');
      await User.updateOne({ _id: user._id }, { $set: { clinicId } });
    }
  }

  return clinicId;
};

module.exports = {
  resolveClinicContext,
  ensureUserClinicContext,
  findPatientClinicId,
  findDefaultClinicId
};
