const mongoose = require('mongoose');

const clinicOnboardingDraftSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    unique: true,
    index: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentStep: {
    type: Number,
    default: 0
  },
  draftData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const ClinicOnboardingDraft = mongoose.models.ClinicOnboardingDraft || mongoose.model('ClinicOnboardingDraft', clinicOnboardingDraftSchema);
module.exports = ClinicOnboardingDraft;
