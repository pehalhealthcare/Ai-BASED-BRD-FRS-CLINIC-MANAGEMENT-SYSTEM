import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Package, AlertTriangle, Clock, TrendingUp, IndianRupee,
  ChevronDown, Download, Eye, PencilLine, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Filter,
  ArrowUpRight, ChevronRight, X,
  ArrowLeft, MoreVertical, Printer,
  Beaker, FlaskConical, Microscope,
  SlidersHorizontal, Upload, ArrowUpDown, ChevronLeft, Archive, TestTube
} from 'lucide-react';
import { providersApi, labApi } from '../../lib/api';
import toast from 'react-hot-toast';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
};

const getConsumableStatus = (item) => {
  if (!item.totalStock || item.totalStock === 0) return 'out';
  const d = daysUntil(item.batches?.[0]?.expiryDate);
  if (d !== null && d < 0) return 'expired';
  if (d !== null && d <= 30) return 'expiring';
  if (item.totalStock <= (item.reorderLevel || 5)) return 'low';
  return 'in';
};

const STATUS_CONFIG = {
  in:       { label: 'In Stock',      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  low:      { label: 'Low Stock',     cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  out:      { label: 'Out of Stock',  cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  expiring: { label: 'Expiring Soon', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  expired:  { label: 'Expired',       cls: 'bg-red-50 text-red-700 border border-red-200' },
  active:   { label: 'Active',        cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

const CAT_CFG = {
  'Tests':        { icon: TestTube,          bg: 'bg-blue-100',    fg: 'text-blue-600'   },
  'Reagent':      { icon: FlaskConical,      bg: 'bg-purple-100',  fg: 'text-purple-600' },
  'Chemical':     { icon: FlaskConical,      bg: 'bg-violet-100',  fg: 'text-violet-600' },
  'Test Kit':     { icon: Beaker,            bg: 'bg-pink-100',    fg: 'text-pink-600'   },
  'Collection Tube': { icon: TestTube,       bg: 'bg-indigo-100',  fg: 'text-indigo-600' },
  'Slide':        { icon: SlidersHorizontal, bg: 'bg-teal-100',    fg: 'text-teal-600'   },
  'Needle':       { icon: Package,           bg: 'bg-slate-100',   fg: 'text-slate-600'  },
  'Syringe':      { icon: Package,           bg: 'bg-slate-100',   fg: 'text-slate-600'  },
  'Container':    { icon: Package,           bg: 'bg-sky-100',     fg: 'text-sky-600'    },
  'PPE':          { icon: Package,           bg: 'bg-orange-100',  fg: 'text-orange-600' },
  'Equipment':    { icon: Microscope,        bg: 'bg-teal-100',    fg: 'text-teal-600'   },
  'Other Consumable': { icon: Archive,       bg: 'bg-slate-100',   fg: 'text-slate-500'  },
};
const getCatCfg = (cat) => CAT_CFG[cat] || CAT_CFG['Other Consumable'];

/* ─── Skeleton Components ─────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse space-y-3">
    <div className="w-10 h-10 bg-slate-200 rounded-xl" />
    <div className="h-3 bg-slate-200 rounded w-1/2" />
    <div className="h-6 bg-slate-200 rounded w-1/3" />
    <div className="h-3 bg-slate-200 rounded w-2/3" />
  </div>
);

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[160, 80, 80, 80, 60, 60, 80, 80, 80, 70, 50].map((w, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className={`h-4 bg-slate-200 rounded`} style={{ width: w }} />
      </td>
    ))}
  </tr>
);

/* ─── KPI Card ────────────────────────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, iconBg, value, label, sub, valueColor = 'text-slate-800', loading }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
      <Icon className="w-5 h-5" />
    </div>
    {loading ? (
      <div className="space-y-2 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-3/4" />
      </div>
    ) : (
      <>
        <div>
          <p className={`text-2xl font-black ${valueColor}`}>{value ?? 0}</p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">{label}</p>
        </div>
        <p className="text-[11px] text-slate-400">{sub}</p>
      </>
    )}
  </div>
);

/* ─── Stock Adjustment Modal ──────────────────────────────────────────────── */
const AdjustModal = ({ item, onClose, onSave }) => {
  const [form, setForm] = useState({
    quantity: '',
    adjustmentType: 'Adjustment',
    reason: '',
    notes: '',
    batchId: item?.batches?.[0]?._id || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.quantity || isNaN(Number(form.quantity))) { toast.error('Enter a valid quantity'); return; }
    if (!form.batchId) { toast.error('No batch available for this item'); return; }
    setSaving(true);
    try {
      await labApi.adjustConsumableStock({
        consumableId: item._id,
        batchId: form.batchId,
        quantity: Number(form.quantity),
        adjustmentType: form.adjustmentType,
        reason: form.reason,
        notes: form.notes
      });
      toast.success('Stock adjusted successfully');
      onSave();
      onClose();
    } catch (e) { toast.error(e?.message || 'Failed to adjust stock'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-800">Stock Adjustment</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-800">{item?.name}</p>
            <p className="text-xs text-slate-500">Current Stock: {item?.totalStock ?? 0} {item?.unit || 'Units'}</p>
          </div>
        </div>
        {(item?.batches?.length > 1) && (
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Select Batch</label>
            <select value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
              {item.batches.map(b => (
                <option key={b._id} value={b._id}>{b.batchNumber} — Qty: {b.availableStock}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Adjustment Type</label>
            <select value={form.adjustmentType} onChange={e => setForm(f => ({ ...f, adjustmentType: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Adjustment', 'Stock In', 'Stock Out', 'Damage', 'Expired', 'Returned'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Quantity (±)</label>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              placeholder="e.g. -5 or 20"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1.5 block">Reason</label>
          <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="Reason for adjustment..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1.5 block">Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60">
            {saving ? 'Saving…' : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Add Consumable Modal ────────────────────────────────────────────────── */
const AddItemModal = ({ onClose, onSave }) => {
  const CATS = ['Test Kit','Reagent','Chemical','Collection Tube','Slide','Needle','Syringe','Container','PPE','Other Consumable'];
  const [form, setForm] = useState({ name:'', category:'Reagent', unit:'Units', reorderLevel:10, maximumStock:1000, batchNumber:'', expiryDate:'', quantity:0, purchasePrice:0 });
  const [saving, setSaving] = useState(false);
  const inp = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold';

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Item name is required'); return; }
    if (!form.batchNumber?.trim()) { toast.error('Batch number is required'); return; }
    if (!form.expiryDate) { toast.error('Expiry date is required'); return; }
    setSaving(true);
    try {
      const res = await labApi.createConsumable({ name: form.name, category: form.category, unit: form.unit, minimumStock: 0, reorderLevel: Number(form.reorderLevel), maximumStock: Number(form.maximumStock) });
      const id = res?.consumable?._id || res?._id;
      if (id && form.batchNumber) {
        await labApi.addConsumableBatch(id, { batchNumber: form.batchNumber, expiryDate: form.expiryDate, quantity: Number(form.quantity), purchasePrice: Number(form.purchasePrice), isOpeningStock: true });
      }
      toast.success('Item added successfully');
      onSave(); onClose();
    } catch(e) { toast.error(e?.message || 'Failed to add item'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-800">Add Inventory Item</h3>
            <p className="text-xs text-slate-400 mt-0.5">Add reagent, consumable, kit or other laboratory item</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Item Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Glucose Reagent" className={inp} /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Category *</label>
              <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} className={inp}>
                {CATS.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Unit</label>
              <input type="text" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="Units / Vials" className={inp} /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Reorder Level</label>
              <input type="number" value={form.reorderLevel} onChange={e=>setForm(f=>({...f,reorderLevel:e.target.value}))} min={0} className={inp} /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Max Stock</label>
              <input type="number" value={form.maximumStock} onChange={e=>setForm(f=>({...f,maximumStock:e.target.value}))} min={0} className={inp} /></div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Opening Batch</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Batch Number *</label>
                <input type="text" value={form.batchNumber} onChange={e=>setForm(f=>({...f,batchNumber:e.target.value}))} placeholder="e.g. B-240601" className={inp} /></div>
              <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Expiry Date *</label>
                <input type="date" value={form.expiryDate} onChange={e=>setForm(f=>({...f,expiryDate:e.target.value}))} className={inp} /></div>
              <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Opening Qty</label>
                <input type="number" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} min={0} className={inp} /></div>
              <div><label className="text-xs font-bold text-slate-600 mb-1.5 block">Purchase Price (₹)</label>
                <input type="number" value={form.purchasePrice} onChange={e=>setForm(f=>({...f,purchasePrice:e.target.value}))} min={0} className={inp} /></div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60">
            {saving ? 'Adding…' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
const TABS = ['All Inventory', 'Tests', 'Reagents', 'Consumables', 'Equipment', 'Kits', 'Calibrators', 'Controls', 'Others'];
const PAGE_SIZE = 10;

const CONSUMABLE_CAT_MAP = {
  Reagents:    ['Reagent', 'Chemical'],
  Consumables: ['Collection Tube', 'Slide', 'Needle', 'Syringe', 'Container', 'PPE', 'Other Consumable'],
  Kits:        ['Test Kit'],
};

const LaboratoryInventoryPage = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider]   = useState(null);
  const [stats, setStats]         = useState(null);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);

  const [activeTab, setActiveTab]       = useState('All Inventory');
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [adjustItem, setAdjustItem] = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [rowMenu, setRowMenu]       = useState(null);
  const addMenuRef = useRef(null);

  /* ── Data loaders ─────────────────────────────────────────────────────── */
  const loadProvider = useCallback(async () => {
    try {
      const res = await providersApi.getProvider(providerId);
      setProvider(res?.data ?? res ?? null);
    } catch { /* silent */ }
  }, [providerId]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await labApi.getInventoryDashboard();
      setStats(res?.data ?? res ?? {});
    } catch { setStats({}); }
    finally { setStatsLoading(false); }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      let merged = [];

      /* Tests tab or All Inventory */
      if (activeTab === 'All Inventory' || activeTab === 'Tests') {
        const p = { page, limit: PAGE_SIZE };
        if (search) p.search = search;
        const r = await labApi.listTests(p).catch(() => null);
        const tests = r?.tests ?? r?.data?.tests ?? [];
        merged = [
          ...merged,
          ...tests.map(t => ({
            _id: t._id, name: t.name, code: t.code || '—',
            category: 'Tests', sku: t.code || '—', batchNumber: '—',
            quantity: t.isActive ? '∞' : 0, unit: 'Tests',
            status: t.isActive ? 'active' : 'out',
            expiryDate: null,
            location: t.department || '—',
            stockValue: t.price ? `₹${Number(t.price).toLocaleString('en-IN')}` : '—',
            isTest: true, raw: t
          }))
        ];
      }

      /* Consumables / specific category tabs */
      const showConsumables = ['All Inventory', 'Reagents', 'Consumables', 'Kits', 'Others'].includes(activeTab) ||
                              !(activeTab === 'Tests' || activeTab === 'Equipment' || activeTab === 'Calibrators' || activeTab === 'Controls');
      if (showConsumables) {
        const p = { page, limit: PAGE_SIZE };
        if (search) p.search = search;
        if (activeTab !== 'All Inventory' && CONSUMABLE_CAT_MAP[activeTab]) {
          p.category = CONSUMABLE_CAT_MAP[activeTab].join(',');
        }
        const r = await labApi.listConsumables(p).catch(() => null);
        const consumables = r?.consumables ?? r?.data?.consumables ?? [];
        merged = [
          ...merged,
          ...consumables.map(c => {
            const st = getConsumableStatus(c);
            const batch = c.batches?.[0];
            const sv = (c.batches || []).reduce((acc, b) => acc + (b.availableStock || 0) * (b.purchasePrice || 0), 0);
            return {
              _id: c._id, name: c.name, code: c.sku || '—',
              category: c.category || 'Other Consumable', sku: c.sku || '—',
              batchNumber: batch?.batchNumber || '—',
              quantity: c.totalStock ?? 0, unit: c.unit || 'Units',
              status: st, expiryDate: batch?.expiryDate || null,
              location: c.storageLocation || '—',
              stockValue: sv > 0 ? fmt(sv) : '₹0',
              isTest: false, raw: c
            };
          })
        ];
      }

      /* Status filter */
      if (statusFilter) merged = merged.filter(i => i.status === statusFilter);

      setItems(merged);
      setTotal(merged.length);
    } catch (e) {
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, page, statusFilter]);

  useEffect(() => { loadProvider(); }, [loadProvider]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [activeTab, search, statusFilter]);
  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    const h = (e) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false);
      if (!e.target.closest('[data-rowmenu]')) setRowMenu(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50/40">
      {adjustItem && (
        <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)}
          onSave={() => { loadItems(); loadStats(); }} />
      )}
      {showAdd && (
        <AddItemModal onClose={() => setShowAdd(false)}
          onSave={() => { loadItems(); loadStats(); }} />
      )}

      <div className="p-6 max-w-[1700px] mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 flex-wrap">
          {[
            { label: 'Healthcare Providers', to: '/admin/providers' },
            { label: 'Laboratory Providers', to: '/admin/providers' },
            { label: provider?.name || 'Laboratory', to: `/admin/providers/${providerId}` },
            { label: 'Inventory', to: null },
          ].map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
              {crumb.to ? (
                <button onClick={() => navigate(crumb.to)} className="hover:text-blue-600 transition">{crumb.label}</button>
              ) : (
                <span className="text-slate-700 font-bold">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate(`/admin/providers/${providerId}`)}
              className="mt-1 p-2 rounded-xl hover:bg-white border border-slate-200 transition text-slate-500 shadow-sm">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Laboratory Inventory</h1>
              <p className="text-sm text-slate-400 mt-0.5 max-w-xl">
                Manage tests, reagents, consumables, equipment, kits, calibrators, controls and inventory resources.
              </p>
              {provider && (
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg border border-blue-100">{provider.name}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-lg">
                    {provider.providerCode || `LAB-${provider._id?.slice(-6)?.toUpperCase()}`}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    provider.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{provider.status || 'Active'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => toast.info('Select a row to adjust its stock')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition shadow-sm">
              <ArrowUpDown className="w-4 h-4" /> Stock Adjustment
            </button>
            <button onClick={() => toast.info('Stock Transfer coming soon')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition shadow-sm">
              <ArrowUpRight className="w-4 h-4" /> Stock Transfer
            </button>
            <div className="relative flex items-stretch" ref={addMenuRef}>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-l-xl hover:bg-blue-700 transition">
                <Plus className="w-4 h-4" /> Add Item
              </button>
              <button onClick={() => setShowAddMenu(v => !v)}
                className="px-2.5 py-2.5 bg-blue-700 text-white rounded-r-xl hover:bg-blue-800 transition border-l border-blue-500">
                <ChevronDown className="w-4 h-4" />
              </button>
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 py-1 overflow-hidden">
                  {['Add Test','Add Reagent','Add Consumable','Add Equipment','Add Kit','Add Calibrator','Add Control Material','Import from Global Catalogue'].map(opt => (
                    <button key={opt} onClick={() => { setShowAddMenu(false); setShowAdd(true); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-2">
                      {opt.startsWith('Import') ? <Upload className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard loading={statsLoading} icon={Package} iconBg="bg-blue-100 text-blue-600"
            value={stats?.totalConsumables ?? 0} label="Total Items" sub="All inventory items" />
          <KpiCard loading={statsLoading} icon={IndianRupee} iconBg="bg-emerald-100 text-emerald-600"
            value={fmt(stats?.totalValue)} label="Total Value" sub="Current stock value" valueColor="text-emerald-700" />
          <KpiCard loading={statsLoading} icon={AlertTriangle} iconBg="bg-amber-100 text-amber-600"
            value={stats?.lowStock ?? 0} label="Low Stock Items" sub="Items need attention"
            valueColor={(stats?.lowStock ?? 0) > 0 ? 'text-amber-600' : 'text-slate-800'} />
          <KpiCard loading={statsLoading} icon={XCircle} iconBg="bg-rose-100 text-rose-600"
            value={stats?.outOfStock ?? 0} label="Out of Stock" sub="Currently unavailable"
            valueColor={(stats?.outOfStock ?? 0) > 0 ? 'text-rose-600' : 'text-slate-800'} />
          <KpiCard loading={statsLoading} icon={Clock} iconBg="bg-orange-100 text-orange-600"
            value={stats?.expiring ?? 0} label="Expiring Soon" sub="Within 30 days"
            valueColor={(stats?.expiring ?? 0) > 0 ? 'text-orange-600' : 'text-slate-800'} />
          <KpiCard loading={statsLoading} icon={AlertCircle} iconBg="bg-red-100 text-red-600"
            value={stats?.expired ?? 0} label="Expired Items" sub="Already expired"
            valueColor={(stats?.expired ?? 0) > 0 ? 'text-red-600' : 'text-slate-800'} />
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Category Tabs */}
          <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3.5 text-xs font-bold whitespace-nowrap transition border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50 flex-wrap">
            <div className="relative flex-1 min-w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by item name, code, category, brand, supplier..."
                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option value="">All Status</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
            <button
              onClick={() => { loadItems(); loadStats(); toast.success('Refreshed'); }}
              className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toast.info('Export — use server-side export endpoint')}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {['Item Details','Category','SKU / Code','Batch No.','Quantity','Unit','Status','Expiry Date','Location','Stock Value','Actions'].map(c => (
                    <th key={c} className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-[10px]">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      <Package className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="font-bold text-slate-500 text-sm">No inventory items found</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {search ? 'Try a different search term' : 'Add your first item to get started'}
                      </p>
                      <button onClick={() => setShowAdd(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition">
                        + Add Item
                      </button>
                    </td>
                  </tr>
                ) : items.map(item => {
                  const cfg = getCatCfg(item.category);
                  const CatIcon = cfg.icon;
                  const sCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.in;
                  const d = item.expiryDate ? daysUntil(item.expiryDate) : null;
                  return (
                    <tr key={item._id} className="hover:bg-blue-50/20 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.fg}`}>
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs leading-tight">{item.name}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">{item.raw?.manufacturer || item.raw?.brand || item.raw?.department || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-semibold whitespace-nowrap">{item.category}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{item.sku}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[10px] whitespace-nowrap">{item.batchNumber}</td>
                      <td className="px-4 py-3.5 font-black text-slate-800">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-slate-500 font-semibold">{item.unit}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${sCfg.cls}`}>{sCfg.label}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.expiryDate ? (
                          <span className={d !== null && d <= 30 ? 'text-orange-600 font-bold' : 'text-slate-500'}>
                            {fmtDate(item.expiryDate)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-semibold whitespace-nowrap">{item.location}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-700 whitespace-nowrap">{item.stockValue}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => toast.info(`View: ${item.name}`)}
                            className="p-1.5 hover:bg-blue-100 text-slate-400 hover:text-blue-700 rounded-lg transition" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {!item.isTest && (
                            <button onClick={() => setAdjustItem(item.raw)}
                              className="p-1.5 hover:bg-amber-100 text-slate-400 hover:text-amber-700 rounded-lg transition" title="Adjust Stock">
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="relative" data-rowmenu>
                            <button onClick={() => setRowMenu(rowMenu === item._id ? null : item._id)}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {rowMenu === item._id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-30 py-1">
                                {[
                                  { icon: Eye, label: 'View Details', fn: () => toast.info(`View: ${item.name}`) },
                                  { icon: PencilLine, label: 'Edit Item', fn: () => toast.info(`Edit: ${item.name}`) },
                                  { icon: Printer, label: 'Print Barcode', fn: () => toast.info('Print barcode...') },
                                  { icon: ArrowUpRight, label: 'Transfer Stock', fn: () => toast.info('Transfer coming soon') },
                                ].map(({ icon: Icon, label, fn }) => (
                                  <button key={label} onClick={() => { fn(); setRowMenu(null); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}
                                  </button>
                                ))}
                                <div className="border-t border-slate-50 mt-1 pt-1">
                                  <button onClick={() => { toast.error(`Confirm delete: ${item.name}`); setRowMenu(null); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2">
                                    <XCircle className="w-3.5 h-3.5" /> Delete Item
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-semibold">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of{' '}
                <span className="font-black text-slate-700">{total}</span> results
              </p>
              <div className="flex items-center gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => (
                  <button key={i+1} onClick={() => setPage(i+1)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition ${page === i+1 ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-200 text-slate-600'}`}>
                    {i+1}
                  </button>
                ))}
                {totalPages > 5 && <span className="text-slate-400 font-bold text-xs px-1">…</span>}
                {totalPages > 5 && (
                  <button onClick={() => setPage(totalPages)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition ${page === totalPages ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-200 text-slate-600'}`}>
                    {totalPages}
                  </button>
                )}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaboratoryInventoryPage;

