const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    globalId: {
      type: String,
      required: true,
      unique: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    providerType: {
      type: String,
      required: true,
      enum: ['Pharmacy', 'Laboratory']
    },
    providerSubtype: {
      type: String,
      required: true,
      enum: ['Internal', 'External', 'Referral', 'API Integrated']
    },
    providerCategory: {
      type: String,
      required: true,
      enum: [
        'Own Provider',
        'Partner Provider',
        'Third-party Provider',
        'Government Provider',
        'Corporate Provider'
      ]
    },
    logo: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    },
    website: {
      type: String,
      default: ''
    },
    address: {
      line1: { type: String, required: true },
      line2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: String, required: true }
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    services: {
      homeSampleCollection: { type: Boolean, default: false },
      walkInTesting: { type: Boolean, default: false },
      reportUpload: { type: Boolean, default: false },
      reportDownload: { type: Boolean, default: false },
      digitalReports: { type: Boolean, default: false },
      walkInPurchase: { type: Boolean, default: false },
      homeDelivery: { type: Boolean, default: false },
      pickupAvailable: { type: Boolean, default: false },
      prescriptionRequired: { type: Boolean, default: false }
    },
    workingHours: {
      workingDays: [{ type: String }],
      openingTime: { type: String, default: '' },
      closingTime: { type: String, default: '' },
      emergencyServices: { type: Boolean, default: false },
      averageTurnaroundTime: { type: String, default: '' },
      homeDeliveryRadius: { type: Number, default: 0 }
    },
    assignedBranches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic'
      }
    ],
    integrationType: {
      type: String,
      enum: ['None', 'Manual', 'API Integration'],
      default: 'None'
    },
    apiProviderName: {
      type: String,
      default: ''
    },
    integrationStatus: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended', 'Archived'],
      default: 'Active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'healthcare_providers'
  }
);

providerSchema.index({ clinicId: 1, name: 1 }, { unique: true });

const Provider = mongoose.models.Provider || mongoose.model('Provider', providerSchema);

module.exports = Provider;
