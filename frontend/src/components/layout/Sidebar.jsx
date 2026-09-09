import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, UserCog, UserCheck, LayoutGrid,
  Building2, Activity, CreditCard, Receipt, BarChart3, Package,
  Settings, ChevronDown, ChevronRight, ChevronLeft, X, Menu, Lock, User,
  ClipboardList, FlaskConical, Pill, FileText, Stethoscope, ShieldAlert,
  Shield, Syringe
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
  'Billing': <CreditCard size={20} />,
  'Payments': <Receipt size={20} />,
  'Reports': <BarChart3 size={20} />,
  'Reports & Analytics': <BarChart3 size={20} />,
  'Subscription & Plan': <BarChart3 size={20} />,
  'Inventory': <Package size={20} />,
  'Pharmacy': <Package size={20} />,
  'Laboratory': <FlaskConical size={20} />,
  'Lab Orders': <FlaskConical size={20} />,
  'Sample Collection': <Syringe size={20} />,
  'Syringe': <Syringe size={20} />,
  'Test Catalogue': <LayoutGrid size={20} />,
  'Lab Inventory': <Package size={20} />,
  'Lab Consumables': <Package size={20} />,
  'QC & Calibration': <Activity size={20} />,
  'Branches': <Building2 size={20} />,
  'Notifications': <Activity size={20} />,
  'Doctor Leaves': <UserCheck size={20} />,
  'Earnings': <Receipt size={20} />,
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

