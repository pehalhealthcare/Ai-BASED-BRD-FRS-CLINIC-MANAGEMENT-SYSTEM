import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, MoreHorizontal, Boxes, AlertTriangle, 
  Clock, IndianRupee, X, Info, ArrowUpCircle, ArrowDownCircle,
  Building2, History, Send, CheckCircle2, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryModule({ data, onUpdateData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(null); // holds { item, type: 'in' | 'out' }
  const [showTransferModal, setShowTransferModal] = useState(null); // holds item
  const [showRequestModal, setShowRequestModal] = useState(null); // holds item
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(null); // holds item
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({
    name: '',
    sku: '',
    category: 'Consumables',
    available: 100,
    unit: 'Box',
    reorderLevel: 25,
    unitCost: 150,
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: 50,
    reason: 'Routine replenishment',
  });

  const [transferForm, setTransferForm] = useState({
    sourceClinic: 'Main Clinic',
    targetClinic: 'Indiranagar Branch',
    quantity: 10,
  });

  const [requestForm, setRequestForm] = useState({
    quantity: 100,
    urgency: 'Normal',
    vendor: 'MedTech Supplies Ltd.',
    notes: 'Stock level approaching reorder point',
  });

  // Filtered Items
  const filteredItems = useMemo(() => {
    return (data?.items || []).filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = 
        categoryFilter === 'All Categories' || item.category === categoryFilter;

      const matchesStatus = 
        statusFilter === 'All Status' || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [data?.items, searchQuery, categoryFilter, statusFilter]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'Low Stock':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'Critical':
        return 'text-rose-700 bg-rose-50 border border-rose-200';
      default:
        return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  // 1. ADD ITEM
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast.error('Please enter inventory item name');
      return;
    }

    const qty = Math.max(0, parseInt(addForm.available, 10) || 0);
    const reorder = Math.max(1, parseInt(addForm.reorderLevel, 10) || 10);
    const cost = Math.max(1, parseInt(addForm.unitCost, 10) || 100);
    const skuCode = addForm.sku.trim().toUpperCase() || `INV-00${(data.items?.length || 0) + 1}`;

    let status = 'In Stock';
    if (qty <= Math.round(reorder * 0.3)) status = 'Critical';
    else if (qty <= reorder) status = 'Low Stock';

    const newItem = {
      id: `inv-${Date.now()}`,
      name: addForm.name.trim(),
      sku: skuCode,
      category: addForm.category || 'Consumables',
      available: qty,
      unit: addForm.unit || 'Piece',
      reorderLevel: reorder,
      unitCost: cost,
      status: status,
      distribution: {
        'Main Clinic': Math.round(qty * 0.6),
        'Indiranagar Branch': Math.round(qty * 0.25),
        'Whitefield Care Hub': Math.round(qty * 0.15),
      },
    };

    const nextItems = [newItem, ...(data.items || [])];
    const addedValue = qty * cost;
    const nextStats = {
      ...data.stats,
      totalItems: (data.stats?.totalItems || 428) + 1,
      lowStockItems: (status === 'Low Stock' || status === 'Critical') 
        ? (data.stats?.lowStockItems || 18) + 1 
        : data.stats?.lowStockItems,
      totalStockValue: (data.stats?.totalStockValue || 482350) + addedValue,
    };

    onUpdateData({ ...data, items: nextItems, stats: nextStats });
    setShowAddModal(false);
    setAddForm({
      name: '',
      sku: '',
      category: 'Consumables',
      available: 100,
      unit: 'Box',
      reorderLevel: 25,
      unitCost: 150,
    });
    toast.success(`Inventory item "${newItem.name}" added successfully!`);
  };

  // 2. STOCK ADJUST (IN / OUT)
  const handleStockAdjust = (e) => {
    e.preventDefault();
    if (!showAdjustModal) return;

    const { item, type } = showAdjustModal;
    const qtyChange = parseInt(adjustForm.quantity, 10) || 0;
    if (qtyChange <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (type === 'out' && qtyChange > item.available) {
      toast.error(`Cannot remove more than available stock (${item.available} ${item.unit})`);
      return;
    }

    const newAvailable = type === 'in' ? item.available + qtyChange : item.available - qtyChange;
    let newStatus = 'In Stock';
    if (newAvailable <= Math.round(item.reorderLevel * 0.3)) newStatus = 'Critical';
    else if (newAvailable <= item.reorderLevel) newStatus = 'Low Stock';

    const valueDelta = (type === 'in' ? qtyChange : -qtyChange) * item.unitCost;

    const nextItems = data.items.map((i) => {
      if (i.id === item.id) {
        return {
          ...i,
          available: newAvailable,
          status: newStatus,
          distribution: {
            ...i.distribution,
            'Main Clinic': Math.max(0, (i.distribution?.['Main Clinic'] || 0) + (type === 'in' ? qtyChange : -qtyChange)),
          },
        };
      }
      return i;
    });

    let lowDelta = 0;
    const wasLow = item.status === 'Low Stock' || item.status === 'Critical';
    const isNowLow = newStatus === 'Low Stock' || newStatus === 'Critical';
    if (!wasLow && isNowLow) lowDelta = 1;
    if (wasLow && !isNowLow) lowDelta = -1;

    const newMovement = {
      id: `mov-${Date.now()}`,
      date: 'Just now',
      item: item.name,
      type: type === 'in' ? 'Stock In' : 'Stock Out',
      qty: `${type === 'in' ? '+' : '-'}${qtyChange} ${item.unit}`,
      by: 'Demo Clinic Lead',
      note: adjustForm.reason || (type === 'in' ? 'Batch Inward' : 'Consumption'),
    };

    const nextStats = {
      ...data.stats,
      lowStockItems: Math.max(0, (data.stats?.lowStockItems || 18) + lowDelta),
      totalStockValue: Math.max(0, (data.stats?.totalStockValue || 482350) + valueDelta),
    };

    onUpdateData({
      ...data,
      items: nextItems,
      stats: nextStats,
      movements: [newMovement, ...(data.movements || [])],
    });

    toast.success(
      type === 'in'
        ? `Added ${qtyChange} ${item.unit} to ${item.name}`
        : `Deducted ${qtyChange} ${item.unit} from ${item.name}`
    );
    setShowAdjustModal(null);
  };

  // 3. TRANSFER STOCK
  const handleTransferStock = (e) => {
    e.preventDefault();
    if (!showTransferModal) return;

    const qty = parseInt(transferForm.quantity, 10) || 0;
    if (qty <= 0) {
      toast.error('Transfer quantity must be greater than 0');
      return;
    }

    const srcAvailable = showTransferModal.distribution?.[transferForm.sourceClinic] || 0;
    if (qty > srcAvailable) {
      toast.error(`Insufficient stock in ${transferForm.sourceClinic} (${srcAvailable} ${showTransferModal.unit} available)`);
      return;
    }

    const nextItems = data.items.map((i) => {
      if (i.id === showTransferModal.id) {
        return {
          ...i,
          distribution: {
            ...i.distribution,
            [transferForm.sourceClinic]: srcAvailable - qty,
            [transferForm.targetClinic]: (i.distribution?.[transferForm.targetClinic] || 0) + qty,
          },
        };
      }
      return i;
    });

    const newMovement = {
      id: `mov-${Date.now()}`,
      date: 'Just now',
      item: showTransferModal.name,
      type: 'Transfer',
      qty: `${qty} ${showTransferModal.unit}`,
      by: 'Demo Admin Lead',
      note: `${transferForm.sourceClinic} -> ${transferForm.targetClinic}`,
    };

    onUpdateData({
      ...data,
      items: nextItems,
      movements: [newMovement, ...(data.movements || [])],
    });

    toast.success(`Transferred ${qty} ${showTransferModal.unit} to ${transferForm.targetClinic}`);
    setShowTransferModal(null);
  };

  // 4. CREATE PURCHASE REQUEST
  const handlePurchaseRequest = (e) => {
    e.preventDefault();
    if (!showRequestModal) return;

    const qty = parseInt(requestForm.quantity, 10) || 0;
    if (qty <= 0) {
      toast.error('Please enter a valid request quantity');
      return;
    }

    const nextStats = {
      ...data.stats,
      pendingRequests: (data.stats?.pendingRequests || 6) + 1,
    };

    onUpdateData({ ...data, stats: nextStats });
    toast.success(`Purchase Request created for ${qty} ${showRequestModal.unit} of ${showRequestModal.name}!`);
    setShowRequestModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Live Tag */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
          Inventory Management
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
        {/* Total Items */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Total Items</span>
            <Info size={13} className="text-blue-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.totalItems?.toLocaleString() || '428'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-slate-600 bg-slate-100">
            Inventory Items
          </span>
        </div>

        {/* Low Stock Items */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Low Stock Items</span>
            <AlertTriangle size={13} className="text-amber-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.lowStockItems?.toLocaleString() || '18'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-amber-700 bg-amber-50 border border-amber-200/70">
            Needs Reorder
          </span>
        </div>

        {/* Pending Requests */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Pending Requests</span>
            <Clock size={13} className="text-purple-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.pendingRequests?.toLocaleString() || '6'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-purple-700 bg-purple-50 border border-purple-200/70">
            Awaiting Approval
          </span>
        </div>

        {/* Total Stock Value */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Total Stock Value</span>
            <IndianRupee size={13} className="text-emerald-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            ₹{data.stats?.totalStockValue?.toLocaleString('en-IN') || '4,82,350'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-emerald-700 bg-emerald-50 border border-emerald-200/70">
            Current Value
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
            placeholder="Search item name or SKU..."
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

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All Categories">All Categories</option>
          <option value="Consumables">Consumables</option>
          <option value="Equipment">Equipment</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All Status">All Status</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Critical">Critical</option>
        </select>

        {/* Add Item Action */}
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Item</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold">
            <tr>
              <th className="py-2.5 px-3">Item Name</th>
              <th className="py-2.5 px-3">SKU / Code</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Available</th>
              <th className="py-2.5 px-3">Unit</th>
              <th className="py-2.5 px-3">Reorder Level</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No inventory items match your search or filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Boxes size={12} className="text-blue-500 shrink-0" />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
                    {row.sku}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.category}
                  </td>
                  <td className="py-2.5 px-3 font-extrabold text-slate-900">
                    {row.available.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.unit}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.reorderLevel}
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
                          className="absolute right-3 top-8 w-48 bg-white rounded-lg shadow-lg border border-slate-200/90 py-1 z-30 text-left text-xs"
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowAdjustModal({ item: row, type: 'in' });
                              setAdjustForm({ quantity: 50, reason: 'Vendor Shipment PO-7801' });
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                          >
                            <ArrowUpCircle size={13} className="text-emerald-500" />
                            <span>Record Stock In</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowAdjustModal({ item: row, type: 'out' });
                              setAdjustForm({ quantity: Math.min(10, row.available), reason: 'Department usage' });
                            }}
                            disabled={row.available <= 0}
                            className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 hover:text-rose-700 transition ${
                              row.available <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <ArrowDownCircle size={13} className="text-rose-500" />
                            <span>Record Stock Out</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowTransferModal(row);
                              setTransferForm({
                                sourceClinic: 'Main Clinic',
                                targetClinic: 'Indiranagar Branch',
                                quantity: Math.min(10, row.available),
                              });
                            }}
                            disabled={row.available <= 0}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Building2 size={13} className="text-blue-500" />
                            <span>Transfer Between Clinics</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowRequestModal(row);
                              setRequestForm({
                                quantity: row.reorderLevel * 2,
                                urgency: row.status === 'Critical' ? 'Urgent' : 'Normal',
                                vendor: 'MedTech Supplies Ltd.',
                                notes: 'Automatic reorder request',
                              });
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-purple-50 hover:text-purple-600 transition cursor-pointer"
                          >
                            <Send size={13} className="text-purple-500" />
                            <span>Create Purchase Request</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowDistributionModal(row);
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                          >
                            <Info size={13} className="text-slate-400" />
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

      {/* Movement History Trigger */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setShowHistoryModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <History size={13} />
          <span>View Stock Movement Audit Log ({data.movements?.length || 4} recent)</span>
        </button>
      </div>

      {/* ── MODAL 1: ADD ITEM ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Boxes size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Add Inventory Item (Demo)</h4>
                  <p className="text-[11px] text-slate-500">Track supplies or clinic equipment</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sterile IV Cannula 20G"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU / Code</label>
                  <input
                    type="text"
                    placeholder="CAN-008"
                    value={addForm.sku}
                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Consumables">Consumables</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.available}
                    onChange={(e) => setAddForm({ ...addForm, available: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Piece">Piece</option>
                    <option value="Box">Box</option>
                    <option value="Unit">Unit</option>
                    <option value="Roll">Roll</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="1"
                    value={addForm.reorderLevel}
                    onChange={(e) => setAddForm({ ...addForm, reorderLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit Cost (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={addForm.unitCost}
                  onChange={(e) => setAddForm({ ...addForm, unitCost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                />
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
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: STOCK IN / OUT ADJUST ── */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${
              showAdjustModal.type === 'in' ? 'bg-emerald-50/50' : 'bg-rose-50/50'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  showAdjustModal.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {showAdjustModal.type === 'in' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {showAdjustModal.type === 'in' ? 'Record Stock In' : 'Record Stock Out'} (Demo)
                  </h4>
                  <p className="text-[11px] text-slate-500">{showAdjustModal.item.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdjustModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStockAdjust} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Current Stock</span>
                  <p className="font-bold text-slate-900">{showAdjustModal.item.available} {showAdjustModal.item.unit}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Reorder Threshold</span>
                  <p className="font-bold text-slate-700">{showAdjustModal.item.reorderLevel} {showAdjustModal.item.unit}</p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity ({showAdjustModal.item.unit}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={showAdjustModal.type === 'out' ? showAdjustModal.item.available : 99999}
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Reference Note</label>
                <input
                  type="text"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-lg font-bold shadow-xs transition ${
                    showAdjustModal.type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {showAdjustModal.type === 'in' ? 'Confirm Stock In' : 'Confirm Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: TRANSFER BETWEEN CLINICS ── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Transfer Stock Between Clinics</h4>
                  <p className="text-[11px] text-slate-500">{showTransferModal.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTransferModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleTransferStock} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source Clinic</label>
                  <select
                    value={transferForm.sourceClinic}
                    onChange={(e) => setTransferForm({ ...transferForm, sourceClinic: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Main Clinic">Main Clinic</option>
                    <option value="Indiranagar Branch">Indiranagar Branch</option>
                    <option value="Whitefield Care Hub">Whitefield Care Hub</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Clinic</label>
                  <select
                    value={transferForm.targetClinic}
                    onChange={(e) => setTransferForm({ ...transferForm, targetClinic: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Indiranagar Branch">Indiranagar Branch</option>
                    <option value="Whitefield Care Hub">Whitefield Care Hub</option>
                    <option value="Main Clinic">Main Clinic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transfer Quantity ({showTransferModal.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-700">
                Maintains balance consistency across your branch inventory without double-counting.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: PURCHASE REQUEST ── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Send size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Create Purchase Requisition</h4>
                  <p className="text-[11px] text-slate-500">{showRequestModal.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRequestModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePurchaseRequest} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={requestForm.quantity}
                    onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={requestForm.urgency}
                    onChange={(e) => setRequestForm({ ...requestForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Normal">Normal (3-5 days)</option>
                    <option value="Urgent">Urgent (24 hours)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vendor / Distributor</label>
                <input
                  type="text"
                  value={requestForm.vendor}
                  onChange={(e) => setRequestForm({ ...requestForm, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: MOVEMENT AUDIT LOG ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <History size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Stock Movement Audit History</h4>
                  <p className="text-[11px] text-slate-500">Live transaction log of ins, outs, and transfers</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5 text-xs">
              {(data.movements || []).map((m) => (
                <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{m.item}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                        m.type === 'Stock In' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        m.type === 'Stock Out' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {m.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{m.note} • By {m.by}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 block">{m.qty}</span>
                    <span className="text-[10px] text-slate-400">{m.date}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: CLINIC DISTRIBUTION ── */}
      {showDistributionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Clinic Distribution</h4>
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
                <span className="font-semibold text-slate-500">Total Available Quantity</span>
                <span className="font-black text-slate-900 text-sm">
                  {showDistributionModal.available} {showDistributionModal.unit}
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(showDistributionModal.distribution || {}).map(([clinicName, qty]) => {
                  const percentage = showDistributionModal.available > 0 
                    ? Math.round((qty / showDistributionModal.available) * 100) 
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
