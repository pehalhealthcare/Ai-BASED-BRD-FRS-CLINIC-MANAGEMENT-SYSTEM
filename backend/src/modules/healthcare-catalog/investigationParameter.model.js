const mongoose = require('mongoose');

const investigationParameterSchema = new mongoose.Schema(
  {
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
      required: true
    },
    parameterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalParameter',
      required: true
    },
    displayOrder: {
      type: Number,
      required: true,
      default: 0
    },
    isRequired: {
      type: Boolean,
      required: true,
      default: true
    },
    displayNameOverride: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'investigation_parameters'
  }
);

// Ensure unique mappings per investigation-parameter pair
investigationParameterSchema.index({ investigationId: 1, parameterId: 1 }, { unique: true });
investigationParameterSchema.index({ investigationId: 1, displayOrder: 1 });

const InvestigationParameter = mongoose.models.InvestigationParameter || mongoose.model('InvestigationParameter', investigationParameterSchema);

module.exports = InvestigationParameter;
