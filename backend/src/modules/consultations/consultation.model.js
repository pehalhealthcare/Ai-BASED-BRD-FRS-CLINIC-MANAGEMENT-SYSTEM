const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'mild'
    },
    duration: {
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
  { _id: false }
);

const vitalsSchema = new mongoose.Schema(
  {
    temperature: {
      type: Number,
      default: null
    },
    bloodPressure: {
      type: String,
      trim: true,
      default: ''
    },
    pulse: {
      type: Number,
      default: null
    },
    respiratoryRate: {
      type: Number,
      default: null
    },
    oxygenSaturation: {
      type: Number,
      alias: 'spo2',
      default: null
    },
    weight: {
      type: Number,
      default: null
    },
    height: {
      type: Number,
      default: null
    }
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const formattedClinicalNotesSchema = new mongoose.Schema(
  {
    subjective: {
      type: String,
      trim: true,
      default: ''
    },
    objective: {
      type: String,
      trim: true,
      default: ''
    },
    assessment: {
      type: String,
      trim: true,
      default: ''
    },
    plan: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const aiSoapNoteSchema = new mongoose.Schema(
  {
    note_type: {
      type: String,
      default: 'SOAP'
    },
    subjective: {
      type: String,
      trim: true,
      default: ''
    },
    objective: {
      type: String,
      trim: true,
      default: ''
    },
    assessment: {
      type: String,
      trim: true,
      default: ''
    },
    plan: {
      type: String,
      trim: true,
      default: ''
    },
    draft_ai_note: {
      type: Boolean,
      default: false
    },
    missing_information: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const aiNoteMetadataSchema = new mongoose.Schema(
  {
    model_name: {
      type: String,
      trim: true,
      default: ''
    },
    model_version: {
      type: String,
      trim: true,
      default: ''
    },
    confidence: {
      type: Number,
      default: 0
    },
    audit_id: {
      type: String,
      trim: true,
      default: ''
    },
    created_at: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const diagnosisSchema = new mongoose.Schema(
  {
    primary: {
      type: String,
      trim: true,
      default: ''
    },
    secondary: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const followUpSchema = new mongoose.Schema(
  {
    required: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const aiSuggestionItemSchema = new mongoose.Schema(
  {
    condition: {
      type: String,
      trim: true,
      required: true
    },
    confidence: {
      type: Number,
      default: 0
    },
    reasoning: {
      type: String,
      trim: true,
      default: ''
    },
    recommendedSpecialization: {
      type: String,
      trim: true,
      default: ''
    },
    redFlags: {
      type: [String],
      default: []
    },
    recommendedTests: {
      type: [String],
      default: []
    },
    safetyNote: {
      type: String,
      trim: true,
      default: 'AI-generated suggestions are assistive only and require doctor validation.'
    }
  },
  { _id: true }
);

const aiSuggestionsSchema = new mongoose.Schema(
  {
    requested: {
      type: Boolean,
      default: false
    },
    generatedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: [
        'not_requested',
        'pending',
        'generated',
        'accepted',
        'partially_accepted',
        'rejected',
        'failed'
      ],
      default: 'not_requested'
    },
    suggestions: {
      type: [aiSuggestionItemSchema],
      default: []
    },
    rawResponse: {
      type: Object,
      default: {}
    },
    errorMessage: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const aiReviewSchema = new mongoose.Schema(
  {
    decision: {
      type: String,
      enum: ['pending', 'accepted', 'partially_accepted', 'rejected'],
      default: 'pending'
    },
    acceptedSuggestions: {
      type: [String],
      default: []
    },
    rejectedSuggestions: {
      type: [String],
      default: []
    },
    doctorComment: {
      type: String,
      trim: true,
      default: ''
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { _id: false }
);

const consultationSchema = new mongoose.Schema(
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true
    },
    chiefComplaint: {
      type: String,
      trim: true,
      required: true
    },
    symptoms: {
      type: [symptomSchema],
      default: []
    },
    vitals: {
      type: vitalsSchema,
      default: () => ({})
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: ''
    },
    formattedClinicalNotes: {
      type: formattedClinicalNotesSchema,
      default: () => ({})
    },
    transcript_text: {
      type: String,
      trim: true,
      default: ''
    },
    ai_soap_note: {
      type: aiSoapNoteSchema,
      default: () => ({})
    },
    ai_note_status: {
      type: String,
      enum: ['draft', 'approved', 'rejected', 'edited'],
      default: 'draft'
    },
    approved_note: {
      type: aiSoapNoteSchema,
      default: () => ({})
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approved_at: {
      type: Date,
      default: null
    },
    ai_note_metadata: {
      type: aiNoteMetadataSchema,
      default: () => ({})
    },
    diagnosis: {
      type: diagnosisSchema,
      default: () => ({})
    },
    treatmentPlan: {
      type: String,
      trim: true,
      default: ''
    },
    followUp: {
      type: followUpSchema,
      default: () => ({})
    },
    aiSuggestions: {
      type: aiSuggestionsSchema,
      default: () => ({})
    },
    aiReview: {
      type: aiReviewSchema,
      default: () => ({})
    },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'cancelled'],
      default: 'draft'
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    prescriptionCreated: {
      type: Boolean,
      default: false
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: ''
    },
    labOrdered: {
      type: Boolean,
      default: false
    },
    billingReady: {
      type: Boolean,
      default: false
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
    reedit_code: {
      type: String,
      trim: true,
      default: ''
    },
    reeditCodeExpiresAt: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'consultations',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

consultationSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
consultationSchema.index({ clinicId: 1, doctorId: 1, createdAt: -1 });
consultationSchema.index({ status: 1 });
consultationSchema.index({ 'diagnosis.primary': 'text' });

consultationSchema.pre('validate', function consultationPreValidate(next) {
  if (this.followUp?.date && typeof this.followUp.required !== 'boolean') {
    this.followUp.required = true;
  }

  if (this.followUp?.date && this.followUp.required === false) {
    this.followUp.required = true;
  }

  next();
});

const Consultation = mongoose.models.Consultation || mongoose.model('Consultation', consultationSchema);

module.exports = Consultation;
