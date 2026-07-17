/**
 * Discount Approval Service
 * Handles all discount/waiver request creation, approval policy enforcement,
 * approval/rejection decisions, slot reservation timeouts, and audit logging.
 */

const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');
const { AppError } = require('../../common/utils/AppError');
const { ROLES } = require('../../common/constants/roles');
const { logger } = require('../../common/utils/logger');
const Appointment = require('../appointments/appointment.model');
const Clinic = require('../clinics/clinic.model');
const BillingAudit = require('../billing/billingAudit.model');
const Patient = require('../patients/patient.model');
const Doctor = require('../doctors/doctor.model');

const DISCOUNT_TYPES = [
  'percentage', 'fixed', 'full_waiver', 'membership',
  'senior_citizen', 'corporate', 'insurance', 'employee',
  'promotional', 'doctor_courtesy', 'admin_courtesy'
];

/**
 * Calculate discount amount from type & value.
 */
const calculateDiscountAmount = (discountType, discountValue, originalFee) => {
  if (discountType === 'full_waiver') return originalFee;
  if (discountType === 'percentage') {
    return Math.round((discountValue / 100) * originalFee * 100) / 100;
  }
  if (discountType === 'fixed') return Math.min(discountValue, originalFee);
  return 0;
};

/**
 * Resolve approval authority based on clinic's billing policy.
 *
 * Returns an object:
 *   { authority: 'admin'|'doctor'|'both'|'either', autoEscalated: boolean }
 *
 * Policy mapping:
 *   admin_only               → admin
 *   doctor_first             → doctor
 *   doctor_first_with_limits → doctor (unless limit exceeded → admin, or full waiver + !allowDoctorFullWaiver → admin)
 *   doctor_then_admin        → 'sequential' (doctor first, then admin — tracked in discountRequest.approvalSequence)
 *   doctor_or_admin          → 'either' (first approval wins)
 *   dual_approval            → 'both' (both required)
 */
const resolveApprovalAuthority = (clinic, discountType, discountValue, originalFee) => {
  const settings = clinic?.billingSettings || {};
  const policy = settings.approvalPolicy || 'admin_only';
  const doctorMaxPct = settings.doctorMaxDiscountPercent ?? 20;
  const doctorMaxAmt = settings.doctorMaxDiscountAmount ?? null;
  const allowFullWaiver = settings.allowDoctorFullWaiver ?? false;
  const escalate = settings.escalateWhenLimitExceeds ?? true;

  // --- Policy 1: Admin Only ---
  if (policy === 'admin_only') return { authority: 'admin', autoEscalated: false };

  // --- Policy 2: Doctor First ---
  if (policy === 'doctor_first') return { authority: 'doctor', autoEscalated: false };

  // --- Policy 2A: Doctor First with Limits ---
  if (policy === 'doctor_first_with_limits') {
    // Full waiver: only allowed for doctor if explicitly enabled
    if (discountType === 'full_waiver') {
      return allowFullWaiver
        ? { authority: 'doctor', autoEscalated: false }
        : { authority: 'admin', autoEscalated: true };
    }

    // Compute effective discount amount
    const discountAmt = calculateDiscountAmount(discountType, discountValue, originalFee);
    const effectivePct = originalFee > 0 ? (discountAmt / originalFee) * 100 : 0;

    const exceedsPct = effectivePct > doctorMaxPct;
    const exceedsAmt = doctorMaxAmt !== null && discountAmt > doctorMaxAmt;

    if ((exceedsPct || exceedsAmt) && escalate) {
      return { authority: 'admin', autoEscalated: true };
    }
    return { authority: 'doctor', autoEscalated: false };
  }

  // --- Policy 3: Doctor Then Admin (sequential, both mandatory) ---
  if (policy === 'doctor_then_admin') return { authority: 'sequential', autoEscalated: false };

  // --- Policy 4: Doctor OR Admin (first approval wins) ---
  if (policy === 'doctor_or_admin') return { authority: 'either', autoEscalated: false };

  // --- Policy 5: Dual Approval (both mandatory simultaneously) ---
  if (policy === 'dual_approval') return { authority: 'both', autoEscalated: false };

  // Fallback
  return { authority: 'admin', autoEscalated: false };
};

