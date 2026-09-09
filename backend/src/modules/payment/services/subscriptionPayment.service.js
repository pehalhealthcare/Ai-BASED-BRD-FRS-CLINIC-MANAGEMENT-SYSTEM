const mongoose = require('mongoose');
const SubscriptionPayment = require('../models/subscriptionPayment.model');
const PaymentSettings = require('../models/paymentSettings.model');
const Clinic = require('../../clinics/clinic.model');
const User = require('../../users/user.model');
const AuditLog = require('../../audit/audit.model');
const { AppError } = require('../../../common/utils/AppError');
const { HTTP_STATUS } = require('../../../common/constants/httpStatus');
const { logger } = require('../../../common/utils/logger');

// Lazy-require SubscriptionPlan to avoid circular dependencies
const getSubscriptionPlanModel = () => {
  return mongoose.models.SubscriptionPlan || require('../../subscriptions/subscriptionPlan.model');
};

/**
 * Validates UTR / Transaction reference format
 */
const validateUtr = (utr) => {
  if (!utr || typeof utr !== 'string') return false;
  const clean = utr.trim();
  // Valid alphanumeric reference between 6 and 40 characters
  return /^[a-zA-Z0-9\-_]{6,40}$/.test(clean);
};

const { generateDynamicUpiQr, getSanitizedActiveDetails } = require('./paymentSettings.service');
const { uploadBase64 } = require('../../../common/utils/gridFsStorage.service');

/**
 * Initiates a payment attempt for a clinic: validates plan, calculates authentic price,
 * generates dynamic amount-encoded UPI QR code and fetches active payment settings.
 */
