const mongoose = require('mongoose');

const emailJobSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Sent', 'Failed'],
      default: 'Pending',
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    errorLog: {
      type: String,
      default: ''
    }
  },
  {
    collection: 'email_jobs',
    timestamps: true
  }
);

emailJobSchema.index({ status: 1, attempts: 1 });

const EmailJob = mongoose.models.EmailJob || mongoose.model('EmailJob', emailJobSchema);

module.exports = EmailJob;
