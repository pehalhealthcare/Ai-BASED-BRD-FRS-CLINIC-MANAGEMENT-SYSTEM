const createClinic = async (overrides = {}) => {
  const Clinic = require('../../src/modules/clinics/clinic.model');
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return Clinic.create({
    name: `Clinic ${suffix}`,
    code: `CL${suffix}`.slice(-10),
    ...overrides
  });
};

const createUserWithClinic = async ({ role = 'ADMIN', clinicId = null, overrides = {} } = {}) => {
  const Clinic = require('../../src/modules/clinics/clinic.model');
  const User = require('../../src/modules/users/user.model');
  const { generateAccessToken } = require('../../src/modules/auth/token.service');
  const clinic = clinicId ? null : await createClinic();
  const assignedClinicId = clinicId || clinic._id;
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const user = await User.create({
    name: `Phase3 ${role} ${suffix}`,
    email: `${role.toLowerCase()}-${suffix}@example.com`,
    phone: '9999999999',
    password: 'StrongPass123!',
    role,
    clinicId: assignedClinicId,
    isActive: true,
    approvalStatus: 'approved',
    hasAcceptedSlot: true,
    ...overrides
  });

  return {
    user,
    clinic: clinic || (await Clinic.findById(assignedClinicId)),
    token: generateAccessToken(user)
  };
};

const createPatientRecord = async ({ clinicId, createdBy, overrides = {} }) => {
  const Patient = require('../../src/modules/patients/patient.model');
  const { generatePatientId } = require('../../src/common/utils/generatePatientId');
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return Patient.create({
    clinicId,
    patientId: await generatePatientId(clinicId),
    firstName: 'Appointment',
    lastName: `Patient${suffix}`,
    fullName: `Appointment Patient${suffix}`,
    gender: 'female',
    phone: `9${String(100000000 + Math.floor(Math.random() * 899999999)).padStart(9, '0')}`.slice(0, 10),
    email: `patient-${suffix}@example.com`,
    createdBy,
    updatedBy: createdBy,
    ...overrides
  });
};

const createDoctorRecord = async ({ clinicId, createdBy, userId = null, availability = [], overrides = {} }) => {
  const Doctor = require('../../src/modules/doctors/doctor.model');
  const { generateDoctorCode } = require('../../src/common/utils/generateDoctorCode');
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return Doctor.create({
    clinicId,
    userId,
    doctorCode: await generateDoctorCode(clinicId),
    firstName: 'Appointment',
    lastName: `Doctor${suffix}`,
    fullName: `Appointment Doctor${suffix}`,
    gender: 'male',
    phone: `8${String(100000000 + Math.floor(Math.random() * 899999999)).padStart(9, '0')}`.slice(0, 10),
    email: `doctor-${suffix}@example.com`,
    specialization: 'General Medicine',
    availability,
    createdBy,
    updatedBy: createdBy,
    isActive: true,
    approvalStatus: 'approved',
    hasAcceptedSlot: true,
    bankAccount: {
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      accountHolderName: 'Appointment Doctor',
      passbookCopy: 'passbook.png'
    },
    ...overrides
  });
};

const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

module.exports = {
  createClinic,
  createUserWithClinic,
  createPatientRecord,
  createDoctorRecord,
  getAuthHeaders
};
