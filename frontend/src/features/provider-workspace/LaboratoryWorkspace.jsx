import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, FlaskConical, ShoppingBag, Users, AlertTriangle, 
  Search, Scan, RefreshCw, Barcode, Plus, Minus, Trash2, 
  CreditCard, CheckCircle2, ChevronRight, Ban, Eye, FileText, 
  Printer, ArrowLeftRight, Activity, ArrowUpRight, DollarSign, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

const LaboratoryWorkspace = ({ tab, user }) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-905 tracking-tight flex items-center gap-2">
            <FlaskConical className="text-purple-650" size={24} /> Laboratory Provider Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">Operational Unit: Clinic Diagnostics Lab | Staff: {user?.name}</p>
        </div>
      </div>

      {/* --- DASHBOARD TAB --- */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center">
                  <Activity size={16} />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Tests Ordered</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{kpis.totalTestsToday}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-blue-50 text-blue-650 rounded-xl flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Samples</p>
                <h3 className="text-2xl font-black text-slate-905 mt-1 animate-pulse text-amber-500">{kpis.pendingSamples}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reports Ready</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{kpis.readyReports}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                {kpis.lowInventory > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Alert</span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low Reagents / Consumables</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{kpis.lowInventory}</h3>
              </div>
            </div>
          </div>

          {/* Quick Queue Overview */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Active Processing Queue</h3>
            <div className="divide-y divide-slate-50">
              {orders.filter(o => o.status !== 'Report Uploaded' && o.status !== 'Delivered').map(order => (
                <div key={order.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-black text-slate-900">{order.id}</span> - <span className="font-bold text-slate-700">{order.patientName}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Tests: {order.tests.join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      order.status === 'Ordered' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {order.status}
                    </span>
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, order.status === 'Ordered' ? 'Collected' : 'Processing')}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] font-bold"
                    >
                      Advance Status
                    </button>
                  </div>
                </div>
              ))}
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
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-sm font-black text-slate-900">Diagnostic Master Catalogue</h3>
            <button 
              onClick={() => setShowNewTestModal(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1"
            >
              <Plus size={12} /> Add New Investigation
            </button>
          </div>
          <div className="relative">
            <input 
              type="text"
              placeholder="Search tests by name, category, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none"
            />
            <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {filteredCatalog.map(test => (
              <div key={test.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-905">{test.name}</h4>
                  <p className="text-[10px] text-slate-400">Code: {test.code} | Category: {test.category} | Sample: {test.sampleType}</p>
                </div>
                <span className="font-black text-slate-800">₹{test.price}</span>
              </div>
            ))}
          </div>
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

const X = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default LaboratoryWorkspace;
