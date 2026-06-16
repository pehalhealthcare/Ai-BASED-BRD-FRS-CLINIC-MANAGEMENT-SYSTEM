const Doctor = require('./doctor.model');

const createDoctor = (payload) => Doctor.create(payload);

const findDoctorByIdAndClinic = ({ doctorId, clinicId }) => Doctor.findOne({ _id: doctorId, clinicId });

const findDoctorByUserIdAndClinic = ({ userId, clinicId }) => Doctor.findOne({ userId, clinicId, isActive: true });

const findDoctorByUserId = ({ userId }) => Doctor.findOne({ userId, isActive: true });

const listDoctors = async ({ filter, page, limit, sort = { createdAt: -1 } }) => {
  const skip = (page - 1) * limit;
  const [doctors, total] = await Promise.all([
    Doctor.find(filter).sort(sort).skip(skip).limit(limit),
    Doctor.countDocuments(filter)
  ]);

  return { doctors, total };
};

module.exports = {
  createDoctor,
  findDoctorByIdAndClinic,
  findDoctorByUserIdAndClinic,
  findDoctorByUserId,
  listDoctors
};
