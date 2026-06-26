const settlementsRepository = require('../repositories/settlements.repository');
const { createAuditLog } = require('../../audit/audit.service');
const { AppError } = require('../../../common/utils/AppError');
const { HTTP_STATUS } = require('../../../common/constants/httpStatus');

class SettlementsService {
  /**
   * Split invoice payments and register Doctor & Clinic earnings
   */
  async calculateEarnings(invoice) {
    const mongoose = require('mongoose');
    const doctorId = invoice.doctorId?._id || invoice.doctorId;
    let organizationId = invoice.organizationId?._id || invoice.organizationId;
    const clinicId = invoice.clinicId?._id || invoice.clinicId;

    if (!organizationId && clinicId) {
      try {
        const Clinic = require('../../clinics/clinic.model');
        const clin = await Clinic.findById(clinicId);
        if (clin && clin.organizationId) {
          organizationId = clin.organizationId;
        }
      } catch (err) {
        console.error('Failed to fetch clinic for organizationId:', err);
      }
    }

    if (!organizationId) {
      organizationId = new mongoose.Types.ObjectId();
    }

    if (!doctorId) {
      // Clinic/Organization takes 100% of revenue if no doctor is assigned (e.g. lab testing invoice)
      await settlementsRepository.createOrganizationEarning({
        organizationId,
        clinicId,
        invoiceId: invoice._id,
        grossRevenue: invoice.totalAmount,
        insuranceAmount: invoice.insuranceCoveredAmount,
        patientAmount: invoice.patientPayableAmount,
        netRevenue: invoice.totalAmount,
        status: 'PENDING'
      });
      return;
    }

    // Look up Doctor Payout Setting
    let payoutSetting = await settlementsRepository.getDoctorPayoutSettings(doctorId);
    if (!payoutSetting) {
      // Create defaults
      payoutSetting = await settlementsRepository.upsertDoctorPayoutSettings(doctorId, {
        paymentMode: 'REVENUE_SHARE',
        revenuePercentage: 80,
        monthlySalary: 0
      });
    }

    // Look up Org financial settings
    let orgSetting = await settlementsRepository.getOrganizationFinancialSettings(organizationId);
    if (!orgSetting) {
      orgSetting = await settlementsRepository.upsertOrganizationFinancialSettings(organizationId, {
        automaticSettlement: false,
        doctorRevenuePercentage: 80,
        clinicRevenuePercentage: 20
      });
    }

    const grossAmount = invoice.totalAmount;
    let doctorShare = 0;
    let clinicShare = grossAmount;

    if (payoutSetting.paymentMode === 'REVENUE_SHARE') {
      const percentage = payoutSetting.revenuePercentage || orgSetting.doctorRevenuePercentage || 80;
      doctorShare = (invoice.patientPayableAmount * percentage) / 100;
      clinicShare = grossAmount - doctorShare;
    } else if (payoutSetting.paymentMode === 'MANUAL') {
      const percentage = payoutSetting.revenuePercentage || 80;
      doctorShare = (invoice.patientPayableAmount * percentage) / 100;
      clinicShare = grossAmount - doctorShare;
    } else if (payoutSetting.paymentMode === 'MONTHLY_SALARY') {
      // Doctor is salaried, so clinic takes 100% of invoice amount, salary paid monthly
      doctorShare = 0;
      clinicShare = grossAmount;
    }

    const isAuto = orgSetting.automaticSettlement;
    const status = isAuto ? 'READY_FOR_PAYOUT' : 'PENDING';

    // Save Doctor Earning
    const docEarning = await settlementsRepository.createDoctorEarning({
      doctorId,
      organizationId,
      clinicId,
      invoiceId: invoice._id,
      earningType: invoice.serviceType,
      grossAmount,
      doctorShare,
      clinicShare,
      status
    });

    // Save Organization Earning
    const orgEarning = await settlementsRepository.createOrganizationEarning({
      organizationId,
      clinicId,
      invoiceId: invoice._id,
      grossRevenue: grossAmount,
      insuranceAmount: invoice.insuranceCoveredAmount,
      patientAmount: invoice.patientPayableAmount,
      netRevenue: clinicShare,
      status: isAuto ? 'SETTLED' : 'PENDING'
    });

    // Log Audit
    await createAuditLog({
      action: 'SETTLEMENT_GENERATED',
      entity: 'DoctorEarning',
      entityId: docEarning._id,
      metadata: { invoiceId: invoice._id, doctorShare, clinicShare, isAuto },
      status: 'SUCCESS'
    }).catch(() => null);
  }

