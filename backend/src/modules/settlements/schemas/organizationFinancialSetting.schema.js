const mongoose = require('mongoose');

const organizationFinancialSettingSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true
    },
    automaticSettlement: {
      type: Boolean,
      default: false
    },
    doctorRevenuePercentage: {
      type: Number,
      default: 80,
      min: 0,
      max: 100
    },
    clinicRevenuePercentage: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    },
    paymentCycle: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
      default: 'WEEKLY'
    },
    bankDetails: {
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, trim: true },
      bankName: { type: String, trim: true },
      accountHolderName: { type: String, trim: true }
    }
  },
  {
    timestamps: true,
    collection: 'organizationFinancialSettings'
  }
);

organizationFinancialSettingSchema.index({ organizationId: 1 });

const OrganizationFinancialSetting = mongoose.models.OrganizationFinancialSetting || mongoose.model('OrganizationFinancialSetting', organizationFinancialSettingSchema);

module.exports = OrganizationFinancialSetting;
