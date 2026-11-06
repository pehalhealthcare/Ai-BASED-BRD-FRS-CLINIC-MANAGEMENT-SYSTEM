import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, MoreHorizontal, FlaskConical, CheckCircle2, 
  Clock, FileText, X, Info, QrCode, Printer, Check, ChevronRight,
  AlertCircle, ShieldCheck, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LaboratoryModule({ data, onUpdateData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(null); // holds test
  const [showReportModal, setShowReportModal] = useState(null); // holds test
  const [showDetailsModal, setShowDetailsModal] = useState(null); // holds test
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Forms
  const [registerForm, setRegisterForm] = useState({
    testName: '',
    testCode: '',
    category: 'Hematology',
    sampleType: 'Blood',
    tat: '4 hrs',
    price: 350,
    patientName: 'Kavita Menon (P001240)',
    doctorName: 'Dr. Priya Sharma',
  });

  // Filtered Tests
  const filteredTests = useMemo(() => {
    return (data?.tests || []).filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.patientName && item.patientName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = 
        categoryFilter === 'All Categories' || item.category === categoryFilter;

      const matchesStatus = 
        statusFilter === 'All Status' || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [data?.tests, searchQuery, categoryFilter, statusFilter]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Report Ready':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'In Progress':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'Sample Collected':
        return 'text-blue-700 bg-blue-50 border border-blue-200';
      case 'Requested':
        return 'text-indigo-700 bg-indigo-50 border border-indigo-200';
      default:
        return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  // 1. REGISTER TEST
  const handleRegisterTest = (e) => {
    e.preventDefault();
    if (!registerForm.testName.trim()) {
      toast.error('Please enter lab test name');
      return;
    }

    const code = registerForm.testCode.trim().toUpperCase() || registerForm.testName.slice(0, 4).toUpperCase();
    const newTest = {
      id: `lab-${Date.now()}`,
      name: registerForm.testName.trim(),
      code: code,
      category: registerForm.category || 'Hematology',
      sampleType: registerForm.sampleType || 'Blood',
      tat: registerForm.tat.trim() || '4 hrs',
      price: parseInt(registerForm.price, 10) || 350,
      status: 'Requested',
      patientName: registerForm.patientName || 'Kavita Menon',
      patientId: `P00${Math.floor(1240 + Math.random() * 50)}`,
      orderedBy: registerForm.doctorName || 'Dr. Priya Sharma',
      collectedAt: 'Pending',
      reportData: {
        specimen: `${registerForm.sampleType} Sample`,
        pathologist: 'Dr. Suresh Varma, MD (Path)',
        parameters: [
          { name: `${registerForm.testName} Value`, value: 'Normal', unit: 'Index', normal: 'Normal', isAbnormal: false },
        ],
        impression: 'Screening specimen accessioned. Pending diagnostic analysis.',
      },
    };

    const nextTests = [newTest, ...(data.tests || [])];
    const nextStats = {
      ...data.stats,
      totalTests: (data.stats?.totalTests || 356) + 1,
    };

    onUpdateData({ ...data, tests: nextTests, stats: nextStats });
    setShowRegisterModal(false);
    setRegisterForm({
      testName: '',
      testCode: '',
      category: 'Hematology',
      sampleType: 'Blood',
      tat: '4 hrs',
      price: 350,
      patientName: 'Kavita Menon (P001240)',
      doctorName: 'Dr. Priya Sharma',
    });
    toast.success(`Lab test "${newTest.name}" registered for ${newTest.patientName}!`);
  };

  // 2. UPDATE WORKFLOW STATUS
  const handleUpdateStatus = (newStatus) => {
    if (!showStatusModal) return;
    const oldStatus = showStatusModal.status;
    if (oldStatus === newStatus) {
      setShowStatusModal(null);
      return;
    }

    const nextTests = data.tests.map((t) => {
      if (t.id === showStatusModal.id) {
        return {
          ...t,
          status: newStatus,
          collectedAt: newStatus !== 'Requested' && t.collectedAt === 'Pending' ? '10:45 AM' : t.collectedAt,
        };
      }
      return t;
    });

    // Update dynamic stats
    const nextStats = { ...data.stats };
    if (oldStatus === 'Requested' && newStatus === 'Sample Collected') {
      nextStats.samplesCollected = (nextStats.samplesCollected || 48) + 1;
    } else if (newStatus === 'In Progress') {
      nextStats.testsInProgress = (nextStats.testsInProgress || 26) + 1;
    } else if (newStatus === 'Report Ready') {
      nextStats.reportsReady = (nextStats.reportsReady || 18) + 1;
      if (oldStatus === 'In Progress') {
        nextStats.testsInProgress = Math.max(0, (nextStats.testsInProgress || 26) - 1);
      }
    }

    onUpdateData({ ...data, tests: nextTests, stats: nextStats });
    toast.success(`${showStatusModal.name} status updated to "${newStatus}"!`);
    setShowStatusModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Live Tag */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
          Laboratory Management
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
        {/* Total Tests */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Total Tests</span>
            <FlaskConical size={13} className="text-blue-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.totalTests?.toLocaleString() || '356'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-blue-700 bg-blue-50 border border-blue-200/70">
            Active Tests
          </span>
        </div>

        {/* Samples Collected */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Samples Collected</span>
            <CheckCircle2 size={13} className="text-emerald-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.samplesCollected?.toLocaleString() || '48'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-emerald-700 bg-emerald-50 border border-emerald-200/70">
            Today
          </span>
        </div>

        {/* Tests In Progress */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Tests In Progress</span>
            <Clock size={13} className="text-amber-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.testsInProgress?.toLocaleString() || '26'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-amber-700 bg-amber-50 border border-amber-200/70">
            Processing
          </span>
        </div>

        {/* Reports Ready */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">Reports Ready</span>
            <FileText size={13} className="text-purple-500" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {data.stats?.reportsReady?.toLocaleString() || '18'}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 text-purple-700 bg-purple-50 border border-purple-200/70">
            Ready to Deliver
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
            placeholder="Search test name or code..."
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
          <option value="Hematology">Hematology</option>
          <option value="Biochemistry">Biochemistry</option>
          <option value="Immunology">Immunology</option>
          <option value="Microbiology">Microbiology</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All Status">All Status</option>
          <option value="Requested">Requested</option>
          <option value="Sample Collected">Sample Collected</option>
          <option value="In Progress">In Progress</option>
          <option value="Report Ready">Report Ready</option>
        </select>

        {/* Register Test Action */}
        <button
          onClick={() => setShowRegisterModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          <span>Register Test</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold">
            <tr>
              <th className="py-2.5 px-3">Test Name</th>
              <th className="py-2.5 px-3">Test Code</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Sample Type</th>
              <th className="py-2.5 px-3">TAT</th>
              <th className="py-2.5 px-3">Price</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredTests.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No lab tests match your search or filter.
                </td>
              </tr>
            ) : (
              filteredTests.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <FlaskConical size={12} className="text-blue-500 shrink-0" />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
                    {row.code}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.category}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.sampleType}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-medium">
                    {row.tat}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    ₹{row.price}
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
                              setShowStatusModal(row);
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Clock size={13} className="text-blue-500" />
                            <span>Update Workflow Status</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowReportModal(row);
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-purple-50 hover:text-purple-600 transition cursor-pointer"
                          >
                            <FileText size={13} className="text-purple-500" />
                            <span>Preview Report</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setShowDetailsModal(row);
                            }}
                            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                          >
                            <Info size={13} className="text-slate-400" />
                            <span>Test Details</span>
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

      {/* ── MODAL 1: REGISTER LAB TEST ── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FlaskConical size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Register Lab Test (Demo)</h4>
                  <p className="text-[11px] text-slate-500">Book diagnostic test order in clinic laboratory</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRegisterTest} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Test Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kidney Function Test (KFT)"
                  value={registerForm.testName}
                  onChange={(e) => setRegisterForm({ ...registerForm, testName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Test Code</label>
                  <input
                    type="text"
                    placeholder="e.g. KFT"
                    value={registerForm.testCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, testCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={registerForm.category}
                    onChange={(e) => setRegisterForm({ ...registerForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Microbiology">Microbiology</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sample Type</label>
                  <select
                    value={registerForm.sampleType}
                    onChange={(e) => setRegisterForm({ ...registerForm, sampleType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Blood">Blood</option>
                    <option value="Serum">Serum</option>
                    <option value="Urine">Urine</option>
                    <option value="Swab">Swab</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Turnaround (TAT)</label>
                  <input
                    type="text"
                    placeholder="4 hrs"
                    value={registerForm.tat}
                    onChange={(e) => setRegisterForm({ ...registerForm, tat: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="50"
                    value={registerForm.price}
                    onChange={(e) => setRegisterForm({ ...registerForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Details</label>
                <input
                  type="text"
                  value={registerForm.patientName}
                  onChange={(e) => setRegisterForm({ ...registerForm, patientName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Register Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: UPDATE WORKFLOW STATUS ── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Update Diagnostic Workflow</h4>
                  <p className="text-[11px] text-slate-500">{showStatusModal.name} ({showStatusModal.code})</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStatusModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 font-medium">
                Advance the laboratory specimen through standard diagnostic stages:
              </p>

              <div className="space-y-2">
                {[
                  { key: 'Requested', label: '1. Requested', desc: 'Order received at reception desk', color: 'border-indigo-200 text-indigo-700 bg-indigo-50/50' },
                  { key: 'Sample Collected', label: '2. Sample Collected', desc: 'Vacutainer barcoded and accessioned', color: 'border-blue-200 text-blue-700 bg-blue-50/50' },
                  { key: 'In Progress', label: '3. In Progress', desc: 'Specimen in automated clinical analyzer', color: 'border-amber-200 text-amber-700 bg-amber-50/50' },
                  { key: 'Report Ready', label: '4. Report Ready', desc: 'Pathologist verified with digital QR authentication', color: 'border-emerald-200 text-emerald-700 bg-emerald-50/50' },
                ].map((step) => {
                  const isCurrent = showStatusModal.status === step.key;
                  return (
                    <button
                      key={step.key}
                      onClick={() => handleUpdateStatus(step.key)}
                      className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isCurrent 
                          ? `${step.color} ring-2 ring-blue-500 font-bold shadow-xs` 
                          : 'bg-white border-slate-200/90 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{step.label}</span>
                          {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white">Current</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                      </div>
                      <ChevronRight size={15} className="text-slate-400" />
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowStatusModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DIAGNOSTIC REPORT PREVIEW ── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Diagnostic Laboratory Report</h4>
                  <p className="text-[11px] text-slate-500">QR-Authenticated Clinical Diagnostic Record</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    toast.success('Printing demo report...');
                    window.print();
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-blue-600 transition inline-flex items-center gap-1 text-xs font-semibold"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button 
                  onClick={() => setShowReportModal(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
              {/* Clinic Banner */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-blue-600">PEHAL HEALTHCARE DIAGNOSTICS</h3>
                  <p className="text-[11px] text-slate-500">NABL Accredited Reference Laboratory • Lic: DL-2026-NABL-09</p>
                  <p className="text-[11px] text-slate-500">MG Road Medical Enclave, Bengaluru | +91 80 4123 4567</p>
                </div>
                <div className="w-14 h-14 bg-slate-100 border border-slate-300 rounded-lg flex flex-col items-center justify-center p-1">
                  <QrCode size={36} className="text-slate-800" />
                  <span className="text-[8px] font-bold text-slate-500 uppercase">Verified</span>
                </div>
              </div>

              {/* Patient Info Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Patient</span>
                  <p className="font-bold text-slate-900">{showReportModal.patientName || 'Ramesh Kumar'}</p>
                  <p className="text-[10px] text-slate-500">ID: {showReportModal.patientId || 'P001234'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Referred By</span>
                  <p className="font-bold text-slate-900">{showReportModal.orderedBy || 'Dr. Priya Sharma'}</p>
                  <p className="text-[10px] text-slate-500">General OPD</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Specimen</span>
                  <p className="font-bold text-slate-900">{showReportModal.reportData?.specimen || showReportModal.sampleType}</p>
                  <p className="text-[10px] text-slate-500">Accessioned Today</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                    Verified
                  </span>
                </div>
              </div>

              {/* Test Name Header */}
              <div className="pb-1 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  {showReportModal.name} ({showReportModal.code})
                </span>
              </div>

              {/* Parameters Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Test Parameter</th>
                      <th className="py-2 px-3">Observed Value</th>
                      <th className="py-2 px-3">Biological Ref. Range</th>
                      <th className="py-2 px-3 text-right">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(showReportModal.reportData?.parameters || [
                      { name: 'Observed Screening Value', value: '14.2', unit: 'g/dL', normal: '13.0 - 17.0', isAbnormal: false }
                    ]).map((param, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{param.name}</td>
                        <td className="py-2 px-3 font-extrabold text-slate-900">
                          {param.value} <span className="font-normal text-[10px] text-slate-500">{param.unit}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{param.normal} {param.unit}</td>
                        <td className="py-2 px-3 text-right">
                          {param.isAbnormal ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                              ABNORMAL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              NORMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clinical Impression */}
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-600">Clinical Impression & Pathologist Remarks</span>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {showReportModal.reportData?.impression || 'Test parameters reviewed and validated against digital quality control benchmarks.'}
                </p>
              </div>

              {/* Signatures */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[11px]">
                <div>
                  <p className="font-bold text-slate-900">Divya Nair</p>
                  <p className="text-[10px] text-slate-500">Senior Medical Lab Technologist</p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-emerald-600 font-bold mb-0.5">
                    <ShieldCheck size={13} />
                    <span>Digitally Signed</span>
                  </div>
                  <p className="font-bold text-slate-900">{showReportModal.reportData?.pathologist || 'Dr. Suresh Varma, MD (Path)'}</p>
                  <p className="text-[10px] text-slate-500">Consultant Clinical Pathologist</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowReportModal(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: TEST DETAILS ── */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Info size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{showDetailsModal.name}</h4>
                  <p className="text-[11px] text-slate-500">Test Code: {showDetailsModal.code} • {showDetailsModal.category}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailsModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sample Required</span>
                  <p className="font-bold text-slate-900 mt-0.5">{showDetailsModal.sampleType}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Turnaround Time</span>
                  <p className="font-bold text-slate-900 mt-0.5">{showDetailsModal.tat}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Standard Price</span>
                  <p className="font-bold text-slate-900 mt-0.5">₹{showDetailsModal.price}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Quality Verified</span>
                  <p className="font-bold text-emerald-600 mt-0.5">NABL / CAP Calibrated</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-600">Patient Preparation Instructions</span>
                <p className="text-slate-700 mt-1">
                  10-12 hours overnight fasting recommended for lipid/glucose testing. Maintain adequate hydration with plain water.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(null)}
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
