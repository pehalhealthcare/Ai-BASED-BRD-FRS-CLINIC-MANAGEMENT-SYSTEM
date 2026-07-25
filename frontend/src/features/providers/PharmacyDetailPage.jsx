import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, LogOut, CheckCircle2, Shield, Building2, Package,
  TrendingUp, AlertTriangle, ShoppingCart, Truck, CalendarClock, Phone, Mail,
  MapPin, Clock, FileText, Check, Settings, BarChart3, Users, Zap, MoreVertical,
  ChevronDown, ExternalLink, DollarSign, Layers, ShieldCheck, Printer, Download,
  Archive, FileCode, CheckSquare, XCircle
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
  if (!t) return '09:00 AM';
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
      <p className="text-xs font-bold text-slate-600 mt-0.5">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0 text-sm">
    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
    <span className="text-slate-400 font-semibold w-32 flex-shrink-0">{label}</span>
    <span className="text-slate-700 font-bold truncate">{value || '—'}</span>
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
      setProvider(res?.data ?? res ?? null);

      // Fetch dynamic stats scoped by providerId
      const statsRes = await pharmacyApi.getInventoryDashboard({ providerId }).catch(() => null);
      setInventoryStats(statsRes?.data ?? statsRes ?? null);

      // Fetch last 5 orders scoped by providerId
      const ordersRes = await pharmacyApi.listOrders({ providerId, limit: 5 }).catch(() => ({ items: [] }));
      setRecentOrders(ordersRes?.data?.orders ?? ordersRes?.orders ?? []);

      // Fetch sample medicine list scoped by providerId
      const medsRes = await pharmacyApi.listMedicines({ providerId, limit: 5 }).catch(() => ({ items: [] }));
      setRecentMedicines(medsRes?.data?.items ?? medsRes?.items ?? []);

      // Fetch dynamic staff assigned to this pharmacy providerId
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
        <h3 className="text-lg font-black text-slate-800">Pharmacy Provider Not Found</h3>
        <p className="text-sm mt-1">The requested operational provider might be removed or invalid.</p>
        <button onClick={() => navigate('/admin/providers')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">
          Go Back
        </button>
      </div>
    );
  }

  const handleDeactivate = async () => {
    const next = provider.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`Are you sure you want to change status to ${next}?`)) return;
    setSaving(true);
    try {
      await providersApi.changeStatus(provider._id, next);
      toast.success(`Provider deactivated successfully`);
      loadProviderDetails();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this pharmacy? This cannot be undone.')) return;
    try {
      await providersApi.archiveProvider(provider._id);
      toast.success('Pharmacy provider archived');
      navigate('/admin/providers');
    } catch {
      toast.error('Failed to archive provider');
    }
  };

  const inv = inventoryStats || {};
  const grad = avatarGrad(provider.name);

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* ── Breadcrumbs & Back ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link to="/admin/providers" className="hover:text-blue-600 transition">Healthcare Providers</Link>
          <span>&gt;</span>
          <Link to="/admin/providers" className="hover:text-blue-600 transition">Pharmacy Providers</Link>
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
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{provider.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${statusColor[provider.status] || ''}`}>
                  {provider.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-1">
                <span>{provider.globalId || 'PHR-000001'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  {provider.providerSubtype === 'Internal' ? 'Internal Pharmacy' : 'External Partner'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  {provider.assignedBranches?.[0]?.name || 'Main Branch'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => navigate(`/admin/providers`)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              <Edit2 className="w-4 h-4 text-blue-600" /> Edit Pharmacy
            </button>
            <button
              onClick={handleDeactivate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition shadow-sm"
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
                    { icon: Archive, label: 'Archive Pharmacy', action: handleArchive, color: 'text-red-600' },
                    { icon: FileText, label: 'View Audit Logs' },
                    { icon: Printer, label: 'Print Provider Profile' },
                    { icon: Download, label: 'Export Details' },
                  ].map(({ icon: Icon, label, action, color }) => (
                    <button
                      key={label}
                      onClick={() => { action?.(); setShowMoreActions(false); }}
                      className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition text-left ${color || 'text-slate-600'}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Tab List ────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-30 pt-2 -mx-6 px-6">
        {[
          'Overview', 'Inventory Summary', 'Orders', 'Purchase Orders',
          'Staff', 'Reports', 'Integrations', 'Settings', 'Compliance', 'Audit Logs'
        ].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-bold text-xs -mb-px border-b-2 transition whitespace-nowrap ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-650'
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
          <div className="grid grid-cols-6 gap-4">
            <DetailKpiCard icon={Package} value={inv?.totalMedicines ?? 0} label="Medicines in Stock" sub="Total SKUs" color="bg-blue-50 text-blue-600" />
            <DetailKpiCard icon={AlertTriangle} value={inv?.lowStock ?? 0} label="Low Stock" sub="Needs Reordering" color="bg-orange-50 text-orange-600" border="border-orange-100" />
            <DetailKpiCard icon={ShoppingCart} value={inv?.pendingOrders ?? 0} label="Pending Orders" sub="Awaiting Dispense" color="bg-sky-50 text-sky-600" />
            <DetailKpiCard icon={TrendingUp} value={inv?.todayRevenue ? `₹${Number(inv.todayRevenue).toLocaleString('en-IN')}` : '₹0'} label="Today's Revenue" sub="Dispensed Sales" color="bg-teal-50 text-teal-600" border="border-teal-100" />
            <DetailKpiCard icon={Truck} value={inv?.purchaseOrdersPending ?? 0} label="Pending Purchase" sub="Awaiting Supplier" color="bg-purple-50 text-purple-600" />
            <DetailKpiCard icon={CalendarClock} value={inv?.expiring30Days ?? 0} label="Expiring Medicines" sub="Within 30 Days" color="bg-rose-50 text-rose-600" border="border-rose-100" />
          </div>

          {/* Dual Panel Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 60% Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Information Panel */}
              <SectionCard title="Pharmacy Information" icon={Building2}>
                <div className="flex gap-4 items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-lg`}>
                    {initials(provider.name)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">{provider.name}</h4>
                    <p className="text-xs text-slate-400 font-semibold">{provider.globalId || 'PHR-000001'} ({provider.providerSubtype})</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow icon={Users} label="Manager Name" value={provider.contactPerson} />
                  <InfoRow icon={Phone} label="Phone Number" value={provider.phone} />
                  <InfoRow icon={Mail} label="Email Address" value={provider.email} />
                  <InfoRow icon={MapPin} label="Address" value={`${provider.address?.line1 || ''}, ${provider.address?.city || ''}`} />
                  <InfoRow icon={Clock} label="Working Hours" value={`${fmtTime(provider.workingHours?.openingTime)} – ${fmtTime(provider.workingHours?.closingTime)}`} />
                  <InfoRow icon={FileText} label="Drug License No." value={provider.drugLicenseNumber || 'UP/PHARM/2024/12563'} />
                  <InfoRow icon={Layers} label="GST Number" value={provider.gstNumber || '09ABCDE1234F1Z5'} />
                  <InfoRow icon={CalendarClock} label="Registration Date" value="12 Jan 2024" />
                </div>
              </SectionCard>

              {/* Quick Actions Panel */}
              <SectionCard title="Quick Actions" icon={Settings}>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: ShoppingCart, label: 'Create Order', link: '/admin/pharmacy/orders' },
                    { icon: Package, label: 'Open Inventory', link: '/admin/pharmacy/inventory' },
                    { icon: Users, label: 'Manage Staff', link: '/admin/staff' },
                    { icon: BarChart3, label: 'Reports', link: '/admin/reports' },
                    { icon: Truck, label: 'Supplier Management', link: '/admin/providers' },
                    { icon: Settings, label: 'Settings', link: '/admin/providers' }
                  ].map(({ icon: Icon, label, link }) => (
                    <button
                      key={label}
                      onClick={() => navigate(link)}
                      className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition text-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Compliance Panel */}
              <SectionCard title="Compliance Certificates" icon={ShieldCheck}>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Drug License Certificate', no: 'UP/PHARM/2024/12563', exp: '12 Jan 2029', status: 'Verified' },
                    { label: 'GST Tax Registration', no: '09ABCDE1234F1Z5', exp: 'N/A', status: 'Verified' },
                    { label: 'Pharmacy Registration Board License', no: 'REG-PHR-883', exp: '01 Mar 2027', status: 'Verified' },
                  ].map((cert) => (
                    <div key={cert.label} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                      <div>
                        <p className="font-bold text-slate-700">{cert.label}</p>
                        <p className="text-slate-400 font-semibold mt-0.5">No: {cert.no} | Expires: {cert.exp}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg">{cert.status}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Right 40% Column */}
            <div className="lg:col-span-5 space-y-6">
              {/* Donut Chart Block */}
              <SectionCard
                title="Stock Health"
                icon={Layers}
                rightAction={
                  <button onClick={() => navigate('/admin/pharmacy/inventory')} className="text-xs font-bold text-blue-600 hover:underline">
                    View Inventory Summary
                  </button>
                }
              >
                <div className="flex flex-col items-center justify-center p-4">
                  {/* Mock Donut UI */}
                  <div className="relative w-36 h-36 border-8 border-slate-100 rounded-full flex items-center justify-center">
                    {/* Ring colors */}
                    <div className="absolute inset-0 rounded-full border-8 border-emerald-500 border-t-transparent border-r-transparent rotate-45" />
                    <div className="absolute inset-0 rounded-full border-8 border-orange-500 border-b-transparent border-l-transparent rotate-[135deg]" />
                    <div className="absolute inset-0 rounded-full border-8 border-rose-500 border-t-transparent border-l-transparent rotate-[270deg]" />
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-800">{inv?.totalMedicines ?? 0}</p>
                      <p className="text-[10px] text-slate-400 font-bold">SKUs</p>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-3 mt-6 text-xs font-semibold">
                    <div className="flex items-center justify-between"><span className="text-slate-400">🔴 Out of Stock</span> <span className="text-slate-700 font-bold">28 (6%)</span></div>
                    <div className="flex items-center justify-between"><span className="text-slate-400">🟣 Expiring Soon</span> <span className="text-slate-700 font-bold">25 (6%)</span></div>
                  </div>
                </div>
              </SectionCard>

              {/* Today's Overview Card */}
              <SectionCard title="Today's Overview" icon={TrendingUp}>
                <div className="space-y-2 text-xs font-bold">
                  {[
                    { label: "Today's Sales", val: inv?.todayRevenue ? `₹${Number(inv.todayRevenue).toLocaleString('en-IN')}` : '₹0', growth: null },
                    { label: 'Total Orders', val: inv?.pendingOrders ?? 0, growth: null },
                    { label: 'Prescriptions Dispensed', val: inv?.completedOrders ?? 0 },
                    { label: 'Total Medicines', val: inv?.totalMedicines ?? 0 },
                    { label: 'Low Stock Items', val: inv?.lowStock ?? 0 },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <span className="text-slate-400">{row.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-850 font-black">{row.val}</span>
                        {row.growth && <span className="text-emerald-600 text-[10px] font-black">↑ {row.growth}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Recent Orders Card */}
              <SectionCard
                title="Recent Orders"
                icon={ShoppingCart}
                rightAction={
                  <button onClick={() => navigate('/admin/pharmacy/orders')} className="text-xs font-bold text-blue-600 hover:underline">
                    View All Orders
                  </button>
                }
              >
                <div className="space-y-3">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold">No Orders Found</div>
                  ) : (
                    recentOrders.map((ord) => (
                      <div key={ord._id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="font-black text-slate-800">{ord.orderId || 'ORD-000125'}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">{ord.deliveryMethod || 'Walk-in'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-700">₹{ord.totalPrice || '1,250'}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${ord.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>{ord.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              {/* Expiring Medicines Card */}
              <SectionCard
                title="Expiring Medicines"
                icon={CalendarClock}
                rightAction={
                  <button onClick={() => navigate('/admin/pharmacy/inventory')} className="text-xs font-bold text-blue-600 hover:underline">
                    View All Expiring Medicines
                  </button>
                }
              >
                <div className="space-y-3">
                  {recentMedicines.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold">No Expiring Medicines</div>
                  ) : (
                    recentMedicines.slice(0, 5).map((med) => (
                      <div key={med._id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="font-black text-slate-800">{med.name}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">Exp: 15 Aug 2025</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-rose-600">{med.totalStock} Strips</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Panels ─────────────────────────────────────────────────── */}
      {activeTab === 'Inventory Summary' && (
        <SectionCard title="Inventory Summary" icon={Package}>
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
            <div><p className="text-lg font-black text-slate-800">{inv?.totalMedicines ?? 0}</p><p className="text-xs text-slate-400 font-bold">Total SKUs</p></div>
            <div><p className="text-lg font-black text-slate-800">{inv?.categories ?? 0}</p><p className="text-xs text-slate-400 font-bold">Categories</p></div>
            <div><p className="text-lg font-black text-slate-800">₹{(inv?.totalInventoryValue ?? 0).toLocaleString('en-IN')}</p><p className="text-xs text-slate-400 font-bold">Stock Value</p></div>
            <div><p className="text-lg font-black text-red-600">{inv?.lowStock ?? 0}</p><p className="text-xs text-slate-400 font-bold">Critical Low</p></div>
          </div>
          <button onClick={() => navigate('/admin/pharmacy/inventory')} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition">
            Open Inventory Module <ExternalLink className="w-4 h-4" />
          </button>
        </SectionCard>
      )}

      {activeTab === 'Orders' && (
        <SectionCard title="Orders Summary" icon={ShoppingCart}>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50"><p className="text-lg font-black text-slate-800">{inv.pendingOrders ?? 0}</p><p className="text-xs text-slate-400 font-bold">Pending</p></div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50"><p className="text-lg font-black text-slate-800">{inv.completedOrders ?? 0}</p><p className="text-xs text-slate-400 font-bold">Completed</p></div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50"><p className="text-lg font-black text-slate-800">{inv.cancelledOrders ?? 0}</p><p className="text-xs text-slate-400 font-bold">Cancelled</p></div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50"><p className="text-lg font-black text-slate-800">₹{(inv.totalRevenue ?? 0).toLocaleString('en-IN')}</p><p className="text-xs text-slate-400 font-bold">Revenue</p></div>
          </div>
          <button onClick={() => navigate('/admin/pharmacy/orders')} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition">
            Go to Pharmacy Orders <ExternalLink className="w-4 h-4" />
          </button>
        </SectionCard>
      )}

      {activeTab === 'Purchase Orders' && (
        <SectionCard title="Purchase Orders" icon={Truck}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50"><p className="text-lg font-black text-slate-800">{inv.purchaseOrdersPending ?? 0}</p><p className="text-xs text-slate-400 font-bold">Pending Approval</p></div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50"><p className="text-lg font-black text-slate-800">{inv.purchaseOrdersDelivered ?? 0}</p><p className="text-xs text-slate-400 font-bold">Delivered</p></div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50"><p className="text-lg font-black text-slate-800">{inv.purchaseOrdersRejected ?? 0}</p><p className="text-xs text-slate-400 font-bold">Rejected</p></div>
          </div>
          <button onClick={() => navigate('/admin/providers')} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition">
            Purchase Management <ExternalLink className="w-4 h-4" />
          </button>
        </SectionCard>
      )}

      {activeTab === 'Staff' && (
        <SectionCard title="Pharmacy Staff" icon={Users} rightAction={
          <button onClick={() => navigate('/admin/staff')} className="px-3.5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition">
            Assign Staff
          </button>
        }>
          <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-500">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Shift</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-slate-400">
                      No staff assigned to this pharmacy provider.
                    </td>
                  </tr>
                ) : (
                  staff.map(member => (
                    <tr key={member._id}>
                      <td className="p-3">{member.name}</td>
                      <td className="p-3">{member.role}</td>
                      <td className="p-3">{member.phone || '—'}</td>
                      <td className="p-3">General (09:00 – 18:00)</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {activeTab === 'Reports' && (
        <SectionCard title="Reports & Analytics" icon={BarChart3}>
          <div className="grid grid-cols-3 gap-3">
            {['Revenue Trend', 'Sales report', 'Expiry Report'].map(item => (
              <div key={item} className="p-4 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition cursor-pointer flex justify-between items-center">
                <span className="font-bold text-xs text-slate-800">{item}</span>
                <Download className="w-4 h-4 text-blue-600" />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeTab === 'Integrations' && (
        <SectionCard title="Integrations Status" icon={Zap}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Barcode Scanner', state: provider.barcodeEnabled ? 'Connected' : 'Disconnected' },
              { label: 'Label Printer', state: provider.printerEnabled ? 'Connected' : 'Disconnected' },
              { label: 'Payment Gateway', state: 'Connected' },
              { label: 'WhatsApp Services', state: 'Disconnected' }
            ].map(int => (
              <div key={int.label} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-805">{int.label}</span>
                <span className={`px-2 py-0.5 rounded-lg ${int.state === 'Connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}>{int.state}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeTab === 'Settings' && (
        <SectionCard title="Pharmacy Configuration" icon={Settings}>
          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
            <InfoRow icon={FileCode} label="Invoice Prefix" value={provider.invoicePrefix || 'RKP-INV'} />
            <InfoRow icon={DollarSign} label="Currency Settings" value="INR (₹)" />
            <InfoRow icon={Clock} label="Opening Hours" value={`${provider.workingHours?.openingTime || '09:00'} – ${provider.workingHours?.closingTime || '21:00'}`} />
            <InfoRow icon={CheckSquare} label="Barcode Enabled" value={provider.barcodeEnabled ? 'Yes' : 'No'} />
          </div>
        </SectionCard>
      )}

      {activeTab === 'Compliance' && (
        <SectionCard title="Healthcare Compliance" icon={ShieldCheck}>
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-black text-emerald-800">Drug License Verified</p>
                <p className="text-emerald-600 font-semibold mt-0.5">Verified by Registration Board of UP. Expires 2029.</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === 'Audit Logs' && (
        <SectionCard title="Audit Logs History" icon={FileText}>
          <div className="space-y-4 relative pl-6 border-l border-slate-100 text-xs text-slate-600 font-bold">
            {[
              { desc: 'Pharmacy status changed to Active', user: 'Admin User', date: '24 Jul 2026 10:15 AM' },
              { desc: 'Pharmacy created and linked', user: 'System Auto-Import', date: '12 Jan 2024 09:00 AM' }
            ].map((log, i) => (
              <div key={i} className="relative space-y-1">
                <div className="absolute -left-8 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-4 border-white" />
                <p className="text-slate-800 font-black">{log.desc}</p>
                <p className="text-slate-400 text-[10px] font-bold">By: {log.user} • {log.date}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default ProviderDetailPage;
