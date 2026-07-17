const mongoose = require('mongoose');

const medicineBatchSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicPharmacyInventory',
      required: true,
      index: true
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true
    },
    manufacturingDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date,
      required: true
    },
    purchaseQuantity: {
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
    mrp: {
      type: Number,
      default: 0
    },
    sellingPrice: {
      type: Number,
      default: 0
    },
    supplier: {
      type: String,
      trim: true,
      default: ''
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'medicine_batches'
  }
);

medicineBatchSchema.pre('save', function (next) {
  if (this.isModified('quantity')) {
    this.availableStock = this.quantity;
  } else if (this.isModified('availableStock')) {
    this.quantity = this.availableStock;
  } else {
    this.quantity = this.availableStock;
  }
  next();
});

medicineBatchSchema.index({ inventoryId: 1, batchNumber: 1 }, { unique: true });

const MedicineBatch = mongoose.models.MedicineBatch || mongoose.model('MedicineBatch', medicineBatchSchema);
module.exports = MedicineBatch;
