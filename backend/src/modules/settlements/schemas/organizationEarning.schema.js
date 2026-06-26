const mongoose = require('mongoose');

const organizationEarningSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true
    },
    grossRevenue: {
      type: Number,
      required: true,
      min: 0
    },
    insuranceAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    patientAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    netRevenue: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['PENDING', 'SETTLED'],
      default: 'PENDING'
    }
  },
  {
    timestamps: true,
    collection: 'organizationEarnings'
  }
);

organizationEarningSchema.index({ organizationId: 1 });
organizationEarningSchema.index({ invoiceId: 1 });

const OrganizationEarning = mongoose.models.OrganizationEarning || mongoose.model('OrganizationEarning', organizationEarningSchema);

module.exports = OrganizationEarning;
