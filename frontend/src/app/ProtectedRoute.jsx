import { Navigate, useLocation } from 'react-router-dom';

import ErrorState from '../components/common/ErrorState';
import LoadingState from '../components/common/LoadingState';
import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
import { canAccessRole } from '../constants/roles';

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

  const isPendingReceptionist = user?.role === 'RECEPTIONIST' &&
    (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  if ((isPendingDoctor || isPendingReceptionist) && location.pathname !== '/dashboard') {
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

  return children;
};

export default ProtectedRoute;
