const settlementsService = require('../services/settlements.service');
const settlementsRepository = require('../repositories/settlements.repository');
const { sendSuccess } = require('../../../common/utils/apiResponse');
const { asyncHandler } = require('../../../common/utils/asyncHandler');

const getOrganizationEarnings = asyncHandler(async (req, res) => {
  const { organizationId } = req.query;
  const earnings = await settlementsRepository.listOrganizationEarnings({ organizationId });
  return sendSuccess(res, 'Organization earnings retrieved', { earnings });
});

const getDoctorEarnings = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { from, to, clinicId } = req.query;
  const mongoose = require('mongoose');
  const DoctorEarning = require('../schemas/doctorEarning.schema');
  const Appointment = require('../../appointments/appointment.model');

  // Build filter
  const filter = { doctorId: new mongoose.Types.ObjectId(doctorId) };
  if (clinicId) {
    filter.clinicId = new mongoose.Types.ObjectId(clinicId);
  }
  if (from && to) {
    filter.createdAt = {
      $gte: new Date(from),
      $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
    };
  }

  // Fetch real database records
  const realEarnings = await DoctorEarning.find(filter).populate('invoiceId').lean();

  let totalEarnings = 0;
  let consultationEarnings = 0;
  let procedureEarnings = 0;
  let otherEarnings = 0;
  let labReferralEarnings = 0;
  let otherServicesEarnings = 0;
  let pendingPayout = 0;

  const procedureKeywords = [
    'surgery', 'ecg', 'x-ray', 'xray', 'ultrasound', 'nebulization', 'injection', 
    'dressing', 'suturing', 'abscess', 'ot', 'extraction', 'canal', 
    'physiotherapy', 'dialysis', 'endoscopy', 'colonoscopy', 'procedure'
  ];

  const otherKeywords = [
    'referral', 'commission', 'bonus', 'telemedicine', 'incentive', 'package'
  ];

  realEarnings.forEach(earning => {
    const amt = earning.doctorShare || 0;
    totalEarnings += amt;

    if (earning.status === 'PENDING' || earning.status === 'READY_FOR_PAYOUT') {
      pendingPayout += amt;
    }

    const invoice = earning.invoiceId;
    let isProcedure = false;
    let isOther = false;

    if (invoice && invoice.items) {
      invoice.items.forEach(item => {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        if (procedureKeywords.some(keyword => name.includes(keyword) || desc.includes(keyword))) {
          isProcedure = true;
        } else if (otherKeywords.some(keyword => name.includes(keyword) || desc.includes(keyword))) {
          isOther = true;
        }
      });
    }

    // Check service type fallback
    if (earning.earningType === 'LAB' || earning.earningType === 'PHARMACY') {
      isOther = true;
    }

    if (isProcedure) {
      procedureEarnings += amt;
    } else if (isOther) {
      otherEarnings += amt;
      // Classify for breakdown
      if (invoice && invoice.items?.some(item => (item.name || '').toLowerCase().includes('referral'))) {
        labReferralEarnings += amt;
      } else {
        otherServicesEarnings += amt;
      }
    } else {
      consultationEarnings += amt;
    }
  });

  // Fetch appointment counts
  const apptFilter = { doctorId: new mongoose.Types.ObjectId(doctorId) };
  if (clinicId) {
    apptFilter.clinicId = new mongoose.Types.ObjectId(clinicId);
  }
  if (from && to) {
    apptFilter.appointmentDate = {
      $gte: new Date(from),
      $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
    };
  }

  let totalAppointments = await Appointment.countDocuments(apptFilter);
  apptFilter.status = { $in: ['confirmed', 'completed', 'checked_in'] };
  let paidAppointments = await Appointment.countDocuments(apptFilter);

  const averageEarningPerAppointment = totalAppointments > 0 ? (totalEarnings / totalAppointments) : 0;

  // Generate real daily/monthly trend details from DB
  const trendMap = {};
  realEarnings.forEach(earning => {
    const d = new Date(earning.createdAt);
    const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    trendMap[label] = (trendMap[label] || 0) + (earning.doctorShare || 0);
  });
  
  const trend = Object.entries(trendMap).map(([label, value]) => ({
    label,
    value
  })).sort((a, b) => new Date(a.label) - new Date(b.label));

  // Create recent transaction list
  const recentTransactions = [];
  
  realEarnings.slice(0, 10).forEach(earning => {
    let type = 'Consultation';
    let desc = 'Consultation';
    const invoice = earning.invoiceId;
    if (invoice) {
      desc = invoice.description || (invoice.items?.[0]?.name ? `${invoice.items[0].name}` : 'Medical Service');
      if (invoice.items?.some(item => procedureKeywords.some(kw => (item.name || '').toLowerCase().includes(kw)))) {
        type = 'Procedure';
      } else if (invoice.items?.some(item => otherKeywords.some(kw => (item.name || '').toLowerCase().includes(kw)))) {
        type = 'Other';
      }
    }
    recentTransactions.push({
      date: earning.createdAt ? new Date(earning.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '26 Jun 2026',
      description: desc,
      type,
      amount: earning.doctorShare,
      status: earning.status === 'PAID' ? 'Paid' : 'Pending'
    });
  });

  // Calculate percentages
  const pctConsultations = totalEarnings > 0 ? ((consultationEarnings / totalEarnings) * 100).toFixed(1) : '0';
  const pctProcedures = totalEarnings > 0 ? ((procedureEarnings / totalEarnings) * 100).toFixed(1) : '0';
  const pctLabReferrals = totalEarnings > 0 ? ((labReferralEarnings / totalEarnings) * 100).toFixed(1) : '0';
  const pctOtherServices = totalEarnings > 0 ? ((otherServicesEarnings / totalEarnings) * 100).toFixed(1) : '0';

  const breakdown = [
    { name: 'Consultations', amount: consultationEarnings, percentage: parseFloat(pctConsultations) },
    { name: 'Procedures', amount: procedureEarnings, percentage: parseFloat(pctProcedures) },
    { name: 'Lab Referrals', amount: labReferralEarnings, percentage: parseFloat(pctLabReferrals) },
    { name: 'Other Services', amount: otherServicesEarnings, percentage: parseFloat(pctOtherServices) }
  ];

  return sendSuccess(res, 'Doctor earnings insights retrieved', {
    summary: {
      totalEarnings,
      totalEarningsChange: '+0.0% from last month',
      consultationEarnings,
      procedureEarnings,
      otherEarnings,
      totalAppointments,
      paidAppointments,
      averageEarningPerAppointment,
      pendingPayout,
      nextPayoutDate: '05 Aug 2026',
      growthMessage: "You're doing great! Keep up the excellent work."
    },
    trend,
    breakdown,
    recentTransactions
  });
});

