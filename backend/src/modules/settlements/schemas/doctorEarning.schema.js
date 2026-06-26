const mongoose = require('mongoose');

const doctorEarningSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true
    },
    earningType: {
      type: String,
      enum: ['CONSULTATION', 'LAB', 'PHARMACY'],
      default: 'CONSULTATION'
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0
    },
    doctorShare: {
      type: Number,
      required: true,
      min: 0
    },
    clinicShare: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['PENDING', 'READY_FOR_PAYOUT', 'PAID'],
      default: 'PENDING'
    },
    payoutDetails: {
      transactionRef: { type: String, trim: true },
      paymentDate: { type: Date },
      remarks: { type: String, trim: true }
    }
  },
  {
    timestamps: true,
    collection: 'doctorEarnings'
  }
);

doctorEarningSchema.index({ doctorId: 1 });
doctorEarningSchema.index({ invoiceId: 1 });

const DoctorEarning = mongoose.models.DoctorEarning || mongoose.model('DoctorEarning', doctorEarningSchema);

module.exports = DoctorEarning;
