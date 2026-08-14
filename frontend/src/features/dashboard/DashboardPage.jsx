import React from 'react';
import useAuth from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import AdminDashboardPage from './admin/AdminDashboardPage';
import RoleDashboardPage from './RoleDashboardPage';

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

  return <RoleDashboardPage />;
};

export default DashboardPage;
