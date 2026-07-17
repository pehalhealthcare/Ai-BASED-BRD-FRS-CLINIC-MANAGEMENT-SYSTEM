const mongoose = require('mongoose');

const patientClinicRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    allergies: {
      type: [String],
      default: []
    },
    chronicConditions: {
      type: [String],
      default: []
    },
    currentMedications: [
      {
        name: { type: String, trim: true },
        frequency: { type: String, trim: true }
      }
    ],
    pastSurgeries: [
      {
        name: { type: String, trim: true },
        year: { type: String, trim: true }
      }
    ],
    familyHistory: [
      {
        relation: { type: String, trim: true },
        condition: { type: String, trim: true }
      }
    ],
    lifestyle: {
      smoking: { type: String, trim: true, default: 'no' },
      alcohol: { type: String, trim: true, default: 'no' },
      exerciseFrequency: { type: String, trim: true, default: '' },
      dietType: { type: String, trim: true, default: '' }
    },
    pregnancyHistory: {
      type: String,
      trim: true,
      default: ''
    },
    lmpDate: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'patient_clinic_records',
    timestamps: true
  }
);

// One medical record per patient per clinic
patientClinicRecordSchema.index({ patientId: 1, clinicId: 1 }, { unique: true });
patientClinicRecordSchema.index({ clinicId: 1 });
patientClinicRecordSchema.index({ patientId: 1 });

const PatientClinicRecord = mongoose.models.PatientClinicRecord || mongoose.model('PatientClinicRecord', patientClinicRecordSchema);

module.exports = PatientClinicRecord;
