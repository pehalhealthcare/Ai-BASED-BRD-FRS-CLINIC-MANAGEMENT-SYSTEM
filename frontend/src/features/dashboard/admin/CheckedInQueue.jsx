import React from 'react';
import { useNavigate } from 'react-router-dom';
import SkeletonCard from './SkeletonCard';

const WaitTimeBadge = ({ minutes }) => {
  const color = minutes > 30
    ? 'text-red-600 bg-red-50'
    : minutes > 15
    ? 'text-amber-600 bg-amber-50'
    : 'text-emerald-600 bg-emerald-50';

  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      {minutes} min
    </span>
  );
};

const CheckedInQueue = ({ queue, loading }) => {
  const navigate = useNavigate();

  const visibleQueue = (queue || []).slice(0, 8);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-slate-900">Checked-In Patients</h2>
          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Queue
          </span>
        </div>
        <button
          onClick={() => navigate('/appointments?status=checked_in')}
          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visibleQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-500">No patients checked in</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Queue is empty right now</p>
        </div>
      ) : (
        <>
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-slate-50 bg-slate-50/50">
            {['Token', 'Patient', 'Doctor', 'Wait Time'].map(h => (
              <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-slate-50">
            {visibleQueue.map((item) => (
              <div key={item.appointmentId} className="grid grid-cols-4 gap-2 px-4 py-3 hover:bg-slate-50/50 transition-colors items-center">
                <span className="text-[11px] font-black text-blue-600 font-mono">
                  {item.tokenNumber}
                </span>
                <div>
                  <p className="text-[10px] font-bold text-slate-800 leading-none">
                    {item.patient?.fullName || '—'}
                  </p>
                  {item.branch && (
                    <p className="text-[9px] text-slate-400 mt-0.5">{item.branch}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-700 leading-none">
                    Dr. {item.doctor?.fullName || '—'}
                  </p>
                </div>
                <WaitTimeBadge minutes={item.waitMinutes || 0} />
              </div>
            ))}
          </div>

          {queue.length > 8 && (
            <div className="px-5 py-3 border-t border-slate-50">
              <button
                onClick={() => navigate('/appointments?status=checked_in')}
                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Full Queue →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CheckedInQueue;
