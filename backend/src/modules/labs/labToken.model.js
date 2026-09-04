const mongoose = require('mongoose');

const TOKEN_STATUSES = [
  'WAITING',
  'CALLED',
  'IN_COLLECTION',
  'COLLECTED',
  'SKIPPED',
  'CANCELLED'
];

const TOKEN_QUEUE_TYPES = [
  'ROUTINE',
  'PRIORITY',
  'HOME_COLLECTION',
  'WALK_IN',
  'APPOINTMENT'
];

const TOKEN_PRIORITIES = [
  'routine',
  'urgent',
  'stat'
];

const labTokenSchema = new mongoose.Schema(
  {
    tokenId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
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
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      trim: true
    },
    tokenNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    sequenceNumber: {
      type: Number,
      required: true
    },
    counterPrefix: {
      type: String,
      trim: true,
      default: 'A'
    },
    deskNumber: {
      type: String,
      trim: true,
      default: 'Desk 1'
    },
    queueType: {
      type: String,
      enum: TOKEN_QUEUE_TYPES,
      default: 'ROUTINE'
    },
    priority: {
      type: String,
      enum: TOKEN_PRIORITIES,
      default: 'routine'
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabOrder',
      default: null
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
    testsSummary: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: TOKEN_STATUSES,
      default: 'WAITING'
    },
    calledAt: {
      type: Date,
      default: null
    },
    recalledCount: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'lab_tokens',
    timestamps: true
  }
);

labTokenSchema.index({ clinicId: 1, laboratoryId: 1, date: 1, tokenNumber: 1 }, { unique: true });
labTokenSchema.index({ clinicId: 1, laboratoryId: 1, date: 1, status: 1, sequenceNumber: 1 });
labTokenSchema.index({ clinicId: 1, orderId: 1 });

const LabToken = mongoose.models.LabToken || mongoose.model('LabToken', labTokenSchema);

module.exports = {
  LabToken,
  TOKEN_STATUSES,
  TOKEN_QUEUE_TYPES,
  TOKEN_PRIORITIES
};
