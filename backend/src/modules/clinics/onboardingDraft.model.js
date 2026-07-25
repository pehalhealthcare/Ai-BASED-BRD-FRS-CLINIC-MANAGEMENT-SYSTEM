const mongoose = require('mongoose');

const onboardingDraftSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
    index: true
  },
  step: {
    type: Number,
    default: 1
  },
  ownerForm: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  clinicForm: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  selectedPlanId: {
    type: String,
    default: ''
  },
  billingCycle: {
    type: String,
    default: 'monthly'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const OnboardingDraft = mongoose.models.OnboardingDraft || mongoose.model('OnboardingDraft', onboardingDraftSchema);
module.exports = OnboardingDraft;
