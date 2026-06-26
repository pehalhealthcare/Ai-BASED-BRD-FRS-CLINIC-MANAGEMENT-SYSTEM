const billingRepository = require('../repositories/billing.repository');
const insuranceService = require('../../insurance/services/insurance.service');
const patientInsurance = require('../../insurance/schemas/policy.schema');
const { createAuditLog } = require('../../audit/audit.service');
const { AppError } = require('../../../common/utils/AppError');
const { HTTP_STATUS } = require('../../../common/constants/httpStatus');

class BillingService {
  /**
   * Create invoice with optional insurance coverage
   */
  async createInvoice({
    patientId,
    organizationId,
    clinicId,
    doctorId,
    appointmentId,
    serviceType,
    items,
    discount = 0,
    tax = 0,
    policyNumber = '',
    requester,
    req
  }) {
    // 1. Calculate totals
    let subtotal = 0;
    const mappedItems = items.map(item => {
      const amount = item.quantity * item.unitPrice;
      subtotal += amount;
      return {
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount
      };
    });

    const taxAmount = (subtotal - discount) * (tax / 100);
    const totalAmount = subtotal - discount + taxAmount;

    let insuranceCoveredAmount = 0;
    let patientPayableAmount = totalAmount;

    let finalPolicyNumber = policyNumber;
    if (!finalPolicyNumber && patientId) {
      try {
        const Patient = require('../../patients/patient.model');
        const patient = await Patient.findById(patientId);
        if (patient && patient.insuranceDetails && patient.insuranceDetails.policyNumber) {
          finalPolicyNumber = patient.insuranceDetails.policyNumber;
        }
      } catch (err) {
        console.error('Failed to auto-resolve patient policy:', err);
      }
    }

    // 2. Check Insurance Coverage if policyNumber resolved
    if (finalPolicyNumber) {
      try {
        const Patient = require('../../patients/patient.model');
        const patient = await Patient.findById(patientId);

        // If patient has the policy linked in their profile, use their remainingCoverage
        if (patient && patient.insuranceDetails && patient.insuranceDetails.policyNumber && patient.insuranceDetails.policyNumber.toUpperCase() === finalPolicyNumber.toUpperCase()) {
          const remainingCoverage = patient.insuranceDetails.remainingCoverage || 0;
          if (remainingCoverage > 0) {
            // covers 80%
            const coverageShare = totalAmount * 0.8;
            insuranceCoveredAmount = Math.min(coverageShare, remainingCoverage);
            patientPayableAmount = totalAmount - insuranceCoveredAmount;
          }
        } else {
          // Fallback to PatientInsurance schema query
          const policy = await patientInsurance.findOne({ policyNumber: finalPolicyNumber.toUpperCase() }).populate('providerId');
          if (policy && policy.status === 'ACTIVE') {
            // Check if serviceType is covered in benefits
            let isCovered = false;
            const serviceTypeLower = serviceType.toLowerCase();

            if (serviceTypeLower === 'consultation' && policy.benefits?.consultation) isCovered = true;
            else if (serviceTypeLower === 'lab' && policy.benefits?.lab) isCovered = true;
            else if (serviceTypeLower === 'pharmacy' && policy.benefits?.pharmacy) isCovered = true;

            if (isCovered) {
              // covers 80%
              const coverageShare = totalAmount * 0.8;
              insuranceCoveredAmount = Math.min(coverageShare, policy.remainingCoverage);
              patientPayableAmount = totalAmount - insuranceCoveredAmount;
            }
          }
        }
      } catch (err) {
        console.error('Failed to calculate insurance coverage:', err);
      }
    }

    if (appointmentId && (serviceType === 'CONSULTATION' || (items && items.some(item => item.itemType === 'consultation')))) {
      const Invoice = require('../invoice.model');
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

    const nextInvoiceNumber = await billingRepository.generateInvoiceNumber();

    const invoice = await billingRepository.createInvoice({
      invoiceNumber: nextInvoiceNumber,
      patientId,
      organizationId,
      clinicId,
      doctorId,
      appointmentId,
      serviceType,
      items: mappedItems,
      subtotal,
      discount,
      tax,
      insuranceCoveredAmount,
      patientPayableAmount,
      totalAmount,
      invoiceStatus: 'issued',
      paymentStatus: 'unpaid',
      createdBy: requester?._id
    });

    // 3. Log Audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'INVOICE_CREATED',
      entity: 'Invoice',
      entityId: invoice._id,
      metadata: { invoiceNumber: invoice.invoiceNumber, totalAmount, patientPayableAmount },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(() => null);

    return invoice;
  }

  async getInvoiceById(id) {
    const invoice = await billingRepository.findInvoiceById(id);
    if (!invoice) {
      throw new AppError('Invoice not found.', HTTP_STATUS.NOT_FOUND);
    }
    return invoice;
  }

  async getInvoicesByPatient(patientId) {
    return billingRepository.findInvoicesByPatient(patientId);
  }

  async getInvoicesByOrganization(organizationId) {
    return billingRepository.findInvoicesByOrganization(organizationId);
  }

  /**
   * Helper called by Insurance Module to calculate coverage directly
   */
  async calculateCoverage({ policyNumber, amount, serviceType }) {
    let insuranceCoveredAmount = 0;
    let patientPayableAmount = amount;
    let coveragePercentage = 0;

    const policy = await patientInsurance.findOne({ policyNumber: policyNumber.toUpperCase() });
    if (policy && policy.status === 'ACTIVE') {
      let isCovered = false;
      const type = serviceType.toLowerCase();
      if (type === 'consultation' && policy.benefits?.consultation) isCovered = true;
      else if (type === 'lab' && policy.benefits?.lab) isCovered = true;
      else if (type === 'pharmacy' && policy.benefits?.pharmacy) isCovered = true;

      if (isCovered) {
        insuranceCoveredAmount = Math.min(amount * 0.8, policy.remainingCoverage);
        patientPayableAmount = amount - insuranceCoveredAmount;
        coveragePercentage = Math.round((insuranceCoveredAmount / amount) * 100);
      }
    }

    return {
      insuranceCoveredAmount,
      patientPayableAmount,
      coveragePercentage
    };
  }
}

module.exports = new BillingService();
