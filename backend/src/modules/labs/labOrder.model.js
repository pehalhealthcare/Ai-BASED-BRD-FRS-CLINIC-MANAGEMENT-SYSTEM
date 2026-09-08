const mongoose = require('mongoose');
const { LAB_ORDER_STATUSES } = require('./labStatus.constants');

const ORDER_STATUSES = LAB_ORDER_STATUSES;

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

const orderTimelineSchema = new mongoose.Schema(
  {
    oldStatus: {
      type: String,
      default: ''
    },
    newStatus: {
      type: String,
      default: ''
    },
    action: {
      type: String,
      default: ''
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    performedByName: {
      type: String,
      trim: true,
      default: ''
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const collectionAttemptSchema = new mongoose.Schema(
  {
    attemptNumber: { type: Number, default: 1 },
    sessionId: { type: String, trim: true, default: '' },
    sampleId: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COLLECTED', 'REJECTED', 'RECOLLECTION_REQUIRED'],
      default: 'IN_PROGRESS'
    },
    sampleType: { type: String, trim: true, default: 'Blood' },
    quantityCollected: { type: Number, default: null },
    quantityUnit: { type: String, trim: true, default: 'mL' },
    verificationMethod: { type: String, enum: ['QR', 'OTP', 'MANUAL', 'NONE'], default: 'NONE' },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    collectedAt: { type: Date, default: null },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    collectedByName: { type: String, trim: true, default: '' },
    barcode: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    recollectionReason: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now }
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
    sampleId: {
      type: String,
      trim: true,
      default: ''
    },
    sampleType: {
      type: String,
      trim: true,
      default: ''
    },
    sampleCollectionMethod: {
      type: String,
      trim: true,
      default: 'AT_LAB'
    },
    sampleCollectedAt: {
      type: Date,
      default: null
    },
    sampleCollectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    sampleCollectedByName: {
      type: String,
      trim: true,
      default: ''
    },
    processingStartedAt: {
      type: Date,
      default: null
    },
    processingStartedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    processingStartedByName: {
      type: String,
      trim: true,
      default: ''
    },
    processingCompletedAt: {
      type: Date,
      default: null
    },
    processingCompletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    processingCompletedByName: {
      type: String,
      trim: true,
      default: ''
    },
    resultsCompletedAt: {
      type: Date,
      default: null
    },
    resultsCompletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resultsCompletedByName: {
      type: String,
      trim: true,
      default: ''
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
      enum: ['AT_LAB', 'AT_LABORATORY', 'HOME_COLLECTION'],
      default: 'AT_LAB'
    },
    collectionMode: {
      type: String,
      enum: ['AT_LABORATORY', 'AT_LAB', 'HOME_COLLECTION'],
      default: 'AT_LABORATORY'
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
    scheduledCollectionDate: {
      type: Date,
      default: null
    },
    scheduledCollectionStartTime: {
      type: String,
      trim: true,
      default: ''
    },
    scheduledCollectionEndTime: {
      type: String,
      trim: true,
      default: ''
    },
    collectionToken: {
      type: String,
      trim: true,
      default: ''
    },
    collectionQrPayload: {
      type: String,
      trim: true,
      default: ''
    },
    collectionOtp: {
      type: String,
      trim: true,
      default: ''
    },
    collectionSessionStarted: {
      type: Boolean,
      default: false
    },
    collectionStatus: {
      type: String,
      enum: ['NOT_STARTED', 'READY', 'IN_PROGRESS', 'COLLECTED', 'RECOLLECTION_REQUIRED'],
      default: 'NOT_STARTED'
    },
    collectionSession: {
      sessionId: { type: String, trim: true, default: '' },
      status: {
        type: String,
        enum: ['NOT_STARTED', 'READY', 'IN_PROGRESS', 'COLLECTED', 'RECOLLECTION_REQUIRED'],
        default: 'NOT_STARTED'
      },
      otp: { type: String, trim: true, default: '' },
      verified: { type: Boolean, default: false },
      verificationMethod: { type: String, enum: ['QR', 'OTP', 'MANUAL', 'NONE'], default: 'NONE' },
      verifiedAt: { type: Date, default: null },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      sampleType: { type: String, trim: true, default: 'Blood' },
      quantityCollected: { type: Number, default: null },
      quantityUnit: { type: String, trim: true, default: 'mL' },
      barcode: { type: String, trim: true, default: '' },
      startedAt: { type: Date, default: null },
      startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      startedByName: { type: String, trim: true, default: '' },
      collectionMode: { type: String, trim: true, default: 'AT_LABORATORY' },
      collectionDate: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      notes: { type: String, trim: true, default: '' }
    },
    collectionAttempts: {
      type: [collectionAttemptSchema],
      default: []
    },
    recollectionCount: {
      type: Number,
      default: 0
    },
    activeSampleId: {
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
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    finalizedByName: {
      type: String,
      trim: true,
      default: ''
    },
    timeline: {
      type: [orderTimelineSchema],
      default: []
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
