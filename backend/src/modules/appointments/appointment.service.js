const { ACTIVE_APPOINTMENT_STATUSES, APPOINTMENT_STATUSES, APPOINTMENT_STATUS_TRANSITIONS, DOCTOR_ALLOWED_STATUS_UPDATES } = require('../../common/constants/appointmentStatus');
const { ROLES } = require('../../common/constants/roles');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { calculateNoShowRisk } = require('../../common/utils/noShowRisk');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const {
  calculateEndTime,
  formatDate,
  getDayAvailability,
  generateSlots,
  isTimeRangeOverlap,
  normalizeDate
} = require('../../common/utils/slotUtils');
const { createAuditLog } = require('../audit/audit.service');
const AIPrediction = require('../ai/aiPrediction.model');
const aiService = require('../ai/ai.service');
const doctorRepository = require('../doctors/doctor.repository');
const patientRepository = require('../patients/patient.repository');
const appointmentRepository = require('./appointment.repository');
const { isClosedOnDate } = require('../holidays/clinicHoliday.service');
const { isDoctorOnLeave } = require('../leaves/doctorLeave.service');
const DoctorLeave = require('../leaves/doctorLeave.model');
const { logger } = require('../../common/utils/logger');

const resolveAppointmentDoctorImage = async (appointment) => {
  if (!appointment) return appointment;
  const aptObj = typeof appointment.toObject === 'function' ? appointment.toObject() : appointment;
  if (aptObj.doctorId) {
    const { resolveDoctorFiles } = require('../doctors/doctor.service');
    aptObj.doctorId = await resolveDoctorFiles(aptObj.doctorId);
  }
  return aptObj;
};

const assertDateNotPast = ({ appointmentDate, appointmentType }) => {
  const normalizedDate = normalizeDate(appointmentDate);
  const today = normalizeDate(new Date());

  if (normalizedDate < today && !(appointmentType === 'walk_in' && formatDate(normalizedDate) === formatDate(today))) {
    throw new AppError('Appointment date cannot be in the past.', HTTP_STATUS.BAD_REQUEST);
  }
};

