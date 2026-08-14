import React from 'react';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const ProviderCard = ({ icon, name, subtitle, orders, revenue, status, pending, alerts, onClick }) => (
  <div
    onClick={onClick}
    className="bg-slate-50 border border-slate-100 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-slate-200 transition-all"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-lg shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-black text-slate-800">{name}</p>
          {subtitle && <p className="text-[9px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
        status === 'Open'
          ? 'bg-emerald-50 text-emerald-700'
          : status === 'Busy'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-slate-100 text-slate-500'
      }`}>
        {status}
      </span>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div>
        <p className="text-[16px] font-black text-slate-800">{orders}</p>
        <p className="text-[8px] text-slate-400 font-medium">Orders</p>
      </div>
      <div>
        <p className="text-[11px] font-black text-slate-800">{formatCurrency(revenue)}</p>
        <p className="text-[8px] text-slate-400 font-medium">Revenue</p>
      </div>
    </div>

    {(pending > 0 || alerts > 0) && (
      <div className="mt-2 flex gap-2 flex-wrap">
        {pending > 0 && (
          <span className="text-[8px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
            {pending} Pending
          </span>
        )}
        {alerts > 0 && (
          <span className="text-[8px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
            {alerts} Alerts
          </span>
        )}
      </div>
    )}
  </div>
);

const HealthcareProviders = ({ pharmacy, labs, loading }) => {
  const navigate = useNavigate();

  const pharmacyData = pharmacy || {};
  const labData = labs || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <h2 className="text-sm font-black text-slate-900">Healthcare Providers</h2>
        <button
          onClick={() => navigate('/admin/providers')}
          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <ProviderCard
            icon="💊"
            name="Pharmacy"
            subtitle="Indranagar Branch"
            orders={pharmacyData.totalDispensings || 0}
            revenue={pharmacyData.totalPharmacySales || 0}
            status={pharmacyData.totalDispensings > 0 ? 'Open' : 'Idle'}
            pending={0}
            alerts={pharmacyData.lowStockMedicines || 0}
            onClick={() => navigate('/pharmacy/medicines')}
          />
          <ProviderCard
            icon="🔬"
            name="Laboratory"
            subtitle="Indranagar Branch"
            orders={labData.totalOrders || 0}
            revenue={0}
            status={labData.totalOrders > 0 ? (labData.pendingOrders > 5 ? 'Busy' : 'Open') : 'Idle'}
            pending={labData.pendingOrders || 0}
            alerts={labData.abnormalReports || 0}
            onClick={() => navigate('/labs/orders')}
          />
        </div>
      )}
    </div>
  );
};

export default HealthcareProviders;
