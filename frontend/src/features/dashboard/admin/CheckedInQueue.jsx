import React from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeDoctorName } from '../../../utils/doctorFormatters';

const WaitTimeBadge = ({ minutes }) => {
  const color = minutes > 30
    ? 'text-red-600 bg-red-50'
    : minutes > 15
    ? 'text-amber-600 bg-amber-50'
    : 'text-blue-600 bg-blue-50';

  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      {minutes} min
    </span>
  );
};

const CheckedInQueue = ({ queue, loading }) => {
  const navigate = useNavigate();
  const queueList = queue || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[460px]">
      {/* Fixed Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-slate-900">Checked-In Patients</h2>
          <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Live Queue ({queueList.length})
          </span>
        </div>
        <button
          onClick={() => navigate('/appointments?status=checked_in')}
          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-4 space-y-2.5 flex-1 min-h-0 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : queueList.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100/80 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-600">No patients checked in</p>
          <p className="text-[10px] text-slate-400 mt-1">Queue is empty right now</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto dashboard-custom-scroll">
          {/* Sticky Table Header */}
          <div className="sticky top-0 z-10 grid grid-cols-4 gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs">
            {['Token', 'Patient', 'Doctor', 'Wait Time'].map(h => (
              <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-slate-50">
            {queueList.map((item) => (
              <div
                key={item.appointmentId || item._id}
                className="grid grid-cols-4 gap-2 px-4 py-3 hover:bg-slate-50/60 transition-colors items-center"
              >
                <span className="text-[11px] font-black text-blue-600 font-mono">
                  {item.tokenNumber || '—'}
                </span>
                <div className="min-w-0 pr-1">
                  <p className="text-[10px] font-bold text-slate-800 leading-tight truncate">
                    {item.patient?.fullName || item.patientName || '—'}
                  </p>
                  {item.branch && (
                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">{item.branch}</p>
                  )}
                </div>
                <div className="min-w-0 pr-1">
                  <p className="text-[10px] font-semibold text-slate-700 leading-tight truncate">
                    {normalizeDoctorName(item.doctor?.fullName || item.doctorName, '—')}
                  </p>
                </div>
                <div>
                  <WaitTimeBadge minutes={item.waitMinutes || 0} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Footer */}
      {!loading && queueList.length > 0 && (
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/40 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">
            {queueList.length} {queueList.length === 1 ? 'patient' : 'patients'} in queue
          </span>
          <button
            onClick={() => navigate('/appointments?status=checked_in')}
            className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Full Queue →
          </button>
        </div>
      )}
    </div>
  );
};

export default CheckedInQueue;
