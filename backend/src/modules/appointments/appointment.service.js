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

const buildAppointmentFilter = ({ clinicId, query, requester }) => {
  const filter = {};
  if (requester?.role !== ROLES.PATIENT || query.clinicId) {
    filter.clinicId = clinicId;
  }

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

const ensureAppointmentInvoice = async (appointment, requester) => {
  if (appointment.paymentStatus === 'pending' && appointment.consultationFee > 0) {
    const Invoice = require('../billing/invoice.model');
    const existingInvoice = await Invoice.findOne({ appointmentId: appointment._id });
    if (!existingInvoice) {
      try {
        const billingService = require('../billing/billing.service');
        await billingService.createInvoice({
          requester: { _id: appointment.createdBy || requester?._id, role: 'PATIENT' },
          payload: {
            patientId: appointment.patientId?._id || appointment.patientId,
            appointmentId: appointment._id,
            items: [{
              itemType: 'consultation',
              name: 'Doctor Consultation Fee',
              quantity: 1,
              unitPrice: appointment.consultationFee
            }],
            dueDate: new Date(Date.now() + 24 * 3650 * 24 * 3600 * 1000)
          },
          requestedClinicId: appointment.clinicId
        });
      } catch (err) {
        console.error('Failed to auto-create missing invoice:', err);
      }
    }
  }
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
  const patient = await patientRepository.findPatientByIdAndClinic({ patientId, clinicId });
  
  // Support patients booking cross-clinic or checking doctor in their assigned clinics directly
  let doctor = await doctorRepository.findDoctorByIdAndClinic({ doctorId, clinicId });
  if (!doctor) {
    // If not found in patient's primary clinic, search by doctor ID generally (doctors can work across multiple clinics)
    const Doctor = require('../doctors/doctor.model');
    doctor = await Doctor.findById(doctorId);
  }

  if (!patient || !patient.isActive) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!doctor) {
    throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!doctor.isActive) {
    throw new AppError('Doctor is inactive and cannot accept appointments.', HTTP_STATUS.BAD_REQUEST);
  }

  // const hasBankDetails = doctor.bankAccount?.accountNumber &&doctor.bankAccount?.ifscCode &&doctor.bankAccount?.bankName &&doctor.bankAccount?.accountHolderName &&doctor.bankAccount?.passbookCopy;
  // console.log(hasBankDetails);
  // if (!hasBankDetails) {
  //   throw new AppError("This doctor has not completed their bank account setup or passbook upload, and cannot accept appointments at this time.", HTTP_STATUS.BAD_REQUEST);
  // }

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
  const isPatient = requester.role === ROLES.PATIENT;
  const clinicId = isPatient ? null : resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const appointment = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId,
    clinicId: isPatient ? undefined : clinicId,
    populateDetails
  });

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Check and apply any timed-out discount/waiver approvals or payments on the fly
  if (!appointment.populated('clinicId')) {
    await appointment.populate('clinicId');
  }
  const { checkAndApplyExpiries } = require('./discount.service');
  await checkAndApplyExpiries(appointment);
  await ensureAppointmentInvoice(appointment, requester);

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

  const targetClinicId = doctor.clinicId ? String(doctor.clinicId) : clinicId;

  const allowOutsideAvailability = payload.appointmentType === 'walk_in' || payload.isEarlyBooking === true;
  const slot = await assertSlotIsBookable({
    appointmentDate: payload.appointmentDate,
    startTime: payload.startTime,
    durationMinutes: payload.durationMinutes,
    appointmentType: payload.appointmentType,
    doctor,
    clinicId: targetClinicId,
    allowOutsideAvailability
  });
  const patientAppointmentHistory = await buildPatientAppointmentHistory({
    clinicId: targetClinicId,
    patientId: patient._id
  });
  const { noShowRisk, predictionPayload, predictionResponseData } = await resolveNoShowRisk({
    clinicId: targetClinicId,
    patient,
    doctor,
    payload,
    appointmentDate: slot.appointmentDate,
    startTime: payload.startTime,
    appointmentType: payload.appointmentType,
    patientAppointmentHistory
  });
  const crypto = require('crypto');
  const checkinToken = crypto.randomUUID();
  
  // Calculate expiration time (appointment date + start time)
  const apptDate = normalizeDate(slot.appointmentDate);
  const [startHour, startMin] = payload.startTime.split(':').map(Number);
  const checkinExpiresAt = new Date(apptDate);
  checkinExpiresAt.setHours(startHour, startMin, 0, 0);

  const { generateScopedSequenceCode } = require('../../common/utils/generateScopedSequenceCode');
  const appointmentCode = await generateScopedSequenceCode({
    prefix: 'APT',
    scope: 'appointment',
    clinicId: targetClinicId
  });

  const dayAppointments = await appointmentRepository.findDoctorAppointmentsForDate({
    clinicId: targetClinicId,
    doctorId: doctor._id,
    appointmentDate: slot.appointmentDate,
    statuses: Object.values(APPOINTMENT_STATUSES)
  });
  const queueNumber = dayAppointments.length + 1;
  const tokenNumber = dayAppointments.length + 1;
  const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${appointmentCode}`;

  let fee = doctor.consultationFee || 0;
  let followUpDetails = null;

  const policy = (doctor.clinicPolicies || []).find(
    (p) => String(p.clinicId) === String(targetClinicId)
  );

  if (policy) {
    fee = policy.consultationFee !== undefined ? policy.consultationFee : (doctor.consultationFee || 0);

    if (policy.followUpWindowDays > 0) {
      const ConsultationModel = require('../consultations/consultation.model');
      const lastConsultation = await ConsultationModel.findOne({
        patientId: patient._id,
        doctorId: doctor._id,
        clinicId: targetClinicId,
        status: 'completed'
      }).sort({ completedAt: -1 });

      if (lastConsultation && lastConsultation.completedAt) {
        const diffMs = new Date(slot.appointmentDate).getTime() - new Date(lastConsultation.completedAt).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= policy.followUpWindowDays) {
          followUpDetails = {
            isFollowUp: true,
            lastCompletedConsultationDate: lastConsultation.completedAt,
            followUpAppliedPolicy: policy.followUpPolicy,
            followUpWindowDays: policy.followUpWindowDays,
            diffDays
          };

          if (policy.followUpPolicy === 'free') {
            fee = 0;
          } else if (policy.followUpPolicy === 'discounted') {
            fee = policy.followUpFee || 0;
          } else if (policy.followUpPolicy === 'full') {
            fee = policy.consultationFee !== undefined ? policy.consultationFee : (doctor.consultationFee || 0);
          }
        }
      }
    }
  }

  const appointment = await appointmentRepository.createAppointment({
    clinicId: targetClinicId,
    patientId: patient._id,
    doctorId: doctor._id,
    createdBy: requester._id,
    appointmentDate: slot.appointmentDate,
    startTime: payload.startTime,
    endTime: slot.endTime,
    durationMinutes: payload.durationMinutes,
    appointmentType: followUpDetails ? 'follow_up' : (payload.appointmentType || 'scheduled'),
    status: APPOINTMENT_STATUSES.BOOKED,
    reasonForVisit: payload.reasonForVisit || '',
    symptomsSummary: payload.symptomsSummary || '',
    source: payload.source || (requester.role === ROLES.ADMIN ? 'admin' : 'reception'),
    noShowRisk,
    notes: payload.notes || '',
    isEarlyBooking: payload.isEarlyBooking || false,
    earlyBookingReason: payload.earlyBookingReason || 'none',
    checkin_token_uuid: checkinToken,
    checkinTokenExpiresAt: checkinExpiresAt,
    consultationFee: fee,
    remainingAmount: fee,
    paymentStatus: fee === 0 ? 'paid' : 'pending',
    appointmentCode,
    queueNumber,
    tokenNumber,
    qrCode,
    meta: followUpDetails ? { ...followUpDetails } : {}
  });

  if (predictionResponseData) {
    await AIPrediction.create(
      buildPredictionPersistenceRecord({
        clinicId: targetClinicId,
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
    clinicId: targetClinicId,
    populateDetails: true
  });

  let razorpayOrder = null;
  let invoiceId = null;

  const isPatientBooking = requester.role === ROLES.PATIENT || payload.source === 'chatbot' || payload.source === 'patient_app';
  if (isPatientBooking && fee > 0) {
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
            unitPrice: fee
          }],
          dueDate: new Date(Date.now() + 24 * 3600 * 1000)
        },
        requestedClinicId: targetClinicId,
        req
      });
      invoiceId = invoice._id;
      
      const orderData = await billingService.createRazorpayOrder({
        requester,
        invoiceId: invoice._id,
        requestedClinicId: targetClinicId
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

  // Automatically mark past unattended appointments as not_attended
  try {
    const AppointmentModel = require('./appointment.model');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const activeStatuses = ['booked', 'confirmed', 'checked_in', 'waiting', 'called', 'in_consultation', 'consultation_started'];
    
    await AppointmentModel.updateMany(
      {
        ...(clinicId ? { clinicId } : {}),
        appointmentDate: { $lt: todayStart },
        status: { $in: activeStatuses }
      },
      {
        $set: { status: 'not_attended' }
      }
    );
  } catch (err) {
    console.error('Failed to auto-mark unattended appointments:', err);
  }

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
  const filter = buildAppointmentFilter({ clinicId, query, requester });
  const { appointments, total } = await appointmentRepository.listAppointments({
    filter,
    page,
    limit
  });

  const resolvedAppointments = await Promise.all(
    appointments.map(async (apt) => {
      await ensureAppointmentInvoice(apt, requester);
      return resolveAppointmentDoctorImage(apt);
    })
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

  if (payload.status === APPOINTMENT_STATUSES.CHECKED_IN) {
    if (appointment.appointmentType === 'teleconsultation') {
      const now = new Date();
      const [startH, startM] = appointment.startTime.split(':').map(Number);
      const apptStartTime = new Date(appointment.appointmentDate);
      apptStartTime.setHours(startH, startM, 0, 0);

      const diffMs = apptStartTime.getTime() - now.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins > 10) {
        throw new AppError('Online check-in is only allowed 10 minutes before the consultation start time.', HTTP_STATUS.BAD_REQUEST);
      }
    } else {
      const AppointmentModel = require('./appointment.model');
      const tokenCount = await AppointmentModel.countDocuments({
        clinicId,
        doctorId: appointment.doctorId?._id || appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        status: APPOINTMENT_STATUSES.CHECKED_IN
      });
      const tokenNumber = tokenCount + 1;
      appointment.meta = {
        ...(appointment.meta || {}),
        tokenNumber
      };
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
  if (['completed', 'cancelled', 'patient_cancelled', 'clinic_cancelled'].includes(appointment.status)) {
    throw new AppError('This appointment is already cancelled or completed and cannot be cancelled.', HTTP_STATUS.BAD_REQUEST);
  }

  const nextStatuses = APPOINTMENT_STATUS_TRANSITIONS[appointment.status] || [];

  if (!nextStatuses.includes(APPOINTMENT_STATUSES.CANCELLED) &&
      !nextStatuses.includes(APPOINTMENT_STATUSES.PATIENT_CANCELLED) &&
      !nextStatuses.includes(APPOINTMENT_STATUSES.CLINIC_CANCELLED)) {
    throw new AppError('Only booked or confirmed appointments can be cancelled.', HTTP_STATUS.BAD_REQUEST);
  }

  appointment.status = requester.role === ROLES.PATIENT ? APPOINTMENT_STATUSES.PATIENT_CANCELLED : APPOINTMENT_STATUSES.CLINIC_CANCELLED;
  appointment.cancellationReason = payload.cancellationReason;
  await appointment.save();

  try {
    const Invoice = require('../billing/invoice.model');
    await Invoice.updateMany(
      { appointmentId: appointment._id, paymentStatus: { $in: ['unpaid', 'pending', 'UNPAID', 'PENDING'] } },
      { $set: { paymentStatus: 'cancelled', invoiceStatus: 'cancelled', cancellationReason: payload.cancellationReason || 'Appointment cancelled' } }
    );
  } catch (err) {
    console.error('Failed to cancel unpaid invoice on appointment cancel:', err);
  }

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

  try {
    const { sendAppointmentCancelNotifications } = require('../notifications/notification.service');
    await sendAppointmentCancelNotifications({
      appointment: updatedAppt,
      patient: updatedAppt.patientId,
      doctor: updatedAppt.doctorId,
      actorUserId: requester._id
    });
  } catch (err) {
    // best-effort
  }

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

  if (!nextStatuses.includes(APPOINTMENT_STATUSES.RESCHEDULED) &&
      !nextStatuses.includes(APPOINTMENT_STATUSES.PATIENT_RESCHEDULED) &&
      !nextStatuses.includes(APPOINTMENT_STATUSES.CLINIC_RESCHEDULED)) {
    const isCancelledDueToLeave = (appointment.status === APPOINTMENT_STATUSES.CANCELLED ||
                                   appointment.status === APPOINTMENT_STATUSES.PATIENT_CANCELLED ||
                                   appointment.status === APPOINTMENT_STATUSES.CLINIC_CANCELLED) &&
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

  const originalPaid = appointment.paymentStatus === 'paid' || 
                       appointment.paymentStatus === 'fully_waived' ||
                       (appointment.paymentStatus === 'partially_waived' && (appointment.amountPaid || 0) >= (appointment.remainingAmount || 0));
  const isRefunded = appointment.refundStatus === 'refunded';
  const transferPayment = originalPaid && !isRefunded && appointment.paymentTransferStatus !== 'transferred';

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
    },
    consultationFee: appointment.consultationFee,
    paymentStatus: transferPayment ? appointment.paymentStatus : ((appointment.consultationFee || 0) === 0 ? 'paid' : 'pending'),
    amountPaid: transferPayment ? appointment.amountPaid : 0,
    remainingAmount: transferPayment ? appointment.remainingAmount : (appointment.consultationFee || 0),
    paymentTransferStatus: transferPayment ? 'received_transfer' : 'none',
    transferredFromAppointmentId: transferPayment ? appointment._id : null
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

  if (transferPayment) {
    appointment.status = APPOINTMENT_STATUSES.NOT_ATTENDED;
    appointment.paymentTransferStatus = 'transferred';
    appointment.transferredToAppointmentId = newAppointment._id;
  } else {
    appointment.status = requester.role === ROLES.PATIENT ? APPOINTMENT_STATUSES.PATIENT_RESCHEDULED : APPOINTMENT_STATUSES.CLINIC_RESCHEDULED;
  }
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
    const { sendAppointmentRescheduleNotifications } = require('../notifications/notification.service');
    await sendAppointmentRescheduleNotifications({
      oldAppointment: appointment,
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
  await appointment.save();

  const populated = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId,
    clinicId: invoice.clinicId,
    populateDetails: true
  });

  return resolveAppointmentDoctorImage(populated);
};

const scanCheckin = async ({ requester, token, requestedClinicId }) => {
  const Appointment = require('./appointment.model');
  const Clinic = require('../clinics/clinic.model');
  const Doctor = require('../doctors/doctor.model');
  const Patient = require('../patients/patient.model');

  // Locate the appointment by checkin_token_uuid
  const appointment = await Appointment.findOne({ checkin_token_uuid: token })
    .populate('patientId')
    .populate('doctorId')
    .populate('clinicId');

  if (!appointment) {
    throw new AppError('Invalid or expired check-in token.', HTTP_STATUS.NOT_FOUND);
  }

  // Enforce clinic check: Only scan QR in the clinic's reception for which the appointment has been created
  const receptionistClinicId = resolveClinicContext({ user: requester, requestedClinicId });
  if (String(appointment.clinicId?._id || appointment.clinicId) !== String(receptionistClinicId)) {
    throw new AppError('Check-in failed. This appointment belongs to another clinic and cannot be checked in here.', HTTP_STATUS.BAD_REQUEST);
  }

  // Validate the appointment date is today (it only gets scanned when appointment is of that day)
  const todayStr = new Date().toDateString();
  const appointmentDateStr = new Date(appointment.appointmentDate).toDateString();
  if (todayStr !== appointmentDateStr) {
    throw new AppError('Check-in failed. This appointment is scheduled for another day.', HTTP_STATUS.BAD_REQUEST);
  }

  // If already checked in, throw error or return details
  if (appointment.status === APPOINTMENT_STATUSES.CHECKED_IN || appointment.status === APPOINTMENT_STATUSES.IN_CONSULTATION) {
    return {
      message: 'Already Checked In',
      appointment: await resolveAppointmentDoctorImage(appointment)
    };
  }

  // Generate queue-based token number: ClinicName-SpecialistFirstLetter-sequencenumber
  const clinic = appointment.clinicId;
  const doctor = appointment.doctorId;
  const clinicCode = clinic?.name ? clinic.name.replace(/\s+/g, '') : 'Clinic';
  const specLetter = doctor?.specialization ? doctor.specialization.trim().charAt(0).toUpperCase() : 'G';

  // Count active checked-in or completed appointments for this doctor on today's date
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date();
  endOfDay.setHours(23,59,59,999);

  const countToday = await Appointment.countDocuments({
    clinicId: appointment.clinicId?._id || appointment.clinicId,
    doctorId: appointment.doctorId?._id || appointment.doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: [APPOINTMENT_STATUSES.CHECKED_IN, APPOINTMENT_STATUSES.IN_CONSULTATION, APPOINTMENT_STATUSES.COMPLETED] }
  });

  const nextSeq = countToday + 1;
  const tokenNumber = `${clinicCode}-${specLetter}-${nextSeq}`;

  // Update room number - default to AB-101 if not present
  const roomNumber = appointment.meta?.roomNumber || 'AB-101';

  // Update appointment status to checked_in, save token and room in meta, and delete token to prevent duplicate scans
  appointment.status = APPOINTMENT_STATUSES.CHECKED_IN;
  appointment.checkin_token_uuid = ''; // delete checkin token from db immediately
  appointment.meta = {
    ...appointment.meta,
    queueTokenNumber: tokenNumber,
    tokenNumber,
    roomNumber
  };
  await appointment.save();

  return {
    message: 'Check-in successful',
    appointment: await resolveAppointmentDoctorImage(appointment),
    patientName: appointment.patientId?.fullName || `${appointment.patientId?.firstName} ${appointment.patientId?.lastName}`,
    doctorName: appointment.doctorId?.fullName,
    clinicName: appointment.clinicId?.name,
    roomNumber,
    tokenNumber
  };
};

const applyWaiver = async ({ requester, appointmentId, payload }) => {
  const { waiverType, waiverAmount, waiverReason, waiverAdminNotes } = payload;
  const Doctor = require('../doctors/doctor.model');
  
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  const isDoctor = requester.role === ROLES.DOCTOR;
  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(requester.role);

  if (isDoctor) {
    const doctorUser = await Doctor.findOne({ userId: requester._id });
    if (!doctorUser || String(appointment.doctorId) !== String(doctorUser._id)) {
      throw new AppError('Unauthorized: You can only apply waivers to your own appointments.', HTTP_STATUS.FORBIDDEN);
    }
  }

  if (!isDoctor && !isAdmin) {
    throw new AppError('Unauthorized to manage consultation fee waivers.', HTTP_STATUS.FORBIDDEN);
  }

  appointment.waiverType = waiverType;
  if (waiverType === 'full') {
    appointment.waiverAmount = appointment.consultationFee;
    appointment.remainingAmount = 0;
    appointment.paymentStatus = 'fully_waived';
  } else if (waiverType === 'partial') {
    const amount = Number(waiverAmount || 0);
    if (amount < 0 || amount > appointment.consultationFee) {
      throw new AppError('Invalid waiver amount.', HTTP_STATUS.BAD_REQUEST);
    }
    appointment.waiverAmount = amount;
    appointment.remainingAmount = appointment.consultationFee - amount;
    
    if ((appointment.amountPaid || 0) >= appointment.remainingAmount) {
      appointment.paymentStatus = 'paid';
    } else {
      appointment.paymentStatus = 'partially_waived';
    }
  } else {
    appointment.waiverAmount = 0;
    appointment.remainingAmount = appointment.consultationFee;
    if ((appointment.amountPaid || 0) >= appointment.consultationFee) {
      appointment.paymentStatus = 'paid';
    } else {
      appointment.paymentStatus = 'pending';
    }
  }

  appointment.waiverReason = waiverReason || '';
  if (isDoctor) {
    const doctorUser = await Doctor.findOne({ userId: requester._id });
    appointment.waivedByDoctorId = doctorUser ? doctorUser._id : null;
  }
  if (isAdmin) {
    appointment.waivedByAdminId = requester._id;
    if (waiverAdminNotes !== undefined) {
      appointment.waiverAdminNotes = waiverAdminNotes;
    }
  }
  appointment.waiverLastUpdated = new Date();
  await appointment.save();

  // Update associated invoice if it exists
  try {
    const Invoice = require('../billing/invoice.model');
    const invoice = await Invoice.findOne({ appointmentId: appointment._id });
    if (invoice) {
      invoice.discountType = waiverType === 'none' ? 'none' : 'flat';
      invoice.discountValue = appointment.waiverAmount;
      
      const { calculateInvoiceTotals } = require('../../common/utils/billingCalculator');
      const totals = calculateInvoiceTotals({
        items: invoice.items,
        discountType: invoice.discountType,
        discountValue: invoice.discountValue,
        gstRate: invoice.gstRate,
        payments: invoice.payments
      });
      
      invoice.discountAmount = totals.discountAmount;
      invoice.taxableAmount = totals.taxableAmount;
      invoice.gstAmount = totals.gstAmount;
      invoice.totalAmount = totals.totalAmount;
      invoice.dueAmount = totals.dueAmount;
      invoice.paymentStatus = totals.paymentStatus;
      
      if (invoice.totalAmount === 0 || invoice.dueAmount === 0) {
        invoice.paymentStatus = 'paid';
      }
      await invoice.save();
    }
  } catch (invErr) {
    console.error('Failed to update invoice totals on waiver application:', invErr);
  }

  return appointment;
};

const requestRefund = async ({ requester, appointmentId, requestedClinicId = null }) => {
  const { appointment } = await getScopedAppointment({
    requester,
    appointmentId,
    requestedClinicId,
    populateDetails: false
  });

  if (['in_consultation', 'completed'].includes(appointment.status)) {
    throw new AppError('This consultation has already started or completed. Refund not eligible.', HTTP_STATUS.BAD_REQUEST);
  }

  const isPaid = appointment.paymentStatus === 'paid' || 
                 appointment.paymentStatus === 'fully_waived' ||
                 (appointment.paymentStatus === 'partially_waived' && (appointment.amountPaid || 0) >= (appointment.remainingAmount || 0));

  if (!isPaid) {
    throw new AppError('No payment found for this appointment.', HTTP_STATUS.BAD_REQUEST);
  }

  if (appointment.refundStatus === 'refunded') {
    throw new AppError('This appointment has already been refunded.', HTTP_STATUS.BAD_REQUEST);
  }

  if (appointment.paymentTransferStatus === 'transferred') {
    throw new AppError('Payment has already been transferred to a rescheduled appointment.', HTTP_STATUS.BAD_REQUEST);
  }

  appointment.status = APPOINTMENT_STATUSES.NOT_ATTENDED;
  appointment.refundStatus = 'refunded';
  appointment.refundAmount = appointment.amountPaid || appointment.consultationFee;
  appointment.refundProcessedAt = new Date();
  appointment.refundProcessedBy = requester.role === ROLES.PATIENT ? 'patient' : 'admin';
  appointment.refundTransactionId = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  await appointment.save();

  try {
    const Invoice = require('../billing/invoice.model');
    const invoice = await Invoice.findOne({ appointmentId: appointment._id });
    if (invoice) {
      invoice.paymentStatus = 'refunded';
      invoice.invoiceStatus = 'cancelled';
      invoice.refundAmount = appointment.refundAmount;
      invoice.refundedAt = appointment.refundProcessedAt;
      await invoice.save();
    }
  } catch (err) {
    console.error('Failed to update invoice on refund:', err);
  }

  return appointment;
};

const processEndOfDayRefunds = async () => {
  const Appointment = require('./appointment.model');
  const eligibleAppts = await Appointment.find({
    status: APPOINTMENT_STATUSES.NOT_ATTENDED,
    paymentStatus: { $in: ['paid', 'partially_waived'] },
    refundStatus: { $ne: 'refunded' },
    paymentTransferStatus: { $ne: 'transferred' }
  });

  for (const appt of eligibleAppts) {
    appt.refundStatus = 'refunded';
    appt.refundAmount = appt.amountPaid || appt.consultationFee;
    appt.refundProcessedAt = new Date();
    appt.refundProcessedBy = 'system';
    appt.refundTransactionId = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    await appt.save();

    try {
      const Invoice = require('../billing/invoice.model');
      const invoice = await Invoice.findOne({ appointmentId: appt._id });
      if (invoice) {
        invoice.paymentStatus = 'refunded';
        invoice.invoiceStatus = 'cancelled';
        invoice.refundAmount = appt.refundAmount;
        invoice.refundedAt = appt.refundProcessedAt;
        await invoice.save();
      }
    } catch (err) {
      console.error('Failed to update invoice on end-of-day refund:', err);
    }
  }
  return eligibleAppts.length;
};

const checkFollowUp = async ({ requester, patientId, doctorId, clinicId = null }) => {
  const targetClinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: clinicId
  });

  const DoctorModel = require('../doctors/doctor.model');
  const doctor = await DoctorModel.findById(doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found', HTTP_STATUS.NOT_FOUND);
  }

  const policy = (doctor.clinicPolicies || []).find(
    (p) => String(p.clinicId) === String(targetClinicId)
  );

  let isFollowUp = false;
  let fee = policy ? (policy.consultationFee !== undefined ? policy.consultationFee : doctor.consultationFee) : doctor.consultationFee;
  let lastCompletedConsultationDate = null;
  let policyType = policy ? policy.followUpPolicy : 'free';
  let followUpWindowDays = policy ? policy.followUpWindowDays : 0;
  let diffDays = null;

  if (policy && policy.followUpWindowDays > 0) {
    const ConsultationModel = require('../consultations/consultation.model');
    const lastConsultation = await ConsultationModel.findOne({
      patientId,
      doctorId,
      clinicId: targetClinicId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    if (lastConsultation && lastConsultation.completedAt) {
      lastCompletedConsultationDate = lastConsultation.completedAt;
      const diffMs = Date.now() - new Date(lastConsultation.completedAt).getTime();
      diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= policy.followUpWindowDays) {
        isFollowUp = true;
        if (policy.followUpPolicy === 'free') {
          fee = 0;
        } else if (policy.followUpPolicy === 'discounted') {
          fee = policy.followUpFee || 0;
        }
      }
    }
  }

  return {
    isFollowUp,
    fee,
    lastCompletedConsultationDate,
    policyType,
    followUpWindowDays,
    diffDays
  };
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
  verifyAppointmentPayment,
  scanCheckin,
  applyWaiver,
  requestRefund,
  processEndOfDayRefunds,
  checkFollowUp,
  assertSlotIsBookable
};
