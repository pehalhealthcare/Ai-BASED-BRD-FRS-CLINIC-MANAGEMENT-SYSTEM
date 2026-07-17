const mongoose = require('mongoose');

const labConsumableBatchSchema = new mongoose.Schema(
  {
    consumableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabConsumable',
      required: true,
      index: true
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      index: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    receivedQuantity: {
      type: Number,
      required: true,
      default: 0
    },
    availableStock: {
      type: Number,
      required: true,
      default: 0
    },
    quantity: {
      type: Number,
      required: true,
      default: 0
    },
    purchasePrice: {
      type: Number,
      default: 0
    },
    sellingPrice: {
      type: Number,
      default: 0
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'lab_consumable_batches'
  }
);

labConsumableBatchSchema.pre('save', function (next) {
  if (this.isModified('quantity')) {
    this.availableStock = this.quantity;
  } else if (this.isModified('availableStock')) {
    this.quantity = this.availableStock;
  } else {
    this.quantity = this.availableStock;
  }
  next();
});

labConsumableBatchSchema.index({ consumableId: 1, batchNumber: 1 }, { unique: true });

const LabConsumableBatch = mongoose.models.LabConsumableBatch || mongoose.model('LabConsumableBatch', labConsumableBatchSchema);
module.exports = LabConsumableBatch;
