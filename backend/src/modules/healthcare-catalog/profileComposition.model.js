const mongoose = require('mongoose');

const profileCompositionSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
      required: true
    },
    panelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
      default: null
    },
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GlobalLabTest',
      default: null
    },
    displayOrder: {
      type: Number,
      required: true,
      default: 0
    },
    isRequired: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'profile_compositions'
  }
);

profileCompositionSchema.index({ profileId: 1, panelId: 1, investigationId: 1 }, { unique: true });
profileCompositionSchema.index({ profileId: 1, displayOrder: 1 });

const ProfileComposition = mongoose.models.ProfileComposition || mongoose.model('ProfileComposition', profileCompositionSchema);

module.exports = ProfileComposition;
