const Appointment = require('./appointment.model');
const CheckIn = require('./checkin.model');
const Token = require('./token.model');
const QueueAudit = require('./queueAudit.model');
const Doctor = require('../doctors/doctor.model');
const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { emitAppointmentEvent } = require('./appointment.service');

/**
 * Helper to parse time string (HH:MM) and date into a full Date object
 */
const getAppointmentStartDateTime = (date, startTimeStr) => {
  const dt = new Date(date);
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  dt.setHours(hours, minutes, 0, 0);
  return dt;
};

/**
 * Format Token Number based on format string and sequence count
 */
const formatTokenNumber = (formatStr, count) => {
  const regex = /(0+)/;
  const match = formatStr.match(regex);
  if (!match) {
    return `${formatStr}${count}`;
  }
  const paddingLength = match[1].length;
  const paddedCount = String(count).padStart(paddingLength, '0');
  return formatStr.replace(regex, paddedCount);
};

/**
 * Run overdue check to transition un-checked-in past appointments to No-Show
 */
const autoProcessNoShows = async (doctorId) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const query = {
    appointmentDate: { $gte: todayStart, $lte: todayEnd },
    // Only mark as no-show for fully booked appointments, not pre-payment ones
    status: { $in: [APPOINTMENT_STATUSES.BOOKED, APPOINTMENT_STATUSES.CONFIRMED] }
  };
  if (doctorId) query.doctorId = doctorId;

  const appointments = await Appointment.find(query).populate('doctorId');
  for (const appt of appointments) {
    const doctor = appt.doctorId;
    const settings = doctor?.queueSettings || { noShowTimeoutMins: 30 };
    const apptTime = getAppointmentStartDateTime(appt.appointmentDate, appt.startTime);
    const diffMins = (now.getTime() - apptTime.getTime()) / (60 * 1000);

    if (diffMins > settings.noShowTimeoutMins) {
      appt.status = APPOINTMENT_STATUSES.NO_SHOW;
      await appt.save();
    }
  }
};

/**
 * Check-In Patient and Generate Token
 */
