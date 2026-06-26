const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    providerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    providerName: {
      type: String,
      required: true,
      trim: true
    },
    logo: {
      type: String,
      trim: true,
      default: ''
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    supportedClaimTypes: {
      type: [String],
      default: ['consultation', 'lab', 'pharmacy', 'hospitalization', 'emergency', 'surgery']
    }
  },
  {
    timestamps: true,
    collection: 'insuranceProviders'
  }
);

const InsuranceProvider = mongoose.models.InsuranceProvider || mongoose.model('InsuranceProvider', providerSchema);

module.exports = InsuranceProvider;
