const Clinic = require('./clinic.model');
const User = require('../users/user.model');
const Doctor = require('../doctors/doctor.model');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');

const getOnboardingFlow = async (clinicId) => {
  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  const plan = clinic.subscription?.planId;
  const planCode = plan?.code || 'STARTER';
  const planName = plan?.name || 'Starter Plan';

  // 1. Process trial features and filter out expired ones
  const now = new Date();
  let trialUpdated = false;
  const activeTrialCodes = [];
  const trialDetails = [];

  if (clinic.trialFeatures && clinic.trialFeatures.length > 0) {
    clinic.trialFeatures.forEach(trial => {
      const isExpired = new Date(trial.expiryDate) < now;
      if (trial.isActive && !isExpired) {
        activeTrialCodes.push(trial.featureCode);
        const daysLeft = Math.ceil((new Date(trial.expiryDate) - now) / (1000 * 60 * 60 * 24));
        trialDetails.push({
          featureCode: trial.featureCode,
          daysRemaining: daysLeft,
          status: 'Active'
        });
      } else if (trial.isActive && isExpired) {
        trial.isActive = false;
        trialUpdated = true;
      }
    });
    if (trialUpdated) {
      await clinic.save();
    }
  }

  // 2. Combine base features and active trial features
  const planFeatures = plan?.features || [];
  const allActiveFeatures = new Set([...planFeatures, ...activeTrialCodes]);

  // 3. Resolve limits (use plan limits; fallback to standard defaults based on features/trials)
  const maxDoctors = plan?.limits?.maxDoctors || 1;
  const maxStaff = plan?.limits?.maxStaff || 2;
  const maxPatients = plan?.limits?.maxPatients || 500;

  let maxBranches = plan?.limits?.maxBranches || 0;
  if (maxBranches === 0 && allActiveFeatures.has('multi_branch')) {
    maxBranches = 5; // Default limit for Premium/Trial multi-branch
  }
  if (allActiveFeatures.has('unlimited_branches')) {
    maxBranches = 999999;
  }

  let maxDepartments = plan?.limits?.maxDepartments || 0;
  if (maxDepartments === 0 && (allActiveFeatures.has('labs') || allActiveFeatures.has('pharmacy') || planCode !== 'STARTER')) {
    maxDepartments = 10; // Default limit for Professional/Premium
  }
  if (planCode === 'ENTERPRISE') {
    maxDepartments = 999999;
  }

  // 4. Count current usages
  const currentDoctors = await Doctor.countDocuments({ clinicId, approvalStatus: 'approved' });
  const currentStaff = await User.countDocuments({ 
    clinicId, 
    role: { $in: ['RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN'] } 
  });
  const currentBranches = await Clinic.countDocuments({ parentClinicId: clinicId });
  const currentDepartments = clinic.clinicDetails?.departments?.length || 0;

  // 5. Generate onboarding steps
  const steps = [];

  // Step 0: Welcome / Info
  steps.push({
    id: 'welcome',
    name: 'Welcome',
    desc: 'Verify plan details and features'
  });

  // Step 1: Doctor Setup
  steps.push({
    id: 'doctors',
    name: 'Doctor Setup',
    desc: `Configure practitioners (Limit: ${maxDoctors === 999999 ? 'Unlimited' : maxDoctors})`,
    limit: maxDoctors,
    current: currentDoctors
  });

  // Step 2: Department Setup (if enabled)
  if (maxDepartments > 0) {
    steps.push({
      id: 'departments',
      name: 'Department Setup',
      desc: 'Configure clinic departments',
      limit: maxDepartments,
      current: currentDepartments
    });
  }

  // Step 3: Branch Setup (if multi-branch/unlimited enabled)
  if (maxBranches > 0) {
    steps.push({
      id: 'branches',
      name: 'Branch Setup',
      desc: `Add sub-branches (Limit: ${maxBranches === 999999 ? 'Unlimited' : maxBranches})`,
      limit: maxBranches,
      current: currentBranches
    });
  }

  // Step 4: Staff Setup
  if (maxStaff > 0) {
    steps.push({
      id: 'staff',
      name: 'Staff Setup',
      desc: `Add receptionists, pharmacists, etc. (Limit: ${maxStaff})`,
      limit: maxStaff,
      current: currentStaff
    });
  }

  // Step 5: Pharmacy Setup (if pharmacy active)
  if (allActiveFeatures.has('pharmacy')) {
    steps.push({
      id: 'pharmacy',
      name: 'Pharmacy Setup',
      desc: 'Configure inventory & GST parameters'
    });
  }

  // Step 6: Laboratory Setup (if laboratory active)
  if (allActiveFeatures.has('labs')) {
    steps.push({
      id: 'laboratory',
      name: 'Laboratory Setup',
      desc: 'Define available tests & samples'
    });
  }

  // Step 7: AI Configuration (if any AI features active)
  const aiFeatureCodes = ['symptom_checker', 'consultation_assistant', 'voice_to_text', 'ai_prescription_suggestions', 'ai_risk_scoring'];
  const hasAIFeature = aiFeatureCodes.some(f => allActiveFeatures.has(f));
  if (hasAIFeature) {
    steps.push({
      id: 'ai',
      name: 'AI Modules Config',
      desc: 'Activate smart scribes & diagnostic assistants'
    });
  }

  // Step 8: Online Consultation Setup (if active)
  if (allActiveFeatures.has('online_consultation')) {
    steps.push({
      id: 'online_consultation',
      name: 'Video Consultations',
      desc: 'Setup digital meeting links & fees'
    });
  }

  // Step 9: Timings & Schedule
  steps.push({
    id: 'working_days',
    name: 'Clinic Schedule',
    desc: 'Specify weekly timings'
  });

  // Step 10: Review
  steps.push({
    id: 'review',
    name: 'Review & Launch',
    desc: 'Activate your digital hospital'
  });

  // List of possible premium features available for trial (which are not in plan features)
  const availableTrialFeatures = [
    { code: 'pharmacy', name: 'Pharmacy Module', trialDays: 20 },
    { code: 'labs', name: 'Laboratory Module', trialDays: 20 },
    { code: 'symptom_checker', name: 'AI Symptom Checker', trialDays: 15 },
    { code: 'consultation_assistant', name: 'AI Consultation Assistant', trialDays: 15 },
    { code: 'online_consultation', name: 'Online Video Consultation', trialDays: 30 }
  ].filter(f => !planFeatures.includes(f.code));

  return {
    clinicName: clinic.name,
    planName,
    planCode,
    subscriptionValidity: clinic.subscription?.expiryDate,
    isOnboardingCompleted: clinic.isOnboardingCompleted,
    steps,
    limits: {
      maxDoctors,
      maxStaff,
      maxPatients,
      maxBranches,
      maxDepartments
    },
    activeTrials: trialDetails,
    availableTrials: availableTrialFeatures
  };
};

