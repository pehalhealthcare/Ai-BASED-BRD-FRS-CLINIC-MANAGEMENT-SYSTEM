import React, { useState, useMemo } from 'react';
import { 
  Building2, ShieldCheck, UserCheck, Stethoscope, User, 
  ArrowRight, Check, Sparkles, TrendingUp, Calendar, 
  IndianRupee, Activity, Clock, FileText, CheckCircle2, 
  Plus, Search, RotateCcw, Bell, Pill, FlaskConical, 
  Boxes, AlertCircle, Eye, Trash2, X, ChevronDown, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoProvider, useDemo } from '../../features/demo/DemoContext';

function RoleConnectedInner({ onSetupClinic }) {
  const {
    demoState,
    metrics,
    createAppointment,
    updateAppointmentStatus,
    addDoctor,
    toggleDoctorStatus,
    completeConsultation,
    dispenseMedicine,
    markBillPaid,
    resetDemoData,
  } = useDemo();

  const [activeRole, setActiveRole] = useState('owner'); // owner | admin | receptionist | doctor | patient
  const [activeNav, setActiveNav] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [selectedApptForConsult, setSelectedApptForConsult] = useState(null);
  const [showNewApptModal, setShowNewApptModal] = useState(false);

  // New Appt form
  const [newApptForm, setNewApptForm] = useState({
    patientName: 'Rohan Mehta',
    doctorName: 'Dr. Priya Sharma',
    time: '11:30 AM',
    date: 'Today',
    type: 'General Consultation',
    reason: 'Routine checkup',
  });

  // Consult form
  const [consultForm, setConsultForm] = useState({
    diagnosis: 'Mild Seasonal Rhinitis',
    clinicalNotes: 'Patient complains of mild congestion. Clear chest, vitals stable.',
    medicines: [
      { name: 'Paracetamol 500mg', dosage: '1 Tab', frequency: 'Twice daily', duration: '3 Days', instruction: 'After food' },
      { name: 'Cetirizine 10mg', dosage: '1 Tab', frequency: 'Once daily (Night)', duration: '5 Days', instruction: 'After food' },
    ],
    labTests: ['Complete Blood Count (CBC)'],
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Role info configuration matching reference image design
  const roleConfig = {
    owner: {
      title: 'Clinic Owner',
      desc: 'Get a complete view of your clinic without getting involved in every detail.',
      cta: 'See Owner Dashboard',
      iconBg: 'bg-[#E8F8F5] text-[#00A878]',
      icon: <Building2 size={24} className="text-[#00A878]" />,
      checklist: [
        'Overall clinic performance',
        'Revenue & patient growth',
        'Doctor utilization & reports',
        'Multiple clinics/branches',
        'Subscription & plan management',
      ],
      user: { name: 'Dr. Priya Sharma', role: 'Clinic Owner', avatar: 'PS' },
    },
    admin: {
      title: 'Clinic Admin',
      desc: 'Complete operational control across doctors, staff, laboratory, inventory and billing.',
      cta: 'See Admin Dashboard',
      iconBg: 'bg-[#EEF2FF] text-[#4F46E5]',
      icon: <ShieldCheck size={24} className="text-[#4F46E5]" />,
      checklist: [
        'Doctor & staff roster management',
        'Inventory & pharmacy distribution',
        'Laboratory test catalog & verified reports',
        'Automated billing, taxes & permissions',
        'Comprehensive audit logs & analytics',
      ],
      user: { name: 'Rajesh Nair', role: 'Clinic Administrator', avatar: 'RN' },
    },
    receptionist: {
      title: 'Receptionist',
      desc: 'Quick check-ins, live token queue management and seamless billing at the front desk.',
      cta: 'See Reception Desk',
      iconBg: 'bg-[#EFF6FF] text-[#0070F3]',
      icon: <UserCheck size={24} className="text-[#0070F3]" />,
      checklist: [
        'Today’s scheduled appointments queue',
        'One-click patient check-in & token issue',
        '10-second walk-in registration',
        'Real-time doctor on-duty status',
        'Instant bill printing & payment collection',
      ],
      user: { name: 'Kavita Menon', role: 'Front Desk Lead', avatar: 'KM' },
    },
    doctor: {
      title: 'Doctor',
      desc: 'Instant access to patient history, digital prescriptions and smart AI diagnostic assistance.',
      cta: 'See Doctor Workspace',
      iconBg: 'bg-[#F0FDF4] text-[#16A34A]',
      icon: <Stethoscope size={24} className="text-[#16A34A]" />,
      checklist: [
        'Daily patient consultation queue',
        'Longitudinal health records & past visits',
        'Digital prescription with 1-click dispensing',
        'Lab test ordering with QR verification',
        'AI clinical insights & drug interaction check',
      ],
      user: { name: 'Dr. Priya Sharma', role: 'Consultant Physician', avatar: 'PS' },
    },
    patient: {
      title: 'Patient',
      desc: 'Empower patients with self-service appointment booking, verified reports and digital prescriptions.',
      cta: 'See Patient Portal',
      iconBg: 'bg-[#FAF5FF] text-[#9333EA]',
      icon: <User size={24} className="text-[#9333EA]" />,
      checklist: [
        'Online appointment booking & reminders',
        'Instant access to digital prescriptions',
        'Download verified lab reports with QR',
        'View payment receipts & dues history',
        'Automated follow-up care alerts',
      ],
      user: { name: 'Rohan Mehta', role: 'Verified Patient (UHID: APX-1082)', avatar: 'RM' },
    },
  };

  const currentRole = roleConfig[activeRole] || roleConfig.owner;

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return demoState.appointments;
    const q = searchQuery.toLowerCase();
    return demoState.appointments.filter(
      (a) =>
        a.patientName?.toLowerCase().includes(q) ||
        a.doctorName?.toLowerCase().includes(q) ||
        a.reason?.toLowerCase().includes(q)
    );
  }, [demoState.appointments, searchQuery]);

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

  const handleNewApptSubmit = (e) => {
    e.preventDefault();
    createAppointment(newApptForm);
    setShowNewApptModal(false);
  };

  return (
    <section id="roles" className="py-16 sm:py-20 lg:py-24 bg-[#F8FAFC] relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Heading & Link */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#071B3A] tracking-tight">
              One Platform. <span className="text-[#0070F3]">Every Role Connected.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-2 max-w-2xl font-normal">
              Designed for everyone in your clinic, from owners to patients.
            </p>
          </div>

          <button
            onClick={() => onSetupClinic && onSetupClinic()}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0070F3] hover:text-[#0051CC] transition shrink-0 group cursor-pointer"
          >
            <span>See Role Comparison</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* ── ROLE SELECTOR BUTTONS (MATCHING REFERENCE DESIGN EXACTLY) ── */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-6 no-scrollbar">
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
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#0070F3] text-white shadow-md shadow-blue-500/20'
                    : 'bg-white hover:bg-slate-50 text-[#334155] border border-slate-200/90'
                }`}
              >
                {role.icon}
                <span>{role.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── MAIN ROLE SHOWCASE CARD (EXACT SPLIT LAYOUT AS REFERENCE) ── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* ── LEFT COLUMN: ROLE INFO & CHECKLIST (4 Cols) ── */}
            <div className="lg:col-span-4 flex flex-col items-start text-left">
              {/* Icon badge */}
              <div className={`w-14 h-14 rounded-2xl ${currentRole.iconBg} flex items-center justify-center mb-5 shadow-xs`}>
                {currentRole.icon}
              </div>

              <h3 className="text-2xl font-black text-[#071B3A] mb-2.5">
                {currentRole.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed mb-6 font-normal">
                {currentRole.desc}
              </p>

              {/* Checklist */}
              <div className="space-y-3 w-full mb-8">
                {currentRole.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] font-semibold text-[#1E293B]">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-[#0070F3] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSetupClinic && onSetupClinic()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#0070F3] text-[#0070F3] hover:bg-blue-50 font-bold text-xs sm:text-sm transition-all hover:shadow-xs cursor-pointer"
              >
                <span>{currentRole.cta}</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* ── RIGHT COLUMN: HIGH-FIDELITY CLINIC DASHBOARD (8 Cols) ── */}
            <div className="lg:col-span-8 bg-[#F8FAFC] border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3">
                
                {/* 1. Mini Dark Sidebar (Matching Reference Design) */}
                <div className="w-full sm:w-44 bg-[#0A192F] text-slate-300 rounded-2xl p-3 flex flex-col justify-between shrink-0">
                  <div className="space-y-4">
                    {/* Brand */}
                    <div className="flex items-center gap-2 px-1 py-1 pb-2 border-b border-slate-800">
                      <div className="w-5 h-5 rounded-md bg-[#0070F3] flex items-center justify-center text-white font-black text-[10px]">
                        AI
                      </div>
                      <span className="text-xs font-black text-white tracking-wider">AI-CMS</span>
                    </div>

                    {/* Nav Links */}
                    <nav className="space-y-1">
                      {[
                        { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={13} /> },
                        { id: 'appointments', label: 'Appointments', icon: <Calendar size={13} /> },
                        { id: 'patients', label: 'Patients', icon: <User size={13} /> },
                        { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={13} /> },
                        { id: 'pharmacy', label: 'Pharmacy', icon: <Pill size={13} /> },
                        { id: 'lab', label: 'Lab', icon: <FlaskConical size={13} /> },
                        { id: 'inventory', label: 'Inventory', icon: <Boxes size={13} /> },
                        { id: 'billing', label: 'Billing', icon: <IndianRupee size={13} /> },
                        { id: 'reports', label: 'Reports', icon: <FileText size={13} /> },
                        { id: 'settings', label: 'Settings', icon: <ShieldCheck size={13} /> },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveNav(item.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition text-left cursor-pointer ${
                            activeNav === item.id
                              ? 'bg-[#0070F3] text-white shadow-xs'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* 2. Main Dashboard Panel */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-4 space-y-4">
                  
                  {/* Top Search & User Info Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search patients, appointments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[11px] font-black text-slate-900 leading-tight">{currentRole.user.name}</div>
                        <div className="text-[9px] text-slate-400 leading-tight">{currentRole.user.role}</div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0070F3] font-black text-[10px] flex items-center justify-center border border-blue-200">
                        {currentRole.user.avatar}
                      </div>
                    </div>
                  </div>

                  {/* Top 4 Metrics Cards (Matching Reference Layout) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                      <span className="text-[10px] font-bold text-slate-500 block truncate">Total Revenue</span>
                      <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                        {formatCurrency(metrics.totalRevenue || 482320)}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">
                        ↑ 12%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                      <span className="text-[10px] font-bold text-slate-500 block truncate">Total Patients</span>
                      <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                        {metrics.totalPatients || 892}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">
                        ↑ 8%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                      <span className="text-[10px] font-bold text-slate-500 block truncate">Appointments</span>
                      <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                        {metrics.totalAppointments || 124}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">
                        ↑ 15%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                      <span className="text-[10px] font-bold text-slate-500 block truncate">Pending Bills</span>
                      <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                        {metrics.pendingBillsCount || 18}
                      </div>
                      <span className="text-[9px] font-bold text-rose-500 block mt-0.5">
                        ↓ 4%
                      </span>
                    </div>
                  </div>

                  {/* ── DYNAMIC ROLE CONTENT CANVAS ── */}
                  {activeNav === 'dashboard' && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                      
                      {/* Left: Revenue Overview Line Chart */}
                      <div className="sm:col-span-7 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-slate-800">Revenue Overview</span>
                          <span className="text-[9.5px] font-bold text-[#0070F3] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            This Month ▾
                          </span>
                        </div>

                        {/* Revenue Curve Graphic */}
                        <div className="h-24 w-full flex items-end pt-2">
                          <svg viewBox="0 0 100 40" className="w-full h-full text-[#0070F3]" preserveAspectRatio="none">
                            <path d="M0 32 Q 25 24, 45 28 T 75 12 T 100 6" fill="none" stroke="currentColor" strokeWidth="2.5" />
                            <path d="M0 32 Q 25 24, 45 28 T 75 12 T 100 6 L 100 40 L 0 40 Z" fill="rgba(0,112,243,0.10)" />
                          </svg>
                        </div>

                        <div className="flex justify-between text-[9px] font-bold text-slate-400 pt-1.5 border-t border-slate-200/60">
                          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                        </div>
                      </div>

                      {/* Right: Donut Specialty Distribution */}
                      <div className="sm:col-span-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                        <span className="text-xs font-black text-slate-800 mb-1">Appointments by Department</span>
                        
                        <div className="flex items-center gap-3">
                          {/* Donut graphic */}
                          <div className="w-16 h-16 shrink-0 relative flex items-center justify-center">
                            <svg viewBox="0 0 36 36" className="w-16 h-16 transform -rotate-90">
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#0070F3" strokeWidth="4" strokeDasharray="45 100" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#38BDF8" strokeWidth="4" strokeDasharray="20 100" strokeDashoffset="-45" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="15 100" strokeDashoffset="-65" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#6366F1" strokeWidth="4" strokeDasharray="10 100" strokeDashoffset="-80" />
                            </svg>
                          </div>

                          {/* Legend */}
                          <div className="space-y-1 text-[9.5px]">
                            <div className="flex justify-between items-center gap-2">
                              <span className="flex items-center gap-1 font-bold text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0070F3]" /> General
                              </span>
                              <span className="font-extrabold text-slate-900">45%</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="flex items-center gap-1 font-bold text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Dental
                              </span>
                              <span className="font-extrabold text-slate-900">20%</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="flex items-center gap-1 font-bold text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Physio
                              </span>
                              <span className="font-extrabold text-slate-900">15%</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="flex items-center gap-1 font-bold text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Eye Care
                              </span>
                              <span className="font-extrabold text-slate-900">10%</span>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  )}

                  {/* Appointments View if clicked */}
                  {activeNav === 'appointments' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800">Live Appointments</span>
                        <button
                          onClick={() => setShowNewApptModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px]"
                        >
                          + Book
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 text-slate-500 font-bold">
                            <tr>
                              <th className="py-2 px-2.5">Token</th>
                              <th className="py-2 px-2.5">Patient</th>
                              <th className="py-2 px-2.5">Doctor</th>
                              <th className="py-2 px-2.5">Time</th>
                              <th className="py-2 px-2.5">Status</th>
                              <th className="py-2 px-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredAppointments.slice(0, 4).map((apt) => (
                              <tr key={apt.id} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 font-bold text-blue-600">{apt.token}</td>
                                <td className="py-2 px-2.5 font-bold text-slate-900">{apt.patientName}</td>
                                <td className="py-2 px-2.5 text-slate-600">{apt.doctorName}</td>
                                <td className="py-2 px-2.5 text-slate-500">{apt.time}</td>
                                <td className="py-2 px-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase ${
                                    apt.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                  }`}>
                                    {apt.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-right">
                                  {apt.status === 'SCHEDULED' && (
                                    <button
                                      onClick={() => updateAppointmentStatus(apt.id, 'CHECKED_IN')}
                                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9.5px] font-bold"
                                    >
                                      Check In
                                    </button>
                                  )}
                                  {apt.status === 'CHECKED_IN' && (
                                    <button
                                      onClick={() => handleStartConsult(apt)}
                                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9.5px] font-bold"
                                    >
                                      Consult
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pharmacy View */}
                  {activeNav === 'pharmacy' && (
                    <div className="space-y-2">
                      <span className="text-xs font-black text-slate-800">Pharmacy Inventory</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {demoState.medicines.slice(0, 4).map((m) => (
                          <div key={m.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-slate-900">{m.name}</div>
                              <div className="text-[10px] text-slate-400">Stock: {m.stock} units</div>
                            </div>
                            <button
                              onClick={() => dispenseMedicine(m.id, 1)}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-600 font-bold text-[10px] hover:bg-blue-600 hover:text-white transition"
                            >
                              Dispense
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Billing View */}
                  {activeNav === 'billing' && (
                    <div className="space-y-2">
                      <span className="text-xs font-black text-slate-800">Billing & Invoices</span>
                      <div className="space-y-1.5">
                        {demoState.bills.slice(0, 3).map((b) => (
                          <div key={b.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-slate-900">{b.invoiceNumber} • {b.patientName}</div>
                              <div className="text-[10px] text-slate-500">{formatCurrency(b.amount)}</div>
                            </div>
                            {b.status === 'PENDING' ? (
                              <button
                                onClick={() => markBillPaid(b.id)}
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[10px]"
                              >
                                Mark Paid
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600">✓ Settled</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reset Demo Button Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>✦ Interactive Demo Mode</span>
                    <button
                      onClick={resetDemoData}
                      className="inline-flex items-center gap-1 font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      <RotateCcw size={10} /> Reset Data
                    </button>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ── MODAL: NEW APPOINTMENT ── */}
        {showNewApptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Schedule Demo Appointment</h3>
                <button onClick={() => setShowNewApptModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleNewApptSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Patient</label>
                  <select
                    value={newApptForm.patientName}
                    onChange={(e) => setNewApptForm({ ...newApptForm, patientName: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 outline-none"
                  >
                    {demoState.patients.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Doctor</label>
                  <select
                    value={newApptForm.doctorName}
                    onChange={(e) => setNewApptForm({ ...newApptForm, doctorName: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 outline-none"
                  >
                    {demoState.doctors.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Time</label>
                    <input
                      type="text"
                      value={newApptForm.time}
                      onChange={(e) => setNewApptForm({ ...newApptForm, time: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Reason</label>
                    <input
                      type="text"
                      value={newApptForm.reason}
                      onChange={(e) => setNewApptForm({ ...newApptForm, reason: e.target.value })}
                      className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNewApptModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Book Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: CONSULTATION ── */}
        {showConsultModal && selectedApptForConsult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Doctor Consultation</h3>
                  <p className="text-[11px] text-blue-600 font-bold">{selectedApptForConsult.patientName}</p>
                </div>
                <button onClick={() => setShowConsultModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCompleteConsultSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Diagnosis</label>
                  <input
                    type="text"
                    required
                    value={consultForm.diagnosis}
                    onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={consultForm.clinicalNotes}
                    onChange={(e) => setConsultForm({ ...consultForm, clinicalNotes: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-700 outline-none"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <span className="font-black text-blue-900 text-xs block mb-1.5">Prescribed Medicines</span>
                  <div className="space-y-1">
                    {consultForm.medicines.map((m, i) => (
                      <div key={i} className="p-1.5 rounded-lg bg-white border border-blue-100 flex justify-between items-center">
                        <span className="font-bold text-slate-800">{m.name}</span>
                        <span className="text-[10px] text-slate-500">{m.dosage} • {m.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                    Complete Consultation
                  </button>
                </div>
              </form>
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
