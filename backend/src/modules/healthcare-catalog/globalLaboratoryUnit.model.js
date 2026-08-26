const mongoose = require('mongoose');

const globalLaboratoryUnitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    symbol: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    shortName: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isSystemDefined: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'global_laboratory_units'
  }
);

const GlobalLaboratoryUnit = mongoose.models.GlobalLaboratoryUnit || mongoose.model('GlobalLaboratoryUnit', globalLaboratoryUnitSchema);

module.exports = GlobalLaboratoryUnit;
