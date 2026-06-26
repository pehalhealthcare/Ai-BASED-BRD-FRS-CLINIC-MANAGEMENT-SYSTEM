const mongoose = require('mongoose');

const receptionistAvailabilitySchema = new mongoose.Schema(
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

const receptionistSchema = new mongoose.Schema(
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
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    receptionistCode: {
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
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
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
    availability: [receptionistAvailabilitySchema],
    approvalStatus: {
      type: String,
      enum: ['pending_profile', 'pending_approval', 'approved', 'rejected', 're_edit'],
      default: 'pending_profile'
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

receptionistSchema.index({ userId: 1 });
receptionistSchema.index({ receptionistCode: 1 });
receptionistSchema.index({ clinicId: 1 });

const Receptionist = mongoose.models.Receptionist || mongoose.model('Receptionist', receptionistSchema, 'receptionists');

module.exports = Receptionist;
