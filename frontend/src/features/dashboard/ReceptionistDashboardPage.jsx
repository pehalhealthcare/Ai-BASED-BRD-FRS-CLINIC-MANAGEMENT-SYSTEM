import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Search,
  Bell,
  ChevronRight,
  UserCheck,
  Activity,
  FileText,
  CheckCircle2,
  Stethoscope,
  TrendingUp,
  CreditCard,
  QrCode,
  Maximize,
  Upload,
  ArrowRight,
  Building,
  ChevronDown
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { appointmentApi } from '../../lib/api';
import { getDashboardOverview } from './dashboardApi';
import { Html5Qrcode } from 'html5-qrcode';
import DiscountApprovalQueue from './DiscountApprovalQueue';
import PendingProcedurePayments from './PendingProcedurePayments';

const ReceptionistDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search, Filter and Selection States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Offline', 'Online', 'Completed'
  const [selectedDoctor, setSelectedDoctor] = useState('All Doctors');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scannedPatient, setScannedPatient] = useState(null);
  const [html5QrCode, setHtml5QrCode] = useState(null);

  // Stats / Dashboard Data states
  const [stats, setStats] = useState({
    totalAppointments: 24,
    completed: 10,
    upcoming: 14,
    walkIn: 3,
    revenue: 28450,
    waiting: 8,
    checkedIn: 5,
    pendingBills: 7,
    pendingReports: 4
  });

  const [appointments, setAppointments] = useState([]);

  // Fetch real data on load
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [overviewRes, apptsRes] = await Promise.all([
          getDashboardOverview().catch(() => null),
          appointmentApi.getAppointments({ limit: 100, date: todayStr }).catch(() => null)
        ]);

        if (overviewRes?.data?.cards) {
          const cards = overviewRes.data.cards;
          setStats((prev) => ({
            ...prev,
            totalAppointments: cards.todayAppointments ?? prev.totalAppointments,
            completed: cards.completedConsultations ?? prev.completed,
            upcoming: cards.pendingAppointments ?? prev.upcoming,
            pendingBills: cards.pendingInvoices ?? prev.pendingBills,
            pendingReports: cards.labOrders ?? prev.pendingReports
          }));
        }

        if (apptsRes?.data) {
          const formatted = apptsRes.data.map((app, index) => {
            const timeStr = app.slotId?.startTime 
              ? new Date(app.slotId.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : app.startTime || '09:00 AM';
            
            return {
              id: app._id || String(index + 1),
              time: timeStr,
              startTime: app.startTime || '09:00',
              duration: app.slotId?.durationMinutes ? `${app.slotId.durationMinutes} min` : `${app.durationMinutes || 15} min`,
              patientName: app.patientId?.userId?.name || app.patientName || 'Walk-In Patient',
              initials: (app.patientId?.userId?.name || 'WP').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
              age: app.patientId?.age || 30,
              gender: app.patientId?.gender || 'Male',
              phone: app.patientId?.userId?.phone || app.patientId?.phone || '9876543210',
              doctorName: app.doctorId?.userId?.name || 'Dr. Alpha Doctor',
              specialty: app.doctorId?.specialty || 'General Physician',
              type: app.appointmentType === 'teleconsultation' ? 'Online' : 'Offline',
              status: app.status === 'booked' ? 'Confirmed' : app.status === 'checked_in' ? 'Arrived' : app.status === 'completed' ? 'Completed' : 'Upcoming',
              rawStatus: app.status || 'booked',
              tokenNumber: app.meta?.tokenNumber
            };
          });
          setAppointments(formatted);
        }
      } catch (err) {
        console.error("Error loading receptionist dashboard api data: ", err);
      }
    };

    fetchDashboardData();
  }, []);

  // Filtered & Sorted Appointments
  const filteredAppointments = useMemo(() => {
    const list = appointments.filter((app) => {
      const matchesSearch =
        app.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.phone.includes(searchQuery);

      let matchesTab = true;
      if (activeTab === 'Offline') matchesTab = app.type === 'Offline';
      if (activeTab === 'Online') matchesTab = app.type === 'Online';
      if (activeTab === 'Completed') matchesTab = app.status === 'Completed';

      const matchesDoctor =
        selectedDoctor === 'All Doctors' || app.doctorName === selectedDoctor;

      return matchesSearch && matchesTab && matchesDoctor;
    });

    const getCategoryAndOrder = (app) => {
      const status = app.rawStatus?.toLowerCase() || 'booked';
      // Category 0: Booked / Confirmed / Scheduled (upcoming)
      if (['booked', 'confirmed', 'scheduled'].includes(status)) {
        return { category: 0, ascending: true };
      }
      // Category 1: Checked-In / Arrived / Called / In-Consultation
      if (['checked_in', 'late_check_in', 'called', 'in_consultation'].includes(status)) {
        return { category: 1, ascending: false };
      }
      // Category 2: Completed
      if (status === 'completed') {
        return { category: 2, ascending: false };
      }
      // Category 3: Rescheduled
      if (['rescheduled', 'patient_rescheduled', 'clinic_rescheduled'].includes(status)) {
        return { category: 3, ascending: false };
      }
      // Category 4: Cancelled / No show
      if (['cancelled', 'patient_cancelled', 'clinic_cancelled', 'no_show'].includes(status)) {
        return { category: 4, ascending: false };
      }
      return { category: 5, ascending: true };
    };

    return [...list].sort((a, b) => {
      const catA = getCategoryAndOrder(a);
      const catB = getCategoryAndOrder(b);

      if (catA.category !== catB.category) {
        return catA.category - catB.category;
      }

      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      if (catA.ascending) {
        return timeA.localeCompare(timeB); // Chronological ascending
      } else {
        return timeB.localeCompare(timeA); // Descending order
      }
    });
  }, [appointments, searchQuery, activeTab, selectedDoctor]);

  const uniqueDoctors = useMemo(() => {
    const docNames = appointments.map((a) => a.doctorName);
    return ['All Doctors', ...new Set(docNames)];
  }, [appointments]);

  const handleManualCheckIn = async (appointmentId, isEmergency = false) => {
    try {
      const res = await appointmentApi.checkInPatient(appointmentId, { method: 'Reception', isEmergency });
      alert(`Check-in successful! Token generated: ${res.token?.tokenNumber}`);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in failed.');
    }
  };

  const handlePrintToken = (app) => {
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    printWindow.document.write(`
      <html>
        <head>
          <title>Token Receipt</title>
          <style>
            body { font-family: monospace; text-align: center; padding: 20px; color: #000; }
            .token { font-size: 48px; font-weight: bold; margin: 20px 0; border: 2px dashed #000; padding: 10px; }
            .details { font-size: 14px; text-align: left; margin: 20px auto; max-width: 250px; line-height: 1.6; }
            .footer { font-size: 11px; margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>AI-CMS CLINIC</h2>
          <p>QUEUE TOKEN RECEIPT</p>
          <div class="token">${app.tokenNumber || 'T-XXX'}</div>
          <div class="details">
            <strong>Patient:</strong> ${app.patientName}<br/>
            <strong>Doctor:</strong> ${app.doctorName}<br/>
            <strong>Date/Time:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Appt Time:</strong> ${app.time}
          </div>
          <div class="footer">
            Please wait for your token to be called.<br/>Thank you!
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleScanCheckin = async (token) => {
    try {
      setScanning(true);
      const res = await appointmentApi.scanCheckin({ token });
      setScanSuccess(true);
      setScannedPatient({
        name: res.patientName || 'Checked-in Patient',
        phone: res.roomNumber || 'Assigned Room',
        status: `Token: ${res.tokenNumber || 'Success'}`,
        roomNumber: res.roomNumber,
        tokenNumber: res.tokenNumber,
        doctorName: res.doctorName,
        clinicName: res.clinicName
      });
      
      // Update appointments list status
      setAppointments((prev) =>
        prev.map((app) =>
          app.id === res.appointment?._id || app.patientName.includes(res.patientName)
            ? { ...app, status: 'Arrived', tokenNumber: res.tokenNumber }
            : app
        )
      );

      // Increment stats
      setStats((prev) => ({
        ...prev,
        checkedIn: prev.checkedIn + 1,
        waiting: prev.waiting + 1
      }));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Check-in verification failed.');
      setShowScannerModal(false);
    } finally {
      setScanning(false);
    }
  };

  const handleOpenScanner = () => {
    setShowScannerModal(true);
    setScanning(true);
    setScanSuccess(false);
    setScannedPatient(null);
  };

  const closeScannerModal = async () => {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
      } catch (e) {}
      setHtml5QrCode(null);
    }
    setShowScannerModal(false);
    setScanning(false);
    setScanSuccess(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setShowScannerModal(true);
    setScanning(true);
    setScanSuccess(false);
    setScannedPatient(null);

    const html5QrCodeForFile = new Html5Qrcode("dashboard-qr-reader-file-temp");
    try {
      const decodedText = await html5QrCodeForFile.scanFile(file, true);
      await handleScanCheckin(decodedText);
    } catch (err) {
      console.error("File scanning error: ", err);
      alert("No QR/barcode found in the uploaded image. Please try again.");
      setShowScannerModal(false);
    } finally {
      try {
        html5QrCodeForFile.clear();
      } catch (e) {}
    }
  };

  useEffect(() => {
    let qrScanner = null;
    if (showScannerModal && scanning && !scanSuccess) {
      const timer = setTimeout(async () => {
        const element = document.getElementById("dashboard-qr-reader");
        if (element) {
          try {
            qrScanner = new Html5Qrcode("dashboard-qr-reader");
            setHtml5QrCode(qrScanner);
            await qrScanner.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 }
              },
              async (decodedText) => {
                try {
                  await qrScanner.stop();
                } catch (e) {}
                setHtml5QrCode(null);
                handleScanCheckin(decodedText);
              },
              (errorMessage) => {
                // ignore
              }
            );
          } catch (err) {
            console.error("Scanner start error: ", err);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showScannerModal, scanning, scanSuccess]);

  useEffect(() => {
    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(err => console.error("Error stopping qr scanner on unmount: ", err));
      }
    };
  }, [html5QrCode]);

  return (
    <div className="space-y-6 pb-12 bg-[#F8FAFC] min-h-screen text-slate-800 p-2 md:p-4">
      {/* Upper Status/Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50/80 rounded-xl text-teal-600">
            <CalendarIcon size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Today's Appointments
            </h1>
            <p className="text-xs text-slate-500 font-medium">Dashboard Overview</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex items-center gap-4 flex-1 max-w-md md:ml-8">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search patient, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-200/60 rounded text-[10px] font-bold text-slate-500 select-none">
              Ctrl + K
            </span>
          </div>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-4">
          <button className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-all">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700">
            <Building size={14} className="text-slate-500" />
            <span>AI-CMS Health Clinic</span>
            <span className="text-[10px] text-slate-400 font-medium">Gurugram</span>
            <ChevronDown size={12} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* Row of Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Appointments</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalAppointments}</h3>
            </div>
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
              <CalendarIcon size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">Today, 26 Jun 2026</span>
            <Link to="/appointments" className="text-[11px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-0.5">
              View all
            </Link>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.completed}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span>41.7% of total</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: '41.7%' }} />
            </div>
          </div>
        </div>

        {/* Card 3: Upcoming */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.upcoming}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span>58.3% remaining</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: '58.3%' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Walk-In Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Walk-In Patients</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.walkIn}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-500">
              <User size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50">
            <span className="text-[11px] text-slate-400 font-semibold">Today</span>
          </div>
        </div>

        {/* Card 5: Today's Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</p>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">₹ {stats.revenue.toLocaleString()}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">From 18 invoices</span>
            <Link to="/billing" className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-0.5">
              View details
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Left List vs Right Sidebar Panels */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        
        {/* Left Side: Appointments List Card */}
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Today's Appointments</h2>
              <p className="text-xs text-slate-400">Live scheduling queue</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                {['All', 'Offline', 'Online', 'Completed'].map((tab) => {
                  const count =
                    tab === 'All'
                      ? appointments.length
                      : tab === 'Offline'
                      ? appointments.filter((a) => a.type === 'Offline').length
                      : tab === 'Online'
                      ? appointments.filter((a) => a.type === 'Online').length
                      : appointments.filter((a) => a.status === 'Completed').length;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === tab
                          ? 'bg-white text-teal-655 shadow-sm font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Doctor filter dropdown */}
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {uniqueDoctors.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc === 'All Doctors' ? 'All Doctors' : doc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List items */}
          <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CalendarIcon className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm font-semibold">No appointments match search filters</p>
              </div>
            ) : (
              filteredAppointments.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all gap-4"
                >
                  {/* Time info & Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="text-left shrink-0">
                      <p className="text-sm font-bold text-indigo-900">{app.time}</p>
                      <p className="text-[11px] text-slate-400 font-semibold">{app.duration}</p>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                      {app.initials}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 leading-tight">{app.patientName}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        {app.age} Y, {app.gender} <span className="mx-1">•</span> {app.phone}
                      </p>
                    </div>
                  </div>

                  {/* Doctor assign */}
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-teal-500/20 rounded-full shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-850 leading-tight">{app.doctorName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{app.specialty}</p>
                    </div>
                  </div>

                  {/* Type Badge & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-xs text-slate-400 font-semibold">{app.type}</span>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          app.status === 'Arrived'
                            ? 'bg-amber-100 text-amber-600'
                            : app.status === 'Confirmed'
                            ? 'bg-teal-50 text-teal-600'
                            : app.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {app.status}
                      </span>
                      {(app.tokenNumber || app.meta?.tokenNumber) && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500 text-white tracking-wide uppercase">
                          Token {app.tokenNumber || app.meta?.tokenNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {['Arrived', 'Completed'].includes(app.status) || app.tokenNumber ? (
                        <>
                          <button
                            onClick={() => handlePrintToken(app)}
                            className="px-3 py-1.5 rounded-xl border border-indigo-500/20 hover:border-indigo-500 text-indigo-600 text-[11px] font-bold bg-indigo-50/50 transition-all"
                          >
                            Print Token
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleManualCheckIn(app.id, false)}
                            className="px-3 py-1.5 rounded-xl bg-teal-650 hover:bg-teal-700 text-white text-[11px] font-bold transition-all"
                          >
                            Check-In
                          </button>
                          <button
                            onClick={() => handleManualCheckIn(app.id, true)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-all"
                          >
                            Emergency
                          </button>
                          <button
                            onClick={handleOpenScanner}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-teal-500 text-slate-600 hover:text-teal-600 text-[11px] font-bold bg-slate-50 transition-all"
                          >
                            <QrCode size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-center">
            <Link to="/appointments" className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
              View all appointments
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Right Side: QR Scanner Widget, Discount Approvals & Donut Stats */}
        <div className="space-y-6">
          
          {/* Discount Approval Queue */}
          <DiscountApprovalQueue onDecisionMade={() => {}} />

          {/* Pending Procedure Payments Queue */}
          <PendingProcedurePayments onPaymentSuccess={() => window.location.reload()} />

          {/* Card 1: Scanner Code */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scan Patient QR Code</h3>
              <p className="text-[11px] text-slate-400">Scan the QR code provided by patient</p>
            </div>

            {/* Video mock box */}
            <div className="aspect-[1.8/1] rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-4 border border-teal-500/20 rounded-xl flex items-center justify-center">
                <div className="w-12 h-12 border-t-2 border-l-2 border-teal-500 absolute top-0 left-0 rounded-tl-lg" />
                <div className="w-12 h-12 border-t-2 border-r-2 border-teal-500 absolute top-0 right-0 rounded-tr-lg" />
                <div className="w-12 h-12 border-b-2 border-l-2 border-teal-500 absolute bottom-0 left-0 rounded-bl-lg" />
                <div className="w-12 h-12 border-b-2 border-r-2 border-teal-500 absolute bottom-0 right-0 rounded-br-lg" />
                
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent absolute top-1/2 left-0 shadow-[0_0_8px_#2dd4bf] animate-[bounce_3s_infinite]" />

                <QrCode size={26} className="text-teal-500/30 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] text-slate-500 mt-2 z-10 font-bold uppercase tracking-wider">Camera Feed Offline</span>
            </div>

            <button
              onClick={handleOpenScanner}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#00A884] hover:bg-[#009675] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Maximize size={14} />
              Open Scanner
            </button>

            <div className="flex items-center justify-center gap-3">
              <div className="h-px bg-slate-100 flex-1" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">OR</span>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            <label className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer">
              <Upload size={13} />
              <span>Upload QR Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Card 2: Appointment Summary Donut Chart */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Appointment Summary</h3>
              <p className="text-[11px] text-slate-400">Today's metrics break-up</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-24 h-24 shrink-0 relative flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                  
                  <circle
                    cx="18" cy="18" r="15.915"
                    fill="none" stroke="#0ea5e9" strokeWidth="3"
                    strokeDasharray="75 100" strokeDashoffset="0"
                  />
                  <circle
                    cx="18" cy="18" r="15.915"
                    fill="none" stroke="#3b82f6" strokeWidth="3"
                    strokeDasharray="25 100" strokeDashoffset="-75"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xs text-slate-400 font-semibold block leading-none">Total</span>
                  <span className="text-base font-extrabold text-slate-800">24</span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5 text-xs font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span>Offline</span>
                  </div>
                  <span className="text-slate-800 font-bold">18 (75%)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Online</span>
                  </div>
                  <span className="text-slate-800 font-bold">6 (25%)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Completed</span>
                  </div>
                  <span className="text-slate-800 font-bold">10 (41.7%)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Upcoming</span>
                  </div>
                  <span className="text-slate-800 font-bold">14 (58.3%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Notifications */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Notifications</h3>
                <p className="text-[11px] text-slate-400">Live operational alerts</p>
              </div>
              <Link to="/dashboard/notifications" className="text-[11px] text-teal-600 hover:text-teal-700 font-bold">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-0.5 shrink-0">
                  <User size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 leading-tight">New walk-in patient registered</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Rahul Verma</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">10 mins ago</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg mt-0.5 shrink-0">
                  <CalendarIcon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 leading-tight">Appointment rescheduled</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Amit Singh - 26 Jun, 11:30 AM</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">1 hour ago</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg mt-0.5 shrink-0">
                  <FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 leading-tight">Lab report ready</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Neha Gupta - Blood Test</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">2 hours ago</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Waiting Patients widget */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl shrink-0">
              <User size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting Patients</p>
              <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.waiting}</h3>
            </div>
          </div>
          <Link to="/patients?status=waiting" className="text-[10px] text-teal-600 hover:text-teal-700 font-bold block shrink-0">
            View Details
          </Link>
        </div>

        {/* Checked-In widget */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl shrink-0">
              <UserCheck size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checked-In</p>
              <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.checkedIn}</h3>
            </div>
          </div>
          <Link to="/patients?status=checked-in" className="text-[10px] text-teal-600 hover:text-teal-700 font-bold block shrink-0">
            View Details
          </Link>
        </div>

        {/* Pending Bills widget */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-500 rounded-xl shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Bills</p>
              <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.pendingBills}</h3>
            </div>
          </div>
          <Link to="/billing" className="text-[10px] text-teal-600 hover:text-teal-700 font-bold block shrink-0">
            View Details
          </Link>
        </div>

        {/* Pending Reports widget */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 text-violet-500 rounded-xl shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Reports</p>
              <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.pendingReports}</h3>
            </div>
          </div>
          <Link to="/labs/orders" className="text-[10px] text-teal-600 hover:text-teal-700 font-bold block shrink-0">
            View Details
          </Link>
        </div>
      </div>

      {/* Simulated Scanner Success Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto text-teal-600">
              <QrCode size={30} className={scanning ? 'animate-pulse' : ''} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">{scanning ? 'Scanning QR Code...' : 'Scan Successful'}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {scanning ? 'Align the QR code within the scanner viewfinder.' : 'The patient details have been processed.'}
              </p>
            </div>

            {scanning ? (
              <div className="py-2 flex justify-center w-full">
                <div id="dashboard-qr-reader" className="w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 aspect-square"></div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left text-xs font-semibold space-y-2">
                <p className="text-slate-400">PATIENT DETAILS</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-800 font-bold">{scannedPatient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Room</span>
                  <span className="text-slate-800 font-bold">{scannedPatient?.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="text-emerald-600 font-bold">{scannedPatient?.status}</span>
                </div>
              </div>
            )}

            <button
              onClick={closeScannerModal}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition-all"
            >
              {scanning ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      )}
      <div id="dashboard-qr-reader-file-temp" style={{ display: 'none' }}></div>
    </div>
  );
};

export default ReceptionistDashboardPage;