const activateTrialFeature = async (clinicId, featureCode) => {
  const clinic = await Clinic.findById(clinicId).populate('subscription.planId');
  if (!clinic) {
    throw new AppError('Clinic not found', HTTP_STATUS.NOT_FOUND);
  }

  const existingTrial = clinic.trialFeatures.find(f => f.featureCode === featureCode);
  if (existingTrial && existingTrial.isActive && new Date(existingTrial.expiryDate) > new Date()) {
    throw new AppError('Trial feature is already active', HTTP_STATUS.BAD_REQUEST);
  }

  // Determine duration
  let durationDays = 14;
  if (featureCode === 'pharmacy' || featureCode === 'labs') durationDays = 20;
  if (featureCode === 'online_consultation') durationDays = 30;
  if (featureCode.startsWith('ai_') || featureCode === 'symptom_checker' || featureCode === 'consultation_assistant') durationDays = 15;

  const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  if (existingTrial) {
    existingTrial.isActive = true;
    existingTrial.startDate = new Date();
    existingTrial.expiryDate = expiryDate;
  } else {
    clinic.trialFeatures.push({
      featureCode,
      startDate: new Date(),
      expiryDate,
      isActive: true
    });
  }

  await clinic.save();
  return getOnboardingFlow(clinicId);
};

module.exports = {
  getOnboardingFlow,
  activateTrialFeature
};
