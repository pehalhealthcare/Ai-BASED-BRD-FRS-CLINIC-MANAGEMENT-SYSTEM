/**
 * Plan Entitlements & Subscription Feature Matrix
 * Evaluates whether a clinic's active subscription plan unlocks specific features.
 */

export const FEATURE_TIERS = {
  SMS: {
    code: 'sms',
    minPlan: 'AI Basic Clinic',
    label: 'SMS Notifications'
  },
  EMAIL: {
    code: 'email_support',
    minPlan: 'AI Basic Clinic',
    label: 'Email Service'
  },
  CLOUD_BACKUP: {
    code: 'cloud_backup',
    minPlan: 'AI Basic Clinic',
    label: 'Cloud Backup & Data Management'
  },
  WHATSAPP: {
    code: 'whatsapp_integration',
    minPlan: 'AI Professional Clinic',
    label: 'WhatsApp Business API'
  },
  LABS_LIS: {
    code: 'labs',
    minPlan: 'AI Professional Clinic',
    label: 'Laboratory Information System (LIS)'
  },
  RADIOLOGY_RIS: {
    code: 'labs',
    minPlan: 'AI Professional Clinic',
    label: 'Radiology Information System (RIS)'
  },
  ADVANCED_SECURITY: {
    code: 'role_based_access',
    minPlan: 'AI Professional Clinic',
    label: 'Advanced Security & IP Restriction'
  },
  AUDIT_LOGS: {
    code: 'reports',
    minPlan: 'AI Basic Clinic',
    label: 'Activity & Audit Logging'
  }
};

/**
 * Returns whether a feature is permitted under the clinic's plan.
 * @param {Object} clinic - The clinic record with subscription info
 * @param {string} featureKey - One of 'WHATSAPP', 'SMS', 'EMAIL', 'CLOUD_BACKUP', 'LABS_LIS', 'RADIOLOGY_RIS', 'ADVANCED_SECURITY', 'AUDIT_LOGS'
 * @returns {{ allowed: boolean, planName: string, minRequiredPlan: string }}
 */
export const checkPlanEntitlement = (clinic, featureKey) => {
  if (!clinic) {
    return { allowed: true, planName: 'Default Plan', minRequiredPlan: 'AI Basic Clinic' };
  }

  // Super admins or clinics without plan restrictions configured
  const sub = clinic.subscription;
  const plan = sub?.planId;

  const planName = plan?.name || (sub?.isFreeTier ? 'Free Tier' : 'Standard Clinic');
  const planFeatures = (plan?.features || []).map(f => String(f).toLowerCase().trim());

  const targetTier = FEATURE_TIERS[featureKey];
  if (!targetTier) {
    return { allowed: true, planName, minRequiredPlan: 'AI Basic Clinic' };
  }

  // If plan features array is empty or unconfigured, default to allowed for basic features
  if (planFeatures.length === 0) {
    return {
      allowed: true,
      planName,
      minRequiredPlan: targetTier.minPlan
    };
  }

  const targetCode = targetTier.code.toLowerCase();

  // Feature checks
  let allowed = false;
  if (targetCode === 'whatsapp_integration') {
    allowed = planFeatures.some(f => ['whatsapp_integration', 'whatsapp', 'whatsapp_messages'].includes(f));
  } else if (targetCode === 'labs') {
    allowed = planFeatures.some(f => ['labs', 'lab', 'laboratory', 'lis'].includes(f));
  } else {
    allowed = planFeatures.includes(targetCode);
  }

  return {
    allowed,
    planName,
    minRequiredPlan: targetTier.minPlan
  };
};

