const mongoose = require('mongoose');

const stockMovementLedgerSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
      index: true
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicineBatch',
      default: null,
      index: true
    },
    movementType: {
      type: String,
      required: true,
      enum: [
        'Stock In',
        'Stock Out',
        'Adjustment',
        'Damage',
        'Expired',
        'Returned',
        'Transferred',
        'Initial Opening Stock'
      ]
    },
    quantity: {
      type: Number,
      required: true
    },
    previousStock: {
      type: Number,
      required: true
    },
    updatedStock: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'stock_movement_ledgers'
  }
);

const StockMovementLedger = mongoose.models.StockMovementLedger || mongoose.model('StockMovementLedger', stockMovementLedgerSchema);
module.exports = StockMovementLedger;
