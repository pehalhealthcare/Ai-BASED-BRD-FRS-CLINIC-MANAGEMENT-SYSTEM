const Patient = require('./patient.model');

const createPatient = (payload) => Patient.create(payload);

const findPatientByIdAndClinic = async ({ patientId, clinicId }) => {
  const patient = await Patient.findOne({ _id: patientId, clinicId });
  if (patient) return patient;
  return Patient.findById(patientId);
};

const findPatientByContact = async ({ clinicId, email, phone }) => {
  if (email) {
    const patientByEmail = await Patient.findOne({
      clinicId,
      isActive: { $ne: false },
      email: String(email).trim().toLowerCase()
    });
    if (patientByEmail) return patientByEmail;
  }

  if (phone) {
    const patientByPhone = await Patient.findOne({
      clinicId,
      isActive: { $ne: false },
      phone: String(phone).trim()
    });
    if (patientByPhone) return patientByPhone;
  }

  return null;
};

const findPatientByContactWithPassword = async ({ clinicId, email, phone }) => {
  if (email) {
    const patientByEmail = await Patient.findOne({
      clinicId,
      isActive: { $ne: false },
      email: String(email).trim().toLowerCase()
    }).select('+medicalHistoryPassword');
    if (patientByEmail) return patientByEmail;
  }

  if (phone) {
    const patientByPhone = await Patient.findOne({
      clinicId,
      isActive: { $ne: false },
      phone: String(phone).trim()
    }).select('+medicalHistoryPassword');
    if (patientByPhone) return patientByPhone;
  }

  return null;
};

const listPatients = async ({ filter, page, limit, sort = { createdAt: -1 } }) => {
  const skip = (page - 1) * limit;
  const [patients, total] = await Promise.all([
    Patient.find(filter).sort(sort).skip(skip).limit(limit),
    Patient.countDocuments(filter)
  ]);

  return { patients, total };
};

const findPatientByUserId = async ({ userId }) => {
  const User = require('../users/user.model');
  const user = await User.findById(userId);
  if (!user) return null;
  
  const patient = await findPatientByContact({
    clinicId: user.clinicId,
    email: user.email,
    phone: user.phone
  });
  if (patient) return patient;
  
  const Patient = require('./patient.model');
  const filters = [];
  if (user.email) filters.push({ email: String(user.email).trim().toLowerCase() });
  if (user.phone) filters.push({ phone: String(user.phone).trim() });
  if (filters.length > 0) {
    return Patient.findOne({ isActive: { $ne: false }, $or: filters }).sort({ updatedAt: -1 });
  }
  return null;
};

module.exports = {
  createPatient,
  findPatientByIdAndClinic,
  findPatientByContact,
  findPatientByContactWithPassword,
  listPatients,
  findPatientByUserId
};
