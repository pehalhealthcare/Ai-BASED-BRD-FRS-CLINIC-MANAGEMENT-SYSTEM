import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  ShieldAlert, RefreshCw, LogOut, Sparkles, Phone,
  Mail, ArrowUpRight, CreditCard, Zap, Star, Crown
} from 'lucide-react';

const ClinicSuspendedExpired = ({ mode = 'suspended' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const clinic = user?.clinic || {};

  const isSuspended = mode === 'suspended';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const plans = [
    { name: 'AI Professional', price: '₹1,999/mo', icon: Zap, color: 'from-blue-500 to-indigo-500', features: ['Up to 3 Doctors', '10 Staff', 'Pharmacy & Labs', 'Analytics'] },
    { name: 'AI Premium', price: '₹2,999/mo', icon: Star, color: 'from-purple-500 to-violet-500', features: ['Up to 15 Doctors', '25 Staff', 'AI Assistant', 'Multi-Branch'] },
    { name: 'Enterprise', price: '₹4,999/mo', icon: Crown, color: 'from-amber-500 to-orange-500', features: ['Unlimited Everything', 'Dedicated Server', 'Custom Branding', 'ABDM Integration'] },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${isSuspended ? 'bg-gradient-to-br from-slate-50 via-red-50/20 to-rose-50/10' : 'bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/10'}`}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center ${isSuspended ? 'from-red-500 to-rose-500' : 'from-amber-500 to-orange-500'}`}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-slate-800 text-lg tracking-tight">AI-CMS</span>
          <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border ${isSuspended ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
            {isSuspended ? 'Suspended' : 'Subscription Expired'}
          </span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {/* Hero Banner */}
        <div className={`bg-gradient-to-r rounded-3xl p-8 mb-8 text-white shadow-xl ${isSuspended ? 'from-red-600 to-rose-600 shadow-red-200' : 'from-amber-500 to-orange-500 shadow-amber-200'}`}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className={`text-sm font-semibold uppercase tracking-widest mb-1 ${isSuspended ? 'text-red-100' : 'text-amber-100'}`}>
                {isSuspended ? 'Account Suspended' : 'Subscription Expired'}
              </p>
              <h1 className="text-3xl font-black mb-2">
                {isSuspended ? 'Clinic Suspended' : 'Your Subscription Has Expired'}
              </h1>
              <p className={`text-sm leading-relaxed max-w-lg ${isSuspended ? 'text-red-100' : 'text-amber-100'}`}>
                {isSuspended
                  ? 'Your clinic account has been temporarily suspended. Access to clinic features is restricted until the issue is resolved.'
                  : 'Your subscription plan has expired. Renew now to restore access to all clinic features and continue serving your patients.'}
              </p>
            </div>
          </div>
        </div>

        {isSuspended ? (
          // ── Suspended View ──────────────────────────────────────────────────
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
                <a href="mailto:support@ai-cms.in" className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-purple-50 transition-all group border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Email Us</p>
                    <p className="text-slate-400 text-xs">support@ai-cms.in</p>
                  </div>
                </a>
              </div>
            </div>

            <a
              href="mailto:support@ai-cms.in?subject=Clinic Suspension Appeal&body=Clinic Name: "
              className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:opacity-90 transition-all"
            >
              <Mail className="w-4 h-4" /> Submit an Appeal
            </a>
          </div>
        ) : (
          // ── Expired View ────────────────────────────────────────────────────
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-black text-slate-800 mb-1">Current Plan</h3>
              <p className="text-slate-400 text-sm mb-4">Your subscription has expired. Choose a plan to renew or upgrade.</p>
              {clinic.subscription?.planId && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{clinic.subscription.planId?.name || 'Current Plan'}</p>
                    <p className="text-amber-600 text-xs font-medium">Expired</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-black text-slate-800 mb-4">Choose a Plan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map((plan, i) => {
                  const Icon = plan.icon;
                  return (
                    <div key={i} className={`rounded-2xl p-5 bg-gradient-to-br ${plan.color} text-white shadow-lg hover:scale-105 transition-transform cursor-pointer`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-black text-sm">{plan.name}</span>
                      </div>
                      <p className="text-2xl font-black mb-3">{plan.price}</p>
                      <ul className="space-y-1.5 mb-4">
                        {plan.features.map((f, j) => (
                          <li key={j} className="text-xs text-white/80 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <a
                        href={`mailto:sales@ai-cms.in?subject=Plan Renewal - ${plan.name}`}
                        className="flex items-center justify-center gap-1 w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 transition text-xs font-bold"
                      >
                        Renew / Upgrade <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="tel:+918000000000" className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:bg-blue-50 transition-all group border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Contact Sales</p>
                  <p className="text-slate-400 text-xs">+91 80000 00000</p>
                </div>
              </a>
              <a href="mailto:sales@ai-cms.in" className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:bg-purple-50 transition-all group border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Email Sales</p>
                  <p className="text-slate-400 text-xs">sales@ai-cms.in</p>
                </div>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClinicSuspendedExpired;
