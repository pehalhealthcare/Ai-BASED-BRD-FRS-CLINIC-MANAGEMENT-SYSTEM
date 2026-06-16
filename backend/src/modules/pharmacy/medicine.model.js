const mongoose = require('mongoose');

const { recalculateTotalStock } = require('./pharmacy.utils');

const medicineBatchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      trim: true,
      required: true
    },
    quantity: {
      type: Number,
      min: 0,
      required: true
    },
    expiryDate: {
      type: Date,
      default: null
    },
    purchasePrice: {
      type: Number,
      min: 0,
      default: 0
    },
    sellingPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    receivedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const medicineSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    code: {
      type: String,
      trim: true,
      default: ''
    },
    name: {
      type: String,
      trim: true,
      required: true
    },
    genericName: {
      type: String,
      trim: true,
      default: ''
    },
    brandName: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: ''
    },
    form: {
      type: String,
      trim: true,
      default: ''
    },
    strength: {
      type: String,
      trim: true,
      default: ''
    },
    manufacturer: {
      type: String,
      trim: true,
      default: ''
    },
    unitPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    reorderLevel: {
      type: Number,
      min: 0,
      default: 0
    },
    supplierLeadTimeDays: {
      type: Number,
      min: 0,
      default: 7
    },
    isActive: {
      type: Boolean,
      default: true
    },
    requiresPrescription: {
      type: Boolean,
      default: true
    },
    batches: {
      type: [medicineBatchSchema],
      default: []
    },
    totalStock: {
      type: Number,
      min: 0,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'medicines',
    timestamps: true
  }
);

medicineSchema.pre('validate', function preValidate(next) {
  this.totalStock = recalculateTotalStock(this);
  next();
});

medicineSchema.index(
  { clinicId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string', $ne: '' } } }
);
medicineSchema.index({ clinicId: 1, name: 1 });
medicineSchema.index({ clinicId: 1, genericName: 1 });
medicineSchema.index({ name: 'text', genericName: 'text', brandName: 'text', category: 'text' });

const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
