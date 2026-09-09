import { Navigate } from 'react-router-dom';

import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
const RoleHomeRedirect = () => {
  const { user } = useAuth();

  if (user?.role === 'ADMIN' && user?.clinic) {
    const { approvalStatus, subscription, isOnboardingCompleted, paymentStatus } = user.clinic;
    const isFreeTier = paymentStatus === 'FREE_TIER' || subscription?.isFreeTier;

    if (!isFreeTier && (paymentStatus === 'NOT_SUBMITTED' || paymentStatus === 'NOT_PAID' || paymentStatus === 'REJECTED')) {
      return <Navigate to="/clinic-setup/payment" replace />;
    }
    if (paymentStatus === 'PENDING_VERIFICATION') {
      return <Navigate to="/clinic-setup/payment-status" replace />;
    }
    if (approvalStatus === 'pending_approval') {
      return <Navigate to="/clinic-setup/payment-status" replace />;
    }
    if (approvalStatus === 'rejected') {
      return <Navigate to="/clinic/corrections" replace />;
    }
    if (approvalStatus === 'suspended' || subscription?.status === 'Suspended') {
      return <Navigate to="/clinic/suspended" replace />;
    }
    if (subscription?.status === 'Expired') {
      return <Navigate to="/clinic/expired" replace />;
    }
    if (approvalStatus === 'approved' && !isOnboardingCompleted) {
      return <Navigate to="/clinic/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user?.role, user)} replace />;
};

export default RoleHomeRedirect;
