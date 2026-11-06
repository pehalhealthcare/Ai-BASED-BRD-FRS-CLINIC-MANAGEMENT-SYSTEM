const mongoose = require('mongoose');
const Appointment = require('./appointment.model');

const toObjectId = (val) => {
  if (!val) return val;
  if (val instanceof mongoose.Types.ObjectId) return val;
  if (typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val)) {
    return new mongoose.Types.ObjectId(val);
  }
  return val;
};

const castFilterObjectIds = (filter = {}) => {
  const result = { ...filter };
  ['clinicId', 'doctorId', 'patientId', 'branchId', '_id'].forEach((key) => {
    if (result[key]) {
      if (typeof result[key] === 'string') {
        result[key] = toObjectId(result[key]);
      } else if (result[key]?.$in && Array.isArray(result[key].$in)) {
        result[key].$in = result[key].$in.map(toObjectId);
      } else if (result[key]?.$ne) {
        result[key].$ne = toObjectId(result[key].$ne);
      }
    }
  });
  return result;
};

const populateAppointment = (query) =>
  query
    .populate('patientId', 'patientId firstName lastName fullName phone email isActive allergies chronicConditions currentMedications bloodGroup gender dateOfBirth age')
    .populate('doctorId', 'doctorCode firstName lastName fullName phone email specialization userId isActive availability blockedSlots image')
    .populate('createdBy', 'name email role')
    .populate('rescheduledFrom', 'appointmentDate startTime endTime durationMinutes status');

const createAppointment = (payload) => Appointment.create(payload);

const findAppointmentByIdAndClinic = ({ appointmentId, clinicId, populateDetails = false }) => {
  const filter = { _id: appointmentId };
  if (clinicId) {
    filter.clinicId = clinicId;
  }
  const query = Appointment.findOne(filter);
  return populateDetails ? populateAppointment(query) : query;
};

const listAppointments = async ({ filter, page, limit, sort = { appointmentDate: 1, startTime: 1 } }) => {
  const skip = (page - 1) * limit;
  const [appointments, total] = await Promise.all([
    populateAppointment(Appointment.find(filter).sort(sort).skip(skip).limit(limit)),
    Appointment.countDocuments(filter)
  ]);

  return { appointments, total };
};

const findAppointmentsForRange = ({ filter, sort = { appointmentDate: 1, startTime: 1 } }) =>
  populateAppointment(Appointment.find(filter).sort(sort));

const findDoctorAppointmentsForDate = ({
  clinicId,
  doctorId,
  appointmentDate,
  statuses,
  excludeAppointmentId = null
}) => {
  // Let active reservations ('payment_pending' / 'waiting_for_approval' that haven't expired yet) also block slot booking
  const filter = {
    clinicId,
    doctorId,
    appointmentDate,
    $or: [
      { status: { $in: statuses } },
      { 
        status: { $in: ['payment_pending', 'waiting_for_approval', 'waiver_pending'] }, 
        reservationExpiresAt: { $gt: new Date() } 
      }
    ]
  };

  if (excludeAppointmentId) {
    filter._id = { $ne: excludeAppointmentId };
  }

  return Appointment.find(filter).sort({ startTime: 1 });
};

const findPatientAppointmentHistory = ({ clinicId, patientId, limit = 25 }) =>
  Appointment.find({ clinicId, patientId }).sort({ appointmentDate: -1, startTime: -1 }).limit(limit);

const getAppointmentsSummary = async (baseFilter = {}) => {
  const safeFilter = castFilterObjectIds(baseFilter);
  const matchStage = safeFilter && Object.keys(safeFilter).length > 0 ? [{ $match: safeFilter }] : [];
  const [counts] = await Appointment.aggregate([
    ...matchStage,
    {
      $facet: {
        total: [{ $count: 'count' }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byPaymentStatus: [{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }],
        bySource: [{ $group: { _id: '$source', count: { $sum: 1 } } }]
      }
    }
  ]);

  const total = counts?.total?.[0]?.count || 0;
  const statusMap = {};
  (counts?.byStatus || []).forEach((item) => {
    if (item._id) statusMap[item._id] = item.count;
  });

  const paymentStatusMap = {};
  (counts?.byPaymentStatus || []).forEach((item) => {
    if (item._id) paymentStatusMap[item._id] = item.count;
  });

  const sourceMap = {};
  (counts?.bySource || []).forEach((item) => {
    if (item._id) sourceMap[item._id] = item.count;
  });

  const booked = (statusMap['booked'] || 0) + (statusMap['confirmed'] || 0);
  const checkedIn = (statusMap['checked_in'] || 0) + (statusMap['waiting'] || 0);
  const inConsult = (statusMap['in_consultation'] || 0) + (statusMap['consultation_started'] || 0);
  const completed = statusMap['completed'] || 0;
  const cancelled = statusMap['cancelled'] || 0;
  const rescheduled = statusMap['rescheduled'] || 0;
  const notAttended = statusMap['not_attended'] || 0;
  const pendingWaivers = (paymentStatusMap['waiver_pending'] || 0);
  const fullyWaived = (paymentStatusMap['fully_waived'] || 0);
  const partiallyWaived = (paymentStatusMap['partially_waived'] || 0);
  const pendingPayments = (paymentStatusMap['pending'] || 0) + (paymentStatusMap['unpaid'] || 0);

  return {
    total,
    booked,
    checkedIn,
    inConsult,
    completed,
    cancelled,
    rescheduled,
    notAttended,
    pendingWaivers,
    fullyWaived,
    partiallyWaived,
    pendingPayments,
    sources: {
      patient_app: sourceMap['patient_app'] || 0,
      receptionist: (sourceMap['receptionist'] || 0) + (sourceMap['reception'] || 0),
      doctor: sourceMap['doctor'] || 0,
      clinic_admin: sourceMap['clinic_admin'] || 0
    }
  };
};

module.exports = {
  createAppointment,
  findAppointmentByIdAndClinic,
  listAppointments,
  findAppointmentsForRange,
  findDoctorAppointmentsForDate,
  findPatientAppointmentHistory,
  getAppointmentsSummary
};
