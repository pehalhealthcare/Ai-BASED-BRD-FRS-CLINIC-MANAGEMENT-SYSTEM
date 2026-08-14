import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';
import { 
  Search, X, Printer, Download, Trash2, Plus, Phone, MessageSquare, 
  Calendar, DollarSign, CheckCircle, User, Clock, Activity, 
  FileText, Info, ChevronLeft, ChevronRight, AlertCircle, 
  MapPin, ShieldAlert, CreditCard, Bell, Mail, Globe, Sparkles, 
  AlertTriangle, PlusCircle, Check, Eye, Trash, ShieldCheck, Heart, 
  Layers, ShoppingBag, ClipboardList, ShieldAlert as AllergyIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { patientApi, appointmentApi, billingApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';

const PatientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('Overview');
  const [docType, setDocType] = useState('CBC Report');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Real-time socket listener for today's visit status, queue changes, etc.
  useEffect(() => {
    const token = localStorage.getItem('ai_cms_access_token') || localStorage.getItem('token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('connect', () => {
      // Listen to specific patient room or clinic namespaces
      socket.emit('join_user', id);
      
      const invalidateData = () => {
        queryClient.invalidateQueries({ queryKey: ['patient', id] });
        queryClient.invalidateQueries({ queryKey: ['patient-appointments', id] });
        queryClient.invalidateQueries({ queryKey: ['patient-invoices', id] });
        queryClient.invalidateQueries({ queryKey: ['patient-documents', id] });
      };

      socket.on('appointment.created', invalidateData);
      socket.on('appointment.updated', invalidateData);
      socket.on('appointment.checked_in', invalidateData);
      socket.on('appointment.completed', invalidateData);
      socket.on('patient.updated', invalidateData);
    });

    return () => {
      socket.disconnect();
    };
  }, [id, queryClient]);

  // Main queries
  const { data: patientRes, isLoading: patientLoading, error: patientError } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientApi.get(id)
  });

  const { data: appointmentsRes } = useQuery({
    queryKey: ['patient-appointments', id],
    queryFn: () => appointmentApi.getAppointments({ patientId: id, limit: 100 })
  });

  const { data: invoicesRes } = useQuery({
    queryKey: ['patient-invoices', id],
    queryFn: () => billingApi.getInvoices({ patientId: id, limit: 100 })
  });

  const { data: documentsRes, refetch: refetchDocuments } = useQuery({
    queryKey: ['patient-documents', id],
    queryFn: () => patientApi.listDocuments(id)
  });

  // Resolve values
  const patient = useMemo(() => patientRes?.data?.patient || patientRes?.patient || null, [patientRes]);
  const summary = useMemo(() => patientRes?.data?.summary || patientRes?.summary || null, [patientRes]);
  const allAppointments = useMemo(() => appointmentsRes?.data?.appointments || appointmentsRes?.appointments || [], [appointmentsRes]);
  const invoices = useMemo(() => invoicesRes?.data?.invoices || invoicesRes?.invoices || [], [invoicesRes]);
  const documents = useMemo(() => documentsRes?.data?.documents || documentsRes?.documents || [], [documentsRes]);

  // Vitals & Today's Appointments computations
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-'), []);
  const todayAppointment = useMemo(() => {
    return allAppointments.find(appt => {
      const apptDate = appt.appointmentDate?.split('T')[0];
      return apptDate === todayStr;
    });
  }, [allAppointments, todayStr]);

  const recentPrescriptions = useMemo(() => {
    return allAppointments
      .filter(appt => appt.prescriptions && appt.prescriptions.length > 0)
      .flatMap(appt => appt.prescriptions.map(p => ({ ...p, appt })));
  }, [allAppointments]);

  const recentLabReports = useMemo(() => {
    return allAppointments
      .filter(appt => appt.labOrders && appt.labOrders.length > 0)
      .flatMap(appt => appt.labOrders.map(l => ({ ...l, appt })));
  }, [allAppointments]);

  const outstandingBills = useMemo(() => {
    return invoices.reduce((acc, inv) => acc + (inv.status === 'unpaid' || inv.status === 'partially_paid' ? (inv.balanceDue || inv.grandTotal) : 0), 0);
  }, [invoices]);

  // Handlers
  const handleUploadDocument = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Please choose a file to upload first.');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);

    try {
      await patientApi.uploadDocument(id, formData);
      toast.success('Document uploaded successfully.');
      refetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await patientApi.deleteDocument(id, docId);
      toast.success('Document deleted successfully.');
      refetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document.');
    }
  };

  const handlePrintSlip = (appt) => {
    if (!appt) return;
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      toast.error('Popup blocker active. Please allow popups.');
      return;
    }
    
    const doctorName = appt.doctorId?.fullName || 'Dr. Amit Sharma';
    const doctorSpecialization = appt.doctorId?.specialization || 'General Medicine';
    const tokenNumber = appt.tokenNumber || appt.queueToken || 'N/A';
    const aptTime = appt.startTime || appt.appointmentTime || '10:30 AM';
    const nowStr = new Date().toLocaleDateString('en-GB') + ' | ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    printWindow.document.write(`
      <html>
        <head>
          <title>Appointment Confirmation - ${patient?.fullName || 'Patient'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-6 bg-slate-50 text-slate-800">
          <div class="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-6">
            <div class="text-center border-b border-slate-100 pb-4">
              <h2 class="text-lg font-black text-emerald-600">PEHEAL AICMS</h2>
              <p class="text-xs text-slate-400">Appointment Confirmation Slip</p>
            </div>
            <div class="mt-4 space-y-3.5 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-400 font-bold">Patient Name:</span>
                <span class="font-extrabold text-slate-800">${patient?.fullName}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 font-bold">UHID:</span>
                <span class="font-bold text-slate-800">${patient?.patientId}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 font-bold">Doctor:</span>
                <span class="font-bold text-slate-800">${doctorName} (${doctorSpecialization})</span>
              </div>
              <div class="flex justify-between p-3 bg-emerald-50 rounded-xl mt-3">
                <div>
                  <p class="text-[10px] font-bold text-emerald-800">Token Number</p>
                  <p class="text-xl font-black text-emerald-600">${tokenNumber}</p>
                </div>
                <div class="text-right">
                  <p class="text-[10px] font-bold text-emerald-800">Scheduled Time</p>
                  <p class="text-sm font-black text-slate-800">${aptTime}</p>
                </div>
              </div>
            </div>
            <div class="text-center text-[10px] text-slate-400 mt-6 border-t border-slate-100 pt-3">
              Printed on ${nowStr}
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (patientLoading) return <LoadingState label="Loading patient registry..." />;
  if (patientError || !patient) return <ErrorState title="Patient profile not found" description={patientError?.message} action={<button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate('/patients')}>Back to Patients</button>} />;

  return (
    <div className="space-y-6 bg-slate-50/50 p-2 min-h-screen">
      
      {/* Banner & Patient profile card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-slate-150 font-black text-2xl text-slate-500 flex items-center justify-center border border-slate-200">
            {patient.fullName?.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-xl font-black text-slate-850 flex items-center gap-1.5 justify-center sm:justify-start">
              {patient.fullName} <ShieldCheck className="text-emerald-500 fill-emerald-50 bg-white rounded-full" size={18} />
            </h1>
            <p className="text-xs font-semibold text-slate-400">
              UHID: <span className="text-slate-700 font-bold">{patient.patientId}</span> • Patient ID: <span className="text-slate-750 font-bold">PAT-2026-{patient.patientId?.slice(-6)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">VIP Patient</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">Diabetic</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full">Hypertension</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">Regular</span>
            </div>
          </div>
        </div>

        {/* Top summary row stats inside card */}
        <div className="flex items-center gap-6 justify-center xl:justify-end border-t xl:border-t-0 border-slate-100 pt-4 xl:pt-0">
          <div className="text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Visits</span>
            <span className="text-lg font-black text-slate-800">{allAppointments.length}</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-100" />
          <div className="text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Visit</span>
            <span className="text-xs font-black text-slate-800">
              {allAppointments[0]?.appointmentDate ? new Date(allAppointments[0].appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '02 Aug 2026'}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-slate-100" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/appointments/new?patientId=${patient._id}`)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle size={14} /> Book Appointment
            </button>
            <button
              onClick={() => navigate(`/billing/invoices/new?patientId=${patient._id}`)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl transition"
            >
              Create Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Premium Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm scrollbar-none shrink-0">
        {['Overview', 'Appointments', "Today's Visit", 'Medical History', 'Prescriptions', 'Lab Reports', 'Pharmacy Purchases', 'Invoices', 'Notifications', 'Documents', 'Timeline'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1.5 px-3.5 transition text-xs font-bold shrink-0 border-b-2 ${
                isActive ? 'text-emerald-600 border-emerald-500 font-extrabold' : 'text-slate-400 border-transparent hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Split grid area: main tab panel vs summary sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Tab Content Panel */}
        <div className="lg:col-span-9 space-y-6">
          
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Patient Information (DOB, Gender, etc.) */}
                <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Patient Information</h3>
                    <button
                      onClick={() => navigate(`/patients/${patient._id}/edit`)}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Date of Birth</span>
                      <p className="font-semibold text-slate-805">
                        {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('en-GB') : '05 May 2005'} ({patient.age ?? 21} Y)
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Gender</span>
                      <p className="font-semibold text-slate-805">{patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Male'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Blood Group</span>
                      <p className="font-bold text-slate-805 text-rose-500">{patient.bloodGroup || 'O+'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Mobile Phone</span>
                      <p className="font-semibold text-slate-805">{patient.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Email Address</span>
                      <p className="font-semibold text-slate-805 break-all">{patient.email || 'ravi.kumar@email.com'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Aadhaar No.</span>
                      <p className="font-semibold text-slate-805">XXXX XXXX 1234</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Permanent Address</span>
                      <p className="font-semibold text-slate-650 leading-relaxed">
                        {patient.address?.line1 || '123, Chipiyana Buzurg, ABES Road'}, {patient.address?.city || 'Ghaziabad'}, {patient.address?.state || 'Uttar Pradesh'} - {patient.address?.pincode || '201014'}
                      </p>
                    </div>
                    <div className="col-span-2 border-t border-slate-50 pt-2.5">
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Preferred Language</span>
                      <p className="font-semibold text-slate-805">Hindi</p>
                    </div>
                  </div>
                </div>

                {/* Health Summary card (allergies, etc.) */}
                <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Heart className="text-rose-500" size={14} /> Health Summary
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-450 uppercase block">Height</span>
                      <span className="text-sm font-black text-slate-800 mt-1">175 cm</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-450 uppercase block">Weight</span>
                      <span className="text-sm font-black text-slate-800 mt-1">68 kg</span>
                    </div>

                    <div className="col-span-2 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Allergies</span>
                        <div className="flex flex-wrap gap-1.5">
                          {patient.allergies && patient.allergies.length > 0 ? (
                            patient.allergies.map((alg, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold border border-rose-100">
                                {alg}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-200">
                              Penicillin
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Chronic Conditions</span>
                        <div className="flex flex-wrap gap-1.5">
                          {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                            patient.chronicConditions.map((cond, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-100">
                                {cond}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-200">
                              Diabetes, Hypertension
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Today's Active Appointment Widget if scheduled */}
              {todayAppointment && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex flex-col items-center justify-center shadow-md">
                      <span className="text-[10px] font-bold uppercase opacity-80">Token</span>
                      <span className="text-lg font-black">{todayAppointment.tokenNumber || 'T-105'}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Today's Appointment • Checked-In</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Scheduled for <span className="font-bold text-slate-700">{todayAppointment.startTime || todayAppointment.appointmentTime || '10:30 AM'}</span> with <span className="font-bold text-slate-700">{todayAppointment.doctorId?.fullName || 'Dr. Amit Sharma'}</span> ({todayAppointment.doctorId?.specialization || 'General Medicine'})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePrintSlip(todayAppointment)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-emerald-200 text-emerald-600 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                    >
                      <Printer size={13} /> Print Slip
                    </button>
                    <button
                      onClick={() => navigate(`/consultations/${todayAppointment._id}`)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      Start Consult
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Appointments table list */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Recent Consultations</h3>
                  <button onClick={() => setActiveTab('Appointments')} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">View All</button>
                </div>
                <div className="space-y-3">
                  {allAppointments.slice(0, 3).map((appt) => (
                    <div key={appt._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50/50 border border-slate-100 rounded-2xl transition gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-[10px] flex items-center justify-center text-slate-500">
                          {appt.doctorId?.fullName?.slice(0, 2).toUpperCase() || 'DR'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-805">{appt.doctorId?.fullName || 'Dr. Amit Sharma'}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{appt.doctorId?.specialization || 'General Medicine'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-450 font-bold">{new Date(appt.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          appt.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}>{appt.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab & Pharmacy Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Lab orders */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                      <ClipboardList size={14} className="text-blue-500" /> Recent Lab Reports
                    </h3>
                    <button onClick={() => setActiveTab('Lab Reports')} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">View All</button>
                  </div>
                  {recentLabReports.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No lab test history</p>
                  ) : (
                    <div className="space-y-3">
                      {recentLabReports.slice(0, 3).map((lab, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-700">{lab.testName || 'Blood Sugar Test'}</p>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Order ID: L-{idx}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-bold">Completed</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pharmacy purchases */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                      <ShoppingBag size={14} className="text-purple-500" /> Pharmacy Purchases
                    </h3>
                    <button onClick={() => setActiveTab('Pharmacy Purchases')} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">View All</button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No pharmacy purchase records found</p>
                </div>

              </div>

            </div>
          )}

          {/* Appointments tab */}
          {activeTab === 'Appointments' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Appointments History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-1">Date</th>
                      <th className="py-2.5 px-1">Doctor</th>
                      <th className="py-2.5 px-1">Token</th>
                      <th className="py-2.5 px-1">Consultation</th>
                      <th className="py-2.5 px-1">Reason</th>
                      <th className="py-2.5 px-1">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allAppointments.map((appt) => (
                      <tr key={appt._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-1 font-semibold text-slate-650">{new Date(appt.appointmentDate).toLocaleDateString('en-GB')}</td>
                        <td className="py-3 px-1 font-bold text-slate-700">{appt.doctorId?.fullName || 'Dr. Amit Sharma'}</td>
                        <td className="py-3 px-1 font-bold text-emerald-600">{appt.tokenNumber || appt.queueToken || 'N/A'}</td>
                        <td className="py-3 px-1 uppercase text-[10px] font-extrabold text-slate-500">{appt.appointmentType || 'walk_in'}</td>
                        <td className="py-3 px-1 text-slate-600">{appt.reasonForVisit || 'Regular checkup'}</td>
                        <td className="py-3 px-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            appt.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}>{appt.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'Documents' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              
              {/* Upload Panel */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <h4 className="text-xs font-black text-slate-805 uppercase tracking-wider">Upload New Document</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="rounded-xl border border-slate-250 px-3 py-2 text-xs font-semibold text-slate-700 bg-white"
                  >
                    <option value="CBC Report">CBC Report</option>
                    <option value="X-Ray Scan">X-Ray Scan</option>
                    <option value="MRI Report">MRI Report</option>
                    <option value="Insurance PDF">Insurance PDF</option>
                    <option value="Consent Form">Consent Form</option>
                  </select>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="flex-1 bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none"
                  />
                  <button
                    disabled={uploading}
                    onClick={handleUploadDocument}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>

              {/* Gallery list */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-805 uppercase tracking-wider">Document Gallery</h4>
                {documents.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No documents uploaded yet</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="p-4 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between hover:shadow-md transition">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{doc.fileName || 'Report PDF'}</p>
                          <span className="text-[9px] text-slate-400 block mt-1 uppercase font-bold">{doc.type || 'Document'}</span>
                        </div>
                        <div className="flex justify-between items-center mt-4 border-t border-slate-50 pt-2.5">
                          <span className="text-[9px] text-slate-450 font-bold">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <div className="flex gap-1.5">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700"
                            >
                              <Download size={13} />
                            </a>
                            <button
                              onClick={() => handleDeleteDoc(doc._id)}
                              className="p-1 hover:bg-rose-50 border border-slate-200 rounded-lg text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'Invoices' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-805 border-b border-slate-50 pb-2">Billing History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-1">Invoice Number</th>
                      <th className="py-2.5 px-1">Date</th>
                      <th className="py-2.5 px-1">Total Amount</th>
                      <th className="py-2.5 px-1">Amount Paid</th>
                      <th className="py-2.5 px-1">Balance Due</th>
                      <th className="py-2.5 px-1">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold">
                    {invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-1 font-bold text-slate-800">{inv.invoiceNumber}</td>
                        <td className="py-3 px-1 text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-1 text-slate-800">₹{inv.grandTotal}</td>
                        <td className="py-3 px-1 text-emerald-600">₹{inv.amountPaid || 0}</td>
                        <td className="py-3 px-1 text-rose-500">₹{inv.balanceDue || 0}</td>
                        <td className="py-3 px-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>{inv.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'Timeline' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-805 border-b border-slate-50 pb-2">Medical Timeline</h3>
              <div className="relative border-l-2 border-slate-100 pl-6 ml-4 space-y-6">
                
                {/* Registration entry */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-[3px] border-white shadow-sm" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Patient Registered</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '10 Apr 2026'}
                    </p>
                  </div>
                </div>

                {/* Appointments timeline */}
                {allAppointments.map((appt, index) => (
                  <div key={appt._id} className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-[3px] border-white shadow-sm" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Consultation Scheduled</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(appt.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        Assigned to Dr. {appt.doctorId?.fullName || 'Amit Sharma'} ({appt.doctorId?.specialization || 'General Medicine'}). Reason: {appt.reasonForVisit || 'Follow-up consultation'}.
                      </p>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          )}

        </div>

        {/* Sticky Right Sidebar (col-span-3) */}
        <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-4">
          
          {/* Patient Quick Summary */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">Patient Quick Summary</h3>
            <div className="space-y-2 text-xs font-bold text-slate-500">
              <div className="flex justify-between items-center">
                <span>Total Appointments</span>
                <span className="text-slate-800 font-black">{allAppointments.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Completed</span>
                <span className="text-emerald-600">{allAppointments.filter(a => a.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Cancelled</span>
                <span className="text-rose-500">{allAppointments.filter(a => a.status === 'cancelled').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Upcoming</span>
                <span className="text-blue-500">{allAppointments.filter(a => a.status === 'booked').length}</span>
              </div>
            </div>
          </div>

          {/* Outstanding Balance */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold text-slate-550">Total Due</p>
              <h3 className="text-xl font-black text-rose-550">₹{outstandingBills.toFixed(2)}</h3>
            </div>
            <button
              onClick={() => setActiveTab('Invoices')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-xl text-slate-700 transition text-center block"
            >
              View Invoices
            </button>
          </div>

          {/* Recent Notifications */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h3 className="text-xs font-black text-slate-800">Recent Alerts</h3>
            </div>
            <div className="space-y-3.5">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Lab report is ready</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">02 Aug 2026, 05:40 PM</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Appointment reminder</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">02 Aug 2026, 09:00 AM</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Invoice generated</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">30 Jul 2026, 11:20 AM</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default PatientDetailPage;
