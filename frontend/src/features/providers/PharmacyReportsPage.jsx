import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Filter, Download, DollarSign, ShoppingCart, Package,
  TrendingUp, Percent, AlertTriangle, ChevronRight, RefreshCw, Layers, Clock, ShieldAlert,
  CheckCircle2, FileText, Settings, BarChart3, HelpCircle, FileSpreadsheet, Eye, Printer
} from 'lucide-react';
import { providersApi, pharmacyApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function PharmacyReportsPage() {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [timeframe, setTimeframe] = useState('Daily');

  const [reportsData, setReportsData] = useState({
    kpis: {
      totalRevenue: 0,
      totalOrders: 0,
      medicinesSold: 0,
      averageOrderValue: 0,
      grossProfit: 0,
      grossProfitMargin: 0,
      inventoryValue: 0,
      expiredValue: 0
    },
    topSelling: [],
    revenueTrend: [],
    orderType: { prescription: 0, walkin: 0, online: 0, refill: 0 },
    paymentStatus: { paid: 0, pending: 0, cancelled: 0 }
  });

  const loadProvider = useCallback(async () => {
    try {
      const res = await providersApi.getProvider(providerId);
      setProvider(res?.data ?? res ?? null);
    } catch {
      toast.error('Failed to load pharmacy details');
    }
  }, [providerId]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getReports({ providerId });
      setReportsData(res?.data ?? res ?? reportsData);
    } catch {
      toast.error('Failed to load pharmacy analytics data');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (!provider) return null;

  const kpis = reportsData.kpis;

  // Simple SVG helper to draw trend line
  const points = reportsData.revenueTrend.map((t, idx) => `${idx * 40 + 20},${100 - Math.min(100, (t.revenue / (kpis.totalRevenue || 1)) * 100)}`).join(' ');

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50/50">

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/providers')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Providers
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacy Reports</h1>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg uppercase">
              {provider.status || 'Active'}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {provider.name} | ID: {provider.globalId || 'PHR-000001'} | {provider.branchName || 'Main Branch'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>01 May 2024 - 24 May 2024</span>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button
            onClick={() => toast.success('Exporting report as PDF...')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition shadow-lg shadow-blue-200"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: 'Total Revenue', val: `₹${(kpis.totalRevenue || 0).toLocaleString('en-IN')}`, icon: DollarSign, bg: 'bg-emerald-100 text-emerald-650', change: '↑ 18.6%' },
          { label: 'Total Orders', val: kpis.totalOrders, icon: ShoppingCart, bg: 'bg-blue-105 text-blue-700', change: '↑ 15.3%' },
          { label: 'Total Medicines Sold', val: kpis.medicinesSold, icon: Package, bg: 'bg-rose-100 text-rose-650', change: '↑ 22.1%' },
          { label: 'Average Order Value', val: `₹${(kpis.averageOrderValue || 0).toLocaleString('en-IN')}`, icon: TrendingUp, bg: 'bg-purple-100 text-purple-650', change: '↑ 8.8%' },
          { label: 'Gross Profit', val: `₹${(kpis.grossProfit || 0).toLocaleString('en-IN')}`, icon: DollarSign, bg: 'bg-orange-105 text-orange-655', change: '↑ 16.4%' },
          { label: 'Gross Profit Margin', val: `${kpis.grossProfitMargin || 0}%`, icon: Percent, bg: 'bg-teal-100 text-teal-650', change: '↑ 2.7%' }
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-1 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{card.change}</span>
              </div>
              <p className="text-xl font-black text-slate-850 mt-2">{card.val}</p>
              <p className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-transparent overflow-x-auto">
        {['Overview', 'Sales Reports', 'Inventory Reports', 'Purchase Reports', 'Profitability Reports', 'Patient Reports', 'Compliance Reports', 'Custom Reports'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 font-bold text-sm -mb-px border-b-2 whitespace-nowrap transition ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-655'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Workspace Area */}
      {loading ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-450">Generating reports and charts...</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* Main Analytics Segment */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Overview Charts Grid */}
            {activeTab === 'Overview' && (
              <>
                <div className="grid grid-cols-12 gap-6">
                  {/* Revenue Trend SVG Chart */}
                  <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Revenue Trend</h3>
                        <p className="text-2xl font-black text-slate-800 mt-1">₹{(kpis.totalRevenue || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <select
                        value={timeframe}
                        onChange={e => setTimeframe(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-650"
                      >
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                      </select>
                    </div>

                    <div className="h-48 w-full bg-slate-50/50 rounded-2xl border border-slate-100/50 relative overflow-hidden flex items-end p-2">
                      {reportsData.revenueTrend.length > 0 ? (
                        <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                          <polyline
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3"
                            points={points}
                          />
                        </svg>
                      ) : (
                        <div className="m-auto text-xs text-slate-400 font-semibold">Insufficient trend data.</div>
                      )}
                    </div>
                  </div>

                  {/* Sales by Order Type Donut */}
                  <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">Sales by Order Type</h3>
                    <div className="flex justify-center py-4">
                      <div className="relative w-28 h-28 border-8 border-slate-100 rounded-full flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-8 border-blue-500 border-t-transparent border-r-transparent rotate-45" />
                        <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-b-transparent border-l-transparent rotate-[135deg]" />
                        <div className="text-center">
                          <p className="text-base font-black text-slate-800">{kpis.totalOrders}</p>
                          <p className="text-[8px] text-slate-400 font-black uppercase">Orders</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs font-semibold">
                      <div className="flex justify-between items-center"><span className="text-slate-400">● Prescription</span> <span className="text-slate-700 font-black">{reportsData.orderType.prescription}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-400">● Walk-in</span> <span className="text-slate-700 font-black">{reportsData.orderType.walkin}</span></div>
                    </div>
                  </div>
                </div>

                {/* Top Selling & Payment Status */}
                <div className="grid grid-cols-12 gap-6">
                  {/* Top Selling Medicines */}
                  <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black text-slate-855 uppercase tracking-wider">Top Selling Medicines</h3>
                    <div className="space-y-3">
                      {reportsData.topSelling.length === 0 ? (
                        <div className="text-center py-10 text-xs font-bold text-slate-400">No top-selling medicines.</div>
                      ) : (
                        reportsData.topSelling.map((med, idx) => (
                          <div key={med.name} className="flex items-center justify-between py-2 border-b border-slate-55 last:border-0 text-xs">
                            <div>
                              <p className="font-black text-slate-800">{idx + 1}. {med.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{med.qty} sold</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-855">₹{med.revenue.toLocaleString()}</p>
                              <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">Profit: ₹{med.profit}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Payment Status Card */}
                  <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black text-slate-855 uppercase tracking-wider">Payment Status</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Paid Orders', val: reportsData.paymentStatus.paid, total: kpis.totalOrders, color: 'bg-emerald-500' },
                        { label: 'Pending Payments', val: reportsData.paymentStatus.pending, total: kpis.totalOrders, color: 'bg-amber-500' },
                        { label: 'Cancelled Orders', val: reportsData.paymentStatus.cancelled, total: kpis.totalOrders, color: 'bg-rose-500' }
                      ].map(bar => {
                        const pct = bar.total > 0 ? (bar.val / bar.total) * 100 : 0;
                        return (
                          <div key={bar.label} className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-505 font-bold">{bar.label}</span>
                              <span className="text-slate-855 font-black">{bar.val} ({Math.round(pct)}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${bar.color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Expiry Analysis */}
                <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-black text-slate-855 uppercase tracking-wider">Expiry Analysis</h3>
                  <div className="grid grid-cols-4 gap-4 text-center text-xs">
                    <div className="p-3 border border-slate-55 rounded-2xl bg-slate-50/50">
                      <p className="text-slate-405 font-bold">Total Inventory Value</p>
                      <p className="text-lg font-black text-slate-855 mt-1">₹{(kpis.inventoryValue || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3 border border-slate-55 rounded-2xl bg-rose-50/30">
                      <p className="text-rose-650 font-bold">Expired Inventory Value</p>
                      <p className="text-lg font-black text-rose-600 mt-1">₹{(kpis.expiredValue || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Other reports fallback */}
            {activeTab !== 'Overview' && (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm space-y-4">
                <FileText className="w-12 h-12 text-slate-200 mx-auto" />
                <div>
                  <h3 className="text-sm font-black text-slate-700">{activeTab} Generated</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Your analytical report details have been compiled. Download or print the report to view the full tables.
                  </p>
                </div>
                <button
                  onClick={() => toast.success(`Exporting ${activeTab} as Excel spreadsheet...`)}
                  className="px-5 py-2.5 bg-blue-655 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition inline-flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Download Dataset
                </button>
              </div>
            )}

          </div>

          {/* Right Sidebar: Quick Reports & Timelines */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Quick Reports List */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-black text-slate-805 uppercase tracking-wider">Quick Reports</h4>
              <div className="space-y-2.5 text-xs font-bold text-slate-655">
                {[
                  'Daily Sales Report',
                  'Monthly Sales Report',
                  'Medicine Sales Report',
                  'Purchase Report',
                  'Inventory Summary',
                  'Expiry Report',
                  'Low Stock Report',
                  'Profit & Loss Report',
                  'GST Report',
                  'Tax Summary Report'
                ].map(rpt => (
                  <button
                    key={rpt}
                    onClick={() => toast.success(`Generating ${rpt}...`)}
                    className="w-full flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:text-blue-600 transition"
                  >
                    <span>{rpt}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity Events */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-black text-slate-805 uppercase tracking-wider">Recent Activity</h4>
              <div className="space-y-3.5 text-[11px] font-bold text-slate-600">
                <div className="flex gap-2">
                  <span className="text-emerald-500">●</span>
                  <div>
                    <p className="text-slate-800">Sales report generated</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">10:30 AM</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-500">●</span>
                  <div>
                    <p className="text-slate-800">Purchase report generated</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">10:20 AM</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
