const mongoose = require('mongoose');

const ORDER_STATUSES = ['ordered', 'sample_collected', 'processing', 'completed', 'cancelled'];

const normalRangeSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      default: null
    },
    max: {
      type: Number,
      default: null
    },
    text: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const orderedTestSchema = new mongoose.Schema(
  {
    labTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabTest',
      default: null
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: ''
    },
    specimenType: {
      type: String,
      trim: true,
      default: ''
    },
    unit: {
      type: String,
      trim: true,
      default: ''
    },
    normalRange: {
      type: normalRangeSchema,
      default: () => ({})
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'ordered'
    }
  },
  { _id: true }
);

const labOrderSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: false,
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
      required: false,
      index: true
    },
    laboratoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
      index: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true
    },
    tests: {
      type: [orderedTestSchema],
      default: []
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent'],
      default: 'routine'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'ordered'
    },
    collectionMethod: {
      type: String,
      enum: ['AT_LAB', 'HOME_COLLECTION'],
      default: 'AT_LAB'
    },
    price: {
      type: Number,
      default: 0
    },
    patientType: {
      type: String,
      enum: ['REGISTERED', 'WALK_IN'],
      default: 'REGISTERED'
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null
    },
    source: {
      type: String,
      enum: ['DOCTOR_BOOKED', 'PATIENT_BOOKED', 'PRESCRIPTION', 'WALK_IN', 'LAB_CREATED', 'EXTERNAL_REFERRAL'],
      default: 'LAB_CREATED'
    },
    documents: {
      type: [String],
      default: []
    },
    orderedAt: {
      type: Date,
      default: Date.now
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
    collection: 'lab_orders',
    timestamps: true
  }
);

labOrderSchema.index({ clinicId: 1, orderNumber: 1 }, { unique: true });
labOrderSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
labOrderSchema.index({ clinicId: 1, doctorId: 1, createdAt: -1 });
labOrderSchema.index({ clinicId: 1, consultationId: 1, createdAt: -1 });
labOrderSchema.index({ clinicId: 1, status: 1, createdAt: -1 });

const LabOrder = mongoose.models.LabOrder || mongoose.model('LabOrder', labOrderSchema);

module.exports = {
  LabOrder,
  LAB_ORDER_STATUSES: ORDER_STATUSES
};
