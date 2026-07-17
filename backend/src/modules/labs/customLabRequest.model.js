const mongoose = require('mongoose');

const customLabRequestSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    testName: {
      type: String,
      required: true,
      trim: true
    },
    isGlobalRequest: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true,
    collection: 'custom_lab_requests'
  }
);

const CustomLabRequest = mongoose.models.CustomLabRequest || mongoose.model('CustomLabRequest', customLabRequestSchema);
module.exports = CustomLabRequest;
