const mongoose = require('mongoose');

const pharmacyOrderSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    prescriptionType: {
      type: String,
      enum: ['system', 'manual'],
      required: true
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null
    },
    prescriptionFile: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending'
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    orderedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'pharmacy_orders',
    timestamps: true
  }
);

const PharmacyOrder = mongoose.models.PharmacyOrder || mongoose.model('PharmacyOrder', pharmacyOrderSchema);

module.exports = PharmacyOrder;
