const DoctorLeave = require('./doctorLeave.model');
const Doctor = require('../doctors/doctor.model');
const Appointment = require('../appointments/appointment.model');
const LeavePolicy = require('./leavePolicy.model');
const DoctorLeaveBalance = require('./doctorLeaveBalance.model');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');
const { ROLES } = require('../../common/constants/roles');

/**
 * Check if a doctor has an approved leave overlapping the given time range
 */
const isDoctorOnLeave = async (doctorId, startDatetime, endDatetime) => {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  const leave = await DoctorLeave.findOne({
    doctorId,
    status: 'approved',
    start_datetime: { $lt: end },
    end_datetime: { $gt: start }
  });
  return !!leave;
};

/**
 * Utility to calculate leave days
 */
const calculateLeaveDays = (start, end) => {
  const diffMs = new Date(end) - new Date(start);
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 4) return 0.5;
  if (diffHours <= 24) return 1.0;
  return Math.ceil(diffHours / 24);
};

/**
 * Leave Policy helper functions
 */
const getOrCreateLeavePolicy = async (clinicId) => {
  let policy = await LeavePolicy.findOne({ clinicId });
  if (!policy) {
    policy = new LeavePolicy({ clinicId });
    await policy.save();
  }
  return policy;
};

const updateLeavePolicy = async (clinicId, { leaveTypes, paymentDeductionRule }) => {
  let policy = await LeavePolicy.findOne({ clinicId });
  if (!policy) {
    policy = new LeavePolicy({ clinicId });
  }
  if (leaveTypes) policy.leaveTypes = leaveTypes;
  if (paymentDeductionRule) policy.paymentDeductionRule = paymentDeductionRule;
  return await policy.save();
};

/**
 * Get or initialize doctor balance
 */
const getOrUpdateDoctorBalance = async (doctorId, clinicId, year, month, leaveType) => {
  let balance = await DoctorLeaveBalance.findOne({ doctorId, clinicId, year, month, leaveType });
  if (balance) {
    return balance;
  }

  const policy = await getOrCreateLeavePolicy(clinicId);
  const rule = policy.leaveTypes.find((r) => r.code === leaveType);
  const monthlyLimit = rule ? rule.monthlyLimit : 0;
  const allowRollover = rule ? rule.allowRollover : false;
  const rolloverPercentage = rule ? rule.rolloverPercentage : 0;
  const maxAccumulated = rule ? rule.maxAccumulated : 99;

  // Find previous month's balance
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevBalance = await DoctorLeaveBalance.findOne({ doctorId, clinicId, year: prevYear, month: prevMonth, leaveType });

  let rollover = 0;
  if (prevBalance && allowRollover) {
    rollover = prevBalance.remaining * (rolloverPercentage / 100);
  }

  let allocated = monthlyLimit + rollover;
  if (allocated > maxAccumulated) {
    allocated = maxAccumulated;
  }

  balance = new DoctorLeaveBalance({
    doctorId,
    clinicId,
    year,
    month,
    leaveType,
    allocated,
    used: 0,
    remaining: allocated
  });

  return await balance.save();
};

const getDoctorBalancesForMonth = async (doctorId, clinicId, year, month) => {
  const policy = await getOrCreateLeavePolicy(clinicId);
  const balances = [];
  for (const rule of policy.leaveTypes) {
    const bal = await getOrUpdateDoctorBalance(doctorId, clinicId, year, month, rule.code);
    balances.push(bal);
  }
  return balances;
};

/**
 * Apply for a leave (Doctor)
 */
