import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Pill, ShoppingBag, Users, AlertTriangle,
  Search, Scan, RefreshCw, Barcode, Plus, Minus, Trash2,
  CreditCard, CheckCircle2, ChevronRight, Ban, Eye, FileText,
  Printer, ArrowLeftRight, Activity, ArrowUpRight, DollarSign, Calendar,
  ChevronDown, Bell, RotateCcw, LogOut, MessageSquare, ShieldAlert, Package,
  Layers, Truck, FileBarChart, Settings, HelpCircle, Star, X, Clock, Check, ArrowRight, UserPlus, Menu, Lock,
  Store, ShoppingCart, Volume2, VolumeX, Ban as BanIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pharmacyApi } from '../../api/pharmacyApi';
import { authApi } from '../../api/authApi';
import { providersApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_BADGES = {
  pending:            { label: 'New',              cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  confirmed:          { label: 'Confirmed',        cls: 'bg-blue-50 text-blue-700 border border-blue-250' },
  preparing:          { label: 'Preparing',        cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  packed:             { label: 'Packed',           cls: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  ready_for_pickup:   { label: 'Ready for Pickup', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
  ready_for_delivery: { label: 'Ready for Delivery',cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  out_for_delivery:   { label: 'Out for Delivery', cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  completed:          { label: 'Completed',        cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
  cancelled:          { label: 'Cancelled',        cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  rejected:           { label: 'Rejected',         cls: 'bg-red-50 text-red-700 border border-red-200' }
};

const PrescriptionOrdersWorkspace = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Basic Profiles
  const [profileData, setProfileData] = useState(null);
  const [providerDetails, setProviderDetails] = useState(null);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    newOrders: 0,
    takeaway: 0,
    delivery: 0,
    urgent: 0,
    value: 0
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const selectedOrderRef = useRef(null);
  selectedOrderRef.current = selectedOrder;

  const ordersRef = useRef([]);
  ordersRef.current = orders;
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [prepTime, setPrepTime] = useState('30 Minutes');
  const [deliveryPartner, setDeliveryPartner] = useState('Self Delivery');
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [showPickupVerify, setShowPickupVerify] = useState(false);

  // Filters & Tabs
  const [activeStatusTab, setActiveStatusTab] = useState('All'); // 'All' | 'Pending' | 'Preparing' | etc.
  const [activeMethodTab, setActiveMethodTab] = useState('All'); // 'All' | 'Takeaway' | 'Home Delivery'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Configuration States
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rejectionModalOrder, setRejectionModalOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Medicine unavailable');
  const [activeRowMenu, setActiveRowMenu] = useState(null);

  /* ── Load Profile & Provider ────────────────────────────────────────── */
  useEffect(() => {
    authApi.me().then(res => {
      if (res?.user) setProfileData(res.user);
    }).catch(err => console.error('Failed to load profile:', err));
  }, []);

  useEffect(() => {
    if (profileData?.providerId) {
      providersApi.getProvider(profileData.providerId)
        .then(res => setProviderDetails(res.data || res))
        .catch(err => console.error('Failed to load operator provider:', err));
    }
  }, [profileData]);

  /* ── Load Orders List ────────────────────────────────────────────────── */
  const loadOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Query parameters
      const params = {};
      if (profileData?.providerId) {
        params.providerId = profileData.providerId;
      }
      
      const [ordersRes, dispensingsRes] = await Promise.all([
        pharmacyApi.listPharmacyOrders(params).catch(() => ({ orders: [] })),
        pharmacyApi.listDispensings().catch(() => [])
      ]);

      const onlineList = ordersRes?.orders ?? ordersRes?.data?.orders ?? [];
      const dispensingsList = dispensingsRes?.dispensingRecords || dispensingsRes?.data?.dispensingRecords || (Array.isArray(dispensingsRes) ? dispensingsRes : []);

      // Map dispensing records to uniform order structure
      const mappedDispensings = dispensingsList.map(r => ({
        _id: r._id || r.id,
        patientId: r.patientId ? {
          _id: r.patientId._id,
          fullName: r.patientId.fullName || `${r.patientId.firstName || ''} ${r.patientId.lastName || ''}`.trim(),
          phone: r.patientId.phone || '—',
          email: r.patientId.email || '—'
        } : {
          fullName: r.patientName || 'Walk-in Customer',
          phone: '—',
          email: '—'
        },
        deliveryMethod: r.prescriptionId ? 'Pickup' : 'Pickup', // Walk-in or prescription dispenses are takeaway
        totalPrice: r.subtotal || r.amount || 0,
        paymentStatus: 'Paid',
        status: r.status === 'dispensed' || r.status === 'finalized' ? 'completed' : (r.status === 'draft' ? 'pending' : r.status),
        orderedAt: r.dispensedAt || r.createdAt,
        createdAt: r.createdAt,
        items: (r.items || []).map(item => ({
          _id: item.medicineId?._id || item.medicineId,
          name: item.medicineName || 'Medicine',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        isPharmacistCreated: true
      }));

      // Merge and sort by orderedAt descending
      const list = [...onlineList, ...mappedDispensings].sort((a, b) => {
        const dateA = new Date(a.orderedAt || a.createdAt);
        const dateB = new Date(b.orderedAt || b.createdAt);
        return dateB - dateA;
      });

      // Calculate stats based on loaded orders
      const newOrdersCount = list.filter(o => o.status === 'pending').length;
      const takeawayCount = list.filter(o => o.deliveryMethod === 'Pickup').length;
      const deliveryCount = list.filter(o => o.deliveryMethod === 'Home Delivery').length;
      const urgentCount = list.filter(o => o.priority === 'High' || o.priority === 'Urgent' || o.quantity > 5).length;
      const totalVal = list.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

      setStats({
        newOrders: newOrdersCount,
        takeaway: takeawayCount,
        delivery: deliveryCount,
        urgent: urgentCount,
        value: totalVal
      });

      // Sound notification logic
      if (list.length > ordersRef.current.length && ordersRef.current.length > 0 && soundEnabled) {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
          audio.volume = 0.5;
          audio.play();
        } catch (e) { /* audio play blocked */ }
        toast('New order received!', { icon: '🔔' });
      }

      setOrders(list);

      // Maintain selection or select first if none selected
      if (list.length > 0) {
        if (!selectedOrderRef.current) {
          setSelectedOrder(list[0]);
        } else {
          const updated = list.find(o => o._id === selectedOrderRef.current._id);
          if (updated) setSelectedOrder(updated);
        }
      } else {
        setSelectedOrder(null);
      }

    } catch (e) {
      toast.error('Failed to fetch online orders');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [profileData, soundEnabled]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /* ── Auto Refresh Effect ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadOrders(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadOrders]);

  /* ── Update Order Status API Handler ────────────────────────────────── */
  const handleUpdateStatus = async (orderId, statusVal, reason = '') => {
    try {
      const payload = { status: statusVal };
      if (reason) payload.rejectionReason = reason;

      await pharmacyApi.updateOrderStatus(orderId, payload);
      toast.success(`Order status updated to ${statusVal}`);
      
      // Reload matching state
      await loadOrders(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to update order status');
    }
  };

  /* ── Computed Filtering ───────────────────────────────────────────────── */
  const filteredOrders = orders.filter(o => {
    // Status Tab filter
    if (activeStatusTab !== 'All') {
      const st = activeStatusTab.toLowerCase().replace(/ /g, '_');
      if (st === 'new_orders' && o.status !== 'pending' && o.status !== 'confirmed') return false;
      if (st === 'preparing' && o.status !== 'preparing') return false;
      if (st === 'ready_for_pickup' && o.status !== 'ready_for_pickup') return false;
      if (st === 'ready_for_delivery' && o.status !== 'ready_for_delivery') return false;
      if (st === 'out_for_delivery' && o.status !== 'out_for_delivery') return false;
      if (st === 'completed' && o.status !== 'completed') return false;
      if (st === 'cancelled' && o.status !== 'cancelled' && o.status !== 'rejected') return false;
    }

    // Delivery Method tab filter
    if (activeMethodTab !== 'All') {
      if (activeMethodTab === 'Takeaway' && o.deliveryMethod !== 'Pickup') return false;
      if (activeMethodTab === 'Home Delivery' && o.deliveryMethod !== 'Home Delivery') return false;
    }

    // Dropdown filters
    if (statusFilter && o.status !== statusFilter) return false;
    if (methodFilter && o.deliveryMethod !== (methodFilter === 'Pickup' ? 'Pickup' : 'Home Delivery')) return false;
    if (paymentFilter && o.paymentStatus !== paymentFilter) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const patientName = o.patientId?.fullName || `${o.patientId?.firstName || ''} ${o.patientId?.lastName || ''}`;
      return (
        o._id.toLowerCase().includes(q) ||
        patientName.toLowerCase().includes(q) ||
        (o.patientId?.phone || '').includes(q) ||
        (o.medicineId?.name || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="flex-1 bg-slate-50 flex flex-col min-w-0 text-slate-850 p-6 space-y-6">
      
      {/* Main workspace */}
      <div className="flex-1 space-y-6 overflow-y-auto max-h-[85vh]">
            
            {/* Header description */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  New Recent Orders
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {stats.newOrders} New
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orders placed online by patients through your pharmacy store. Review, verify, prepare and dispatch medicines.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    autoRefresh ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                  Auto Refresh
                </button>
                <button onClick={() => window.print()} className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition">
                  Print Queue
                </button>
                <button
                  onClick={() => loadOrders()}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 text-slate-500 rounded-xl transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl border transition-all ${
                    soundEnabled ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                  }`}
                  title={soundEnabled ? 'Mute Notification Sounds' : 'Unmute Notification Sounds'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* KPI statistics strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                { label: 'New Orders', val: stats.newOrders, sub: 'Needs verification', bg: 'bg-blue-50 text-blue-600 border border-blue-100' },
                { label: 'Takeaway', val: stats.takeaway, sub: 'Self pickup', bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
                { label: 'Delivery', val: stats.delivery, sub: 'Home delivery orders', bg: 'bg-purple-50 text-purple-600 border border-purple-100' },
                { label: 'Urgent Alert', val: stats.urgent, sub: 'Priority orders', bg: 'bg-amber-50 text-amber-600 border border-amber-100' },
                { label: 'Today\'s Value', val: fmt(stats.value), sub: 'Gross valuation', bg: 'bg-indigo-50 text-indigo-600 border border-indigo-100' }
              ].map((k, i) => (
                <div key={i} className={`p-4 rounded-2xl ${k.bg} shadow-xs space-y-1.5`}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k.label}</p>
                  <p className="text-xl font-black">{k.val}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Main Listing block */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
              
              {/* Status tabs */}
              <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
                {['All', 'New Orders', 'Preparing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Completed', 'Cancelled'].map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveStatusTab(t)}
                    className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 -mb-px ${
                      activeStatusTab === t ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {t === 'All' ? 'All Orders' : t}
                  </button>
                ))}
              </div>

              {/* Toolbar */}
              <div className="p-4 border-b border-slate-50 flex items-center gap-3 flex-wrap bg-slate-50/20">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by Order ID, Patient Name, Phone, Medicine..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700"
                >
                  <option value="">All Statuses</option>
                  {Object.keys(STATUS_BADGES).map(k => (
                    <option key={k} value={k}>{STATUS_BADGES[k].label}</option>
                  ))}
                </select>

                <select
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700"
                >
                  <option value="">All Methods</option>
                  <option value="Pickup">🏪 Takeaway</option>
                  <option value="Home Delivery">🚚 Home Delivery</option>
                </select>

                <button
                  onClick={() => { setSearch(''); setStatusFilter(''); setMethodFilter(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Patient Details</th>
                      <th className="px-4 py-3">Delivery Method</th>
                      <th className="px-4 py-3">Order Value</th>
                      <th className="px-4 py-3">Payment Status</th>
                      <th className="px-4 py-3">Order Status</th>
                      <th className="px-4 py-3">Order Time</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      [...Array(6)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={8} className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-full" /></td>
                        </tr>
                      ))
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center text-slate-400 font-bold">
                          <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                          No online orders match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => {
                        const isSelected = selectedOrder?._id === order._id;
                        const sBadge = STATUS_BADGES[order.status] || STATUS_BADGES.pending;
                        const patientName = order.patientId?.fullName || `${order.patientId?.firstName || ''} ${order.patientId?.lastName || ''}`;

                        return (
                          <tr
                            key={order._id}
                            onClick={() => { setSelectedOrder(order); setShowDetailsDrawer(true); }}
                            className={`cursor-pointer transition ${
                              isSelected ? 'bg-blue-50/30 font-semibold' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="px-4 py-3.5 font-mono text-blue-600 font-extrabold text-[10px]">
                              {order._id?.slice(-8)?.toUpperCase()}
                            </td>
                            <td className="px-4 py-3.5">
                              <div>
                                <p className="font-bold text-slate-800">{patientName}</p>
                                <p className="text-[10px] text-slate-400">{order.patientId?.phone || '—'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="font-semibold text-slate-700 flex items-center gap-1">
                                {order.isPharmacistCreated 
                                  ? (order.patientId?.fullName === 'Walk-in Customer' ? '⚡ Walk-in (POS)' : '💊 In-Person (Rx)')
                                  : (order.deliveryMethod === 'Pickup' ? '🏪 Takeaway' : '🚚 Home Delivery')}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-black text-slate-800">
                              {fmt(order.totalPrice)}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {order.paymentStatus || 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${sBadge.cls}`}>
                                {sBadge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500">
                              <div>
                                <p className="font-semibold">{fmtDate(order.orderedAt || order.createdAt)}</p>
                                <p className="text-[10px] mt-0.5 text-slate-400">{fmtTime(order.orderedAt || order.createdAt)}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => { setSelectedOrder(order); setShowDetailsDrawer(true); }}
                                  className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {order.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => setRejectionModalOrder(order)}
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold text-[10px] transition"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        {/* ── Order Details Slide-Over Drawer ── */}
        {showDetailsDrawer && selectedOrder && (() => {
          const sBadge = STATUS_BADGES[selectedOrder.status] || STATUS_BADGES.pending;
          const patientName = selectedOrder.patientId?.fullName || `${selectedOrder.patientId?.firstName || ''} ${selectedOrder.patientId?.lastName || ''}`.trim() || 'Walk-in Customer';
          
          return (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex justify-end z-50">
              <div className="w-full max-w-lg bg-white h-screen shadow-2xl flex flex-col justify-between animate-slide-in">
                
                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm shrink-0">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm flex items-center gap-2">
                        Order #{selectedOrder._id?.slice(-8)?.toUpperCase()}
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${sBadge.cls}`}>
                          {sBadge.label}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Placed on {fmtDate(selectedOrder.orderedAt || selectedOrder.createdAt)} at {fmtTime(selectedOrder.orderedAt || selectedOrder.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDetailsDrawer(false)}
                    className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  
                  {/* Source Indicator */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500">Order Channel</span>
                    <span className="font-black text-blue-700 bg-blue-100/50 px-2.5 py-1 rounded-lg">
                      {selectedOrder.isPharmacistCreated 
                        ? (patientName === 'Walk-in Customer' ? '⚡ Walk-in (POS)' : '💊 In-Person (Rx)')
                        : '🌐 Online Patient Portal'}
                    </span>
                  </div>

                  {/* Patient Info */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2.5">
                    <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Patient Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-slate-700 font-semibold">
                      <div>
                        <p className="text-[9px] text-slate-400">Full Name</p>
                        <p className="font-extrabold text-slate-855 mt-0.5">{patientName}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">Phone Number</p>
                        <p className="font-extrabold text-slate-855 mt-0.5">{selectedOrder.patientId?.phone || '—'}</p>
                      </div>
                      {selectedOrder.patientId?.email && selectedOrder.patientId.email !== '—' && (
                        <div className="col-span-2">
                          <p className="text-[9px] text-slate-400">Email Address</p>
                          <p className="text-slate-805 mt-0.5">{selectedOrder.patientId.email}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery & Payment */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Delivery Mode</p>
                      <p className="font-extrabold text-slate-800">
                        {selectedOrder.isPharmacistCreated ? 'Store Handover' : (selectedOrder.deliveryMethod === 'Pickup' ? 'Takeaway' : 'Home Delivery')}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Payment Details</p>
                      <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedOrder.paymentStatus === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {selectedOrder.paymentStatus || 'Pending'}
                      </p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2.5">
                    <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Items & Medicines</h4>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <th className="px-4 py-2.5">Item</th>
                            <th className="px-4 py-2.5 text-center">Qty</th>
                            <th className="px-4 py-2.5 text-right">Price</th>
                            <th className="px-4 py-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {((selectedOrder.items || []).length > 0 ? selectedOrder.items : [selectedOrder]).map((item, idx) => {
                            const unitPr = item.unitPrice || selectedOrder.totalPrice || 0;
                            const totalPr = item.totalPrice || (selectedOrder.totalPrice * (item.quantity || 1)) || 0;
                            
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-bold text-slate-800">
                                  {item.name || item.medicineId?.name || selectedOrder.medicineId?.name || 'Dispensed Medicine'}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-slate-600">
                                  {item.quantity || 1}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500">
                                  {fmt(unitPr)}
                                </td>
                                <td className="px-4 py-3 text-right font-black text-slate-800">
                                  {fmt(totalPr)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Total summary */}
                  <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                      <span>Subtotal</span>
                      <span>{fmt(selectedOrder.totalPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2">
                      <span>Discount / Coupons</span>
                      <span className="text-emerald-400">₹0</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-black">Gross Total</span>
                      <span className="text-base font-black text-blue-400">{fmt(selectedOrder.totalPrice)}</span>
                    </div>
                  </div>

                </div>

                {/* Footer Action Buttons */}
                <div className="p-6 border-t border-slate-100 flex flex-col gap-3 shrink-0 bg-slate-50">
                  {/* Step-by-Step workflow based on order status */}
                  
                  {selectedOrder.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          handleUpdateStatus(selectedOrder._id, 'confirmed');
                          setShowDetailsDrawer(false);
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                      >
                        Accept & Verify Prescription
                      </button>
                      <button 
                        onClick={() => {
                          setRejectionModalOrder(selectedOrder);
                          setShowDetailsDrawer(false);
                        }}
                        className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-xl text-xs font-bold transition border border-rose-200"
                      >
                        Reject Order
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'confirmed' && (
                    <button 
                      onClick={() => {
                        handleUpdateStatus(selectedOrder._id, 'preparing');
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                    >
                      Start Preparing Medicines
                    </button>
                  )}

                  {selectedOrder.status === 'preparing' && (
                    <div className="space-y-3">
                      {selectedOrder.deliveryMethod === 'Pickup' ? (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Estimated Pickup Time</label>
                            <select
                              value={prepTime}
                              onChange={(e) => setPrepTime(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="15 Minutes">15 Minutes</option>
                              <option value="30 Minutes">30 Minutes</option>
                              <option value="45 Minutes">45 Minutes</option>
                              <option value="1 Hour">1 Hour</option>
                              <option value="2 Hours">2 Hours</option>
                              <option value="Custom Time">Custom Time</option>
                            </select>
                          </div>
                          <button 
                            onClick={() => {
                              handleUpdateStatus(selectedOrder._id, 'ready_for_pickup', `Ready in ${prepTime}`);
                            }}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                          >
                            Mark Ready for Pickup
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => {
                            handleUpdateStatus(selectedOrder._id, 'packed');
                          }}
                          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                        >
                          Pack Medicines (Deduct Stock)
                        </button>
                      )}
                    </div>
                  )}

                  {selectedOrder.status === 'packed' && (
                    <button 
                      onClick={() => {
                        handleUpdateStatus(selectedOrder._id, 'ready_for_delivery');
                      }}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                    >
                      Mark Ready for Delivery
                    </button>
                  )}

                  {selectedOrder.status === 'ready_for_delivery' && (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Delivery Partner</label>
                        <input
                          type="text"
                          value={deliveryPartner}
                          onChange={(e) => setDeliveryPartner(e.target.value)}
                          placeholder="e.g. Dunzo, PhHealth Delivery, etc."
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          handleUpdateStatus(selectedOrder._id, 'out_for_delivery');
                        }}
                        className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                      >
                        Dispatch / Out for Delivery
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'out_for_delivery' && (
                    <button 
                      onClick={() => {
                        handleUpdateStatus(selectedOrder._id, 'completed');
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                    >
                      Mark Delivered (Complete Order)
                    </button>
                  )}

                  {selectedOrder.status === 'ready_for_pickup' && (
                    <div className="space-y-3 border border-purple-100 bg-purple-50/30 p-3 rounded-2xl">
                      <p className="text-[10px] font-black text-purple-700 uppercase">Verify Pickup Code / OTP</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pickupCodeInput}
                          onChange={(e) => setPickupCodeInput(e.target.value)}
                          placeholder="Enter PKU- Code"
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                        />
                        <button
                          onClick={async () => {
                            try {
                              const res = await pharmacyApi.verifyPickupCode(selectedOrder._id, {
                                pickupCode: pickupCodeInput.trim().toUpperCase(),
                                verificationMethod: 'Manual'
                              });
                              toast.success('Pickup verified successfully!');
                              setPickupCodeInput('');
                              loadOrders();
                              setSelectedOrder(res.order || res.data?.order || selectedOrder);
                            } catch (err) {
                              toast.error(err?.message || 'Invalid Pickup Code. Try again.');
                            }
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}

                  {['confirmed', 'preparing', 'ready_for_pickup', 'pending'].includes(selectedOrder.status) && selectedOrder.deliveryMethod === 'Pickup' && (
                    <div className="pt-2">
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to regenerate the pickup code? This will invalidate the current code.')) {
                            try {
                              const res = await pharmacyApi.regeneratePickupCode(selectedOrder._id);
                              toast.success('Pickup code regenerated successfully!');
                              const updatedOrder = res.order || res.data?.order || selectedOrder;
                              setSelectedOrder(updatedOrder);
                              loadOrders();
                            } catch (err) {
                              toast.error(err?.message || 'Failed to regenerate pickup code.');
                            }
                          }
                        }}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-250 text-slate-700 text-[10px] font-bold rounded-xl border border-slate-200 transition"
                      >
                        Regenerate Pickup Code
                      </button>
                    </div>
                  )}

                  {/* Print functions */}
                  {['packed', 'ready_for_delivery', 'out_for_delivery', 'completed'].includes(selectedOrder.status) && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => window.print()}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Invoice
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Packing Slip
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowDetailsDrawer(false)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition"
                  >
                    Close Window
                  </button>
                </div>

              </div>
            </div>
          );
        })()}

        {/* ── Rejection Reason Modal ────────────────────────────────────────── */}
        {rejectionModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 text-slate-800 space-y-4 animate-in zoom-in-95">
              <h3 className="text-sm font-black text-slate-900">Specify Rejection Reason</h3>
              <select
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Medicine unavailable</option>
                <option>Invalid prescription</option>
                <option>Duplicate order</option>
                <option>Store closed</option>
                <option>Other / Unspecified</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setRejectionModalOrder(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUpdateStatus(rejectionModalOrder._id, 'rejected', rejectionReason);
                    setRejectionModalOrder(null);
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition"
                >
                  Reject Order
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PrescriptionOrdersWorkspace;
