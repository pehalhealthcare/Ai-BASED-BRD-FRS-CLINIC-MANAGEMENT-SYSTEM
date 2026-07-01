const Patient = require('./patient.model');

const createPatient = (payload) => Patient.create(payload);

const findPatientByIdAndClinic = ({ patientId, clinicId }) => Patient.findOne({ _id: patientId });

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

module.exports = {
  createPatient,
  findPatientByIdAndClinic,
  findPatientByContact,
  findPatientByContactWithPassword,
  listPatients
};
