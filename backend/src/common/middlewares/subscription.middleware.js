const Clinic = require('../../modules/clinics/clinic.model');
const { AppError } = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { ROLES } = require('../constants/roles');

const FEATURE_TIER_NAMES = {
  // Plan 1 & 2 Core
  patient_registration: 'AI Basic Clinic',
  appointments: 'AI Basic Clinic',
  billing: 'AI Basic Clinic',
  prescriptions: 'AI Basic Clinic',
  emr: 'AI Basic Clinic',
  reports: 'AI Basic Clinic',
  sms: 'AI Basic Clinic',
  staff_login: 'AI Basic Clinic',
  cloud_backup: 'AI Basic Clinic',
  email_support: 'AI Basic Clinic',
  whatsapp_messages: 'AI Basic Clinic',

  // Plan 3 Professional
  whatsapp_integration: 'AI Professional Clinic',
  whatsapp: 'AI Professional Clinic',
  ai_scheduling: 'AI Professional Clinic',
  doctor_calendar: 'AI Professional Clinic',
  multi_doctor: 'AI Professional Clinic',
  inventory: 'AI Professional Clinic',
  pharmacy: 'AI Professional Clinic',
  labs: 'AI Professional Clinic',
  digital_prescriptions: 'AI Professional Clinic',
  analytics: 'AI Professional Clinic',
  role_based_access: 'AI Professional Clinic',

  // Plan 4 Premium
  symptom_checker: 'AI Premium Clinic',
  consultation_assistant: 'AI Premium Clinic',
  diagnostic_suggestions: 'AI Premium Clinic',
  consultation_summary: 'AI Premium Clinic',
  voice_to_text: 'AI Premium Clinic',
  ai_prescription_suggestions: 'AI Premium Clinic',
  prescription_suggestions: 'AI Premium Clinic',
  lab_recommendations: 'AI Premium Clinic',
  ai_risk_scoring: 'AI Premium Clinic',
  referral_management: 'AI Premium Clinic',
  multi_branch: 'AI Premium Clinic',
  online_consultation: 'AI Premium Clinic',
  mobile_app: 'AI Premium Clinic',
  api_access: 'AI Premium Clinic',

  // Plan 5 Enterprise
  custom_workflow: 'AI Enterprise ClinicOS',
  custom_branding: 'AI Enterprise ClinicOS',
  dedicated_server: 'AI Enterprise ClinicOS',
  dedicated_account_manager: 'AI Enterprise ClinicOS',
  abdm: 'AI Enterprise ClinicOS',
  insurance: 'AI Enterprise ClinicOS',
  advanced_ai_analytics: 'AI Enterprise ClinicOS',
  custom_apis: 'AI Enterprise ClinicOS',
  priority_support: 'AI Enterprise ClinicOS',
  support_24x7: 'AI Enterprise ClinicOS',
  unlimited_everything: 'AI Enterprise ClinicOS',
  priority_feature_requests: 'AI Enterprise ClinicOS'
};

const FEATURE_DISPLAY_NAMES = {
  whatsapp_messages: 'WhatsApp Messages',
  whatsapp_integration: 'WhatsApp Integration',
  whatsapp: 'WhatsApp Integration',
  ai_scheduling: 'AI Appointment Scheduling',
  symptom_checker: 'AI Symptom Checker',
  consultation_assistant: 'AI Consultation Assistant',
  diagnostic_suggestions: 'AI Diagnostic Suggestions',
  consultation_summary: 'AI Consultation Summary',
  voice_to_text: 'Voice-to-Text Clinical Dictation',
  ai_prescription_suggestions: 'AI Prescription Suggestions',
  prescription_suggestions: 'AI Prescription Suggestions',
  lab_recommendations: 'AI Lab Test Recommendations',
  ai_risk_scoring: 'AI Patient Risk Scoring',
  multi_branch: 'Multi-Branch Support',
  online_consultation: 'Online Video Consultation',
  pharmacy: 'Pharmacy Module',
  labs: 'Laboratory Module',
  analytics: 'Analytics Dashboard'
};

