import React, { useState, useMemo } from 'react';
import { 
  Building2, ShieldCheck, UserCheck, Stethoscope, User, 
  ArrowRight, Check, Sparkles, TrendingUp, Calendar, 
  IndianRupee, Activity, Clock, FileText, CheckCircle2, 
  Plus, Search, RotateCcw, Bell, Pill, FlaskConical, 
  Boxes, AlertCircle, Eye, Trash2, X, ChevronDown, CheckCircle,
  QrCode, Printer, Filter, HeartPulse, RefreshCw, Send, ShieldAlert,
  Smartphone, BarChart3, Settings as SettingsIcon, Layers, ChevronRight,
  UserPlus, PhoneCall, CreditCard, CheckSquare, FileSpreadsheet, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoProvider, useDemo } from '../../features/demo/DemoContext';

function RoleConnectedInner({ onSetupClinic }) {
  const {
    demoState,
    metrics,
    addDoctor,
    toggleDoctorStatus,
    deleteDoctor,
    addPatient,
    deletePatient,
    createAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    cancelAppointment,
    callNextPatient,
    addWalkInPatient,
    completeConsultation,
    addMedicine,
    adjustStock,
    dispenseMedicine,
    addLabTest,
    updateLabStatus,
    createBill,
    markBillPaid,
    updateClinicSettings,
    resetDemoData,
  } = useDemo();

  // Active Role: owner | admin | receptionist | doctor | patient
  const [activeRole, setActiveRole] = useState('admin');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRoleComparisonModal, setShowRoleComparisonModal] = useState(false);

  // Modals state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showAddApptModal, setShowAddApptModal] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [showCreateBillModal, setShowCreateBillModal] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(null);
  const [showLabReportModal, setShowLabReportModal] = useState(null);
  const [selectedApptForConsult, setSelectedApptForConsult] = useState(null);

  // Forms state
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    specialization: 'General Medicine',
    experience: '8 Years',
    phone: '+91 98765 12345',
    email: '',
    fee: 600,
    status: 'Active',
  });

  const [patientForm, setPatientForm] = useState({
    name: '',
    age: 32,
    gender: 'Male',
    phone: '+91 98123 45678',
    bloodGroup: 'B+',
    history: 'Routine consultation checkup.',
  });

  const [walkInForm, setWalkInForm] = useState({
    name: '',
    age: 28,
    gender: 'Male',
    phone: '+91 98000 22222',
    doctorName: 'Dr. Priya Sharma',
    reason: 'Acute viral throat irritation',
  });

  const [apptForm, setApptForm] = useState({
    patientName: '',
    doctorName: '',
    time: '10:30 AM',
    date: 'Today',
    type: 'General Consultation',
    reason: 'Routine checkup & consultation',
    fee: 500,
  });

  const [medicineForm, setMedicineForm] = useState({
    name: '',
    batch: 'PCM101',
    category: 'Analgesic',
    stock: 100,
    minStock: 25,
    unitPrice: 35,
    expiry: '12/2026',
  });

  const [labForm, setLabForm] = useState({
    testName: 'Complete Blood Count (CBC)',
    patientName: '',
    orderedBy: 'Dr. Priya Sharma',
    sampleType: 'Whole Blood (EDTA)',
    price: 350,
  });

  const [billForm, setBillForm] = useState({
    patientName: '',
    doctorName: 'Dr. Priya Sharma',
    consultationFee: 500,
    includeLab: true,
    labFee: 350,
    includeMed: true,
    medFee: 150,
    discount: 50,
    mode: 'UPI (Instant)',
  });

  const [consultForm, setConsultForm] = useState({
    diagnosis: 'Seasonal Viral Pharyngitis & Fatigue',
    clinicalNotes: 'Throat congestion noted. Vitals stable. Advised rest, warm fluids, and prescribed medications.',
    medicines: [
      { name: 'Paracetamol 500mg', dosage: '1 Tab', frequency: 'Twice daily', duration: '3 Days', instruction: 'After food' },
      { name: 'Cetirizine 10mg', dosage: '1 Tab', frequency: 'Once daily (Night)', duration: '5 Days', instruction: 'After food' },
    ],
    labTests: ['Complete Blood Count (CBC)'],
  });

  const [newMedDraft, setNewMedDraft] = useState({ name: '', dosage: '1 Tab', frequency: 'Twice daily', duration: '3 Days' });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ── ROLE DEFINITIONS & NAVIGATION ──
  const roleConfig = {
    owner: {
      id: 'owner',
      title: 'Clinic Owner',
      headerTitle: 'Clinic Owner Workspace',
      desc: 'High-level real-time oversight of overall clinic growth, revenue, multi-branch performance and doctor productivity.',
      cta: 'Explore Owner Sandbox',
      iconBg: 'bg-[#E8F8F5] text-[#00A878]',
      icon: <Building2 size={24} className="text-[#00A878]" />,
      checklist: [
        'Overall clinic revenue & growth velocity',
        'Doctor utilization & consultation metrics',
        'Multi-branch comparative analytics',
        'Subscription tier & operational limits',
        'Automated executive audit reports',
      ],
      user: { name: 'Dr. Priya Sharma', role: 'Clinic Owner & Medical Director', avatar: 'PS' },
      navItems: [
        { id: 'dashboard', label: 'Executive Overview', icon: <TrendingUp size={13} /> },
        { id: 'branches', label: 'Clinics & Branches', icon: <Building2 size={13} /> },
        { id: 'doctors', label: 'Doctor Utilization', icon: <Stethoscope size={13} /> },
        { id: 'patients', label: 'Patient Growth', icon: <User size={13} /> },
        { id: 'reports', label: 'Financial Reports', icon: <FileText size={13} /> },
        { id: 'subscription', label: 'Plan & Billing', icon: <CreditCard size={13} /> },
        { id: 'settings', label: 'Clinic Settings', icon: <SettingsIcon size={13} /> },
      ],
    },
    admin: {
      id: 'admin',
      title: 'Clinic Admin',
      headerTitle: 'Clinic Admin Workspace',
      desc: 'Complete operational command across appointments, doctors, laboratory diagnostic orders, inventory & billing.',
      cta: 'Explore Admin Sandbox',
      iconBg: 'bg-[#EEF2FF] text-[#4F46E5]',
      icon: <ShieldCheck size={24} className="text-[#4F46E5]" />,
      checklist: [
        'Doctor & staff roster and availability management',
        'Pharmacy stock distribution & auto low-stock alerts',
        'Laboratory test catalog & verified digital reports',
        'Automated billing, taxes & instant settlements',
        'Complete system settings & audit logs',
      ],
      user: { name: 'Rajesh Nair', role: 'Chief Administrator', avatar: 'RN' },
      navItems: [
        { id: 'dashboard', label: 'Operations Dashboard', icon: <TrendingUp size={13} /> },
        { id: 'appointments', label: 'Appointments', icon: <Calendar size={13} /> },
        { id: 'patients', label: 'Patient Directory', icon: <User size={13} /> },
        { id: 'doctors', label: 'Doctor Roster', icon: <Stethoscope size={13} /> },
        { id: 'pharmacy', label: 'Pharmacy', icon: <Pill size={13} /> },
        { id: 'lab', label: 'Laboratory', icon: <FlaskConical size={13} /> },
        { id: 'inventory', label: 'Inventory', icon: <Boxes size={13} /> },
        { id: 'billing', label: 'Billing & Invoices', icon: <IndianRupee size={13} /> },
        { id: 'reports', label: 'Analytics Reports', icon: <FileText size={13} /> },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon size={13} /> },
      ],
    },
    receptionist: {
      id: 'receptionist',
      title: 'Receptionist',
      headerTitle: 'Receptionist Front Desk Workspace',
      desc: 'Rapid token issuance, live waiting room queue management, walk-ins and seamless billing at the front counter.',
      cta: 'Explore Reception Sandbox',
      iconBg: 'bg-[#EFF6FF] text-[#0070F3]',
      icon: <UserCheck size={24} className="text-[#0070F3]" />,
      checklist: [
        "Today's scheduled appointments queue",
        '1-Click patient check-in & token generation',
        '10-second rapid walk-in registration',
        'Real-time doctor on-duty availability',
        'Instant bill printing & POS/UPI collection',
      ],
      user: { name: 'Kavita Menon', role: 'Front Desk Lead', avatar: 'KM' },
      navItems: [
        { id: 'dashboard', label: "Today's Queue & Flow", icon: <TrendingUp size={13} /> },
        { id: 'appointments', label: 'Scheduled Queue', icon: <Calendar size={13} /> },
        { id: 'waiting', label: 'Waiting Patients', icon: <Clock size={13} /> },
        { id: 'checkedin', label: 'Checked-In Tokens', icon: <CheckCircle2 size={13} /> },
        { id: 'walkin', label: 'Walk-In Entry', icon: <UserPlus size={13} /> },
        { id: 'doctors', label: 'Doctors On-Duty', icon: <Stethoscope size={13} /> },
        { id: 'billing', label: 'Collect Payment', icon: <IndianRupee size={13} /> },
      ],
    },
    doctor: {
      id: 'doctor',
      title: 'Doctor',
      headerTitle: 'Doctor Clinical Workspace',
      desc: 'Instant access to patient history, digital prescriptions with 1-click dispensing and smart diagnostic assistance.',
      cta: 'Explore Doctor Sandbox',
      iconBg: 'bg-[#F0FDF4] text-[#16A34A]',
      icon: <Stethoscope size={24} className="text-[#16A34A]" />,
      checklist: [
        'Daily patient consultation queue & token stream',
        'Longitudinal health records & vitals monitoring',
        'Digital prescription builder with dosage calculator',
        'Diagnostic lab ordering with QR verification',
        'AI clinical suggestions & follow-up care alerts',
      ],
      user: { name: 'Dr. Priya Sharma', role: 'Consultant Physician (General Medicine)', avatar: 'PS' },
      navItems: [
        { id: 'dashboard', label: 'Consultation Desk', icon: <TrendingUp size={13} /> },
        { id: 'schedule', label: "Today's Schedule", icon: <Calendar size={13} /> },
        { id: 'patients', label: 'My Patients', icon: <User size={13} /> },
        { id: 'prescriptions', label: 'Prescriptions', icon: <FileText size={13} /> },
        { id: 'lab', label: 'Lab Reports', icon: <FlaskConical size={13} /> },
        { id: 'followups', label: 'Follow-Up List', icon: <Clock size={13} /> },
      ],
    },
    patient: {
      id: 'patient',
      title: 'Patient',
      headerTitle: 'Patient Self-Service Portal',
      desc: 'Self-service appointment booking, digital prescriptions, verified lab reports with QR and instant payment receipts.',
      cta: 'Explore Patient Portal',
      iconBg: 'bg-[#FAF5FF] text-[#9333EA]',
      icon: <User size={24} className="text-[#9333EA]" />,
      checklist: [
        'Online appointment booking & instant reminders',
        'Instant access to digital prescriptions',
        'Download verified lab reports with secure QR',
        'View payment receipts & settlement history',
        'Automated follow-up care alerts',
      ],
      user: { name: 'Ramesh Kumar', role: 'Verified Patient (UHID: SUN-2041)', avatar: 'RK' },
      navItems: [
        { id: 'dashboard', label: 'My Health Portal', icon: <TrendingUp size={13} /> },
        { id: 'appointments', label: 'My Appointments', icon: <Calendar size={13} /> },
        { id: 'prescriptions', label: 'My Prescriptions', icon: <FileText size={13} /> },
        { id: 'lab', label: 'My Lab Reports', icon: <FlaskConical size={13} /> },
        { id: 'bills', label: 'Bills & Receipts', icon: <IndianRupee size={13} /> },
        { id: 'history', label: 'Medical History', icon: <HeartPulse size={13} /> },
      ],
    },
  };

  const currentRole = roleConfig[activeRole] || roleConfig.admin;

  // Handlers
  const handleAddDoctorSubmit = (e) => {
    e.preventDefault();
    if (addDoctor(doctorForm)) {
      setDoctorForm({
        name: '',
        specialization: 'General Medicine',
        experience: '8 Years',
        phone: '+91 98765 12345',
        email: '',
        fee: 600,
        status: 'Active',
      });
      setShowAddDoctorModal(false);
    }
  };

  const handleAddPatientSubmit = (e) => {
    e.preventDefault();
    if (addPatient(patientForm)) {
      setPatientForm({
        name: '',
        age: 32,
        gender: 'Male',
        phone: '+91 98123 45678',
        bloodGroup: 'B+',
        history: 'Routine consultation checkup.',
      });
      setShowAddPatientModal(false);
    }
  };

  const handleWalkInSubmit = (e) => {
    e.preventDefault();
    addWalkInPatient(walkInForm);
    setShowWalkInModal(false);
    setWalkInForm({
      name: '',
      age: 28,
      gender: 'Male',
      phone: '+91 98000 22222',
      doctorName: 'Dr. Priya Sharma',
      reason: 'Acute throat pain & fever',
    });
  };

  const handleAddApptSubmit = (e) => {
    e.preventDefault();
    const pName = apptForm.patientName || demoState.patients[0]?.name || 'Ramesh Kumar';
    const dName = apptForm.doctorName || demoState.doctors[0]?.name || 'Dr. Priya Sharma';
    if (createAppointment({ ...apptForm, patientName: pName, doctorName: dName })) {
      setShowAddApptModal(false);
    }
  };

  const handleAddMedicineSubmit = (e) => {
    e.preventDefault();
    if (addMedicine(medicineForm)) {
      setMedicineForm({
        name: '',
        batch: `PCM${Math.floor(100 + Math.random() * 900)}`,
        category: 'Analgesic',
        stock: 100,
        minStock: 25,
        unitPrice: 35,
        expiry: '12/2026',
      });
      setShowAddMedicineModal(false);
    }
  };

  const handleAddLabSubmit = (e) => {
    e.preventDefault();
    const pName = labForm.patientName || demoState.patients[0]?.name || 'Ramesh Kumar';
    if (addLabTest({ ...labForm, patientName: pName })) {
      setShowAddLabModal(false);
    }
  };

  const handleCreateBillSubmit = (e) => {
    e.preventDefault();
    const pName = billForm.patientName || demoState.patients[0]?.name || 'Ramesh Kumar';
    const sub = (Number(billForm.consultationFee) || 500) + 
                (billForm.includeLab ? (Number(billForm.labFee) || 350) : 0) + 
                (billForm.includeMed ? (Number(billForm.medFee) || 150) : 0);
    const disc = Number(billForm.discount) || 0;
    const total = Math.max(0, sub - disc);
    
    const services = ['Doctor Consultation'];
    if (billForm.includeLab) services.push('Diagnostic Lab Test');
    if (billForm.includeMed) services.push('Pharmacy Prescriptions');

    if (createBill({
      patientName: pName,
      doctorName: billForm.doctorName,
      services,
      subtotal: sub,
      discount: disc,
      amount: total,
      mode: billForm.mode,
      status: 'PAID',
    })) {
      setShowCreateBillModal(false);
    }
  };

  const handleStartConsult = (appt) => {
    setSelectedApptForConsult(appt);
    setShowConsultModal(true);
  };

  const handleCompleteConsultSubmit = (e) => {
    e.preventDefault();
    if (!selectedApptForConsult) return;
    completeConsultation(selectedApptForConsult.id, consultForm);
    setShowConsultModal(false);
    setSelectedApptForConsult(null);
  };

  const handleAddMedToConsult = () => {
    if (!newMedDraft.name.trim()) return;
    setConsultForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { ...newMedDraft, instruction: 'After meals' }],
    }));
    setNewMedDraft({ name: '', dosage: '1 Tab', frequency: 'Twice daily', duration: '3 Days' });
  };

  return (
    <section id="roles" className="py-16 sm:py-20 lg:py-24 bg-[#F8FAFC] relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Heading & Link */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#0070F3] text-xs font-bold mb-3 shadow-xs">
              <Sparkles size={13} className="text-[#0070F3]" />
              <span>Multi-Role Connected Healthcare Sandbox</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#071B3A] tracking-tight">
              One Platform. <span className="text-[#0070F3]">Every Role Connected.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-2 max-w-2xl font-normal">
              Switch roles to experience each person's tailored workspace. Add doctors as Admin, check-in patients as Receptionist, prescribe as Doctor, and view records as Patient — all seamlessly linked in browser memory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRoleComparisonModal(true)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0070F3] hover:text-[#0051CC] transition shrink-0 group cursor-pointer"
            >
              <span>See Role Comparison</span>
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => onSetupClinic && onSetupClinic()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0070F3] text-white text-xs sm:text-sm font-bold hover:bg-[#0051CC] transition shrink-0 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <span>Setup Your Clinic</span>
            </button>
          </div>
        </div>

        {/* ── ROLE SELECTOR BUTTONS (MAIN CONTROLLER) ── */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {[
            { id: 'owner', label: 'Clinic Owner', icon: <Building2 size={16} /> },
            { id: 'admin', label: 'Clinic Admin', icon: <ShieldCheck size={16} /> },
            { id: 'receptionist', label: 'Receptionist', icon: <UserCheck size={16} /> },
            { id: 'doctor', label: 'Doctor', icon: <Stethoscope size={16} /> },
            { id: 'patient', label: 'Patient', icon: <User size={16} /> },
          ].map((role) => {
            const isActive = role.id === activeRole;
            return (
              <button
                key={role.id}
                onClick={() => {
                  setActiveRole(role.id);
                  setActiveNav('dashboard');
                }}
                className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#0070F3] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/20'
                    : 'bg-white hover:bg-slate-50 text-[#334155] border border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {role.icon}
                <span>{role.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* ── MAIN ROLE SHOWCASE CARD (SPLIT LAYOUT) ── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 lg:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* ── LEFT COLUMN: ROLE INFO & CHECKLIST (4 Cols) ── */}
            <div className="lg:col-span-4 flex flex-col items-start text-left bg-slate-50/60 border border-slate-100 p-5 sm:p-6 rounded-2xl">
              <div className={`w-13 h-13 rounded-2xl ${currentRole.iconBg} flex items-center justify-center mb-4 shadow-xs`}>
                {currentRole.icon}
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-[#071B3A]">
                  {currentRole.title}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                  Active Role
                </span>
              </div>
              
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed mb-5 font-normal">
                {currentRole.desc}
              </p>

              {/* Checklist */}
              <div className="space-y-2.5 w-full mb-6">
                {currentRole.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] font-semibold text-[#1E293B]">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-[#0070F3] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Role Quick Switch User Card */}
              <div className="w-full p-3 rounded-xl bg-white border border-slate-200 mb-5 shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Simulated Active User</div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    {currentRole.user.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-tight">{currentRole.user.name}</div>
                    <div className="text-[10px] text-slate-500 leading-tight">{currentRole.user.role}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2">
                <button
                  onClick={() => onSetupClinic && onSetupClinic()}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0070F3] hover:bg-[#0051CC] text-white font-bold text-xs sm:text-sm transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  <span>Launch Production Clinic</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            </div>

            {/* ── RIGHT COLUMN: AUTHENTIC ROLE-SPECIFIC WORKSPACE (8 Cols) ── */}
            <div className="lg:col-span-8 bg-[#0F172A] border border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-xl overflow-hidden">
              
              {/* Top Sandbox Status Bar */}
              <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/90 rounded-xl border border-slate-800 mb-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    DEMO MODE • {currentRole.title.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">• Local Browser Memory</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-300">
                    {demoState.clinic.name}
                  </span>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    title="Reset all demo data"
                    className="p-1 rounded-md bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                
                {/* 1. ROLE-SPECIFIC SIDEBAR */}
                <div className="w-full sm:w-44 bg-[#0B132B] border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between shrink-0">
                  <div className="space-y-3">
                    {/* Brand */}
                    <div className="flex items-center gap-2 px-1 py-1 pb-2 border-b border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black text-[11px] shadow-xs">
                        AI
                      </div>
                      <div className="leading-tight truncate">
                        <div className="text-xs font-black text-white tracking-wider">AI-CMS</div>
                        <div className="text-[9px] text-blue-400 font-bold truncate">{currentRole.title}</div>
                      </div>
                    </div>

                    {/* Dynamic Role Navigation Items */}
                    <nav className="space-y-0.5">
                      {currentRole.navItems.map((item) => {
                        const isNavActive = activeNav === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveNav(item.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition text-left cursor-pointer ${
                              isNavActive
                                ? 'bg-[#0070F3] text-white shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {item.icon}
                              <span className="truncate">{item.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Sidebar Footer */}
                  <div className="pt-2 border-t border-slate-800/80 mt-2">
                    <div className="text-[9px] text-slate-500 font-bold px-1">
                      {currentRole.user.name}
                    </div>
                  </div>
                </div>

                {/* 2. ROLE-SPECIFIC DASHBOARD CANVAS */}
                <div className="flex-1 bg-white rounded-xl p-3 sm:p-4 space-y-3.5 min-h-[460px] flex flex-col justify-between overflow-hidden">
                  
                  {/* Top Bar inside Canvas */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      
                      {/* Search Bar */}
                      <div className="relative flex-1 min-w-[160px] max-w-xs">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder={`Search in ${currentRole.title}...`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      {/* Header Actions & Profile */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 relative transition cursor-pointer"
                          >
                            <Bell size={13} />
                            {demoState.notifications.some(n => !n.read) && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
                            )}
                          </button>

                          {showNotifications && (
                            <div className="absolute right-0 top-8 z-30 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 space-y-2 animate-in fade-in">
                              <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                                <span className="text-xs font-black text-slate-900">Live Activity Feed</span>
                                <span className="text-[10px] text-blue-600 font-bold">{demoState.notifications.length} items</span>
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {demoState.notifications.slice(0, 5).map((n) => (
                                  <div key={n.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10.5px]">
                                    <div className="font-bold text-slate-800">{n.title}</div>
                                    <div className="text-slate-500 text-[10px] leading-tight mt-0.5">{n.message}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                          <div className="text-right hidden sm:block">
                            <div className="text-[11px] font-black text-slate-900 leading-tight">{currentRole.user.name}</div>
                            <div className="text-[9px] text-slate-500 leading-tight">{currentRole.user.role}</div>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                            {currentRole.user.avatar}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── 3. ROLE-SPECIFIC TOP METRIC CARDS ── */}
                    {activeRole === 'owner' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <span className="text-[9.5px] font-bold text-slate-500 truncate block">Total Gross Revenue</span>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{formatCurrency(metrics.totalRevenue)}</div>
                          <span className="text-[8.5px] font-semibold text-emerald-600 block mt-0.5">↑ 14.8% Monthly Growth</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <span className="text-[9.5px] font-bold text-slate-500 truncate block">Registered Patients</span>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{metrics.totalPatients} Patients</div>
                          <span className="text-[8.5px] font-semibold text-emerald-600 block mt-0.5">Across 2 Branches</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <span className="text-[9.5px] font-bold text-slate-500 truncate block">Doctor Capacity</span>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{metrics.activeDoctors} / {metrics.totalDoctors} On-Duty</div>
                          <span className="text-[8.5px] font-semibold text-blue-600 block mt-0.5">88% Utilization Rate</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <span className="text-[9.5px] font-bold text-slate-500 truncate block">Enterprise Tier</span>
                          <div className="text-sm sm:text-base font-black text-indigo-600 mt-0.5 truncate">AI Multi-Clinic</div>
                          <span className="text-[8.5px] font-semibold text-slate-500 block mt-0.5">Active Subscription</span>
                        </div>
                      </div>
                    )}

                    {activeRole === 'admin' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <div className="flex justify-between items-center">
                            <span className="text-[9.5px] font-bold text-slate-500 truncate">Today's Revenue</span>
                            <span className="text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">Live</span>
                          </div>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{formatCurrency(metrics.totalRevenue)}</div>
                          <span className="text-[8.5px] font-semibold text-slate-400 block mt-0.5">{demoState.bills.filter(b => b.status === 'PAID').length} Invoices</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <div className="flex justify-between items-center">
                            <span className="text-[9.5px] font-bold text-slate-500 truncate">Doctors Active</span>
                            <button onClick={() => setShowAddDoctorModal(true)} className="text-[8.5px] font-bold text-blue-600 hover:underline">+ Add</button>
                          </div>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{metrics.activeDoctors} Doctors</div>
                          <span className="text-[8.5px] font-semibold text-emerald-600 block mt-0.5">{metrics.totalDoctors} Total Roster</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <div className="flex justify-between items-center">
                            <span className="text-[9.5px] font-bold text-slate-500 truncate">Appointments</span>
                            <button onClick={() => setShowAddApptModal(true)} className="text-[8.5px] font-bold text-blue-600 hover:underline">+ Book</button>
                          </div>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{metrics.totalAppointments} Bookings</div>
                          <span className="text-[8.5px] font-semibold text-blue-600 block mt-0.5">{metrics.checkedInAppointments} Checked-in</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <div className="flex justify-between items-center">
                            <span className="text-[9.5px] font-bold text-slate-500 truncate">Pending Dues</span>
                            <button onClick={() => setShowCreateBillModal(true)} className="text-[8.5px] font-bold text-blue-600 hover:underline">+ Bill</button>
                          </div>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{metrics.pendingBillsCount} ({formatCurrency(metrics.pendingBillsAmount)})</div>
                          <span className="text-[8.5px] font-semibold text-rose-500 block mt-0.5">Awaiting POS/UPI</span>
                        </div>
                      </div>
                    )}

                    {activeRole === 'receptionist' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                          <span className="text-[9.5px] font-bold text-blue-700 truncate block">Today's Total Queue</span>
                          <div className="text-sm sm:text-base font-black text-blue-900 mt-0.5 truncate">{metrics.totalAppointments} Scheduled</div>
                          <span className="text-[8.5px] font-semibold text-blue-600 block mt-0.5">Tokens T-01 to T-0{metrics.totalAppointments}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                          <span className="text-[9.5px] font-bold text-amber-700 truncate block">Waiting in Lobby</span>
                          <div className="text-sm sm:text-base font-black text-amber-900 mt-0.5 truncate">{metrics.waitingAppointments} Patients</div>
                          <span className="text-[8.5px] font-semibold text-amber-600 block mt-0.5">Avg Wait: 6 mins</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                          <span className="text-[9.5px] font-bold text-emerald-700 truncate block">Checked-In Tokens</span>
                          <div className="text-sm sm:text-base font-black text-emerald-900 mt-0.5 truncate">{metrics.checkedInAppointments} Checked-In</div>
                          <span className="text-[8.5px] font-semibold text-emerald-600 block mt-0.5">Ready for Doctor</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <span className="text-[9.5px] font-bold text-slate-500 truncate block">Doctors On-Duty</span>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">{metrics.activeDoctors} Available</div>
                          <span className="text-[8.5px] font-semibold text-emerald-600 block mt-0.5">In Consultation OPDs</span>
                        </div>
                      </div>
                    )}

                    {activeRole === 'doctor' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                          <span className="text-[9.5px] font-bold text-blue-700 truncate block">My Daily OPD Queue</span>
                          <div className="text-sm sm:text-base font-black text-blue-900 mt-0.5 truncate">{demoState.appointments.filter(a => a.doctorName.includes('Priya')).length} Patients</div>
                          <span className="text-[8.5px] font-semibold text-blue-600 block mt-0.5">General Medicine</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                          <span className="text-[9.5px] font-bold text-emerald-700 truncate block">Completed Consults</span>
                          <div className="text-sm sm:text-base font-black text-emerald-900 mt-0.5 truncate">{metrics.completedAppointments} Completed</div>
                          <span className="text-[8.5px] font-semibold text-emerald-600 block mt-0.5">Rx & Invoices Issued</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100">
                          <span className="text-[9.5px] font-bold text-purple-700 truncate block">Prescriptions Written</span>
                          <div className="text-sm sm:text-base font-black text-purple-900 mt-0.5 truncate">{demoState.prescriptions.length} Digital Rx</div>
                          <span className="text-[8.5px] font-semibold text-purple-600 block mt-0.5">Auto-sent to Pharmacy</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                          <span className="text-[9.5px] font-bold text-amber-700 truncate block">Diagnostic Tests</span>
                          <div className="text-sm sm:text-base font-black text-amber-900 mt-0.5 truncate">{metrics.completedLabTests} Verified</div>
                          <span className="text-[8.5px] font-semibold text-amber-600 block mt-0.5">{metrics.pendingLabTests} in lab queue</span>
                        </div>
                      </div>
                    )}

                    {activeRole === 'patient' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                          <span className="text-[9.5px] font-bold text-blue-700 truncate block">Next Appointment</span>
                          <div className="text-sm sm:text-base font-black text-blue-900 mt-0.5 truncate">Today, 10:00 AM</div>
                          <span className="text-[8.5px] font-semibold text-blue-600 block mt-0.5">Dr. Priya Sharma</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100">
                          <span className="text-[9.5px] font-bold text-purple-700 truncate block">Active Prescriptions</span>
                          <div className="text-sm sm:text-base font-black text-purple-900 mt-0.5 truncate">{demoState.prescriptions.length} Records</div>
                          <span className="text-[8.5px] font-semibold text-purple-600 block mt-0.5">Dosage & schedules</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                          <span className="text-[9.5px] font-bold text-emerald-700 truncate block">Lab Reports (QR)</span>
                          <div className="text-sm sm:text-base font-black text-emerald-900 mt-0.5 truncate">{metrics.completedLabTests} Verified</div>
                          <span className="text-[8.5px] font-semibold text-emerald-600 block mt-0.5">Ready to Download</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                          <span className="text-[9.5px] font-bold text-slate-500 truncate block">Billing Settlement</span>
                          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">
                            {demoState.bills.find(b => b.patientName.includes('Ramesh') && b.status === 'PENDING') ? '₹500 Due' : 'All Settled'}
                          </div>
                          <span className="text-[8.5px] font-semibold text-emerald-600 block mt-0.5">UPI Receipts Available</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── 4. ROLE-SPECIFIC MAIN WORKSPACE CANVAS ── */}
                  <div className="flex-1">
                    
                    {/* ── VIEW A: CLINIC OWNER WORKSPACE ── */}
                    {activeRole === 'owner' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          {/* Multi-Branch Performance */}
                          <div className="sm:col-span-7 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black text-slate-800">Branch Performance & Revenue</span>
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Indiranagar vs MG Road</span>
                            </div>
                            
                            <div className="space-y-2 text-[10.5px]">
                              <div>
                                <div className="flex justify-between text-slate-700 font-bold mb-1">
                                  <span>Main Indiranagar Centre</span>
                                  <span>₹3,42,000 (68%)</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                  <div className="h-full bg-blue-600 rounded-full w-[68%]" />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-slate-700 font-bold mb-1">
                                  <span>South Branch (Koramangala)</span>
                                  <span>₹1,40,320 (32%)</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full w-[32%]" />
                                </div>
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-200/60 flex justify-between text-[9px] text-slate-500">
                              <span>Patient Footfall: <strong>+22% YoY</strong></span>
                              <span>Doctor Hours: <strong>94% on-schedule</strong></span>
                            </div>
                          </div>

                          {/* Doctor Productivity */}
                          <div className="sm:col-span-5 p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                            <span className="text-[11px] font-black text-slate-800 mb-1">Doctor Utilization Roster</span>
                            <div className="space-y-1.5 text-[10px]">
                              {demoState.doctors.slice(0, 3).map((d) => (
                                <div key={d.id} className="flex justify-between items-center p-1.5 rounded-lg bg-white border border-slate-100">
                                  <div>
                                    <div className="font-bold text-slate-900">{d.name}</div>
                                    <div className="text-[9px] text-slate-400">{d.specialization}</div>
                                  </div>
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-black text-[8.5px]">
                                    {d.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Executive Actions */}
                        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="text-blue-900 text-[11px] font-semibold">
                            📈 <strong>Owner Controls:</strong> You have full visibility across financial revenue, doctor availability, and multi-location branch telemetry.
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setShowAddDoctorModal(true)}
                              className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700"
                            >
                              + Add New Doctor
                            </button>
                            <button
                              onClick={() => setActiveRole('admin')}
                              className="px-3 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 font-bold text-[10px] hover:bg-blue-50"
                            >
                              Open Admin Ops →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── VIEW B: CLINIC ADMIN WORKSPACE ── */}
                    {activeRole === 'admin' && (
                      <div className="space-y-3">
                        {/* Quick Operational Actions Bar */}
                        <div className="flex flex-wrap items-center gap-1.5 pb-1">
                          <button
                            onClick={() => setShowAddDoctorModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 shadow-xs cursor-pointer"
                          >
                            + Add Doctor
                          </button>
                          <button
                            onClick={() => setShowAddPatientModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                          >
                            + Add Patient
                          </button>
                          <button
                            onClick={() => setShowAddApptModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                          >
                            + Book Appt
                          </button>
                          <button
                            onClick={() => setShowAddMedicineModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                          >
                            + Pharmacy Item
                          </button>
                          <button
                            onClick={() => setShowAddLabModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                          >
                            + Lab Test
                          </button>
                          <button
                            onClick={() => setShowCreateBillModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-[10px] cursor-pointer"
                          >
                            + Generate Bill
                          </button>
                        </div>

                        {/* Admin Operational Stream */}
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left text-[10.5px]">
                            <thead className="bg-slate-50 text-slate-500 font-bold">
                              <tr>
                                <th className="py-1.5 px-2">Token</th>
                                <th className="py-1.5 px-2">Patient</th>
                                <th className="py-1.5 px-2">Doctor</th>
                                <th className="py-1.5 px-2">Time</th>
                                <th className="py-1.5 px-2">Status</th>
                                <th className="py-1.5 px-2 text-right">Quick Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {demoState.appointments.slice(0, 4).map((apt) => (
                                <tr key={apt.id} className="hover:bg-slate-50">
                                  <td className="py-1.5 px-2 font-black text-blue-600">{apt.token}</td>
                                  <td className="py-1.5 px-2 font-bold text-slate-900">{apt.patientName}</td>
                                  <td className="py-1.5 px-2 text-slate-600">{apt.doctorName}</td>
                                  <td className="py-1.5 px-2 text-slate-500">{apt.time}</td>
                                  <td className="py-1.5 px-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                      apt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                                      apt.status === 'CHECKED_IN' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {apt.status.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 text-right">
                                    {apt.status === 'SCHEDULED' && (
                                      <button
                                        onClick={() => updateAppointmentStatus(apt.id, 'CHECKED_IN')}
                                        className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold hover:bg-blue-600 hover:text-white"
                                      >
                                        Check In
                                      </button>
                                    )}
                                    {apt.status === 'CHECKED_IN' && (
                                      <button
                                        onClick={() => handleStartConsult(apt)}
                                        className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold hover:bg-emerald-600 hover:text-white"
                                      >
                                        Consult
                                      </button>
                                    )}
                                    {apt.status === 'COMPLETED' && (
                                      <span className="text-[9px] font-bold text-emerald-600">✓ Settled</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ── VIEW C: RECEPTIONIST FRONT DESK WORKSPACE ── */}
                    {activeRole === 'receptionist' && (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">Front Desk Waiting Lobby</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black">
                              {metrics.waitingAppointments} in queue
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={callNextPatient}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 shadow-xs cursor-pointer"
                            >
                              <PhoneCall size={11} />
                              <span>Call Next Token</span>
                            </button>
                            <button
                              onClick={() => setShowWalkInModal(true)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 shadow-xs cursor-pointer"
                            >
                              <UserPlus size={11} />
                              <span>+ Add Walk-In</span>
                            </button>
                          </div>
                        </div>

                        {/* Reception Queue Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {demoState.appointments.map((apt) => (
                            <div key={apt.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 flex flex-col justify-between text-[10.5px]">
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-black text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 text-[9.5px]">
                                    {apt.token}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase ${
                                    apt.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700' : 
                                    apt.status === 'COMPLETED' ? 'bg-slate-200 text-slate-700' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {apt.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="font-bold text-slate-900 truncate">{apt.patientName}</div>
                                <div className="text-[9px] text-slate-500 truncate">{apt.doctorName} • {apt.time}</div>
                              </div>

                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                                <span className="text-[9px] text-slate-400">{apt.type}</span>
                                {apt.status === 'SCHEDULED' && (
                                  <button
                                    onClick={() => updateAppointmentStatus(apt.id, 'CHECKED_IN')}
                                    className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[8.5px] hover:bg-blue-700"
                                  >
                                    Check-In
                                  </button>
                                )}
                                {apt.status === 'CHECKED_IN' && (
                                  <span className="text-[8.5px] font-bold text-emerald-600">Waiting for Doctor</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Doctors Availability Stream for Receptionist */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-700">Doctors In OPD Rooms:</span>
                          <div className="flex items-center gap-2">
                            {demoState.doctors.map((d) => (
                              <span key={d.id} className="inline-flex items-center gap-1 font-semibold text-slate-800">
                                <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                {d.name.split(' ')[1]} ({d.status})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── VIEW D: DOCTOR CLINICAL WORKSPACE ── */}
                    {activeRole === 'doctor' && (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-slate-900">Dr. Priya Sharma's Consultation Room</span>
                            <span className="text-[10px] text-slate-500 ml-2">(General Medicine OPD)</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                            🟢 Online & Consulting
                          </span>
                        </div>

                        {/* Consultation Queue Cards */}
                        <div className="space-y-1.5">
                          {demoState.appointments.slice(0, 3).map((apt) => (
                            <div key={apt.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-blue-600">{apt.token}</span>
                                  <span className="font-bold text-slate-900">{apt.patientName}</span>
                                  <span className="text-[9.5px] text-slate-500">• {apt.time}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
                                    apt.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {apt.status}
                                  </span>
                                </div>
                                <div className="text-[9.5px] text-slate-600 italic">
                                  Chief Complaint: {apt.reason}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {apt.status !== 'COMPLETED' ? (
                                  <button
                                    onClick={() => handleStartConsult(apt)}
                                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] shadow-xs cursor-pointer"
                                  >
                                    Start Consultation →
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setShowPrescriptionModal(demoState.prescriptions[0])}
                                    className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[9px]"
                                  >
                                    View Issued Rx
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Doctor Recent Patient Vitals Widget */}
                        <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[10px] text-blue-900 flex justify-between items-center">
                          <span>🩺 <strong>Active Clinical Case:</strong> Ramesh Kumar • BP 126/82 • SpO2 99% • Pulse 74 bpm • Normal Cardiac Rhythm</span>
                          <button
                            onClick={() => handleStartConsult(demoState.appointments[0])}
                            className="font-bold text-blue-700 hover:underline"
                          >
                            Open Prescription Pad
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── VIEW E: PATIENT PORTAL WORKSPACE ── */}
                    {activeRole === 'patient' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-slate-900">Welcome, Ramesh Kumar</span>
                            <span className="text-[10px] text-slate-500 ml-2">(UHID: SUN-2041)</span>
                          </div>
                          <button
                            onClick={() => setShowAddApptModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700"
                          >
                            + Book New Appointment
                          </button>
                        </div>

                        {/* Patient Dashboard 3 Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px]">
                          
                          {/* 1. Upcoming Appointment */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700">Upcoming Visit</span>
                                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[8.5px] font-black">Today</span>
                              </div>
                              <div className="font-bold text-slate-900 mt-1">Dr. Priya Sharma</div>
                              <div className="text-[9.5px] text-slate-500">General Medicine • 10:00 AM</div>
                            </div>
                            <div className="flex items-center gap-1 pt-1 border-t border-slate-200">
                              <button
                                onClick={() => rescheduleAppointment(demoState.appointments[0]?.id, '03:30 PM', 'Tomorrow')}
                                className="flex-1 py-1 rounded bg-white border border-slate-200 text-slate-700 font-bold text-[9px] hover:bg-slate-100"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => cancelAppointment(demoState.appointments[0]?.id)}
                                className="px-2 py-1 rounded bg-rose-50 text-rose-600 font-bold text-[9px] hover:bg-rose-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>

                          {/* 2. Digital Prescription */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700">Digital Prescription</span>
                                <span className="text-[8.5px] text-emerald-600 font-bold">✓ Active</span>
                              </div>
                              <div className="font-bold text-slate-900 mt-1">Rx #RX-2026-9041</div>
                              <div className="text-[9.5px] text-slate-500">Paracetamol, Cetirizine</div>
                            </div>
                            <button
                              onClick={() => setShowPrescriptionModal(demoState.prescriptions[0])}
                              className="w-full py-1 rounded bg-blue-50 text-blue-700 font-bold text-[9px] hover:bg-blue-100 text-center"
                            >
                              View Prescription →
                            </button>
                          </div>

                          {/* 3. Verified Lab Report with QR */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700">Verified Lab Report</span>
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] text-blue-600 font-black">
                                  <QrCode size={9} /> QR Verified
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 mt-1">CBC Blood Count</div>
                              <div className="text-[9.5px] text-slate-500">Hb: 14.6 g/dL (Normal)</div>
                            </div>
                            <button
                              onClick={() => setShowLabReportModal(demoState.labOrders[0])}
                              className="w-full py-1 rounded bg-emerald-50 text-emerald-700 font-bold text-[9px] hover:bg-emerald-100 text-center"
                            >
                              Download Report (QR)
                            </button>
                          </div>

                        </div>

                        {/* Patient Billing Bar */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-900">OPD Consultation & Pharmacy Bill: </span>
                            <span className="text-blue-600 font-black">{formatCurrency(850)}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                            ✓ Settled via UPI (Receipt #INV-2026-101)
                          </span>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Sandbox Footer Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Cross-role state synchronized in browser storage
                    </span>
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="text-rose-500 hover:underline font-bold cursor-pointer"
                    >
                      Reset Demo Data
                    </button>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ── MODAL: ROLE COMPARISON ── */}
        {showRoleComparisonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">AI-CMS Multi-Role Connected Ecosystem</h3>
                  <p className="text-xs text-slate-500">Every team member has a dedicated, interconnected workspace.</p>
                </div>
                <button onClick={() => setShowRoleComparisonModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Main Responsibility</th>
                      <th className="p-2.5">Key Capabilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 size={14} className="text-[#00A878]" /> Clinic Owner
                      </td>
                      <td className="p-2.5">Business & Clinic Performance</td>
                      <td className="p-2.5">Multi-branch metrics, revenue, doctor utilization, growth telemetry.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#4F46E5]" /> Clinic Admin
                      </td>
                      <td className="p-2.5">Clinic Operations</td>
                      <td className="p-2.5">Staff roster, appointments, inventory, pharmacy, diagnostics, billing.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <UserCheck size={14} className="text-[#0070F3]" /> Receptionist
                      </td>
                      <td className="p-2.5">Patient Flow & Queue</td>
                      <td className="p-2.5">Token issuance, walk-in register, lobby queue, check-in, POS collection.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <Stethoscope size={14} className="text-[#16A34A]" /> Doctor
                      </td>
                      <td className="p-2.5">Consultation & Treatment</td>
                      <td className="p-2.5">EMR records, vitals, digital prescription writer, lab test ordering.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <User size={14} className="text-[#9333EA]" /> Patient
                      </td>
                      <td className="p-2.5">Healthcare Access</td>
                      <td className="p-2.5">Self-booking, digital prescriptions, QR-verified lab reports, receipts.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowRoleComparisonModal(false)}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
                >
                  Close Comparison
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: ADD WALK-IN (RECEPTIONIST) ── */}
        {showWalkInModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">10-Second Walk-In Registration</h3>
                <button onClick={() => setShowWalkInModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleWalkInSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Patient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikas Sharma"
                    value={walkInForm.name}
                    onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Age & Gender</label>
                    <input
                      type="number"
                      placeholder="Age"
                      value={walkInForm.age}
                      onChange={(e) => setWalkInForm({ ...walkInForm, age: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Doctor</label>
                    <select
                      value={walkInForm.doctorName}
                      onChange={(e) => setWalkInForm({ ...walkInForm, doctorName: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                    >
                      {demoState.doctors.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Chief Symptom / Reason</label>
                  <input
                    type="text"
                    value={walkInForm.reason}
                    onChange={(e) => setWalkInForm({ ...walkInForm, reason: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowWalkInModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Generate Token & Check-In
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: DOCTOR CONSULTATION ── */}
        {showConsultModal && selectedApptForConsult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-3 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Physician Consultation Pad</h3>
                  <p className="text-[11px] text-blue-600 font-bold">{selectedApptForConsult.patientName} ({selectedApptForConsult.token})</p>
                </div>
                <button onClick={() => setShowConsultModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCompleteConsultSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-800 block mb-0.5">Clinical Diagnosis</label>
                  <input
                    type="text"
                    required
                    value={consultForm.diagnosis}
                    onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-0.5">Doctor Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={consultForm.clinicalNotes}
                    onChange={(e) => setConsultForm({ ...consultForm, clinicalNotes: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-700 outline-none"
                  />
                </div>

                {/* Prescribed Medicines Builder */}
                <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
                  <span className="font-black text-blue-900 text-xs block">Prescribed Medicines</span>
                  
                  <div className="space-y-1">
                    {consultForm.medicines.map((m, i) => (
                      <div key={i} className="p-1.5 rounded-lg bg-white border border-blue-100 flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-800">{m.name}</span>
                        <span className="text-[10px] text-slate-500">{m.dosage} • {m.frequency}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add extra medicine draft */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Add medicine (e.g. Amoxicillin 250mg)"
                      value={newMedDraft.name}
                      onChange={(e) => setNewMedDraft({ ...newMedDraft, name: e.target.value })}
                      className="flex-1 p-1.5 rounded-lg bg-white border border-blue-200 text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={handleAddMedToConsult}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowConsultModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                  >
                    Complete & Issue Rx
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: VIEW PRESCRIPTION (PATIENT / DOCTOR) ── */}
        {showPrescriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Digital Prescription</h3>
                  <p className="text-[10px] text-slate-500">{showPrescriptionModal.prescriptionNumber || 'RX-2026-9041'}</p>
                </div>
                <button onClick={() => setShowPrescriptionModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-800">Doctor: {showPrescriptionModal.doctorName}</div>
                  <div className="text-[11px] text-slate-500">Diagnosis: <strong>{showPrescriptionModal.diagnosis}</strong></div>
                  <div className="text-[10px] text-slate-600 mt-1 italic">{showPrescriptionModal.notes}</div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-700 text-[11px]">Medications</span>
                  {showPrescriptionModal.medicines?.map((m, i) => (
                    <div key={i} className="p-1.5 rounded-lg bg-blue-50/50 border border-blue-100 flex justify-between text-[11px]">
                      <span className="font-bold text-slate-800">{m.name}</span>
                      <span className="text-[10px] text-slate-600">{m.dosage} • {m.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowPrescriptionModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
                >
                  Close Prescription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: VIEW LAB REPORT (PATIENT) ── */}
        {showLabReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <QrCode size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{showLabReportModal.testName}</h3>
                    <p className="text-[10px] text-emerald-600 font-bold">QR Verified Digital Diagnostic Report</p>
                  </div>
                </div>
                <button onClick={() => setShowLabReportModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <strong className="text-slate-900">{showLabReportModal.patientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sample:</span>
                    <strong className="text-slate-900">{showLabReportModal.sampleType}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-black text-[9px]">
                      {showLabReportModal.status}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                  <span className="font-bold text-blue-900 block mb-0.5">Clinical Analysis Summary</span>
                  <p className="text-[11px] text-slate-700">{showLabReportModal.resultSummary}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowLabReportModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: ADD DOCTOR (ADMIN) ── */}
        {showAddDoctorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add New Doctor to Demo</h3>
                <button onClick={() => setShowAddDoctorModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddDoctorSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Doctor Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Rahul Mehta"
                    value={doctorForm.name}
                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Specialization</label>
                    <select
                      value={doctorForm.specialization}
                      onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Dental">Dental</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Ophthalmology">Ophthalmology</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      value={doctorForm.fee}
                      onChange={(e) => setDoctorForm({ ...doctorForm, fee: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddDoctorModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Add Doctor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: ADD PATIENT (ADMIN) ── */}
        {showAddPatientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Register Demo Patient</h3>
                <button onClick={() => setShowAddPatientModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddPatientSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Suresh Kumar"
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Age</label>
                    <input
                      type="number"
                      value={patientForm.age}
                      onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Gender</label>
                    <select
                      value={patientForm.gender}
                      onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Blood Group</label>
                    <select
                      value={patientForm.bloodGroup}
                      onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    >
                      <option value="A+">A+</option>
                      <option value="B+">B+</option>
                      <option value="O+">O+</option>
                      <option value="AB+">AB+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddPatientModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Save Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: BOOK APPOINTMENT ── */}
        {showAddApptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Schedule Demo Appointment</h3>
                <button onClick={() => setShowAddApptModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddApptSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Select Patient</label>
                  <select
                    value={apptForm.patientName}
                    onChange={(e) => setApptForm({ ...apptForm, patientName: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    {demoState.patients.map((p) => (
                      <option key={p.id} value={p.name}>{p.name} ({p.gender}, {p.age} Yrs)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Select Doctor</label>
                  <select
                    value={apptForm.doctorName}
                    onChange={(e) => setApptForm({ ...apptForm, doctorName: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    {demoState.doctors.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} — {d.specialization}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Time Slot</label>
                    <input
                      type="text"
                      value={apptForm.time}
                      onChange={(e) => setApptForm({ ...apptForm, time: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Consultation Fee</label>
                    <input
                      type="number"
                      value={apptForm.fee}
                      onChange={(e) => setApptForm({ ...apptForm, fee: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddApptModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Book Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: ADD MEDICINE (PHARMACY) ── */}
        {showAddMedicineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Demo Medicine</h3>
                <button onClick={() => setShowAddMedicineModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddMedicineSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Medicine Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Azithromycin 500mg"
                    value={medicineForm.name}
                    onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Initial Stock</label>
                    <input
                      type="number"
                      value={medicineForm.stock}
                      onChange={(e) => setMedicineForm({ ...medicineForm, stock: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-0.5">Unit Price (₹)</label>
                    <input
                      type="number"
                      value={medicineForm.unitPrice}
                      onChange={(e) => setMedicineForm({ ...medicineForm, unitPrice: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddMedicineModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Add to Inventory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: ORDER LAB TEST ── */}
        {showAddLabModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Order Diagnostic Lab Test</h3>
                <button onClick={() => setShowAddLabModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddLabSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Test Name</label>
                  <select
                    value={labForm.testName}
                    onChange={(e) => setLabForm({ ...labForm, testName: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                    <option value="HbA1c Glycated Hemoglobin">HbA1c Glycated Hemoglobin</option>
                    <option value="Lipid Profile (Serum)">Lipid Profile (Serum)</option>
                    <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Patient</label>
                  <select
                    value={labForm.patientName}
                    onChange={(e) => setLabForm({ ...labForm, patientName: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    {demoState.patients.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddLabModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Place Lab Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: CREATE BILL (BILLING) ── */}
        {showCreateBillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Generate Demo Bill</h3>
                <button onClick={() => setShowCreateBillModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateBillSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Patient</label>
                  <select
                    value={billForm.patientName}
                    onChange={(e) => setBillForm({ ...billForm, patientName: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    {demoState.patients.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <span>Doctor Consultation</span>
                    <span>₹{billForm.consultationFee}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billForm.includeLab}
                        onChange={(e) => setBillForm({ ...billForm, includeLab: e.target.checked })}
                      />
                      <span>CBC Blood Test</span>
                    </label>
                    <span>₹{billForm.labFee}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billForm.includeMed}
                        onChange={(e) => setBillForm({ ...billForm, includeMed: e.target.checked })}
                      />
                      <span>Pharmacy Medicines</span>
                    </label>
                    <span>₹{billForm.medFee}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-200">
                    <span>Discount:</span>
                    <span className="text-rose-600">-₹{billForm.discount}</span>
                  </div>
                  <div className="flex justify-between items-center font-black text-slate-900 text-sm pt-1 border-t border-slate-200">
                    <span>Total Demo Bill:</span>
                    <span className="text-blue-600">
                      ₹{Math.max(0, 
                        (Number(billForm.consultationFee) || 500) + 
                        (billForm.includeLab ? 350 : 0) + 
                        (billForm.includeMed ? 150 : 0) - 
                        (Number(billForm.discount) || 50)
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 italic">
                  * Demo transaction — simulated payment in browser memory.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateBillModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Create & Settle Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: RESET CONFIRMATION ── */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle size={20} />
                <h3 className="text-sm font-black text-slate-900">Reset Demo Sandbox?</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This will reset all doctors, patients, appointments, prescriptions, pharmacy stock and lab tests back to the original demo dataset. Your real application and accounts remain untouched.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resetDemoData();
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  Yes, Reset Demo
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

export default function RoleConnectedSection({ onSetupClinic }) {
  return (
    <DemoProvider>
      <RoleConnectedInner onSetupClinic={onSetupClinic} />
    </DemoProvider>
  );
}
