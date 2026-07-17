import React from 'react';
import useAuth from '../../hooks/useAuth';
import { AlertCircle, FileText, LogOut, ArrowRight } from 'lucide-react';

const DoctorCorrectionRequired = ({ onEditProfile }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-md">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-none font-bold">Correction Required</h1>
            <span className="text-[10px] text-slate-400 mt-1 block">Your profile needs details updated</span>
          </div>
        </div>
        <button onClick={logout} className="px-4 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      {/* Content panel */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center gap-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg space-y-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">Verification Rejected - Corrections Needed</h2>
            <p className="text-xs text-slate-400">The Clinic Admin has reviewed your submitted profile and requested corrections before approval.</p>
          </div>

          <div className="text-left p-5 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3">
            <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">Clinic Admin Remarks</span>
            <p className="text-xs text-slate-700 leading-relaxed font-semibold italic bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
              "{user?.reEditComments || 'Please review your uploaded certificates and ensure details are fully correct.'}"
            </p>
          </div>

          <button onClick={onEditProfile}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-100">
            Edit & Resubmit Profile <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default DoctorCorrectionRequired;
