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
    laboratoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true
    },
    parameterOverrides: [
      {
        parameterId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'GlobalParameter',
          required: true
        },
        isAvailable: {
          type: Boolean,
          default: true
        }
      }
    ],
    localParameters: [
      {
        name: { type: String, required: true, trim: true },
        shortName: { type: String, trim: true, default: '' },
        resultType: { type: String, enum: ['NUMERIC', 'TEXT', 'QUALITATIVE', 'BOOLEAN', 'ENUM', 'PERCENTAGE', 'RATIO'], default: 'NUMERIC' },
        unit: { type: String, trim: true, default: '' },
        decimalPrecision: { type: Number, default: 1 },
        description: { type: String, trim: true, default: '' },
        referenceRanges: [
          {
            gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'ALL'], default: 'ALL' },
            ageFrom: { type: Number, default: null },
            ageTo: { type: Number, default: null },
            ageUnit: { type: String, enum: ['DAYS', 'MONTHS', 'YEARS', ''], default: '' },
            lowerOperator: { type: String, enum: ['>=', '>', '<', '<=', 'Between'], default: 'Between' },
            upperOperator: { type: String, enum: ['>=', '>', '<', '<=', 'Between'], default: 'Between' },
            lowerValue: { type: Number, default: null },
            upperValue: { type: Number, default: null }
          }
        ],
        allowedValues: [
          {
            value: { type: String, required: true },
            isAbnormal: { type: Boolean, default: false }
          }
        ]
      }
    ],
    doctorPrescriptionRequired: { type: Boolean, default: false },
    importantInstructions: { type: String, trim: true, default: '' },
    collectionLocations: { type: [String], default: ['Laboratory'] },
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
    processingMode: {
      type: String,
      enum: ['IN_HOUSE', 'OUTSOURCED'],
      default: 'IN_HOUSE'
    },
    outsourcedLabName: {
      type: String,
      trim: true,
      default: ''
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

labTestSchema.index({ clinicId: 1, laboratoryId: 1, code: 1 }, { unique: true });
labTestSchema.index({ clinicId: 1, laboratoryId: 1, labTestMasterId: 1 }, { unique: true, sparse: true });
labTestSchema.index({ clinicId: 1, laboratoryId: 1, globalLabTestId: 1 }, { unique: true, sparse: true });
labTestSchema.index({ clinicId: 1, laboratoryId: 1, name: 1 });
labTestSchema.index({ clinicId: 1, laboratoryId: 1, category: 1 });
labTestSchema.index({
  code: 'text',
  name: 'text',
  category: 'text',
  specimenType: 'text'
});

const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', labTestSchema);
module.exports = LabTest;
