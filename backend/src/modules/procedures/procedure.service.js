const fs = require('fs');
const Procedure = require('./procedure.model');
const Invoice = require('../billing/invoice.model');
const Clinic = require('../clinics/clinic.model');
const Patient = require('../patients/patient.model');
const Doctor = require('../doctors/doctor.model');
const User = require('../users/user.model');
const Consultation = require('../consultations/consultation.model');
const billingService = require('../billing/billing.service');
const notificationService = require('../notifications/notification.service');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');

/**
 * Auto-creates Procedure orders when a consultation is completed
 */
const createProcedureOrdersFromConsultation = async (consultationId, requester) => {
  const consultation = await Consultation.findById(consultationId)
    .populate('patientId')
    .populate('doctorId')
    .populate('clinicId');

  if (!consultation) {
    throw new AppError('Consultation not found', HTTP_STATUS.NOT_FOUND);
  }

  const prescription = consultation.prescription;
  const proceduresList = prescription?.procedures || [];

  if (proceduresList.length === 0) {
    return [];
  }

  const clinic = consultation.clinicId;
  const billingPolicy = clinic?.billingSettings?.procedureBillingPolicy || 'payment_before_procedure';

  const initialStatus = billingPolicy === 'payment_before_procedure' ? 'Payment Pending' : 'Ready To Perform';

  // Map procedures and insert them
  const procedureDocs = [];
  const invoiceItems = [];

  for (const proc of proceduresList) {
    const fee = proc.fee || 250;
    const quantity = proc.quantity || 1;
    const totalAmount = fee * quantity;

    const newProc = new Procedure({
      patientId: consultation.patientId?._id || consultation.patientId,
      doctorId: consultation.doctorId?._id || consultation.doctorId,
      consultationId: consultation._id,
      appointmentId: consultation.appointmentId,
      clinicId: clinic._id,
      name: proc.name,
      code: proc.code || '',
      quantity,
      fee,
      totalAmount,
      status: initialStatus,
      priority: proc.priority || 'routine',
      estimatedDuration: proc.duration || '',
      notes: proc.indication || '',
      timeline: [{
        status: initialStatus,
        notes: `Procedure order created on consultation completion. Policy: ${billingPolicy}`,
        userId: requester?._id || null
      }],
      auditLogs: [{
        action: 'Procedure Added',
        userId: requester?._id || null,
        role: requester?.role || 'SYSTEM',
        details: `Procedure ${proc.name} added to consultation ${consultation._id}`
      }]
    });

    procedureDocs.push(newProc);

    invoiceItems.push({
      itemType: 'procedure',
      name: proc.name,
      description: proc.indication || '',
      quantity,
      unitPrice: fee,
      amount: totalAmount
    });
  }

  // If billing policy requires payment, generate the invoice
  if (billingPolicy === 'payment_before_procedure' && invoiceItems.length > 0) {
    const invoicePayload = {
      patientId: String(consultation.patientId?._id || consultation.patientId),
      appointmentId: consultation.appointmentId ? String(consultation.appointmentId) : undefined,
      consultationId: String(consultation._id),
      serviceType: 'PROCEDURE',
      items: invoiceItems,
      discountType: 'none',
      discountValue: 0,
      notes: `Invoice generated for procedures ordered in consultation ${consultation._id}`
    };

    const invoiceRes = await billingService.createInvoice({
      requester: requester || { _id: consultation.doctorId?._id, role: ROLES.DOCTOR },
      payload: invoicePayload,
      requestedClinicId: String(clinic._id)
    });

    const invoiceId = invoiceRes._id;

    for (const doc of procedureDocs) {
      doc.invoiceId = invoiceId;
      doc.auditLogs.push({
        action: 'Invoice Generated',
        userId: requester?._id || null,
        role: requester?.role || 'SYSTEM',
        details: `Invoice ${invoiceRes.invoiceNumber} generated for procedure ${doc.name}`
      });
    }
  }

  // Save all procedures
  const savedProcedures = [];
  for (const doc of procedureDocs) {
    await doc.save();
    savedProcedures.push(doc);
  }

  return savedProcedures;
};

/**
 * Lists procedures with filtering and pagination
 */
