const SubscriptionPlan = require('./subscriptionPlan.model');

const PLANS_DATA = [
  {
    name: 'AI Starter Clinic',
    code: 'STARTER',
    description: 'Essential toolkit for solo medical practitioners and emerging boutique clinics.',
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
      maxBranches: 1,
      maxPatients: 500
    },
    isActive: true
  },
  {
    name: 'AI Professional Clinic',
    code: 'PROFESSIONAL',
    description: 'Complete multi-specialty clinical operating system with smart automation & integrations.',
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
      maxBranches: 2,
      maxPatients: 999999
    },
    isActive: true
  },
  {
    name: 'AI Premium Clinic',
    code: 'PREMIUM',
    description: 'Advanced AI consultation assistant, diagnostic scoring, and telemedicine for fast-scaling polyclinics.',
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
      maxBranches: 5,
      maxPatients: 999999
    },
    isActive: true
  },
  {
    name: 'AI Enterprise ClinicOS',
    code: 'ENTERPRISE',
    description: 'Enterprise-grade healthcare network platform with custom APIs, ABDM, dedicated server & unlimited scale.',
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
      maxBranches: 999999,
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
      // Keep features, description, and limits updated
      existing.name = plan.name;
      existing.description = plan.description || existing.description || '';
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
