const mongoose = require('mongoose');

const dispensingItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    medicineName: {
      type: String,
      trim: true,
      required: true
    },
    batchNumber: {
      type: String,
      trim: true,
      required: true
    },
    quantity: {
      type: Number,
      min: 1,
      required: true
    },
    unitPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    totalPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const dispensingRecordSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
      index: true
    },
    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: {
      type: [dispensingItemSchema],
      default: []
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'dispensed', 'cancelled'],
      default: 'draft'
    },
    dispensedAt: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'dispensing_records',
    timestamps: true
  }
);

dispensingRecordSchema.index({ clinicId: 1, prescriptionId: 1 }, { unique: true });
dispensingRecordSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
dispensingRecordSchema.index({ clinicId: 1, doctorId: 1, createdAt: -1 });
dispensingRecordSchema.index({ clinicId: 1, status: 1, createdAt: -1 });

const DispensingRecord =
  mongoose.models.DispensingRecord || mongoose.model('DispensingRecord', dispensingRecordSchema);

module.exports = DispensingRecord;