const applyLeave = async ({ doctorId, clinicId, start_datetime, end_datetime, leave_type, reason }) => {
  const start = new Date(start_datetime);
  const end = new Date(end_datetime);

  if (start >= end) {
    throw new AppError('start_datetime must be before end_datetime.', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if there is already an overlapping leave request
  const existing = await DoctorLeave.findOne({
    doctorId,
    status: { $in: ['pending', 'approved'] },
    start_datetime: { $lt: end },
    end_datetime: { $gt: start }
  });

  if (existing) {
    throw new AppError('An overlapping leave request already exists.', HTTP_STATUS.CONFLICT);
  }

  const leaveDays = calculateLeaveDays(start, end);
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth() + 1;

  const balance = await getOrUpdateDoctorBalance(doctorId, clinicId, startYear, startMonth, leave_type);
  const policy = await getOrCreateLeavePolicy(clinicId);

  let exceedsLimit = false;
  let isUnpaid = false;

  if (balance.remaining < leaveDays) {
    exceedsLimit = true;
    if (policy.paymentDeductionRule === 'auto_reject') {
      throw new AppError(`Leave request exceeds remaining allowance of ${balance.remaining} days.`, HTTP_STATUS.BAD_REQUEST);
    } else if (policy.paymentDeductionRule === 'mark_unpaid') {
      isUnpaid = true;
    }
  }

  const leave = new DoctorLeave({
    doctorId,
    clinicId,
    start_datetime: start,
    end_datetime: end,
    leave_type,
    reason,
    status: 'pending',
    exceedsLimit,
    isUnpaid
  });

  return await leave.save();
};

/**
 * List leaves (Admin or Doctor scope)
 */
const listLeaves = async (filter) => {
  return await DoctorLeave.find(filter)
    .populate('doctorId', 'firstName lastName fullName specialization')
    .sort({ start_datetime: -1 })
    .lean();
};

/**
 * Review leave (Admin)
 */
const reviewLeave = async (leaveId, { status, approvedBy, conflictPolicy = 'cancel' }) => {
  const leave = await DoctorLeave.findById(leaveId);
  if (!leave) {
    throw new AppError('Leave request not found', HTTP_STATUS.NOT_FOUND);
  }

  if (leave.status !== 'pending') {
    throw new AppError('Leave request is already processed', HTTP_STATUS.BAD_REQUEST);
  }

  leave.status = status;
  leave.approved_by = status === 'approved' ? approvedBy : null;
  await leave.save();

  if (status === 'approved') {
    // Deduct leave balance
    const start = new Date(leave.start_datetime);
    const leaveDays = calculateLeaveDays(leave.start_datetime, leave.end_datetime);
    const startYear = start.getUTCFullYear();
    const startMonth = start.getUTCMonth() + 1;

    const balance = await getOrUpdateDoctorBalance(leave.doctorId, leave.clinicId, startYear, startMonth, leave.leave_type);
    balance.used += leaveDays;
    balance.remaining = Math.max(0, balance.allocated - balance.used);
    await balance.save();

    // Process conflict policy for existing appointments
    await resolveConflictingAppointments(leave, conflictPolicy);
  }

  return leave;
};

/**
 * Cancel a leave request (Doctor or Admin)
 */
const cancelLeave = async (leaveId, userId, userRole) => {
  const leave = await DoctorLeave.findById(leaveId);
  if (!leave) {
    throw new AppError('Leave request not found', HTTP_STATUS.NOT_FOUND);
  }

  const previousStatus = leave.status;

  // If role is DOCTOR, verify they own the leave
  if (userRole === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ userId });
    if (!doctor || String(leave.doctorId) !== String(doctor._id)) {
      throw new AppError('Unauthorized to cancel this leave', HTTP_STATUS.FORBIDDEN);
    }
  } else if (userRole !== ROLES.ADMIN) {
    throw new AppError('Unauthorized role to cancel leaves', HTTP_STATUS.FORBIDDEN);
  }

  if (leave.status === 'cancelled') {
    throw new AppError('Leave request is already cancelled', HTTP_STATUS.BAD_REQUEST);
  }

  leave.status = 'cancelled';
  await leave.save();

  if (previousStatus === 'approved') {
    // Credit back leave balance
    const start = new Date(leave.start_datetime);
    const leaveDays = calculateLeaveDays(leave.start_datetime, leave.end_datetime);
    const startYear = start.getUTCFullYear();
    const startMonth = start.getUTCMonth() + 1;

    const balance = await getOrUpdateDoctorBalance(leave.doctorId, leave.clinicId, startYear, startMonth, leave.leave_type);
    balance.used = Math.max(0, balance.used - leaveDays);
    balance.remaining = balance.allocated - balance.used;
    await balance.save();
  }

  return leave;
};

