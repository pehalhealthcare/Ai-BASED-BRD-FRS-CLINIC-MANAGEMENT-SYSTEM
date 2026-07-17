import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon, Users, Clock, DollarSign, Plus, RefreshCw, 
  MoreVertical, Play, XCircle, Edit, Mail, Phone, ChevronLeft ,ChevronRight , 
  CheckCircle, FileText, User as UserIcon, Eye, Download, Search, Filter, Sparkles, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

import useAuth from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { doctorApi } from '../../lib/api';
import {
  getAppointments,
  cancelAppointment,
  updateAppointmentStatus
} from './appointmentApi';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

const getTodayStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse a YYYY-MM-DD date string as LOCAL time (not UTC) to avoid timezone shift bugs
const parseDateLocal = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const AppointmentCalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters & State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAppointments(false);
    setRefreshing(false);
    toast.success('Appointments list refreshed successfully.');
  };

  const selectedDateStr = useMemo(() => getTodayStr(selectedDate), [selectedDate]);

  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    setCurrentMonth(selectedDate.getMonth());
    setCurrentYear(selectedDate.getFullYear());
  }, [selectedDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Load baseline doctors list
  useEffect(() => {
    const initPage = async () => {
      try {
        if (user?.role === ROLES.DOCTOR) {
          const profileRes = await doctorApi.getMyProfile();
          const doc = profileRes.data?.doctor || profileRes.doctor || null;
          if (doc?._id) {
            setSelectedDoctorId(doc._id);
          }
        } else {
          const res = await doctorApi.list({ limit: 100 });
          setDoctors(res.data?.doctors || []);
        }
      } catch (err) {
        console.error('Failed to initialize doctors list:', err);
      }
    };
    initPage();
  }, [user]);

  // Fetch appointments — window spans the full displayed month plus a buffer
  // so navigating to any past/future date always loads the correct appointments.
  const loadAppointments = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Cover the entire selected month so mini-calendar navigation is seamless
      const fromDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const toDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      // Always include the exact selected date even if it's outside the current month view
      if (selectedDate < fromDate) fromDate.setTime(selectedDate.getTime());
      if (selectedDate > toDate) toDate.setTime(selectedDate.getTime());

      const params = {
        from: getTodayStr(fromDate),
        to: getTodayStr(toDate),
        limit: 100
      };

      if (selectedDoctorId) {
        params.doctorId = selectedDoctorId;
      }

      const response = await getAppointments(params);
      setAppointments(response.data?.appointments || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError(err.response?.data?.message || 'Unable to fetch appointments.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === ROLES.DOCTOR && !selectedDoctorId) {
      return; // Wait until doctor ID is loaded
    }
    loadAppointments(true);
    // Re-fetch whenever the selected month or doctor changes (currentMonth/currentYear handle month navigation)
  }, [selectedDateStr, currentMonth, currentYear, selectedDoctorId, user]);

  // Dynamic calculations based on loaded appointments
  const stats = useMemo(() => {
    const selectedDayAppointments = appointments.filter(a => getTodayStr(new Date(a.appointmentDate)) === selectedDateStr);
    
    const todayCount = selectedDayAppointments.length;
    const upcoming = selectedDayAppointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'no_show').length;
    const completed = selectedDayAppointments.filter(a => a.status === 'completed').length;
    const cancelled = selectedDayAppointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;
    const revenue = selectedDayAppointments.filter(a => a.paymentStatus === 'Paid').reduce((acc, a) => acc + (a.amount || 500), 0);

    return {
      todayCount,
      upcoming,
      completed,
      cancelled,
      revenue
    };
  }, [appointments, selectedDateStr]);

  const topDoctorsList = useMemo(() => {
    const counts = {};
    appointments.forEach(a => {
      const name = a.doctorId?.fullName || a.doctorId?.name;
      const spec = a.doctorId?.specialization?.name || 'General Physician';
      if (name) {
        if (!counts[name]) {
          counts[name] = { name, count: 0, spec };
        }
        counts[name].count += 1;
      }
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [appointments]);

  // Handle previous / next day navigation
  const adjustDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await cancelAppointment(id, { cancellationReason: 'Cancelled from dashboard' });
      toast.success('Appointment cancelled successfully');
      loadAppointments(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateAppointmentStatus(id, { status });
      toast.success(`Appointment status updated to ${status}`);
      loadAppointments(false);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Filter list of appointments for display
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      // Date filter
      // Date filter - always scope list to the selected calendar day
      const aDateStr = getTodayStr(new Date(a.appointmentDate));
      if (aDateStr !== selectedDateStr) return false;

      if (activeTab === 'Completed' && a.status !== 'completed') return false;
      if (activeTab === 'Cancelled' && a.status !== 'cancelled') return false;
      if (activeTab === 'No Show' && a.status !== 'no_show') return false;
      if (activeTab === 'Unattended' && a.status !== 'not_attended') return false;


      // Dropdowns
      if (selectedStatus && a.status !== selectedStatus) return false;
      if (selectedType && a.appointmentType !== selectedType) return false;

      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const pName = a.patientId?.fullName?.toLowerCase() || '';
        const pId = a.patientId?.patientId?.toLowerCase() || '';
        const pPhone = a.patientId?.phone || '';
        if (!pName.includes(query) && !pId.includes(query) && !pPhone.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, activeTab, selectedDateStr, selectedStatus, selectedType, searchQuery]);

  if (loading) {
    return <LoadingState label="Loading appointments dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Appointments unavailable" description={error} action={<button className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => loadAppointments()}>Retry</button>} />;
  }

  const displayList = filteredAppointments;

  return (
    <div className="space-y-6 bg-slate-50/50 p-1 min-h-screen">
      
      {/* 1. Page Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-905 tracking-tight">Appointments</h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Dashboard &gt; Appointments</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-65"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate('/appointments/new')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md"
          >
            <Plus size={16} /> New Appointment
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Cards (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center">
              <CalendarIcon size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Appointments</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.todayCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Appointments</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.upcoming}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed (This Month)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.completed}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cancelled / No Show</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.cancelled}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-teal-50 text-teal-650 rounded-xl flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue (Month)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">₹{stats.revenue.toLocaleString()}</h3>
      </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        {/* Date Range Picker */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Date Range</span>
          <input
            type="date"
            value={selectedDateStr}
            onChange={(e) => e.target.value && setSelectedDate(parseDateLocal(e.target.value))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          />
        </div>

        {/* Doctor Select */}
        {user?.role !== ROLES.DOCTOR && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Doctor</span>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="">All Doctors</option>
              {doctors.map(d => (
                <option key={d._id} value={d._id}>{d.fullName || d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Select */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="upcoming">Upcoming</option>
            <option value="checked_in">Checked In</option>
            <option value="waiting">Waiting</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

        {/* Appointment Type Select */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Appointment Type</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Types</option>
            <option value="Consultation">Consultation</option>
            <option value="Follow Up">Follow Up</option>
            <option value="Lab Review">Lab Review</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="flex flex-col gap-1 lg:col-span-2 justify-end">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by patient name, ID, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            />
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* 4. Two-Column Dashboard Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Appointments List */}
        <div className="lg:col-span-9 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            
            {/* Tabs List */}
            <div className="flex border-b border-slate-100 text-xs font-bold gap-2">
              {['All Appointments', 'Today', 'Upcoming', 'Completed', 'Cancelled', 'No Show', 'Unattended'].map((tab) => {
                const isActive = activeTab === (tab.split(' ')[0]);
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.split(' ')[0])}
                    className={`pb-2.5 px-2 transition border-b-2 ${
                      isActive ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-650'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}

            </div>

            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition shadow-sm">
              <Download size={13} /> Export
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2">Time</th>
                  <th className="py-3 px-2">Patient Details</th>
                  <th className="py-3 px-2">Doctor</th>
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Payment</th>
                  <th className="py-3 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {displayList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400 font-bold">
                      No appointments found.
                    </td>
                  </tr>
                ) : displayList.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/50 transition">
                    
                    {/* Time */}
                    <td className="py-4 px-2">
                      <p className="font-extrabold text-slate-900">{app.startTime}</p>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">
                        {new Date(app.appointmentDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>

                    {/* Patient Details */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-500">
                          {app.patientId?.fullName?.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{app.patientId?.fullName}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            PID: {app.patientId?.patientId || 'PT1254'} • {app.patientId?.age} Y • {app.patientId?.gender}
                          </p>
                          <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5"><Phone size={10} /> {app.patientId?.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Doctor Details */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-[10px]">
                          MD
                        </div>
                        <div>
                          <p className="font-bold text-slate-905">{app.doctorId?.fullName || 'Dr. Rahul Sharma'}</p>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{app.doctorId?.specialization || 'General Physician'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Appointment Type */}
                    <td className="py-4 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        app.appointmentType === 'Follow Up' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-650'
                      }`}>
                        {app.appointmentType}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-1">In-clinic</span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        app.status === 'confirmed' || app.status === 'checked_in'
                          ? 'bg-emerald-50 text-emerald-600'
                          : app.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-600'
                          : app.status === 'waiting'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        {app.status?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="py-4 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        app.paymentStatus === 'Paid' ? 'bg-emerald-55 bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {app.paymentStatus || 'Paid'}
                      </span>
                      <p className="text-[10px] font-bold text-slate-700 mt-1">₹{app.amount || 500}</p>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-2 text-center">
                      <div className="relative inline-block text-left">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/appointments/${app._id}`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                            title="View details"
                          >
                            <Eye size={13} />
                          </button>
                          
                          <button
                            onClick={() => setActionMenuOpenId(actionMenuOpenId === app._id ? null : app._id)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                          >
                            <MoreVertical size={13} />
                          </button>
                        </div>

                        {actionMenuOpenId === app._id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5 text-[10px]">
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                handleStatusUpdate(app._id, 'checked_in');
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition font-medium text-slate-700"
                            >
                              Check In
                            </button>
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                handleCancel(app._id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition font-medium text-rose-600"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span>Showing 1 to {displayList.length} of 24 appointments</span>
            <div className="flex items-center gap-1.5">
              <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-450">
                <ChevronLeft size={14} />
              </button>
              <button className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</button>
              <button className="w-6 h-6 rounded-lg hover:bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-600">2</button>
              <button className="w-6 h-6 rounded-lg hover:bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-600">3</button>
              <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-450">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Mini Calendar & Top Doctors */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Mini Calendar Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
              <span className="text-xs font-black text-slate-900">Appointment Calendar</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                >
                  <ChevronLeft size={12} className="text-slate-600" />
                </button>
                <span className="text-[10px] text-slate-700 font-bold min-w-[70px] text-center">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                >
                  <ChevronRight size={12} className="text-slate-600" />
                </button>
              </div>
            </div>

            {/* Dynamic Month Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <span key={day} className="text-slate-400 font-bold py-1">{day}</span>
              ))}
              
              {/* Empty padding cells */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <span key={`empty-${i}`} className="py-1" />
              ))}

              {/* Month Days */}
              {Array.from({ length: numDays }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected = 
                  selectedDate.getDate() === dayNum &&
                  selectedDate.getMonth() === currentMonth &&
                  selectedDate.getFullYear() === currentYear;

                const todayDate = new Date();
                const isToday =
                  todayDate.getDate() === dayNum &&
                  todayDate.getMonth() === currentMonth &&
                  todayDate.getFullYear() === currentYear;

                let dayClass = 'text-slate-700 hover:bg-slate-50';
                if (isToday && isSelected) {
                  dayClass = 'bg-emerald-600 text-white border-2 border-black font-extrabold shadow-sm';
                } else if (isToday) {
                  dayClass = 'bg-emerald-600 text-white font-bold shadow-sm';
                } else if (isSelected) {
                  dayClass = 'bg-emerald-100 text-emerald-800 border-2 border-black font-extrabold shadow-sm';
                }

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => {
                      setSelectedDate(new Date(currentYear, currentMonth, dayNum));
                    }}
                    className={`py-1 rounded-lg transition cursor-pointer ${dayClass}`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
            
            {/* Today's Summary Metrics */}
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-2 text-[10px]">
              <div className="flex justify-between items-center text-slate-600 font-bold">
                <span className="flex items-center gap-1.5">📅 Total Appointments</span>
                <span>{stats.todayCount}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-600 font-bold">
                <span className="flex items-center gap-1.5">🟢 Completed</span>
                <span>{stats.completed}</span>
              </div>
              <div className="flex justify-between items-center text-blue-600 font-bold">
                <span className="flex items-center gap-1.5">🔵 Upcoming</span>
                <span>{stats.upcoming}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600 font-bold">
                <span className="flex items-center gap-1.5">🔴 Cancelled</span>
                <span>{stats.cancelled}</span>
              </div>
            </div>
          </div>

          {/* Top Doctors Card */}
          {user?.role !== ROLES.DOCTOR && (
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-950 border-b border-slate-50 pb-2">Top Doctors (This Week)</h3>
              {topDoctorsList.length === 0 ? (
                <p className="text-[10px] text-slate-400 font-bold py-4 text-center">No doctor performance data</p>
              ) : (
                <div className="space-y-3">
                  {topDoctorsList.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-0.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-500 text-[10px] flex items-center justify-center">
                          {doc.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 leading-none">{doc.name}</p>
                          <span className="text-[9px] text-slate-400 mt-0.5 block">{doc.spec}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-900">{doc.count} Appts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default AppointmentCalendarPage;