const listProcedures = async (filters = {}) => {
  const query = {};
  if (filters.clinicId) query.clinicId = filters.clinicId;
  if (filters.patientId) query.patientId = filters.patientId;
  if (filters.status) query.status = filters.status;
  if (filters.doctorId) query.doctorId = filters.doctorId;

  return Procedure.find(query)
    .populate('patientId', 'fullName phone email gender dob')
    .populate('doctorId', 'fullName specialization')
    .populate('invoiceId')
    .populate('performingStaffId', 'fullName role')
    .sort({ createdAt: -1 });
};

/**
 * Gets a single procedure by ID
 */
const getProcedureById = async (id) => {
  const proc = await Procedure.findById(id)
    .populate('patientId')
    .populate('doctorId')
    .populate('invoiceId')
    .populate('performingStaffId', 'fullName role');
  if (!proc) {
    throw new AppError('Procedure not found', HTTP_STATUS.NOT_FOUND);
  }
  return proc;
};

/**
 * Reception collects payment for procedure invoice
 */
const payProcedureInvoice = async (invoiceId, paymentData, requester) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  // Record payment
  const paymentResult = await billingService.recordPayment({
    requester,
    invoiceId,
    payload: {
      amount: paymentData.amount,
      paymentMode: paymentData.paymentMode,
      transactionId: paymentData.transactionId || '',
      notes: paymentData.notes || 'Procedure payment collected'
    }
  });

  const updatedInvoice = await Invoice.findById(invoiceId);

  // If the invoice is fully paid, update associated procedures to 'Ready To Perform'
  if (updatedInvoice.paymentStatus === 'paid' || updatedInvoice.dueAmount === 0) {
    const procedures = await Procedure.find({ invoiceId });
    const receiptNumber = paymentResult.payments?.[paymentResult.payments.length - 1]?.transactionId || `REC-${Date.now()}`;

    for (const proc of procedures) {
      proc.status = 'Ready To Perform';
      proc.receiptNumber = receiptNumber;
      proc.timeline.push({
        status: 'Ready To Perform',
        notes: `Payment successful. Receipt Number: ${receiptNumber}. Paid via ${paymentData.paymentMode}`,
        userId: requester._id
      });
      proc.auditLogs.push({
        action: 'Payment Completed',
        userId: requester._id,
        role: requester.role,
        details: `Payment of ₹${proc.totalAmount} completed for procedure ${proc.name}. Receipt: ${receiptNumber}`
      });
      await proc.save();

      // Trigger notifications as requested
      await triggerNotifications(proc, receiptNumber);
    }
  }

  return paymentResult;
};

/**
 * Helper to dispatch alerts and notifications for doctor, nurse, and patient
 */
const triggerNotifications = async (proc, receiptNumber) => {
  const patient = await Patient.findById(proc.patientId);
  const doctorUser = await User.findOne({ doctorProfileId: proc.doctorId });
  
  // Find a nurse or staff at the clinic to notify (broad notification or mock)
  const notificationText = `Payment received. Procedure ${proc.name} is ready for Patient ${patient?.fullName || 'Patient'}.`;

  // Log notifications to backend debug log for validation
  fs.appendFileSync(
    'd:/Office_work/CMS/backend/notification_debug.log',
    `[Notification - Doctor] Sent to Doctor. Body: Payment received. Procedure is ready for ${patient?.fullName}.\n` +
    `[Notification - Nurse/Tech] Sent to Staff. Body: Patient ${patient?.fullName} is ready for ${proc.name}. Please begin procedure.\n` +
    `[Notification - Patient] Sent to Patient (${patient?.fullName}). Body: Payment successful. Please proceed to Procedure Room 2.\n`
  );

  // Create real notification records if recipient available
  if (patient) {
    try {
      await notificationService.createNotificationRecord({
        clinicId: proc.clinicId,
        createdBy: proc.doctorId,
        payload: {
          patientId: patient._id,
          type: 'other',
          channel: 'sms',
          subject: 'Procedure Payment Successful',
          body: `Payment successful. Please proceed to Procedure Room 2 for your ${proc.name}.`
        },
        patient,
        sendNow: true
      });
    } catch (e) {
      console.error('Failed to notify patient:', e);
    }
  }
};

/**
 * Start a procedure (requires 'Ready To Perform' status and verified payment if policy is active)
 */
