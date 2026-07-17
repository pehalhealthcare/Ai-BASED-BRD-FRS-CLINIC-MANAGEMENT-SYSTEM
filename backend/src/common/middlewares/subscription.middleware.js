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

    if (!req.user.clinicId) {
      return next(new AppError('No clinic context associated with this user', HTTP_STATUS.FORBIDDEN));
    }

    const clinic = await Clinic.findById(req.user.clinicId).populate('subscription.planId');
    if (!clinic) {
      return next(new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check clinic status
    if (clinic.approvalStatus !== 'approved') {
      return next(new AppError('Your clinic portal is not approved yet', HTTP_STATUS.FORBIDDEN));
    }

    const sub = clinic.subscription;
    if (sub?.status === 'Suspended') {
      return next(new AppError('Your clinic portal has been suspended', HTTP_STATUS.FORBIDDEN));
    }
    if (sub?.status === 'Expired') {
      return next(new AppError('Your clinic subscription has expired. Please renew.', HTTP_STATUS.FORBIDDEN));
    }

    // Check if feature is enabled in subscription plan
    const planFeatures = sub?.planId?.features || [];
    let isPlanFeature = planFeatures.includes(featureCode);
    if (!isPlanFeature) {
      if (featureCode === 'diagnostic_suggestions' || featureCode === 'consultation_summary') {
        isPlanFeature = planFeatures.includes('consultation_assistant');
      }
      if (featureCode === 'lab_recommendations') {
        isPlanFeature = planFeatures.includes('labs') || planFeatures.includes('lab_recommendations');
      }
    }

    // Check if feature is enabled in trial features
    const now = new Date();
    let isTrialFeature = clinic.trialFeatures?.some(trial => 
      trial.featureCode === featureCode && 
      trial.isActive && 
      new Date(trial.expiryDate) > now
    );
    if (!isTrialFeature) {
      if (featureCode === 'diagnostic_suggestions' || featureCode === 'consultation_summary') {
        isTrialFeature = clinic.trialFeatures?.some(trial => 
          trial.featureCode === 'consultation_assistant' && 
          trial.isActive && 
          new Date(trial.expiryDate) > now
        );
      }
      if (featureCode === 'lab_recommendations') {
        isTrialFeature = clinic.trialFeatures?.some(trial => 
          (trial.featureCode === 'labs' || trial.featureCode === 'lab_recommendations') && 
          trial.isActive && 
          new Date(trial.expiryDate) > now
        );
      }
    }

    if (!isPlanFeature && !isTrialFeature) {
      return next(new AppError(`Feature locked: Access to '${featureCode}' requires an active subscription or trial.`, HTTP_STATUS.FORBIDDEN));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { checkSubscriptionFeature };
