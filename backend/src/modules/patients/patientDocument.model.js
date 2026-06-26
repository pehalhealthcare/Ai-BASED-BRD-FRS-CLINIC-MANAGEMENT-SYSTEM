const mongoose = require('mongoose');

const patientDocumentSchema = new mongoose.Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    file_name: {
      type: String,
      required: true,
      trim: true
    },
    file_url: {
      type: String,
      required: true,
      trim: true
    },
    document_type: {
      type: String,
      required: true,
      trim: true
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'patient_documents',
    timestamps: true
  }
);

patientDocumentSchema.index({ patient_id: 1 });
patientDocumentSchema.index({ uploaded_by: 1 });

const PatientDocument = mongoose.models.PatientDocument || mongoose.model('PatientDocument', patientDocumentSchema);

module.exports = PatientDocument;
