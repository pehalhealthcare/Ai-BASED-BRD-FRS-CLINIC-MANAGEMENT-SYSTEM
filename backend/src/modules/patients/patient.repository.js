const Patient = require('./patient.model');

const createPatient = (payload) => Patient.create(payload);

const findPatientByIdAndClinic = ({ patientId, clinicId }) => Patient.findOne({ _id: patientId, clinicId });

const findPatientByContact = ({ clinicId, email, phone }) => {
  const filters = [];

  if (email) {
    filters.push({ email: String(email).trim().toLowerCase() });
  }

  if (phone) {
    filters.push({ phone: String(phone).trim() });
  }

  if (!filters.length) {
    return null;
  }

  return Patient.findOne({
    clinicId,
    isActive: { $ne: false },
    $or: filters
  });
};

const findPatientByContactWithPassword = ({ clinicId, email, phone }) => {
  const filters = [];

  if (email) {
    filters.push({ email: String(email).trim().toLowerCase() });
  }

  if (phone) {
    filters.push({ phone: String(phone).trim() });
  }

  if (!filters.length) {
    return null;
  }

  return Patient.findOne({
    clinicId,
    isActive: { $ne: false },
    $or: filters
  }).select('+medicalHistoryPassword');
};

const listPatients = async ({ filter, page, limit, sort = { createdAt: -1 } }) => {
  const skip = (page - 1) * limit;
  const [patients, total] = await Promise.all([
    Patient.find(filter).sort(sort).skip(skip).limit(limit),
    Patient.countDocuments(filter)
  ]);

  return { patients, total };
};

module.exports = {
  createPatient,
  findPatientByIdAndClinic,
  findPatientByContact,
  findPatientByContactWithPassword,
  listPatients
};
