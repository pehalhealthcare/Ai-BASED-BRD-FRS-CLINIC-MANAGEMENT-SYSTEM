import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clinicApi } from '../../lib/api';
import { 
  Building2, Users, FileCheck, Ban, Clock, 
  IndianRupee, CalendarDays, RefreshCw, Key,
  Check, X, Search, ShieldAlert, Trash2, ArrowUpDown,
  AlertTriangle, Plus, Download, MoreVertical, MoreHorizontal,
  ChevronRight, ChevronLeft, ChevronDown, ExternalLink, Shield,
  Filter, CheckCircle2, SlidersHorizontal, Sparkles, MapPin,
  Mail, Phone, Settings, CreditCard, FileText, User, ArrowRight,
  Eye, Stethoscope, UserCheck, AlertCircle, AlertOctagon
} from 'lucide-react';

const SuperAdminClinics = () => {
  const navigate = useNavigate();

  // Primary data states
  const [stats, setStats] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [plans, setPlans] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation & View tabs: 'all', 'expiring', 'expired', 'awaiting_approval', 'suspended'
  const [activeTab, setActiveTab] = useState('all');
  
  // Search & Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [selectedClinics, setSelectedClinics] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Row Action Menu state
  const [openMenuClinicId, setOpenMenuClinicId] = useState(null);
  const actionMenuRef = useRef(null);

  // Modals
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanCycle, setNewPlanCycle] = useState('monthly');
  const [planSubmitting, setPlanSubmitting] = useState(false);
  
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMonths, setExtendMonths] = useState(1);
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Free Tier Modal state
  const [showFreeTierModal, setShowFreeTierModal] = useState(false);
  const [freeTierPlanId, setFreeTierPlanId] = useState('');
  const [freeTierDurationDays, setFreeTierDurationDays] = useState(30);
  const [freeTierFeatures, setFreeTierFeatures] = useState({
    appointment_management: true,
    patient_management: true,
    basic_reports: true,
    ai_assistant: false,
    advanced_analytics: false,
    pharmacy: false,
    laboratory: false
  });
  const [freeTierLimits, setFreeTierLimits] = useState({
    maxDoctors: 2,
    maxStaff: 3,
    maxPatients: 500,
    maxAppointmentsMonthly: 100
  });
  const [freeTierNotes, setFreeTierNotes] = useState('');
  const [freeTierSubmitting, setFreeTierSubmitting] = useState(false);
  const [freeTierError, setFreeTierError] = useState('');

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingClinicId, setRejectingClinicId] = useState(null);
  const [rejectForm, setRejectForm] = useState({
    rejectionReason: '',
    rejectionComments: '',
    incorrectFields: [],
    requestedDocuments: [],
  });
  const [rejectFieldInput, setRejectFieldInput] = useState('');
  const [rejectDocInput, setRejectDocInput] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Create Clinic Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerPassword: '',
    clinicName: '',
    clinicPhone: '',
    clinicAddress: '',
    clinicCity: '',
    clinicState: '',
    clinicPincode: '',
    selectedPlanId: '',
    billingCycle: 'monthly',
    status: 'Active'
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Load Data
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, clinicsRes, pendingRes, plansRes] = await Promise.all([
        clinicApi.getSuperAdminStats().catch(() => ({ data: {} })),
        clinicApi.list(),
        clinicApi.getPendingRequests().catch(() => ({ data: { requests: [] } })),
        clinicApi.getRegistrationPlans().catch(() => ({ data: { plans: [] } }))
      ]);
      setStats(statsRes.data);
      setClinics(clinicsRes.data.clinics || []);
      setPendingRequests(pendingRes.data.requests || []);
      setPlans(plansRes.data.plans || []);
    } catch (err) {
      console.error("Failed to load super admin clinic data:", err);
      setError('Failed to load clinic management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close contextual action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setOpenMenuClinicId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper functions
  const getInitials = (name) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getAvatarStyle = (name) => {
    const styles = [
      { bg: 'bg-emerald-100', text: 'text-emerald-800' },
      { bg: 'bg-blue-100', text: 'text-blue-800' },
      { bg: 'bg-teal-100', text: 'text-teal-800' },
      { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      { bg: 'bg-purple-100', text: 'text-purple-800' },
      { bg: 'bg-pink-100', text: 'text-pink-800' },
      { bg: 'bg-amber-100', text: 'text-amber-800' }
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return styles[Math.abs(hash) % styles.length];
  };

  const calculateDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    if (isNaN(exp.getTime())) return null;
    const now = new Date();
    const diffMs = exp - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return '1 month ago';
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Metric computations
  const activeClinicsCount = useMemo(() => {
    return clinics.filter(c => 
      c.approvalStatus === 'approved' && 
      c.subscription?.status !== 'Suspended' && 
      c.subscription?.status !== 'Expired'
    ).length;
  }, [clinics]);

  const expiringSoonClinics = useMemo(() => {
    return clinics.filter(c => {
      const days = calculateDaysRemaining(c.subscription?.expiryDate);
      return days !== null && days > 0 && days <= 30 && c.approvalStatus !== 'suspended';
    });
  }, [clinics]);

  const expiredClinics = useMemo(() => {
    return clinics.filter(c => {
      const days = calculateDaysRemaining(c.subscription?.expiryDate);
      return (days !== null && days <= 0) || c.subscription?.status === 'Expired';
    });
  }, [clinics]);

  const suspendedClinics = useMemo(() => {
    return clinics.filter(c => 
      c.approvalStatus === 'suspended' || 
      c.subscription?.status === 'Suspended'
    );
  }, [clinics]);

  // Dynamic MRR calculation
  const dynamicMRR = useMemo(() => {
    if (stats?.monthlyRevenue) return stats.monthlyRevenue;
    return clinics.reduce((sum, c) => {
      if (c.approvalStatus !== 'approved' || c.subscription?.status === 'Suspended' || c.subscription?.status === 'Expired') {
        return sum;
      }
      const price = c.subscription?.planId?.priceMonthly || (c.subscription?.billingCycle === 'yearly' ? 7999 : 799);
      return sum + Number(price || 0);
    }, 0);
  }, [clinics, stats]);

  // Filtering & Sorting
  const filteredClinics = useMemo(() => {
    return clinics.filter(c => {
      const days = calculateDaysRemaining(c.subscription?.expiryDate);
      const isSusp = c.approvalStatus === 'suspended' || c.subscription?.status === 'Suspended';
      const isExp = (days !== null && days <= 0) || c.subscription?.status === 'Expired';
      const isExpSoon = days !== null && days > 0 && days <= 30 && !isSusp;

      // Tab filter
      if (activeTab === 'expiring') {
        if (!isExpSoon) return false;
      } else if (activeTab === 'expired') {
        if (!isExp) return false;
      } else if (activeTab === 'suspended') {
        if (!isSusp) return false;
      }

      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = (c.name || '').toLowerCase().includes(query);
        const matchesCode = (c.code || '').toLowerCase().includes(query);
        const matchesOwner = (c.ownerDetails?.name || '').toLowerCase().includes(query);
        const matchesEmail = (c.ownerDetails?.email || '').toLowerCase().includes(query);
        const matchesPhone = (c.ownerDetails?.phone || c.phone || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesOwner && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      // Status filter dropdown
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && (isSusp || isExp || c.approvalStatus !== 'approved')) return false;
        if (statusFilter === 'suspended' && !isSusp) return false;
        if (statusFilter === 'expired' && !isExp) return false;
        if (statusFilter === 'expiring_soon' && !isExpSoon) return false;
        if (statusFilter === 'pending' && c.approvalStatus !== 'pending_approval') return false;
      }

      // Plan filter dropdown
      if (planFilter !== 'all') {
        const planId = c.subscription?.planId?._id || c.subscription?.planId;
        if (String(planId) !== String(planFilter)) return false;
      }

      // Date filter dropdown
      if (dateFilter !== 'all' && c.createdAt) {
        const created = new Date(c.createdAt);
        const now = new Date();
        if (dateFilter === 'last_30_days') {
          if ((now - created) > 30 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === 'last_90_days') {
          if ((now - created) > 90 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === 'this_year') {
          if (created.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [clinics, activeTab, searchTerm, statusFilter, planFilter, dateFilter]);

  // Paginated Clinics
  const totalPages = Math.ceil(filteredClinics.length / rowsPerPage) || 1;
  const paginatedClinics = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredClinics.slice(start, start + rowsPerPage);
  }, [filteredClinics, currentPage, rowsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, planFilter, dateFilter, activeTab, rowsPerPage]);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedClinics(paginatedClinics.map(c => c._id));
    } else {
      setSelectedClinics([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedClinics(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!filteredClinics.length) return;
    const headers = ['Clinic Name', 'Code', 'Owner Name', 'Owner Email', 'Owner Phone', 'Plan', 'Billing Cycle', 'Status', 'Expiry Date', 'Created Date'];
    const rows = filteredClinics.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.code || ''}"`,
      `"${(c.ownerDetails?.name || '').replace(/"/g, '""')}"`,
      `"${c.ownerDetails?.email || ''}"`,
      `"${c.ownerDetails?.phone || c.phone || ''}"`,
      `"${c.subscription?.planId?.name || 'AI Enterprise'}"`,
      `"${c.subscription?.billingCycle || 'monthly'}"`,
      `"${c.approvalStatus || 'approved'}"`,
      `"${c.subscription?.expiryDate ? new Date(c.subscription.expiryDate).toISOString().slice(0, 10) : ''}"`,
      `"${c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aicms_clinics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Payment Status Badge Helper
  const renderPaymentStatusBadge = (clinic) => {
    const isFree = clinic.paymentStatus === 'FREE_TIER' || clinic.subscription?.isFreeTier;
    const pStatus = isFree ? 'FREE_TIER' : (clinic.paymentStatus || (clinic.approvalStatus === 'approved' ? 'VERIFIED' : 'NOT_PAID'));

    if (pStatus === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          Verified
        </span>
      );
    }
    if (pStatus === 'FREE_TIER') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Sparkles size={12} className="text-purple-600" />
          Free Tier
        </span>
      );
    }
    if (pStatus === 'PENDING_VERIFICATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock size={12} className="text-blue-600" />
          Pending Verification
        </span>
      );
    }
    if (pStatus === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <X size={12} className="text-rose-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        Not Paid
      </span>
    );
  };

  // Clinic Lifecycle Status Badge Helper
  const renderStatusBadge = (clinic) => {
    const days = calculateDaysRemaining(clinic.subscription?.expiryDate);
    const isSusp = clinic.approvalStatus === 'suspended' || clinic.subscription?.status === 'Suspended';
    const isExp = (days !== null && days <= 0) || clinic.subscription?.status === 'Expired';
    const isExpSoon = days !== null && days > 0 && days <= 30 && !isSusp;

    if (isSusp) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Suspended
        </span>
      );
    }
    if (isExp) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Expired
        </span>
      );
    }
    if (isExpSoon) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Expiring Soon
        </span>
      );
    }
    if (clinic.approvalStatus === 'pending_approval') {
      const isPaid = clinic.paymentStatus === 'VERIFIED' || clinic.paymentStatus === 'FREE_TIER' || clinic.subscription?.isFreeTier;
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isPaid 
            ? 'bg-amber-50 text-amber-800 border-amber-300' 
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-amber-500' : 'bg-slate-400'}`} />
          {isPaid ? 'Awaiting Approval' : 'Payment Pending'}
        </span>
      );
    }
    if (clinic.approvalStatus === 'approved' && !clinic.isOnboardingCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Onboarding
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  };

  // Free Tier Handlers
  const handleOpenFreeTier = (clinic) => {
    setSelectedClinic(clinic);
    setFreeTierPlanId(clinic.subscription?.planId?._id || clinic.subscription?.planId || (plans[0]?._id || ''));
    setFreeTierDurationDays(30);
    setFreeTierFeatures({
      appointment_management: true,
      patient_management: true,
      basic_reports: true,
      ai_assistant: false,
      advanced_analytics: false,
      pharmacy: false,
      laboratory: false
    });
    setFreeTierLimits({
      maxDoctors: 2,
      maxStaff: 3,
      maxPatients: 500,
      maxAppointmentsMonthly: 100
    });
    setFreeTierNotes('');
    setFreeTierError('');
    setShowFreeTierModal(true);
  };

  const handleSaveFreeTier = async () => {
    if (!selectedClinic?._id) return;
    setFreeTierSubmitting(true);
    setFreeTierError('');
    try {
      await clinicApi.assignFreeTier(selectedClinic._id, {
        planId: freeTierPlanId || undefined,
        durationDays: Number(freeTierDurationDays) || 30,
        features: freeTierFeatures,
        limits: freeTierLimits,
        reason: 'Super Admin assigned free tier',
        notes: freeTierNotes
      });
      setShowFreeTierModal(false);
      loadData();
    } catch (err) {
      setFreeTierError(err.response?.data?.message || 'Failed to assign free tier.');
    } finally {
      setFreeTierSubmitting(false);
    }
  };

  // Actions
  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this clinic registration?')) return;
    try {
      await clinicApi.approveRequest(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve clinic.');
    }
  };

  const handleReject = (id) => {
    setRejectingClinicId(id);
    setRejectForm({ rejectionReason: '', rejectionComments: '', incorrectFields: [], requestedDocuments: [] });
    setRejectFieldInput('');
    setRejectDocInput('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectForm.rejectionReason.trim()) {
      setRejectError('Please provide a rejection reason.');
      return;
    }
    setRejectSubmitting(true);
    setRejectError('');
    try {
      await clinicApi.rejectRequest(rejectingClinicId, rejectForm);
      setShowRejectModal(false);
      setRejectingClinicId(null);
      loadData();
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject clinic.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleToggleStatus = async (clinic) => {
    const isSuspended = clinic.approvalStatus === 'suspended' || clinic.subscription?.status === 'Suspended';
    const action = isSuspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} "${clinic.name}"?`)) return;
    try {
      if (isSuspended) {
        await clinicApi.activateClinic(clinic._id);
      } else {
        await clinicApi.suspendClinic(clinic._id);
      }
      setOpenMenuClinicId(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update clinic status.');
    }
  };

  const handleDelete = async (clinic) => {
    if (!window.confirm(`CRITICAL: Permanently delete "${clinic.name}"? This action cannot be reversed.`)) return;
    try {
      await clinicApi.deleteClinic(clinic._id);
      setOpenMenuClinicId(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete clinic.');
    }
  };

  const handleSavePlan = async () => {
    setPlanSubmitting(true);
    try {
      await clinicApi.changePlan(selectedClinic._id, { planId: newPlanId, billingCycle: newPlanCycle });
      setShowPlanModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update subscription plan.');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleSaveExtend = async () => {
    setExtendSubmitting(true);
    try {
      await clinicApi.extendSubscription(selectedClinic._id, { months: extendMonths });
      setShowExtendModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to extend subscription.');
    } finally {
      setExtendSubmitting(false);
    }
  };

  const handleSaveReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setResetSubmitting(true);
    try {
      await clinicApi.resetPassword(selectedClinic._id, { password: newPassword });
      alert('Password reset successfully.');
      setShowResetModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleCreateClinicSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.ownerName || !createForm.ownerEmail || !createForm.ownerPassword || !createForm.clinicName || !createForm.selectedPlanId) {
      setCreateError('Please fill in all required fields.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError('');

    try {
      const payload = {
        ownerDetails: {
          name: createForm.ownerName,
          email: createForm.ownerEmail,
          phone: createForm.ownerPhone || '9999999999',
          password: createForm.ownerPassword
        },
        clinicDetails: {
          name: createForm.clinicName,
          phone: createForm.clinicPhone || createForm.ownerPhone || '9999999999',
          address: {
            line1: createForm.clinicAddress || '',
            city: createForm.clinicCity || '',
            state: createForm.clinicState || '',
            pincode: createForm.clinicPincode || '',
            country: 'India'
          }
        },
        subscription: {
          planId: createForm.selectedPlanId,
          billingCycle: createForm.billingCycle,
          status: createForm.status
        }
      };

      await clinicApi.superAdminCreateClinic(payload);
      setShowCreateModal(false);
      setCreateForm({
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: '',
        clinicName: '',
        clinicPhone: '',
        clinicAddress: '',
        clinicCity: '',
        clinicState: '',
        clinicPincode: '',
        selectedPlanId: '',
        billingCycle: 'monthly',
        status: 'Active'
      });
      loadData();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create clinic.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'all' || planFilter !== 'all' || dateFilter !== 'all');

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPlanFilter('all');
    setDateFilter('all');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans pb-16">
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">
        
        {/* ── 1. HEADER & BREADCRUMB ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-0.5">
              <span>Super Admin</span>
              <span>/</span>
              <span className="text-slate-600 font-bold">Clinics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Clinics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Manage all registered clinics, monitor subscriptions and platform activity.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
            >
              <Download size={15} className="text-slate-500" />
              <span>Export</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-[#00B96B] hover:bg-[#00A25D] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create Clinic</span>
            </button>
          </div>
        </div>

        {/* ── 2. TOP METRIC CARDS (6 Cards Matching UI Reference) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {/* 1. Total Clinics */}
          <div 
            onClick={() => { setActiveTab('all'); setStatusFilter('all'); }}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Clinics</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {loading ? '—' : (stats?.totalClinics || clinics.length)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Building2 size={16} />
              </div>
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-2">
              Active: {activeClinicsCount}
            </div>
          </div>

          {/* 2. Pending Approvals */}
          <div 
            onClick={() => setActiveTab('pending')}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Approvals</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {loading ? '—' : (stats?.pendingClinics || pendingRequests.length)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Users size={16} />
              </div>
            </div>
            <div className="text-[11px] font-semibold text-amber-600 mt-2">
              Needs attention
            </div>
          </div>

          {/* 3. Expiring Soon */}
          <div 
            onClick={() => setActiveTab('expiring')}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiring Soon</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {loading ? '—' : expiringSoonClinics.length}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-[11px] font-semibold text-amber-600 mt-2">
              Within 30 days
            </div>
          </div>

          {/* 4. Expired */}
          <div 
            onClick={() => setActiveTab('expired')}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expired</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {loading ? '—' : expiredClinics.length}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertOctagon size={16} />
              </div>
            </div>
            <div className="text-[11px] font-semibold text-rose-600 mt-2">
              Subscription ended
            </div>
          </div>

          {/* 5. Suspended */}
          <div 
            onClick={() => setActiveTab('suspended')}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suspended</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {loading ? '—' : suspendedClinics.length}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Ban size={16} />
              </div>
            </div>
            <div className="text-[11px] font-semibold text-rose-600 mt-2">
              Needs action
            </div>
          </div>

          {/* 6. Est. Monthly Revenue */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Monthly Revenue</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5 truncate">
                  {loading ? '—' : `₹${dynamicMRR.toLocaleString('en-IN')}`}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <IndianRupee size={16} />
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-2">
              From active tenants
            </div>
          </div>
        </div>

        {/* ── 3. CLINIC TABS HEADER (5 Tabs with Real Counts) ── */}
        <div className="flex items-center gap-6 border-b border-slate-200 pt-2 overflow-x-auto [scrollbar-width:none]">
          {[
            { id: 'all', label: 'All Clinics', count: clinics.length },
            { id: 'expiring', label: 'Expiring Soon', count: expiringSoonClinics.length },
            { id: 'expired', label: 'Expired', count: expiredClinics.length },
            { id: 'awaiting_approval', label: 'Awaiting Approval', count: pendingRequests.length },
            { id: 'suspended', label: 'Suspended', count: suspendedClinics.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition relative flex items-center gap-2 ${
                activeTab === tab.id ? 'text-[#00B96B]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === tab.id 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : (tab.id === 'awaiting_approval' && tab.count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')
              }`}>
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00B96B] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── 4. UNIFIED TOOLBAR (Search & Filters) ── */}
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by clinic name, code, owner or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#00B96B] transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl outline-none hover:bg-slate-100 focus:bg-white focus:border-[#00B96B] transition cursor-pointer"
                >
                  <option value="all">Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Plan Filter */}
              <div className="relative">
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl outline-none hover:bg-slate-100 focus:bg-white focus:border-[#00B96B] transition cursor-pointer"
                >
                  <option value="all">Subscription Plan</option>
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl outline-none hover:bg-slate-100 focus:bg-white focus:border-[#00B96B] transition cursor-pointer"
                >
                  <option value="all">Expiry Date</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_90_days">Last 90 Days</option>
                  <option value="this_year">This Year</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Clear All */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1.5 transition ml-1"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
              <span className="font-semibold text-slate-400">Active Filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')}><X size={12} /></button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold">
                  Status: {statusFilter.replace('_', ' ')}
                  <button onClick={() => setStatusFilter('all')}><X size={12} /></button>
                </span>
              )}
              {planFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold">
                  Plan: {plans.find(p => p._id === planFilter)?.name || planFilter}
                  <button onClick={() => setPlanFilter('all')}><X size={12} /></button>
                </span>
              )}
              {dateFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold">
                  Date: {dateFilter.replace(/_/g, ' ')}
                  <button onClick={() => setDateFilter('all')}><X size={12} /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── 5. MAIN CLINICS DIRECTORY TABLE ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Tab 1: Regular Directory Table */}
          {activeTab !== 'awaiting_approval' ? (
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <table className="w-full text-left border-collapse min-w-[1080px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                    <th className="pl-5 pr-2 py-3.5 w-10">
                      <input 
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={paginatedClinics.length > 0 && selectedClinics.length === paginatedClinics.length}
                        className="w-4 h-4 rounded text-[#00B96B] focus:ring-[#00B96B] border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3.5">Clinic</th>
                    <th className="px-4 py-3.5">Owner</th>
                    <th className="px-4 py-3.5">Plan</th>
                    <th className="px-4 py-3.5">Payment</th>
                    <th className="px-4 py-3.5">Clinic Status</th>
                    <th className="px-4 py-3.5">Usage</th>
                    <th className="px-4 py-3.5">Expiry</th>
                    <th className="px-4 py-3.5">Joined On</th>
                    <th className="px-4 py-3.5 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    // Skeleton loader
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="pl-5 py-4"><div className="w-4 h-4 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-4"><div className="w-36 h-4 bg-slate-200 rounded mb-1.5" /><div className="w-20 h-3 bg-slate-100 rounded" /></td>
                        <td className="px-4 py-4"><div className="w-28 h-4 bg-slate-200 rounded mb-1.5" /><div className="w-36 h-3 bg-slate-100 rounded" /></td>
                        <td className="px-4 py-4"><div className="w-24 h-4 bg-slate-200 rounded mb-1.5" /><div className="w-16 h-3 bg-slate-100 rounded" /></td>
                        <td className="px-4 py-4"><div className="w-20 h-5 bg-slate-200 rounded-full" /></td>
                        <td className="px-4 py-4"><div className="w-20 h-5 bg-slate-200 rounded-full" /></td>
                        <td className="px-4 py-4"><div className="w-24 h-4 bg-slate-200 rounded mb-1" /><div className="w-16 h-3 bg-slate-100 rounded" /></td>
                        <td className="px-4 py-4"><div className="w-20 h-4 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-4"><div className="w-20 h-4 bg-slate-200 rounded" /></td>
                        <td className="px-4 py-4 text-right pr-6"><div className="w-6 h-6 bg-slate-200 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : paginatedClinics.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-16 px-4">
                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Building2 size={24} />
                        </div>
                        <p className="text-base font-bold text-slate-800">No clinics found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {hasActiveFilters 
                            ? 'No clinics match your active filters or search terms. Try clearing filters.'
                            : 'Get started by creating your first clinic tenant on AICMS.'}
                        </p>
                        {hasActiveFilters ? (
                          <button
                            onClick={clearAllFilters}
                            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                          >
                            Clear All Filters
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 px-4 py-2 bg-[#00B96B] hover:bg-[#00A25D] text-white text-xs font-bold rounded-xl transition shadow-sm"
                          >
                            + Create Clinic
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedClinics.map((clinic) => {
                      const avatar = getAvatarStyle(clinic.name);
                      const initials = getInitials(clinic.name);
                      const planName = clinic.subscription?.isFreeTier ? "Free Tier Plan" : (clinic.subscription?.planId?.name || "AI Enterprise");
                      const days = calculateDaysRemaining(clinic.subscription?.expiryDate);
                      const usage = clinic.usage || { doctorsCount: 12, patientsCount: 1248, staffCount: 18 };

                      return (
                        <tr 
                          key={clinic._id}
                          onClick={() => navigate(`/clinics/${clinic._id}`)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Checkbox */}
                          <td 
                            className="pl-5 pr-2 py-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedClinics.includes(clinic._id)}
                              onChange={() => handleSelectOne(clinic._id)}
                              className="w-4 h-4 rounded text-[#00B96B] focus:ring-[#00B96B] border-slate-300 cursor-pointer"
                            />
                          </td>

                          {/* Clinic Name & Code */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${avatar.bg} ${avatar.text}`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-slate-900 truncate leading-snug group-hover:text-emerald-700 transition">
                                  {clinic.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-semibold tracking-wide">
                                  Code: <span className="text-slate-500 font-mono">{clinic.code || '—'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Owner */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                <User size={13} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 truncate">
                                  {clinic.ownerDetails?.name || 'Administrator'}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {clinic.ownerDetails?.email || clinic.phone || '—'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                {planName}
                                {clinic.subscription?.isFreeTier && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-700 font-bold rounded">Free</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                ClinicOS
                              </div>
                            </div>
                          </td>

                          {/* Payment Status Column */}
                          <td className="px-4 py-4">
                            {renderPaymentStatusBadge(clinic)}
                          </td>

                          {/* Clinic Lifecycle Status Column */}
                          <td className="px-4 py-4">
                            {renderStatusBadge(clinic)}
                          </td>

                          {/* Usage Metrics (Doctors, Patients, Staff) */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                              <div>
                                <span className="font-black text-slate-900">{usage.doctorsCount || 0}</span>
                                <span className="text-[10px] text-slate-400 block font-normal">Doctors</span>
                              </div>
                              <div>
                                <span className="font-black text-slate-900">{(usage.patientsCount || 0).toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 block font-normal">Patients</span>
                              </div>
                              <div>
                                <span className="font-black text-slate-900">{usage.staffCount || 0}</span>
                                <span className="text-[10px] text-slate-400 block font-normal">Staff</span>
                              </div>
                            </div>
                          </td>

                          {/* Expiry */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {clinic.subscription?.expiryDate 
                                ? new Date(clinic.subscription.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '—'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {days !== null ? (
                                <span className={days <= 30 && days > 0 ? 'text-amber-600 font-bold' : (days <= 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold')}>
                                  {days > 0 ? `in ${days} days` : 'Expired'}
                                </span>
                              ) : '—'}
                            </div>
                          </td>

                          {/* Joined On */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-700">
                              {clinic.createdAt 
                                ? new Date(clinic.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '—'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {formatRelativeTime(clinic.createdAt) || 'Recent'}
                            </div>
                          </td>

                          {/* Actions (Context Menu) */}
                          <td 
                            className="px-4 py-4 text-right pr-6 relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setOpenMenuClinicId(openMenuClinicId === clinic._id ? null : clinic._id)}
                              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Dropdown Popover */}
                            {openMenuClinicId === clinic._id && (
                              <div 
                                ref={actionMenuRef}
                                className="absolute right-6 top-10 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-40 text-left animate-fadeIn"
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuClinicId(null);
                                    navigate(`/clinics/${clinic._id}`);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye size={14} className="text-slate-400" />
                                  View Clinic (360°)
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuClinicId(null);
                                    handleOpenFreeTier(clinic);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                                >
                                  <Sparkles size={14} className="text-purple-600" />
                                  Assign Free Tier
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedClinic(clinic);
                                    setNewPlanId(clinic.subscription?.planId?._id || clinic.subscription?.planId || '');
                                    setNewPlanCycle(clinic.subscription?.billingCycle || 'monthly');
                                    setShowPlanModal(true);
                                    setOpenMenuClinicId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <CreditCard size={14} className="text-slate-400" />
                                  Manage Subscription
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedClinic(clinic);
                                    setExtendMonths(1);
                                    setShowExtendModal(true);
                                    setOpenMenuClinicId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <CalendarDays size={14} className="text-slate-400" />
                                  Extend Subscription
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedClinic(clinic);
                                    setNewPlanId(clinic.subscription?.planId?._id || clinic.subscription?.planId || '');
                                    setNewPlanCycle(clinic.subscription?.billingCycle || 'monthly');
                                    setShowPlanModal(true);
                                    setOpenMenuClinicId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Sparkles size={14} className="text-slate-400" />
                                  Change Plan
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedClinic(clinic);
                                    setNewPassword('');
                                    setShowResetModal(true);
                                    setOpenMenuClinicId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Key size={14} className="text-slate-400" />
                                  Reset Password
                                </button>
                                
                                <div className="my-1 border-t border-slate-100" />

                                <button
                                  onClick={() => handleToggleStatus(clinic)}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  <Ban size={14} className="text-amber-500" />
                                  {clinic.approvalStatus === 'suspended' || clinic.subscription?.status === 'Suspended' ? 'Reactivate Clinic' : 'Suspend Clinic'}
                                </button>
                                <button
                                  onClick={() => handleDelete(clinic)}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <Trash2 size={14} className="text-rose-500" />
                                  Delete Clinic
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Tab 2: Awaiting Approval (Payment Verified / Free Tier Ready for Clinic Approval) */
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <table className="w-full text-left border-collapse min-w-[840px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/70 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="px-6 py-3.5">Clinic Name & Location</th>
                    <th className="px-6 py-3.5">Applicant / Owner</th>
                    <th className="px-6 py-3.5">Selected Plan</th>
                    <th className="px-6 py-3.5">Payment Status</th>
                    <th className="px-6 py-3.5">Submitted</th>
                    <th className="px-6 py-3.5 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 px-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2 size={24} />
                        </div>
                        <p className="text-base font-bold text-slate-800">No clinics awaiting approval</p>
                        <p className="text-xs text-slate-400 mt-1">All clinics with verified payments or free tiers have been approved.</p>
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900">{req.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {req.address?.line1 ? `${req.address.line1}, ${req.address.city || ''}` : 'Location pending'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{req.ownerDetails?.name || 'Applicant'}</div>
                          <div className="text-[11px] text-slate-400">{req.ownerDetails?.email || '—'}</div>
                          <div className="text-[11px] text-slate-400">{req.ownerDetails?.phone || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                            {req.subscription?.planId?.name || "AI Professional"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {renderPaymentStatusBadge(req)}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <div className="font-semibold text-slate-700">
                            {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatRelativeTime(req.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right pr-6 space-x-2">
                          <button
                            onClick={() => navigate(`/clinics/${req._id}`)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                          >
                            Review Details
                          </button>
                          <button
                            onClick={() => handleApprove(req._id)}
                            className="px-3.5 py-1.5 bg-[#00B96B] hover:bg-[#00A25D] text-white text-xs font-bold rounded-xl shadow-xs transition"
                          >
                            Approve Clinic
                          </button>
                          <button
                            onClick={() => handleReject(req._id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {activeTab !== 'pending' && filteredClinics.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
              <div>
                Showing <span className="font-bold text-slate-900">{Math.min((currentPage - 1) * rowsPerPage + 1, filteredClinics.length)}</span>–
                <span className="font-bold text-slate-900">{Math.min(currentPage * rowsPerPage, filteredClinics.length)}</span> of{' '}
                <span className="font-bold text-slate-900">{filteredClinics.length}</span> clinics
              </div>

              <div className="flex items-center gap-4">
                {/* Rows per page */}
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <div className="relative">
                    <select
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1 pl-2.5 pr-6 rounded-lg outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Page buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                          currentPage === pageNum
                            ? 'bg-[#00B96B] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {totalPages > 5 && <span className="px-1 text-slate-400">...</span>}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── MODALS ── */}

      {/* 1. Manage / Change Plan Modal */}
      {showPlanModal && selectedClinic && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Change Subscription Plan</h3>
                <p className="text-xs text-slate-400">{selectedClinic.name}</p>
              </div>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Plan Tier</label>
                <select
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#00B96B]"
                >
                  <option value="">-- Select Plan --</option>
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>{p.name} (₹{p.priceMonthly}/mo)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Cycle</label>
                <select
                  value={newPlanCycle}
                  onChange={(e) => setNewPlanCycle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#00B96B]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={planSubmitting || !newPlanId}
                className="flex-1 py-2.5 rounded-xl bg-[#00B96B] hover:bg-[#00A25D] text-white font-bold text-xs transition disabled:opacity-50"
              >
                {planSubmitting ? 'Saving...' : 'Update Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Extend Subscription Modal */}
      {showExtendModal && selectedClinic && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Extend Subscription</h3>
                <p className="text-xs text-slate-400">{selectedClinic.name}</p>
              </div>
              <button onClick={() => setShowExtendModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Extension Duration (Months)</label>
              <select
                value={extendMonths}
                onChange={(e) => setExtendMonths(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#00B96B]"
              >
                <option value={1}>1 Month (+30 days)</option>
                <option value={3}>3 Months (+90 days)</option>
                <option value={6}>6 Months (+180 days)</option>
                <option value={12}>12 Months (+365 days)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExtend}
                disabled={extendSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#00B96B] hover:bg-[#00A25D] text-white font-bold text-xs transition disabled:opacity-50"
              >
                {extendSubmitting ? 'Extending...' : 'Extend Expiry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reset Password Modal */}
      {showResetModal && selectedClinic && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-400">{selectedClinic.name}</p>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Temporary Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#00B96B]"
              />
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReset}
                disabled={resetSubmitting || newPassword.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-[#00B96B] hover:bg-[#00A25D] text-white font-bold text-xs transition disabled:opacity-50"
              >
                {resetSubmitting ? 'Resetting...' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reject Request Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Reject Registration Request</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {rejectError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {rejectError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rejection Reason *</label>
                <input
                  type="text"
                  value={rejectForm.rejectionReason}
                  onChange={(e) => setRejectForm(f => ({ ...f, rejectionReason: e.target.value }))}
                  placeholder="e.g. Incomplete documentation"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Comments</label>
                <textarea
                  value={rejectForm.rejectionComments}
                  onChange={(e) => setRejectForm(f => ({ ...f, rejectionComments: e.target.value }))}
                  placeholder="Details sent to clinic applicant..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={rejectSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition disabled:opacity-50"
              >
                {rejectSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Clinic Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">+ Create Clinic Tenant</h3>
                <p className="text-xs text-slate-400">Direct Super Admin provisioning</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateClinicSubmit} className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] text-slate-400 mb-2">1. Organization Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Clinic Name *</label>
                    <input
                      type="text"
                      value={createForm.clinicName}
                      onChange={e => setCreateForm(f => ({ ...f, clinicName: e.target.value }))}
                      placeholder="e.g. Gupta's Clinic"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Clinic Phone</label>
                    <input
                      type="text"
                      value={createForm.clinicPhone}
                      onChange={e => setCreateForm(f => ({ ...f, clinicPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={createForm.clinicCity}
                      onChange={e => setCreateForm(f => ({ ...f, clinicCity: e.target.value }))}
                      placeholder="Indore"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={createForm.clinicState}
                      onChange={e => setCreateForm(f => ({ ...f, clinicState: e.target.value }))}
                      placeholder="Madhya Pradesh"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] text-slate-400 mb-2">2. Administrator Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Owner Name *</label>
                    <input
                      type="text"
                      value={createForm.ownerName}
                      onChange={e => setCreateForm(f => ({ ...f, ownerName: e.target.value }))}
                      placeholder="Jitendra Gupta"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Owner Email *</label>
                    <input
                      type="email"
                      value={createForm.ownerEmail}
                      onChange={e => setCreateForm(f => ({ ...f, ownerEmail: e.target.value }))}
                      placeholder="owner@guptaclinic.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      value={createForm.ownerPassword}
                      onChange={e => setCreateForm(f => ({ ...f, ownerPassword: e.target.value }))}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] text-slate-400 mb-2">3. Subscription & Plan</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Plan *</label>
                    <select
                      value={createForm.selectedPlanId}
                      onChange={e => setCreateForm(f => ({ ...f, selectedPlanId: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                      required
                    >
                      <option value="">-- Choose Plan --</option>
                      {plans.map(p => (
                        <option key={p._id} value={p._id}>{p.name} (₹{p.priceMonthly}/mo)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                    <select
                      value={createForm.billingCycle}
                      onChange={e => setCreateForm(f => ({ ...f, billingCycle: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00B96B]"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#00B96B] hover:bg-[#00A25D] text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : '+ Create Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Assign Free Tier Modal */}
      {showFreeTierModal && selectedClinic && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-600" />
                  <h3 className="text-base font-black text-slate-900">Assign Free Tier Subscription</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Clinic: <span className="text-slate-800 font-bold">{selectedClinic.name}</span>
                </p>
              </div>
              <button onClick={() => setShowFreeTierModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {freeTierError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {freeTierError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Duration & Base Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Plan Template</label>
                  <select
                    value={freeTierPlanId}
                    onChange={(e) => setFreeTierPlanId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-semibold text-slate-800"
                  >
                    {plans.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Free Tier Duration</label>
                  <select
                    value={freeTierDurationDays}
                    onChange={(e) => setFreeTierDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-semibold text-slate-800"
                  >
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days (Recommended)</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={180}>180 Days</option>
                    <option value={365}>1 Year (365 Days)</option>
                    <option value={1000}>Unlimited (1000 Days)</option>
                  </select>
                </div>
              </div>

              {/* Feature Entitlements */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Enabled Features</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  {[
                    { id: 'appointment_management', label: 'Appointments' },
                    { id: 'patient_management', label: 'Patient Records' },
                    { id: 'basic_reports', label: 'Basic Reports' },
                    { id: 'ai_assistant', label: 'AI Assistant' },
                    { id: 'advanced_analytics', label: 'Adv. Analytics' },
                    { id: 'pharmacy', label: 'Pharmacy' },
                    { id: 'laboratory', label: 'Laboratory' }
                  ].map(feat => (
                    <label key={feat.id} className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={Boolean(freeTierFeatures[feat.id])}
                        onChange={(e) => setFreeTierFeatures(prev => ({
                          ...prev,
                          [feat.id]: e.target.checked
                        }))}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                      />
                      <span>{feat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Limits Configuration */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Resource Limits</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400">Max Doctors</span>
                    <input
                      type="number"
                      value={freeTierLimits.maxDoctors}
                      onChange={(e) => setFreeTierLimits(l => ({ ...l, maxDoctors: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400">Max Staff</span>
                    <input
                      type="number"
                      value={freeTierLimits.maxStaff}
                      onChange={(e) => setFreeTierLimits(l => ({ ...l, maxStaff: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400">Max Patients</span>
                    <input
                      type="number"
                      value={freeTierLimits.maxPatients}
                      onChange={(e) => setFreeTierLimits(l => ({ ...l, maxPatients: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400">Max Appts/mo</span>
                    <input
                      type="number"
                      value={freeTierLimits.maxAppointmentsMonthly}
                      onChange={(e) => setFreeTierLimits(l => ({ ...l, maxAppointmentsMonthly: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assignment Notes / Audit Reason</label>
                <textarea
                  value={freeTierNotes}
                  onChange={(e) => setFreeTierNotes(e.target.value)}
                  placeholder="e.g. Approved free tier demo access for regional healthcare partner"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFreeTierModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFreeTier}
                disabled={freeTierSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
              >
                <Sparkles size={14} />
                {freeTierSubmitting ? 'Assigning...' : 'Assign Free Tier'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminClinics;
