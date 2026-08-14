import React from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  Healthy: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Busy: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Open: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Closed: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const BranchOverview = ({ branches, loading }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <h2 className="text-sm font-black text-slate-900">Branch Overview</h2>
        <button
          onClick={() => navigate('/admin/branches')}
          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !branches || branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-500">No branches configured</p>
        </div>
      ) : (
        <>
          {/* Header Row */}
          <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-slate-50/50 border-b border-slate-50">
            {['Branch', 'Doctors', "Today's Patients", 'Revenue', 'Status'].map(h => (
              <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-slate-50">
            {branches.map((branch) => {
              const statusCfg = STATUS_CONFIG[branch.status] || STATUS_CONFIG.Healthy;
              return (
                <div
                  key={String(branch.branchId)}
                  className="grid grid-cols-5 gap-2 px-4 py-3 hover:bg-slate-50/50 transition-colors items-center"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-800">{branch.name}</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{branch.doctors}</span>
                  <span className="text-[11px] font-bold text-slate-700">{branch.todayPatients}</span>
                  <span className="text-[11px] font-bold text-slate-700">{formatCurrency(branch.revenue)}</span>
                  <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full w-fit ${statusCfg.bg} ${statusCfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {branch.status}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default BranchOverview;
