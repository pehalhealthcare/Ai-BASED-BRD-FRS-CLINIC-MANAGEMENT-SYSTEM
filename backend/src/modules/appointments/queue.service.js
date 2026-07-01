const Appointment = require('./appointment.model');
const CheckIn = require('./checkin.model');
const Token = require('./token.model');
const QueueAudit = require('./queueAudit.model');
const Doctor = require('../doctors/doctor.model');
const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');

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
const checkInAppointment = async ({ appointmentId, method, isEmergency, requester }) => {
  await autoProcessNoShows();

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (['cancelled', 'completed', 'no_show', 'checked_in', 'late_check_in', 'called', 'in_consultation'].includes(appointment.status)) {
    throw new AppError(`Check-in is not allowed for appointment in status: ${appointment.status}`, HTTP_STATUS.BAD_REQUEST);
  }

  const doctor = await Doctor.findById(appointment.doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

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

  // Scenario 1: Patient arrives too early
  if (diffMins < -settings.earlyCheckInMins && appointment.appointmentType !== 'emergency') {
    const allowedTime = new Date(apptTime.getTime() - settings.earlyCheckInMins * 60 * 1000);
    const allowedTimeStr = allowedTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    throw new AppError(
      `You have arrived earlier than your allowed check-in time. Please check in after ${allowedTimeStr}.`,
      HTTP_STATUS.BAD_REQUEST
    );
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
  const tokenNumber = formatTokenNumber(settings.tokenFormat || 'T-000', nextCount);

  // Position placement
  const activeTokens = await Token.find({
    doctorId: doctor._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['waiting', 'called', 'in_consultation'] }
  });
  const queuePosition = activeTokens.length + 1;

  // Create CheckIn
  const checkInRecord = await CheckIn.create({
    appointmentId: appointment._id,
    checkinTime: now,
    checkedInBy: requester._id,
    method: method || 'Reception'
  });

  // Create Token
  const tokenRecord = await Token.create({
    appointmentId: appointment._id,
    doctorId: doctor._id,
    tokenNumber,
    queuePosition,
    priority: isEmergency || appointment.appointmentType === 'emergency' ? 'emergency' : 'standard',
    status: 'waiting',
    generatedTime: now
  });

  // Update Appointment status
  appointment.status = checkinStatus;
  await appointment.save();

  return {
    checkIn: checkInRecord,
    token: tokenRecord,
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

  // Self-healing: Find all checked_in/late_check_in appointments for today that don't have a token, and create one
  const todayAppointments = await Appointment.find({
    doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: [APPOINTMENT_STATUSES.CHECKED_IN, APPOINTMENT_STATUSES.LATE_CHECK_IN] }
  });

  for (const appt of todayAppointments) {
    const tokenExists = await Token.findOne({ appointmentId: appt._id });
    if (!tokenExists) {
      const dailyTokenCount = await Token.countDocuments({
        doctorId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      const doctor = await Doctor.findById(doctorId);
      const settings = doctor?.queueSettings || { tokenFormat: 'T-000' };
      const nextCount = dailyTokenCount + 1;
      const tokenNumber = appt.meta?.tokenNumber || formatTokenNumber(settings.tokenFormat || 'T-000', nextCount);

      await Token.create({
        appointmentId: appt._id,
        doctorId,
        tokenNumber,
        queuePosition: nextCount,
        priority: appt.appointmentType === 'emergency' ? 'emergency' : 'standard',
        status: 'waiting',
        generatedTime: new Date()
      });
    }
  }

  const tokens = await Token.find({
    doctorId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['waiting', 'called', 'in_consultation', 'skipped'] }
  }).populate({
    path: 'appointmentId',
    populate: { path: 'patientId' }
  });

  // Sort queue by priority
  // Priority: Emergency -> Doctor Override -> Checked-In -> Late Check-In -> Walk-In -> Skipped
  const getSortWeight = (token) => {
    if (token.status === 'in_consultation') return 0;
    if (token.status === 'called') return 1;
    if (token.priority === 'emergency') return 2;
    if (token.priority === 'doctor_override' || token.priority === 'vip') return 3;
    
    const appt = token.appointmentId;
    if (!appt) return 10;
    if (appt.status === APPOINTMENT_STATUSES.CHECKED_IN) {
      return appt.appointmentType === 'walk_in' ? 5 : 4;
    }
    if (appt.status === APPOINTMENT_STATUSES.LATE_CHECK_IN) return 6;
    if (token.status === 'skipped') return 7;
    return 10;
  };

  tokens.sort((a, b) => {
    const weightA = getSortWeight(a);
    const weightB = getSortWeight(b);
    if (weightA !== weightB) return weightA - weightB;
    // Secondary sort: queuePosition or check-in time
    return a.queuePosition - b.queuePosition;
  });

  return tokens;
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

  const otp = String(Math.floor(100000 + Math.random() * 900000));

  const nextToken = await Token.findById(nextTokenRaw._id);
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

  return nextToken;
};

/**
 * Start Consultation for Called/Waiting Token
 */
const startTokenConsultation = async (tokenId) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

  if (token.status === 'waiting') {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    token.status = 'called';
    token.calledTime = new Date();
    token.otp = otp;
    token.otpAttempts = 0;
    await token.save();

    if (token.appointmentId) {
      const appt = await Appointment.findById(token.appointmentId).populate('patientId');
      if (appt) {
        appt.status = APPOINTMENT_STATUSES.CALLED;
        appt.meta = {
          ...appt.meta,
          tokenNumber: token.tokenNumber,
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
              subject: `Your Token ${token.tokenNumber} is Called!`,
              body: `Hello ${appt.patientId?.userId?.name || appt.patientId?.fullName || 'Patient'},\n\nYou are called by the doctor. Please proceed to the doctor's cabin.\nTell the doctor your Consultation OTP: ${otp} to start your consultation.\n\nRoom Number: AB-101\n\nThank you!`,
              channel: 'email'
            });
          }
        } catch (err) {
          console.error('Failed to send call-next email:', err);
        }
      }
    }
    return token;
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

  return token;
};

const verifyPatientOtp = async (tokenId, enteredOtp) => {
  const token = await Token.findById(tokenId);
  if (!token) throw new AppError('Token not found.', HTTP_STATUS.NOT_FOUND);

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

  return token;
};

module.exports = {
  checkInAppointment,
  getSortedQueue,
  callNextPatient,
  startTokenConsultation,
  completeTokenConsultation,
  skipToken,
  recallToken,
  reorderQueue,
  autoProcessNoShows,
  verifyPatientOtp,
  reassignSkippedToken
};
