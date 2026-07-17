const mongoose = require('mongoose');

const labStockLedgerSchema = new mongoose.Schema(
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
    consumableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabConsumable',
      required: true,
      index: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabConsumableBatch',
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
    collection: 'lab_stock_ledgers'
  }
);

const LabStockLedger = mongoose.models.LabStockLedger || mongoose.model('LabStockLedger', labStockLedgerSchema);
module.exports = LabStockLedger;
