const mongoose = require('mongoose');

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

const resultEntrySchema = new mongoose.Schema(
  {
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
    value: {
      type: String,
      required: true,
      trim: true
    },
    numericValue: {
      type: Number,
      default: null
    },
    unit: {
      type: String,
      trim: true,
      default: ''
    },
    normalRange: {
      type: normalRangeSchema,
      default: () => ({})
    },
    isAbnormal: {
      type: Boolean,
      default: false
    },
    abnormalFlag: {
      type: String,
      enum: ['low', 'high', 'critical', 'normal'],
      default: 'normal'
    },
    interpretationNote: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const labReportSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    labOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabOrder',
      required: true,
      unique: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reportUrl: {
      type: String,
      trim: true,
      default: ''
    },
    reportFileName: {
      type: String,
      trim: true,
      default: ''
    },
    resultEntries: {
      type: [resultEntrySchema],
      default: []
    },
    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    aiAnalysisStatus: {
      type: String,
      enum: ['not_requested', 'available', 'insufficient_reference_data', 'unavailable', 'ai_service_unavailable'],
      default: 'not_requested'
    },
    aiRiskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical', 'unknown'],
      default: 'unknown'
    },
    aiReviewStatus: {
      type: String,
      enum: ['not_requested', 'pending_review', 'reviewed', 'accepted', 'rejected'],
      default: 'not_requested'
    },
    aiReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    aiReviewedAt: {
      type: Date,
      default: null
    },
    aiReviewNote: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'reviewed', 'finalized'],
      default: 'draft'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
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
    }
  },
  {
    collection: 'lab_reports',
    timestamps: true
  }
);

labReportSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
labReportSchema.index({ clinicId: 1, consultationId: 1, createdAt: -1 });
labReportSchema.index({ clinicId: 1, status: 1, createdAt: -1 });
labReportSchema.index({ clinicId: 1, aiReviewStatus: 1, createdAt: -1 });

const LabReport = mongoose.models.LabReport || mongoose.model('LabReport', labReportSchema);

module.exports = LabReport;
