const mongoose = require('mongoose');

const globalGenericMedicineSchema = new mongoose.Schema(
  {
    globalId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    strength: {
      type: String,
      required: true,
      trim: true
    },
    unit: {
      type: String,
      trim: true,
      default: ''
    },
    dosageForm: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CatalogCategory',
      required: true
    },
    subCategory: {
      type: String,
      trim: true,
      default: ''
    },
    atcClassification: {
      type: String,
      trim: true,
      default: ''
    },
    route: {
      type: String,
      required: true,
      trim: true
    },
    prescriptionRequired: {
      type: Boolean,
      default: true
    },
    drugSchedule: {
      type: String,
      trim: true,
      default: ''
    },
    nlemStatus: {
      type: Boolean,
      default: false
    },
    synonyms: {
      type: [String],
      default: []
    },
    description: {
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
    collection: 'global_generic_medicines'
  }
);

globalGenericMedicineSchema.index({ name: 'text' });

const GlobalGenericMedicine =
  mongoose.models.GlobalGenericMedicine || mongoose.model('GlobalGenericMedicine', globalGenericMedicineSchema);

module.exports = GlobalGenericMedicine;
