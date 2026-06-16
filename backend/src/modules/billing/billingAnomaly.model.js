const mongoose = require('mongoose');

const triggeredRuleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    evidence: {
      type: Object,
      default: {}
    }
  },
  { _id: false }
);

const billingAnomalySchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
      index: true
    },
    anomalyScore: {
      type: Number,
      default: 0
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    triggeredRules: {
      type: [triggeredRuleSchema],
      default: []
    },
    requiresAdminReview: {
      type: Boolean,
      default: true
    },
    modelName: {
      type: String,
      trim: true,
      default: ''
    },
    modelVersion: {
      type: String,
      trim: true,
      default: ''
    },
    modelStatus: {
      type: String,
      trim: true,
      default: 'fallback'
    },
    explanation: {
      type: String,
      trim: true,
      default: ''
    },
    auditId: {
      type: String,
      trim: true,
      default: ''
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'confirmed'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    collection: 'billing_anomalies',
    timestamps: true
  }
);

billingAnomalySchema.index({ clinicId: 1, invoiceId: 1 }, { unique: true });
billingAnomalySchema.index({ clinicId: 1, riskLevel: 1, createdAt: -1 });
billingAnomalySchema.index({ clinicId: 1, reviewStatus: 1, createdAt: -1 });

const BillingAnomaly =
  mongoose.models.BillingAnomaly || mongoose.model('BillingAnomaly', billingAnomalySchema);

module.exports = BillingAnomaly;
