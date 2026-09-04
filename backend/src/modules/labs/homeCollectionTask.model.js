const mongoose = require('mongoose');

const HOME_COLLECTION_STATUSES = [
  'REQUESTED',
  'ASSIGNED',
  'COLLECTOR_DISPATCHED',
  'ARRIVED',
  'COLLECTED',
  'TRANSPORTING',
  'RECEIVED_AT_LAB',
  'FAILED',
  'CANCELLED'
];

const homeCollectionTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabOrder',
      required: true
    },
    orderNumber: {
      type: String,
      trim: true,
      default: ''
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null
    },
    patientName: {
      type: String,
      trim: true,
      default: ''
    },
    patientPhone: {
      type: String,
      trim: true,
      default: ''
    },
    laboratoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    collectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    collectorName: {
      type: String,
      trim: true,
      default: ''
    },
    collectorPhone: {
      type: String,
      trim: true,
      default: ''
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    slot: {
      type: String,
      trim: true,
      default: '10:00 AM - 11:00 AM'
    },
    collectionAddress: {
      fullName: { type: String, trim: true, default: '' },
      mobileNumber: { type: String, trim: true, default: '' },
      line1: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
      landmark: { type: String, trim: true, default: '' }
    },
    testsSummary: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: HOME_COLLECTION_STATUSES,
      default: 'REQUESTED'
    },
    assignedAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    arrivedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    receivedAtLabAt: {
      type: Date,
      default: null
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    sampleCondition: {
      type: String,
      trim: true,
      default: 'GOOD'
    },
    failureReason: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    collection: 'home_collection_tasks',
    timestamps: true
  }
);

homeCollectionTaskSchema.index({ clinicId: 1, taskId: 1 }, { unique: true });
homeCollectionTaskSchema.index({ clinicId: 1, orderId: 1 });
homeCollectionTaskSchema.index({ clinicId: 1, laboratoryId: 1, scheduledDate: 1, status: 1 });
homeCollectionTaskSchema.index({ clinicId: 1, collectorId: 1, status: 1 });

const HomeCollectionTask = mongoose.models.HomeCollectionTask || mongoose.model('HomeCollectionTask', homeCollectionTaskSchema);

module.exports = {
  HomeCollectionTask,
  HOME_COLLECTION_STATUSES
};
