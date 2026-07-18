import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Play, CheckCircle, XCircle, Search, Clock, 
  MapPin, User, AlertTriangle, ShieldCheck, RefreshCw, FileText, 
  ArrowRight, Loader2, Undo2, Calendar, Eye, MoreVertical, 
  DollarSign, Plus, Download, Printer, Filter
} from 'lucide-react';
import { procedureApi, doctorApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import WalkInPatientModal from '../dashboard/WalkInPatientModal';

export default function ProcedureManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [procedures, setProcedures] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCardFilter, setActiveCardFilter] = useState('All'); // KPI card selection
  const [activeTabFilter, setActiveTabFilter] = useState('All'); // Tabs selection
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [selectedDoctor, setSelectedDoctor] = useState('All Doctors');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Dropdown More menu state
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procedureApi.list();
      setProcedures(res.procedures || res.data?.procedures || []);
    } catch (err) {
      toast.error('Failed to load procedure records');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await doctorApi.list({ limit: 100 });
      setDoctors(res.doctors || res.data?.doctors || []);
    } catch (err) {
      console.error('Failed to load doctors list', err);
    }
  }, []);

  useEffect(() => {
    fetchProcedures();
    fetchDoctors();
  }, [fetchProcedures, fetchDoctors]);

  // Derived filter calculations
  const filteredList = useMemo(() => {
    return procedures.filter(proc => {
      // 1. Branch & Clinic matching constraint
      if (user?.clinicId && proc.clinicId !== user.clinicId) return false;

      // 2. Tab Filter
      let matchesTab = true;
      if (activeTabFilter !== 'All') {
        matchesTab = proc.status === activeTabFilter;
      }

      // 3. Card Filter
      let matchesCard = true;
      if (activeCardFilter !== 'All') {
        if (activeCardFilter === 'Today') {
          const todayStr = new Date().toLocaleDateString('en-CA');
          const procDateStr = new Date(proc.createdAt).toLocaleDateString('en-CA');
          matchesCard = procDateStr === todayStr;
        } else {
          matchesCard = proc.status === activeCardFilter;
        }
      }

      // 4. Search Filter (patient name, patient ID, phone)
      let matchesSearch = true;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        matchesSearch = 
          proc.patientId?.fullName?.toLowerCase().includes(query) ||
          proc.patientId?.patientCode?.toLowerCase().includes(query) ||
          proc.patientId?.phone?.includes(query) ||
          proc.name?.toLowerCase().includes(query);
      }

      // 5. Date Filter
      let matchesDate = true;
      if (selectedDate) {
        const procDateStr = new Date(proc.createdAt).toLocaleDateString('en-CA');
        matchesDate = procDateStr === selectedDate;
      }

      // 6. Doctor Filter
      let matchesDoctor = true;
      if (selectedDoctor !== 'All Doctors') {
        matchesDoctor = proc.doctorId?.fullName === selectedDoctor || proc.doctorId?._id === selectedDoctor;
      }

      // 7. Procedure Type Filter
      let matchesType = true;
      if (selectedType !== 'All Types') {
        matchesType = proc.category === selectedType || proc.name.includes(selectedType);
      }

      // 8. Status Filter
      let matchesStatus = true;
      if (selectedStatus !== 'All Status') {
        matchesStatus = proc.status === selectedStatus;
      }

      return matchesTab && matchesCard && matchesSearch && matchesDate && matchesDoctor && matchesType && matchesStatus;
    });
  }, [procedures, activeTabFilter, activeCardFilter, searchQuery, selectedDate, selectedDoctor, selectedType, selectedStatus, user]);

  // Statistics counters
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayProcs = procedures.filter(p => new Date(p.createdAt).toLocaleDateString('en-CA') === todayStr);

    const counts = {
      total: todayProcs.length,
      pending: todayProcs.filter(p => p.status === 'Payment Pending').length,
      pendingAmt: todayProcs.filter(p => p.status === 'Payment Pending').reduce((sum, p) => sum + (p.amount || 0), 0),
      ready: todayProcs.filter(p => p.status === 'Ready To Perform' || p.status === 'Called').length,
      readyAmt: todayProcs.filter(p => p.status === 'Ready To Perform' || p.status === 'Called').reduce((sum, p) => sum + (p.amount || 0), 0),
      inProgress: todayProcs.filter(p => p.status === 'In Progress').length,
      inProgressAmt: todayProcs.filter(p => p.status === 'In Progress').reduce((sum, p) => sum + (p.amount || 0), 0),
      completed: todayProcs.filter(p => p.status === 'Completed').length,
      completedAmt: todayProcs.filter(p => p.status === 'Completed').reduce((sum, p) => sum + (p.amount || 0), 0),
      cancelled: todayProcs.filter(p => p.status.startsWith('Cancelled')).length,
      cancelledAmt: todayProcs.filter(p => p.status.startsWith('Cancelled')).reduce((sum, p) => sum + (p.amount || 0), 0)
    };
    return counts;
  }, [procedures]);

  // Top Procedures Leaderboard
  const topProcedures = useMemo(() => {
    const mapping = {};
    procedures.forEach(p => {
      mapping[p.name] = (mapping[p.name] || 0) + 1;
    });
    return Object.entries(mapping)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [procedures]);

  // Pagination helper
  const paginatedList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredList, currentPage]);

  const totalPages = Math.max(Math.ceil(filteredList.length / itemsPerPage), 1);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Payment Pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Ready To Perform':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Called':
      case 'In Progress':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Cancelled Before Payment':
      case 'Cancelled After Payment':
      case 'Cancelled':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const formatPrice = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="space-y-6 p-1">
      {/* Page Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Procedures</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Manage clinic procedures from payment verification to completion.</p>
        </div>
        <button
          onClick={() => setWalkInModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.25)] transition cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Procedure (Walk-in)</span>
        </button>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Today */}
        <div 
          onClick={() => setActiveCardFilter('Today')}
          className={`bg-white rounded-2xl border p-4 flex flex-col gap-1 shadow-sm cursor-pointer hover:border-blue-300 transition ${activeCardFilter === 'Today' ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-100'}`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total</span>
            <Activity size={15} className="text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-1">{stats.total}</p>
          <span className="text-[9px] font-bold text-slate-400">Today</span>
        </div>

        {/* Payment Pending */}
        <div 
          onClick={() => setActiveCardFilter('Payment Pending')}
          className={`bg-white rounded-2xl border p-4 flex flex-col gap-1 shadow-sm cursor-pointer hover:border-amber-300 transition ${activeCardFilter === 'Payment Pending' ? 'border-amber-500 ring-2 ring-amber-50' : 'border-slate-100'}`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Pending Pay</span>
            <Clock size={15} className="text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-1">{stats.pending}</p>
          <span className="text-[9px] font-bold text-amber-500">{formatPrice(stats.pendingAmt)}</span>
        </div>

        {/* Ready To Perform */}
        <div 
          onClick={() => setActiveCardFilter('Ready To Perform')}
          className={`bg-white rounded-2xl border p-4 flex flex-col gap-1 shadow-sm cursor-pointer hover:border-purple-300 transition ${activeCardFilter === 'Ready To Perform' ? 'border-purple-500 ring-2 ring-purple-50' : 'border-slate-100'}`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Ready</span>
            <CheckCircle size={15} className="text-purple-500" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-1">{stats.ready}</p>
          <span className="text-[9px] font-bold text-purple-500">{formatPrice(stats.readyAmt)}</span>
        </div>

        {/* In Progress */}
        <div 
          onClick={() => setActiveCardFilter('In Progress')}
          className={`bg-white rounded-2xl border p-4 flex flex-col gap-1 shadow-sm cursor-pointer hover:border-blue-300 transition ${activeCardFilter === 'In Progress' ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-100'}`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">In Progress</span>
            <Activity size={15} className="text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-1">{stats.inProgress}</p>
          <span className="text-[9px] font-bold text-blue-500">{formatPrice(stats.inProgressAmt)}</span>
        </div>

        {/* Completed */}
        <div 
          onClick={() => setActiveCardFilter('Completed')}
          className={`bg-white rounded-2xl border p-4 flex flex-col gap-1 shadow-sm cursor-pointer hover:border-emerald-300 transition ${activeCardFilter === 'Completed' ? 'border-emerald-500 ring-2 ring-emerald-50' : 'border-slate-100'}`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Completed</span>
            <CheckCircle size={15} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-1">{stats.completed}</p>
          <span className="text-[9px] font-bold text-emerald-500">{formatPrice(stats.completedAmt)}</span>
        </div>

        {/* Cancelled */}
        <div 
          onClick={() => setActiveCardFilter('Cancelled')}
          className={`bg-white rounded-2xl border p-4 flex flex-col gap-1 shadow-sm cursor-pointer hover:border-rose-300 transition ${activeCardFilter === 'Cancelled' ? 'border-rose-500 ring-2 ring-rose-50' : 'border-slate-100'}`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Cancelled</span>
            <XCircle size={15} className="text-rose-500" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-1">{stats.cancelled}</p>
          <span className="text-[9px] font-bold text-rose-500">{formatPrice(stats.cancelledAmt)}</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-px overflow-x-auto">
        {[
          { key: 'All', label: 'All', badge: procedures.length },
          { key: 'Payment Pending', label: 'Payment Pending', badge: procedures.filter(p => p.status === 'Payment Pending').length },
          { key: 'Ready To Perform', label: 'Ready to Perform', badge: procedures.filter(p => p.status === 'Ready To Perform' || p.status === 'Called').length },
          { key: 'In Progress', label: 'In Progress', badge: procedures.filter(p => p.status === 'In Progress').length },
          { key: 'Completed', label: 'Completed', badge: procedures.filter(p => p.status === 'Completed').length },
          { key: 'Cancelled', label: 'Cancelled', badge: procedures.filter(p => p.status.startsWith('Cancelled')).length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTabFilter(tab.key)}
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTabFilter === tab.key 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTabFilter === tab.key ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
            }`}>{tab.badge}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Filters & Table + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Table & Filters */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center">
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search patient name, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 text-xs font-medium rounded-xl border border-slate-200 focus:border-indigo-400 outline-none"
              />
            </div>

            {/* Date Picker */}
            <div className="w-full md:w-auto relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 text-xs font-semibold rounded-xl border border-slate-200 outline-none text-slate-700 appearance-none"
              />
            </div>

            {/* Doctor Filter */}
            <div className="w-full md:w-auto">
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 text-xs font-semibold rounded-xl border border-slate-200 outline-none text-slate-700"
              >
                <option>All Doctors</option>
                {doctors.map(doc => (
                  <option key={doc._id} value={doc.fullName}>{doc.fullName}</option>
                ))}
              </select>
            </div>

            {/* Procedure Type Filter */}
            <div className="w-full md:w-auto">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 text-xs font-semibold rounded-xl border border-slate-200 outline-none text-slate-700"
              >
                <option>All Types</option>
                <option>Diagnostics</option>
                <option>Therapeutic</option>
                <option>Minor Procedures</option>
                <option>Radiology</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 text-xs font-semibold rounded-xl border border-slate-200 outline-none text-slate-700"
              >
                <option>All Status</option>
                <option>Payment Pending</option>
                <option>Ready To Perform</option>
                <option>Called</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>

          {/* Procedure List Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3 px-4 font-bold text-slate-400 uppercase text-left">Time</th>
                    <th className="py-3 px-4 font-bold text-slate-400 uppercase text-left">Patient Details</th>
                    <th className="py-3 px-4 font-bold text-slate-400 uppercase text-left">Procedure</th>
                    <th className="py-3 px-4 font-bold text-slate-400 uppercase text-left">Doctor</th>
                    <th className="py-3 px-4 font-bold text-slate-400 uppercase text-left">Status</th>
                    <th className="py-3 px-4 font-bold text-slate-400 uppercase text-right">Amount</th>
                    <th className="py-3 px-4 font-bold text-slate-400 uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-slate-400 font-medium">
                        <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                        Loading procedures...
                      </td>
                    </tr>
                  ) : paginatedList.length > 0 ? (
                    paginatedList.map((proc) => {
                      const timeStr = proc.scheduledTime 
                        ? new Date(proc.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date(proc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr key={proc._id} className="hover:bg-slate-50/40 transition">
                          {/* Time */}
                          <td className="py-3 px-4 font-semibold text-slate-500 whitespace-nowrap">{timeStr}</td>
                          
                          {/* Patient details */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-55 bg-indigo-50 flex items-center justify-center font-bold text-indigo-600">
                                {proc.patientId?.fullName?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{proc.patientId?.fullName || 'N/A'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-semibold">{proc.patientId?.patientCode || 'N/A'}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-black uppercase">Walk-in</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Procedure details */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800">{proc.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{proc.category || 'Diagnostics'}</p>
                          </td>

                          {/* Doctor */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800">{proc.doctorId?.fullName || 'N/A'}</p>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusStyle(proc.status)}`}>
                              {proc.status}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right font-extrabold text-slate-850">
                            {formatPrice(proc.amount)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5 relative">
                              {/* Eye Button */}
                              <button
                                onClick={() => navigate(`/procedures/${proc._id}`)}
                                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={15} />
                              </button>

                              {/* More Dropdown trigger */}
                              <button
                                onClick={() => setOpenDropdownId(openDropdownId === proc._id ? null : proc._id)}
                                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg transition cursor-pointer"
                              >
                                <MoreVertical size={15} />
                              </button>

                              {/* Context menu dropdown */}
                              {openDropdownId === proc._id && (
                                <div className="absolute right-0 top-8 bg-white border border-slate-100 rounded-xl shadow-lg py-1.5 w-40 z-30 text-left">
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      navigate(`/procedures/${proc._id}`);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                                  >
                                    <Eye size={13} /> View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      toast.success('Slip Printed (Placeholder)');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                                  >
                                    <Printer size={13} /> Print Slip
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      toast.success('PDF Download started (Placeholder)');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                                  >
                                    <Download size={13} /> Download PDF
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 italic">No procedures match the filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">
                Showing {filteredList.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length} procedures
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition font-bold"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded-lg font-black text-center ${
                      currentPage === i + 1 
                        ? 'bg-blue-600 text-white' 
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar Widgets */}
        <div className="space-y-6">
          
          {/* Widget 1: Procedure Summary Donut Chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Procedure Summary (Today)</h4>
            </div>

            {/* Donut graphic (Simple representation with styled progress circle) */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="3.2" 
                    strokeDasharray={`${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} ${stats.total > 0 ? (1 - stats.completed / stats.total) * 100 : 100}`} 
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-xl font-black text-slate-800 leading-none">{stats.total}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Total</p>
                </div>
              </div>
            </div>

            {/* Status list values */}
            <div className="space-y-2.5 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Payment Pending</span>
                <span className="font-extrabold text-slate-800">{stats.pending} ({stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Ready to Perform</span>
                <span className="font-extrabold text-slate-800">{stats.ready} ({stats.total > 0 ? Math.round((stats.ready / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Progress</span>
                <span className="font-extrabold text-slate-800">{stats.inProgress} ({stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed</span>
                <span className="font-extrabold text-slate-800">{stats.completed} ({stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Today's Top Procedures Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Today's Top Procedures</h4>
            </div>

            <div className="space-y-3.5">
              {topProcedures.length > 0 ? topProcedures.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-650 text-slate-650 font-bold">{item.name}</span>
                  <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-extrabold text-slate-700">{item.count}</span>
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic">No procedures recorded today.</p>
              )}
            </div>

            <button 
              onClick={() => {
                setActiveTabFilter('All');
                setActiveCardFilter('All');
              }}
              className="w-full text-center mt-2 block text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              View All Procedures
            </button>
          </div>

          {/* Widget 3: Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Quick Actions</h4>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                onClick={() => navigate('/procedures')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl font-bold text-slate-700 text-center flex flex-col items-center gap-1.5 transition cursor-pointer"
              >
                <Activity size={18} className="text-indigo-500" />
                <span>Procedure Queue</span>
              </button>
              
              <button
                onClick={() => setWalkInModalOpen(true)}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl font-bold text-slate-700 text-center flex flex-col items-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={18} className="text-blue-500" />
                <span>Add Procedure</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabFilter('Completed');
                  setActiveCardFilter('All');
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl font-bold text-slate-700 text-center flex flex-col items-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle size={18} className="text-emerald-500" />
                <span>Today's Completed</span>
              </button>

              <button
                onClick={() => {
                  window.print();
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl font-bold text-slate-700 text-center flex flex-col items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={18} className="text-slate-500" />
                <span>Print List</span>
              </button>
            </div>
          </div>

        </div>

      </div>
      
      {/* Walk-in Modal */}
      <WalkInPatientModal 
        isOpen={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        onSuccess={() => {
          setWalkInModalOpen(false);
          fetchProcedures();
        }}
      />
    </div>
  );
}
