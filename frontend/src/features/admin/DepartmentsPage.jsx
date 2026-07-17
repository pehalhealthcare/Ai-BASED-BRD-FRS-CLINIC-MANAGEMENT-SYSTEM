import { useEffect, useState, useMemo, useCallback } from 'react';
import { specializationApi, doctorApi, dashboardApi } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/ui/Modal';
import {
  Plus, Search, SlidersHorizontal, BarChart2, PencilLine,
  Trash2, Eye, TrendingUp, Users, Building2, Activity,
  IndianRupee, ChevronDown, X, UserRound, FlaskConical,
  Pill, DollarSign, AlertTriangle, ArrowUpRight, Phone,
  Mail, Star, Stethoscope, CheckCircle2, XCircle, MoreVertical
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */

const DEPT_COLORS = [
  { bg: '#6366f1', light: '#eef2ff' }, // indigo
  { bg: '#ec4899', light: '#fdf2f8' }, // pink
  { bg: '#f59e0b', light: '#fffbeb' }, // amber
  { bg: '#10b981', light: '#ecfdf5' }, // emerald
  { bg: '#3b82f6', light: '#eff6ff' }, // blue
  { bg: '#8b5cf6', light: '#f5f3ff' }, // violet
  { bg: '#ef4444', light: '#fef2f2' }, // red
  { bg: '#06b6d4', light: '#ecfeff' }, // cyan
];

const getDeptColor = (idx) => DEPT_COLORS[idx % DEPT_COLORS.length];

const DEPT_ICONS = {
  'General Medicine': '🩺',
  'Cardiology': '❤️',
  'Pediatrics': '👶',
  'Orthopedics': '🦴',
  'Dermatology': '🌿',
  'Gynaecology': '🌸',
  'Neurology': '🧠',
  'ENT': '👂',
  'Dentistry': '🦷',
  'Pathology': '🔬',
  'Radiology': '📡',
  'Oncology': '🎗️',
  'Psychiatry': '💊',
  'Ophthalmology': '👁️',
};

const getDeptIcon = (name) => DEPT_ICONS[name] || '🏥';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

/* ─── Donut Chart (SVG, no deps) ──────────────────────────── */
const DonutChart = ({ data, total }) => {
  const size = 140;
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = total > 0 ? d.value / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const seg = { ...d, dash, gap, offset, color: getDeptColor(i).bg };
    offset += dash;
    return seg;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="20" />
      {segments.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="20"
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="butt"
        />
      ))}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#0f172a"
        fontSize="22"
        fontWeight="700"
        transform={`rotate(90, ${cx}, ${cy})`}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#94a3b8"
        fontSize="9"
        transform={`rotate(90, ${cx}, ${cy})`}
      >
        Total
      </text>
    </svg>
  );
};

/* ─── Mini Sparkline (SVG) ─────────────────────────────────── */
const Sparkline = ({ color = '#10b981' }) => {
  const pts = [10, 6, 14, 8, 16, 10, 18].map((y, x) => `${x * 10 + 2},${22 - y}`).join(' ');
  return (
    <svg width="72" height="24" viewBox="0 0 72 24" fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── Stat Card ────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, color, sparkColor }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2 min-w-0">
    <div className="flex items-center justify-between">
      <div className="p-2 rounded-xl" style={{ background: color + '18' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <Sparkline color={sparkColor || color} />
    </div>
    <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    {sub && <p className="text-[11px] text-emerald-600 font-semibold">{sub}</p>}
  </div>
);

/* ─── Field class ──────────────────────────────────────────── */
const FC = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-slate-800 bg-white';

/* ════════════════════════════════════════════════════════════ */
/*  Main Component                                              */
/* ════════════════════════════════════════════════════════════ */

const DepartmentsPage = () => {
  /* ── data state ─────────────────────────── */
  const [departments, setDepartments] = useState([]);
  const [doctorsBySpec, setDoctorsBySpec] = useState({}); // { specName -> count }
  const [overviewStats, setOverviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ── filter state ───────────────────────── */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_az');

  /* ── CRUD modal state ───────────────────── */
  const [showCrudModal, setShowCrudModal] = useState(false);
  const [crudMode, setCrudMode] = useState('create');
  const [selectedDept, setSelectedDept] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ── Analytics modal state ──────────────── */
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsTab, setAnalyticsTab] = useState('overview');

  /* ── delete confirm ─────────────────────── */
  const [deletingId, setDeletingId] = useState(null);

  /* ══════════════════════════════════════════════
     DATA FETCHING
  ══════════════════════════════════════════════ */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [specsRes, doctorsRes, overviewRes] = await Promise.allSettled([
        specializationApi.list({ all: true }),
        doctorApi.list({ limit: 500 }),
        dashboardApi.getOverview(),
      ]);

      // Specializations
      const specs = specsRes.status === 'fulfilled'
        ? (specsRes.value?.data?.specializations || [])
        : [];
      setDepartments(specs);

      // Group doctors by specialization name
      if (doctorsRes.status === 'fulfilled') {
        const doctors = doctorsRes.value?.data?.doctors || [];
        const grouped = {};
        doctors.forEach((d) => {
          if (d.specialization) {
            const key = d.specialization.trim();
            grouped[key] = (grouped[key] || 0) + 1;
          }
        });
        setDoctorsBySpec(grouped);
      }

      // Overview stats
      if (overviewRes.status === 'fulfilled') {
        setOverviewStats(overviewRes.value?.data || null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ══════════════════════════════════════════════
     COMPUTED VALUES
  ══════════════════════════════════════════════ */
  const totalDoctors = useMemo(() =>
    Object.values(doctorsBySpec).reduce((sum, c) => sum + c, 0),
  [doctorsBySpec]);

  const activeDepts = useMemo(() => departments.filter((d) => d.isActive), [departments]);

  const topDept = useMemo(() => {
    if (!departments.length) return null;
    return [...departments].sort((a, b) =>
      (doctorsBySpec[b.name] || 0) - (doctorsBySpec[a.name] || 0)
    )[0];
  }, [departments, doctorsBySpec]);

  const totalRevenue = overviewStats?.cards?.amountReceived || 0;

  /* ── filtered + sorted list ─────────────── */
  const filtered = useMemo(() => {
    let list = [...departments];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q)
      );
    }

    // status
    if (statusFilter === 'active') list = list.filter((d) => d.isActive);
    if (statusFilter === 'inactive') list = list.filter((d) => !d.isActive);

    // sort
    switch (sortBy) {
      case 'name_az': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name_za': list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'doctors_desc': list.sort((a, b) => (doctorsBySpec[b.name] || 0) - (doctorsBySpec[a.name] || 0)); break;
      case 'doctors_asc': list.sort((a, b) => (doctorsBySpec[a.name] || 0) - (doctorsBySpec[b.name] || 0)); break;
      default: break;
    }

    return list;
  }, [departments, search, statusFilter, sortBy, doctorsBySpec]);

  /* ── donut chart data ───────────────────── */
  const donutData = useMemo(() =>
    activeDepts.slice(0, 8).map((d) => ({ name: d.name, value: 1 })),
  [activeDepts]);

  /* ─ top performing (by doctor count) ────── */
  const topPerforming = useMemo(() =>
    [...departments]
      .sort((a, b) => (doctorsBySpec[b.name] || 0) - (doctorsBySpec[a.name] || 0))
      .slice(0, 5),
  [departments, doctorsBySpec]);

  const maxDoctorCount = topPerforming.length > 0
    ? (doctorsBySpec[topPerforming[0]?.name] || 1)
    : 1;

  /* ══════════════════════════════════════════════
     CRUD HANDLERS
  ══════════════════════════════════════════════ */
  const openCreate = () => {
    setCrudMode('create');
    setSelectedDept(null);
    setForm({ name: '', description: '', isActive: true });
    setFormError('');
    setShowCrudModal(true);
  };

  const openEdit = (dept) => {
    setCrudMode('edit');
    setSelectedDept(dept);
    setForm({ name: dept.name, description: dept.description || '', isActive: dept.isActive });
    setFormError('');
    setShowCrudModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (crudMode === 'create') {
        await specializationApi.create(form);
      } else {
        await specializationApi.update(selectedDept._id, form);
      }
      setShowCrudModal(false);
      await loadData();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (dept, e) => {
    e?.stopPropagation();
    try {
      await specializationApi.update(dept._id, { isActive: !dept.isActive });
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Permanently delete this department?')) return;
    setDeletingId(id);
    try {
      await specializationApi.remove(id);
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  /* ══════════════════════════════════════════════
     ANALYTICS
  ══════════════════════════════════════════════ */
  const openAnalytics = async (dept, e) => {
    e?.stopPropagation();
    setAnalyticsData(null);
    setAnalyticsError('');
    setAnalyticsTab('overview');
    setShowAnalytics(true);
    setAnalyticsLoading(true);
    try {
      const res = await specializationApi.getAnalytics(dept._id);
      setAnalyticsData(res?.data || null);
    } catch (err) {
      setAnalyticsError(err?.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  if (loading) return <LoadingState label="Loading departments..." />;
  if (error) return <ErrorState title="Unable to load departments" description={error} />;

  return (
    <div className="space-y-6 p-1">

      {/* ── Page Header ──────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <PageHeader
          eyebrow="Admin Panel"
          title="Departments"
          description="Manage all departments and their services"
        />
        <div className="flex items-center gap-3 shrink-0 mt-1">
          <button
            onClick={() => {/* export placeholder */}}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition cursor-pointer"
          >
            <BarChart2 size={15} className="text-slate-500" />
            Department Reports
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition cursor-pointer"
          >
            <Plus size={16} />
            Add New Department
          </button>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total Departments"
          value={departments.length}
          sub="Active departments"
          icon={Building2}
          color="#6366f1"
        />
        <StatCard
          label="Total Doctors"
          value={fmtNum(totalDoctors)}
          sub="Across all departments"
          icon={Users}
          color="#3b82f6"
        />
        <StatCard
          label="Active Departments"
          value={activeDepts.length}
          sub={`${departments.length - activeDepts.length} inactive`}
          icon={Activity}
          color="#10b981"
        />
        <StatCard
          label="Top Department"
          value={topDept?.name || '—'}
          sub={topDept ? `${doctorsBySpec[topDept.name] || 0} doctors` : ''}
          icon={Star}
          color="#f59e0b"
          sparkColor="#f59e0b"
        />
        <StatCard
          label="Revenue (This Month)"
          value={fmt(totalRevenue)}
          sub="↑ Clinic total"
          icon={IndianRupee}
          color="#ec4899"
        />
      </div>

      {/* ── Body: Table + Sidebar ─────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Left: Filter + Table ─────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search department by name, services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-emerald-500 outline-none cursor-pointer text-slate-700 font-medium"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Sort */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Sort By</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-emerald-500 outline-none cursor-pointer text-slate-700 font-medium"
                >
                  <option value="name_az">Department Name (A–Z)</option>
                  <option value="name_za">Department Name (Z–A)</option>
                  <option value="doctors_desc">Most Doctors</option>
                  <option value="doctors_asc">Fewest Doctors</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="ml-auto flex items-end gap-2 pb-0.5">
              <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition">
                <SlidersHorizontal size={14} /> Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Doctors</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((dept, idx) => {
                    const color = getDeptColor(departments.indexOf(dept));
                    const doctorCount = doctorsBySpec[dept.name] || 0;
                    const isDeleting = deletingId === dept._id;

                    return (
                      <tr
                        key={dept._id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Department name + icon */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                              style={{ background: color.light, border: `1.5px solid ${color.bg}22` }}
                            >
                              {getDeptIcon(dept.name)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{dept.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {dept.createdAt ? new Date(dept.createdAt).getFullYear() : '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Doctor count */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-800">{doctorCount}</span>
                            <Users size={12} className="text-slate-400" />
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-5 py-4">
                          <p className="text-xs text-slate-500 max-w-[200px] truncate">
                            {dept.description || 'No description provided.'}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <button
                            onClick={(e) => handleToggleStatus(dept, e)}
                            title="Click to toggle status"
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all ${
                              dept.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {dept.isActive
                              ? <><CheckCircle2 size={11} /> Active</>
                              : <><XCircle size={11} /> Inactive</>
                            }
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => openAnalytics(dept, e)}
                              title="View Analytics"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(dept); }}
                              title="Edit"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            >
                              <PencilLine size={15} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(dept._id, e)}
                              title="Delete"
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-16 text-slate-400">
                        <Building2 size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold text-sm">No departments found</p>
                        <p className="text-xs mt-1">
                          {search || statusFilter !== 'all'
                            ? 'Try adjusting your search or filters.'
                            : 'Click "+ Add New Department" to create one.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination row */}
            {filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing 1 to {filtered.length} of {filtered.length} departments</span>
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition disabled:opacity-40" disabled>
                    ‹
                  </button>
                  <button className="px-3 py-1 rounded-lg border border-emerald-500 bg-emerald-600 text-white font-bold cursor-pointer">
                    1
                  </button>
                  <button className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition disabled:opacity-40" disabled>
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ───────────────────────── */}
        <div className="w-72 shrink-0 space-y-4 hidden xl:block">

          {/* Donut chart card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Department Distribution</p>
            <div className="flex justify-center mb-4">
              <DonutChart data={donutData} total={activeDepts.length} />
            </div>
            <div className="space-y-2 mt-2">
              {donutData.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: getDeptColor(i).bg }}
                    />
                    <span className="text-slate-600 font-medium truncate max-w-[130px]">{d.name}</span>
                  </div>
                  <span className="text-slate-500 font-semibold">
                    {activeDepts.length > 0 ? Math.round((1 / activeDepts.length) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top performing */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800">Top Performing</p>
              <span className="text-xs text-slate-400 font-medium">By Doctors</span>
            </div>
            <div className="space-y-3">
              {topPerforming.map((dept, i) => {
                const count = doctorsBySpec[dept.name] || 0;
                const pct = maxDoctorCount > 0 ? (count / maxDoctorCount) * 100 : 0;
                const color = getDeptColor(i);
                return (
                  <div key={dept._id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{getDeptIcon(dept.name)}</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[130px]">{dept.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 shrink-0 ml-1">{count} <span className="text-slate-400 font-normal">docs</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color.bg }}
                      />
                    </div>
                  </div>
                );
              })}
              {topPerforming.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No data yet.</p>
              )}
            </div>
          </div>

          {/* Quick info */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
            <p className="text-sm font-bold mb-1">Clinic Overview</p>
            <p className="text-xs opacity-80 mb-3">Department health at a glance</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="opacity-80">Total Departments</span>
                <span className="font-bold">{departments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Active</span>
                <span className="font-bold">{activeDepts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Doctors Assigned</span>
                <span className="font-bold">{fmtNum(totalDoctors)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Monthly Revenue</span>
                <span className="font-bold">{fmt(totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CRUD MODAL — Add / Edit Department
      ══════════════════════════════════════════════ */}
      <Modal
        open={showCrudModal}
        onClose={() => setShowCrudModal(false)}
        title={crudMode === 'create' ? 'Add New Department' : 'Edit Department'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">
              <AlertTriangle size={14} className="shrink-0" />
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Cardiology, Neurology…"
              className={FC}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
            <textarea
              rows="3"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of services provided…"
              className={FC + ' resize-none'}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
              className={`relative w-10 h-5.5 rounded-full transition-all cursor-pointer ${form.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
              style={{ height: '22px' }}
            >
              <span
                className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${form.isActive ? 'left-[22px]' : 'left-0.5'}`}
                style={{ width: '18px', height: '18px' }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700">Mark as Active Department</span>
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCrudModal(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Saving…' : crudMode === 'create' ? 'Add Department' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════
          ANALYTICS MODAL
      ══════════════════════════════════════════════ */}
      <Modal
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title={analyticsData?.specialization?.name ? `${getDeptIcon(analyticsData.specialization.name)} ${analyticsData.specialization.name} — Analytics` : 'Department Analytics'}
        size="xl"
      >
        <div className="p-6">
          {analyticsLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {analyticsError && (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{analyticsError}</div>
          )}
          {analyticsData && !analyticsLoading && (
            <div className="space-y-5">
              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'doctors', label: `Doctors (${analyticsData.doctors?.length || 0})` },
                  { key: 'patients', label: `Patients (${analyticsData.patientsCount || 0})` },
                  { key: 'revenue', label: 'Revenue' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAnalyticsTab(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                      analyticsTab === tab.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Overview Tab */}
              {analyticsTab === 'overview' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-indigo-50 rounded-2xl p-4 text-center border border-indigo-100">
                    <p className="text-2xl font-black text-indigo-700">{analyticsData.doctors?.length || 0}</p>
                    <p className="text-xs text-indigo-500 font-semibold mt-1">Doctors</p>
                  </div>
                  <div className="bg-teal-50 rounded-2xl p-4 text-center border border-teal-100">
                    <p className="text-2xl font-black text-teal-700">{analyticsData.patientsCount || 0}</p>
                    <p className="text-xs text-teal-500 font-semibold mt-1">Patients Served</p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-100">
                    <p className="text-2xl font-black text-amber-700">{analyticsData.labTests?.length || 0}</p>
                    <p className="text-xs text-amber-500 font-semibold mt-1">Lab Tests</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                    <p className="text-2xl font-black text-emerald-700">{fmt(analyticsData.revenue?.totalRevenue || 0)}</p>
                    <p className="text-xs text-emerald-500 font-semibold mt-1">Total Revenue</p>
                  </div>

                  {/* Clinics */}
                  {analyticsData.clinics?.length > 0 && (
                    <div className="col-span-full">
                      <p className="text-sm font-bold text-slate-700 mb-3">Clinic Branches Offering This Department</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {analyticsData.clinics.map((c) => (
                          <div key={c._id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                              {c.code?.slice(0, 2) || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                              <p className="text-xs text-slate-400">{c.address?.city || 'Location N/A'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Doctors Tab */}
              {analyticsTab === 'doctors' && (
                <div className="space-y-2">
                  {analyticsData.doctors?.length === 0 && (
                    <p className="text-center text-slate-400 py-10">No doctors found for this department.</p>
                  )}
                  {analyticsData.doctors?.map((doc) => (
                    <div key={doc._id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-200 transition">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {doc.fullName?.charAt(0) || 'D'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{doc.fullName}</p>
                        <p className="text-xs text-slate-400">{doc.qualification || 'Qualification N/A'} · {doc.experienceYears || 0} yrs exp</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-700">{fmt(doc.consultationFee || 0)}</p>
                        <p className="text-xs text-slate-400">Consultation fee</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Patients Tab */}
              {analyticsTab === 'patients' && (
                <div className="space-y-2">
                  {analyticsData.patients?.length === 0 && (
                    <p className="text-center text-slate-400 py-10">No patients found for this department.</p>
                  )}
                  {analyticsData.patients?.map((p) => (
                    <div key={p._id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                        {p.fullName?.charAt(0) || 'P'}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm">{p.fullName || 'Unknown Patient'}</p>
                        <p className="text-xs text-slate-400">
                          {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : 'N/A'}
                          {p.age ? ` · ${p.age} yrs` : ''}
                          {p.patientId ? ` · ${p.patientId}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 text-slate-400">
                        {p.phone && <Phone size={13} />}
                        {p.email && <Mail size={13} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Revenue Tab */}
              {analyticsTab === 'revenue' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
                      <p className="text-xs opacity-80 font-semibold mb-1">Total Revenue Collected</p>
                      <p className="text-2xl font-black">{fmt(analyticsData.revenue?.totalRevenue || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
                      <p className="text-xs opacity-80 font-semibold mb-1">Total Billed</p>
                      <p className="text-2xl font-black">{fmt(analyticsData.revenue?.totalBilled || 0)}</p>
                    </div>
                  </div>

                  {analyticsData.revenue?.totalBilled > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                      <p className="text-sm font-bold text-slate-700 mb-3">Collection Rate</p>
                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.round((analyticsData.revenue.totalRevenue / analyticsData.revenue.totalBilled) * 100))}%`
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2 font-semibold">
                        {Math.round((analyticsData.revenue.totalRevenue / analyticsData.revenue.totalBilled) * 100)}% collected
                      </p>
                    </div>
                  )}

                  {/* Unavailable medicines */}
                  {analyticsData.unavailableMedicines?.length > 0 && (
                    <div className="bg-rose-50 rounded-2xl border border-rose-100 p-4">
                      <p className="text-sm font-bold text-rose-700 mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Out-of-Stock Medicines
                      </p>
                      <div className="space-y-1.5">
                        {analyticsData.unavailableMedicines.map((m) => (
                          <div key={m._id} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-rose-800">{m.name}</span>
                            <span className="text-rose-500">{m.code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DepartmentsPage;
