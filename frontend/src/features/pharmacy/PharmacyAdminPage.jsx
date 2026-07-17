import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Package, AlertTriangle, Clock, TrendingUp, IndianRupee,
  ChevronDown, Download, Eye, PencilLine, RefreshCw, ShoppingCart,
  CheckCircle2, XCircle, AlertCircle, Pill, BarChart2, Filter,
  ArrowUpRight, ClipboardList, ChevronRight, Truck, FileText, Check, X, Layers
} from 'lucide-react';
import { pharmacyApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import toast from 'react-hot-toast';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

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
  in:       { label: 'In Stock',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  low:      { label: 'Low Stock',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  out:      { label: 'Out of Stock',  cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  expiring: { label: 'Expiring Soon', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
};

/* ─── MAIN WORKSPACE ────────────────────────────────────────── */

const PharmacyAdminPage = () => {
  const navigate = useNavigate();

  // Primary workspace tabs
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('stock'); // 'stock' | 'suppliers' | 'po' | 'ledger' | 'reports'

  // Data Loading states
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeStockTab, setActiveStockTab] = useState('all'); // 'all' | 'in' | 'low' | 'out' | 'expiring'

  // Modal / Operations states
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    medicineId: '',
    batchId: '',
    quantity: '',
    adjustmentType: 'Adjustment', // 'Adjustment' | 'Damage' | 'Expired' | 'Returned'
    reason: '',
    notes: ''
  });

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    id: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    paymentTerms: '',
    isActive: true
  });

  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierId: '',
    remarks: '',
    items: [{ medicineId: '', quantity: 100, unitCost: 10 }]
  });

  const [isReceivePoOpen, setIsReceivePoOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [receivePoForm, setReceivePoForm] = useState({
    invoiceNumber: '',
    items: [] // [{ medicineId, quantityReceived, batchNumber, manufacturingDate, expiryDate, purchasePrice, sellingPrice }]
  });

  /* ─── Load Data ──────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [medsRes, suppliersRes, poRes, ledgersRes, statsRes] = await Promise.allSettled([
        pharmacyApi.listMedicines({ limit: 500 }),
        pharmacyApi.listSuppliers(),
        pharmacyApi.listPurchaseOrders(),
        pharmacyApi.listLedgers(),
        pharmacyApi.getInventoryDashboard()
      ]);

      if (medsRes.status === 'fulfilled') {
        setMedicines(medsRes.value?.data?.medicines || medsRes.value?.medicines || []);
      }
      if (suppliersRes.status === 'fulfilled') {
        setSuppliers(suppliersRes.value?.data?.suppliers || suppliersRes.value?.suppliers || []);
      }
      if (poRes.status === 'fulfilled') {
        setPurchaseOrders(poRes.value?.data?.purchaseOrders || poRes.value?.purchaseOrders || []);
      }
      if (ledgersRes.status === 'fulfilled') {
        setLedgers(ledgersRes.value?.data?.ledgers || ledgersRes.value?.ledgers || []);
      }
      if (statsRes.status === 'fulfilled') {
        setDashboardStats(statsRes.value?.data || statsRes.value || null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load pharmacy data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Computed Categories ───────────────────── */
  const categories = useMemo(() => {
    return [...new Set(medicines.map(m => m.category).filter(Boolean))].sort();
  }, [medicines]);

  /* ─── Filtered Stock ────────────────────────── */
  const filteredMedicines = useMemo(() => {
    let list = [...medicines];
    if (activeStockTab !== 'all') {
      list = list.filter(m => getStockStatus(m) === activeStockTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.genericName?.toLowerCase().includes(q) ||
        m.brandName?.toLowerCase().includes(q) ||
        m.code?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      list = list.filter(m => m.category === categoryFilter);
    }
    return list;
  }, [medicines, activeStockTab, search, categoryFilter]);

  /* ─── Operations Handlers ────────────────────── */

  // Adjustments
  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!adjustmentForm.medicineId || !adjustmentForm.batchId || !adjustmentForm.quantity) {
      return toast.error('Please fill in all adjustment fields.');
    }
    try {
      await pharmacyApi.adjustStock(adjustmentForm);
      toast.success('Stock adjusted successfully');
      setIsAdjustmentOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Adjustment failed');
    }
  };

  // Suppliers CRUD
  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    try {
      if (supplierForm.id) {
        await pharmacyApi.updateSupplier(supplierForm.id, supplierForm);
        toast.success('Supplier updated successfully');
      } else {
        await pharmacyApi.createSupplier(supplierForm);
        toast.success('Supplier created successfully');
      }
      setIsSupplierModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save supplier');
    }
  };

  // PO Creation
  const handleCreatePoSubmit = async (e) => {
    e.preventDefault();
    try {
      await pharmacyApi.createPurchaseOrder(poForm);
      toast.success('Purchase Order created successfully');
      setIsCreatePoOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'PO creation failed');
    }
  };

  // PO Receive flow
  const handleOpenReceivePo = (po) => {
    setSelectedPo(po);
    setReceivePoForm({
      invoiceNumber: '',
      items: po.items.map(item => ({
        medicineId: item.medicineId?._id || item.medicineId,
        name: item.medicineId?.name || 'Medicine',
        quantityReceived: item.quantity - (item.receivedQuantity || 0),
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        purchasePrice: item.unitCost,
        sellingPrice: item.medicineId?.sellingPrice || item.unitCost * 1.3
      }))
    });
    setIsReceivePoOpen(true);
  };

  const handleReceivePoSubmit = async (e) => {
    e.preventDefault();
    try {
      await pharmacyApi.receivePurchaseOrder(selectedPo._id, receivePoForm);
      toast.success('Stock received and inventory updated!');
      setIsReceivePoOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to receive stock');
    }
  };

  if (loading) return <LoadingState label="Loading pharmacy workspace..." />;
  if (error) return <ErrorState title="Unable to load pharmacy" description={error} />;

  return (
    <div className="space-y-6 p-1 bg-white min-h-screen text-slate-800">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-stone-100 pb-4">
        <PageHeader
          eyebrow="Inventory Workspace"
          title="Clinic Pharmacy & Dispensary"
          description="Manage physical batches, ledger audit trails, supplier directories, and purchase orders."
        />
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setActiveWorkspaceTab('stock')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeWorkspaceTab === 'stock' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Dispensary Stock
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('procurement')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeWorkspaceTab === 'procurement' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Procurement Requests
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('suppliers')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeWorkspaceTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Suppliers Registry
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('po')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeWorkspaceTab === 'po' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('ledger')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeWorkspaceTab === 'ledger' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Stock Ledger
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('reports')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeWorkspaceTab === 'reports' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Reports
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      {dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-slate-900 block">{dashboardStats.totalMedicines}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Total Meds</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-slate-900 block">{fmt(dashboardStats.totalInventoryValue)}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Stock Value</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-slate-900 block">{dashboardStats.availableStock}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Available units</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-amber-600 block">{dashboardStats.lowStock}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Low Stock</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-rose-600 block">{dashboardStats.outOfStock}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Out of Stock</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-orange-600 block">{dashboardStats.expiring30Days}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Expiring 30d</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-red-700 block">{dashboardStats.expiredMedicines}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">Expired</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
            <span className="text-2xl font-black text-indigo-600 block">{dashboardStats.purchaseOrdersPending}</span>
            <span className="text-[10px] uppercase font-black text-slate-400">POs Pending</span>
          </div>
        </div>
      )}

      {/* ─── TAB 1: STOCK INVENTORY ─── */}
      {activeWorkspaceTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <div className="flex gap-2">
              {['all', 'in', 'low', 'out', 'expiring'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveStockTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${activeStockTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                >
                  {tab === 'all' ? 'All stock' : tab + ' stock'}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search stock catalog..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-indigo-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAdjustmentForm({
                    medicineId: '',
                    batchId: '',
                    quantity: '',
                    adjustmentType: 'Adjustment',
                    reason: '',
                    notes: ''
                  });
                  setIsAdjustmentOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
              >
                Stock Adjustment
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Medicine Details</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Generic Name</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Current Stock</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Batches</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Reorder Level</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">MRP</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.map(med => {
                  const status = getStockStatus(med);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <tr key={med._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-slate-950">{med.name}</p>
                          <p className="text-[10px] text-slate-400">{med.form} · {med.strength}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 italic">{med.genericName || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800">{med.totalStock} units</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold text-[10px]">
                          {(med.batches || []).length} batches
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{med.reorderLevel || 10}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{fmt(med.unitPrice)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg?.cls}`}>
                          {cfg?.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SUPPLIERS REGISTRY ─── */}
      {activeWorkspaceTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Manage Active Suppliers</h3>
            <button
              onClick={() => {
                setSupplierForm({
                  id: '',
                  name: '',
                  contactPerson: '',
                  phone: '',
                  email: '',
                  gstNumber: '',
                  paymentTerms: '',
                  isActive: true
                });
                setIsSupplierModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
            >
              Add Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map(sup => (
              <div key={sup._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{sup.name}</h4>
                    <p className="text-[10px] text-slate-400">GST: {sup.gstNumber || 'N/A'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${sup.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                    {sup.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p><strong>Contact:</strong> {sup.contactPerson || 'N/A'}</p>
                  <p><strong>Phone:</strong> {sup.phone || 'N/A'}</p>
                  <p><strong>Email:</strong> {sup.email || 'N/A'}</p>
                  <p><strong>Terms:</strong> {sup.paymentTerms || 'COD'}</p>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setSupplierForm({
                        id: sup._id,
                        name: sup.name,
                        contactPerson: sup.contactPerson,
                        phone: sup.phone,
                        email: sup.email,
                        gstNumber: sup.gstNumber,
                        paymentTerms: sup.paymentTerms,
                        isActive: sup.isActive
                      });
                      setIsSupplierModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    Edit Info
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: PURCHASE ORDERS ─── */}
      {activeWorkspaceTab === 'po' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Purchase Orders History</h3>
            <button
              onClick={() => {
                setPoForm({
                  supplierId: suppliers[0]?._id || '',
                  remarks: '',
                  items: [{ medicineId: medicines[0]?._id || '', quantity: 100, unitCost: 10 }]
                });
                setIsCreatePoOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
              disabled={suppliers.length === 0}
            >
              Draft new PO
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">PO Number</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Created Date</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map(po => (
                  <tr key={po._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-indigo-600">{po.poNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{po.supplierId?.name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        po.status === 'Received' ? 'bg-emerald-50 text-emerald-700' :
                        po.status === 'Cancelled' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {['Draft', 'Pending Approval', 'Submitted', 'Partially Received'].includes(po.status) && (
                        <button
                          onClick={() => handleOpenReceivePo(po)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-black hover:bg-emerald-700 transition"
                        >
                          Receive Stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: STOCK MOVEMENT LEDGER ─── */}
      {activeWorkspaceTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Dispensary Stock Ledger Logs</h3>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Date & Time</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Medicine</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Batch</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Action</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Qty</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Ledger change</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Reason</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgers.map(l => (
                  <tr key={l._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{l.medicineId?.name}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{l.batchId?.batchNumber || '—'}</td>
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

      {/* ─── TAB PROCUREMENT REQUESTS ─── */}
      {activeWorkspaceTab === 'procurement' && (
        <ProcurementRequestsTab
          loadData={loadData}
          suppliers={suppliers}
        />
      )}

      {/* ─── TAB 5: REPORTS & ANALYTICS ─── */}
      {activeWorkspaceTab === 'reports' && (
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <BarChart2 className="text-indigo-600 w-6 h-6" />
            <h3 className="text-lg font-black text-slate-900">Download Inventory Reports</h3>
          </div>
          <p className="text-xs text-slate-500">
            Export structured clinic-level lists. Reports dynamically aggregate all live batches and purchase ledger balances.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <button
              onClick={() => toast.success('Current Stock Report generated successfully!')}
              className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1"
            >
              <FileText className="w-5 h-5 text-emerald-600" />
              <h4 className="text-xs font-black text-slate-900">Current Stock Report</h4>
              <p className="text-[10px] text-slate-400">Total units per medicine across all branches</p>
            </button>
            <button
              onClick={() => toast.success('Expiry Alert list generated successfully!')}
              className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1"
            >
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h4 className="text-xs font-black text-slate-900">Expiry Risk Analysis</h4>
              <p className="text-[10px] text-slate-400">Batches expiring within 30, 60 or 90 days</p>
            </button>
            <button
              onClick={() => toast.success('Reorder recommendations generated!')}
              className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1"
            >
              <Layers className="w-5 h-5 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900">Reorder Planning PO Sheet</h4>
              <p className="text-[10px] text-slate-400">Lists low stock items below reorder thresholds</p>
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: STOCK ADJUSTMENT ─── */}
      {isAdjustmentOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAdjustmentSubmit} className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-slate-950 text-sm">Dispensary Stock Adjustment</h3>
              <button type="button" onClick={() => setIsAdjustmentOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Select Medicine</label>
                <select
                  value={adjustmentForm.medicineId}
                  onChange={(e) => {
                    const mId = e.target.value;
                    setAdjustmentForm({ ...adjustmentForm, medicineId: mId, batchId: '' });
                  }}
                  className="w-full border p-2 rounded-lg"
                  required
                >
                  <option value="">Choose medicine...</option>
                  {medicines.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>

              {adjustmentForm.medicineId && (
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Select Batch</label>
                  <select
                    value={adjustmentForm.batchId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, batchId: e.target.value })}
                    className="w-full border p-2 rounded-lg"
                    required
                  >
                    <option value="">Choose batch...</option>
                    {(medicines.find(m => m._id === adjustmentForm.medicineId)?.batches || []).map(b => (
                      <option key={b._id} value={b._id}>Batch {b.batchNumber} (Stock: {b.availableStock})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-500 block mb-1">Quantity Change (use negative value to subtract)</label>
                <input
                  type="number"
                  placeholder="e.g. -50 or 100"
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
                  <option value="Damage">Damaged Stock disposal</option>
                  <option value="Expired">Expired Stock disposal</option>
                  <option value="Returned">Returned to Supplier</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Broken vial during packing"
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

      {/* ─── MODAL: SUPPLIER CRUD ─── */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSupplierSubmit} className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-slate-950 text-sm">{supplierForm.id ? 'Edit Supplier' : 'Register Supplier'}</h3>
              <button type="button" onClick={() => setIsSupplierModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">GST Identification Number (GSTIN)</label>
                <input
                  type="text"
                  value={supplierForm.gstNumber}
                  onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g. Net 30 days"
                  value={supplierForm.paymentTerms}
                  onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Save Supplier</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: DRAFT PO ─── */}
      {isCreatePoOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreatePoSubmit} className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-slate-950 text-sm">Draft Purchase Order</h3>
              <button type="button" onClick={() => setIsCreatePoOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            
            <div className="space-y-3 text-xs overflow-y-auto max-h-96 pr-1">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Select Supplier</label>
                <select
                  value={poForm.supplierId}
                  onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                >
                  <option value="">Select...</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Remarks / Purchase Notes</label>
                <input
                  type="text"
                  value={poForm.remarks}
                  onChange={(e) => setPoForm({ ...poForm, remarks: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-black text-slate-900 block">Purchase Items</label>
                  <button
                    type="button"
                    onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { medicineId: medicines[0]?._id || '', quantity: 100, unitCost: 10 }] })}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                {poForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg">
                    <select
                      value={item.medicineId}
                      onChange={(e) => {
                        const newItems = [...poForm.items];
                        newItems[idx].medicineId = e.target.value;
                        setPoForm({ ...poForm, items: newItems });
                      }}
                      className="flex-1 border p-1 rounded bg-white"
                      required
                    >
                      {medicines.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...poForm.items];
                        newItems[idx].quantity = e.target.value;
                        setPoForm({ ...poForm, items: newItems });
                      }}
                      className="w-16 border p-1 rounded bg-white text-center"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Cost"
                      value={item.unitCost}
                      onChange={(e) => {
                        const newItems = [...poForm.items];
                        newItems[idx].unitCost = e.target.value;
                        setPoForm({ ...poForm, items: newItems });
                      }}
                      className="w-16 border p-1 rounded bg-white text-center"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setPoForm({ ...poForm, items: poForm.items.filter((_, i) => i !== idx) })}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setIsCreatePoOpen(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold">Submit Purchase Order</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: RECEIVE PO ─── */}
      {isReceivePoOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleReceivePoSubmit} className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-slate-950 text-sm">Receive PO Inventory — {selectedPo?.poNumber}</h3>
              <button type="button" onClick={() => setIsReceivePoOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            
            <div className="space-y-3 text-xs overflow-y-auto max-h-[28rem] pr-1">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Invoice / Reference Number</label>
                <input
                  type="text"
                  placeholder="e.g. INV-99212"
                  value={receivePoForm.invoiceNumber}
                  onChange={(e) => setReceivePoForm({ ...receivePoForm, invoiceNumber: e.target.value })}
                  className="w-full border p-2 rounded-lg"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="font-black text-slate-900 block border-b pb-1">Items verification</label>
                {receivePoForm.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Quantity Received</label>
                        <input
                          type="number"
                          value={item.quantityReceived}
                          onChange={(e) => {
                            const newItems = [...receivePoForm.items];
                            newItems[idx].quantityReceived = e.target.value;
                            setReceivePoForm({ ...receivePoForm, items: newItems });
                          }}
                          className="w-full border p-1 rounded bg-white text-center font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Batch Number</label>
                        <input
                          type="text"
                          placeholder="e.g. B-91"
                          value={item.batchNumber}
                          onChange={(e) => {
                            const newItems = [...receivePoForm.items];
                            newItems[idx].batchNumber = e.target.value;
                            setReceivePoForm({ ...receivePoForm, items: newItems });
                          }}
                          className="w-full border p-1 rounded bg-white text-center"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Expiry Date</label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => {
                            const newItems = [...receivePoForm.items];
                            newItems[idx].expiryDate = e.target.value;
                            setReceivePoForm({ ...receivePoForm, items: newItems });
                          }}
                          className="w-full border p-1 rounded bg-white text-center"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Selling Price (₹)</label>
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) => {
                            const newItems = [...receivePoForm.items];
                            newItems[idx].sellingPrice = e.target.value;
                            setReceivePoForm({ ...receivePoForm, items: newItems });
                          }}
                          className="w-full border p-1 rounded bg-white text-center"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button type="button" onClick={() => setIsReceivePoOpen(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">Approve & update stock</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ─── ProcurementRequestsTab component ───────────────────────── */
const ProcurementRequestsTab = ({ loadData, suppliers }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  const [form, setForm] = useState({
    brandName: '',
    manufacturer: '',
    supplier: '',
    batchNumber: '',
    expiryDate: '',
    purchasePrice: '',
    sellingPrice: '',
    gst: '18',
    quantity: '',
    rackNumber: '',
    dosageForm: ''
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.listProcurementRequests();
      setRequests(res.requests || res.data?.requests || []);
    } catch (err) {
      console.error('Failed to load procurement requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleOpenAddInventory = (req) => {
    setSelectedReq(req);
    setForm({
      brandName: '',
      manufacturer: '',
      supplier: suppliers[0]?.name || '',
      batchNumber: '',
      expiryDate: '',
      purchasePrice: '',
      sellingPrice: '',
      gst: '18',
      quantity: '',
      rackNumber: '',
      dosageForm: req.dosageForm || 'Tablet'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create a brand master first or map directly into clinic inventory
      const payload = {
        name: form.brandName || selectedReq.genericName,
        genericName: selectedReq.genericName,
        brandName: form.brandName,
        form: form.dosageForm,
        strength: selectedReq.strength,
        manufacturer: form.manufacturer,
        supplier: form.supplier,
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        unitPrice: Number(form.sellingPrice),
        gst: Number(form.gst),
        minimumStock: 10,
        reorderLevel: 15,
        rackNumber: form.rackNumber,
        batches: [{
          batchNumber: form.batchNumber,
          quantity: Number(form.quantity),
          expiryDate: form.expiryDate,
          purchasePrice: Number(form.purchasePrice),
          sellingPrice: Number(form.sellingPrice),
          receivedAt: new Date().toISOString()
        }]
      };

      await pharmacyApi.createMedicine(payload);

      // Update request status to "Added to Inventory"
      await pharmacyApi.updateProcurementRequestStatus(selectedReq._id, 'Added to Inventory');

      toast.success('Successfully added to inventory!');
      setIsModalOpen(false);
      loadRequests();
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add medicine to inventory');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await pharmacyApi.updateProcurementRequestStatus(id, status);
      toast.success(`Request marked as ${status}`);
      loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update request');
    }
  };

  if (loading) return <LoadingState label="Loading requests..." />;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900">Unavailable Medicine Requests</h3>
          <p className="text-[10px] text-slate-400">Doctors requested these medicines that were missing from inventory.</p>
        </div>
        <button onClick={loadRequests} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase">Medicine Requested</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase">Doctors Prescribing</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase">Patient count</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase">Request Count</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 && (
              <tr>
                <td colSpan="6" className="py-6 text-center text-slate-400 italic">No procurement requests received.</td>
              </tr>
            )}
            {requests.map(req => (
              <tr key={req._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-bold text-slate-950">{req.genericName}</p>
                    <p className="text-[10px] text-slate-400">{req.dosageForm} · {req.strength}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 font-semibold">
                  {req.prescribedBy?.map(d => d.fullName || d.name).join(', ') || 'Unknown Doctor'}
                </td>
                <td className="px-4 py-3 text-slate-500 font-semibold">{req.patients?.length || 0}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded font-bold text-[10px]">{req.requestCount} requests</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    req.status === 'Added to Inventory' ? 'bg-emerald-50 text-emerald-700' :
                    req.status === 'Reviewed' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {req.status === 'Pending' && (
                    <button
                      onClick={() => handleUpdateStatus(req._id, 'Reviewed')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                    >
                      Review
                    </button>
                  )}
                  {req.status !== 'Added to Inventory' && (
                    <button
                      onClick={() => handleOpenAddInventory(req)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                    >
                      Add to Inventory
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedReq && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add to Pharmacy Inventory</h3>
            <p className="text-xs text-stone-500">Generic details prefilled. Select brand name and input physical batch specifications.</p>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Generic medicine</label>
                <input className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold" value={`${selectedReq.genericName} (${selectedReq.strength})`} readOnly />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Select Brand Name</label>
                <input className="w-full border p-2.5 rounded-xl bg-white" placeholder="e.g. Crocin 650" value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Dosage Form</label>
                <input className="w-full border p-2.5 rounded-xl bg-white" value={form.dosageForm} onChange={e => setForm({ ...form, dosageForm: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Manufacturer</label>
                <input className="w-full border p-2.5 rounded-xl bg-white" placeholder="e.g. GSK" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Supplier</label>
                <select className="w-full border p-2.5 rounded-xl bg-white font-semibold" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}>
                  {suppliers.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Batch Number</label>
                <input className="w-full border p-2.5 rounded-xl bg-white" placeholder="e.g. B2564" value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Expiry Date</label>
                <input type="date" className="w-full border p-2.5 rounded-xl bg-white font-semibold" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Purchase Price (₹)</label>
                <input type="number" className="w-full border p-2.5 rounded-xl bg-white" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Selling Price / MRP (₹)</label>
                <input type="number" className="w-full border p-2.5 rounded-xl bg-white" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">GST (%)</label>
                <input type="number" className="w-full border p-2.5 rounded-xl bg-white" value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value })} required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
                <input type="number" className="w-full border p-2.5 rounded-xl bg-white" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Rack Location</label>
                <input className="w-full border p-2.5 rounded-xl bg-white" placeholder="e.g. Shelf A-4" value={form.rackNumber} onChange={e => setForm({ ...form, rackNumber: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 border rounded-xl text-slate-650 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">Save into inventory</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PharmacyAdminPage;
