const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    logo: {
      type: String,
      default: ''
    },
    headOfficeImage: {
      type: String,
      default: ''
    },
    headOfficeEmail: {
      type: String,
      default: ''
    },
    headOfficeAddress: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    },
    mission: {
      type: String,
      default: ''
    },
    achievements: {
      type: [String],
      default: []
    },
    facilities: {
      type: [String],
      default: []
    }
  },
  {
    collection: 'organizations',
    timestamps: true
  }
);

organizationSchema.index({ email: 1 }, { unique: true });
organizationSchema.index({ name: 1 });

const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);

module.exports = Organization;
