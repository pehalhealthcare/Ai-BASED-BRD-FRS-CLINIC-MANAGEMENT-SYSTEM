const Appointment = require('./appointment.model');

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

module.exports = {
  createAppointment,
  findAppointmentByIdAndClinic,
  listAppointments,
  findAppointmentsForRange,
  findDoctorAppointmentsForDate,
  findPatientAppointmentHistory
};
