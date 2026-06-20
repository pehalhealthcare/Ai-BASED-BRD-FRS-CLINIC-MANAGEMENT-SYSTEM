const Specialization = require('./specialization.model');
const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');

const Clinic = require('../clinics/clinic.model');
const Doctor = require('../doctors/doctor.model');
const Consultation = require('../consultations/consultation.model');
const Patient = require('../patients/patient.model');
const Medicine = require('../pharmacy/medicine.model');
const LabTest = require('../labs/labTest.model');
const Invoice = require('../billing/invoice.model');

const defaultSpecializations = [
  { name: 'General Medicine', description: 'Primary care, diagnosis, and treatment of common illnesses.' },
  { name: 'Cardiology', description: 'Heart diseases, cardiovascular conditions, and surgery.' },
  { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents.' },
  { name: 'Orthopedics', description: 'Musculoskeletal system, bone fractures, and joint surgeries.' },
  { name: 'Dermatology', description: 'Skin disorders, hair, nails, and cosmetic treatments.' },
  { name: 'Gynaecology', description: 'Female reproductive system health and pregnancy care.' },
  { name: 'Neurology', description: 'Nervous system, brain disorders, and spinal cord injuries.' },
  { name: 'ENT', description: 'Ear, Nose, and Throat specialists.' }
];

const seedIfEmpty = async () => {
  const count = await Specialization.countDocuments();
  if (count === 0) {
    await Specialization.insertMany(defaultSpecializations);
  }
};

const listSpecializations = asyncHandler(async (req, res) => {
  await seedIfEmpty();
  const filter = {};
  if (req.query.all !== 'true' || (req.user?.role !== ROLES.ADMIN && req.user?.role !== ROLES.SUPER_ADMIN)) {
    filter.isActive = true;
  }
  const specializations = await Specialization.find(filter).sort({ name: 1 });
  return sendSuccess(res, 'Specializations retrieved successfully', { specializations });
});

const createSpecialization = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    throw new AppError('Specialization name is required', HTTP_STATUS.BAD_REQUEST);
  }

  const existing = await Specialization.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      if (description) existing.description = description;
      await existing.save();
      return sendSuccess(res, 'Specialization created successfully', { specialization: existing }, 201);
    }
    throw new AppError('Specialization already exists', HTTP_STATUS.CONFLICT);
  }

  const specialization = await Specialization.create({
    name: name.trim(),
    description: description || ''
  });

  return sendSuccess(res, 'Specialization created successfully', { specialization }, 201);
});

const updateSpecialization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const specialization = await Specialization.findById(id);
  if (!specialization) {
    throw new AppError('Specialization not found', HTTP_STATUS.NOT_FOUND);
  }

  if (name) {
    const existing = await Specialization.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existing) {
      throw new AppError('Specialization name already exists', HTTP_STATUS.CONFLICT);
    }
    specialization.name = name.trim();
  }

  if (description !== undefined) {
    specialization.description = description || '';
  }

  if (isActive !== undefined) {
    specialization.isActive = isActive;
  }

  await specialization.save();

  return sendSuccess(res, 'Specialization updated successfully', { specialization });
});

const deleteSpecialization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const specialization = await Specialization.findById(id);
  if (!specialization) {
    throw new AppError('Specialization not found', HTTP_STATUS.NOT_FOUND);
  }

  await Specialization.findByIdAndDelete(id);

  return sendSuccess(res, 'Specialization deleted successfully');
});

const getSpecializationAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const specialization = await Specialization.findById(id);
  if (!specialization) {
    throw new AppError('Specialization not found', HTTP_STATUS.NOT_FOUND);
  }

  // 1. Clinic branches offering this speciality
  const clinics = await Clinic.find({ specializations: specialization._id }).select('name code phone address image');

  // 2. Doctors working with this speciality
  const doctors = await Doctor.find({
    specialization: { $regex: new RegExp(`^${specialization.name.trim()}$`, 'i') },
    isActive: true
  }).populate('clinicId', 'name code').select('fullName specialization experienceYears phone email consultationFee clinicId');

  const doctorIds = doctors.map(d => d._id);

  // 3. Patients who had consultations with doctors of this speciality
  const uniquePatientIds = await Consultation.distinct('patientId', { doctorId: { $in: doctorIds } });
  const patientsCount = uniquePatientIds.length;
  const patients = await Patient.find({ _id: { $in: uniquePatientIds } }).select('fullName patientId email phone gender age');

  // 4. Pharmacy out of stock medicines related to this speciality
  const unavailableMedicines = await Medicine.find({
    category: { $regex: new RegExp(specialization.name, 'i') },
    totalStock: 0
  }).populate('clinicId', 'name code').select('code name genericName category totalStock clinicId');

  // 5. Associated lab tests related to this speciality
  const labTests = await LabTest.find({
    category: { $regex: new RegExp(specialization.name, 'i') }
  }).populate('clinicId', 'name code').select('code name category price clinicId');

  // 6. Revenue Aggregates
  const revenueAggregate = await Invoice.aggregate([
    {
      $lookup: {
        from: 'consultations',
        localField: 'consultationId',
        foreignField: '_id',
        as: 'consultation'
      }
    },
    { $unwind: { path: '$consultation', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'appointments',
        localField: 'appointmentId',
        foreignField: '_id',
        as: 'appointment'
      }
    },
    { $unwind: { path: '$appointment', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        paidAmount: 1,
        totalAmount: 1,
        doctorId: { $ifNull: ['$consultation.doctorId', '$appointment.doctorId'] }
      }
    },
    { $match: { doctorId: { $in: doctorIds } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$paidAmount' },
        totalBilled: { $sum: '$totalAmount' }
      }
    }
  ]);

  const totalRevenue = revenueAggregate[0]?.totalRevenue || 0;
  const totalBilled = revenueAggregate[0]?.totalBilled || 0;

  return sendSuccess(res, 'Specialization analytics retrieved successfully', {
    specialization,
    clinics,
    doctors,
    patients,
    patientsCount,
    unavailableMedicines,
    labTests,
    revenue: {
      totalRevenue,
      totalBilled
    }
  });
});

module.exports = {
  listSpecializations,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization,
  getSpecializationAnalytics
};
