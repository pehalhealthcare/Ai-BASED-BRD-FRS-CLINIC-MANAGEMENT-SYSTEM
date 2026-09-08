import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, RotateCcw } from 'lucide-react';

import ErrorState from '../components/common/ErrorState';
import LoadingState from '../components/common/LoadingState';
import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
import { canAccessRole, STAFF_ROLES } from '../constants/roles';

// Route to Canonical Feature Mapping
const ROUTE_FEATURE_PATTERNS = [
  {
    feature: 'labs',
    displayName: 'LABS',
    matches: (pathname) => (
      pathname === '/labs' ||
      pathname.startsWith('/labs/') ||
      pathname === '/lab-orders' ||
      pathname.startsWith('/lab-orders/') ||
      pathname === '/sample-collection' ||
      pathname.startsWith('/sample-collection/') ||
      pathname === '/test-catalogue' ||
      pathname.startsWith('/test-catalogue/') ||
      pathname === '/lab-inventory' ||
      pathname.startsWith('/lab-inventory/') ||
      pathname === '/qc-calibration' ||
      pathname.startsWith('/qc-calibration/') ||
      pathname === '/reports-analytics' ||
      pathname.startsWith('/reports-analytics/') ||
      pathname.startsWith('/laboratory') ||
      pathname.startsWith('/provider-workspace/laboratory')
    )
  },
  {
    feature: 'pharmacy',
    displayName: 'PHARMACY',
    matches: (pathname) => (
      pathname === '/pharmacy' ||
      pathname.startsWith('/pharmacy/') ||
      pathname === '/pharmacist' ||
      pathname.startsWith('/pharmacist/') ||
      pathname.startsWith('/provider-workspace/pharmacy')
    )
  },
  {
    feature: 'symptom_checker',
    displayName: 'SYMPTOM CHECKER',
    matches: (pathname) => (
      pathname === '/chatbot' ||
      pathname.startsWith('/chatbot/')
    )
  },
  {
    feature: 'online_consultation',
    displayName: 'ONLINE CONSULTATION',
    matches: (pathname) => (
      pathname === '/online-consultation' ||
      pathname.startsWith('/online-consultation/')
    )
  }
];

// Normalize feature lists from all possible clinic/subscription structures
const extractPlanFeatures = (clinic) => {
  if (!clinic) return [];
  const sub = clinic.subscription;
  const featuresSource = 
    sub?.planId?.features ||
    sub?.plan?.features ||
    sub?.features ||
    clinic.features ||
    [];
  
  if (Array.isArray(featuresSource)) {
    return featuresSource.map(f => String(f).toLowerCase().trim());
  }
  if (typeof featuresSource === 'object' && featuresSource !== null) {
    return Object.keys(featuresSource).filter(k => Boolean(featuresSource[k])).map(k => String(k).toLowerCase().trim());
  }
  return [];
};

// Normalize active trial features
const extractActiveTrialFeatures = (clinic) => {
  if (!clinic || !Array.isArray(clinic.trialFeatures)) return [];
  const now = new Date();
  return clinic.trialFeatures
    .filter(t => (t.isActive === true || String(t.isActive) === 'true') && new Date(t.expiryDate) > now)
    .map(t => String(t.featureCode || '').toLowerCase().trim());
};

// Check if a list of features contains the required feature (supporting canonical aliases)
const containsFeature = (featureList, targetFeature) => {
  if (!Array.isArray(featureList) || !targetFeature) return false;
  const target = String(targetFeature).toLowerCase().trim();
  
  if (target === 'labs' || target === 'laboratory') {
    return featureList.some(f => ['labs', 'lab', 'laboratory', 'laboratories', 'diagnostic', 'diagnostics', 'lab_orders', 'sample_collection', 'pathology'].includes(f));
  }
  if (target === 'pharmacy') {
    return featureList.some(f => ['pharmacy', 'medicines', 'inventory', 'pharmacies'].includes(f));
  }
  if (target === 'symptom_checker') {
    return featureList.some(f => ['symptom_checker', 'consultation_assistant', 'ai_assistant'].includes(f));
  }
  if (target === 'online_consultation') {
    return featureList.some(f => ['online_consultation', 'telemedicine', 'video_consultation'].includes(f));
  }
  return featureList.includes(target);
};

