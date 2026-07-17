const mongoose = require('mongoose');

const globalBrandSchema = new mongoose.Schema(
  {
    globalId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    manufacturer: {
      type: String,
      required: true,
      trim: true
    },
    genericMedicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalGenericMedicine',
      required: true
    },
    packSize: {
      type: String,
      trim: true,
      default: ''
    },
    barcode: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'global_brands'
  }
);

globalBrandSchema.index({ name: 1, manufacturer: 1, genericMedicineId: 1 }, { unique: true });
globalBrandSchema.index({ name: 'text', manufacturer: 'text' });

const GlobalBrand = mongoose.models.GlobalBrand || mongoose.model('GlobalBrand', globalBrandSchema);

module.exports = GlobalBrand;
