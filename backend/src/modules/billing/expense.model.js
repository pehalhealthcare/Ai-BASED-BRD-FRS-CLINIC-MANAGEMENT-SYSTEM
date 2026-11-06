const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['salary', 'medicines', 'equipment', 'utilities', 'rent', 'other'],
      default: 'other',
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    paymentMode: {
      type: String,
      default: 'cash'
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending'],
      default: 'paid'
    },
    vendor: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.index({ clinicId: 1, expenseDate: 1 });

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema, 'expenses');

module.exports = Expense;

