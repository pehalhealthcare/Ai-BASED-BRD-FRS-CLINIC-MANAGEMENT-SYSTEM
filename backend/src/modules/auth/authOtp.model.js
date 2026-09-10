const mongoose = require('mongoose');

const authOtpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      enum: ['LOGIN_OTP', 'CLINIC_ADMIN_LOGIN', 'PASSWORD_RESET'],
      default: 'LOGIN_OTP'
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    lastResendAt: {
      type: Date,
      default: Date.now
    },
    resendCount: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0 // MongoDB TTL index to auto-delete documents once expiresAt is reached
    }
  },
  {
    timestamps: true
  }
);

authOtpSchema.index({ email: 1, purpose: 1 });

const AuthOtp = mongoose.models.AuthOtp || mongoose.model('AuthOtp', authOtpSchema, 'auth_otps');

module.exports = AuthOtp;
