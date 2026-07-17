const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const { PAYMENT_STATUSES } = require('./billing.constants');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { RESPONSE_MESSAGES } = require('../../common/constants/responseMessages');
const { ROLES } = require('../../common/constants/roles');
const { AppError } = require('../../common/utils/AppError');
const { calculateInvoiceTotals, roundCurrency } = require('../../common/utils/billingCalculator');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { generateInvoiceNumber } = require('../../common/utils/invoiceNumber');
const { buildPaginationMeta, getPagination } = require('../../common/utils/pagination');
const { generateInvoicePdf } = require('../../common/utils/pdfGenerator');
const { env } = require('../../config/env');
const { createAuditLog } = require('../audit/audit.service');
const appointmentRepository = require('../appointments/appointment.repository');
const Clinic = require('../clinics/clinic.model');
const consultationRepository = require('../consultations/consultation.repository');
const doctorRepository = require('../doctors/doctor.repository');
const patientRepository = require('../patients/patient.repository');
const Patient = require('../patients/patient.model');
const { syncBillingAnomalyForInvoice } = require('./billingAnomaly.service');
const billingRepository = require('./billing.repository');
const Invoice = require('./invoice.model');

let razorpayInstance = null;
if (env.razorpayKeyId && env.razorpayKeySecret) {
  razorpayInstance = new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret
  });
}

const buildInvoicePdfUrl = (invoiceId) => `${env.apiPrefix}/billing/invoices/${invoiceId}/pdf`;

const normalizeDateInput = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(`${value}T00:00:00.000Z`);
};

const normalizeItems = (items = []) =>
  items.map((item) => ({
    itemType: item.itemType,
    name: item.name.trim(),
    description: item.description?.trim?.() || '',
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice)
  }));