// Canonical evaluation of module access for a clinic
const evaluateModuleAccess = (clinic, requiredFeature) => {
  if (!clinic) {
    return {
      isFeatureEnabled: false,
      planEntitled: false,
      trialEntitled: false,
      normStatus: 'none',
      planFeatures: [],
      activeTrials: []
    };
  }

  const sub = clinic.subscription;
  const rawStatus = sub?.status || 'Active';
  const normStatus = String(rawStatus).toLowerCase().trim();

  const isSubscriptionActive = ['active', 'trial', 'trialing', 'grace_period'].includes(normStatus);
  
  const planFeatures = extractPlanFeatures(clinic);
  const activeTrials = extractActiveTrialFeatures(clinic);

  const planEntitled = isSubscriptionActive && containsFeature(planFeatures, requiredFeature);
  const trialEntitled = containsFeature(activeTrials, requiredFeature);

  const isFeatureEnabled = planEntitled || trialEntitled;

  return {
    isFeatureEnabled,
    planEntitled,
    trialEntitled,
    isSubscriptionActive,
    normStatus,
    planFeatures,
    activeTrials
  };
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user, refreshUser } = useAuth();
  const location = useLocation();
  const [retryLoading, setRetryLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(null);

  if (loading) {
    return <LoadingState label="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isPendingDoctor = user?.role === 'DOCTOR' &&
    (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  const isPendingStaff = STAFF_ROLES.includes(user?.role) &&
    (['pending_profile', 'pending_approval', 're_edit', 'changes_requested', 'pending_invitation', 'otp_verification_pending', 'onboarding_in_progress'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  const isOnboardingPending = user?.role === 'ADMIN' && user?.clinic && !user.clinic.isOnboardingCompleted;

  if (isOnboardingPending && location.pathname !== '/clinic/onboarding') {
    return <Navigate to="/clinic/onboarding" replace />;
  }

  if (user?.role === 'ADMIN' && user?.clinic?.isOnboardingCompleted && location.pathname === '/clinic/onboarding') {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  // Clinic Subscription Expiration Guard
  const isSubscriptionExpired = user?.role === 'ADMIN' && user?.clinic && (
    user.clinic.subscription?.status === 'Expired'
  );

  if (isSubscriptionExpired && !['/clinic/expired', '/clinic/renewal', '/clinic/status'].includes(location.pathname)) {
    return <Navigate to="/clinic/expired" replace />;
  }

  if (user?.role === 'ADMIN' && user?.clinic?.subscription?.status === 'Active' && location.pathname === '/clinic/expired') {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  if ((isPendingDoctor || isPendingStaff) && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles.length && !canAccessRole(user?.role, allowedRoles)) {
    const fallbackPath = getDefaultRouteForRole(user?.role, user);
    return (
      <div className="p-6">
        <ErrorState
          title="Access restricted"
          description="Your current role does not have access to this page."
          action={<Navigate to={fallbackPath} replace />}
        />
      </div>
    );
  }

  // Feature-based subscription & trial gating
  const matchedRule = ROUTE_FEATURE_PATTERNS.find(rule => rule.matches(location.pathname));

  if (matchedRule && user?.role !== 'SUPER_ADMIN' && user?.role !== 'patient' && !(matchedRule.feature === 'labs' && (['LAB_TECHNICIAN', 'LAB_OPERATOR', 'PATHOLOGIST'].includes(user?.role) || user?.laboratoryId))) {
    // If clinic data is not present on user despite having a clinic context, allow refreshing or show retry
    if (!user?.clinic && (user?.clinicId || user?.providerId)) {
      const handleRetry = async () => {
        setRetryLoading(true);
        setVerificationError(null);
        try {
          const refreshed = await refreshUser(true);
          if (!refreshed?.clinic) {
            setVerificationError('Unable to verify clinic subscription access. Please check network connection or retry.');
          }
        } catch (_err) {
          setVerificationError('Error connecting to subscription service. Please try again.');
        } finally {
          setRetryLoading(false);
        }
      };

      if (verificationError) {
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center space-y-6">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Subscription Verification Error</h3>
                <p className="text-xs text-slate-400 mt-2">{verificationError}</p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                disabled={retryLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <RotateCcw className={`w-4 h-4 ${retryLoading ? 'animate-spin' : ''}`} />
                {retryLoading ? 'Verifying...' : 'Retry Verification'}
              </button>
            </div>
          </div>
        );
      }
    }

    const accessResult = evaluateModuleAccess(user?.clinic, matchedRule.feature);

    if (import.meta.env.DEV) {
      console.log(`[SUBSCRIPTION / FEATURE GATE]`, {
        path: location.pathname,
        requiredFeature: matchedRule.feature,
        clinicId: user?.clinic?._id || user?.clinicId,
        clinicName: user?.clinic?.name,
        subscriptionStatus: accessResult.normStatus,
        planFeatures: accessResult.planFeatures,
        activeTrials: accessResult.activeTrials,
        planEntitled: accessResult.planEntitled,
        trialEntitled: accessResult.trialEntitled,
        accessGranted: accessResult.isFeatureEnabled
      });
    }

    if (!accessResult.isFeatureEnabled) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center space-y-6">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Module Locked</h3>
              <p className="text-xs text-slate-400 mt-2">
                Access to this module requires an active subscription containing the "{matchedRule.displayName}" feature or trial period.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full py-2.5 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
