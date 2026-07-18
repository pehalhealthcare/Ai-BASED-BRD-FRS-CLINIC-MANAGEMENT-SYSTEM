const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { ROLES } = require('../../common/constants/roles');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.PATIENT
    },
    department: {
      type: String,
      trim: true,
      default: ''
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    approvalStatus: {
      type: String,
      enum: [
        'pending_profile',
        'pending_approval',
        'approved',
        'rejected',
        're_edit',
        'pending_invitation',
        'otp_verification_pending',
        'onboarding_in_progress',
        'changes_requested',
        'disabled'
      ],
      default: 'approved'
    },
    mustResetPassword: {
      type: Boolean,
      default: false
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
      default: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    },
    emailOtp: {
      type: String,
      default: null
    },
    emailOtpExpires: {
      type: Date,
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null
    },
    origin: {
      type: String,
      enum: ['manual', 'provider_operator'],
      default: 'manual'
    },
    assignedProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ clinicId: 1 });
userSchema.index({ isActive: 1 });

userSchema.pre('save', async function save(next) {
  if (!this.isModified('password')) {
    return next();
  }

  // Prevent double hashing if the password is already hashed (starts with $2a$, $2b$, or $2y$)
  if (typeof this.password === 'string' && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$'))) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

module.exports = User;