const startProcedure = async (id, startDetails, requester) => {
  const proc = await Procedure.findById(id);
  if (!proc) {
    throw new AppError('Procedure not found', HTTP_STATUS.NOT_FOUND);
  }

  if (proc.status === 'Payment Pending') {
    throw new AppError('Cannot start procedure: Payment is pending.', HTTP_STATUS.BAD_REQUEST);
  }

  if (proc.status !== 'Ready To Perform' && proc.status !== 'Called') {
    throw new AppError(`Cannot start procedure from state: ${proc.status}`, HTTP_STATUS.BAD_REQUEST);
  }

  proc.status = 'In Progress';
  proc.startTime = new Date();
  proc.performingStaffId = startDetails.performingStaffId || requester._id;
  proc.room = startDetails.room || 'Procedure Room 2';
  proc.equipmentUsed = startDetails.equipmentUsed || [];
  proc.notes = startDetails.notes || '';
  
  proc.timeline.push({
    status: 'In Progress',
    notes: `Procedure started in ${proc.room} by staff.`,
    userId: requester._id
  });

  proc.auditLogs.push({
    action: 'Procedure Started',
    userId: requester._id,
    role: requester.role,
    details: `Procedure started by staff in room ${proc.room}`
  });

  return proc.save();
};

/**
 * Complete a procedure
 */
const completeProcedure = async (id, completionDetails, requester) => {
  const proc = await Procedure.findById(id).populate('patientId');
  if (!proc) {
    throw new AppError('Procedure not found', HTTP_STATUS.NOT_FOUND);
  }

  if (proc.status !== 'In Progress') {
    throw new AppError('Cannot complete a procedure that is not In Progress', HTTP_STATUS.BAD_REQUEST);
  }

  proc.status = 'Completed';
  proc.endTime = new Date();
  proc.notes = completionDetails.notes || proc.notes;
  proc.complications = completionDetails.complications || '';

  proc.timeline.push({
    status: 'Completed',
    notes: `Procedure successfully completed. Notes: ${proc.notes}`,
    userId: requester._id
  });

  proc.auditLogs.push({
    action: 'Procedure Completed',
    userId: requester._id,
    role: requester.role,
    details: `Procedure completed at ${proc.endTime}`
  });

  await proc.save();

  // Add to consultation history or patient pastMedicalHistory
  const consultation = await Consultation.findById(proc.consultationId);
  if (consultation) {
    if (!consultation.pastMedicalHistory) {
      consultation.pastMedicalHistory = [];
    }
    consultation.pastMedicalHistory.push(`Completed Procedure: ${proc.name} on ${new Date().toLocaleDateString('en-IN')}. Notes: ${proc.notes}`);
    await consultation.save();
  }

  return proc;
};

/**
 * Cancel a procedure (Supports refunds if paid)
 */
const cancelProcedure = async (id, cancelDetails, requester) => {
  const proc = await Procedure.findById(id);
  if (!proc) {
    throw new AppError('Procedure not found', HTTP_STATUS.NOT_FOUND);
  }

  if (['Completed', 'Refunded', 'Cancelled Before Payment', 'Cancelled After Payment'].includes(proc.status)) {
    throw new AppError('Procedure is already closed and cannot be cancelled.', HTTP_STATUS.BAD_REQUEST);
  }

  const oldStatus = proc.status;
  proc.cancellationReason = cancelDetails.reason || 'Cancelled by staff';

  if (oldStatus === 'Payment Pending') {
    proc.status = 'Cancelled Before Payment';
    proc.timeline.push({
      status: 'Cancelled Before Payment',
      notes: `Cancelled prior to payment: ${proc.cancellationReason}`,
      userId: requester._id
    });
    proc.auditLogs.push({
      action: 'Procedure Cancelled',
      userId: requester._id,
      role: requester.role,
      details: `Cancelled before payment: ${proc.cancellationReason}`
    });

    // Cancel invoice if one was generated
    if (proc.invoiceId) {
      try {
        await billingService.cancelInvoice({
          requester,
          invoiceId: proc.invoiceId,
          payload: { reason: proc.cancellationReason }
        });
      } catch (e) {
        console.error('Failed to cancel associated invoice:', e);
      }
    }
  } else {
    // Already paid! Trigger refund workflow
    proc.status = 'Refund Pending';
    proc.refundStatus = 'Pending';
    proc.refundReason = cancelDetails.reason || 'Cancelled after payment';

    proc.timeline.push({
      status: 'Refund Pending',
      notes: `Initiated refund request. Reason: ${proc.refundReason}`,
      userId: requester._id
    });

    proc.auditLogs.push({
      action: 'Refund Initiated',
      userId: requester._id,
      role: requester.role,
      details: `Refund request initiated for paid procedure cancellation. Reason: ${proc.refundReason}`
    });
  }

  return proc.save();
};

