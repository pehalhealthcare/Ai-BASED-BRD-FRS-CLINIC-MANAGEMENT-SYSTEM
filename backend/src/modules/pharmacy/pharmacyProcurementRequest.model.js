const mongoose = require('mongoose');

const pharmacyProcurementRequestSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    genericName: {
      type: String,
      required: true,
      trim: true
    },
    strength: {
      type: String,
      trim: true,
      default: ''
    },
    dosageForm: {
      type: String,
      trim: true,
      default: ''
    },
    prescribedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    patients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
      }
    ],
    requestCount: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Added to Inventory'],
      default: 'Pending',
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'pharmacy_procurement_requests'
  }
);

pharmacyProcurementRequestSchema.index({ clinicId: 1, genericName: 1, strength: 1, dosageForm: 1 }, { unique: true });

const PharmacyProcurementRequest =
  mongoose.models.PharmacyProcurementRequest || mongoose.model('PharmacyProcurementRequest', pharmacyProcurementRequestSchema);

module.exports = PharmacyProcurementRequest;
