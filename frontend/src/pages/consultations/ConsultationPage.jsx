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
  if (consultationId && selectedConsultation && (!isCompleted || user?.role?.toLowerCase() === 'patient')) {
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

  // Render detail view - Dashboard style (completed consultation)
  if ((consultationId || appointmentId) && selectedConsultation) {
    const consult = selectedConsultation.consultation;
    const patientObj = selectedConsultation.patient || consult.patientId;
    const doctorObj = selectedConsultation.doctor || consult.doctorId;
    const appointmentObj = selectedConsultation.appointment || consult.appointmentId;

    const age = patientObj?.age || 'N/A';
    const gender = patientObj?.gender || 'N/A';
    const patientIdStr = patientObj?.patientId || 'N/A';
    const phone = patientObj?.phone || 'N/A';
    const bloodGroup = patientObj?.bloodGroup || 'N/A';
    const allergies = patientObj?.allergies || 'No known drug allergies';
    const chiefComplaint = consult.chiefComplaint || 'No chief complaint recorded.';
    const clinicalNotes = consult.clinicalNotes || '';
    const pastMedicalHistory = consult.pastMedicalHistory || [];
    const systemicExam = consult.systemicExamination || [];
    const primaryDiag = consult.diagnosis?.primary || 'General Health Review';
    const clinicalImpression = consult.diagnosis?.notes || '';
    const icdCode = consult.diagnosis?.icdCode || '';
    const currentMedications = selectedConsultation.prescription?.medicines || [];
    const labTests = selectedConsultation.prescription?.labs || [];
    const procedures = selectedConsultation.prescription?.procedures || [];
    const advice = selectedConsultation.prescription?.advice || '';
    const followUp = consult.followUp || {};
    const vitals = consult.vitals || {};

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
      toast.success('Consultation link copied to clipboard!');
    };

    const calculateBMI = () => {
      if (vitals.weight && vitals.height) {
        const hm = vitals.height / 100;
        return (vitals.weight / (hm * hm)).toFixed(1);
      }
      return 'N/A';
    };

    const getStrength = (med) => {
      if (med.strength) return med.strength;
      const m = med.medicineName?.match(/(\d+\s*(?:mg|g|mcg|ml|tablet|tab|cap|capsule|puff|spray|unit|iu))/i);
      return m ? m[1] : 'N/A';
    };

    const visitDate = consult.createdAt
      ? new Date(consult.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';

    const trackingSteps = [
      { label: 'Appointment Booked', active: true },
      { label: 'Checked In', active: true },
      { label: 'In Consultation', active: true },
      { label: 'Consultation Completed', active: true },
      { label: 'Follow-up Pending', active: !!followUp.required }
    ];

    return (
      <div className="min-h-screen bg-[#070b19] text-slate-100 p-5 space-y-5">

        {/* Breadcrumbs + Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <nav className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span
                className="cursor-pointer hover:text-indigo-400 transition"
                onClick={() => { navigate('/consultations'); setSelectedConsultation(null); }}
              >Consultations</span>
              <span className="text-slate-600">â€º</span>
              <span className="text-indigo-400 font-semibold">Consultation Details</span>
            </nav>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Consultation Details</h1>
            <p className="text-xs text-slate-400 mt-0.5">Completed consultation record for {patientObj?.fullName || 'Patient'}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" /> Print / Share
            </button>
            <button
              onClick={() => { navigate('/consultations'); setSelectedConsultation(null); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent border border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        </div>

        {/* Status Info Bar */}
        <div className="bg-[#0b1329] border border-slate-800 rounded-2xl px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-black">âœ“</span>
              <span className="text-sm font-extrabold text-emerald-400">Completed</span>
            </div>
            {consult.editCompleted && (
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold self-start mt-0.5">âœ“ Edited</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Consultation ID</span>
            <span className="text-sm font-extrabold text-white font-mono">CON-{consult._id.substring(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Appointment ID</span>
            <span className="text-sm font-extrabold text-white font-mono">
              APT-{appointmentObj?.appointmentCode || appointmentObj?._id?.substring(0, 8).toUpperCase() || 'N/A'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Visit Date</span>
            <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{visitDate}</span>
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Duration</span>
            <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />22 mins
            </span>
          </div>
        </div>

        {/* Appointment Tracking Timeline */}
        <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" /> Appointment Tracking
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0">
            {trackingSteps.map((step, idx) => (
              <div key={idx} className="flex sm:flex-col items-center gap-3 sm:gap-2 flex-1 relative">
                {idx < trackingSteps.length - 1 && (
                  <div className="hidden sm:block absolute top-3.5 left-[calc(50%+16px)] right-[calc(-50%+16px)] h-px bg-slate-700 z-0" />
                )}
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 z-10 text-[10px] font-black ${
                  step.active
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  {step.active ? 'âœ“' : idx + 1}
                </div>
                <span className={`text-[10px] font-bold sm:text-center leading-tight ${step.active ? 'text-white' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

          {/* LEFT: Tabbed workspace */}
          <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-5 flex flex-col gap-5">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-4">
              {[
                { id: 'summary',      label: 'Consultation Summary' },
                { id: 'prescription', label: `Prescription (${currentMedications.length})` },
                { id: 'labs',         label: `Lab Tests (${labTests.length})` },
                { id: 'procedures',   label: `Procedures (${procedures.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSummaryTab(tab.id)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                    activeSummaryTab === tab.id
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                  }`}
                >{tab.label}</button>
              ))}
            </div>

            {/* Tab: Summary */}
            {activeSummaryTab === 'summary' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Chief Complaint</h4>
                  <p className="text-sm text-slate-200 bg-[#060913] border border-slate-800 rounded-xl p-4 leading-relaxed">{chiefComplaint}</p>
                </div>
                {clinicalNotes && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">History of Present Illness</h4>
                    <p className="text-sm text-slate-200 bg-[#060913] border border-slate-800 rounded-xl p-4 leading-relaxed whitespace-pre-line">{clinicalNotes}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Past Medical History</h4>
                  <div className="flex flex-wrap gap-2">
                    {pastMedicalHistory.length > 0
                      ? pastMedicalHistory.map((item, i) => (
                          <span key={i} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">{item}</span>
                        ))
                      : <span className="text-xs text-slate-500 italic">No significant past history.</span>
                    }
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Allergies</h4>
                  <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl font-semibold inline-block">{allergies}</span>
                </div>
                {systemicExam.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Systemic Examination</h4>
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-800/40 border-b border-slate-800">
                            <th className="text-left py-2.5 px-4 font-black text-slate-300 w-1/3">System</th>
                            <th className="text-left py-2.5 px-4 font-black text-slate-300">Findings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {systemicExam.map((ex, i) => (
                            <tr key={i} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20">
                              <td className="py-2.5 px-4 font-bold text-slate-200">{ex.sys}</td>
                              <td className="py-2.5 px-4 text-slate-400">{ex.status}{ex.note ? ` N/A ${ex.note}` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="border-t border-slate-800 pt-4">
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-3">Diagnosis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#060913] border border-slate-800 rounded-xl p-4 space-y-1.5">
                      <span className="text-[10px] text-slate-500 font-black uppercase block">Primary Diagnosis</span>
                      <strong className="text-sm font-extrabold text-white block">
                        {primaryDiag}{icdCode ? ` (${icdCode})` : ''}
                      </strong>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold inline-block">Active / Mild</span>
                    </div>
                    {clinicalImpression && (
                      <div className="bg-[#060913] border border-slate-800 rounded-xl p-4 space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-black uppercase block">Clinical Impression</span>
                        <p className="text-xs text-slate-300 leading-relaxed">{clinicalImpression}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Prescription */}
            {activeSummaryTab === 'prescription' && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Medicines Prescribed</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800/40 border-b border-slate-800">
                        {['#', 'Medicine', 'Strength', 'Dose', 'Frequency', 'Duration', 'Instructions'].map(h => (
                          <th key={h} className="py-2.5 px-3 font-black text-slate-300 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentMedications.length > 0
                        ? currentMedications.map((med, i) => (
                            <tr key={i} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20">
                              <td className="py-2.5 px-3 text-slate-500 font-bold">{i + 1}</td>
                              <td className="py-2.5 px-3">
                                <strong className="text-white font-bold block">{med.medicineName}</strong>
                                {med.genericName && <span className="text-[10px] text-slate-500 italic block">{med.genericName}</span>}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">{getStrength(med)}</td>
                              <td className="py-2.5 px-3 text-slate-300">{med.dosage || med.dose || '1 Tab'}</td>
                              <td className="py-2.5 px-3 text-slate-300">{med.frequency || '1-0-1'}</td>
                              <td className="py-2.5 px-3 text-slate-300">{med.duration || '5 days'}</td>
                              <td className="py-2.5 px-3 text-slate-300">{med.instructions || med.timing || 'After Food'}</td>
                            </tr>
                          ))
                        : <tr><td colSpan="7" className="py-6 text-center text-slate-500 italic">No medicines prescribed.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Lab Tests */}
            {activeSummaryTab === 'labs' && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Laboratory Investigations</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800/40 border-b border-slate-800">
                        {['Test Name', 'Sample Required', 'Purpose / Reason'].map(h => (
                          <th key={h} className="py-2.5 px-4 font-black text-slate-300 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {labTests.length > 0
                        ? labTests.map((lab, i) => (
                            <tr key={i} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20">
                              <td className="py-2.5 px-4 font-bold text-white">{lab.testName}</td>
                              <td className="py-2.5 px-4 text-slate-300">{lab.sampleRequired || 'Blood'}</td>
                              <td className="py-2.5 px-4 text-slate-400">{lab.reason || 'N/A'}</td>
                            </tr>
                          ))
                        : <tr><td colSpan="3" className="py-6 text-center text-slate-500 italic">No lab tests recommended.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Procedures */}
            {activeSummaryTab === 'procedures' && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Procedures Recommended</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800/40 border-b border-slate-800">
                        {['Procedure', 'Frequency'].map(h => (
                          <th key={h} className="py-2.5 px-4 font-black text-slate-300 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {procedures.length > 0
                        ? procedures.map((proc, i) => (
                            <tr key={i} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20">
                              <td className="py-2.5 px-4 font-bold text-white">{proc.name}</td>
                              <td className="py-2.5 px-4 text-slate-300">{proc.frequency || 'Once'}</td>
                            </tr>
                          ))
                        : <tr><td colSpan="2" className="py-6 text-center text-slate-500 italic">No procedures recommended.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Cards */}
          <div className="space-y-4">

            {/* Patient Card */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Patient Information
              </h3>
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-lg font-bold shrink-0">
                  {patientObj?.fullName?.charAt(0) || 'P'}
                </div>
                <div>
                  <strong className="text-white text-sm font-extrabold block">{patientObj?.fullName || 'N/A'}</strong>
                  <span className="text-[10px] text-indigo-400 font-bold">{patientIdStr}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div><span className="text-[10px] text-slate-500 block font-semibold">Age & Gender</span><span className="text-slate-200 font-semibold">{age} Yrs, {gender}</span></div>
                <div><span className="text-[10px] text-slate-500 block font-semibold">Blood Group</span><span className="text-slate-200 font-semibold">{bloodGroup}</span></div>
                <div className="col-span-2"><span className="text-[10px] text-slate-500 block font-semibold">Phone</span><span className="text-slate-200 font-semibold">{phone}</span></div>
              </div>
            </div>

            {/* Doctor Card */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                <span>ðŸ©º</span> Doctor Information
              </h3>
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-lg font-bold shrink-0">
                  {doctorObj?.fullName?.charAt(0) || 'D'}
                </div>
                <div>
                  <strong className="text-white text-sm font-extrabold block">Dr. {doctorObj?.fullName || 'N/A'}</strong>
                  <span className="text-[10px] text-indigo-400 font-bold">Reg: {doctorObj?.medicalRegistrationNumber || 'N/A'}</span>
                </div>
              </div>
              <div className="text-xs space-y-2">
                <div><span className="text-[10px] text-slate-500 block font-semibold">Qualifications</span><span className="text-slate-200 font-semibold">{doctorObj?.qualification || doctorObj?.qualifications?.join(', ') || 'MBBS, MD'}</span></div>
                <div><span className="text-[10px] text-slate-500 block font-semibold">Specialization</span><span className="text-slate-200 font-semibold">{doctorObj?.specialization || 'Consultant Physician'}</span></div>
              </div>
            </div>

            {/* Vitals Card */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                <span>ðŸ“Š</span> Vitals (Recorded)
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Temp',   val: vitals.temperature ? `${vitals.temperature} Â°F` : '98.6 Â°F', color: 'text-amber-400' },
                  { label: 'Pulse',  val: vitals.pulse ? `${vitals.pulse} /min` : '78 /min', color: 'text-rose-400' },
                  { label: 'BP',     val: vitals.bloodPressure || '120/80', color: 'text-indigo-400' },
                  { label: 'Resp',   val: vitals.respiratoryRate ? `${vitals.respiratoryRate} /min` : '18 /min', color: 'text-blue-400' },
                  { label: 'SpO2',   val: (vitals.oxygenSaturation || vitals.spo2) ? `${vitals.oxygenSaturation || vitals.spo2} %` : '98 %', color: 'text-teal-400' },
                  { label: 'Weight', val: vitals.weight ? `${vitals.weight} kg` : '65 kg', color: 'text-orange-400' },
                  { label: 'Height', val: vitals.height ? `${vitals.height} cm` : '175 cm', color: 'text-yellow-400' },
                  { label: 'BMI',    val: calculateBMI(), color: 'text-emerald-400' },
                  { label: 'Pain',   val: '0 /10', color: 'text-red-400' }
                ].map((v, i) => (
                  <div key={i} className="bg-[#060913] border border-slate-800 rounded-xl p-2 text-center">
                    <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">{v.label}</span>
                    <span className={`text-[11px] font-extrabold block mt-0.5 ${v.color}`}>{v.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Advice Card */}
            {advice && (
              <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                  <span>ðŸ’¡</span> Advice (Summary)
                </h3>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  {advice.split('\n').filter(Boolean).map((line, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-indigo-400 mt-0.5">â€¢</span>
                      <span>{line.replace(/^[\sâ€¢\-\d.]+/, '').trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow-up Plan */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                <span>ðŸ“…</span> Follow-up Plan
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">Follow-up Type</span>
                  <span className="text-slate-200 font-semibold">{followUp.required ? 'In-Clinic' : 'Not Required'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">Follow-up Date</span>
                  <span className="text-slate-200 font-semibold">
                    {followUp.date ? new Date(followUp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block font-semibold">Notes</span>
                  <span className="text-slate-400">{followUp.notes || 'Review response to treatment.'}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Quick Actions</h3>
              <button
                onClick={handlePrint}
                className="w-full flex items-center gap-2.5 p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-600/20 transition text-left"
              ><span>ðŸ“„</span> View Full Consultation Report</button>
              <button
                onClick={() => setIsEditingCompletedConsultation(true)}
                className="w-full flex items-center gap-2.5 p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-600/20 transition text-left"
              ><span>âœï¸</span> Edit Consultation</button>
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-2.5 p-3 bg-[#060913] border border-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800 transition text-left"
              ><span>ðŸ”-</span> Share with Patient (Copy Link)</button>
              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-2.5 p-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-600/20 transition text-left"
              ><span>ðŸ“¥</span> Download Report (PDF)</button>
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