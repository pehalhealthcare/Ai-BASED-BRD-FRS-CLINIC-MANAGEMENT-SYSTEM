const SubscriptionPlan = require('./subscriptionPlan.model');

const PLANS_DATA = [
  {
    name: 'AI Starter Clinic',
    code: 'STARTER',
    priceMonthly: 999,
    priceYearly: 9590, // ~20% off
    features: [
      'appointments',
      'billing',
      'prescriptions',
      'emr',
      'sms',
      'reports'
    ],
    trialPeriodDays: 14,
    displayOrder: 1,
    limits: {
      maxDoctors: 1,
      maxStaff: 2,
      maxPatients: 500
    },
    isActive: true
  },
  {
    name: 'AI Professional Clinic',
    code: 'PROFESSIONAL',
    priceMonthly: 1999,
    priceYearly: 19190, // ~20% off
    features: [
      'appointments',
      'billing',
      'prescriptions',
      'emr',
      'sms',
      'reports',
      'multi_doctor',
      'ai_scheduling',
      'pharmacy',
      'inventory',
      'labs',
      'whatsapp',
      'analytics'
    ],
    trialPeriodDays: 14,
    displayOrder: 2,
    limits: {
      maxDoctors: 3,
      maxStaff: 10,
      maxPatients: 999999
    },
    isActive: true
  },
  {
    name: 'AI Premium Clinic',
    code: 'PREMIUM',
    priceMonthly: 2999,
    priceYearly: 28790, // ~20% off
    features: [
      'appointments',
      'billing',
      'prescriptions',
      'emr',
      'sms',
      'reports',
      'multi_doctor',
      'ai_scheduling',
      'pharmacy',
      'inventory',
      'labs',
      'whatsapp',
      'analytics',
      'symptom_checker',
      'consultation_assistant',
      'voice_to_text',
      'ai_prescription_suggestions',
      'ai_risk_scoring',
      'lab_recommendations',
      'online_consultation',
      'multi_branch',
      'api_access'
    ],
    trialPeriodDays: 14,
    displayOrder: 3,
    limits: {
      maxDoctors: 15,
      maxStaff: 25,
      maxPatients: 999999
    },
    isActive: true
  },
  {
    name: 'AI Enterprise ClinicOS',
    code: 'ENTERPRISE',
    priceMonthly: 4999,
    priceYearly: 47990, // ~20% off
    features: [
      'appointments',
      'billing',
      'prescriptions',
      'emr',
      'sms',
      'reports',
      'multi_doctor',
      'ai_scheduling',
      'pharmacy',
      'inventory',
      'labs',
      'whatsapp',
      'analytics',
      'symptom_checker',
      'consultation_assistant',
      'voice_to_text',
      'ai_prescription_suggestions',
      'ai_risk_scoring',
      'lab_recommendations',
      'online_consultation',
      'multi_branch',
      'api_access',
      'unlimited_users',
      'unlimited_patients',
      'unlimited_branches',
      'dedicated_server',
      'custom_branding',
      'insurance',
      'abdm',
      'custom_apis',
      'priority_support'
    ],
    trialPeriodDays: 30,
    displayOrder: 4,
    limits: {
      maxDoctors: 999999,
      maxStaff: 999999,
      maxPatients: 999999
    },
    isActive: true
  }
];

const seedPlans = async () => {
  for (const plan of PLANS_DATA) {
    const existing = await SubscriptionPlan.findOne({ code: plan.code });
    if (!existing) {
      await SubscriptionPlan.create(plan);
      console.log(`[Subscription Service] Seeded plan: ${plan.name}`);
    } else {
      // Keep features and limits updated
      existing.name = plan.name; // Keep name synced (e.g. AI Enterprise ClinicOS)
      existing.priceMonthly = plan.priceMonthly;
      existing.priceYearly = plan.priceYearly;
      existing.features = plan.features;
      existing.limits = plan.limits;
      existing.trialPeriodDays = plan.trialPeriodDays;
      existing.displayOrder = plan.displayOrder;
      await existing.save();
    }
  }
};

module.exports = {
  seedPlans,
  PLANS_DATA
};
