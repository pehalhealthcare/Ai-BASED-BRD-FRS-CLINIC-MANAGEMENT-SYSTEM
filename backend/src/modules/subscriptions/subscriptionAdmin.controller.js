const mongoose = require('mongoose');
const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const Clinic = require('../clinics/clinic.model');
const SubscriptionPlan = require('./subscriptionPlan.model');
const SubscriptionBilling = require('./subscriptionBilling.model');
const { createAuditLog } = require('../audit/audit.service');
const { resolveClinicContext } = require('../../common/utils/clinicContext');

// Helper to calculate unused value
const calculateUnusedValue = (currentPlan, subscription) => {
  if (!currentPlan || !subscription || !subscription.expiryDate || !subscription.startDate) {
    return 0;
  }
  const now = new Date();
  const expiry = new Date(subscription.expiryDate);
  const start = new Date(subscription.startDate);
  
  if (expiry <= now) return 0;
  
  const totalDays = Math.ceil((expiry - start) / (1000 * 60 * 60 * 24)) || 30;
  const remainingDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) || 0;
  
  const price = subscription.billingCycle === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly;
  const unusedValue = (price / totalDays) * remainingDays;
  return Math.max(0, Math.min(price, Math.round(unusedValue)));
};

// 1. Get current subscription & stats
const getCurrentSubscription = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Count doctor, staff, patient limits
  const Doctor = mongoose.model('Doctor');
  const Staff = mongoose.model('Staff');
  const ClinicMembership = mongoose.model('ClinicMembership');

  const doctorsCount = await Doctor.countDocuments({
    $or: [{ clinicId }, { assignedClinics: clinicId }],
    isDeleted: { $ne: true },
    approvalStatus: 'approved'
  });

  const staffCount = await Staff.countDocuments({
    $or: [{ clinicId }, { assignedClinics: clinicId }],
    isDeleted: { $ne: true }
  });

  const patientsCount = await ClinicMembership.countDocuments({
    clinicId,
    status: 'active'
  });

  // Expiry calculation
  let remainingDays = 0;
  if (clinic.subscription?.expiryDate) {
    const diffTime = new Date(clinic.subscription.expiryDate) - new Date();
    remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return sendSuccess(res, 'Current subscription retrieved successfully', {
    subscription: clinic.subscription,
    usage: {
      doctors: doctorsCount,
      staff: staffCount,
      patients: patientsCount,
      storageUsedMb: 125, // Mock value
      remainingDays
    }
  });
});

// 2. Preview Upgrade plan
const previewUpgrade = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const { targetPlanId, billingCycle } = req.body;
  if (!targetPlanId || !billingCycle) {
    throw new AppError('Target plan and billing cycle are required.', HTTP_STATUS.BAD_REQUEST);
  }

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  const currentPlan = clinic.subscription.planId;
  const targetPlan = await SubscriptionPlan.findById(targetPlanId);
  if (!targetPlan) {
    throw new AppError('Selected plan not found.', HTTP_STATUS.NOT_FOUND);
  }

  const targetPlanPrice = billingCycle === 'yearly' ? targetPlan.priceYearly : targetPlan.priceMonthly;
  const currentPlanPrice = currentPlan 
    ? (clinic.subscription.billingCycle === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly)
    : 0;

  // Validation: Only upgrades allowed
  if (targetPlanPrice <= currentPlanPrice) {
    throw new AppError('Downgrades or same tier changes are not permitted during active subscription.', HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate remaining credit
  const unusedValue = currentPlan ? calculateUnusedValue(currentPlan, clinic.subscription) : 0;
  const finalPayable = Math.max(0, targetPlanPrice - unusedValue);

  return sendSuccess(res, 'Upgrade preview generated successfully', {
    currentPlanCredit: unusedValue,
    selectedPlanPrice: targetPlanPrice,
    creditApplied: unusedValue,
    finalPayableAmount: finalPayable
  });
});

