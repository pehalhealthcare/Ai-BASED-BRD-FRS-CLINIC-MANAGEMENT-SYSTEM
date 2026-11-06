import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, MoreHorizontal, AlertTriangle, Clock, 
  AlertCircle, Info, Check, CheckCircle2, X, RefreshCw,
  Building2, ArrowDownCircle, ArrowUpCircle, Pill
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PharmacyModule({ data, onUpdateData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(null); // holds medicine
  const [showBatchModal, setShowBatchModal] = useState(null); // holds medicine
  const [showDistributionModal, setShowDistributionModal] = useState(null); // holds medicine
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({
    name: '',
    batch: '',
    category: 'Analgesics',
    expiry: '12/2026',
    stock: 250,
    unit: 'Tablets',
    minStock: 50,
    unitPrice: 5.0,
  });

  const [dispenseForm, setDispenseForm] = useState({
    quantity: 10,
    patientName: 'Ramesh Kumar (P001234)',
    doctorName: 'Dr. Priya Sharma',
    notes: 'Prescribed 1 tab twice daily',
  });

  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    quantity: 100,
    expiry: '06/2027',
    supplier: 'Apollo Pharma Distribution',
  });

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return (data?.medicines || []).filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batch.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'All Status' || item.status === statusFilter;

      const matchesCategory = 
        categoryFilter === 'All Categories' || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [data?.medicines, searchQuery, statusFilter, categoryFilter]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'Low Stock':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'Expiring Soon':
        return 'text-rose-700 bg-rose-50 border border-rose-200';
      case 'Out of Stock':
        return 'text-rose-700 bg-rose-50 border border-rose-200';
      default:
        return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  // 1. ADD MEDICINE
  const handleAddMedicine = (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast.error('Please enter medicine name and strength');
      return;
    }

    const stockNum = Math.max(0, parseInt(addForm.stock, 10) || 0);
    const minStockNum = Math.max(1, parseInt(addForm.minStock, 10) || 30);
    const batchCode = addForm.batch.trim() || `B00${(data.medicines?.length || 0) + 1}`;

    let calculatedStatus = 'In Stock';
    if (stockNum === 0) calculatedStatus = 'Out of Stock';
    else if (stockNum <= minStockNum) calculatedStatus = 'Low Stock';

    const newMed = {
      id: `med-${Date.now()}`,
      name: addForm.name.trim(),
      batch: batchCode,
      expiry: addForm.expiry.trim() || '12/2026',
      stock: stockNum,
      unit: addForm.unit || 'Tablets',
      minStock: minStockNum,
      category: addForm.category || 'General',
      unitPrice: parseFloat(addForm.unitPrice) || 5.0,
      status: calculatedStatus,
      distribution: {
        'Main Clinic': Math.round(stockNum * 0.6),
        'Indiranagar Branch': Math.round(stockNum * 0.25),
        'Whitefield Care Hub': Math.round(stockNum * 0.15),
      },
    };

    const nextMedicines = [newMed, ...(data.medicines || [])];
    const nextStats = {
      ...data.stats,
      totalMedicines: (data.stats?.totalMedicines || 1248) + 1,
      lowStock: calculatedStatus === 'Low Stock' ? (data.stats?.lowStock || 32) + 1 : data.stats?.lowStock,
      outOfStock: calculatedStatus === 'Out of Stock' ? (data.stats?.outOfStock || 8) + 1 : data.stats?.outOfStock,
    };

    onUpdateData({ ...data, medicines: nextMedicines, stats: nextStats });
    setShowAddModal(false);
    setAddForm({
      name: '',
      batch: '',
      category: 'Analgesics',
      expiry: '12/2026',
      stock: 250,
      unit: 'Tablets',
      minStock: 50,
      unitPrice: 5.0,
    });
    toast.success(`Demo Medicine "${newMed.name}" added successfully!`);
  };

  // 2. DISPENSE MEDICINE
  const handleDispenseMedicine = (e) => {
    e.preventDefault();
    if (!showDispenseModal) return;

    const qty = parseInt(dispenseForm.quantity, 10) || 0;
    if (qty <= 0) {
      toast.error('Dispense quantity must be greater than 0');
      return;
    }
    if (qty > showDispenseModal.stock) {
      toast.error(`Cannot dispense more than available stock (${showDispenseModal.stock} units)`);
      return;
    }

    const newStock = showDispenseModal.stock - qty;
    let newStatus = 'In Stock';
    if (newStock === 0) newStatus = 'Out of Stock';
    else if (newStock <= showDispenseModal.minStock) newStatus = 'Low Stock';
    else if (showDispenseModal.status === 'Expiring Soon') newStatus = 'Expiring Soon';

    const nextMedicines = data.medicines.map((m) => {
      if (m.id === showDispenseModal.id) {
        return {
          ...m,
          stock: newStock,
          status: newStatus,
          distribution: {
            ...m.distribution,
            'Main Clinic': Math.max(0, (m.distribution?.['Main Clinic'] || newStock) - qty),
          },
        };
      }
      return m;
    });

    // Update stats dynamically
    let lowStockDelta = 0;
    let outOfStockDelta = 0;
    if (showDispenseModal.status !== 'Low Stock' && newStatus === 'Low Stock') lowStockDelta = 1;
    if (showDispenseModal.status !== 'Out of Stock' && newStatus === 'Out of Stock') {
      outOfStockDelta = 1;
      if (showDispenseModal.status === 'Low Stock') lowStockDelta = -1;
    }

    const nextStats = {
      ...data.stats,
      lowStock: Math.max(0, (data.stats?.lowStock || 32) + lowStockDelta),
      outOfStock: (data.stats?.outOfStock || 8) + outOfStockDelta,
    };

    onUpdateData({ ...data, medicines: nextMedicines, stats: nextStats });
    toast.success(`Dispensed ${qty} ${showDispenseModal.unit} of ${showDispenseModal.name} for ${dispenseForm.patientName}`);
    setShowDispenseModal(null);
  };

  // 3. ADD BATCH
  const handleAddBatch = (e) => {
    e.preventDefault();
    if (!showBatchModal) return;

    const qty = parseInt(batchForm.quantity, 10) || 0;
    if (qty <= 0) {
      toast.error('Please enter a valid stock batch quantity');
      return;
    }

    const newStock = showBatchModal.stock + qty;
    let newStatus = 'In Stock';
    if (newStock <= showBatchModal.minStock) newStatus = 'Low Stock';

    const nextMedicines = data.medicines.map((m) => {
      if (m.id === showBatchModal.id) {
        return {
          ...m,
          stock: newStock,
          batch: batchForm.batchNumber.trim() || `B00${Math.floor(10 + Math.random() * 89)}`,
          expiry: batchForm.expiry.trim() || '12/2027',
          status: newStatus,
          distribution: {
            ...m.distribution,
            'Main Clinic': (m.distribution?.['Main Clinic'] || 0) + Math.round(qty * 0.7),
            'Indiranagar Branch': (m.distribution?.['Indiranagar Branch'] || 0) + Math.round(qty * 0.3),
          },
        };
      }
      return m;
    });

    let lowStockDelta = 0;
    let outOfStockDelta = 0;
    if (showBatchModal.status === 'Out of Stock') outOfStockDelta = -1;
    if (showBatchModal.status === 'Low Stock' && newStatus === 'In Stock') lowStockDelta = -1;

    const nextStats = {
      ...data.stats,
      lowStock: Math.max(0, (data.stats?.lowStock || 32) + lowStockDelta),
      outOfStock: Math.max(0, (data.stats?.outOfStock || 8) + outOfStockDelta),
    };

    onUpdateData({ ...data, medicines: nextMedicines, stats: nextStats });
    toast.success(`Received new batch of ${qty} ${showBatchModal.unit} for ${showBatchModal.name}`);
    setShowBatchModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Live Tag */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
          Pharmacy Management
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Synced
          </span>
        </div>
      </div>

      {/* 4 Mini Stat Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Medicines */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Total Medicines</span>
            <Info size={13} className="text-blue-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.totalMedicines?.toLocaleString() || '1,248'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-slate-600 bg-slate-100">
            Active SKUs
          </span>
        </div>

        {/* Low Stock */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Low Stock</span>
            <AlertTriangle size={13} className="text-amber-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.lowStock?.toLocaleString() || '32'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-amber-700 bg-amber-50 border border-amber-200/70">
            Needs Reorder
          </span>
        </div>

        {/* Expiring Soon */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Expiring Soon</span>
            <Clock size={13} className="text-rose-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.expiringSoon?.toLocaleString() || '12'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-rose-700 bg-rose-50 border border-rose-200/70">
            Within 60 days
          </span>
        </div>

        {/* Out of Stock */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Out of Stock</span>
            <AlertCircle size={13} className="text-rose-600" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.outOfStock?.toLocaleString() || '8'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-rose-700 bg-rose-50 border border-rose-200/70">
            Critical Alert
          </span>
        </div>
      </div>

      {/* Search, Filters & Action Button Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine name or batch..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All Status">All Status</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All Categories">All Categories</option>
          <option value="Analgesics">Analgesics</option>
          <option value="Antibiotics">Antibiotics</option>
          <option value="Supplements">Supplements</option>
          <option value="Antacids">Antacids</option>
          <option value="Antihistamines">Antihistamines</option>
          <option value="Antidiabetics">Antidiabetics</option>
        </select>

        {/* Add Medicine Action */}
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold">
            <tr>
              <th className="py-2.5 px-3">Medicine / Strength</th>
              <th className="py-2.5 px-3">Batch / Ref</th>
              <th className="py-2.5 px-3">Expiry Date</th>
              <th className="py-2.5 px-3">Stock / Unit</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredMedicines.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No medicines match your search or filter.
                </td>
              </tr>
            ) : (
              filteredMedicines.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Pill size={12} className="text-blue-500 shrink-0" />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
                    {row.batch}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.expiry}
                  </td>
                  <td className="py-2.5 px-3 font-extrabold text-slate-900">
                    {row.stock} <span className="text-[10px] font-normal text-slate-400">{row.unit || 'Units'}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${getStatusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right relative">
                    <div className="inline-block text-left">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === row.id && (
                        <div 
                          className="absolute right-3 top-8 w-44 bg-white rounded-lg shadow-lg border border-slate-200/90 py-1 z-30 text-left text-xs"
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowDispenseModal(row);
                              setDispenseForm({
                                quantity: Math.min(10, Math.max(1, row.stock)),
                                patientName: 'Ramesh Kumar (P001234)',
                                doctorName: 'Dr. Priya Sharma',
                                notes: 'Prescribed standard course',
                              });
                            }}
                            disabled={row.stock <= 0}
                            className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition ${
                              row.stock <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <ArrowDownCircle size={13} className="text-blue-500" />
                            <span>Dispense Medicine</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowBatchModal(row);
                              setBatchForm({
                                batchNumber: `B00${Math.floor(10 + Math.random() * 89)}`,
                                quantity: 150,
                                expiry: '06/2027',
                                supplier: 'Apex Healthcare Distributors',
                              });
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                          >
                            <ArrowUpCircle size={13} className="text-emerald-500" />
                            <span>Add Stock Batch</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowDistributionModal(row);
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                          >
                            <Building2 size={13} className="text-slate-400" />
                            <span>Clinic Distribution</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL 1: ADD MEDICINE ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Pill size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Add Medicine (Demo)</h4>
                  <p className="text-[11px] text-slate-500">Add new medicine SKU to clinic pharmacy catalog</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMedicine} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Medicine Name & Strength <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ciprofloxacin 500mg"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Analgesics">Analgesics</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Supplements">Supplements</option>
                    <option value="Antacids">Antacids</option>
                    <option value="Antihistamines">Antihistamines</option>
                    <option value="Antidiabetics">Antidiabetics</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch / Reference</label>
                  <input
                    type="text"
                    placeholder="B008"
                    value={addForm.batch}
                    onChange={(e) => setAddForm({ ...addForm, batch: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.stock}
                    onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Type</label>
                  <select
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Tablets">Tablets</option>
                    <option value="Capsules">Capsules</option>
                    <option value="Sachets">Sachets</option>
                    <option value="Bottles">Bottles</option>
                    <option value="Vials">Vials</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YYYY"
                    value={addForm.expiry}
                    onChange={(e) => setAddForm({ ...addForm, expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2 text-[11px] text-blue-700">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  Demo Mode: This updates your interactive local demo catalog without affecting real clinic inventory.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: DISPENSE MEDICINE ── */}
      {showDispenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ArrowDownCircle size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Dispense Medicine (Demo)</h4>
                  <p className="text-[11px] text-slate-500">Dispense from available pharmacy batch</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDispenseModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDispenseMedicine} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Selected Medicine</span>
                  <p className="font-bold text-slate-900">{showDispenseModal.name}</p>
                  <p className="text-[11px] text-slate-500">Batch {showDispenseModal.batch} • Exp: {showDispenseModal.expiry}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Available</span>
                  <p className="text-base font-black text-blue-600">{showDispenseModal.stock} <span className="text-xs font-normal text-slate-500">{showDispenseModal.unit}</span></p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispense Quantity ({showDispenseModal.unit})</label>
                <input
                  type="number"
                  min="1"
                  max={showDispenseModal.stock}
                  value={dispenseForm.quantity}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Name & ID</label>
                <input
                  type="text"
                  value={dispenseForm.patientName}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, patientName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prescribing Doctor</label>
                <input
                  type="text"
                  value={dispenseForm.doctorName}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, doctorName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDispenseModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Confirm Dispense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ADD STOCK BATCH ── */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowUpCircle size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Add Stock Batch (Demo)</h4>
                  <p className="text-[11px] text-slate-500">Inward receipt from supplier or distributor</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBatchModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Medicine</span>
                  <p className="font-bold text-slate-900">{showBatchModal.name}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Current Stock</span>
                  <p className="font-bold text-slate-800">{showBatchModal.stock} {showBatchModal.unit}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Batch Code</label>
                  <input
                    type="text"
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    value={batchForm.expiry}
                    onChange={(e) => setBatchForm({ ...batchForm, expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    value={batchForm.supplier}
                    onChange={(e) => setBatchForm({ ...batchForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Receive Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CLINIC DISTRIBUTION ── */}
      {showDistributionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Clinic-Wise Stock Distribution</h4>
                  <p className="text-[11px] text-slate-500">{showDistributionModal.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDistributionModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Total Available Stock</span>
                <span className="font-black text-slate-900 text-sm">{showDistributionModal.stock} {showDistributionModal.unit}</span>
              </div>

              <div className="space-y-3">
                {Object.entries(showDistributionModal.distribution || {}).map(([clinicName, qty]) => {
                  const percentage = showDistributionModal.stock > 0 
                    ? Math.round((qty / showDistributionModal.stock) * 100) 
                    : 0;
                  return (
                    <div key={clinicName} className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-800">{clinicName}</span>
                        <span className="font-black text-blue-600">{qty} {showDistributionModal.unit} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowDistributionModal(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
