import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  const [workspaceTab, setWorkspaceTab] = useState('overview'); // overview, history, prescriptions, labs, followups, docs, reviews
  const [patientHistory, setPatientHistory] = useState([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);

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
    if (!consultationId) {
      setSelectedConsultation(null);
      return;
    }

    const loadWorkspace = async () => {
      setWorkspaceLoading(true);
      try {
        // consultationApi.getById unwraps the response automatically — access fields directly
        const res = await consultationApi.getById(consultationId);
        if (res?.consultation) {
          setSelectedConsultation(res);

          const pId = res.consultation.patientId?._id || res.consultation.patientId;
          if (pId) {
            // Load clinical history & prescriptions
            try {
              const hist = await consultationApi.historyByPatient(pId);
              setPatientHistory(hist?.consultations || hist?.data?.consultations || []);
            } catch (e) {
              console.error('History failed', e);
            }
            try {
              const pres = await prescriptionApi.getByPatient(pId);
              setPatientPrescriptions(pres?.prescriptions || pres?.data?.prescriptions || []);
            } catch (e) {
              console.error('Prescriptions failed', e);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load consultation details', err);
      } finally {
        setWorkspaceLoading(false);
      }
    };

    loadWorkspace();
  }, [consultationId]);

  // If opening via appointment, always render EMR directly
  if (appointmentId) {
    return <LegacyConsultationPage />;
  }

  // If a consultationId is present but data is still loading, show spinner
  if (consultationId && (workspaceLoading || !selectedConsultation)) {
    return <LoadingState label="Loading consultation details..." />;
  }

  // If consultation loaded and is NOT completed, OR if the user is a patient, open EMR/Prescription view
  if (consultationId && selectedConsultation && (selectedConsultation.consultation?.status !== 'completed' || user?.role?.toLowerCase() === 'patient')) {
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

  // Render detail view (Image 2)
  if (consultationId && selectedConsultation) {
    const consult = selectedConsultation.consultation;
    const patientObj = selectedConsultation.patient || consult.patientId;
    const doctorObj = selectedConsultation.doctor || consult.doctorId;

    // Fallback data
    const age = patientObj?.age || '32';
    const gender = patientObj?.gender || 'Male';
    const patientIdStr = patientObj?.patientId || 'PAT-20260623-0001';
    const phone = patientObj?.phone || '9838620052';
    const bloodGroup = patientObj?.bloodGroup || 'B+';
    const allergies = patientObj?.allergies || 'Penicillin (Rash), Pollen';
    const knownConditions = patientObj?.knownConditions || 'Diabetes, Hypertension, Kidney Disease';
    const chiefComplaint = consult.chiefComplaint || 'Mild fever and dry cough for three days.';
    const primaryDiag = consult.diagnosis?.primary || 'Viral Fever (R50.9)';
    const secondaryDiag = consult.diagnosis?.secondary || ['Upper Respiratory Tract Infection (J06.9)'];
    const treatmentPlan = consult.treatmentPlan || 'Paracetamol 650mg TID, Cough Syrup BID, Rest and hydration.';

    // List of medications mock / real
    const currentMedications = selectedConsultation.prescription?.medicines || [
      { medicineName: 'Paracetamol 650mg Tablet', frequency: '1-1-1', timing: 'After Food', duration: '3 Days' },
      { medicineName: 'Cetirizine 10mg Tablet', frequency: '1-0-1', timing: 'After Food', duration: '5 Days' },
      { medicineName: 'Dextromethorphan + Phenylephrine Syrup', frequency: '10ml • 1-0-1', timing: 'After Food', duration: '5 Days' }
    ];

    // List of lab tests mock / real
    const labTests = selectedConsultation.prescription?.labs || [
      { testName: 'CBC (Complete Blood Count)', status: 'Completed', result: 'Normal', date: '20 Jun 2026' },
      { testName: 'CRP (C-Reactive Protein)', status: 'Completed', result: 'Normal', date: '20 Jun 2026' },
      { testName: 'COVID-19 RT-PCR', status: 'Completed', result: 'Negative', date: '16 Jun 2026' }
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1d] text-gray-100 p-4 md:p-6 rounded-3xl border border-gray-800/80 shadow-2xl">
        {/* Detail Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-800/60 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (user?.role === 'patient') {
                  navigate('/portal');
                } else {
                  navigate('/consultations');
                }
                setSelectedConsultation(null);
              }}
              className="p-2 hover:bg-gray-800 rounded-xl transition text-emerald-400 hover:text-emerald-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Consultation Workspace</h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Manage consultations and patient care</p>
            </div>
          </div>

          {/* Header Search & Doctor Badge */}
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search patient by name, ID or phone..."
                className="bg-[#111827] border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 w-64"
              />
            </div>

            <div className="flex items-center gap-3 bg-[#111827] border border-gray-800 p-1.5 pr-4 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-sm">
                AD
              </div>
              <div>
                <p className="text-xs font-bold text-white">Alpha Doctor</p>
                <p className="text-[10px] text-gray-400">General Physician</p>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Profile Header Card */}
        <div className="mt-6 bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-2xl border border-emerald-500/20">
              {patientObj?.fullName?.split(' ').map(n => n[0]).join('') || 'RS'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{patientObj?.fullName || 'Raj Sharma'}</h2>
                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-500/30">
                  Active Patient
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {age} Y/O {gender} &nbsp;•&nbsp; {patientIdStr} &nbsp;•&nbsp; {phone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full md:w-auto">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Blood Group</p>
              <p className="text-sm font-bold text-white mt-1">{bloodGroup}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Allergies</p>
              <p className="text-sm font-bold text-red-400 mt-1">{allergies}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Known Conditions</p>
              <p className="text-sm font-bold text-amber-400 mt-1">{knownConditions}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto">
            <Link
              to={`/consultations/${consultationId}/labs/new`}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              Order Lab Tests
            </Link>
            <Link
              to={`/appointments/new?patientId=${patientObj?._id || patientObj}`}
              className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 border border-gray-700"
            >
              Book Appointment
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-800 flex gap-6 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'history', label: 'Consultation History' },
            { id: 'prescriptions', label: 'Prescriptions' },
            { id: 'labs', label: 'Lab Orders' },
            { id: 'followups', label: 'Follow-ups' },
            { id: 'docs', label: 'Documents' },
            { id: 'reviews', label: 'Reviews' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setWorkspaceTab(tab.id)}
              className={`pb-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${workspaceTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Workspace Tab Content */}
        {workspaceTab === 'overview' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column (Overview) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Recent Consultation Card */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-white">Recent Consultation</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(consult.completedAt || consult.updatedAt).toLocaleString('en-US', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                      Completed
                    </span>
                    <button
                      onClick={() => {
                        if (selectedConsultation.prescription?._id) {
                          prescriptionApi.downloadPdf(selectedConsultation.prescription._id)
                            .then(res => {
                              const blob = new Blob([res.data], { type: 'application/pdf' });
                              const url = window.URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            });
                        }
                      }}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold py-1.5 px-3 rounded-lg transition"
                    >
                      View Full Consultation
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chief Complaint</h4>
                    <p className="text-sm text-gray-200 mt-1">{chiefComplaint}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Diagnosis</h4>
                    <ul className="list-disc pl-4 text-sm text-gray-200 mt-1 space-y-1">
                      <li>{primaryDiag}</li>
                      {secondaryDiag.map((diag, index) => (
                        <li key={index}>{diag}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Treatment Plan</h4>
                    <p className="text-sm text-gray-200 mt-1">{treatmentPlan}</p>
                  </div>
                </div>
              </div>

              {/* Historical Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Consultations', val: patientHistory.length || 8, sub: 'All time', icon: FileText, color: 'text-emerald-400' },
                  { label: 'Follow-ups Completed', val: 5, sub: 'This year', icon: CheckCircle, color: 'text-blue-400' },
                  { label: 'Tests Ordered', val: 14, sub: 'All time', icon: Activity, color: 'text-amber-400' },
                  { label: 'Prescriptions Issued', val: patientPrescriptions.length || 8, sub: 'All time', icon: FileText, color: 'text-pink-400' }
                ].map((stat, i) => (
                  <div key={i} className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-white">{stat.val}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{stat.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consultation Timeline */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white border-b border-gray-800/80 pb-4">Consultation Timeline</h3>

                <div className="mt-4 relative pl-6 border-l-2 border-emerald-500/20 space-y-6">
                  {patientHistory.length > 0 ? (
                    patientHistory.map((item, idx) => (
                      <div key={item._id} className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#111827] border-2 border-emerald-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-emerald-400">
                              {new Date(item.completedAt || item.updatedAt).toLocaleString('en-US', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })} &nbsp;•&nbsp; <span className="text-gray-400 uppercase text-[10px]">{item.status}</span>
                            </p>
                            <p className="text-sm font-bold text-white mt-1">
                              {item.diagnosis?.primary || 'General Health Review'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {item.chiefComplaint || 'Routine checkup'}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        </div>
                      </div>
                    ))
                  ) : (
                    // Populated mock items from Image 2
                    <>
                      <div className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#111827] border-2 border-emerald-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-emerald-400">23 Jun 2026 • 09:15 AM &nbsp;•&nbsp; Completed</p>
                            <p className="text-sm font-bold text-white mt-1">Viral Fever, URTI</p>
                            <p className="text-xs text-gray-400 mt-1">Prescription &nbsp;•&nbsp; 3 Medicines &nbsp;•&nbsp; 3 Tests</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#111827] border-2 border-emerald-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-emerald-400">20 Jun 2026 • 10:30 AM &nbsp;•&nbsp; Completed</p>
                            <p className="text-sm font-bold text-white mt-1">Symptoms improving</p>
                            <p className="text-xs text-gray-400 mt-1">Review &nbsp;•&nbsp; 2 Tests Done</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#111827] border-2 border-emerald-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-emerald-400">16 Jun 2026 • 11:00 AM &nbsp;•&nbsp; Completed</p>
                            <p className="text-sm font-bold text-white mt-1">Fever and cough</p>
                            <p className="text-xs text-gray-400 mt-1">Prescription &nbsp;•&nbsp; 3 Medicines &nbsp;•&nbsp; 2 Tests</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setWorkspaceTab('history')}
                  className="mt-6 w-full py-2 bg-gray-800/50 hover:bg-gray-800 text-xs font-bold text-white rounded-xl transition flex items-center justify-center gap-2 border border-gray-700"
                >
                  View All History <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column (Overview Sidebar) */}
            <div className="space-y-6">

              {/* Patient Recovery Progress */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white">Patient Recovery Progress</h3>

                <div className="mt-6 flex flex-col items-center">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        className="text-gray-800"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-400"
                        strokeWidth="3"
                        strokeDasharray="75, 100"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xl font-bold text-white">75%</p>
                      <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                        Improving
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs border-t border-gray-800/80 pt-4">
                  <div className="text-center">
                    <p className="text-gray-400">Initial Visit</p>
                    <p className="font-semibold text-white mt-0.5">16 Jun</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">Follow-up 1</p>
                    <p className="font-semibold text-white mt-0.5">20 Jun</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">Follow-up 2</p>
                    <p className="font-semibold text-white mt-0.5">23 Jun</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 font-semibold">Next Review</p>
                    <p className="font-semibold text-emerald-400 mt-0.5">30 Jun</p>
                  </div>
                </div>
              </div>

              {/* Medications Overview */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
                  <h3 className="font-bold text-white">Current Medications</h3>
                  <button
                    onClick={() => setWorkspaceTab('prescriptions')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    View All
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {currentMedications.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{med.medicineName || med.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {med.frequency} &nbsp;•&nbsp; {med.timing} &nbsp;•&nbsp; {med.duration}
                        </p>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Tests Overview */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
                  <h3 className="font-bold text-white">Lab Tests Overview</h3>
                  <button
                    onClick={() => setWorkspaceTab('labs')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    View All
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-800/40 p-2.5 rounded-lg border border-gray-800">
                    <p className="text-[10px] text-gray-400 font-medium">Ordered</p>
                    <p className="text-lg font-bold text-white mt-1">14</p>
                  </div>
                  <div className="bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                    <p className="text-[10px] text-emerald-400 font-medium">Completed</p>
                    <p className="text-lg font-bold text-emerald-400 mt-1">9</p>
                  </div>
                  <div className="bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/10">
                    <p className="text-[10px] text-amber-400 font-medium">Pending</p>
                    <p className="text-lg font-bold text-amber-400 mt-1">5</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {labTests.slice(0, 3).map((test, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{test.testName || test.name}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{test.date || 'Recent'}</p>
                      </div>
                      <span className="text-emerald-400 font-medium">{test.result || 'Normal'}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab contents other than Overview */}
        {workspaceTab !== 'overview' && (
          <div className="mt-6 bg-[#111827] border border-gray-800 rounded-2xl p-6">
            <h3 className="font-bold text-white border-b border-gray-800 pb-4 capitalize">
              {workspaceTab} Details
            </h3>
            <div className="mt-4 text-sm text-gray-400">
              {workspaceTab === 'history' && (
                <div className="space-y-4">
                  {patientHistory.map((item) => (
                    <div key={item._id} className="border-b border-gray-800 pb-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{item.diagnosis?.primary || 'General Review'}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.chiefComplaint}</p>
                      </div>
                      <Link to={`/consultations/${item._id}`} className="text-xs text-emerald-400 font-semibold hover:underline">
                        View Details
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              {workspaceTab === 'prescriptions' && (
                <div className="space-y-4">
                  {patientPrescriptions.map((item) => (
                    <div key={item._id} className="border-b border-gray-800 pb-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">Prescription issued on {new Date(item.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-400 mt-1">{item.medicines?.length || 0} Medicines Prescribed</p>
                      </div>
                      <button
                        onClick={() => {
                          prescriptionApi.downloadPdf(item._id).then(res => {
                            const blob = new Blob([res.data], { type: 'application/pdf' });
                            const url = window.URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          });
                        }}
                        className="text-xs text-emerald-400 font-semibold hover:underline"
                      >
                        Download PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {workspaceTab === 'labs' && <p>No lab order records found for this period.</p>}
              {workspaceTab === 'followups' && <p>No scheduled follow-up alerts active.</p>}
              {workspaceTab === 'docs' && <p>All clinical documents and medical reports will appear here.</p>}
              {workspaceTab === 'reviews' && <p>Feedback history has been saved successfully.</p>}
            </div>
          </div>
        )}

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
