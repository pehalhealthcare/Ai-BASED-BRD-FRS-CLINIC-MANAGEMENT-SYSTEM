const mongoose = require('mongoose');

const globalMedicineSchema = new mongoose.Schema(
  {
    globalId: {
      type: String,
      required: true,
      unique: true
    },
    medicineType: {
      type: String,
      required: true,
      enum: ['Generic', 'Brand-First', 'Combination']
    },
    displayName: {
      type: String,
      required: true,
      trim: true
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
    manufacturer: {
      type: String,
      trim: true,
      default: ''
    },
    strength: {
      type: String,
      trim: true,
      default: ''
    },
    dosageForm: {
      type: String,
      required: true,
      trim: true
    },
    route: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CatalogCategory',
      required: true
    },
    activeIngredients: [
      {
        name: { type: String, required: true, trim: true },
        strength: { type: String, required: true, trim: true }
      }
    ],
    classificationStatus: {
      type: String,
      required: true,
      enum: ['Verified', 'Pending Classification', 'Needs Review', 'Inactive'],
      default: 'Verified'
    },
    description: {
      type: String,
      trim: true,
      default: ''
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
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'global_medicines'
  }
);

globalMedicineSchema.index({
  displayName: 'text',
  genericName: 'text',
  brandName: 'text',
  manufacturer: 'text'
});

const GlobalMedicine = mongoose.models.GlobalMedicine || mongoose.model('GlobalMedicine', globalMedicineSchema);

module.exports = GlobalMedicine;
