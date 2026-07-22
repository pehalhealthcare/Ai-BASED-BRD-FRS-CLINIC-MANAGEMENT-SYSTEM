const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandMaster',
      required: false // Make optional to support new global reference flow
    },
    globalMedicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalMedicine',
      default: null,
      index: true
    },
    // Denormalized fields from Brand & Generic Master for 100% backward compatibility
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
    // Clinic specific attributes
    distributor: {
      type: String,
      trim: true,
      default: ''
    },
    purchasePrice: {
      type: Number,
      default: 0
    },
    sellingPrice: {
      type: Number,
      default: 0
    },
    unitPrice: {
      type: Number,
      default: 0
    },
    gst: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    minimumStock: {
      type: Number,
      default: 0
    },
    maximumStock: {
      type: Number,
      default: 0
    },
    reorderLevel: {
      type: Number,
      default: 0
    },
    supplierLeadTimeDays: {
      type: Number,
      default: 0
    },
    rackNumber: {
      type: String,
      trim: true,
      default: ''
    },
    storageLocation: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    totalStock: {
      type: Number,
      min: 0,
      default: 0
    },
    requiresPrescription: {
      type: Boolean,
      default: true
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual Populate for Medicine Batches
medicineSchema.virtual('batches', {
  ref: 'MedicineBatch',
  localField: '_id',
  foreignField: 'inventoryId'
});

medicineSchema.pre('save', async function (next) {
  if (this.batches && Array.isArray(this.batches) && this.batches.length > 0 && !this._batchesSaved) {
    const MedicineBatch = mongoose.model('MedicineBatch');
    let totalStock = 0;
    for (const b of this.batches) {
      const exists = await MedicineBatch.findOne({ inventoryId: this._id, batchNumber: b.batchNumber });
      if (!exists) {
        await MedicineBatch.create({
          inventoryId: this._id,
          batchNumber: b.batchNumber,
          manufacturingDate: b.manufacturingDate || b.receivedAt || new Date(),
          expiryDate: b.expiryDate,
          purchaseQuantity: b.purchaseQuantity || b.quantity || 0,
          availableStock: b.availableStock || b.quantity || 0,
          quantity: b.quantity || b.purchaseQuantity || 0,
          purchasePrice: b.purchasePrice || 0,
          sellingPrice: b.sellingPrice || 0,
          supplier: b.supplier || '',
          invoiceNumber: b.invoiceNumber || ''
        });
      }
      totalStock += Number(b.availableStock || b.quantity || 0);
    }
    this.totalStock = totalStock;
    this._batchesSaved = true;
  }
  next();
});

medicineSchema.index({ clinicId: 1, name: 1 });
medicineSchema.index({ clinicId: 1, genericName: 1 });
medicineSchema.index({ clinicId: 1, brandId: 1 });
medicineSchema.index({ clinicId: 1, globalMedicineId: 1 });
medicineSchema.index({ name: 'text', genericName: 'text', brandName: 'text', category: 'text' });

const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);
module.exports = Medicine;
