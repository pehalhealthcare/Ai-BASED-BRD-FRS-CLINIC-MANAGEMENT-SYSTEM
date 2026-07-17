const mongoose = require('mongoose');

const providerMappingSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true
    },
    mappingType: {
      type: String,
      required: true,
      enum: ['Medicine', 'LabTest']
    },
    globalMedicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalMedicine',
      default: null
    },
    globalLabTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
      default: null
    },
    providerCode: {
      type: String,
      required: true,
      trim: true
    },
    providerName: {
      type: String,
      required: true,
      trim: true
    },
    packSize: {
      type: String,
      trim: true,
      default: ''
    },
    manufacturer: {
      type: String,
      trim: true,
      default: ''
    },
    dosageForm: {
      type: String,
      trim: true,
      default: ''
    },
    strength: {
      type: String,
      trim: true,
      default: ''
    },
    sampleType: {
      type: String,
      trim: true,
      default: ''
    },
    methodology: {
      type: String,
      trim: true,
      default: ''
    },
    normalReportingTime: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending Review'],
      default: 'Active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'provider_mappings'
  }
);

providerMappingSchema.index({ providerId: 1, globalMedicineId: 1 }, { unique: true, sparse: true });
providerMappingSchema.index({ providerId: 1, globalLabTestId: 1 }, { unique: true, sparse: true });

const ProviderMapping = mongoose.models.ProviderMapping || mongoose.model('ProviderMapping', providerMappingSchema);

module.exports = ProviderMapping;