const Sidebar = ({ role, open, onNavigate, user, onLogout, onAddWalkIn, mobileOpen: externalMobileOpen, onToggleMobile }) => {
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileDrawerOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  const setMobileDrawer = (val) => {
    if (onToggleMobile) onToggleMobile(val);
    setInternalMobileOpen(val);
    if (onNavigate && val === false) onNavigate(false);
  };
  const location = useLocation();
  const navigate = useNavigate();

  const normRole = (role || '').toUpperCase();
  const isLabRole = normRole === 'LABORATORY OPERATOR' || normRole === 'LAB_TECHNICIAN';

  const isPatient = role === 'PATIENT';
  const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';

  const labIdMatch = location.pathname.match(/^\/laboratory\/([^/]+)/);
  const currentLaboratoryId = labIdMatch ? labIdMatch[1] : '';
  const activeLaboratoryId = currentLaboratoryId || user?.providerId || '';

  const isLabWorkspaceRoute = Boolean(currentLaboratoryId) ||
    location.pathname.startsWith('/provider-workspace/laboratory') ||
    location.pathname.startsWith('/lab-orders') ||
    location.pathname.startsWith('/labs/') ||
    ['/sample-collection', '/test-catalogue', '/lab-inventory', '/qc-calibration', '/reports-analytics'].some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  const isLabContext = isLabRole || isLabWorkspaceRoute;

  // State hooks for Patient context
  const [patientClinics, setPatientClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(() => localStorage.getItem('patientActiveClinicId') || '');
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientLaboratories, setPatientLaboratories] = useState([]);
  const [patientPharmacies, setPatientPharmacies] = useState([]);
  const [activeLabDetails, setActiveLabDetails] = useState(null);
  const [activePharmacyDetails, setActivePharmacyDetails] = useState(null);
  const [labExpanded, setLabExpanded] = useState(false);
  const [pharmacyExpanded, setPharmacyExpanded] = useState(false);

  // Sub-menu expansion states
  const [expandedMenus, setExpandedMenus] = useState({
    inventory: false,
    suppliers: false,
    reports: false,
    globalLabCatalog: false
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

  // Fetch attached laboratories and pharmacies for patient's selected clinic
  useEffect(() => {
    if (isPatient && selectedClinicId) {
      providersApi.getProviders({ clinicId: selectedClinicId, providerType: 'Laboratory', limit: 100 })
        .then(res => {
          setPatientLaboratories(res.data?.items || res.items || []);
        })
        .catch(() => setPatientLaboratories([]));

      providersApi.getProviders({ clinicId: selectedClinicId, providerType: 'Pharmacy', limit: 100 })
        .then(res => {
          setPatientPharmacies(res.data?.items || res.items || []);
        })
        .catch(() => setPatientPharmacies([]));
    } else {
      setPatientLaboratories([]);
      setPatientPharmacies([]);
    }
  }, [isPatient, selectedClinicId]);

  // Sync selected clinic and lab from URL search params or custom events
  useEffect(() => {
    const currentParams = new URLSearchParams(location.search);
    const urlClinicId = currentParams.get('clinicId');
    if (urlClinicId) {
      setSelectedClinicId(urlClinicId);
      localStorage.setItem('patientActiveClinicId', urlClinicId);
    }
    const urlLabId = currentParams.get('labId');
    if (urlLabId) {
      localStorage.setItem('patientActiveLabId', urlLabId);
    }
    const urlPharmacyId = currentParams.get('pharmacyId');
    if (urlPharmacyId) {
      localStorage.setItem('patientActivePharmacyId', urlPharmacyId);
    }
  }, [location.search]);

  // Listen to custom clinic/lab change events
  useEffect(() => {
    const handleLabChanged = (e) => {
      const newLabId = e.detail;
      if (newLabId) {
        localStorage.setItem('patientActiveLabId', newLabId);
      } else {
        localStorage.removeItem('patientActiveLabId');
      }
    };
    window.addEventListener('patient:lab-changed', handleLabChanged);
    return () => window.removeEventListener('patient:lab-changed', handleLabChanged);
  }, []);

  // Derive URL query params with storage fallbacks
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedLabId = searchParams.get('labId') || localStorage.getItem('patientActiveLabId') || '';
  const selectedPharmacyId = searchParams.get('pharmacyId') || localStorage.getItem('patientActivePharmacyId') || '';

  // Track dynamic active laboratory record
  useEffect(() => {
    if (!selectedLabId) {
      setActiveLabDetails(null);
      return;
    }
    const found = patientLaboratories.find(l => String(l._id) === String(selectedLabId));
    if (found) {
      setActiveLabDetails(found);
    } else {
      providersApi.getProvider(selectedLabId)
        .then(res => {
          setActiveLabDetails(res.data?.provider || res.provider || res);
        })
        .catch(() => {});
    }
  }, [selectedLabId, patientLaboratories]);

  // Track dynamic active pharmacy record
  useEffect(() => {
    if (!selectedPharmacyId) {
      setActivePharmacyDetails(null);
      return;
    }
    const found = patientPharmacies.find(p => String(p._id) === String(selectedPharmacyId));
    if (found) {
      setActivePharmacyDetails(found);
    } else {
      providersApi.getProvider(selectedPharmacyId)
        .then(res => {
          setActivePharmacyDetails(res.data?.provider || res.provider || res);
        })
        .catch(() => {});
    }
  }, [selectedPharmacyId, patientPharmacies]);

  // Detect laboratory-specific path / tab
  const isLabReportPath = location.pathname.startsWith('/patient/lab-reports') || location.pathname.startsWith('/patient/lab-orders') || location.pathname.includes('/lab-report') || location.pathname.startsWith('/laboratory/reports');
  const isLabTab = ['lab-tests', 'lab-prescriptions', 'lab-bookings', 'lab-orders', 'lab-reports', 'lab-packages', 'lab-checkout'].includes(currentTab);

  // Determine current Patient Context
  const patientContext = useMemo(() => {
    if (!selectedClinicId) return 'CLINIC_SELECTION';
    if (selectedLabId || isLabTab || isLabReportPath) {
      return 'LABORATORY_CONTEXT';
    }
    if (currentTab === 'book-lab' || location.pathname === '/labs/tests' || location.pathname === '/laboratory/book-test') {
      return 'LABORATORY_SELECTION_CONTEXT';
    }
    if (selectedPharmacyId || ['pharmacy-medicines', 'pharmacy-prescriptions', 'pharmacy-orders-workspace', 'pharmacy-cart'].includes(currentTab)) {
      return 'PHARMACY_CONTEXT';
    }
    if (currentTab === 'buy-medicine' || location.pathname === '/pharmacy/medicines') {
      return 'PHARMACY_SELECTION_CONTEXT';
    }
    return 'CLINIC_CONTEXT';
  }, [selectedClinicId, selectedLabId, selectedPharmacyId, currentTab, location.pathname, isLabTab, isLabReportPath]);

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
    if (isLabRole || isLabWorkspaceRoute) {
      const base = activeLaboratoryId ? `/laboratory/${activeLaboratoryId}` : '/provider-workspace/laboratory';
      return [
        { label: 'Dashboard', path: `${base}/dashboard`, iconKey: 'Dashboard' },
        { label: 'Lab Orders', path: `${base}/orders`, iconKey: 'Lab Orders' },
        { label: 'Sample Collection', path: `${base}/collection`, iconKey: 'Sample Collection' },
        { label: 'Test Catalogue', path: `${base}/catalogue`, iconKey: 'Test Catalogue' },
        { label: 'Patients', path: `${base}/patients`, iconKey: 'Patients' },
        { label: 'Reports', path: `${base}/reports`, iconKey: 'Reports' },
        { label: 'Lab Inventory', path: `${base}/inventory`, iconKey: 'Lab Inventory' },
        { label: 'QC & Calibration', path: `${base}/qc`, iconKey: 'QC & Calibration' },
        { label: 'Reports & Analytics', path: `${base}/analytics`, iconKey: 'Reports & Analytics' },
        { label: 'Staff', path: `${base}/staff`, iconKey: 'Staff' },
        { label: 'Settings', path: `${base}/settings`, iconKey: 'Settings' }
      ];
    }

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

    if (role === 'DOCTOR') {
      return [
        { label: 'Dashboard', path: '/dashboard', iconKey: 'Dashboard' },
        { label: 'Appointments', path: '/appointments', iconKey: 'Appointments' },
        { label: 'Patients', path: '/patients', iconKey: 'Patients' },
        { label: 'Procedures', path: '/procedures', iconKey: 'Procedures' },
        { label: 'Doctor Leaves', path: '/doctor/leaves', iconKey: 'Doctor Leaves' },
        { label: 'Earnings', path: '/doctor/earnings', iconKey: 'Earnings' },
        { label: 'Notifications / Messages', path: '/notifications/logs', iconKey: 'Notifications' }
      ];
    }

    if (normRole === 'SUPER_ADMIN') {
      return [
        { label: 'Dashboard', path: '/dashboard', iconKey: 'Dashboard' },
        { label: 'Clinics', path: '/clinics', iconKey: 'Clinics' },
        { label: 'Plans', path: '/plans', iconKey: 'Plans' },
        { label: 'Promo Codes', path: '/promo-codes', iconKey: 'Promo Codes' },
        { 
          label: 'Global Lab Catalogue', 
          path: '/super-admin/healthcare-catalog/labs', 
          iconKey: 'Global Lab Catalog',
          menuKey: 'globalLabCatalog',
          subItems: [
            { label: 'Investigations', path: '/super-admin/healthcare-catalog/labs' },
            { label: 'Parameters (Analytes)', path: '/super-admin/healthcare-catalog/parameters' },
            { label: 'Panels & Profiles', path: '/super-admin/healthcare-catalog/panels-profiles' },
            { label: 'Units', path: '/super-admin/healthcare-catalog/units' },
            { label: 'Conditions', path: '/super-admin/healthcare-catalog/conditions' },
            { label: 'Catalogue Updates', path: '/super-admin/healthcare-catalog/updates' }
          ]
        },
        { label: 'Global Medicine Catalog', path: '/super-admin/healthcare-catalog/medicines', iconKey: 'Global Medicine Catalog' },
        { label: 'Payments', path: '/payments', iconKey: 'Payments' },
        { label: 'Reports', path: '/dashboard/revenue', iconKey: 'Reports' },
        { label: 'Settings', path: '/settings/payment', iconKey: 'Settings' }
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
  }, [role, activeLaboratoryId, isLabRole, isLabWorkspaceRoute]);

  const handleClinicSelect = (clinicId) => {
    localStorage.setItem('patientActiveClinicId', clinicId);
    setSelectedClinicId(clinicId);
    window.dispatchEvent(new CustomEvent('patient:clinic-changed', { detail: clinicId }));
    const currentParams = new URLSearchParams(location.search);
    const activeTab = currentParams.get('tab') || 'dashboard';
    navigate(`/portal?tab=${activeTab === 'clinics' ? 'dashboard' : activeTab}&clinicId=${clinicId}`);
  };

  const isItemActive = (itemOrPath, optionalItem) => {
    const item = typeof itemOrPath === 'object' && itemOrPath !== null 
      ? itemOrPath 
      : (optionalItem || { path: typeof itemOrPath === 'string' ? itemOrPath : '' });
    const path = item.path || (typeof itemOrPath === 'string' ? itemOrPath : '');
    const label = item.label || '';
    const menuKey = item.menuKey || '';
    
    const pathname = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const currentTabParam = searchParams.get('tab') || '';
    const currentSubParam = searchParams.get('sub') || '';

    // Handle Pharmacist / Pharmacy Operator workspace tabs
    const normRole = (role || '').toUpperCase();
    if (normRole === 'PHARMACY STORE OPERATOR' || role === 'PHARMACIST') {
      if (path.includes('?tab=') || path.includes('&sub=')) {
        try {
          const itemUrl = new URL(path, window.location.origin);
          const itemTab = itemUrl.searchParams.get('tab');
          const itemSub = itemUrl.searchParams.get('sub');
          if (itemSub) {
            return itemTab === currentTabParam && itemSub === currentSubParam;
          }
          if (itemTab === 'suppliers') {
            return ['suppliers', 'purchase-orders', 'manufacturers'].includes(currentTabParam);
          }
          if (itemTab === 'sales-performance') {
            return ['sales-performance', 'inventory-ledger'].includes(currentTabParam);
          }
          if (itemTab === 'dashboard') {
            return currentTabParam === 'dashboard' || !currentTabParam;
          }
          return itemTab === currentTabParam;
        } catch {
          // fallback
        }
      }
      if (path === '/pharmacist/orders/online') {
        return pathname === '/pharmacist/orders/online';
      }
    }

    // Handle Super Admin Healthcare Catalog subItems / menu
    if (normRole === 'SUPER_ADMIN') {
      if (menuKey === 'globalLabCatalog' || label === 'Global Lab Catalogue') {
        return (pathname.startsWith('/super-admin/healthcare-catalog') && !pathname.includes('/medicines')) ||
               pathname === '/global-lab-catalogue' || pathname === '/global-lab-catalog';
      }
      if (label === 'Global Medicine Catalog' || path === '/super-admin/healthcare-catalog/medicines' || path === '/global-medicine-catalogue') {
        return pathname === '/super-admin/healthcare-catalog/medicines' || pathname === '/global-medicine-catalogue' || pathname === '/global-medicine-catalog';
      }
      if (path.startsWith('/super-admin/healthcare-catalog/')) {
        return pathname === path;
      }
      if (label === 'Clinics' || path === '/clinics' || path === '/super-admin/clinics') {
        return pathname.startsWith('/super-admin/clinics') || pathname === '/clinics' || pathname.startsWith('/clinics/') || pathname === '/admin/clinics-dashboard';
      }
      if (label === 'Plans' || path === '/plans' || path === '/super-admin/plans') {
        return pathname.startsWith('/super-admin/plans') || pathname === '/plans' || pathname.startsWith('/plans/');
      }
      if (label === 'Promo Codes' || path === '/promo-codes' || path === '/super-admin/promo-codes') {
        return pathname.startsWith('/super-admin/promo-codes') || pathname === '/promo-codes' || pathname.startsWith('/promo-codes/');
      }
      if (label === 'Payments' || path === '/payments' || path === '/super-admin/payments') {
        return pathname.startsWith('/super-admin/payments') || pathname === '/payments' || pathname.startsWith('/payments/');
      }
      if (label === 'Settings' || path === '/settings/payment' || path === '/settings' || path.startsWith('/settings')) {
        return pathname.startsWith('/settings') || pathname.startsWith('/admin/settings');
      }
    }

    // Lab Orders matching: includes all nested routes
    if (label === 'Lab Orders' || (isLabContext && (path.endsWith('/orders') || path.endsWith('/orders/'))) || (!isLabRole && label === 'Laboratory')) {
      return (
        pathname.startsWith('/lab-orders') ||
        pathname.startsWith('/labs/orders') ||
        /^\/laboratory\/[^/]+\/orders(\/.*)?$/.test(pathname) ||
        pathname.startsWith('/labs/reports') ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'orders')
      );
    }

    // Sample Collection
    if (label === 'Sample Collection' || (isLabContext && path.endsWith('/collection'))) {
      return (
        pathname.startsWith('/sample-collection') ||
        pathname.startsWith('/labs/sample-collection') ||
        /^\/laboratory\/[^/]+\/(collection|sample-collection)(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && (currentTabParam === 'collection' || currentTabParam === 'sample-collection'))
      );
    }

    // Test Catalogue
    if (label === 'Test Catalogue' || (isLabContext && path.endsWith('/catalogue'))) {
      return (
        pathname.startsWith('/test-catalogue') ||
        pathname.startsWith('/labs/tests') ||
        /^\/laboratory\/[^/]+\/(catalogue|test-catalogue)(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'catalogue')
      );
    }

    // Lab Inventory
    if (label === 'Lab Inventory' || (isLabContext && path.endsWith('/inventory'))) {
      return (
        pathname.startsWith('/lab-inventory') ||
        pathname.startsWith('/labs/consumables') ||
        /^\/laboratory\/[^/]+\/inventory(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'inventory')
      );
    }

    // QC & Calibration
    if (label === 'QC & Calibration' || (isLabContext && path.endsWith('/qc'))) {
      return (
        pathname.startsWith('/qc-calibration') ||
        /^\/laboratory\/[^/]+\/qc(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'qc')
      );
    }

    // Reports & Analytics
    if (label === 'Reports & Analytics' || (isLabContext && path.endsWith('/analytics'))) {
      return (
        pathname.startsWith('/reports-analytics') ||
        /^\/laboratory\/[^/]+\/analytics(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'analytics')
      );
    }

    // Reports (exclusive of Reports & Analytics)
    if (label === 'Reports' || (isLabContext && path.endsWith('/reports'))) {
      return (
        ((pathname === '/reports' || pathname.startsWith('/reports/')) && !pathname.startsWith('/reports-analytics')) ||
        pathname.startsWith('/admin/reports') ||
        /^\/laboratory\/[^/]+\/reports(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'reports')
      );
    }

    // Patients
    if (label === 'Patients') {
      return (
        pathname.startsWith('/patients') ||
        pathname === '/dashboard/patients' ||
        /^\/laboratory\/[^/]+\/patients(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'patients')
      );
    }

    // Staff
    if (label === 'Staff') {
      return (
        pathname.startsWith('/staff') ||
        pathname.startsWith('/admin/staff') ||
        pathname.startsWith('/admin/my-receptionists-dashboard') ||
        /^\/laboratory\/[^/]+\/staff(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'staff')
      );
    }

    // Settings
    if (label === 'Settings') {
      return (
        pathname.startsWith('/settings') ||
        pathname.startsWith('/admin/settings') ||
        pathname.startsWith('/clinic/settings') ||
        pathname.startsWith('/admin/organization-settings') ||
        pathname.startsWith('/admin/specialities') ||
        pathname.startsWith('/admin/branches') ||
        pathname.startsWith('/admin/subscription') ||
        /^\/laboratory\/[^/]+\/settings(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && currentTabParam === 'settings')
      );
    }

    // Appointments
    if (label === 'Appointments') {
      return pathname.startsWith('/appointments') || pathname === '/dashboard/appointments';
    }

    // Doctors
    if (label === 'Doctors') {
      return (
        pathname.startsWith('/doctors') ||
        pathname.startsWith('/admin/doctors') ||
        pathname === '/admin/my-doctors-dashboard'
      );
    }

    // Procedures
    if (label === 'Procedures') {
      return pathname.startsWith('/procedures');
    }

    // Departments
    if (label === 'Departments') {
      return pathname.startsWith('/admin/departments');
    }

    // Healthcare Providers
    if (label === 'Healthcare Providers') {
      return pathname.startsWith('/admin/providers');
    }

    // Billing & Invoices
    if (label === 'Billing & Invoices' || label === 'Billing') {
      return pathname.startsWith('/billing') && !pathname.startsWith('/billing/financials');
    }

    // Payments
    if (label === 'Payments') {
      return pathname.startsWith('/billing/financials') || pathname === '/dashboard/revenue';
    }

    // Doctor Leaves
    if (label === 'Doctor Leaves') {
      return (
        pathname.startsWith('/doctor/leaves') ||
        pathname.startsWith('/admin/leaves-review') ||
        pathname.startsWith('/admin/leave-policy')
      );
    }

    // Earnings
    if (label === 'Earnings') {
      return pathname.startsWith('/doctor/earnings');
    }

    // Notifications / Messages
    if (label === 'Notifications / Messages' || label === 'Notifications') {
      return (
        pathname.startsWith('/notifications') ||
        pathname === '/dashboard/notifications' ||
        pathname === '/chat'
      );
    }

    // Inventory / Pharmacy (Clinic Admin / Receptionist)
    if (label === 'Inventory' || label === 'Pharmacy') {
      return pathname.startsWith('/pharmacy');
    }

    // Dashboard
    if (label === 'Dashboard' || path === '/dashboard' || path === '/clinic/dashboard') {
      const isOtherDashboardSubPage = 
        pathname === '/dashboard/appointments' ||
        pathname === '/dashboard/revenue' ||
        pathname === '/dashboard/patients' ||
        pathname === '/dashboard/notifications' ||
        pathname === '/dashboard/pharmacy' ||
        pathname === '/dashboard/billing-fraud' ||
        pathname === '/dashboard/audit-logs';

      if (isOtherDashboardSubPage) {
        return false;
      }

      return (
        pathname === '/dashboard' ||
        pathname === '/clinic/dashboard' ||
        pathname === '/' ||
        /^\/laboratory\/[^/]+\/dashboard(\/.*)?$/.test(pathname) ||
        (pathname.startsWith('/provider-workspace/laboratory') && (!currentTabParam || currentTabParam === 'dashboard'))
      );
    }

    // Fallback match
    return pathname === path || (path !== '/' && pathname.startsWith(path + '/'));
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
    if (normRole === 'SUPER_ADMIN') {
      return {
        title: 'System Role',
        subtitle: 'Full Platform Access',
        name: user?.name || 'Super Admin',
        icon: <ShieldAlert size={20} className="text-blue-600" />
      };
    }
    return {
      title: 'Current Plan 👑',
      subtitle: '170GB / 200GB Used',
      name: planName,
      icon: <Building2 size={20} className="text-emerald-500" />
    };
  }, [role, user, planName]);

  // Patient Sidebar content with dynamic context awareness
  const renderPatientSidebarContent = (isMobileOrOverlay = false) => {
    // 1. My Clinics List Context
    if (patientContext === 'CLINIC_SELECTION') {
      return (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
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
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-base font-extrabold">
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
      );
    }

    // 2. Laboratory Selection Context (Browsing Laboratories)
    if (patientContext === 'LABORATORY_SELECTION_CONTEXT') {
      return (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          <div className="px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={() => navigate(`/portal?tab=dashboard&clinicId=${selectedClinicId}`)}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition duration-150"
            >
              <ChevronLeft size={14} />
              <span>Back to Clinic</span>
            </button>
          </div>

          <div className="px-4 py-3 shrink-0 border-b border-slate-100 bg-blue-50/40">
            <p className="text-[8px] text-blue-600 font-extrabold uppercase tracking-widest">Diagnostic Service</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm">🧪</span>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wide">LABORATORY</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 [scrollbar-width:none]">
            <NavLink
              to={`/portal?tab=book-lab&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'book-lab'
                  ? 'bg-gradient-to-r from-blue-50/80 to-blue-50/20 text-slate-900 border-l-4 border-blue-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <FlaskConical size={18} className={currentTab === 'book-lab' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Book Lab Test</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=labs&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                ['labs', 'lab-reports'].includes(currentTab) || (isLabReportPath && searchParams.get('fromTab') !== 'lab-bookings' && searchParams.get('fromTab') !== 'lab-orders')
                  ? 'bg-gradient-to-r from-blue-50/80 to-blue-50/20 text-slate-900 border-l-4 border-blue-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <FileText size={18} className={['labs', 'lab-reports'].includes(currentTab) || (isLabReportPath && searchParams.get('fromTab') !== 'lab-bookings' && searchParams.get('fromTab') !== 'lab-orders') ? 'text-blue-600' : 'text-slate-400'} />
              <span>View Lab Reports</span>
            </NavLink>
          </nav>

          {selectedClinic && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Back to Clinic</p>
              <button
                onClick={() => navigate(`/portal?tab=dashboard&clinicId=${selectedClinicId}`)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-sm hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">🏥</span>
                  <span className="text-xs font-black text-slate-800 truncate">{selectedClinic.name}</span>
                </div>
                <ChevronLeft size={13} className="text-slate-400 rotate-180 shrink-0" />
              </button>
            </div>
          )}
        </div>
      );
    }

    // 3. Selected Laboratory Context
    if (patientContext === 'LABORATORY_CONTEXT') {
      const activeLabName = activeLabDetails?.name || (selectedLabId ? 'Laboratory' : 'Selected Laboratory');
      const fromTabParam = searchParams.get('fromTab');
      const isOrdersActive = ['lab-bookings', 'lab-orders'].includes(currentTab) || (isLabReportPath && (fromTabParam === 'lab-bookings' || fromTabParam === 'lab-orders'));
      const isReportsActive = ['lab-reports', 'labs'].includes(currentTab) || (isLabReportPath && fromTabParam !== 'lab-bookings' && fromTabParam !== 'lab-orders');
      const isBrowseTestsActive = currentTab === 'lab-tests';
      const isPrescriptionsActive = currentTab === 'lab-prescriptions';

      const handleExitLaboratories = () => {
        localStorage.removeItem('patientActiveLabId');
        window.dispatchEvent(new CustomEvent('patient:lab-changed', { detail: null }));
        navigate(`/portal?tab=book-lab&clinicId=${selectedClinicId}`);
      };

      const handleExitToClinic = () => {
        localStorage.removeItem('patientActiveLabId');
        localStorage.removeItem('patientActivePharmacyId');
        window.dispatchEvent(new CustomEvent('patient:lab-changed', { detail: null }));
        navigate(`/portal?tab=dashboard&clinicId=${selectedClinicId}`);
      };

      return (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          <div className="px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={handleExitLaboratories}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition duration-150 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Back to Laboratories</span>
            </button>
          </div>

          <div className="px-4 py-3 shrink-0 border-b border-slate-100 bg-blue-50/40 space-y-1">
            <p className="text-[8px] text-blue-600 font-extrabold uppercase tracking-widest">LABORATORY</p>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-100/60 border border-blue-200 flex items-center justify-center text-sm shrink-0">
                🧪
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate leading-snug" title={activeLabName}>
                  {activeLabName}
                </p>
                <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">
                  {activeLabDetails?.address?.city || selectedClinic?.name || 'Attached Laboratory'}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 [scrollbar-width:none]">
            <NavLink
              to={`/portal?tab=lab-tests&labId=${selectedLabId}&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                isBrowseTestsActive
                  ? 'bg-gradient-to-r from-blue-50/80 to-blue-50/20 text-slate-900 border-l-4 border-blue-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <FlaskConical size={18} className={isBrowseTestsActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>Browse Tests</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=lab-prescriptions&labId=${selectedLabId}&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                isPrescriptionsActive
                  ? 'bg-gradient-to-r from-blue-50/80 to-blue-50/20 text-slate-900 border-l-4 border-blue-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <ClipboardList size={18} className={isPrescriptionsActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>Tests From Prescription</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=lab-bookings&labId=${selectedLabId}&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                isOrdersActive
                  ? 'bg-gradient-to-r from-blue-50/80 to-blue-50/20 text-slate-900 border-l-4 border-blue-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <Activity size={18} className={isOrdersActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>My Lab Orders</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=lab-reports&labId=${selectedLabId}&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                isReportsActive
                  ? 'bg-gradient-to-r from-blue-50/80 to-blue-50/20 text-slate-900 border-l-4 border-blue-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <FileText size={18} className={isReportsActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>Lab Reports</span>
            </NavLink>
          </nav>

          {selectedClinic && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Back to Clinic</p>
              <button
                onClick={handleExitToClinic}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-sm hover:bg-slate-100/70 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">🏥</span>
                  <span className="text-xs font-black text-slate-800 truncate">{selectedClinic.name}</span>
                </div>
                <ChevronLeft size={13} className="text-slate-400 rotate-180 shrink-0" />
              </button>
            </div>
          )}
        </div>
      );
    }

    // 4. Pharmacy Selection Context (Browsing Pharmacies)
    if (patientContext === 'PHARMACY_SELECTION_CONTEXT') {
      return (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          <div className="px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={() => navigate(`/portal?tab=dashboard&clinicId=${selectedClinicId}`)}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition duration-150"
            >
              <ChevronLeft size={14} />
              <span>Back to Clinic</span>
            </button>
          </div>

          <div className="px-4 py-3 shrink-0 border-b border-slate-100 bg-teal-50/40">
            <p className="text-[8px] text-teal-600 font-extrabold uppercase tracking-widest">Pharmacy Service</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm">💊</span>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wide">PHARMACY</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 [scrollbar-width:none]">
            <NavLink
              to={`/portal?tab=buy-medicine&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'buy-medicine'
                  ? 'bg-gradient-to-r from-teal-50/80 to-teal-50/20 text-slate-900 border-l-4 border-teal-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'
              }`}
            >
              <Pill size={18} className={currentTab === 'buy-medicine' ? 'text-teal-600' : 'text-slate-400'} />
              <span>Buy Medicine</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=pharmacy-orders&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'pharmacy-orders'
                  ? 'bg-gradient-to-r from-teal-50/80 to-teal-50/20 text-slate-900 border-l-4 border-teal-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'
              }`}
            >
              <Package size={18} className={currentTab === 'pharmacy-orders' ? 'text-teal-600' : 'text-slate-400'} />
              <span>My Orders</span>
            </NavLink>
          </nav>

          {selectedClinic && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Back to Clinic</p>
              <button
                onClick={() => navigate(`/portal?tab=dashboard&clinicId=${selectedClinicId}`)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-sm hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">🏥</span>
                  <span className="text-xs font-black text-slate-800 truncate">{selectedClinic.name}</span>
                </div>
                <ChevronLeft size={13} className="text-slate-400 rotate-180 shrink-0" />
              </button>
            </div>
          )}
        </div>
      );
    }

    // 5. Selected Pharmacy Context
    if (patientContext === 'PHARMACY_CONTEXT') {
      const activePharmacyName = activePharmacyDetails?.name || (selectedPharmacyId ? 'Pharmacy' : 'Selected Pharmacy');
      return (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          <div className="px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={() => navigate(`/portal?tab=buy-medicine&clinicId=${selectedClinicId}`)}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition duration-150"
            >
              <ChevronLeft size={14} />
              <span>Back to Pharmacies</span>
            </button>
          </div>

          <div className="px-4 py-3 shrink-0 border-b border-slate-100 bg-teal-50/40 space-y-1">
            <p className="text-[8px] text-teal-600 font-extrabold uppercase tracking-widest">PHARMACY</p>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-100/60 border border-teal-200 flex items-center justify-center text-sm shrink-0">
                💊
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate leading-snug" title={activePharmacyName}>
                  {activePharmacyName}
                </p>
                <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">
                  {activePharmacyDetails?.address?.city || selectedClinic?.name || 'Attached Pharmacy'}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 [scrollbar-width:none]">
            <NavLink
              to={`/portal?tab=pharmacy-medicines&pharmacyId=${selectedPharmacyId}&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'pharmacy-medicines'
                  ? 'bg-gradient-to-r from-teal-50/80 to-teal-50/20 text-slate-900 border-l-4 border-teal-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'
              }`}
            >
              <Pill size={18} className={currentTab === 'pharmacy-medicines' ? 'text-teal-600' : 'text-slate-400'} />
              <span>Browse Medicines</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=pharmacy-prescriptions&pharmacyId=${selectedPharmacyId}&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                currentTab === 'pharmacy-prescriptions'
                  ? 'bg-gradient-to-r from-teal-50/80 to-teal-50/20 text-slate-900 border-l-4 border-teal-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'
              }`}
            >
              <ClipboardList size={18} className={currentTab === 'pharmacy-prescriptions' ? 'text-teal-600' : 'text-slate-400'} />
              <span>Prescriptions</span>
            </NavLink>

            <NavLink
              to={`/portal?tab=pharmacy-orders-workspace&pharmacyId=${selectedPharmacyId}&clinicId=${selectedClinicId}`}
              onClick={() => isMobileOrOverlay && onNavigate && onNavigate(false)}
              className={`flex items-center gap-3 px-3.5 h-[46px] rounded-2xl text-[13px] font-bold transition duration-150 ${
                ['pharmacy-orders', 'pharmacy-orders-workspace'].includes(currentTab)
                  ? 'bg-gradient-to-r from-teal-50/80 to-teal-50/20 text-slate-900 border-l-4 border-teal-500 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'
              }`}
            >
              <Package size={18} className={['pharmacy-orders', 'pharmacy-orders-workspace'].includes(currentTab) ? 'text-teal-600' : 'text-slate-400'} />
              <span>My Medicine Orders</span>
            </NavLink>
          </nav>

          {selectedClinic && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Back to Clinic</p>
              <button
                onClick={() => navigate(`/portal?tab=dashboard&clinicId=${selectedClinicId}`)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-sm hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">🏥</span>
                  <span className="text-xs font-black text-slate-800 truncate">{selectedClinic.name}</span>
                </div>
                <ChevronLeft size={13} className="text-slate-400 rotate-180 shrink-0" />
              </button>
            </div>
          )}
        </div>
      );
    }

    // 6. Normal Clinic Context
    return (
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* Back Button to My Clinics */}
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
                  className={`flex items-center gap-2 py-1.5 text-xs font-bold ${currentTab === 'labs' || currentTab === 'lab-reports' || isLabReportPath ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-650'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentTab === 'labs' || currentTab === 'lab-reports' || isLabReportPath ? 'bg-emerald-500' : 'bg-slate-300'}`} />
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
    );
  };

  return (
    <>
      {/* State 1: Closed Sidebar (Fixed Icon Rail on Mobile/Tablet) */}
      <aside className="fixed inset-y-0 left-0 z-30 w-[72px] sm:w-[80px] bg-white border-r border-slate-150 flex flex-col items-center py-5 shadow-md rounded-r-3xl xl:hidden select-none">
        <div className="flex flex-col items-center gap-6 w-full shrink-0">
          <button 
            type="button"
            onClick={() => setMobileDrawer(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl hover:bg-slate-50 transition text-slate-800 cursor-pointer"
          >
            <Menu size={22} />
          </button>
          <img src={pehalLogo} alt="Pehal" className="h-9 w-auto" />
        </div>

        <nav className="flex-1 w-full overflow-y-auto px-2 py-6 space-y-3.5 flex flex-col items-center [scrollbar-width:none]">
          {isPatient ? (
            <div className="relative group flex items-center justify-center">
              <button
                type="button"
                onClick={() => setMobileDrawer(true)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  patientContext.includes('LABORATORY')
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500'
                    : patientContext.includes('PHARMACY')
                    ? 'bg-teal-50 text-teal-600 border-l-4 border-teal-500'
                    : 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500'
                }`}
              >
                {patientContext.includes('LABORATORY') ? (
                  <FlaskConical size={20} />
                ) : patientContext.includes('PHARMACY') ? (
                  <Pill size={20} />
                ) : (
                  <Building2 size={20} />
                )}
              </button>
            </div>
          ) : (
            menuItems.map((item, idx) => {
              const active = isItemActive(item);
              return (
                <div key={idx} className="relative group flex items-center justify-center">
                  <NavLink
                    to={item.path}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      active 
                        ? (isLabContext ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-800 border-l-4 border-purple-500 shadow-sm' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-sm') 
                        : (isLabContext ? 'text-slate-400 hover:bg-slate-50 hover:text-purple-500' : 'text-slate-400 hover:bg-slate-50 hover:text-emerald-500')
                    }`}
                  >
                    <span className={active ? (isLabContext ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
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

      {/* State 2: Open Overlay Sidebar Drawer (Only when mobile menu is explicitly open) */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawer(false)}
              className="fixed inset-0 bg-black backdrop-blur-sm z-40 xl:hidden cursor-pointer"
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
                  type="button"
                  onClick={() => setMobileDrawer(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-555 cursor-pointer"
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
                      const active = isItemActive(item);
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
                                    ? (isLabContext ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-800 border-l-4 border-purple-500' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500') 
                                    : `text-slate-500 hover:bg-slate-50 ${isLabContext ? 'hover:text-purple-650' : 'hover:text-emerald-650'}`
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={active ? (isLabContext ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
                                    {ICON_MAP[item.iconKey] || <LayoutGrid size={20} />}
                                  </span>
                                  <span>{item.label}</span>
                                </div>
                                <ChevronRight size={14} className={`transform transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                              <div className={`pl-9 space-y-1.5 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                                {item.subItems.map((sub, sIdx) => {
                                  if (sub.disabled) {
                                    return (
                                      <div
                                        key={sIdx}
                                        className="flex items-center justify-between py-1.5 text-xs font-bold px-3 text-slate-300 cursor-not-allowed select-none"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                          <span>{sub.label}</span>
                                        </div>
                                        {sub.comingSoon && (
                                          <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase">Soon</span>
                                        )}
                                      </div>
                                    );
                                  }
                                  const subActive = isItemActive(sub);
                                  return (
                                    <NavLink
                                      key={sIdx}
                                      to={sub.path}
                                      onClick={() => onNavigate && onNavigate(false)}
                                      className={`flex items-center gap-2 py-1.5 text-xs font-bold px-3 rounded-xl transition duration-150 ${
                                        subActive 
                                          ? (isLabContext ? 'bg-purple-50/50 text-purple-600' : 'bg-emerald-50/50 text-emerald-600') 
                                          : `text-slate-450 hover:bg-slate-50/30 ${isLabContext ? 'hover:text-purple-655' : 'hover:text-emerald-655'}`
                                      }`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${subActive ? (isLabContext ? 'bg-purple-500' : 'bg-emerald-500') : 'bg-slate-350'}`} />
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
                                  ? (isLabContext ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-805 border-l-4 border-purple-500 shadow-sm' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-855 border-l-4 border-emerald-500 shadow-sm')
                                  : `text-slate-500 hover:bg-slate-50 ${isLabContext ? 'hover:text-purple-600' : 'hover:text-emerald-600'}`
                              }`}
                            >
                              <span className={active ? (isLabContext ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
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

          {open && !isPatient && normRole !== 'SUPER_ADMIN' && (
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
                onClick={() => onNavigate && onNavigate(true)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  patientContext.includes('LABORATORY')
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500 shadow-sm'
                    : patientContext.includes('PHARMACY')
                    ? 'bg-teal-50 text-teal-600 border-l-4 border-teal-500 shadow-sm'
                    : 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500 shadow-sm'
                }`}
              >
                {patientContext.includes('LABORATORY') ? (
                  <FlaskConical size={20} />
                ) : patientContext.includes('PHARMACY') ? (
                  <Pill size={20} />
                ) : (
                  <Building2 size={20} />
                )}
              </button>
            </div>
          )
        ) : (
          <>
            <div className={`px-4 py-2 space-y-1.5 [scrollbar-width:none] ${normRole === 'SUPER_ADMIN' ? 'flex-initial' : 'flex-1 overflow-y-auto'}`}>
              {menuItems.map((item, idx) => {
                const active = isItemActive(item);
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
                                ? (isLabContext ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-800 border-l-4 border-purple-500' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500') 
                                : `text-slate-500 hover:bg-slate-50 ${isLabContext ? 'hover:text-purple-650' : 'hover:text-emerald-650'}`
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={active ? (isLabContext ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
                                {ICON_MAP[item.iconKey] || <LayoutGrid size={20} />}
                              </span>
                              <span>{item.label}</span>
                            </div>
                            <ChevronRight size={14} className={`transform transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          <div className={`pl-9 space-y-1.5 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                            {item.subItems.map((sub, sIdx) => {
                              const subActive = isItemActive(sub);
                              return (
                                <NavLink
                                  key={sIdx}
                                  to={sub.path}
                                  className={`flex items-center gap-2 py-1.5 text-xs font-bold px-3 rounded-xl transition duration-150 ${
                                    subActive 
                                      ? (isLabContext ? 'bg-purple-50/50 text-purple-600' : 'bg-emerald-50/50 text-emerald-600') 
                                      : `text-slate-450 hover:bg-slate-50/30 ${isLabContext ? 'hover:text-purple-655' : 'hover:text-emerald-655'}`
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${subActive ? (isLabContext ? 'bg-purple-500' : 'bg-emerald-500') : 'bg-slate-350'}`} />
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
                              ? (isLabContext ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-800 border-l-4 border-purple-500 shadow-sm' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-800 border-l-4 border-emerald-500 shadow-sm')
                              : `text-slate-500 hover:bg-slate-50 ${isLabContext ? 'hover:text-purple-600' : 'hover:text-emerald-600'}`
                          }`}
                        >
                          <span className={active ? (isLabContext ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
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
                              ? (isLabContext ? 'bg-gradient-to-r from-purple-50/70 to-purple-50/20 text-slate-805 border-l-4 border-purple-500 shadow-sm' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 text-slate-805 border-l-4 border-emerald-500 shadow-sm') 
                              : (isLabContext ? 'text-slate-400 hover:bg-slate-50 hover:text-purple-555' : 'text-slate-400 hover:bg-slate-50 hover:text-emerald-555')
                          }`}
                        >
                          <span className={active ? (isLabContext ? 'text-purple-500' : 'text-emerald-500') : 'text-slate-400'}>
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

              {/* For Super Admin: Render role card cleanly close below navigation */}
              {normRole === 'SUPER_ADMIN' && open && (
                <div className="pt-6">
                  <div className="bg-slate-50/90 border border-slate-150 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-xs">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-50/80 flex items-center justify-center border border-blue-100 text-blue-600">
                      <Shield size={18} />
                    </div>
                    <div className="min-w-0 flex-1 leading-none">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SYSTEM ROLE</span>
                      <p className="text-xs font-black text-slate-900 mt-1 truncate">Super Admin</p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-1 truncate">Full Platform Access</p>
                    </div>
                  </div>
                </div>
              )}

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

        {open && normRole !== 'SUPER_ADMIN' && (
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