const checkSubscriptionFeature = (featureCode) => async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
    }

    // Super Admin has universal access
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    let clinicId = req.headers['x-clinic-id'] || req.user.clinicId;
    if (!clinicId && req.user.providerId) {
      const Provider = require('../../modules/providers/provider.model');
      const provider = await Provider.findById(req.user.providerId);
      if (provider?.clinicId) {
        clinicId = provider.clinicId;
      }
    }

    if (!clinicId && req.user.role === ROLES.PATIENT) {
      const { findPatientClinicId } = require('../utils/clinicContext');
      clinicId = await findPatientClinicId(req.user);
    }

    if (!clinicId) {
      return next(new AppError('No clinic context associated with this user', HTTP_STATUS.FORBIDDEN));
    }

    const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
    if (!clinic) {
      return next(new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check clinic approval status
    if (clinic.approvalStatus !== 'approved') {
      return next(new AppError('Your clinic portal is not approved yet', HTTP_STATUS.FORBIDDEN));
    }

    const sub = clinic.subscription;
    const normSubStatus = String(sub?.status || 'active').toLowerCase().trim();
    if (normSubStatus === 'suspended') {
      return next(new AppError('Your clinic portal has been suspended', HTTP_STATUS.FORBIDDEN));
    }

    const isSubActive = ['active', 'trial', 'trialing', 'grace_period'].includes(normSubStatus);

    const normTargetCode = String(featureCode || '').toLowerCase().trim();

    // Check if feature is enabled in subscription plan
    const planFeatures = (sub?.planId?.features || []).map(f => String(f).toLowerCase().trim());
    let isPlanFeature = false;

    if (isSubActive) {
      if (normTargetCode === 'whatsapp_messages') {
        // WhatsApp messages is supported by plans having whatsapp_messages, whatsapp_integration, or whatsapp
        isPlanFeature = planFeatures.some(f => ['whatsapp_messages', 'whatsapp_integration', 'whatsapp'].includes(f));
      } else if (normTargetCode === 'whatsapp_integration' || normTargetCode === 'whatsapp') {
        // WhatsApp integration requires actual whatsapp_integration or whatsapp feature (Plan 3+)
        isPlanFeature = planFeatures.some(f => ['whatsapp_integration', 'whatsapp'].includes(f));
      } else if (normTargetCode === 'labs' || normTargetCode === 'laboratory') {
        isPlanFeature = planFeatures.some(f => ['labs', 'lab', 'laboratory', 'laboratories'].includes(f));
      } else if (normTargetCode === 'pharmacy') {
        isPlanFeature = planFeatures.some(f => ['pharmacy', 'medicines', 'inventory'].includes(f));
      } else {
        isPlanFeature = planFeatures.includes(normTargetCode);
      }

      if (!isPlanFeature) {
        if (normTargetCode === 'diagnostic_suggestions' || normTargetCode === 'consultation_summary') {
          isPlanFeature = planFeatures.includes('consultation_assistant');
        }
        if (normTargetCode === 'lab_recommendations') {
          isPlanFeature = planFeatures.includes('labs') || planFeatures.includes('laboratory') || planFeatures.includes('lab_recommendations');
        }
        if (normTargetCode === 'prescription_suggestions') {
          isPlanFeature = planFeatures.includes('ai_prescription_suggestions');
        }
      }
    }

    // Check if feature is enabled in trial features
    const now = new Date();
    let isTrialFeature = clinic.trialFeatures?.some(trial => {
      if (!trial.isActive || new Date(trial.expiryDate) <= now) return false;
      const trialCode = String(trial.featureCode || '').toLowerCase().trim();
      if (trialCode === normTargetCode) return true;
      if (normTargetCode === 'whatsapp_messages' && ['whatsapp_messages', 'whatsapp_integration', 'whatsapp'].includes(trialCode)) {
        return true;
      }
      if ((normTargetCode === 'whatsapp_integration' || normTargetCode === 'whatsapp') && ['whatsapp_integration', 'whatsapp'].includes(trialCode)) {
        return true;
      }
      if ((normTargetCode === 'labs' || normTargetCode === 'laboratory') && ['labs', 'lab', 'laboratory', 'laboratories'].includes(trialCode)) {
        return true;
      }
      if (normTargetCode === 'pharmacy' && ['pharmacy', 'medicines', 'inventory'].includes(trialCode)) {
        return true;
      }
      return false;
    });

    if (!isTrialFeature) {
      if (normTargetCode === 'diagnostic_suggestions' || normTargetCode === 'consultation_summary') {
        isTrialFeature = clinic.trialFeatures?.some(trial => 
          String(trial.featureCode || '').toLowerCase().trim() === 'consultation_assistant' && 
          trial.isActive && 
          new Date(trial.expiryDate) > now
        );
      }
      if (normTargetCode === 'lab_recommendations') {
        isTrialFeature = clinic.trialFeatures?.some(trial => {
          const tc = String(trial.featureCode || '').toLowerCase().trim();
          return ['labs', 'laboratory', 'lab_recommendations'].includes(tc) && trial.isActive && new Date(trial.expiryDate) > now;
        });
      }
    }

    if (!isPlanFeature && !isTrialFeature) {
      if (normSubStatus === 'expired') {
        return next(new AppError('Your clinic subscription has expired. Please renew.', HTTP_STATUS.FORBIDDEN));
      }
      const displayName = FEATURE_DISPLAY_NAMES[normTargetCode] || featureCode;
      const requiredPlan = FEATURE_TIER_NAMES[normTargetCode] || 'AI Professional Clinic';
      return next(new AppError(`Feature locked: ${displayName} is available on ${requiredPlan} and above. Please upgrade your plan.`, HTTP_STATUS.FORBIDDEN));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { checkSubscriptionFeature };

