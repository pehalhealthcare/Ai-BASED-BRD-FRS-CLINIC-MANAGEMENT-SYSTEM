const mongoose = require('mongoose');

const aiPredictionSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      default: null
    },
    predictionType: {
      type: String,
      enum: [
        'symptom_check',
        'diagnosis_suggestion',
        'clinical_note',
        'no_show',
        'risk_warning',
        'pharmacy_demand'
      ],
      required: true
    },
    inputData: {
      type: Object,
      default: {}
    },
    outputData: {
      type: Object,
      default: {}
    },
    confidenceScore: {
      type: Number,
      default: 0
    },
    modelName: {
      type: String,
      trim: true,
      default: ''
    },
    modelVersion: {
      type: String,
      trim: true,
      default: ''
    },
    disclaimer: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'ai_predictions',
    timestamps: false
  }
);

aiPredictionSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
aiPredictionSchema.index({ consultationId: 1 });
aiPredictionSchema.index({ appointmentId: 1 });
aiPredictionSchema.index({ medicineId: 1, createdAt: -1 });

const AIPrediction = mongoose.models.AIPrediction || mongoose.model('AIPrediction', aiPredictionSchema);

module.exports = AIPrediction;
