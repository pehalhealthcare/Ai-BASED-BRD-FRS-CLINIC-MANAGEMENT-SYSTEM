import { useEffect, useState, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Activity,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  AlertOctagon,
  Printer,
  RefreshCw,
  MoreVertical,
  Play,
  XCircle,
  Stethoscope,
  Info as InfoIcon
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { doctorApi, appointmentApi, followUpApi, chatApi, notificationApi } from '../../lib/api';
import { getAppointments } from '../appointments/appointmentApi';
import LoadingState from '../../components/common/LoadingState';
import toast from 'react-hot-toast';
import Avatar from '../../components/ui/Avatar';

const DoctorDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Local states
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Timezone configured date selection (default today)
  const getTodayStr = () => {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  };

  const [todayDateStr, setTodayDateStr] = useState(getTodayStr());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Selected patient/token for Center consultation panel
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const selectedAppointmentRef = useRef(null);
  useEffect(() => {
    selectedAppointmentRef.current = selectedAppointment;
  }, [selectedAppointment]);
  const [activeConsultation, setActiveConsultation] = useState(null);

  // Active status tab for Today's Appointments (Left Column)
  const [activeTab, setActiveTab] = useState('All');

  // Queue Search and Filters
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueActiveFilter, setQueueActiveFilter] = useState('All');

  // Consultation duration counter simulation
  const [consultationSeconds, setConsultationSeconds] = useState(0);

  // OTP Verification States
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [otpFailedAttempts, setOtpFailedAttempts] = useState(0);
  const [patientNotResponding, setPatientNotResponding] = useState(false);

  // Waiver States
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverForm, setWaiverForm] = useState({ waiverType: 'none', waiverAmount: 0, waiverReason: '' });

  const isTokenPaid = (token) => {
    if (!token) return true;
    const appt = token.appointmentId;
    if (!appt) return true;
    const fee = appt.consultationFee || 0;
    if (fee === 0) return true;
    const status = appt.paymentStatus;
    if (status === 'paid' || status === 'fully_waived') return true;
    if (status === 'partially_waived') {
      return (appt.amountPaid || 0) >= (appt.remainingAmount || 0);
    }
    return false;
  };

  const handleWaiverSubmit = async (e) => {
    e.preventDefault();
    const apptId = selectedToken?.appointmentId?._id || selectedAppointment?._id;
    if (!apptId) return;
    try {
      await appointmentApi.applyWaiver(apptId, waiverForm);
      toast.success('Consultation fee waiver updated successfully.');
      setShowWaiverModal(false);
      loadData(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update waiver.');
    }
  };

  const selectedDateStr = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(selectedDate);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
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
        const clinicId = user?.clinic?._id || user?.clinicId || doc.clinicId;
        const apptsRes = await getAppointments({ date: selectedDateStr, doctorId, clinicId });
        setAppointments(apptsRes.data?.appointments || []);

        // 3. Fetch Live Queue
        const queueRes = await appointmentApi.getDoctorQueue(doctorId);
        const sortedQueue = queueRes.data?.queue || queueRes.queue || [];
        setQueue(sortedQueue);

        // 4. Fetch Active Consultation
        const activeRes = await appointmentApi.getCurrentConsultation(doctorId);
        const activeToken = activeRes.data?.activeConsultation || activeRes.activeConsultation || null;
        setActiveConsultation(activeToken);

        // 5. Fetch Follow-ups
        const followUpsRes = await followUpApi.list({ doctorId }).catch(() => ({}));
        setFollowUps(followUpsRes.data?.followUps || followUpsRes.followUps || []);

        // 6. Fetch Recent Messages
        const chatRes = await chatApi.getConversations().catch(() => ({}));
        setRecentMessages(chatRes.data?.conversations || chatRes.conversations || []);

        // 7. Fetch Notifications / Alerts
        const alertsRes = await notificationApi.listLogs({ limit: 10 }).catch(() => ({}));
        setAlerts(alertsRes.items || alertsRes.data?.items || []);

        // Auto-select active consultation or called token
        if (activeToken) {
          setSelectedToken(activeToken);
          setSelectedAppointment(null);
        } else {
          const called = sortedQueue.find(t => t.status === 'called');
          if (called) {
            setSelectedToken(called);
            setSelectedAppointment(null);
          }
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

  // Midnight switch timer check
  useEffect(() => {
    const interval = setInterval(() => {
      const currentToday = getTodayStr();
      if (currentToday !== todayDateStr) {
        setTodayDateStr(currentToday);
        if (selectedDateStr === todayDateStr) {
          setSelectedDate(new Date());
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [todayDateStr, selectedDateStr]);

  // Socket.IO Integration
  useEffect(() => {
    if (!profile?._id) return;

    const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const socket = io(socketUrl);

    const triggerRefresh = () => {
      loadData(false);
    };

    socket.on('connect', () => {
      // Join both User ID and Doctor ID rooms
      socket.emit('join_user', user?._id);
      socket.emit('join_user', profile._id);
      const clinicId = user?.clinic?._id || user?.clinicId;
      if (clinicId) {
        socket.emit('join_clinic', clinicId);
      }
      triggerRefresh();
    });

    socket.on('queue_update', (data) => {
      if (String(data.doctorId) === String(profile._id)) {
        triggerRefresh();
      }
    });

    const handleAppointmentEvent = (data) => {
      const targetDocId = data.doctorId || data.appointment?.doctorId || (data.appointment?.doctorId?._id ? data.appointment.doctorId._id : null);
      if (targetDocId && String(targetDocId) !== String(profile._id)) return;
      triggerRefresh();
    };

    socket.on('appointment:created', handleAppointmentEvent);
    socket.on('appointment:payment-success', handleAppointmentEvent);
    socket.on('appointment:status-updated', handleAppointmentEvent);
    socket.on('appointment:checked-in', handleAppointmentEvent);
    socket.on('appointment:cancelled', handleAppointmentEvent);
    socket.on('appointment:completed', handleAppointmentEvent);
    socket.on('consultation:started', handleAppointmentEvent);
    socket.on('consultation:completed', handleAppointmentEvent);
    socket.on('token:generated', handleAppointmentEvent);
    socket.on('queue:updated', triggerRefresh);
    socket.on('message:new', triggerRefresh);
    socket.on('notification:new', triggerRefresh);

    const interval = setInterval(triggerRefresh, 15005);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [profile?._id, user?._id, selectedDateStr]);

  // Timer for active consultation
  useEffect(() => {
    let interval = null;
    if (activeConsultation) {
      interval = setInterval(() => {
        setConsultationSeconds(sec => sec + 1);
      }, 1000);
    } else {
      setConsultationSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeConsultation]);

  const consultationDurationStr = useMemo(() => {
    const mins = Math.floor(consultationSeconds / 60) + 12;
    return `${mins} mins`;
  }, [consultationSeconds]);

  // Handle Call Next Patient
  const handleCallNext = async () => {
    if (!profile?._id) return;
    try {
      const currentRes = await appointmentApi.getCurrentConsultation(profile._id);
      const liveActive = currentRes.data?.activeConsultation || currentRes.activeConsultation || null;
      setActiveConsultation(liveActive);
      if (liveActive) {
        toast.error('Another consultation is currently active.');
        return;
      }

      const res = await appointmentApi.callNext(profile._id);
      toast.success('Next patient called.');
      loadData(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No waiting patients in the queue.');
    }
  };

  // Handle Start Consultation
  const handleStartConsultation = async (token) => {
    if (!token || !token._id) {
      toast.error('Unable to start consultation. Missing token information.');
      return;
    }
    if (activeConsultation && activeConsultation._id !== token._id) {
      toast.error('Another consultation is currently active.', { duration: 5000 });
      return;
    }
    try {
      const appt = token.appointmentId;
      if (appt && appt.consultationMode === 'ONLINE') {
        toast.loading('Starting online consultation...');
        await appointmentApi.startOnlineConsultation(appt._id || appt);
        toast.dismiss();
        toast.success('Online video consultation initialized.');
        navigate(`/appointments/${appt._id || appt}/consultation`);
        return;
      }

      toast.loading('Starting consultation...');
      const res = await appointmentApi.startTokenConsultation(token._id);
      const updatedToken = res.token || res.data?.token || token;
      setSelectedToken(updatedToken);
      setActiveConsultation(updatedToken);
      toast.dismiss();
      toast.success('Consultation started successfully.');
      const apptId = updatedToken.appointmentId?._id || updatedToken.appointmentId;
      navigate(`/appointments/${apptId}/consultation`);
    } catch (err) {
      toast.dismiss();
      if (err.response?.status === 409) {
        toast.error('Another consultation is currently active.', { duration: 5000 });
      } else {
        toast.error(err.response?.data?.message || 'Failed to start consultation.');
      }
    }
  };

  // Handle Complete Consultation
  const handleComplete = async (token) => {
    try {
      await appointmentApi.completeTokenConsultation(token._id);
      toast.success('Consultation completed.');
      setSelectedToken(null);
      setActiveConsultation(null);
      loadData(false);
    } catch (err) {
      toast.error('Failed to complete consultation.');
    }
  };

  const handleSkip = async (tokenId) => {
    if (!window.confirm('Skip this patient?')) return;
    try {
      await appointmentApi.skipPatient(tokenId);
      toast.success('Patient status updated to Skipped.');
      setSelectedToken(null);
      loadData(false);
    } catch (err) {
      toast.error('Failed to skip patient.');
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
      const apptId = selectedToken.appointmentId?._id || selectedToken.appointmentId;
      navigate(`/appointments/${apptId}/consultation`);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid OTP.';
      setVerificationError(errMsg);
      setOtpFailedAttempts(prev => prev + 1);
      toast.error(errMsg);
    }
  };

  const handleStartDirectly = async (appointment) => {
    if (activeConsultation) {
      toast.error('Another consultation is currently active.', { duration: 5000 });
      return;
    }
    try {
      toast.loading('Initializing consultation...');

      if (appointment.consultationMode === 'ONLINE') {
        await appointmentApi.startOnlineConsultation(appointment._id);
        toast.dismiss();
        toast.success('Online consultation initialized.');
        loadData(false);
        navigate(`/appointments/${appointment._id}/consultation`);
        return;
      }

      let token = queue.find(t => t.appointmentId?._id === appointment._id);
      if (!token) {
        const checkinRes = await appointmentApi.checkInPatient(appointment._id, { method: 'Reception' });
        token = checkinRes.data?.token || checkinRes.token;
      }

      if (!token) {
        toast.dismiss();
        toast.error('Failed to generate queue token.');
        return;
      }

      if (token.status === 'waiting' || token.status === 'called') {
        const res = await appointmentApi.startTokenConsultation(token._id);
        token = res.token || res.data?.token || token;
      }

      toast.dismiss();
      toast.success('Consultation started directly.');
      navigate(`/appointments/${appointment._id}/consultation`);
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || err.message || 'Failed to start consultation.');
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const validStates = ['booked', 'confirmed', 'checked_in', 'late_check_in', 'called', 'in_consultation', 'completed'];
    const totalToday = appointments.filter(a => validStates.includes(a.status)).length;
    const checkedIn = appointments.filter(a => ['checked_in', 'late_check_in', 'called', 'in_consultation', 'completed'].includes(a.status)).length;
    const waiting = queue.filter(t => t.status === 'waiting' || t.status === 'called').length;
    const inConsultation = queue.filter(t => t.status === 'in_consultation').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const late = appointments.filter(a => a.status === 'late_check_in').length;
    return { total: totalToday, checkedIn, waiting, inConsultation, completed, late };
  }, [appointments, queue]);

  const filteredAppointments = useMemo(() => {
    if (activeTab === 'Upcoming') {
      return appointments.filter(a => ['booked', 'confirmed'].includes(a.status));
    }
    if (activeTab === 'Checked-In') {
      return appointments.filter(a => ['checked_in', 'late_check_in', 'called', 'in_consultation'].includes(a.status));
    }
    if (activeTab === 'Completed') {
      return appointments.filter(a => a.status === 'completed');
    }
    return appointments;
  }, [appointments, activeTab]);

  const adjustDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const filteredQueue = useMemo(() => {
    return queue.filter((t) => {
      if (queueSearchQuery.trim() !== '') {
        const queryStr = queueSearchQuery.toLowerCase();
        const pName = t.appointmentId?.patientId?.fullName || '';
        const pPhone = t.appointmentId?.patientId?.phone || '';
        const pUhid = t.appointmentId?.patientId?.uhid || '';
        const tokenNum = t.tokenNumber || '';
        if (!pName.toLowerCase().includes(queryStr) &&
            !pPhone.toLowerCase().includes(queryStr) &&
            !pUhid.toLowerCase().includes(queryStr) &&
            !tokenNum.toLowerCase().includes(queryStr)) {
          return false;
        }
      }

      if (queueActiveFilter === 'Waiting') return t.status === 'waiting';
      if (queueActiveFilter === 'Walk-in') return t.appointmentId?.appointmentType === 'walk_in';
      if (queueActiveFilter === 'Follow-up') return t.appointmentId?.appointmentType === 'followup';
      if (queueActiveFilter === 'VIP') return t.priority === 'vip';
      if (queueActiveFilter === 'Emergency') return t.priority === 'emergency';
      if (queueActiveFilter === 'Late Arrivals') return t.appointmentId?.status === 'late_check_in';

      return true;
    });
  }, [queue, queueSearchQuery, queueActiveFilter]);

  const clinicHour = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
    return parseInt(formatter.format(new Date()), 10);
  }, []);

  const greeting = useMemo(() => {
    const hr = clinicHour;
    if (hr >= 4 && hr < 12) return 'Good morning';
    if (hr >= 12 && hr < 17) return 'Good afternoon';
    return 'Good evening';
  }, [clinicHour]);

  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  if (loading && !profile) {
    return <LoadingState label="Loading Premium Doctor Console..." />;
  }

  return (
    <div className="space-y-6 pb-12 bg-slate-50/50 text-slate-800 min-h-screen font-sans">
      
      {/* 1. GREETING + PROFILE CARD ROW */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            {greeting}, Dr. {profile?.fullName?.split(' ')[0] || 'Doctor'}! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Here's your clinical overview for today: <strong className="text-slate-800">{formattedDate}</strong>
          </p>
        </div>

        {/* Doctor Profile Card */}
        <Link 
          to={`/doctors/${profile?._id}/availability`} 
          className="flex items-center gap-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl p-3 transition duration-200 max-w-xs group cursor-pointer shadow-xs"
        >
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DR'
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-slate-805 leading-none group-hover:text-blue-600 transition-colors">Dr. {profile?.fullName || 'Physician'}</p>
            <span className="text-[10px] text-slate-500 font-bold block mt-1 leading-none">{profile?.specialization?.name || 'General Practitioner'}</span>
            <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Reg No. {profile?.registrationNumber || '98765'}</span>
          </div>
        </Link>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Today's Appointments */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col justify-between hover:translate-y-[-2px] transition duration-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Today's Appointments</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><CalendarIcon size={14} /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-3">{stats.total}</h3>
          <span className="text-[9px] text-slate-400 font-bold mt-1">{appointments.filter(a => ['booked', 'confirmed'].includes(a.status)).length} upcoming</span>
        </div>

        {/* Current Patient */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col justify-between hover:translate-y-[-2px] transition duration-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Current Patient</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><User size={14} /></div>
          </div>
          <h3 className="text-sm font-black text-slate-900 mt-3 truncate">
            {activeConsultation?.appointmentId?.patientId?.fullName || 'No Patient'}
          </h3>
          <span className={`inline-flex items-center w-fit text-[8px] font-black uppercase px-2 py-0.5 rounded border mt-1 ${
            activeConsultation ? 'bg-emerald-50 border-emerald-250 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-450'
          }`}>
            {activeConsultation ? 'In Progress' : 'No Consultation'}
          </span>
        </div>

        {/* Waiting Patients */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col justify-between hover:translate-y-[-2px] transition duration-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Waiting Patients</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={14} /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-3">{stats.waiting}</h3>
          <span className="text-[9px] text-slate-400 font-bold mt-1">Avg wait: 15 min</span>
        </div>

        {/* Follow-ups Due */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col justify-between hover:translate-y-[-2px] transition duration-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Follow-ups Due</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle2 size={14} /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-3">{followUps.length}</h3>
          <span className="text-[9px] text-slate-400 font-bold mt-1">Next: 11:30 AM</span>
        </div>

        {/* Unread Messages */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col justify-between hover:translate-y-[-2px] transition duration-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Unread Messages</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><MessageSquare size={14} /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-3">
            {recentMessages.filter(c => c.unreadCount > 0).length}
          </h3>
          <span className="text-[9px] text-slate-400 font-bold mt-1">New messages</span>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col justify-between hover:translate-y-[-2px] transition duration-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Critical Alerts</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle size={14} /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-3">{alerts.filter(l => l.status === 'pending').length}</h3>
          <span className="text-[9px] text-slate-400 font-bold mt-1">Action required</span>
        </div>
      </div>

      {/* 3. MAIN ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* COLUMN A: TODAY'S SCHEDULE */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800">Today's Schedule</h2>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-0.5">
                <button onClick={() => adjustDate(-1)} className="p-0.5 text-slate-400 hover:text-slate-800 transition"><ChevronLeft size={12} /></button>
                <span className="text-[9px] font-black text-slate-800">
                  {selectedDateStr === todayDateStr ? 'Today' : selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                <button onClick={() => adjustDate(1)} className="p-0.5 text-slate-400 hover:text-slate-800 transition"><ChevronRight size={12} /></button>
              </div>
            </div>

            <div className="flex gap-1 border-b border-slate-100 pb-2 text-[9px] font-black uppercase text-slate-500">
              {['All', 'Upcoming', 'Checked-In', 'Completed'].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-2 py-1 rounded-lg border transition ${
                    activeTab === t
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredAppointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No appointments booked</div>
              ) : (
                filteredAppointments.map((appt) => {
                  const matchedToken = queue.find(t => t.appointmentId?._id === appt._id);
                  const isCheckedIn = ['checked_in', 'late_check_in', 'called', 'in_consultation', 'completed'].includes(appt.status);

                  return (
                    <div
                      key={appt._id}
                      className={`p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer ${
                        selectedAppointment?._id === appt._id ? 'border-blue-500 bg-white shadow-xs' : ''
                      }`}
                      onClick={() => {
                        setSelectedAppointment(appt);
                        setSelectedToken(matchedToken || null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-left pr-3 border-r border-slate-100 min-w-[55px]">
                          <p className="text-xs font-black text-slate-800 leading-none">{appt.startTime}</p>
                          <span className="text-[8px] text-slate-400 mt-1 block">15 min</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-855 truncate max-w-[110px]">{appt.patientId?.fullName || 'Patient'}</h4>
                          <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                            <span>{appt.consultationMode === 'ONLINE' ? '📹 Online' : '🏥 Walk-In'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${
                          appt.status === 'completed' 
                            ? 'bg-slate-150 border-slate-200 text-slate-600'
                            : isCheckedIn 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {appt.status === 'completed' ? 'Completed' : isCheckedIn ? 'Checked-In' : 'Upcoming'}
                        </span>
                        <p className="text-[8px] text-slate-500 font-bold mt-1.5 leading-none">
                          Token: {appt.consultationMode === 'ONLINE' ? 'Online' : matchedToken ? matchedToken.tokenNumber : isCheckedIn ? (profile?.tokenPrefix || 'TK') + '-Pending' : 'Pending Check-In'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/appointments')}
            className="w-full mt-4 py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-extrabold text-blue-600 rounded-2xl transition text-center"
          >
            View Full Schedule →
          </button>
        </div>

        {/* COLUMN B: CURRENT PATIENT */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-black text-slate-800">Current Patient</h2>
              {selectedToken ? (
                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded border animate-pulse ${
                  selectedToken.status === 'in_consultation' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' : 'bg-purple-50 border-purple-255 text-purple-700'
                }`}>
                  {selectedToken.status?.replace('_', ' ')}
                </span>
              ) : selectedAppointment ? (
                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700">
                  {selectedAppointment.status?.toUpperCase()}
                </span>
              ) : (
                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-400">
                  No Patient
                </span>
              )}
            </div>

            {selectedToken || selectedAppointment ? (
              <div className="space-y-4">
                {/* Patient Profile Card */}
                <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-150 rounded-2xl p-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-black text-slate-600 text-sm overflow-hidden shrink-0">
                    <Avatar src={selectedToken?.appointmentId?.patientId?.avatar || selectedAppointment?.patientId?.avatar} name={selectedToken?.appointmentId?.patientId?.fullName || selectedAppointment?.patientId?.fullName} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-850">{selectedToken?.appointmentId?.patientId?.fullName || selectedAppointment?.patientId?.fullName}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-bold">
                      {selectedToken?.appointmentId?.patientId?.age || selectedAppointment?.patientId?.age || 26} Years • {selectedToken?.appointmentId?.patientId?.gender || selectedAppointment?.patientId?.gender || 'Female'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">PID: {selectedToken?.appointmentId?.patientId?.uhid || selectedAppointment?.patientId?.uhid || 'PT-2025-0425'}</p>
                  </div>
                </div>

                {/* Patient Visit Details */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5 space-y-2 text-[10px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Chief Complaint:</span>
                    <strong className="text-slate-700">{selectedToken?.appointmentId?.reasonForVisit || selectedAppointment?.reasonForVisit || 'Shortness of breath / Cough'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Visit:</span>
                    <strong className="text-slate-700">May 15, 2025</strong>
                  </div>
                </div>

                {/* Vitals */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">BP</span>
                    <strong className="text-xs font-black text-slate-800 mt-1 block">120/80</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Pulse</span>
                    <strong className="text-xs font-black text-slate-800 mt-1 block">82 bpm</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-55 bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Stethoscope size={22} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-655">No Patient in Consultation</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
                    There is currently no patient in consultation. Call the next patient from the queue to start.
                  </p>
                </div>
              </div>
            )}
          </div>

          {(selectedToken || selectedAppointment) && (
            <div className="space-y-3 pt-4 border-t border-slate-155 mt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const apptId = selectedToken?.appointmentId?._id || selectedAppointment?._id;
                    if (!apptId) return;
                    if (selectedToken && selectedToken.status !== 'in_consultation') {
                      handleStartConsultation(selectedToken);
                    } else {
                      navigate(`/appointments/${apptId}/consultation`);
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-705 text-xs font-extrabold text-white rounded-2xl transition shadow-xs"
                >
                  Continue Consultation
                </button>
                <button
                  onClick={() => navigate(`/patients/${selectedToken?.appointmentId?.patientId?._id || selectedAppointment?.patientId?._id}`)}
                  className="px-3.5 py-3 border border-slate-250 hover:bg-slate-50 text-xs font-extrabold text-slate-600 rounded-2xl transition bg-white"
                >
                  View History
                </button>
              </div>

              {selectedToken && selectedToken.status === 'in_consultation' && (
                <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 pt-1">
                  <span className="flex items-center gap-1.5"><Clock size={12} /> Duration: <strong>{consultationDurationStr}</strong></span>
                  <button
                    onClick={() => handleComplete(selectedToken)}
                    className="text-rose-600 hover:text-rose-700 font-extrabold uppercase tracking-wider text-[9px]"
                  >
                    Complete Consultation
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUMN C: CONSULTATION QUEUE */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                  {filteredQueue.length}
                </span>
                Consultation Queue
              </h2>
              <button className="text-[9px] font-black text-slate-400 hover:text-slate-850 uppercase tracking-wider flex items-center gap-1">
                Queue Rules <InfoIcon size={12} />
              </button>
            </div>

            {/* Queue Filters */}
            <div className="flex flex-wrap gap-1 pb-1">
              {['All', 'Waiting', 'Walk-in', 'Follow-up', 'VIP', 'Emergency', 'Late Arrivals'].map((filterName) => (
                <button
                  key={filterName}
                  type="button"
                  onClick={() => setQueueActiveFilter(filterName)}
                  className={`px-2 py-1 text-[9px] font-black rounded-lg border transition ${
                    queueActiveFilter === filterName
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {filterName}
                </button>
              ))}
            </div>

            {/* Queue List */}
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {filteredQueue.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-455 italic">No patients in queue</div>
              ) : (
                filteredQueue.map((token, idx) => {
                  const waitTime = Math.max(0, Math.floor((new Date().getTime() - new Date(token.generatedTime || token.createdAt).getTime()) / 60000));
                  return (
                    <div
                      key={token._id}
                      className={`p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition flex items-center justify-between ${
                        selectedToken?._id === token._id ? 'border-blue-500 bg-white shadow-xs' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-[10px] font-extrabold text-blue-705 bg-blue-50 border border-blue-150 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h5
                            className="text-xs font-black text-slate-800 hover:text-blue-600 cursor-pointer truncate"
                            onClick={() => {
                              setSelectedToken(token);
                              setSelectedAppointment(null);
                            }}
                          >
                            {token.appointmentId?.patientId?.fullName || 'Patient'}
                          </h5>
                          <p className="text-[9px] text-slate-550 mt-0.5 font-semibold">
                            {token.appointmentId?.patientId?.age || 30} Y • {token.appointmentId?.patientId?.gender || 'M'} • <span className="text-slate-400 font-medium">Token {token.tokenNumber}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400">{waitTime} min wait</span>
                        <button
                          onClick={() => {
                            setSelectedToken(token);
                            setSelectedAppointment(null);
                            if (token.status === 'called') {
                              handleStartConsultation(token);
                            } else {
                              handleCallNext();
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] uppercase rounded-xl transition"
                        >
                          {token.status === 'called' ? 'Start' : 'Call Next'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={handleCallNext}
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-750 text-xs font-extrabold text-white rounded-2xl transition text-center shadow-xs"
          >
            Call Next Patient →
          </button>
        </div>

      </div>

      {/* 4. BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Follow-ups Due */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800">Follow-ups Due</h2>
              <button onClick={() => navigate('/follow-ups')} className="text-[10px] font-bold text-blue-600 hover:underline">View All</button>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {followUps.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">No follow-ups due</div>
              ) : (
                followUps.slice(0, 3).map((f) => (
                  <div key={f._id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-800">{f.patientId?.fullName || 'Patient Name'}</strong>
                      <p className="text-[9px] text-slate-450 mt-0.5">{new Date(f.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    </div>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-rose-50 border-rose-200 text-rose-700">
                      Overdue
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Messages */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800">Recent Messages</h2>
              <button onClick={() => navigate('/chat')} className="text-[10px] font-bold text-blue-600 hover:underline">View All</button>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {recentMessages.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-450 italic">No recent messages</div>
              ) : (
                recentMessages.slice(0, 3).map((msg) => (
                  <div 
                    key={msg._id} 
                    onClick={() => navigate('/chat')}
                    className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-55 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <Avatar src={msg.participants?.[0]?.avatar} name={msg.participants?.[0]?.name || 'Chat'} />
                      </div>
                      <div className="min-w-0">
                        <strong className="text-slate-805 text-xs truncate block">{msg.participants?.[0]?.name || 'Chat User'}</strong>
                        <p className="text-[9px] text-slate-450 truncate block mt-0.5">{msg.lastMessage?.content || 'Click to view chat...'}</p>
                      </div>
                    </div>
                    {msg.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4 bg-white border border-slate-155 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  const overlayWalkinButton = document.querySelector('[data-walkin-trigger]');
                  if (overlayWalkinButton) {
                    overlayWalkinButton.click();
                  } else {
                    navigate('/appointments');
                  }
                }}
                className="py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-700 text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add Walk-In</span>
              </button>

              <button
                onClick={() => {
                  const apptId = prompt('Enter appointment ID to prioritize:');
                  if (apptId) appointmentApi.checkInPatient(apptId, { method: 'Reception', isEmergency: true }).then(() => loadData(false));
                }}
                className="py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1.5 animate-pulse"
              >
                <AlertOctagon size={15} />
                <span>Emergency</span>
              </button>

              <button
                onClick={() => loadData(true)}
                className="py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-655 text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1.5"
              >
                <RefreshCw size={15} />
                <span>Refresh Queue</span>
              </button>

              <button
                onClick={() => window.print()}
                className="py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-655 text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1.5"
              >
                <Printer size={15} />
                <span>Print Queue</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Hidden button to hook into AppShell/Layout's Walk-in Modal trigger */}
      <button 
        data-walkin-trigger 
        className="hidden" 
        onClick={() => {
          const modalBackdrop = document.querySelector('aside');
          if (modalBackdrop) {
            const btn = document.querySelector('button[onClick*="setWalkInModalOpen"]');
            if (btn) btn.click();
          }
        }}
      />

      {/* Waiver Modal */}
      {showWaiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-slate-800">
            <h3 className="text-base font-bold text-slate-900 mb-2">Apply Consultation Fee Waiver</h3>
            <p className="text-xs text-slate-500 mb-4">Select the waiver type, amount (for partial waiver), and reason.</p>

            <form onSubmit={handleWaiverSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">Waiver Type</label>
                <select
                  value={waiverForm.waiverType}
                  onChange={(e) => setWaiverForm({ ...waiverForm, waiverType: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                >
                  <option value="none">No Waiver (Charge Full Fee)</option>
                  <option value="full">Full Waiver (100% discount)</option>
                  <option value="partial">Partial Waiver (Discount amount)</option>
                </select>
              </div>

              {waiverForm.waiverType === 'partial' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Waiver Amount (₹)</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedToken?.appointmentId?.consultationFee || 500}
                    value={waiverForm.waiverAmount}
                    onChange={(e) => setWaiverForm({ ...waiverForm, waiverAmount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Reason for Waiver</label>
                <textarea
                  value={waiverForm.waiverReason}
                  onChange={(e) => setWaiverForm({ ...waiverForm, waiverReason: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 h-20 resize-none"
                  placeholder="e.g. follow-up waiver"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWaiverModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
                >
                  Save Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboardPage;
