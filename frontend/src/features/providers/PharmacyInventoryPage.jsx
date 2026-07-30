import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plus, Search, Package, AlertTriangle, Clock, TrendingUp, IndianRupee,
  ChevronDown, Download, Eye, PencilLine, RefreshCw, ShoppingCart,
  CheckCircle2, XCircle, AlertCircle, Pill, BarChart2, Filter,
  ArrowUpRight, ClipboardList, ChevronRight, Truck, FileText, Check, X,
  Layers, ArrowLeft, MoreVertical, Printer, Settings, Calendar
} from 'lucide-react';
import { providersApi, pharmacyApi } from '../../lib/api';
import toast from 'react-hot-toast';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getStockStatus = (medicine) => {
  if (!medicine.totalStock || medicine.totalStock === 0) return 'out';
  const expiryDate = medicine.batches?.find(b => b.availableStock > 0)?.expiryDate;
  if (expiryDate) {
    const days = daysUntil(expiryDate);
    if (days !== null && days <= 90) return 'expiring';
  }
  if (medicine.totalStock <= (medicine.reorderLevel || 10)) return 'low';
  return 'in';
};

const STATUS_CONFIG = {
  in:       { label: 'In Stock',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-250' },
  low:      { label: 'Low Stock',     cls: 'bg-amber-50 text-amber-700 border-amber-250' },
  out:      { label: 'Out of Stock',  cls: 'bg-rose-50 text-rose-700 border-rose-250' },
  expiring: { label: 'Expiring Soon', cls: 'bg-orange-50 text-orange-700 border-orange-250' },
};

/* ─── Skeleton Card Loader ────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse space-y-3">
    <div className="w-10 h-10 bg-slate-200 rounded-xl" />
    <div className="h-4 bg-slate-200 rounded w-1/2" />
    <div className="h-6 bg-slate-200 rounded w-1/3" />
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
const PharmacyInventoryPage = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [provider, setProvider] = useState(null);
  const [activeTab, setActiveTab] = useState('Stock'); // 'Stock' | 'Global' | 'PO' | 'Alerts'
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [ledgers, setLedgers] = useState([]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  // Modals & Forms
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [addMode, setAddMode] = useState(''); // 'local' | 'global'
  const [saving, setSaving] = useState(false);

  // Forms payload
  const emptyMedicineForm = {
    name: '', genericName: '', brandName: '', composition: '', manufacturer: '',
    category: 'Antibiotics', form: 'Tablet', strength: '500 mg', packSize: '10 Tablets',
    barcode: '', purchasePrice: 0, sellingPrice: 0, unitPrice: 0, gst: 18,
    distributor: '', reorderLevel: 10, minimumStock: 10, maximumStock: 1000,
    storageLocation: 'Room Temp', rackNumber: '', requiresPrescription: true,
    initialBatchNumber: '', initialBatchExpiry: '', initialBatchQuantity: 0
  };
  const [medicineForm, setMedicineForm] = useState(emptyMedicineForm);

  // Global catalogue states
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalMedicines, setGlobalMedicines] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  /* ── Loading data ────────────────────────────────────────────────────────── */
  const loadProviderDetails = useCallback(async () => {
    try {
      const res = await providersApi.getProvider(providerId);
      setProvider(res?.data ?? res ?? null);
    } catch { toast.error('Failed to load pharmacy information'); }
  }, [providerId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch statistics
      const statsRes = await pharmacyApi.getInventoryDashboard({ providerId }).catch(() => null);
      setInventoryStats(statsRes?.data ?? statsRes ?? null);

      // 2. Fetch medicines
      const medsRes = await pharmacyApi.listMedicines({
        search, category: categoryFilter, page, limit: LIMIT,
        providerId
      });
      const data = medsRes?.data ?? medsRes ?? {};
      setMedicines(data.medicines || data.items || []);
      setTotal(data.pagination?.total ?? data.total ?? 0);

      // 3. Fetch Suppliers
      const supRes = await pharmacyApi.listSuppliers().catch(() => []);
      setSuppliers(supRes?.data ?? supRes ?? []);

      // 4. Fetch Purchase Orders
      const poRes = await pharmacyApi.listPurchaseOrders().catch(() => []);
      setPurchaseOrders(poRes?.data?.purchaseOrders ?? poRes?.purchaseOrders ?? []);

      // 5. Fetch Ledgers
      const ledgRes = await pharmacyApi.listLedgers().catch(() => []);
      setLedgers(ledgRes?.data?.ledgers ?? ledgRes ?? []);
    } catch {
      toast.error('Failed to load pharmacy inventory');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, page, providerId]);

  useEffect(() => {
    loadProviderDetails();
    loadData();
  }, [loadProviderDetails, loadData]);

  // Handle Global Catalogue Search
  const handleGlobalSearch = async () => {
    setGlobalLoading(true);
    try {
      const res = await pharmacyApi.listMedicineMasters({ search: globalSearch });
      setGlobalMedicines(res?.data?.masters ?? res?.masters ?? []);
    } catch {
      toast.error('Failed to search global catalog');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Add Local Medicine
  const handleCreateMedicine = async () => {
    if (!medicineForm.name || !medicineForm.manufacturer) {
      return toast.error('Medicine name and manufacturer are required');
    }
    setSaving(true);
    try {
      const payload = {
        ...medicineForm,
        providerId,
        batches: medicineForm.initialBatchNumber ? [{
          batchNumber: medicineForm.initialBatchNumber,
          expiryDate: medicineForm.initialBatchExpiry,
          quantity: Number(medicineForm.initialBatchQuantity),
          availableStock: Number(medicineForm.initialBatchQuantity)
        }] : []
      };
      await pharmacyApi.createMedicine(payload);
      toast.success('Medicine created successfully');
      setIsAddOpen(false);
      loadData();
    } catch {
      toast.error('Failed to save medicine');
    } finally {
      setSaving(false);
    }
  };

  // Import from Global Catalogue
  const handleImportGlobal = async (item) => {
    try {
      const payload = {
        name: item.brandName || item.genericName,
        genericName: item.genericName,
        brandName: item.brandName || '',
        manufacturer: item.manufacturer || 'General',
        category: item.category || 'Antibiotics',
        form: item.form || 'Tablet',
        strength: item.strength || '',
        packSize: item.packSize || '10 Tablets',
        purchasePrice: 0,
        sellingPrice: 0,
        totalStock: 0,
        isActive: true
      };
      await pharmacyApi.createMedicine(payload);
      toast.success(`Imported ${item.genericName} into inventory!`);
      loadData();
    } catch {
      toast.error('Failed to import medicine');
    }
  };

  // Stats computed
  const stats = inventoryStats || {};
  const totalPages = Math.max(Math.ceil(total / LIMIT), 1);

  // Filter medicines locally by Stock status if filter set
  const filteredMedicines = medicines.filter(m => {
    if (!stockStatusFilter) return true;
    return getStockStatus(m) === stockStatusFilter;
  });

  // Calculate real low stock alerts
  const lowStockAlerts = medicines.filter(m => {
    const status = getStockStatus(m);
    return status === 'low' || status === 'out';
  });

  // Calculate real expiring soon / expired batch alerts (90 days)
  const expiringAlerts = [];
  medicines.forEach(m => {
    (m.batches || []).forEach(b => {
      const days = daysUntil(b.expiryDate);
      if (days !== null && days <= 90) {
        expiringAlerts.push({
          medicineName: m.name,
          genericName: m.genericName,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          daysLeft: days,
          stock: b.availableStock
        });
      }
    });
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* ── Breadcrumbs & Back ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link to="/admin/providers" className="hover:text-blue-600 transition">Healthcare Providers</Link>
          <span>&gt;</span>
          <Link to="/admin/providers" className="hover:text-blue-600 transition">Pharmacy Providers</Link>
          <span>&gt;</span>
          <span className="text-slate-650 font-bold">{provider?.name || 'Pharmacy'} – Inventory</span>
        </div>

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mt-2 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/admin/providers/${providerId}`)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm text-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {provider?.name || 'Loading Pharmacy'} – Inventory
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-1">
                <span>ID: {provider?.globalId || 'PHR-000001'}</span>
                <span>•</span>
                <span>Branch: {provider?.assignedBranches?.[0]?.name || 'Main Branch'}</span>
                <span>•</span>
                <span>Type: {provider?.providerSubtype || 'Internal'}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  provider?.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-550'
                }`}>{provider?.status || 'Active'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/providers/${providerId}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              <Eye className="w-4 h-4" /> View Pharmacy Details
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition shadow-lg shadow-blue-100"
            >
              <Plus className="w-4 h-4" /> Add Medicine
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <DetailKpiCard icon={Package} value={stats.totalMedicines ?? '452'} label="Total Medicines" sub="In this Pharmacy" color="bg-blue-50 text-blue-600" />
            <DetailKpiCard icon={CheckCircle2} value={stats.availableStock ?? '312'} label="In Stock" sub="Healthy items" color="bg-emerald-50 text-emerald-600" />
            <DetailKpiCard icon={AlertTriangle} value={stats.lowStock ?? '87'} label="Low Stock" sub="Needs Reorder" color="bg-orange-50 text-orange-600" />
            <DetailKpiCard icon={XCircle} value={stats.outOfStock ?? '28'} label="Out of Stock" sub="Unavailable" color="bg-rose-50 text-rose-600" />
            <DetailKpiCard icon={Calendar} value={stats.expiring30Days ?? '25'} label="Expiring Soon" sub="Within 30 Days" color="bg-purple-50 text-purple-600" />
            <DetailKpiCard icon={TrendingUp} value={stats.totalInventoryValue ? `₹${stats.totalInventoryValue.toLocaleString('en-IN')}` : '₹3,42,500'} label="Inventory Value" sub="Current MRP Value" color="bg-teal-50 text-teal-600" />
          </>
        )}
      </div>

      {/* ── Workspace Tab List ─────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200">
        {['Stock', 'Global Catalogue', 'Purchase Orders', 'Alerts'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 font-bold text-sm -mb-px border-b-2 transition ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'Stock' ? 'My Pharmacy Stock' : tab === 'Global' ? 'Global Medicine Catalogue' : tab}
          </button>
        ))}
      </div>

      {/* ── Content Switcher ───────────────────────────────────────────── */}
      {activeTab === 'Stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Filters Sidebar */}
          <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters
              </h4>
              <button
                onClick={() => { setCategoryFilter(''); setStockStatusFilter(''); setManufacturerFilter(''); setSearch(''); }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Clear All
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Category</label>
              <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                <option>Antibiotics</option>
                <option>Pain Relievers</option>
                <option>Vitamins & Supplements</option>
                <option>Gastro Care</option>
                <option>Diabetes Care</option>
                <option>Cardiac Care</option>
              </Select>
            </div>

            {/* Stock Status Filter */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Stock Status</label>
              <Select value={stockStatusFilter} onChange={e => setStockStatusFilter(e.target.value)}>
                <option value="">All Stock Status</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
                <option value="expiring">Expiring Soon</option>
              </Select>
            </div>

            {/* Manufacturer Filter */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Manufacturer</label>
              <Select value={manufacturerFilter} onChange={e => setManufacturerFilter(e.target.value)}>
                <option value="">All Manufacturers</option>
                <option>GSK</option>
                <option>Mankind</option>
                <option>Sun Pharma</option>
                <option>Dr. Reddy's</option>
                <option>Cipla</option>
              </Select>
            </div>
          </div>

          {/* Table Area */}
          <div className="lg:col-span-9 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3 flex-wrap items-center">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search medicines by name, salt, brand, batch..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Medicines In Stock ({total})
                </span>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm">
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <tr>
                      <th className="p-3">Medicine/Salt Name</th>
                      <th className="p-3">Brand</th>
                      <th className="p-3">Manufacturer</th>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3">MRP/Unit</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                    {loading ? (
                      <tr><td colSpan={8} className="p-10 text-center text-slate-450">Loading inventory data...</td></tr>
                    ) : filteredMedicines.length === 0 ? (
                      <tr><td colSpan={8} className="p-10 text-center text-slate-400">No matching medicines found in inventory</td></tr>
                    ) : (
                      filteredMedicines.map(med => {
                        const statusKey = getStockStatus(med);
                        const conf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.in;
                        const expBatch = med.batches?.find(b => b.availableStock > 0);
                        const expStr = expBatch?.expiryDate ? new Date(expBatch.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
                        return (
                          <tr key={med._id} className="hover:bg-slate-50/50 transition">
                            <td className="p-3">
                              <p className="text-slate-900 font-black text-sm">{med.name}</p>
                              <p className="text-slate-400 font-semibold text-[10px] mt-0.5">{med.genericName}</p>
                            </td>
                            <td className="p-3">{med.brandName || '—'}</td>
                            <td className="p-3">{med.manufacturer}</td>
                            <td className="p-3 text-slate-500">{expStr}</td>
                            <td className="p-3">{fmt(med.sellingPrice || med.unitPrice)}</td>
                            <td className="p-3">{med.totalStock} units</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase ${conf.cls}`}>
                                {conf.label}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setSelectedMedicine(med); setIsDetailOpen(true); setExpandedBatchId(null); }}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Showing page {page} of {totalPages}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition">
                    <ChevronLeft className="w-4 h-4 text-slate-650" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition">
                    <ChevronRight className="w-4 h-4 text-slate-650" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Global Catalogue ───────────────────────────────────────── */}
      {activeTab === 'Global Catalogue' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search global medicines catalog by salt, manufacturer..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button onClick={handleGlobalSearch} disabled={globalLoading}
              className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition">
              {globalLoading ? 'Searching...' : 'Search Catalogue'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {globalMedicines.map(item => (
              <div key={item._id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:shadow-md transition bg-slate-50/50">
                <div>
                  <h4 className="font-black text-slate-800">{item.brandName || item.genericName}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{item.genericName}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Mfr: {item.manufacturer || 'General'}</p>
                </div>
                <button
                  onClick={() => handleImportGlobal(item)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-750 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Import
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Purchase Orders ───────────────────────────────────────── */}
      {activeTab === 'Purchase Orders' && (
        <SectionCard title="Purchase Orders Summary" icon={Truck}>
          <div className="space-y-4">
            {purchaseOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">No Purchase Orders Created Yet</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-500">
                    <tr>
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Order Date</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                    {purchaseOrders.map(po => (
                      <tr key={po._id}>
                        <td className="p-3 text-blue-600">{po.poNumber}</td>
                        <td className="p-3">{po.supplierId?.name || '—'}</td>
                        <td className="p-3">{new Date(po.createdAt).toLocaleDateString()}</td>
                        <td className="p-3">₹{po.totalAmount}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            po.status === 'Received' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>{po.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── Tab: Stock Alerts ──────────────────────────────────────────── */}
      {activeTab === 'Alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="Low Stock & Out of Stock Indicators" icon={AlertTriangle}>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                <p className="font-black text-orange-850">Critical Reorder Alert</p>
                <p className="text-orange-600 text-xs font-semibold mt-0.5">
                  {lowStockAlerts.length} medicine items have stocks dropped below critical reorder limits.
                </p>
              </div>

              {lowStockAlerts.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {lowStockAlerts.map(med => {
                    const status = med.totalStock === 0 ? 'out' : 'low';
                    return (
                      <div key={med._id} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition text-xs font-bold">
                        <div>
                          <p className="font-black text-slate-800 text-sm">{med.name}</p>
                          <p className="text-slate-400 font-semibold mt-0.5">Reorder Limit: {med.reorderLevel || 10} units</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded-xl font-black uppercase text-[10px] ${
                            status === 'out' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {med.totalStock} units
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-semibold text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  All medicine stocks are at healthy levels.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Expiry Alerts (Next 90 Days)" icon={Clock}>
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                <p className="font-black text-rose-850">Near Expiry Alert</p>
                <p className="text-rose-600 text-xs font-semibold mt-0.5">
                  {expiringAlerts.length} batch items are expiring within the next 90 days.
                </p>
              </div>

              {expiringAlerts.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {expiringAlerts.map((item, idx) => {
                    const isExpired = item.daysLeft <= 0;
                    return (
                      <div key={idx} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition text-xs font-bold">
                        <div>
                          <p className="font-black text-slate-800 text-sm">{item.medicineName}</p>
                          <p className="text-slate-400 font-semibold mt-0.5">
                            Batch: <span className="text-slate-650 font-bold">{item.batchNumber}</span> • Exp: {new Date(item.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded-xl font-black uppercase text-[10px] block ${
                            isExpired ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            {isExpired ? 'Expired' : `${item.daysLeft} Days Left`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">{item.stock} Units</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-semibold text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No batches are expiring soon.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADD MEDICINE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add Medicine Item</h3>
                <p className="text-xs text-slate-400 mt-0.5">Register medicine locally or import globally</p>
              </div>
              <button onClick={() => { setIsAddOpen(false); setAddMode(''); }} className="p-2 hover:bg-slate-150 rounded-xl text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {!addMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setAddMode('global')}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 transition gap-2 text-center group">
                    <Layers className="w-10 h-10 text-blue-600 group-hover:scale-105 transition-transform" />
                    <span className="font-bold text-sm text-slate-800 mt-2">Import Global Catalogue</span>
                    <span className="text-[11px] text-slate-400">Fetch details automatically</span>
                  </button>
                  <button onClick={() => setAddMode('local')}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 transition gap-2 text-center group">
                    <Pill className="w-10 h-10 text-indigo-600 group-hover:scale-105 transition-transform" />
                    <span className="font-bold text-sm text-slate-800 mt-2">Create Local Medicine</span>
                    <span className="text-[11px] text-slate-400">Add custom pharmacy item</span>
                  </button>
                </div>
              ) : addMode === 'global' ? (
                /* Import search component */
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search medicine master catalog..."
                      value={globalSearch}
                      onChange={e => setGlobalSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                      className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button onClick={handleGlobalSearch} className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition">Search</button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {globalMedicines.map(item => (
                      <div key={item._id} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-black text-slate-805">{item.brandName || item.genericName}</p>
                          <p className="text-slate-400 text-[10px]">{item.genericName}</p>
                        </div>
                        <button onClick={() => { handleImportGlobal(item); setIsAddOpen(false); setAddMode(''); }}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition">Import</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Local medicine form details */
                <div className="space-y-3">
                  <Field label="Medicine Name" required>
                    <Input placeholder="e.g. Paracetamol 650mg" value={medicineForm.name} onChange={e => setMedicineForm({ ...medicineForm, name: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Generic Name"><Input placeholder="e.g. Paracetamol" value={medicineForm.genericName} onChange={e => setMedicineForm({ ...medicineForm, genericName: e.target.value })} /></Field>
                    <Field label="Brand Name"><Input placeholder="e.g. Crocin" value={medicineForm.brandName} onChange={e => setMedicineForm({ ...medicineForm, brandName: e.target.value })} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Manufacturer"><Input placeholder="GSK" value={medicineForm.manufacturer} onChange={e => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })} /></Field>
                    <Field label="Category"><Select value={medicineForm.category} onChange={e => setMedicineForm({ ...medicineForm, category: e.target.value })}><option>Antibiotics</option><option>Pain Relievers</option><option>Vitamins & Supplements</option><option>Gastro Care</option></Select></Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="MRP (₹)"><Input type="number" min={0} value={medicineForm.sellingPrice} onChange={e => setMedicineForm({ ...medicineForm, sellingPrice: Number(e.target.value) })} /></Field>
                    <Field label="Purchase Price"><Input type="number" min={0} value={medicineForm.purchasePrice} onChange={e => setMedicineForm({ ...medicineForm, purchasePrice: Number(e.target.value) })} /></Field>
                    <Field label="GST (%)"><Input type="number" value={medicineForm.gst} onChange={e => setMedicineForm({ ...medicineForm, gst: Number(e.target.value) })} /></Field>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 flex-shrink-0">
              <button onClick={() => { setIsAddOpen(false); setAddMode(''); }} className="px-4 py-2 text-sm font-bold text-slate-550 hover:text-slate-700 transition">Cancel</button>
              {addMode === 'local' && (
                <button onClick={handleCreateMedicine} disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition shadow-md">
                  Save Medicine
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MEDICINE DETAILS SIDE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isDetailOpen && selectedMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-lg shadow-2xl h-full flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedMedicine.name}</h3>
                <p className="text-xs text-slate-400 font-semibold">{selectedMedicine.genericName}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <h4 className="text-slate-805 uppercase tracking-wider text-[11px] font-black">Composition & storage</h4>
              <InfoRow icon={Pill} label="Composition" value={selectedMedicine.composition || selectedMedicine.genericName} />
              <InfoRow icon={Clock} label="Form Factor" value={selectedMedicine.form || 'Tablet'} />
              <InfoRow icon={TrendingUp} label="Strength" value={selectedMedicine.strength || '500 mg'} />
              <InfoRow icon={Settings} label="Storage Temp" value={selectedMedicine.storageLocation || 'Room Temperature'} />
              <InfoRow icon={Layers} label="GST Rate" value={`${selectedMedicine.gst || 18}%`} />

              <h4 className="text-slate-805 uppercase tracking-wider text-[11px] font-black pt-4">Stock Batch availability</h4>
              {selectedMedicine.batches && selectedMedicine.batches.length > 0 ? (
                selectedMedicine.batches.map(batch => {
                  const isExpanded = expandedBatchId === batch._id;
                  return (
                    <div key={batch._id} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedBatchId(isExpanded ? null : batch._id)}
                        className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100/75 transition flex justify-between items-center"
                      >
                        <div>
                          <p className="text-slate-800 font-black text-xs">Batch: {batch.batchNumber}</p>
                          <p className="text-slate-400 font-semibold text-[10px] mt-0.5">
                            Exp: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-650 font-black">{batch.availableStock} Units</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-3 bg-white border-t border-slate-50 space-y-2 text-[11px] font-bold text-slate-600">
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400">Batch Number:</span>
                            <span className="text-slate-800">{batch.batchNumber}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400">Expiry Date:</span>
                            <span className="text-slate-800">
                              {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400">Received Date:</span>
                            <span className="text-slate-800">
                              {batch.manufacturingDate || batch.createdAt ? new Date(batch.manufacturingDate || batch.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400">Supplier Name:</span>
                            <span className="text-slate-800">{batch.supplier || selectedMedicine.supplierIds?.[0]?.name || '—'}</span>
                          </div>
                          {selectedMedicine.supplierIds?.[0] && (
                            <>
                              <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-400">Supplier Phone:</span>
                                <span className="text-slate-800">{selectedMedicine.supplierIds[0].phone || '—'}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-400">Supplier Email:</span>
                                <span className="text-slate-800">{selectedMedicine.supplierIds[0].email || '—'}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400">Purchase Price:</span>
                            <span className="text-slate-800">{fmt(batch.purchasePrice)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-400">Selling Price:</span>
                            <span className="text-slate-800">{fmt(batch.sellingPrice)}</span>
                          </div>
                          {batch.invoiceNumber && (
                            <div className="flex justify-between py-1 border-b border-slate-50">
                              <span className="text-slate-400">Invoice Number:</span>
                              <span className="text-slate-800">{batch.invoiceNumber}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 font-bold">No active batches available for this medicine</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

const ChevronLeft = ({ className }) => <ChevronRight className={`${className} rotate-180`} />;

export default PharmacyInventoryPage;
