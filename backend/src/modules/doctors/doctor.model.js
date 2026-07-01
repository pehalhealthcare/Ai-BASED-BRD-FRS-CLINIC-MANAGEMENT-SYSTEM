const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
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
    slotDurationMinutes: {
      type: Number,
      enum: [15, 30, 45, 60],
      default: 30
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: false,
      default: null
    },
    consultationMode: {
      type: String,
      enum: ['offline', 'online'],
      default: 'offline'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: false
  }
);

const blockedSlotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    endTime: {
      type: String,
      required: true,
      trim: true
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    _id: false
  }
);

const doctorSchema = new mongoose.Schema(
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
    doctorCode: {
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
    specialization: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    qualification: {
      type: String,
      trim: true,
      default: ''
    },
    medicalRegistrationNumber: {
      type: String,
      trim: true,
      default: ''
    },
    experienceYears: {
      type: Number,
      default: 0
    },
    consultationFee: {
      type: Number,
      default: 0
    },
    followUpFee: {
      type: Number,
      default: 0
    },
    earnings: {
      type: Number,
      default: 0
    },
    bankAccount: {
      accountNumber: { type: String, trim: true, default: '' },
      ifscCode: { type: String, trim: true, default: '' },
      bankName: { type: String, trim: true, default: '' },
      accountHolderName: { type: String, trim: true, default: '' },
      passbookCopy: { type: String, default: '' }
    },
    isOnlineAvailable: {
      type: Boolean,
      default: false
    },
    image: {
      type: String,
      default: ''
    },
    documentPdf: {
      type: String,
      default: ''
    },
    signature: {
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
    preferredPracticeLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: false,
      default: null
    },
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
    availability: {
      type: [availabilitySchema],
      default: []
    },
    blockedSlots: {
      type: [blockedSlotSchema],
      default: []
    },
    queueSettings: {
      earlyCheckInMins: { type: Number, default: 30 },
      lateGraceMins: { type: Number, default: 15 },
      noShowTimeoutMins: { type: Number, default: 30 },
      tokenFormat: { type: String, default: 'T-000' }
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
    collection: 'doctors',
    timestamps: true
  }
);

doctorSchema.pre('validate', function setFullName(next) {
  this.fullName = [this.firstName, this.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  next();
});

doctorSchema.index(
  { clinicId: 1, doctorCode: 1 },
  { unique: true, partialFilterExpression: { clinicId: { $exists: true, $ne: null } } }
);
doctorSchema.index({ clinicId: 1, specialization: 1 });
doctorSchema.index({ clinicId: 1, phone: 1 });
doctorSchema.index({
  doctorCode: 'text',
  firstName: 'text',
  lastName: 'text',
  fullName: 'text',
  phone: 'text',
  email: 'text',
  specialization: 'text'
});

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
