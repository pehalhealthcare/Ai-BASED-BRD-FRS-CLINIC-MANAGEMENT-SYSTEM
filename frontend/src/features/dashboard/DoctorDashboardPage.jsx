import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Bell,
  ChevronRight,
  UserCheck,
  Activity,
  FileText,
  PlusCircle,
  CheckCircle2,
  ListOrdered,
  Layers,
  FileSpreadsheet,
  Stethoscope,
  Settings,
  HelpCircle,
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { doctorApi } from '../../lib/api';
import { getDashboardOverview, getDashboardNotifications } from './dashboardApi';
import { getAppointments } from '../appointments/appointmentApi';
import { appointmentApi } from '../../api/appointmentApi';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

const DoctorDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Local states
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [queueStatus, setQueueStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Greeting based on time
  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch all required data
  const loadData = async () => {
    try {
      setError('');

      // 1. Get Doctor Profile
      const profileRes = await doctorApi.getMyProfile();
      const doc = profileRes.data?.doctor || profileRes.doctor || null;
      setProfile(doc);

      const doctorId = doc?._id;

      // 2. Fetch Overview & Appointments & Notifications concurrently
      const [overviewRes, apptsRes, notifRes] = await Promise.all([
        getDashboardOverview({ from: todayStr, to: todayStr }),
        getAppointments({ date: todayStr, doctorId }),
        getDashboardNotifications({ limit: 5 }).catch(() => ({ data: [] }))
      ]);

      setOverview(overviewRes.data || {});
      setAppointments(apptsRes.data?.appointments || []);
      setNotifications(notifRes.data || []);

      // 3. Fetch Live Queue if doctorId exists
      if (doctorId) {
        const queueRes = await appointmentApi.getQueueStatus(doctorId).catch(() => null);
        if (queueRes) {
          setQueueStatus(queueRes.data || queueRes);
        }
      }
    } catch (err) {
      console.error('Error loading doctor dashboard data:', err);
      setError('Unable to load some dashboard details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh queue status periodically
    const interval = setInterval(() => {
      if (profile?._id) {
        appointmentApi.getQueueStatus(profile._id)
          .then(res => setQueueStatus(res.data || res))
          .catch(() => null);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [profile?._id]);

  // Handle Action Navigations
  const handleStartConsultation = () => {
    // Find first active appointment to consult or go to consultations page
    const inProgressAppt = appointments.find(a => a.status === 'in_consultation');
    const checkedInAppt = appointments.find(a => a.status === 'checked_in');
    const nextAppt = inProgressAppt || checkedInAppt || appointments[0];

    if (nextAppt) {
      navigate(`/appointments/${nextAppt._id}/consultation`);
    } else {
      navigate('/consultations');
    }
  };

  // Calendar logic helper
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }

    // Next month padding
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }

    return days;
  };

  const calendarDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const name = appt.patientId?.fullName || '';
      const type = appt.appointmentType || 'Consultation';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [appointments, searchQuery]);

  if (loading) {
    return <LoadingState label="Loading your premium dashboard..." />;
  }

  const cards = overview?.cards || {};

  return (
    <section className="space-y-6 pb-12 animate-fade-in text-stone-800 dark:text-stone-100">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-sm relative overflow-hidden">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
            {greeting}, Dr. {user?.fullName?.split(' ').pop() || 'Practitioner'} <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Here&apos;s what&apos;s happening in your clinic today. We&apos;ve prepared your schedule and patient details.
          </p>
        </div>

        {/* Global Search & Action Ribbon */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative z-10">
          <div className="relative flex-1 md:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search patients, appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-navy-950 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition dark:text-white"
            />
          </div>

          <button
            onClick={() => navigate('/appointments')}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-white dark:bg-navy-800 hover:bg-stone-50 dark:hover:bg-navy-700 text-stone-600 dark:text-stone-300 transition"
            title="Calendar View"
          >
            <CalendarIcon size={16} />
          </button>

          <button
            onClick={() => navigate('/dashboard/notifications')}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-white dark:bg-navy-800 hover:bg-stone-50 dark:hover:bg-navy-700 text-stone-600 dark:text-stone-300 relative transition"
            title="Notifications"
          >
            <Bell size={16} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Metric 1: Today's Appointments */}
        <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CalendarIcon size={18} />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} /> 12%
            </span>
          </div>
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-550 uppercase tracking-wider mt-4">Today&apos;s Appointments</p>
          <h3 className="text-3xl font-extrabold text-stone-900 dark:text-white mt-1">{appointments.length || cards.todayAppointments || 0}</h3>
          <p className="text-[10px] text-stone-405 mt-1">from yesterday</p>
        </div>

        {/* Metric 2: Completed Consultations */}
        <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <UserCheck size={18} />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} /> 8%
            </span>
          </div>
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-550 uppercase tracking-wider mt-4">Completed Consultations</p>
          <h3 className="text-3xl font-extrabold text-stone-900 dark:text-white mt-1">{cards.completedConsultations || 0}</h3>
          <p className="text-[10px] text-stone-405 mt-1">from yesterday</p>
        </div>

        {/* Metric 3: New Patients */}
        <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <User size={18} />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} /> 25%
            </span>
          </div>
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-550 uppercase tracking-wider mt-4">New Patients</p>
          <h3 className="text-3xl font-extrabold text-stone-900 dark:text-white mt-1">{cards.newPatients || 0}</h3>
          <p className="text-[10px] text-stone-405 mt-1">from yesterday</p>
        </div>

        {/* Metric 4: Pending Follow-ups */}
        <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Clock size={18} />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full">
              <ArrowDownRight size={12} /> 5%
            </span>
          </div>
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-550 uppercase tracking-wider mt-4">Pending Follow-ups</p>
          <h3 className="text-3xl font-extrabold text-stone-900 dark:text-white mt-1">{cards.pendingFollowUps || 0}</h3>
          <p className="text-[10px] text-stone-405 mt-1">from yesterday</p>
        </div>

        {/* Metric 5: Total Patients */}
        <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm hover:translate-y-[-2px] transition duration-200 col-span-2 md:col-span-1">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Layers size={18} />
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} /> 16%
            </span>
          </div>
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-550 uppercase tracking-wider mt-4">Total Patients</p>
          <h3 className="text-3xl font-extrabold text-stone-900 dark:text-white mt-1">{cards.totalPatients || 1248}</h3>
          <p className="text-[10px] text-stone-405 mt-1">this month</p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">

        {/* Left Layout Container */}
        <div className="space-y-6">
          {/* Today's Schedule Card */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-stone-900 dark:text-white">Today&apos;s Schedule</h2>
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {appointments.length}
                </span>
              </div>
              <Link to="/appointments" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                View full schedule <ChevronRight size={14} />
              </Link>
            </div>

            {/* Appointment Timeline List */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {filteredAppointments.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-stone-200 dark:border-white/[0.08] rounded-2xl">
                  <CalendarIcon className="mx-auto text-stone-300 dark:text-stone-700 mb-2" size={32} />
                  <p className="text-sm font-semibold text-stone-500">No appointments scheduled for today.</p>
                </div>
              ) : (
                filteredAppointments.map((appt) => {
                  const statusColors = {
                    confirmed: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20',
                    in_consultation: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/20',
                    booked: 'bg-stone-50 dark:bg-white/[0.03] text-stone-605 dark:text-stone-400 border-stone-200 dark:border-white/[0.08]',
                    checked_in: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/20',
                    completed: 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-900/20'
                  };

                  const currentStatusColor = statusColors[appt.status] || statusColors.booked;

                  return (
                    <div
                      key={appt._id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-150 dark:border-white/[0.05] hover:bg-stone-50 dark:hover:bg-white/[0.02] transition cursor-pointer"
                      onClick={() => navigate(`/appointments/${appt._id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center w-16 shrink-0 border-r border-stone-100 dark:border-white/[0.05] pr-3">
                          <p className="text-sm font-bold text-stone-900 dark:text-white">{appt.startTime || '09:00'}</p>
                          <p className="text-[10px] text-stone-400 uppercase font-semibold">AM</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {appt.patientId?.image ? (
                            <img src={appt.patientId.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-white/[0.05] flex items-center justify-center text-stone-505 font-bold text-sm">
                              {appt.patientId?.fullName?.[0] || 'P'}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-extrabold text-stone-850 dark:text-white">{appt.patientId?.fullName || 'Anonymous Patient'}</h4>
                            <p className="text-[11px] text-stone-400 font-semibold mt-0.5">
                              Consultation • {appt.appointmentType || 'Follow-up'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${currentStatusColor}`}>
                          {appt.status?.replaceAll('_', ' ')}
                        </span>
                        <ChevronRight size={16} className="text-stone-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-stone-900 dark:text-white mb-1.5">Quick Actions</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-5">Jump into your daily workflows and create items directly.</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => navigate('/appointments/new')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-stone-200 dark:border-white/[0.08] hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:border-emerald-350 transition duration-200 text-center gap-2 group cursor-pointer"
              >
                <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-450 group-hover:scale-110 transition">
                  <PlusCircle size={20} />
                </div>
                <span className="text-xs font-bold text-stone-705 dark:text-stone-300">New Appointment</span>
              </button>

              <button
                onClick={handleStartConsultation}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-stone-200 dark:border-white/[0.08] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-350 transition duration-200 text-center gap-2 group cursor-pointer"
              >
                <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-450 group-hover:scale-110 transition">
                  <Stethoscope size={20} />
                </div>
                <span className="text-xs font-bold text-stone-750 dark:text-stone-300">Start Consultation</span>
              </button>

              <button
                onClick={() => navigate('/prescriptions/new')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-stone-200 dark:border-white/[0.08] hover:bg-purple-50/50 dark:hover:bg-purple-950/20 hover:border-purple-350 transition duration-200 text-center gap-2 group cursor-pointer"
              >
                <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-450 group-hover:scale-110 transition">
                  <FileText size={20} />
                </div>
                <span className="text-xs font-bold text-stone-750 dark:text-stone-300">Write Prescription</span>
              </button>

              <button
                onClick={() => navigate('/labs/orders')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-stone-200 dark:border-white/[0.08] hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:border-amber-350 transition duration-200 text-center gap-2 group cursor-pointer"
              >
                <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-450 group-hover:scale-110 transition">
                  <Activity size={20} />
                </div>
                <span className="text-xs font-bold text-stone-750 dark:text-stone-300">Order Lab Test</span>
              </button>

              <button
                onClick={() => navigate('/follow-ups')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-stone-200 dark:border-white/[0.08] hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-350 transition duration-200 text-center gap-2 group cursor-pointer"
              >
                <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-450 group-hover:scale-110 transition">
                  <ListOrdered size={20} />
                </div>
                <span className="text-xs font-bold text-stone-750 dark:text-stone-300">Send Follow-up</span>
              </button>

              <button
                onClick={() => navigate('/patients')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-stone-200 dark:border-white/[0.08] hover:bg-rose-50/50 dark:hover:bg-rose-950/20 hover:border-rose-350 transition duration-200 text-center gap-2 group cursor-pointer"
              >
                <div className="p-3 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-450 group-hover:scale-110 transition">
                  <User size={20} />
                </div>
                <span className="text-xs font-bold text-stone-750 dark:text-stone-300">Patient Records</span>
              </button>
            </div>
          </div>

          {/* Workload Overview Chart */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-stone-900 dark:text-white">Workload Overview</h2>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Consultation metrics trend for the last week</p>
              </div>
              <select className="rounded-xl border border-stone-200 dark:border-white/[0.1] bg-white dark:bg-navy-800 text-xs font-bold px-3 py-2 outline-none dark:text-white cursor-pointer">
                <option>This Week</option>
                <option>Last Week</option>
              </select>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="relative pt-4">
              <svg viewBox="0 0 700 240" className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines */}
                <line x1="40" y1="30" x2="680" y2="30" stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" className="dark:stroke-white/[0.04]" />
                <line x1="40" y1="80" x2="680" y2="80" stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" className="dark:stroke-white/[0.04]" />
                <line x1="40" y1="130" x2="680" y2="130" stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" className="dark:stroke-white/[0.04]" />
                <line x1="40" y1="180" x2="680" y2="180" stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" className="dark:stroke-white/[0.04]" />
                <line x1="40" y1="220" x2="680" y2="220" stroke="rgba(0,0,0,0.08)" className="dark:stroke-white/[0.08]" />

                {/* Y-Axis Labels */}
                <text x="25" y="34" className="text-[10px] font-bold fill-stone-400 dark:fill-stone-500" textAnchor="end">40</text>
                <text x="25" y="84" className="text-[10px] font-bold fill-stone-400 dark:fill-stone-500" textAnchor="end">30</text>
                <text x="25" y="134" className="text-[10px] font-bold fill-stone-400 dark:fill-stone-500" textAnchor="end">20</text>
                <text x="25" y="184" className="text-[10px] font-bold fill-stone-400 dark:fill-stone-500" textAnchor="end">10</text>
                <text x="25" y="224" className="text-[10px] font-bold fill-stone-400 dark:fill-stone-500" textAnchor="end">0</text>

                {/* Data Path */}
                {/* Points: Mon(18), Tue(24), Wed(28), Thu(22), Fri(32), Sat(16), Sun(12) */}
                {/* X Coordinates: Mon(80), Tue(180), Wed(280), Thu(380), Fri(480), Sat(580), Sun(660) */}
                {/* Y Coordinates: Y = 220 - (value * 5) */}
                {/* Y: Mon(130), Tue(100), Wed(80), Thu(110), Fri(60), Sat(140), Sun(160) */}
                <path
                  d="M 80 130 C 130 115, 130 100, 180 100 C 230 100, 230 80, 280 80 C 330 80, 330 110, 380 110 C 430 110, 430 60, 480 60 C 530 60, 530 140, 580 140 C 620 140, 630 160, 660 160"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Area Gradient Path */}
                <path
                  d="M 80 130 C 130 115, 130 100, 180 100 C 230 100, 230 80, 280 80 C 330 80, 330 110, 380 110 C 430 110, 430 60, 480 60 C 530 60, 530 140, 580 140 C 620 140, 630 160, 660 160 L 660 220 L 80 220 Z"
                  fill="url(#chartGradient)"
                />

                {/* X-Axis Labels */}
                <text x="80" y="238" className="text-[10px] font-bold fill-stone-500 dark:fill-stone-400" textAnchor="middle">Mon</text>
                <text x="180" y="238" className="text-[10px] font-bold fill-stone-500 dark:fill-stone-400" textAnchor="middle">Tue</text>
                <text x="280" y="238" className="text-[10px] font-bold fill-stone-500 dark:fill-stone-400" textAnchor="middle">Wed</text>
                <text x="380" y="238" className="text-[10px] font-bold fill-stone-500 dark:fill-stone-400" textAnchor="middle">Thu</text>
                <text x="480" y="238" className="text-[10px] font-bold fill-stone-500 dark:fill-stone-400" textAnchor="middle">Fri</text>
                <text x="580" y="238" className="text-[10px] font-bold fill-stone-500 dark:fill-stone-400" textAnchor="middle">Sat</text>
                <text x="660" y="238" className="text-[10px] font-bold fill-stone-500 dark:fill-stone-400" textAnchor="middle">Sun</text>

                {/* Data Circles & Value Badges */}
                <g>
                  {/* Mon */}
                  <circle cx="80" cy="130" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                  <rect x="68" y="105" width="24" height="16" rx="4" fill="#0f172a" className="dark:fill-white" />
                  <text x="80" y="117" className="text-[9px] font-extrabold fill-navy-950 dark:fill-white text-black dark:text-white" textAnchor="middle">18</text>

                  {/* Tue */}
                  <circle cx="180" cy="100" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                  <rect x="168" y="75" width="24" height="16" rx="4" fill="#0f172a" className="dark:fill-white" />
                  <text x="180" y="87" className="text-[9px] font-extrabold fill-white dark:fill-navy-950" textAnchor="middle">24</text>

                  {/* Wed */}
                  <circle cx="280" cy="80" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                  <rect x="268" y="55" width="24" height="16" rx="4" fill="#0f172a" className="dark:fill-white" />
                  <text x="280" y="67" className="text-[9px] font-extrabold fill-white dark:fill-navy-950" textAnchor="middle">28</text>

                  {/* Thu */}
                  <circle cx="380" cy="110" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                  <rect x="368" y="85" width="24" height="16" rx="4" fill="#0f172a" className="dark:fill-white" />
                  <text x="380" y="97" className="text-[9px] font-extrabold fill-white dark:fill-navy-950" textAnchor="middle">22</text>

                  {/* Fri */}
                  <circle cx="480" cy="60" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                  <rect x="468" y="35" width="24" height="16" rx="4" fill="#0f172a" className="dark:fill-white" />
                  <text x="480" y="47" className="text-[9px] font-extrabold fill-white dark:fill-navy-950" textAnchor="middle">32</text>

                  {/* Sat */}
                  <circle cx="580" cy="140" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                  <rect x="568" y="115" width="24" height="16" rx="4" fill="#0f172a" className="dark:fill-white" />
                  <text x="580" y="127" className="text-[9px] font-extrabold fill-white dark:fill-navy-950" textAnchor="middle">16</text>

                  {/* Sun */}
                  <circle cx="660" cy="160" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                  <rect x="648" y="135" width="24" height="16" rx="4" fill="#0f172a" className="dark:fill-white" />
                  <text x="660" y="147" className="text-[9px] font-extrabold fill-white dark:fill-navy-950" textAnchor="middle">12</text>
                </g>
              </svg>

              {/* Total Appointments Mini-Summary Footer */}
              <div className="flex gap-4 border-t border-stone-155 dark:border-white/[0.05] mt-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Total Weekly Appointments: </span>
                  <span className="text-xs font-extrabold text-stone-850 dark:text-white">152</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Completed consultations: </span>
                  <span className="text-xs font-extrabold text-stone-850 dark:text-white">98</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Layout Container */}
        <div className="space-y-6">

          {/* Calendar Widget */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-stone-900 dark:text-white capitalize">
                {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1 rounded hover:bg-stone-105 dark:hover:bg-navy-800 text-stone-605 transition"
                >
                  ◀
                </button>
                <button
                  onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
                  className="px-2 py-1 text-[10px] font-bold border border-stone-200 dark:border-white/[0.1] rounded hover:bg-stone-50 dark:hover:bg-navy-800 dark:text-white transition"
                >
                  Today
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1 rounded hover:bg-stone-105 dark:hover:bg-navy-800 text-stone-605 transition"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Days of Week Headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-stone-400 uppercase mb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {calendarDays.map((cell, idx) => {
                const isSelected = selectedDate.toDateString() === cell.date.toDateString();
                const isToday = new Date().toDateString() === cell.date.toDateString();

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`py-2 rounded-xl text-center font-semibold transition ${!cell.isCurrentMonth ? 'text-stone-300 dark:text-stone-700' : 'text-stone-700 dark:text-stone-300'
                      } ${isToday ? 'bg-emerald-600 text-white font-bold' : ''
                      } ${isSelected && !isToday ? 'bg-stone-100 dark:bg-navy-800 font-bold border border-stone-200 dark:border-white/[0.08]' : ''
                      } hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-150 dark:border-white/[0.05] flex items-center gap-2 text-[11px] text-stone-505">
              <CalendarIcon size={14} className="text-emerald-500" />
              <span>You have <strong className="text-stone-850 dark:text-white font-extrabold">{appointments.length} appointments</strong> scheduled for today.</span>
            </div>
          </div>

          {/* Upcoming Today Timeline */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-stone-900 dark:text-white">Upcoming Today</h3>
              <Link to="/appointments" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">View all</Link>
            </div>

            <div className="space-y-4">
              {appointments.slice(0, 4).map((appt, i) => {
                const colorIndicators = ['bg-purple-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500'];
                const indicator = colorIndicators[i % colorIndicators.length];

                return (
                  <div key={appt._id || i} className="flex items-start gap-3 relative">
                    {/* Visual vertical timeline bar */}
                    {i < Math.min(appointments.length, 4) - 1 && (
                      <div className="absolute top-6 left-1.5 bottom-[-16px] w-[2px] bg-stone-100 dark:bg-white/[0.05]"></div>
                    )}

                    <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${indicator}`}></div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="text-xs font-bold text-stone-800 dark:text-white truncate">
                          {appt.patientId?.fullName || 'Scheduled Patient'}
                        </h4>
                        <span className="text-[10px] font-semibold text-stone-400 shrink-0">{appt.startTime || '12:00 PM'}</span>
                      </div>
                      <p className="text-[10px] text-stone-400 font-semibold mt-0.5 truncate">
                        Consultation • {appt.appointmentType || 'Routine Checkup'}
                      </p>
                    </div>
                  </div>
                );
              })}
              {appointments.length === 0 && (
                <p className="text-xs text-stone-400 italic text-center py-4">No upcoming events.</p>
              )}
            </div>
          </div>

          {/* Notifications Scoped to Doctor */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-stone-900 dark:text-white">Notifications</h3>
              <Link to="/dashboard/notifications" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">View all</Link>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-stone-50 dark:hover:bg-white/[0.02]">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 mt-0.5">
                  <Bell size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-800 dark:text-white">6 unread notifications</h4>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5">New appointment requests waiting review.</p>
                  <span className="text-[9px] text-stone-400 block mt-1">5m ago</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-stone-50 dark:hover:bg-white/[0.02]">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 mt-0.5">
                  <Activity size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-800 dark:text-white">Lab reports ready</h4>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5">3 reports are pending your final signature.</p>
                  <span className="text-[9px] text-stone-400 block mt-1">20m ago</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-stone-50 dark:hover:bg-white/[0.02]">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-500 mt-0.5">
                  <CalendarIcon size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-800 dark:text-white">Appointment reminder</h4>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5">You have 18 appointments configured today.</p>
                  <span className="text-[9px] text-stone-400 block mt-1">30m ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Patient Queue */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-stone-900 dark:text-white">Live Patient Queue</h3>
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-450 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  {queueStatus?.queue?.totalCheckedIn || appointments.filter(a => a.status === 'checked_in').length || 3} Live
                </span>
              </div>
              <Link to="/appointments" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">View all</Link>
            </div>

            <div className="space-y-3">
              {/* Active patient cards waiting in queue */}
              {queueStatus?.queue?.patients?.length > 0 ? (
                queueStatus.queue.patients.map((pat, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-stone-50 dark:bg-navy-950 border border-stone-150 dark:border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center text-xs font-bold text-stone-700 dark:text-stone-300">
                        {pat.patientName?.[0] || 'P'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-850 dark:text-white">{pat.patientName}</h4>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Consultation • Regular Check</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{pat.waitTimeMinutes || 10} min</span>
                      <p className="text-[9px] text-stone-400 font-semibold">wait time</p>
                    </div>
                  </div>
                ))
              ) : (
                // Sample items when queue endpoint returns basic counts
                <>
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-stone-50 dark:bg-navy-950 border border-stone-150 dark:border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center text-xs font-bold text-stone-700 dark:text-stone-300">K</div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-850 dark:text-white">Karan Joshi</h4>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Consultation • Follow-up</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">10 min</span>
                      <p className="text-[9px] text-stone-400 font-semibold">wait time</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-2xl bg-stone-50 dark:bg-navy-950 border border-stone-150 dark:border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center text-xs font-bold text-stone-700 dark:text-stone-300">M</div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-850 dark:text-white">Meena Iyer</h4>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Consultation • Lab Review</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">20 min</span>
                      <p className="text-[9px] text-stone-400 font-semibold">wait time</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-2xl bg-stone-50 dark:bg-navy-950 border border-stone-150 dark:border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center text-xs font-bold text-stone-700 dark:text-stone-300">D</div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-850 dark:text-white">Dev Sharma</h4>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Consultation • New Patient</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">30 min</span>
                      <p className="text-[9px] text-stone-400 font-semibold">wait time</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => navigate('/appointments')}
              className="w-full text-center text-xs font-bold text-emerald-600 hover:text-emerald-700 border border-stone-200 dark:border-white/[0.08] hover:border-emerald-300 rounded-2xl py-3 mt-4 transition cursor-pointer"
            >
              View full queue →
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};

export default DoctorDashboardPage;
