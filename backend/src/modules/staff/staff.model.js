const mongoose = require('mongoose');

const staffAvailabilitySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: String,
      trim: true,
      default: ''
    },
    endTime: {
      type: String,
      trim: true,
      default: ''
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: false,
      default: null
    }
  },
  {
    _id: false
  }
);

const staffSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: false,
      default: null
    },
    assignedClinics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic'
      }
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    staffCode: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other'
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    qualification: {
      type: String,
      trim: true,
      default: ''
    },
    experienceYears: {
      type: Number,
      default: 0
    },
    image: {
      type: String,
      default: ''
    },
    documentPdf: {
      type: String,
      default: ''
    },
    signatureImage: {
      type: String,
      default: ''
    },
    certificationsPdf: {
      type: String,
      default: ''
    },
    currentAddress: {
      line1: { type: String, trim: true, default: '' },
      line2: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    permanentAddress: {
      line1: { type: String, trim: true, default: '' },
      line2: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    availability: [staffAvailabilitySchema],
    approvalStatus: {
      type: String,
      enum: [
        'pending_invitation',
        'otp_verification_pending',
        'onboarding_in_progress',
        'pending_approval',
        'changes_requested',
        'approved',
        'rejected',
        'disabled'
      ],
      default: 'pending_invitation'
    },
    hasAcceptedSlot: {
      type: Boolean,
      default: false
    },
    initialSlotAccepted: {
      type: Boolean,
      default: false
    },
    reEditFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reEditComments: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: false
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
    timestamps: true
  }
);

staffSchema.index({ userId: 1 });
staffSchema.index({ staffCode: 1 });
staffSchema.index({ clinicId: 1 });

const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema, 'staff');

module.exports = Staff;
