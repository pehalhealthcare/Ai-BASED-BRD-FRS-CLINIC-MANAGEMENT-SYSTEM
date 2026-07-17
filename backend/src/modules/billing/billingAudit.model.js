const mongoose = require('mongoose');

const billingAuditSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    originalFee: {
      type: Number,
      required: true
    },
    discountType: {
      type: String,
      enum: [
        'none', 'percentage', 'fixed', 'full_waiver', 'membership',
        'senior_citizen', 'corporate', 'insurance', 'employee',
        'promotional', 'doctor_courtesy', 'admin_courtesy'
      ],
      default: 'none'
    },
    discountValue: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    finalFee: {
      type: Number,
      required: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedByName: {
      type: String,
      default: ''
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decidedByName: {
      type: String,
      default: ''
    },
    decision: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired', 'auto_approved'],
      required: true
    },
    decisionReason: {
      type: String,
      default: ''
    },
    decisionTimestamp: {
      type: Date,
      default: null
    },
    paymentStatus: {
      type: String,
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      default: ''
    },
    receiptNumber: {
      type: String,
      default: ''
    },
    appointmentStatus: {
      type: String,
      default: ''
    }
  },
  {
    collection: 'billing_audits',
    timestamps: true
  }
);

billingAuditSchema.index({ clinicId: 1, createdAt: -1 });

const BillingAudit = mongoose.models.BillingAudit || mongoose.model('BillingAudit', billingAuditSchema);

module.exports = BillingAudit;
