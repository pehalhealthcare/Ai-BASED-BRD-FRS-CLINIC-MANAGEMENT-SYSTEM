import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, Package, AlertTriangle, Clock, RefreshCw,
  X, CheckCircle2, ChevronDown, Layers, FileText, FlaskConical
} from 'lucide-react';
import { labApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Test Kit',
  'Reagent',
  'Chemical',
  'Collection Tube',
  'Slide',
  'Needle',
  'Syringe',
  'Container',
  'PPE',
  'Other Consumable'
];

const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

const LabConsumablesPage = () => {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'ledger' | 'reports'

  // Data Loading States
  const [consumables, setConsumables] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals / Operations states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    category: 'Reagent',
    unit: 'vial',
    minimumStock: 10,
    reorderLevel: 20,
    maximumStock: 100,
    isActive: true
  });

  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedConsumable, setSelectedConsumable] = useState(null);
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    expiryDate: '',
    quantity: '',
    purchasePrice: '',
    sellingPrice: '',
    invoiceNumber: '',
    remarks: '',
    isOpeningStock: true
  });

  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    consumableId: '',
    batchId: '',
    quantity: '',
    adjustmentType: 'Adjustment',
    reason: '',
    notes: ''
  });

  /* ─── Load Data ──────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [consumablesRes, ledgersRes, statsRes] = await Promise.allSettled([
        labApi.listConsumables(),
        labApi.listConsumableLedgers(),
        labApi.getInventoryDashboard()
      ]);

      if (consumablesRes.status === 'fulfilled') {
        setConsumables(consumablesRes.value?.data?.consumables || consumablesRes.value?.consumables || []);
      }
      if (ledgersRes.status === 'fulfilled') {
        setLedgers(ledgersRes.value?.data?.ledgers || ledgersRes.value?.ledgers || []);
      }
      if (statsRes.status === 'fulfilled') {
        setDashboardStats(statsRes.value?.data || statsRes.value || null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load laboratory inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Filtered Consumables ───────────────────── */
  const filteredConsumables = useMemo(() => {
    let list = [...consumables];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      list = list.filter(c => c.category === categoryFilter);
    }
    return list;
  }, [consumables, search, categoryFilter]);

  /* ─── Operations Handlers ────────────────────── */

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await labApi.createConsumable(createForm);
      toast.success('Consumable registered successfully');
      setIsCreateOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create consumable');
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      await labApi.addConsumableBatch(selectedConsumable._id, batchForm);
      toast.success('Batch stock added successfully');
      setIsBatchOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add batch stock');
    }
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    try {
      await labApi.adjustConsumableStock(adjustmentForm);
      toast.success('Consumable stock adjusted');
      setIsAdjustmentOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Adjustment failed');
    }
  };

  if (loading) return <LoadingState label="Loading laboratory consumables..." />;
  if (error) return <ErrorState title="Unable to load lab inventory" description={error} />;

  return (
    <div className="space-y-6 p-1 bg-white min-h-screen text-slate-800">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-stone-100 pb-4">
        <PageHeader
          eyebrow="Laboratory inventory"
          title="Consumables & Reagents Workspace"
          description="Manage slides, chemicals, reagents, tubes and clinical containers."
        />
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'stock' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Consumable Stock
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Ledger logs
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Reports
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      {dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-slate-900 block">{dashboardStats.totalConsumables}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Total Consumables</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-slate-900 block">₹{fmtNum(dashboardStats.totalValue)}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Consumables Value</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-amber-600 block">{dashboardStats.lowStock}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Low Stock Alert</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-orange-600 block">{dashboardStats.expiring}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Expiring 30 Days</span>
          </div>
        </div>
      )}

      {/* TAB 1: CONSUMABLE STOCK */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <div className="flex gap-2 items-center flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search consumables catalog..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-indigo-500"
              />
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAdjustmentForm({
                    consumableId: '',
                    batchId: '',
                    quantity: '',
                    adjustmentType: 'Adjustment',
                    reason: '',
                    notes: ''
                  });
                  setIsAdjustmentOpen(true);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Stock Adjustment
              </button>
              <button
                onClick={() => {
                  setCreateForm({
                    name: '',
                    category: 'Reagent',
                    unit: 'vial',
                    minimumStock: 10,
                    reorderLevel: 20,
                    maximumStock: 100,
                    isActive: true
                  });
                  setIsCreateOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
              >
                Add Consumable
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Item Name</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Category</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Current Stock</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Min / Reorder</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Active Batches</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConsumables.map(c => {
                  const isLow = c.totalStock <= (c.reorderLevel || 10);
                  return (
                    <tr key={c._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-indigo-500" />
                          <span className="font-bold text-slate-900">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{c.category}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {c.totalStock} {c.unit || 'units'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c.minimumStock} / {c.reorderLevel}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-[10px]">
                          {(c.batches || []).length} batches
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedConsumable(c);
                            setBatchForm({
                              batchNumber: '',
                              expiryDate: '',
                              quantity: '',
                              purchasePrice: '',
                              sellingPrice: '',
                              invoiceNumber: '',
                              remarks: '',
                              isOpeningStock: true
                            });
                            setIsBatchOpen(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black hover:bg-indigo-600 hover:text-white transition"
                        >
                          + Add Batch Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LEDGER LOGS */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Date & Time</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Consumable</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Batch Number</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Movement</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Qty</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Balance</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Reason</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgers.map(l => (
                  <tr key={l._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{l.consumableId?.name}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{l.batchId?.batchNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600">
                        {l.movementType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">{l.quantity > 0 ? `+${l.quantity}` : l.quantity}</td>
                    <td className="px-4 py-3 text-slate-500">{l.previousStock} → {l.updatedStock}</td>
                    <td className="px-4 py-3 text-slate-600">{l.reason || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{l.userId?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <Layers className="text-indigo-600 w-6 h-6" />
            <h3 className="text-lg font-black text-slate-900">Lab Stock Reports</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => toast.success('Reagent usage report exported!')}
              className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1"
            >
              <FileText className="w-5 h-5 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900">Consumable & Reagent Usage</h4>
              <p className="text-[10px] text-slate-400">Export active stock balances per category</p>
            </button>
            <button
              onClick={() => toast.success('Lab Expiry report exported!')}
              className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1"
            >
              <Clock className="w-5 h-5 text-orange-600" />
              <h4 className="text-xs font-black text-slate-900">Expiry Schedule Report</h4>
              <p className="text-[10px] text-slate-400">Reagents and tubes expiring soonest</p>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CONSUMABLE */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateSubmit} className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-slate-950 text-sm">Register Lab Consumable</h3>
              <button type="button" onClick={() => setIsCreateOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Consumable Name</label>
                <input
                  type="text"
                  placeholder="e.g. CBC Reagent Tube Pack"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Category</label>
                <select
                  value={createForm.category}
                  onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Unit of Measure</label>
                <input
                  type="text"
                  placeholder="e.g. Vials, Pieces, Boxes"
                  value={createForm.unit}
                  onChange={e => setCreateForm({ ...createForm, unit: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={createForm.minimumStock}
                    onChange={e => setCreateForm({ ...createForm, minimumStock: e.target.value })}
                    className="w-full border p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={createForm.reorderLevel}
                    onChange={e => setCreateForm({ ...createForm, reorderLevel: e.target.value })}
                    className="w-full border p-2 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Register</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD BATCH STOCK */}
      {isBatchOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleBatchSubmit} className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-slate-950 text-sm">Add Batch Stock — {selectedConsumable?.name}</h3>
              <button type="button" onClick={() => setIsBatchOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Batch Number</label>
                <input
                  type="text"
                  placeholder="e.g. B-RE-90"
                  value={batchForm.batchNumber}
                  onChange={e => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={batchForm.expiryDate}
                  onChange={e => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Quantity Received</label>
                <input
                  type="number"
                  value={batchForm.quantity}
                  onChange={e => setBatchForm({ ...batchForm, quantity: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Purchase Cost per unit (₹)</label>
                <input
                  type="number"
                  value={batchForm.purchasePrice}
                  onChange={e => setBatchForm({ ...batchForm, purchasePrice: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Invoice number</label>
                <input
                  type="text"
                  value={batchForm.invoiceNumber}
                  onChange={e => setBatchForm({ ...batchForm, invoiceNumber: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setIsBatchOpen(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Register Stock</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {isAdjustmentOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAdjustmentSubmit} className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-slate-950 text-sm">Lab Consumable Stock Adjustment</h3>
              <button type="button" onClick={() => setIsAdjustmentOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Select Consumable</label>
                <select
                  value={adjustmentForm.consumableId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setAdjustmentForm({ ...adjustmentForm, consumableId: cId, batchId: '' });
                  }}
                  className="w-full border p-2 rounded-lg"
                  required
                >
                  <option value="">Choose item...</option>
                  {consumables.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              {adjustmentForm.consumableId && (
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Select Batch</label>
                  <select
                    value={adjustmentForm.batchId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, batchId: e.target.value })}
                    className="w-full border p-2 rounded-lg"
                    required
                  >
                    <option value="">Choose batch...</option>
                    {(consumables.find(c => c._id === adjustmentForm.consumableId)?.batches || []).map(b => (
                      <option key={b._id} value={b._id}>Batch {b.batchNumber} (Stock: {b.availableStock})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-500 block mb-1">Quantity Change (use negative to subtract)</label>
                <input
                  type="number"
                  value={adjustmentForm.quantity}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Adjustment Type</label>
                <select
                  value={adjustmentForm.adjustmentType}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustmentType: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="Adjustment">General Adjustment</option>
                  <option value="Damage">Damaged Reagents disposal</option>
                  <option value="Expired">Expired Reagents disposal</option>
                  <option value="Returned">Returned to Supplier</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Note / Reason</label>
                <input
                  type="text"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setIsAdjustmentOpen(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Apply adjustment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LabConsumablesPage;
