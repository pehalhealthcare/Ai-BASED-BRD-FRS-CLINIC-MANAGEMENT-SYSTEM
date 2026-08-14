import React from 'react';
import SkeletonCard from './SkeletonCard';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const Sparkline = ({ color = '#3b82f6' }) => (
  <svg className="w-20 h-10 fill-none overflow-visible" viewBox="0 0 80 36">
    <defs>
      <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.15" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0 30 Q20 20 40 24 T80 8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const StatCard = ({ icon, iconBg, iconColor, label, value, badge, badgeColor, sub, sparkColor, children, loading }) => {
  if (loading) return <SkeletonCard height="h-36" />;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center text-sm`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-end justify-between mt-1">
          <h3 className="text-2xl font-black text-slate-900 leading-none">{value}</h3>
          {sparkColor && <Sparkline color={sparkColor} />}
        </div>
        {sub && <div className="mt-1.5">{sub}</div>}
        {children}
      </div>
    </div>
  );
};

const SubStats = ({ items }) => (
  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
    {items.map(({ label, value, color = 'text-slate-500' }) => (
      <span key={label} className={`text-[9px] font-bold ${color}`}>
        {label}: <span className="font-black text-slate-700">{value}</span>
      </span>
    ))}
  </div>
);

const StatCards = ({ overview, revenue, loading }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = !overview || overview.isToday;

  const cards = overview?.cards || {};
  const apptSummary = overview?.appointmentSummary || {};

  const revenueData = revenue || {};
  const consultationRevenue = revenueData.invoiceRevenue || 0;
  const pharmacyRevenue = revenueData.pharmacyRevenue || 0;
  const totalRevenue = cards.amountReceived || revenueData.paidAmount || 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Today's Appointments */}
      <StatCard
        loading={loading}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
          </svg>
        }
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        label="Today's Appointments"
        value={cards.todayAppointments ?? 0}
        badge={isToday ? 'Live' : 'Historical'}
        badgeColor="text-blue-600 bg-blue-50"
      >
        <SubStats items={[
          { label: 'Booked', value: apptSummary.pending ?? 0, color: 'text-blue-500' },
          { label: 'Checked-In', value: apptSummary.confirmed ?? 0, color: 'text-emerald-600' },
          { label: 'Completed', value: apptSummary.completed ?? 0, color: 'text-slate-500' },
          { label: 'Rescheduled', value: 0 },
          { label: 'Walk-In', value: apptSummary.walkIns ?? 0 },
          { label: 'Online', value: 0 },
          { label: 'Offline', value: (cards.todayAppointments ?? 0) - (apptSummary.walkIns ?? 0) },
        ]} />
      </StatCard>

      {/* Today's Patients */}
      <StatCard
        loading={loading}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" strokeWidth="2" />
            <path strokeWidth="2" d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path strokeWidth="2" d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        label="Today's Patients"
        value={cards.todayAppointments ?? 0}
        badge="Scope"
        badgeColor="text-violet-600 bg-violet-50"
        sparkColor="#7c3aed"
      >
        <SubStats items={[
          { label: 'Walk-In', value: apptSummary.walkIns ?? 0 },
          { label: 'Online', value: 0 },
          { label: 'Offline', value: (cards.todayAppointments ?? 0) - (apptSummary.walkIns ?? 0) },
        ]} />
      </StatCard>

      {/* Today's Revenue */}
      <StatCard
        loading={loading}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="12" y1="1" x2="12" y2="23" strokeWidth="2" strokeLinecap="round" />
            <path strokeWidth="2" d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        }
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        label="Today's Revenue"
        value={formatCurrency(totalRevenue)}
        badge="Received"
        badgeColor="text-emerald-600 bg-emerald-50"
        sparkColor="#059669"
      >
        <SubStats items={[
          { label: 'Consultation', value: formatCurrency(consultationRevenue), color: 'text-emerald-600' },
          { label: 'Pharmacy', value: formatCurrency(pharmacyRevenue) },
          { label: 'Lab Tests', value: '₹0' },
          { label: 'Others', value: '₹0' },
        ]} />
      </StatCard>

      {/* Today's Expenses */}
      <StatCard
        loading={loading}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        }
        iconBg="bg-orange-50"
        iconColor="text-orange-600"
        label="Today's Expenses"
        value={formatCurrency(0)}
        badge="Tracked"
        badgeColor="text-orange-600 bg-orange-50"
        sparkColor="#f59e0b"
      >
        <SubStats items={[
          { label: 'Salary', value: '₹0' },
          { label: 'Medicines', value: '₹0' },
          { label: 'Others', value: '₹0' },
        ]} />
      </StatCard>

      {/* Pending Bills */}
      <StatCard
        loading={loading}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" strokeWidth="2" />
            <line x1="16" y1="13" x2="8" y2="13" strokeWidth="2" strokeLinecap="round" />
            <line x1="16" y1="17" x2="8" y2="17" strokeWidth="2" strokeLinecap="round" />
          </svg>
        }
        iconBg="bg-rose-50"
        iconColor="text-rose-600"
        label="Pending Bills"
        value={cards.pendingInvoices ?? 0}
        badge="Unpaid"
        badgeColor="text-rose-600 bg-rose-50"
      >
        <SubStats items={[
          { label: 'Invoices', value: cards.pendingInvoices ?? 0, color: 'text-rose-500' },
          { label: 'Amount', value: formatCurrency(cards.pendingInvoicesAmount ?? 0) },
        ]} />
      </StatCard>
    </div>
  );
};

export default StatCards;
