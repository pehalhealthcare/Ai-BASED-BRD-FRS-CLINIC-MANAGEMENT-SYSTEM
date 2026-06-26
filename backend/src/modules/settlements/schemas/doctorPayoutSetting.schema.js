const mongoose = require('mongoose');

const doctorPayoutSettingSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true
    },
    paymentMode: {
      type: String,
      enum: ['REVENUE_SHARE', 'MONTHLY_SALARY', 'MANUAL'],
      default: 'REVENUE_SHARE'
    },
    revenuePercentage: {
      type: Number,
      default: 80,
      min: 0,
      max: 100
    },
    monthlySalary: {
      type: Number,
      default: 0,
      min: 0
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
    collection: 'doctorPayoutSettings'
  }
);

doctorPayoutSettingSchema.index({ doctorId: 1 });

const DoctorPayoutSetting = mongoose.models.DoctorPayoutSetting || mongoose.model('DoctorPayoutSetting', doctorPayoutSettingSchema);

module.exports = DoctorPayoutSetting;