const buildAppointmentFilter = ({ clinicId, query }) => {
  const filter = { clinicId };

  if (query.date) {
    filter.appointmentDate = normalizeDate(query.date);
  }

  if (query.from || query.to) {
    filter.appointmentDate = {
      ...(query.from ? { $gte: normalizeDate(query.from) } : {}),
      ...(query.to ? { $lte: normalizeDate(query.to) } : {})
    };
  }

  if (query.doctorId) {
    filter.doctorId = query.doctorId;
  }

  if (query.patientId) {
    filter.patientId = query.patientId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  return filter;
};

const appendNote = (existingNotes, note) => {
  if (!note) {
    return existingNotes || '';
  }

  return [existingNotes, note].filter(Boolean).join('\n');
};

const getNoShowRecommendedAction = (level) => {
  if (level === 'high') {
    return 'Call patient, confirm attendance, and consider controlled overbooking only if clinic policy allows.';
  }

  if (level === 'medium') {
    return 'Send reminder and confirm appointment.';
  }

  return 'Standard reminder is sufficient.';
};

const combineAppointmentDateTime = (appointmentDate, startTime) => {
  const normalizedDate = normalizeDate(appointmentDate);
  return new Date(`${formatDate(normalizedDate)}T${startTime}:00.000Z`);
};

const calculateLeadTimeHours = ({ appointmentDate, startTime }) => {
  const scheduledAt = combineAppointmentDateTime(appointmentDate, startTime);
  const diffMs = scheduledAt.getTime() - Date.now();
  return Math.max(0, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
};

const buildNoShowPredictionPayload = ({
  patient,
  doctor,
  payload,
  appointmentDate,
  startTime,
  patientAppointmentHistory
}) => ({
  patient_id: String(patient._id),
  appointment_date: formatDate(appointmentDate),
  appointment_time: startTime,
  weekday: normalizeDate(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
  doctor_id: String(doctor._id),
  department: doctor.specialization || 'General Physician',
  booking_source: payload.source || 'reception',
  previous_visits: Number(patientAppointmentHistory.completedCount || 0),
  previous_no_shows: Number(patientAppointmentHistory.noShowCount || 0),
  previous_cancellations: Number(patientAppointmentHistory.cancelledCount || 0),
  lead_time_hours: calculateLeadTimeHours({ appointmentDate, startTime }),
  reminder_sent: false,
  payment_status: 'pending'
});

const mapPredictionToAppointmentRisk = ({ responseData, fallbackRisk }) => {
  const output = responseData?.output || responseData || {};
  const score = Number(output.risk_score ?? responseData?.risk_score ?? fallbackRisk.score ?? 0);
  const level = output.risk_level || responseData?.risk_level || fallbackRisk.level || 'low';
  const reasons = output.reasons || output.factors || responseData?.reasons || fallbackRisk.reasons || [];

  return {
    score,
    level,
    reasons,
    reasonCodes: output.reason_codes || responseData?.reason_codes || [],
    recommendedAction: output.recommended_action || responseData?.recommended_action || getNoShowRecommendedAction(level),
    confidence: Number(responseData?.confidence ?? output.confidence ?? fallbackRisk.score ?? 0),
    modelName: responseData?.model_name || output.model_name || 'rule_based_no_show_local',
    modelVersion: responseData?.model_version || output.model_version || 'local-1.0.0',
    modelStatus: responseData?.model_status || output.model_status || 'fallback',
    requiresStaffReview: Boolean(output.requires_staff_review ?? responseData?.requires_staff_review ?? true),
    auditId: responseData?.audit_id || output.audit_id || '',
    generatedAt: new Date()
  };
};

const buildFallbackNoShowRisk = (fallbackRisk) => ({
  score: fallbackRisk.score,
  level: fallbackRisk.level,
  reasons: fallbackRisk.reasons || [],
  reasonCodes: [],
  recommendedAction: getNoShowRecommendedAction(fallbackRisk.level),
  confidence: Number(fallbackRisk.score || 0),
  modelName: 'rule_based_no_show_local',
  modelVersion: 'local-1.0.0',
  modelStatus: 'local',
  requiresStaffReview: true,
  auditId: '',
  generatedAt: new Date()
});

const buildPredictionPersistenceRecord = ({ clinicId, patientId, appointmentId, inputData, responseData, createdBy }) => ({
  clinicId,
  patientId,
  appointmentId,
  predictionType: 'no_show',
  inputData,
  outputData: responseData,
  confidenceScore: Number(responseData?.confidence || 0),
  modelName: responseData?.model_name || '',
  modelVersion: responseData?.model_version || '',
  disclaimer: 'No-show risk is predictive assistance only and must not be used to deny care.',
  createdBy
});

const resolveNoShowRisk = async ({
  clinicId,
  patient,
  doctor,
  payload,
  appointmentDate,
  startTime,
  appointmentType,
  patientAppointmentHistory
}) => {
  const fallbackRisk = calculateNoShowRisk({
    patientAppointmentHistory,
    appointmentDate,
    startTime,
    appointmentType
  });
  const predictionPayload = buildNoShowPredictionPayload({
    patient,
    doctor,
    payload,
    appointmentDate,
    startTime,
    patientAppointmentHistory
  });

  try {
    const response = await aiService.noShow(predictionPayload);
    const responseData = response?.data || response;

    return {
      noShowRisk: mapPredictionToAppointmentRisk({ responseData, fallbackRisk }),
      predictionPayload,
      predictionResponseData: responseData
    };
  } catch (_error) {
    return {
      noShowRisk: buildFallbackNoShowRisk(fallbackRisk),
      predictionPayload,
      predictionResponseData: null
    };
  }
};

const getDoctorForRequester = async ({ requester, clinicId }) => {
  if (requester.role !== ROLES.DOCTOR) {
    return null;
  }

  const doctor = await doctorRepository.findDoctorByUserIdAndClinic({
    userId: requester._id,
    clinicId
  });

  if (!doctor) {
    throw new AppError('Doctor profile is not linked to this account.', HTTP_STATUS.FORBIDDEN);
  }

  return doctor;
};

const ensurePatientAndDoctor = async ({ clinicId, patientId, doctorId }) => {
  const [patient, doctor] = await Promise.all([
    patientRepository.findPatientByIdAndClinic({ patientId, clinicId }),
    doctorRepository.findDoctorByIdAndClinic({ doctorId, clinicId })
  ]);

  if (!patient || !patient.isActive) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!doctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!doctor.isActive) {
    throw new AppError('Doctor is inactive and cannot accept appointments.', HTTP_STATUS.BAD_REQUEST);
  }

  const hasBankDetails = doctor.bankAccount?.accountNumber &&doctor.bankAccount?.ifscCode &&doctor.bankAccount?.bankName &&doctor.bankAccount?.accountHolderName &&doctor.bankAccount?.passbookCopy;


  console.log(hasBankDetails);

  if (!hasBankDetails) {
    throw new AppError("This doctor has not completed their bank account setup or passbook upload, and cannot accept appointments at this time.", HTTP_STATUS.BAD_REQUEST);
  }

  return { patient, doctor };
};

const buildPatientAppointmentHistory = async ({ clinicId, patientId }) => {
  const previousAppointments = await appointmentRepository.findPatientAppointmentHistory({
    clinicId,
    patientId
  });

  const completedCount = previousAppointments.filter((item) => item.status === APPOINTMENT_STATUSES.COMPLETED).length;
  const noShowCount = previousAppointments.filter((item) => item.status === APPOINTMENT_STATUSES.NO_SHOW).length;
  const cancelledCount = previousAppointments.filter((item) => item.status === APPOINTMENT_STATUSES.CANCELLED).length;
  const lastAppointmentStatus = previousAppointments[0]?.status || null;

  return {
    completedCount,
    noShowCount,
    cancelledCount,
    lastAppointmentStatus
  };
};

const assertSlotIsBookable = async ({
  appointmentDate,
  startTime,
  durationMinutes,
  appointmentType,
  doctor,
  clinicId,
  excludeAppointmentId = null,
  allowOutsideAvailability = false
}) => {
  const normalizedDate = normalizeDate(appointmentDate);
  const endTime = calculateEndTime(startTime, durationMinutes);

  if (startTime >= endTime) {
    throw new AppError('startTime must be earlier than endTime.', HTTP_STATUS.BAD_REQUEST);
  }

  assertDateNotPast({ appointmentDate: normalizedDate, appointmentType });
  // New: check if clinic is closed on this date for appointments
  const closed = await isClosedOnDate(clinicId, normalizedDate, 'appointments', appointmentType);
  if (closed) {
    throw new AppError('Clinic is closed on the selected date.', HTTP_STATUS.CONFLICT);
  }

  // Check if doctor is on leave during the selected time range
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDatetime = new Date(normalizedDate);
  startDatetime.setUTCHours(hours, minutes, 0, 0);
  const endDatetime = new Date(startDatetime.getTime() + durationMinutes * 60 * 1000);

  const onLeave = await isDoctorOnLeave(doctor._id, startDatetime, endDatetime);
  if (onLeave) {
    throw new AppError('Doctor is on leave during the selected time slot.', HTTP_STATUS.CONFLICT);
  }

  const dayAvailability = getDayAvailability(doctor.availability || [], normalizedDate, clinicId);

  if (!allowOutsideAvailability) {
    if (!dayAvailability) {
      throw new AppError('Doctor is not available on the selected date.', HTTP_STATUS.CONFLICT);
    }

    if (
      !isTimeRangeOverlap(
        startTime,
        endTime,
        dayAvailability.startTime,
        dayAvailability.endTime
      ) ||
      startTime < dayAvailability.startTime ||
      endTime > dayAvailability.endTime
    ) {
      throw new AppError('Selected slot is outside doctor availability.', HTTP_STATUS.CONFLICT);
    }
  }

  const conflictingBlockedSlot = (doctor.blockedSlots || []).find(
    (item) => formatDate(item.date) === formatDate(normalizedDate) && isTimeRangeOverlap(startTime, endTime, item.startTime, item.endTime)
  );

  if (conflictingBlockedSlot) {
    throw new AppError(
      conflictingBlockedSlot.reason ? `Selected slot is blocked: ${conflictingBlockedSlot.reason}` : 'Selected slot is blocked.',
      HTTP_STATUS.CONFLICT
    );
  }

  const existingAppointments = await appointmentRepository.findDoctorAppointmentsForDate({
    clinicId,
    doctorId: doctor._id,
    appointmentDate: normalizedDate,
    statuses: ACTIVE_APPOINTMENT_STATUSES,
    excludeAppointmentId
  });

  const overlappingAppointment = existingAppointments.find((item) =>
    isTimeRangeOverlap(startTime, endTime, item.startTime, item.endTime)
  );

  if (overlappingAppointment) {
    throw new AppError('Selected slot overlaps with an existing appointment.', HTTP_STATUS.CONFLICT);
  }

  return {
    appointmentDate: normalizedDate,
    endTime
  };
};

const getScopedAppointment = async ({ requester, appointmentId, requestedClinicId = null, populateDetails = true }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const appointment = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId,
    clinicId,
    populateDetails
  });

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getDoctorForRequester({ requester, clinicId });

    if (String(appointment.doctorId?._id || appointment.doctorId) !== String(doctor._id)) {
      throw new AppError('You do not have permission to access this appointment.', HTTP_STATUS.FORBIDDEN);
    }
  }

  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const patient = await resolvePatientForRequester({ requester, clinicId });

    if (String(appointment.patientId?._id || appointment.patientId) !== String(patient._id)) {
      throw new AppError('You do not have permission to access this appointment.', HTTP_STATUS.FORBIDDEN);
    }
  }

  return { appointment, clinicId };
};