  /**
   * Manual Doctor Payout
   */
  async markDoctorPayoutPaid({ doctorEarningId, transactionRef, paymentDate, remarks, requester, req }) {
    const earning = await settlementsRepository.listDoctorEarnings({ _id: doctorEarningId });
    if (!earning || earning.length === 0) {
      throw new AppError('Earning record not found.', HTTP_STATUS.NOT_FOUND);
    }

    const record = earning[0];
    if (record.status === 'PAID') {
      throw new AppError('Earning has already been paid.', HTTP_STATUS.BAD_REQUEST);
    }

    const updated = await settlementsRepository.updateDoctorEarningStatus(record._id, 'PAID', {
      transactionRef,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      remarks
    });

    // Log Audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'DOCTOR_PAYOUT',
      entity: 'DoctorEarning',
      entityId: updated._id,
      metadata: { doctorId: updated.doctorId, doctorShare: updated.doctorShare, transactionRef },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(() => null);

    return updated;
  }

  /**
   * Monthly Salary Generation
   */
  async generateMonthlySalary({ doctorId, requester, req }) {
    const settings = await settlementsRepository.getDoctorPayoutSettings(doctorId);
    if (!settings || settings.paymentMode !== 'MONTHLY_SALARY') {
      throw new AppError('Doctor is not on a Monthly Salary payment mode.', HTTP_STATUS.BAD_REQUEST);
    }

    // Create a mock doctor earning representing salary
    const grossAmount = settings.monthlySalary;
    const salaryEarning = await settlementsRepository.createDoctorEarning({
      doctorId,
      clinicId: new mongoose.Types.ObjectId(), // default clinic
      invoiceId: new mongoose.Types.ObjectId(), // placeholder invoice
      earningType: 'CONSULTATION',
      grossAmount,
      doctorShare: grossAmount,
      clinicShare: 0,
      status: 'PENDING'
    });

    // Log Audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'SETTLEMENT_GENERATED',
      entity: 'DoctorEarning',
      entityId: salaryEarning._id,
      metadata: { doctorId, salary: grossAmount },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(() => null);

    return salaryEarning;
  }

  /**
   * Run Settlements trigger automatically (mark pending as READY_FOR_PAYOUT)
   */
  async runAutomaticSettlement({ organizationId }) {
    const settings = await settlementsRepository.getOrganizationFinancialSettings(organizationId);
    if (!settings || !settings.automaticSettlement) {
      throw new AppError('Automatic settlements is disabled for this organization.', HTTP_STATUS.BAD_REQUEST);
    }

    const pendingDoc = await settlementsRepository.listDoctorEarnings({ organizationId, status: 'PENDING' });
    const pendingOrg = await settlementsRepository.listOrganizationEarnings({ organizationId, status: 'PENDING' });

    for (const d of pendingDoc) {
      await settlementsRepository.updateDoctorEarningStatus(d._id, 'READY_FOR_PAYOUT');
    }

    for (const o of pendingOrg) {
      await settlementsRepository.updateOrganizationEarningStatus(o._id, 'SETTLED');
    }

    return {
      settledDocEarnings: pendingDoc.length,
      settledOrgEarnings: pendingOrg.length
    };
  }
}

module.exports = new SettlementsService();