/**
 * Submit a discount / waiver request for an appointment.
 * Creates appointment in waiting_for_approval state.
 */
const requestDiscount = async ({ requester, appointmentId, payload }) => {
  const { discountType, discountValue = 0, reason } = payload;

  if (!DISCOUNT_TYPES.includes(discountType)) {
    throw new AppError('Invalid discount type.', HTTP_STATUS.BAD_REQUEST);
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);

  if (!['booked', 'payment_pending'].includes(appointment.status)) {
    throw new AppError(
      'Discount can only be requested for appointments in booked or payment_pending state.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const clinic = await Clinic.findById(appointment.clinicId);
  const originalFee = appointment.consultationFee;
  const discountAmount = calculateDiscountAmount(discountType, discountValue, originalFee);
  const finalPayable = Math.max(0, originalFee - discountAmount);
  const { authority, autoEscalated } = resolveApprovalAuthority(clinic, discountType, discountValue, originalFee);
  const reservationTimeout = clinic?.billingSettings?.slotReservationTimeoutMinutes ?? 15;
  const policy = clinic?.billingSettings?.approvalPolicy || 'admin_only';

  // Set slot reservation expiry
  const slotReservedUntil = new Date(Date.now() + reservationTimeout * 60 * 1000);

  // Build approval sequence for multi-step policies
  let approvalSequence = [];
  if (authority === 'sequential') {
    // doctor_then_admin: doctor must approve first, then admin
    approvalSequence = [
      { role: 'doctor', status: 'pending', decidedAt: null, decidedBy: null },
      { role: 'admin', status: 'not_started', decidedAt: null, decidedBy: null }
    ];
  } else if (authority === 'both') {
    // dual_approval: both approve simultaneously
    approvalSequence = [
      { role: 'doctor', status: 'pending', decidedAt: null, decidedBy: null },
      { role: 'admin', status: 'pending', decidedAt: null, decidedBy: null }
    ];
  } else if (authority === 'either') {
    // doctor_or_admin: both notified, first wins
    approvalSequence = [
      { role: 'doctor', status: 'pending', decidedAt: null, decidedBy: null },
      { role: 'admin', status: 'pending', decidedAt: null, decidedBy: null }
    ];
  }

  appointment.discountRequest = {
    type: discountType,
    value: discountValue,
    amount: discountAmount,
    reason: reason || '',
    requestedBy: requester._id,
    requestedAt: new Date(),
    status: 'pending',
    approvalAuthority: authority,
    approvalPolicy: policy,
    autoEscalated,
    approvalSequence,
    finalApprovedDiscount: 0,
    finalPayableAmount: finalPayable
  };

  appointment.status = APPOINTMENT_STATUSES.WAITING_FOR_APPROVAL;
  appointment.slotReservedUntil = null;

  await appointment.save();

  // Log audit entry
  await BillingAudit.create({
    appointmentId: appointment._id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    clinicId: appointment.clinicId,
    originalFee,
    discountType,
    discountValue,
    discountAmount,
    finalFee: finalPayable,
    requestedBy: requester._id,
    requestedByName: requester.name || requester.email || '',
    approvalPolicyUsed: policy,
    escalated: autoEscalated,
    decision: 'pending',
    paymentStatus: appointment.paymentStatus || 'pending',
    appointmentStatus: appointment.status
  });

  return { appointment, authority, autoEscalated, finalPayable, slotReservedUntil };
};

/**
 * Approve or reject a pending discount request.
 */
const decideDiscount = async ({ 
  requester, 
  appointmentId, 
  decision, 
  rejectionReason = '', 
  overrideDiscountType, 
  overrideDiscountValue 
}) => {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new AppError('Decision must be either approved or rejected.', HTTP_STATUS.BAD_REQUEST);
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate('patientId', 'firstName lastName patientId')
    .populate('doctorId', 'fullName specialization')
    .populate('clinicId', 'name billingSettings');

  if (!appointment) throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);

  // Apply expiration check on the fly
  await checkAndApplyExpiries(appointment);

  if (appointment.status !== APPOINTMENT_STATUSES.WAITING_FOR_APPROVAL) {
    throw new AppError('This appointment is not waiting for approval or has expired.', HTTP_STATUS.BAD_REQUEST);
  }

  if (!appointment.discountRequest || appointment.discountRequest.status !== 'pending') {
    throw new AppError('No pending discount request found.', HTTP_STATUS.BAD_REQUEST);
  }

  // Role-based authorization enforcement
  const clinic = appointment.clinicId;
  const policy = clinic?.billingSettings?.approvalPolicy || 'admin_only';
  const authority = appointment.discountRequest.approvalAuthority;
  const settings = clinic?.billingSettings || {};

  // Determine if this requester is allowed to make a decision
  const isDoctor = requester.role === ROLES.DOCTOR;
  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(requester.role);

  // Policy: doctor_or_admin — first approval wins
  if (authority === 'either') {
    if (!isDoctor && !isAdmin) {
      throw new AppError('You are not authorized to approve this request.', HTTP_STATUS.FORBIDDEN);
    }
    // Check if already approved by someone else
    const seq = appointment.discountRequest.approvalSequence || [];
    const otherApproved = seq.find(s =>
      ((isDoctor && s.role === 'admin') || (isAdmin && s.role === 'doctor')) &&
      s.status === 'approved'
    );
    if (otherApproved) {
      throw new AppError(
        `Already approved by ${otherApproved.role === 'admin' ? 'Clinic Admin' : 'Doctor'}. No further action required.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
    // Mark this approver's sequence entry
    const myEntry = seq.find(s => (isDoctor && s.role === 'doctor') || (isAdmin && s.role === 'admin'));
    if (myEntry) {
      myEntry.status = decision;
      myEntry.decidedAt = new Date();
      myEntry.decidedBy = requester._id;
    }
    appointment.discountRequest.approvalSequence = seq;
    // First approval wins — close the request
    appointment.discountRequest.status = decision;
    appointment.discountRequest.decidedBy = requester._id;
    appointment.discountRequest.decidedAt = new Date();
    appointment.discountRequest.rejectionReason = rejectionReason;
  }
  // Policy: sequential (doctor_then_admin)
  else if (authority === 'sequential') {
    const seq = appointment.discountRequest.approvalSequence || [];
    const doctorEntry = seq.find(s => s.role === 'doctor');
    const adminEntry = seq.find(s => s.role === 'admin');

    if (isDoctor) {
      if (!doctorEntry || doctorEntry.status !== 'pending') {
        throw new AppError('Not your turn to approve, or already decided.', HTTP_STATUS.BAD_REQUEST);
      }
      doctorEntry.status = decision;
      doctorEntry.decidedAt = new Date();
      doctorEntry.decidedBy = requester._id;

      if (decision === 'rejected') {
        appointment.discountRequest.status = 'rejected';
        appointment.discountRequest.decidedBy = requester._id;
        appointment.discountRequest.decidedAt = new Date();
        appointment.discountRequest.rejectionReason = rejectionReason;
      } else {
        // Unlock admin step
        if (adminEntry) adminEntry.status = 'pending';
        // Stay in waiting_for_approval — admin still needs to approve
      }
    } else if (isAdmin) {
      if (!doctorEntry || doctorEntry.status !== 'approved') {
        throw new AppError('Waiting for doctor approval first.', HTTP_STATUS.BAD_REQUEST);
      }
      if (!adminEntry || adminEntry.status !== 'pending') {
        throw new AppError('Not your turn to approve, or already decided.', HTTP_STATUS.BAD_REQUEST);
      }
      adminEntry.status = decision;
      adminEntry.decidedAt = new Date();
      adminEntry.decidedBy = requester._id;
      appointment.discountRequest.status = decision;
      appointment.discountRequest.decidedBy = requester._id;
      appointment.discountRequest.decidedAt = new Date();
      appointment.discountRequest.rejectionReason = rejectionReason;
    } else {
      throw new AppError('You are not authorized to approve this request.', HTTP_STATUS.FORBIDDEN);
    }

    appointment.discountRequest.approvalSequence = seq;
  }
  // Policy: dual_approval (both required)
  else if (authority === 'both') {
    const seq = appointment.discountRequest.approvalSequence || [];
    const myEntry = seq.find(s => (isDoctor && s.role === 'doctor') || (isAdmin && s.role === 'admin'));

    if (!myEntry) throw new AppError('You are not authorized to approve this request.', HTTP_STATUS.FORBIDDEN);
    if (myEntry.status !== 'pending') throw new AppError('You have already decided on this request.', HTTP_STATUS.BAD_REQUEST);

    myEntry.status = decision;
    myEntry.decidedAt = new Date();
    myEntry.decidedBy = requester._id;
    if (decision === 'rejected') {
      myEntry.rejectionReason = rejectionReason;
    }
    appointment.discountRequest.approvalSequence = seq;

    if (decision === 'rejected') {
      // Any rejection closes the request
      appointment.discountRequest.status = 'rejected';
      appointment.discountRequest.decidedBy = requester._id;
      appointment.discountRequest.decidedAt = new Date();
      appointment.discountRequest.rejectionReason = rejectionReason;
    } else {
      // Check if both have approved
      const allApproved = seq.every(s => s.status === 'approved');
      if (allApproved) {
        appointment.discountRequest.status = 'approved';
        appointment.discountRequest.decidedBy = requester._id;
        appointment.discountRequest.decidedAt = new Date();
      }
      // else stays pending — waiting for the other approver
    }
  }
  // Single authority: admin or doctor
  else {
    if (isDoctor && authority !== 'doctor') {
      throw new AppError(
        'Your approval authority does not cover this request. Please contact clinic admin.',
        HTTP_STATUS.FORBIDDEN
      );
    }
    if (isAdmin && authority === 'doctor') {
      // Admin can override doctor-only requests if needed (escalation)
    }
    if (!isDoctor && !isAdmin) {
      throw new AppError('You are not authorized to approve this request.', HTTP_STATUS.FORBIDDEN);
    }

    // For doctor_first_with_limits: enforce limit check
    if (isDoctor && policy === 'doctor_first_with_limits') {
      const doctorMaxPct = settings.doctorMaxDiscountPercent ?? 20;
      const doctorMaxAmt = settings.doctorMaxDiscountAmount ?? null;
      const req = appointment.discountRequest;
      const discountAmt = req.amount || 0;
      const effectivePct = appointment.consultationFee > 0 ? (discountAmt / appointment.consultationFee) * 100 : 0;

      if (effectivePct > doctorMaxPct || (doctorMaxAmt !== null && discountAmt > doctorMaxAmt)) {
        throw new AppError(
          `This discount exceeds your approval limit. It requires clinic admin approval.`,
          HTTP_STATUS.FORBIDDEN
        );
      }
    }

    appointment.discountRequest.status = decision;
    appointment.discountRequest.decidedBy = requester._id;
    appointment.discountRequest.decidedAt = new Date();
    appointment.discountRequest.rejectionReason = rejectionReason;
  }

  const originalFee = appointment.consultationFee;

  if (decision === 'approved') {
    if (overrideDiscountType && overrideDiscountValue !== undefined) {
      const calculatedAmt = calculateDiscountAmount(overrideDiscountType, overrideDiscountValue, originalFee);
      appointment.discountRequest.type = overrideDiscountType;
      appointment.discountRequest.value = overrideDiscountValue;
      appointment.discountRequest.amount = calculatedAmt;
      appointment.discountRequest.finalPayableAmount = Math.max(0, originalFee - calculatedAmt);
    }

    const discountAmount = appointment.discountRequest.amount;
    const finalPayable = Math.max(0, originalFee - discountAmount);

    appointment.discountRequest.finalApprovedDiscount = discountAmount;
    appointment.discountRequest.finalPayableAmount = finalPayable;
    appointment.waiverAmount = discountAmount;

    if (appointment.discountRequest.type === 'full_waiver') {
      // Full waiver: immediately confirm without payment
      const { assertSlotIsBookable } = require('./appointment.service');
      const doctorDoc = await require('../doctors/doctor.model').findById(appointment.doctorId);
      await assertSlotIsBookable({
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        durationMinutes: appointment.durationMinutes || 30,
        appointmentType: appointment.appointmentType || 'scheduled',
        doctor: doctorDoc,
        clinicId: appointment.clinicId._id || appointment.clinicId,
        excludeAppointmentId: appointment._id
      });

      appointment.status = APPOINTMENT_STATUSES.CONFIRMED;
      appointment.paymentStatus = 'fully_waived';
      appointment.waiverType = 'full';
      appointment.waivedByAdminId = requester.role === ROLES.ADMIN ? requester._id : null;
      appointment.waivedByDoctorId = requester.role === ROLES.DOCTOR ? requester._id : null;
      appointment.waiverLastUpdated = now;
      appointment.amountPaid = 0;
      appointment.remainingAmount = 0;
    } else {
      // Partial discount: move to payment_pending
      appointment.status = APPOINTMENT_STATUSES.PAYMENT_PENDING;
      appointment.remainingAmount = finalPayable;
    }
  } else {
    // Rejected: restore to payment_pending with original fee
    appointment.status = APPOINTMENT_STATUSES.PAYMENT_PENDING;
    appointment.remainingAmount = originalFee;
    appointment.discountRequest.finalApprovedDiscount = 0;
    appointment.discountRequest.finalPayableAmount = originalFee;
  }

  await appointment.save();

  if (decision === 'approved' && appointment.discountRequest.type === 'full_waiver' && appointment.appointmentType === 'walk_in') {
    try {
      const { checkInAppointment } = require('./queue.service');
      const checkinResult = await checkInAppointment({
        appointmentId: appointment._id,
        method: 'Reception',
        isEmergency: false,
        requester: { _id: requester._id, role: requester.role }
      });
      if (checkinResult && checkinResult.token) {
        appointment.tokenNumber = checkinResult.token.tokenNumber;
        appointment.queueNumber = checkinResult.token.queuePosition;
        appointment.status = checkinResult.appointment.status;
        await appointment.save();
      }
    } catch (checkinErr) {
      console.error('Auto check-in failed during full waiver approval:', checkinErr);
    }
  }

  // Update audit record
  await BillingAudit.findOneAndUpdate(
    { appointmentId: appointment._id, decision: 'pending' },
    {
      $set: {
        decidedBy: requester._id,
        decidedByName: requester.name || requester.email || '',
        decision,
        decisionReason: rejectionReason,
        decisionTimestamp: now,
        finalFee: appointment.discountRequest.finalPayableAmount,
        discountAmount: appointment.discountRequest.finalApprovedDiscount,
        paymentStatus: appointment.paymentStatus,
        appointmentStatus: appointment.status
      }
    },
    { sort: { createdAt: -1 } }
  );

  return appointment;
};

/**
 * Collect payment for an appointment in payment_pending state.
 * Confirms the appointment, generates queue token.
 */
const collectPayment = async ({ requester, appointmentId, paymentMethod, transactionId = '' }) => {
  const validPaymentMethods = ['cash', 'upi', 'card', 'net_banking', 'wallet', 'split'];
  if (!validPaymentMethods.includes(paymentMethod)) {
    throw new AppError('Invalid payment method.', HTTP_STATUS.BAD_REQUEST);
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate('clinicId', 'name billingSettings');
  if (!appointment) throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);

  // Apply expiration check on the fly
  await checkAndApplyExpiries(appointment);

  const allowedStatuses = [APPOINTMENT_STATUSES.BOOKED, APPOINTMENT_STATUSES.PAYMENT_PENDING];
  if (!allowedStatuses.includes(appointment.status)) {
    throw new AppError(
      'This appointment is not in payment pending state or has expired.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const { assertSlotIsBookable } = require('./appointment.service');
  const doctorDoc = await require('../doctors/doctor.model').findById(appointment.doctorId);
  await assertSlotIsBookable({
    appointmentDate: appointment.appointmentDate,
    startTime: appointment.startTime,
    durationMinutes: appointment.durationMinutes || 30,
    appointmentType: appointment.appointmentType || 'scheduled',
    doctor: doctorDoc,
    clinicId: appointment.clinicId._id || appointment.clinicId,
    excludeAppointmentId: appointment._id
  });

  const amountPaid = appointment.discountRequest?.finalPayableAmount ?? appointment.consultationFee;
  const now = new Date();

  appointment.status = APPOINTMENT_STATUSES.CONFIRMED;
  appointment.paymentStatus = 'paid';
  appointment.amountPaid = amountPaid;
  appointment.remainingAmount = 0;
  appointment.paymentMethod = paymentMethod;
  appointment.paymentDate = now;
  appointment.slotReservedUntil = null;

  await appointment.save();

  if (appointment.appointmentType === 'walk_in') {
    try {
      const { checkInAppointment } = require('./queue.service');
      const checkinResult = await checkInAppointment({
        appointmentId: appointment._id,
        method: 'Reception',
        isEmergency: false,
        requester: { _id: requester._id, role: requester.role }
      });
      if (checkinResult && checkinResult.token) {
        appointment.tokenNumber = checkinResult.token.tokenNumber;
        appointment.queueNumber = checkinResult.token.queuePosition;
        appointment.status = checkinResult.appointment.status;
        await appointment.save();
      }
    } catch (checkinErr) {
      console.error('Auto check-in failed during payment collection:', checkinErr);
    }
  }

  // Update audit
  await BillingAudit.findOneAndUpdate(
    { appointmentId: appointment._id, decision: { $in: ['approved', 'auto_approved'] } },
    {
      $set: {
        paymentStatus: 'paid',
        paymentMethod,
        receiptNumber: `RCPT-${Date.now()}`,
        appointmentStatus: appointment.status
      }
    },
    { sort: { createdAt: -1 } }
  );

  return appointment;
};

/**
 * Get all pending approval requests for the clinic (for Admin/Doctor dashboard).
 */
const getPendingApprovals = async ({ requester }) => {
  const filter = {
    discountRequest: { $ne: null }
  };

  if (requester.role === ROLES.ADMIN || requester.role === ROLES.RECEPTIONIST) {
    filter.clinicId = requester.clinicId;
  } else if (requester.role === ROLES.DOCTOR) {
    filter.doctorId = requester.doctorId;
  }

  console.log("getPendingApprovals API call - Requester Role:", requester.role, "clinicId:", requester.clinicId);
  console.log("getPendingApprovals filter applied:", filter);

  const appointments = await Appointment.find(filter)
    .populate('patientId', 'firstName lastName patientId phone age gender fullName')
    .populate('doctorId', 'fullName specialization')
    .populate('clinicId', 'name billingSettings')
    .populate('discountRequest.requestedBy', 'name email role')
    .sort({ 'discountRequest.requestedAt': -1 });

  const activeAppts = [];
  for (const appt of appointments) {
    const updated = await checkAndApplyExpiries(appt);
    activeAppts.push(updated);
  }

  return activeAppts;
};

/**
 * Expire timed-out slot reservations. Called by a background job.
 */
const expireTimedOutReservations = async () => {
  const now = new Date();
  const expired = await Appointment.find({
    status: APPOINTMENT_STATUSES.WAITING_FOR_APPROVAL,
    slotReservedUntil: { $lte: now }
  });

  for (const apt of expired) {
    apt.status = APPOINTMENT_STATUSES.CLINIC_CANCELLED;
    if (apt.discountRequest) apt.discountRequest.status = 'expired';
    apt.slotReservedUntil = null;
    await apt.save();

    await BillingAudit.findOneAndUpdate(
      { appointmentId: apt._id, decision: 'pending' },
      { $set: { decision: 'expired', paymentStatus: 'expired', appointmentStatus: apt.status } },
      { sort: { createdAt: -1 } }
    );

    logger.info(`[DiscountApproval] Reservation expired for appointment ${apt._id}`);
  }

  return expired.length;
};

const checkAndApplyExpiries = async (appointment) => {
  if (!appointment || !appointment.discountRequest || appointment.discountRequest.status === 'none') {
    return appointment;
  }

  const now = new Date();
  const clinic = appointment.clinicId;
  const billingSettings = clinic?.billingSettings || {};
  const approvalTimeoutMin = billingSettings.approvalTimeoutMinutes ?? 15;
  const paymentTimeoutMin = billingSettings.paymentTimeoutMinutes ?? 15;

  const approvalTimeoutMs = approvalTimeoutMin * 60 * 1000;
  const paymentTimeoutMs = paymentTimeoutMin * 60 * 1000;

  // 1. Approval Timeout Check
  if (
    appointment.status === APPOINTMENT_STATUSES.WAITING_FOR_APPROVAL &&
    appointment.discountRequest.status === 'pending'
  ) {
    const requestedAt = appointment.discountRequest.requestedAt;
    if (requestedAt && (now - new Date(requestedAt)) > approvalTimeoutMs) {
      appointment.discountRequest.status = 'expired';
      appointment.discountRequest.rejectionReason = 'Consultation Fee Approval Request Expired';
      appointment.discountRequest.decidedAt = now;
      appointment.status = APPOINTMENT_STATUSES.CANCELLED;
      appointment.cancellationReason = 'Consultation Fee Approval Request Expired';
      await appointment.save();

      // Update audit record
      await BillingAudit.findOneAndUpdate(
        { appointmentId: appointment._id, decision: 'pending' },
        {
          $set: {
            decision: 'expired',
            decisionReason: 'Consultation Fee Approval Request Expired',
            decisionTimestamp: now,
            appointmentStatus: appointment.status
          }
        },
        { sort: { createdAt: -1 } }
      );
    }
  }

  // 2. Payment Timeout Check
  if (
    appointment.status === APPOINTMENT_STATUSES.PAYMENT_PENDING &&
    appointment.discountRequest.status === 'approved'
  ) {
    const decidedAt = appointment.discountRequest.decidedAt;
    if (decidedAt && (now - new Date(decidedAt)) > paymentTimeoutMs) {
      appointment.discountRequest.status = 'expired';
      appointment.status = APPOINTMENT_STATUSES.CANCELLED;
      appointment.cancellationReason = 'Payment Expiry';
      await appointment.save();

      // Update audit record
      await BillingAudit.findOneAndUpdate(
        { appointmentId: appointment._id, decision: 'approved' },
        {
          $set: {
            paymentStatus: 'expired',
            appointmentStatus: appointment.status
          }
        },
        { sort: { createdAt: -1 } }
      );
    }
  }

  return appointment;
};

module.exports = {
  requestDiscount,
  decideDiscount,
  collectPayment,
  getPendingApprovals,
  expireTimedOutReservations,
  calculateDiscountAmount,
  resolveApprovalAuthority,
  checkAndApplyExpiries,
  DISCOUNT_TYPES
};