const initiatePaymentAttempt = async ({ clinicId, planId, billingCycle = 'monthly' }) => {
  if (!clinicId) {
    throw new AppError('Clinic ID is required.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!planId) {
    throw new AppError('Plan ID is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError('Clinic record not found.', HTTP_STATUS.NOT_FOUND);
  }

  const SubscriptionPlan = getSubscriptionPlanModel();
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Selected subscription plan not found.', HTTP_STATUS.NOT_FOUND);
  }

  let payableAmount = 0;
  if (billingCycle === 'yearly') {
    payableAmount = plan.price?.yearly ?? plan.priceYearly ?? (plan.price?.monthly ? plan.price.monthly * 10 : (plan.price || 9999) * 10);
  } else {
    payableAmount = plan.price?.monthly ?? plan.priceMonthly ?? plan.price ?? 9999;
  }

  // Get active sanitized payment settings and dynamic QR for this amount
  const paymentDetails = await getSanitizedActiveDetails({
    amount: payableAmount,
    clinicCode: clinic.code,
    planName: plan.name
  });

  // Fetch complete payment attempts history for this clinic
  const history = await SubscriptionPayment.find({ clinicId })
    .sort({ attemptNumber: -1, createdAt: -1 })
    .populate('planId', 'name code price priceMonthly priceYearly')
    .populate('verifiedBy', 'name email')
    .populate('rejectedBy', 'name email');

  const latestPayment = history[0] || null;

  return {
    clinic: {
      _id: clinic._id,
      name: clinic.name,
      code: clinic.code,
      paymentStatus: clinic.paymentStatus,
      approvalStatus: clinic.approvalStatus,
      rejectionReason: clinic.rejectionReason,
      rejectionComments: clinic.rejectionComments
    },
    plan: {
      _id: plan._id,
      name: plan.name,
      code: plan.code,
      billingCycle,
      amount: payableAmount
    },
    paymentDetails,
    latestPayment,
    paymentHistory: history
  };
};

/**
 * Submit a payment attempt by Clinic Admin or onboarding flow
 */
const submitPaymentAttempt = async ({
  clinicId,
  planId,
  billingCycle = 'monthly',
  utr,
  transactionId = '',
  paymentProofUrl = '',
  ipAddress = '',
  userAgent = '',
  metadata = {}
}) => {
  if (!clinicId) {
    throw new AppError('Clinic ID is required for subscription payment.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!planId) {
    throw new AppError('Plan ID is required.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!validateUtr(utr)) {
    throw new AppError('Invalid UTR / Transaction Reference format. Must be at least 6 alphanumeric characters.', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanUtr = utr.trim().toUpperCase();

  // 1. Prevent duplicate UTR submission across verified or pending payments
  const existingUtr = await SubscriptionPayment.findOne({
    utr: cleanUtr,
    status: { $in: ['PENDING_VERIFICATION', 'VERIFIED'] }
  });

  if (existingUtr) {
    throw new AppError(
      'This transaction reference / UTR has already been submitted. Please verify the transaction details or contact support.',
      HTTP_STATUS.CONFLICT
    );
  }

  // 2. Fetch Clinic
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError('Clinic record not found.', HTTP_STATUS.NOT_FOUND);
  }

  // 3. Fetch Plan and calculate authentic server-side price
  const SubscriptionPlan = getSubscriptionPlanModel();
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Selected subscription plan not found.', HTTP_STATUS.NOT_FOUND);
  }

  let payableAmount = 0;
  if (billingCycle === 'yearly') {
    payableAmount = plan.price?.yearly ?? plan.priceYearly ?? (plan.price?.monthly ? plan.price.monthly * 10 : (plan.price || 9999) * 10);
  } else {
    payableAmount = plan.price?.monthly ?? plan.priceMonthly ?? plan.price ?? 9999;
  }

  // 4. Handle Payment Proof storage (GridFS if base64 data URI)
  let resolvedProofUrl = paymentProofUrl || '';
  if (resolvedProofUrl && typeof resolvedProofUrl === 'string' && resolvedProofUrl.startsWith('data:')) {
    try {
      resolvedProofUrl = await uploadBase64(resolvedProofUrl, `payment_proof_${cleanUtr}.png`);
    } catch (err) {
      console.warn('Failed to upload proof to GridFS, keeping raw proof data:', err.message);
    }
  }

  // 5. Calculate attempt number for this clinic
  const priorAttemptsCount = await SubscriptionPayment.countDocuments({ clinicId });
  const attemptNumber = priorAttemptsCount + 1;

  // 6. Fetch active payment settings version snapshot
  const activeSettings = await PaymentSettings.findOne({ isActive: true });
  const paymentConfigurationVersion = activeSettings?.version || 1;

  // 7. Generate Transaction ID if missing
  const cleanTxnId = transactionId ? transactionId.trim() : `TXN${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

  // 8. Create Payment Attempt
  const paymentAttempt = await SubscriptionPayment.create({
    clinicId,
    planId: plan._id,
    billingCycle,
    amount: payableAmount,
    currency: 'INR',
    utr: cleanUtr,
    transactionId: cleanTxnId,
    paymentProofUrl: resolvedProofUrl,
    status: 'PENDING_VERIFICATION',
    attemptNumber,
    paymentConfigurationVersion,
    submittedAt: new Date(),
    ipAddress,
    userAgent,
    metadata
  });

  // 9. Update Clinic Subscription & clear any prior rejection notes
  clinic.subscription = clinic.subscription || {};
  clinic.subscription.planId = plan._id;
  clinic.subscription.billingCycle = billingCycle;
  clinic.subscription.status = 'Pending Approval';
  clinic.paymentStatus = 'PENDING_VERIFICATION';
  clinic.rejectionReason = '';
  clinic.rejectionComments = '';
  if (clinic.approvalStatus === 'rejected') {
    clinic.approvalStatus = 'pending_approval';
  }
  await clinic.save();

  // 10. Write audit log
  await AuditLog.create({
    actorUserId: clinic._id,
    action: 'SUBSCRIPTION_PAYMENT_SUBMITTED',
    entity: 'SubscriptionPayment',
    entityId: paymentAttempt._id,
    metadata: {
      details: `Payment attempt #${attemptNumber} submitted with UTR ${cleanUtr} for plan ${plan.name} (₹${payableAmount})`,
      utr: cleanUtr,
      amount: payableAmount,
      attemptNumber
    }
  });

  logger.info(`[Payment] Payment attempt #${attemptNumber} submitted for clinic ${clinic.name} (${cleanUtr})`);

  return paymentAttempt;
};

/**
 * Super Admin confirms and verifies payment
 */
