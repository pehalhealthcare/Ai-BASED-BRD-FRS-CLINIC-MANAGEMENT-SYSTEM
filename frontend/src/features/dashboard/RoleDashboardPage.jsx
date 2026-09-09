import { Navigate } from 'react-router-dom';

import { ROLES, STAFF_ROLES } from '../../constants/roles';
import { ROUTES, getDefaultRouteForRole } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';
import AdminDashboardPage from './admin/AdminDashboardPage';
import DoctorDashboardPage from './DoctorDashboardPage';
import ReceptionistOnboarding from '../receptionists/ReceptionistOnboarding';
import ReceptionistDashboardPage from './ReceptionistDashboardPage';
import SuperAdminDashboard from '../super-admin/SuperAdminDashboard';

import DoctorOnboardingWizard from '../doctors/DoctorOnboardingWizard';
import DoctorCorrectionRequired from '../doctors/DoctorCorrectionRequired';
import DoctorOnboarding from '../doctors/DoctorOnboarding';
import StaffOnboardingWizard from '../staff/StaffOnboardingWizard';
import { useState, useEffect } from 'react';
import { Clock, LogOut, Settings } from 'lucide-react';
import LoadingState from '../../components/common/LoadingState';
import { clinicApi } from '../../lib/api';
import { evaluateClinicLifecycle } from '../../utils/clinicLifecycle';

const STAFF_WIZARD_STATUSES = [
  'pending_profile',
  'pending_invitation',
  'otp_verification_pending',
  'onboarding_in_progress',
  'changes_requested',
  're_edit'
];

const RoleDashboardPage = () => {
  const { user, logout, refreshUser } = useAuth();
  const [forceWizard, setForceWizard] = useState(false);
  // Tracks whether we've verified the staff user's actual backend status
  const [staffStatusVerified, setStaffStatusVerified] = useState(false);
  // Tracks clinic setup status for Admin role
  const [adminClinicStatus, setAdminClinicStatus] = useState(null);
  const [adminStatusChecked, setAdminStatusChecked] = useState(false);

  const isStaffRole = STAFF_ROLES.includes(user?.role);

  useEffect(() => {
    // For staff users potentially in wizard status, always re-fetch from backend
    // to avoid showing the wizard when the profile is already submitted (pending_approval)
    if (isStaffRole && STAFF_WIZARD_STATUSES.includes(user?.approvalStatus)) {
      refreshUser(true).finally(() => setStaffStatusVerified(true));
    } else {
      setStaffStatusVerified(true);
    }

    // For Admin users, check authoritative setup status
    if (user?.role === ROLES.ADMIN) {
      clinicApi.getSetupStatus()
        .then((res) => {
          if (res?.data) {
            setAdminClinicStatus(res.data);
          }
        })
        .catch((err) => {
          console.warn('Could not load clinic setup status:', err);
        })
        .finally(() => {
          setAdminStatusChecked(true);
        });
    } else {
      setAdminStatusChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (user?.role === ROLES.DOCTOR) {
    if (user.approvalStatus === 'approved' && !user?.hasAcceptedSlot) {
      return <DoctorOnboarding onProfileStatusChange={() => refreshUser(true)} />;
    }
    if (user.approvalStatus === 'pending_profile' || forceWizard) {
      return <DoctorOnboardingWizard />;
    }
    if (user.approvalStatus === 're_edit') {
      return <DoctorCorrectionRequired onEditProfile={() => setForceWizard(true)} />;
    }
    if (user.approvalStatus === 'pending_approval') {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
          <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-8 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-md animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 leading-none">Profile Under Review</h1>
                <span className="text-[10px] text-slate-400 mt-1 block">Pending Clinic Admin Approval</span>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </header>
          <main className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col justify-center">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg text-center space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Verification Pending</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hello <strong>{user.name}</strong>, your professional profile has been submitted and is currently pending review by your Clinic Admin.
              </p>
              <p className="text-[10px] text-slate-400">
                You will receive an email notification as soon as your account is approved.
              </p>
            </div>
          </main>
        </div>
      );
    }
  }

  // Handle clinic staff onboarding
  if (isStaffRole) {
    if (!staffStatusVerified) {
      return <LoadingState label="Verifying your onboarding status..." />;
    }
    if (['pending_profile', 'pending_invitation', 'otp_verification_pending', 'onboarding_in_progress', 'changes_requested', 're_edit'].includes(user?.approvalStatus)) {
      return <StaffOnboardingWizard />;
    }
    if (user?.approvalStatus === 'approved' && !user?.hasAcceptedSlot) {
      return <ReceptionistOnboarding user={user} onProfileStatusChange={() => refreshUser(true)} />;
    }
    if (user?.approvalStatus === 'pending_approval') {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-white">
          <header className="bg-slate-950 border-b border-stone-850 py-4 px-6 md:px-8 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-md animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white leading-none">Profile Under Review</h1>
                <span className="text-[10px] text-stone-400 mt-1 block">Pending Clinic Admin Approval</span>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 border border-stone-800 bg-stone-900/50 hover:bg-stone-900 rounded-xl text-xs font-bold text-stone-300 flex items-center gap-1.5 transition">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </header>
          <main className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col justify-center">
            <div className="bg-slate-950 rounded-3xl p-8 border border-stone-850 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-white">Waiting for Review & Approval</h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                Hello <strong>{user?.name}</strong>, your onboarding profile has been submitted successfully and is currently waiting for review & approval from clinic admins.
              </p>
              <p className="text-[10px] text-stone-500">
                You will receive an email notification as soon as your account is approved.
              </p>
            </div>
          </main>
        </div>
      );
    }
  }


  if (user?.role === ROLES.DOCTOR) {
    return <DoctorDashboardPage />;
  }

  if (user?.role === ROLES.RECEPTIONIST) {
    return <ReceptionistDashboardPage />;
  }

  if (user?.role === ROLES.SUPER_ADMIN) {
    return <SuperAdminDashboard />;
  }

  if (user?.role === ROLES.ADMIN) {
    if (!adminStatusChecked) {
      return <LoadingState label="Verifying clinic setup status..." />;
    }
    if (adminClinicStatus) {
      const evaluation = evaluateClinicLifecycle(adminClinicStatus);
      if (!evaluation.isComplete && evaluation.targetRoute !== '/dashboard') {
        return <Navigate to={evaluation.targetRoute} replace />;
      }
    } else if (user?.clinic) {
      if (user.clinic.approvalStatus !== 'approved' || user.clinic.subscription?.status === 'Pending Approval') {
        return <Navigate to="/clinic/status" replace />;
      }
      if (!user.clinic.isOnboardingCompleted) {
        return <Navigate to="/clinic/onboarding" replace />;
      }
    }
    return <AdminDashboardPage />;
  }

  // Fallback redirect for roles whose dashboard is not designed/rendered directly here
  return <Navigate to={getDefaultRouteForRole(user?.role, user)} replace />;
};

export default RoleDashboardPage;
