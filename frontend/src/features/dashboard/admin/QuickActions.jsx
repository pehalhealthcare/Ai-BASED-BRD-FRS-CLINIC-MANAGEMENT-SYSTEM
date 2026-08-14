import React from 'react';
import { useNavigate } from 'react-router-dom';

const QUICK_ACTIONS = [
  { icon: '📅', label: 'Book Appointment', action: '/appointments/new', color: 'bg-blue-50 hover:bg-blue-100' },
  { icon: '👤', label: 'Register Patient', action: '/patients/new', color: 'bg-emerald-50 hover:bg-emerald-100' },
  { icon: '🚶', label: 'Walk-in Patient', action: null, special: 'walkin', color: 'bg-violet-50 hover:bg-violet-100' },
  { icon: '💵', label: 'Create Invoice', action: '/billing', color: 'bg-amber-50 hover:bg-amber-100' },
  { icon: '🩺', label: 'Add Doctor', action: '/admin/my-doctors-dashboard', color: 'bg-blue-50 hover:bg-blue-100' },
  { icon: '👥', label: 'Add Staff', action: '/admin/my-receptionists-dashboard', color: 'bg-teal-50 hover:bg-teal-100' },
  { icon: '💊', label: 'Open Pharmacy', action: '/pharmacy/medicines', color: 'bg-rose-50 hover:bg-rose-100' },
  { icon: '🔬', label: 'Open Laboratory', action: '/labs/orders', color: 'bg-indigo-50 hover:bg-indigo-100' },
  { icon: '📊', label: "Today's Reports", action: '/admin/reports', color: 'bg-slate-50 hover:bg-slate-100' },
  { icon: '⚙️', label: 'Clinic Settings', action: '/clinic/settings', color: 'bg-slate-50 hover:bg-slate-100' },
  { icon: '📱', label: 'Send SMS', action: '/notifications/send', color: 'bg-orange-50 hover:bg-orange-100' },
  { icon: '📋', label: 'Create Notice', action: null, color: 'bg-yellow-50 hover:bg-yellow-100' },
];

const QuickActions = ({ onWalkIn }) => {
  const navigate = useNavigate();

  const handleAction = (action) => {
    if (!action) return;
    navigate(action);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50">
        <h2 className="text-sm font-black text-slate-900">Quick Actions</h2>
      </div>

      <div className="p-4 grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((item) => (
          <button
            key={item.label}
            onClick={() => item.special === 'walkin' ? onWalkIn?.() : handleAction(item.action)}
            title={item.label}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-transparent hover:border-slate-100 transition-all cursor-pointer group ${item.color}`}
          >
            <span className="text-lg group-hover:scale-110 transition-transform leading-none">{item.icon}</span>
            <span className="text-[8px] font-bold text-slate-600 text-center leading-tight">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