const createAppointment = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const linkedPatient = await resolvePatientForRequester({ requester, clinicId });
    if (!linkedPatient || String(linkedPatient._id) !== String(payload.patientId)) {
      throw new AppError('You can only book appointments for yourself.', HTTP_STATUS.FORBIDDEN);
    }

    // Check for any unpaid consultation invoices for this patient where the consultation has been completed
    const Invoice = require('../billing/invoice.model');
    const unpaidInvoices = await Invoice.find({
      patientId: payload.patientId,
      serviceType: 'CONSULTATION',
      paymentStatus: 'unpaid',
      consultationId: { $ne: null }
    }).populate('consultationId');

    const hasUnpaidCompletedConsultation = unpaidInvoices.some(
      inv => inv.consultationId && inv.consultationId.status === 'completed'
    );

    if (hasUnpaidCompletedConsultation) {
      throw new AppError('You have pending unpaid consultation fees. Please complete payment before booking new appointments.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const { patient, doctor } = await ensurePatientAndDoctor({
    clinicId,
    patientId: payload.patientId,
    doctorId: payload.doctorId
  });
  const allowOutsideAvailability = payload.appointmentType === 'walk_in' || payload.isEarlyBooking === true;
  const slot = await assertSlotIsBookable({
    appointmentDate: payload.appointmentDate,
    startTime: payload.startTime,
    durationMinutes: payload.durationMinutes,
    appointmentType: payload.appointmentType,
    doctor,
    clinicId,
    allowOutsideAvailability
  });
  const patientAppointmentHistory = await buildPatientAppointmentHistory({
    clinicId,
    patientId: patient._id
  });
  const { noShowRisk, predictionPayload, predictionResponseData } = await resolveNoShowRisk({
    clinicId,
    patient,
    doctor,
    payload,
    appointmentDate: slot.appointmentDate,
    startTime: payload.startTime,
    appointmentType: payload.appointmentType,
    patientAppointmentHistory
  });
  const appointment = await appointmentRepository.createAppointment({
    clinicId,
    patientId: patient._id,
    doctorId: doctor._id,
    createdBy: requester._id,
    appointmentDate: slot.appointmentDate,
    startTime: payload.startTime,
    endTime: slot.endTime,
    durationMinutes: payload.durationMinutes,
    appointmentType: payload.appointmentType,
    status: APPOINTMENT_STATUSES.BOOKED,
    reasonForVisit: payload.reasonForVisit || '',
    symptomsSummary: payload.symptomsSummary || '',
    source: payload.source || (requester.role === ROLES.ADMIN ? 'admin' : 'reception'),
    noShowRisk,
    notes: payload.notes || '',
    isEarlyBooking: payload.isEarlyBooking || false,
    earlyBookingReason: payload.earlyBookingReason || 'none'
  });

  if (predictionResponseData) {
    await AIPrediction.create(
      buildPredictionPersistenceRecord({
        clinicId,
        patientId: patient._id,
        appointmentId: appointment._id,
        inputData: predictionPayload,
        responseData: predictionResponseData,
        createdBy: requester._id
      })
    );
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'appointment_created',
    entity: 'Appointment',
    entityId: appointment._id,
    metadata: {
      doctorId: String(doctor._id),
      patientId: String(patient._id),
      appointmentDate: formatDate(slot.appointmentDate),
      startTime: payload.startTime,
      noShowRiskLevel: noShowRisk.level,
      noShowRiskStatus: noShowRisk.modelStatus
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  const populatedAppointment = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId: appointment._id,
    clinicId,
    populateDetails: true
  });

  let razorpayOrder = null;
  let invoiceId = null;

  const isPatientBooking = requester.role === ROLES.PATIENT || payload.source === 'chatbot' || payload.source === 'patient_app';
  if (isPatientBooking && doctor.consultationFee > 0) {
    try {
      const billingService = require('../billing/billing.service');
      const invoice = await billingService.createInvoice({
        requester,
        payload: {
          patientId: patient._id,
          appointmentId: appointment._id,
          items: [{
            itemType: 'consultation',
            name: 'Doctor Consultation Fee',
            quantity: 1,
            unitPrice: doctor.consultationFee
          }],
          dueDate: new Date(Date.now() + 24 * 3600 * 1000)
        },
        requestedClinicId: clinicId,
        req
      });
      invoiceId = invoice._id;
      
      const orderData = await billingService.createRazorpayOrder({
        requester,
        invoiceId: invoice._id,
        requestedClinicId: clinicId
      });
      razorpayOrder = orderData;
    } catch (billingErr) {
      logger.warn('Failed to auto-create billing/payment order for appointment booking:', billingErr);
    }
  }

  try {
    const {
      scheduleAppointmentReminderIntent,
      sendAppointmentBookingNotifications
    } = require('../notifications/notification.service');

    scheduleAppointmentReminderIntent({
      appointment: populatedAppointment,
      patient: populatedAppointment?.patientId || patient,
      doctor: populatedAppointment?.doctorId || doctor,
      actorUserId: requester._id
    }).catch(err => require('../../common/utils/logger').logger.warn('Failed to schedule reminder intent:', err));

    sendAppointmentBookingNotifications({
      appointment: populatedAppointment,
      patient: populatedAppointment?.patientId || patient,
      doctor: populatedAppointment?.doctorId || doctor,
      actorUserId: requester._id
    }).catch(err => require('../../common/utils/logger').logger.warn('Failed to send booking notifications:', err));
  } catch (_error) {
    // Notification scheduling is best-effort and must not block appointment creation.
  }

  const resData = resolveAppointmentDoctorImage(populatedAppointment);
  if (razorpayOrder) {
    return {
      appointment: resData,
      razorpayOrder,
      invoiceId
    };
  }
  return resData;
};

