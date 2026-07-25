import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, LogOut, CheckCircle2, Shield, Building2, Package,
  TrendingUp, AlertTriangle, ShoppingCart, Truck, CalendarClock, Phone, Mail,
  MapPin, Clock, FileText, Check, Settings, BarChart3, Users, Zap, MoreVertical,
  ChevronDown, ExternalLink, RefreshCw, Layers, ShieldCheck, Printer, Download,
  Archive, FileCode, CheckSquare, XCircle, DollarSign, FileSpreadsheet, Activity
} from 'lucide-react';
import { providersApi, pharmacyApi, userApi } from '../../lib/api';
import toast from 'react-hot-toast';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const statusColor = {
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-slate-100 text-slate-500',
  Suspended: 'bg-red-100 text-red-600',
};

const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const AVATAR_PALETTE = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-600',
];

const avatarGrad = (name = '') =>
  AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

const fmtTime = (t = '') => {
  if (!t) return '08:00 AM';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */
const DetailKpiCard = ({ icon: Icon, value, label, sub, color, border }) => (
  <div className={`bg-white rounded-2xl border ${border || 'border-slate-100'} p-4 shadow-sm flex items-start gap-4 transition-all hover:shadow-md`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h3 className="text-xl font-black text-slate-800">{value}</h3>
      <p className="text-xs font-bold text-slate-655 mt-0.5">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0 text-sm">
    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
    <span className="text-slate-400 font-semibold w-32 flex-shrink-0">{label}</span>
    <span className="text-slate-705 font-bold truncate">{value || '—'}</span>
  </div>
);

const SectionCard = ({ title, icon: Icon, children, rightAction }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-600" />}
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h4>
      </div>
      {rightAction}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
 ══════════════════════════════════════════════════════════════════════════════ */
const ProviderDetailPage = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentMedicines, setRecentMedicines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);

  const loadProviderDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await providersApi.getProvider(providerId);
      const provData = res?.data ?? res ?? null;
      setProvider(provData);

      // Use per-provider stats embedded in the provider document
      // For labs: provider.stats contains per-lab stats populated by getProviders
      // For pharmacies: fetch inventory dashboard scoped to this provider
      let statsData = null;
      if (provData?.providerType === 'Laboratory') {
        // Use per-provider stats from the provider document itself
        statsData = provData?.stats ?? null;
      } else {
        const statsRes = await pharmacyApi.getInventoryDashboard({ providerId }).catch(() => null);
        statsData = statsRes?.data ?? statsRes ?? null;
      }
      setInventoryStats(statsData);

      // Fetch last 5 orders
      const ordersRes = await pharmacyApi.listOrders({ providerId, limit: 5 }).catch(() => ({ items: [] }));
      setRecentOrders(ordersRes?.data?.orders ?? ordersRes?.orders ?? []);

      // Fetch sample medicine list
      const medsRes = await pharmacyApi.listMedicines({ limit: 5 }).catch(() => ({ items: [] }));
      setRecentMedicines(medsRes?.data?.items ?? medsRes?.items ?? []);

      // Fetch staff operators
      const staffRes = await userApi.list({ providerId }).catch(() => ({ users: [] }));
      setStaff(staffRes?.data?.users ?? staffRes?.users ?? []);
    } catch {
      toast.error('Failed to load pharmacy details');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadProviderDetails();
  }, [loadProviderDetails]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-96 bg-slate-100 rounded-2xl" />
          <div className="h-96 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-12 text-center text-slate-400">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
        <h3 className="text-lg font-black text-slate-800">Operational Provider Not Found</h3>
        <p className="text-sm mt-1">The requested operational provider might be removed or invalid.</p>
        <button onClick={() => navigate('/admin/providers')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">
          Go Back
        </button>
      </div>
    );
  }

  const isLab = provider.providerType === 'Laboratory';

  const handleDeactivate = async () => {
    const next = provider.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`Are you sure you want to change status to ${next}?`)) return;
    setSaving(true);
    try {
      await providersApi.changeStatus(provider._id, next);
      toast.success(`Provider status changed to ${next}`);
      loadProviderDetails();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(`Are you sure you want to archive this ${isLab ? 'laboratory' : 'pharmacy'}? This cannot be undone.`)) return;
    try {
      await providersApi.archiveProvider(provider._id);
      toast.success(`${isLab ? 'Laboratory' : 'Pharmacy'} provider archived`);
      navigate('/admin/providers');
    } catch {
      toast.error('Failed to archive provider');
    }
  };

  const inv = provider.stats || inventoryStats || {};
  const grad = avatarGrad(provider.name);

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* ── Breadcrumbs & Back ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link to="/admin/providers" className="hover:text-blue-600 transition">Healthcare Providers</Link>
          <span>&gt;</span>
          <Link to="/admin/providers" className="hover:text-blue-600 transition">
            {isLab ? 'Laboratory Providers' : 'Pharmacy Providers'}
          </Link>
          <span>&gt;</span>
          <span className="text-slate-650 font-bold">{provider.name}</span>
        </div>

        {/* ── Header details row ──────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/providers')}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm text-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3.5">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                {provider.logo ? <img src={provider.logo} alt="" className="w-full h-full object-cover rounded-2xl" /> : initials(provider.name)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{provider.name}</h1>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${statusColor[provider.status] || ''}`}>
                    {provider.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-1">
                  <span>{provider.globalId || `${isLab ? 'LAB' : 'PHR'}-000001`}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    {isLab
                      ? (provider.providerSubtype === 'Internal' ? 'Internal Laboratory' : 'External Laboratory')
                      : (provider.providerSubtype === 'Internal' ? 'Internal Pharmacy' : 'External Partner')
                    }
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    {provider.assignedBranches?.[0]?.name || 'Ram\'s Dental Clinic'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => navigate(`/admin/providers`)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              <Edit2 className="w-4 h-4 text-blue-600" /> Edit {isLab ? 'Laboratory' : 'Pharmacy'}
            </button>
            <button
              onClick={handleDeactivate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-red-200 text-red-650 font-bold text-sm rounded-xl hover:bg-red-50 transition shadow-sm"
            >
              <LogOut className="w-4 h-4" /> Deactivate
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100"
              >
                More Actions <ChevronDown className="w-4 h-4" />
              </button>
              {showMoreActions && (
                <div className="absolute right-0 top-11 bg-white border border-slate-100 shadow-xl rounded-2xl z-50 w-52 overflow-hidden py-1.5">
                  {[
                    { icon: Users, label: 'Assign Manager' },
                    { icon: Building2, label: 'Transfer Branch' },
                    { icon: Archive, label: `Archive ${isLab ? 'Laboratory' : 'Pharmacy'}`, action: handleArchive, color: 'text-red-650' },
                    { icon: FileText, label: 'View Audit Logs' },
                    { icon: Printer, label: 'Print Profile' },
                    { icon: Download, label: 'Export Details' },
                  ].map(({ icon: Icon, label, action, color }) => (
                    <button
                      key={label}
                      onClick={() => { action?.(); setShowMoreActions(false); }}
                      className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition text-left ${color || 'text-slate-655'}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact details icons row in header */}
        <div className="mt-4 flex gap-6 items-center text-xs font-bold text-slate-550 border-t border-slate-100 pt-3 flex-wrap">
          <div className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> Manager: {provider.contactPerson || 'Rajesh Sharma'}</div>
          <div className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> Email: {provider.email || 'rajesh.sharma@rklab.com'}</div>
          <div className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> Phone: {provider.phone || '9879877897'}</div>
          <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> Address: {[provider.address?.city, provider.address?.state || 'Ghaziabad, Uttar Pradesh'].filter(Boolean).join(', ')}</div>
        </div>
      </div>

      {/* ── Sticky Tab List ────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-30 pt-2 -mx-6 px-6">
        {[
          'Overview', 'Inventory', 'Orders', 'Purchase Orders',
          'Staff', 'Reports', 'Integrations', 'Settings', 'Compliance', 'Audit Logs'
        ].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-bold text-xs -mb-px border-b-2 transition whitespace-nowrap ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-655'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tabs Content Switch ─────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* KPI Dashboard Cards */}
          {isLab ? (
            <div className="grid grid-cols-6 gap-4">
              <DetailKpiCard icon={Package} value={inv?.testsInInventory ?? 0} label="Tests in Inventory" sub="Total SKUs" color="bg-blue-50 text-blue-600" />
              <DetailKpiCard icon={TrendingUp} value={inv?.todayRevenue ? `₹${Number(inv.todayRevenue).toLocaleString('en-IN')}` : '₹0'} label="Today's Revenue" sub="Processed Invoices" color="bg-teal-50 text-teal-600" border="border-teal-100" />
              <DetailKpiCard icon={AlertTriangle} value={inv?.lowStockAlerts ?? 0} label="Low Stock" sub="Needs attention" color="bg-orange-50 text-orange-600" border="border-orange-100" />
              <DetailKpiCard icon={ShoppingCart} value={inv?.pendingOrders ?? 0} label="Pending Orders" sub="Awaiting collection" color="bg-sky-50 text-sky-600" />
              <DetailKpiCard icon={Layers} value={inv?.pendingTestOrders ?? 0} label="Pending Test Orders" sub="Sample collected" color="bg-purple-50 text-purple-600" />
              <DetailKpiCard icon={CalendarClock} value={inv?.expiringSoon ?? 0} label="Expiring Soon" sub="Within 30 days" color="bg-rose-50 text-rose-600" border="border-rose-100" />
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              <DetailKpiCard icon={Package} value={inv?.totalMedicines ?? 0} label="Medicines in Stock" sub="Total SKUs" color="bg-blue-50 text-blue-600" />
              <DetailKpiCard icon={AlertTriangle} value={inv?.lowStock ?? 0} label="Low Stock" sub="Needs Reordering" color="bg-orange-50 text-orange-600" border="border-orange-100" />
              <DetailKpiCard icon={ShoppingCart} value={inv?.pendingOrders ?? 0} label="Pending Orders" sub="Awaiting Dispense" color="bg-sky-50 text-sky-600" />
              <DetailKpiCard icon={TrendingUp} value={inv?.todayRevenue ? `₹${Number(inv.todayRevenue).toLocaleString('en-IN')}` : '₹0'} label="Today's Revenue" sub="Dispensed Sales" color="bg-teal-50 text-teal-600" border="border-teal-100" />
              <DetailKpiCard icon={Truck} value={inv?.purchaseOrdersPending ?? 0} label="Pending Purchase" sub="Awaiting Supplier" color="bg-purple-50 text-purple-600" />
              <DetailKpiCard icon={CalendarClock} value={inv?.expiring30Days ?? 0} label="Expiring Medicines" sub="Within 30 Days" color="bg-rose-50 text-rose-600" border="border-rose-100" />
            </div>
          )}

          {/* Dual/Triple Panel Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left 35% Column: Information & Address */}
            <div className="lg:col-span-4 space-y-6">
              {/* Information Card */}
              <SectionCard title={`${isLab ? 'Laboratory' : 'Pharmacy'} Information`} icon={Building2}>
                <div className="grid grid-cols-1 gap-y-1 text-xs">
                  <InfoRow icon={Building2} label={`${isLab ? 'Laboratory' : 'Pharmacy'} Name`} value={provider.name} />
                  <InfoRow icon={Shield} label="Laboratory ID" value={provider.globalId || '—'} />
                  <InfoRow icon={Users} label="Ownership" value={provider.providerSubtype || '—'} />
                  <InfoRow icon={Layers} label="Laboratory Type" value={provider.apiProviderName || '—'} />
                  <InfoRow icon={Building2} label="Branch" value="Main Branch" />
                  <InfoRow icon={FileText} label="License Number" value={provider.drugLicenseNumber || '—'} />
                  <InfoRow icon={CalendarClock} label="License Expiry" value="12 Jan 2026" />
                  <InfoRow icon={Layers} label="GST Number" value={provider.gstNumber || '—'} />
                  <InfoRow icon={Clock} label="Working Days" value="Monday - Sunday" />
                  <InfoRow icon={Clock} label="Working Hours" value="08:00 AM - 08:00 PM" />
                  <InfoRow icon={CalendarClock} label="Established On" value="12 Jan 2024" />
                  <InfoRow icon={CheckCircle2} label="Status" value={provider.status} />
                </div>
              </SectionCard>

              {/* Address Card */}
              <SectionCard title="Address" icon={MapPin}>
                <div className="flex gap-4 items-start text-xs font-bold text-slate-700">
                  <div className="space-y-1 flex-1">
                    <p className="font-black text-slate-900">{provider.name}</p>
                    <p className="text-slate-400 font-semibold">Main Branch</p>
                    <p>{provider.address?.line1 || '—'}</p>
                    <p>{provider.address?.city || '—'}, {provider.address?.state || '—'} - {provider.address?.pincode || '—'}</p>
                    <p>India</p>
                  </div>
                  {/* Small map placeholder preview */}
                  <div className="w-32 h-24 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-black">Map View</span>
                    <div className="absolute w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white animate-bounce" />
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Center 40% Column: Manager & Operational Summary */}
            <div className="lg:col-span-4 space-y-6">
              {/* Manager Details Card */}
              <SectionCard title="Manager Details" icon={Users}>
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">
                    {initials(provider.contactPerson || '—')}
                  </div>
                  <div>
                    <h5 className="font-black text-slate-800 text-sm">{provider.contactPerson || '—'}</h5>
                    <p className="text-[10px] text-slate-400 font-bold">Lab Manager</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-y-1 text-xs">
                  <InfoRow icon={Users} label="Manager Name" value={provider.contactPerson || '—'} />
                  <InfoRow icon={Phone} label="Phone" value={provider.phone || '—'} />
                  <InfoRow icon={Mail} label="Email" value={provider.email || '—'} />
                  <InfoRow icon={Shield} label="Employee ID" value="—" />
                </div>
              </SectionCard>

              {/* Operational Summary Card */}
              <SectionCard title="Operational Summary" icon={Activity}>
                <div className="grid grid-cols-1 gap-y-1 text-xs">
                  <InfoRow icon={Users} label="Total Staff" value={staff.length || 0} />
                  <InfoRow icon={Package} label="Tests in Inventory" value={inv.testsInInventory ?? 0} />
                  <InfoRow icon={Settings} label="Total Equipments" value="0" />
                  <InfoRow icon={ShoppingCart} label="Active Orders" value={inv.pendingOrders ?? 0} />
                  <InfoRow icon={CheckCircle2} label="Completed Orders" value="0" />
                  <InfoRow icon={TrendingUp} label="Today's Revenue" value={`₹${Number(inv.todayRevenue || 0).toLocaleString()}`} />
                  <InfoRow icon={DollarSign} label="This Month Revenue" value={`₹${Number(inv.todayRevenue || 0).toLocaleString()}`} />
                </div>
              </SectionCard>
            </div>

            {/* Right 45% Column: Recent Activity & Quick Actions */}
            <div className="lg:col-span-4 space-y-6">
              {/* Recent Activity Card */}
              <SectionCard title="Recent Activity" icon={Clock} rightAction={<button className="text-xs text-blue-600 font-bold hover:underline">View All</button>}>
                <div className="space-y-4 relative pl-5 border-l border-slate-100 text-xs text-slate-655 font-bold">
                  <div className="relative space-y-0.5">
                    <div className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                    <p className="text-slate-800 font-bold">Laboratory status verified as {provider.status}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Active</p>
                  </div>
                </div>
              </SectionCard>

              {/* Quick Actions Card */}
              <SectionCard title="Quick Actions" icon={Settings}>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: Package, label: 'Manage Inventory', link: `/admin/providers/${providerId}/inventory` },
                    { icon: ShoppingCart, label: 'View Orders', link: `/admin/providers/${providerId}/orders` },
                    { icon: Users, label: 'View Staff', link: '/admin/staff' },
                    { icon: BarChart3, label: 'View Reports', link: `/admin/providers/${providerId}/reports` },
                    { icon: Zap, label: 'Integrations', link: `/admin/providers` },
                    { icon: FileText, label: 'Audit Logs', link: `/admin/providers` }
                  ].map(({ icon: Icon, label, link }) => (
                    <button
                      key={label}
                      onClick={() => navigate(link)}
                      className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition gap-1.5"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black text-slate-750 leading-tight block">{label}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>
            </div>

          </div>

          {/* Documents & Licenses Card (Bottom full-width section) */}
          <SectionCard title="Document & License" icon={ShieldCheck} rightAction={<button className="text-xs text-blue-600 font-bold hover:underline">View All</button>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {[
                { label: 'Laboratory License', no: provider.drugLicenseNumber || '—', exp: '12 Jan 2026' },
                { label: 'GST Certificate', no: provider.gstNumber || '—', exp: '--' }
              ].map((doc) => (
                <div key={doc.label} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="font-black text-slate-800">{doc.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{doc.no}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{doc.exp}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Alternate Tab Panels ─────────────────────────────────────────── */}
      {activeTab !== 'Overview' && (
        <SectionCard title={activeTab} icon={Package}>
          <div className="p-10 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <h4 className="font-black text-slate-700">{activeTab} Details Compiled</h4>
            <p className="text-xs text-slate-400 mt-1">Real-time database records for {activeTab} can be adjusted by editing or printing the workspace file.</p>
            <button
              onClick={() => toast.success(`Exporting ${activeTab} data...`)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition"
            >
              Export Dataset
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default ProviderDetailPage;
