const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'ordered',
  'confirmed',
  'scheduled',
  'sample_collection_pending',
  'sample_collected',
  'processing',
  'in_processing',
  'in_analysis',
  'results_entry',      // Lab staff entering results
  'ready_for_review',  // All results entered, pending final review
  'completed',
  'report_ready',
  'cancelled',
  'rejected'
];

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
    globalLabTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
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
    price: {
      type: Number,
      default: 0
    },
    turnaroundTime: {
      type: String,
      trim: true,
      default: '24 Hours'
    },
    patientPreparation: {
      type: String,
      trim: true,
      default: 'No special preparation'
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

const orderDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ['Doctor Prescription', 'Previous Report', 'Referral Document', 'Identity Document', 'Other'],
      default: 'Doctor Prescription'
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    url: {
      type: String,
      trim: true,
      default: ''
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
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
      required: false,
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
    tokenNumber: {
      type: String,
      trim: true,
      default: ''
    },
    tests: {
      type: [orderedTestSchema],
      default: []
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'stat'],
      default: 'routine'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      default: 'ordered'
    },
    orderStatus: {
      type: String,
      trim: true,
      default: 'ORDER_BOOKED'
    },
    sampleStatus: {
      type: String,
      default: 'AWAITING_COLLECTION'
    },
    sampleStatusMessage: {
      type: String,
      trim: true,
      default: ''
    },
    sampleCollectedAt: {
      type: Date,
      default: null
    },
    testingStartedAt: {
      type: Date,
      default: null
    },
    reportGeneratedAt: {
      type: Date,
      default: null
    },
    reportAvailableAt: {
      type: Date,
      default: null
    },
    reportStatus: {
      type: String,
      enum: ['PENDING', 'GENERATED', 'AVAILABLE', 'REJECTED'],
      default: 'PENDING'
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabReport',
      default: null
    },
    collectionMethod: {
      type: String,
      enum: ['AT_LAB', 'HOME_COLLECTION'],
      default: 'AT_LAB'
    },
    collectionAddress: {
      line1: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' }
    },
    collectionDate: {
      type: Date,
      default: null
    },
    collectionSlot: {
      type: String,
      trim: true,
      default: ''
    },
    homeCollectionFee: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    promoCode: {
      type: String,
      trim: true,
      default: ''
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    packageName: {
      type: String,
      trim: true,
      default: ''
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PAID'
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'ONLINE'
    },
    paymentId: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    patientType: {
      type: String,
      enum: ['REGISTERED', 'WALK_IN'],
      default: 'REGISTERED'
    },
    bookingSource: {
      type: String,
      enum: ['PATIENT_PORTAL', 'DOCTOR', 'LABORATORY_STAFF', 'WALK_IN', 'PRESCRIPTION'],
      default: 'PATIENT_PORTAL'
    },
    guestPatient: {
      fullName: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      age: { type: Number, default: null },
      gender: { type: String, enum: ['Male', 'Female', 'Other', 'male', 'female', 'other', ''], default: '' },
      address: { type: String, trim: true, default: '' }
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
      type: [mongoose.Schema.Types.Mixed],
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
    },
    finalizedAt: {
      type: Date,
      default: null
    },
    resultsSummary: {
      totalParams: { type: Number, default: 0 },
      completedParams: { type: Number, default: 0 },
      abnormalCount: { type: Number, default: 0 },
      criticalCount: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: null }
    },
    resultsInitialized: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: 'lab_orders',
    timestamps: true
  }
);

labOrderSchema.index({ clinicId: 1, orderNumber: 1 }, { unique: true });
labOrderSchema.index({ clinicId: 1, laboratoryId: 1, collectionDate: 1, tokenNumber: 1 });
labOrderSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
labOrderSchema.index({ clinicId: 1, doctorId: 1, createdAt: -1 });
labOrderSchema.index({ clinicId: 1, consultationId: 1, createdAt: -1 });
labOrderSchema.index({ clinicId: 1, status: 1, createdAt: -1 });

const LabOrder = mongoose.models.LabOrder || mongoose.model('LabOrder', labOrderSchema);

module.exports = {
  LabOrder,
  LAB_ORDER_STATUSES: ORDER_STATUSES
};
