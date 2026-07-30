import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Play, CheckCircle2, XCircle, Search, Clock, 
  MapPin, User, AlertTriangle, ShieldCheck, RefreshCw, FileText, 
  ArrowRight, Loader2, Undo2, Calendar, Eye, MoreVertical, 
  DollarSign, Plus, Download, Printer, Filter, Settings,
  ChevronLeft, ChevronRight, UserPlus, SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { doctorApi, userApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';

import axios from 'axios';
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

const customProceduresApi = {
  list: (params) => axios.get(`${apiBase}/procedures`, {
    params,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  getDashboard: (params) => axios.get(`${apiBase}/procedures/dashboard`, {
    params,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  reschedule: (id, data) => axios.post(`${apiBase}/procedures/${id}/reschedule`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  reassign: (id, data) => axios.post(`${apiBase}/procedures/${id}/reassign`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  create: (data) => axios.post(`${apiBase}/procedures/new`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  cancel: (id, reason) => axios.post(`${apiBase}/procedures/${id}/cancel`, { cancellationReason: reason }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  start: (id) => axios.post(`${apiBase}/procedures/${id}/start`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  complete: (id) => axios.post(`${apiBase}/procedures/${id}/complete`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data)
};

export default function ProcedureManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLastMonthString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State
  const [loading, setLoading] = useState(true);
  const [procedures, setProcedures] = useState([]);
  const [kpis, setKpis] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);

  // Filters
  const [fromDate, setFromDate] = useState(getLastMonthString());
  const [toDate, setToDate] = useState(getTodayString());
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Active Main Tab
  const [activeTab, setActiveTab] = useState('All'); // All, Suggested, Planned, In Progress, Completed, Cancelled, Analytics

  // Selected Action Modal State
  const [activeProcedure, setActiveProcedure] = useState(null);
  const [modalType, setModalType] = useState(null); // 'reschedule', 'reassign', 'timeline', 'cancel'
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [reassignData, setReassignData] = useState({ doctorId: '', performingStaffId: '' });
  const [cancelReason, setCancelReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        from: fromDate,
        to: toDate
      };
      
      const [dashRes, listRes, docsRes, usersRes] = await Promise.all([
        customProceduresApi.getDashboard(params).catch(() => ({ data: { kpis: {}, analytics: {} } })),
        customProceduresApi.list().catch(() => ({ procedures: [] })),
        doctorApi.list({ limit: 100 }).catch(() => ({ doctors: [] })),
        userApi.list({ limit: 100 }).catch(() => ({ users: [] }))
      ]);

      setKpis(dashRes?.data?.kpis || {});
      setAnalytics(dashRes?.data?.analytics || {});
      setProcedures(listRes?.procedures || listRes?.data?.procedures || []);
      setDoctors((docsRes?.doctors || docsRes?.data?.doctors || []).filter(d => d.isActive));
      setStaff((usersRes?.users || usersRes?.data?.users || []).filter(u => ['NURSE', 'LAB_TECHNICIAN'].includes(u.role)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve procedures data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  // Derived filtered procedures based on filters
  const filteredProcedures = useMemo(() => {
    return procedures.filter(proc => {
      // Main tab filter
      if (activeTab !== 'All') {
        if (activeTab === 'Planned' && proc.status === 'Ready To Perform') {
          // treat ready to perform as planned
        } else if (proc.status !== activeTab) {
          return false;
        }
      }

      // Branch filter
      if (selectedBranch !== 'All' && proc.branch?.toLowerCase() !== selectedBranch.toLowerCase()) {
        return false;
      }

      // Doctor filter
      if (selectedDoctor !== 'All' && proc.doctorId?._id !== selectedDoctor) {
        return false;
      }

      // Staff filter
      if (selectedStaff !== 'All' && proc.performingStaffId?._id !== selectedStaff) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'All' && proc.status !== selectedStatus) {
        return false;
      }

      // Payment Status filter
      if (selectedPaymentStatus !== 'All' && proc.paymentStatus !== selectedPaymentStatus) {
        return false;
      }

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const patientName = proc.patientId?.fullName?.toLowerCase() || '';
        const uhid = proc.patientId?.patientCode?.toLowerCase() || '';
        const procName = proc.name?.toLowerCase() || '';
        const docName = proc.doctorId?.fullName?.toLowerCase() || '';
        if (!patientName.includes(q) && !uhid.includes(q) && !procName.includes(q) && !docName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [procedures, activeTab, selectedBranch, selectedDoctor, selectedStaff, selectedStatus, selectedPaymentStatus, searchQuery]);

  // Paginated List
  const paginatedProcedures = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProcedures.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProcedures, currentPage]);

  const totalPages = Math.max(Math.ceil(filteredProcedures.length / itemsPerPage), 1);

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleData.date) {
      toast.error('Please specify a date.');
      return;
    }
    try {
      await customProceduresApi.reschedule(activeProcedure._id, {
        scheduledDate: rescheduleData.date,
        scheduledTime: rescheduleData.time
      });
      toast.success('Procedure rescheduled successfully.');
      setModalType(null);
      loadData();
    } catch (err) {
      toast.error('Failed to reschedule procedure.');
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    try {
      await customProceduresApi.reassign(activeProcedure._id, reassignData);
      toast.success('Performing provider updated successfully.');
      setModalType(null);
      loadData();
    } catch (err) {
      toast.error('Failed to reassign performing provider.');
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    try {
      await customProceduresApi.cancel(activeProcedure._id, cancelReason);
      toast.success('Procedure cancelled successfully.');
      setModalType(null);
      loadData();
    } catch (err) {
      toast.error('Failed to cancel procedure.');
    }
  };

  const handleStartProcedure = async (procId) => {
    try {
      await customProceduresApi.start(procId);
      toast.success('Procedure started successfully.');
      loadData();
    } catch (err) {
      toast.error('Failed to start procedure.');
    }
  };

  const handleCompleteProcedure = async (procId) => {
    try {
      await customProceduresApi.complete(procId);
      toast.success('Procedure marked as completed.');
      loadData();
    } catch (err) {
      toast.error('Failed to finalize procedure.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-50 text-emerald-600';
      case 'In Progress': return 'bg-blue-50 text-blue-600';
      case 'Planned': case 'Ready To Perform': return 'bg-purple-50 text-purple-650';
      case 'Suggested': return 'bg-amber-50 text-amber-600';
      case 'Cancelled': case 'Cancelled Before Payment': return 'bg-rose-50 text-rose-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getPaymentStatusColor = (pStatus) => {
    switch (pStatus) {
      case 'paid': return 'text-emerald-600 bg-emerald-50';
      case 'partial': return 'text-amber-600 bg-amber-50';
      default: return 'text-rose-600 bg-rose-50';
    }
  };

  // Helper to draw SVG charts
  const renderSvgBarChart = (data) => {
    if (!data || data.length === 0) return <div className="text-xs text-slate-400 py-12 text-center">No data available</div>;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    return (
      <svg className="w-full h-48" viewBox="0 0 400 180">
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * 110;
          const x = 30 + i * 65;
          const y = 140 - barHeight;
          return (
            <g key={i}>
              <rect x={x} y={y} width="35" height={barHeight} fill="#3b82f6" rx="4" />
              <text x={x + 17} y={155} fontSize="8" fontWeight="bold" fill="#64748b" textAnchor="middle">{d.label.slice(0, 8)}</text>
              <text x={x + 17} y={y - 5} fontSize="9" fontWeight="extrabold" fill="#1e293b" textAnchor="middle">{d.value}</text>
            </g>
          );
        })}
        <line x1="10" y1="140" x2="390" y2="140" stroke="#cbd5e1" strokeWidth="1.5" />
      </svg>
    );
  };

  if (loading) {
    return <LoadingState label="Loading procedures dashboard..." />;
  }

  return (
    <div className="space-y-6 bg-slate-50/50 min-h-screen p-6 font-sans">
      
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Procedures Management <Activity className="w-5 h-5 text-blue-600" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Monitor, schedule, and configure medical procedures across clinic branches.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-405">to</span>
            <input 
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
            />
          </div>

          <button
            onClick={() => navigate('/procedures/settings')}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl transition shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Settings className="w-4 h-4" /> Config Catalog
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Procedures</span>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-905">{kpis.totalProcedures ?? 0}</h3>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 inline-block">Active Range</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Progress</span>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-blue-600">{kpis.inProgress ?? 0}</h3>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full mt-1 inline-block">Currently Treatment</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-emerald-600">{kpis.completed ?? 0}</h3>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 inline-block">Finalized</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Revenue (Paid)</span>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-950">₹{(kpis.revenue ?? 0).toLocaleString()}</h3>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full mt-1 inline-block">Procedures Cost</span>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Cost</span>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-905">₹{(kpis.averageCost ?? 0).toLocaleString()}</h3>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full mt-1 inline-block">Per Treatment</span>
          </div>
        </div>

      </div>

      {/* Main Tabs Selection */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-px">
        {['All', 'Suggested', 'Planned', 'In Progress', 'Completed', 'Cancelled', 'Analytics'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
            className={`px-4 py-2 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === tab 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab !== 'Analytics' ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3.5 items-end">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Global Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Patient name, doctor, code..."
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-2xl text-xs outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full py-1.5 px-3 border border-slate-200 rounded-2xl text-xs font-bold outline-none cursor-pointer"
              >
                <option value="All">All Branches</option>
                <option value="indirapuram">Indirapuram</option>
                <option value="rajnagar">Raj Nagar</option>
                <option value="kaushambi">Kaushambi</option>
                <option value="vasundhara">Vasundhara</option>
                <option value="noida">Noida</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Doctor</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full py-1.5 px-3 border border-slate-200 rounded-2xl text-xs font-bold outline-none cursor-pointer"
              >
                <option value="All">All Doctors</option>
                {doctors.map(doc => (
                  <option key={doc._id} value={doc._id}>{doc.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Payment Status</label>
              <select
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                className="w-full py-1.5 px-3 border border-slate-200 rounded-2xl text-xs font-bold outline-none cursor-pointer"
              >
                <option value="All">All Payments</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSelectedBranch('All');
                setSelectedDoctor('All');
                setSelectedStaff('All');
                setSelectedStatus('All');
                setSelectedPaymentStatus('All');
                setSearchQuery('');
              }}
              className="py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold border border-slate-250 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          {/* Paginated Procedure Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Patient (UHID)</th>
                  <th className="py-3 px-4">Procedure</th>
                  <th className="py-3 px-4">Provider / Staff</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                {paginatedProcedures.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      No matching procedures records found.
                    </td>
                  </tr>
                ) : (
                  paginatedProcedures.map((proc) => (
                    <tr key={proc._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <p className="text-slate-900 leading-tight">{proc.patientId?.fullName || 'Walk-in Patient'}</p>
                        <span className="text-[10px] text-slate-400 block">{proc.patientId?.patientCode || 'No UHID'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-900 leading-tight">{proc.name}</p>
                        <span className="text-[10px] font-bold text-blue-650 block">{proc.treatmentPlan || 'One Time'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-805 leading-none">{proc.doctorId?.fullName || '--'}</p>
                        <span className="text-[9px] text-slate-400 block mt-1">Staff: {proc.performingStaffId?.fullName || 'None'}</span>
                      </td>
                      <td className="py-3 px-4 capitalize">{proc.branch || '--'}</td>
                      <td className="py-3 px-4">
                        <p className="text-slate-800 leading-none">{proc.startTime ? new Date(proc.startTime).toLocaleDateString() : 'Unscheduled'}</p>
                        <span className="text-[9px] text-slate-400 block mt-1">{proc.startTime ? new Date(proc.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusColor(proc.status)}`}>
                          {proc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${getPaymentStatusColor(proc.paymentStatus)}`}>
                          {proc.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">₹{(proc.totalAmount || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {proc.status === 'Suggested' && (
                            <button 
                              onClick={() => {
                                setActiveProcedure(proc);
                                setRescheduleData({ date: '', time: '' });
                                setModalType('reschedule');
                              }}
                              className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[10px] font-extrabold cursor-pointer"
                            >
                              Schedule
                            </button>
                          )}
                          {proc.status === 'Planned' && (
                            <button 
                              onClick={() => handleStartProcedure(proc._id)}
                              className="px-2 py-1 bg-blue-500 text-white hover:bg-blue-600 rounded text-[10px] font-extrabold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" /> Start
                            </button>
                          )}
                          {proc.status === 'In Progress' && (
                            <button 
                              onClick={() => handleCompleteProcedure(proc._id)}
                              className="px-2 py-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded text-[10px] font-extrabold flex items-center gap-0.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" /> End
                            </button>
                          )}

                          <button 
                            onClick={() => {
                              setActiveProcedure(proc);
                              setModalType('timeline');
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                            title="Timeline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <div className="relative group">
                            <button className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute right-0 bottom-6 bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 hidden group-hover:block z-50 min-w-[120px] text-[10px] space-y-1 font-bold">
                              <button 
                                onClick={() => {
                                  setActiveProcedure(proc);
                                  setReassignData({ doctorId: proc.doctorId?._id || '', performingStaffId: proc.performingStaffId?._id || '' });
                                  setModalType('reassign');
                                }}
                                className="w-full text-left p-1 hover:bg-slate-50 text-slate-700 block cursor-pointer"
                              >
                                Reassign Staff
                              </button>
                              <button 
                                onClick={() => {
                                  setActiveProcedure(proc);
                                  setRescheduleData({ date: '', time: '' });
                                  setModalType('reschedule');
                                }}
                                className="w-full text-left p-1 hover:bg-slate-50 text-slate-700 block cursor-pointer"
                              >
                                Reschedule
                              </button>
                              {['Suggested', 'Planned', 'Ready To Perform'].includes(proc.status) && (
                                <button 
                                  onClick={() => {
                                    setActiveProcedure(proc);
                                    setCancelReason('');
                                    setModalType('cancel');
                                  }}
                                  className="w-full text-left p-1 hover:bg-rose-50 text-rose-600 block cursor-pointer"
                                >
                                  Cancel Procedure
                                </button>
                              )}
                              <button 
                                onClick={() => window.print()}
                                className="w-full text-left p-1 hover:bg-slate-50 text-slate-705 block cursor-pointer"
                              >
                                Print Treatment Plan
                              </button>
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-slate-105 pt-4">
            <span className="text-[11px] text-slate-400 font-bold">Showing {currentPage} of {totalPages} pages</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Analytics Graphs Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 mb-4">Branch-wise Procedures Vol.</h3>
            {renderSvgBarChart(analytics.branchWise)}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 mb-4">Doctor Workloads</h3>
            {renderSvgBarChart(analytics.doctorWise)}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 mb-4">Support Staff Workloads</h3>
            {renderSvgBarChart(analytics.staffWise)}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 mb-4">Most Suggestive Procedures</h3>
            {renderSvgBarChart(analytics.mostSuggested)}
          </div>
        </div>
      )}

      {/* Action Modals */}
      {modalType === 'reschedule' && activeProcedure && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleRescheduleSubmit} className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-100 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900">Schedule/Reschedule: {activeProcedure.name}</h3>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Scheduled Date</label>
              <input 
                type="date"
                value={rescheduleData.date}
                onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Scheduled Time</label>
              <input 
                type="time"
                value={rescheduleData.time}
                onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setModalType(null)} 
                className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold cursor-pointer"
              >
                Confirm Date
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'reassign' && activeProcedure && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleReassignSubmit} className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-100 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900">Reassign Providers: {activeProcedure.name}</h3>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Primary Doctor</label>
              <select
                value={reassignData.doctorId}
                onChange={(e) => setReassignData({ ...reassignData, doctorId: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl outline-none cursor-pointer"
              >
                <option value="">Select Doctor</option>
                {doctors.map(doc => (
                  <option key={doc._id} value={doc._id}>{doc.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Performing Staff</label>
              <select
                value={reassignData.performingStaffId}
                onChange={(e) => setReassignData({ ...reassignData, performingStaffId: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl outline-none cursor-pointer"
              >
                <option value="">Select Staff</option>
                {staff.map(st => (
                  <option key={st._id} value={st._id}>{st.fullName} ({st.role})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setModalType(null)} 
                className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold cursor-pointer"
              >
                Save Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'cancel' && activeProcedure && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleCancelSubmit} className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-100 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900 text-rose-600">Cancel Procedure: {activeProcedure.name}</h3>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Reason for Cancellation</label>
              <textarea 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl outline-none h-20"
                placeholder="Specify the reason..."
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setModalType(null)} 
                className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'timeline' && activeProcedure && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border border-slate-100 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-905">Audit Timeline Log: {activeProcedure.name}</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">×</button>
            </div>

            <div className="space-y-4 pt-2">
              {activeProcedure.timeline?.length > 0 ? (
                activeProcedure.timeline.map((log, idx) => (
                  <div key={idx} className="flex gap-3 relative pb-2">
                    {idx < activeProcedure.timeline.length - 1 && (
                      <div className="w-0.5 bg-slate-100 absolute left-2.5 top-6 bottom-0" />
                    )}
                    <div className="w-5 h-5 rounded-full bg-blue-50 border-2 border-blue-600 flex items-center justify-center shrink-0">
                      <Clock className="w-2.5 h-2.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 leading-tight">{log.status}</p>
                      {log.notes && <p className="text-[10px] text-slate-500 mt-0.5">{log.notes}</p>}
                      <span className="text-[8px] text-slate-400 block mt-1">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-6">No timeline events logged.</div>
              )}
            </div>
            
            <div className="flex justify-end pt-3">
              <button 
                onClick={() => setModalType(null)}
                className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
