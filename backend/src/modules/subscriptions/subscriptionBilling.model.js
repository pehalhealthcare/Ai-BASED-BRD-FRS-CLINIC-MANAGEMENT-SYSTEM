const mongoose = require('mongoose');

const subscriptionBillingSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    billingPeriod: {
      type: String,
      required: true
    },
    amountPaid: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      default: 0
    },
    gstRate: {
      type: Number,
      default: 18
    },
    gstAmount: {
      type: Number,
      default: 0
    },
    planName: {
      type: String,
      default: ''
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    creditApplied: {
      type: Number,
      default: 0
    },
    paymentMethod: {
      type: String,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success'
    },
    transactionId: {
      type: String,
      default: ''
    },
    gatewayOrderId: {
      type: String,
      default: ''
    },
    idempotencyKey: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'subscription_billings'
  }
);

const SubscriptionBilling = mongoose.models.SubscriptionBilling || mongoose.model('SubscriptionBilling', subscriptionBillingSchema);

module.exports = SubscriptionBilling;
