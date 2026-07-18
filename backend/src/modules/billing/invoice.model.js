const mongoose = require('mongoose');

const { BILLING_ITEM_TYPES, DISCOUNT_TYPES, INVOICE_STATUSES, PAYMENT_STATUSES } = require('./billing.constants');
const { PAYMENT_MODES } = require('../../common/constants/paymentModes');

const invoiceItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: BILLING_ITEM_TYPES,
      default: 'other'
    },
    name: {
      type: String,
      trim: true,
      required: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    quantity: {
      type: Number,
      min: 1,
      required: true
    },
    unitPrice: {
      type: Number,
      min: 0,
      required: true
    },
    amount: {
      type: Number,
      min: 0,
      required: true
    }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      min: 0,
      required: true
    },
    paymentMode: {
      type: String,
      enum: PAYMENT_MODES,
      required: true
    },
    transactionId: {
      type: String,
      trim: true,
      default: ''
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      trim: true,
      required: true,
      unique: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
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
      default: null,
      index: true
    },
    serviceType: {
      type: String,
      enum: ['CONSULTATION', 'LAB', 'PHARMACY', 'PROCEDURE', 'other'],
      default: 'CONSULTATION'
    },
    insuranceCoveredAmount: {
      type: Number,
      default: 0
    },
    patientPayableAmount: {
      type: Number,
      default: 0
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      default: null
    },
    items: {
      type: [invoiceItemSchema],
      default: []
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0
    },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      default: 'none'
    },
    discountValue: {
      type: Number,
      min: 0,
      default: 0
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    taxableAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    gstRate: {
      type: Number,
      min: 0,
      max: 28,
      default: 18
    },
    gstAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    totalAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    paidAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    refundAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    dueAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'unpaid'
    },
    invoiceStatus: {
      type: String,
      enum: INVOICE_STATUSES,
      default: 'draft'
    },
    payments: {
      type: [paymentSchema],
      default: []
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: ''
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ''
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    refundedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    metadata: {
      type: Object,
      default: {}
    },
    doctorShare: {
      type: Number,
      default: 0
    },
    clinicCommission: {
      type: Number,
      default: 0
    },
    isTransferredToDoctor: {
      type: Boolean,
      default: false
    },
    transferredAt: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'invoices',
    timestamps: true
  }
);

invoiceSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
invoiceSchema.index({ clinicId: 1, consultationId: 1, createdAt: -1 });
invoiceSchema.index({ clinicId: 1, appointmentId: 1, createdAt: -1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ invoiceStatus: 1 });
invoiceSchema.index({ invoiceNumber: 'text', notes: 'text' });

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
