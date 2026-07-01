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
  ChevronLeft,
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
  AlertTriangle,
  Play,
  XCircle,
  Star,
  Users,
  Printer,
  PlusSquare,
  AlertOctagon,
  RefreshCw,
  MoreVertical,
  Shield,
  HelpCircle as InfoIcon
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { doctorApi, appointmentApi } from '../../lib/api';
import { getAppointments } from '../appointments/appointmentApi';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import toast from 'react-hot-toast';

const DoctorDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Local states
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Date selection (default today)
  const [selectedDate, setSelectedDate] = useState(new Date('2026-07-01'));
  
  // Selected patient/token for Center consultation panel
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Active status tab for Today's Appointments (Left Column)
  const [activeTab, setActiveTab] = useState('All');

  // Consultation duration counter simulation
  const [consultationSeconds, setConsultationSeconds] = useState(0);

  // OTP Verification States
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [otpFailedAttempts, setOtpFailedAttempts] = useState(0);
  const [patientNotResponding, setPatientNotResponding] = useState(false);

  const selectedDateStr = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  // Fetch all required data
  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setError('');

      // 1. Get Doctor Profile
      let doc = profile;
      if (!doc) {
        const profileRes = await doctorApi.getMyProfile();
        doc = profileRes.data?.doctor || profileRes.doctor || null;
        setProfile(doc);
      }

      const doctorId = doc?._id;
      if (doctorId) {
        // 2. Fetch Appointments for selected date
        const apptsRes = await getAppointments({ date: selectedDateStr, doctorId });
        setAppointments(apptsRes.data?.appointments || []);

        // 3. Fetch Live Queue
        const queueRes = await appointmentApi.getDoctorQueue(doctorId);
        const sortedQueue = queueRes.data?.queue || queueRes.queue || [];
        setQueue(sortedQueue);

        // Auto select current active token if any
        const active = sortedQueue.find(t => t.status === 'in_consultation' || t.status === 'called');
        if (active) {
          setSelectedToken(active);
          setSelectedAppointment(null);
        } else if (sortedQueue.length > 0 && !selectedToken) {
          setSelectedToken(sortedQueue[0]);
          setSelectedAppointment(null);
        }
      }
    } catch (err) {
      console.error('Error loading doctor dashboard data:', err);
      setError('Unable to load dashboard details. Please refresh.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [selectedDateStr]);

  // Auto-refresh queue every 5 seconds for real-time simulation
  useEffect(() => {
    if (!profile?._id) return;
    const interval = setInterval(() => {
      appointmentApi.getDoctorQueue(profile._id)
        .then(res => {
          const sortedQueue = res.data?.queue || res.queue || [];
          setQueue(sortedQueue);
          // Sync selected token state
          if (selectedToken) {
            const updated = sortedQueue.find(t => t._id === selectedToken._id);
            if (updated) setSelectedToken(updated);
          }
        })
        .catch(() => null);
    }, 5000);
    return () => clearInterval(interval);
  }, [profile?._id, selectedToken]);

  // Live timer for active consultation
  useEffect(() => {
    let interval = null;
    const active = queue.find(t => t.status === 'in_consultation');
    if (active) {
      interval = setInterval(() => {
        setConsultationSeconds(sec => sec + 1);
      }, 1000);
    } else {
      setConsultationSeconds(0);
    }
    return () => clearInterval(interval);
  }, [queue]);

  const consultationDurationStr = useMemo(() => {
    const mins = Math.floor(consultationSeconds / 60) + 12; // Start from 12 mins matching the image
    return `${mins} mins`;
  }, [consultationSeconds]);

  // Handle Call Next Patient
  const handleCallNext = async () => {
    if (!profile?._id) return;
    try {
      await appointmentApi.callNext(profile._id);
      toast.success('Next patient called.');
      // Re-fetch queue and auto-select the called token (which now has OTP)
      const queueRes = await appointmentApi.getDoctorQueue(profile._id);
      const sortedQueue = queueRes.data?.queue || queueRes.queue || [];
      setQueue(sortedQueue);
      const calledToken = sortedQueue.find(t => t.status === 'called' || t.status === 'in_consultation');
      if (calledToken) setSelectedToken(calledToken);
      loadData(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No waiting patients in the queue.');
    }
  };

  // Handle Start Consultation
  const handleStartConsultation = async (token) => {
    try {
      // If token is still 'waiting', calling start consultation will generate the OTP and update status to 'called'
      if (token.status === 'waiting') {
        const res = await appointmentApi.startTokenConsultation(token._id);
        toast.success('OTP sent to patient. Please verify OTP to begin.');
        setSelectedToken(res.token || res.data?.token || token);
        loadData(false);
      } else if (token.status === 'called') {
        // If already called, it requires OTP verification before navigating
        toast.error('Patient has already been called. Enter OTP to start.');
      } else {
        // Fallback/Direct consultation route
        navigate(`/appointments/${token.appointmentId?._id}/consultation`);
      }
    } catch (err) {
      toast.error('Failed to start consultation.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!selectedToken) return;
    try {
      setVerificationError('');
      const res = await appointmentApi.verifyOtp({
        tokenId: selectedToken._id,
        enteredOtp
      });
      toast.success('Patient verified successfully!');
      setEnteredOtp('');
      setOtpFailedAttempts(0);
      setSelectedToken(res.token || res.data?.token);
      loadData(false);
      navigate(`/appointments/${selectedToken.appointmentId?._id}/consultation`);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid OTP.';
      setVerificationError(errMsg);
      setOtpFailedAttempts(prev => prev + 1);
      toast.error(errMsg);
    }
  };

  const handleSkip = async (tokenId) => {
    if (!window.confirm('Skip this patient and call the next patient?')) return;
    try {
      await appointmentApi.skipPatient(tokenId);
      toast.success('Patient status updated to Skipped.');
      setSelectedToken(null);
      loadData(false);
    } catch (err) {
      toast.error('Failed to skip patient.');
    }
  };

  const handleReassign = async (tokenId) => {
    try {
      const res = await appointmentApi.reassignSkipped({ tokenId });
      toast.success(`Token reassigned successfully: ${res.token?.tokenNumber || 'New Token'}`);
      loadData(false);
    } catch (err) {
      toast.error('Failed to reassign token.');
    }
  };

  // Handle Complete Consultation
  const handleComplete = async (token) => {
    try {
      await appointmentApi.completeTokenConsultation(token._id);
      toast.success('Consultation completed.');
      setSelectedToken(null);
      loadData(false);
    } catch (err) {
      toast.error('Failed to complete consultation.');
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = appointments.length;
    const checkedIn = appointments.filter(a => ['checked_in', 'late_check_in', 'called', 'in_consultation', 'completed'].includes(a.status)).length;
    const waiting = queue.filter(t => t.status === 'waiting' || t.status === 'called').length;
    const inConsultation = queue.filter(t => t.status === 'in_consultation').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const late = appointments.filter(a => a.status === 'late_check_in').length;
    const noShow = appointments.filter(a => a.status === 'no_show').length;

    return { total, checkedIn, waiting, inConsultation, completed, late, noShow };
  }, [appointments, queue]);

  // Left panel grouped list filter
  const filteredAppointments = useMemo(() => {
    if (activeTab === 'Upcoming') {
      return appointments.filter(a => a.status === 'booked' || a.status === 'confirmed');
    }
    if (activeTab === 'Checked-In') {
      return appointments.filter(a => ['checked_in', 'late_check_in', 'called', 'in_consultation'].includes(a.status));
    }
    if (activeTab === 'Late') {
      return appointments.filter(a => a.status === 'late_check_in');
    }
    if (activeTab === 'Completed') {
      return appointments.filter(a => a.status === 'completed');
    }
    if (activeTab === 'Cancelled') {
      return appointments.filter(a => ['cancelled', 'patient_cancelled', 'clinic_cancelled'].includes(a.status));
    }
    if (activeTab === 'No Show') {
      return appointments.filter(a => a.status === 'no_show');
    }
    return appointments;
  }, [appointments, activeTab]);

  const adjustDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const nextPatientInQueue = useMemo(() => {
    return queue.find(t => t.status === 'waiting') || null;
  }, [queue]);

  if (loading) {
    return <LoadingState label="Loading Premium Doctor Console..." />;
  }

  return (
    <div className="space-y-6 pb-12 bg-[#050911] text-slate-100 min-h-screen p-4 md:p-6 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a0f1d]/60 border border-white/[0.04] rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Doctor Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage today's appointments and consultation queue
          </p>
        </div>

        {/* User Badge Profile */}
        <div className="flex items-center gap-4">
          <button className="relative w-9 h-9 bg-white/[0.03] border border-white/[0.08] rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>

          <div className="flex items-center gap-3 bg-[#0a0f1d] border border-white/[0.06] rounded-2xl px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
              {profile?.lastName ? profile.lastName.substring(0, 2) : 'AD'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">Dr. {profile?.fullName || 'Alpha Doctor'}</p>
              <span className="text-[9px] text-slate-500 font-bold leading-none mt-1 block">General Physician</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Metric 1: Total Appointments */}
        <div className="bg-[#0a0f1d] border border-white/[0.05] rounded-2xl p-4 flex flex-col relative overflow-hidden hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Total Appointments</span>
            <CalendarIcon size={14} className="text-blue-400" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2">{stats.total}</h3>
        </div>

        {/* Metric 2: Checked-In */}
        <div className="bg-[#0a0f1d] border border-white/[0.05] rounded-2xl p-4 flex flex-col relative overflow-hidden hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Checked-In</span>
            <UserCheck size={14} className="text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2">{stats.checkedIn}</h3>
        </div>

        {/* Metric 3: Waiting */}
        <div className="bg-[#0a0f1d] border border-white/[0.05] rounded-2xl p-4 flex flex-col relative overflow-hidden hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Waiting</span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2">{stats.waiting}</h3>
        </div>

        {/* Metric 4: In Consultation */}
        <div className="bg-[#0a0f1d] border border-white/[0.05] rounded-2xl p-4 flex flex-col relative overflow-hidden hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">In Consultation</span>
            <Activity size={14} className="text-indigo-400" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2">{stats.inConsultation}</h3>
        </div>

        {/* Metric 5: Completed */}
        <div className="bg-[#0a0f1d] border border-white/[0.05] rounded-2xl p-4 flex flex-col relative overflow-hidden hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2">{stats.completed}</h3>
        </div>

        {/* Metric 6: Late Arrivals */}
        <div className="bg-[#0a0f1d] border border-white/[0.05] rounded-2xl p-4 flex flex-col relative overflow-hidden hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Late Arrivals</span>
            <AlertTriangle size={14} className="text-orange-400" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2">{stats.late}</h3>
        </div>

        {/* Metric 7: No Show */}
        <div className="bg-[#0a0f1d] border border-white/[0.05] rounded-2xl p-4 flex flex-col relative overflow-hidden hover:translate-y-[-2px] transition duration-200">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">No Show</span>
            <XCircle size={14} className="text-rose-500" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2">{stats.noShow}</h3>
        </div>
      </div>

      {/* Main 3-Column Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Today's Appointments (4/12 Grid) */}
        <div className="lg:col-span-4 bg-[#0a0f1d] border border-white/[0.06] rounded-3xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
            <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-2.5 py-1">
              <button onClick={() => adjustDate(-1)} className="p-0.5 text-slate-400 hover:text-white transition">
                <ChevronLeft size={14} />
              </button>
              <span className="text-[10px] font-extrabold text-white flex items-center gap-1">
                <CalendarIcon size={12} className="text-emerald-400" />
                {selectedDate.toDateString() === new Date('2026-07-01').toDateString() ? 'Today, ' : ''}
                {selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => adjustDate(1)} className="p-0.5 text-slate-400 hover:text-white transition">
                <ChevronRight size={14} />
              </button>
            </div>
            <button
              onClick={() => loadData(true)}
              className="text-[9px] font-black tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl"
            >
              Sync Queue
            </button>
          </div>

          {/* Group Tab Pill Headers */}
          <div className="flex flex-wrap gap-1 border-b border-white/[0.04] pb-2 text-[9px] font-black uppercase text-slate-400">
            {[
              { id: 'All', label: 'All Appointments', count: stats.total },
              { id: 'Upcoming', label: 'Upcoming', count: stats.total - stats.checkedIn },
              { id: 'Checked-In', label: 'Checked-In', count: stats.checkedIn },
              { id: 'Late', label: 'Late', count: stats.late },
              { id: 'Completed', label: 'Completed', count: stats.completed },
              { id: 'Cancelled', label: 'Cancelled', count: 0 },
              { id: 'No Show', label: 'No Show', count: stats.noShow }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-1 rounded-lg border transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 font-bold'
                    : 'bg-transparent border-transparent text-slate-450 hover:text-white'
                }`}
              >
                {tab.label} <span className="text-[8px] opacity-60 ml-0.5">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Appointments List */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredAppointments.map((appt) => {
              const matchedToken = queue.find(t => t.appointmentId?._id === appt._id);
              const statusColorMap = {
                checked_in: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                late_check_in: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
                completed: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
                cancelled: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                no_show: 'bg-slate-900 border-white/5 text-slate-500'
              };

              const isCheckedIn = ['checked_in', 'late_check_in', 'called', 'in_consultation', 'completed'].includes(appt.status);

              return (
                <div
                  key={appt._id}
                  className={`p-3.5 rounded-2xl border border-white/[0.04] bg-[#070b14]/50 hover:bg-[#070b14]/90 transition flex items-center justify-between cursor-pointer ${
                    selectedAppointment?._id === appt._id || selectedToken?.appointmentId?._id === appt._id ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : ''
                  }`}
                  onClick={() => {
                    setSelectedAppointment(appt);
                    setSelectedToken(null);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 shrink-0 text-center pr-3 border-r border-white/[0.04]">
                      <p className="text-xs font-bold text-white">{appt.startTime}</p>
                      <p className="text-[8px] text-slate-500 uppercase mt-0.5">15 mins</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/[0.08] flex items-center justify-center font-bold text-xs text-indigo-400">
                        {appt.patientId?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{appt.patientId?.fullName || 'Patient'}</h4>
                        <p className="text-[9px] text-slate-550 mt-0.5">
                          {appt.patientId?.age || 25} yrs, {appt.patientId?.gender || 'Male'} <span className="mx-1">•</span> {appt.source === 'reception' ? 'Walk-In' : 'Online Booking'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${
                        appt.status === 'late_check_in' ? statusColorMap.late_check_in : isCheckedIn ? statusColorMap.checked_in : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {appt.status === 'late_check_in' ? 'CHECKED-IN (LATE)' : isCheckedIn ? 'CHECKED-IN' : 'UPCOMING'}
                      </span>
                      {matchedToken && (
                        <p className="text-[8px] text-slate-500 font-bold mt-1">Token: {matchedToken.tokenNumber}</p>
                      )}
                    </div>
                    <button className="text-slate-600 hover:text-white transition">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/appointments')}
            className="w-full py-3 bg-[#080d19] border border-white/[0.06] hover:bg-white/[0.02] text-xs font-bold text-emerald-400 rounded-2xl transition text-center"
          >
            View Full Schedule →
          </button>
        </div>

        {/* Center Panel: Current Consultation (4/12 Grid) */}
        <div className="lg:col-span-4 bg-[#0a0f1d] border border-white/[0.06] rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04] mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                {selectedToken ? 'Current Patient' : 'Appointment Info'}
              </h2>
              {selectedToken ? (
                selectedToken.status === 'in_consultation' ? (
                  <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse">
                    IN CONSULTATION
                  </span>
                ) : (
                  <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-[#080d19] border border-white/[0.08] text-slate-500">
                    WAITING
                  </span>
                )
              ) : selectedAppointment ? (
                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${
                  selectedAppointment.status === 'completed' ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' :
                  ['cancelled', 'patient_cancelled', 'clinic_cancelled'].includes(selectedAppointment.status) ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                  ['checked_in', 'late_check_in'].includes(selectedAppointment.status) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>
                  {selectedAppointment.status}
                </span>
              ) : (
                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-[#080d19] border border-white/[0.08] text-slate-500">
                  NONE
                </span>
              )}
            </div>
            {selectedToken ? (
              selectedToken.status === 'called' ? (
                patientNotResponding ? (
                  <div className="space-y-4">
                    {/* Patient did not respond panel */}
                    <div className="bg-[#0e1726]/45 border border-white/[0.05] rounded-3xl p-5 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-450 flex items-center justify-center mx-auto animate-pulse">
                        <AlertOctagon size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Patient did not respond.</h4>
                        <p className="text-[10px] text-slate-450 mt-1">The patient did not arrive inside the consultation cabin.</p>
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          onClick={() => {
                            toast.success('Wait timer set for 2 minutes.');
                            setPatientNotResponding(false);
                          }}
                          className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl transition"
                        >
                          Wait 2 Minutes
                        </button>
                        <button
                          onClick={handleCallNext}
                          className="py-2.5 bg-slate-900 border border-white/[0.08] hover:bg-white/[0.02] text-slate-300 text-[10px] font-black uppercase rounded-xl transition"
                        >
                          Call Again
                        </button>
                        <button
                          onClick={() => handleSkip(selectedToken._id)}
                          className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase rounded-xl transition"
                        >
                          Skip Patient
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Profile Overview */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base">
                          {selectedToken.appointmentId?.patientId?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P'}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{selectedToken.appointmentId?.patientId?.fullName}</h3>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {selectedToken.appointmentId?.patientId?.age} yrs, {selectedToken.appointmentId?.patientId?.gender} <span className="mx-1">•</span> {selectedToken.appointmentId?.patientId?.phone || '9876543210'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-555 block uppercase font-black">Token</span>
                        <strong className="text-xl font-black text-indigo-400">{selectedToken.tokenNumber}</strong>
                      </div>
                    </div>

                    {/* OTP Patient Verification Card */}
                    <div className="bg-[#0e1726]/40 border border-white/[0.05] rounded-3xl p-5 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Shield size={16} />
                        <h4 className="text-xs font-black uppercase tracking-wider">Verify Patient</h4>
                      </div>
                      <p className="text-[11px] text-slate-455 leading-relaxed">
                        Ask the patient to tell you the Consultation OTP displayed on their mobile application.
                      </p>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Enter 6-Digit OTP"
                          maxLength={6}
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-center tracking-[0.3em] font-extrabold text-base py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                        {verificationError && (
                          <p className="text-[10px] text-rose-455 font-bold text-center">{verificationError}</p>
                        )}
                        {otpFailedAttempts > 0 && (
                          <p className="text-[9px] text-slate-500 text-center">Attempts: {otpFailedAttempts} of 3</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {otpFailedAttempts >= 3 ? (
                          <>
                            <button
                              onClick={() => {
                                setOtpFailedAttempts(0);
                                setVerificationError('');
                              }}
                              className="flex-1 py-2 bg-slate-900 border border-white/[0.08] hover:bg-white/[0.02] text-white text-[10px] font-black uppercase rounded-lg transition"
                            >
                              Retry
                            </button>
                            <button
                              onClick={() => alert('Reception assistance requested. A coordinator will arrive shortly.')}
                              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase rounded-lg transition"
                            >
                              Assist
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleVerifyOtp}
                            disabled={enteredOtp.length !== 6}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl transition disabled:opacity-40"
                          >
                            Verify OTP
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Called Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.04]">
                      <button
                        onClick={() => handleSkip(selectedToken._id)}
                        className="py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-[10px] font-black uppercase rounded-xl transition"
                      >
                        Skip Patient
                      </button>
                      <button
                        onClick={() => setPatientNotResponding(true)}
                        className="py-2 bg-slate-900 border border-white/[0.08] hover:bg-white/[0.02] text-slate-400 text-[10px] font-black uppercase rounded-xl transition"
                      >
                        Not Present
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {/* Profile Overview */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">
                        {selectedToken.appointmentId?.patientId?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{selectedToken.appointmentId?.patientId?.fullName}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {selectedToken.appointmentId?.patientId?.age} yrs, {selectedToken.appointmentId?.patientId?.gender} <span className="mx-1">•</span> {selectedToken.appointmentId?.patientId?.phone || '9876543210'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-550 block uppercase font-black">Token</span>
                      <strong className="text-xl font-black text-emerald-400">{selectedToken.tokenNumber}</strong>
                    </div>
                  </div>

                  {/* Vitals & Queue Parameters Details */}
                  <div className="grid grid-cols-2 gap-3.5 bg-[#070b14]/60 p-4 border border-white/[0.04] rounded-2xl text-[10px] text-slate-400">
                    <div>
                      <span className="text-slate-500 font-bold block">Check-In Time</span>
                      <strong className="text-white font-bold">{new Date(selectedToken.generatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Waiting Time</span>
                      <strong className="text-white font-bold">{Math.max(0, Math.floor((new Date().getTime() - new Date(selectedToken.generatedTime).getTime()) / 60000))} mins</strong>
                    </div>
                    <div>
                      <span className="text-slate-550 font-bold block">Appointment</span>
                      <strong className="text-white font-bold">{selectedToken.appointmentId?.startTime}</strong>
                    </div>
                    <div>
                      <span className="text-slate-550 font-bold block">Source</span>
                      <strong className="text-white font-bold capitalize">{selectedToken.appointmentId?.source === 'reception' ? 'Walk-In' : 'Online'}</strong>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-1.5 text-[11px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Patient Notes</span>
                    <p className="text-slate-350 bg-[#070b14]/30 p-3 rounded-xl border border-white/[0.04] leading-relaxed italic">
                      "{selectedToken.appointmentId?.notes || 'Patient came with complaint of mild fever and headache.'}"
                    </p>
                  </div>

                  {/* Navigation Details Lists */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-[#070b14]/40 hover:bg-[#070b14]/95 transition p-3 rounded-xl border border-white/[0.04] cursor-pointer text-xs">
                      <span className="text-slate-400 font-bold">Previous Visits</span>
                      <span className="text-slate-500 text-[10px]">2 previous visits &gt;</span>
                    </div>

                    <div className="flex justify-between items-center bg-[#070b14]/40 hover:bg-[#070b14]/95 transition p-3 rounded-xl border border-white/[0.04] cursor-pointer text-xs">
                      <span className="text-slate-400 font-bold">Next Follow-up</span>
                      <span className="text-slate-550 text-[10px]">05 July 2026 &gt;</span>
                    </div>
                  </div>
                </div>
              )
            ) : selectedAppointment ? (
              <div className="space-y-4">
                {/* Profile Overview */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/[0.08] text-indigo-400 flex items-center justify-center font-bold text-base">
                      {selectedAppointment.patientId?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{selectedAppointment.patientId?.fullName || 'Patient'}</h3>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {selectedAppointment.patientId?.age || 25} yrs, {selectedAppointment.patientId?.gender || 'Male'} <span className="mx-1">•</span> {selectedAppointment.patientId?.phone || '9876543210'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Appointment Schedule & Parameters */}
                <div className="grid grid-cols-2 gap-3.5 bg-[#070b14]/60 p-4 border border-white/[0.04] rounded-2xl text-[10px] text-slate-400">
                  <div>
                    <span className="text-slate-500 font-bold block">Appointment Time</span>
                    <strong className="text-white font-bold">{selectedAppointment.startTime}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">Booking Type</span>
                    <strong className="text-white font-bold capitalize">{selectedAppointment.appointmentType || 'scheduled'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-550 font-bold block">Source</span>
                    <strong className="text-white font-bold capitalize">{selectedAppointment.source === 'reception' ? 'Walk-In' : 'Online'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-550 font-bold block">Duration</span>
                    <strong className="text-white font-bold">{selectedAppointment.durationMinutes || 15} Mins</strong>
                  </div>
                </div>

                {/* Issue / Reason for Visit */}
                <div className="space-y-1.5 text-[11px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Reason for Visit</span>
                  <p className="text-slate-350 bg-[#070b14]/30 p-3 rounded-xl border border-white/[0.04] leading-relaxed italic">
                    "{selectedAppointment.reasonForVisit || 'General checkup / consultation.'}"
                  </p>
                </div>

                {/* Medical Details Profile */}
                <div className="bg-[#070b14]/30 border border-white/[0.04] rounded-2xl p-4 space-y-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Allergies</span>
                    <p className="text-slate-300 mt-0.5">{selectedAppointment.patientId?.allergies?.length > 0 ? selectedAppointment.patientId.allergies.join(', ') : 'None Reported'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Chronic Conditions</span>
                    <p className="text-slate-300 mt-0.5">{selectedAppointment.patientId?.chronicConditions?.length > 0 ? selectedAppointment.patientId.chronicConditions.join(', ') : 'None'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Current Medications</span>
                    <p className="text-slate-300 mt-0.5">{selectedAppointment.patientId?.currentMedications?.length > 0 ? selectedAppointment.patientId.currentMedications.join(', ') : 'None'}</p>
                  </div>
                </div>

                {/* Past Appointments List */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Past Appointments</span>
                  <div className="bg-[#070b14]/40 p-3 rounded-xl border border-white/[0.04] text-[10px] text-slate-400 flex justify-between items-center">
                    <span>26 Jun 2026 - Fever & Cold</span>
                    <span className="text-emerald-450 font-bold">Completed</span>
                  </div>
                  <div className="bg-[#070b14]/40 p-3 rounded-xl border border-white/[0.04] text-[10px] text-slate-400 flex justify-between items-center">
                    <span>14 Jun 2026 - Regular Checkup</span>
                    <span className="text-emerald-450 font-bold">Completed</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-555 italic text-xs">
                No patient selected. Choose an active patient to start.
              </div>
            )}
          </div>

          {selectedToken && selectedToken.status !== 'called' && (
            <div className="space-y-3.5 pt-4 border-t border-white/[0.04] mt-4">
              <div className="flex justify-between gap-3">
                <button
                  onClick={() => selectedToken && navigate(`/appointments/${selectedToken.appointmentId?._id}/consultation`)}
                  disabled={!selectedToken}
                  className="flex-1 py-3 border border-white/[0.06] hover:bg-white/[0.02] text-xs font-bold text-slate-450 rounded-2xl transition disabled:opacity-40"
                >
                  View Patient Profile
                </button>

                <button
                  onClick={async () => {
                    if (!selectedToken) return;
                    if (selectedToken.status !== 'in_consultation') {
                      await handleStartConsultation(selectedToken);
                    } else {
                      await handleComplete(selectedToken);
                    }
                  }}
                  disabled={!selectedToken}
                  className="flex-1 py-3 bg-[#00A884] hover:bg-[#009675] text-xs font-bold text-white rounded-2xl transition shadow-lg shadow-emerald-950/20 disabled:opacity-40"
                >
                  {selectedToken?.status === 'in_consultation' ? 'Complete Consultation' : 'Start Consultation'}
                </button>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
                <span className="flex items-center gap-1.5"><Clock size={12} /> Consultation Duration: <strong>{consultationDurationStr}</strong></span>
                <button
                  onClick={() => selectedToken && handleSkip(selectedToken._id)}
                  disabled={!selectedToken}
                  className="text-rose-400 hover:text-rose-500 font-black uppercase tracking-wider"
                >
                  End Without Consultation
                </button>
              </div>
            </div>
          )}</div>

        {/* Right Panel: Consultation Queue (4/12 Grid) */}
        <div className="lg:col-span-4 bg-[#0a0f1d] border border-white/[0.06] rounded-3xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-bold">{queue.length}</span>
              Consultation Queue
            </h2>
            <button className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-wider flex items-center gap-1">
              Queue Rules <InfoIcon size={12} />
            </button>
          </div>

          {/* Next Patient Call Panel Card */}
          <div className="bg-[#080d19]/80 border border-white/[0.05] rounded-2xl p-4.5 flex justify-between items-center relative overflow-hidden">
            {nextPatientInQueue ? (
              <>
                <div>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Next Patient</span>
                  <strong className="text-2xl font-black text-indigo-400 mt-1 block">{nextPatientInQueue.tokenNumber}</strong>
                  <p className="text-[10px] font-bold text-white mt-1">{nextPatientInQueue.appointmentId?.patientId?.fullName || 'Patient'}</p>
                  <span className="text-[9px] text-slate-550 mt-0.5 block">
                    {nextPatientInQueue.appointmentId?.patientId?.age || 25} yrs, {nextPatientInQueue.appointmentId?.patientId?.gender || 'Male'}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end gap-3">
                  <div>
                    <span className="text-[8px] text-slate-550 font-black block uppercase">Waiting Time</span>
                    <strong className="text-xs font-bold text-white mt-0.5 block">
                      {Math.max(0, Math.floor((new Date().getTime() - new Date(nextPatientInQueue.generatedTime).getTime()) / 60000))} mins
                    </strong>
                  </div>
                  <button
                    onClick={handleCallNext}
                    className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase flex items-center gap-1 transition"
                  >
                    Call Next <ChevronRight size={12} />
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full text-center py-6 text-xs text-slate-500 italic flex flex-col items-center justify-center space-y-2">
                <Clock size={18} className="text-slate-500" />
                <span>No waiting patients in queue</span>
                <button
                  onClick={handleCallNext}
                  className="mt-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-indigo-400 font-bold text-[9px] uppercase transition"
                >
                  Call Next Patient
                </button>
              </div>
            )}
          </div>

          {/* Queue Rows Table List */}
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Queue ({queue.length} Patients)</span>
            {queue.map((token, idx) => {
              const isLately = token.appointmentId?.status === 'late_check_in';
              return (
                <div
                  key={token._id}
                  className={`p-3 bg-[#070b14]/50 border border-white/[0.04] rounded-xl flex items-center justify-between hover:bg-[#070b14]/80 transition ${
                    selectedToken?._id === token._id ? 'border-emerald-500/20 bg-[#070b14]' : ''
                  }`}
                  onClick={() => {
                    setSelectedToken(token);
                    setSelectedAppointment(null);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-550 w-4">{idx + 1}</span>
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded">
                      {token.tokenNumber}
                    </span>
                    <div>
                      <h5 className="text-[11px] font-bold text-white">{token.appointmentId?.patientId?.fullName || 'Patient'}</h5>
                      <p className="text-[9px] text-slate-500 mt-0.5">{token.appointmentId?.patientId?.age || 32} yrs, Male</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isLately && (
                      <span className="px-1.5 py-0.5 bg-orange-500/15 border border-orange-500/20 text-orange-400 text-[7px] font-black uppercase rounded">
                        LATE
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400">{Math.max(0, Math.floor((new Date().getTime() - new Date(token.generatedTime).getTime()) / 60000))} mins</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Indicators Legend & Control button */}
          <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 px-1 border-t border-white/[0.04] pt-3 mt-1">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Online</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Walk-In</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Late</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Emergency</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> VIP</span>
          </div>

          <button className="w-full py-3 bg-[#080d19] border border-white/[0.06] hover:bg-white/[0.02] text-xs font-bold text-slate-400 rounded-2xl transition text-center mt-1">
            Manage Queue
          </button>
        </div>

      </div>

      {/* Bottom Performance and Summary row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Today's Summary performance (7/12 Grid) */}
        <div className="lg:col-span-7 bg-[#0a0f1d] border border-white/[0.06] rounded-3xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Today's Summary</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-[10px] text-slate-500 font-bold block uppercase">Total Patients</p>
              <strong className="text-lg font-black text-white mt-1 block">12</strong>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold block uppercase">Completed</p>
              <strong className="text-lg font-black text-emerald-450 mt-1 block">3</strong>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold block uppercase">In Progress</p>
              <strong className="text-lg font-black text-indigo-400 mt-1 block">1</strong>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold block uppercase">Pending</p>
              <strong className="text-lg font-black text-slate-300 mt-1 block">7</strong>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold block uppercase">No Show</p>
              <strong className="text-lg font-black text-rose-400 mt-1 block">1</strong>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold block uppercase">Avg. Consultation Time</p>
              <strong className="text-base font-black text-white mt-1.5 block">14 mins</strong>
            </div>
          </div>
        </div>

        {/* Quick Actions (5/12 Grid) */}
        <div className="lg:col-span-5 bg-[#0a0f1d] border border-white/[0.06] rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => navigate('/appointments/new')}
              className="py-2.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/25 rounded-xl text-indigo-400 text-[10px] font-black uppercase transition-all"
            >
              Add Walk-In
            </button>
            <button
              onClick={() => {
                const apptId = prompt('Enter appointment ID to prioritize:');
                if (apptId) appointmentApi.checkInPatient(apptId, { method: 'Reception', isEmergency: true }).then(() => loadData(false));
              }}
              className="py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-455 text-[10px] font-black uppercase transition-all animate-pulse"
            >
              Emergency Patient
            </button>
            <button
              onClick={() => loadData(false)}
              className="py-2.5 bg-slate-900 border border-white/[0.06] hover:bg-white/[0.02] text-slate-350 text-[10px] font-black uppercase transition-all"
            >
              Refresh Queue
            </button>
            <button
              onClick={() => {
                window.print();
              }}
              className="py-2.5 bg-slate-900 border border-white/[0.06] hover:bg-white/[0.02] text-slate-350 text-[10px] font-black uppercase transition-all"
            >
              Print Queue
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboardPage;
