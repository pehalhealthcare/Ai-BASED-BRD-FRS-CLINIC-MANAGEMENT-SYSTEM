const mongoose = require('mongoose');

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);

  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDifference = today.getUTCMonth() - dob.getUTCMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }

  return age < 0 ? null : age;
};

const patientSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    patientId: {
      type: String,
      required: true,
      trim: true
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
      required: true,
      enum: ['male', 'female', 'other']
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    age: {
      type: Number,
      default: null
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
    address: {
      line1: {
        type: String,
        trim: true,
        default: ''
      },
      line2: {
        type: String,
        trim: true,
        default: ''
      },
      city: {
        type: String,
        trim: true,
        default: ''
      },
      state: {
        type: String,
        trim: true,
        default: ''
      },
      pincode: {
        type: String,
        trim: true,
        default: ''
      },
      country: {
        type: String,
        trim: true,
        default: 'India'
      }
    },
    profileImage: {
      type: String,
      trim: true,
      default: ''
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: ''
    },
    allergies: {
      type: [String],
      default: []
    },
    chronicConditions: {
      type: [String],
      default: []
    },
    currentMedications: {
      type: [String],
      default: []
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
        default: ''
      },
      relation: {
        type: String,
        trim: true,
        default: ''
      },
      phone: {
        type: String,
        trim: true,
        default: ''
      }
    },
    documents: [
      {
        type: {
          type: String,
          trim: true,
          default: ''
        },
        fileName: {
          type: String,
          trim: true,
          default: ''
        },
        fileUrl: {
          type: String,
          trim: true,
          default: ''
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    insuranceDetails: {
      provider: { type: String, trim: true, default: '' },
      policyNumber: { type: String, trim: true, default: '' },
      groupNumber: { type: String, trim: true, default: '' },
      subscriberName: { type: String, trim: true, default: '' },
      subscriberDob: { type: String, default: null },
      autoClaimAutomation: { type: Boolean, default: false }
    },
    paymentMethods: [
      {
        cardholderName: { type: String, trim: true, default: '' },
        cardNumber: { type: String, trim: true, default: '' },
        expiryDate: { type: String, trim: true, default: '' },
        cardType: { type: String, trim: true, default: 'card' }
      }
    ],
    isActive: {
      type: Boolean,
      default: true
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
    collection: 'patients',
    timestamps: true
  }
);

patientSchema.pre('validate', function setDerivedFields(next) {
  const fullName = [this.firstName, this.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  this.fullName = fullName;
  this.age = calculateAge(this.dateOfBirth);
  next();
});

patientSchema.index({ clinicId: 1, patientId: 1 }, { unique: true });
patientSchema.index({ clinicId: 1, phone: 1 });
patientSchema.index({ clinicId: 1, fullName: 1 });
patientSchema.index({ clinicId: 1, email: 1 });
patientSchema.index({
  patientId: 'text',
  firstName: 'text',
  lastName: 'text',
  fullName: 'text',
  phone: 'text',
  email: 'text'
});

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);

module.exports = Patient;