// 3. Process Upgrade
const upgradeSubscription = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const { targetPlanId, billingCycle, paymentMethod } = req.body;
  if (!targetPlanId || !billingCycle) {
    throw new AppError('Target plan and billing cycle are required.', HTTP_STATUS.BAD_REQUEST);
  }

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  const currentPlan = clinic.subscription.planId;
  const targetPlan = await SubscriptionPlan.findById(targetPlanId);
  if (!targetPlan) {
    throw new AppError('Selected plan not found.', HTTP_STATUS.NOT_FOUND);
  }

  const targetPlanPrice = billingCycle === 'yearly' ? targetPlan.priceYearly : targetPlan.priceMonthly;
  const currentPlanPrice = currentPlan 
    ? (clinic.subscription.billingCycle === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly)
    : 0;

  if (targetPlanPrice <= currentPlanPrice) {
    throw new AppError('Downgrades are not allowed.', HTTP_STATUS.BAD_REQUEST);
  }

  const unusedValue = currentPlan ? calculateUnusedValue(currentPlan, clinic.subscription) : 0;
  const finalPayable = Math.max(0, targetPlanPrice - unusedValue);

  // Perform transaction & subscription update
  const invoiceNumber = `INV-${Date.now()}`;
  const periodDays = billingCycle === 'yearly' ? 365 : 30;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + periodDays);

  const prevPlanCode = currentPlan ? currentPlan.code : 'NONE';

  // Apply updates to Clinic
  clinic.subscription = {
    planId: targetPlan._id,
    billingCycle,
    startDate: new Date(),
    renewalDate: expiryDate,
    expiryDate,
    status: 'Active',
    autoRecharge: clinic.subscription.autoRecharge,
    paymentMethod: paymentMethod ? {
      last4: paymentMethod.last4 || '4242',
      brand: paymentMethod.brand || 'Visa',
      token: paymentMethod.token || `TOK_${Date.now()}`
    } : clinic.subscription.paymentMethod
  };

  await clinic.save();

  // Create billing record
  await SubscriptionBilling.create({
    invoiceNumber,
    clinicId,
    planId: targetPlan._id,
    paymentDate: new Date(),
    billingPeriod: `${new Date().toLocaleDateString()} - ${expiryDate.toLocaleDateString()}`,
    amountPaid: finalPayable,
    creditApplied: unusedValue,
    paymentMethod: paymentMethod ? `${paymentMethod.brand} ending in ${paymentMethod.last4}` : 'Saved Payment Method',
    paymentStatus: 'success',
    transactionId: `TXN-${Date.now()}`
  });

  // Log Audit Action
  await createAuditLog({
    actorUserId: req.user._id,
    action: 'subscription_upgraded',
    entity: 'Clinic',
    entityId: clinicId,
    metadata: {
      previousPlan: prevPlanCode,
      newPlan: targetPlan.code,
      amountPaid: finalPayable,
      creditApplied: unusedValue
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return sendSuccess(res, 'Subscription upgraded successfully', {
    subscription: clinic.subscription
  });
});

// 4. Toggle Auto Recharge
const toggleAutoRecharge = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const { autoRecharge, paymentMethod } = req.body;

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  clinic.subscription.autoRecharge = !!autoRecharge;
  if (autoRecharge && paymentMethod) {
    clinic.subscription.paymentMethod = {
      last4: paymentMethod.last4 || '4242',
      brand: paymentMethod.brand || 'Visa',
      token: paymentMethod.token || `TOK_${Date.now()}`
    };
  }

  await clinic.save();

  // Log Audit
  await createAuditLog({
    actorUserId: req.user._id,
    action: autoRecharge ? 'auto_recharge_enabled' : 'auto_recharge_disabled',
    entity: 'Clinic',
    entityId: clinicId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return sendSuccess(res, `Auto Recharge ${autoRecharge ? 'enabled' : 'disabled'} successfully`, {
    subscription: clinic.subscription
  });
});

// 5. Get billing history
const getBillingHistory = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const history = await SubscriptionBilling.find({ clinicId })
    .populate('planId')
    .sort({ paymentDate: -1 });

  return sendSuccess(res, 'Billing history retrieved successfully', { history });
});

// 6. Manual Renew subscription
const renewSubscription = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  const plan = clinic.subscription.planId;
  if (!plan) {
    throw new AppError('No plan to renew.', HTTP_STATUS.BAD_REQUEST);
  }

  const amount = clinic.subscription.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const periodDays = clinic.subscription.billingCycle === 'yearly' ? 365 : 30;

  // Extend expiry date
  let baseDate = new Date();
  if (clinic.subscription.expiryDate && new Date(clinic.subscription.expiryDate) > new Date()) {
    baseDate = new Date(clinic.subscription.expiryDate);
  }

  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + periodDays);

  clinic.subscription.expiryDate = newExpiry;
  clinic.subscription.renewalDate = newExpiry;
  clinic.subscription.status = 'Active';

  await clinic.save();

  // Create billing record
  const invoiceNumber = `INV-REN-${Date.now()}`;
  await SubscriptionBilling.create({
    invoiceNumber,
    clinicId,
    planId: plan._id,
    paymentDate: new Date(),
    billingPeriod: `${baseDate.toLocaleDateString()} - ${newExpiry.toLocaleDateString()}`,
    amountPaid: amount,
    creditApplied: 0,
    paymentMethod: 'Manual Payment',
    paymentStatus: 'success',
    transactionId: `TXN-${Date.now()}`
  });

  // Log Audit Action
  await createAuditLog({
    actorUserId: req.user._id,
    action: 'subscription_renewed',
    entity: 'Clinic',
    entityId: clinicId,
    metadata: {
      planCode: plan.code,
      amountPaid: amount
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return sendSuccess(res, 'Subscription renewed successfully', {
    subscription: clinic.subscription
  });
});

module.exports = {
  getCurrentSubscription,
  previewUpgrade,
  upgradeSubscription,
  toggleAutoRecharge,
  getBillingHistory,
  renewSubscription
};
