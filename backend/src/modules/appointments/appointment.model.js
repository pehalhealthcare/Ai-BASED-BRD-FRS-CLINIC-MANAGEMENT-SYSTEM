const mongoose = require('mongoose');

const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');

const noShowRiskSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      default: 0.1
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    reasons: {
      type: [String],
      default: []
    },
    reasonCodes: {
      type: [String],
      default: []
    },
    recommendedAction: {
      type: String,
      trim: true,
      default: 'Standard reminder is sufficient.'
    },
    confidence: {
      type: Number,
      default: 0
    },
    modelName: {
      type: String,
      trim: true,
      default: 'rule_based_no_show_local'
    },
    modelVersion: {
      type: String,
      trim: true,
      default: 'local-1.0.0'
    },
    modelStatus: {
      type: String,
      enum: ['available', 'fallback', 'insufficient_data', 'unavailable', 'local'],
      default: 'local'
    },
    requiresStaffReview: {
      type: Boolean,
      default: true
    },
    auditId: {
      type: String,
      trim: true,
      default: ''
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    appointmentDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    endTime: {
      type: String,
      required: true,
      trim: true
    },
    durationMinutes: {
      type: Number,
      enum: [15, 30, 45, 60],
      default: 30
    },
    appointmentType: {
      type: String,
      enum: ['scheduled', 'walk_in', 'follow_up', 'teleconsultation'],
      default: 'scheduled'
    },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUSES),
      default: APPOINTMENT_STATUSES.BOOKED
    },
    reasonForVisit: {
      type: String,
      trim: true,
      default: ''
    },
    symptomsSummary: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      enum: ['reception', 'patient_app', 'chatbot', 'admin'],
      default: 'reception'
    },
    noShowRisk: {
      type: noShowRiskSchema,
      default: () => ({})
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ''
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    meta: {
      type: Object,
      default: {}
    }
  },
  {
    collection: 'appointments',
    timestamps: true
  }
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ clinicId: 1 });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
