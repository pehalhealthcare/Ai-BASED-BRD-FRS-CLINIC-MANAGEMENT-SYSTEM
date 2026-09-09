import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  ShieldAlert, LogOut, Sparkles, Phone,
  Mail
} from 'lucide-react';
import SubscriptionRenewalFlow from '../subscriptions/SubscriptionRenewalFlow';

const ClinicSuspendedExpired = ({ mode = 'suspended' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const clinic = user?.clinic || {};

  const isSuspended = mode === 'suspended';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // If the clinic subscription is expired, render the Renewal Flow (Starting at Subscription Expired Screen 0)
  if (!isSuspended) {
    return <SubscriptionRenewalFlow initialScreen="subscription_expired" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-red-50/20 to-rose-50/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-slate-800 text-lg tracking-tight">AICMS</span>
          <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-red-100 text-red-700 border-red-200">
            Suspended
          </span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r rounded-3xl p-8 mb-8 text-white shadow-xl from-red-600 to-rose-600 shadow-red-200">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-1 text-red-100">
                Account Suspended
              </p>
              <h1 className="text-3xl font-black mb-2">
                Clinic Suspended
              </h1>
              <p className="text-sm leading-relaxed max-w-lg text-red-100">
                Your clinic account has been temporarily suspended. Access to clinic features is restricted until the issue is resolved.
              </p>
            </div>
          </div>
        </div>

        {/* Suspended View */}
        <div className="space-y-5">
          {clinic.rejectionReason && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" /> Suspension Reason
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed bg-red-50 border border-red-100 rounded-xl p-4">
                {clinic.rejectionReason || 'Your account was suspended by the platform administrator.'}
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-black text-slate-800 mb-4">Contact Support</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="tel:+918000000000" className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all group border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Call Us</p>
                  <p className="text-slate-400 text-xs">+91 80000 00000</p>
                </div>
              </a>
              <a href="mailto:support@pehalhealthcare.com" className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-purple-50 transition-all group border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Email Us</p>
                  <p className="text-slate-400 text-xs">support@pehalhealthcare.com</p>
                </div>
              </a>
            </div>
          </div>

          <a
            href="mailto:support@pehalhealthcare.com?subject=Clinic%20Suspension%20Appeal&body=Clinic%20Name:%20"
            className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:opacity-90 transition-all"
          >
            <Mail className="w-4 h-4" /> Submit an Appeal
          </a>
        </div>
      </main>
    </div>
  );
};

export default ClinicSuspendedExpired;
