const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const SubscriptionPlan = require('./subscriptionPlan.model');

// Get all plans for public registration (active, not archived, ordered)
const getPublicPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true, isArchived: { $ne: true } }).sort({ displayOrder: 1 });
  return sendSuccess(res, 'Active plans retrieved successfully', { plans });
});

// Get all plans for Super Admin (including inactive & archived)
const getAllPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find().sort({ displayOrder: 1 });
  return sendSuccess(res, 'All subscription plans retrieved successfully', { plans });
});

// Create a new subscription plan
const createPlan = asyncHandler(async (req, res) => {
  const { name, code, priceMonthly, priceYearly, features, trialPeriodDays, displayOrder, limits } = req.body;

  if (!name || !code) {
    throw new AppError('Name and Code are required fields.', HTTP_STATUS.BAD_REQUEST);
  }

  const existing = await SubscriptionPlan.findOne({ code: code.toUpperCase() });
  if (existing) {
    throw new AppError('A plan with this code already exists.', HTTP_STATUS.CONFLICT);
  }

  const plan = await SubscriptionPlan.create({
    name,
    code: code.toUpperCase(),
    priceMonthly: priceMonthly || 0,
    priceYearly: priceYearly || 0,
    features: features || [],
    trialPeriodDays: trialPeriodDays || 0,
    displayOrder: displayOrder || 0,
    limits: limits || { maxDoctors: null, maxStaff: null, maxPatients: null },
    isActive: true
  });

  return sendSuccess(res, 'Subscription plan created successfully', { plan }, 201);
});

// Update a plan
const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, priceMonthly, priceYearly, features, trialPeriodDays, displayOrder, limits, isActive } = req.body;

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) {
    throw new AppError('Subscription plan not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (name !== undefined) plan.name = name;
  if (priceMonthly !== undefined) plan.priceMonthly = priceMonthly;
  if (priceYearly !== undefined) plan.priceYearly = priceYearly;
  if (features !== undefined) plan.features = features;
  if (trialPeriodDays !== undefined) plan.trialPeriodDays = trialPeriodDays;
  if (displayOrder !== undefined) plan.displayOrder = displayOrder;
  if (limits !== undefined) plan.limits = limits;
  if (isActive !== undefined) plan.isActive = isActive;

  await plan.save();

  return sendSuccess(res, 'Subscription plan updated successfully', { plan });
});

// Duplicate a plan
const duplicatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const original = await SubscriptionPlan.findById(id);
  if (!original) {
    throw new AppError('Original subscription plan not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Generate unique code
  let newCode = `${original.code}_COPY`;
  let suffix = 1;
  while (await SubscriptionPlan.findOne({ code: newCode })) {
    newCode = `${original.code}_COPY${suffix}`;
    suffix++;
  }

  const plan = await SubscriptionPlan.create({
    name: `${original.name} (Copy)`,
    code: newCode,
    priceMonthly: original.priceMonthly,
    priceYearly: original.priceYearly,
    features: original.features,
    trialPeriodDays: original.trialPeriodDays,
    displayOrder: original.displayOrder + 1,
    limits: original.limits,
    isActive: false // Default to inactive so Super Admin can customize before publishing
  });

  return sendSuccess(res, 'Subscription plan duplicated successfully', { plan }, 201);
});

// Archive a plan (Soft delete)
const archivePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await SubscriptionPlan.findById(id);
  if (!plan) {
    throw new AppError('Subscription plan not found.', HTTP_STATUS.NOT_FOUND);
  }

  plan.isArchived = true;
  plan.isActive = false;
  await plan.save();

  return sendSuccess(res, 'Subscription plan archived successfully', { plan });
});

module.exports = {
  getPublicPlans,
  getAllPlans,
  createPlan,
  updatePlan,
  duplicatePlan,
  archivePlan
};
