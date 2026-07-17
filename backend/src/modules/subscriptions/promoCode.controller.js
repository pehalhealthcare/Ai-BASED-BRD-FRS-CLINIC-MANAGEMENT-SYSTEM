const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const PromoCode = require('./promoCode.model');
const SubscriptionPlan = require('./subscriptionPlan.model');

// List all promo codes (Super Admin)
const getAllPromoCodes = asyncHandler(async (req, res) => {
  const promos = await PromoCode.find().populate('applicablePlans').sort({ createdAt: -1 });
  return sendSuccess(res, 'Promo codes retrieved successfully', { promos });
});

// Create a promo code
const createPromoCode = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    startDate,
    endDate,
    applicablePlans,
    maxUsage,
    perUserLimit,
    minPurchaseAmount,
    maxDiscount,
    isActive
  } = req.body;

  if (!code || !discountType || discountValue === undefined || !startDate || !endDate) {
    throw new AppError('Code, discountType, discountValue, startDate, and endDate are required.', HTTP_STATUS.BAD_REQUEST);
  }

  const existing = await PromoCode.findOne({ code: code.toUpperCase() });
  if (existing) {
    throw new AppError('A promo code with this code already exists.', HTTP_STATUS.CONFLICT);
  }

  const promo = await PromoCode.create({
    code: code.toUpperCase(),
    description: description || '',
    discountType,
    discountValue,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    applicablePlans: applicablePlans || [],
    maxUsage: maxUsage !== undefined ? maxUsage : null,
    perUserLimit: perUserLimit !== undefined ? perUserLimit : 1,
    minPurchaseAmount: minPurchaseAmount || 0,
    maxDiscount: maxDiscount || 0,
    isActive: isActive !== undefined ? isActive : true
  });

  return sendSuccess(res, 'Promo code created successfully', { promo }, 201);
});

// Update a promo code
const updatePromoCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    code,
    description,
    discountType,
    discountValue,
    startDate,
    endDate,
    applicablePlans,
    maxUsage,
    perUserLimit,
    minPurchaseAmount,
    maxDiscount,
    isActive
  } = req.body;

  const promo = await PromoCode.findById(id);
  if (!promo) {
    throw new AppError('Promo code not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (code !== undefined) {
    const existing = await PromoCode.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
    if (existing) {
      throw new AppError('Another promo code with this code already exists.', HTTP_STATUS.CONFLICT);
    }
    promo.code = code.toUpperCase();
  }

  if (description !== undefined) promo.description = description;
  if (discountType !== undefined) promo.discountType = discountType;
  if (discountValue !== undefined) promo.discountValue = discountValue;
  if (startDate !== undefined) promo.startDate = new Date(startDate);
  if (endDate !== undefined) promo.endDate = new Date(endDate);
  if (applicablePlans !== undefined) promo.applicablePlans = applicablePlans;
  if (maxUsage !== undefined) promo.maxUsage = maxUsage;
  if (perUserLimit !== undefined) promo.perUserLimit = perUserLimit;
  if (minPurchaseAmount !== undefined) promo.minPurchaseAmount = minPurchaseAmount;
  if (maxDiscount !== undefined) promo.maxDiscount = maxDiscount;
  if (isActive !== undefined) promo.isActive = isActive;

  await promo.save();

  return sendSuccess(res, 'Promo code updated successfully', { promo });
});

// Delete promo code
const deletePromoCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const promo = await PromoCode.findByIdAndDelete(id);
  if (!promo) {
    throw new AppError('Promo code not found.', HTTP_STATUS.NOT_FOUND);
  }
  return sendSuccess(res, 'Promo code deleted successfully');
});

// Validate promo code
const validatePromoCode = asyncHandler(async (req, res) => {
  const { code, planId, billingCycle } = req.body;

  if (!code || !planId) {
    throw new AppError('Promo code and plan ID are required.', HTTP_STATUS.BAD_REQUEST);
  }

  const promo = await PromoCode.findOne({ code: code.toUpperCase() });
  if (!promo) {
    throw new AppError('Invalid promo code.', HTTP_STATUS.NOT_FOUND);
  }

  if (!promo.isActive) {
    throw new AppError('This promo code is inactive.', HTTP_STATUS.BAD_REQUEST);
  }

  const now = new Date();
  if (now < promo.startDate || now > promo.endDate) {
    throw new AppError('This promo code has expired or is not yet valid.', HTTP_STATUS.BAD_REQUEST);
  }

  if (promo.maxUsage !== null && promo.usageCount >= promo.maxUsage) {
    throw new AppError('This promo code usage limit has been reached.', HTTP_STATUS.BAD_REQUEST);
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Check if plan is applicable
  if (promo.applicablePlans.length > 0) {
    const isApplicable = promo.applicablePlans.some(p => p.toString() === planId.toString());
    if (!isApplicable) {
      throw new AppError('This promo code is not applicable to the selected plan.', HTTP_STATUS.BAD_REQUEST);
    }
  }

  // Calculate base price
  const basePrice = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

  if (basePrice < promo.minPurchaseAmount) {
    throw new AppError(`Minimum purchase amount of ₹${promo.minPurchaseAmount} is required for this code.`, HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate discount
  let discountAmount = 0;
  if (promo.discountType === 'flat') {
    discountAmount = promo.discountValue;
  } else if (promo.discountType === 'percentage') {
    discountAmount = Math.round((basePrice * promo.discountValue) / 100);
    if (promo.maxDiscount > 0 && discountAmount > promo.maxDiscount) {
      discountAmount = promo.maxDiscount;
    }
  }

  // Final price cannot be negative
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return sendSuccess(res, 'Promo code validated successfully', {
    isValid: true,
    discountAmount,
    finalPrice,
    promo: {
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue
    }
  });
});

module.exports = {
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  validatePromoCode
};
