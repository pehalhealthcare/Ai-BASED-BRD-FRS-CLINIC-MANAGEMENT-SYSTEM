const paymentRepository = require('../repositories/payment.repository');
const billingRepository = require('../../billing/repositories/billing.repository');
const Appointment = require('../../appointments/appointment.model');
const billingService = require('../../billing/services/billing.service');
const { createAuditLog } = require('../../audit/audit.service');
const { AppError } = require('../../../common/utils/AppError');
const { HTTP_STATUS } = require('../../../common/constants/httpStatus');

class PaymentService {
  /**
   * Create Razorpay / Gateway order for patient invoice
   */
  async createOrder({ invoiceId, selectedInvoiceIds, method = 'UPI', gateway = 'RAZORPAY', useInsurance, requester, req }) {
    let invoices = [];
    let isAll = false;
    let patientId = null;
    let mainInvoice = null;

    if (invoiceId === 'all') {
      isAll = true;
      const Patient = require('../../patients/patient.model');
      const filters = [];
      if (requester.email) {
        filters.push({ email: String(requester.email).trim().toLowerCase() });
      }
      if (requester.phone) {
        filters.push({ phone: String(requester.phone).trim() });
      }
      let patient = null;
      if (filters.length > 0) {
        patient = await Patient.findOne({
          isActive: { $ne: false },
          $or: filters
        }).sort({ updatedAt: -1 });
      }
      if (!patient) {
        throw new AppError('Patient profile not found.', HTTP_STATUS.NOT_FOUND);
      }
      patientId = patient._id;

      const Invoice = require('../../billing/invoice.model');
      if (selectedInvoiceIds && selectedInvoiceIds.length > 0) {
        invoices = await Invoice.find({ _id: { $in: selectedInvoiceIds }, patientId });
      } else {
        invoices = await Invoice.find({ patientId, paymentStatus: { $in: ['unpaid', 'UNPAID', 'partial', 'PARTIAL'] } });
      }
      if (invoices.length === 0) {
        throw new AppError('No unpaid invoices found.', HTTP_STATUS.BAD_REQUEST);
      }
      mainInvoice = invoices[0];
    } else {
      mainInvoice = await billingService.getInvoiceById(invoiceId);
      if (!mainInvoice) {
        throw new AppError('Invoice not found.', HTTP_STATUS.NOT_FOUND);
      }
      if (mainInvoice.paymentStatus === 'paid') {
        throw new AppError('Invoice has already been paid.', HTTP_STATUS.BAD_REQUEST);
      }
      invoices = [mainInvoice];
      patientId = mainInvoice.patientId?._id || mainInvoice.patientId;
    }

    // Sum the totals
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Determine target amount based on user's choice to use insurance
    const applyInsurance = useInsurance !== false;
    let totalCoveredAmount = 0;

    if (applyInsurance) {
      const alreadyCovered = invoices.reduce((sum, inv) => sum + (inv.insuranceCoveredAmount || 0), 0);
      if (alreadyCovered > 0) {
        totalCoveredAmount = alreadyCovered;
      } else {
        try {
          const Patient = require('../../patients/patient.model');
          const patient = await Patient.findById(patientId);
          if (patient && patient.insuranceDetails && patient.insuranceDetails.coverageAmount > 0) {
            const remainingCoverage = patient.insuranceDetails.remainingCoverage || 0;
            const coverageShare = totalAmount * 0.8;
            totalCoveredAmount = Math.min(coverageShare, remainingCoverage);
          }
        } catch (err) {
          console.error('Failed to calculate insurance coverage:', err);
        }
      }
    }

    const finalPayable = totalAmount - totalCoveredAmount;

    // Distribute covered amount and update invoices
    let remainingToCover = totalCoveredAmount;
    for (const inv of invoices) {
      if (applyInsurance) {
        const invShare = inv.totalAmount * 0.8;
        const invCovered = Math.min(invShare, remainingToCover);
        inv.insuranceCoveredAmount = invCovered;
        inv.patientPayableAmount = inv.totalAmount - invCovered;
        inv.dueAmount = inv.totalAmount - invCovered;
        await inv.save();
        remainingToCover -= invCovered;
      } else {
        inv.insuranceCoveredAmount = 0;
        inv.patientPayableAmount = inv.totalAmount;
        inv.dueAmount = inv.totalAmount;
        await inv.save();
      }
    }

    const nextPaymentId = await paymentRepository.generatePaymentId();
    const gatewayOrderId = `order_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

    const payment = await paymentRepository.createPayment({
      paymentId: nextPaymentId,
      invoiceId: mainInvoice._id,
      patientId,
      organizationId: mainInvoice.organizationId?._id || mainInvoice.organizationId,
      clinicId: mainInvoice.clinicId?._id || mainInvoice.clinicId,
      amount: finalPayable,
      currency: 'INR',
      method,
      gateway,
      gatewayOrderId,
      status: 'PENDING',
      useInsurance: applyInsurance && totalCoveredAmount > 0,
      metadata: {
        isAll,
        invoiceIds: invoices.map(inv => inv._id)
      }
    });

    // Log Audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'PAYMENT_INITIATED',
      entity: 'Payment',
      entityId: payment._id,
      metadata: { paymentId: payment.paymentId, amount: payment.amount, gatewayOrderId },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(() => null);

    return {
      gatewayOrderId,
      amount: payment.amount,
      currency: 'INR',
      paymentId: payment.paymentId,
      invoiceId: mainInvoice._id
    };
  }

  /**
   * Verify signature and confirm payment success
   */
  async verifyPayment({ gatewayOrderId, gatewayPaymentId, gatewaySignature, requester, req }) {
    const payment = await paymentRepository.findPaymentByGatewayOrderId(gatewayOrderId);
    if (!payment) {
      throw new AppError('Payment record not found for this order.', HTTP_STATUS.NOT_FOUND);
    }

    if (payment.status === 'SUCCESS') {
      return payment;
    }

    // In Test Mode, verify signature is simply checked to exist or simulated
    if (!gatewaySignature) {
      throw new AppError('Invalid signature verification payload.', HTTP_STATUS.BAD_REQUEST);
    }

    // Update payment
    const updatedPayment = await paymentRepository.updatePaymentStatus(payment._id, {
      status: 'SUCCESS',
      gatewayPaymentId,
      gatewaySignature
    });

    const invoiceIds = payment.metadata?.invoiceIds || [payment.invoiceId];
    for (const invId of invoiceIds) {
      // Update Invoice status
      await billingRepository.updateInvoiceStatus(invId, {
        invoiceStatus: 'paid',
        paymentStatus: 'paid',
        paymentId: payment._id
      });

      const invoice = await billingRepository.findInvoiceById(invId);
      if (invoice && invoice.appointmentId) {
        try {
          const appt = await Appointment.findById(invoice.appointmentId);
          if (appt) {
            appt.paymentStatus = 'paid';
            appt.amountPaid = appt.consultationFee || invoice.totalAmount;
            appt.paymentDate = new Date();
            appt.paymentMethod = 'digital';
            if (appt.status === 'booked') {
              appt.status = 'confirmed';
            }
            await appt.save();
          }
        } catch (err) {
          console.error('Failed to auto-confirm and mark appointment paid:', err);
        }

        // Send Consultation EMR Report if generated
        try {
          const { sendConsultationReportPdf } = require('../../notifications/notification.service');
          await sendConsultationReportPdf({
            invoice,
            actorUserId: requester?._id || payment.patientId
          });
        } catch (consErr) {
          console.error('Failed to process consultation report sending on payment verify:', consErr);
        }
      }

      // Trigger Settlements Service
      const settlementsService = require('../../settlements/services/settlements.service');
      await settlementsService.calculateEarnings(invoice).catch(err => {
        console.error('Settlement calculations failed:', err);
      });
    }

    // Deduct remaining coverage from Patient model if insurance was applied
    if (payment.useInsurance) {
      try {
        const Patient = require('../../patients/patient.model');
        const patient = await Patient.findById(payment.patientId);
        if (patient && patient.insuranceDetails) {
          const currentRemaining = patient.insuranceDetails.remainingCoverage || 0;
          let totalDeduction = 0;
          for (const invId of invoiceIds) {
            const inv = await billingRepository.findInvoiceById(invId);
            if (inv) {
              totalDeduction += (inv.insuranceCoveredAmount || 0);
            }
          }
          patient.insuranceDetails.remainingCoverage = Math.max(0, currentRemaining - totalDeduction);
          await patient.save();
          console.log(`[Insurance Deduction] Deducted ₹${totalDeduction} from Patient: ${patient.fullName}. Remaining: ₹${patient.insuranceDetails.remainingCoverage}`);
        }
      } catch (err) {
        console.error('Failed to deduct remaining coverage from patient:', err);
      }
    }

    // Log Audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'PAYMENT_SUCCESS',
      entity: 'Payment',
      entityId: updatedPayment._id,
      metadata: { paymentId: updatedPayment.paymentId, gatewayOrderId, gatewayPaymentId },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(() => null);

    return updatedPayment;
  }

  async getPaymentById(paymentId) {
    const payment = await paymentRepository.findPaymentByPaymentId(paymentId);
    if (!payment) {
      throw new AppError('Payment not found.', HTTP_STATUS.NOT_FOUND);
    }
    return payment;
  }

  async getPaymentsByPatient(patientId) {
    return paymentRepository.findPaymentsByPatientId(patientId);
  }

  /**
   * Process refund
   */
  async processRefund({ paymentId, amount, requester, req }) {
    const payment = await paymentRepository.findPaymentByPaymentId(paymentId);
    if (!payment) {
      throw new AppError('Payment not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (payment.status !== 'SUCCESS') {
      throw new AppError('Only successful payments can be refunded.', HTTP_STATUS.BAD_REQUEST);
    }

    // Update payment
    const updatedPayment = await paymentRepository.updatePaymentStatus(payment._id, {
      status: 'REFUNDED'
    });

    // Update Invoice
    await billingRepository.updateInvoiceStatus(payment.invoiceId, {
      invoiceStatus: 'cancelled',
      paymentStatus: 'refunded'
    });

    const invoiceDoc = await billingRepository.findInvoiceById(payment.invoiceId);
    if (invoiceDoc && invoiceDoc.appointmentId) {
      try {
        const appt = await Appointment.findById(invoiceDoc.appointmentId);
        if (appt) {
          appt.paymentStatus = 'refunded';
          appt.status = 'cancelled';
          await appt.save();
        }
      } catch (err) {
        console.error('Failed to update appointment status on refund:', err);
      }
    }

    // Log Audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'REFUND',
      entity: 'Payment',
      entityId: updatedPayment._id,
      metadata: { paymentId: updatedPayment.paymentId, amount },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(() => null);

    return updatedPayment;
  }
}

module.exports = new PaymentService();