const verifyPaymentAttempt = async (paymentId, superAdminUser, { notes = '' } = {}) => {
  if (!paymentId) {
    throw new AppError('Payment ID is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const payment = await SubscriptionPayment.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment record not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (payment.status === 'VERIFIED') {
    throw new AppError('This payment attempt has already been verified.', HTTP_STATUS.BAD_REQUEST);
  }

  const clinic = await Clinic.findById(payment.clinicId);
  if (!clinic) {
    throw new AppError('Associated clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  const SubscriptionPlan = getSubscriptionPlanModel();
  const plan = await SubscriptionPlan.findById(payment.planId);

  // 1. Mark payment verified
  payment.status = 'VERIFIED';
  payment.verifiedAt = new Date();
  payment.verifiedBy = superAdminUser?._id || null;
  payment.rejectionReason = '';
  if (notes) {
    payment.verificationNotes = String(notes).trim();
  }
  await payment.save();

  // 2. Calculate subscription dates
  const startDate = new Date();
  const durationDays = payment.billingCycle === 'yearly' ? 365 : 30;
  const expiryDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // 3. Update Clinic Subscription & Payment Status (Decoupled from Clinic Approval)
  clinic.subscription = clinic.subscription || {};
  clinic.subscription.planId = payment.planId;
  clinic.subscription.billingCycle = payment.billingCycle;
  clinic.subscription.startDate = startDate;
  clinic.subscription.renewalDate = expiryDate;
  clinic.subscription.expiryDate = expiryDate;
  clinic.subscription.status = 'Active';
  clinic.paymentStatus = 'VERIFIED';

  // Do NOT automatically approve clinic upon payment verification.
  // Clinic remains in 'pending_approval' until Super Admin conducts clinic approval review.
  await clinic.save();

  // 5. Audit Log
  await AuditLog.create({
    actorUserId: superAdminUser?._id,
    action: 'SUBSCRIPTION_PAYMENT_VERIFIED',
    entity: 'SubscriptionPayment',
    entityId: payment._id,
    metadata: {
      details: `Verified payment attempt #${payment.attemptNumber} (UTR: ${payment.utr}) for clinic ${clinic.name}. Payment verified; clinic awaiting approval.`,
      utr: payment.utr,
      amount: payment.amount,
      clinicId: clinic._id
    }
  });

  logger.info(`[Payment] Super Admin verified payment ${payment._id} for clinic ${clinic.name}`);

  return { payment, clinic };
};

/**
 * Super Admin rejects payment attempt with mandatory reason
 */
const rejectPaymentAttempt = async (paymentId, superAdminUser, { reason, notes = '' }) => {
  if (!paymentId) {
    throw new AppError('Payment ID is required.', HTTP_STATUS.BAD_REQUEST);
  }
  if (!reason || !String(reason).trim()) {
    throw new AppError('A valid rejection reason is required.', HTTP_STATUS.BAD_REQUEST);
  }

  const payment = await SubscriptionPayment.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment record not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (payment.status === 'VERIFIED') {
    throw new AppError('A verified payment cannot be rejected.', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanReason = String(reason).trim();
  const cleanNotes = String(notes || '').trim();

  // 1. Mark payment as REJECTED / REPAYMENT_REQUIRED
  payment.status = 'REJECTED';
  payment.rejectionReason = cleanReason;
  payment.rejectionNotes = cleanNotes;
  payment.rejectedAt = new Date();
  payment.rejectedBy = superAdminUser?._id || null;
  await payment.save();

  // 2. Update Clinic state to reflect Repayment Required
  const clinic = await Clinic.findById(payment.clinicId);
  if (clinic) {
    clinic.paymentStatus = 'REJECTED';
    clinic.rejectionReason = `Payment Rejected: ${cleanReason}`;
    if (cleanNotes) clinic.rejectionComments = cleanNotes;
    if (clinic.subscription) {
      clinic.subscription.status = 'Pending Approval';
    }
    await clinic.save();
  }

  // 3. Audit Log
  await AuditLog.create({
    actorUserId: superAdminUser?._id,
    action: 'SUBSCRIPTION_PAYMENT_REJECTED',
    entity: 'SubscriptionPayment',
    entityId: payment._id,
    metadata: {
      details: `Rejected payment attempt #${payment.attemptNumber} (UTR: ${payment.utr}). Reason: ${cleanReason}. Repayment Required.`,
      utr: payment.utr,
      reason: cleanReason,
      notes: cleanNotes
    }
  });

  logger.info(`[Payment] Super Admin rejected payment ${payment._id}. Reason: ${cleanReason}`);

  return { payment, clinic };
};

/**
 * List payments with filters & search
 */
const listPayments = async (query = {}) => {
  const {
    status,
    search,
    page = 1,
    limit = 20,
    startDate,
    endDate
  } = query;

  const filter = {};

  if (status && status !== 'ALL') {
    if (status === 'PENDING') {
      filter.status = 'PENDING_VERIFICATION';
    } else {
      filter.status = status;
    }
  }

  if (startDate || endDate) {
    filter.submittedAt = {};
    if (startDate) filter.submittedAt.$gte = new Date(startDate);
    if (endDate) filter.submittedAt.$lte = new Date(endDate);
  }

  let clinicMatchIds = null;
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    const matchedClinics = await Clinic.find({
      $or: [
        { name: searchRegex },
        { code: searchRegex },
        { 'ownerDetails.name': searchRegex },
        { 'ownerDetails.email': searchRegex },
        { 'ownerDetails.phone': searchRegex }
      ]
    }).select('_id');

    clinicMatchIds = matchedClinics.map(c => c._id);

    filter.$or = [
      { utr: searchRegex },
      { transactionId: searchRegex },
      { clinicId: { $in: clinicMatchIds } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const SubscriptionPlan = getSubscriptionPlanModel();

  const [payments, totalCount] = await Promise.all([
    SubscriptionPayment.find(filter)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('clinicId', 'name code image phone ownerDetails approvalStatus isActive subscription')
      .populate('planId', 'name code price priceMonthly priceYearly')
      .populate('verifiedBy', 'name email')
      .populate('rejectedBy', 'name email'),
    SubscriptionPayment.countDocuments(filter)
  ]);

  // Aggregate pending count
  const pendingCount = await SubscriptionPayment.countDocuments({ status: 'PENDING_VERIFICATION' });
  const verifiedCount = await SubscriptionPayment.countDocuments({ status: 'VERIFIED' });
  const rejectedCount = await SubscriptionPayment.countDocuments({ status: 'REJECTED' });

  return {
    payments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum)
    },
    counts: {
      pending: pendingCount,
      verified: verifiedCount,
      rejected: rejectedCount,
      total: totalCount
    }
  };
};

/**
 * Get single payment details
 */
const getPaymentById = async (paymentId) => {
  const SubscriptionPlan = getSubscriptionPlanModel();
  const payment = await SubscriptionPayment.findById(paymentId)
    .populate({
      path: 'clinicId',
      populate: { path: 'subscription.planId' }
    })
    .populate('planId')
    .populate('verifiedBy', 'name email')
    .populate('rejectedBy', 'name email');

  if (!payment) {
    throw new AppError('Payment not found.', HTTP_STATUS.NOT_FOUND);
  }

  const clinicId = payment.clinicId?._id || payment.clinicId;

  // Get other attempts for this clinic
  const otherAttempts = await SubscriptionPayment.find({
    clinicId,
    _id: { $ne: payment._id }
  })
    .sort({ attemptNumber: -1, createdAt: -1 })
    .populate('planId')
    .populate('verifiedBy', 'name email')
    .populate('rejectedBy', 'name email');

  // Fetch related audit logs for Activity Log tab
  let auditLogs = [];
  try {
    auditLogs = await AuditLog.find({
      $or: [
        { entityId: payment._id },
        { entityId: clinicId },
        { 'metadata.clinicId': clinicId },
        { 'metadata.utr': payment.utr }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('actorUserId', 'name role email');
  } catch (err) {
    console.warn('Could not fetch audit logs for payment:', err.message);
  }

  return { payment, otherAttempts, auditLogs };
};

/**
 * Get all payment attempts for a specific clinic (for Clinic 360° Payments Tab)
 */
const getClinicPaymentHistory = async (clinicId) => {
  const SubscriptionPlan = getSubscriptionPlanModel();
  const payments = await SubscriptionPayment.find({ clinicId })
    .sort({ attemptNumber: -1, createdAt: -1 })
    .populate('planId', 'name code price')
    .populate('verifiedBy', 'name email')
    .populate('rejectedBy', 'name email');

  const totalPaid = payments
    .filter(p => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingCount = payments.filter(p => p.status === 'PENDING_VERIFICATION').length;
  const rejectedCount = payments.filter(p => p.status === 'REJECTED').length;

  return {
    payments,
    summary: {
      totalAttempts: payments.length,
      totalPaid,
      pendingCount,
      rejectedCount,
      hasPending: pendingCount > 0,
      repaymentRequired: rejectedCount > 0 && pendingCount === 0
    }
  };
};

module.exports = {
  initiatePaymentAttempt,
  submitPaymentAttempt,
  verifyPaymentAttempt,
  rejectPaymentAttempt,
  listPayments,
  getPaymentById,
  getClinicPaymentHistory,
  validateUtr
};
