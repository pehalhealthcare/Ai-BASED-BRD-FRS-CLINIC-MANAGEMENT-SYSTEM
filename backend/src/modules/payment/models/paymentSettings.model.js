const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema(
  {
    // Encrypted fields (AES-256-GCM)
    accountNameEncrypted: {
      type: String,
      required: true,
      trim: true
    },
    bankNameEncrypted: {
      type: String,
      required: true,
      trim: true
    },
    accountNumberEncrypted: {
      type: String,
      required: true,
      trim: true
    },
    ifscCodeEncrypted: {
      type: String,
      required: true,
      trim: true
    },
    branchEncrypted: {
      type: String,
      required: true,
      trim: true
    },
    upiIdEncrypted: {
      type: String,
      required: true,
      trim: true
    },
    supportEmailEncrypted: {
      type: String,
      trim: true,
      default: null
    },
    supportPhoneEncrypted: {
      type: String,
      trim: true,
      default: null
    },

    // Masked convenience field (non-sensitive)
    accountNumberLast4: {
      type: String,
      trim: true,
      default: ''
    },

    // QR Code Storage Reference & Metadata
    qrCodeReference: {
      type: String,
      trim: true,
      default: null
    },
    qrCodeMetadata: {
      fileName: { type: String, default: null },
      fileSize: { type: Number, default: null }, // In bytes
      mimeType: { type: String, default: null },
      uploadedAt: { type: Date, default: null },
      detectedUpiId: { type: String, default: null }
    },

    // Configuration Versioning & Active State
    version: {
      type: Number,
      required: true,
      default: 1
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true
    },

    // Audit and Tracking Information
    changeSummary: {
      type: String,
      trim: true,
      default: 'Configuration updated'
    },
    changedFields: {
      type: [String],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'payment_settings',
    timestamps: true
  }
);

paymentSettingsSchema.index({ version: -1 });
paymentSettingsSchema.index({ isActive: 1 });

const PaymentSettings = mongoose.models.PaymentSettings || mongoose.model('PaymentSettings', paymentSettingsSchema);

module.exports = PaymentSettings;