const checkInAppointment = async ({ appointmentId, method, isEmergency, requester }, options = {}) => {
  await autoProcessNoShows();

  // Load appointment with session context if present
  const session = options.session;
  const query = Appointment.findById(appointmentId);
  const appointment = session ? await query.session(session) : await query;
  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Date guard: check-in is only allowed on the appointment date
  const apptDate = new Date(appointment.appointmentDate);
  const today = new Date();
  
  // Format check-in dates consistently based on local date string comparisons (ignores UTC offsets)
  const apptDateStr = apptDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  const todayStr = today.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  
  if (apptDateStr !== todayStr) {
    throw new AppError(
      `Check-in is only available on the appointment date (${apptDateStr}). Today is ${todayStr}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Consultation mode guard: only WALK_IN consultations can be physically checked in
  if (appointment.consultationMode === 'ONLINE') {
    throw new AppError('Online Video Consultations do not require physical check-in or queue token generation.', HTTP_STATUS.BAD_REQUEST);
  }

  // Status guard: only booked/confirmed appointments can be checked in
  if (!['booked', 'confirmed', 'checked_in', 'late_check_in'].includes(appointment.status)) {
    if (['payment_pending', 'waiting_for_approval', 'waiver_pending', 'draft'].includes(appointment.status)) {
      throw new AppError(
        'This appointment has not been fully booked yet. Please complete payment or wait for waiver approval before checking in.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    if (['cancelled', 'completed', 'no_show', 'called', 'in_consultation'].includes(appointment.status)) {
      throw new AppError(`Check-in is not allowed for appointment in status: ${appointment.status}`, HTTP_STATUS.BAD_REQUEST);
    }
  }

  const doctor = await Doctor.findById(appointment.doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Load Clinic settings to evaluate Allow Early Check-In policies
  const Clinic = require('../clinics/clinic.model');
  const clinicDoc = await Clinic.findById(appointment.clinicId);
  const clinicSettings = clinicDoc?.billingSettings || {
    allowEarlyCheckIn: true,
    restrictEarlyCheckIn: false,
    earlyCheckInWindowMinutes: 30
  };

  const settings = doctor.queueSettings || {
    earlyCheckInMins: 30,
    lateGraceMins: 15,
    noShowTimeoutMins: 30,
    tokenFormat: 'T-000'
  };

  const now = new Date();
  const apptTime = getAppointmentStartDateTime(appointment.appointmentDate, appointment.startTime);
  // Negative diffMins means arriving early (now is before apptTime)
  // Positive diffMins means arriving late (now is after apptTime)
  const diffMs = now.getTime() - apptTime.getTime();
  const diffMins = diffMs / (60 * 1000);

  // Validate early check-in policy for Walk-In appointments
  if (appointment.consultationMode === 'WALK_IN' && appointment.appointmentType !== 'emergency') {
    const isEarlyCheckInAllowed = clinicSettings.allowEarlyCheckIn === true && clinicSettings.restrictEarlyCheckIn === false;
    
    if (!isEarlyCheckInAllowed) {
      const allowedWindow = clinicSettings.earlyCheckInWindowMinutes ?? 30;
      if (diffMins < -allowedWindow) {
        // Calculate earliest allowed check-in time using Asia/Kolkata timezone
        const allowedTime = new Date(apptTime.getTime() - allowedWindow * 60 * 1000);
        const allowedTimeStr = allowedTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
        throw new AppError(
          `Patient can only be checked in ${allowedWindow} minutes before the scheduled appointment time. Earliest check-in: ${allowedTimeStr}`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }
  }

  // Scenario 5: Patient arrives after No-Show Timeout
  if (diffMins > settings.noShowTimeoutMins && appointment.appointmentType !== 'emergency') {
    appointment.status = APPOINTMENT_STATUSES.NO_SHOW;
    await appointment.save();
    throw new AppError('Appointment is marked as No-Show. Check-in is no longer allowed.', HTTP_STATUS.BAD_REQUEST);
  }

  // Determine Check-in status
  let checkinStatus = APPOINTMENT_STATUSES.CHECKED_IN;
  if (diffMins > settings.lateGraceMins && appointment.appointmentType !== 'emergency') {
    checkinStatus = APPOINTMENT_STATUSES.LATE_CHECK_IN;
  }

  // Generate Token
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const dailyTokenCount = await Token.countDocuments({
    doctorId: doctor._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  const nextCount = dailyTokenCount + 1;
  const prefix = doctor.tokenPrefix || 'DOC';
  const paddedCount = String(nextCount).padStart(3, '0');
  const tokenNumber = `${prefix}-${paddedCount}`;

  // Position placement
  const activeTokens = await Token.find({
    doctorId: doctor._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['waiting', 'called', 'in_consultation'] }
  });
  const queuePosition = activeTokens.length + 1;

  // Create CheckIn
  const checkInRecord = await CheckIn.create([ {
    appointmentId: appointment._id,
    checkinTime: now,
    checkedInBy: requester._id,
    method: method || 'Reception'
  } ], options);

  // Create Token
  const tokenRecord = await Token.create([ {
    appointmentId: appointment._id,
    doctorId: doctor._id,
    tokenNumber,
    queuePosition,
    priority: isEmergency || appointment.appointmentType === 'emergency' ? 'emergency' : 'standard',
    status: 'waiting',
    generatedTime: now
  } ], options);

  // Update Appointment status + set checkedInAt timestamp & token details
  appointment.status = checkinStatus;
  appointment.checkedInAt = now;
  appointment.meta = {
    ...(appointment.meta || {}),
    checkedInBy: requester._id
  };
  appointment.tokenNumber = tokenNumber;
  appointment.queueNumber = queuePosition;
  await appointment.save(options);

  // Send check-in notifications
  try {
    const { sendCheckInNotifications } = require('../notifications/notification.service');
    sendCheckInNotifications({
      appointment,
      patient: appointment.patientId,
      doctor,
      actorUserId: requester._id
    }).catch(err => console.error('Check-in notification failed:', err));
  } catch (notifErr) {
    console.error('Failed to trigger check-in notification:', notifErr);
  }

  // Emit real-time socket events for check-in and token generation
  const socketPayload = {
    clinicId: appointment.clinicId,
    doctorId: String(doctor._id),
    patientId: String(appointment.patientId?._id || appointment.patientId),
    appointmentId: String(appointment._id),
    tokenNumber,
    queuePosition,
    checkedInAt: now,
    status: checkinStatus
  };
  emitAppointmentEvent('appointment:checked-in', socketPayload);
  emitAppointmentEvent('appointment:token-generated', { ...socketPayload, token: { tokenNumber, queuePosition } });

  return {
    checkIn: checkInRecord[0] || checkInRecord,
    token: tokenRecord[0] || tokenRecord,
    appointment
  };
};

/**
 * Fetch and Sort doctor queue based on priority rules
 */
const getSortedQueue = async (doctorId) => {
  await autoProcessNoShows(doctorId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Doctor queue only shows checked-in patients (not booked/confirmed)
  // No self-healing auto-token generation — tokens are only created at explicit check-in

  const tokens = await Token.find({
    doctorId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['waiting', 'called', 'skipped'] }
  }).populate({
    path: 'appointmentId',
    populate: { path: 'patientId' }
  });

  // Sort queue by priority
  // Priority: Emergency -> VIP -> Checked-In -> Skipped -> Walk-In -> Future/Others
  const getSortWeight = (token) => {
    if (token.status === 'in_consultation') return 0;
    if (token.status === 'called') return 1;
    if (token.priority === 'emergency') return 2;
    if (token.priority === 'vip') return 3;

    const appt = token.appointmentId;
    if (!appt) return 10;

    const now = new Date();
    let hasArrivedOrPassed = true;
    if (appt.appointmentTime) {
      const [hrs, mins] = appt.appointmentTime.split(':');
      const slotTime = new Date();
      slotTime.setHours(Number(hrs), Number(mins), 0, 0);
      hasArrivedOrPassed = now >= slotTime;
    }

    if ([APPOINTMENT_STATUSES.CHECKED_IN, APPOINTMENT_STATUSES.BOOKED, APPOINTMENT_STATUSES.CONFIRMED].includes(appt.status) && hasArrivedOrPassed) {
      return 4; // Checked-in/Booked/Confirmed patients whose appointment time has arrived/passed
    }
    if (token.status === 'skipped') {
      return 5; // Skipped patients
    }
    if (appt.appointmentType === 'walk_in') {
      return 6; // Walk-in patients
    }
    return 7; // Patients with future slots or other statuses
  };

  tokens.sort((a, b) => {
    const weightA = getSortWeight(a);
    const weightB = getSortWeight(b);
    if (weightA !== weightB) return weightA - weightB;
    
    // Within each priority group, order by earliest appointmentTime
    const timeA = a.appointmentId?.appointmentTime || '00:00';
    const timeB = b.appointmentId?.appointmentTime || '00:00';
    return timeA.localeCompare(timeB);
  });

  return tokens;
};

const isPaymentCompleted = (appointment) => {
  if (!appointment) return true;
  const status = appointment.paymentStatus;
  const fee = appointment.consultationFee || 0;
  if (fee === 0) return true;
  if (status === 'paid' || status === 'fully_waived') return true;
  if (status === 'partially_waived') {
    return (appointment.amountPaid || 0) >= (appointment.remainingAmount || 0);
  }
  return false;
};

/**
 * Call Next Patient in queue
 */
const callNextPatient = async (doctorId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Set any currently 'called' tokens back to waiting, or skip them if appropriate
  await Token.updateMany(
    { doctorId, status: 'called', createdAt: { $gte: startOfDay, $lte: endOfDay } },
    { status: 'waiting' }
  );

  const queue = await getSortedQueue(doctorId);
  const nextTokenRaw = queue.find(t => t.status === 'waiting');
  if (!nextTokenRaw) {
    throw new AppError('No waiting patients in the queue.', HTTP_STATUS.BAD_REQUEST);
  }

  const nextToken = await Token.findById(nextTokenRaw._id);
  if (nextToken.appointmentId) {
    const appt = await Appointment.findById(nextToken.appointmentId);
    if (appt && !isPaymentCompleted(appt)) {
      throw new AppError('Cannot call next patient. Consultation payment is pending.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));

  nextToken.status = 'called';
  nextToken.calledTime = new Date();
  nextToken.otp = otp;
  nextToken.otpAttempts = 0;
  await nextToken.save();

  if (nextToken.appointmentId) {
    const appt = await Appointment.findById(nextToken.appointmentId).populate('patientId');
    if (appt) {
      appt.status = APPOINTMENT_STATUSES.CALLED;
      appt.meta = {
        ...appt.meta,
        tokenNumber: nextToken.tokenNumber,
        otp: otp
      };
      await appt.save();

      // Dispatch patient notification email
      try {
        const { emailProvider } = require('../notifications/notification.providers');
        const recipientEmail = appt.patientId?.userId?.email || appt.patientId?.email;
        if (recipientEmail) {
          await emailProvider.send({
            recipient: recipientEmail,
            subject: `Your Token ${nextToken.tokenNumber} is Called!`,
            body: `Hello ${appt.patientId?.userId?.name || appt.patientId?.fullName || 'Patient'},\n\nYou are called by the doctor. Please proceed to the doctor's cabin.\nTell the doctor your Consultation OTP: ${otp} to start your consultation.\n\nRoom Number: AB-101\n\nThank you!`,
            channel: 'email'
          });
        }
      } catch (err) {
        console.error('Failed to send call-next email:', err);
      }
    }
  }

  broadcastQueueUpdate(nextToken.doctorId);
  return nextToken;
};

