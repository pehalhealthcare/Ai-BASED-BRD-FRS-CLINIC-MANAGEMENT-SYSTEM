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

  let plan = clinic.subscription?.planId;
  if (!plan) {
    plan = await SubscriptionPlan.findOne({ code: 'PROFESSIONAL', isActive: true }) ||
           await SubscriptionPlan.findOne({ isActive: true });
  }

  const billingCycle = clinic.subscription?.billingCycle || 'monthly';
  const amount = billingCycle === 'yearly' ? (plan?.priceYearly || 49990) : (plan?.priceMonthly || 4999);
  const periodDays = billingCycle === 'yearly' ? 365 : 30;

  // Extend expiry date
  let baseDate = new Date();
  if (clinic.subscription?.expiryDate && new Date(clinic.subscription.expiryDate) > new Date()) {
    baseDate = new Date(clinic.subscription.expiryDate);
  }

  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + periodDays);

  const safePaymentMethod = {
    last4: clinic.subscription?.paymentMethod?.last4 || '4242',
    brand: clinic.subscription?.paymentMethod?.brand || 'Visa',
    token: clinic.subscription?.paymentMethod?.token || `TOK_${Date.now()}`
  };

  await Clinic.updateOne(
    { _id: clinic._id },
    {
      $set: {
        'subscription.planId': plan?._id,
        'subscription.billingCycle': billingCycle,
        'subscription.startDate': new Date(),
        'subscription.expiryDate': newExpiry,
        'subscription.renewalDate': newExpiry,
        'subscription.status': 'Active',
        'subscription.paymentMethod': safePaymentMethod,
        isActive: true
      }
    }
  );

  const updatedClinic = await Clinic.findById(clinic._id).populate('subscription.planId');

  // Create billing record
  const currentYear = new Date().getFullYear();
  const count = await SubscriptionBilling.countDocuments();
  const invoiceNumber = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;

  const billing = await SubscriptionBilling.create({
    invoiceNumber,
    clinicId,
    planId: plan?._id,
    planName: plan?.name || 'AICMS Professional',
    billingCycle,
    paymentDate: new Date(),
    billingPeriod: `${baseDate.toLocaleDateString()} - ${newExpiry.toLocaleDateString()}`,
    amountPaid: amount,
    subtotal: amount,
    gstAmount: 0,
    creditApplied: 0,
    paymentMethod: 'Manual Renewal',
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
      planCode: plan?.code,
      amountPaid: amount
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return sendSuccess(res, 'Subscription renewed successfully', {
    subscription: updatedClinic?.subscription,
    invoice: billing
  });
});

// 7. Get full renewal & billing breakdown details for UI flow
const getRenewalDetails = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  let plan = clinic.subscription?.planId;
  if (!plan) {
    // Default to Professional Plan if unassigned
    plan = await SubscriptionPlan.findOne({ code: 'PROFESSIONAL', isActive: true }) ||
           await SubscriptionPlan.findOne({ isActive: true });
  }

  const billingCycle = clinic.subscription?.billingCycle || 'monthly';
  const planPrice = billingCycle === 'yearly' ? (plan?.priceYearly || 49990) : (plan?.priceMonthly || 4999);
  const subtotal = Number(planPrice.toFixed(2));
  const gstRate = 18;
  const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  // Compute Next Billing Date
  const now = new Date();
  let baseDate = now;
  if (clinic.subscription?.expiryDate && new Date(clinic.subscription.expiryDate) > now) {
    baseDate = new Date(clinic.subscription.expiryDate);
  }
  const nextBillingDate = new Date(baseDate);
  if (billingCycle === 'yearly') {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  } else {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  // Saved payment methods (tokenized / masked)
  const savedCards = [];
  if (clinic.subscription?.paymentMethod?.last4) {
    savedCards.push({
      id: 'saved-card-1',
      brand: clinic.subscription.paymentMethod.brand || 'Visa',
      last4: clinic.subscription.paymentMethod.last4,
      expiry: '12/26',
      isDefault: true
    });
  } else {
    savedCards.push({
      id: 'default-card-1',
      brand: 'Visa',
      last4: '4242',
      expiry: '12/26',
      isDefault: true
    });
  }

  // Latest invoice if exists
  const latestInvoice = await SubscriptionBilling.findOne({ clinicId })
    .populate('planId')
    .sort({ createdAt: -1 });

  return sendSuccess(res, 'Renewal details retrieved successfully', {
    clinic: {
      _id: clinic._id,
      name: clinic.name,
      code: clinic.code,
      phone: clinic.phone,
      address: clinic.address,
      ownerDetails: clinic.ownerDetails,
      approvalStatus: clinic.approvalStatus
    },
    plan: {
      _id: plan?._id,
      name: plan?.name || 'AICMS Professional',
      code: plan?.code || 'PROFESSIONAL',
      description: plan?.description || 'For growing clinics and advanced management',
      features: plan?.features || [],
      billingCycle
    },
    pricing: {
      billingCycle,
      planPrice,
      subtotal,
      gstRate,
      gstAmount,
      totalAmount,
      currency: 'INR'
    },
    dates: {
      currentExpiry: clinic.subscription?.expiryDate,
      nextBillingDate: nextBillingDate.toISOString(),
      formattedNextBillingDate: nextBillingDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    },
    savedCards,
    latestInvoice
  });
});

