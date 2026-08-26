const mongoose = require('mongoose');

const globalParameterSchema = new mongoose.Schema(
  {
    parameterId: {
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
    code: {
      type: String,
      trim: true,
      default: ''
    },
    loincCode: {
      type: String,
      trim: true,
      default: ''
    },
    resultType: {
      type: String,
      enum: ['NUMERIC', 'TEXT', 'QUALITATIVE', 'BOOLEAN', 'ENUM', 'PERCENTAGE', 'RATIO'],
      required: true,
      default: 'NUMERIC'
    },
    defaultUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLaboratoryUnit',
      default: null
    },
    decimalPrecision: {
      type: Number,
      default: 1
    },
    technicalMin: {
      type: Number,
      default: null
    },
    technicalMax: {
      type: Number,
      default: null
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    referenceRanges: [
      {
        gender: {
          type: String,
          enum: ['MALE', 'FEMALE', 'OTHER', 'ALL'],
          default: 'ALL'
        },
        ageFrom: { type: Number, default: null },
        ageTo: { type: Number, default: null },
        ageUnit: { type: String, enum: ['DAYS', 'MONTHS', 'YEARS', ''], default: '' },
        conditionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ReferenceRangeCondition',
          default: null
        },
        // Phase 4 Operator & boundaries support
        lowerOperator: { type: String, enum: ['>=', '>', '<', '<=', 'Between'], default: 'Between' },
        upperOperator: { type: String, enum: ['>=', '>', '<', '<=', 'Between'], default: 'Between' },
        lowerValue: { type: Number, default: null },
        upperValue: { type: Number, default: null },
        pregnancyStatus: { type: String, enum: ['YES', 'NO', 'ANY'], default: 'ANY' },
        specimenType: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
        displayOrder: { type: Number, default: 0 },
        // Backwards compatibility
        fromValue: Number,
        toValue: Number,
        unitId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'GlobalLaboratoryUnit',
          default: null
        }
      }
    ],
    criticalLow: {
      type: Number,
      default: null
    },
    criticalHigh: {
      type: Number,
      default: null
    },
    allowedValues: [
      {
        value: {
          type: String,
          required: true
        },
        displayName: {
          type: String,
          default: ''
        },
        displayOrder: {
          type: Number,
          default: 0
        },
        isActive: {
          type: Boolean,
          default: true
        },
        isAbnormal: {
          type: Boolean,
          default: false
        },
        isCritical: {
          type: Boolean,
          default: false
        },
        code: {
          type: String,
          default: ''
        }
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    version: {
      type: Number,
      default: 1
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
    collection: 'global_parameters'
  }
);

// Enable text index for searching
globalParameterSchema.index({ name: 'text', alternateNames: 'text', shortName: 'text', code: 'text', loincCode: 'text' });

const GlobalParameter = mongoose.models.GlobalParameter || mongoose.model('GlobalParameter', globalParameterSchema);

module.exports = GlobalParameter;