const listAppointments = async ({ requester, query }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });
  const doctor = await getDoctorForRequester({ requester, clinicId });

  if (doctor) {
    query = { ...query, doctorId: String(doctor._id) };
  }

  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const patient = await resolvePatientForRequester({ requester, clinicId });
    query = { ...query, patientId: String(patient._id) };
  }

  const { page, limit } = getPagination(query);
  const filter = buildAppointmentFilter({ clinicId, query });
  const { appointments, total } = await appointmentRepository.listAppointments({
    filter,
    page,
    limit
  });

  const resolvedAppointments = await Promise.all(
    appointments.map((apt) => resolveAppointmentDoctorImage(apt))
  );

  return {
    appointments: resolvedAppointments,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getCalendarAppointments = async ({ requester, query }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });
  const selectedDate = normalizeDate(query.date);
  const doctor = await getDoctorForRequester({ requester, clinicId });
  const view = query.view || 'day';
  const rangeStart = new Date(selectedDate);
  const rangeEnd = new Date(selectedDate);

  if (view === 'week') {
    const day = rangeStart.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    rangeStart.setUTCDate(rangeStart.getUTCDate() + diff);
    rangeEnd.setTime(rangeStart.getTime());
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 6);
  } else if (view === 'month') {
    rangeStart.setUTCDate(1);
    rangeEnd.setUTCMonth(rangeEnd.getUTCMonth() + 1, 0);
  }

  const filter = {
    clinicId,
    appointmentDate: {
      $gte: normalizeDate(rangeStart),
      $lte: normalizeDate(rangeEnd)
    },
    ...(query.doctorId ? { doctorId: query.doctorId } : {})
  };

  if (doctor) {
    filter.doctorId = doctor._id;
  }

  const appointments = await appointmentRepository.findAppointmentsForRange({ filter });
  const resolvedAppointments = await Promise.all(
    appointments.map((apt) => resolveAppointmentDoctorImage(apt))
  );
  const groupedAppointments = resolvedAppointments.reduce((groups, appointment) => {
    const dateKey = formatDate(appointment.appointmentDate);

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(appointment);
    return groups;
  }, {});

  return {
    view,
    date: formatDate(selectedDate),
    range: {
      from: formatDate(rangeStart),
      to: formatDate(rangeEnd)
    },
    groupedAppointments: Object.entries(groupedAppointments).map(([date, items]) => ({
      date,
      appointments: items
    }))
  };
};

