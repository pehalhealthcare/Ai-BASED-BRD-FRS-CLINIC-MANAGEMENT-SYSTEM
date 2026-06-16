const Consultation = require('./consultation.model');

const populateConsultation = (query) =>
  query
    .populate('patientId', 'patientId firstName lastName fullName gender age phone email allergies chronicConditions')
    .populate('doctorId', 'doctorCode firstName lastName fullName specialization userId')
    .populate('appointmentId', 'appointmentDate startTime endTime durationMinutes appointmentType status reasonForVisit symptomsSummary')
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role')
    .populate('approved_by', 'name email role')
    .populate('aiReview.reviewedBy', 'name email role');

const createConsultation = (payload) => Consultation.create(payload);

const findById = ({ id, clinicId, populateDetails = false }) => {
  const query = Consultation.findOne({ _id: id, clinicId });
  return populateDetails ? populateConsultation(query) : query;
};

const findByAppointmentId = ({ appointmentId, clinicId, populateDetails = false }) => {
  const query = Consultation.findOne({ appointmentId, clinicId });
  return populateDetails ? populateConsultation(query) : query;
};

const findByPatientId = async ({ patientId, clinicId, options = {} }) => {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    status,
    doctorId
  } = options;
  const skip = (page - 1) * limit;
  const filter = { clinicId, patientId };

  if (status) {
    filter.status = status;
  }

  if (doctorId) {
    filter.doctorId = doctorId;
  }

  const [consultations, total] = await Promise.all([
    populateConsultation(Consultation.find(filter).sort(sort).skip(skip).limit(limit)),
    Consultation.countDocuments(filter)
  ]);

  return { consultations, total };
};

const findByDoctorId = async ({ doctorId, clinicId, options = {} }) => {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    status,
    patientId
  } = options;
  const skip = (page - 1) * limit;
  const filter = { clinicId, doctorId };

  if (status) {
    filter.status = status;
  }

  if (patientId) {
    filter.patientId = patientId;
  }

  const [consultations, total] = await Promise.all([
    populateConsultation(Consultation.find(filter).sort(sort).skip(skip).limit(limit)),
    Consultation.countDocuments(filter)
  ]);

  return { consultations, total };
};

const updateConsultation = ({ id, clinicId, update, populateDetails = false }) => {
  const query = Consultation.findOneAndUpdate({ _id: id, clinicId }, update, {
    new: true,
    runValidators: true
  });
  return populateDetails ? populateConsultation(query) : query;
};

const markCompleted = ({ id, clinicId, update, populateDetails = false }) => {
  const query = Consultation.findOneAndUpdate({ _id: id, clinicId }, update, {
    new: true,
    runValidators: true
  });
  return populateDetails ? populateConsultation(query) : query;
};

const listConsultations = async ({ clinicId, filters = {}, pagination = {}, sort = { createdAt: -1 } }) => {
  const page = pagination.page || 1;
  const limit = pagination.limit || 10;
  const skip = (page - 1) * limit;
  const filter = { clinicId };

  if (filters.status) {
    filter.status = filters.status;
  }

  if (filters.patientId) {
    filter.patientId = filters.patientId;
  }

  if (filters.doctorId) {
    filter.doctorId = filters.doctorId;
  }

  if (filters.appointmentId) {
    filter.appointmentId = filters.appointmentId;
  }

  if (filters.createdBy) {
    filter.createdBy = filters.createdBy;
  }

  const [consultations, total] = await Promise.all([
    populateConsultation(Consultation.find(filter).sort(sort).skip(skip).limit(limit)),
    Consultation.countDocuments(filter)
  ]);

  return { consultations, total };
};

const findRecentPatientConsultations = ({ clinicId, patientId, excludeConsultationId = null, limit = 5 }) => {
  const filter = { clinicId, patientId };

  if (excludeConsultationId) {
    filter._id = { $ne: excludeConsultationId };
  }

  return populateConsultation(Consultation.find(filter).sort({ createdAt: -1 }).limit(limit));
};

module.exports = {
  createConsultation,
  findById,
  findByAppointmentId,
  findByPatientId,
  findByDoctorId,
  updateConsultation,
  markCompleted,
  listConsultations,
  findRecentPatientConsultations,
  findConsultationByAppointmentAndClinic: ({ appointmentId, clinicId }) => findByAppointmentId({ appointmentId, clinicId }),
  findConsultationByIdAndClinic: ({ consultationId, clinicId, populateDetails = false }) =>
    findById({ id: consultationId, clinicId, populateDetails }),
  listPatientConsultations: ({ clinicId, patientId, page, limit, sort }) =>
    findByPatientId({ patientId, clinicId, options: { page, limit, sort } })
};
