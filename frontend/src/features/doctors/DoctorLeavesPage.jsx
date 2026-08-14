import { useState, useEffect, useMemo, useRef } from 'react';
import { leaveApi, holidayApi, appointmentApi, doctorApi } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import {
  Calendar as CalendarIcon,
  Clock,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Eye,
  Info as InfoIcon,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import useAuth from '../../hooks/useAuth';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-200 bg-slate-50 px-4 py-3 text-xs outline-none transition focus:border-blue-600 focus:bg-white text-slate-800';

const DoctorLeavesPage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Views and Navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('Month'); // Month, Week, List
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState(null);

  // Form States
  const [form, setForm] = useState({
    leave_type: '',
    start_datetime: '',
    end_datetime: '',
    reason: '',
    durationMode: 'full', // 'full' or 'half'
    halfDaySession: 'morning' // 'morning' or 'afternoon'
  });

  // Appointment Conflict Check State
  const [conflictingAppointments, setConflictingAppointments] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Fetch Doctor Profile
  useEffect(() => {
    doctorApi.getMyProfile()
      .then(res => {
        setProfile(res.data?.doctor || res.doctor || null);
      })
      .catch(console.error);
  }, []);

  const fetchBalancesAndPolicy = async () => {
    try {
      const [balRes, policyRes, holidayRes] = await Promise.all([
        leaveApi.getBalances(),
        leaveApi.getPolicy(),
        holidayApi.list().catch(() => ({ holidays: [] }))
      ]);
      setBalances(balRes.balances || balRes.data?.balances || []);
      setHolidays(holidayRes.holidays || holidayRes.data?.holidays || []);
      const types = policyRes.policy?.leaveTypes || policyRes.data?.policy?.leaveTypes || [];
      setLeaveTypes(types);
      if (types.length > 0 && !form.leave_type) {
        setForm(f => ({ ...f, leave_type: types[0].code }));
      }
    } catch (err) {
      console.error('Failed to fetch leave resources:', err);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const response = await leaveApi.list();
      setLeaves(response.leaves || response.data?.leaves || []);
      await fetchBalancesAndPolicy();
    } catch (err) {
      console.error('Failed to load leaves', err);
      toast.error('Could not load leave history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!profile?._id) return;
    const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      socket.emit('join_user', user?._id);
    });

    socket.on('leave_update', () => {
      fetchLeaves();
    });

    return () => {
      socket.disconnect();
    };
  }, [profile?._id]);

  // Calendar calculations
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Find starting day index (Mon=0, Tue=1... Sun=6)
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6; // Sunday
    
    const days = [];
    // Pad previous month's days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIdx - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    // Current month's days
    const totalDays = lastDay.getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Pad next month's days to fill grid
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const calendarDays = useMemo(() => {
    return getDaysInMonth(currentDate);
  }, [currentDate]);

  const adjustMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Leave color status maps
  const getLeaveStatusColor = (status, durationMode) => {
    if (durationMode === 'half') return 'bg-blue-500'; // BLUE = Half Day
    if (status === 'approved') return 'bg-emerald-500'; // GREEN = Approved
    if (status === 'rejected') return 'bg-rose-500'; // RED = Rejected
    return 'bg-amber-500'; // ORANGE = Pending
  };

  const checkConflictAppointments = async (start, end) => {
    if (!profile?._id || !start || !end) return;
    setCheckingConflicts(true);
    try {
      const fromStr = new Date(start).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
      const toStr = new Date(end).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
      
      const res = await appointmentApi.getAppointments({
        doctorId: profile._id,
        from: fromStr,
        to: toStr
      });
      const allAppts = res.data?.appointments || res.appointments || [];
      
      // Filter overlaps
      const overlap = allAppts.filter(app => {
        if (['cancelled', 'rejected'].includes(app.status)) return false;
        const [hours, minutes] = app.startTime.split(':').map(Number);
        const appStart = new Date(app.appointmentDate);
        appStart.setHours(hours, minutes, 0, 0);
        const appEnd = new Date(appStart.getTime() + (app.durationMinutes || 15) * 60 * 1000);
        return appStart < new Date(end) && appEnd > new Date(start);
      });
      
      setConflictingAppointments(overlap);
    } catch (err) {
      console.error('Error checking appointment conflicts:', err);
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Trigger check on date changes
  useEffect(() => {
    if (form.start_datetime && form.end_datetime) {
      checkConflictAppointments(form.start_datetime, form.end_datetime);
    }
  }, [form.start_datetime, form.end_datetime]);

  const calculateLeaveDuration = () => {
    if (!form.start_datetime || !form.end_datetime) return 0;
    if (form.durationMode === 'half') return 0.5;
    const start = new Date(form.start_datetime);
    const end = new Date(form.end_datetime);
    if (start >= end) return 0;
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(diffHours / 24));
  };

  const requestedDuration = calculateLeaveDuration();

  const selectedBalance = useMemo(() => {
    return balances.find(b => b.leaveType === form.leave_type);
  }, [balances, form.leave_type]);

  const balanceAfterRequest = useMemo(() => {
    if (!selectedBalance) return 0;
    return Math.max(0, selectedBalance.remaining - requestedDuration);
  }, [selectedBalance, requestedDuration]);

  // Statistics Donut calculations
  const statsSummary = useMemo(() => {
    const summary = {};
    let totalDays = 0;
    leaves.forEach(l => {
      if (l.status === 'approved') {
        const duration = calculateLeaveDuration(l.start_datetime, l.end_datetime) || 1;
        summary[l.leave_type] = (summary[l.leave_type] || 0) + duration;
        totalDays += duration;
      }
    });
    return { summary, totalDays };
  }, [leaves]);

  const handleApply = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await leaveApi.apply(form);
      toast.success('Leave request submitted successfully!');
      setForm({
        leave_type: leaveTypes[0]?.code || '',
        start_datetime: '',
        end_datetime: '',
        reason: '',
        durationMode: 'full',
        halfDaySession: 'morning'
      });
      setShowApplyModal(false);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      await leaveApi.cancel(id);
      toast.success('Leave request cancelled successfully.');
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel leave request.');
    }
  };

  return (
    <div className="grid gap-6 p-1 bg-slate-50/50 min-h-screen">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50/80 flex items-center justify-center text-blue-600 shrink-0">
            <CalendarIcon size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">DOCTOR PORTAL</span>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">My Leaves & Time Off</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Apply for full day or partial day leaves, and track approval status.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs font-extrabold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Plus size={14} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* 2. LEAVE BALANCE CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {balances.map((b) => {
          const typeLabel = b.leaveType.replaceAll('_', ' ');
          return (
            <div key={b.leaveType} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs relative hover:translate-y-[-2px] transition duration-200 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">{typeLabel}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-3">{b.remaining}</h3>
              <p className="text-[9px] text-slate-400 font-bold mt-1">
                Allocated: {b.allocated} | Used: {b.used}
              </p>
            </div>
          );
        })}
      </div>

      {/* 3. CALENDAR + STATISTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEAVE CALENDAR (8/12) */}
        <div className="lg:col-span-8 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-2 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-black text-slate-800">Leave Calendar</h2>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-0.5">
                  <button onClick={() => adjustMonth(-1)} className="p-0.5 text-slate-400 hover:text-slate-800 transition"><ChevronLeft size={12} /></button>
                  <span className="text-[9px] font-black text-slate-800">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => adjustMonth(1)} className="p-0.5 text-slate-400 hover:text-slate-800 transition"><ChevronRight size={12} /></button>
                </div>
                <button onClick={setToday} className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-150 px-2 py-1 rounded-lg">Today</button>
              </div>

              {/* View Switches */}
              <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 text-[9px] font-black uppercase text-slate-500 w-fit">
                {['Month', 'Week', 'List'].map(v => (
                  <button
                    key={v}
                    onClick={() => setCalendarView(v)}
                    className={`px-2 py-1 rounded-lg transition ${
                      calendarView === v
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-transparent text-slate-400 hover:text-slate-850'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar Month Grid */}
            {calendarView === 'Month' && (
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const matchedLeaves = leaves.filter(l => {
                      const start = new Date(l.start_datetime);
                      const end = new Date(l.end_datetime);
                      const d = new Date(day.date);
                      d.setHours(12, 0, 0, 0); // middle of day
                      return d >= start && d <= end && l.status !== 'cancelled';
                    });

                    const matchedHolidays = holidays.filter(h => {
                      const hDate = new Date(h.holiday_date);
                      return hDate.getDate() === day.date.getDate() &&
                             hDate.getMonth() === day.date.getMonth() &&
                             hDate.getFullYear() === day.date.getFullYear();
                    });

                    return (
                      <div
                        key={idx}
                        className={`min-h-[55px] p-1.5 rounded-xl border border-slate-100 flex flex-col justify-between relative transition duration-150 ${
                          day.isCurrentMonth ? 'bg-slate-50/50 hover:bg-slate-100/50' : 'bg-slate-100/30 opacity-40'
                        } ${day.date.toDateString() === new Date().toDateString() ? 'border-blue-500 bg-white shadow-xs' : ''}`}
                      >
                        <span className="text-[10px] font-black text-slate-700">{day.date.getDate()}</span>
                        
                        {/* Markers */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {matchedLeaves.map(l => (
                            <button
                              key={l._id}
                              onClick={() => setSelectedLeaveDetail(l)}
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${getLeaveStatusColor(l.status, l.durationMode || 'full')}`}
                              title={`${l.leave_type}: ${l.status}`}
                            />
                          ))}
                          {matchedHolidays.map(h => (
                            <span
                              key={h._id}
                              className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"
                              title={`Holiday: ${h.holiday_name}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List/Week View Fallback */}
            {calendarView !== 'Month' && (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {leaves.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 italic">No leaves records scheduled</div>
                ) : (
                  leaves.map(l => (
                    <div key={l._id} className="p-3 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${getLeaveStatusColor(l.status, l.durationMode || 'full')}`} />
                        <div>
                          <strong className="text-xs font-black text-slate-800">{l.leave_type.replaceAll('_', ' ')}</strong>
                          <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <span>{new Date(l.start_datetime).toLocaleDateString()} - {new Date(l.end_datetime).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedLeaveDetail(l)}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Details
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* LEAVE STATISTICS DONUT (4/12) */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 pb-2 border-b border-slate-100 mb-4">Leave Statistics</h2>
            
            {statsSummary.totalDays === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-slate-400">
                <CalendarIcon size={28} />
                <p className="text-xs font-extrabold text-slate-655">No Approved Leave Statistics</p>
                <span className="text-[9px] text-slate-450 leading-relaxed max-w-[180px]">Your leave distribution will update once leave requests are approved.</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative flex justify-center items-center h-44">
                  {/* Basic Donut representation using responsive SVG */}
                  <svg className="w-36 h-36" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                    {/* Primary Approved leave donut stroke representing total balance ratio */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="10" 
                            strokeDasharray="251.2" strokeDashoffset="125" className="transform -rotate-90 origin-center" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                    <strong className="text-2xl font-black text-slate-900 mt-0.5">{statsSummary.totalDays} Days</strong>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-2 text-[10px]">
                  {Object.entries(statsSummary.summary).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-slate-600 font-bold">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {key.replaceAll('_', ' ')}
                      </span>
                      <span>{val} days ({Math.round((val / statsSummary.totalDays) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. LEAVE REQUEST HISTORY TABLE */}
      <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-blue-600 animate-pulse" size={16} />
            <span>Leave Requests History</span>
          </h2>
          <button onClick={fetchLeaves} className="text-slate-400 hover:text-slate-800 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {leaves.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <CalendarIcon className="text-slate-350" size={32} />
            <h4 className="text-sm font-black text-slate-655">No leave requests yet</h4>
            <p className="text-[10px] text-slate-450 mt-1 max-w-[200px] leading-relaxed">Your submitted leave requests will appear here.</p>
            <button onClick={() => setShowApplyModal(true)} className="px-4 py-2 bg-blue-605 text-white font-extrabold text-[10px] uppercase rounded-xl transition shadow-xs">
              Apply for Leave
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-150 text-slate-400 font-black uppercase tracking-wider">
                  <th className="py-3 px-4">Date Range</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4 text-center">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => {
                  const duration = calculateLeaveDuration(l.start_datetime, l.end_datetime) || 1;
                  return (
                    <tr key={l._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {new Date(l.start_datetime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(l.end_datetime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 font-black text-slate-800">
                        {l.leave_type.replaceAll('_', ' ')}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-500 font-bold">
                        {l.durationMode === 'half' ? `0.5 Day (${l.halfDaySession?.toUpperCase() || 'AM'})` : `${duration} Day(s)`}
                      </td>
                      <td className="py-4 px-4 text-slate-500 truncate max-w-xs">{l.reason || 'N/A'}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border ${
                          l.status === 'approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : l.status === 'rejected'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : l.status === 'cancelled'
                            ? 'bg-slate-50 border-slate-200 text-slate-500'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right flex justify-end gap-3.5 items-center">
                        <button onClick={() => setSelectedLeaveDetail(l)} className="text-slate-400 hover:text-blue-600 transition"><Eye size={14} /></button>
                        {(l.status === 'pending' || l.status === 'approved') && (
                          <button onClick={() => handleCancel(l._id)} className="text-[10px] font-black text-rose-600 hover:underline">Cancel</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. APPLY FOR LEAVE MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-slate-800 text-left animate-in fade-in-50 duration-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2">
              <CalendarIcon className="text-blue-600" size={20} />
              <span>Apply for Leave</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">Submit your request below. Your remaining leave balances will recalculate automatically.</p>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5">Leave Type</label>
                <select
                  value={form.leave_type}
                  onChange={(e) => setForm(f => ({ ...f, leave_type: e.target.value }))}
                  className={FIELD_CLASS}
                >
                  {leaveTypes.map(type => (
                    <option key={type.code} value={type.code}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Day duration switches */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-455 uppercase mb-1.5">Duration Mode</label>
                  <select
                    value={form.durationMode}
                    onChange={(e) => setForm(f => ({ ...f, durationMode: e.target.value }))}
                    className={FIELD_CLASS}
                  >
                    <option value="full">Full Day(s)</option>
                    <option value="half">Half Day</option>
                  </select>
                </div>

                {form.durationMode === 'half' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-455 uppercase mb-1.5">Half Day Session</label>
                    <select
                      value={form.halfDaySession}
                      onChange={(e) => setForm(f => ({ ...f, halfDaySession: e.target.value }))}
                      className={FIELD_CLASS}
                    >
                      <option value="morning">Morning Session (AM)</option>
                      <option value="afternoon">Afternoon Session (PM)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Datetime Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-455 uppercase mb-1.5">Start Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_datetime}
                    onChange={(e) => setForm(f => ({ ...f, start_datetime: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-455 uppercase mb-1.5">End Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.end_datetime}
                    onChange={(e) => setForm(f => ({ ...f, end_datetime: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              {/* Appointment Overlap Conflict checking warning panel */}
              {conflictingAppointments.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <div className="text-[10px] font-bold">
                    <span>Overlap Alert: </span>
                    You have {conflictingAppointments.length} appointments scheduled during this period.
                    <button 
                      type="button" 
                      onClick={() => navigate('/appointments')} 
                      className="ml-1.5 underline text-rose-800 block mt-1 hover:text-rose-955"
                    >
                      View Appointments
                    </button>
                  </div>
                </div>
              )}

              {/* Balances Calculation Deck */}
              {selectedBalance && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-2 text-[10px] text-slate-500 font-bold">
                  <div className="flex justify-between">
                    <span>Available Balance:</span>
                    <strong className="text-slate-800">{selectedBalance.remaining} Days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Requested Days:</span>
                    <strong className="text-blue-600">{requestedDuration} Days</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span>Balance after Request:</span>
                    <strong className={balanceAfterRequest < 0 ? 'text-rose-600' : 'text-slate-800'}>{balanceAfterRequest} Days</strong>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-455 uppercase mb-1.5">Reason</label>
                <textarea
                  placeholder="e.g. Personal work / Sick leave"
                  required
                  value={form.reason}
                  onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                  className={`${FIELD_CLASS} h-20 resize-none`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DETAIL VIEW MODAL */}
      {selectedLeaveDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-slate-800 text-left animate-in fade-in-50 duration-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="text-blue-600" size={18} />
              <span>Leave Request Details</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">Leave Type:</span>
                <strong className="text-slate-800 font-extrabold">{selectedLeaveDetail.leave_type?.replaceAll('_', ' ')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-455 font-bold">Start Date:</span>
                <span className="text-slate-800 font-bold">{new Date(selectedLeaveDetail.start_datetime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-455 font-bold">End Date:</span>
                <span className="text-slate-800 font-bold">{new Date(selectedLeaveDetail.end_datetime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-455 font-bold">Reason:</span>
                <span className="text-slate-800 font-bold">{selectedLeaveDetail.reason || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-455 font-bold">Status:</span>
                <span className="text-slate-800 font-bold capitalize">{selectedLeaveDetail.status}</span>
              </div>
              {selectedLeaveDetail.approved_by && (
                <div className="flex justify-between">
                  <span className="text-slate-455 font-bold">Reviewed By:</span>
                  <span className="text-slate-800 font-bold">Clinic Administrator</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedLeaveDetail(null)}
                className="px-5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-655 transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default DoctorLeavesPage;
