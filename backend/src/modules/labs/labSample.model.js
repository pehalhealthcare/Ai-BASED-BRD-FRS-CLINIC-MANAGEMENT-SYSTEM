const mongoose = require('mongoose');
const { SAMPLE_STATUSES, SAMPLE_CONDITIONS } = require('./labStatus.constants');

const timelineEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorName: {
      type: String,
      trim: true,
      default: ''
    },
    actorRole: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const labSampleSchema = new mongoose.Schema(
  {
    sampleId: {
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
    specimenType: {
      type: String,
      required: true,
      trim: true
    },
    containerType: {
      type: String,
      required: true,
      trim: true
    },
    containerColor: {
      type: String,
      trim: true,
      default: '#8B5CF6'
    },
    collectionLocation: {
      type: String,
      enum: ['AT_LAB', 'HOME_COLLECTION'],
      default: 'AT_LAB'
    },
    status: {
      type: String,
      enum: SAMPLE_STATUSES,
      default: 'COLLECTED'
    },
    testIds: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    testNames: {
      type: [String],
      default: []
    },
    volumeRequired: {
      type: String,
      trim: true,
      default: '2 - 3 mL'
    },
    volumeCollected: {
      type: String,
      trim: true,
      default: '2.5 mL'
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    collectedByName: {
      type: String,
      trim: true,
      default: ''
    },
    collectedAt: {
      type: Date,
      default: Date.now
    },
    deskNumber: {
      type: String,
      trim: true,
      default: 'Desk 1'
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    receivedByName: {
      type: String,
      trim: true,
      default: ''
    },
    receivedAt: {
      type: Date,
      default: null
    },
    sampleCondition: {
      type: String,
      enum: SAMPLE_CONDITIONS,
      default: 'GOOD'
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    recollectionOfSampleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabSample',
      default: null
    },
    barcode: {
      type: String,
      trim: true,
      default: ''
    },
    labelPrintedAt: {
      type: Date,
      default: null
    },
    timeline: {
      type: [timelineEventSchema],
      default: []
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    collection: 'lab_samples',
    timestamps: true
  }
);

labSampleSchema.index({ clinicId: 1, sampleId: 1 }, { unique: true });
labSampleSchema.index({ clinicId: 1, orderId: 1, createdAt: -1 });
labSampleSchema.index({ clinicId: 1, laboratoryId: 1, status: 1 });
labSampleSchema.index({ clinicId: 1, patientId: 1 });
labSampleSchema.index({ clinicId: 1, barcode: 1 });

const LabSample = mongoose.models.LabSample || mongoose.model('LabSample', labSampleSchema);

module.exports = {
  LabSample,
  SAMPLE_STATUSES,
  SAMPLE_CONDITIONS
};
