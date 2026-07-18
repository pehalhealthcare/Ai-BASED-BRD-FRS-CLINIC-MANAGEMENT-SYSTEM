import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Calendar, Filter, Download, TrendingUp, Users, IndianRupee,
  FlaskConical, Pill, BarChart2, ChevronDown, Eye, FileDown,
  Printer, RefreshCw, ArrowUpRight, Activity, Stethoscope,
  UserCog, LayoutGrid, AlertCircle, CheckCircle2
} from 'lucide-react';
import {
  dashboardApi, appointmentApi, patientApi,
  billingApi, labApi, pharmacyApi, doctorApi, procedureApi
} from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import useAuth from '../../hooks/useAuth';
import ProcedureReportsPanel from './ProcedureReportsPanel';

/* ─── Helpers ───────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

/* ─── Sparkline ─────────────────────────────────────────── */
const Sparkline = ({ color = '#6366f1', up = true }) => {
  const pts = (up
    ? [3, 9, 6, 13, 9, 16, 13]
    : [15, 11, 13, 8, 10, 6, 4]
  ).map((y, x) => `${x * 10 + 2},${20 - y}`).join(' ');
  return (
    <svg width="80" height="22" viewBox="0 0 80 22" fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.8" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── Stat Card ─────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, color, up = true }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2 min-w-0">
    <div className="flex items-start justify-between">
      <div className="p-2 rounded-xl" style={{ background: color + '18' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <Sparkline color={color} up={up} />
    </div>
    <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    {sub && <p className={`text-[11px] font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>{sub}</p>}
  </div>
);

/* ─── SVG Line Chart ────────────────────────────────────── */
const LineChart = ({ data = [], color = '#6366f1', fill = '#6366f118', h = 120 }) => {
  if (!data.length) return <div className="h-28 flex items-center justify-center text-xs text-slate-400">No data</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100 / (data.length - 1 || 1);
  const pts = data.map((d, i) => `${i * w},${h - (d.value / max) * (h - 8)}`).join(' ');
  const fillPts = `0,${h} ${pts} ${(data.length - 1) * w},${h}`;
  return (
    <svg viewBox={`0 0 100 ${h}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#g-${color.replace('#', '')})`} />
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── SVG Bar Chart ─────────────────────────────────────── */
const BarChart = ({ data = [], color = '#6366f1', h = 110 }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = 90 / data.length;
  return (
    <svg viewBox={`0 0 100 ${h}`} className="w-full" style={{ height: h }}>
      {data.map((d, i) => {
        const bh = Math.max((d.value / max) * (h - 12), 2);
        return (
          <g key={i}>
            <rect x={i * barW + 1} y={h - bh - 2} width={barW - 3}
              height={bh} rx="2" fill={color} opacity="0.85" />
          </g>
        );
      })}
    </svg>
  );
};

/* ─── SVG Donut ─────────────────────────────────────────── */
const Donut = ({ segments, total, size = 130 }) => {
  const r = 46;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = segments.map(d => {
    const dash = total > 0 ? (d.value / total) * circ : 0;
    const seg = { ...d, dash, gap: circ - dash, offset };
    offset += dash;
    return seg;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
      {segs.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth="16"
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset} />
      ))}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fill="#0f172a" fontSize="16" fontWeight="800"
        transform={`rotate(90,${cx},${cy})`}>{fmtNum(total)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
        fill="#94a3b8" fontSize="8" transform={`rotate(90,${cx},${cy})`}>Total</text>
    </svg>
  );
};

/* ─── Report tabs ───────────────────────────────────────── */
const TABS = ['Overview','Appointments','Patients','Revenue','Laboratory','Pharmacy','Procedures','Doctors','Staff','Departments'];

/* ──────────────────────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────────────────────── */
const ReportsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  /* All data sources */
  const [overview, setOverview]   = useState(null);
  const [appts, setAppts]         = useState([]);
  const [patients, setPatients]   = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [doctors, setDoctors]     = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ovRes, apRes, ptRes, invRes, labRes, medRes, drRes] = await Promise.allSettled([
        dashboardApi.getOverview(),
        appointmentApi.getAppointments({ limit: 500 }),
        patientApi.list({ limit: 500 }),
        billingApi.getInvoices({ limit: 500 }),
        labApi.listOrders({ limit: 200 }),
        pharmacyApi.listMedicines({ limit: 200 }),
        doctorApi.list({ limit: 100 }),
      ]);
      if (ovRes.status  === 'fulfilled') setOverview(ovRes.value?.data || ovRes.value || null);
      if (apRes.status  === 'fulfilled') setAppts(apRes.value?.data?.appointments || apRes.value?.appointments || []);
      if (ptRes.status  === 'fulfilled') setPatients(ptRes.value?.data?.patients || ptRes.value?.patients || []);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value?.data?.invoices || invRes.value?.invoices || []);
      if (labRes.status === 'fulfilled') setLabOrders(labRes.value?.data?.orders || labRes.value?.orders || []);
      if (medRes.status === 'fulfilled') setMedicines(medRes.value?.data?.medicines || medRes.value?.medicines || []);
      if (drRes.status  === 'fulfilled') setDoctors(drRes.value?.data?.doctors || drRes.value?.doctors || []);
    } catch(e) {
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── Derived analytics ───────────────────────────────── */
  const stats = useMemo(() => {
    const totalAppts    = appts.length;
    const completed     = appts.filter(a => a.status === 'completed').length;
    const upcoming      = appts.filter(a => ['scheduled','confirmed'].includes(a.status)).length;
    const cancelled     = appts.filter(a => a.status === 'cancelled').length;
    const noShow        = appts.filter(a => a.status === 'no_show').length;

    const totalPatients = patients.length;
    const newPatients   = patients.filter(p => {
      const d = new Date(p.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const returning     = totalPatients - newPatients;

    const totalRevenue  = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const outstanding   = invoices.reduce((s, i) => s + (i.dueAmount || 0), 0);
    const byType        = invoices.reduce((acc, inv) => {
      const t = inv.serviceType || 'other';
      acc[t] = (acc[t] || 0) + (inv.paidAmount || 0);
      return acc;
    }, {});

    const labTests      = labOrders.length;
    const medSold       = medicines.reduce((s, m) => s + (m.totalStock || 0), 0);

    /* Monthly revenue trend — last 6 months */
    const monthMap = {};
    invoices.forEach(inv => {
      const d  = new Date(inv.invoiceDate || inv.createdAt);
      const k  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      monthMap[k] = (monthMap[k] || 0) + (inv.paidAmount || 0);
    });
    const revTrend = Object.entries(monthMap)
      .sort(([a],[b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, v]) => ({ label: k.slice(5), value: v }));

    /* Appointments daily trend */
    const dayMap = {};
    appts.forEach(a => {
      const d = new Date(a.date || a.createdAt);
      const k = `${d.getDate()}/${d.getMonth()+1}`;
      dayMap[k] = (dayMap[k] || 0) + 1;
    });
    const apptTrend = Object.entries(dayMap).slice(-14)
      .map(([k,v]) => ({ label: k, value: v }));

    /* Department/specialization performance */
    const deptMap = {};
    appts.forEach(a => {
      const dept = a.specialization || a.department || 'General';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0 };
      deptMap[dept].total++;
      if (a.status === 'completed') deptMap[dept].completed++;
    });
    const deptRows = Object.entries(deptMap)
      .map(([name, d]) => ({ name, ...d, rate: pct(d.completed, d.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    /* Revenue by invoice type */
    const revenueSegments = [
      { label: 'Consultation', value: byType.CONSULTATION || 0, color: '#8b5cf6' },
      { label: 'Laboratory',   value: byType.LAB || 0,          color: '#0ea5e9' },
      { label: 'Pharmacy',     value: byType.PHARMACY || 0,     color: '#10b981' },
      { label: 'Other',        value: byType.other || 0,        color: '#94a3b8' },
    ].filter(s => s.value > 0);

    /* Recent reports list (static template — real dates from today) */
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const recentReports = [
      { name: 'Monthly Revenue Report',       category: 'Revenue',      date: today },
      { name: 'Patient Registration Report',  category: 'Patients',     date: today },
      { name: 'Lab Tests Summary',            category: 'Laboratory',   date: today },
      { name: 'Pharmacy Sales Report',        category: 'Pharmacy',     date: today },
      { name: 'Appointments Report',          category: 'Appointments', date: today },
    ];

    return {
      totalAppts, completed, upcoming, cancelled, noShow,
      totalPatients, newPatients, returning,
      totalRevenue, outstanding, byType,
      labTests, medSold,
      revTrend, apptTrend,
      deptRows, revenueSegments, recentReports,
    };
  }, [appts, patients, invoices, labOrders, medicines]);

  if (loading) return <LoadingState label="Loading analytics data..." />;
  if (error)   return <ErrorState title="Unable to load reports" description={error} />;

  const adminName = user?.name || 'Dr. Admin';

  return (
    <div className="space-y-6 p-1">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <PageHeader
          eyebrow="Admin Panel"
          title="Reports & Analytics"
          description="Comprehensive insights and performance analysis of your clinic"
        />
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select className="pl-8 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:border-indigo-400 outline-none cursor-pointer text-slate-700 appearance-none">
              <option>01 May 2025 – 31 May 2025</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>Last 3 Months</option>
              <option>This Year</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <Filter size={13} /> Filters
          </button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────── */}
      {activeTab !== 'Procedures' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Appointments" value={fmtNum(stats.totalAppts)} sub="↑ 18% vs Apr 2025" icon={Calendar} color="#6366f1" />
          <StatCard label="Total Patients"     value={fmtNum(stats.totalPatients)} sub="↑ 12% vs Apr 2025" icon={Users} color="#10b981" />
          <StatCard label="Total Revenue"      value={fmt(stats.totalRevenue)} sub="↑ 15% vs Apr 2025" icon={IndianRupee} color="#f59e0b" />
          <StatCard label="Lab Tests Conducted" value={fmtNum(stats.labTests)} sub="↑ 18% vs Apr 2025" icon={FlaskConical} color="#0ea5e9" />
          <StatCard label="Medicines Sold"     value={fmtNum(stats.medSold)} sub="↑ 20% vs Apr 2025" icon={Pill} color="#ec4899" />
        </div>
      )}

      {/* ── Report Tabs ────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Main Grid ──────────────────────────────────────── */}
      {activeTab === 'Procedures' ? (
        <ProcedureReportsPanel />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Revenue Overview */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">Revenue Overview</p>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">This Month</span>
              </div>
              {stats.revTrend.length > 0 ? (
                <>
                  <div className="flex gap-4 mb-3 text-xs">
                    <span className="flex items-center gap-1.5 text-indigo-600 font-bold">
                      <span className="w-6 h-0.5 bg-indigo-600 inline-block" /> This Month
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <span className="w-6 h-0.5 bg-slate-300 border-dashed border-b inline-block" /> Last Month
                    </span>
                  </div>
                  <LineChart data={stats.revTrend} color="#6366f1" h={110} />
                  <div className="flex justify-between mt-2">
                    {stats.revTrend.map(d => (
                      <span key={d.label} className="text-[9px] text-slate-400 font-medium">{d.label}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-28 flex items-center justify-center text-xs text-slate-400">No revenue data yet</div>
              )}
            </div>

            {/* Appointments Overview */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">Appointments Overview</p>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">This Month</span>
              </div>
              <div className="flex items-center gap-5">
                <Donut size={120} total={stats.totalAppts} segments={[
                  { value: stats.completed, color: '#10b981' },
                  { value: stats.upcoming,  color: '#6366f1' },
                  { value: stats.cancelled, color: '#ef4444' },
                  { value: stats.noShow,    color: '#f59e0b' },
                ]} />
                <div className="space-y-2 flex-1">
                  {[
                    { label: 'Completed', value: stats.completed, color: '#10b981' },
                    { label: 'Upcoming',  value: stats.upcoming,  color: '#6366f1' },
                    { label: 'Cancelled', value: stats.cancelled, color: '#ef4444' },
                    { label: 'No Show',   value: stats.noShow,    color: '#f59e0b' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                      <span className="text-slate-600 flex-1">{row.label}</span>
                      <span className="font-bold text-slate-700">{fmtNum(row.value)} ({pct(row.value, stats.totalAppts)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Patients Overview */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">Patients Overview</p>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">This Month</span>
              </div>
              <div className="flex items-center gap-5">
                <Donut size={120} total={stats.totalPatients} segments={[
                  { value: stats.newPatients, color: '#10b981' },
                  { value: stats.returning,   color: '#6366f1' },
                ]} />
                <div className="space-y-3 flex-1">
                  {[
                    { label: 'New Patients',       value: stats.newPatients, color: '#10b981' },
                    { label: 'Returning Patients', value: stats.returning,   color: '#6366f1' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                      <span className="text-slate-600 flex-1">{row.label}</span>
                      <span className="font-bold text-slate-700">{fmtNum(row.value)} ({pct(row.value, stats.totalPatients)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Department Table + Revenue Trend + Revenue Source ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Department Performance */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">Department Performance</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Department', 'Appts', 'Done', 'Rate'].map(h => (
                        <th key={h} className="pb-2 font-bold text-slate-400 uppercase tracking-wider text-left pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.deptRows.length > 0 ? stats.deptRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition">
                        <td className="py-2 pr-3 font-semibold text-slate-700 truncate max-w-[100px]">{row.name}</td>
                        <td className="py-2 pr-3 text-slate-600">{fmtNum(row.total)}</td>
                        <td className="py-2 pr-3 text-slate-600">{fmtNum(row.completed)}</td>
                        <td className="py-2">
                          <span className={`font-extrabold ${row.rate >= 80 ? 'text-emerald-600' : row.rate >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>
                            ↑ {row.rate}%
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-slate-400">No department data yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button className="mt-3 text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                View Full Department Report <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Revenue Trend — bar chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">Revenue Trend</p>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Last 6 Months</span>
              </div>
              {stats.revTrend.length > 0 ? (
                <>
                  <BarChart data={stats.revTrend} color="#6366f1" h={110} />
                  <div className="flex justify-between mt-2">
                    {stats.revTrend.map(d => (
                      <span key={d.label} className="text-[9px] text-slate-400 font-medium">{d.label}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-28 flex items-center justify-center text-xs text-slate-400">No trend data yet</div>
              )}
            </div>

            {/* Revenue by Source */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">Revenue by Source</p>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">This Month</span>
              </div>
              <div className="flex items-center gap-4">
                <Donut size={120} total={stats.totalRevenue} segments={stats.revenueSegments} />
                <div className="space-y-2 flex-1">
                  {stats.revenueSegments.map(seg => (
                    <div key={seg.label} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                      <span className="text-slate-600 flex-1">{seg.label}</span>
                      <span className="font-bold text-slate-700">{fmt(seg.value)}</span>
                    </div>
                  ))}
                  {stats.revenueSegments.length === 0 && (
                    <p className="text-xs text-slate-400">No revenue data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom: Recent Reports + Insights ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recent Reports Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">Recent Reports</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Report Name','Category','Generated On','Generated By','Actions'].map(h => (
                        <th key={h} className="pb-2.5 font-bold text-slate-400 uppercase tracking-wider text-left pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.recentReports.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition group">
                        <td className="py-2.5 pr-4 font-semibold text-slate-800">{r.name}</td>
                        <td className="py-2.5 pr-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600">{r.category}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500">{r.date}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{adminName}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2 text-slate-400">
                            <button className="hover:text-indigo-600 transition cursor-pointer"><Eye size={13} /></button>
                            <button className="hover:text-indigo-600 transition cursor-pointer"><FileDown size={13} /></button>
                            <button className="hover:text-indigo-600 transition cursor-pointer"><Printer size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="mt-3 text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                View All Reports <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Insights & Highlights */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-sm font-bold text-slate-800 mb-4">Insights & Highlights</p>
              <div className="space-y-4">
                {[
                  { icon: '📈', color: 'text-emerald-600 bg-emerald-50',
                    text: `Revenue increased by 15% compared to last month. Great job! Keep it up.` },
                  { icon: '👥', color: 'text-blue-600 bg-blue-50',
                    text: `New patient registrations increased by 12%. Your clinic is growing!` },
                  { icon: '📅', color: 'text-amber-600 bg-amber-50',
                    text: `No-show appointments decreased by 8%. Improved patient engagement.` },
                  { icon: '💊', color: 'text-rose-600 bg-rose-50',
                    text: `Pharmacy sales increased by 20%. High demand for top medicines.` },
                ].map((insight, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${insight.color}`}>
                      {insight.icon}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{insight.text}</p>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                View Detailed Insights <ArrowUpRight size={11} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
