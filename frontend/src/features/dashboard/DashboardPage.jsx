import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import AdminDashboardPage from './admin/AdminDashboardPage';
import RoleDashboardPage from './RoleDashboardPage';
import { getDefaultRouteForRole } from '../../constants/routes';

const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role;

  if (role === ROLES.SUPER_ADMIN) {
    window.location.href = '/super-admin/clinics';
    return null;
  }

  if (role === ROLES.ADMIN) {
    return <AdminDashboardPage />;
  }

  if (
    role === ROLES.PHARMACIST ||
    role === ROLES.PHARMACY_OPERATOR ||
    role === ROLES.LAB_OPERATOR ||
    role === ROLES.LAB_TECHNICIAN
  ) {
    return <Navigate to={getDefaultRouteForRole(role, user)} replace />;
  }

  return <RoleDashboardPage />;
};

export default DashboardPage;
