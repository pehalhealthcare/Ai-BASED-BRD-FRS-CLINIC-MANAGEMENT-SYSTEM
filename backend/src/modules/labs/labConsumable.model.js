const mongoose = require('mongoose');

const labConsumableSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'Test Kit',
        'Reagent',
        'Chemical',
        'Collection Tube',
        'Slide',
        'Needle',
        'Syringe',
        'Container',
        'PPE',
        'Other Consumable'
      ]
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: 'Units'
    },
    minimumStock: {
      type: Number,
      default: 0
    },
    reorderLevel: {
      type: Number,
      default: 0
    },
    maximumStock: {
      type: Number,
      default: 0
    },
    totalStock: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'lab_consumables'
  }
);

labConsumableSchema.index({ clinicId: 1, name: 1 }, { unique: true });

const LabConsumable = mongoose.models.LabConsumable || mongoose.model('LabConsumable', labConsumableSchema);
module.exports = LabConsumable;
