const mongoose = require('mongoose');

const featureRequestSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    featureCode: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'dismissed'],
      default: 'pending'
    }
  },
  {
    timestamps: true,
    collection: 'feature_requests'
  }
);

// Ensure only one active request per doctor per feature
featureRequestSchema.index({ doctorId: 1, featureCode: 1, status: 1 }, { unique: true });

const FeatureRequest = mongoose.models.FeatureRequest || mongoose.model('FeatureRequest', featureRequestSchema);

module.exports = FeatureRequest;