const getAvailableSlots = async ({ requester, query }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });
  const doctor = await doctorRepository.findDoctorByIdAndClinic({
    doctorId: query.doctorId,
    clinicId
  });

  if (!doctor || !doctor.isActive) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  const appointmentDate = normalizeDate(query.date);

  const closedAppointments = await isClosedOnDate(clinicId, appointmentDate, 'appointments', query.appointmentType);
  const closedSlots = await isClosedOnDate(clinicId, appointmentDate, 'doctor_slots', query.appointmentType);
  if (closedAppointments || closedSlots) {
    return {
      doctorId: String(doctor._id),
      date: formatDate(appointmentDate),
      slots: []
    };
  }

  const existingAppointments = await appointmentRepository.findDoctorAppointmentsForDate({
    clinicId,
    doctorId: doctor._id,
    appointmentDate,
    statuses: ACTIVE_APPOINTMENT_STATUSES
  });

  const doctorLeaves = await DoctorLeave.find({
    doctorId: doctor._id,
    status: 'approved',
    start_datetime: { $lt: new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000) },
    end_datetime: { $gt: appointmentDate }
  });

  const slots = generateSlots({
    availability: doctor.availability || [],
    existingAppointments,
    blockedSlots: doctor.blockedSlots || [],
    date: appointmentDate,
    durationMinutes: query.durationMinutes,
    clinicId
  });

  const filteredSlots = slots.filter((slot) => {
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const slotStart = new Date(appointmentDate);
    slotStart.setUTCHours(startH, startM, 0, 0);

    const [endH, endM] = slot.endTime.split(':').map(Number);
    const slotEnd = new Date(appointmentDate);
    slotEnd.setUTCHours(endH, endM, 0, 0);

    const isOnLeave = doctorLeaves.some((leave) => leave.start_datetime < slotEnd && leave.end_datetime > slotStart);
    return !isOnLeave;
  });

  return {
    doctorId: String(doctor._id),
    date: formatDate(appointmentDate),
    slots: filteredSlots
  };
};

