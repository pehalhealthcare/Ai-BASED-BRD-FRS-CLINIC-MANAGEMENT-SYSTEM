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
      required: false,
      default: null
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
      },
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      }
    },
    permanentAddress: {
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
      },
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
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
    currentMedications: [
      {
        name: { type: String, trim: true },
        frequency: { type: String, trim: true }
      }
    ],
    pastSurgeries: [
      {
        name: { type: String, trim: true },
        year: { type: String, trim: true }
      }
    ],
    familyHistory: [
      {
        relation: { type: String, trim: true },
        condition: { type: String, trim: true }
      }
    ],
    lifestyle: {
      smoking: { type: String, trim: true, default: 'no' },
      alcohol: { type: String, trim: true, default: 'no' },
      exerciseFrequency: { type: String, trim: true, default: '' },
      dietType: { type: String, trim: true, default: '' }
    },
    pregnancyHistory: {
      type: String,
      trim: true,
      default: ''
    },
    lmpDate: {
      type: Date,
      default: null
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
      autoClaimAutomation: { type: Boolean, default: false },
      coverageAmount: { type: Number, default: 0 },
      remainingCoverage: { type: Number, default: 0 },
      lastResetAt: { type: Date, default: null }
    },
    paymentMethods: [
      {
        cardholderName: { type: String, trim: true, default: '' },
        cardNumber: { type: String, trim: true, default: '' },
        expiryDate: { type: String, trim: true, default: '' },
        cardType: { type: String, trim: true, default: 'card' }
      }
    ],
    medicalHistoryPassword: {
      type: String,
      default: '',
      select: false
    },
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

  if (this.currentMedications && Array.isArray(this.currentMedications)) {
    this.currentMedications = this.currentMedications.map(med => {
      if (typeof med === 'string') {
        return { name: med, frequency: '' };
      }
      return med;
    });
  }

  next();
});

patientSchema.index({ patientId: 1 }, { unique: true });
patientSchema.index({ phone: 1 }, { unique: true });
patientSchema.index({ clinicId: 1, patientId: 1 });
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

patientSchema.pre('save', async function (next) {
  if (!this.isModified('medicalHistoryPassword')) return next();
  if (this.medicalHistoryPassword) {
    const bcrypt = require('bcryptjs');
    this.medicalHistoryPassword = await bcrypt.hash(this.medicalHistoryPassword, 10);
  }
  next();
});

patientSchema.methods.compareHistoryPassword = async function (candidatePassword) {
  if (!this.medicalHistoryPassword) return false;
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.medicalHistoryPassword);
};

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);

module.exports = Patient;
