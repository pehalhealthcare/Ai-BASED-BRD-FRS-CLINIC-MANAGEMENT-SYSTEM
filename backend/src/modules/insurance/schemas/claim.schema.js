const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true
    },
    policyNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic'
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    claimAmount: {
      type: Number,
      required: true,
      min: 0
    },
    approvedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED'],
      default: 'PENDING'
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    documents: {
      type: [String],
      default: []
    },
    timeline: {
      type: [timelineSchema],
      default: () => [
        {
          status: 'PENDING',
          description: 'Claim submitted and awaiting review.'
        }
      ]
    }
  },
  {
    timestamps: true,
    collection: 'insuranceClaims'
  }
);

claimSchema.index({ claimId: 1 });
claimSchema.index({ patientId: 1 });
claimSchema.index({ invoiceId: 1 });

const InsuranceClaim = mongoose.models.InsuranceClaim || mongoose.model('InsuranceClaim', claimSchema);

module.exports = InsuranceClaim;
