const { logger } = require('../../common/utils/logger');
const Provider = require('./provider.model');
const Clinic = require('../clinics/clinic.model');
const User = require('../users/user.model');
const Staff = require('../staff/staff.model');

const cleanOrphanedDraftProviders = async () => {
  try {
    logger.info('[onboarding-cleanup] Running scheduled sweep for orphaned draft providers...');
    // 1. Find all draft providers created during onboarding
    const drafts = await Provider.find({ creationMode: 'ONBOARDING', status: 'Draft' });
    for (const provider of drafts) {
      // Check if clinic still exists
      const clinicExists = await Clinic.exists({ _id: provider.clinicId });
      if (!clinicExists) {
        logger.info(`[onboarding-cleanup] Cleaning up orphaned draft provider: ${provider.name} (${provider._id})`);
        
        // Delete linked user and staff operators
        await User.deleteMany({ assignedProviderId: provider._id });
        await Staff.deleteMany({ assignedProviderId: provider._id });
        
        // Delete provider
        await Provider.deleteOne({ _id: provider._id });
      }
    }
  } catch (err) {
    logger.error('[onboarding-cleanup] Error cleaning up orphaned draft providers:', err);
  }
};

const startOnboardingDraftCleanupJob = () => {
  // Run once immediately on start
  cleanOrphanedDraftProviders();

  // Run every 1 hour
  setInterval(cleanOrphanedDraftProviders, 60 * 60 * 1000);
  logger.info('[onboarding-cleanup] Scheduled draft provider cleanup job successfully initialized.');
};

module.exports = {
  startOnboardingDraftCleanupJob,
  cleanOrphanedDraftProviders
};
