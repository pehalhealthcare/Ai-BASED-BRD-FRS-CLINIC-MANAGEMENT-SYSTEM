import React from 'react';

const ROLE_LABELS = {
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Staff',
  nurse: 'Nurses',
  manager: 'Managers',
  billing_staff: 'Billing Staff',
  'pharmacy store operator': 'Pharmacy Operator',
  'laboratory operator': 'Lab Operator',
  'imaging operator': 'Imaging Operator',
  'physiotherapy operator': 'Physiotherapy Operator',
  'ambulance coordinator': 'Ambulance Coordinator',
  'home care operator': 'Home Care Operator'
};

const ROLE_COLORS = {
  receptionist: 'bg-blue-500',
  pharmacist: 'bg-emerald-500',
  lab_technician: 'bg-violet-500',
  nurse: 'bg-rose-500',
  manager: 'bg-amber-500',
  billing_staff: 'bg-teal-500',
  'pharmacy store operator': 'bg-pink-500',
  'laboratory operator': 'bg-indigo-500',
  'imaging operator': 'bg-cyan-500',
  'physiotherapy operator': 'bg-orange-500',
  'ambulance coordinator': 'bg-sky-500',
  'home care operator': 'bg-purple-500'
};

const DonutChart = ({ total, present, onLeave, busy, onBreak }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total || 1;

  const presentPct = present / safeTotal;
  const busyPct = busy / safeTotal;
  const onBreakPct = onBreak / safeTotal;
  const onLeavePct = onLeave / safeTotal;

  const presentOffset = 0;
  const busyOffset = presentPct * circumference;
  const breakOffset = (presentPct + busyPct) * circumference;
  const leaveOffset = (presentPct + busyPct + onBreakPct) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        {presentPct > 0 && (
          <circle
            cx="45" cy="45" r={radius} fill="none"
            stroke="#10b981" strokeWidth="10"
            strokeDasharray={`${presentPct * circumference} ${circumference}`}
            strokeDashoffset={-presentOffset}
            strokeLinecap="round"
            transform="rotate(-90 45 45)"
          />
        )}
        {busyPct > 0 && (
          <circle
            cx="45" cy="45" r={radius} fill="none"
            stroke="#f59e0b" strokeWidth="10"
            strokeDasharray={`${busyPct * circumference} ${circumference}`}
            strokeDashoffset={-(busyOffset)}
            transform="rotate(-90 45 45)"
          />
        )}
        {onBreakPct > 0 && (
          <circle
            cx="45" cy="45" r={radius} fill="none"
            stroke="#94a3b8" strokeWidth="10"
            strokeDasharray={`${onBreakPct * circumference} ${circumference}`}
            strokeDashoffset={-(breakOffset)}
            transform="rotate(-90 45 45)"
          />
        )}
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-black text-slate-900 leading-none">{total}</p>
        <p className="text-[8px] text-slate-400 font-medium">Total Staff</p>
      </div>
    </div>
  );
};

const StaffOverview = ({ staff, loading, fetchNextPage, hasNextPage, isFetchingNextPage }) => {
  const data = staff || {};
  const scrollRef = React.useRef(null);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const getStaffInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 shrink-0">
        <h2 className="text-sm font-black text-slate-900">Staff Overview</h2>
        <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
          Total: {data.totalStaff || 0}
        </span>
      </div>

      {loading && !data.staffList ? (
        <div className="p-4 space-y-3 animate-pulse flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl" />
          ))}
        </div>
      ) : !data.staffList || data.staffList.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
          <p className="text-xs font-bold text-slate-500">No staff members active</p>
        </div>
      ) : (
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 p-4 overflow-y-auto space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {data.staffList.map((member) => {
            const isOnline = member.status === 'Working';
            const lastSeenTime = member.lastSeen ? new Date(member.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
            const lastSeenDate = member.lastSeen ? new Date(member.lastSeen).toLocaleDateString([], { day: 'numeric', month: 'short' }) : null;
            
            return (
              <div key={String(member.userId)} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  {member.profilePhoto ? (
                    <img src={member.profilePhoto} alt={member.fullName} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-black">
                      {getStaffInitials(member.fullName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-800 truncate">{member.fullName}</p>
                    <p className="text-[9px] text-slate-400 capitalize truncate leading-none mt-0.5">
                      {ROLE_LABELS[member.role?.toLowerCase()] || member.role} {member.branch ? `• ${member.branch}` : ''}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-0.5">
                      {isOnline ? 'Active: In Dashboard' : (member.lastSeen ? `Last Seen: ${lastSeenDate} ${lastSeenTime}` : 'Offline')}
                    </p>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            );
          })}
          {isFetchingNextPage && (
            <div className="text-center py-2 shrink-0">
              <span className="text-[8px] font-black text-slate-400 animate-pulse uppercase">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffOverview;