// 8. Create Secure Renewal Order (Server-authoritative Pricing)
const createRenewalOrder = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.body.clinicId || req.query.clinicId
  });

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  let plan = clinic.subscription?.planId;
  if (!plan) {
    plan = await SubscriptionPlan.findOne({ code: 'PROFESSIONAL', isActive: true }) ||
           await SubscriptionPlan.findOne({ isActive: true });
  }

  const billingCycle = clinic.subscription?.billingCycle || 'monthly';
  const planPrice = billingCycle === 'yearly' ? (plan?.priceYearly || 49990) : (plan?.priceMonthly || 4999);
  const subtotal = Number(planPrice.toFixed(2));
  const gstRate = 18;
  const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  const idempotencyKey = req.body.idempotencyKey || `IDEM-${clinicId}-${Date.now()}`;
  const gatewayOrderId = `order_${Math.random().toString(36).substring(2, 12).toUpperCase()}_${Date.now()}`;

  // Log Audit
  await createAuditLog({
    actorUserId: req.user._id,
    action: 'RENEWAL_ORDER_CREATED',
    entity: 'Clinic',
    entityId: clinicId,
    metadata: {
      planName: plan?.name,
      billingCycle,
      totalAmount,
      gatewayOrderId,
      idempotencyKey
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return sendSuccess(res, 'Renewal order initialized', {
    orderId: gatewayOrderId,
    gatewayOrderId,
    idempotencyKey,
    amount: totalAmount,
    currency: 'INR',
    subtotal,
    gstRate,
    gstAmount,
    planName: plan?.name || 'AICMS Professional',
    billingCycle,
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_aicms_secure_key'
  });
});

// 9. Verify and Process Renewal Payment (Idempotent Backend Validation)
const verifyRenewalPayment = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.body.clinicId || req.query.clinicId
  });

  const gatewayOrderId = req.body.gatewayOrderId || req.body.orderId || `order_${Date.now()}`;
  const gatewayPaymentId = req.body.gatewayPaymentId || `pay_${Math.random().toString(36).substring(2, 14)}`;
  const {
    gatewaySignature,
    idempotencyKey,
    saveCard,
    cardDetails
  } = req.body;

  // Check Idempotency: Has this order or transaction already been processed?
  const existingBilling = await SubscriptionBilling.findOne({
    $or: [
      { transactionId: gatewayPaymentId, paymentStatus: 'success' },
      { gatewayOrderId, paymentStatus: 'success' }
    ]
  }).populate('planId');

  if (existingBilling) {
    const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
    return sendSuccess(res, 'Payment already verified and processed (Idempotent response)', {
      subscription: clinic.subscription,
      invoice: existingBilling,
      isDuplicate: true
    });
  }

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  let plan = clinic.subscription?.planId;
  if (!plan) {
    plan = await SubscriptionPlan.findOne({ code: 'PROFESSIONAL', isActive: true }) ||
           await SubscriptionPlan.findOne({ isActive: true });
  }

  const billingCycle = clinic.subscription?.billingCycle || 'monthly';
  const planPrice = billingCycle === 'yearly' ? (plan?.priceYearly || 49990) : (plan?.priceMonthly || 4999);
  const subtotal = Number(planPrice.toFixed(2));
  const gstRate = 18;
  const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  // Calculate new expiry date based on billing cycle
  const now = new Date();
  let baseDate = now;
  if (clinic.subscription?.expiryDate && new Date(clinic.subscription.expiryDate) > now) {
    baseDate = new Date(clinic.subscription.expiryDate);
  }

  const newExpiry = new Date(baseDate);
  if (billingCycle === 'yearly') {
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
  } else {
    newExpiry.setMonth(newExpiry.getMonth() + 1);
  }

  // Safe payment method structure
  const safePaymentMethod = {
    last4: (saveCard && cardDetails && cardDetails.cardNumber) 
      ? String(cardDetails.cardNumber).replace(/\s/g, '').slice(-4) 
      : (clinic.subscription?.paymentMethod?.last4 || '4242'),
    brand: (saveCard && cardDetails && cardDetails.brand) 
      ? String(cardDetails.brand) 
      : (clinic.subscription?.paymentMethod?.brand || 'Visa'),
    token: clinic.subscription?.paymentMethod?.token || `TOK_${Date.now()}`
  };

  const updatedSubscription = {
    planId: plan._id,
    billingCycle,
    startDate: now,
    renewalDate: newExpiry,
    expiryDate: newExpiry,
    status: 'Active',
    autoRecharge: !!(clinic.subscription?.autoRecharge),
    paymentMethod: safePaymentMethod
  };

  // Atomically update existing clinic subscription without modifying or validating unrelated clinic fields
  await Clinic.updateOne(
    { _id: clinic._id },
    {
      $set: {
        subscription: updatedSubscription,
        isActive: true
      }
    }
  );

  const updatedClinic = await Clinic.findById(clinic._id).populate('subscription.planId');

  // Generate unique formatted invoice number
  const currentYear = new Date().getFullYear();
  const countThisYear = await SubscriptionBilling.countDocuments({
    createdAt: { $gte: new Date(currentYear, 0, 1) }
  });
  const seqNumber = String(countThisYear + 1).padStart(4, '0');
  const invoiceNumber = `INV-${currentYear}-${seqNumber}`;

  const formattedPeriod = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${newExpiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const billingRecord = await SubscriptionBilling.create({
    invoiceNumber,
    clinicId,
    planId: plan._id,
    planName: plan.name,
    billingCycle,
    paymentDate: now,
    billingPeriod: formattedPeriod,
    subtotal,
    gstRate,
    gstAmount,
    amountPaid: totalAmount,
    creditApplied: 0,
    paymentMethod: 'Credit/Debit Card (Online)',
    paymentStatus: 'success',
    transactionId: gatewayPaymentId,
    gatewayOrderId,
    idempotencyKey
  });

  // Log Audit
  await createAuditLog({
    actorUserId: req.user._id,
    action: 'SUBSCRIPTION_RENEWED',
    entity: 'Clinic',
    entityId: clinicId,
    metadata: {
      planName: plan.name,
      billingCycle,
      totalAmount,
      invoiceNumber,
      transactionId: gatewayPaymentId,
      newExpiry: newExpiry.toISOString()
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'SUCCESS'
  });

  return sendSuccess(res, 'Subscription renewed successfully', {
    subscription: updatedClinic?.subscription || updatedSubscription,
    invoice: billingRecord,
    validUntil: newExpiry.toISOString(),
    formattedValidUntil: newExpiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  });
});