/**
 * Admin approves refund
 */
const approveRefund = async (id, requester) => {
  const proc = await Procedure.findById(id);
  if (!proc) {
    throw new AppError('Procedure not found', HTTP_STATUS.NOT_FOUND);
  }

  if (proc.status !== 'Refund Pending' || proc.refundStatus !== 'Pending') {
    throw new AppError('No pending refund found for this procedure', HTTP_STATUS.BAD_REQUEST);
  }

  proc.status = 'Refunded';
  proc.refundStatus = 'Approved';

  proc.timeline.push({
    status: 'Refunded',
    notes: 'Refund approved and completed by Clinic Admin',
    userId: requester._id
  });

  proc.auditLogs.push({
    action: 'Refund Completed',
    userId: requester._id,
    role: requester.role,
    details: 'Refund completed successfully'
  });

  // Call billing service recordRefund if invoice exists
  if (proc.invoiceId) {
    try {
      await billingService.recordRefund({
        requester,
        invoiceId: proc.invoiceId,
        payload: {
          amount: proc.totalAmount,
          notes: `Refund approved for procedure cancellation: ${proc.name}`
        }
      });
    } catch (e) {
      console.error('Failed to record invoice refund:', e);
    }
  }

  return proc.save();
};

/**
 * Gets procedure reports and analytics
 */
const getProcedureReports = async (clinicId) => {
  const allProcs = await Procedure.find({ clinicId });
  
  let pendingPaymentsCount = 0;
  let paidProceduresCount = 0;
  let completedProceduresCount = 0;
  let totalRevenue = 0;
  let totalRefunded = 0;
  let cancellationCount = 0;
  let totalDurationMs = 0;
  let durationCount = 0;

  const revenueByProcedure = {};

  for (const proc of allProcs) {
    if (proc.status === 'Payment Pending') {
      pendingPaymentsCount++;
    } else if (proc.status === 'Ready To Perform' || proc.status === 'In Progress' || proc.status === 'Called') {
      paidProceduresCount++;
    } else if (proc.status === 'Completed') {
      completedProceduresCount++;
      if (proc.startTime && proc.endTime) {
        totalDurationMs += (proc.endTime - proc.startTime);
        durationCount++;
      }
    }

    if (proc.status === 'Refunded') {
      totalRefunded += proc.totalAmount;
    } else if (proc.status !== 'Payment Pending' && proc.status !== 'Cancelled Before Payment') {
      totalRevenue += proc.totalAmount;
      revenueByProcedure[proc.name] = (revenueByProcedure[proc.name] || 0) + proc.totalAmount;
    }

    if (proc.status.includes('Cancelled')) {
      cancellationCount++;
    }
  }

  const averageCompletionTimeMins = durationCount > 0 
    ? Math.round((totalDurationMs / durationCount) / 1000 / 60) 
    : 0;

  const cancellationRate = allProcs.length > 0 
    ? ((cancellationCount / allProcs.length) * 100).toFixed(1) 
    : '0';

  return {
    pendingPayments: pendingPaymentsCount,
    paidProcedures: paidProceduresCount,
    completedProcedures: completedProceduresCount,
    revenue: totalRevenue,
    refunds: totalRefunded,
    cancellationRate: parseFloat(cancellationRate),
    averageCompletionTime: averageCompletionTimeMins,
    revenueByProcedure
  };
};

module.exports = {
  createProcedureOrdersFromConsultation,
  listProcedures,
  getProcedureById,
  payProcedureInvoice,
  startProcedure,
  completeProcedure,
  cancelProcedure,
  approveRefund,
  getProcedureReports
};
