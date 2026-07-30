const mongoose = require('mongoose');

const branchPricingSchema = new mongoose.Schema({
  branchId: { type: String, required: true },
  branchName: { type: String, required: true },
  standardPrice: { type: Number, default: 0 },
  insurancePrice: { type: Number, default: 0 },
  memberPrice: { type: Number, default: 0 }
}, { _id: false });

const procedureCatalogSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  defaultDuration: {
    type: Number,
    default: 30 // minutes
  },
  preparationInstructions: {
    type: String,
    default: ''
  },
  recoveryInstructions: {
    type: String,
    default: ''
  },
  consentRequired: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  treatmentPlan: {
    type: {
      type: String,
      enum: ['one_time', 'daily', 'alternate', 'weekly', 'monthly', 'custom'],
      default: 'one_time'
    },
    sessions: { type: Number, default: 1 },
    intervalDays: { type: Number, default: 1 }
  },
  standardPrice: { type: Number, default: 0 },
  insurancePrice: { type: Number, default: 0 },
  memberPrice: { type: Number, default: 0 },
  advancePaymentRequired: { type: Boolean, default: false },
  branches: [branchPricingSchema],
  eligibleDoctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }],
  eligibleStaff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

procedureCatalogSchema.index({ clinicId: 1, code: 1 }, { unique: true });

const ProcedureCatalog = mongoose.models.ProcedureCatalog || mongoose.model('ProcedureCatalog', procedureCatalogSchema);

module.exports = ProcedureCatalog;