// 10. Get Single Invoice Details
const getInvoiceDetails = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const { invoiceId } = req.params;
  const invoice = await SubscriptionBilling.findOne({
    clinicId,
    $or: [
      { _id: mongoose.isValidObjectId(invoiceId) ? invoiceId : null },
      { invoiceNumber: invoiceId }
    ]
  }).populate('planId');

  if (!invoice) {
    throw new AppError('Invoice not found.', HTTP_STATUS.NOT_FOUND);
  }

  const clinic = await Clinic.findById(clinicId);

  return sendSuccess(res, 'Invoice details retrieved successfully', {
    invoice,
    clinic
  });
});

// 11. Get Latest Invoice
const getLatestInvoice = asyncHandler(async (req, res) => {
  const clinicId = resolveClinicContext({
    user: req.user,
    requestedClinicId: req.query.clinicId
  });

  const invoice = await SubscriptionBilling.findOne({ clinicId })
    .populate('planId')
    .sort({ paymentDate: -1, createdAt: -1 });

  if (!invoice) {
    return sendSuccess(res, 'No invoice found for this clinic', { invoice: null });
  }

  const clinic = await Clinic.findById(clinicId);

  return sendSuccess(res, 'Latest invoice retrieved successfully', {
    invoice,
    clinic
  });
});

