const mongoose = require('mongoose');

const providerDraftSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    providerType: {
      type: String,
      required: true
    },
    currentStep: {
      type: Number,
      default: 1
    },
    basicInfo: {
      name: { type: String, default: '' },
      providerSubtype: { type: String, default: 'Internal' },
      assignedBranchId: { type: String, default: '' },
      assignedBranchName: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: {
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        country: { type: String, default: 'India' },
        pincode: { type: String, default: '' },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
      }
    },
    manager: {
      contactPerson: { type: String, default: '' },
      managerPhone: { type: String, default: '' },
      managerEmail: { type: String, default: '' },
      managerGender: { type: String, default: '' },
      managerEmployeeId: { type: String, default: '' }
    },
    operationalSetup: {
      workingHours: {
        workingDays: [{ type: String }],
        openingTime: { type: String, default: '09:00' },
        closingTime: { type: String, default: '21:00' },
        emergencyServices: { type: Boolean, default: false }
      },
      gstNumber: { type: String, default: '' },
      drugLicenseNumber: { type: String, default: '' },
      licenseExpiry: { type: String, default: '' },
      emergencyContact: { type: String, default: '' },
      reorderThreshold: { type: Number, default: 10 },
      barcodeEnabled: { type: Boolean, default: false },
      printerEnabled: { type: Boolean, default: false },
      invoicePrefix: { type: String, default: '' }
    },
    status: {
      type: String,
      default: 'Draft'
    }
  },
  {
    timestamps: true,
    collection: 'provider_drafts'
  }
);

const ProviderDraft = mongoose.models.ProviderDraft || mongoose.model('ProviderDraft', providerDraftSchema);
module.exports = ProviderDraft;
