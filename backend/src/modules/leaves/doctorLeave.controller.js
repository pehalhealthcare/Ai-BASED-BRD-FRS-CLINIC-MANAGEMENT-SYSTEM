const DoctorLeave = require('./doctorLeave.model');
const Doctor = require('../doctors/doctor.model');
const leaveService = require('./doctorLeave.service');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const { asyncHandler } = require('../../common/utils/asyncHandler');

/** Apply for a leave */
const apply = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.user._id });
  if (!doctor) {
    throw new AppError('Doctor profile not found for this user', HTTP_STATUS.NOT_FOUND);
  }

  const { start_datetime, end_datetime, leave_type, reason } = req.body;
  const leave = await leaveService.applyLeave({
    doctorId: doctor._id,
    clinicId: doctor.clinicId,
    start_datetime,
    end_datetime,
    leave_type,
    reason
  });

  res.status(201).json({ success: true, leave });
});

/** List leaves */
const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      throw new AppError('Doctor profile not found', HTTP_STATUS.NOT_FOUND);
    }
    filter.doctorId = doctor._id;
  } else if (req.user.role === ROLES.ADMIN) {
    filter.clinicId = req.user.clinicId;
  } else {
    throw new AppError('Unauthorized role access', HTTP_STATUS.FORBIDDEN);
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const leaves = await leaveService.listLeaves(filter);
  res.json({ success: true, leaves });
});

/** Review leave request */
const review = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, conflictPolicy } = req.body;

  const leave = await leaveService.reviewLeave(id, {
    status,
    approvedBy: req.user._id,
    conflictPolicy
  });

  res.json({ success: true, message: `Leave request ${status} successfully`, leave });
});

/** Cancel leave request */
const cancel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const leave = await leaveService.cancelLeave(id, req.user._id, req.user.role);
  res.json({ success: true, message: 'Leave request cancelled successfully', leave });
});

/** Get Leave Policy */
const getPolicy = asyncHandler(async (req, res) => {
  // Try to find clinicId from doctor profile if user is doctor
  let clinicId = req.user.clinicId;
  if (!clinicId && req.user.role === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (doctor) {
      clinicId = doctor.clinicId;
    }
  }
  if (!clinicId) {
    throw new AppError('Clinic ID not found in user session', HTTP_STATUS.BAD_REQUEST);
  }
  const policy = await leaveService.getOrCreateLeavePolicy(clinicId);
  res.json({ success: true, policy });
});

/** Update Leave Policy */
const updatePolicy = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic ID not found in user session', HTTP_STATUS.BAD_REQUEST);
  }
  const { leaveTypes, paymentDeductionRule } = req.body;
  const policy = await leaveService.updateLeavePolicy(clinicId, { leaveTypes, paymentDeductionRule });
  res.json({ success: true, message: 'Leave policy updated successfully', policy });
});

/** Get Doctor Balances */
const getBalances = asyncHandler(async (req, res) => {
  let doctorId;
  let clinicId;
  if (req.user.role === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      throw new AppError('Doctor profile not found', HTTP_STATUS.NOT_FOUND);
    }
    doctorId = doctor._id;
    clinicId = doctor.clinicId;
  } else if (req.user.role === ROLES.ADMIN) {
    doctorId = req.query.doctorId;
    clinicId = req.user.clinicId;
    if (!doctorId) {
      throw new AppError('doctorId query param is required for Admin', HTTP_STATUS.BAD_REQUEST);
    }
  } else {
    throw new AppError('Unauthorized role access', HTTP_STATUS.FORBIDDEN);
  }

  const year = parseInt(req.query.year || new Date().getUTCFullYear());
  const month = parseInt(req.query.month || (new Date().getUTCMonth() + 1));

  const balances = await leaveService.getDoctorBalancesForMonth(doctorId, clinicId, year, month);
  res.json({ success: true, balances });
});

module.exports = {
  apply,
  list,
  review,
  cancel,
  getPolicy,
  updatePolicy,
  getBalances
};
