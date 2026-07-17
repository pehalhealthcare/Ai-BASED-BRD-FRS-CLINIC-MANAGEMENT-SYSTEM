import { Navigate, useLocation } from 'react-router-dom';

import ErrorState from '../components/common/ErrorState';
import LoadingState from '../components/common/LoadingState';
import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
import { canAccessRole, STAFF_ROLES } from '../constants/roles';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

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

  if ((isPendingDoctor || isPendingStaff) && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles.length && !canAccessRole(user?.role, allowedRoles)) {
    const fallbackPath = getDefaultRouteForRole(user?.role);
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
  const ROUTE_FEATURE_MAPPING = {
    '/pharmacy': 'pharmacy',
    '/labs': 'labs',
    '/chatbot': 'symptom_checker',
    '/online-consultation': 'online_consultation'
  };

  const matchedRoute = Object.keys(ROUTE_FEATURE_MAPPING).find(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  if (matchedRoute && user?.role !== 'SUPER_ADMIN' && user?.role !== 'patient') {
    const requiredFeature = ROUTE_FEATURE_MAPPING[matchedRoute];
    const planFeatures = user?.clinic?.subscription?.planId?.features || [];
    const activeTrials = user?.clinic?.trialFeatures
      ?.filter(t => t.isActive && new Date(t.expiryDate) > new Date())
      ?.map(t => t.featureCode) || [];

    const isFeatureEnabled = planFeatures.includes(requiredFeature) || activeTrials.includes(requiredFeature);

    if (!isFeatureEnabled) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center space-y-6">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Module Locked</h3>
              <p className="text-xs text-slate-400 mt-2">
                Access to this module requires an active subscription containing the "{requiredFeature.replace('_', ' ').toUpperCase()}" feature or trial period.
              </p>
            </div>
            <button type="button" onClick={() => window.history.back()}
              className="w-full py-2.5 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

import { ShieldAlert } from 'lucide-react';
export default ProtectedRoute;
