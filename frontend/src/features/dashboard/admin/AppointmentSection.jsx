import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkeletonRow } from './SkeletonCard';

const STATUS_CONFIG = {
  booked: { label: 'Booked', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  confirmed: { label: 'Confirmed', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  checked_in: { label: 'Checked-In', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  waiting: { label: 'Waiting', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  in_consultation: { label: 'In Consultation', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  completed: { label: 'Completed', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  consultation_completed: { label: 'Completed', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  patient_cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  clinic_cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  rescheduled: { label: 'Rescheduled', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  no_show: { label: 'No Show', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  not_attended: { label: 'No Show', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
};

const PAYMENT_CONFIG = {
  paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  unpaid: { label: 'Unpaid', bg: 'bg-rose-50', text: 'text-rose-600' },
  partial: { label: 'Partial', bg: 'bg-amber-50', text: 'text-amber-700' },
  waived: { label: 'Waived', bg: 'bg-blue-50', text: 'text-blue-600' },
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'booked', label: 'Booked' },
  { key: 'checked_in', label: 'Checked-In' },
  { key: 'in_consultation', label: 'In Consultation' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rescheduled', label: 'Rescheduled' },
];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const PaymentBadge = ({ status }) => {
  const cfg = PAYMENT_CONFIG[status] || { label: status || 'N/A', bg: 'bg-slate-50', text: 'text-slate-500' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

const getToken = (appt) => {
  const { status, tokenNumber } = appt;
  const completedStatuses = ['completed', 'consultation_completed', 'in_consultation', 'checked_in', 'waiting'];
  const noTokenStatuses = ['booked', 'confirmed', 'cancelled', 'patient_cancelled', 'clinic_cancelled', 'rescheduled', 'no_show', 'not_attended'];

  if (noTokenStatuses.includes(status)) return '—';
  if (completedStatuses.includes(status) && tokenNumber) return tokenNumber;
  return '—';
};

const EmptyState = ({ activeTab }) => (
  <tr>
    <td colSpan={10} className="py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-600">No appointments found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeTab === 'all' ? 'No appointments booked for this date.' : `No ${activeTab.replace('_', ' ')} appointments.`}
          </p>
        </div>
      </div>
    </td>
  </tr>
);

const AppointmentSection = ({ appointments, loading, selectedDate, overview }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  const apptSummary = overview?.appointmentSummary || {};

  const tabCounts = {
    all: appointments.length,
    booked: appointments.filter(a => ['booked', 'confirmed'].includes(a.status)).length,
    checked_in: appointments.filter(a => a.status === 'checked_in').length,
    in_consultation: appointments.filter(a => a.status === 'in_consultation').length,
    completed: appointments.filter(a => ['completed', 'consultation_completed'].includes(a.status)).length,
    cancelled: appointments.filter(a => ['cancelled', 'patient_cancelled', 'clinic_cancelled'].includes(a.status)).length,
    rescheduled: appointments.filter(a => a.status === 'rescheduled').length,
  };

  const filteredAppts = activeTab === 'all'
    ? appointments
    : appointments.filter(a => {
        if (activeTab === 'booked') return ['booked', 'confirmed'].includes(a.status);
        if (activeTab === 'cancelled') return ['cancelled', 'patient_cancelled', 'clinic_cancelled'].includes(a.status);
        if (activeTab === 'completed') return ['completed', 'consultation_completed'].includes(a.status);
        return a.status === activeTab;
      });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <div>
          <h2 className="text-sm font-black text-slate-900">
            Today's Appointments
            <span className="text-xs text-slate-400 font-medium ml-2">
              ({new Date(`${selectedDate}T00:00:00.000Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
            </span>
          </h2>
        </div>
        <button
          onClick={() => navigate('/appointments')}
          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-50 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              activeTab === tab.key ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
            }`}>
              {tabCounts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-50">
              {['Time', 'Token', 'Patient', 'Doctor', 'Department', 'Branch', 'Type', 'Status', 'Payment', 'Action'].map(col => (
                <th key={col} className="text-left px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              : filteredAppts.length === 0
              ? <EmptyState activeTab={activeTab} />
              : filteredAppts.slice(0, 20).map(appt => (
                  <tr key={appt._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                      {appt.startTime || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black text-slate-500 font-mono">
                        {getToken(appt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-bold text-slate-800 leading-none">
                        {appt.patientId?.fullName || '—'}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {appt.patientId?.gender && `${appt.patientId.gender}`}
                        {appt.patientId?.age && ` / ${appt.patientId.age} Y`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-semibold text-slate-700">
                        Dr. {appt.doctorId?.fullName || appt.doctorName || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-500">
                      {appt.department || appt.doctorId?.specialization || '—'}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-500">
                      {appt.branch || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        appt.consultationMode === 'ONLINE' || appt.appointmentType === 'online'
                          ? 'bg-blue-50 text-blue-600'
                          : appt.appointmentType === 'walk_in'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-50 text-slate-600'
                      }`}>
                        {appt.consultationMode === 'ONLINE' || appt.appointmentType === 'online'
                          ? 'Online'
                          : appt.appointmentType === 'walk_in'
                          ? 'Walk-In'
                          : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={appt.paymentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/appointments/${appt._id}`)}
                        className="text-[9px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!loading && filteredAppts.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Showing {Math.min(filteredAppts.length, 20)} of {filteredAppts.length} appointments
          </p>
          <button
            onClick={() => navigate('/appointments')}
            className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            View All Appointments
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default AppointmentSection;
