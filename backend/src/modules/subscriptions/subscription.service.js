const SubscriptionPlan = require('./subscriptionPlan.model');

// Plan 1 Core features
const PLAN_1_CORE_FEATURES = [
  'patient_registration',
  'appointments',
  'billing',
  'prescriptions',
  'emr',
  'reports',
  'sms',
  'staff_login',
  'cloud_backup',
  'email_support',
  'whatsapp_messages'
];

// Plan 2 Features: Inherits all from Plan 1
const PLAN_2_STARTER_FEATURES = [
  ...PLAN_1_CORE_FEATURES
];

// Plan 3 Features: Everything in Plan 2 (with WhatsApp upgraded to integration) + AI/advanced clinic capabilities
const PLAN_3_PROFESSIONAL_FEATURES = [
  ...PLAN_2_STARTER_FEATURES.filter(f => f !== 'whatsapp_messages'),
  'whatsapp_integration',
  'whatsapp', // backward compatibility alias
  'ai_scheduling',
  'doctor_calendar',
  'multi_doctor',
  'inventory',
  'pharmacy',
  'labs',
  'digital_prescriptions',
  'unlimited_patients',
  'analytics',
  'role_based_access',
  'users_10'
];

// Plan 4 Features: Everything in Plan 3 + Premium AI / multi-branch capabilities
const PLAN_4_PREMIUM_FEATURES = [
  ...PLAN_3_PROFESSIONAL_FEATURES,
  'symptom_checker',
  'consultation_assistant',
  'voice_to_text',
  'ai_prescription_suggestions',
  'prescription_suggestions', // alias
  'lab_recommendations',
  'ai_risk_scoring',
  'referral_management',
  'multi_branch',
  'online_consultation',
  'mobile_app',
  'api_access',
  'users_25'
];

// Plan 5 Features: Everything in Plan 4 + Enterprise capabilities
const PLAN_5_ENTERPRISE_FEATURES = [
  ...PLAN_4_PREMIUM_FEATURES,
  'unlimited_everything',
  'unlimited_users',
  'unlimited_branches',
  'custom_workflow',
  'custom_branding',
  'dedicated_server',
  'dedicated_account_manager',
  'priority_support',
  'support_24x7',
  'custom_apis',
  'abdm',
  'insurance',
  'advanced_ai_analytics',
  'priority_feature_requests'
];

const PLANS_DATA = [
  {
    name: 'AI Basic Clinic',
    code: 'BASIC',
    description: 'Essential core clinic management for single doctor practices, general physicians, dentists, and small clinics.',
    priceMonthly: 999,
    priceYearly: 9999,
    features: PLAN_1_CORE_FEATURES,
    trialPeriodDays: 14,
    displayOrder: 1,
    limits: {
      maxDoctors: 1,
      maxStaff: 2,
      maxBranches: 1,
      maxPatients: 250,
      maxDepartments: 1
    },
    isActive: true,
    isPopular: false,
    isEnterprise: false,
    ctaText: 'Get Started'
  },
  {
    name: 'AI Starter Clinic',
    code: 'STARTER',
    description: 'Core clinic management with expanded patient records for growing single-doctor practices.',
    priceMonthly: 1999,
    priceYearly: 19999,
    features: PLAN_2_STARTER_FEATURES,
    trialPeriodDays: 14,
    displayOrder: 2,
    limits: {
      maxDoctors: 1,
      maxStaff: 2,
      maxBranches: 1,
      maxPatients: 500,
      maxDepartments: 2
    },
    isActive: true,
    isPopular: false,
    isEnterprise: false,
    ctaText: 'Get Started'
  },
  {
    name: 'AI Professional Clinic',
    code: 'PROFESSIONAL',
    description: 'Complete multi-doctor clinical OS with smart AI scheduling, pharmacy, lab & WhatsApp Integration.',
    priceMonthly: 4999,
    priceYearly: 49999,
    features: PLAN_3_PROFESSIONAL_FEATURES,
    trialPeriodDays: 14,
    displayOrder: 3,
    limits: {
      maxDoctors: 5,
      maxStaff: 10,
      maxBranches: 2,
      maxPatients: 999999,
      maxDepartments: 10
    },
    isActive: true,
    isPopular: true,
    badge: 'MOST POPULAR',
    isEnterprise: false,
    ctaText: 'Start Free Trial'
  },
  {
    name: 'AI Premium Clinic',
    code: 'PREMIUM',
    description: 'Advanced AI consultation assistant, diagnostic scoring, multi-branch & telemedicine for polyclinics.',
    priceMonthly: 9999,
    priceYearly: 99999,
    features: PLAN_4_PREMIUM_FEATURES,
    trialPeriodDays: 14,
    displayOrder: 4,
    limits: {
      maxDoctors: 15,
      maxStaff: 25,
      maxBranches: 5,
      maxPatients: 999999,
      maxDepartments: 25
    },
    isActive: true,
    isPopular: false,
    isEnterprise: false,
    ctaText: 'Upgrade to Premium'
  },
  {
    name: 'AI Enterprise ClinicOS',
    code: 'ENTERPRISE',
    description: 'Enterprise healthcare network platform with custom workflows, dedicated server, ABDM & 24×7 support.',
    priceMonthly: 24999,
    priceYearly: 249999,
    features: PLAN_5_ENTERPRISE_FEATURES,
    trialPeriodDays: 30,
    displayOrder: 5,
    limits: {
      maxDoctors: 999999,
      maxStaff: 999999,
      maxBranches: 999999,
      maxPatients: 999999,
      maxDepartments: 999999
    },
    isActive: true,
    isPopular: false,
    isEnterprise: true,
    ctaText: 'Contact Enterprise'
  }
];

const seedPlans = async () => {
  for (const plan of PLANS_DATA) {
    const existing = await SubscriptionPlan.findOne({ code: plan.code });
    if (!existing) {
      await SubscriptionPlan.create(plan);
      console.log(`[Subscription Service] Seeded plan: ${plan.name}`);
    } else {
      // Keep name, features, description, prices, badges, and limits updated
      existing.name = plan.name;
      existing.description = plan.description || existing.description || '';
      existing.priceMonthly = plan.priceMonthly;
      existing.priceYearly = plan.priceYearly;
      existing.features = plan.features;
      existing.limits = plan.limits;
      existing.trialPeriodDays = plan.trialPeriodDays;
      existing.displayOrder = plan.displayOrder;
      existing.isPopular = plan.isPopular;
      existing.isEnterprise = plan.isEnterprise;
      existing.badge = plan.badge || null;
      existing.ctaText = plan.ctaText || existing.ctaText || '';
      await existing.save();
    }
  }
};

module.exports = {
  seedPlans,
  PLANS_DATA,
  PLAN_1_CORE_FEATURES,
  PLAN_2_STARTER_FEATURES,
  PLAN_3_PROFESSIONAL_FEATURES,
  PLAN_4_PREMIUM_FEATURES,
  PLAN_5_ENTERPRISE_FEATURES
};
