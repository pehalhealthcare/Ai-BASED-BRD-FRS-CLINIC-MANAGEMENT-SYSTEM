const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      trim: true,
      required: true
    },
    genericName: {
      type: String,
      trim: true,
      default: ''
    },
    dosage: {
      type: String,
      trim: true,
      required: true
    },
    frequency: {
      type: String,
      trim: true,
      required: true
    },
    duration: {
      type: String,
      trim: true,
      required: true
    },
    route: {
      type: String,
      enum: ['oral', 'topical', 'injection', 'inhalation', 'other'],
      default: 'oral'
    },
    timing: {
      type: String,
      trim: true,
      default: ''
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    },
    quantity: {
      type: Number,
      default: null
    },
    isSubstituteAllowed: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const aiAssistSchema = new mongoose.Schema(
  {
    used: {
      type: Boolean,
      default: false
    },
    suggestionId: {
      type: String,
      trim: true,
      default: ''
    },
    disclaimer: {
      type: String,
      trim: true,
      default: ''
    },
    doctorReviewed: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const prescriptionOverrideSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    used: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
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
      required: true,
      index: true
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
      index: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true
    },
    prescriptionNumber: {
      type: String,
      trim: true,
      required: true,
      unique: true
    },
    diagnosisSnapshot: {
      type: String,
      trim: true,
      default: ''
    },
    symptomsSnapshot: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    medicines: {
      type: [prescriptionItemSchema],
      default: []
    },
    advice: {
      type: String,
      trim: true,
      default: ''
    },
    drugSafetyCheck: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    drugSafetySeverity: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical', 'unknown'],
      default: 'none'
    },
    doctorOverride: {
      type: prescriptionOverrideSchema,
      default: () => ({})
    },
    overrideReason: {
      type: String,
      trim: true,
      default: ''
    },
    overrideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    overrideAt: {
      type: Date,
      default: null
    },
    followUpDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['draft', 'finalized', 'cancelled'],
      default: 'draft'
    },
    dispensingStatus: {
      type: String,
      enum: ['not_dispensed', 'partially_dispensed', 'dispensed'],
      default: 'not_dispensed'
    },
    dispensedAt: {
      type: Date,
      default: null
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: ''
    },
    finalizedAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ''
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
    aiAssist: {
      type: aiAssistSchema,
      default: () => ({})
    }
  },
  {
    collection: 'prescriptions',
    timestamps: true
  }
);

prescriptionSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
prescriptionSchema.index({ clinicId: 1, doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ clinicId: 1, consultationId: 1, createdAt: -1 });

const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);

module.exports = Prescription;
