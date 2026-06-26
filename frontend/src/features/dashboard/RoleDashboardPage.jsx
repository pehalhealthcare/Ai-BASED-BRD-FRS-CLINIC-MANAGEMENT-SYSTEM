import { Navigate } from 'react-router-dom';

import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';
import DashboardOverviewPage from './DashboardOverviewPage';
import DashboardPharmacyPage from './DashboardPharmacyPage';
import DoctorDashboardPage from './DoctorDashboardPage';
import DoctorOnboarding from '../doctors/DoctorOnboarding';
import ReceptionistOnboarding from '../receptionists/ReceptionistOnboarding';

const RoleDashboardPage = () => {
  const { user } = useAuth();

  if (user?.role === ROLES.DOCTOR && (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || (!user?.hasAcceptedSlot && !user?.initialSlotAccepted))) {
    return <DoctorOnboarding onProfileStatusChange={() => window.location.reload()} />;
  }

  if (user?.role === ROLES.RECEPTIONIST && (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || (!user?.hasAcceptedSlot && !user?.initialSlotAccepted))) {
    return <ReceptionistOnboarding onProfileStatusChange={() => window.location.reload()} />;
  }

  if (user?.role === ROLES.PHARMACIST) {
    return <DashboardPharmacyPage />;
  }

  if (user?.role === ROLES.DOCTOR) {
    return <DoctorDashboardPage />;
  }

  if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST].includes(user?.role)) {
    return <DashboardOverviewPage />;
  }

  return <Navigate to={ROUTES.home} replace />;
};

export default RoleDashboardPage;