/**
 * Start Consultation for Called/Waiting Token
 */
const startTokenConsultation = async (tokenId) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  // Validate only one active consultation
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const activeConsultation = await Token.findOne({
    doctorId: token.doctorId,
    status: 'in_consultation',
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  if (activeConsultation && String(activeConsultation._id) !== String(token._id)) {
    throw new AppError('Consultation Already In Progress', HTTP_STATUS.CONFLICT);
  }

  if (token.appointmentId) {
    const appt = await Appointment.findById(token.appointmentId);
    if (appt && !isPaymentCompleted(appt)) {
      throw new AppError('Cannot start consultation. Consultation payment is pending.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  token.status = 'in_consultation';
  token.consultationStarted = new Date();
  await token.save();

  if (token.appointmentId) {
    const appt = await Appointment.findById(token.appointmentId);
    if (appt) {
      appt.status = APPOINTMENT_STATUSES.IN_CONSULTATION;
      await appt.save();
    }
  }

  broadcastQueueUpdate(token.doctorId);
  return token;
};

/**
 * Complete Consultation for Token
 */
const completeTokenConsultation = async (tokenId) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  token.status = 'completed';
  token.consultationCompleted = new Date();
  await token.save();

  if (token.appointmentId) {
    const appt = await Appointment.findById(token.appointmentId);
    if (appt) {
      appt.status = APPOINTMENT_STATUSES.COMPLETED;
      await appt.save();
    }
  }

  // Clear Doctor active consultation state properties
  try {
    const Doctor = require('../doctors/doctor.model');
    await Doctor.updateOne(
      { _id: token.doctorId },
      {
        $set: {
          activeConsultation: null,
          currentAppointment: null,
          currentQueue: null
        }
      }
    );
  } catch (docErr) {
    console.error('Failed to clear doctor active state fields:', docErr);
  }

  broadcastQueueUpdate(token.doctorId);
  
  // Emit additional real-time socket events for complete EMR sync
  if (global.io) {
    const socketPayload = {
      doctorId: String(token.doctorId),
      tokenId: String(token._id),
      appointmentId: token.appointmentId ? String(token.appointmentId) : null
    };
    global.io.emit('consultation:completed', socketPayload);
    global.io.emit('appointment:completed', socketPayload);
    global.io.emit('queue:completed', socketPayload);
    global.io.emit('doctor:available', { doctorId: String(token.doctorId) });
    global.io.emit('queue:next-ready', { doctorId: String(token.doctorId) });
  }

  return token;
};

/**
 * Get Current Active Consultation
 */
const getCurrentConsultation = async (doctorId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const populateOpts = {
    path: 'appointmentId',
    populate: { path: 'patientId' }
  };

  // 1. Look for an active in_consultation token first
  const activeConsultation = await Token.findOne({
    doctorId,
    status: 'in_consultation',
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).populate(populateOpts);

  if (activeConsultation) {
    // Double check that the linked appointment is not completed
    if (activeConsultation.appointmentId && activeConsultation.appointmentId.status !== 'completed') {
      return { activeConsultation, lastCompleted: null };
    }
  }

  // 2. No active consultation – find the most recently completed token today
  const lastCompleted = await Token.findOne({
    doctorId,
    status: 'completed',
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  })
    .sort({ consultationCompleted: -1 })
    .populate(populateOpts);

  return { activeConsultation: null, lastCompleted: lastCompleted || null };
};

/**
 * Revisit Completed Consultation
 */
const revisitConsultation = async (tokenId) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  if (token.status !== 'completed') {
    throw new AppError('Only completed consultations can be revisited.', HTTP_STATUS.BAD_REQUEST);
  }

  // 1. Reset Token status
  token.status = 'in_consultation';
  await token.save();

  // 2. Reset Appointment status
  if (token.appointmentId) {
    const appt = await Appointment.findById(token.appointmentId);
    if (appt) {
      appt.status = APPOINTMENT_STATUSES.IN_CONSULTATION;
      await appt.save();
    }
  }

  // 3. Reset Consultation status to in_progress
  const Consultation = require('../consultations/consultation.model');
  const consultation = await Consultation.findOne({ appointmentId: token.appointmentId });
  if (consultation) {
    consultation.status = 'in_progress';
    await consultation.save();
  }

  broadcastQueueUpdate(token.doctorId);
  return token;
};

/**
 * Skip/Recall Token controls
 */
const skipToken = async (tokenId) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  token.status = 'skipped';
  token.skippedTime = new Date();
  await token.save();

  broadcastQueueUpdate(token.doctorId);
  return token;
};

const verifyPatientOtp = async (tokenId, enteredOtp) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  if (token.appointmentId) {
    const appt = await Appointment.findById(token.appointmentId);
    if (appt && !isPaymentCompleted(appt)) {
      throw new AppError('Cannot verify OTP. Consultation payment is pending.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  if (token.otpAttempts >= 3) {
    throw new AppError('Maximum OTP attempts reached. Please request receptionist assistance.', HTTP_STATUS.BAD_REQUEST);
  }

  if (token.otp !== enteredOtp) {
    token.otpAttempts += 1;
    await token.save();
    if (token.otpAttempts >= 3) {
      throw new AppError('Incorrect OTP. Maximum attempts reached. Please request receptionist assistance.', HTTP_STATUS.BAD_REQUEST);
    }
    throw new AppError(`Incorrect OTP. Please ask the patient to read the OTP again. (Attempt ${token.otpAttempts} of 3)`, HTTP_STATUS.BAD_REQUEST);
  }

  // OTP verified! Transition
  token.status = 'in_consultation';
  token.consultationStarted = new Date();
  await token.save();

  if (token.appointmentId) {
    const appt = await Appointment.findById(token.appointmentId);
    if (appt) {
      appt.status = APPOINTMENT_STATUSES.IN_CONSULTATION;
      await appt.save();
    }
  }

  broadcastQueueUpdate(token.doctorId);
  return token;
};

const reassignSkippedToken = async (tokenId) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  if (token.status !== 'skipped') {
    throw new AppError('Only skipped patients can be reassigned a new token.', HTTP_STATUS.BAD_REQUEST);
  }

  const doctor = await Doctor.findById(token.doctorId);
  const settings = doctor?.queueSettings || { tokenFormat: 'T-000' };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const dailyTokenCount = await Token.countDocuments({
    doctorId: token.doctorId,
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  const nextCount = dailyTokenCount + 1;
  const newTokenNumber = formatTokenNumber(settings.tokenFormat || 'T-000', nextCount);

  // Position placement
  const activeTokens = await Token.find({
    doctorId: token.doctorId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['waiting', 'called', 'in_consultation'] }
  });
  const queuePosition = activeTokens.length + 1;

  // Track history
  const originalTokenNumber = token.tokenNumber;
  token.originalTokenNumber = originalTokenNumber;
  token.tokenNumber = newTokenNumber;
  token.queuePosition = queuePosition;
  token.isReassigned = true;
  token.status = 'waiting';
  await token.save();

  await QueueAudit.create({
    tokenId: token._id,
    oldPosition: 0,
    newPosition: queuePosition,
    reason: `Reassigned new token ${newTokenNumber} (Original: ${originalTokenNumber}) - Skipped Earlier`,
    changedBy: token.doctorId
  });

  broadcastQueueUpdate(token.doctorId);
  return token;
};

const recallToken = async (tokenId, moveToQueueEnd) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  token.status = 'waiting';
  if (moveToQueueEnd) {
    const maxToken = await Token.findOne({ doctorId: token.doctorId }).sort({ queuePosition: -1 });
    token.queuePosition = (maxToken?.queuePosition || 0) + 1;
  }
  await token.save();

  broadcastQueueUpdate(token.doctorId);
  return token;
};

/**
 * Reorder Queue position manually (VIP overrides)
 */
const reorderQueue = async ({ tokenId, newPosition, reason, changedBy }) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  const oldPosition = token.queuePosition;
  token.queuePosition = newPosition;
  token.priority = 'doctor_override';
  await token.save();

  await QueueAudit.create({
    tokenId: token._id,
    oldPosition,
    newPosition,
    reason,
    changedBy: changedBy._id
  });

  broadcastQueueUpdate(token.doctorId);
  return token;
};

const broadcastQueueUpdate = (doctorId) => {
  if (global.io && doctorId) {
    global.io.emit('queue_update', { doctorId: doctorId.toString() });
  }
};

module.exports = {
  checkInAppointment,
  getSortedQueue,
  callNextPatient,
  startTokenConsultation,
  completeTokenConsultation,
  getCurrentConsultation,
  revisitConsultation,
  skipToken,
  recallToken,
  reorderQueue,
  autoProcessNoShows,
  verifyPatientOtp,
  reassignSkippedToken
};
