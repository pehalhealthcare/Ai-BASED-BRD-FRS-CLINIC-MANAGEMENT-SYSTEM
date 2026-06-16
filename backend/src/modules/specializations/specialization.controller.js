const Specialization = require('./specialization.model');
const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');

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
  const specializations = await Specialization.find({ isActive: true }).sort({ name: 1 });
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

const deleteSpecialization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const specialization = await Specialization.findById(id);
  if (!specialization) {
    throw new AppError('Specialization not found', HTTP_STATUS.NOT_FOUND);
  }

  specialization.isActive = false;
  await specialization.save();

  return sendSuccess(res, 'Specialization deleted successfully');
});

module.exports = {
  listSpecializations,
  createSpecialization,
  deleteSpecialization
};
