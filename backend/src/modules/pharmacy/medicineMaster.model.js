const mongoose = require('mongoose');

const medicineMasterSchema = new mongoose.Schema(
  {
    genericName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    drugCategory: {
      type: String,
      trim: true,
      default: ''
    },
    drugClass: {
      type: String,
      trim: true,
      default: ''
    },
    strengths: {
      type: [String],
      default: []
    },
    dosageForms: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    clinicalUses: {
      type: [String],
      default: []
    },
    contraindications: {
      type: [String],
      default: []
    },
    drugInteractions: {
      type: [String],
      default: []
    },
    storageInformation: {
      type: String,
      trim: true,
      default: ''
    },
    prescriptionRequirement: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'medicine_masters'
  }
);

// Search indexes
medicineMasterSchema.index({ genericName: 'text', drugCategory: 'text', drugClass: 'text' });

const MedicineMaster = mongoose.models.MedicineMaster || mongoose.model('MedicineMaster', medicineMasterSchema);
module.exports = MedicineMaster;
