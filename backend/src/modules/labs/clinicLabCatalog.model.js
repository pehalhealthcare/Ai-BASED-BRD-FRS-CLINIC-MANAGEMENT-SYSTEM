const mongoose = require('mongoose');

const clinicLabCatalogSchema = new mongoose.Schema(
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
      required: true
    },
    testPrice: {
      type: Number,
      required: true,
      default: 0
    },
    turnaroundTime: {
      type: String, // e.g. "24 Hours"
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
    }
  },
  {
    timestamps: true,
    collection: 'clinic_lab_catalogs'
  }
);

clinicLabCatalogSchema.index({ clinicId: 1, labTestMasterId: 1 }, { unique: true });

const ClinicLabCatalog = mongoose.models.ClinicLabCatalog || mongoose.model('ClinicLabCatalog', clinicLabCatalogSchema);
module.exports = ClinicLabCatalog;
