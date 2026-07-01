const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    tokenNumber: {
      type: String,
      required: true,
      trim: true
    },
    queuePosition: {
      type: Number,
      required: true
    },
    priority: {
      type: String,
      enum: ['standard', 'emergency', 'vip', 'doctor_override'],
      default: 'standard'
    },
    status: {
      type: String,
      enum: ['waiting', 'called', 'in_consultation', 'skipped', 'completed'],
      default: 'waiting'
    },
    otp: {
      type: String,
      default: ''
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    skippedTime: {
      type: Date,
      default: null
    },
    originalTokenNumber: {
      type: String,
      default: ''
    },
    isReassigned: {
      type: Boolean,
      default: false
    },
    generatedTime: {
      type: Date,
      default: Date.now
    },
    calledTime: {
      type: Date,
      default: null
    },
    consultationStarted: {
      type: Date,
      default: null
    },
    consultationCompleted: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'tokens'
  }
);

tokenSchema.index({ doctorId: 1, createdAt: 1 });
tokenSchema.index({ status: 1 });

const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);

module.exports = Token;