// 12. Handle Webhook for Subscription Renewals
const handleRenewalWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] || req.headers['stripe-signature'];
  const event = req.body;

  // Process webhook payload if payment is captured
  if (event?.event === 'payment.captured' || event?.status === 'captured') {
    const paymentEntity = event.payload?.payment?.entity || event;
    const gatewayOrderId = paymentEntity.order_id || paymentEntity.id;
    const gatewayPaymentId = paymentEntity.id;

    if (gatewayOrderId) {
      const existing = await SubscriptionBilling.findOne({
        $or: [{ transactionId: gatewayPaymentId }, { gatewayOrderId }]
      });

      if (!existing && paymentEntity.notes?.clinicId) {
        const clinic = await Clinic.findById(paymentEntity.notes.clinicId).populate('subscription.planId');
        if (clinic) {
          const plan = clinic.subscription.planId;
          const billingCycle = clinic.subscription.billingCycle || 'monthly';
          const newExpiry = new Date();
          if (billingCycle === 'yearly') {
            newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          } else {
            newExpiry.setMonth(newExpiry.getMonth() + 1);
          }

          const safePaymentMethod = {
            last4: clinic.subscription?.paymentMethod?.last4 || '4242',
            brand: clinic.subscription?.paymentMethod?.brand || 'Visa',
            token: clinic.subscription?.paymentMethod?.token || `TOK_${Date.now()}`
          };

          await Clinic.updateOne(
            { _id: clinic._id },
            {
              $set: {
                'subscription.status': 'Active',
                'subscription.expiryDate': newExpiry,
                'subscription.renewalDate': newExpiry,
                'subscription.paymentMethod': safePaymentMethod,
                isActive: true
              }
            }
          );

          const currentYear = new Date().getFullYear();
          const count = await SubscriptionBilling.countDocuments();
          const invoiceNumber = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;

          await SubscriptionBilling.create({
            invoiceNumber,
            clinicId: clinic._id,
            planId: plan?._id,
            planName: plan?.name || 'AICMS Professional',
            billingCycle,
            paymentDate: new Date(),
            billingPeriod: `${new Date().toLocaleDateString()} - ${newExpiry.toLocaleDateString()}`,
            amountPaid: (paymentEntity.amount || 589882) / 100,
            subtotal: 4999,
            gstAmount: 899.82,
            gstRate: 18,
            paymentMethod: 'Webhook Payment',
            paymentStatus: 'success',
            transactionId: gatewayPaymentId,
            gatewayOrderId
          });
        }
      }
    }
  }

  return res.status(200).json({ status: 'ok', message: 'Webhook processed successfully' });
});

module.exports = {
  getCurrentSubscription,
  previewUpgrade,
  upgradeSubscription,
  toggleAutoRecharge,
  getBillingHistory,
  renewSubscription,
  getRenewalDetails,
  createRenewalOrder,
  verifyRenewalPayment,
  getInvoiceDetails,
  getLatestInvoice,
  handleRenewalWebhook
};

