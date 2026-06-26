const mongoose = require('mongoose');

const benefitsSchema = new mongoose.Schema(
  {
    consultation: { type: Boolean, default: true },
    lab: { type: Boolean, default: true },
    pharmacy: { type: Boolean, default: false },
    hospitalization: { type: Boolean, default: true },
    roomRent: { type: Boolean, default: true },
    surgery: { type: Boolean, default: true },
    emergency: { type: Boolean, default: true }
  },
  { _id: false }
);

const patientInsuranceSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsuranceProvider',
      required: true
    },
    policyNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    memberId: {
      type: String,
      required: true,
      trim: true
    },
    groupId: {
      type: String,
      trim: true,
      default: ''
    },
    policyHolderName: {
      type: String,
      required: true,
      trim: true
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
      default: 'Self'
    },
    policyStartDate: {
      type: Date,
      required: true
    },
    policyEndDate: {
      type: Date,
      required: true
    },
    coverageAmount: {
      type: Number,
      required: true,
      min: 0
    },
    remainingCoverage: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED'],
      default: 'ACTIVE'
    },
    benefits: {
      type: benefitsSchema,
      default: () => ({})
    },
    nominee: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'patientInsurance'
  }
);

patientInsuranceSchema.index({ patientId: 1 });
patientInsuranceSchema.index({ policyNumber: 1 });

const PatientInsurance = mongoose.models.PatientInsurance || mongoose.model('PatientInsurance', patientInsuranceSchema);

module.exports = PatientInsurance;
