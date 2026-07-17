const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    discountType: {
      type: String,
      enum: ['flat', 'percentage'],
      required: true,
      default: 'percentage'
    },
    discountValue: {
      type: Number,
      required: true,
      default: 0
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    applicablePlans: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan'
      }
    ],
    maxUsage: {
      type: Number,
      default: null // null means unlimited
    },
    usageCount: {
      type: Number,
      default: 0
    },
    perUserLimit: {
      type: Number,
      default: 1
    },
    minPurchaseAmount: {
      type: Number,
      default: 0
    },
    maxDiscount: {
      type: Number,
      default: 0 // 0 means no max discount cap
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'promo_codes'
  }
);

const PromoCode = mongoose.models.PromoCode || mongoose.model('PromoCode', promoCodeSchema);

module.exports = PromoCode;
