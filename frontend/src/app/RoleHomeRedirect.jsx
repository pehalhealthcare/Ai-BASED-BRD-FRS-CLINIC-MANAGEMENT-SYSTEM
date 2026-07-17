import { Navigate } from 'react-router-dom';

import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
const RoleHomeRedirect = () => {
  const { user } = useAuth();

  if (user?.role === 'ADMIN' && user?.clinic && !user.clinic.isOnboardingCompleted) {
    return <Navigate to="/clinic/onboarding" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
};

export default RoleHomeRedirect;
