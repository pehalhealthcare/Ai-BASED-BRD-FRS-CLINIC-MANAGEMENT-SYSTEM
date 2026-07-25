const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
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
    paymentTerms: {
      type: String,
      trim: true,
      default: ''
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
    type: {
      type: String,
      enum: ['manufacturer', 'distributor', 'wholesaler', 'local_vendor', 'importer', 'other'],
      default: 'other'
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
    creditDays: {
      type: Number,
      default: 0
    },
    preferredCurrency: {
      type: String,
      default: 'INR'
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      upi: { type: String, default: '' }
    },
    preferredSupplier: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'suppliers'
  }
);

supplierSchema.pre('save', function (next) {
  if (!this.code) {
    this.code = 'SUP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

supplierSchema.index({ clinicId: 1, name: 1 }, { unique: true });

const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
module.exports = Supplier;
