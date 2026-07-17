const mongoose = require('mongoose');

const onboardingOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // automatically deletes after 5 minutes (300 seconds)
  }
});

const OnboardingOtp = mongoose.models.OnboardingOtp || mongoose.model('OnboardingOtp', onboardingOtpSchema);
module.exports = OnboardingOtp;