/**
 * Helper to process conflicting appointments when leave is approved
 */
const resolveConflictingAppointments = async (leave, policy) => {
  const startDateOnly = new Date(leave.start_datetime);
  startDateOnly.setUTCHours(0, 0, 0, 0);
  const endDateOnly = new Date(leave.end_datetime);
  endDateOnly.setUTCHours(23, 59, 59, 999);

  // Find all active booked appointments for this doctor on matching dates
  const appointments = await Appointment.find({
    doctorId: leave.doctorId,
    clinicId: leave.clinicId,
    status: { $in: [APPOINTMENT_STATUSES.BOOKED, APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.RESCHEDULED] },
    appointmentDate: { $gte: startDateOnly, $lte: endDateOnly }
  });

  // Filter for exact datetime overlap
  const conflictingApps = appointments.filter((app) => {
    const [hours, minutes] = app.startTime.split(':').map(Number);
    const appStart = new Date(app.appointmentDate);
    appStart.setUTCHours(hours, minutes, 0, 0);
    const appEnd = new Date(appStart.getTime() + app.durationMinutes * 60 * 1000);

    return appStart < leave.end_datetime && appEnd > leave.start_datetime;
  });

  // Load appointment service dynamically to avoid circular dependencies
  const appointmentService = require('../appointments/appointment.service');

  for (const app of conflictingApps) {
    if (policy === 'reassign') {
      const originalDoctor = await Doctor.findById(leave.doctorId);
      const alternate = await findAlternateDoctor(
        leave.clinicId,
        leave.doctorId,
        originalDoctor.specialization,
        app.appointmentDate,
        app.startTime,
        app.durationMinutes
      );

      if (alternate) {
        app.doctorId = alternate._id;
        app.notes = (app.notes || '') + `\n[Reassigned automatically to Dr. ${alternate.fullName} due to original doctor leave]`;
        await app.save();
        continue;
      }
      // If no alternate found, fallback to rescheduling requested
      policy = 'reschedule';
    }

    if (policy === 'reschedule') {
      app.status = APPOINTMENT_STATUSES.CANCELLED;
      app.cancellationReason = 'Doctor on leave. Reschedule requested.';
      app.notes = (app.notes || '') + `\n[Reschedule required due to doctor leave]`;
      await app.save();
    } else {
      // Default: Cancel
      app.status = APPOINTMENT_STATUSES.CANCELLED;
      app.cancellationReason = 'Doctor on leave. Appointment cancelled.';
      await app.save();
    }
  }
};

/**
 * Find an alternate doctor in the same clinic who is available
 */
const findAlternateDoctor = async (clinicId, originalDoctorId, specialization, date, startTime, durationMinutes) => {
  const candidates = await Doctor.find({
    clinicId,
    specialization,
    _id: { $ne: originalDoctorId },
    isActive: true
  });

  const appointmentService = require('../appointments/appointment.service');

  for (const doc of candidates) {
    try {
      await appointmentService.assertSlotIsBookable({
        appointmentDate: date,
        startTime,
        durationMinutes,
        appointmentType: 'scheduled',
        doctor: doc,
        clinicId,
        allowOutsideAvailability: false
      });
      return doc;
    } catch (err) {
      // Candidate not available
      continue;
    }
  }
  return null;
};

module.exports = {
  isDoctorOnLeave,
  applyLeave,
  listLeaves,
  reviewLeave,
  cancelLeave,
  getOrCreateLeavePolicy,
  updateLeavePolicy,
  getDoctorBalancesForMonth
};
