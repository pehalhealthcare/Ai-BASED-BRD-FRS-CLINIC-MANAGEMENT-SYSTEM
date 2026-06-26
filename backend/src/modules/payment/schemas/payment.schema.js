const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
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
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    method: {
      type: String,
      enum: ['UPI', 'CARD', 'NET_BANKING', 'CASH'],
      required: true
    },
    gateway: {
      type: String,
      enum: ['RAZORPAY', 'MANUAL'],
      default: 'RAZORPAY'
    },
    gatewayOrderId: {
      type: String,
      trim: true
    },
    gatewayPaymentId: {
      type: String,
      trim: true
    },
    gatewaySignature: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'CREATED'
    },
    useInsurance: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'payments'
  }
);

paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ patientId: 1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = Payment;
