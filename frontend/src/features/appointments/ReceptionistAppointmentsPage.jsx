import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Calendar, Clock, CheckCircle, Info, Copy, Check, Upload,
  SlidersHorizontal, ChevronRight, X, AlertCircle, Sparkles, QrCode
} from 'lucide-react';
import { Link } from 'react-router-dom';
import appointmentApi from '../../api/appointmentApi';
import doctorApi from '../../api/doctorApi';
import Avatar from '../../components/ui/Avatar';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

export default function ReceptionistAppointmentsPage() {
  const [selectedSubTab, setSelectedSubTab] = useState('offline'); // all, offline, todays, upcoming, completed
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Date selection (default to today)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [selectedAppt, setSelectedAppt] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedApptId, setCopiedApptId] = useState(false);
  const [verifyTab, setVerifyTab] = useState('scan'); // scan, upload
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [verifiedOtp, setVerifiedOtp] = useState('');

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [apptsData, docsData] = await Promise.all([
        appointmentApi.list({ limit: 100 }),
        doctorApi.list({ limit: 50 })
      ]);
      setAppointments(apptsData?.appointments || []);
      setDoctors(docsData?.doctors || docsData?.data?.doctors || []);
      
      // Auto-select first pending offline appointment on load if available
      const offlineAppts = (apptsData?.appointments || []).filter(
        a => a.appointmentType === 'in_clinic' || a.appointmentType?.toLowerCase()?.includes('offline')
      );
      if (offlineAppts.length > 0) {
        setSelectedAppt(offlineAppts[0]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format date helper for stats and display
  const dateFormatted = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [selectedDate]);

  // Statistics calculation for offline appointments on selectedDate
  const stats = useMemo(() => {
    const offlineToday = appointments.filter(a => {
      const isOffline = a.appointmentType === 'in_clinic' || a.appointmentType?.toLowerCase()?.includes('offline');
      const matchesDate = a.appointmentDate && a.appointmentDate.split('T')[0] === selectedDate;
      return isOffline && matchesDate;
    });

    const total = offlineToday.length;
    const checkedIn = offlineToday.filter(a => ['checked_in', 'in_consultation', 'completed'].includes(a.status?.toLowerCase())).length;
    const pending = offlineToday.filter(a => ['scheduled', 'booked', 'confirmed', 'pending'].includes(a.status?.toLowerCase())).length;
    const missed = offlineToday.filter(a => a.status?.toLowerCase() === 'no_show').length;

    return { total, checkedIn, pending, missed };
  }, [appointments, selectedDate]);

  // Filtered appointments list
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      // 1. Filter by search query
      const patientName = a.patientId?.fullName || '';
      const doctorName = a.doctorId?.fullName || '';
      const apptId = a.appointmentId || '';
      const matchesSearch = !searchQuery || 
        patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apptId.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // 2. Filter by submenu tabs
      const isOffline = a.appointmentType === 'in_clinic' || a.appointmentType?.toLowerCase()?.includes('offline');
      const isToday = a.appointmentDate && a.appointmentDate.split('T')[0] === selectedDate;
      const status = a.status?.toLowerCase();

      if (selectedSubTab === 'offline') {
        return isOffline && isToday;
      }
      if (selectedSubTab === 'todays') {
        return isToday;
      }
      if (selectedSubTab === 'upcoming') {
        const today = new Date();
        today.setHours(0,0,0,0);
        return new Date(a.appointmentDate) > today && status !== 'cancelled' && status !== 'completed';
      }
      if (selectedSubTab === 'completed') {
        return status === 'completed';
      }
      
      return true; // 'all' tab
    });
  }, [appointments, selectedSubTab, selectedDate, searchQuery]);

  // Helper to format Time (e.g., "09:30 AM")
  const formatTime = (timeStr) => {
    if (!timeStr) return 'TBD';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${String(displayHour).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Copy Appointment ID helper
  const copyApptId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedApptId(true);
    setTimeout(() => setCopiedApptId(false), 2000);
  };

  // Check-In QR scanner/upload handler
  const handleVerifyCheckIn = async () => {
    if (!selectedAppt) return;
    setIsVerifying(true);
    try {
      // Simulate verification delay
      await new Promise(r => setTimeout(r, 1200));

      // Call API to check-in on backend
      await appointmentApi.updateStatus(selectedAppt._id, { status: 'checked_in' });

      // Generate random Token & OTP
      const tknNum = `TKN-${Math.floor(100 + Math.random() * 900)}`;
      const otpNum = Math.floor(100000 + Math.random() * 900000).toString();
      
      setVerifiedToken(tknNum);
      setVerifiedOtp(otpNum);
      setVerificationSuccess(true);
      
      // Update local state list
      setAppointments(prev => prev.map(a => 
        a._id === selectedAppt._id ? { ...a, status: 'checked_in' } : a
      ));
      
      // Update selected appointment status locally
      setSelectedAppt(prev => ({ ...prev, status: 'checked_in' }));
    } catch (err) {
      alert(err?.response?.data?.message || 'Verification failed. Try manual verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetVerification = () => {
    setVerificationSuccess(false);
    setVerifiedToken('');
    setVerifiedOtp('');
  };

  // Handle selected appointment change
  const handleSelectAppointment = (appt) => {
    setSelectedAppt(appt);
    handleResetVerification();
  };

  if (loading) return <LoadingState label="Loading Receptionist Dashboard..." />;
  if (error) return <ErrorState title="Dashboard Error" description={error} />;

  return (
    <div className="flex gap-6 min-h-screen bg-[#080f1a] text-slate-100 rounded-3xl overflow-hidden border border-white/[0.05]">
      
      {/* 1. Sub-menu Navigation sidebar (Appointments Submenu) */}
      <div className="w-[220px] bg-[#0c1322] p-4 flex flex-col gap-6 shrink-0 border-r border-white/[0.04]">
        <div>
          <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Appointments</h3>
          <nav className="space-y-1">
            {[
              { id: 'all', label: 'All Appointments' },
              { id: 'offline', label: 'Offline Appointments' },
              { id: 'todays', label: 'Today\'s Appointments' },
              { id: 'upcoming', label: 'Upcoming Appointments' },
              { id: 'completed', label: 'Completed Appointments' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedSubTab(tab.id);
                  handleResetVerification();
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${selectedSubTab === tab.id ? 'bg-white/[0.05] text-emerald-400 border border-white/[0.05]' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <span>{tab.label}</span>
                {selectedSubTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/[0.05] pt-4">
          <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Operational</h3>
          <Link
            to="/appointments"
            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition flex items-center gap-2"
          >
            <Calendar size={14} />
            <span>Interactive Calendar</span>
          </Link>
        </div>
      </div>

      {/* 2. Main List & Analytics Column */}
      <div className="flex-1 p-6 flex flex-col gap-6 min-w-0">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.05] pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              {selectedSubTab === 'offline' ? 'Offline Appointments' : `${selectedSubTab.charAt(0).toUpperCase() + selectedSubTab.slice(1)} Appointments`}
              <Info size={14} className="text-slate-400 cursor-pointer hover:text-white" title="Scheduled offline check-in lists." />
            </h1>
            <p className="text-xs text-slate-450 mt-1">Manage scheduled check-in and patient token queue.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patient, doc..."
                className="w-48 bg-white/[0.03] border border-white/[0.08] rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date Select (only relevant for offline/todays/all) */}
            {['offline', 'todays', 'all'].includes(selectedSubTab) && (
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards Row */}
        {selectedSubTab === 'offline' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Offline Appointments', value: stats.total, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
              { label: 'Checked In', value: stats.checkedIn, color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
              { label: 'Pending', value: stats.pending, color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
              { label: 'Missed', value: stats.missed, color: 'bg-rose-500/10 border-rose-500/20 text-rose-400' }
            ].map(card => (
              <div key={card.label} className={`p-4 rounded-2xl border ${card.color} flex flex-col justify-between h-24`}>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 leading-tight">{card.label}</span>
                <span className="text-2xl font-black mt-2">{card.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Appointment Table */}
        <div className="bg-[#0c1322] border border-white/[0.04] rounded-2xl overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04] bg-white/[0.01] text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">Time</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Doctor</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs font-semibold text-slate-350">
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map(appt => {
                    const isSelected = selectedAppt?._id === appt._id;
                    const patName = appt.patientId?.fullName || 'Walk-in Patient';
                    const patDetail = `${appt.patientId?.age || '--'} Y/O ${appt.patientId?.gender || ''}`;
                    const docName = appt.doctorId?.fullName || 'General Physician';
                    const docDetail = appt.doctorId?.specialization || 'Physician';
                    const statusVal = appt.status?.toLowerCase();
                    const appointmentType = appt.appointmentType || 'in_clinic';

                    return (
                      <tr 
                        key={appt._id} 
                        onClick={() => handleSelectAppointment(appt)}
                        className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${isSelected ? 'bg-emerald-500/[0.03] border-l-2 border-emerald-500' : ''}`}
                      >
                        <td className="p-4 text-white font-extrabold">{formatTime(appt.startTime)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={patName} size="sm" className="shrink-0" />
                            <div>
                              <p className="font-bold text-white leading-tight">{patName}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{patDetail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-white leading-tight">Dr. {docName}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{docDetail}</p>
                          </div>
                        </td>
                        <td className="p-4 text-slate-400">{appt.reasonForVisit || 'General Checkup'}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${
                            statusVal === 'completed' 
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : statusVal === 'checked_in'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : statusVal === 'cancelled'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : statusVal === 'no_show'
                                    ? 'bg-slate-700/20 text-slate-400 border-slate-700/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {appt.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition text-slate-400 hover:text-white mx-auto">
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-500 font-medium">
                      No appointments found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Right Details & Patient Verification Drawer */}
      {selectedAppt && (
        <div className="w-[380px] bg-[#0c1322] border-l border-white/[0.04] shrink-0 flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Appointment Details</h2>
            <button 
              onClick={() => setSelectedAppt(null)} 
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Patient overview card */}
            <div className="flex items-start gap-4">
              <Avatar name={selectedAppt.patientId?.fullName || 'Walk-in'} size="xl" className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white truncate">{selectedAppt.patientId?.fullName || 'Walk-in Patient'}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${
                    selectedAppt.status === 'checked_in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {selectedAppt.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {[selectedAppt.patientId?.age ? `${selectedAppt.patientId.age} Y/O` : '', selectedAppt.patientId?.gender].filter(Boolean).join(' • ') || 'N/A'}
                  {selectedAppt.patientId?.patientId && ` • ${selectedAppt.patientId.patientId}`}
                </p>
                {selectedAppt.patientId?.phone && (
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-mono">
                    📞 {selectedAppt.patientId.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Metadata */}
            <div className="grid grid-cols-2 gap-4 border-t border-b border-white/[0.04] py-4.5">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Appointment ID</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {selectedAppt.appointmentId || selectedAppt._id?.slice(-8).toUpperCase()}
                  </span>
                  <button 
                    onClick={() => copyApptId(selectedAppt.appointmentId || selectedAppt._id)}
                    className="text-slate-500 hover:text-white p-0.5 transition"
                  >
                    {copiedApptId ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date & Time</p>
                <p className="text-xs font-bold text-slate-300 mt-1">
                  {new Date(selectedAppt.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {formatTime(selectedAppt.startTime)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Doctor</p>
                <p className="text-xs font-bold text-slate-350 mt-1">Dr. {selectedAppt.doctorId?.fullName || 'Doctor'}</p>
                <p className="text-[10px] text-slate-500">{selectedAppt.doctorId?.specialization || 'Physician'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Consultation Mode</p>
                <p className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                  <Clock size={11} /> {selectedAppt.appointmentType === 'teleconsultation' ? 'Online (Video)' : 'Offline (In-Clinic)'}
                </p>
              </div>
            </div>

            {/* Verify Patient Section */}
            <div className="border border-white/[0.06] rounded-2xl bg-white/[0.01] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/[0.04]">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <QrCode size={14} className="text-emerald-400" />
                  Verify Patient
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">Scan the QR code provided by the patient to check-in.</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/[0.04] bg-white/[0.01]">
                <button 
                  onClick={() => setVerifyTab('scan')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${verifyTab === 'scan' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/[0.02]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                  Scan QR Code
                </button>
                <button 
                  onClick={() => setVerifyTab('upload')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${verifyTab === 'upload' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/[0.02]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                  Upload Image
                </button>
              </div>

              {/* Content Panel */}
              <div className="p-5 flex flex-col items-center justify-center min-h-[220px]">
                {verificationSuccess ? (
                  // Success State
                  <div className="w-full text-center space-y-4 animate-fade-in">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider">Patient Verified Successfully</h5>
                      <p className="text-[10px] text-slate-500 mt-1">Checked in and queue token allocated.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">Token Number</p>
                        <p className="text-sm font-mono font-black text-emerald-400 mt-1">{verifiedToken}</p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">OTP Code</p>
                        <p className="text-sm font-mono font-black text-emerald-400 mt-1">{verifiedOtp}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleResetVerification}
                      className="text-[10px] font-bold text-slate-400 hover:text-white hover:underline transition"
                    >
                      Scan Another Patient
                    </button>
                  </div>
                ) : (
                  // Scanning or Upload panel
                  verifyTab === 'scan' ? (
                    <div className="w-full flex flex-col items-center space-y-4">
                      {/* Scanning Camera Mock */}
                      <div className="relative w-44 h-44 border border-white/10 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center group">
                        {/* Scanning lasers */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500 animate-scan shadow-glow-teal z-10" />
                        
                        {/* Dummy QR image inside scanner view */}
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${selectedAppt.appointmentId || selectedAppt._id}`}
                          alt="Verification QR Code"
                          className="w-28 h-28 opacity-80"
                        />
                        <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                      </div>

                      <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                        Align the patient's QR code within the frame to scan.
                      </p>

                      <button 
                        onClick={handleVerifyCheckIn}
                        disabled={isVerifying}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-505 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        {isVerifying ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <QrCode size={13} />
                            Trigger Mock Camera Scan
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center space-y-4">
                      <div className="w-full h-32 border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl flex flex-col items-center justify-center text-center p-4 cursor-pointer hover:bg-white/[0.01] transition">
                        <Upload size={22} className="text-slate-500 mb-2" />
                        <span className="text-[10px] font-bold text-slate-300">Upload QR Code Image</span>
                        <span className="text-[8px] text-slate-500 mt-1">PNG, JPG, JPEG up to 5MB</span>
                      </div>

                      <button 
                        onClick={handleVerifyCheckIn}
                        disabled={isVerifying}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-505 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        {isVerifying ? 'Verifying...' : 'Upload & Verify'}
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Manual Verification Link */}
            {!verificationSuccess && (
              <div className="text-center pt-2">
                <button 
                  onClick={handleVerifyCheckIn}
                  className="text-[10px] font-bold text-slate-400 hover:text-emerald-400 hover:underline transition"
                >
                  Having trouble scanning? Try manual verification
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
