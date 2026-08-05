import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Stethoscope, FlaskConical,
  Pill, ShieldAlert, ScrollText, Bell, ListChecks, Bot,
  LayoutGrid, UserCircle, CreditCard, ChevronRight, ChevronDown,
  Building2, UserCog, Sun, Moon, LogOut, ClipboardList,
  Activity, Syringe, FileText, RotateCcw, ChevronLeft , Headphones,
  TrendingUp, Plus, UserX, Bed, Clock, AlertCircle, CheckSquare, UserPlus,PlusSquare, MessageSquare
} from 'lucide-react';

import { NAV_ITEMS, ROUTES } from '../../constants/routes';
import { canAccessRole, STAFF_ROLES } from '../../constants/roles';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../ui/Avatar';
import { clinicApi, patientApi, appointmentApi, providersApi } from '../../lib/api';
import { CheckCircle } from 'lucide-react';

import toast from 'react-hot-toast';

// Map labels to icons
const ICON_MAP = {
  'Super Admin Dashboard': <Activity size={18} />,
  'My Doctors': <UserCog size={18} />,
  'My Receptionists': <UserCog size={18} />,
  'Clinic Settings': <Building2 size={18} />,
  'Doctor Leaves Review': <Calendar size={18} />,
  'My Leaves': <Calendar size={18} />,
  'Earnings': <TrendingUp size={18} />,
  'Dashboard': <LayoutDashboard size={18} />,
  'Patients': <Users size={18} />,
  'Appointments': <Calendar size={18} />,
  'Consultations': <Stethoscope size={18} />,
  'Labs': <FlaskConical size={18} />,
  'Laboratory': <FlaskConical size={18} />,
  'Lab Tests': <FlaskConical size={18} />,
  'Pharmacy': <Pill size={18} />,
  'Pharmacy Store': <Pill size={18} />,
  'Billing Risk': <ShieldAlert size={18} />,
  'Audit Logs': <ScrollText size={18} />,
  'Notifications': <Bell size={18} />,
  'Follow-ups': <ListChecks size={18} />,
  'AI Chatbot': <Bot size={18} />,
  'My Portal': <LayoutGrid size={18} />,
  'My Appointments': <Calendar size={18} />,
  'Reschedule Appointment': <RotateCcw size={18} />,
  'View Clinic & Details': <Building2 size={18} />,
  'Medical History': <ClipboardList size={18} />,
  'Prescriptions & Records': <FileText size={18} />,
  'Billing & Invoices': <CreditCard size={18} />,
  'Users': <UserCircle size={18} />,
  'Prescriptions': <ClipboardList size={18} />,
  'Billing': <CreditCard size={18} />,
  'Doctors': <UserCog size={18} />,
  'Staff': <Users size={18} />,
  'Departments': <LayoutGrid size={18} />,
  'Reports & Analytics': <TrendingUp size={18} />,
  'Subscription & Plan': <CreditCard size={18} />,
  'Branches': <Building2 size={18} />,
  'Settings': <UserCog size={18} />,
  'Procedures': <Activity size={18} />,
};

// Patient-specific navigation with sections
const PATIENT_NAV = [
  { label: 'Dashboard', path: '/portal?tab=dashboard', iconKey: 'Dashboard' },
  { label: 'My Clinic', path: '/portal?tab=my-clinic', iconKey: 'Clinic Settings' },
  { label: 'Appointments', path: '/portal?tab=appointments', iconKey: 'Appointments' },
  { label: 'Consultation History', path: '/portal?tab=history', iconKey: 'Medical History' },
  { label: 'Prescriptions', path: '/portal?tab=prescriptions', iconKey: 'Prescriptions' },
  { label: 'Lab Reports', path: '/portal?tab=labs', iconKey: 'Labs' },
  { label: 'Medical Documents', path: '/portal?tab=documents', iconKey: 'Prescriptions & Records' },
  { label: 'Bills & Payments', path: '/portal?tab=billing', iconKey: 'Billing & Invoices' },
  { label: 'Pharmacy Orders', path: '/portal?tab=pharmacy-orders', iconKey: 'Pharmacy' }
];


const PHARMACY_OPERATOR_NAV = [
  { label: 'Dashboard', path: '/provider-workspace/pharmacy?tab=dashboard', iconKey: 'Dashboard' },
  { type: 'section', label: 'OPERATIONS' },
  { label: 'Prescription Orders', path: '/provider-workspace/pharmacy?tab=orders', iconKey: 'Prescriptions' },
  { label: 'Walk-in Sales', path: '/provider-workspace/pharmacy?tab=walk-in', iconKey: 'Billing' },
  { label: 'Handover Queue', path: '/provider-workspace/pharmacy?tab=handover', iconKey: 'Follow-ups' },
  { type: 'section', label: 'INVENTORY' },
  { label: 'Inventory', path: '/provider-workspace/pharmacy?tab=inventory', iconKey: 'Pharmacy' },
  { label: 'Global Catalogue', path: '/provider-workspace/pharmacy?tab=catalogue', iconKey: 'Departments' },
  { label: 'Purchase & Stock', path: '/provider-workspace/pharmacy?tab=purchases', iconKey: 'Procedures' },
  { label: 'Suppliers', path: '/provider-workspace/pharmacy?tab=suppliers', iconKey: 'Patients' },
  { label: 'Returns', path: '/provider-workspace/pharmacy?tab=returns', iconKey: 'Reschedule Appointment' },
  { label: 'Stock Transfer', path: '/provider-workspace/pharmacy?tab=transfers', iconKey: 'Branches' },
  { type: 'section', label: 'REPORTS' },
  { label: 'Reports & Analytics', path: '/provider-workspace/pharmacy?tab=reports', iconKey: 'Reports & Analytics' },
  { label: 'Settings', path: '/provider-workspace/pharmacy?tab=settings', iconKey: 'Settings' }
];

const LABORATORY_OPERATOR_NAV = [
  { label: 'Dashboard', path: '/provider-workspace/laboratory?tab=dashboard', iconKey: 'Dashboard' },
  { type: 'section', label: 'OPERATIONS' },
  { label: 'Lab Orders', path: '/provider-workspace/laboratory?tab=orders', iconKey: 'Laboratory' },
  { label: 'Diagnostic Catalogue', path: '/provider-workspace/laboratory?tab=catalogue', iconKey: 'Departments' },
  { type: 'section', label: 'INVENTORY' },
  { label: 'Lab Inventory', path: '/provider-workspace/laboratory?tab=inventory', iconKey: 'Pharmacy' },
  { label: 'QC & Calibration', path: '/provider-workspace/laboratory?tab=qc', iconKey: 'Procedures' },
  { type: 'section', label: 'REPORTS' },
  { label: 'Reports & Analytics', path: '/provider-workspace/laboratory?tab=reports', iconKey: 'Reports & Analytics' },
  { label: 'Settings', path: '/provider-workspace/laboratory?tab=settings', iconKey: 'Settings' }
];

const getOperatorNav = (role) => {
  const normRole = (role || '').toUpperCase();
  if (normRole === 'PHARMACY STORE OPERATOR') return PHARMACY_OPERATOR_NAV;
  if (normRole === 'LABORATORY OPERATOR') return LABORATORY_OPERATOR_NAV;
  
  const prefix = role ? role.split(' ')[0] : 'Provider';
  return [
    { label: 'Dashboard', path: `/provider-workspace/generic?tab=dashboard`, iconKey: 'Dashboard' },
    { label: 'Work Orders', path: `/provider-workspace/generic?tab=orders`, iconKey: 'Prescriptions' },
    { label: 'Reports & Analytics', path: `/provider-workspace/generic?tab=reports`, iconKey: 'Reports & Analytics' },
    { label: 'Settings', path: `/provider-workspace/generic?tab=settings`, iconKey: 'Settings' }
  ];
};

const getClinicTheme = (name) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('garg') || lower.includes('green') || lower.includes('emg')) {
    return { primary: '#10b981', bgLight: 'rgba(16,185,129,0.08)', bgHover: 'rgba(16,185,129,0.15)', text: 'text-emerald-700', bg: 'bg-emerald-600', shadow: 'rgba(16,185,129,0.1)' };
  }
  if (lower.includes('ram') || lower.includes('dental') || lower.includes('blue')) {
    return { primary: '#0f766e', bgLight: 'rgba(15,118,110,0.08)', bgHover: 'rgba(15,118,110,0.15)', text: 'text-teal-700', bg: 'bg-teal-700', shadow: 'rgba(15,118,110,0.1)' };
  }
  return { primary: '#2f6bff', bgLight: 'rgba(47,107,255,0.08)', bgHover: 'rgba(47,107,255,0.15)', text: 'text-blue-700', bg: 'bg-blue-600', shadow: 'rgba(47,107,255,0.1)' };
};

const isClinicFeatureActive = (clinic, featureCode) => {
  if (!clinic) return false;
  const planFeatures = clinic.subscription?.planId?.features || [];
  if (planFeatures.includes(featureCode)) return true;
  const activeTrials = (clinic.trialFeatures || [])
    .filter(t => t.isActive && new Date(t.expiryDate) >= new Date())
    .map(t => t.featureCode);
  if (activeTrials.includes(featureCode)) return true;
  return false;
};

const Sidebar = ({ role, open, onNavigate, user, onLogout, onAddWalkIn }) => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isPendingDoctor =
    user?.role === 'DOCTOR' &&
    (['pending_profile', 'pending_approval', 're_edit'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  const isPendingReceptionist =
    STAFF_ROLES.includes(user?.role) &&
    (['pending_profile', 'pending_approval', 're_edit', 'pending_invitation', 'otp_verification_pending', 'onboarding_in_progress', 'changes_requested'].includes(user?.approvalStatus) || !user?.hasAcceptedSlot);

  const isPatient = role === 'PATIENT';
  const isOperator = user?.origin === 'provider_operator';

  // --- LABORATORY COLLAPSIBLE NAVIGATION STATES ---
  const [labOrdersCollapsed, setLabOrdersCollapsed] = useState(true);
  const [catalogueCollapsed, setCatalogueCollapsed] = useState(true);
  const [patientsCollapsed, setPatientsCollapsed] = useState(true);
  const [collectionCollapsed, setCollectionCollapsed] = useState(true);
  const [processingCollapsed, setProcessingCollapsed] = useState(true);
  const [reportsCollapsed, setReportsCollapsed] = useState(true);
  const [inventoryCollapsed, setInventoryCollapsed] = useState(true);
  const [purchaseCollapsed, setPurchaseCollapsed] = useState(true);
  const [qcCollapsed, setQCCollapsed] = useState(true);
  const [equipmentCollapsed, setEquipmentCollapsed] = useState(true);
  const [analyticsCollapsed, setAnalyticsCollapsed] = useState(true);
  const [settingsCollapsed, setSettingsCollapsed] = useState(true);

  const [activeFeatures, setActiveFeatures] = useState([]);
  const [patientClinics, setPatientClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(() => localStorage.getItem('patientActiveClinicId') || '');
  const [patientProfile, setPatientProfile] = useState(null);
  const [labExpanded, setLabExpanded] = useState(false);
  const [pharmacyExpanded, setPharmacyExpanded] = useState(false);

  const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';

  const handleClinicSelect = (clinicId) => {
    localStorage.setItem('patientActiveClinicId', clinicId);
    setSelectedClinicId(clinicId);
    window.dispatchEvent(new CustomEvent('patient:clinic-changed', { detail: clinicId }));
    
    const currentParams = new URLSearchParams(location.search);
    const activeTab = currentParams.get('tab') || 'dashboard';
    navigate(`/portal?tab=${activeTab === 'clinics' ? 'dashboard' : activeTab}&clinicId=${clinicId}`);
  };

  useEffect(() => {
    const handleClinicChange = (e) => {
      setSelectedClinicId(e.detail);
    };
    window.addEventListener('patient:clinic-changed', handleClinicChange);
    return () => {
      window.removeEventListener('patient:clinic-changed', handleClinicChange);
    };
  }, []);

  useEffect(() => {
    if (['book-lab', 'labs'].includes(currentTab)) {
      setLabExpanded(true);
    }
    if (['buy-medicine', 'pharmacy-orders'].includes(currentTab)) {
      setPharmacyExpanded(true);
    }
  }, [currentTab]);

  useEffect(() => {
    if (isPatient) {
      patientApi.getMyClinics()
        .then(res => {
          const list = res.data?.clinics || res.clinics || [];
          setPatientClinics(list);
          const cached = localStorage.getItem('patientActiveClinicId');
          if (list.length > 0) {
            const defaultId = cached || list[0]._id;
            localStorage.setItem('patientActiveClinicId', defaultId);
            setSelectedClinicId(defaultId);
            if (!cached) {
              window.dispatchEvent(new CustomEvent('patient:clinic-changed', { detail: defaultId }));
            }
          }
        })
        .catch(() => {});
    }
  }, [isPatient]);

  useEffect(() => {
    if (isPatient && selectedClinicId) {
      patientApi.me()
        .then(res => {
          setPatientProfile(res.patient || res.data?.patient || null);
        })
        .catch(err => console.error('Failed to load patient profile in sidebar:', err));
    } else {
      setPatientProfile(null);
    }
  }, [isPatient, selectedClinicId]);

  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [labs, setLabs] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);

  useEffect(() => {
    const currentParams = new URLSearchParams(location.search);
    setSelectedClinicId(currentParams.get('clinicId') || '');
    setSelectedLabId(currentParams.get('labId') || '');
    setSelectedPharmacyId(currentParams.get('pharmacyId') || '');
  }, [location.search]);

  useEffect(() => {
    if (isPatient && selectedClinicId) {
      providersApi.getProviders({ clinicId: selectedClinicId, providerType: 'Laboratory', limit: 100 })
        .then(res => {
          setLabs(res.data?.items || res.items || []);
        })
        .catch(() => {});

      providersApi.getProviders({ clinicId: selectedClinicId, providerType: 'Pharmacy', limit: 100 })
        .then(res => {
          setPharmacies(res.data?.items || res.items || []);
        })
        .catch(() => {});
    } else {
      setLabs([]);
      setPharmacies([]);
    }
  }, [isPatient, selectedClinicId]);

  useEffect(() => {
    if (user?.clinicId) {

      clinicApi.getOnboardingFlow(user.clinicId).then(res => {
        const planFeatures = res.data.steps.map(s => s.id);
        const trials = res.data.activeTrials.map(t => t.featureCode);
        setActiveFeatures([...planFeatures, ...trials]);
      }).catch(() => {});
    }
  }, [user]);

  const planName = user?.clinic?.subscription?.planId?.name || 'AI Professional Clinic';
  const expiryRaw = user?.clinic?.subscription?.expiryDate;
  const expiryFormatted = expiryRaw 
    ? new Date(expiryRaw).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '25 Dec 2025';

  const premiumFeatures = {
    'Labs': 'labs',
    'Laboratory': 'labs',
    'Pharmacy': 'pharmacy',
    'Pharmacy Store': 'pharmacy',
    'AI Chatbot': 'symptom_checker',
    'Video Consultation': 'online_consultation',
    'Branches': 'multi_branch',
    'Departments': 'max_departments',
    'Reports & Analytics': 'reports'
  };

  const isFeatureEnabled = (label) => {
    if (role === 'SUPER_ADMIN') return true;
    const code = premiumFeatures[label];
    if (!code) return true;
    
    if (code === 'max_departments') {
      return activeFeatures.includes('max_departments') || activeFeatures.includes('departments');
    }
    return activeFeatures.includes(code);
  };

  const visibleItems = (isPendingDoctor || isPendingReceptionist)
    ? []
    : isOperator
      ? getOperatorNav(role)
      : isPatient
        ? PATIENT_NAV.filter(item => {
            if (item.label === 'Pharmacy' || item.label === 'Pharmacy Store') {
              return isFeatureEnabled(item.label);
            }
            if (item.label === 'Laboratory' || item.label === 'Lab Tests') {
              return isFeatureEnabled(item.label);
            }
            return true;
          }).map(item => {
            const enabled = isFeatureEnabled(item.label);
            return { ...item, isLocked: !enabled };
          })
        : NAV_ITEMS.filter((item) => {
            if (!canAccessRole(role, item.roles)) return false;
            if (item.label === 'Pharmacy') {
              return isFeatureEnabled('Pharmacy');
            }
            if (item.label === 'Laboratory') {
              return isFeatureEnabled('Laboratory');
            }
            return true;
          }).map(item => {
            const enabled = isFeatureEnabled(item.label);
            return { ...item, isLocked: !enabled };
          });

  const isItemActive = (item) => {
    if (isPatient || isOperator) {
      const itemUrl = new URL(item.path, window.location.origin);
      const isPathMatch = location.pathname === itemUrl.pathname;
      const itemTab = itemUrl.searchParams.get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';
      return isPathMatch && itemTab === currentTab;
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };


  // Ensure the custom white sidebar layout is strictly displayed for the Clinic Admin (ADMIN role).
  // Receptionist, Doctor, Patient, and other roles will render their original/designated layouts.
  const isClinicAdmin = role === 'ADMIN';

  const [sidebarStats, setSidebarStats] = useState({
    todaysAppointments: 0,
    waitingPatients: 0,
    emergencyCases: 0,
    activeEmergencies: 0
  });

  useEffect(() => {
    if (role === 'RECEPTIONIST' && user?.clinicId) {
      const fetchStats = async () => {
        try {
          const res = await appointmentApi.getAppointments({ limit: 100 });
          const appointments = res.data?.appointments || [];
          
          const todayStr = new Date().toLocaleDateString('en-CA');
          
          let todaysAppointments = 0;
          let waitingPatients = 0;
          let emergencyCases = 0;
          let activeEmergencies = 0;

          appointments.forEach(appt => {
            const apptDateStr = new Date(appt.appointmentDate).toLocaleDateString('en-CA');
            
            if (apptDateStr === todayStr) {
              todaysAppointments++;
            }
            if (appt.status === 'waiting' || appt.status === 'checked_in') {
              waitingPatients++;
            }
            const isEmergencyType = appt.appointmentType?.toLowerCase() === 'emergency' || appt.appointmentType?.toLowerCase() === 'emergency cases';
            if (isEmergencyType) {
              emergencyCases++;
              if (appt.status !== 'completed' && appt.status !== 'cancelled') {
                activeEmergencies++;
              }
            }
          });

          setSidebarStats({
            todaysAppointments,
            waitingPatients,
            emergencyCases,
            activeEmergencies
          });
        } catch (err) {
          console.error('Failed to load sidebar stats:', err);
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [role, user]);

  if (role === 'RECEPTIONIST') {
    const hasOpRole = (roleKey) => {
      const keys = {
        'Procedure Management': ['Procedure Management', 'procedure_management', 'procedure', 'procedures', 'Procedure'],
        'Billing': ['Billing', 'billing'],
        'Laboratory': ['Laboratory', 'laboratory', 'labs', 'lab'],
        'Pharmacy': ['Pharmacy', 'pharmacy', 'medicines']
      };

      const matchKeys = keys[roleKey] || [roleKey];
      
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true;

      if (user?.operationalRoles && Array.isArray(user.operationalRoles)) {
        return user.operationalRoles.some(r => matchKeys.includes(r));
      }
      if (user?.permissions) {
        return matchKeys.some(k => !!user.permissions[k]);
      }

      // Default fallbacks:
      if (roleKey === 'Billing') return true;
      if (roleKey === 'Procedure Management') return true;
      if (roleKey === 'Laboratory') return false;
      if (roleKey === 'Pharmacy') return false;
      return false;
    };

    const isItemActive = (path) => {
      if (path === ROUTES.dashboard) {
        return location.pathname === ROUTES.dashboard || location.pathname === '/dashboard';
      }
      return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    // Filter items based on active operational roles
    const navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Appointments', path: '/appointments', icon: <Calendar size={18} /> },
      { label: 'Doctors', path: '/doctors', icon: <UserCog size={18} /> },
      { label: 'Patients', path: '/patients', icon: <Users size={18} /> },
      ...(hasOpRole('Procedure Management') ? [{ 
        label: 'Procedures', 
        path: '/procedures', 
        icon: <Activity size={18} />,
        badge: <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none bg-emerald-500 text-white ml-auto">New</span>
      }] : []),
      ...(hasOpRole('Billing') ? [{ label: 'Billing', path: '/billing', icon: <CreditCard size={18} /> }] : []),
      ...(hasOpRole('Laboratory') ? [{ label: 'Laboratory', path: '/labs/orders', icon: <FlaskConical size={18} /> }] : []),
      ...(hasOpRole('Pharmacy') ? [{ label: 'Pharmacy', path: '/pharmacy/medicines', icon: <Pill size={18} /> }] : [])
    ];

    const clinicName = user?.clinic?.name || "Ram's Dental Clinic";

    return (
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col w-[270px]
          bg-[#0b0f19] border-r border-white/[0.06]
          transition-transform duration-300 ease-spring
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand Header */}
        <div className="px-6 pt-7 pb-4 shrink-0 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0dd5b8] flex items-center justify-center shadow-[0_0_15px_rgba(13,213,184,0.35)] shrink-0">
              <span className="text-white font-extrabold text-lg leading-none">+</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#0dd5b8] leading-none">AI-CMS</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-black text-white truncate leading-none">
                  {clinicName}
                </span>
                <span className="shrink-0 bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 pt-4 shrink-0">
          <div className="flex items-center gap-3 px-3 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
            <Avatar src={user?.image} name={user?.name || 'Ishan'} size="md" />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight truncate">{user?.name || 'Ishan'}</h4>
              <p className="text-[10px] text-slate-400 leading-tight">Receptionist</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-bold text-emerald-400">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin scrollbar-thumb-white/[0.05]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 pb-1.5">MAIN</p>
          <nav className="space-y-1">
            {navItems.map((item, idx) => {
              const active = isItemActive(item.path);
              return (
                <NavLink
                  key={idx}
                  to={item.path}
                  onClick={onNavigate}
                  className={() =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${active
                      ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                    }`
                  }
                >
                  <span className={`shrink-0 ${active ? 'text-white' : 'text-slate-500'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge}
                </NavLink>
              );
            })}
          </nav>

          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 pt-4 pb-1.5">COMMUNICATION</p>
          <nav className="space-y-1">
            <NavLink
              to="/chat"
              onClick={onNavigate}
              className={() =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${isItemActive('/chat')
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                }`
              }
            >
              <span className={`shrink-0 ${isItemActive('/chat') ? 'text-white' : 'text-slate-500'}`}>
                <MessageSquare size={18} />
              </span>
              <span>Chat</span>
            </NavLink>
          </nav>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-white/[0.06] space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 pb-1">QUICK ACTIONS</p>
            <button
              onClick={() => {
                if (onNavigate) onNavigate();
                if (onAddWalkIn) onAddWalkIn();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition duration-150 shadow-[0_0_15px_rgba(37,99,235,0.25)] cursor-pointer"
            >
              <Calendar size={15} />
              <span>+ New Appointment</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 shrink-0 space-y-1 border-t border-white/[0.06]">
          {/* Settings */}
          <NavLink
            to="/clinic/settings"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${isActive
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
              }`
            }
          >
            <UserCog size={15} className="shrink-0 text-slate-500" />
            <span>Settings</span>
          </NavLink>
          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-450 hover:bg-rose-500/10 hover:text-rose-450 transition-all duration-150 cursor-pointer"
            >
              <LogOut size={15} className="shrink-0 text-slate-500" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  if (isPatient) {
    const selectedClinic = patientClinics.find(c => String(c._id) === String(selectedClinicId));
    const activeTheme = getClinicTheme(selectedClinic?.name);
    const activeLab = labs.find(l => String(l._id) === String(selectedLabId)) || { name: 'City Diagnostics Lab', address: { city: 'Noida' } };
    const activePharmacy = pharmacies.find(p => String(p._id) === String(selectedPharmacyId)) || { name: 'Gupta Medical Store', address: { city: 'Noida' } };

    return (
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col w-[280px]
          bg-white border-r border-slate-200
          transition-all duration-300 ease-in-out
          lg:sticky lg:top-0 lg:h-screen
          ${open ? 'translate-x-0 lg:flex' : '-translate-x-full lg:hidden lg:w-0'}
        `}
      >
        {/* Brand Header */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0 transition-colors"
              style={{ backgroundColor: selectedClinic ? activeTheme.primary : '#2f6bff' }}
            >
              <PlusSquare size={20} className="text-white" />
            </div>
            <div>
              <p className="text-base font-black text-slate-900 leading-none">AICMS</p>
              <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider leading-none">
                AI Clinic Management System
              </p>
            </div>
          </div>
          <div className="mt-5 h-px bg-slate-100" />
        </div>

        {/* Dynamic Sidebar States */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          
          {/* STATE 1: MY CLINICS SELECTOR */}
          <div 
            className={`flex-1 flex flex-col min-h-0 absolute inset-0 transition-all duration-300 ${
              selectedClinicId ? 'translate-x-[-100%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
            }`}
          >
            <div className="px-5 pt-4 pb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">My Clinics</h4>
            </div>
            
            <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
              {patientClinics.map((clinic) => {
                const theme = getClinicTheme(clinic.name);
                const isSelected = String(clinic._id) === String(selectedClinicId);
                const visitDateStr = clinic.lastVisitDate 
                  ? new Date(clinic.lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : null;

                return (
                  <div
                    key={clinic._id}
                    onClick={() => {
                      const currentParams = new URLSearchParams(location.search);
                      const activeTab = currentParams.get('tab') || 'dashboard';
                      // If shifting to my-clinic or dashboard
                      navigate(`/portal?tab=${activeTab === 'clinics' ? 'dashboard' : activeTab}&clinicId=${clinic._id}`);
                    }}
                    className={`
                      p-4 rounded-2xl border bg-white cursor-pointer transition-all duration-200
                      hover:shadow-md hover:border-slate-350 hover:translate-y-[-2px]
                      flex items-center justify-between gap-3
                      ${isSelected 
                        ? 'border-2 shadow-sm' 
                        : 'border-slate-200'
                      }
                    `}
                    style={{ 
                      borderColor: isSelected ? theme.primary : undefined,
                      boxShadow: isSelected ? `0 4px 15px ${theme.shadow}` : undefined
                    }}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-extrabold"
                        style={{ backgroundColor: theme.bgLight }}
                      >
                        🏥
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate leading-snug">{clinic.name}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{clinic.address?.city || 'Registered'}</p>
                        {clinic.hasActiveTreatment ? (
                          <span className="inline-block bg-amber-500/10 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-md mt-1.5 uppercase tracking-wider">
                            Active Treatment ⚡
                          </span>
                        ) : clinic.nextApptDate ? (
                          <span className="inline-block bg-blue-500/10 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded-md mt-1.5 uppercase tracking-wider">
                            Upcoming Appt 📅
                          </span>
                        ) : visitDateStr ? (
                          <span className="inline-block text-[9px] text-slate-400 mt-1 font-bold">
                            Last Visit: {visitDateStr}
                          </span>
                        ) : null}
                        {clinic.primaryDoctor && (
                          <p className="text-[9px] text-slate-500 mt-0.5">Dr. {clinic.primaryDoctor}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 shrink-0" />
                  </div>
                );
              })}
              {patientClinics.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-xs text-slate-400 italic">No clinics registered.</p>
                </div>
              )}
            </nav>
          </div>

          {/* STATE 2: CLINIC SPECIFIC NAVIGATION */}
          <div 
            className={`flex-1 flex flex-col min-h-0 absolute inset-0 transition-all duration-300 ${
              selectedClinicId && !selectedLabId && !selectedPharmacyId ? 'translate-x-0 opacity-100' : 
              selectedClinicId && (selectedLabId || selectedPharmacyId) ? 'translate-x-[-100%] opacity-0 pointer-events-none' : 'translate-x-[100%] opacity-0 pointer-events-none'
            }`}
          >
            {/* Back Button */}
            <div className="px-4 pt-3 pb-1 shrink-0">
              <button
                onClick={() => {
                  const currentParams = new URLSearchParams(location.search);
                  currentParams.delete('clinicId');
                  navigate(`/portal?${currentParams.toString()}`);
                }}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition duration-150"
              >
                <ChevronLeft size={14} />
                <span>Back to My Clinics</span>
              </button>
            </div>

            {selectedClinic && (
              <div className="px-4 py-3 shrink-0 border-b border-slate-100 space-y-3 bg-slate-50/50">
                {/* Current Clinic Selector */}
                <div>
                  <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">Current Clinic</p>
                  <div 
                    onClick={() => {
                      const currentParams = new URLSearchParams(location.search);
                      currentParams.delete('clinicId');
                      navigate(`/portal?${currentParams.toString()}`);
                    }}
                    className="mt-1.5 p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2.5 shadow-sm hover:shadow-md transition cursor-pointer"
                    style={{ borderLeft: `3.5px solid ${activeTheme.primary}` }}
                  >
                    <span className="text-sm shrink-0">🏥</span>
                    <span className="text-xs font-black text-slate-800 truncate flex-1">{selectedClinic.name}</span>
                    <ChevronDown size={12} className="text-slate-400 shrink-0" />
                  </div>
                </div>

                {/* Patient Profile Info */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white p-2 rounded-xl border border-slate-150 shadow-sm">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-none">Patient Profile</p>
                    <p className="text-[10px] font-black text-slate-800 truncate mt-1">
                      {patientProfile ? `${patientProfile.firstName || ''} ${patientProfile.lastName || ''}`.trim() : 'Loading...'}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-150 shadow-sm">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-none">UHID</p>
                    <p className="text-[10px] font-black text-blue-600 truncate mt-1">
                      {patientProfile?.patientId || 'Loading...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Clinic Navigation Menu */}
            <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
              
              {/* Dashboard */}
              <NavLink
                to={`/portal?tab=dashboard&clinicId=${selectedClinicId}`}
                onClick={onNavigate}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                style={{
                  backgroundColor: currentTab === 'dashboard' ? activeTheme.bgLight : 'transparent',
                  color: currentTab === 'dashboard' ? activeTheme.primary : '#475569'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0" style={{ color: currentTab === 'dashboard' ? activeTheme.primary : '#94a3b8' }}>
                    <LayoutDashboard size={16} />
                  </span>
                  <span>Dashboard</span>
                </div>
              </NavLink>

              {/* My Clinic */}
              <NavLink
                to={`/portal?tab=my-clinic&clinicId=${selectedClinicId}`}
                onClick={onNavigate}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                style={{
                  backgroundColor: currentTab === 'my-clinic' ? activeTheme.bgLight : 'transparent',
                  color: currentTab === 'my-clinic' ? activeTheme.primary : '#475569'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0" style={{ color: currentTab === 'my-clinic' ? activeTheme.primary : '#94a3b8' }}>
                    <Building2 size={16} />
                  </span>
                  <span>My Clinic</span>
                </div>
              </NavLink>

              {/* Appointments */}
              <NavLink
                to={`/portal?tab=appointments&clinicId=${selectedClinicId}`}
                onClick={onNavigate}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                style={{
                  backgroundColor: currentTab === 'appointments' ? activeTheme.bgLight : 'transparent',
                  color: currentTab === 'appointments' ? activeTheme.primary : '#475569'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0" style={{ color: currentTab === 'appointments' ? activeTheme.primary : '#94a3b8' }}>
                    <Calendar size={16} />
                  </span>
                  <span>Appointments</span>
                </div>
              </NavLink>

              {/* Consultation History */}
              <NavLink
                to={`/portal?tab=history&clinicId=${selectedClinicId}`}
                onClick={onNavigate}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                style={{
                  backgroundColor: currentTab === 'history' ? activeTheme.bgLight : 'transparent',
                  color: currentTab === 'history' ? activeTheme.primary : '#475569'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0" style={{ color: currentTab === 'history' ? activeTheme.primary : '#94a3b8' }}>
                    <Stethoscope size={16} />
                  </span>
                  <span>Consultation History</span>
                </div>
              </NavLink>

              {/* Prescriptions */}
              <NavLink
                to={`/portal?tab=prescriptions&clinicId=${selectedClinicId}`}
                onClick={onNavigate}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                style={{
                  backgroundColor: currentTab === 'prescriptions' ? activeTheme.bgLight : 'transparent',
                  color: currentTab === 'prescriptions' ? activeTheme.primary : '#475569'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0" style={{ color: currentTab === 'prescriptions' ? activeTheme.primary : '#94a3b8' }}>
                    <ClipboardList size={16} />
                  </span>
                  <span>Prescriptions</span>
                </div>
              </NavLink>

              {/* Laboratory (Expandable Accordion) */}
              {isClinicFeatureActive(selectedClinic, 'labs') && (
                <div className="space-y-1">
                  <button
                    onClick={() => setLabExpanded(!labExpanded)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150 hover:bg-slate-50 text-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 text-slate-400">
                        <FlaskConical size={16} />
                      </span>
                      <span>Laboratory</span>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${labExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div className={`pl-8 space-y-1 overflow-hidden transition-all duration-350 ${labExpanded ? 'max-h-32 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <NavLink
                      to={`/portal?tab=book-lab&clinicId=${selectedClinicId}`}
                      onClick={onNavigate}
                      className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition"
                      style={{
                        backgroundColor: currentTab === 'book-lab' ? activeTheme.bgLight : 'transparent',
                        color: currentTab === 'book-lab' ? activeTheme.primary : '#64748b'
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentTab === 'book-lab' ? activeTheme.primary : '#cbd5e1' }} />
                      <span>Book Lab Test</span>
                    </NavLink>
                    <NavLink
                      to={`/portal?tab=labs&clinicId=${selectedClinicId}`}
                      onClick={onNavigate}
                      className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition"
                      style={{
                        backgroundColor: currentTab === 'labs' ? activeTheme.bgLight : 'transparent',
                        color: currentTab === 'labs' ? activeTheme.primary : '#64748b'
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentTab === 'labs' ? activeTheme.primary : '#cbd5e1' }} />
                      <span>View Lab Reports</span>
                    </NavLink>
                  </div>
                </div>
              )}

              {/* Pharmacy (Expandable Accordion) */}
              {isClinicFeatureActive(selectedClinic, 'pharmacy') && (
                <div className="space-y-1">
                  <button
                    onClick={() => setPharmacyExpanded(!pharmacyExpanded)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150 hover:bg-slate-50 text-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 text-slate-400">
                        <Pill size={16} />
                      </span>
                      <span>Pharmacy</span>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${pharmacyExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div className={`pl-8 space-y-1 overflow-hidden transition-all duration-350 ${pharmacyExpanded ? 'max-h-32 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <NavLink
                      to={`/portal?tab=buy-medicine&clinicId=${selectedClinicId}`}
                      onClick={onNavigate}
                      className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition"
                      style={{
                        backgroundColor: currentTab === 'buy-medicine' ? activeTheme.bgLight : 'transparent',
                        color: currentTab === 'buy-medicine' ? activeTheme.primary : '#64748b'
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentTab === 'buy-medicine' ? activeTheme.primary : '#cbd5e1' }} />
                      <span>Buy Medicine</span>
                    </NavLink>
                    <NavLink
                      to={`/portal?tab=pharmacy-orders&clinicId=${selectedClinicId}`}
                      onClick={onNavigate}
                      className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition"
                      style={{
                        backgroundColor: currentTab === 'pharmacy-orders' ? activeTheme.bgLight : 'transparent',
                        color: currentTab === 'pharmacy-orders' ? activeTheme.primary : '#64748b'
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentTab === 'pharmacy-orders' ? activeTheme.primary : '#cbd5e1' }} />
                      <span>My Orders</span>
                    </NavLink>
                  </div>
                </div>
              )}

              {/* Medical Documents */}
              <NavLink
                to={`/portal?tab=documents&clinicId=${selectedClinicId}`}
                onClick={onNavigate}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                style={{
                  backgroundColor: currentTab === 'documents' ? activeTheme.bgLight : 'transparent',
                  color: currentTab === 'documents' ? activeTheme.primary : '#475569'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0" style={{ color: currentTab === 'documents' ? activeTheme.primary : '#94a3b8' }}>
                    <FileText size={16} />
                  </span>
                  <span>Medical Documents</span>
                </div>
              </NavLink>

              {/* Bills & Payments */}
              <NavLink
                to={`/portal?tab=billing&clinicId=${selectedClinicId}`}
                onClick={onNavigate}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                style={{
                  backgroundColor: currentTab === 'billing' ? activeTheme.bgLight : 'transparent',
                  color: currentTab === 'billing' ? activeTheme.primary : '#475569'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0" style={{ color: currentTab === 'billing' ? activeTheme.primary : '#94a3b8' }}>
                    <CreditCard size={16} />
                  </span>
                  <span>Bills & Payments</span>
                </div>
              </NavLink>

              {/* My Clinics Section in Navigation */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">My Clinics</p>
                <div className="space-y-1">
                  {patientClinics.map((clinic) => {
                    const isCurrent = String(clinic._id) === String(selectedClinicId);
                    return (
                      <button
                        key={clinic._id}
                        onClick={() => handleClinicSelect(clinic._id)}
                        className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs transition duration-150 ${
                          isCurrent 
                            ? 'bg-slate-50 font-extrabold text-blue-600' 
                            : 'font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate flex-1 text-left">{clinic.name}</span>
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </nav>
          </div>

          {/* STATE 3A: LABORATORY WORKSPACE */}
          <div 
            className={`flex-1 flex flex-col min-h-0 absolute inset-0 transition-all duration-300 ${
              selectedClinicId && selectedLabId ? 'translate-x-0 opacity-100' : 'translate-x-[100%] opacity-0 pointer-events-none'
            }`}
          >
            {/* Back Button */}
            <div className="px-4 pt-3 pb-1 shrink-0">
              <button
                onClick={() => {
                  const currentParams = new URLSearchParams(location.search);
                  currentParams.delete('labId');
                  currentParams.set('tab', 'book-lab');
                  navigate(`/portal?${currentParams.toString()}`);
                }}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition duration-150"
              >
                <ChevronLeft size={14} />
                <span>Back to Laboratories</span>
              </button>
            </div>

            {/* Selected Laboratory Header Card */}
            {activeLab && (
              <div className="px-4 py-2 shrink-0 border-b border-slate-100">
                <div 
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-sm"
                  style={{ borderLeft: `4px solid ${activeTheme.primary}` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                      style={{ backgroundColor: activeTheme.bgLight }}
                    >
                      🧪
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate leading-tight">{activeLab.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Integrated Lab</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lab Workspace Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
              {[
                { label: 'All Lab Tests', tab: 'lab-tests', icon: <FlaskConical size={16} /> },
                { label: 'Health Packages', tab: 'lab-packages', icon: <Building2 size={16} /> },
                { label: 'My Bookings', tab: 'lab-bookings', icon: <Calendar size={16} /> },
                { label: 'Reports', tab: 'lab-reports', icon: <FileText size={16} /> }
              ].map((item, idx) => {
                const active = currentTab === item.tab;
                return (
                  <NavLink
                    key={idx}
                    to={`/portal?tab=${item.tab}&clinicId=${selectedClinicId}&labId=${selectedLabId}`}
                    onClick={onNavigate}
                    className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                    style={{
                      backgroundColor: active ? activeTheme.bgLight : 'transparent',
                      color: active ? activeTheme.primary : '#475569'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="shrink-0" style={{ color: active ? activeTheme.primary : '#94a3b8' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* STATE 3B: PHARMACY WORKSPACE */}
          <div 
            className={`flex-1 flex flex-col min-h-0 absolute inset-0 transition-all duration-300 ${
              selectedClinicId && selectedPharmacyId ? 'translate-x-0 opacity-100' : 'translate-x-[100%] opacity-0 pointer-events-none'
            }`}
          >
            {/* Back Button */}
            <div className="px-4 pt-3 pb-1 shrink-0">
              <button
                onClick={() => {
                  const currentParams = new URLSearchParams(location.search);
                  currentParams.delete('pharmacyId');
                  currentParams.set('tab', 'buy-medicine');
                  navigate(`/portal?${currentParams.toString()}`);
                }}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition duration-150"
              >
                <ChevronLeft size={14} />
                <span>Back to Pharmacies</span>
              </button>
            </div>

            {/* Selected Pharmacy Header Card */}
            {activePharmacy && (
              <div className="px-4 py-2 shrink-0 border-b border-slate-100">
                <div 
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-sm"
                  style={{ borderLeft: `4px solid ${activeTheme.primary}` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                      style={{ backgroundColor: activeTheme.bgLight }}
                    >
                      💊
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate leading-tight">{activePharmacy.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Integrated Store</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pharmacy Workspace Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
              {[
                { label: 'All Medicines', tab: 'pharmacy-medicines', icon: <Pill size={16} /> },
                { label: 'Categories', tab: 'pharmacy-categories', icon: <LayoutGrid size={16} /> },
                { label: 'Offers', tab: 'pharmacy-offers', icon: <TrendingUp size={16} /> },
                { label: 'My Cart', tab: 'pharmacy-cart', icon: <Activity size={16} /> },
                { label: 'My Orders', tab: 'pharmacy-orders-workspace', icon: <Clock size={16} /> },
                { label: 'Prescriptions', tab: 'pharmacy-prescriptions', icon: <FileText size={16} /> }
              ].map((item, idx) => {
                const active = currentTab === item.tab;
                return (
                  <NavLink
                    key={idx}
                    to={`/portal?tab=${item.tab}&clinicId=${selectedClinicId}&pharmacyId=${selectedPharmacyId}`}
                    onClick={onNavigate}
                    className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-150"
                    style={{
                      backgroundColor: active ? activeTheme.bgLight : 'transparent',
                      color: active ? activeTheme.primary : '#475569'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="shrink-0" style={{ color: active ? activeTheme.primary : '#94a3b8' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>

        </div>

        {/* Footer & Logout */}
        <div className="px-4 pb-4 pt-3 shrink-0 border-t border-slate-200 bg-white">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
            >
              <LogOut size={15} className="shrink-0 text-slate-400" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    );
  }


  if (!isClinicAdmin) {
    const isLabOperator = (role || '').toUpperCase() === 'LABORATORY OPERATOR';
    if (isLabOperator) {
      return (
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 flex flex-col w-[265px]
            bg-[#0b0f19] border-r border-white/[0.06]
            transition-transform duration-300 ease-spring
            lg:sticky lg:top-0 lg:h-screen
            ${open ? 'translate-x-0 lg:flex' : '-translate-x-full lg:hidden lg:w-0'}
          `}
        >
          {/* Brand Header */}
          <div className="px-5 pt-6 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shrink-0">
                <FlaskConical size={20} className="text-white" />
              </div>
              <div>
                <p className="text-base font-black text-white leading-none">AICMS</p>
                <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider leading-none">
                  LABORATORY WORKSPACE
                </p>
              </div>
            </div>
            <div className="mt-3 bg-white/[0.03] p-2.5 rounded-2xl border border-white/[0.06] flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-200 truncate">Ram's Diagnostic Laboratory</span>
              <span className="text-emerald-500 shrink-0 font-bold">🟢 Live</span>
            </div>
            <div className="mt-4 h-px bg-white/[0.08]" />
          </div>

          {/* LIS Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-4 custom-scrollbar text-xs font-bold text-slate-400">
            {/* Dashboard */}
            <div className="space-y-1">
              <NavLink
                to="/provider-workspace/laboratory?tab=dashboard"
                onClick={onNavigate}
                className={() =>
                  `w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    new URLSearchParams(window.location.search).get('tab') === 'dashboard' || !new URLSearchParams(window.location.search).get('tab')
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-white/[0.02] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🏠</span>
                  <span>Dashboard</span>
                </div>
              </NavLink>
            </div>

            {/* Operations */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 px-3 block font-black">Lab Operations</span>

              {/* Lab Orders */}
              <div className="space-y-1">
                <button
                  onClick={() => setLabOrdersCollapsed(!labOrdersCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>🧪</span>
                    <span>Lab Orders</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">8</span>
                    <ChevronRight size={12} className={`transition-transform duration-200 ${!labOrdersCollapsed ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {!labOrdersCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['New Orders', 'Pending Collection', 'Sample Collected', 'Sample Received', 'Under Processing', 'Report Ready', 'Delivered Reports', 'Cancelled Orders'].map(s => (
                      <NavLink key={s} to="/provider-workspace/laboratory?tab=orders" onClick={onNavigate} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</NavLink>
                    ))}
                  </div>
                )}
              </div>

              {/* Diagnostic Catalogue */}
              <div className="space-y-1">
                <button
                  onClick={() => setCatalogueCollapsed(!catalogueCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>🧬</span>
                    <span>Diagnostic Catalogue</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!catalogueCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!catalogueCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {[
                      { name: 'Test Catalogue', sub: 'test' },
                      { name: 'Test Categories', sub: 'categories' },
                      { name: 'Test Pricing', sub: 'pricing' },
                      { name: 'Test Packages', sub: 'packages' },
                      { name: 'Popular Tests', sub: 'popular' }
                    ].map(item => (
                      <NavLink key={item.name} to={`/provider-workspace/laboratory?tab=catalogue&sub=${item.sub}`} onClick={onNavigate} className="w-full text-left py-1 hover:text-white block font-medium">• {item.name}</NavLink>
                    ))}
                  </div>
                )}
              </div>

              {/* Patients */}
              <div className="space-y-1">
                <button
                  onClick={() => setPatientsCollapsed(!patientsCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>👥</span>
                    <span>Patients</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!patientsCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!patientsCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['All Patients', 'Today\'s Patients', 'Walk-in Patients', 'Patient History'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} log loaded.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sample Collection */}
              <div className="space-y-1">
                <button
                  onClick={() => setCollectionCollapsed(!collectionCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>📅</span>
                    <span>Sample Collection</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!collectionCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!collectionCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Collection Queue', 'Barcode Printing', 'Label Printing', 'Home Collection', 'Collection History'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} wizard opened.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Processing Queue */}
              <div className="space-y-1">
                <button
                  onClick={() => setProcessingCollapsed(!processingCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>⚙</span>
                    <span>Processing Queue</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!processingCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!processingCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Assigned Tests', 'In Progress', 'Awaiting QC', 'Verification Pending', 'Completed Processing'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} log loaded.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reports */}
              <div className="space-y-1">
                <button
                  onClick={() => setReportsCollapsed(!reportsCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>📄</span>
                    <span>Reports</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!reportsCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!reportsCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Pending Reports', 'Ready Reports', 'Verified Reports', 'Delivered Reports', 'Upload External Reports'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} window opened.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inventory */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 px-3 block font-black">Inventory</span>

              {/* Laboratory Inventory */}
              <div className="space-y-1">
                <button
                  onClick={() => setInventoryCollapsed(!inventoryCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>🧫</span>
                    <span>Laboratory Inventory</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!inventoryCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!inventoryCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Consumables', 'Reagents', 'Chemicals', 'Glassware', 'Inventory Stock', 'Low Stock', 'Expired Items'].map(s => (
                      <NavLink key={s} to="/provider-workspace/laboratory?tab=inventory" onClick={onNavigate} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</NavLink>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase & Stock Inward */}
              <div className="space-y-1">
                <button
                  onClick={() => setPurchaseCollapsed(!purchaseCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>📦</span>
                    <span>Purchase &amp; Inward</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!purchaseCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!purchaseCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Purchase Orders', 'Stock Inward', 'Suppliers', 'Purchase History'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} workspace opened.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => toast.success('Stock Transfer menu selected.')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all">
                <div className="flex items-center gap-2.5"><span>🔄</span><span>Stock Transfer</span></div>
              </button>
              <button onClick={() => toast.success('Returns workspace opened.')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all">
                <div className="flex items-center gap-2.5"><span>↩</span><span>Returns</span></div>
              </button>
              <button onClick={() => toast.success('Expiry & Batch Management list opened.')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all">
                <div className="flex items-center gap-2.5"><span>🏷</span><span>Expiry &amp; Batch</span></div>
              </button>
            </div>

            {/* Quality Control */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 px-3 block font-black">Quality Control</span>

              {/* QC & Calibration */}
              <div className="space-y-1">
                <button
                  onClick={() => setQCCollapsed(!qcCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>✅</span>
                    <span>QC &amp; Calibration</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!qcCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!qcCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Daily QC', 'Equipment Calibration', 'QC Reports', 'QC Failures', 'Maintenance Schedule'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} log opened.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Laboratory Equipment */}
              <div className="space-y-1">
                <button
                  onClick={() => setEquipmentCollapsed(!equipmentCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>🖥</span>
                    <span>Laboratory Equipment</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!equipmentCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!equipmentCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Equipment Status', 'Analyzer Queue', 'Maintenance', 'Calibration Due', 'Breakdown History'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} panel opened.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Analytics & System */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 px-3 block font-black">Analytics &amp; System</span>

              {/* Reports & Analytics */}
              <div className="space-y-1">
                <button
                  onClick={() => setAnalyticsCollapsed(!analyticsCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>📈</span>
                    <span>Reports &amp; Analytics</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!analyticsCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!analyticsCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Daily Reports', 'Revenue Reports', 'Test-wise Reports', 'Doctor Referral Reports', 'Technician Performance', 'Inventory Reports', 'QC Reports'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} loaded.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => toast.success('Notifications timeline loaded.')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all">
                <div className="flex items-center gap-2.5">
                  <span>🔔</span>
                  <span>Notifications</span>
                </div>
                <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">3</span>
              </button>

              {/* Settings */}
              <div className="space-y-1">
                <button
                  onClick={() => setSettingsCollapsed(!settingsCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span>⚙</span>
                    <span>Settings</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${!settingsCollapsed ? 'rotate-90' : ''}`} />
                </button>
                {!settingsCollapsed && (
                  <div className="pl-6 space-y-1 text-[10px] text-slate-500">
                    {['Laboratory Profile', 'Barcode Settings', 'Printer Configuration', 'Report Templates', 'Notification Settings'].map(s => (
                      <button key={s} onClick={() => toast.success(`${s} drawer opened.`)} className="w-full text-left py-1 hover:text-white block font-medium">• {s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* Bottom Profile card */}
          <div className="p-4 border-t border-white/[0.06] space-y-3 bg-white/[0.01]">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🏥</span>
              <div className="leading-tight text-[11px] truncate flex-1">
                <p className="font-extrabold text-slate-200 truncate">Ram's Diagnostic Laboratory</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Rajesh Sharma</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wide">Laboratory Operator</p>
              </div>
              <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded font-black uppercase shrink-0">🟢 Online</span>
            </div>

            <div className="flex gap-2 text-[10px] font-bold text-slate-500 border-t border-white/[0.06] pt-2 flex-wrap">
              <button onClick={() => toast.success('Opening documentation...')} className="hover:text-white">Docs</button>
              <span>·</span>
              <button onClick={() => toast.success('Connecting to support...')} className="hover:text-white">Support</button>
              <span>·</span>
              {onLogout && (
                <button onClick={onLogout} className="text-rose-600 hover:underline font-black">
                  Logout
                </button>
              )}
            </div>
          </div>
        </aside>
      );
    }

    return (
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col w-[265px]
          bg-[#0b0f19] border-r border-white/[0.06]
          transition-transform duration-300 ease-spring
          lg:sticky lg:top-0 lg:h-screen
          ${open ? 'translate-x-0 lg:flex' : '-translate-x-full lg:hidden lg:w-0'}
        `}
      >
        {/* Brand Header */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shrink-0">
              <PlusSquare size={20} className="text-white" />
            </div>
            <div>
              <p className="text-base font-black text-white leading-none">AICMS</p>
              <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider leading-none">
                AI Clinic Management System
              </p>
            </div>
          </div>
          <div className="mt-5 h-px bg-white/[0.08]" />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {visibleItems.map((item, idx) => {
            if (item.type === 'section') {
              return (
                <div key={`section-${idx}`} className="pt-5 pb-2 px-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 select-none">
                    {item.label}
                  </p>
                </div>
              );
            }

            const active = isItemActive(item);

            return (
              <NavLink
                key={item.path + item.label}
                to={item.path}
                onClick={onNavigate}
                className={() =>
                  `flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold transition duration-150 ${
                    active
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className={`shrink-0 ${active ? 'text-white' : 'text-slate-500'}`}>
                    {ICON_MAP[item.iconKey || item.label] || <ChevronRight size={16} />}
                  </span>
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer & Toggle Theme */}
        <div className="px-4 pb-4 pt-3 shrink-0 space-y-2 border-t border-white/[0.06]">

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
            >
              <LogOut size={15} className="shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col w-[265px]
          bg-white border-r border-slate-100
          transition-transform duration-300 ease-spring
          lg:sticky lg:top-0 lg:h-screen
          ${open ? 'translate-x-0 lg:flex' : '-translate-x-full lg:hidden lg:w-0'}
        `}
      >
        {/* Brand Header */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shrink-0">
              <PlusSquare size={20} className="text-white" />
            </div>
            <div>
              <p className="text-base font-black text-slate-900 leading-none">AICMS</p>
              <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider leading-none">
                AI Clinic Management System
              </p>
            </div>
          </div>

          {/* Subtle separator */}
          <div className="mt-5 h-px bg-slate-105" />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {visibleItems.map((item, idx) => {
            // Render section header
            if (item.type === 'section') {
              return (
                <div key={`section-${idx}`} className="pt-5 pb-2 px-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 select-none">
                    {item.label}
                  </p>
                </div>
              );
            }

            const active = isItemActive(item);
            
            // Custom badges matching layout image
            let badgeEl = null;
            if (item.label === 'Pharmacy') {
              badgeEl = (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  New
                </span>
              );
            } else if (item.label === 'Notifications') {
              badgeEl = (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                  12
                </span>
              );
            }

            return (
              <NavLink
                key={item.path + item.label}
                to={item.path}
                onClick={onNavigate}
                className={() =>
                  `flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold transition duration-150 ${
                    active
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className={`shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}>
                    {ICON_MAP[item.iconKey || item.label] || <ChevronRight size={16} />}
                  </span>
                  <span>{item.label}</span>
                  {item.isLocked && (
                    <span className="text-[10px] text-amber-500 font-extrabold animate-pulse">⭐</span>
                  )}
                </div>
                {badgeEl}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Plan & Storage Widgets */}
        <div className="p-4 mt-auto border-t border-slate-100 space-y-4 shrink-0 bg-white">
          {/* Current Plan Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Plan 👑</p>
                <p className="text-xs font-black text-slate-905 mt-1">{planName}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Valid till {expiryFormatted}</p>
              </div>
            </div>
            {(!activeFeatures.includes('pharmacy') && !activeFeatures.includes('labs')) && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-850 font-bold">
                ⚠️ Pharmacy & Labs modules are locked under your current plan.
              </div>
            )}
            <button
              onClick={() => navigate('/admin/subscription')}
              className="w-full py-2 bg-white hover:bg-slate-50 border border-blue-650 text-blue-600 text-xs font-bold rounded-xl transition shadow-sm animate-pulse"
            >
              {(!activeFeatures.includes('pharmacy') && !activeFeatures.includes('labs')) ? '🚀 Upgrade Plan' : 'View Plan Details'}
            </button>
          </div>

          {/* Storage Used Progress Bar */}
          <div className="space-y-1.5 px-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>Storage Used</span>
              <span>45.6 GB / 200 GB</span>
              <span>22%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: '22%' }} />
            </div>
          </div>

          {/* Need Help Support Link */}
          <div className="flex items-center gap-1.5 justify-center py-1 text-[11px] text-slate-400 font-bold">
            <span>🎧</span>
            <span>Need Help?</span>
            <button onClick={() => alert('Support line open')} className="text-blue-600 hover:underline">Contact Support</button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
