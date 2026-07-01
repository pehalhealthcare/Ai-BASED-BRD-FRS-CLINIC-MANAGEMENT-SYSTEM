import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { ROUTES } from '../../constants/routes';
import { ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import FloatingChatbot from './FloatingChatbot';
import BottomFloatingNavBar from './BottomFloatingNavBar';
import WalkInPatientModal from '../../features/dashboard/WalkInPatientModal';

const pageTitles = {
  [ROUTES.dashboard]: 'Dashboard',
  [ROUTES.patients]: 'Patients',
  [ROUTES.appointments]: 'Appointments',
  [ROUTES.consultations]: 'Consultations',
  [ROUTES.chatbot]: 'AI Chatbot',
  [ROUTES.prescriptions]: 'Prescriptions',
  [ROUTES.billing]: 'Billing',
  [ROUTES.dashboardBillingFraud]: 'Billing Risk Review',
  [ROUTES.dashboardAuditLogs]: 'Audit Logs',
  [ROUTES.portal]: 'My Portal',
  [ROUTES.patientAppointments]: 'My Appointments',
  [ROUTES.users]: 'User Management',
  [ROUTES.labOrders]: 'Lab Orders',
  [ROUTES.pharmacyMedicines]: 'Pharmacy',
  [ROUTES.notificationLogs]: 'Notifications',
  [ROUTES.followUps]: 'Follow-ups',
  [ROUTES.superAdminDashboard]: 'Super Admin',
  [ROUTES.superAdminApprovals]: 'My Doctors',
  [ROUTES.adminReceptionistsDashboard]: 'My Receptionists',
};

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);

  const activeTitle =
    Object.entries(pageTitles).find(
      ([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    )?.[1] || 'AI-CMS';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] lg:flex">
      {/* Sidebar */}
      <Sidebar
        user={user}
        role={user?.role}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        onAddWalkIn={() => setWalkInModalOpen(true)}
      />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
        <Topbar
          title={activeTitle}
          currentUser={user}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>
        {user?.role === ROLES.PATIENT && <FloatingChatbot />}
        <BottomFloatingNavBar />
      </div>
      <WalkInPatientModal
        isOpen={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
};

export default DashboardLayout;
