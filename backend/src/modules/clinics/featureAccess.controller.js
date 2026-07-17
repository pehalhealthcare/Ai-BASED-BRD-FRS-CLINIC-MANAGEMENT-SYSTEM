const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const Clinic = require('./clinic.model');
const SubscriptionPlan = require('../subscriptions/subscriptionPlan.model');
const FeatureRequest = require('./featureRequest.model');
const User = require('../users/user.model');
const { createNotificationRecord } = require('../notifications/notification.service');

const AI_FEATURES = {
  voice_to_text: {
    name: 'Voice-to-Text Consultation',
    description: 'Converts the doctor\'s voice into structured consultation notes.'
  },
  consultation_assistant: {
    name: 'AI Consultation Assistant',
    description: 'Provides real-time clinical assistance and treatment suggestions.'
  },
  ai_prescription_suggestions: {
    name: 'AI Prescription Suggestions',
    description: 'Suggests medicines based on symptoms and diagnosis.'
  },
  lab_recommendations: {
    name: 'AI Lab Recommendations',
    description: 'Suggests relevant laboratory investigations.'
  },
  ai_risk_scoring: {
    name: 'AI Risk Scoring',
    description: 'Calculates patient risk based on symptoms, history and diagnosis.'
  },
  symptom_checker: {
    name: 'AI Symptom Checker',
    description: 'Suggests possible conditions based on entered symptoms.'
  },
  consultation_summary: {
    name: 'AI Consultation Summary',
    description: 'Automatically generates a consultation summary.'
  },
  diagnostic_suggestions: {
    name: 'AI Diagnostic Suggestions',
    description: 'Provides possible diagnoses based on clinical findings.'
  },
  multi_branch: {
    name: 'Multi Branch',
    description: 'Manage multiple clinic branches.'
  }
};

const getFeatureAccess = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic context not found.', HTTP_STATUS.BAD_REQUEST);
  }

  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found.', HTTP_STATUS.NOT_FOUND);
  }

  const plans = await SubscriptionPlan.find({ isActive: true, isArchived: false }).sort({ priceMonthly: 1 });

  const activeRequests = await FeatureRequest.find({
    doctorId: req.user._id,
    status: 'pending'
  });

  const responseFeatures = {};

  for (const [code, meta] of Object.entries(AI_FEATURES)) {
    // 1. Plan eligibility
    const planFeatures = clinic.subscription?.planId?.features || [];
    let isPlanFeature = planFeatures.includes(code);
    if (!isPlanFeature) {
      if (code === 'diagnostic_suggestions' || code === 'consultation_summary') {
        isPlanFeature = planFeatures.includes('consultation_assistant');
      }
      if (code === 'lab_recommendations') {
        isPlanFeature = planFeatures.includes('lab_recommendations');
      }
    }

    // 2. Trial status
    const now = new Date();
    let trial = clinic.trialFeatures?.find(t => t.featureCode === code && t.isActive && new Date(t.expiryDate) > now);
    if (!trial) {
      if (code === 'diagnostic_suggestions' || code === 'consultation_summary') {
        trial = clinic.trialFeatures?.find(t => t.featureCode === 'consultation_assistant' && t.isActive && new Date(t.expiryDate) > now);
      }
      if (code === 'lab_recommendations') {
        trial = clinic.trialFeatures?.find(t => t.featureCode === 'lab_recommendations' && t.isActive && new Date(t.expiryDate) > now);
      }
    }
    const isTrial = !isPlanFeature && !!trial;
    const daysRemaining = trial ? Math.max(0, Math.ceil((new Date(trial.expiryDate) - now) / (1000 * 60 * 60 * 24))) : 0;

    const enabled = isPlanFeature || isTrial;

    // 3. Upgrade recommendation
    let recommendedPlan = 'AI Premium';
    for (const plan of plans) {
      if (plan.features.includes(code)) {
        recommendedPlan = plan.name;
        break;
      }
    }

    const hasRequested = activeRequests.some(r => r.featureCode === code);

    responseFeatures[code] = {
      featureCode: code,
      name: meta.name,
      description: meta.description,
      enabled,
      isTrial,
      daysRemaining,
      recommendedPlan,
      hasRequested
    };
  }

  return sendSuccess(res, 'Feature access levels retrieved.', { features: responseFeatures });
});

const requestFeatureAccess = asyncHandler(async (req, res) => {
  const { featureCode } = req.body;
  if (!featureCode || !AI_FEATURES[featureCode]) {
    throw new AppError('Invalid feature code.', HTTP_STATUS.BAD_REQUEST);
  }

  const clinicId = req.user.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic context not found.', HTTP_STATUS.BAD_REQUEST);
  }

  // Check for duplicate pending requests
  const existing = await FeatureRequest.findOne({
    doctorId: req.user._id,
    featureCode,
    status: 'pending'
  });

  if (existing) {
    throw new AppError('An active request for this feature already exists.', HTTP_STATUS.BAD_REQUEST);
  }

  const newRequest = await FeatureRequest.create({
    doctorId: req.user._id,
    clinicId,
    featureCode,
    status: 'pending'
  });

  // Notify clinic admins
  const featureName = AI_FEATURES[featureCode].name;
  const admins = await User.find({ clinicId, role: ROLES.ADMIN, isActive: true });

  for (const admin of admins) {
    await createNotificationRecord({
      clinicId,
      payload: {
        type: 'feature_request',
        channel: 'in_app',
        subject: 'Feature Upgrade Request',
        body: `Dr. ${req.user.name} has requested access to **${featureName}**.\n\nReason: This feature helps doctors complete consultations faster, improves documentation quality, and reduces manual typing.\n\nSuggested Action: Upgrade your clinic subscription to unlock this feature.`,
        metadata: {
          doctorId: req.user._id,
          doctorName: req.user.name,
          featureCode,
          featureName
        }
      }
    });
  }

  return sendSuccess(res, 'Feature request submitted successfully.', newRequest, 201);
});

// Admin side query to see requests
const getFeatureRequests = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  if (!clinicId) {
    throw new AppError('Clinic context not found.', HTTP_STATUS.BAD_REQUEST);
  }

  const requests = await FeatureRequest.find({ clinicId })
    .populate('doctorId', 'name email role')
    .sort({ createdAt: -1 });

  const plans = await SubscriptionPlan.find({ isActive: true, isArchived: false }).sort({ priceMonthly: 1 });
  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');

  const formatted = requests.map(r => {
    const code = r.featureCode;
    let recommendedPlan = 'AI Premium';
    for (const plan of plans) {
      if (plan.features.includes(code)) {
        recommendedPlan = plan.name;
        break;
      }
    }

    return {
      _id: r._id,
      doctorId: r.doctorId?._id,
      doctorName: r.doctorId?.name || 'Unknown Doctor',
      doctorEmail: r.doctorId?.email || '',
      featureCode: code,
      featureName: AI_FEATURES[code]?.name || code,
      requestedOn: r.createdAt,
      currentPlan: clinic?.subscription?.planId?.name || 'None',
      recommendedPlan,
      status: r.status
    };
  });

  return sendSuccess(res, 'Feature requests retrieved.', { requests: formatted });
});

// Dismiss request
const dismissFeatureRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const request = await FeatureRequest.findById(id);
  if (!request) {
    throw new AppError('Feature request not found.', HTTP_STATUS.NOT_FOUND);
  }

  request.status = 'dismissed';
  await request.save();

  return sendSuccess(res, 'Feature request dismissed.', request);
});

module.exports = {
  getFeatureAccess,
  requestFeatureAccess,
  getFeatureRequests,
  dismissFeatureRequest
};
