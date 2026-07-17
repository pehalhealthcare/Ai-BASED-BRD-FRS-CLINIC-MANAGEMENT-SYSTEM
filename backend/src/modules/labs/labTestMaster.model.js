const mongoose = require('mongoose');

const labTestMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: String,
      trim: true,
      default: ''
    },
    sampleType: {
      type: String,
      trim: true,
      default: ''
    },
    preparationInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    normalRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      unit: { type: String, default: '' },
      text: { type: String, default: '' }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'lab_test_masters'
  }
);

labTestMasterSchema.index({ name: 'text', category: 'text', department: 'text' });

const LabTestMaster = mongoose.models.LabTestMaster || mongoose.model('LabTestMaster', labTestMasterSchema);
module.exports = LabTestMaster;
