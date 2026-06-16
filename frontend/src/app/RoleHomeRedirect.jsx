import { Navigate } from 'react-router-dom';

import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';

const RoleHomeRedirect = () => {
  const { user } = useAuth();

  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
};

export default RoleHomeRedirect;
