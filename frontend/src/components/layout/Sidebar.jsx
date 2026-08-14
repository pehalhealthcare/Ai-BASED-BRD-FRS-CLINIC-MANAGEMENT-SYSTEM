import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, UserCog, UserCheck, LayoutGrid,
  Building2, Activity, CreditCard, Receipt, BarChart3, Package,
  Settings, ChevronDown, ChevronRight, ChevronLeft, X, Menu, Lock, User,
  ClipboardList, FlaskConical, Pill, FileText, Stethoscope
} from 'lucide-react';
import { clinicApi, patientApi, providersApi } from '../../lib/api';
import pehalLogo from '../../assets/pehal_logo.svg';

const ICON_MAP = {
  'Dashboard': <LayoutDashboard size={20} />,
  'Appointments': <Calendar size={20} />,
  'Patients': <Users size={20} />,
  'Doctors': <UserCog size={20} />,
  'Staff': <UserCheck size={20} />,
  'Departments': <LayoutGrid size={20} />,
  'Healthcare Providers': <Building2 size={20} />,
  'Procedures': <Activity size={20} />,
  'Billing & Invoices': <CreditCard size={20} />,
  'Payments': <Receipt size={20} />,
  'Reports': <BarChart3 size={20} />,
  'Reports & Analytics': <BarChart3 size={20} />,
  'Subscription & Plan': <BarChart3 size={20} />,
  'Inventory': <Package size={20} />,
  'Pharmacy': <Package size={20} />,
  'Laboratory': <LayoutGrid size={20} />,
  'Lab Consumables': <Package size={20} />,
  'Branches': <Building2 size={20} />,
  'Notifications': <Activity size={20} />,
  'Settings': <Settings size={20} />,
  'My Portal': <LayoutDashboard size={20} />,
  'Lab Tests': <Activity size={20} />,
  'Pharmacy Store': <Package size={20} />,
  'Clinics': <Building2 size={20} />,
  'Plans': <CreditCard size={20} />,
  'Promo Codes': <Receipt size={20} />,
  'Global Lab Catalog': <LayoutGrid size={20} />,
  'Global Medicine Catalog': <Package size={20} />
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
  const location = useLocation();
  const navigate = useNavigate();

  const normRole = (role || '').toUpperCase();
  const isLabRole = normRole === 'LABORATORY OPERATOR' || normRole === 'LAB_TECHNICIAN';

  const isPatient = role === 'PATIENT';
  const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';

  // State hooks for Patient context
  const [patientClinics, setPatientClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(() => localStorage.getItem('patientActiveClinicId') || '');
  const [patientProfile, setPatientProfile] = useState(null);
  const [labExpanded, setLabExpanded] = useState(false);
  const [pharmacyExpanded, setPharmacyExpanded] = useState(false);

  // Sub-menu expansion states
  const [expandedMenus, setExpandedMenus] = useState({
    inventory: false,
    suppliers: false,
    reports: false
  });

  const toggleSubMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Sync menu expansion states with route changes on mount and search params changes
  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab') || '';
    if (tabParam === 'inventory') {
      setExpandedMenus(prev => ({ ...prev, inventory: true }));
    } else if (['suppliers', 'purchase-orders', 'manufacturers'].includes(tabParam)) {
      setExpandedMenus(prev => ({ ...prev, suppliers: true }));
    } else if (['sales-performance', 'inventory-ledger', 'reports'].includes(tabParam)) {
      setExpandedMenus(prev => ({ ...prev, reports: true }));
    }
  }, [location.search]);

  // Fetch clinics list for patient
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

  // Fetch patient profile details
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

  // Sync selected clinic from URL search params
  useEffect(() => {
    const currentParams = new URLSearchParams(location.search);
    const urlClinicId = currentParams.get('clinicId');
    if (urlClinicId) {
      setSelectedClinicId(urlClinicId);
      localStorage.setItem('patientActiveClinicId', urlClinicId);
    }
  }, [location.search]);

  const selectedClinic = useMemo(() => {
    return patientClinics.find(c => String(c._id) === String(selectedClinicId)) || null;
  }, [patientClinics, selectedClinicId]);

  const activeTheme = useMemo(() => {
    return getClinicTheme(selectedClinic?.name);
  }, [selectedClinic]);

  const clinicName = user?.clinic?.name || "Ram's Dental Clinic";
  const planName = user?.clinic?.subscription?.planId?.name || 'AI Premium Clinic';

  // Sidebar Menu options configuration for non-patient roles
  const menuItems = useMemo(() => {
    if (role === 'RECEPTIONIST') {
      return [
        { label: 'Dashboard', path: '/dashboard', iconKey: 'Dashboard' },
        { label: 'Appointments', path: '/appointments', iconKey: 'Appointments' },
        { label: 'Doctors', path: '/doctors', iconKey: 'Doctors' },
        { label: 'Patients', path: '/patients', iconKey: 'Patients' },
        { label: 'Procedures', path: '/procedures', iconKey: 'Procedures' },
        { label: 'Billing', path: '/billing', iconKey: 'Billing & Invoices' },
        { label: 'Laboratory', path: '/labs/orders', iconKey: 'Laboratory' },
        { label: 'Pharmacy', path: '/pharmacy/medicines', iconKey: 'Pharmacy' }
      ];
    }

    const normRole = (role || '').toUpperCase();
    if (normRole === 'PHARMACY STORE OPERATOR' || role === 'PHARMACIST') {
      return [
        { label: 'Dashboard', path: '/provider-workspace/pharmacy?tab=dashboard', iconKey: 'Dashboard' },
        { label: 'Prescription Orders', path: '/provider-workspace/pharmacy?tab=orders', iconKey: 'Procedures' },
        { label: 'Recent Online Orders', path: '/pharmacist/orders/online', iconKey: 'Pharmacy Store' },
        { label: 'Walk-in Sales', path: '/provider-workspace/pharmacy?tab=walk-in', iconKey: 'Billing & Invoices' },
        { label: 'Handover Queue', path: '/provider-workspace/pharmacy?tab=handover', iconKey: 'Staff' },
        { label: 'Patients', path: '/provider-workspace/pharmacy?tab=patients', iconKey: 'Patients' },
        { 
          label: 'Inventory', 
          path: '/provider-workspace/pharmacy?tab=inventory', 
          iconKey: 'Pharmacy',
          menuKey: 'inventory',
          subItems: [
            { label: 'Stock List', path: '/provider-workspace/pharmacy?tab=inventory&sub=stock-list' },
            { label: 'Stock Inward', path: '/provider-workspace/pharmacy?tab=inventory&sub=stock-inward' }
          ]
        },
        { label: 'Global Medicine Catalogue', path: '/provider-workspace/pharmacy?tab=catalogue', iconKey: 'Departments' },
        { 
          label: 'Supplier & Manufacturer', 
          path: '/provider-workspace/pharmacy?tab=suppliers', 
          iconKey: 'Staff',
          menuKey: 'suppliers',
          subItems: [
            { label: 'Suppliers', path: '/provider-workspace/pharmacy?tab=suppliers' },
            { label: 'Purchase Orders', path: '/provider-workspace/pharmacy?tab=purchase-orders' },
            { label: 'Manufacturers', path: '/provider-workspace/pharmacy?tab=manufacturers' }
          ]
        },
        { label: 'Expiry & Batch Management', path: '/provider-workspace/pharmacy?tab=expiry', iconKey: 'Procedures' },
        { label: 'Stock Transfer', path: '/provider-workspace/pharmacy?tab=transfer', iconKey: 'Branches' },
        { label: 'Returns', path: '/provider-workspace/pharmacy?tab=returns', iconKey: 'Settings' },
        { label: 'Sales', path: '/provider-workspace/pharmacy?tab=sales', iconKey: 'Payments' },
        { label: 'Discount Coupons', path: '/provider-workspace/pharmacy?tab=coupons', iconKey: 'Billing & Invoices' },
        { 
          label: 'Reports & Analytics', 
          path: '/provider-workspace/pharmacy?tab=sales-performance', 
          iconKey: 'Reports',
          menuKey: 'reports',
          subItems: [
            { label: 'Sales Performance', path: '/provider-workspace/pharmacy?tab=sales-performance' },
            { label: 'Inventory Ledger', path: '/provider-workspace/pharmacy?tab=inventory-ledger' }
          ]
        },
        { label: 'Settings', path: '/provider-workspace/pharmacy?tab=settings', iconKey: 'Settings' }
      ];
    }

    if (normRole === 'LABORATORY OPERATOR' || role === 'LAB_TECHNICIAN') {
      return [
        { label: 'Dashboard', path: '/provider-workspace/laboratory?tab=dashboard', iconKey: 'Dashboard' },
        { label: 'Lab Orders', path: '/provider-workspace/laboratory?tab=orders', iconKey: 'Laboratory' },
        { label: 'Diagnostic Catalogue', path: '/provider-workspace/laboratory?tab=catalogue', iconKey: 'Departments' },
        { label: 'Lab Inventory', path: '/provider-workspace/laboratory?tab=inventory', iconKey: 'Pharmacy' },
        { label: 'QC & Calibration', path: '/provider-workspace/laboratory?tab=qc', iconKey: 'Procedures' },
        { label: 'Reports & Analytics', path: '/provider-workspace/laboratory?tab=reports', iconKey: 'Reports' },
        { label: 'Settings', path: '/provider-workspace/laboratory?tab=settings', iconKey: 'Settings' }
      ];
    }

    if (role === 'DOCTOR') {
      return [
        { label: 'Dashboard', path: '/dashboard', iconKey: 'Dashboard' },
        { label: 'Appointments', path: '/appointments', iconKey: 'Appointments' },
        { label: 'Patients', path: '/patients', iconKey: 'Patients' },
        { label: 'Procedures', path: '/procedures', iconKey: 'Procedures' },
        { label: 'Doctor Leaves', path: '/doctor/leaves', iconKey: 'Staff' },
        { label: 'Earnings', path: '/doctor/earnings', iconKey: 'Payments' },
        { label: 'Notifications / Messages', path: '/notifications/logs', iconKey: 'Notifications' }
      ];
    }

    if (normRole === 'SUPER_ADMIN') {
      return [
        { label: 'Clinics', path: '/super-admin/clinics', iconKey: 'Clinics' },
        { label: 'Plans', path: '/super-admin/plans', iconKey: 'Plans' },
        { label: 'Promo Codes', path: '/super-admin/promo-codes', iconKey: 'Promo Codes' },
        { label: 'Global Lab Catalog', path: '/super-admin/healthcare-catalog/labs', iconKey: 'Global Lab Catalog' },
        { label: 'Global Medicine Catalog', path: '/super-admin/healthcare-catalog/medicines', iconKey: 'Global Medicine Catalog' }
      ];
    }

    return [
      { label: 'Dashboard', path: '/clinic/dashboard', iconKey: 'Dashboard' },
      { label: 'Appointments', path: '/appointments', iconKey: 'Appointments' },
      { label: 'Patients', path: '/patients', iconKey: 'Patients' },
      { label: 'Doctors', path: '/doctors', iconKey: 'Doctors' },
      { label: 'Staff', path: '/admin/my-receptionists-dashboard', iconKey: 'Staff' },
      { label: 'Departments', path: '/admin/departments', iconKey: 'Departments' },
      { label: 'Healthcare Providers', path: '/admin/providers', iconKey: 'Healthcare Providers' },
      { label: 'Procedures', path: '/procedures', iconKey: 'Procedures' },
      { label: 'Billing & Invoices', path: '/billing', iconKey: 'Billing & Invoices' },
      { label: 'Payments', path: '/billing/financials', iconKey: 'Payments' },
      { label: 'Reports', path: '/admin/reports', iconKey: 'Reports' },
      { label: 'Inventory', path: '/pharmacy/medicines', iconKey: 'Inventory' },
      { label: 'Settings', path: '/admin/settings', iconKey: 'Settings' }
    ];
  }, [role]);

  const handleClinicSelect = (clinicId) => {
    localStorage.setItem('patientActiveClinicId', clinicId);
    setSelectedClinicId(clinicId);
    window.dispatchEvent(new CustomEvent('patient:clinic-changed', { detail: clinicId }));
    const currentParams = new URLSearchParams(location.search);
    const activeTab = currentParams.get('tab') || 'dashboard';
    navigate(`/portal?tab=${activeTab === 'clinics' ? 'dashboard' : activeTab}&clinicId=${clinicId}`);
  };

  const isItemActive = (path) => {
    const normRole = (role || '').toUpperCase();
    if (normRole === 'PATIENT' || normRole === 'PHARMACY STORE OPERATOR' || normRole === 'LABORATORY OPERATOR' || normRole === 'PHARMACIST' || normRole === 'LAB_TECHNICIAN') {
      const itemUrl = new URL(path, window.location.origin);
      const isPathMatch = location.pathname === itemUrl.pathname;
      const itemTab = itemUrl.searchParams.get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';
      const itemSub = itemUrl.searchParams.get('sub');
      const currentSub = new URLSearchParams(location.search).get('sub');
      
      // If parent item is checked, we also match if the tab is selected
      if (itemSub) {
        return isPathMatch && itemTab === currentTab && itemSub === currentSub;
      }
      return isPathMatch && itemTab === currentTab;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const bottomCardInfo = useMemo(() => {
    if (role === 'DOCTOR') {
      return {
        title: 'Doctor Profile',
        subtitle: user?.specialization?.name || 'General Medicine',
        name: user?.name || 'Doctor',
        icon: <User size={20} className="text-emerald-500" />
      };
    }
    if (role === 'PATIENT') {
      return {
        title: 'Patient Membership',
        subtitle: `UHID: ${user?.patientId || '—'}`,
        name: user?.name || 'Patient',
        icon: <User size={20} className="text-emerald-500" />
      };
    }
    if (role === 'RECEPTIONIST') {
      return {
        title: 'Reception Desk',
        subtitle: 'Indirapuram Branch',
        name: user?.name || 'Receptionist',
        icon: <Users size={20} className="text-emerald-500" />
      };
    }
    if (role === 'LAB_TECHNICIAN') {
      return {
        title: 'Laboratory Workspace',
        subtitle: 'Lab Department',
        name: user?.name || 'Technician',
        icon: <Activity size={20} className="text-emerald-500" />
      };
    }
    if (role === 'PHARMACIST' || role === 'PHARMACY_OPERATOR' || role === 'PHARMACY STORE OPERATOR') {
      return {
        title: 'Pharmacy Workspace',
        subtitle: 'Pharmacy Store',
        name: user?.name || 'Pharmacist',
        icon: <Package size={20} className="text-emerald-500" />
      };
    }
    return {
      title: 'Current Plan 👑',
      subtitle: '170GB / 200GB Used',
      name: planName,
      icon: <Building2 size={20} className="text-emerald-500" />
    };
  }, [role, user, planName]);

  // Patient Sidebar content
  const renderPatientSidebarContent = (isMobileOrOverlay = false) => {
    return (
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* STATE 1: MY CLINICS SELECTOR */}
        <div 
          className={`flex-1 flex flex-col min-h-0 absolute inset-0 transition-all duration-300 ${
            selectedClinicId ? 'translate-x-[-100%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
          }`}
        >
          <div className="px-5 pt-4 pb-2 shrink-0">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">My Clinics</h4>
          </div>
          
          <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-3 [scrollbar-width:none]">
            {patientClinics.map((clinic) => {
              const theme = getClinicTheme(clinic.name);
              const isSelected = String(clinic._id) === String(selectedClinicId);
              return (
                <div
                  key={clinic._id}
                  onClick={() => handleClinicSelect(clinic._id)}
                  className={`p-4 rounded-2xl border bg-white cursor-pointer transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] flex items-center justify-between gap-3 ${
                    isSelected ? 'border-2 shadow-sm' : 'border-slate-200'
                  }`}
                  style={{ borderColor: isSelected ? theme.primary : undefined }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-55 bg-slate-50 flex items-center justify-center shrink-0 text-base font-extrabold">
                      🏥
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate leading-snug">{clinic.name}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{clinic.address?.city || 'Registered'}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0" />
                </div>
              );
            })}
          </nav>
        </div>

        {/* STATE 2: CLINIC SPECIFIC NAVIGATION */}
        <div 
          className={`flex-1 flex flex-col min-h-0 absolute inset-0 transition-all duration-300 ${
            selectedClinicId ? 'translate-x-0 opacity-100' : 'translate-x-[100%] opacity-0 pointer-events-none'
          }`}
        >
          {/* Back Button */}
          <div className="px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={() => {
                setSelectedClinicId('');
                localStorage.removeItem('patientActiveClinicId');
              }}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition duration-150"
            >
              <ChevronLeft size={14} />
              <span>Back to My Clinics</span>
            </button>
          </div>

          {selectedClinic && (
            <div className="px-4 py-3 shrink-0 border-b border-slate-100 space-y-3 bg-slate-50/50">
              <div>
                <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">Current Clinic</p>
                <div 
                  onClick={() => {
                    setSelectedClinicId('');
                    localStorage.removeItem('patientActiveClinicId');
                  }}
                  className="mt-1.5 p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2.5 shadow-sm hover:shadow-md transition cursor-pointer"
                  style={{ borderLeft: `3.5px solid ${activeTheme.primary}` }}
                >
                  <span className="text-sm shrink-0">🏥</span>
                  <span className="text-xs font-black text-slate-800 truncate flex-1">{selectedClinic.name}</span>
                  <ChevronDown size={12} className="text-slate-400 shrink-0" />
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 [scrollbar-width:none]">
            <NavLink
              to={`/portal?tab=dashboard&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'dashboard' ? 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <LayoutDashboard size={20} className={currentTab === 'dashboard' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=my-clinic&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'my-clinic' ? 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <Building2 size={20} className={currentTab === 'my-clinic' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>My Clinic</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=appointments&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'appointments' ? 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <Calendar size={20} className={currentTab === 'appointments' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>Appointments</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=history&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'history' ? 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <Stethoscope size={20} className={currentTab === 'history' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>Consultation History</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=prescriptions&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'prescriptions' ? 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <ClipboardList size={20} className={currentTab === 'prescriptions' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>Prescriptions</span>
            </NavLink>

            {/* Laboratory Accordion */}
            {isClinicFeatureActive(selectedClinic, 'labs') && (
              <div className="space-y-1">
                <button
                  onClick={() => setLabExpanded(!labExpanded)}
                  className="w-full flex items-center justify-between px-3.5 h-[46px] rounded-2xl text-[13px] font-bold text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition duration-150"
                >
                  <div className="flex items-center gap-3">
                    <FlaskConical size={20} className="text-slate-400" />
                    <span>Laboratory</span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${labExpanded ? 'rotate-180' : ''}`} />
                </button>
                <div className={`pl-9 space-y-1.5 overflow-hidden transition-all duration-300 ${labExpanded ? 'max-h-32 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                  <NavLink
                    to={`/portal?tab=book-lab&clinicId=${selectedClinicId}`}
                    onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
                    className={`flex items-center gap-2 py-1.5 text-xs font-bold ${currentTab === 'book-lab' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-650'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'book-lab' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>Book Lab Test</span>
                  </NavLink>
                  <NavLink
                    to={`/portal?tab=labs&clinicId=${selectedClinicId}`}
                    onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
                    className={`flex items-center gap-2 py-1.5 text-xs font-bold ${currentTab === 'labs' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-650'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'labs' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>View Lab Reports</span>
                  </NavLink>
                </div>
              </div>
            )}

            {/* Pharmacy Accordion */}
            {isClinicFeatureActive(selectedClinic, 'pharmacy') && (
              <div className="space-y-1">
                <button
                  onClick={() => setPharmacyExpanded(!pharmacyExpanded)}
                  className="w-full flex items-center justify-between px-3.5 h-[46px] rounded-2xl text-[13px] font-bold text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition duration-150"
                >
                  <div className="flex items-center gap-3">
                    <Pill size={20} className="text-slate-400" />
                    <span>Pharmacy</span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${pharmacyExpanded ? 'rotate-180' : ''}`} />
                </button>
                <div className={`pl-9 space-y-1.5 overflow-hidden transition-all duration-300 ${pharmacyExpanded ? 'max-h-32 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                  <NavLink
                    to={`/portal?tab=buy-medicine&clinicId=${selectedClinicId}`}
                    onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
                    className={`flex items-center gap-2 py-1.5 text-xs font-bold ${currentTab === 'buy-medicine' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-655'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'buy-medicine' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>Buy Medicine</span>
                  </NavLink>
                  <NavLink
                    to={`/portal?tab=pharmacy-orders&clinicId=${selectedClinicId}`}
                    onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
                    className={`flex items-center gap-2 py-1.5 text-xs font-bold ${currentTab === 'pharmacy-orders' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-655'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'pharmacy-orders' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>My Orders</span>
                  </NavLink>
                </div>
              </div>
            )}

            <NavLink
              to={`/portal?tab=documents&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'documents' ? 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-805 border-l-4 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <FileText size={20} className={currentTab === 'documents' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>Medical Documents</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=billing&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'billing' ? 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-805 border-l-4 border-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <CreditCard size={20} className={currentTab === 'billing' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>Bills & Payments</span>
            </NavLink>

            {/* Quick Switch Clinics Deck */}
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
      </div>
    );
  };

  return (
    <>
      {/* State 1: Closed Sidebar (Fixed Icon Rail on Mobile/Tablet) */}
      <aside className="fixed inset-y-0 left-0 z-30 w-[72px] sm:w-[80px] bg-white border-r border-slate-150 flex flex-col items-center py-5 shadow-md rounded-r-3xl xl:hidden select-none">
        <div className="flex flex-col items-center gap-6 w-full shrink-0">
          <button 
            onClick={() => onNavigate && onNavigate(true)}
            className="p-2 rounded-xl hover:bg-slate-50 transition text-slate-800"
          >
            <Menu size={22} />
          </button>
          <img src={pehalLogo} alt="Pehal" className="h-9 w-auto" />
        </div>

        <nav className="flex-1 w-full overflow-y-auto px-2 py-6 space-y-3.5 flex flex-col items-center [scrollbar-width:none]">
          {isPatient ? (
            <div className="relative group flex items-center justify-center">
              <button
                onClick={() => { setSelectedClinicId(''); localStorage.removeItem('patientActiveClinicId'); onNavigate && onNavigate(true); }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500"
              >
                <Building2 size={20} />
              </button>
            </div>
          ) : (
            menuItems.map((item, idx) => {
              const active = isItemActive(item.path);
              return (
                <div key={idx} className="relative group flex items-center justify-center">
                  <NavLink
                    to={item.path}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      active 
                        ? (isLabRole ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-800 border-l-4 border-purple-500 shadow-sm' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-sm') 
                        : (isLabRole ? 'text-slate-400 hover:bg-slate-50 hover:text-purple-500' : 'text-slate-400 hover:bg-slate-50 hover:text-emerald-500')
                    }`}
                  >
                    <span className={active ? (isLabRole ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
                      {ICON_MAP[item.iconKey] || <LayoutGrid size={20} />}
                    </span>
                  </NavLink>
                  <div className="absolute left-16 bg-slate-900 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-50 hidden sm:block">
                    {item.label}
                  </div>
                </div>
              );
            })
          )}
        </nav>
      </aside>

      {/* State 2: Open Overlay Sidebar Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => onNavigate && onNavigate(false)}
              className="fixed inset-0 bg-black backdrop-blur-sm z-40 xl:hidden"
            />

            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-2xl xl:hidden select-none border-r border-slate-150"
            >
              <div className="p-5 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <img src={pehalLogo} alt="Pehal" className="h-10 w-auto" />
                  <div>
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">AICMS</h2>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">AI Clinic Management</span>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate && onNavigate(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-555"
                >
                  <X size={18} />
                </button>
              </div>

              {isPatient ? (
                renderPatientSidebarContent(true)
              ) : (
                <>
                  <div className="px-5 pt-4 shrink-0">
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 flex items-center justify-between hover:bg-slate-100/60 transition cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Branch</p>
                        <p className="text-xs font-black text-slate-800 truncate mt-0.5">{clinicName}</p>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-600 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Active
                        </span>
                      </div>
                      <ChevronDown size={14} className="text-slate-405" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 [scrollbar-width:none]">
                    {menuItems.map((item, idx) => {
                      const active = isItemActive(item.path);
                      const isExpandable = !!item.subItems;
                      const isExpanded = expandedMenus[item.menuKey];

                      return (
                        <div key={idx} className="space-y-1">
                          {isExpandable ? (
                            <>
                              <button
                                onClick={() => toggleSubMenu(item.menuKey)}
                                className={`w-full flex items-center justify-between px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                                  active 
                                    ? (isLabRole ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-800 border-l-4 border-purple-500' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500') 
                                    : `text-slate-500 hover:bg-slate-50 ${isLabRole ? 'hover:text-purple-650' : 'hover:text-emerald-650'}`
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={active ? (isLabRole ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
                                    {ICON_MAP[item.iconKey] || <LayoutGrid size={20} />}
                                  </span>
                                  <span>{item.label}</span>
                                </div>
                                <ChevronRight size={14} className={`transform transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                              <div className={`pl-9 space-y-1.5 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                                {item.subItems.map((sub, sIdx) => {
                                  const subActive = isItemActive(sub.path);
                                  return (
                                    <NavLink
                                      key={sIdx}
                                      to={sub.path}
                                      onClick={() => onNavigate && onNavigate(false)}
                                      className={`flex items-center gap-2 py-1.5 text-xs font-bold px-3 rounded-xl transition duration-150 ${
                                        subActive 
                                          ? (isLabRole ? 'bg-purple-50/50 text-purple-600' : 'bg-emerald-50/50 text-emerald-600') 
                                          : `text-slate-450 hover:bg-slate-50/30 ${isLabRole ? 'hover:text-purple-655' : 'hover:text-emerald-655'}`
                                      }`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${subActive ? (isLabRole ? 'bg-purple-500' : 'bg-emerald-500') : 'bg-slate-350'}`} />
                                      <span>{sub.label}</span>
                                    </NavLink>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <NavLink
                              to={item.path}
                              onClick={() => onNavigate && onNavigate(false)}
                              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                                active
                                  ? (isLabRole ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-805 border-l-4 border-purple-500 shadow-sm' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-855 border-l-4 border-emerald-500 shadow-sm')
                                  : `text-slate-500 hover:bg-slate-50 ${isLabRole ? 'hover:text-purple-600' : 'hover:text-emerald-600'}`
                              }`}
                            >
                              <span className={active ? (isLabRole ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
                                {ICON_MAP[item.iconKey] || <LayoutGrid size={20} />}
                              </span>
                              <span>{item.label}</span>
                            </NavLink>
                          )}
                        </div>
                      );
                    })}

                    {/* Quick Actions (For Receptionists) */}
                    {role === 'RECEPTIONIST' && (
                      <div className="mt-6 pt-4 border-t border-slate-100 px-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pb-2">QUICK ACTIONS</p>
                        <button
                          onClick={() => {
                            if (onNavigate) onNavigate(false);
                            if (onAddWalkIn) onAddWalkIn();
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition duration-150 shadow-md cursor-pointer uppercase tracking-wider"
                        >
                          <Calendar size={15} />
                          <span>+ New Appointment</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="p-4 border-t border-slate-100 shrink-0 space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 flex gap-3.5 relative shadow-sm">
                  <div className="w-[42px] h-[42px] shrink-0 rounded-2xl bg-emerald-50/60 flex items-center justify-center border border-emerald-100">
                    {bottomCardInfo.icon}
                  </div>
                  <div className="min-w-0 flex-1 leading-none">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{bottomCardInfo.title}</span>
                    <p className="text-xs font-black text-slate-855 mt-1 truncate">{bottomCardInfo.name}</p>
                    <p className="text-[9px] text-slate-405 font-bold mt-1 truncate">{bottomCardInfo.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/75 border-t border-slate-150 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-655 font-bold flex items-center justify-center text-xs overflow-hidden">
                    {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                  </div>
                  <div className="min-w-0 leading-none">
                    <p className="text-xs font-black text-slate-800 truncate">{user?.name || 'User'}</p>
                    <span className="text-[9px] text-slate-400 font-bold block mt-1 capitalize">{role.toLowerCase()}</span>
                  </div>
                </div>
                <button onClick={onLogout} className="text-xs font-bold text-rose-500 hover:underline shrink-0">Logout</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* State 3: Desktop Persistent Sidebar */}
      <aside className={`hidden xl:flex flex-col bg-white border-r border-slate-150 h-screen sticky top-0 shrink-0 select-none shadow-[2px_0_12px_rgba(0,0,0,0.015)] rounded-r-3xl transition-all duration-300 ${open ? 'w-72' : 'w-20'}`}>
        <div className="px-5 pt-6 pb-4 shrink-0 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img src={pehalLogo} alt="Pehal" className="h-[42px] w-auto" />
            {open && (
              <div>
                <p className="text-sm font-black text-slate-900 tracking-tight">AICMS</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">AI CLINIC MANAGEMENT SYSTEM</p>
              </div>
            )}
          </div>

          {open && !isPatient && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between shadow-sm hover:bg-slate-100/60 transition duration-150 cursor-pointer">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Clinic</p>
                <p className="text-xs font-black text-slate-800 truncate mt-0.5">{clinicName}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">All Branches</p>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
            </div>
          )}
        </div>

        {isPatient ? (
          open ? (
            renderPatientSidebarContent(false)
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <button
                onClick={() => { setSelectedClinicId(''); localStorage.removeItem('patientActiveClinicId'); onNavigate && onNavigate(true); }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500 shadow-sm"
              >
                <Building2 size={20} />
              </button>
            </div>
          )
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 [scrollbar-width:none]">
              {menuItems.map((item, idx) => {
                const active = isItemActive(item.path);
                const isExpandable = !!item.subItems;
                const isExpanded = expandedMenus[item.menuKey];

                return (
                  <div key={idx} className="space-y-1">
                    {open ? (
                      isExpandable ? (
                        <>
                          <button
                            onClick={() => toggleSubMenu(item.menuKey)}
                            className={`w-full flex items-center justify-between px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                              active 
                                ? (isLabRole ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-800 border-l-4 border-purple-500' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500') 
                                : `text-slate-500 hover:bg-slate-50 ${isLabRole ? 'hover:text-purple-650' : 'hover:text-emerald-650'}`
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={active ? (isLabRole ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
                                {ICON_MAP[item.iconKey] || <LayoutGrid size={20} />}
                              </span>
                              <span>{item.label}</span>
                            </div>
                            <ChevronRight size={14} className={`transform transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          <div className={`pl-9 space-y-1.5 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                            {item.subItems.map((sub, sIdx) => {
                              const subActive = isItemActive(sub.path);
                              return (
                                <NavLink
                                  key={sIdx}
                                  to={sub.path}
                                  className={`flex items-center gap-2 py-1.5 text-xs font-bold px-3 rounded-xl transition duration-150 ${
                                    subActive 
                                      ? (isLabRole ? 'bg-purple-50/50 text-purple-600' : 'bg-emerald-50/50 text-emerald-600') 
                                      : `text-slate-450 hover:bg-slate-50/30 ${isLabRole ? 'hover:text-purple-655' : 'hover:text-emerald-655'}`
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${subActive ? (isLabRole ? 'bg-purple-500' : 'bg-emerald-500') : 'bg-slate-350'}`} />
                                  <span>{sub.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <NavLink
                          to={item.path}
                          className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                            active
                              ? (isLabRole ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-800 border-l-4 border-purple-500 shadow-sm' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-sm')
                              : `text-slate-500 hover:bg-slate-50 ${isLabRole ? 'hover:text-purple-600' : 'hover:text-emerald-600'}`
                          }`}
                        >
                          <span className={active ? (isLabRole ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
                            {ICON_MAP[item.iconKey] || <LayoutGrid size={20} />}
                          </span>
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    ) : (
                      <div className="relative group flex items-center justify-center">
                        <NavLink
                          to={item.path}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            active 
                              ? (isLabRole ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-805 border-l-4 border-purple-500 shadow-sm' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-805 border-l-4 border-emerald-500 shadow-sm') 
                              : (isLabRole ? 'text-slate-400 hover:bg-slate-50 hover:text-purple-555' : 'text-slate-400 hover:bg-slate-50 hover:text-emerald-555')
                          }`}
                        >
                          <span className={active ? (isLabRole ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
                            {ICON_MAP[item.iconKey] || <LayoutGrid size={20} />}
                          </span>
                        </NavLink>
                        <div className="absolute left-16 bg-slate-900 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quick Actions (For Receptionists) */}
              {role === 'RECEPTIONIST' && open && (
                <div className="mt-6 pt-4 border-t border-slate-100 px-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pb-2">QUICK ACTIONS</p>
                  <button
                    onClick={onAddWalkIn}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition duration-150 shadow-md cursor-pointer uppercase tracking-wider"
                  >
                    <Calendar size={15} />
                    <span>+ New Appointment</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {open && (
          <div className="p-4 border-t border-slate-100 bg-white shrink-0 space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 flex gap-3.5 relative shadow-sm">
              <div className="w-[42px] h-[42px] shrink-0 rounded-2xl bg-emerald-50/60 flex items-center justify-center border border-emerald-100">
                {bottomCardInfo.icon}
              </div>
              <div className="min-w-0 flex-1 leading-none">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{bottomCardInfo.title}</span>
                <p className="text-xs font-black text-slate-850 mt-1 truncate">{bottomCardInfo.name}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-1 truncate">{bottomCardInfo.subtitle}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
