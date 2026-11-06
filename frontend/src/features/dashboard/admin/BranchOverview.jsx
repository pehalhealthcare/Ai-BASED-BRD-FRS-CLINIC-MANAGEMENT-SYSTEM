import React from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  Healthy: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Busy: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Open: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Closed: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const BranchOverview = ({ branches = [], loading }) => {
  const navigate = useNavigate();
  const branchList = branches || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[390px]">
      {/* Fixed Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-slate-900">Branch Overview</h2>
          {branchList.length > 0 && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
              {branchList.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/admin/branches')}
          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      {/* Content Area with Internal Vertical Scroll */}
      {loading ? (
        <div className="p-4 space-y-3 flex-1 min-h-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : branchList.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-10 h-10 bg-slate-100/80 rounded-xl flex items-center justify-center text-slate-400 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-600">No branches configured</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Clinic currently operates as single branch</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto dashboard-custom-scroll">
          {/* Sticky Table Header */}
          <div className="sticky top-0 z-10 grid grid-cols-5 gap-2 px-4 py-2 bg-slate-50/95 backdrop-blur-xs border-b border-slate-100">
            {['Branch', 'Doctors', "Today", 'Revenue', 'Status'].map(h => (
              <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-slate-50">
            {branchList.map((branch) => {
              const statusCfg = STATUS_CONFIG[branch.status] || STATUS_CONFIG.Healthy;
              return (
                <div
                  key={String(branch.branchId || branch._id || branch.name)}
                  className="grid grid-cols-5 gap-2 px-4 py-3 hover:bg-slate-50/60 transition-colors items-center"
                >
                  <div className="min-w-0 pr-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{branch.name}</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{branch.doctors || 0}</span>
                  <span className="text-[11px] font-bold text-slate-700">{branch.todayPatients || 0}</span>
                  <span className="text-[10px] font-bold text-slate-700 truncate">{formatCurrency(branch.revenue)}</span>
                  <span className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full w-fit ${statusCfg.bg} ${statusCfg.text}`}>
                    <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
                    {branch.status || 'Active'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchOverview;
