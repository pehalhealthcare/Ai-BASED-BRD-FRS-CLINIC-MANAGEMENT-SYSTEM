const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    priceMonthly: {
      type: Number,
      required: true,
      default: 0
    },
    priceYearly: {
      type: Number,
      required: true,
      default: 0
    },
    features: {
      type: [String],
      default: []
    },
    trialPeriodDays: {
      type: Number,
      default: 0
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    limits: {
      maxDoctors: { type: Number, default: null },
      maxStaff: { type: Number, default: null },
      maxPatients: { type: Number, default: null },
      maxBranches: { type: Number, default: 0 },
      maxDepartments: { type: Number, default: 0 }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'subscription_plans'
  }
);

const SubscriptionPlan = mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan;
