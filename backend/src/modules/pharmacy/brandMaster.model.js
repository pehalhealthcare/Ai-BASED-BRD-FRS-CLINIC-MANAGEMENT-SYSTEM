const mongoose = require('mongoose');

const brandMasterSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    manufacturer: {
      type: String,
      trim: true,
      default: ''
    },
    genericMedicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicineMaster',
      required: true
    },
    availableStrengths: {
      type: [String],
      default: []
    },
    dosageForm: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'brand_masters'
  }
);

brandMasterSchema.index({ brandName: 'text', manufacturer: 'text' });
brandMasterSchema.index({ genericMedicineId: 1 });

const BrandMaster = mongoose.models.BrandMaster || mongoose.model('BrandMaster', brandMasterSchema);
module.exports = BrandMaster;