const requestPayout = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const DoctorEarning = require('../schemas/doctorEarning.schema');
  const { AppError } = require('../../../common/utils/AppError');
  const { HTTP_STATUS } = require('../../../common/constants/httpStatus');

  // Find all earnings that are PENDING or READY_FOR_PAYOUT
  const earnings = await DoctorEarning.find({
    doctorId,
    status: { $in: ['PENDING', 'READY_FOR_PAYOUT'] }
  });

  if (earnings.length === 0) {
    throw new AppError('No eligible payout balance found.', HTTP_STATUS.BAD_REQUEST);
  }

  // Mark pending earnings as READY_FOR_PAYOUT to request admin
  await DoctorEarning.updateMany(
    { doctorId, status: 'PENDING' },
    { $set: { status: 'READY_FOR_PAYOUT' } }
  );

  return sendSuccess(res, 'Payout request submitted successfully.');
});

const getDoctorPayouts = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const payouts = await settlementsRepository.findDoctorPayouts(doctorId);
  return sendSuccess(res, 'Doctor payouts retrieved', { payouts });
});

const markPaid = asyncHandler(async (req, res) => {
  const payout = await settlementsService.markDoctorPayoutPaid({
    ...req.body,
    requester: req.user,
    req
  });
  return sendSuccess(res, 'Payout marked as PAID', { payout });
});

const generate = asyncHandler(async (req, res) => {
  const result = await settlementsService.runAutomaticSettlement({
    organizationId: req.body.organizationId
  });
  return sendSuccess(res, 'Automatic settlement run completed', result);
});

const getSettlementsHistory = asyncHandler(async (req, res) => {
  const earnings = await settlementsRepository.listDoctorEarnings({ status: 'PAID' });
  return sendSuccess(res, 'Settlements history retrieved', { earnings });
});

const updateDoctorPayoutSettings = asyncHandler(async (req, res) => {
  const settings = await settlementsRepository.upsertDoctorPayoutSettings(
    req.params.doctorId,
    req.body
  );
  return sendSuccess(res, 'Doctor payout settings updated', { settings });
});

const getDoctorPayoutSettings = asyncHandler(async (req, res) => {
  let settings = await settlementsRepository.getDoctorPayoutSettings(req.params.doctorId);
  if (!settings) {
    settings = await settlementsRepository.upsertDoctorPayoutSettings(req.params.doctorId, {});
  }
  return sendSuccess(res, 'Doctor payout settings retrieved', { settings });
});

const updateOrgFinancialSettings = asyncHandler(async (req, res) => {
  const settings = await settlementsRepository.upsertOrganizationFinancialSettings(
    req.params.organizationId,
    req.body
  );
  return sendSuccess(res, 'Organization financial settings updated', { settings });
});

const getOrgFinancialSettings = asyncHandler(async (req, res) => {
  let settings = await settlementsRepository.getOrganizationFinancialSettings(req.params.organizationId);
  if (!settings) {
    settings = await settlementsRepository.upsertOrganizationFinancialSettings(req.params.organizationId, {});
  }
  return sendSuccess(res, 'Organization financial settings retrieved', { settings });
});

module.exports = {
  getOrganizationEarnings,
  getDoctorEarnings,
  requestPayout,
  getDoctorPayouts,
  markPaid,
  generate,
  getSettlementsHistory,
  updateDoctorPayoutSettings,
  getDoctorPayoutSettings,
  updateOrgFinancialSettings,
  getOrgFinancialSettings
};
