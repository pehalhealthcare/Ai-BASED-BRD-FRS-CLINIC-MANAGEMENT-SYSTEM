import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Calendar, Clock, Filter, Eye, Printer, FileText, ChevronLeft, ChevronRight,
  Search, ArrowLeft, MoreHorizontal, ArrowRight, Activity, CheckCircle,
  Clock as ClockIcon, XCircle, User, Sparkles, AlertCircle, ShoppingBag, Plus, BookOpen
} from 'lucide-react';

import appointmentApi from '../../api/appointmentApi';
import consultationApi from '../../api/consultationApi';
import patientApi from '../../api/patientApi';
import prescriptionApi from '../../api/prescriptionApi';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import LegacyConsultationPage from '../../features/consultations/ConsultationPage';
import useAuth from '../../hooks/useAuth';

const getToday = () => new Date().toISOString().slice(0, 10);

const ConsultationPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const consultationId = params.consultationId || searchParams.get('consultationId');
  const appointmentId = params.appointmentId || searchParams.get('appointmentId');

  // Dashboard states
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allConsultations, setAllConsultations] = useState([]);
  const [loading, setLoading] = useState(!consultationId && !appointmentId);
  const [error, setError] = useState('');

  // Filtering and Controls
  const [upcomingDate, setUpcomingDate] = useState(getToday());
  const [upcomingStatus, setUpcomingStatus] = useState('All');
  const [completedStartDate, setCompletedStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [completedEndDate, setCompletedEndDate] = useState(getToday());
  const [searchQuery, setSearchQuery] = useState('');
  const [upcomingSearchQuery, setUpcomingSearchQuery] = useState('');
  const [completedSearchQuery, setCompletedSearchQuery] = useState('');

  // Detail/Workspace states
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('overview');
  const [patientHistory, setPatientHistory] = useState([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isEditingCompletedConsultation, setIsEditingCompletedConsultation] = useState(false);
  const [activeSummaryTab, setActiveSummaryTab] = useState('summary');

  // Pagination
  const [completedPage, setCompletedPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch initial dashboard data
  useEffect(() => {
    if (consultationId || appointmentId) {
      return;
    }

    let isMounted = true;
    const loadLaunchpad = async () => {
      setLoading(true);
      setError('');
      try {
        const [appointmentData, consultationData] = await Promise.all([
          appointmentApi.list({ limit: 100 }),
          consultationApi.list({ limit: 100 })
        ]);

        if (!isMounted) return;

        const appts = appointmentData.appointments || [];
        const consults = consultationData.consultations || [];

        setAllAppointments(appts);
        setAllConsultations(consults);

        setAppointments(appts.filter(a => a.status !== 'completed' && a.status !== 'cancelled'));
        setConsultations(consults.filter(c => c.status === 'completed'));
      } catch (requestError) {
        if (isMounted) {
          setError(requestError?.response?.data?.message || 'Unable to load consultation workspace.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLaunchpad();
    return () => { isMounted = false; };
  }, [consultationId, appointmentId]);

  // Load Completed Consultation Workspace Details
  useEffect(() => {
    if (!consultationId && !appointmentId) {
      setSelectedConsultation(null);
      return;
    }

    const loadWorkspace = async () => {
      setWorkspaceLoading(true);
      try {
        let res = null;
        if (consultationId) {
          res = await consultationApi.getById(consultationId);
        } else if (appointmentId) {
          try {
            res = await consultationApi.getByAppointment(appointmentId);
          } catch (e) {
            console.warn('No consultation found for this appointment yet.', e);
          }
        }

        if (res?.consultation) {
          setSelectedConsultation(res);
          const pId = res.consultation.patientId?._id || res.consultation.patientId;
          if (pId) {
            try {
              const hist = await consultationApi.historyByPatient(pId);
              setPatientHistory(hist?.consultations || hist?.data?.consultations || []);
            } catch (e) { console.error('History failed', e); }
            try {
              const pres = await prescriptionApi.getByPatient(pId);
              setPatientPrescriptions(pres?.prescriptions || pres?.data?.prescriptions || []);
            } catch (e) { console.error('Prescriptions failed', e); }
          }
        }
      } catch (err) {
        console.error('Failed to load consultation details', err);
      } finally {
        setWorkspaceLoading(false);
      }
    };

    loadWorkspace();
  }, [consultationId, appointmentId, reloadTrigger]);

  // Show spinner while loading workspace
  if ((consultationId || appointmentId) && workspaceLoading) {
    return <LoadingState label="Loading consultation details..." />;
  }

  // If editing a completed consultation, show the EMR form in edit mode
  if (isEditingCompletedConsultation && selectedConsultation?.consultation?._id) {
    return (
      <LegacyConsultationPage
        editMode={true}
        onCancelEdit={() => setIsEditingCompletedConsultation(false)}
        onCompleteEdit={() => {
          setIsEditingCompletedConsultation(false);
          setReloadTrigger(t => t + 1);
        }}
      />
    );
  }

  // If appointmentId provided but consultation is NOT completed yet (or not found), open the EMR directly
  const isCompleted = selectedConsultation?.consultation?.status === 'completed';
  if (appointmentId && !isCompleted) {
    return <LegacyConsultationPage />;
  }

  // If consultationId loaded but consultation is NOT completed, open EMR directly
  if (consultationId && selectedConsultation && !isCompleted) {
    return <LegacyConsultationPage />;
  }

  // Dashboard loading
  if (loading) {
    return <LoadingState label="Loading consultation workspace..." />;
  }


  if (error) {
    return <ErrorState title="Consultation workspace unavailable" description={error} />;
  }

  // Calculate Stat Metrics
  const today = getToday();
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6); // Sunday

  const upcomingTodayCount = allAppointments.filter(a =>
    a.date?.slice(0, 10) === today &&
    a.status !== 'completed' &&
    a.status !== 'cancelled'
  ).length;

  const nextAppt = allAppointments
    .filter(a => a.date?.slice(0, 10) === today && a.status !== 'completed' && a.status !== 'cancelled')
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))[0];

  const upcomingThisWeekCount = allAppointments.filter(a => {
    const d = new Date(a.date);
    return d >= startOfWeek && d <= endOfWeek && a.status !== 'completed' && a.status !== 'cancelled';
  }).length;

  const completedThisWeekCount = allConsultations.filter(c => {
    const d = new Date(c.completedAt || c.updatedAt);
    return d >= startOfWeek && d <= endOfWeek && c.status === 'completed';
  }).length;

  const totalCompletedCount = allConsultations.filter(c => c.status === 'completed').length;
  const cancelledCount = allAppointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;

  // Filter lists
  const filteredUpcoming = appointments.filter(a => {
    const matchesDate = a.date ? a.date.slice(0, 10) === upcomingDate : true;
    const matchesStatus = upcomingStatus === 'All' ? true : a.status?.toLowerCase() === upcomingStatus.toLowerCase();
    const matchesSearch = upcomingSearchQuery ? (
      a.patientId?.fullName?.toLowerCase().includes(upcomingSearchQuery.toLowerCase()) ||
      a.patientId?.patientId?.toLowerCase().includes(upcomingSearchQuery.toLowerCase())
    ) : true;
    return matchesDate && matchesStatus && matchesSearch;
  });

  const filteredCompleted = consultations.filter(c => {
    const date = c.completedAt || c.updatedAt || c.date;
    const matchesRange = date ? (date.slice(0, 10) >= completedStartDate && date.slice(0, 10) <= completedEndDate) : true;
    const matchesSearch = completedSearchQuery ? (
      c.patientId?.fullName?.toLowerCase().includes(completedSearchQuery.toLowerCase()) ||
      c.patientId?.patientId?.toLowerCase().includes(completedSearchQuery.toLowerCase()) ||
      c.diagnosis?.primary?.toLowerCase().includes(completedSearchQuery.toLowerCase())
    ) : true;
    return matchesRange && matchesSearch;
  });

  // Pagination completed
  const totalCompletedResults = filteredCompleted.length;
  const paginatedCompleted = filteredCompleted.slice(
    (completedPage - 1) * rowsPerPage,
    completedPage * rowsPerPage
  );
  const totalPages = Math.ceil(totalCompletedResults / rowsPerPage) || 1;

  // Render Consultation Details - Premium Dashboard (screenshot 2 design)
  if ((consultationId || appointmentId) && selectedConsultation) {
    const consult = selectedConsultation.consultation;
    const patientObj = selectedConsultation.patient || consult.patientId || {};
    const doctorObj = selectedConsultation.doctor || consult.doctorId || {};
    const appointmentObj = selectedConsultation.appointment || consult.appointmentId || {};

    const age = patientObj?.age || 'N/A';
    const gender = patientObj?.gender || 'N/A';
    const patientIdStr = patientObj?.patientId || 'N/A';
    const phone = patientObj?.phone || 'N/A';
    const bloodGroup = patientObj?.bloodGroup || 'N/A';
    const dob = patientObj?.dob || patientObj?.dateOfBirth || null;
    const allergies = patientObj?.allergies || 'No known drug allergies';
    const chiefComplaint = consult.chiefComplaint || 'No chief complaint recorded.';
    const clinicalNotes = consult.clinicalNotes || '';
    const pastMedicalHistory = consult.pastMedicalHistory || [];
    const systemicExam = consult.systemicExamination || [];
    const primaryDiag = consult.diagnosis?.primary || 'N/A';
    const secondaryDiag = consult.diagnosis?.secondary || [];
    const clinicalImpression = consult.diagnosis?.notes || '';
    const icdCode = consult.diagnosis?.icdCode || '';
    const severity = consult.diagnosis?.severity || '';
    const currentMedications = selectedConsultation.prescription?.medicines || [];
    const labTests = selectedConsultation.prescription?.labs || [];
    const procedures = selectedConsultation.prescription?.procedures || [];
    const advice = selectedConsultation.prescription?.advice || '';
    const followUp = consult.followUp || {};
    const vitals = consult.vitals || {};

    const visitDateObj = consult.createdAt ? new Date(consult.createdAt) : null;
    const visitDateStr = visitDateObj
      ? visitDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';
    const visitTimeStr = visitDateObj
      ? visitDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '';
    const completedAtObj = consult.completedAt ? new Date(consult.completedAt) : visitDateObj;
    const completedStr = completedAtObj
      ? completedAtObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
        completedAtObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : 'N/A';

    const calculateBMI = () => {
      if (vitals.weight && vitals.height) {
        const hm = parseFloat(vitals.height) / 100;
        return (parseFloat(vitals.weight) / (hm * hm)).toFixed(1);
      }
      return 'N/A';
    };

    const handlePrint = async () => {
      try {
        const res = await consultationApi.downloadPdf(consult._id);
        const blob = new Blob([res], { type: 'application/pdf' });
        window.open(window.URL.createObjectURL(blob), '_blank');
      } catch (err) { console.error(err); }
    };

    const handleDownload = async () => {
      try {
        const res = await consultationApi.downloadPdf(consult._id);
        const blob = new Blob([res], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `consultation_${consult._id}.pdf`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); window.URL.revokeObjectURL(url);
      } catch (err) { console.error(err); }
    };

    const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Consultation link copied!');
    };

    // Tracking timeline steps with dates
    const trackingSteps = [
      {
        label: 'Appointment Booked',
        date: appointmentObj?.createdAt ? new Date(appointmentObj.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : visitDateStr,
        time: appointmentObj?.createdAt ? new Date(appointmentObj.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
        icon: '📅', done: true
      },
      {
        label: 'Checked In',
        date: visitDateStr, time: visitTimeStr,
        icon: '✅', done: true
      },
      {
        label: 'In Consultation',
        date: visitDateStr, time: visitTimeStr,
        icon: '👨‍⚕️', done: true
      },
      {
        label: 'Consultation Completed',
        date: completedAtObj ? completedAtObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : visitDateStr,
        time: completedAtObj ? completedAtObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
        icon: '🏁', done: true, active: true
      },
      {
        label: 'Follow-up Pending',
        date: followUp.date ? new Date(followUp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        time: '',
        icon: '🔄', done: !!followUp.required
      }
    ];

    // Vitals data
    const vitalsList = [
      { label: 'Temperature', val: vitals.temperature ? `${vitals.temperature} °F` : '98.6 °F', icon: '🌡️', color: 'text-amber-600' },
      { label: 'Pulse Rate', val: vitals.pulse ? `${vitals.pulse} /min` : '78 /min', icon: '💓', color: 'text-rose-600' },
      { label: 'Blood Pressure', val: vitals.bloodPressure || '120/80', unit: 'mmHg', icon: '💊', color: 'text-indigo-600' },
      { label: 'Respiratory Rate', val: vitals.respiratoryRate ? `${vitals.respiratoryRate} /min` : '18 /min', icon: '🫁', color: 'text-blue-600' },
      { label: 'SpO₂', val: (vitals.oxygenSaturation || vitals.spo2) ? `${vitals.oxygenSaturation || vitals.spo2} %` : '98 %', icon: '💨', color: 'text-teal-600' },
      { label: 'Weight', val: vitals.weight ? `${vitals.weight} kg` : '65 kg', icon: '⚖️', color: 'text-orange-600' },
      { label: 'Height', val: vitals.height ? `${vitals.height} cm` : '175 cm', icon: '📏', color: 'text-yellow-600' },
      { label: 'BMI', val: calculateBMI(), unit: 'kg/m²', icon: '📊', color: 'text-emerald-600' },
      { label: 'Pain Score', val: `${vitals.painScore || '0'} /10`, icon: '😣', color: 'text-red-600' },
    ];

    // Re-visit history from patientHistory
    const recentHistory = patientHistory.filter(h => h._id !== consult._id).slice(0, 3);

    return (
      <div className="min-h-screen bg-[#f4f6fb] text-slate-800 font-sans">

        {/* ── TOP HEADER BAR ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div>
            <nav className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-indigo-600 font-semibold cursor-pointer hover:underline" onClick={() => { navigate('/consultations'); setSelectedConsultation(null); }}>Consultations</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-600 font-semibold">Consultation Details</span>
            </nav>
            <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">Consultation Details</h1>
            <p className="text-xs text-slate-500 mt-0.5">View full consultation record and track appointment status</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Share
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => { navigate('/appointments'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Appointments
            </button>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto p-6 space-y-5">

          {/* ── STATUS INFO ROW ── */}
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm grid grid-cols-2 md:grid-cols-6 gap-4">
            {/* Status */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Appointment Status</span>
              <div className="flex items-start gap-2 flex-col mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-black">✓</span>
                  <span className="text-base font-extrabold text-emerald-600">Completed</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Consultation completed successfully</span>
                {consult.editCompleted && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">✓ Edited</span>
                )}
              </div>
            </div>
            {/* Consultation ID */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Consultation ID</span>
              <span className="text-sm font-extrabold text-indigo-600 font-mono mt-1">CON-{new Date().getFullYear()}-{visitDateObj ? `${(visitDateObj.getMonth()+1).toString().padStart(2,'0')}${visitDateObj.getDate().toString().padStart(2,'0')}` : '0716'}-{consult._id.substring(0, 4).toUpperCase()}</span>
            </div>
            {/* Appointment ID */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Appointment ID</span>
              <span className="text-sm font-extrabold text-slate-700 font-mono mt-1">
                APT-{appointmentObj?.appointmentCode || appointmentObj?._id?.substring(0, 12).toUpperCase() || 'N/A'}
              </span>
            </div>
            {/* Visit Date */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Visit Date & Time</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-sm font-extrabold text-slate-800">{visitDateStr}{visitTimeStr ? `, ${visitTimeStr}` : ''}</span>
              </div>
            </div>
            {/* Duration */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Duration</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-sm font-extrabold text-slate-800">22 mins</span>
              </div>
            </div>
            {/* Type */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Consultation Type</span>
              <span className="mt-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full font-bold inline-block self-start capitalize">
                {appointmentObj?.consultationType || appointmentObj?.appointmentType || 'In-Clinic'}
              </span>
            </div>
          </div>

          {/* ── APPOINTMENT TRACKING TIMELINE ── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" /> Appointment Tracking
            </h2>
            <div className="flex items-stretch justify-between gap-0 overflow-x-auto">
              {trackingSteps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 relative min-w-[120px]">
                  {/* Connector line */}
                  {idx < trackingSteps.length - 1 && (
                    <div className={`absolute top-6 left-[calc(50%+20px)] right-0 h-0.5 ${step.done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                  {/* Icon circle */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl z-10 border-2 ${
                    step.active
                      ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200'
                      : step.done
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'bg-slate-50 border-slate-200'
                  }`}>
                    {step.icon}
                  </div>
                  {/* Label & date */}
                  <div className="text-center mt-2 px-1">
                    <p className={`text-[11px] font-extrabold ${step.active ? 'text-indigo-600' : step.done ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{step.date}</p>
                    {step.time && <p className="text-[10px] text-slate-400">{step.time}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── MAIN CONTENT + RIGHT SIDEBAR ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

            {/* ── LEFT: Tabs + Content ── */}
            <div className="space-y-4">

              {/* Tab Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex gap-1 p-2 border-b border-slate-100 overflow-x-auto">
                  {[
                    { id: 'summary', label: 'Consultation Summary' },
                    { id: 'prescription', label: `Prescription (${currentMedications.length})` },
                    { id: 'labs', label: `Lab Tests (${labTests.length})` },
                    { id: 'procedures', label: `Procedures (${procedures.length})` },
                    { id: 'history', label: 'History' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSummaryTab(tab.id)}
                      className={`px-4 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition ${
                        activeSummaryTab === tab.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >{tab.label}</button>
                  ))}
                </div>

                {/* ── Tab Content ── */}
                <div className="p-6">

                  {/* SUMMARY TAB */}
                  {activeSummaryTab === 'summary' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
                      {/* Left column — clinical info */}
                      <div className="space-y-5">
                        {/* Chief Complaint */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-5 bg-blue-50 rounded-lg flex items-center justify-center text-xs">📋</span>
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Chief Complaint</h3>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">{chiefComplaint}</p>
                        </div>

                        {/* HPI */}
                        {clinicalNotes && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-5 h-5 bg-violet-50 rounded-lg flex items-center justify-center text-xs">💬</span>
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">History of Present Illness</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 whitespace-pre-line">{clinicalNotes}</p>
                          </div>
                        )}

                        {/* Past Medical History */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-5 bg-amber-50 rounded-lg flex items-center justify-center text-xs">🏥</span>
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Past Medical History</h3>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {pastMedicalHistory.length > 0
                              ? pastMedicalHistory.map((item, i) => (
                                  <span key={i} className="text-[11px] bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-semibold">{item}</span>
                                ))
                              : <span className="text-xs text-slate-400 italic">No significant past history.</span>
                            }
                          </div>
                        </div>

                        {/* Allergies */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-5 bg-red-50 rounded-lg flex items-center justify-center text-xs">⚠️</span>
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Allergies</h3>
                          </div>
                          <span className="text-[11px] bg-red-50 text-red-700 border border-red-100 px-3 py-1.5 rounded-xl font-semibold inline-block">{allergies}</span>
                        </div>

                        {/* Systemic Examination */}
                        {systemicExam.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-5 h-5 bg-teal-50 rounded-lg flex items-center justify-center text-xs">🔍</span>
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Examination Findings (Key)</h3>
                            </div>
                            <div className="space-y-2">
                              {systemicExam.map((ex, i) => (
                                <div key={i} className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-slate-100 last:border-0 text-sm">
                                  <span className="font-bold text-slate-700">{ex.sys}</span>
                                  <span className="text-slate-500">{ex.status}{ex.note ? ` — ${ex.note}` : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Diagnosis */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center text-xs">🩺</span>
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Diagnosis</h3>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                            <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider mb-1">Primary Diagnosis</span>
                                <strong className="text-sm font-extrabold text-slate-800">{primaryDiag}</strong>
                              </div>
                              {icdCode && (
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider mb-1">ICD-10 Code</span>
                                  <span className="text-sm font-bold text-slate-700">{icdCode}</span>
                                </div>
                              )}
                            </div>
                            {clinicalImpression && (
                              <div>
                                <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider mb-1">Clinical Impression</span>
                                <p className="text-xs text-slate-600 leading-relaxed">{clinicalImpression}</p>
                              </div>
                            )}
                            {severity && (
                              <div>
                                <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider mb-1">Severity / Risk</span>
                                <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-bold">Mild / Low Risk</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right column — vitals + advice + follow-up */}
                      <div className="space-y-5">
                        {/* Vitals */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-5 h-5 bg-rose-50 rounded-lg flex items-center justify-center text-xs">📊</span>
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Vitals (Recorded)</h3>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {vitalsList.map((v, i) => (
                              <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm">
                                <div className="text-lg mb-1">{v.icon}</div>
                                <span className={`text-sm font-extrabold block ${v.color}`}>{v.val}</span>
                                {v.unit && <span className="text-[9px] text-slate-400 block">{v.unit}</span>}
                                <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wide">{v.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Advice */}
                        {advice && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-5 h-5 bg-yellow-50 rounded-lg flex items-center justify-center text-xs">💡</span>
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Advice (Summary)</h3>
                            </div>
                            <ul className="space-y-1.5">
                              {advice.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                                  {line.replace(/^[\s•\-\d.]+/, '').trim()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Follow-up Plan */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-5 h-5 bg-purple-50 rounded-lg flex items-center justify-center text-xs">📅</span>
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Follow-up Plan</h3>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">Follow-up Type</span>
                                <span className="font-semibold text-slate-700 mt-0.5 block">{followUp.required ? 'In-Clinic' : 'Not Required'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">Follow-up After</span>
                                <span className="font-semibold text-slate-700 mt-0.5 block">{followUp.afterDays ? `${followUp.afterDays} Days` : followUp.required ? '7 Days' : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">Follow-up Date</span>
                                <span className="font-semibold text-slate-700 mt-0.5 block">
                                  {followUp.date ? new Date(followUp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                </span>
                              </div>
                            </div>
                            {followUp.notes && (
                              <div className="pt-2 border-t border-slate-200">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Reason</span>
                                <p className="text-xs text-slate-600 leading-relaxed">{followUp.notes}</p>
                              </div>
                            )}
                            {followUp.instructions && (
                              <div>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Instructions</span>
                                <p className="text-xs text-slate-600 leading-relaxed">{followUp.instructions}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PRESCRIPTION TAB */}
                  {activeSummaryTab === 'prescription' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Medicines Prescribed</h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              {['#', 'Medicine / Generic', 'Strength', 'Dose', 'Frequency', 'Duration', 'Instructions'].map(h => (
                                <th key={h} className="py-3 px-3 font-black text-slate-500 text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentMedications.length > 0
                              ? currentMedications.map((med, i) => (
                                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="py-3 px-3 text-slate-400 font-bold">{i + 1}</td>
                                    <td className="py-3 px-3">
                                      <strong className="text-slate-800 font-bold block">{med.medicineName}</strong>
                                      {med.genericName && <span className="text-[10px] text-slate-400 italic">{med.genericName}</span>}
                                    </td>
                                    <td className="py-3 px-3 text-slate-600">{med.strength || med.dosage || 'N/A'}</td>
                                    <td className="py-3 px-3 text-slate-600">{med.dose || '1 Tab'}</td>
                                    <td className="py-3 px-3 text-slate-600">{med.frequency || '1-0-1'}</td>
                                    <td className="py-3 px-3 text-slate-600">{med.duration || '5 days'}</td>
                                    <td className="py-3 px-3 text-slate-600">{med.instructions || med.timing || 'After Food'}</td>
                                  </tr>
                                ))
                              : <tr><td colSpan="7" className="py-8 text-center text-slate-400 italic">No medicines prescribed.</td></tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* LAB TESTS TAB */}
                  {activeSummaryTab === 'labs' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Laboratory Investigations</h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              {['Test Name', 'Sample Required', 'Purpose / Reason'].map(h => (
                                <th key={h} className="py-3 px-4 font-black text-slate-500 text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {labTests.length > 0
                              ? labTests.map((lab, i) => (
                                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="py-3 px-4 font-bold text-slate-800">{lab.testName}</td>
                                    <td className="py-3 px-4 text-slate-600">{lab.sampleRequired || 'Blood'}</td>
                                    <td className="py-3 px-4 text-slate-500">{lab.reason || 'N/A'}</td>
                                  </tr>
                                ))
                              : <tr><td colSpan="3" className="py-8 text-center text-slate-400 italic">No lab tests recommended.</td></tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PROCEDURES TAB */}
                  {activeSummaryTab === 'procedures' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Procedures Recommended</h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              {['Procedure', 'Frequency'].map(h => (
                                <th key={h} className="py-3 px-4 font-black text-slate-500 text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {procedures.length > 0
                              ? procedures.map((proc, i) => (
                                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="py-3 px-4 font-bold text-slate-800">{proc.name}</td>
                                    <td className="py-3 px-4 text-slate-600">{proc.frequency || 'Once'}</td>
                                  </tr>
                                ))
                              : <tr><td colSpan="2" className="py-8 text-center text-slate-400 italic">No procedures recommended.</td></tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* HISTORY TAB */}
                  {activeSummaryTab === 'history' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Past Consultation History</h4>
                      {recentHistory.length > 0 ? (
                        <div className="space-y-2">
                          {recentHistory.map((h, i) => (
                            <div
                              key={i}
                              onClick={() => navigate(`/consultations/${h._id}`)}
                              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition"
                            >
                              <div>
                                <strong className="text-sm font-bold text-slate-800">{h.diagnosis?.primary || 'Consultation'}</strong>
                                <span className="text-xs text-slate-400 block mt-0.5">
                                  {h.completedAt ? new Date(h.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                </span>
                              </div>
                              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">Completed</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic py-6 text-center">No previous consultation history available.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── COMPLETION FOOTER BAR ── */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-xs text-indigo-700 leading-relaxed">
                  <span>This consultation was completed on </span>
                  <strong>{completedStr}</strong>
                  <span> by </span>
                  <strong>Dr. {doctorObj?.fullName || 'N/A'}</strong>
                  {consult._id && (
                    <>
                      <span className="mx-2 text-indigo-300">•</span>
                      <span>Consultation ID: </span>
                      <strong>CON-{new Date().getFullYear()}-{visitDateObj ? `${(visitDateObj.getMonth()+1).toString().padStart(2,'0')}${visitDateObj.getDate().toString().padStart(2,'0')}` : '0716'}-{consult._id.substring(0, 4).toUpperCase()}</strong>
                    </>
                  )}
                  <span className="mx-2 text-indigo-300">•</span>
                  <span>Report generated on </span>
                  <strong>{visitDateStr}</strong>
                </div>
              </div>
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="space-y-4">

              {/* Patient Info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-5 h-5 bg-blue-50 rounded-lg flex items-center justify-center text-xs">👤</span>
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Patient Information</h3>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg shrink-0">
                    {patientObj?.fullName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <strong className="text-slate-900 font-extrabold text-base block">{patientObj?.fullName || 'N/A'}</strong>
                    <span className="text-[11px] text-indigo-600 font-bold">{patientIdStr}</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">{age} Years, {gender}</span>
                    {dob && <span className="text-slate-500">{new Date(dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Blood Group</span>
                    <span className="font-bold text-slate-700">{bloodGroup}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400 font-semibold">Phone</span>
                    <span className="font-bold text-slate-700">+91 {phone}</span>
                  </div>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-5 h-5 bg-teal-50 rounded-lg flex items-center justify-center text-xs">🩺</span>
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Doctor Information</h3>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-black text-lg shrink-0">
                    {doctorObj?.fullName?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <strong className="text-slate-900 font-extrabold text-sm block">Dr. {doctorObj?.fullName || 'N/A'}</strong>
                    <span className="text-[11px] text-slate-500">{doctorObj?.qualification || doctorObj?.qualifications?.join(', ') || 'MBBS, MD (General Medicine)'}</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Reg. No.</span>
                    <span className="font-bold text-slate-700">{doctorObj?.medicalRegistrationNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400 font-semibold">Specialization</span>
                    <span className="font-bold text-slate-700">{doctorObj?.specialization || 'Consultant Physician'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center text-xs">⚡</span>
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quick Actions</h3>
                </div>
                <div className="space-y-2.5">
                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center gap-3 p-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                  >
                    <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">📄</span>
                    <div className="text-left">
                      <span className="block font-black">View Full Consultation Report</span>
                      <span className="text-indigo-200 text-[10px]">Open complete printable report</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setIsEditingCompletedConsultation(true)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
                  >
                    <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">✏️</span>
                    <div className="text-left">
                      <span className="block font-black">Edit Consultation</span>
                      <span className="text-slate-400 text-[10px]">Modify consultation details</span>
                    </div>
                  </button>
                  <button
                    onClick={() => toast.success('Re-visit scheduling coming soon!')}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
                  >
                    <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">📅</span>
                    <div className="text-left">
                      <span className="block font-black">Create Re-Visit</span>
                      <span className="text-slate-400 text-[10px]">Schedule next appointment</span>
                    </div>
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
                  >
                    <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">🔗</span>
                    <div className="text-left">
                      <span className="block font-black">Share with Patient</span>
                      <span className="text-slate-400 text-[10px]">Copy consultation link</span>
                    </div>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
                  >
                    <span className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">📥</span>
                    <div className="text-left">
                      <span className="block font-black">Download Report</span>
                      <span className="text-slate-400 text-[10px]">Save as PDF</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Re-visit History */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-5 h-5 bg-amber-50 rounded-lg flex items-center justify-center text-xs">🔄</span>
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Re-visit History</h3>
                </div>
                <div className="space-y-3">
                  {recentHistory.length > 0
                    ? recentHistory.map((h, i) => (
                        <div
                          key={i}
                          onClick={() => navigate(`/consultations/${h._id}`)}
                          className="cursor-pointer hover:bg-slate-50 rounded-xl p-3 transition -mx-1"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-xs text-slate-800 font-bold">
                              {h.completedAt ? new Date(h.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </strong>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Completed</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{h.diagnosis?.primary || 'Consultation'}</p>
                        </div>
                      ))
                    : <p className="text-xs text-slate-400 italic">No previous visits found.</p>
                  }
                </div>
                <button
                  onClick={() => setActiveSummaryTab('history')}
                  className="w-full mt-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >View All Appointments</button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Dashboard Launchpad (Image 1)
  return (
    <div className="min-h-screen bg-[#0a0f1d] text-gray-100 p-4 md:p-6 rounded-3xl border border-gray-800/80 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-800/60 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Consultations</h1>
          <p className="text-xs text-gray-400 mt-1">View and manage all consultations</p>
        </div>

        {/* Search & Doctor Details */}
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search patient by name, ID or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setUpcomingSearchQuery(e.target.value);
                setCompletedSearchQuery(e.target.value);
              }}
              className="bg-[#111827] border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 w-64"
            />
          </div>

          <div className="flex items-center gap-3 bg-[#111827] border border-gray-800 p-1.5 pr-4 rounded-xl">
            <div className="w-8 h-8 bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-sm rounded-lg">
              AD
            </div>
            <div>
              <p className="text-xs font-bold text-white">Alpha Doctor</p>
              <p className="text-[10px] text-gray-400">General Physician</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Upcoming Today', count: upcomingTodayCount, sub: nextAppt ? `Next: ${nextAppt.startTime} - ${nextAppt.patientId?.fullName}` : 'None scheduled', icon: Calendar, color: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5' },
          { label: 'Upcoming This Week', count: upcomingThisWeekCount, sub: 'Mon 23 Jun - Sun 29 Jun', icon: Clock, color: 'text-purple-400', border: 'border-purple-500/20 bg-purple-500/5' },
          { label: 'Completed This Week', count: completedThisWeekCount, sub: 'Mon 16 Jun - Sun 22 Jun', icon: CheckCircle, color: 'text-blue-400', border: 'border-blue-500/20 bg-blue-500/5' },
          { label: 'Total Completed', count: totalCompletedCount, sub: 'All time', icon: FileText, color: 'text-amber-400', border: 'border-amber-500/20 bg-amber-500/5' },
          { label: 'Cancelled / No Show', count: cancelledCount, sub: 'All time', icon: XCircle, color: 'text-pink-400', border: 'border-pink-500/20 bg-pink-500/5' }
        ].map((card, idx) => (
          <div key={idx} className={`border rounded-2xl p-4 flex flex-col justify-between ${card.border}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-semibold">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-white">{card.count}</p>
              <p className="text-[10px] text-gray-400 mt-1 truncate" title={card.sub}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Consultations Table */}
      <div className="mt-8 bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" /> Upcoming Consultations
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Scheduled consultations not yet completed</p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <input
              type="date"
              value={upcomingDate}
              onChange={(e) => setUpcomingDate(e.target.value)}
              className="bg-[#0a0f1d] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
            />
            <select
              value={upcomingStatus}
              onChange={(e) => setUpcomingStatus(e.target.value)}
              className="bg-[#0a0f1d] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
            >
              <option value="All">All Status</option>
              <option value="Booked">Booked</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked_In">Checked-In</option>
            </select>
            <button className="bg-gray-800 hover:bg-gray-700 text-xs font-semibold py-1.5 px-3 rounded-xl transition border border-gray-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Appointment Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-sm text-gray-300">
              {filteredUpcoming.length > 0 ? (
                filteredUpcoming.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-white">{item.startTime || '09:00 AM'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {item.patientId?.fullName?.split(' ').map(n => n[0]).join('') || 'PT'}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{item.patientId?.fullName || 'Raj Sharma'}</p>
                          <p className="text-[10px] text-gray-500">{item.patientId?.patientId || 'PAT-20260623-0001'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{item.patientId?.age || 32} Y/O {item.patientId?.gender || 'Male'}</td>
                    <td className="py-3 px-4 truncate max-w-[200px]" title={item.reasonForVisit}>{item.reasonForVisit || 'Mild fever and dry cough'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type?.toLowerCase() === 'follow-up'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                        {item.type || 'In-Clinic'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'confirmed' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`} />
                        <span className="text-xs font-semibold capitalize">{item.status || 'Confirmed'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          const next = new URLSearchParams(searchParams);
                          next.set('appointmentId', item._id);
                          setSearchParams(next);
                        }}
                        className="bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-xl p-2 transition inline-flex items-center justify-center"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">No upcoming consultations matching requirements.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed Consultations Table */}
      <div className="mt-8 bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> Completed Consultations
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">All previously completed consultations</p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <input
              type="date"
              value={completedStartDate}
              onChange={(e) => setCompletedStartDate(e.target.value)}
              className="bg-[#0a0f1d] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
            />
            <span className="text-gray-500 text-xs">to</span>
            <input
              type="date"
              value={completedEndDate}
              onChange={(e) => setCompletedEndDate(e.target.value)}
              className="bg-[#0a0f1d] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
            />
            <button className="bg-gray-800 hover:bg-gray-700 text-xs font-semibold py-1.5 px-3 rounded-xl transition border border-gray-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Diagnosis</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Outcome / Note</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-sm text-gray-300">
              {paginatedCompleted.length > 0 ? (
                paginatedCompleted.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      {new Date(item.completedAt || item.updatedAt || item.date).toLocaleString('en-US', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {item.patientId?.fullName?.split(' ').map(n => n[0]).join('') || 'PT'}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{item.patientId?.fullName || 'Raj Sharma'}</p>
                          <p className="text-[10px] text-gray-500">{item.patientId?.patientId || 'PAT-20260623-0001'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{item.patientId?.age || 32} Y/O {item.patientId?.gender || 'Male'}</td>
                    <td className="py-3 px-4 truncate max-w-[200px]">{item.diagnosis?.primary || 'Viral Fever (R50.9)'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type?.toLowerCase() === 'follow-up'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                        {item.type || 'In-Clinic'}
                      </span>
                    </td>
                    <td className="py-3 px-4 truncate max-w-[200px]" title={item.treatmentPlan}>{item.treatmentPlan || 'Symptoms improving'}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          const next = new URLSearchParams(searchParams);
                          next.set('consultationId', item._id);
                          setSearchParams(next);
                        }}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl p-2 transition inline-flex items-center justify-center border border-gray-700"
                        title="View History Workspace"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await prescriptionApi.getByConsultation(item._id);
                            const pres = res?.prescription || res?.data?.prescription;
                            if (pres?._id) {
                              const pdfRes = await prescriptionApi.downloadPdf(pres._id);
                              const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
                              const url = window.URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            } else {
                              alert('No finalized prescription available.');
                            }
                          } catch (e) {
                            alert('Failed to retrieve prescription.');
                          }
                        }}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl p-2 transition inline-flex items-center justify-center border border-gray-700"
                        title="View Prescription"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">No completed consultations matching this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-gray-800/80 pt-4 mt-6 gap-4 text-xs text-gray-400">
          <p>Showing {(completedPage - 1) * rowsPerPage + 1} to {Math.min(completedPage * rowsPerPage, totalCompletedResults)} of {totalCompletedResults} results</p>

          <div className="flex items-center gap-4 self-end sm:self-auto">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCompletedPage(1);
                }}
                className="bg-[#0a0f1d] border border-gray-800 rounded-lg px-2 py-1 text-gray-200 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                disabled={completedPage === 1}
                className="p-1.5 hover:bg-gray-800 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-gray-200">{completedPage} of {totalPages}</span>
              <button
                onClick={() => setCompletedPage(p => Math.min(totalPages, p + 1))}
                disabled={completedPage === totalPages}
                className="p-1.5 hover:bg-gray-800 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConsultationPage;