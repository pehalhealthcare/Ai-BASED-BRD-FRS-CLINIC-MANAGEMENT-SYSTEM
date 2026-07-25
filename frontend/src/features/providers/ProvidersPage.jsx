import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, Eye, SlidersHorizontal, MapPin, Phone, Mail,
  Clock, RefreshCw, X, ChevronLeft, ChevronRight, Building2, Package,
  TrendingUp, AlertTriangle, ShoppingCart, Truck, CalendarClock, Layers,
  Users, Settings, BarChart3, Zap, MoreVertical, Check,
  Link2, CheckCircle2, Download, Archive, LogOut, Shield, Clipboard
} from 'lucide-react';
import { providersApi, pharmacyApi } from '../../lib/api';
import toast from 'react-hot-toast';
import PharmacyStaffModal from './PharmacyStaffModal';
import { ProviderWizardModal } from './ProviderWizardModal';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const statusColor = {
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-slate-100 text-slate-500',
  Suspended: 'bg-red-100 text-red-600',
};

const AVATAR_PALETTE = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-600',
];

const avatarGrad = (name = '') =>
  AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

/* ─── Sub-components ──────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, iconBg, value, label, sub, highlight }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-1 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className={`text-2xl font-black mt-2 ${highlight || 'text-slate-800'}`}>{value}</p>
    <p className="text-[11px] font-bold text-slate-600 leading-tight">{label}</p>
    <p className="text-[10px] text-slate-400">{sub}</p>
  </div>
);

const KpiTile = ({ label, value, color, icon: Icon }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-1">
      {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
      <span className={`text-lg font-black ${color}`}>{value}</span>
    </div>
    <span className="text-[10px] text-slate-400 font-semibold leading-tight">{label}</span>
  </div>
);

const ActionBtn = ({ icon: Icon, label, onClick, color = 'text-slate-600 hover:bg-slate-100' }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition ${color}`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

/* ─── Skeleton Card ───────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
    <div className="flex gap-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-5 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-1/4" />
      </div>
      <div className="grid grid-cols-3 gap-4 w-72">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

/* ─── Form Field ──────────────────────────────────────────────────────────── */
const Field = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input
    {...props}
    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition"
  />
);

const Select = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition"
  >
    {children}
  </select>
);

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
const ProvidersPage = () => {
  const navigate = useNavigate();

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('Pharmacy');
  const [providers, setProviders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryStats, setInventoryStats] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [managingProvider, setManagingProvider] = useState(null);
  const [moreMenuId, setMoreMenuId] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const TOTAL_STEPS = 4;
  const moreMenuRef = useRef(null);
  const [selectedStaffProviderId, setSelectedStaffProviderId] = useState(null);

  // Import search
  const [importQuery, setImportQuery] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importSearching, setImportSearching] = useState(false);

  // Add / Edit form
  const emptyForm = {
    name: '', globalId: '', providerSubtype: 'Internal',
    contactPerson: '', managerPhone: '', managerEmail: '', managerEmployeeId: '',
    phone: '', email: '',
    address: { line1: '', city: '', state: '', pincode: '' },
    workingHours: { openingTime: '09:00', closingTime: '21:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    gstNumber: '', drugLicenseNumber: '', licenseExpiry: '',
    invoicePrefix: 'PHR', reorderThreshold: 10,
    barcodeEnabled: false, printerEnabled: false,
    assignedBranches: [], status: 'Active',
    providerType: 'Pharmacy', providerCategory: 'Own Provider'
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Provider stats
  const [providerStats, setProviderStats] = useState({
    total: 0, active: 0, internal: 0, external: 0
  });

  /* ── Data Loading ────────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [branchRes, provRes] = await Promise.all([
        providersApi.getBranches().catch(() => []),
        providersApi.getProviders({
          search, providerType: activeTab,
          status: statusFilter, branch: branchFilter,
          providerSubtype: ownershipFilter, page, limit: LIMIT
        })
      ]);
      setBranches(branchRes?.data ?? branchRes ?? []);
      const data = provRes?.data ?? provRes ?? {};
      setProviders(data.items || []);
      setTotal(data.total || 0);

      // Stats from all providers
      const allRes = await providersApi.getProviders({ providerType: activeTab, limit: 1000 }).catch(() => ({ data: {} }));
      const allItems = allRes?.data?.items ?? allRes?.items ?? [];
      setProviderStats({
        total: allItems.length,
        active: allItems.filter(p => p.status === 'Active').length,
        internal: allItems.filter(p => p.providerSubtype === 'Internal').length,
        external: allItems.filter(p => p.providerSubtype === 'External').length,
      });
    } catch {
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [search, activeTab, statusFilter, branchFilter, ownershipFilter, page]);

  const loadInventoryStats = useCallback(async () => {
    try {
      if (activeTab === 'Laboratory') {
        const res = await providersApi.getLaboratoryStats();
        setInventoryStats(res?.data ?? res ?? null);
      } else {
        const res = await pharmacyApi.getInventoryDashboard();
        setInventoryStats(res?.data ?? res ?? null);
      }
    } catch { /* silent */ }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadInventoryStats(); }, [loadInventoryStats]);

  // Close more-menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ── Handlers ────────────────────────────────────────────────────────────── */
  const openAdd = () => {
    setForm({ ...emptyForm, providerType: activeTab });
    setWizardStep(1);
    setAddOpen(true);
  };

  const openManage = (p) => {
    setManagingProvider(p);
    setForm({
      ...emptyForm, ...p,
      address: { ...emptyForm.address, ...p.address },
      workingHours: { ...emptyForm.workingHours, ...p.workingHours },
      assignedBranches: p.assignedBranches?.map(b => b._id || b) || []
    });
    setManageOpen(true);
    setMoreMenuId(null);
  };

  const handleSave = async () => {
    const isLab = activeTab === 'Laboratory';
    if (!form.name) return toast.error(`${isLab ? 'Laboratory' : 'Pharmacy'} name is required`);
    setSaving(true);
    try {
      const payload = {
        ...form,
        providerType: activeTab,
        providerCategory: form.providerSubtype === 'Internal' ? 'Own Provider' : 'Partner Provider',
        integrationType: 'None',
        integrationStatus: 'Not Configured',
      };
      if (managingProvider) {
        await providersApi.updateProvider(managingProvider._id, payload);
        toast.success(`${isLab ? 'Laboratory' : 'Pharmacy'} updated successfully`);
        setManageOpen(false);
      } else {
        await providersApi.createProvider(payload);
        toast.success(`${isLab ? 'Laboratory' : 'Pharmacy'} created successfully`);
        setAddOpen(false);
      }
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to save ${isLab ? 'laboratory' : 'pharmacy'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (p) => {
    try {
      const next = p.status === 'Active' ? 'Inactive' : 'Active';
      await providersApi.changeStatus(p._id, next);
      toast.success(`Status changed to ${next}`);
      loadData();
      setMoreMenuId(null);
    } catch { toast.error('Failed to change status'); }
  };

  const handleArchive = async (p) => {
    if (!window.confirm(`Archive ${p.name}? This cannot be undone.`)) return;
    try {
      await providersApi.archiveProvider(p._id);
      toast.success('Provider archived');
      loadData();
      setMoreMenuId(null);
    } catch { toast.error('Failed to archive'); }
  };

  const handleImportSearch = async () => {
    if (!importQuery.trim()) return;
    setImportSearching(true);
    setImportResult(null);
    try {
      const res = await providersApi.getProviders({ search: importQuery, limit: 1 });
      const items = res?.data?.items ?? res?.items ?? [];
      setImportResult(items[0] || 'NOT_FOUND');
    } catch { toast.error('Search failed'); }
    finally { setImportSearching(false); }
  };

  const handleLinkProvider = async () => {
    if (!importResult || importResult === 'NOT_FOUND') return;
    try {
      await providersApi.updateProvider(importResult._id, { linked: true });
      toast.success('Provider linked to clinic successfully');
      setImportOpen(false);
      loadData();
    } catch { toast.error('Failed to link provider'); }
  };

  const nextStep = () => {
    if (wizardStep === 1 && !form.name) return toast.error('Pharmacy name is required');
    if (wizardStep === 2 && (!form.contactPerson)) return toast.error('Manager name is required');
    setWizardStep(s => Math.min(s + 1, TOTAL_STEPS));
  };
  const prevStep = () => setWizardStep(s => Math.max(s - 1, 1));

  /* ── Computed stats for the top cards ───────────────────────────────────── */
  const inv = inventoryStats || {};
  const totalPages = Math.max(Math.ceil(total / LIMIT), 1);

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50/50">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Healthcare Providers</h1>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">Clinic Admin</span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {activeTab === 'Laboratory'
              ? 'Manage laboratory providers connected to your clinic, monitor operations, inventory, orders, staff, and reports.'
              : 'Manage internal pharmacies, laboratory providers, external healthcare partners, and operational resources connected to your clinic.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-4 h-4" /> {activeTab === 'Laboratory' ? 'Import Existing Laboratory' : 'Import Existing Pharmacy'}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> {activeTab === 'Laboratory' ? 'Add Laboratory' : 'Add Pharmacy'}
          </button>
        </div>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────────── */}
      {activeTab === 'Laboratory' ? (
        <div className="grid grid-cols-5 gap-4">
          <StatCard icon={Building2} iconBg="bg-violet-100 text-violet-600" value={inv.totalLaboratories ?? '0'} label="Total Laboratories" sub="Across all branches" />
          <StatCard icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-600" value={inv.activeLaboratories ?? '0'} label="Active Laboratories" sub="Currently operational" />
          <StatCard icon={Shield} iconBg="bg-blue-100 text-blue-600" value={inv.inactiveLaboratories ?? '0'} label="Inactive Laboratories" sub="Not operational" />
          <StatCard icon={Users} iconBg="bg-amber-100 text-amber-600" value={inv.laboratoryStaff ?? '0'} label="Laboratory Staff" sub="Across all laboratories" />
          <StatCard icon={Package} iconBg="bg-indigo-100 text-indigo-600" value={inv.testsInInventory ?? '0'} label="Tests in Inventory" sub="Total available tests" />

          <StatCard icon={AlertTriangle} iconBg="bg-orange-100 text-orange-600" value={inv.lowStockAlerts ?? '0'} label="Low Stock Alerts" sub="Needs attention" highlight="text-orange-600" />
          <StatCard icon={ShoppingCart} iconBg="bg-sky-100 text-sky-600" value={inv.pendingOrders ?? '0'} label="Pending Orders" sub="Awaiting collection" />
          <StatCard icon={Layers} iconBg="bg-purple-100 text-purple-600" value={inv.pendingTestOrders ?? '0'} label="Pending Test Orders" sub="Sample collected" />
          <StatCard icon={Clock} iconBg="bg-rose-100 text-rose-600" value={inv.expiringSoon ?? '0'} label="Expiring Soon" sub="Within 30 days" highlight="text-rose-600" />
          <StatCard icon={TrendingUp} iconBg="bg-teal-100 text-teal-600" value={inv.todayRevenue ? `₹${Number(inv.todayRevenue).toLocaleString('en-IN')}` : '₹0'} label="Today's Revenue" sub="Across all laboratories" highlight="text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          <StatCard icon={Building2} iconBg="bg-violet-100 text-violet-600" value={providerStats.total} label="Total Pharmacies" sub="Across all branches" />
          <StatCard icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-600" value={providerStats.active} label="Active Pharmacies" sub="Currently operational" />
          <StatCard icon={Shield} iconBg="bg-blue-100 text-blue-600" value={providerStats.internal} label="Internal Pharmacies" sub="Clinic Owned" />
          <StatCard icon={Users} iconBg="bg-amber-100 text-amber-600" value={providerStats.external} label="External Partners" sub="Third Party Providers" />
          <StatCard icon={Package} iconBg="bg-indigo-100 text-indigo-600" value={inv.totalMedicines ?? '0'} label="Medicines in Stock" sub="Total Medicine SKUs" />

          <StatCard icon={AlertTriangle} iconBg="bg-orange-100 text-orange-600" value={inv.lowStock ?? '0'} label="Low Stock Alerts" sub="Needs Reordering" highlight="text-orange-600" />
          <StatCard icon={ShoppingCart} iconBg="bg-sky-100 text-sky-600" value={inv.pendingOrders ?? '0'} label="Pending Orders" sub="Awaiting Dispense" />
          <StatCard icon={Truck} iconBg="bg-purple-100 text-purple-600" value={inv.purchaseOrdersPending ?? '0'} label="Pending Purchase Orders" sub="Supplier Deliveries" />
          <StatCard icon={CalendarClock} iconBg="bg-rose-100 text-rose-600" value={inv.expiring30Days ?? '0'} label="Expiring Soon" sub="Within 30 Days" highlight="text-rose-600" />
          <StatCard icon={TrendingUp} iconBg="bg-teal-100 text-teal-600" value={inv.todayRevenue ? `₹${Number(inv.todayRevenue).toLocaleString('en-IN')}` : '₹0'} label="Today's Revenue" sub="Across Pharmacy" highlight="text-teal-600" />
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 bg-transparent">
        {['Pharmacy', 'Laboratory'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`px-6 py-3 font-bold text-sm -mb-px border-b-2 transition ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            {tab} Providers
          </button>
        ))}
      </div>

      {/* ── Search & Filters ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by pharmacy name, provider ID, manager, phone number..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Suspended">Suspended</option>
        </select>

        <select value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600">
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>

        <select value={ownershipFilter} onChange={e => { setOwnershipFilter(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600">
          <option value="">All Ownership</option>
          <option value="Internal">Internal</option>
          <option value="External">External</option>
        </select>

        <select className="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600">
          <option>Inventory Health</option>
          <option>Healthy</option>
          <option>Low Stock</option>
          <option>Critical</option>
          <option>Out of Stock</option>
        </select>

        <button className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>

        <button onClick={loadData} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Provider Cards or Table ────────────────────────────────────────── */}
      <div className="space-y-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : providers.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-700">No {activeTab} Providers Found</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                {activeTab === 'Laboratory'
                  ? 'Create your first laboratory provider to manage laboratory operations, tests, inventory, staff, and reports.'
                  : 'Create your first pharmacy or connect an existing provider to start managing medicines, inventory, and pharmacy operations.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={openAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition shadow-lg shadow-blue-200">
                <Plus className="w-4 h-4" /> {activeTab === 'Laboratory' ? 'Add Laboratory' : 'Add Pharmacy'}
              </button>
            </div>
          </div>
        ) : (
          providers.map(p => <ProviderCard
            key={p._id}
            provider={p}
            inventoryStats={inv}
            navigate={navigate}
            moreMenuId={moreMenuId}
            moreMenuRef={moreMenuRef}
            setMoreMenuId={setMoreMenuId}
            onManage={() => openManage(p)}
            onToggleStatus={() => handleToggleStatus(p)}
            onArchive={() => handleArchive(p)}
            onStaff={() => setSelectedStaffProviderId(p._id)}
          />)
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {!loading && providers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">
            Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, total)} of {total} results
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${page === i + 1 ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <select value={LIMIT} className="ml-2 px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 focus:outline-none">
              <option>10 / page</option>
            </select>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADD PHARMACY WIZARD
      ══════════════════════════════════════════════════════════════════ */}
      {addOpen && (
        <WizardModal
          step={wizardStep}
          totalSteps={TOTAL_STEPS}
          form={form}
          setForm={setForm}
          branches={branches}
          saving={saving}
          onClose={() => setAddOpen(false)}
          onNext={nextStep}
          onPrev={prevStep}
          onSave={handleSave}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MANAGE (EDIT) MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {manageOpen && (
        <ManageModal
          form={form}
          setForm={setForm}
          saving={saving}
          branches={branches}
          onClose={() => setManageOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          IMPORT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {importOpen && (
        <ImportModal
          importQuery={importQuery}
          setImportQuery={setImportQuery}
          importResult={importResult}
          importSearching={importSearching}
          onSearch={handleImportSearch}
          onLink={handleLinkProvider}
          onClose={() => { setImportOpen(false); setImportQuery(''); setImportResult(null); }}
        />
      )}

      {selectedStaffProviderId && (
        <PharmacyStaffModal
          providerId={selectedStaffProviderId}
          onClose={() => setSelectedStaffProviderId(null)}
        />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   PROVIDER CARD
══════════════════════════════════════════════════════════════════════════════ */
const ProviderCard = ({ provider: p, inventoryStats, navigate, moreMenuId, moreMenuRef, setMoreMenuId, onManage, onToggleStatus, onArchive, onStaff }) => {
  const isMenuOpen = moreMenuId === p._id;
  const grad = avatarGrad(p.name);
  const hours = p.workingHours;
  const openTime = hours?.openingTime ? `${hours.openingTime}` : '08:00';
  const closeTime = hours?.closingTime ? `${hours.closingTime}` : '20:00';

  const fmt = (t = '') => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${((h % 12) || 12)}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  const inv = p.stats || inventoryStats || {};
  const isLab = p.providerType === 'Laboratory';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      {/* Main card body */}
      <div className="p-5 flex gap-5">
        {/* ─── Left: Identity ─────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col items-start gap-3">
          {/* Avatar */}
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
            {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover rounded-2xl" /> : initials(p.name)}
          </div>
        </div>
        {/* ─── Center: Details ────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Status + name row */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${statusColor[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {p.status}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 leading-tight">{p.name}</h3>
          <p className="text-[11px] text-slate-400 font-semibold mb-2">{p.globalId || `${isLab ? 'LAB' : 'PHR'}-000001`}</p>
          {/* Badges */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100">
              {isLab
                ? (p.providerSubtype === 'Internal' ? '🧪 Internal Laboratory' : '🤝 External Laboratory')
                : (p.providerSubtype === 'Internal' ? '🏥 Internal Pharmacy' : '🤝 External Partner')
              }
            </span>
            {p.assignedBranches?.slice(0, 2).map((b, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200">
                📍 {b.name || 'Main Branch'}
              </span>
            ))}
          </div>
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-700">Manager</span>
              <span>{p.contactPerson || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-700">Phone</span>
              <span>{p.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-700">Email</span>
              <span className="truncate">{p.email || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-700">Address</span>
              <span className="truncate">{[p.address?.city, p.address?.state].filter(Boolean).join(', ') || '—'}</span>
            </div>
          </div>
        </div>
        {/* ─── Right: KPI Summary ──────────────────────────────────── */}
        <div className="flex-shrink-0 w-80">
          {isLab ? (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <KpiTile label="Tests in Inventory" value={inv.testsInInventory ?? 0} color="text-blue-600" icon={Package} />
              <KpiTile label="Today's Revenue" value={inv.todayRevenue ? `₹${Number(inv.todayRevenue).toLocaleString('en-IN')}` : '₹0'} color="text-teal-600" icon={TrendingUp} />
              <KpiTile label="Low Stock" value={inv.lowStockAlerts ?? '0'} color="text-orange-500" icon={AlertTriangle} />
              <KpiTile label="Pending Orders" value={inv.pendingOrders ?? '0'} color="text-sky-600" icon={ShoppingCart} />
              <KpiTile label="Pending Test Orders" value={inv.pendingTestOrders ?? '0'} color="text-purple-600" icon={Layers} />
              <KpiTile label="Expiring Soon" value={inv.expiringSoon ?? '0'} color="text-rose-600" icon={CalendarClock} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <KpiTile label="Medicines" value={inv.totalMedicines ?? '0'} color="text-blue-600" icon={Package} />
              <KpiTile label="Today's Revenue" value={inv.todayRevenue ? `₹${Number(inv.todayRevenue).toLocaleString('en-IN')}` : '₹0'} color="text-teal-600" icon={TrendingUp} />
              <KpiTile label="Low Stock" value={inv.lowStock ?? '0'} color="text-orange-500" icon={AlertTriangle} />
              <KpiTile label="Pending Orders" value={inv.pendingOrders ?? '0'} color="text-sky-600" icon={ShoppingCart} />
              <KpiTile label="Pending Purchase" value={inv.purchaseOrdersPending ?? '0'} color="text-purple-600" icon={Truck} />
              <KpiTile label="Expiring Soon" value={inv.expiring30Days ?? '0'} color="text-rose-600" icon={CalendarClock} />
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="font-semibold">{fmt(openTime)} – {fmt(closeTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              <span>5 mins ago</span>
            </div>
          </div>
        </div>

        {/* ─── More Menu ───────────────────────────────────────────── */}
        <div className="relative flex-shrink-0" ref={isMenuOpen ? moreMenuRef : null}>
          <button
            onClick={() => setMoreMenuId(isMenuOpen ? null : p._id)}
            className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-700"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-8 bg-white border border-slate-100 shadow-xl rounded-2xl z-50 w-52 overflow-hidden py-1.5">
              {[
                { icon: Edit2, label: `Edit ${isLab ? 'Laboratory' : 'Pharmacy'}`, action: onManage, color: 'text-blue-600' },
                { icon: p.status === 'Active' ? LogOut : CheckCircle2, label: p.status === 'Active' ? 'Deactivate' : 'Activate', action: onToggleStatus, color: 'text-amber-600' },
                { icon: Archive, label: 'Archive', action: onArchive, color: 'text-red-600' },
                { icon: Users, label: 'Assign Manager', action: onManage, color: 'text-slate-600' },
                { icon: Clipboard, label: 'View Audit Logs', action: () => { }, color: 'text-slate-600' },
                { icon: Trash2, label: 'Delete Provider', action: onArchive, color: 'text-red-600' },
              ].map(({ icon: Icon, label, action, color }) => (
                <button key={label} onClick={action}
                  className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition ${color}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Action Bar ──────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-5 py-2.5 flex items-center gap-1">
        <ActionBtn icon={Eye} label="View" onClick={() => navigate(`/admin/providers/${p._id}`)} color="text-slate-600 hover:bg-slate-100 hover:text-slate-800" />
        <ActionBtn icon={Edit2} label="Manage" onClick={onManage} color="text-blue-600 hover:bg-blue-50" />
        <ActionBtn icon={Package} label="Inventory" onClick={() => navigate(`/admin/providers/${p._id}/inventory`)} color="text-indigo-600 hover:bg-indigo-50" />
        <ActionBtn icon={ShoppingCart} label="Orders" onClick={() => navigate(`/admin/providers/${p._id}/orders`)} color="text-orange-600 hover:bg-orange-50" />
        <ActionBtn icon={Users} label="Staff" onClick={onStaff} color="text-teal-600 hover:bg-teal-50" />
        <ActionBtn icon={BarChart3} label="Reports" onClick={() => navigate(`/admin/providers/${p._id}/reports`)} color="text-purple-600 hover:bg-purple-50" />
        <ActionBtn icon={Zap} label="Integrations" onClick={() => { }} color="text-slate-500 hover:bg-slate-100" />
        <div className="ml-auto">
          <button onClick={() => setMoreMenuId(isMenuOpen => isMenuOpen === p._id ? null : p._id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:bg-slate-100 transition">
            <MoreVertical className="w-3.5 h-3.5" /> More Options
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   ADD PHARMACY / LABORATORY WIZARD MODAL
 ══════════════════════════════════════════════════════════════════════════════ */
const WizardModal = ProviderWizardModal;

/* ══════════════════════════════════════════════════════════════════════════════
   MANAGE (EDIT) MODAL
══════════════════════════════════════════════════════════════════════════════ */
const ManageModal = ({ form, setForm, saving, branches, onClose, onSave }) => {
  const F = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const FA = (obj) => setForm(prev => ({ ...prev, address: { ...prev.address, ...obj } }));
  const FW = (obj) => setForm(prev => ({ ...prev, workingHours: { ...prev.workingHours, ...obj } }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900">Manage {form.providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Update {form.providerType === 'Laboratory' ? 'laboratory' : 'pharmacy'} details and configuration</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={`${form.providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'} Name`} required><Input value={form.name} onChange={e => F('name', e.target.value)} /></Field>
            <Field label="Ownership"><Select value={form.providerSubtype} onChange={e => F('providerSubtype', e.target.value)}><option value="Internal">Internal</option><option value="External">External</option></Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Manager Name"><Input value={form.contactPerson} onChange={e => F('contactPerson', e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e => F('phone', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><Input type="email" value={form.email} onChange={e => F('email', e.target.value)} /></Field>
            <Field label="Branch"><Select value={form.assignedBranches?.[0] || ''} onChange={e => F('assignedBranches', [e.target.value])}><option value="">Select</option>{branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</Select></Field>
          </div>
          <Field label="Address"><Input value={form.address?.line1} onChange={e => FA({ line1: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="City" value={form.address?.city} onChange={e => FA({ city: e.target.value })} />
            <Input placeholder="State" value={form.address?.state} onChange={e => FA({ state: e.target.value })} />
            <Input placeholder="Pincode" value={form.address?.pincode} onChange={e => FA({ pincode: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Opening Time"><Input type="time" value={form.workingHours?.openingTime} onChange={e => FW({ openingTime: e.target.value })} /></Field>
            <Field label="Closing Time"><Input type="time" value={form.workingHours?.closingTime} onChange={e => FW({ closingTime: e.target.value })} /></Field>
          </div>
          <Field label="Status"><Select value={form.status} onChange={e => F('status', e.target.value)}><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Suspended">Suspended</option></Select></Field>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-blue-200">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   IMPORT MODAL
══════════════════════════════════════════════════════════════════════════════ */
const ImportModal = ({ importQuery, setImportQuery, importResult, importSearching, onSearch, onLink, onClose }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Import Existing Pharmacy</h3>
          <p className="text-xs text-slate-400 mt-0.5">Search by Provider ID, GST, Phone, Email, or Clinic name</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search pharmacy..."
              value={importQuery}
              onChange={e => setImportQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button onClick={onSearch} disabled={importSearching}
            className="px-4 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
            {importSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>

        {importResult === 'NOT_FOUND' && (
          <div className="text-center py-6 text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="font-semibold">No provider found matching your search.</p>
          </div>
        )}

        {importResult && importResult !== 'NOT_FOUND' && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGrad(importResult.name)} flex items-center justify-center text-white font-black`}>
                {initials(importResult.name)}
              </div>
              <div>
                <p className="font-black text-slate-900">{importResult.name}</p>
                <p className="text-xs text-blue-600 font-semibold">{importResult.globalId}</p>
              </div>
              <span className={`ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold ${statusColor[importResult.status] ?? ''}`}>{importResult.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div><span className="font-bold text-slate-400">Phone: </span>{importResult.phone}</div>
              <div><span className="font-bold text-slate-400">City: </span>{importResult.address?.city}</div>
            </div>
            <button onClick={onLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition">
              <Link2 className="w-4 h-4" /> Link to This Clinic
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default ProvidersPage;
