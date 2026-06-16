const mongoose = require('mongoose');

const pharmacySaleSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    dispensingRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DispensingRecord',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    amount: {
      type: Number,
      min: 0,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'other'],
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ''
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
    collection: 'pharmacy_sales',
    timestamps: true
  }
);

pharmacySaleSchema.index({ clinicId: 1, dispensingRecordId: 1 }, { unique: true });
pharmacySaleSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
pharmacySaleSchema.index({ clinicId: 1, paymentStatus: 1 });

const PharmacySale =
  mongoose.models.PharmacySale || mongoose.model('PharmacySale', pharmacySaleSchema);

module.exports = PharmacySale;
