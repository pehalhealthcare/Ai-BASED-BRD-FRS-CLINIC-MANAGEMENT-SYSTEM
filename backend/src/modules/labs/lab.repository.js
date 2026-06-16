const LabTest = require('./labTest.model');
const { LabOrder } = require('./labOrder.model');
const LabReport = require('./labReport.model');

const populateLabOrder = (query) =>
  query
    .populate('consultationId', 'chiefComplaint status diagnosis followUp labOrdered')
    .populate('patientId', 'patientId firstName lastName fullName age gender phone')
    .populate('doctorId', 'doctorCode firstName lastName fullName specialization userId')
    .populate('appointmentId', 'appointmentDate startTime endTime status reasonForVisit')
    .populate('tests.labTestId', 'code name category specimenType unit normalRange price isActive')
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

const populateLabReport = (query) =>
  query
    .populate('labOrderId')
    .populate('patientId', 'patientId firstName lastName fullName age gender phone')
    .populate('consultationId', 'chiefComplaint status diagnosis followUp labOrdered')
    .populate('uploadedBy', 'name email role')
    .populate('aiReviewedBy', 'name email role')
    .populate('reviewedBy', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

const createLabTest = (data) => LabTest.create(data);

const listLabTests = async ({ filter, page = 1, limit = 10, sort = { name: 1 } }) => {
  const skip = (page - 1) * limit;
  const [labTests, total] = await Promise.all([
    LabTest.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    LabTest.countDocuments(filter)
  ]);

  return { labTests, total };
};

const findLabTestsByIds = ({ ids, clinicId, isActive = true }) => {
  const filter = {
    _id: { $in: ids },
    clinicId
  };

  if (typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  return LabTest.find(filter).lean();
};

const createLabOrder = (data) => LabOrder.create(data);

const listLabOrders = async ({ filter, page = 1, limit = 10, sort = { orderedAt: -1, createdAt: -1 } }) => {
  const skip = (page - 1) * limit;
  const [labOrders, total] = await Promise.all([
    populateLabOrder(LabOrder.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    LabOrder.countDocuments(filter)
  ]);

  return { labOrders, total };
};

const findLabOrderById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  let query = LabOrder.findOne({ _id: id, clinicId });

  if (populateDetails) {
    query = populateLabOrder(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const updateLabOrder = ({ id, clinicId, data, populateDetails = true }) => {
  let query = LabOrder.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populateLabOrder(query);
  }

  return query;
};

const createLabReport = (data) => LabReport.create(data);

const findLabReportById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  let query = LabReport.findOne({ _id: id, clinicId });

  if (populateDetails) {
    query = populateLabReport(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const findLabReportByOrderId = ({ labOrderId, clinicId, populateDetails = true, lean = false }) => {
  let query = LabReport.findOne({ labOrderId, clinicId });

  if (populateDetails) {
    query = populateLabReport(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const updateLabReport = ({ id, clinicId, data, populateDetails = true }) => {
  let query = LabReport.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populateLabReport(query);
  }

  return query;
};

const findReportsByOrderIds = async ({ labOrderIds, clinicId }) => {
  const reports = await LabReport.find({
    clinicId,
    labOrderId: { $in: labOrderIds }
  }).lean();

  return reports;
};

const findPreviousLabReportsForPatient = async ({
  patientId,
  clinicId,
  excludeReportId = null,
  limit = 20
}) => {
  const filter = {
    clinicId,
    patientId
  };

  if (excludeReportId) {
    filter._id = { $ne: excludeReportId };
  }

  return LabReport.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = {
  createLabTest,
  listLabTests,
  findLabTestsByIds,
  createLabOrder,
  listLabOrders,
  findLabOrderById,
  updateLabOrder,
  createLabReport,
  findLabReportById,
  findLabReportByOrderId,
  updateLabReport,
  findReportsByOrderIds,
  findPreviousLabReportsForPatient
};
