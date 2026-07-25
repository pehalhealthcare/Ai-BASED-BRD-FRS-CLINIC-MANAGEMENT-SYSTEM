const mongoose = require('mongoose');

const pharmacyCouponSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      required: true,
      default: 'percentage'
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    displayOnCheckout: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    expiryDate: {
      type: Date
    },
    minOrderValue: {
      type: Number,
      default: 0
    },
    maxDiscount: {
      type: Number,
      default: 0
    },
    usageLimit: {
      type: Number,
      default: 100
    },
    usedCount: {
      type: Number,
      default: 0
    },
    applicableMedicines: {
      type: [String],
      default: []
    },
    eligiblePatients: {
      type: String,
      default: 'everyone'
    }
  },
  {
    timestamps: true,
    collection: 'pharmacy_coupons'
  }
);

pharmacyCouponSchema.index({ providerId: 1, code: 1 }, { unique: true });

const PharmacyCoupon = mongoose.models.PharmacyCoupon || mongoose.model('PharmacyCoupon', pharmacyCouponSchema);
module.exports = PharmacyCoupon;
