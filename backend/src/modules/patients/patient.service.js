const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { generatePatientId } = require('../../common/utils/generatePatientId');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const { createAuditLog } = require('../audit/audit.service');
const patientRepository = require('./patient.repository');
const gridFsStorage = require('../../common/utils/gridFsStorage.service');

const resolvePatientFiles = async (patient) => {
  if (!patient) return patient;
  const patObj = typeof patient.toObject === 'function' ? patient.toObject() : patient;
  if (patObj.profileImage && patObj.profileImage.startsWith('gridfs:')) {
    patObj.profileImage = await gridFsStorage.downloadAsBase64(patObj.profileImage);
  }
  return patObj;
};

const processAndSaveFile = async (patient, field, newContent, filename) => {
  const currentRef = patient[field];
  if (newContent && newContent.startsWith('data:')) {
    const fileRef = await gridFsStorage.uploadBase64(newContent, filename);
    if (currentRef && currentRef.startsWith('gridfs:')) {
      await gridFsStorage.deleteFile(currentRef);
    }
    patient[field] = fileRef;
  } else {
    if (newContent === '' || !newContent) {
      if (currentRef && currentRef.startsWith('gridfs:')) {
        await gridFsStorage.deleteFile(currentRef);
      }
    }
    patient[field] = newContent || '';
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPatientFilter = ({ clinicId, search, gender, isActive }) => {
  const filter = { clinicId };

  if (gender) {
    filter.gender = gender;
  }

  if (typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { patientId: pattern },
      { firstName: pattern },
      { lastName: pattern },
      { fullName: pattern },
      { phone: pattern },
      { email: pattern }
    ];
  }

  return filter;
};

const buildHistorySummary = async ({ clinicId, patientId }) => {
  let totalAppointments = 0;
  let totalConsultations = 0;
  let totalPrescriptions = 0;
  let totalInvoices = 0;
  let totalLabOrders = 0;
  let totalDispensings = 0;
  let totalNotifications = 0;
  let totalFollowUps = 0;

  try {
    const Appointment = require('../appointments/appointment.model');
    totalAppointments = await Appointment.countDocuments({ clinicId, patientId });
  } catch (_error) {
    totalAppointments = 0;
  }

  try {
    const Consultation = require('../consultations/consultation.model');
    totalConsultations = await Consultation.countDocuments({ clinicId, patientId });
  } catch (_error) {
    totalConsultations = 0;
  }

  try {
    const Prescription = require('../prescriptions/prescription.model');
    totalPrescriptions = await Prescription.countDocuments({ clinicId, patientId });
  } catch (_error) {
    totalPrescriptions = 0;
  }

  try {
    const Invoice = require('../billing/invoice.model');
    totalInvoices = await Invoice.countDocuments({ clinicId, patientId });
  } catch (_error) {
    totalInvoices = 0;
  }

  try {
    const { LabOrder } = require('../labs/labOrder.model');
    totalLabOrders = await LabOrder.countDocuments({ clinicId, patientId });
  } catch (_error) {
    totalLabOrders = 0;
  }

  try {
    const DispensingRecord = require('../pharmacy/dispensingRecord.model');
    totalDispensings = await DispensingRecord.countDocuments({ clinicId, patientId });
  } catch (_error) {
    totalDispensings = 0;
  }

  try {
    const NotificationLog = require('../notifications/notificationLog.model');
    totalNotifications = await NotificationLog.countDocuments({ clinicId, patientId });
  } catch (_error) {
    totalNotifications = 0;
  }

  try {
    const FollowUpTask = require('../notifications/followUpTask.model');
    totalFollowUps = await FollowUpTask.countDocuments({ clinicId, patientId });
  } catch (_error) {
    totalFollowUps = 0;
  }

  return {
    totalAppointments,
    totalConsultations,
    totalPrescriptions,
    totalInvoices,
    totalLabOrders,
    totalDispensings,
    totalNotifications,
    totalFollowUps
  };
};

const getScopedPatient = async ({ requester, patientId, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  const patient = await patientRepository.findPatientByIdAndClinic({ patientId, clinicId });

  if (!patient) {
    throw new AppError('Patient not found', HTTP_STATUS.NOT_FOUND);
  }

  return patient;
};

const createPatient = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || payload.clinicId
  });

  const patient = await patientRepository.createPatient({
    ...payload,
    clinicId,
    patientId: await generatePatientId(clinicId),
    createdBy: requester._id,
    updatedBy: requester._id
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PATIENT_CREATED',
    entity: 'Patient',
    entityId: patient._id,
    metadata: {
      patientId: patient.patientId,
      clinicId: String(clinicId)
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return patient;
};

const listPatients = async ({ requester, query }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = buildPatientFilter({
    clinicId,
    search: query.search,
    gender: query.gender,
    isActive: query.isActive
  });
  const { patients, total } = await patientRepository.listPatients({ filter, page, limit });

  return {
    patients,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const resolvePatientForRequester = async ({ requester, clinicId }) => {
  if (requester.role !== ROLES.PATIENT) {
    return null;
  }

  const patient = await patientRepository.findPatientByContact({
    clinicId,
    email: requester.email,
    phone: requester.phone
  });

  if (!patient) {
    throw new AppError(
      'No patient profile is linked to this account. Ask reception to register you with the same email or phone.',
      HTTP_STATUS.NOT_FOUND
    );
  }

  return patient;
};

const getMyPatientProfile = async ({ requester, requestedClinicId = null }) => {
  const { ensureUserClinicContext } = require('../../common/utils/clinicContext');
  await ensureUserClinicContext(requester);

  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const patient = await resolvePatientForRequester({ requester, clinicId });
  const resolved = await resolvePatientFiles(patient);

  return { patient: resolved };
};

const updateMyPatientProfile = async ({ requester, payload, requestedClinicId = null, req }) => {
  const { ensureUserClinicContext } = require('../../common/utils/clinicContext');
  await ensureUserClinicContext(requester);

  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const patient = await resolvePatientForRequester({ requester, clinicId });

  if (payload.profileImage !== undefined) {
    await processAndSaveFile(patient, 'profileImage', payload.profileImage, 'patient_photo');
  }

  const allowedUpdates = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    gender: payload.gender,
    dateOfBirth: payload.dateOfBirth,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    bloodGroup: payload.bloodGroup,
    allergies: payload.allergies,
    chronicConditions: payload.chronicConditions,
    currentMedications: payload.currentMedications,
    emergencyContact: payload.emergencyContact
  };

  Object.keys(allowedUpdates).forEach((key) => {
    if (allowedUpdates[key] !== undefined) {
      patient[key] = allowedUpdates[key];
    }
  });

  patient.updatedBy = requester._id;
  await patient.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PATIENT_PROFILE_UPDATED',
    entity: 'Patient',
    entityId: patient._id,
    metadata: {
      patientId: patient.patientId
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return resolvePatientFiles(patient);
};

const getPatientById = async ({ requester, patientId, requestedClinicId = null }) => {
  const patient = await getScopedPatient({ requester, patientId, requestedClinicId });
  const summary = await buildHistorySummary({
    clinicId: patient.clinicId,
    patientId: patient._id
  });

  return {
    patient,
    summary
  };
};

const updatePatient = async ({ requester, patientId, payload, requestedClinicId = null, req }) => {
  const patient = await getScopedPatient({ requester, patientId, requestedClinicId });

  Object.assign(patient, payload, {
    updatedBy: requester._id
  });
  await patient.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PATIENT_UPDATED',
    entity: 'Patient',
    entityId: patient._id,
    metadata: {
      patientId: patient.patientId
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return patient;
};

const deletePatient = async ({ requester, patientId, requestedClinicId = null, req }) => {
  const patient = await getScopedPatient({ requester, patientId, requestedClinicId });

  patient.isActive = false;
  patient.updatedBy = requester._id;
  await patient.save();

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PATIENT_SOFT_DELETED',
    entity: 'Patient',
    entityId: patient._id,
    metadata: {
      patientId: patient.patientId
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return patient;
};

const getPatientHistory = async ({ requester, patientId, requestedClinicId = null }) => {
  const patient = await getScopedPatient({ requester, patientId, requestedClinicId });
  const summary = await buildHistorySummary({
    clinicId: patient.clinicId,
    patientId: patient._id
  });
  let consultations = [];
  let prescriptions = [];
  let invoices = [];
  let labs = [];
  let dispensings = [];
  let notifications = [];
  let followUps = [];

  try {
    const Consultation = require('../consultations/consultation.model');
    consultations = await Consultation.find({ clinicId: patient.clinicId, patientId: patient._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('doctorId', 'fullName doctorCode specialization');
  } catch (_error) {
    consultations = [];
  }

  try {
    const Prescription = require('../prescriptions/prescription.model');
    prescriptions = await Prescription.find({ clinicId: patient.clinicId, patientId: patient._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('doctorId', 'fullName doctorCode specialization');
  } catch (_error) {
    prescriptions = [];
  }

  try {
    const Invoice = require('../billing/invoice.model');
    invoices = await Invoice.find({ clinicId: patient.clinicId, patientId: patient._id })
      .sort({ invoiceDate: -1, createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name email role');
  } catch (_error) {
    invoices = [];
  }

  try {
    const { LabOrder } = require('../labs/labOrder.model');
    const LabReport = require('../labs/labReport.model');
    const labOrders = await LabOrder.find({ clinicId: patient.clinicId, patientId: patient._id })
      .sort({ orderedAt: -1, createdAt: -1 })
      .limit(5)
      .populate('doctorId', 'fullName doctorCode specialization')
      .lean();
    const labReports = await LabReport.find({
      clinicId: patient.clinicId,
      labOrderId: { $in: labOrders.map((order) => order._id) }
    }).lean();
    const labReportsByOrderId = new Map(labReports.map((report) => [String(report.labOrderId), report]));

    labs = labOrders.map((order) => {
      const report = labReportsByOrderId.get(String(order._id));

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        orderedAt: order.orderedAt,
        status: order.status,
        priority: order.priority,
        doctor: order.doctorId
          ? {
              _id: order.doctorId._id,
              fullName: order.doctorId.fullName,
              doctorCode: order.doctorId.doctorCode,
              specialization: order.doctorId.specialization
            }
          : null,
        tests: (order.tests || []).map((test) => ({
          code: test.code,
          name: test.name,
          status: test.status
        })),
        report: report
          ? {
              _id: report._id,
              status: report.status,
              reportFileName: report.reportFileName || '',
              abnormalCount: (report.resultEntries || []).filter((entry) => entry.isAbnormal).length
            }
          : null
      };
    });
  } catch (_error) {
    labs = [];
  }

  try {
    const DispensingRecord = require('../pharmacy/dispensingRecord.model');
    const PharmacySale = require('../pharmacy/pharmacySale.model');
    const dispensingRecords = await DispensingRecord.find({
      clinicId: patient.clinicId,
      patientId: patient._id
    })
      .sort({ dispensedAt: -1, createdAt: -1 })
      .limit(5)
      .populate('doctorId', 'fullName doctorCode specialization')
      .populate('prescriptionId', 'prescriptionNumber status dispensingStatus')
      .populate('dispensedBy', 'name email role')
      .lean();
    const pharmacySales = await PharmacySale.find({
      clinicId: patient.clinicId,
      dispensingRecordId: { $in: dispensingRecords.map((record) => record._id) }
    }).lean();
    const salesByDispensingId = new Map(
      pharmacySales.map((sale) => [String(sale.dispensingRecordId), sale])
    );

    dispensings = dispensingRecords.map((record) => {
      const sale = salesByDispensingId.get(String(record._id));

      return {
        _id: record._id,
        date: record.dispensedAt || record.createdAt,
        status: record.status,
        subtotal: record.subtotal || 0,
        doctor: record.doctorId
          ? {
              _id: record.doctorId._id,
              fullName: record.doctorId.fullName,
              doctorCode: record.doctorId.doctorCode,
              specialization: record.doctorId.specialization
            }
          : null,
        prescription: record.prescriptionId
          ? {
              _id: record.prescriptionId._id,
              prescriptionNumber: record.prescriptionId.prescriptionNumber,
              status: record.prescriptionId.status,
              dispensingStatus: record.prescriptionId.dispensingStatus
            }
          : null,
        items: (record.items || []).map((item) => ({
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          totalPrice: item.totalPrice
        })),
        sale: sale
          ? {
              _id: sale._id,
              amount: sale.amount,
              paymentStatus: sale.paymentStatus,
              paymentMethod: sale.paymentMethod || ''
            }
          : null
      };
    });
  } catch (_error) {
    dispensings = [];
  }

  try {
    const NotificationLog = require('../notifications/notificationLog.model');
    notifications = await NotificationLog.find({
      clinicId: patient.clinicId,
      patientId: patient._id
    })
      .sort({ scheduledFor: -1, sentAt: -1, createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name email role')
      .lean();
  } catch (_error) {
    notifications = [];
  }

  try {
    const FollowUpTask = require('../notifications/followUpTask.model');
    followUps = await FollowUpTask.find({
      clinicId: patient.clinicId,
      patientId: patient._id
    })
      .sort({ dueDate: -1, createdAt: -1 })
      .limit(5)
      .populate('doctorId', 'fullName doctorCode specialization')
      .lean();
  } catch (_error) {
    followUps = [];
  }

  return {
    patient,
    summary,
    // TODO: Replace placeholders with appointment details in a dedicated timeline view later.
    appointments: [],
    consultations: consultations.map((consultation) => ({
      _id: consultation._id,
      date: consultation.createdAt,
      doctor: consultation.doctorId
        ? {
            _id: consultation.doctorId._id,
            fullName: consultation.doctorId.fullName,
            doctorCode: consultation.doctorId.doctorCode,
            specialization: consultation.doctorId.specialization
          }
        : null,
      chiefComplaint: consultation.chiefComplaint,
      diagnosis: consultation.diagnosis,
      treatmentPlan: consultation.treatmentPlan || '',
      status: consultation.status,
      followUpDate: consultation.followUp?.date || null,
      followUp: consultation.followUp || null
    })),
    prescriptions: prescriptions.map((prescription) => ({
      _id: prescription._id,
      prescriptionNumber: prescription.prescriptionNumber,
      date: prescription.finalizedAt || prescription.createdAt,
      status: prescription.status,
      doctor: prescription.doctorId
        ? {
            _id: prescription.doctorId._id,
            fullName: prescription.doctorId.fullName,
            doctorCode: prescription.doctorId.doctorCode,
            specialization: prescription.doctorId.specialization
          }
        : null,
      advice: prescription.advice || '',
      diagnosisSnapshot: prescription.diagnosisSnapshot || '',
      pdfUrl: prescription.pdfUrl || ''
    })),
    invoices: invoices.map((invoice) => ({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate || invoice.createdAt,
      totalAmount: invoice.totalAmount || 0,
      paidAmount: invoice.paidAmount || 0,
      dueAmount: invoice.dueAmount || 0,
      paymentStatus: invoice.paymentStatus,
      invoiceStatus: invoice.invoiceStatus,
      pdfUrl: invoice.pdfUrl || ''
    })),
    labs,
    dispensings,
    notifications: notifications.map((notification) => ({
      _id: notification._id,
      type: notification.type,
      channel: notification.channel,
      status: notification.status,
      subject: notification.subject || '',
      body: notification.body || '',
      scheduledFor: notification.scheduledFor || null,
      sentAt: notification.sentAt || null,
      createdAt: notification.createdAt,
      recipient: notification.recipient || null
    })),
    followUps: followUps.map((followUpTask) => ({
      _id: followUpTask._id,
      title: followUpTask.title,
      description: followUpTask.description || '',
      dueDate: followUpTask.dueDate,
      type: followUpTask.type,
      status: followUpTask.status,
      reminderSent: Boolean(followUpTask.reminderSent),
      doctor: followUpTask.doctorId
        ? {
            _id: followUpTask.doctorId._id,
            fullName: followUpTask.doctorId.fullName,
            doctorCode: followUpTask.doctorId.doctorCode,
            specialization: followUpTask.doctorId.specialization
          }
        : null
    }))
  };
};

module.exports = {
  createPatient,
  listPatients,
  getMyPatientProfile,
  updateMyPatientProfile,
  resolvePatientForRequester,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientHistory
};