const getDoctorClinicScope = async ({ requester, clinicId }) => {
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

const getDoctorAccessibleInvoiceIds = async ({ clinicId, doctorId }) => {
  const [consultationIds, appointmentIds] = await Promise.all([
    require('../consultations/consultation.model')
      .find({ clinicId, doctorId })
      .select('_id')
      .lean(),
    require('../appointments/appointment.model')
      .find({ clinicId, doctorId })
      .select('_id')
      .lean()
  ]);

  return {
    consultationIds: consultationIds.map((item) => item._id),
    appointmentIds: appointmentIds.map((item) => item._id)
  };
};

const ensurePatientAndRelations = async ({ clinicId, payload }) => {
  const patient = await patientRepository.findPatientByIdAndClinic({
    patientId: payload.patientId,
    clinicId
  });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  let appointment = null;
  let consultation = null;

  if (payload.appointmentId) {
    appointment = await appointmentRepository.findAppointmentByIdAndClinic({
      appointmentId: payload.appointmentId,
      clinicId,
      populateDetails: false
    });

    if (!appointment) {
      throw new AppError('Appointment not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (String(appointment.patientId) !== String(patient._id)) {
      throw new AppError('Appointment does not belong to the selected patient.', HTTP_STATUS.BAD_REQUEST);
    }
  }

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
  }

  if (appointment && consultation && String(consultation.appointmentId?._id || consultation.appointmentId) !== String(appointment._id)) {
    throw new AppError('Consultation does not belong to the selected appointment.', HTTP_STATUS.BAD_REQUEST);
  }

  return { patient, appointment, consultation };
};

const buildCreatePayload = ({ invoiceNumber, clinicId, requester, payload, consultation, appointment }) => {
  const totals = calculateInvoiceTotals({
    items: normalizeItems(payload.items),
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    gstRate: typeof payload.gstRate === 'undefined' ? env.gstDefaultRate : payload.gstRate,
    payments: []
  });

  return {
    invoiceNumber,
    clinicId,
    patientId: payload.patientId,
    appointmentId: payload.appointmentId || consultation?.appointmentId?._id || consultation?.appointmentId || appointment?._id || null,
    consultationId: payload.consultationId || null,
    createdBy: requester._id,
    updatedBy: requester._id,
    invoiceDate: new Date(),
    dueDate: normalizeDateInput(payload.dueDate),
    items: totals.items,
    subtotal: totals.subtotal,
    discountType: totals.discountType,
    discountValue: totals.discountValue,
    discountAmount: totals.discountAmount,
    taxableAmount: totals.taxableAmount,
    gstRate: totals.gstRate,
    gstAmount: totals.gstAmount,
    totalAmount: totals.totalAmount,
    paidAmount: 0,
    refundAmount: 0,
    dueAmount: totals.totalAmount,
    paymentStatus: PAYMENT_STATUSES[0],
    invoiceStatus: 'draft',
    payments: [],
    notes: payload.notes?.trim?.() || '',
    metadata: payload.metadata || {}
  };
};

const triggerBillingAnomalyRefresh = async ({ clinicId, invoiceId, requesterId }) => {
  try {
    await syncBillingAnomalyForInvoice({
      clinicId,
      invoiceId,
      requesterId
    });
  } catch (_error) {
    // Billing anomaly refresh is best-effort and must not block billing workflow.
  }
};

const loadScopedInvoice = async ({ requester, invoiceId, requestedClinicId = null }) => {
  const isPatient = requester.role === ROLES.PATIENT;
  let clinicId;
  let invoice;

  if (isPatient) {
    invoice = await billingRepository.findInvoiceById({
      id: invoiceId,
      populateDetails: true
    });
    if (!invoice) {
      throw new AppError('Invoice not found.', HTTP_STATUS.NOT_FOUND);
    }
    clinicId = String(invoice.clinicId);

    const Patient = require('../../modules/patients/patient.model');
    const patientProfile = await Patient.findById(invoice.patientId);
    if (!patientProfile) {
      throw new AppError(RESPONSE_MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    }
    const emailMatches = patientProfile.email && String(patientProfile.email).trim().toLowerCase() === String(requester.email).trim().toLowerCase();
    const phoneMatches = patientProfile.phone && String(patientProfile.phone).trim() === String(requester.phone).trim();
    if (!emailMatches && !phoneMatches) {
      throw new AppError(RESPONSE_MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    }
  } else {
    clinicId = resolveClinicContext({
      user: requester,
      requestedClinicId
    });
    invoice = await billingRepository.findInvoiceById({
      id: invoiceId,
      clinicId,
      populateDetails: true
    });
  }

  if (!invoice) {
    throw new AppError('Invoice not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getDoctorClinicScope({ requester, clinicId });
    const consultationDoctorId = invoice.consultationId?.doctorId?._id || invoice.consultationId?.doctorId;
    const appointmentDoctorId = invoice.appointmentId?.doctorId;
    const allowed =
      (consultationDoctorId && String(consultationDoctorId) === String(doctor._id)) ||
      (appointmentDoctorId && String(appointmentDoctorId) === String(doctor._id));

    if (!allowed) {
      throw new AppError(RESPONSE_MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    }
  }

  return { clinicId, invoice };
};

const ensureInvoicePdf = async (invoiceDocument) => {
  const clinic = await Clinic.findById(invoiceDocument.clinicId).lean();
  const patient = invoiceDocument.patientId?.fullName
    ? invoiceDocument.patientId
    : await patientRepository.findPatientByIdAndClinic({
        patientId: invoiceDocument.patientId,
        clinicId: invoiceDocument.clinicId
      });

  const { filePath } = await generateInvoicePdf({
    invoice: invoiceDocument,
    clinic,
    patient
  });

  if (!invoiceDocument.pdfUrl) {
    invoiceDocument.pdfUrl = buildInvoicePdfUrl(invoiceDocument._id);
    await invoiceDocument.save();
  }

  return filePath;
};

const createInvoice = async ({ requester, payload, requestedClinicId = null, req }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });
  const { patient, appointment, consultation } = await ensurePatientAndRelations({
    clinicId,
    payload
  });

  const appointmentId = payload.appointmentId || consultation?.appointmentId?._id || consultation?.appointmentId || appointment?._id;
  if (appointmentId) {
    const isConsultationInvoice = payload.serviceType === 'CONSULTATION' || 
                                  (!payload.serviceType && (!payload.items || payload.items.some(item => item.itemType === 'consultation')));
    if (isConsultationInvoice) {
      const Invoice = require('./invoice.model');
      const existingInvoice = await Invoice.findOne({
        appointmentId,
        $or: [
          { serviceType: 'CONSULTATION' },
          { 'items.itemType': 'consultation' }
        ]
      });
      if (existingInvoice) {
        throw new AppError('A consultation invoice already exists for this appointment.', HTTP_STATUS.BAD_REQUEST);
      }
    }
  }

  const invoice = await billingRepository.createInvoice(
    buildCreatePayload({
      invoiceNumber: await generateInvoiceNumber(),
      clinicId,
      requester,
      payload,
      consultation,
      appointment
    })
  );

  if (consultation?._id) {
    await require('../consultations/consultation.model').findOneAndUpdate(
      { _id: consultation._id, clinicId },
      { billingReady: true, updatedBy: requester._id }
    );
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'INVOICE_CREATED',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: {
      clinicId: String(clinicId),
      patientId: String(patient._id),
      invoiceNumber: invoice.invoiceNumber
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  const populatedInvoice = await billingRepository.findInvoiceById({
    id: invoice._id,
    clinicId,
    populateDetails: true
  });

  try {
    const {
      sendBillingDueNotification,
      sendFinalBillEmail
    } = require('../notifications/notification.service');

    await sendBillingDueNotification({
      invoice: populatedInvoice,
      actorUserId: requester._id
    });

    await sendFinalBillEmail({
      invoice: populatedInvoice,
      actorUserId: requester._id
    });
  } catch (_error) {
    // Notification delivery is best-effort and must not block invoice creation.
  }

  await triggerBillingAnomalyRefresh({
    clinicId,
    invoiceId: invoice._id,
    requesterId: requester._id
  });

  return populatedInvoice;
};

const listInvoices = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const { page, limit } = getPagination(query);
  const filter = { clinicId };

  if (query.patientId) {
    filter.patientId = query.patientId;
  }

  if (query.status) {
    filter.invoiceStatus = query.status;
  }

  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }

  if (query.fromDate || query.toDate) {
    filter.invoiceDate = {};
    if (query.fromDate) {
      filter.invoiceDate.$gte = new Date(`${query.fromDate}T00:00:00.000Z`);
    }
    if (query.toDate) {
      filter.invoiceDate.$lte = new Date(`${query.toDate}T23:59:59.999Z`);
    }
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getDoctorClinicScope({ requester, clinicId });
    const { consultationIds, appointmentIds } = await getDoctorAccessibleInvoiceIds({
      clinicId,
      doctorId: doctor._id
    });
    filter.$or = [
      { consultationId: { $in: consultationIds } },
      { appointmentId: { $in: appointmentIds } }
    ];
  }

  if (query.search?.trim()) {
    const searchRegex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matchingPatients = await Patient.find({
      clinicId,
      $or: [{ fullName: searchRegex }, { patientId: searchRegex }, { phone: searchRegex }, { email: searchRegex }]
    })
      .select('_id')
      .lean();

    const patientIds = matchingPatients.map((patient) => patient._id);
    const searchOr = [{ invoiceNumber: searchRegex }];

    if (patientIds.length) {
      searchOr.push({ patientId: { $in: patientIds } });
    }

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  const { invoices, total } = await billingRepository.listInvoices({ filter, page, limit });

  return {
    invoices,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getInvoiceById = async ({ requester, invoiceId, requestedClinicId = null }) => {
  const { invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });

  return { invoice };
};

const updateInvoice = async ({ requester, invoiceId, payload, requestedClinicId = null, req }) => {
  const { clinicId, invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });

  if (invoice.invoiceStatus !== 'draft') {
    if (!payload.notes || Object.keys(payload).length > 1) {
      throw new AppError('Only draft invoices can be updated fully.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  const update = {
    updatedBy: requester._id
  };

  if (typeof payload.notes === 'string') {
    update.notes = payload.notes.trim();
  }

  if (typeof payload.metadata !== 'undefined') {
    update.metadata = payload.metadata || {};
  }

  if (typeof payload.dueDate !== 'undefined') {
    update.dueDate = payload.dueDate ? normalizeDateInput(payload.dueDate) : null;
  }

  if (invoice.invoiceStatus === 'draft') {
    const totals = calculateInvoiceTotals({
      items: payload.items ? normalizeItems(payload.items) : invoice.items,
      discountType: payload.discountType || invoice.discountType,
      discountValue:
        typeof payload.discountValue === 'number' ? payload.discountValue : invoice.discountValue,
      gstRate: typeof payload.gstRate === 'number' ? payload.gstRate : invoice.gstRate,
      payments: invoice.payments || []
    });

    Object.assign(update, {
      items: totals.items,
      subtotal: totals.subtotal,
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      discountAmount: totals.discountAmount,
      taxableAmount: totals.taxableAmount,
      gstRate: totals.gstRate,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      paidAmount: totals.paidAmount,
      dueAmount: totals.dueAmount,
      paymentStatus: totals.paymentStatus
    });
  }

  const updatedInvoice = await billingRepository.updateInvoice({
    id: invoice._id,
    clinicId,
    data: update,
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'INVOICE_UPDATED',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  await triggerBillingAnomalyRefresh({
    clinicId,
    invoiceId: invoice._id,
    requesterId: requester._id
  });

  return updatedInvoice;
};

const recordPayment = async ({ requester, invoiceId, payload, requestedClinicId = null, req }) => {
  const { clinicId, invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });

  if (invoice.invoiceStatus === 'cancelled' || invoice.paymentStatus === 'cancelled') {
    throw new AppError('Cancelled invoices cannot receive payments.', HTTP_STATUS.BAD_REQUEST);
  }

  const dueAmount = roundCurrency(invoice.dueAmount);
  const amount = roundCurrency(payload.amount);

  if (amount > dueAmount) {
    throw new AppError('Payment amount cannot exceed the due amount.', HTTP_STATUS.BAD_REQUEST);
  }

  const payments = [
    ...(invoice.payments || []).map((payment) => ({
      amount: payment.amount,
      paymentMode: payment.paymentMode,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      receivedBy: payment.receivedBy?._id || payment.receivedBy,
      notes: payment.notes
    })),
    {
      amount,
      paymentMode: payload.paymentMode,
      transactionId: payload.transactionId?.trim?.() || '',
      paidAt: new Date(),
      receivedBy: requester._id,
      notes: payload.notes?.trim?.() || ''
    }
  ];

  const totals = calculateInvoiceTotals({
    items: invoice.items,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    gstRate: invoice.gstRate,
    payments
  });

  const updatedInvoice = await billingRepository.updateInvoice({
    id: invoice._id,
    clinicId,
    data: {
      payments: totals.payments,
      paidAmount: totals.paidAmount,
      dueAmount: totals.dueAmount,
      paymentStatus: totals.paymentStatus,
      invoiceStatus: invoice.invoiceStatus === 'draft' ? 'issued' : invoice.invoiceStatus,
      updatedBy: requester._id
    },
    populateDetails: true
  });

  // Update linked appointment payment details
  if (updatedInvoice.appointmentId) {
    try {
      const Appointment = require('../appointments/appointment.model');
      const appointment = await Appointment.findById(updatedInvoice.appointmentId);
      if (appointment) {
        appointment.amountPaid = (appointment.amountPaid || 0) + amount;
        appointment.paymentDate = new Date();
        appointment.paymentMethod = payload.paymentMode || 'digital';
        
        if (appointment.waiverType === 'partial') {
          if (appointment.amountPaid >= appointment.remainingAmount) {
            appointment.paymentStatus = 'paid';
          } else {
            appointment.paymentStatus = 'partially_waived';
          }
        } else if (appointment.waiverType === 'full') {
          appointment.paymentStatus = 'fully_waived';
        } else {
          if (appointment.amountPaid >= appointment.consultationFee) {
            appointment.paymentStatus = 'paid';
          } else {
            appointment.paymentStatus = 'pending';
          }
        }
        await appointment.save();
      }
    } catch (apptErr) {
      console.error('Failed to update appointment payment details on invoice payment:', apptErr);
    }
  }

  if (updatedInvoice.paymentStatus === 'paid' && updatedInvoice.consultationId) {
    try {
      const prescriptionService = require('../prescriptions/prescription.service');
      await prescriptionService.unlockPrescription(updatedInvoice.consultationId?._id || updatedInvoice.consultationId);
    } catch (unlockErr) {
      console.warn('Failed to unlock prescription on payment completion:', unlockErr);
    }
  }

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PAYMENT_RECORDED',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      amount,
      paymentMode: payload.paymentMode
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  try {
    const { sendFinalBillEmail, sendConsultationReportPdf } = require('../notifications/notification.service');
    await sendFinalBillEmail({
      invoice: updatedInvoice,
      actorUserId: requester._id
    });
    if (updatedInvoice.paymentStatus === 'paid') {
      await sendConsultationReportPdf({
        invoice: updatedInvoice,
        actorUserId: requester._id
      });
    }
  } catch (_error) {
    // best effort
  }

  await triggerBillingAnomalyRefresh({
    clinicId,
    invoiceId: invoice._id,
    requesterId: requester._id
  });

  return updatedInvoice;
};

const recordRefund = async ({ requester, invoiceId, payload, requestedClinicId = null, req }) => {
  const { clinicId, invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });

  const amount = roundCurrency(payload.amount);
  if (amount > roundCurrency(invoice.paidAmount)) {
    throw new AppError('Refund amount cannot exceed the paid amount.', HTTP_STATUS.BAD_REQUEST);
  }

  const nextRefundAmount = roundCurrency(Number(invoice.refundAmount || 0) + amount);
  const nextPaidAmount = roundCurrency(Math.max(0, Number(invoice.paidAmount || 0) - amount));
  const nextDueAmount = roundCurrency(Math.max(0, Number(invoice.totalAmount || 0) - nextPaidAmount));

  const updatedInvoice = await billingRepository.updateInvoice({
    id: invoice._id,
    clinicId,
    data: {
      refundAmount: nextRefundAmount,
      refundedAt: new Date(),
      paidAmount: nextPaidAmount,
      dueAmount: nextDueAmount,
      paymentStatus: 'refunded',
      notes: [invoice.notes, `Refund recorded: ${payload.reason.trim()}`].filter(Boolean).join('\n'),
      updatedBy: requester._id
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'REFUND_RECORDED',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      amount,
      reason: payload.reason.trim()
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  await triggerBillingAnomalyRefresh({
    clinicId,
    invoiceId: invoice._id,
    requesterId: requester._id
  });

  return updatedInvoice;
};

const generateInvoicePdfFile = async ({ requester, invoiceId, requestedClinicId = null, req }) => {
  const { clinicId, invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });
  const filePath = await ensureInvoicePdf(invoice);

  const updatedInvoice = await billingRepository.updateInvoice({
    id: invoice._id,
    clinicId,
    data: {
      pdfUrl: buildInvoicePdfUrl(invoice._id),
      invoiceStatus: invoice.invoiceStatus === 'cancelled' ? 'cancelled' : 'issued',
      updatedBy: requester._id
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'PDF_GENERATED',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return {
    invoice: updatedInvoice,
    filePath
  };
};

const downloadInvoicePdf = async ({ requester, invoiceId, requestedClinicId = null }) => {
  const { invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });

  let filePath = '';

  if (invoice.pdfUrl) {
    filePath = path.resolve(process.cwd(), env.invoiceStorageDir, `${invoice.invoiceNumber}.pdf`);
  }

  if (!filePath || !fs.existsSync(filePath)) {
    filePath = await ensureInvoicePdf(invoice);
  }

  if (!fs.existsSync(filePath)) {
    throw new AppError('Invoice PDF could not be generated.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return {
    invoice,
    filePath
  };
};

const cancelInvoice = async ({ requester, invoiceId, reason, requestedClinicId = null, req }) => {
  const { clinicId, invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });

  if (invoice.invoiceStatus === 'cancelled') {
    throw new AppError('Invoice is already cancelled.', HTTP_STATUS.BAD_REQUEST);
  }

  const updatedInvoice = await billingRepository.updateInvoice({
    id: invoice._id,
    clinicId,
    data: {
      invoiceStatus: 'cancelled',
      paymentStatus: invoice.paidAmount > 0 ? invoice.paymentStatus : 'cancelled',
      cancellationReason: reason.trim(),
      cancelledAt: new Date(),
      updatedBy: requester._id
    },
    populateDetails: true
  });

  await createAuditLog({
    actorUserId: requester._id,
    action: 'INVOICE_CANCELLED',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      previousStatus: invoice.invoiceStatus,
      newStatus: 'cancelled'
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  await triggerBillingAnomalyRefresh({
    clinicId,
    invoiceId: invoice._id,
    requesterId: requester._id
  });

  return updatedInvoice;
};

const getPatientInvoices = async ({ requester, patientId, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const patient = await patientRepository.findPatientByIdAndClinic({ patientId, clinicId });

  if (!patient) {
    throw new AppError('Patient not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (requester.role === ROLES.PATIENT) {
    const { resolvePatientForRequester } = require('../patients/patient.service');
    const linkedPatient = await resolvePatientForRequester({ requester, clinicId });

    if (String(linkedPatient._id) !== String(patient._id)) {
      throw new AppError('You do not have permission to access these invoices.', HTTP_STATUS.FORBIDDEN);
    }
  }

  if (requester.role === ROLES.DOCTOR) {
    const doctor = await getDoctorClinicScope({ requester, clinicId });
    const { consultationIds, appointmentIds } = await getDoctorAccessibleInvoiceIds({
      clinicId,
      doctorId: doctor._id
    });

    const invoices = await Invoice.find({
      clinicId,
      patientId,
      $or: [{ consultationId: { $in: consultationIds } }, { appointmentId: { $in: appointmentIds } }]
    })
      .sort({ invoiceDate: -1, createdAt: -1 })
      .lean();

    return {
      patient,
      invoices,
      pagination: buildPaginationMeta({ page: 1, limit: invoices.length || 1, total: invoices.length })
    };
  }

  const isPatient = requester.role === ROLES.PATIENT;
  const { page, limit } = getPagination(query);
  const { invoices, total } = await billingRepository.findByPatient({
    patientId,
    clinicId: (isPatient && !query.clinicId) ? undefined : clinicId,
    queryOptions: {
      page,
      limit,
      invoiceStatus: query.invoiceStatus,
      paymentStatus: query.paymentStatus
    }
  });

  return {
    patient,
    invoices,
    pagination: buildPaginationMeta({ page, limit, total })
  };
};

const getBillingSummary = async ({ requester, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId
  });

  const summary = await billingRepository.getBillingSummary({ clinicId });
  return summary;
};

const createRazorpayOrder = async ({ requester, invoiceId, requestedClinicId = null }) => {
  const { invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });

  if (!razorpayInstance) {
    throw new AppError('Razorpay is not configured on the server.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  if (invoice.paymentStatus === 'paid') {
    throw new AppError('Invoice is already paid.', HTTP_STATUS.BAD_REQUEST);
  }

  const amountInPaise = Math.round(invoice.dueAmount * 100);

  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: invoice.invoiceNumber
  };

  const order = await razorpayInstance.orders.create(options);
  
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency
  };
};

const verifyRazorpayPayment = async ({ requester, invoiceId, payload, requestedClinicId = null, req }) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
  
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

  // The signature is valid, record the payment using the existing flow
  const { invoice } = await loadScopedInvoice({
    requester,
    invoiceId,
    requestedClinicId
  });

  // Calculate amount to pay (assume full due amount since Razorpay handles the order)
  const amountToPay = invoice.dueAmount;

  return recordPayment({
    requester,
    invoiceId,
    payload: {
      amount: amountToPay,
      paymentMode: 'online',
      transactionId: razorpay_payment_id,
      notes: `Razorpay Order: ${razorpay_order_id}`
    },
    requestedClinicId,
    req
  });
};

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceById,
  updateInvoice,
  recordPayment,
  recordRefund,
  generateInvoicePdfFile,
  downloadInvoicePdf,
  cancelInvoice,
  getPatientInvoices,
  getBillingSummary,
  createRazorpayOrder,
  verifyRazorpayPayment
};
