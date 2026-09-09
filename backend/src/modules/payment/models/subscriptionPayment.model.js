const mongoose = require('mongoose');

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    utr: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    transactionId: {
      type: String,
      trim: true,
      default: ''
    },
    paymentProofUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: [
        'INITIATED',
        'SUBMITTED',
        'PENDING_VERIFICATION',
        'VERIFIED',
        'REJECTED',
        'REPAYMENT_REQUIRED'
      ],
      default: 'PENDING_VERIFICATION',
      index: true
    },
    attemptNumber: {
      type: Number,
      default: 1
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    rejectionNotes: {
      type: String,
      default: ''
    },
    paymentConfigurationVersion: {
      type: Number,
      default: 1
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    verificationNotes: {
      type: String,
      default: ''
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'subscription_payments'
  }
);

subscriptionPaymentSchema.index({ clinicId: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ status: 1, submittedAt: -1 });

const SubscriptionPayment =
  mongoose.models.SubscriptionPayment ||
  mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);

module.exports = SubscriptionPayment;
