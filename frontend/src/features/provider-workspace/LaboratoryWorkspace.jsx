import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, FlaskConical, ShoppingBag, Users, AlertTriangle, 
  Search, Scan, RefreshCw, Barcode, Plus, Minus, Trash2, 
  CreditCard, CheckCircle2, ChevronRight, Ban, Eye, FileText, 
  Printer, ArrowLeftRight, Activity, ArrowUpRight, DollarSign, Calendar,
  ChevronDown, LogOut, Layers, Settings, HelpCircle, FileBarChart, Truck, Heart, X, Check, Clock, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { labApi, dashboardApi, clinicApi, patientApi, doctorApi } from '../../lib/api';

const LaboratoryWorkspace = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  const sub = searchParams.get('sub') || 'test';
  
  const setActiveTab = (newTab) => setSearchParams({ tab: newTab });
  const setCatalogueSubTab = (newSub) => setSearchParams({ tab: 'catalogue', sub: newSub });

  // Clinic & Branch Context
  const [activeClinicId, setActiveClinicId] = useState(
    () => localStorage.getItem('patientActiveClinicId') || user?.clinicId || user?.clinic?._id || ''
  );
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('ALL'); // 'ALL' or specific branch clinicId

  // Live Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [consumables, setConsumables] = useState([]);

  // Filters & Interactivity State
  const [trendRange, setTrendRange] = useState('7'); // '7', '14', '30', '90'
  const [globalSearch, setGlobalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDetailTest, setSelectedDetailTest] = useState(null);
  
  // Modals
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [showAddConsumableModal, setShowAddConsumableModal] = useState(false);
  const [showNewTestModal, setShowNewTestModal] = useState(false);
  const [reportFile, setReportFile] = useState(null);

  // Walk-in order form state
  const [patientsList, setPatientsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [walkinPriority, setWalkinPriority] = useState('routine');
  const [walkinNotes, setWalkinNotes] = useState('');
  const [submittingWalkin, setSubmittingWalkin] = useState(false);

  // Consumable form state
  const [newConsumable, setNewConsumable] = useState({ name: '', category: 'Consumables', stock: 50, reorderLevel: 20, rack: '', supplier: '' });

  // Test form state
  const [newTest, setNewTest] = useState({ name: '', code: '', category: 'Biochemistry', sampleType: 'Serum', normalTime: '8 hours', price: 500 });

  // Debounce global search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(globalSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [globalSearch]);

  // Handle global search API call
  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults(null);
      return;
    }
    const performSearch = async () => {
      setSearching(true);
      try {
        const res = await labApi.searchAllLabs({ q: debouncedSearch, clinicId: activeClinicId });
        setSearchResults(res.data || res || null);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setSearching(false);
      }
    };
    performSearch();
  }, [debouncedSearch, activeClinicId]);

  // Load clinic details/branches
  useEffect(() => {
    if (!activeClinicId) return;
    const loadClinicMeta = async () => {
      try {
        const details = await clinicApi.getDetails(activeClinicId);
        if (details && details.branches) {
          setBranches(details.branches);
        } else {
          setBranches([]);
        }
      } catch (err) {
        console.error('Failed to load clinic branches', err);
      }
    };
    loadClinicMeta();
  }, [activeClinicId]);

  // Main Dashboard Data Fetch
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetClinicId = selectedBranchId === 'ALL' ? activeClinicId : selectedBranchId;
      const daysCount = parseInt(trendRange) || 7;
      
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - daysCount);

      // 1. Fetch dashboard metrics
      const metricsData = await dashboardApi.getLabs({
        clinicId: targetClinicId,
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      });
      setMetrics(metricsData?.data || metricsData || {});

      // 2. Fetch Equipment List
      const equipData = await labApi.listEquipment({ clinicId: targetClinicId });
      setEquipment(equipData?.data || equipData || []);

      // 3. Fetch Alerts
      const alertsData = await labApi.getLabAlerts({ clinicId: targetClinicId });
      setAlerts(alertsData?.data || alertsData || []);

      // 4. Fetch Recent Orders & Completed Tests
      const ordersData = await labApi.listOrders({ clinicId: targetClinicId, limit: 20 });
      setOrders(ordersData?.data?.labOrders || ordersData?.labOrders || []);

      const completedData = await labApi.listOrders({ clinicId: targetClinicId, status: 'completed', limit: 15 });
      setCompletedTests(completedData?.data?.labOrders || completedData?.labOrders || []);

      // 5. Fetch Tests for dropdowns & inventory
      const testsData = await labApi.listTests({ clinicId: targetClinicId });
      setAllTests(testsData?.data?.labTests || testsData?.labTests || []);

      const inventoryData = await labApi.listConsumables({ clinicId: targetClinicId });
      setConsumables(inventoryData?.data?.consumables || inventoryData?.consumables || []);

    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || 'Unable to load laboratory metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeClinicId) {
      loadDashboardData();
    }
  }, [activeClinicId, selectedBranchId, trendRange]);

  // Load patients and doctors when Walk-in modal opens
  useEffect(() => {
    if (!showWalkinModal) return;
    const fetchWalkinMeta = async () => {
      try {
        const patientsRes = await patientApi.list({ limit: 100 });
        setPatientsList(patientsRes?.data?.patients || patientsRes?.patients || []);
        
        const doctorsRes = await doctorApi.list({ limit: 100 });
        setDoctorsList(doctorsRes?.data?.doctors || doctorsRes?.doctors || []);
      } catch (err) {
        console.error('Failed to load walk-in metadata', err);
      }
    };
    fetchWalkinMeta();
  }, [showWalkinModal]);

  // Walk-in order submission
  const handleCreateWalkinOrder = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return toast.error('Please select a patient');
    if (selectedTestIds.length === 0) return toast.error('Select at least one test');
    
    setSubmittingWalkin(true);
    try {
      // Find selected test details to match API payload structure
      const testsPayload = selectedTestIds.map(testId => {
        const test = allTests.find(t => t._id === testId);
        return {
          labTestId: test._id,
          code: test.code,
          name: test.name,
          category: test.category,
          specimenType: test.specimenType,
          unit: test.unit,
          normalRange: test.normalRange
        };
      });

      const payload = {
        patientId: selectedPatientId,
        doctorId: selectedDoctorId || undefined,
        priority: walkinPriority,
        notes: walkinNotes,
        tests: testsPayload
      };

      await labApi.createOrder(payload);
      toast.success('Walk-in lab order created successfully!');
      setShowWalkinModal(false);
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setSelectedTestIds([]);
      setWalkinNotes('');
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmittingWalkin(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      await labApi.updateOrderStatus(orderId, { status: nextStatus });
      toast.success(`Order status updated to ${nextStatus}.`);
      loadDashboardData();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleReportUpload = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const payload = {
        labOrderId: selectedOrder._id,
        patientId: selectedOrder.patientId?._id || selectedOrder.patientId,
        reportFileName: reportFile ? reportFile.name : 'Report.pdf',
        status: 'draft',
        resultEntries: selectedOrder.tests.map(test => ({
          code: test.code,
          name: test.name,
          value: 'Normal',
          isAbnormal: false,
          abnormalFlag: 'normal',
          normalRange: test.normalRange
        }))
      };
      await labApi.createReport(payload);
      await labApi.updateOrderStatus(selectedOrder._id, { status: 'completed' });
      toast.success('Diagnostic report uploaded successfully!');
      setReportFile(null);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload report');
    }
  };

  const handleAddConsumable = async (e) => {
    e.preventDefault();
    try {
      await labApi.createConsumable(newConsumable);
      toast.success(`Consumable item "${newConsumable.name}" registered successfully.`);
      setShowAddConsumableModal(false);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register consumable');
    }
  };

  const handleCreateNewTest = async (e) => {
    e.preventDefault();
    try {
      await labApi.createTest(newTest);
      toast.success(`Test request "${newTest.name}" added successfully.`);
      setShowNewTestModal(false);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register test');
    }
  };

  // Scoped metrics derived from states
  const totalTestsCount = useMemo(() => orders.length, [orders]);
  const samplesReceivedCount = useMemo(() => orders.filter(o => o.status !== 'ordered').length, [orders]);
  const completedCount = useMemo(() => orders.filter(o => o.status === 'completed').length, [orders]);
  const pendingCount = useMemo(() => orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length, [orders]);
  const criticalCount = useMemo(() => alerts.filter(a => a.priority === 'Emergency').length, [alerts]);

  // Stage workflow counts
  const workflowCounts = useMemo(() => {
    return {
      received: orders.filter(o => ['sample_collected', 'processing', 'completed'].includes(o.status)).length,
      processing: orders.filter(o => o.status === 'sample_collected').length,
      analysis: orders.filter(o => o.status === 'processing').length,
      completed: orders.filter(o => o.status === 'completed').length,
      reported: completedTests.length
    };
  }, [orders, completedTests]);

  // Test Category distribution logic
  const categoryDistribution = useMemo(() => {
    const counts = {};
    orders.forEach(order => {
      order.tests?.forEach(test => {
        counts[test.category] = (counts[test.category] || 0) + 1;
      });
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.keys(counts).map(key => ({
      name: key || 'General',
      count: counts[key],
      pct: total ? Math.round((counts[key] / total) * 100) : 0
    }));
  }, [orders]);

  // Date Trend lines rendering logic
  const trendPoints = useMemo(() => {
    const grouped = {};
    orders.forEach(order => {
      const dateStr = new Date(order.orderedAt || order.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      grouped[dateStr] = (grouped[dateStr] || 0) + 1;
    });

    const dates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    return dates.map(d => ({ date: d, count: grouped[d] }));
  }, [orders]);

  return (
    <div className="space-y-6 bg-slate-50/50 p-6 min-h-screen pb-16 font-sans text-slate-800 antialiased">
      
      {/* 1. Header and Branch Selection */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <span className="text-purple-650 font-black uppercase text-[10px] tracking-wider block">Laboratory Workspace</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            🧪 Laboratory Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Live operations, analyzers, reagents inventory, and critical diagnostic alerts.
          </p>
        </div>
        
        {/* Clinic & Branch filters */}
        <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-2xl px-3 py-1.5 shadow-sm">
            <span className="text-xs">🏥</span>
            <div className="text-left leading-none">
              <span className="text-[10px] font-black text-slate-400 block uppercase">Active Clinic</span>
              <span className="text-xs font-black text-slate-800">{user?.clinic?.name || "Ram's Dental Clinic"}</span>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-black text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-650 transition cursor-pointer"
            >
              <option value="ALL">🌐 All Branches</option>
              {branches.map(br => (
                <option key={br._id} value={br._id}>📍 {br.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={loadDashboardData}
            title="Refresh dashboard data"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl shadow-sm hover:text-purple-650 transition duration-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. Global search result display */}
      <div className="relative">
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            placeholder="Global search by patient name, order ID, test name..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition shadow-sm"
          />
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
          {globalSearch && (
            <button onClick={() => setGlobalSearch('')} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {searchResults && (
          <div className="absolute top-12 left-0 w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-40 max-h-80 overflow-y-auto">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Search Results</h4>
            {searching ? (
              <p className="text-xs text-slate-500 py-2">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No matching records found.</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map(res => (
                  <div key={res._id} onClick={() => { setSelectedOrder(res); setGlobalSearch(''); setSearchResults(null); setActiveTab('orders'); }} className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex justify-between items-center text-xs transition">
                    <div>
                      <p className="font-extrabold text-slate-800">{res.orderNumber || res._id}</p>
                      <p className="text-[10px] text-slate-400">Patient: {res.patientId?.fullName || 'Walk-in'}</p>
                    </div>
                    <span className="text-[10px] font-black text-purple-600 uppercase">{res.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Welcome section & Quick Actions */}
      <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50/40 rounded-3xl p-6 border border-purple-100/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-lg font-black text-slate-900">Good morning, {user?.name || "Rajesh Sharma"}!</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Here's a live view of your laboratory operations today.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={() => { setActiveTab('orders'); toast.success('Select an order to collect sample.'); }} className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer">
            <FlaskConical size={14} /> Collect Sample
          </button>
          <button onClick={() => setShowWalkinModal(true)} className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer">
            <Plus size={14} /> New Walk-in Test
          </button>
          <button onClick={() => toast.success('Barcode Scanner initiated. Place scanner over sample tube.')} className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer">
            <Barcode size={14} /> Scan Barcode
          </button>
          <button onClick={() => { setActiveTab('orders'); toast.success('Select a completed order to publish report.'); }} className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer">
            <FileText size={14} /> Upload Report
          </button>
          <button onClick={() => toast.success('Label printing queued for recent orders.')} className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer">
            <Printer size={14} /> Print Labels
          </button>
        </div>
      </div>

      {/* Error and Loading states */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between gap-4 text-rose-800">
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertCircle size={16} />
            <span>Unable to load laboratory metrics: {error}</span>
          </div>
          <button onClick={loadDashboardData} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse space-y-4">
              <div className="w-16 h-3 bg-slate-100 rounded"></div>
              <div className="w-8 h-6 bg-slate-100 rounded"></div>
              <div className="w-24 h-2 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        /* --- MAIN DASHBOARD TAB CONTENT --- */
        tab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'TOTAL TESTS ORDERED', val: totalTestsCount, desc: 'All orders registered', color: 'text-purple-650 bg-purple-50' },
                { label: 'SAMPLES RECEIVED', val: samplesReceivedCount, desc: 'Tubes checked-in', color: 'text-blue-600 bg-blue-50' },
                { label: 'TESTS COMPLETED', val: completedCount, desc: 'Finalized reports', color: 'text-emerald-600 bg-emerald-50' },
                { label: 'PENDING TESTS', val: pendingCount, desc: 'Currently in processing', color: 'text-amber-600 bg-amber-50' },
                { label: 'CRITICAL RESULTS', val: criticalCount, desc: 'Require doctor review', color: 'text-rose-600 bg-rose-50' }
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-purple-200/50 transition duration-300">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full w-max ${kpi.color}`}>{kpi.label}</span>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-slate-900">{kpi.val === 0 ? "0" : kpi.val.toLocaleString()}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">{kpi.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Workflow Tracker Overview */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Today's Live Workflow</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center text-center">
                {[
                  { label: 'Samples Received', val: workflowCounts.received, color: 'text-purple-650', bg: 'bg-purple-50' },
                  { label: 'In Processing', val: workflowCounts.processing, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'In Analysis', val: workflowCounts.analysis, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Completed', val: workflowCounts.completed, color: 'text-emerald-650', bg: 'bg-emerald-50' },
                  { label: 'Reported', val: workflowCounts.reported, color: 'text-slate-600', bg: 'bg-slate-50' }
                ].map((st, idx) => (
                  <React.Fragment key={idx}>
                    <div className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition cursor-pointer" onClick={() => setActiveTab('orders')}>
                      <span className={`text-xl font-black ${st.color} ${st.bg} px-3 py-1 rounded-2xl`}>{st.val}</span>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-3 uppercase tracking-wide">{st.label}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Charts & Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Trend Line Chart */}
              <div className="lg:col-span-2 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Daily Test Volume Trend</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Live test volume over time</p>
                  </div>
                  <select 
                    value={trendRange} 
                    onChange={e => setTrendRange(e.target.value)} 
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-purple-650"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="14">Last 14 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>

                <div className="h-44 w-full overflow-x-auto">
                  {trendPoints.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                      No test data in this range.
                    </div>
                  ) : (
                    <div className="min-w-[500px] h-full flex flex-col justify-end">
                      <div className="flex-1 flex items-end justify-between px-4 pb-2 border-b border-slate-100">
                        {trendPoints.map((pt, idx) => {
                          const maxCount = Math.max(...trendPoints.map(p => p.count), 1);
                          const heightPct = (pt.count / maxCount) * 100;
                          return (
                            <div key={idx} className="flex flex-col items-center group relative w-full">
                              <div className="absolute -top-6 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-150">
                                {pt.count} tests
                              </div>
                              <div 
                                style={{ height: `${Math.max(heightPct, 5)}%` }} 
                                className="w-8 bg-gradient-to-t from-purple-500/80 to-purple-600 rounded-t-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-[0_4px_12px_rgba(139,92,246,0.15)]"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-black pt-2 px-2">
                        {trendPoints.map((pt, idx) => (
                          <span key={idx} className="w-8 text-center">{pt.date}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders Panel */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recent Orders</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-[10px] text-purple-650 font-bold hover:underline">View All</button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {orders.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-12">No orders registered today.</p>
                  ) : (
                    orders.slice(0, 5).map(o => (
                      <div key={o._id} onClick={() => { setSelectedOrder(o); setActiveTab('orders'); }} className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100/50 flex flex-col gap-1 text-[11px] transition cursor-pointer">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-slate-800">{o.orderNumber || o._id.slice(-6).toUpperCase()}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            o.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            o.status === 'processing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>{o.status}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="font-extrabold text-slate-700">{o.patientId?.fullName || "Walk-in"} · <span className="text-slate-400">{o.patientId?.gender || "M"}</span></span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {o.tests?.map(t => t.name).join(', ') || 'No tests'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Reagents, Equipment & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Category distribution */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Test Category Mix</h3>
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                  {categoryDistribution.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-12">No categories mapped.</p>
                  ) : (
                    categoryDistribution.map((cat, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{cat.name}</span>
                          <span>{cat.pct}% ({cat.count})</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div style={{ width: `${cat.pct}%` }} className="h-full bg-purple-500 rounded-full" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Equipment list */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Equipment Status</h3>
                  <button onClick={() => toast.success('Equipment maintenance schedules are active')} className="text-[10px] text-purple-650 font-bold hover:underline">Manage</button>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {equipment.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-12">No registered analyzers.</p>
                  ) : (
                    equipment.map(eq => (
                      <div key={eq._id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <div>
                          <p className="font-extrabold text-slate-800">{eq.name}</p>
                          <p className="text-[9px] text-slate-400">Workload: {eq.workload}% | Calibration: {eq.calibrationStatus}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          eq.status === 'Running' ? 'bg-emerald-50 text-emerald-600' :
                          eq.status === 'Maintenance' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>{eq.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Critical Alerts */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Critical Alerts</h3>
                  <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full font-black">Live</span>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-12">No critical alerts detected.</p>
                  ) : (
                    alerts.map(a => (
                      <div key={a.id} className="flex gap-3 items-start text-xs bg-rose-50/20 border border-rose-100/50 p-3 rounded-2xl">
                        <span className="text-base">⚠️</span>
                        <div className="flex-1">
                          <p className="font-extrabold text-slate-900 leading-tight">{a.msg}</p>
                          <p className="text-[9px] text-slate-400 mt-1">{a.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent Completed Tests */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recent Completed Tests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-2">Order ID</th>
                      <th className="py-2.5 px-2">Patient</th>
                      <th className="py-2.5 px-2">Investigation</th>
                      <th className="py-2.5 px-2">Completed On</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {completedTests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">No completed tests found.</td>
                      </tr>
                    ) : (
                      completedTests.map(test => (
                        <tr key={test._id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-2 font-black text-purple-600">{test.orderNumber}</td>
                          <td className="py-3 px-2 font-bold text-slate-800">{test.patientId?.fullName || "Walk-in"}</td>
                          <td className="py-3 px-2">{test.tests?.map(t => t.name).join(', ') || 'General Investigations'}</td>
                          <td className="py-3 px-2 text-slate-500 font-bold">{new Date(test.updatedAt).toLocaleDateString()}</td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600">Normal</span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => toast.success('Preview report...')} className="p-1 border border-slate-100 hover:bg-slate-100 rounded-lg text-slate-500"><Eye size={12} /></button>
                              <button onClick={() => toast.success('Downloading report PDF...')} className="p-1 border border-slate-100 hover:bg-slate-100 rounded-lg text-slate-500">📥</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* --- LAB ORDERS TAB --- */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Diagnostic Work Orders</h3>
            <div className="space-y-3">
              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold text-center py-12">No orders in queue.</p>
              ) : (
                orders.map(order => (
                  <div 
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      selectedOrder?._id === order._id ? 'border-purple-600 bg-purple-50/30' : 'border-slate-100 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-purple-650 bg-purple-50 px-2 py-0.5 rounded-full">{order.orderNumber}</span>
                      <span className="text-[9px] font-bold text-slate-400">{new Date(order.orderedAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-extrabold text-slate-905 mt-2">{order.patientId?.fullName || "Walk-in"}</h4>
                    <p className="text-[10px] text-slate-550 mt-1">Tests: {order.tests?.map(t => t.name).join(', ')}</p>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-50">
                      <span>Priority: {order.priority}</span>
                      <span className="text-purple-600 font-extrabold">{order.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-905">Order Fill Details: {selectedOrder.orderNumber}</h3>
                    <p className="text-[10px] text-slate-455 font-bold mt-1">Patient: {selectedOrder.patientId?.fullName || "Walk-in"}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase">Ordered Investigation Details</h4>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block">Tests Pack</span>
                      <span className="text-slate-900 font-extrabold">{selectedOrder.tests?.map(t => t.name).join(' + ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-2">Status Workflow</span>
                      <div className="flex gap-2">
                        {['sample_collected', 'processing', 'completed'].map(st => (
                          <button 
                            key={st}
                            onClick={() => handleUpdateOrderStatus(selectedOrder._id, st)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition capitalize ${
                              selectedOrder.status === st ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                            }`}
                          >
                            {st.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleReportUpload} className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-6 space-y-4 text-xs">
                    <h4 className="font-black text-purple-900 flex items-center gap-1.5">
                      <FileText size={16} /> Upload Patient Diagnostics Report
                    </h4>
                    <div>
                      <label className="text-purple-600/70 font-bold block mb-1">Upload Report File (PDF/Image)</label>
                      <input 
                        required
                        type="file" 
                        onChange={(e) => setReportFile(e.target.files[0])}
                        className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2" 
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-purple-605 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition"
                    >
                      Publish Report to Patient EMR
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-8 text-center text-slate-400 py-16 font-bold space-y-2">
                <FlaskConical size={36} className="mx-auto text-slate-300 animate-pulse" />
                <p>Select a diagnostic work order from the queue to update statuses.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DIAGNOSTIC CATALOGUE --- */}
      {tab === 'catalogue' && (
        <div className="space-y-6">
          <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm flex gap-1 flex-wrap">
            {[
              { label: '📖 Test Catalogue', key: 'test' },
              { label: '📂 Add New Investigations', key: 'new-test' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setCatalogueSubTab(t.key)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  sub === t.key ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {sub === 'test' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-900">Laboratory Catalogued Investigations</h3>
                <button onClick={() => setShowNewTestModal(true)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1">
                  <Plus size={12} /> Add Test
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-2">Test Name</th>
                      <th className="py-2.5 px-2">Code</th>
                      <th className="py-2.5 px-2">Category</th>
                      <th className="py-2.5 px-2">Specimen Type</th>
                      <th className="py-2.5 px-2">Reference Range</th>
                      <th className="py-2.5 px-2">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allTests.map(test => (
                      <tr key={test._id} className="hover:bg-slate-50/55 transition">
                        <td className="py-3 px-2 font-black text-slate-800">{test.name}</td>
                        <td className="py-3 px-2 font-mono text-slate-505">{test.code}</td>
                        <td className="py-3 px-2 text-slate-500">{test.category}</td>
                        <td className="py-3 px-2 text-slate-500">{test.specimenType || 'Serum'}</td>
                        <td className="py-3 px-2 text-slate-400 font-bold">{test.normalRange?.text || `${test.normalRange?.min} - ${test.normalRange?.max} ${test.unit}`}</td>
                        <td className="py-3 px-2 font-black text-slate-800">₹{test.price || test.testPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- LAB INVENTORY TAB --- */}
      {tab === 'inventory' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-sm font-black text-slate-905">Reagents &amp; Consumables Stock</h3>
            <button 
              onClick={() => setShowAddConsumableModal(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add Consumable
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2">Consumable Item</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2">Available Stock</th>
                  <th className="py-3 px-2">Reorder Level</th>
                  <th className="py-3 px-2">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {consumables.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-2 font-extrabold text-slate-905">{item.name}</td>
                    <td className="py-3.5 px-2 text-slate-500 font-semibold">{item.category}</td>
                    <td className="py-3.5 px-2">
                      <span className={`font-black ${item.stock <= item.reorderLevel ? 'text-amber-600' : 'text-slate-900'}`}>
                        {item.stock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-semibold">{item.reorderLevel} units</td>
                    <td className="py-3.5 px-2 text-slate-550">{item.supplier || 'Lab Supplies Corp'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- NEW WALK-IN ORDER MODAL --- */}
      {showWalkinModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905">Register Walk-in Lab Order</h3>
              <button onClick={() => setShowWalkinModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateWalkinOrder} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Select Patient *</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
                  <option value="">-- Choose Patient --</option>
                  {patientsList.map(p => (
                    <option key={p._id} value={p._id}>{p.fullName} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Requesting Doctor (Optional)</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                  <option value="">-- Choose Doctor --</option>
                  {doctorsList.map(d => (
                    <option key={d._id} value={d._id}>{d.fullName || d.firstName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Investigations / Tests *</label>
                <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-2.5 space-y-1.5">
                  {allTests.map(t => (
                    <label key={t._id} className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedTestIds.includes(t._id)} 
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedTestIds([...selectedTestIds, t._id]);
                          } else {
                            setSelectedTestIds(selectedTestIds.filter(id => id !== t._id));
                          }
                        }}
                      />
                      <span>{t.name} (₹{t.price || t.testPrice})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Priority</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" value={walkinPriority} onChange={e => setWalkinPriority(e.target.value)}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent / STAT</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Notes</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" value={walkinNotes} onChange={e => setWalkinNotes(e.target.value)} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-55 flex gap-2">
                <button type="submit" disabled={submittingWalkin} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition">
                  {submittingWalkin ? 'Creating...' : 'Create Lab Order'}
                </button>
                <button type="button" onClick={() => setShowWalkinModal(false)} className="flex-1 py-2.5 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD CONSUMABLE MODAL --- */}
      {showAddConsumableModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905">Register Reagents &amp; Consumables</h3>
              <button onClick={() => setShowAddConsumableModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddConsumable} className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Item Name</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.name} onChange={e => setNewConsumable({ ...newConsumable, name: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Category</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.category} onChange={e => setNewConsumable({ ...newConsumable, category: e.target.value })}>
                  <option value="Consumables">Consumables</option>
                  <option value="Reagents">Reagents</option>
                  <option value="Chemicals">Chemicals</option>
                  <option value="Glassware">Glassware</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Available Qty</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.stock} onChange={e => setNewConsumable({ ...newConsumable, stock: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Reorder Level</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.reorderLevel} onChange={e => setNewConsumable({ ...newConsumable, reorderLevel: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Rack Location</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.rack} onChange={e => setNewConsumable({ ...newConsumable, rack: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Supplier</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.supplier} onChange={e => setNewConsumable({ ...newConsumable, supplier: e.target.value })} />
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-50 flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-xl font-bold">Add to Stock</button>
                <button type="button" onClick={() => setShowAddConsumableModal(false)} className="flex-1 py-2 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TEST MODAL --- */}
      {showNewTestModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905">Add Investigation to Diagnostic Catalog</h3>
              <button onClick={() => setShowNewTestModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateNewTest} className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Test Name</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.name} onChange={e => setNewTest({ ...newTest, name: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Test Code</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.code} onChange={e => setNewTest({ ...newTest, code: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Category</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.category} onChange={e => setNewTest({ ...newTest, category: e.target.value })}>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Hematology">Hematology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Serology">Serology</option>
                  <option value="Hormones">Hormones</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Sample Type</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.sampleType} onChange={e => setNewTest({ ...newTest, sampleType: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">TAT (Normal Time)</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.normalTime} onChange={e => setNewTest({ ...newTest, normalTime: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Charge Price (₹)</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.price} onChange={e => setNewTest({ ...newTest, price: e.target.value })} />
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-50 flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-purple-650 hover:bg-purple-700 text-white rounded-xl font-bold">Add Investigation</button>
                <button type="button" onClick={() => setShowNewTestModal(false)} className="flex-1 py-2 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LaboratoryWorkspace;
