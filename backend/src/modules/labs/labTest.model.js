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
    price: {
      type: Number,
      default: null
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