const getAppointmentById = async ({ requester, appointmentId, requestedClinicId = null }) => {
  const { appointment } = await getScopedAppointment({
    requester,
    appointmentId,
    requestedClinicId,
    populateDetails: true
  });

  return resolveAppointmentDoctorImage(appointment);
};

const updateAppointmentStatus = async ({ requester, appointmentId, payload, requestedClinicId = null, req }) => {
  const { appointment, clinicId } = await getScopedAppointment({
    requester,
    appointmentId,
    requestedClinicId,
    populateDetails: true
  });
  const previousStatus = appointment.status;
  const nextStatuses = APPOINTMENT_STATUS_TRANSITIONS[appointment.status] || [];

  if (!nextStatuses.includes(payload.status)) {
    throw new AppError('Invalid appointment status transition.', HTTP_STATUS.BAD_REQUEST);
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getDoctorForRequester({ requester, clinicId });

    if (String(appointment.doctorId?._id || appointment.doctorId) !== String(doctor._id)) {
      throw new AppError('You do not have permission to update this appointment.', HTTP_STATUS.FORBIDDEN);
    }

    if (!DOCTOR_ALLOWED_STATUS_UPDATES.includes(payload.status)) {
      throw new AppError('Doctors can only update consultation progress statuses.', HTTP_STATUS.FORBIDDEN);
    }
  }

  appointment.status = payload.status;
  appointment.notes = appendNote(appointment.notes, payload.note);
  await appointment.save();

  if (payload.status === APPOINTMENT_STATUSES.CHECKED_IN) {
    try {
      const { scheduleWaitTimeReminder } = require('../notifications/notification.service');
      await scheduleWaitTimeReminder({
        appointmentId: appointment._id,
        clinicId,
        actorUserId: requester._id
      });
    } catch (_error) {
      // best effort
    }
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'appointment_status_updated',
    entity: 'Appointment',
    entityId: appointment._id,
    metadata: {
      fromStatus: previousStatus,
      toStatus: payload.status
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  const updatedAppt = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId: appointment._id,
    clinicId,
    populateDetails: true
  });
  return resolveAppointmentDoctorImage(updatedAppt);
};

