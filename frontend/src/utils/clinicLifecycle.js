/**
 * Clinic Lifecycle & Routing Engine
 * Central source of truth for Clinic Admin onboarding, payment verification, and approval routing.
 */

export const CLINIC_LIFECYCLE_ACTIONS = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PAYMENT: 'PAYMENT',
  PAYMENT_VERIFICATION: 'PAYMENT_VERIFICATION',
  REPAYMENT: 'REPAYMENT',
  APPROVAL: 'APPROVAL',
  ONBOARDING: 'ONBOARDING',
  DASHBOARD: 'DASHBOARD'
};

export const CLINIC_ROUTES = {
  SETUP: '/set-your-clinic',
  PAYMENT: '/clinic/payment',
  STATUS: '/clinic/status',
  ONBOARDING: '/clinic/onboarding',
  DASHBOARD: '/dashboard',
  ADMIN_DASHBOARD: '/clinic/dashboard'
};

/**
 * Evaluates backend setup status and returns canonical target route & action
 * @param {Object} statusData - Data returned from clinicApi.getSetupStatus() or user payload
 * @returns {Object} { nextRequiredAction, targetRoute, isComplete }
 */
export const evaluateClinicLifecycle = (statusData = {}) => {
  const {
    emailVerified = true,
    paymentStatus = 'NOT_SUBMITTED',
    approvalStatus = 'pending_approval',
    onboardingStatus = 'IN_PROGRESS',
    clinic = {}
  } = statusData;

  const isOnboardingCompleted = statusData.isOnboardingCompleted ?? clinic.isOnboardingCompleted ?? (onboardingStatus === 'COMPLETED');
  const isApproved = approvalStatus === 'approved' || clinic.approvalStatus === 'approved';
  const isPaymentVerified = paymentStatus === 'VERIFIED' || clinic.subscription?.status === 'Active';
  const isPaymentPending = paymentStatus === 'PENDING_VERIFICATION' || latestStatusIsPending(statusData);
  const isPaymentRejected = paymentStatus === 'REJECTED' || paymentStatus === 'REPAYMENT_REQUIRED';

  // 1. Email Verification
  if (!emailVerified) {
    return {
      nextRequiredAction: CLINIC_LIFECYCLE_ACTIONS.EMAIL_VERIFICATION,
      targetRoute: CLINIC_ROUTES.SETUP,
      isComplete: false
    };
  }

  // 2. Payment Submission Required
  if (paymentStatus === 'NOT_SUBMITTED' && !isPaymentVerified) {
    return {
      nextRequiredAction: CLINIC_LIFECYCLE_ACTIONS.PAYMENT,
      targetRoute: CLINIC_ROUTES.PAYMENT,
      isComplete: false
    };
  }

  // 3. Payment Pending Super Admin Verification
  if (isPaymentPending && !isPaymentVerified) {
    return {
      nextRequiredAction: CLINIC_LIFECYCLE_ACTIONS.PAYMENT_VERIFICATION,
      targetRoute: CLINIC_ROUTES.STATUS,
      isComplete: false
    };
  }

  // 4. Payment Rejected / Repayment Required
  if (isPaymentRejected && !isPaymentVerified) {
    return {
      nextRequiredAction: CLINIC_LIFECYCLE_ACTIONS.REPAYMENT,
      targetRoute: CLINIC_ROUTES.PAYMENT,
      isComplete: false
    };
  }

  // 5. Payment Verified, but Super Admin Clinic Approval Pending
  if (isPaymentVerified && !isApproved) {
    return {
      nextRequiredAction: CLINIC_LIFECYCLE_ACTIONS.APPROVAL,
      targetRoute: CLINIC_ROUTES.STATUS,
      isComplete: false
    };
  }

  // 6. Clinic Approved, but Onboarding Not Completed
  if (isApproved && !isOnboardingCompleted) {
    return {
      nextRequiredAction: CLINIC_LIFECYCLE_ACTIONS.ONBOARDING,
      targetRoute: CLINIC_ROUTES.ONBOARDING,
      isComplete: false
    };
  }

  // 7. Approved & Onboarding Completed -> Dashboard
  return {
    nextRequiredAction: CLINIC_LIFECYCLE_ACTIONS.DASHBOARD,
    targetRoute: CLINIC_ROUTES.DASHBOARD,
    isComplete: true
  };
};

const latestStatusIsPending = (data) => {
  const s = data.latestPayment?.status;
  return s === 'PENDING_VERIFICATION' || s === 'SUBMITTED';
};

/**
 * 7-step tracker definition for UI rendering
 */
export const CLINIC_TRACKER_STEPS = [
  { id: 1, key: 'owner', label: 'Owner Profile', desc: 'Account & Identity' },
  { id: 2, key: 'clinic', label: 'Clinic Details', desc: 'Profile & Address' },
  { id: 3, key: 'plan', label: 'Plan Selected', desc: 'Subscription Choice' },
  { id: 4, key: 'email', label: 'Email Verified', desc: 'OTP Authentication' },
  { id: 5, key: 'payment', label: 'Payment Verification', desc: 'UTR Verification' },
  { id: 6, key: 'approval', label: 'Clinic Approval', desc: 'Super Admin Sign-off' },
  { id: 7, key: 'onboarding', label: 'Ready for Launch', desc: 'Onboarding & Workspace' }
];
