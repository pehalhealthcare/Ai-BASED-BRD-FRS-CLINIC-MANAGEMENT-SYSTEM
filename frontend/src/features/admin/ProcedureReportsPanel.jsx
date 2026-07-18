import { useEffect, useState } from 'react';
import { CreditCard, ArrowUpRight, DollarSign, Clock, RefreshCw, XCircle, RotateCcw } from 'lucide-react';
import { procedureApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function ProcedureReportsPanel() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await procedureApi.getReports();
      setReports(res.reports || res.data?.reports || null);
    } catch (err) {
      toast.error('Failed to load procedure reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <RefreshCw className="animate-spin mr-2" size={18} />
        <span className="text-xs font-bold">Loading procedure analytics...</span>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-xs italic">
        No report data available.
      </div>
    );
  }

  // Convert revenue by procedure dictionary to list
  const revenueList = Object.entries(reports.revenueByProcedure || {}).map(([name, amount]) => ({
    name,
    amount
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">All-Time</span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(reports.revenue)}</p>
          <p className="text-xs font-semibold text-slate-500">Procedure Revenue</p>
        </div>

        {/* Card 2: Refunds */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <RotateCcw size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(reports.refunds)}</p>
          <p className="text-xs font-semibold text-slate-500">Total Refunded</p>
        </div>

        {/* Card 3: Completion Duration */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{reports.averageCompletionTime} mins</p>
          <p className="text-xs font-semibold text-slate-500">Avg Completion Time</p>
        </div>

        {/* Card 4: Cancellation Rate */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <XCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{reports.cancellationRate}%</p>
          <p className="text-xs font-semibold text-slate-500">Cancellation Rate</p>
        </div>
      </div>

      {/* Main Grid: Revenue breakdown & State distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left side: Revenue by Procedure */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Revenue by Procedure Type</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Summary of financial earnings per clinical procedure type</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2.5 font-bold text-slate-400 uppercase text-left pr-4">Procedure Type</th>
                  <th className="pb-2.5 font-bold text-slate-400 uppercase text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {revenueList.length > 0 ? revenueList.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 font-semibold text-slate-700 pr-4">{row.name}</td>
                    <td className="py-3 font-extrabold text-slate-800 text-right">{fmt(row.amount)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="2" className="py-8 text-center text-slate-400 italic">No revenue statistics collected yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side: Procedure State Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Workflow State Volume</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Total counts of procedures per workflow status</p>
          </div>

          <div className="space-y-3.5">
            {[
              { label: 'Pending Payment', value: reports.pendingPayments, color: 'bg-amber-500' },
              { label: 'Paid & Ready to Perform', value: reports.paidProcedures, color: 'bg-teal-500' },
              { label: 'Completed', value: reports.completedProcedures, color: 'bg-indigo-500' }
            ].map((state) => (
              <div key={state.label} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${state.color}`} />
                    {state.label}
                  </span>
                  <span className="font-extrabold text-slate-800">{state.value}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${state.color}`} 
                    style={{ width: `${reports.pendingPayments + reports.paidProcedures + reports.completedProcedures > 0 
                      ? (state.value / (reports.pendingPayments + reports.paidProcedures + reports.completedProcedures)) * 100 
                      : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
