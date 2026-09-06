import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Phone, Building2, Droplets, CheckCircle2,
  AlertCircle, ChevronRight, Filter, Search, X, Eye, FileText,
  Download, ArrowUpDown, RefreshCw, Check, Home, User, ShieldCheck,
  Activity, Sparkles, Tag, ChevronDown, ChevronUp, AlertTriangle, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { labApi } from '../../lib/api';

export default function PatientLabOrdersView({
  selectedClinic,
  selectedLab,
  patient,
  onNavigate,
  initialStatusFilter = 'ALL',
  fromTab = 'lab-orders'
}) {
  const navigate = useNavigate();
  const clinicId = selectedClinic?._id || selectedClinic?.id;
  const labId = selectedLab?._id || selectedLab?.id;
  const labName = selectedLab?.name || 'Radha Krishna Laboratory';
  const labCity = selectedLab?.address?.city || selectedLab?.city || 'Ghaziabad';
  const patientId = patient?._id || patient?.id;
  const patientName = patient?.fullName || patient?.name || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'vidya';

  // 1. Data States
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 2. Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('ALL'); // 'ALL' | 'HOME_COLLECTION' | 'AT_LAB'
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter); // 'ALL' | 'SCHEDULED' | 'IN_LAB_TESTING' | 'REPORT_AVAILABLE' | 'CANCELLED'
  const [sourceFilter, setSourceFilter] = useState('ALL'); // 'ALL' | 'PATIENT_PORTAL' | 'WALK_IN'
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'OLDEST' | 'COLLECTION_DATE' | 'STATUS'
  const [showFilterModal, setShowFilterModal] = useState(false);

  // 3. Modal States
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [expandedPackageOrderIds, setExpandedPackageOrderIds] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch real orders from backend
  const fetchOrders = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await labApi.listOrders({
        clinicId,
        laboratoryId: labId,
        limit: 100
      });
      const list = res?.data?.labOrders || res?.labOrders || res?.data || [];
      if (Array.isArray(list)) {
        setOrders(list);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Could not load lab orders from API:', err?.message);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [clinicId, labId, patientId]);

  // Expand / collapse package constituent tests
  const togglePackageExpand = (orderId) => {
    setExpandedPackageOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Filtered and Sorted Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.tokenNumber || '').toLowerCase().includes(q) ||
        (o.packageName || '').toLowerCase().includes(q) ||
        (o.tests || []).some(t => (t.name || t.code || '').toLowerCase().includes(q))
      );
    }

    // Collection method filter
    if (collectionFilter !== 'ALL') {
      result = result.filter(o => (o.collectionMethod || 'AT_LAB').toUpperCase() === collectionFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(o => {
        const ds = (o.displayStatus || o.orderStatus || o.status || '').toUpperCase();
        if (statusFilter === 'SCHEDULED') return ds === 'SCHEDULED' || ds === 'AWAITING_COLLECTION' || ds === 'ORDER_BOOKED' || ds === 'ORDERED';
        if (statusFilter === 'IN_LAB_TESTING') return ds === 'IN_LAB_TESTING' || ds === 'SAMPLE_COLLECTED' || ds === 'PROCESSING';
        if (statusFilter === 'REPORT_AVAILABLE') return ds === 'REPORT_AVAILABLE' || ds === 'REPORT_GENERATED' || ds === 'COMPLETED';
        if (statusFilter === 'CANCELLED') return ds === 'CANCELLED';
        return true;
      });
    }

    // Source filter
    if (sourceFilter !== 'ALL') {
      result = result.filter(o => {
        const isWalkIn = o.isWalkIn || o.bookingSource === 'WALK_IN' || o.patientType === 'WALK_IN';
        if (sourceFilter === 'WALK_IN') return isWalkIn;
        if (sourceFilter === 'PATIENT_PORTAL') return !isWalkIn;
        return true;
      });
    }

    // Sorting
    if (sortBy === 'NEWEST') {
      result.sort((a, b) => new Date(b.orderedAt || b.createdAt) - new Date(a.orderedAt || a.createdAt));
    } else if (sortBy === 'OLDEST') {
      result.sort((a, b) => new Date(a.orderedAt || a.createdAt) - new Date(b.orderedAt || b.createdAt));
    } else if (sortBy === 'COLLECTION_DATE') {
      result.sort((a, b) => new Date(a.collectionDate || a.createdAt) - new Date(b.collectionDate || b.createdAt));
    } else if (sortBy === 'STATUS') {
      result.sort((a, b) => (b.activeStepIndex || 0) - (a.activeStepIndex || 0));
    }

    return result;
  }, [orders, searchQuery, collectionFilter, statusFilter, sourceFilter, sortBy]);

  // Separate Home Collection vs At Lab Orders
  const homeCollectionOrders = useMemo(() => {
    return filteredOrders.filter(o => (o.collectionMethod || '').toUpperCase() === 'HOME_COLLECTION');
  }, [filteredOrders]);

  const atLabOrders = useMemo(() => {
    return filteredOrders.filter(o => (o.collectionMethod || '').toUpperCase() !== 'HOME_COLLECTION');
  }, [filteredOrders]);

  // Handle Cancel Order
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this lab test order?')) return;
    setActionLoading(true);
    try {
      await labApi.cancelOrder(orderId, { reason: 'Cancelled by patient' });
      toast.success('Lab order cancelled successfully.');
      if (selectedOrderForDetails) setSelectedOrderForDetails(null);
      await fetchOrders(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewReport = (order) => {
    const targetId = order?._id || order?.orderNumber;
    if (targetId) {
      const activeLabId = selectedLab?._id || order?.laboratoryId || labId || '';
      const activeClinicId = selectedClinic?._id || order?.clinicId || clinicId || '';
      if (activeLabId) {
        localStorage.setItem('patientActiveLabId', activeLabId);
        window.dispatchEvent(new CustomEvent('patient:lab-changed', { detail: activeLabId }));
      }
      if (activeClinicId) {
        localStorage.setItem('patientActiveClinicId', activeClinicId);
      }
      navigate(`/patient/lab-reports/${targetId}?labId=${activeLabId}&clinicId=${activeClinicId}&fromTab=${fromTab}`);
    }
  };

  // Helper formatting functions
  const formatOrderDate = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return String(dateVal);
    }
  };

  const formatOrderDateTime = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day} ${month} ${year}, ${time}`;
    } catch {
      return String(dateVal);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (order) => {
    const ds = (order.displayStatus || order.orderStatus || order.status || '').toUpperCase();
    
    if (ds === 'CANCELLED') {
      return <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider rounded-xl">Cancelled</span>;
    }
    if (ds === 'REPORT_AVAILABLE' || ds === 'COMPLETED') {
      return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-xl">Report Available</span>;
    }
    if (ds === 'REPORT_GENERATED') {
      return <span className="px-3 py-1 bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider rounded-xl">Report Generated</span>;
    }
    if (ds === 'IN_LAB_TESTING') {
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider rounded-xl">In Lab Testing</span>;
    }
    if (ds === 'SAMPLE_COLLECTED') {
      return <span className="px-3 py-1 bg-teal-100 text-teal-800 text-[10px] font-black uppercase tracking-wider rounded-xl">Sample Collected</span>;
    }
    if (ds === 'AWAITING_COLLECTION') {
      return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-xl">Awaiting Collection</span>;
    }
    return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-xl">Scheduled</span>;
  };

  // 6-Step Home Timeline Definition
  const getHomeTimelineSteps = (order) => {
    const activeIdx = order.activeStepIndex !== undefined ? order.activeStepIndex : 1;
    const bookedTime = formatOrderDateTime(order.orderedAt || order.createdAt);
    const scheduledSlot = order.collectionSlot || '10:00 AM - 12:00 PM';
    const scheduledDate = formatOrderDate(order.collectionDate || order.createdAt);

    return [
      {
        id: 0,
        title: 'Order Booked',
        time: bookedTime,
        status: activeIdx >= 0 ? 'completed' : 'pending'
      },
      {
        id: 1,
        title: 'Collection Scheduled',
        time: `${scheduledDate}\n${scheduledSlot}`,
        status: activeIdx >= 1 ? 'completed' : 'pending'
      },
      {
        id: 2,
        title: 'Sample Collection',
        time: activeIdx >= 2 ? (order.sampleCollectedAt ? formatOrderDateTime(order.sampleCollectedAt) : 'Collected') : 'Pending',
        status: activeIdx >= 2 ? 'completed' : activeIdx === 1 ? 'current' : 'pending'
      },
      {
        id: 3,
        title: 'In Lab Testing',
        time: activeIdx >= 3 ? (activeIdx === 3 ? 'In Progress' : 'Completed') : 'Pending',
        status: activeIdx > 3 ? 'completed' : activeIdx === 3 ? 'current' : 'pending'
      },
      {
        id: 4,
        title: 'Report Generated',
        time: activeIdx >= 4 ? (order.reportGeneratedAt ? formatOrderDate(order.reportGeneratedAt) : 'Generated') : 'Pending',
        status: activeIdx > 4 ? 'completed' : activeIdx === 4 ? 'current' : 'pending'
      },
      {
        id: 5,
        title: 'Report Available',
        time: activeIdx >= 5 ? (order.reportAvailableAt ? formatOrderDate(order.reportAvailableAt) : 'Available') : 'Pending',
        status: activeIdx >= 5 ? 'completed' : 'pending'
      }
    ];
  };

  // Mini Stepper Icons for At-Lab Table
  const renderMiniStepper = (order) => {
    const activeIdx = order.activeStepIndex !== undefined ? order.activeStepIndex : 1;
    const isCancelled = order.displayStatus === 'CANCELLED';

    if (isCancelled) {
      return <span className="text-[11px] font-bold text-rose-500">Order Cancelled</span>;
    }

    const steps = [
      { id: 0, label: 'Booked' },
      { id: 1, label: 'Awaiting' },
      { id: 2, label: 'Collected' },
      { id: 3, label: 'Testing' },
      { id: 4, label: 'Report' }
    ];

    return (
      <div className="flex items-center gap-1.5">
        {steps.map((s, idx) => {
          const isDone = activeIdx >= s.id;
          const isCurrent = activeIdx === s.id;
          return (
            <React.Fragment key={s.id}>
              <div
                title={`${s.label}: ${isDone ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}`}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition ${
                  isDone
                    ? 'bg-emerald-100 text-emerald-700'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300 animate-pulse'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <Check size={11} className="stroke-[3]" /> : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-3 h-0.5 ${activeIdx > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in font-sans">
      
      {/* ── HEADER & BREADCRUMB ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              Laboratory Orders • {labName}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Lab Orders</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Track all your lab test orders, sample collection, and reports
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl transition shadow-2xs"
            title="Refresh orders"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-2xl transition shadow-2xs flex items-center gap-2"
          >
            <Filter size={14} className="text-slate-500" />
            <span>Filter & Sort</span>
            {(collectionFilter !== 'ALL' || statusFilter !== 'ALL' || sourceFilter !== 'ALL' || sortBy !== 'NEWEST') && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Order ID (e.g. ORD-LAB-1082), Token (T-25), test or package name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── MAIN CONTENT SECTIONS ── */}
      {loading ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-3 text-slate-400">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
          <span className="text-xs font-bold">Loading your lab orders...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-4 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Droplets size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">No laboratory orders found</h3>
            <p className="text-xs text-slate-500">
              {searchQuery || collectionFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No orders match your current filter criteria. Try clearing filters.'
                : `You have not placed any lab test orders with ${labName} yet.`}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            {(searchQuery || collectionFilter !== 'ALL' || statusFilter !== 'ALL') ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCollectionFilter('ALL');
                  setStatusFilter('ALL');
                  setSourceFilter('ALL');
                }}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('lab-tests')}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Browse Lab Tests
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* ============================================================ */}
          {/* ── SECTION 1: HOME COLLECTION ORDERS ── */}
          {/* ============================================================ */}
          {collectionFilter !== 'AT_LAB' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Home Collection Orders</h2>
                  <p className="text-xs text-slate-500 font-medium">Orders where sample collection is scheduled at your address</p>
                </div>
                {homeCollectionOrders.length > 0 && (
                  <span className="text-xs font-black text-blue-600 cursor-default">
                    {homeCollectionOrders.length} {homeCollectionOrders.length === 1 ? 'Order' : 'Orders'}
                  </span>
                )}
              </div>

              {homeCollectionOrders.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200/80 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700">No home collection orders</p>
                  <p className="text-[11px] text-slate-400">Your scheduled home sample collections will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {homeCollectionOrders.map((order) => {
                    const testsCount = order.tests?.length || 1;
                    const testTitle = order.packageName || (order.tests || []).map(t => t.name || t.testName).join(' + ') || 'Lab Test Investigation';
                    const timelineSteps = getHomeTimelineSteps(order);
                    const isReportReady = order.displayStatus === 'REPORT_AVAILABLE' || !!order.report?.isAvailable;

                    return (
                      <div
                        key={order._id || order.orderNumber}
                        className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5 hover:border-slate-300 transition"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          
                          {/* Left Details (lg:col-span-3) */}
                          <div className="lg:col-span-3 space-y-2">
                            <span className="text-xs font-black text-blue-600 block">
                              {order.orderNumber}
                            </span>
                            <h3 className="text-sm font-black text-slate-900 leading-snug">
                              {testTitle}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium">
                              Booked on {formatOrderDateTime(order.orderedAt || order.createdAt)}
                            </p>
                            <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-md">
                              HOME COLLECTION
                            </span>
                          </div>

                          {/* Middle Stepper (lg:col-span-7) */}
                          <div className="lg:col-span-7 overflow-x-auto py-2">
                            <div className="flex items-start justify-between min-w-[500px] relative">
                              {/* Horizontal Connecting Line */}
                              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 z-0" />

                              {timelineSteps.map((step, idx) => {
                                const isDone = step.status === 'completed';
                                const isCur = step.status === 'current';

                                return (
                                  <div key={step.id} className="relative z-10 flex flex-col items-center text-center space-y-1.5 px-1 flex-1">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition shadow-2xs ${
                                        isDone
                                          ? 'bg-emerald-100 text-emerald-700 ring-4 ring-white'
                                          : isCur
                                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                                          : 'bg-white text-slate-400 border-2 border-slate-200'
                                      }`}
                                    >
                                      {isDone ? (
                                        <Check size={14} className="stroke-[3]" />
                                      ) : isCur ? (
                                        <Clock size={14} />
                                      ) : (
                                        <span className="text-[10px]">{idx + 1}</span>
                                      )}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className={`text-[10px] font-black block leading-tight ${isDone || isCur ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {step.title}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-medium whitespace-pre-line leading-none block">
                                        {step.time}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right Status & Actions (lg:col-span-2) */}
                          <div className="lg:col-span-2 flex flex-col items-end justify-center gap-3">
                            {renderStatusBadge(order)}

                            <div className="flex items-center gap-2">
                              {isReportReady ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewReport(order)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FileText size={13} />
                                  <span>View Report</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderForDetails(order)}
                                  className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-black text-xs rounded-xl transition"
                                >
                                  View Details
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* ── SECTION 2: AT LABORATORY ORDERS ── */}
          {/* ============================================================ */}
          {collectionFilter !== 'HOME_COLLECTION' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">At Laboratory Orders</h2>
                  <p className="text-xs text-slate-500 font-medium">Orders where sample collection is at the laboratory</p>
                </div>
                {atLabOrders.length > 0 && (
                  <span className="text-xs font-black text-blue-600 cursor-default">
                    {atLabOrders.length} {atLabOrders.length === 1 ? 'Order' : 'Orders'}
                  </span>
                )}
              </div>

              {atLabOrders.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200/80 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700">No laboratory walk-in orders</p>
                  <p className="text-[11px] text-slate-400">Book a test with sample collection at the laboratory to see your queue token here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider bg-slate-50/50">
                          <th className="py-3.5 pl-6">Token</th>
                          <th className="py-3.5">Order Details</th>
                          <th className="py-3.5">Order Date & Time</th>
                          <th className="py-3.5">Status</th>
                          <th className="py-3.5">Progress</th>
                          <th className="py-3.5 text-right pr-6">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {atLabOrders.map((order) => {
                          const testTitle = order.packageName || (order.tests || []).map(t => t.name || t.testName).join(' + ') || 'Lab Test';
                          const isReportReady = order.displayStatus === 'REPORT_AVAILABLE' || !!order.report?.isAvailable;
                          const hasToken = order.isToday && order.tokenNumber;

                          return (
                            <tr key={order._id || order.orderNumber} className="hover:bg-slate-50/60 transition">
                              
                              {/* Column 1: Token */}
                              <td className="py-4 pl-6 align-middle">
                                {hasToken ? (
                                  <div className="inline-flex flex-col items-center justify-center px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-xl text-center shadow-2xs">
                                    <span className="text-xs font-black text-emerald-800">{order.tokenNumber}</span>
                                    <span className="text-[9px] font-bold text-emerald-600">Today</span>
                                  </div>
                                ) : (
                                  <div className="text-slate-400 text-xs">
                                    <span className="font-bold block">—</span>
                                    <span className="text-[10px] text-slate-400">{order.isWalkIn ? '(Walk-in)' : formatOrderDate(order.collectionDate)}</span>
                                  </div>
                                )}
                              </td>

                              {/* Column 2: Order Details */}
                              <td className="py-4 align-middle">
                                <div className="space-y-0.5">
                                  <span className="text-xs font-black text-blue-600 block">
                                    {order.orderNumber}
                                  </span>
                                  <div className="font-black text-slate-900 max-w-[220px] truncate">
                                    {testTitle}
                                  </div>
                                  <span className="inline-block px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] font-bold rounded">
                                    At Laboratory
                                  </span>
                                </div>
                              </td>

                              {/* Column 3: Order Date & Time */}
                              <td className="py-4 align-middle text-slate-600">
                                <div className="font-bold text-slate-800">{formatOrderDate(order.orderedAt || order.createdAt)}</div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(order.orderedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              {/* Column 4: Status */}
                              <td className="py-4 align-middle">
                                <div className="space-y-0.5">
                                  {renderStatusBadge(order)}
                                  <span className="text-[10px] text-slate-400 font-medium block">
                                    {order.sampleStatusMessage || (order.displayStatus === 'AWAITING_COLLECTION' ? 'Please collect your sample' : '')}
                                  </span>
                                </div>
                              </td>

                              {/* Column 5: Progress Mini-Stepper */}
                              <td className="py-4 align-middle">
                                {renderMiniStepper(order)}
                              </td>

                              {/* Column 6: Action */}
                              <td className="py-4 pr-6 text-right align-middle">
                                {isReportReady ? (
                                  <button
                                    type="button"
                                    onClick={() => handleViewReport(order)}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer"
                                  >
                                    View Report
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderForDetails(order)}
                                    className="px-3.5 py-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 font-black text-xs rounded-xl transition whitespace-nowrap"
                                  >
                                    View Details
                                  </button>
                                )}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center gap-2">
                    <User size={13} className="text-slate-400" />
                    <span>Walk-in orders are booked by laboratory staff on your behalf.</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* ── FILTER & SORT MODAL ── */}
      {/* ============================================================ */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Filter & Sort Orders</h3>
              <button onClick={() => setShowFilterModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Collection Method */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Collection Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'HOME_COLLECTION', label: 'Home' },
                    { id: 'AT_LAB', label: 'At Lab' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCollectionFilter(m.id)}
                      className={`py-2 px-3 rounded-xl font-bold border transition ${
                        collectionFilter === m.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Order Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SCHEDULED">Scheduled / Awaiting</option>
                  <option value="IN_LAB_TESTING">In Lab Testing</option>
                  <option value="REPORT_AVAILABLE">Report Available</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Booking Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'PATIENT_PORTAL', label: 'Self Booked' },
                    { id: 'WALK_IN', label: 'Walk-in' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSourceFilter(s.id)}
                      className={`py-2 px-3 rounded-xl font-bold border transition ${
                        sourceFilter === s.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Sort Orders</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                  <option value="COLLECTION_DATE">Collection Date</option>
                  <option value="STATUS">Progress Status</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCollectionFilter('ALL');
                  setStatusFilter('ALL');
                  setSourceFilter('ALL');
                  setSortBy('NEWEST');
                }}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ── ORDER DETAILS MODAL ── */}
      {/* ============================================================ */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                  {selectedOrderForDetails.orderNumber}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {selectedOrderForDetails.packageName || 'Lab Order Summary'}
                </h3>
              </div>
              <button onClick={() => setSelectedOrderForDetails(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Laboratory & Collection Summary Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Laboratory:</span>
                <span className="font-black text-slate-800">{labName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Collection Mode:</span>
                <span className="font-black text-slate-800">
                  {selectedOrderForDetails.collectionMethod === 'HOME_COLLECTION' ? '🏠 Home Sample Collection' : '🏥 Laboratory Walk-in'}
                </span>
              </div>
              {selectedOrderForDetails.collectionMethod === 'HOME_COLLECTION' && selectedOrderForDetails.collectionAddress?.line1 && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Delivery Address:</span>
                  <span className="font-bold text-slate-800 text-right max-w-[240px]">
                    {selectedOrderForDetails.collectionAddress.line1}, {selectedOrderForDetails.collectionAddress.city}
                  </span>
                </div>
              )}
              {selectedOrderForDetails.tokenNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Queue Token:</span>
                  <span className="font-black text-emerald-700">{selectedOrderForDetails.tokenNumber}</span>
                </div>
              )}
            </div>

            {/* Tests & Investigations Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Investigations ({selectedOrderForDetails.tests?.length || 1})
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {(selectedOrderForDetails.tests || []).map((t, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-800">{t.name || t.testName}</span>
                      {t.specimenType && (
                        <span className="text-[10px] text-slate-400 font-normal">({t.specimenType})</span>
                      )}
                    </div>
                    <span className="font-black text-slate-900">₹{t.price || 150}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tests Subtotal:</span>
                <span className="font-bold text-slate-800">₹{selectedOrderForDetails.price || selectedOrderForDetails.totalAmount}</span>
              </div>
              {selectedOrderForDetails.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount Savings:</span>
                  <span>-₹{selectedOrderForDetails.discountAmount}</span>
                </div>
              )}
              {selectedOrderForDetails.homeCollectionFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Home Collection Fee:</span>
                  <span className="font-bold text-slate-800">₹{selectedOrderForDetails.homeCollectionFee}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black">
                <span className="text-slate-800">Total Paid:</span>
                <span className="text-blue-600">₹{selectedOrderForDetails.totalAmount}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {selectedOrderForDetails.displayStatus !== 'CANCELLED' && selectedOrderForDetails.activeStepIndex < 3 && (
                <button
                  type="button"
                  onClick={() => handleCancelOrder(selectedOrderForDetails._id)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition"
                >
                  Cancel Order
                </button>
              )}
              
              {selectedOrderForDetails.report?.isAvailable && (
                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrderForDetails;
                    setSelectedOrderForDetails(null);
                    handleViewReport(ord);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText size={14} />
                  <span>View Lab Report</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

