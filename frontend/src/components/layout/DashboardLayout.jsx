import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState,useEffect } from 'react';

import { ROUTES } from '../../constants/routes';
import { ROLES, STAFF_ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import FloatingChatbot from './FloatingChatbot';
import BottomFloatingNavBar from './BottomFloatingNavBar';
import WalkInPatientModal from '../../features/dashboard/WalkInPatientModal';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';

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
  [ROUTES.adminReceptionistsDashboard]: 'Staff Management',
};

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [subInfo, setSubInfo] = useState(null);

  useEffect(() => {
    if (user?.role === ROLES.ADMIN) {
      axios.get('/api/v1/subscriptions/current', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => setSubInfo(res.data?.data))
      .catch(err => console.error('Subscription check failed:', err));
    }
  }, [user]);


  const activeTitle =
    Object.entries(pageTitles).find(
      ([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    )?.[1] || 'AI-CMS';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Expired lockout rendering
  if (user?.role === ROLES.ADMIN && subInfo?.subscription?.status === 'Expired') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700/50 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black">Your subscription has expired</h2>
            <p className="text-xs text-slate-400">Please renew your subscription plan to restore access to your clinic management dashboard and premium features.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={async () => {
                try {
                  const res = await axios.post('/api/v1/subscriptions/renew', {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                  });
                  if (res.data?.success) {
                    window.location.reload();
                  }
                } catch {
                  alert('Renewal failed.');
                }
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase transition"
            >
              Renew Subscription
            </button>
            <button 
              onClick={() => alert('View Invoice: Coming Soon')}
              className="w-full py-3 bg-slate-700 hover:bg-slate-655 text-slate-200 rounded-xl text-xs font-black uppercase transition"
            >
              View Invoice
            </button>
            <button 
              onClick={() => alert('Contacting support desk...')}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl text-xs font-black uppercase transition"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPendingDoctor =
    user?.role === ROLES.DOCTOR &&
    (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  const isPendingReceptionist =
    STAFF_ROLES.includes(user?.role) &&
    (['pending_profile', 'pending_approval', 're_edit', 'pending_invitation', 'otp_verification_pending', 'onboarding_in_progress', 'changes_requested'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  if (isPendingDoctor || isPendingReceptionist) {
    return <Outlet />;
  }

  const show24hWarning = user?.role === ROLES.ADMIN && subInfo?.usage?.remainingDays === 1 && subInfo?.subscription?.status !== 'Expired';


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
        {show24hWarning && (
          <div className="bg-rose-650 bg-rose-600 text-white p-4 text-xs font-bold flex items-center justify-between gap-4 flex-wrap">
            <span>
              ⚠️ <strong>Your subscription will expire within the next 24 hours.</strong> Please renew your subscription to avoid interruption of clinic services.
            </span>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={async () => {
                  try {
                    const res = await axios.post('/api/v1/subscriptions/renew', {}, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (res.data?.success) {
                      window.location.reload();
                    }
                  } catch {
                    alert('Renewal failed.');
                  }
                }}
                className="bg-white text-rose-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer"
              >
                Renew Now
              </button>
              <button 
                onClick={async () => {
                  try {
                    await axios.post('/api/v1/subscriptions/auto-recharge', {
                      autoRecharge: true,
                      paymentMethod: { last4: '4242', brand: 'Visa', token: 'TOK_AUTO_RECHARGE_CONFIRMED' }
                    }, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    window.location.reload();
                  } catch {
                    alert('Auto recharge activation failed.');
                  }
                }}
                className="bg-rose-700 hover:bg-rose-800 text-white border border-rose-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer"
              >
                Enable Auto Recharge
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="bg-rose-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer"
              >
                View Details
              </button>
            </div>
          </div>
        )}
        <Topbar
          title={activeTitle}
          currentUser={user}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-4 md:p-6 overflow-x-auto animate-fade-in">
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