const cancelAppointment = async ({ requester, appointmentId, payload, requestedClinicId = null, req }) => {
  const { appointment, clinicId } = await getScopedAppointment({
    requester,
    appointmentId,
    requestedClinicId,
    populateDetails: false
  });
  const nextStatuses = APPOINTMENT_STATUS_TRANSITIONS[appointment.status] || [];

  if (!nextStatuses.includes(APPOINTMENT_STATUSES.CANCELLED)) {
    throw new AppError('Only booked or confirmed appointments can be cancelled.', HTTP_STATUS.BAD_REQUEST);
  }

  appointment.status = APPOINTMENT_STATUSES.CANCELLED;
  appointment.cancellationReason = payload.cancellationReason;
  await appointment.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'appointment_cancelled',
    entity: 'Appointment',
    entityId: appointment._id,
    metadata: {
      cancellationReason: payload.cancellationReason
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  const updatedAppt = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId: appointment._id,
    clinicId,
    populateDetails: true
  });
  return resolveAppointmentDoctorImage(updatedAppt);
};

const rescheduleAppointment = async ({ requester, appointmentId, payload, requestedClinicId = null, req }) => {
  const { appointment, clinicId } = await getScopedAppointment({
    requester,
    appointmentId,
    requestedClinicId,
    populateDetails: true
  });
  const nextStatuses = APPOINTMENT_STATUS_TRANSITIONS[appointment.status] || [];

  if (!nextStatuses.includes(APPOINTMENT_STATUSES.RESCHEDULED)) {
    const isCancelledDueToLeave = appointment.status === APPOINTMENT_STATUSES.CANCELLED &&
      appointment.cancellationReason &&
      appointment.cancellationReason.includes('Doctor on leave');

    if (!isCancelledDueToLeave) {
      throw new AppError('Only booked or confirmed appointments can be rescheduled.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const doctor = await doctorRepository.findDoctorByIdAndClinic({
    doctorId: appointment.doctorId?._id || appointment.doctorId,
    clinicId
  });
  const slot = await assertSlotIsBookable({
    appointmentDate: payload.appointmentDate,
    startTime: payload.startTime,
    durationMinutes: payload.durationMinutes,
    appointmentType: appointment.appointmentType,
    doctor,
    clinicId,
    allowOutsideAvailability: payload.isEarlyBooking === true
  });
  const patientAppointmentHistory = await buildPatientAppointmentHistory({
    clinicId,
    patientId: appointment.patientId?._id || appointment.patientId
  });
  const { noShowRisk, predictionPayload, predictionResponseData } = await resolveNoShowRisk({
    clinicId,
    patient: appointment.patientId?._id ? appointment.patientId : await patientRepository.findPatientByIdAndClinic({
      patientId: appointment.patientId,
      clinicId
    }),
    doctor,
    payload: {
      source: appointment.source
    },
    appointmentDate: slot.appointmentDate,
    startTime: payload.startTime,
    appointmentType: appointment.appointmentType,
    patientAppointmentHistory
  });

  const newAppointment = await appointmentRepository.createAppointment({
    clinicId,
    patientId: appointment.patientId?._id || appointment.patientId,
    doctorId: appointment.doctorId?._id || appointment.doctorId,
    createdBy: requester._id,
    appointmentDate: slot.appointmentDate,
    startTime: payload.startTime,
    endTime: slot.endTime,
    durationMinutes: payload.durationMinutes,
    appointmentType: appointment.appointmentType,
    status: APPOINTMENT_STATUSES.BOOKED,
    reasonForVisit: appointment.reasonForVisit,
    symptomsSummary: appointment.symptomsSummary,
    source: appointment.source,
    noShowRisk,
    notes: appendNote(appointment.notes, `Rescheduled: ${payload.reason}`),
    rescheduledFrom: appointment._id,
    isEarlyBooking: payload.isEarlyBooking || false,
    earlyBookingReason: payload.earlyBookingReason || 'none',
    meta: {
      ...(appointment.meta || {}),
      rescheduleReason: payload.reason
    }
  });

  if (predictionResponseData) {
    await AIPrediction.create(
      buildPredictionPersistenceRecord({
        clinicId,
        patientId: appointment.patientId?._id || appointment.patientId,
        appointmentId: newAppointment._id,
        inputData: predictionPayload,
        responseData: predictionResponseData,
        createdBy: requester._id
      })
    );
  }

  appointment.status = APPOINTMENT_STATUSES.RESCHEDULED;
  appointment.notes = appendNote(appointment.notes, `Rescheduled to ${formatDate(slot.appointmentDate)} ${payload.startTime}. Reason: ${payload.reason}`);
  await appointment.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'appointment_rescheduled',
    entity: 'Appointment',
    entityId: newAppointment._id,
    metadata: {
      previousAppointmentId: String(appointment._id),
      rescheduleReason: payload.reason
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  const rescheduledAppt = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId: newAppointment._id,
    clinicId,
    populateDetails: true
  });

  try {
    const {
      scheduleAppointmentReminderIntent,
      sendAppointmentBookingNotifications
    } = require('../notifications/notification.service');

    await scheduleAppointmentReminderIntent({
      appointment: rescheduledAppt,
      patient: rescheduledAppt?.patientId || appointment.patientId,
      doctor: rescheduledAppt?.doctorId || doctor,
      actorUserId: requester._id
    });

    await sendAppointmentBookingNotifications({
      appointment: rescheduledAppt,
      patient: rescheduledAppt?.patientId || appointment.patientId,
      doctor: rescheduledAppt?.doctorId || doctor,
      actorUserId: requester._id
    });
  } catch (_error) {
    // Notification scheduling is best-effort and must not block appointment reschedule.
  }

  return resolveAppointmentDoctorImage(rescheduledAppt);
};

