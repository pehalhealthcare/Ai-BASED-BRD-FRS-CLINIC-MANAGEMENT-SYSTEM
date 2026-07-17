import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  Clock, CheckCircle, XCircle, FileText, Calendar, Sparkles,
  Building2, RefreshCw, LogOut, CreditCard, ArrowRight, Bell
} from 'lucide-react';

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Registration Submitted', icon: FileText, color: 'emerald' },
  { key: 'under_review', label: 'Under Review', icon: Clock, color: 'blue' },
  { key: 'documents', label: 'Waiting for Documents', icon: FileText, color: 'amber' },
  { key: 'approval_pending', label: 'Approval Pending', icon: Bell, color: 'purple' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'emerald' },
];

const colorMap = {
  emerald: 'bg-emerald-500 border-emerald-400 text-emerald-600 bg-emerald-50',
  blue: 'bg-blue-500 border-blue-400 text-blue-600 bg-blue-50',
  amber: 'bg-amber-500 border-amber-400 text-amber-600 bg-amber-50',
  purple: 'bg-purple-500 border-purple-400 text-purple-600 bg-purple-50',
};

const ClinicStatusDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const clinic = user?.clinic || {};
  const plan = clinic?.subscription?.planId;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getActiveStep = () => {
    if (clinic.approvalStatus === 'approved') return 4;
    if (clinic.rejectionReason) return 2;
    return 1;
  };

  const activeStep = getActiveStep();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-slate-800 text-lg tracking-tight">AI-CMS</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {/* Hero Status Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 mb-8 text-white shadow-xl shadow-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-semibold uppercase tracking-widest mb-1">Registration Status</p>
              <h1 className="text-3xl font-black mb-2">Pending Approval</h1>
              <p className="text-blue-100 text-sm leading-relaxed max-w-lg">
                Your clinic registration has been submitted successfully. Our team is reviewing your application.
                You'll be notified once a decision is made.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Info Cards */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Clinic Name</p>
            <p className="text-slate-800 font-bold text-lg">{clinic.name || '—'}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Selected Plan</p>
            <p className="text-slate-800 font-bold text-lg">{plan?.name || '—'}</p>
            <p className="text-slate-400 text-xs mt-1 capitalize">{clinic?.subscription?.billingCycle} billing</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Current Status</p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3" /> Pending Approval
            </span>
          </div>
        </div>

        {/* Approval Progress Timeline */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
          <h2 className="text-xl font-black text-slate-800 mb-8">Approval Progress</h2>
          <div className="relative">
            {TIMELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < activeStep;
              const isActive = idx === activeStep;
              const colors = colorMap[step.color];
              return (
                <div key={step.key} className="flex gap-5 mb-8 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all ${
                      isDone
                        ? `bg-emerald-500 border-emerald-500 text-white`
                        : isActive
                          ? `bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-110`
                          : 'bg-slate-50 border-slate-200 text-slate-300'
                    }`}>
                      {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <div className={`w-0.5 h-10 mt-1 ${isDone ? 'bg-emerald-400' : 'bg-slate-100'}`} />
                    )}
                  </div>
                  <div className={`pt-1.5 ${isActive ? 'opacity-100' : isDone ? 'opacity-70' : 'opacity-40'}`}>
                    <p className={`font-bold text-sm ${isActive ? 'text-blue-700' : isDone ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {step.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-slate-400 mt-0.5">Currently processing your application</p>
                    )}
                    {isDone && (
                      <p className="text-xs text-emerald-500 mt-0.5">Completed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Super Admin Remarks */}
        {clinic.rejectionComments && (
          <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 mb-8">
            <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Remarks from Review Team
            </h3>
            <p className="text-amber-700 text-sm leading-relaxed">{clinic.rejectionComments}</p>
          </div>
        )}

        <p className="text-center text-slate-400 text-sm">
          Have questions? Contact <span className="text-blue-600 font-semibold">support@ai-cms.in</span>
        </p>
      </main>
    </div>
  );
};

export default ClinicStatusDashboard;
