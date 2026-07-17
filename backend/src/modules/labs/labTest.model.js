const mongoose = require('mongoose');

const normalRangeSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      default: null
    },
    max: {
      type: Number,
      default: null
    },
    text: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const labTestSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    labTestMasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabTestMaster',
      required: false // Make optional to support new global reference flow
    },
    globalLabTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
      default: null,
      index: true
    },
    // Denormalized fields from LabTestMaster for 100% backward compatibility
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: ''
    },
    specimenType: {
      type: String,
      trim: true,
      default: ''
    },
    unit: {
      type: String,
      trim: true,
      default: ''
    },
    normalRange: {
      type: normalRangeSchema,
      default: () => ({})
    },
    // Clinic specific attributes
    price: {
      type: Number,
      default: null
    },
    testPrice: {
      type: Number,
      default: 0
    },
    turnaroundTime: {
      type: String,
      default: '24 Hours'
    },
    homeCollectionAvailable: {
      type: Boolean,
      default: false
    },
    sampleCollectionFee: {
      type: Number,
      default: 0
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    isActive: {
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
    collection: 'lab_tests',
    timestamps: true
  }
);

labTestSchema.index({ clinicId: 1, code: 1 }, { unique: true });
labTestSchema.index({ clinicId: 1, labTestMasterId: 1 }, { unique: true, sparse: true });
labTestSchema.index({ clinicId: 1, globalLabTestId: 1 }, { unique: true, sparse: true });
labTestSchema.index({ clinicId: 1, name: 1 });
labTestSchema.index({ clinicId: 1, category: 1 });
labTestSchema.index({
  code: 'text',
  name: 'text',
  category: 'text',
  specimenType: 'text'
});

const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', labTestSchema);
module.exports = LabTest;