const getQueueStatus = async ({ requester, doctorId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  
  const today = normalizeDate(new Date());
  
  // Find today's appointments for this doctor
  const appointments = await appointmentRepository.findDoctorAppointmentsForDate({
    clinicId,
    doctorId,
    appointmentDate: today,
    statuses: [
      APPOINTMENT_STATUSES.BOOKED,
      APPOINTMENT_STATUSES.CHECKED_IN,
      APPOINTMENT_STATUSES.IN_CONSULTATION,
      APPOINTMENT_STATUSES.COMPLETED
    ]
  });

  let totalCheckedIn = 0;
  let inConsultation = null;
  let estimatedWaitTimePerPatient = 15; // default wait time
  let queuePosition = 1;

  appointments.forEach(app => {
    if (app.status === APPOINTMENT_STATUSES.IN_CONSULTATION) {
      inConsultation = app;
    } else if (app.status === APPOINTMENT_STATUSES.CHECKED_IN) {
      totalCheckedIn++;
    }
  });

  return {
    doctorId,
    date: formatDate(today),
    queueStatus: {
      totalCheckedIn,
      inConsultation: inConsultation ? inConsultation._id : null,
      estimatedWaitTimeMinutes: totalCheckedIn * estimatedWaitTimePerPatient
    },
    appointments: appointments.map(app => ({
      _id: app._id,
      patientId: app.patientId,
      status: app.status,
      startTime: app.startTime
    }))
  };
};

const verifyAppointmentPayment = async ({ requester, appointmentId, payload, req }) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
  const { env } = require('../../config/env');
  const crypto = require('crypto');

  if (!env.razorpayKeySecret) {
    throw new AppError('Razorpay secret is not configured.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new AppError('Invalid payment signature', HTTP_STATUS.BAD_REQUEST);
  }

  // Find invoice associated with this appointment
  const Invoice = require('../billing/invoice.model');
  const invoice = await Invoice.findOne({ appointmentId });
  if (!invoice) {
    throw new AppError('Associated invoice not found.', HTTP_STATUS.NOT_FOUND);
  }

  const billingService = require('../billing/billing.service');
  // Record payment on invoice
  await billingService.recordPayment({
    requester,
    invoiceId: invoice._id,
    payload: {
      amount: invoice.dueAmount,
      paymentMode: 'razorpay',
      transactionId: razorpay_payment_id,
      notes: `Razorpay Order: ${razorpay_order_id}`
    },
    requestedClinicId: invoice.clinicId,
    req
  });

  // Confirm appointment
  const appointment = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId,
    clinicId: invoice.clinicId,
    populateDetails: false
  });

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  appointment.status = APPOINTMENT_STATUSES.CONFIRMED;
  await appointment.save();

  const populated = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId,
    clinicId: invoice.clinicId,
    populateDetails: true
  });

  return resolveAppointmentDoctorImage(populated);
};

module.exports = {
  createAppointment,
  listAppointments,
  getCalendarAppointments,
  getAvailableSlots,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
  getQueueStatus,
  verifyAppointmentPayment
};
