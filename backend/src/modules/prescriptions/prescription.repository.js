const Prescription = require('./prescription.model');

const populatePrescription = (query) =>
  query
    .populate('patientId', 'patientId firstName lastName fullName gender age dateOfBirth phone')
    .populate('doctorId', 'doctorCode firstName lastName fullName specialization')
    .populate('consultationId', 'chiefComplaint diagnosis symptoms clinicalNotes status createdAt')
    .populate('appointmentId', 'appointmentDate startTime endTime durationMinutes status')
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role')
    .populate('overrideBy', 'name email role');
    

const createPrescription = (data) => Prescription.create(data);

const findPrescriptionById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  const mongoose = require('mongoose');
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  
  let filter = { clinicId };
  if (isObjectId) {
    filter.$or = [{ _id: id }, { appointmentId: id }];
  } else {
    filter._id = id;
  }

  let query = Prescription.findOne(filter);

  if (populateDetails) {
    query = populatePrescription(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const findByPatient = async ({ patientId, clinicId, queryOptions = {} }) => {
  const {
    page = 1,
    limit = 10,
    status,
    sort = { createdAt: -1 }
  } = queryOptions;
  const skip = (page - 1) * limit;
  const filter = { patientId, clinicId };

  if (status) {
    filter.status = status;
  }

  const [prescriptions, total] = await Promise.all([
    populatePrescription(Prescription.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    Prescription.countDocuments(filter)
  ]);

  return { prescriptions, total };
};

const findByConsultation = ({ consultationId, clinicId, populateDetails = true, lean = true }) => {
  let query = Prescription.find({ consultationId, clinicId }).sort({ createdAt: -1 });

  if (populateDetails) {
    query = populatePrescription(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const updatePrescription = ({ id, clinicId, data, populateDetails = true }) => {
  let query = Prescription.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populatePrescription(query);
  }

  return query;
};

const finalizePrescription = ({ id, clinicId, data, populateDetails = true }) => {
  let query = Prescription.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populatePrescription(query);
  }

  return query;
};

const cancelPrescription = ({ id, clinicId, reason, updatedBy, populateDetails = true }) => {
  let query = Prescription.findOneAndUpdate(
    { _id: id, clinicId },
    {
      status: 'cancelled',
      cancellationReason: reason,
      updatedBy
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (populateDetails) {
    query = populatePrescription(query);
  }

  return query;
};

const prescriptionNumberExists = (prescriptionNumber) =>
  Prescription.exists({ prescriptionNumber });

module.exports = {
  createPrescription,
  findPrescriptionById,
  findByPatient,
  findByConsultation,
  updatePrescription,
  finalizePrescription,
  cancelPrescription,
  prescriptionNumberExists
};
