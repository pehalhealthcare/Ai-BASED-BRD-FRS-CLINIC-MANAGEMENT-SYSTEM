const Clinic = require('../../modules/clinics/clinic.model');
const { AppError } = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { ROLES } = require('../constants/roles');

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
      if (normTargetCode === 'labs' || normTargetCode === 'laboratory') {
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
      }
    }

    // Check if feature is enabled in trial features
    const now = new Date();
    let isTrialFeature = clinic.trialFeatures?.some(trial => {
      if (!trial.isActive || new Date(trial.expiryDate) <= now) return false;
      const trialCode = String(trial.featureCode || '').toLowerCase().trim();
      if (trialCode === normTargetCode) return true;
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
      return next(new AppError(`Feature locked: Access to '${featureCode}' requires an active subscription or trial.`, HTTP_STATUS.FORBIDDEN));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { checkSubscriptionFeature };
