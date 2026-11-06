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

const StaffOverview = ({ staff, loading, fetchNextPage, hasNextPage, isFetchingNextPage }) => {
  const data = staff || {};
  const staffList = data.staffList || [];
  const scrollRef = React.useRef(null);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 60) {
      if (hasNextPage && !isFetchingNextPage && fetchNextPage) {
        fetchNextPage();
      }
    }
  };

  const getStaffInitials = (name) => {
    return (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[390px]">
      {/* Fixed Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 shrink-0">
        <h2 className="text-sm font-black text-slate-900">Staff Overview</h2>
        <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
          Total: {data.totalStaff || staffList.length}
        </span>
      </div>

      {/* Content Area with Internal Vertical Scroll */}
      {loading && staffList.length === 0 ? (
        <div className="p-4 space-y-3 animate-pulse flex-1 min-h-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl" />
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-10 h-10 bg-slate-100/80 rounded-xl flex items-center justify-center text-slate-400 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-600">No staff members active</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Staff list is currently empty</p>
        </div>
      ) : (
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 p-4 overflow-y-auto space-y-2.5 dashboard-custom-scroll"
        >
          {staffList.map((member) => {
            const isOnline = member.status === 'Working';
            const lastSeenTime = member.lastSeen ? new Date(member.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
            const lastSeenDate = member.lastSeen ? new Date(member.lastSeen).toLocaleDateString([], { day: 'numeric', month: 'short' }) : null;
            
            return (
              <div
                key={String(member.userId || member._id || member.fullName)}
                className="flex items-center justify-between p-2.5 hover:bg-slate-50/80 rounded-xl transition-colors border border-slate-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {member.profilePhoto ? (
                    <img src={member.profilePhoto} alt={member.fullName} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0 border border-blue-100">
                      {getStaffInitials(member.fullName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{member.fullName}</p>
                    <p className="text-[9px] text-slate-400 capitalize truncate leading-none mt-0.5">
                      {ROLE_LABELS[member.role?.toLowerCase()] || member.role} {member.branch ? `• ${member.branch}` : ''}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-0.5">
                      {isOnline ? 'Active: In Dashboard' : (member.lastSeen ? `Last Seen: ${lastSeenDate} ${lastSeenTime}` : 'Offline')}
                    </p>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                  isOnline ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${isOnline ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            );
          })}
          {isFetchingNextPage && (
            <div className="text-center py-2 shrink-0">
              <span className="text-[8px] font-black text-slate-400 animate-pulse uppercase">Loading more staff...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffOverview;
