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
    investigationType: {
      type: String,
      enum: ['ATOMIC_TEST', 'PANEL', 'PROFILE', 'PACKAGE'],
      default: 'ATOMIC_TEST',
      required: true
    },
    parameters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GlobalParameter'
      }
    ],
    source: {
      type: String,
      enum: ['SYSTEM_CATALOGUE', 'USER_CREATED'],
      default: 'SYSTEM_CATALOGUE',
      required: true
    },
    collectionInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    version: {
      type: Number,
      default: 1
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sourceType: {
      type: String,
      enum: ['ICMR_NEDL', 'CURATED_MARKET_CATALOGUE', 'SUPER_ADMIN'],
      default: 'SUPER_ADMIN',
      required: true
    },
    sourceVersion: {
      type: String,
      trim: true,
      default: ''
    },
    sourceYear: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'RETIRED'],
      default: 'ACTIVE'
    },
    customized: {
      type: Boolean,
      default: false
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    modifiedAt: {
      type: Date,
      default: null
    },
    retiredAt: {
      type: Date,
      default: null
    },
    retiredSourceVersion: {
      type: String,
      trim: true,
      default: ''
    },
    retirementReason: {
      type: String,
      trim: true,
      default: ''
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
