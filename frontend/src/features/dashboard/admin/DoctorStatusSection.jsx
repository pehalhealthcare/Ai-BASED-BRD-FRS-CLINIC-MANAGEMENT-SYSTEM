import React from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  'Available': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Available' },
  'In Consultation': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500 animate-pulse', label: 'In Consultation' },
  'On Leave': { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'On Leave' },
  'Break': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Break' },
  'Busy': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'Busy' },
  'Unavailable': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500', label: 'Unavailable' },
};

const DoctorAvatar = ({ name, photo, size = 'w-12 h-12' }) => {
  if (photo) {
    return (
      <img src={photo} alt={name} className={`${size} rounded-xl object-cover`} />
    );
  }
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
  const color = colors[name?.charCodeAt(0) % colors.length] || 'bg-blue-500';
  return (
    <div className={`${size} ${color} rounded-xl flex items-center justify-center text-white font-black text-sm`}>
      {initials}
    </div>
  );
};

const UtilizationBar = ({ value }) => {
  const color = value >= 80 ? 'bg-rose-500' : value >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-slate-400 font-medium">Utilization</span>
        <span className="text-[9px] font-black text-slate-600">{value}%</span>
      </div>
      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

const DoctorCard = ({ doctor }) => {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[doctor.currentStatus] || STATUS_CONFIG['Available'];
  const isConsulting = doctor.currentStatus === 'In Consultation';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 min-w-[220px] max-w-[240px] shadow-sm hover:shadow-md transition-shadow">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
        {isConsulting && (
          <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            In Consultation
          </span>
        )}
      </div>

      {/* Doctor info */}
      <div className="flex items-center gap-3">
        <DoctorAvatar name={doctor.fullName} photo={doctor.profilePhoto} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-black text-slate-900 truncate">
            Dr. {doctor.fullName}
          </p>
          <p className="text-[10px] text-slate-500 truncate">{doctor.specialization || 'General Medicine'}</p>
          {doctor.branch && (
            <p className="text-[9px] text-slate-400 truncate">{doctor.branch} Branch</p>
          )}
        </div>
      </div>

      {/* Current patient */}
      <div className="bg-slate-50 rounded-xl p-2.5">
        {isConsulting && doctor.currentPatient ? (
          <>
            <p className="text-[9px] text-slate-400 font-medium mb-1">Currently Seeing</p>
            <p className="text-[10px] font-bold text-slate-800">{doctor.currentPatient.fullName}</p>
            {doctor.currentToken && (
              <p className="text-[9px] font-black text-violet-600 mt-0.5">Token: {doctor.currentToken}</p>
            )}
            {doctor.consultDurationMinutes != null && (
              <p className="text-[9px] text-slate-400 mt-0.5">
                {doctor.consultDurationMinutes} min in consultation
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-[9px] text-slate-400 font-medium">Current Token</p>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">— No Active Consultation</p>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50/50 rounded-xl p-2 text-center">
          <p className="text-[14px] font-black text-blue-600">{doctor.todayCompleted}</p>
          <p className="text-[8px] text-slate-400 font-medium">Today's Patients</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2 text-center">
          <p className="text-[14px] font-black text-slate-600">{doctor.todayAppointments}</p>
          <p className="text-[8px] text-slate-400 font-medium">Appointments</p>
        </div>
      </div>

      <UtilizationBar value={doctor.utilization || 0} />
    </div>
  );
};

const DoctorStatusSection = ({ doctors, loading, fetchNextPage, hasNextPage, isFetchingNextPage }) => {
  const navigate = useNavigate();
  const scrollRef = React.useRef(null);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollWidth - el.scrollLeft <= el.clientWidth + 50) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <h2 className="text-sm font-black text-slate-900">Doctor Status Overview</h2>
        <button
          onClick={() => navigate('/admin/my-doctors-dashboard')}
          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="flex gap-4 p-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[220px] h-64 bg-slate-100 rounded-2xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      ) : !doctors || doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-500">No doctors available</p>
          <p className="text-[10px] text-slate-400 mt-0.5">No doctors are configured for this clinic</p>
        </div>
      ) : (
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 p-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {doctors.map((doctor) => (
            <div key={String(doctor.doctorId)} className="flex-shrink-0">
              <DoctorCard doctor={doctor} />
            </div>
          ))}
          {isFetchingNextPage && (
            <div className="min-w-[220px] h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-black text-slate-400 animate-pulse uppercase">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorStatusSection;
