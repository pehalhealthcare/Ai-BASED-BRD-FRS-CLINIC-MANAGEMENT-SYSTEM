import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Download, ChevronDown, RefreshCw,
  FileText, CheckCircle2, AlertCircle, XCircle, Clock,
  IndianRupee, TrendingUp, Receipt, Eye, Printer,
  MoreVertical, ArrowUpRight, Filter, CreditCard,
  Calendar, User, RotateCcw
} from 'lucide-react';
import { billingApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';

/* ─── Helpers ─────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtShortDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ─── Status configs ─────────────────────────────────── */
const PAYMENT_STATUS = {
  paid:      { label: 'Paid',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  partial:   { label: 'Partial',   cls: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Clock },
  unpaid:    { label: 'Unpaid',    cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: AlertCircle },
  refunded:  { label: 'Refunded',  cls: 'bg-purple-50 text-purple-700 border-purple-200',   icon: RotateCcw },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200',          icon: XCircle },
  PAID:      { label: 'Paid',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  PENDING:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: Clock },
  CANCELLED: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200',          icon: XCircle },
  REFUNDED:  { label: 'Refunded',  cls: 'bg-purple-50 text-purple-700 border-purple-200',   icon: RotateCcw },
};

const SERVICE_TYPE = {
  CONSULTATION: { label: 'Consultation', cls: 'bg-violet-50 text-violet-700' },
  LAB:          { label: 'Laboratory',   cls: 'bg-sky-50 text-sky-700' },
  PHARMACY:     { label: 'Pharmacy',     cls: 'bg-emerald-50 text-emerald-700' },
  other:        { label: 'Other',        cls: 'bg-slate-100 text-slate-600' },
};

/* ─── Sparkline ──────────────────────────────────────── */
const Sparkline = ({ color = '#10b981', up = true }) => {
  const pts = (up
    ? [4, 10, 7, 14, 9, 17, 13]
    : [16, 12, 14, 9, 11, 7, 5]
  ).map((y, x) => `${x * 10 + 2},${22 - y}`).join(' ');
  return (
    <svg width="72" height="24" viewBox="0 0 72 24" fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── Stat Card ──────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, color, up = true }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2 min-w-0">
    <div className="flex items-center justify-between">
      <div className="p-2 rounded-xl" style={{ background: color + '18' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <Sparkline color={color} up={up} />
    </div>
    <p className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{value}</p>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    {sub && <p className={`text-[11px] font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>{sub}</p>}
  </div>
);

/* ─── Revenue Donut (SVG) ──────────────────────────── */
const RevenueDonut = ({ segments, total }) => {
  const size = 130;
  const r = 48;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = segments.map(d => {
    const pct = total > 0 ? d.value / total : 0;
    const dash = pct * circ;
    const seg = { ...d, dash, gap: circ - dash, offset };
    offset += dash;
    return seg;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
      {segs.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth="18"
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset} strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fill="#0f172a" fontSize="14" fontWeight="800"
        transform={`rotate(90,${cx},${cy})`}>{fmt(total)}</text>
    </svg>
  );
};

/* ══════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════ */
const TABS = [
  { key: 'all',         label: 'Invoices' },
  { key: 'payments',    label: 'Payments' },
  { key: 'refunds',     label: 'Refunds' },
];

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const BillingAdminPage = () => {
  const navigate = useNavigate();

  /* ── Data ────────────────────────────────── */
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ── Filters ─────────────────────────────── */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  /* ── Load ────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [invoicesRes, summaryRes] = await Promise.allSettled([
        billingApi.getInvoices({ limit: 500 }),
        billingApi.getBillingSummary(),
      ]);

      if (invoicesRes.status === 'fulfilled') {
        setInvoices(invoicesRes.value?.data?.invoices || invoicesRes.value?.invoices || []);
      }
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value?.data || summaryRes.value || null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load billing data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Computed Stats ──────────────────────── */
  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => ['paid', 'PAID'].includes(i.paymentStatus)).length;
    const pending = invoices.filter(i => ['unpaid', 'partial', 'PENDING'].includes(i.paymentStatus)).length;
    const cancelled = invoices.filter(i => ['cancelled', 'CANCELLED'].includes(i.paymentStatus)).length;
    const totalRevenue = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const outstanding = invoices.reduce((s, i) => s + (i.dueAmount || 0), 0);
    const refunded = invoices.reduce((s, i) => s + (i.refundAmount || 0), 0);

    // Service type revenue breakdown
    const byType = invoices.reduce((acc, inv) => {
      const t = inv.serviceType || 'other';
      acc[t] = (acc[t] || 0) + (inv.paidAmount || 0);
      return acc;
    }, {});

    // Recent payments: invoices with paidAmount > 0, sorted by date
    const recentPayments = [...invoices]
      .filter(i => i.paidAmount > 0)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 6);

    return { total, paid, pending, cancelled, totalRevenue, outstanding, refunded, byType, recentPayments };
  }, [invoices]);

  /* ── Filtered Invoices ───────────────────── */
  const filtered = useMemo(() => {
    let list = [...invoices];

    if (activeTab === 'payments') {
      list = list.filter(i => i.paidAmount > 0);
    } else if (activeTab === 'refunds') {
      list = list.filter(i => ['refunded', 'REFUNDED'].includes(i.paymentStatus) || i.refundAmount > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.invoiceNumber?.toLowerCase().includes(q) ||
        (i.patientId?.name || i.patientId?.firstName)?.toLowerCase().includes(q) ||
        (i.patientId?.pid || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      list = list.filter(i => i.paymentStatus === statusFilter || i.invoiceStatus === statusFilter);
    }

    if (typeFilter) {
      list = list.filter(i => i.serviceType === typeFilter);
    }

    if (dateFrom) {
      list = list.filter(i => new Date(i.invoiceDate || i.createdAt) >= new Date(dateFrom));
    }

    if (dateTo) {
      list = list.filter(i => new Date(i.invoiceDate || i.createdAt) <= new Date(dateTo + 'T23:59:59'));
    }

    return list;
  }, [invoices, activeTab, search, statusFilter, typeFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, dateFrom, dateTo, activeTab]);

  /* ── Revenue by type segments ────────────── */
  const revenueSegments = useMemo(() => {
    const COLORS = { CONSULTATION: '#8b5cf6', LAB: '#0ea5e9', PHARMACY: '#10b981', other: '#94a3b8' };
    return Object.entries(stats.byType).map(([key, value]) => ({
      label: SERVICE_TYPE[key]?.label || key,
      value,
      color: COLORS[key] || '#94a3b8',
      pct: stats.totalRevenue > 0 ? Math.round(value / stats.totalRevenue * 100) : 0,
    }));
  }, [stats]);

  /* ─────────────────────────────────────────── */
  if (loading) return <LoadingState label="Loading billing data..." />;
  if (error) return <ErrorState title="Unable to load billing" description={error} />;

  const patientName = (inv) => {
    const p = inv.patientId;
    if (!p) return 'Unknown Patient';
    return p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient';
  };

  const invoiceTypeBadge = (inv) => {
    const t = inv.serviceType || 'other';
    const cfg = SERVICE_TYPE[t] || SERVICE_TYPE.other;
    return (
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  const statusBadge = (status) => {
    const cfg = PAYMENT_STATUS[status] || PAYMENT_STATUS.unpaid;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
        <Icon size={10} />
        {cfg.label}
      </span>
    );
  };

  /* ── Render ────────────────────────────────── */
  return (
    <div className="space-y-6 p-1">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <PageHeader
          eyebrow="Admin Panel"
          title="Billing & Invoices"
          description="Manage all clinic bills, invoices and payments"
        />
        <div className="flex items-center gap-3 shrink-0 mt-1 flex-wrap">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            Export Reports
          </button>
          <Link
            to="/billing/invoices/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Create New Invoice
          </Link>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-bold cursor-pointer transition border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Stats Row ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Invoices (This Month)" value={fmtNum(stats.total)} sub={`↑ 18% vs last month`} icon={Receipt} color="#6366f1" />
        <StatCard label="Paid Invoices" value={fmtNum(stats.paid)} sub={`↑ 22% vs last month`} icon={CheckCircle2} color="#10b981" />
        <StatCard label="Pending Invoices" value={fmtNum(stats.pending)} sub={`↑ ${stats.pending} pending`} icon={AlertCircle} color="#f59e0b" up={false} />
        <StatCard label="Total Revenue (This Month)" value={fmt(stats.totalRevenue)} sub={`↑ 15% vs last month`} icon={IndianRupee} color="#0ea5e9" />
        <StatCard label="Outstanding Amount" value={fmt(stats.outstanding)} sub={`↓ 10% vs last month`} icon={TrendingUp} color="#ef4444" up={false} />
      </div>

      {/* ── Body ─────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Left main area ────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by invoice no., patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Invoice Type */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Invoice Type</label>
              <div className="relative">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-blue-500 outline-none cursor-pointer text-slate-700 font-medium">
                  <option value="">All Types</option>
                  <option value="CONSULTATION">Consultation</option>
                  <option value="LAB">Laboratory</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Status</label>
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-blue-500 outline-none cursor-pointer text-slate-700 font-medium">
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Date Range</label>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="pl-7 pr-2 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 text-slate-700 cursor-pointer" />
                </div>
                <span className="text-slate-400 text-xs">–</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-2 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 text-slate-700 cursor-pointer" />
              </div>
            </div>

            <div className="ml-auto flex items-end gap-2">
              <button
                onClick={loadData}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-4 py-3.5">
                      <input type="checkbox" className="rounded border-slate-300 accent-blue-600" />
                    </th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No.</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Type</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Paid</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Due</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map(inv => (
                    <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-3.5">
                        <input type="checkbox" className="rounded border-slate-300 accent-blue-600" />
                      </td>

                      {/* Invoice No. */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-blue-600">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {inv.invoiceStatus ? inv.invoiceStatus.charAt(0).toUpperCase() + inv.invoiceStatus.slice(1).toLowerCase() : 'Invoice'}
                        </p>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center shrink-0">
                            <User size={13} className="text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">{patientName(inv)}</p>
                            <p className="text-[10px] text-slate-400">
                              PID: {inv.patientId?.pid || inv.patientId?._id?.slice(-6)?.toUpperCase() || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Invoice Type */}
                      <td className="px-4 py-3.5">
                        {invoiceTypeBadge(inv)}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-slate-700">
                          {fmtShortDate(inv.invoiceDate || inv.createdAt)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-slate-900">{fmt(inv.totalAmount)}</p>
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-3.5">
                        <p className={`text-sm font-semibold ${inv.paidAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {fmt(inv.paidAmount)}
                        </p>
                      </td>

                      {/* Due */}
                      <td className="px-4 py-3.5">
                        <p className={`text-sm font-semibold ${inv.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {fmt(inv.dueAmount)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {statusBadge(inv.paymentStatus)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/billing/invoices/${inv._id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="View Invoice"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="Print"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="More"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center py-16 text-slate-400">
                        <FileText size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold text-sm">No invoices found</p>
                        <p className="text-xs mt-1">
                          {search || statusFilter || typeFilter
                            ? 'Try adjusting your filters.'
                            : 'Click "+ Create New Invoice" to get started.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {fmtNum(filtered.length)} invoices</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition">‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)}
                      className={`px-3 py-1 rounded-lg border cursor-pointer transition ${
                        page === n ? 'border-blue-500 bg-blue-600 text-white font-bold' : 'border-slate-200 hover:bg-slate-50'
                      }`}>{n}</button>
                  ))}
                  {totalPages > 5 && <><span className="px-1 text-slate-400">…</span>
                    <button onClick={() => setPage(totalPages)}
                      className={`px-3 py-1 rounded-lg border cursor-pointer transition ${page === totalPages ? 'border-blue-500 bg-blue-600 text-white font-bold' : 'border-slate-200 hover:bg-slate-50'}`}>{totalPages}</button>
                  </>}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition">›</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ───────────────────── */}
        <div className="w-72 shrink-0 space-y-4 hidden xl:block">

          {/* Billing Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800">Billing Summary</p>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">This Month</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Total Invoices',    val: fmtNum(stats.total),    color: '#6366f1' },
                { label: 'Paid Invoices',     val: fmtNum(stats.paid),     color: '#10b981' },
                { label: 'Pending Invoices',  val: fmtNum(stats.pending),  color: '#f59e0b' },
                { label: 'Cancelled',         val: fmtNum(stats.cancelled), color: '#ef4444' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                    <span className="text-slate-600 font-medium">{row.label}</span>
                  </div>
                  <span className="font-bold text-slate-700">{row.val}</span>
                </div>
              ))}

              <div className="h-px bg-slate-100 my-2" />

              {[
                { label: 'Total Revenue',    val: fmt(stats.totalRevenue),   highlight: false },
                { label: 'Collected Amount', val: fmt(stats.totalRevenue - stats.outstanding), highlight: false },
                { label: 'Outstanding',      val: fmt(stats.outstanding),    highlight: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{row.label}</span>
                  <span className={`font-bold ${row.highlight ? 'text-rose-600' : 'text-slate-700'}`}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Invoice Type */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800">Revenue by Invoice Type</p>
            </div>
            {revenueSegments.length > 0 ? (
              <>
                <div className="flex justify-center mb-4">
                  <RevenueDonut segments={revenueSegments} total={stats.totalRevenue} />
                </div>
                <div className="space-y-2">
                  {revenueSegments.map(seg => (
                    <div key={seg.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                        <span className="text-slate-600 font-medium">{seg.label}</span>
                      </div>
                      <span className="font-bold text-slate-700">{fmt(seg.value)} ({seg.pct}%)</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No revenue data yet.</p>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800">Recent Payments</p>
              <button className="text-xs text-blue-600 font-bold hover:underline cursor-pointer">View All</button>
            </div>
            <div className="space-y-3">
              {stats.recentPayments.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No payments recorded yet.</p>
              )}
              {stats.recentPayments.map(inv => (
                <div key={inv._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0">
                    <User size={13} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{patientName(inv)}</p>
                    <p className="text-[10px] text-slate-400">{inv.invoiceNumber} · {fmtShortDate(inv.updatedAt || inv.createdAt)}</p>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 shrink-0">{fmt(inv.paidAmount)}</span>
                </div>
              ))}
            </div>
            {stats.recentPayments.length > 0 && (
              <button
                onClick={() => navigate('/billing')}
                className="mt-4 w-full py-2.5 rounded-xl border border-blue-100 text-blue-600 text-xs font-bold hover:bg-blue-50 transition cursor-pointer"
              >
                View All Payments
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
            <p className="text-sm font-bold mb-3">Quick Actions</p>
            <div className="space-y-2.5">
              {[
                { label: 'Create New Invoice', to: '/billing/invoices/new', icon: Plus },
                { label: 'View All Patients',  to: '/patients',             icon: User },
                { label: 'Billing Reports',    to: '/admin/reports',        icon: TrendingUp },
              ].map(({ label, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between text-xs font-semibold opacity-90 hover:opacity-100 transition group"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={12} />
                    <span>{label}</span>
                  </div>
                  <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingAdminPage;
