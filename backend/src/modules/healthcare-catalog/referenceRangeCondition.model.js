const mongoose = require('mongoose');

const referenceRangeConditionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    type: {
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
    collection: 'reference_range_conditions'
  }
);

const ReferenceRangeCondition = mongoose.models.ReferenceRangeCondition || mongoose.model('ReferenceRangeCondition', referenceRangeConditionSchema);

module.exports = ReferenceRangeCondition;
