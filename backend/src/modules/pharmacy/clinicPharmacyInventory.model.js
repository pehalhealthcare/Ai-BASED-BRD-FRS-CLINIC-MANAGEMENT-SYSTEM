const mongoose = require('mongoose');

const clinicPharmacyInventorySchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandMaster',
      required: true
    },
    distributor: {
      type: String,
      trim: true,
      default: ''
    },
    purchasePrice: {
      type: Number,
      default: 0
    },
    sellingPrice: {
      type: Number,
      default: 0
    },
    gst: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    minimumStock: {
      type: Number,
      default: 0
    },
    maximumStock: {
      type: Number,
      default: 0
    },
    reorderLevel: {
      type: Number,
      default: 0
    },
    rackNumber: {
      type: String,
      trim: true,
      default: ''
    },
    storageLocation: {
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
    collection: 'clinic_pharmacy_inventories'
  }
);

clinicPharmacyInventorySchema.index({ clinicId: 1, brandId: 1 }, { unique: true });

const ClinicPharmacyInventory = mongoose.models.ClinicPharmacyInventory || mongoose.model('ClinicPharmacyInventory', clinicPharmacyInventorySchema);
module.exports = ClinicPharmacyInventory;
