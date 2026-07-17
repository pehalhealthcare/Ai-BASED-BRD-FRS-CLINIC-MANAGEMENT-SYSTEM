import { Navigate } from 'react-router-dom';

import { ROLES, STAFF_ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';
import DashboardPage from './DashboardPage';
import DashboardPharmacyPage from './DashboardPharmacyPage';
import DoctorDashboardPage from './DoctorDashboardPage';
import ReceptionistOnboarding from '../receptionists/ReceptionistOnboarding';
import ReceptionistDashboardPage from './ReceptionistDashboardPage';

import DoctorOnboardingWizard from '../doctors/DoctorOnboardingWizard';
import DoctorCorrectionRequired from '../doctors/DoctorCorrectionRequired';
import DoctorOnboarding from '../doctors/DoctorOnboarding';
import StaffOnboardingWizard from '../staff/StaffOnboardingWizard';
import { useState, useEffect } from 'react';
import { Clock, LogOut, Settings } from 'lucide-react';
import LoadingState from '../../components/common/LoadingState';

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

  const isStaffRole = STAFF_ROLES.includes(user?.role);

  useEffect(() => {
    // For staff users potentially in wizard status, always re-fetch from backend
    // to avoid showing the wizard when the profile is already submitted (pending_approval)
    if (isStaffRole && STAFF_WIZARD_STATUSES.includes(user?.approvalStatus)) {
      refreshUser(true).finally(() => setStaffStatusVerified(true));
    } else {
      setStaffStatusVerified(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (user?.role === ROLES.DOCTOR) {
    if (user.approvalStatus === 'approved' && !user?.hasAcceptedSlot) {
      return <DoctorOnboarding />;
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

  if (user?.role === ROLES.PHARMACIST) {
    return <DashboardPharmacyPage />;
  }

  if (user?.role === ROLES.DOCTOR) {
    return <DoctorDashboardPage />;
  }

  if (user?.role === ROLES.RECEPTIONIST) {
    return <ReceptionistDashboardPage />;
  }

  if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role)) {
    return <DashboardPage />;
  }

  // Fallback screen for roles whose dashboard is not designed yet
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-white">
      <header className="bg-slate-950 border-b border-stone-850 py-4 px-6 md:px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-md">
            <span className="font-black text-xs">{user?.role?.slice(0, 2) || 'ST'}</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">{user?.role || 'Staff'} Dashboard</h1>
            <span className="text-[10px] text-stone-400 mt-1 block">Account: {user?.name}</span>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="px-4 py-2 border border-stone-800 bg-stone-900/50 hover:bg-stone-900 rounded-xl text-xs font-bold text-stone-300 flex items-center gap-1.5 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col justify-center">
        <div className="bg-slate-950 rounded-3xl p-8 border border-stone-850 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Settings className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-lg font-black text-white">Dashboard Under Development</h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            Hello <strong>{user?.name}</strong>, the dashboard for the role of <strong>{user?.role}</strong> is currently not designed.
          </p>
          <p className="text-[10px] text-stone-500">
            Please contact your administrator or system developer for more information.
          </p>
        </div>
      </main>
    </div>
  );
};

export default RoleDashboardPage;
