const mongoose = require('mongoose');

const globalLabTestSchema = new mongoose.Schema(
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
    shortName: {
      type: String,
      trim: true,
      default: ''
    },
    alternateNames: [
      {
        type: String,
        trim: true
      }
    ],
    department: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CatalogCategory',
      required: true
    },
    sampleType: {
      type: String,
      required: true,
      trim: true
    },
    sampleVolume: {
      type: String,
      trim: true,
      default: ''
    },
    sampleContainer: {
      type: String,
      trim: true,
      default: ''
    },
    methodology: {
      type: String,
      trim: true,
      default: ''
    },
    clinicalDescription: {
      type: String,
      trim: true,
      default: ''
    },
    patientPreparation: {
      type: String,
      trim: true,
      default: ''
    },
    referenceRange: {
      type: String,
      trim: true,
      default: ''
    },
    normalReportingTime: {
      type: String,
      required: true,
      trim: true
    },
    internalCode: {
      type: String,
      trim: true,
      default: ''
    },
    loincCode: {
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
    collection: 'global_lab_tests'
  }
);

// Enable text index for searching
globalLabTestSchema.index({ name: 'text', alternateNames: 'text', shortName: 'text' });

const GlobalLabTest = mongoose.models.GlobalLabTest || mongoose.model('GlobalLabTest', globalLabTestSchema);

module.exports = GlobalLabTest;
