const { logger } = require('../../common/utils/logger');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const { createAuditLog } = require('../audit/audit.service');
const appointmentRepository = require('../appointments/appointment.repository');
const consultationRepository = require('../consultations/consultation.repository');
const doctorRepository = require('../doctors/doctor.repository');
const patientRepository = require('../patients/patient.repository');
const prescriptionRepository = require('../prescriptions/prescription.repository');
const billingRepository = require('../billing/billing.repository');
const labRepository = require('../labs/lab.repository');
const notificationRepository = require('./notification.repository');
const {
  getNotificationProvider,
  renderNotificationTemplate
} = require('./notification.providers');

const DEFAULT_CHANNEL = 'mock';
const APPOINTMENT_REMINDER_COOLDOWN_MINUTES = 30;

const resolveProviderName = (providerName = null) => getNotificationProvider(providerName).name;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDateBoundary = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
};

const normalizeDateInput = (value, defaultHour = 0) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return new Date(`${value}T${String(defaultHour).padStart(2, '0')}:00:00.000Z`);
  }

  return new Date(value);
};

const formatDateLabel = (value) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const buildRecipient = (patient = null) => ({
  name: patient?.fullName || '',
  phone: patient?.phone || '',
  email: patient?.email || ''
});

const getRequesterDoctorProfile = async ({ requester, clinicId }) => {
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

const getDefaultMessageTemplate = ({ type, subject = '' }) => {
  switch (type) {
    case 'appointment_reminder':
      return {
        subject: subject || 'Appointment Reminder',
        body: 'Hello {{patientName}}, your appointment with Dr. {{doctorName}} is scheduled for {{appointmentDate}} at {{appointmentTime}}.'
      };
    case 'follow_up':
      return {
        subject: subject || 'Follow-up Reminder',
        body: 'Hello {{patientName}}, this is a follow-up reminder: {{title}} on {{dueDate}}.'
      };
    case 'prescription_ready':
      return {
        subject: subject || 'Prescription Ready',
        body: 'Hello {{patientName}}, your prescription {{prescriptionNumber}} is ready for review at the clinic.'
      };
    case 'billing_due':
      return {
        subject: subject || 'Billing Update',
        body: 'Hello {{patientName}}, invoice {{invoiceNumber}} has an outstanding due amount of INR {{dueAmount}}.'
      };
    case 'lab_report_ready':
      return {
        subject: subject || 'Lab Report Ready',
        body: 'Hello {{patientName}}, your lab report for order {{orderNumber}} is ready for doctor review.'
      };
    default:
      return {
        subject: subject || 'Clinic Update',
        body: 'Hello {{patientName}}, please contact the clinic for an update.'
      };
  }
};

const resolveTemplateAndContent = async ({
  clinicId,
  type,
  channel,
  templateId = null,
  subject = '',
  body = '',
  variables = {}
}) => {
  let template = null;

  if (templateId) {
    template = await notificationRepository.findNotificationTemplateById({
      id: templateId,
      clinicId
    });
  }

  if (!template) {
    template = await notificationRepository.findActiveTemplate({
      clinicId,
      type,
      channel
    });
  }

  const fallback = getDefaultMessageTemplate({ type, subject });
  const rawSubject = template?.subject || subject || fallback.subject || '';
  const rawBody = template?.body || body || fallback.body;

  return {
    template,
    subject: renderNotificationTemplate(rawSubject, variables),
    body: renderNotificationTemplate(rawBody, variables)
  };
};

const markFollowUpReminderSentIfNeeded = async ({ clinicId, notificationLogId, renderedVariables = {}, updatedBy }) => {
  const followUpTaskId = renderedVariables?.followUpTaskId;

  if (!followUpTaskId) {
    return;
  }

  await notificationRepository.updateFollowUpTask({
    id: followUpTaskId,
    clinicId,
    data: {
      reminderSent: true,
      updatedBy
    },
    populateDetails: false
  });
};

const dispatchNotificationLog = async ({ notificationLog, updatedBy }) => {
  const provider = getNotificationProvider(notificationLog.provider);
  const providerResult = await provider.send({
    channel: notificationLog.channel,
    subject: notificationLog.subject,
    body: notificationLog.body,
    recipient: notificationLog.recipient
  });

  const updatedNotificationLog = await notificationRepository.updateNotificationLog({
    id: notificationLog._id,
    clinicId: notificationLog.clinicId,
    data: {
      status: providerResult.status || 'sent',
      provider: providerResult.provider || provider.name,
      providerMessageId: providerResult.providerMessageId || '',
      sentAt: new Date(),
      failureReason: '',
      updatedBy
    },
    populateDetails: true
  });

  await markFollowUpReminderSentIfNeeded({
    clinicId: notificationLog.clinicId,
    notificationLogId: notificationLog._id,
    renderedVariables: notificationLog.renderedVariables,
    updatedBy
  });

  return updatedNotificationLog;
};

const createNotificationRecord = async ({
  clinicId,
  createdBy,
  payload,
  variables = {},
  patient = null,
  template = null,
  scheduledFor = null,
  sendNow = false
}) => {
  const notificationLog = await notificationRepository.createNotificationLog({
    clinicId,
    patientId: payload.patientId || patient?._id || null,
    appointmentId: payload.appointmentId || null,
    consultationId: payload.consultationId || null,
    prescriptionId: payload.prescriptionId || null,
    invoiceId: payload.invoiceId || null,
    labOrderId: payload.labOrderId || null,
    templateId: template?._id || null,
    type: payload.type,
    channel: payload.channel || DEFAULT_CHANNEL,
    recipient: buildRecipient(patient),
    subject: payload.subject || '',
    body: payload.body,
    renderedVariables: variables,
    status: 'pending',
    provider: resolveProviderName(payload.provider),
    scheduledFor,
    createdBy,
    updatedBy: createdBy
  });

  if (!sendNow) {
    return notificationRepository.findNotificationLogById({
      id: notificationLog._id,
      clinicId,
      populateDetails: true
    });
  }

  return dispatchNotificationLog({
    notificationLog: {
      ...notificationLog.toObject(),
      clinicId,
      renderedVariables: variables
    },
    updatedBy: createdBy
  });
};

const buildAppointmentVariables = ({ appointment, patient, doctor }) => ({
  patientName: patient?.fullName || '',
  doctorName: doctor?.fullName || '',
  appointmentDate: formatDateLabel(appointment?.appointmentDate),
  appointmentTime: appointment?.startTime || '',
  reasonForVisit: appointment?.reasonForVisit || ''
});

const buildFollowUpVariables = ({ patient, followUpTask }) => ({
  patientName: patient?.fullName || '',
  title: followUpTask.title || '',
  dueDate: formatDateLabel(followUpTask.dueDate),
  followUpTaskId: String(followUpTask._id)
});

const safeNotificationHook = async (label, action) => {
  try {
    await action();
  } catch (error) {
    logger.warn(
      `Notification hook "${label}" failed.`,
      error instanceof Error ? error.message : String(error)
    );
  }
};

const createNotificationTemplate = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  const notificationTemplate = await notificationRepository.createNotificationTemplate({
    clinicId,
    name: payload.name.trim(),
    type: payload.type,
    channel: payload.channel,
    subject: payload.subject?.trim?.() || '',
    body: payload.body.trim(),
    variables: payload.variables || [],
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
    createdBy: requester._id,
    updatedBy: requester._id
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'NOTIFICATION_TEMPLATE_CREATED',
    entity: 'NotificationTemplate',
    entityId: notificationTemplate._id,
    metadata: {
      clinicId: String(clinicId),
      type: notificationTemplate.type,
      channel: notificationTemplate.channel,
      name: notificationTemplate.name
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return notificationTemplate;
};

const listNotificationTemplates = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.type) {
    filter.type = query.type;
  }

  if (query.channel) {
    filter.channel = query.channel;
  }

  if (typeof query.isActive === 'boolean') {
    filter.isActive = query.isActive;
  }

  if (query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ name: pattern }, { body: pattern }, { subject: pattern }];
  }

  const { templates, total } = await notificationRepository.listNotificationTemplates({
    filter,
    page,
    limit
  });

  return {
    notificationTemplates: templates,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const sendNotification = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });
  const patient = payload.patientId
    ? await patientRepository.findPatientByIdAndClinic({
        patientId: payload.patientId,
        clinicId
      })
    : null;

  if (payload.patientId && !patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  const variables = payload.renderedVariables || {
    patientName: patient?.fullName || ''
  };
  const scheduledFor = payload.scheduledFor ? normalizeDateInput(payload.scheduledFor) : null;
  const sendNow = !scheduledFor || scheduledFor <= new Date();
  const resolved = await resolveTemplateAndContent({
    clinicId,
    type: payload.type,
    channel: payload.channel,
    templateId: payload.templateId,
    subject: payload.subject,
    body: payload.body,
    variables
  });
  const notificationLog = await createNotificationRecord({
    clinicId,
    createdBy: requester._id,
    payload: {
      ...payload,
      subject: resolved.subject,
      body: resolved.body,
      patientId: payload.patientId || patient?._id || null
    },
    variables,
    patient,
    template: resolved.template,
    scheduledFor,
    sendNow
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: sendNow ? 'NOTIFICATION_SENT' : 'NOTIFICATION_SCHEDULED',
    entity: 'NotificationLog',
    entityId: notificationLog._id,
    metadata: {
      clinicId: String(clinicId),
      type: notificationLog.type,
      channel: notificationLog.channel,
      status: notificationLog.status
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return notificationLog;
};

const sendAppointmentReminder = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });
  const appointment = await appointmentRepository.findAppointmentByIdAndClinic({
    appointmentId: payload.appointmentId,
    clinicId,
    populateDetails: true
  });

  if (!appointment) {
    throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
  }

  const recentLog = await notificationRepository.findRecentSentNotification({
    filter: {
      clinicId,
      appointmentId: appointment._id,
      type: 'appointment_reminder'
    },
    since: new Date(Date.now() - APPOINTMENT_REMINDER_COOLDOWN_MINUTES * 60 * 1000)
  });

  if (recentLog) {
    throw new AppError('An appointment reminder was already sent recently for this appointment.', HTTP_STATUS.CONFLICT);
  }

  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const variables = buildAppointmentVariables({
    appointment,
    patient,
    doctor
  });
  const resolved = await resolveTemplateAndContent({
    clinicId,
    type: 'appointment_reminder',
    channel: DEFAULT_CHANNEL,
    variables
  });
  const notificationLog = await createNotificationRecord({
    clinicId,
    createdBy: requester._id,
    payload: {
      patientId: patient?._id || null,
      appointmentId: appointment._id,
      type: 'appointment_reminder',
      channel: resolved.template?.channel || DEFAULT_CHANNEL,
      subject: resolved.subject,
      body: resolved.body
    },
    variables,
    patient,
    template: resolved.template,
    scheduledFor: null,
    sendNow: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'NOTIFICATION_SENT',
    entity: 'NotificationLog',
    entityId: notificationLog._id,
    metadata: {
      clinicId: String(clinicId),
      type: 'appointment_reminder',
      appointmentId: String(appointment._id)
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return notificationLog;
};

const createFollowUpTask = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });
  const patient = await patientRepository.findPatientByIdAndClinic({
    patientId: payload.patientId,
    clinicId
  });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  let doctor = null;
  if (payload.doctorId) {
    doctor = await doctorRepository.findDoctorByIdAndClinic({
      doctorId: payload.doctorId,
      clinicId
    });

    if (!doctor) {
      throw new AppError('Doctor not found.', HTTP_STATUS.NOT_FOUND);
    }
  } else if (requester.role === ROLES.DOCTOR) {
    doctor = await getRequesterDoctorProfile({ requester, clinicId });
  }

  let consultation = null;
  if (payload.consultationId) {
    consultation = await consultationRepository.findById({
      id: payload.consultationId,
      clinicId,
      populateDetails: true
    });

    if (!consultation) {
      throw new AppError('Consultation not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (String(consultation.patientId?._id || consultation.patientId) !== String(patient._id)) {
      throw new AppError('Consultation does not belong to the selected patient.', HTTP_STATUS.BAD_REQUEST);
    }

    if (doctor && String(consultation.doctorId?._id || consultation.doctorId) !== String(doctor._id)) {
      throw new AppError('Consultation does not belong to the selected doctor.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  if (requester.role === ROLES.DOCTOR && doctor && String(doctor.userId || requester._id) !== String(requester._id)) {
    throw new AppError('You can only create follow-up tasks for your own doctor profile.', HTTP_STATUS.FORBIDDEN);
  }

  const dueDate = normalizeDateInput(payload.dueDate, 9);
  const existingTask = await notificationRepository.findExistingFollowUpTask({
    clinicId,
    patientId: patient._id,
    consultationId: consultation?._id || null,
    dueDate,
    title: payload.title.trim()
  });

  if (existingTask) {
    throw new AppError('A similar follow-up task already exists for this due date.', HTTP_STATUS.CONFLICT);
  }

  const followUpTask = await notificationRepository.createFollowUpTask({
    clinicId,
    patientId: patient._id,
    consultationId: consultation?._id || null,
    doctorId: doctor?._id || null,
    title: payload.title.trim(),
    description: payload.description?.trim?.() || '',
    dueDate,
    type: payload.type || 'follow_up_visit',
    status: 'pending',
    reminderSent: false,
    createdBy: requester._id,
    updatedBy: requester._id
  });

  const variables = buildFollowUpVariables({
    patient,
    followUpTask
  });
  const resolved = await resolveTemplateAndContent({
    clinicId,
    type: 'follow_up',
    channel: payload.channel || DEFAULT_CHANNEL,
    variables,
    subject: 'Follow-up Reminder'
  });
  const scheduledFor = dueDate;
  const sendNow = scheduledFor <= new Date();
  const notificationLog = await createNotificationRecord({
    clinicId,
    createdBy: requester._id,
    payload: {
      patientId: patient._id,
      consultationId: consultation?._id || null,
      type: 'follow_up',
      channel: payload.channel || resolved.template?.channel || DEFAULT_CHANNEL,
      subject: resolved.subject,
      body: resolved.body
    },
    variables,
    patient,
    template: resolved.template,
    scheduledFor,
    sendNow
  });

  if (sendNow) {
    await notificationRepository.updateFollowUpTask({
      id: followUpTask._id,
      clinicId,
      data: {
        reminderSent: true,
        updatedBy: requester._id
      },
      populateDetails: false
    });
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'FOLLOW_UP_CREATED',
    entity: 'FollowUpTask',
    entityId: followUpTask._id,
    metadata: {
      clinicId: String(clinicId),
      patientId: String(patient._id),
      consultationId: consultation?._id ? String(consultation._id) : '',
      status: followUpTask.status
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  if (notificationLog) {
    await createAuditLog({
      actorUserId: requester._id,
      action: sendNow ? 'NOTIFICATION_SENT' : 'NOTIFICATION_SCHEDULED',
      entity: 'NotificationLog',
      entityId: notificationLog._id,
      metadata: {
        clinicId: String(clinicId),
        type: 'follow_up',
        patientId: String(patient._id)
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });
  }

  return {
    followUpTask: await notificationRepository.findFollowUpTaskById({
      id: followUpTask._id,
      clinicId,
      populateDetails: true
    }),
    notificationLog
  };
};

const listNotificationLogs = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.patientId) {
    filter.patientId = query.patientId;
  }
  if (query.type) {
    filter.type = query.type;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.channel) {
    filter.channel = query.channel;
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      filter.createdAt.$gte = parseDateBoundary(query.from, false);
    }
    if (query.to) {
      filter.createdAt.$lte = parseDateBoundary(query.to, true);
    }
  }

  const { notificationLogs, total } = await notificationRepository.listNotificationLogs({
    filter,
    page,
    limit
  });

  return {
    notificationLogs,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getNotificationLogById = async ({ requester, notificationLogId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const notificationLog = await notificationRepository.findNotificationLogById({
    id: notificationLogId,
    clinicId,
    populateDetails: true
  });

  if (!notificationLog) {
    throw new AppError('Notification log not found.', HTTP_STATUS.NOT_FOUND);
  }

  return { notificationLog };
};

const cancelNotificationLog = async ({ requester, notificationLogId, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const notificationLog = await notificationRepository.findNotificationLogById({
    id: notificationLogId,
    clinicId,
    populateDetails: false
  });

  if (!notificationLog) {
    throw new AppError('Notification log not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (notificationLog.status !== 'pending') {
    throw new AppError('Only pending notifications can be cancelled.', HTTP_STATUS.BAD_REQUEST);
  }

  const updatedNotificationLog = await notificationRepository.updateNotificationLog({
    id: notificationLog._id,
    clinicId,
    data: {
      status: 'cancelled',
      updatedBy: requester._id
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'NOTIFICATION_CANCELLED',
    entity: 'NotificationLog',
    entityId: notificationLog._id,
    metadata: {
      clinicId: String(clinicId),
      type: notificationLog.type
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return updatedNotificationLog;
};

const dispatchPendingNotifications = async ({ requester, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const pendingLogs = await notificationRepository.findPendingNotificationLogsDue({
    clinicId
  });
  const dispatched = [];

  for (const pendingLog of pendingLogs) {
    // Skip logs that no longer have meaningful content.
    if (!pendingLog.body) {
      continue;
    }

    const notificationLog = await dispatchNotificationLog({
      notificationLog: pendingLog,
      updatedBy: requester._id
    });

    dispatched.push(notificationLog);

    await createAuditLog({
      actorUserId: requester._id,
      action: 'NOTIFICATION_SENT',
      entity: 'NotificationLog',
      entityId: notificationLog._id,
      metadata: {
        clinicId: String(clinicId),
        type: notificationLog.type
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });
  }

  return {
    notificationLogs: dispatched,
    totalDispatched: dispatched.length
  };
};

const getPatientNotificationHistory = async ({ requester, patientId, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const patient = await patientRepository.findPatientByIdAndClinic({
    patientId,
    clinicId
  });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  const { page, limit } = getPagination(query);
  const { notificationLogs, total } = await notificationRepository.findNotificationLogsByPatient({
    clinicId,
    patientId: patient._id,
    page,
    limit
  });
  const { followUpTasks } = await notificationRepository.listFollowUpTasks({
    filter: {
      clinicId,
      patientId: patient._id
    },
    page: 1,
    limit: 10
  });

  return {
    patient,
    notificationLogs,
    followUpTasks,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const listFollowUpTasks = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.patientId) {
    filter.patientId = query.patientId;
  }
  if (query.doctorId) {
    filter.doctorId = query.doctorId;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.dueFrom || query.dueTo) {
    filter.dueDate = {};
    if (query.dueFrom) {
      filter.dueDate.$gte = parseDateBoundary(query.dueFrom, false);
    }
    if (query.dueTo) {
      filter.dueDate.$lte = parseDateBoundary(query.dueTo, true);
    }
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getRequesterDoctorProfile({ requester, clinicId });
    filter.doctorId = doctor._id;
  }

  const { followUpTasks, total } = await notificationRepository.listFollowUpTasks({
    filter,
    page,
    limit
  });

  return {
    followUpTasks,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const updateFollowUpStatus = async ({ requester, followUpTaskId, status, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const followUpTask = await notificationRepository.findFollowUpTaskById({
    id: followUpTaskId,
    clinicId,
    populateDetails: true
  });

  if (!followUpTask) {
    throw new AppError('Follow-up task not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getRequesterDoctorProfile({ requester, clinicId });

    if (followUpTask.doctorId && String(followUpTask.doctorId._id || followUpTask.doctorId) !== String(doctor._id)) {
      throw new AppError('You can only update your own follow-up tasks.', HTTP_STATUS.FORBIDDEN);
    }
  }

  const updatedFollowUpTask = await notificationRepository.updateFollowUpTask({
    id: followUpTask._id,
    clinicId,
    data: {
      status,
      updatedBy: requester._id
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'FOLLOW_UP_STATUS_UPDATED',
    entity: 'FollowUpTask',
    entityId: followUpTask._id,
    metadata: {
      clinicId: String(clinicId),
      previousStatus: followUpTask.status,
      newStatus: status
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return updatedFollowUpTask;
};

const scheduleAppointmentReminderIntent = async ({ appointment, patient, doctor, actorUserId }) =>
  safeNotificationHook('appointment_reminder_intent', async () => {
    if (!appointment || !patient) {
      return;
    }

    const existing = await notificationRepository.findExistingNotificationByRelation({
      filter: {
        clinicId: appointment.clinicId,
        appointmentId: appointment._id,
        type: 'appointment_reminder'
      }
    });

    if (existing) {
      return;
    }

    const appointmentDate = appointment.appointmentDate instanceof Date
      ? appointment.appointmentDate
      : new Date(appointment.appointmentDate);
    const [hours = '09', minutes = '00'] = String(appointment.startTime || '09:00').split(':');
    const appointmentTime = new Date(appointmentDate);
    appointmentTime.setUTCHours(Number(hours), Number(minutes), 0, 0);
    const scheduledFor = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
    const variables = buildAppointmentVariables({ appointment, patient, doctor });
    const resolved = await resolveTemplateAndContent({
      clinicId: appointment.clinicId,
      type: 'appointment_reminder',
      channel: DEFAULT_CHANNEL,
      variables
    });

    await createNotificationRecord({
      clinicId: appointment.clinicId,
      createdBy: actorUserId,
      payload: {
        patientId: patient._id,
        appointmentId: appointment._id,
        type: 'appointment_reminder',
        channel: resolved.template?.channel || DEFAULT_CHANNEL,
        subject: resolved.subject,
        body: resolved.body
      },
      variables,
      patient,
      template: resolved.template,
      scheduledFor,
      sendNow: false
    });
  });

const createFollowUpTaskFromConsultation = async ({
  consultation,
  requester,
  req
}) =>
  safeNotificationHook('consultation_follow_up_task', async () => {
    const followUpDate = consultation?.followUp?.date;

    if (!consultation || !consultation.followUp?.required || !followUpDate) {
      return;
    }

    await createFollowUpTask({
      requester,
      payload: {
        patientId: String(consultation.patientId?._id || consultation.patientId),
        consultationId: String(consultation._id),
        doctorId: String(consultation.doctorId?._id || consultation.doctorId),
        title: `Follow-up visit for ${consultation.diagnosis?.primary || 'consultation review'}`,
        description: consultation.followUp.notes || '',
        dueDate: formatDateLabel(followUpDate),
        type: 'follow_up_visit',
        channel: DEFAULT_CHANNEL
      },
      requestedClinicId: String(consultation.clinicId),
      req
    });
  });

const sendPrescriptionReadyNotification = async ({ prescription, actorUserId }) =>
  safeNotificationHook('prescription_ready_notification', async () => {
    if (!prescription || prescription.status !== 'finalized') {
      return;
    }

    const existing = await notificationRepository.findExistingNotificationByRelation({
      filter: {
        clinicId: prescription.clinicId,
        prescriptionId: prescription._id,
        type: 'prescription_ready'
      },
      statuses: ['sent', 'pending']
    });

    if (existing) {
      return;
    }

    const patient = prescription.patientId?.fullName
      ? prescription.patientId
      : await patientRepository.findPatientByIdAndClinic({
          patientId: prescription.patientId,
          clinicId: prescription.clinicId
        });

    const variables = {
      patientName: patient?.fullName || '',
      prescriptionNumber: prescription.prescriptionNumber
    };
    const resolved = await resolveTemplateAndContent({
      clinicId: prescription.clinicId,
      type: 'prescription_ready',
      channel: DEFAULT_CHANNEL,
      variables
    });

    await createNotificationRecord({
      clinicId: prescription.clinicId,
      createdBy: actorUserId,
      payload: {
        patientId: patient?._id || prescription.patientId,
        prescriptionId: prescription._id,
        type: 'prescription_ready',
        channel: resolved.template?.channel || DEFAULT_CHANNEL,
        subject: resolved.subject,
        body: resolved.body
      },
      variables,
      patient,
      template: resolved.template,
      scheduledFor: null,
      sendNow: true
    });
  });

const sendBillingDueNotification = async ({ invoice, actorUserId }) =>
  safeNotificationHook('billing_due_notification', async () => {
    if (!invoice || Number(invoice.dueAmount || 0) <= 0 || invoice.invoiceStatus === 'cancelled') {
      return;
    }

    const existing = await notificationRepository.findExistingNotificationByRelation({
      filter: {
        clinicId: invoice.clinicId,
        invoiceId: invoice._id,
        type: 'billing_due'
      }
    });

    if (existing) {
      return;
    }

    const patient = invoice.patientId?.fullName
      ? invoice.patientId
      : await patientRepository.findPatientByIdAndClinic({
          patientId: invoice.patientId,
          clinicId: invoice.clinicId
        });
    const variables = {
      patientName: patient?.fullName || '',
      invoiceNumber: invoice.invoiceNumber,
      dueAmount: Number(invoice.dueAmount || 0).toFixed(2)
    };
    const resolved = await resolveTemplateAndContent({
      clinicId: invoice.clinicId,
      type: 'billing_due',
      channel: DEFAULT_CHANNEL,
      variables
    });

    await createNotificationRecord({
      clinicId: invoice.clinicId,
      createdBy: actorUserId,
      payload: {
        patientId: patient?._id || invoice.patientId,
        invoiceId: invoice._id,
        type: 'billing_due',
        channel: resolved.template?.channel || DEFAULT_CHANNEL,
        subject: resolved.subject,
        body: resolved.body
      },
      variables,
      patient,
      template: resolved.template,
      scheduledFor: null,
      sendNow: true
    });
  });

const sendLabReportReadyNotification = async ({ labReport, actorUserId }) =>
  safeNotificationHook('lab_report_ready_notification', async () => {
    if (!labReport || labReport.status !== 'finalized') {
      return;
    }

    const orderId = labReport.labOrderId?._id || labReport.labOrderId;
    const existing = await notificationRepository.findExistingNotificationByRelation({
      filter: {
        clinicId: labReport.clinicId,
        labOrderId: orderId,
        type: 'lab_report_ready'
      }
    });

    if (existing) {
      return;
    }

    const patient = labReport.patientId?.fullName
      ? labReport.patientId
      : await patientRepository.findPatientByIdAndClinic({
          patientId: labReport.patientId,
          clinicId: labReport.clinicId
        });
    const labOrder = labReport.labOrderId?.orderNumber
      ? labReport.labOrderId
      : await labRepository.findLabOrderById({
          id: orderId,
          clinicId: labReport.clinicId,
          populateDetails: true
        });
    const variables = {
      patientName: patient?.fullName || '',
      orderNumber: labOrder?.orderNumber || ''
    };
    const resolved = await resolveTemplateAndContent({
      clinicId: labReport.clinicId,
      type: 'lab_report_ready',
      channel: DEFAULT_CHANNEL,
      variables
    });

    await createNotificationRecord({
      clinicId: labReport.clinicId,
      createdBy: actorUserId,
      payload: {
        patientId: patient?._id || labReport.patientId,
        labOrderId: orderId,
        type: 'lab_report_ready',
        channel: resolved.template?.channel || DEFAULT_CHANNEL,
        subject: resolved.subject,
        body: resolved.body
      },
      variables,
      patient,
      template: resolved.template,
      scheduledFor: null,
      sendNow: true
    });
  });

module.exports = {
  createNotificationTemplate,
  listNotificationTemplates,
  sendNotification,
  sendAppointmentReminder,
  createFollowUpTask,
  listNotificationLogs,
  getNotificationLogById,
  cancelNotificationLog,
  dispatchPendingNotifications,
  getPatientNotificationHistory,
  listFollowUpTasks,
  updateFollowUpStatus,
  scheduleAppointmentReminderIntent,
  createFollowUpTaskFromConsultation,
  sendPrescriptionReadyNotification,
  sendBillingDueNotification,
  sendLabReportReadyNotification,
  renderNotificationTemplate
};
