import { Navigate } from 'react-router-dom';

import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';
import DashboardOverviewPage from './DashboardOverviewPage';
import DashboardPharmacyPage from './DashboardPharmacyPage';
import DoctorOnboarding from '../doctors/DoctorOnboarding';

const RoleDashboardPage = () => {
  const { user } = useAuth();

  if (user?.role === ROLES.DOCTOR && (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || (!user?.hasAcceptedSlot && !user?.initialSlotAccepted))) {
    return <DoctorOnboarding onProfileStatusChange={() => window.location.reload()} />;
  }

  if (user?.role === ROLES.PHARMACIST) {
    return <DashboardPharmacyPage />;
  }

  if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR].includes(user?.role)) {
    return <DashboardOverviewPage />;
  }

  return <Navigate to={ROUTES.home} replace />;
};

export default RoleDashboardPage;
