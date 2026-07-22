import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, FlaskConical, ShoppingBag, Users, AlertTriangle, 
  Search, Scan, RefreshCw, Barcode, Plus, Minus, Trash2, 
  CreditCard, CheckCircle2, ChevronRight, Ban, Eye, FileText, 
  Printer, ArrowLeftRight, Activity, ArrowUpRight, DollarSign, Calendar,
  ChevronDown, LogOut, Layers, Settings, HelpCircle, FileBarChart, Truck, Heart, X, Check, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const LaboratoryWorkspace = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  const sub = searchParams.get('sub') || 'test';
  const setActiveTab = (newTab) => setSearchParams({ tab: newTab });
  const setCatalogueSubTab = (newSub) => setSearchParams({ tab: 'catalogue', sub: newSub });
  const { logout } = useAuth();
  const [selectedDetailTest, setSelectedDetailTest] = useState(null);

  // --- MOCK DATABASE STATE ---
  const [globalCatalog, setGlobalCatalog] = useState([
    { id: 'l1', name: 'Complete Blood Count (CBC)', code: 'LAB-CBC', category: 'Hematology', sampleType: 'Whole Blood (EDTA)', normalTime: '4 hours', price: 350 },
    { id: 'l2', name: 'HbA1c (Glycated Haemoglobin)', code: 'LAB-HBA1C', category: 'Biochemistry', sampleType: 'Whole Blood', normalTime: '6 hours', price: 450 },
    { id: 'l3', name: 'Lipid Profile', code: 'LAB-LIPID', category: 'Biochemistry', sampleType: 'Serum', normalTime: '8 hours', price: 800 },
    { id: 'l4', name: 'Liver Function Test (LFT)', code: 'LAB-LFT', category: 'Biochemistry', sampleType: 'Serum', normalTime: '8 hours', price: 900 },
    { id: 'l5', name: 'Thyroid Profile (T3, T4, TSH)', code: 'LAB-THYROID', category: 'Hormones', sampleType: 'Serum', normalTime: '12 hours', price: 1200 }
  ]);

  const [orders, setOrders] = useState([
    { id: 'ORD-5501', appointmentId: 'APT-1002', patientName: 'Amit Sharma', phone: '9876543210', doctor: 'Dr. Shalini Mehta', tests: ['Complete Blood Count (CBC)', 'HbA1c'], status: 'Ordered', date: '2026-07-19', priority: 'High' },
    { id: 'ORD-5502', appointmentId: 'APT-1003', patientName: 'Rita Patel', phone: '9876543211', doctor: 'Dr. Vivek Roy', tests: ['Lipid Profile'], status: 'Collected', date: '2026-07-19', priority: 'Routine' }
  ]);

  const [inventory, setInventory] = useState([
    { id: 'inv_1', name: 'EDTA Blood Collection Vials', category: 'Consumables', stock: 150, reorderLevel: 50, rack: 'Aisle 1', expiry: '2027-08-31', supplier: 'LabWorld Ltd' },
    { id: 'inv_2', name: 'Lipid Profile Reagent Kit', category: 'Reagents', stock: 8, reorderLevel: 10, rack: 'Fridge A', expiry: '2026-06-30', supplier: 'Sigma Biotech' },
    { id: 'inv_3', name: 'Microscope Slides', category: 'Glassware', stock: 200, reorderLevel: 50, rack: 'Cabinet B', expiry: 'N/A', supplier: 'Glassco India' }
  ]);

  // --- INTERACTIVE STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAddConsumableModal, setShowAddConsumableModal] = useState(false);
  const [showNewTestModal, setShowNewTestModal] = useState(false);
  const [reportFile, setReportFile] = useState(null);
  const [selectedWorkflowStage, setSelectedWorkflowStage] = useState('ALL');
  const [criticalFilter, setCriticalFilter] = useState(false);

  // --- SIDEBAR NAVIGATION STATES ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [labOrdersCollapsed, setLabOrdersCollapsed] = useState(true);
  const [catalogueCollapsed, setCatalogueCollapsed] = useState(true);
  const [patientsCollapsed, setPatientsCollapsed] = useState(true);
  const [collectionCollapsed, setCollectionCollapsed] = useState(true);
  const [processingCollapsed, setProcessingCollapsed] = useState(true);
  const [reportsCollapsed, setReportsCollapsed] = useState(true);
  const [inventoryCollapsed, setInventoryCollapsed] = useState(true);
  const [purchaseCollapsed, setPurchaseCollapsed] = useState(true);
  const [qcCollapsed, setQCCollapsed] = useState(true);
  const [equipmentCollapsed, setEquipmentCollapsed] = useState(true);
  const [analyticsCollapsed, setAnalyticsCollapsed] = useState(true);
  const [settingsCollapsed, setSettingsCollapsed] = useState(true);

  const [equipmentList, setEquipmentList] = useState([
    { id: 'EQ-001', name: 'Auto Analyzer (Mindray BS-240)', type: 'Biochemistry', status: 'Running', workload: 82, lastCal: '2026-07-10', nextMaint: '2026-08-10' },
    { id: 'EQ-002', name: 'Hematology Analyzer (BC-6800)', type: 'Hematology', status: 'Running', workload: 45, lastCal: '2026-07-15', nextMaint: '2026-08-15' },
    { id: 'EQ-003', name: 'Chemistry Analyzer (AU480)', type: 'Biochemistry', status: 'Maintenance', workload: 0, lastCal: '2026-06-20', nextMaint: '2026-07-25' },
    { id: 'EQ-004', name: 'ELISA Reader (BioTek)', type: 'Immunology', status: 'Running', workload: 20, lastCal: '2026-07-18', nextMaint: '2026-08-18' },
    { id: 'EQ-005', name: 'PCR Machine (Bio-Rad)', type: 'Microbiology', status: 'Idle', workload: 0, lastCal: '2026-07-01', nextMaint: '2026-08-01' }
  ]);
  const [reagentList, setReagentList] = useState([
    { id: 'R-101', name: 'HbA1c Reagent Kit', qty: 4, minLevel: 10, expiry: '2026-09-30', supplier: 'Sigma Biotech', status: 'Low Stock' },
    { id: 'R-102', name: 'EDTA Collection Tubes', qty: 1500, minLevel: 500, expiry: '2027-12-31', supplier: 'LabWorld Ltd', status: 'Healthy' },
    { id: 'R-103', name: 'Lipid Profile Reagent Kit', qty: 25, minLevel: 15, expiry: '2026-08-15', supplier: 'Abbott Diagnostics', status: 'Healthy' },
    { id: 'R-104', name: 'Microbiology Agar Plates', qty: 2, minLevel: 20, expiry: '2026-07-10', supplier: 'Difco Labs', status: 'Expired' }
  ]);
  const [criticalAlertsList, setCriticalAlertsList] = useState([
    { id: 'a1', msg: '12 Critical test results pending review', desc: 'Across 8 work orders', time: '10 min ago', priority: 'Emergency' },
    { id: 'a2', msg: 'Reagent Low Stock Alert', desc: 'HbA1c Reagent', time: '30 min ago', priority: 'Urgent' },
    { id: 'a3', msg: 'Equipment Maintenance Due', desc: 'Chemistry Analyzer (AU480)', time: '2 hrs ago', priority: 'Routine' }
  ]);
  const [activeQueueFilter, setActiveQueueFilter] = useState('ALL');
  const [globalSearchVal, setGlobalSearchVal] = useState('');

  // New consumable form
  const [newConsumable, setNewConsumable] = useState({ name: '', category: 'Consumables', stock: 50, reorderLevel: 20, rack: '', supplier: '' });

  // New test form
  const [newTest, setNewTest] = useState({ name: '', code: '', category: 'Biochemistry', sampleType: 'Serum', normalTime: '8 hours', price: 500 });

  // --- KPIs ---
  const kpis = useMemo(() => {
    const totalTestsToday = orders.length;
    const pendingSamples = orders.filter(o => o.status === 'Ordered').length;
    const collectedSamples = orders.filter(o => o.status === 'Collected').length;
    const processing = orders.filter(o => o.status === 'Processing').length;
    const readyReports = orders.filter(o => o.status === 'Completed' || o.status === 'Report Uploaded').length;
    const lowInventory = inventory.filter(i => i.stock <= i.reorderLevel).length;

    return {
      totalTestsToday,
      pendingSamples,
      collectedSamples,
      processing,
      readyReports,
      lowInventory
    };
  }, [orders, inventory]);

  const handleUpdateOrderStatus = (orderId, nextStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: nextStatus });
    }
    toast.success(`Order ${orderId} status changed to ${nextStatus}.`);
  };

  const handleReportUpload = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    handleUpdateOrderStatus(selectedOrder.id, 'Report Uploaded');
    setReportFile(null);
    toast.success('Lab Test report uploaded and shared with Patient EMR.');
  };

  const handleAddConsumable = (e) => {
    e.preventDefault();
    setInventory([...inventory, {
      id: Math.random().toString(),
      ...newConsumable,
      stock: parseInt(newConsumable.stock) || 0,
      reorderLevel: parseInt(newConsumable.reorderLevel) || 10
    }]);
    setShowAddConsumableModal(false);
    toast.success(`Consumable item "${newConsumable.name}" logged successfully.`);
  };

  const handleCreateNewTest = (e) => {
    e.preventDefault();
    setGlobalCatalog([...globalCatalog, {
      id: Math.random().toString(),
      ...newTest,
      price: parseFloat(newTest.price) || 200
    }]);
    setShowNewTestModal(false);
    toast.success(`Test request "${newTest.name}" submitted. Status: Pending Global Approval.`);
  };

  // --- FILTERS ---
  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return [];
    const q = searchTerm.toLowerCase();
    return globalCatalog.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.code.toLowerCase().includes(q) || 
      t.category.toLowerCase().includes(q)
    );
  }, [searchTerm, globalCatalog]);

  const matchedOrders = useMemo(() => {
    if (!orderSearchTerm) return orders;
    const q = orderSearchTerm.toLowerCase();
    return orders.filter(o => 
      o.patientName.toLowerCase().includes(q) || 
      o.phone.includes(q) || 
      o.id.toLowerCase().includes(q)
    );
  }, [orderSearchTerm, orders]);

  return (
    <div className="space-y-6 bg-slate-50/50 p-1 min-h-screen pb-16">
      
      {/* Workspace Header */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-905 tracking-tight flex items-center gap-2">
            🧪 Laboratory Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Manage laboratory operations, samples, reports, equipment, and quality control.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={() => toast.success('Sample collection wizard opened.')} className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1">
            Collect Sample
          </button>
          <button onClick={() => toast.success('New Walk-in Test wizard opened.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black">
            New Walk-in Test
          </button>
          <button onClick={() => toast.success('Barcode scanner initiated.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black">
            Scan Barcode
          </button>
          <button onClick={() => toast.success('Upload Report window opened.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black">
            Upload Report
          </button>
          <button onClick={() => toast.success('Print job sent for selected labels.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black">
            Print Labels
          </button>
        </div>
      </div>

      {/* --- DASHBOARD TAB --- */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* TOP KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'TOTAL TESTS ORDERED', val: '1,248', change: '↑ 18.6% vs yesterday', color: 'text-purple-650 bg-purple-50', pctColor: 'text-emerald-600' },
              { label: 'SAMPLES RECEIVED', val: '842', change: '↑ 12.4% vs yesterday', color: 'text-blue-600 bg-blue-50', pctColor: 'text-emerald-600' },
              { label: 'TESTS COMPLETED', val: '678', change: '↑ 15.3% vs yesterday', color: 'text-emerald-600 bg-emerald-50', pctColor: 'text-emerald-600' },
              { label: 'PENDING TESTS', val: '364', change: '↓ 8.7% vs yesterday', color: 'text-amber-600 bg-amber-50', pctColor: 'text-rose-600' },
              { label: 'CRITICAL RESULTS', val: '12', change: '↓ 4.2% vs yesterday', color: 'text-rose-600 bg-rose-50', pctColor: 'text-rose-600' }
            ].map((k, idx) => (
              <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${k.color}`}>{k.label}</span>
                </div>
                <div className="mt-3">
                  <h3 className="text-xl font-black text-slate-905">{k.val}</h3>
                  <p className={`text-[9px] font-bold mt-1 ${k.pctColor}`}>{k.change}</p>
                </div>
              </div>
            ))}
          </div>

          {/* WORKFLOW TRACKER & RECENT ORDERS SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Horizontal workflow Overview */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Today's Workflow Overview</h3>
                <div className="grid grid-cols-5 gap-2 items-center text-center">
                  {[
                    { label: 'Samples Received', val: '842', color: 'text-purple-650' },
                    { label: 'In Processing', val: '364', color: 'text-blue-650' },
                    { label: 'In Analysis', val: '214', color: 'text-amber-550' },
                    { label: 'Completed', val: '678', color: 'text-emerald-650' },
                    { label: 'Reported', val: '652', color: 'text-slate-650' }
                  ].map((st, idx) => (
                    <React.Fragment key={idx}>
                      <div className="p-3 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-100 transition">
                        <span className={`text-sm font-black ${st.color}`}>{st.val}</span>
                        <p className="text-[9px] text-slate-400 font-bold mt-1">{st.label}</p>
                      </div>
                      {idx < 4 && <span className="text-slate-300 text-xs font-bold font-mono">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Daily test trend */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Daily Test Trend</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Last 7 Days</p>
                  </div>
                  <select className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[10px] font-bold focus:outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-40">
                  <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 80 Q 100 95 200 70 T 400 30 T 600 50 L 600 120 L 0 120 Z" fill="url(#trend-grad)" />
                    <path d="M 0 80 Q 100 95 200 70 T 400 30 T 600 50" fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
                    <circle cx="200" cy="70" r="3.5" fill="#8b5cf6" />
                    <circle cx="400" cy="30" r="3.5" fill="#8b5cf6" />
                  </svg>
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold pt-2">
                    <span>12 May</span>
                    <span>13 May</span>
                    <span>14 May</span>
                    <span>15 May</span>
                    <span>16 May</span>
                    <span>17 May</span>
                    <span>18 May</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent lab orders panel */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recent Orders</h3>
                <button onClick={() => toast.success('Full orders queue loaded.')} className="text-[10px] text-blue-600 font-bold hover:underline">View All</button>
              </div>
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {[
                  { id: 'ORD-2025-1248', patient: 'Rahul Mehta', age: '32 M', tests: 'CBC, LFT, KFT, Lipid Profile', status: 'In Processing', badge: 'bg-blue-50 text-blue-600 border-blue-100' },
                  { id: 'ORD-2025-1247', patient: 'Priya Sharma', age: '28 F', tests: 'Thyroid Profile', status: 'In Analysis', badge: 'bg-amber-50 text-amber-600 border-amber-100' },
                  { id: 'ORD-2025-1246', patient: 'Amit Verma', age: '45 M', tests: 'HbA1c, Fasting Glucose', status: 'Completed', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                  { id: 'ORD-2025-1245', patient: 'Neha Gupta', age: '31 F', tests: 'Urine Routine, Culture', status: 'Completed', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
                ].map(o => (
                  <div key={o.id} className="p-3 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-100/50 flex flex-col gap-1 text-[11px] transition">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-800">{o.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${o.badge}`}>{o.status}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-extrabold text-slate-700">{o.patient} · <span className="text-slate-400">{o.age}</span></span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{o.tests}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LOWER ANALYTICS: DONUT, EQUIPMENT AND CRITICAL ALERTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test Category Donut */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Test Category Distribution</h3>
              <div className="flex items-center gap-4 pt-2">
                <svg width="100" height="100" viewBox="0 0 40 40" className="transform -rotate-90">
                  <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                  <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#8b5cf6" strokeWidth="4" strokeDasharray="35 65" strokeDashoffset="0" />
                  <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-35" />
                  <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-60" />
                </svg>
                <div className="text-[10px] space-y-1 font-bold text-slate-600">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-500 rounded-md"></span> Hematology (35%)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-md"></span> Biochemistry (25%)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-md"></span> Microbiology (15%)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-300 rounded-md"></span> Others (25%)</div>
                </div>
              </div>
            </div>

            {/* Equipment status */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Equipment Status</h3>
                <button onClick={() => toast.success('Equipment maintenance scheduler opened.')} className="text-[10px] text-blue-600 font-bold hover:underline">View All</button>
              </div>
              <div className="space-y-3 max-h-[180px] overflow-y-auto custom-scrollbar">
                {equipmentList.slice(0, 3).map(eq => (
                  <div key={eq.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                    <div>
                      <p className="font-extrabold text-slate-800">{eq.name}</p>
                      <p className="text-[9px] text-slate-400">Workload: {eq.workload}% | ID: {eq.id}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      eq.status === 'Running' ? 'bg-emerald-50 text-emerald-600' :
                      eq.status === 'Maintenance' ? 'bg-amber-50 text-amber-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>{eq.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Alerts */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Critical Alerts</h3>
                <button onClick={() => toast.success('Alert logs loaded.')} className="text-[10px] text-blue-600 font-bold hover:underline">View All</button>
              </div>
              <div className="space-y-3.5">
                {criticalAlertsList.map(a => (
                  <div key={a.id} className="flex gap-3 items-start text-xs bg-rose-50/20 border border-rose-100/50 p-2.5 rounded-2xl">
                    <span className="text-base">⚠️</span>
                    <div className="flex-1">
                      <p className="font-extrabold text-slate-800 leading-tight">{a.msg}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{a.desc}</p>
                    </div>
                    <span className="text-[8px] text-slate-400 shrink-0 font-bold">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM COMPLETED TESTS GRID */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recent Completed Tests</h3>
              <button onClick={() => toast.success('Report print wizard opened.')} className="text-[10px] text-blue-600 font-bold hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-2">Order ID</th>
                    <th className="py-2.5 px-2">Patient Name</th>
                    <th className="py-2.5 px-2">Investigation</th>
                    <th className="py-2.5 px-2">Completed On</th>
                    <th className="py-2.5 px-2">Result Status</th>
                    <th className="py-2.5 px-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  <tr className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-2 font-black text-blue-600">ORD-2025-1243</td>
                    <td className="py-3 px-2 font-bold text-slate-800">Vikram Joshi · <span className="text-slate-400">38 M</span></td>
                    <td className="py-3 px-2">CBC, LFT, KFT</td>
                    <td className="py-3 px-2 text-slate-455 font-bold">18 May 2025, 10:30 AM</td>
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- LAB ORDERS TAB --- */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Diagnostic Work Orders</h3>
            <div className="relative">
              <input 
                type="text"
                placeholder="Search patient, phone, order ID..."
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
            </div>

            <div className="space-y-3">
              {matchedOrders.map(order => (
                <div 
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedOrder?.id === order.id ? 'border-purple-600 bg-purple-50/30' : 'border-slate-100 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-purple-650 bg-purple-50 px-2 py-0.5 rounded-full">{order.id}</span>
                    <span className="text-[9px] font-bold text-slate-400">{order.date}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-905 mt-2">{order.patientName}</h4>
                  <p className="text-[10px] text-slate-550 mt-1">Tests: {order.tests.join(', ')}</p>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-50">
                    <span>Priority: {order.priority}</span>
                    <span className="text-purple-600 font-extrabold">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-905">Order Fill Details: {selectedOrder.id}</h3>
                    <p className="text-[10px] text-slate-455 font-bold mt-1">Patient: {selectedOrder.patientName} | Doctor: {selectedOrder.doctor}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase">Ordered Investigation Details</h4>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block">Tests Pack</span>
                      <span className="text-slate-900 font-extrabold">{selectedOrder.tests.join(' + ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Status Workflow</span>
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'Collected')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition ${
                            selectedOrder.status === 'Collected' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-250 text-slate-700'
                          }`}
                        >
                          Collected
                        </button>
                        <button 
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'Processing')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition ${
                            selectedOrder.status === 'Processing' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-250 text-slate-700'
                          }`}
                        >
                          Processing
                        </button>
                        <button 
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'Completed')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition ${
                            selectedOrder.status === 'Completed' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-250 text-slate-700'
                          }`}
                        >
                          Completed
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Report upload form */}
                  {selectedOrder.status === 'Completed' && (
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
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition"
                      >
                        Publish Report to Patient EMR
                      </button>
                    </form>
                  )}
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
          {/* Subtabs Menu Ribbon */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm flex gap-1 flex-wrap">
            {[
              { label: '📖 Test Catalogue', key: 'test' },
              { label: '📂 Test Categories', key: 'categories' },
              { label: '💰 Test Pricing', key: 'pricing' },
              { label: '📦 Test Packages', key: 'packages' },
              { label: '📈 Popular Tests', key: 'popular' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setCatalogueSubTab(t.key)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  sub === t.key ? 'bg-blue-600 text-white shadow-md' : 'text-slate-550 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ================= 1. TEST CATALOGUE SUB-TAB ================= */}
          {sub === 'test' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 space-y-6">
                {/* Master Headers & KPIs */}
                <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-905">Test Catalogue</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Manage all diagnostic investigations performed in this laboratory.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toast.success('Add test wizard opened.')} className="px-3.5 py-1.5 bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Add Laboratory Test</button>
                      <button onClick={() => toast.success('Import templates loaded.')} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold">Import</button>
                      <button onClick={() => toast.success('Exporting Master Catalogue...')} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold">Export</button>
                    </div>
                  </div>

                  {/* LIS KPIs */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { label: 'TOTAL TESTS', val: '125', color: 'text-slate-900 bg-slate-50' },
                      { label: 'ACTIVE', val: '120', color: 'text-emerald-600 bg-emerald-50' },
                      { label: 'INACTIVE', val: '5', color: 'text-slate-400 bg-slate-50/50' },
                      { label: 'NEW TESTS', val: '8', color: 'text-blue-600 bg-blue-50' },
                      { label: 'AVG PRICE', val: '₹550', color: 'text-purple-600 bg-purple-50' },
                      { label: 'TOP ORDERED', val: 'CBC', color: 'text-amber-600 bg-amber-50' }
                    ].map((kpi, i) => (
                      <div key={i} className={`p-2.5 rounded-2xl border border-slate-100 text-center ${kpi.color}`}>
                        <span className="text-[7.5px] font-black uppercase tracking-wider block opacity-70">{kpi.label}</span>
                        <span className="text-sm font-black block mt-1">{kpi.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Search Inputs */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by Test Name, Test Code, LOINC, Barcode, Category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none"
                    />
                    <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-2">Test Name</th>
                          <th className="py-2.5 px-2">Code</th>
                          <th className="py-2.5 px-2">Category</th>
                          <th className="py-2.5 px-2">TAT</th>
                          <th className="py-2.5 px-2">Default Price</th>
                          <th className="py-2.5 px-2">Status</th>
                          <th className="py-2.5 px-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                        {globalCatalog.filter(t => !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase())).map(test => (
                          <tr key={test.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-2 font-black text-slate-800 flex items-center gap-1.5">
                              {test.name}
                              {test.id === 'l1' && <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-1.5 py-0.2 rounded">Popular</span>}
                            </td>
                            <td className="py-3 px-2 font-mono text-[10px] text-slate-550">{test.code}</td>
                            <td className="py-3 px-2 text-slate-500">{test.category}</td>
                            <td className="py-3 px-2 text-slate-500">{test.normalTime}</td>
                            <td className="py-3 px-2 font-bold text-slate-800">₹{test.price}</td>
                            <td className="py-3 px-2">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600">Active</span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex gap-2 justify-center">
                                <button onClick={() => setSelectedDetailTest(test)} className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[9px] font-bold">View Details</button>
                                <button onClick={() => toast.success('Edit configuration opened.')} className="px-2.5 py-1 border border-slate-100 hover:bg-slate-100 rounded-lg text-[9px] text-slate-500 font-bold">Edit</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Side Detail Drawer */}
              <div className="space-y-6">
                {selectedDetailTest ? (
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-5 animate-fade-in">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedDetailTest.category}</span>
                        <h4 className="font-black text-slate-905 text-sm mt-1">{selectedDetailTest.name}</h4>
                      </div>
                      <button onClick={() => setSelectedDetailTest(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold block mb-1">LOINC / Barcode Reference</span>
                        <span className="font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 font-extrabold block text-center">90234-1 / 8901234501</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Normal Range Reference</span>
                        <p className="text-slate-800 font-extrabold mt-1">4.5 - 11.0 x10^3/uL</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Sample Collection Requirements</span>
                        <p className="text-slate-650 mt-1">Whole Blood (EDTA), 2ml Lavender top tube. Transport room temperature.</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Patient Preparation</span>
                        <p className="text-slate-650 mt-1">No fasting required. Avoid heavy supplements 24 hours prior.</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Required Consumables</span>
                        <p className="text-slate-650 mt-1">• EDTA Tube (Lavender Cap) · Sterile Syringe (5ml) · Alcohol Swabs</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Equipment / Analyzer</span>
                        <p className="text-slate-650 mt-1">• Hematology Analyzer (BC-6800)</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-8 text-center text-slate-400 py-16 font-bold space-y-2">
                    <FlaskConical size={36} className="mx-auto text-slate-300 animate-pulse" />
                    <p>Select a laboratory test from the table to view LIS details, reference ranges, and preparation guidelines.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 2. TEST CATEGORIES SUB-TAB ================= */}
          {sub === 'categories' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
                <div>
                  <h3 className="text-sm font-black text-slate-905">Laboratory Categories &amp; Departments</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Manage departmental groupings for diagnostic catalog tests.</p>
                </div>
                <button onClick={() => toast.success('New category window opened.')} className="px-3.5 py-1.5 bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Add Category</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Hematology', icon: '🩸', tests: 24, avgPrice: 420, orders: 1248, rev: '₹5.24 L' },
                  { name: 'Biochemistry', icon: '🧪', tests: 45, avgPrice: 650, orders: 2315, rev: '₹15.04 L' },
                  { name: 'Microbiology', icon: '🧫', tests: 18, avgPrice: 850, orders: 412, rev: '₹3.50 L' },
                  { name: 'Immunology', icon: '🧬', tests: 12, avgPrice: 1200, orders: 284, rev: '₹3.40 L' },
                  { name: 'Serology', icon: '💧', tests: 15, avgPrice: 500, orders: 840, rev: '₹4.20 L' },
                  { name: 'Histopathology', icon: '🔬', tests: 8, avgPrice: 1500, orders: 95, rev: '₹1.42 L' }
                ].map((c, i) => (
                  <div key={i} className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <span className="text-2xl">{c.icon}</span>
                      <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{c.tests} Tests</span>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-905 text-sm">{c.name}</h4>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">Average Cost: ₹{c.avgPrice}</p>
                    </div>
                    <div className="border-t border-slate-50 pt-3 flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Orders: {c.orders}</span>
                      <span className="text-blue-600">Revenue: {c.rev}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 3. TEST PRICING SUB-TAB ================= */}
          {sub === 'pricing' && (
            <div className="space-y-6">
              {/* KPIs & Headers */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-905">Laboratory Test Pricing</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Manage sell rates, corporate discounts, co-insurance copays, and collect charges.</p>
                  </div>
                  <button onClick={() => toast.success('Bulk pricing update window opened.')} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold">Bulk Update Prices</button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'HIGHEST PRICE TEST', val: '₹4,500', desc: 'Genomic Profiling' },
                    { label: 'LOWEST PRICE TEST', val: '₹120', desc: 'Urine Routine' },
                    { label: 'AVG SELLING PRICE', val: '₹550', desc: 'Across 125 tests' },
                    { label: 'AVG MARGIN', val: '64.2%', desc: 'Net Profit Margin' }
                  ].map((p, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{p.label}</span>
                      <span className="text-lg font-black text-slate-905 block mt-1">{p.val}</span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{p.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-2">Investigation</th>
                        <th className="py-2.5 px-2">Cost Price</th>
                        <th className="py-2.5 px-2">Standard Price</th>
                        <th className="py-2.5 px-2">Corporate Rate</th>
                        <th className="py-2.5 px-2">Insurance Copay</th>
                        <th className="py-2.5 px-2">Home Collection Fee</th>
                        <th className="py-2.5 px-2">Emergency Charge</th>
                        <th className="py-2.5 px-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {globalCatalog.map(test => (
                        <tr key={test.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-2 font-black text-slate-800">{test.name}</td>
                          <td className="py-3 px-2 text-slate-500">₹{Math.floor(test.price * 0.4)}</td>
                          <td className="py-3 px-2 font-black text-slate-800">₹{test.price}</td>
                          <td className="py-3 px-2 text-blue-600">₹{Math.floor(test.price * 0.85)}</td>
                          <td className="py-3 px-2 text-slate-500">₹{Math.floor(test.price * 0.15)}</td>
                          <td className="py-3 px-2 text-slate-500">₹150</td>
                          <td className="py-3 px-2 text-rose-600">₹300</td>
                          <td className="py-3 px-2 text-center">
                            <button onClick={() => toast.success(`Price editor opened for ${test.name}`)} className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-[9.5px]">Edit Rates</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 4. TEST PACKAGES SUB-TAB ================= */}
          {sub === 'packages' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
                <div>
                  <h3 className="text-sm font-black text-slate-905">Laboratory Health Packages</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Combine individual diagnostic investigations into wellness screenings.</p>
                </div>
                <button onClick={() => toast.success('New package builder opened.')} className="px-3.5 py-1.5 bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Create Health Package</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name: 'Full Body Wellness Screening', tests: 'CBC, LFT, KFT, Lipid Profile, Thyroid, HbA1c, Vitamin D', orig: 4800, price: 1999, savings: '58%' },
                  { name: 'Executive Cardiac Screening', tests: 'Lipid Profile, HbA1c, hs-CRP, Electrolytes, CBC', orig: 3500, price: 1499, savings: '57%' },
                  { name: 'Comprehensive Diabetes Profile', tests: 'Fasting Blood Glucose, HbA1c, Urine Microalbumin, Lipid Profile', orig: 2200, price: 999, savings: '54%' },
                  { name: 'Senior Citizen Health Package', tests: 'CBC, Urine R/E, LFT, KFT, Uric Acid, Calcium', orig: 3200, price: 1299, savings: '59%' }
                ].map((pkg, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-slate-905 text-sm">{pkg.name}</h4>
                      <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded-full">Save {pkg.savings}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Included Tests</span>
                      <p className="text-slate-650 text-xs mt-1 leading-relaxed">{pkg.tests}</p>
                    </div>
                    <div className="border-t border-slate-50 pt-4 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-400 line-through">₹{pkg.orig}</span>
                        <span className="text-slate-900 font-black text-sm ml-2">₹{pkg.price}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toast.success(`${pkg.name} details drawer...`)} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-[9.5px]">Details</button>
                        <button onClick={() => toast.success('Booking test package...')} className="px-3 py-1 bg-purple-600 text-white rounded-lg font-bold text-[9.5px]">Book Now</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 5. POPULAR TESTS SUB-TAB ================= */}
          {sub === 'popular' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-905">Popular Investigations Leaderboard</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Real-time analytical ranking based on volume, margins, and doctor referrals.</p>
              </div>

              {/* Leaderboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-2">Rank</th>
                      <th className="py-2.5 px-2">Test Name</th>
                      <th className="py-2.5 px-2">Category</th>
                      <th className="py-2.5 px-2">Orders Today</th>
                      <th className="py-2.5 px-2">Weekly Volume</th>
                      <th className="py-2.5 px-2">Monthly Revenue</th>
                      <th className="py-2.5 px-2">Growth Rate</th>
                      <th className="py-2.5 px-2 text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {[
                      { rank: '#1', name: 'Complete Blood Count (CBC)', cat: 'Hematology', today: 184, week: 1248, rev: '₹4.36 L', growth: '↑ 12.4%', trend: 'emerald' },
                      { rank: '#2', name: 'HbA1c (Glycated Haemoglobin)', cat: 'Biochemistry', today: 145, week: 980, rev: '₹4.41 L', growth: '↑ 18.5%', trend: 'emerald' },
                      { rank: '#3', name: 'Lipid Profile Screen', cat: 'Biochemistry', today: 92, week: 615, rev: '₹4.92 L', growth: '↑ 8.2%', trend: 'emerald' },
                      { rank: '#4', name: 'Liver Function Test (LFT)', cat: 'Biochemistry', today: 78, week: 512, rev: '₹4.60 L', growth: '↓ 2.4%', trend: 'rose' }
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-2 font-black text-slate-905">{row.rank}</td>
                        <td className="py-3 px-2 font-black text-slate-800">{row.name}</td>
                        <td className="py-3 px-2 text-slate-500">{row.cat}</td>
                        <td className="py-3 px-2 font-bold text-slate-800">{row.today}</td>
                        <td className="py-3 px-2 text-slate-500">{row.week}</td>
                        <td className="py-3 px-2 text-blue-650">{row.rev}</td>
                        <td className={`py-3 px-2 font-bold ${row.trend === 'emerald' ? 'text-emerald-600' : 'text-rose-600'}`}>{row.growth}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${row.trend === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {row.trend === 'emerald' ? 'Trending Up' : 'Trending Down'}
                          </span>
                        </td>
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
            <h3 className="text-sm font-black text-slate-900">Reagents &amp; Consumables Stock</h3>
            <button 
              onClick={() => setShowAddConsumableModal(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1"
            >
              <Plus size={12} /> Add Consumable
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400* uppercase tracking-wider">
                  <th className="py-3 px-2">Consumable Item</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2">Available Stock</th>
                  <th className="py-3 px-2">Reorder Level</th>
                  <th className="py-3 px-2">Rack Location</th>
                  <th className="py-3 px-2">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {inventory.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-2 font-extrabold text-slate-905">{item.name}</td>
                    <td className="py-3.5 px-2 text-slate-500 font-semibold">{item.category}</td>
                    <td className="py-3.5 px-2">
                      <span className={`font-black ${item.stock <= item.reorderLevel ? 'text-amber-600' : 'text-slate-900'}`}>
                        {item.stock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-semibold">{item.reorderLevel} units</td>
                    <td className="py-3.5 px-2 text-slate-600 font-semibold">{item.rack || 'N/A'}</td>
                    <td className="py-3.5 px-2 text-slate-500">{item.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <button type="submit" className="flex-1 py-2 bg-purple-650 hover:bg-purple-700 text-white rounded-xl font-bold">Add to Stock</button>
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
