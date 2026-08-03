const mongoose = require('mongoose');

const manufacturerSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    gstNumber: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    code: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    drugLicenseNumber: {
      type: String,
      trim: true,
      default: ''
    },
    pan: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Blocked'],
      default: 'Active'
    },
    createdSource: {
      type: String,
      default: ''
    },
    createdFrom: {
      type: String,
      default: ''
    },
    isPreferred: {
      type: Boolean,
      default: false
    },
    outstandingAmount: {
      type: Number,
      default: 0
    },
    leadTimeDays: {
      type: Number,
      default: 3
    }
  },
  {
    timestamps: true,
    collection: 'manufacturers'
  }
);

const Manufacturer = mongoose.models.Manufacturer || mongoose.model('Manufacturer', manufacturerSchema);
module.exports = Manufacturer;
