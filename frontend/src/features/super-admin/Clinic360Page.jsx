import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { clinicApi, subscriptionPaymentApi } from '../../lib/api';
import {
  Building2, Users, FileCheck, Ban, Clock,
  IndianRupee, CalendarDays, RefreshCw, Key,
  Check, X, Search, ShieldAlert, Trash2, ArrowUpDown,
  AlertTriangle, Plus, Download, MoreVertical, MoreHorizontal,
  ChevronRight, ChevronLeft, ChevronDown, ExternalLink, Shield,
  Filter, CheckCircle2, SlidersHorizontal, Sparkles, MapPin,
  Mail, Phone, Settings, CreditCard, FileText, User, ArrowLeft,
  Activity, Star, MessageSquare, AlertCircle, CheckCircle,
  Stethoscope, UserCheck, HeartPulse, Pill, FlaskConical,
  ShieldCheck, ArrowUpRight, HelpCircle, Eye, Heart
} from 'lucide-react';

const Clinic360Page = () => {
  const { clinicId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Active Top Navigation Tab: 'overview', 'providers', 'feedback', 'complaints', 'subscription', 'activity'
  const [activeTab, setActiveTab] = useState('overview');

  // Feedback filter: 'all', 'positive', 'neutral', 'negative'
  const [feedbackFilter, setFeedbackFilter] = useState('all');

  // Complaints filter: 'all', 'open', 'in_progress', 'resolved'
  const [complaintFilter, setComplaintFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // More actions dropdown
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [plans, setPlans] = useState([]);
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

  // Approval & Rejection states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectForm, setRejectForm] = useState({
    rejectionReason: '',
    rejectionComments: '',
    incorrectFields: [],
    requestedDocuments: [],
  });
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch clinic details and plans
  const loadClinicData = async () => {
    if (!clinicId) return;
    setLoading(true);
    setError('');
    try {
      const [detailsRes, plansRes] = await Promise.all([
        clinicApi.getDetails(clinicId),
        clinicApi.getRegistrationPlans().catch(() => ({ data: { plans: [] } }))
      ]);
      setData(detailsRes.data);
      setPlans(plansRes.data?.plans || []);
    } catch (err) {
      console.error('Failed to load clinic 360 data:', err);
      setError(err.response?.data?.message || 'Failed to load clinic details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicData();
  }, [clinicId]);

  // Helper functions
  const clinic = data?.clinic || {};
  const clinicEmail = data?.clinicEmail || clinic.ownerDetails?.email || 'N/A';
  const doctorStats = data?.doctorStats || { total: 0, active: 0, inactive: 0 };
  const patientStats = data?.patientStats || { total: 0, active: 0, newThisMonth: 0, appointmentsCount: 0 };
  const staffStats = data?.staffStats || { total: 0, active: 0, inactive: 0 };
  const providers = data?.healthcareProviders || [];
  const feedback = data?.feedback || {
    overallRating: 0,
    totalResponses: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    recentFeedback: []
  };
  const complaints = data?.complaints || [];
  const subscriptionHistory = data?.subscriptionHistory || [];

  const fmtDate = (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // ── Payments Tab State ──
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const activityLogs = data?.activity || [];

  const getInitials = (name) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const calculateDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    if (isNaN(exp.getTime())) return null;
    const now = new Date();
    const diffMs = exp - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = useMemo(() => {
    return calculateDaysRemaining(clinic.subscription?.expiryDate);
  }, [clinic.subscription?.expiryDate]);

  const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;
  const isSuspended = clinic.approvalStatus === 'suspended' || clinic.subscription?.status === 'Suspended';

  const renderStatusBadge = () => {
    if (isSuspended) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Suspended
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Expired
        </span>
      );
    }
    if (isExpiringSoon) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Expiring Soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  };

  // Actions
  const handleToggleStatus = async () => {
    const action = isSuspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} "${clinic.name}"?`)) return;
    try {
      if (isSuspended) {
        await clinicApi.activateClinic(clinic._id);
      } else {
        await clinicApi.suspendClinic(clinic._id);
      }
      setShowMoreMenu(false);
      loadClinicData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update clinic status.');
    }
  };

  const handleDeleteClinic = async () => {
    if (!window.confirm(`CRITICAL: Permanently delete "${clinic.name}"? This action cannot be reversed.`)) return;
    try {
      await clinicApi.deleteClinic(clinic._id);
      navigate('/clinics');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete clinic.');
    }
  };

  const handleSavePlan = async () => {
    setPlanSubmitting(true);
    try {
      await clinicApi.changePlan(clinic._id, { planId: newPlanId, billingCycle: newPlanCycle });
      setShowPlanModal(false);
      loadClinicData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update subscription plan.');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleSaveExtend = async () => {
    setExtendSubmitting(true);
    try {
      await clinicApi.extendSubscription(clinic._id, { months: extendMonths });
      setShowExtendModal(false);
      loadClinicData();
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
      await clinicApi.resetPassword(clinic._id, { password: newPassword });
      alert('Password reset successfully.');
      setShowResetModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Approval & Free Tier Handlers
  const handleApproveClinic = async () => {
    if (!window.confirm(`Approve "${clinic.name}" for full clinic platform onboarding?`)) return;
    setApprovalSubmitting(true);
    try {
      await clinicApi.approveRequest(clinic._id);
      loadClinicData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve clinic.');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleOpenRejectModal = () => {
    setRejectForm({ rejectionReason: '', rejectionComments: '', incorrectFields: [], requestedDocuments: [] });
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
      await clinicApi.rejectRequest(clinic._id, rejectForm);
      setShowRejectModal(false);
      loadClinicData();
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject clinic.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleOpenFreeTier = () => {
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
    setShowMoreMenu(false);
  };

  const handleSaveFreeTier = async () => {
    setFreeTierSubmitting(true);
    setFreeTierError('');
    try {
      await clinicApi.assignFreeTier(clinic._id, {
        planId: freeTierPlanId || undefined,
        durationDays: Number(freeTierDurationDays) || 30,
        features: freeTierFeatures,
        limits: freeTierLimits,
        reason: 'Super Admin assigned free tier from Clinic 360',
        notes: freeTierNotes
      });
      setShowFreeTierModal(false);
      loadClinicData();
    } catch (err) {
      setFreeTierError(err.response?.data?.message || 'Failed to assign free tier.');
    } finally {
      setFreeTierSubmitting(false);
    }
  };

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    if (complaintFilter === 'all') return complaints;
    if (complaintFilter === 'open') return complaints.filter(c => c.status?.toLowerCase() === 'open');
    if (complaintFilter === 'in_progress') return complaints.filter(c => c.status?.toLowerCase().includes('progress'));
    if (complaintFilter === 'resolved') return complaints.filter(c => c.status?.toLowerCase() === 'resolved' || c.status?.toLowerCase() === 'closed');
    return complaints;
  }, [complaints, complaintFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="h-4 w-72 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-900">Failed to Load Clinic</h2>
          <p className="text-xs text-slate-500 font-medium">{error || 'Clinic not found'}</p>
          <button
            onClick={() => navigate('/clinics')}
            className="px-5 py-2.5 bg-[#00B96B] hover:bg-[#00A25D] text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            &larr; Back to Clinics
          </button>
        </div>
      </div>
    );
  }

  const planName = clinic.subscription?.planId?.name || 'AI Enterprise';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans pb-16">
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">

        {/* ── BREADCRUMB & BACK BUTTON ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link to="/clinics" className="hover:text-slate-700 transition flex items-center gap-1">
              <ArrowLeft size={14} />
              <span>Back to Clinics</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">{clinic.name}</span>
          </div>
        </div>

        {/* ── 1. CLINIC 360 HEADER CARD ── */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

            {/* Left: Avatar & Meta */}
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-inner">
                {getInitials(clinic.name)}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                    {clinic.name}
                  </h1>
                  {renderStatusBadge()}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <div>Code: <span className="font-mono text-slate-700 font-bold">{clinic.code || '—'}</span></div>
                  <div>&bull;</div>
                  <div>Owner: <span className="text-slate-800 font-bold">{clinic.ownerDetails?.name || 'Administrator'}</span></div>
                  <div>&bull;</div>
                  <div className="flex items-center gap-1"><Mail size={12} className="text-slate-400" /> {clinicEmail}</div>
                  <div>&bull;</div>
                  <div className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {clinic.ownerDetails?.phone || clinic.phone || '+91 98765 43210'}</div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {clinic.address?.line1 ? `${clinic.address.line1}, ${clinic.address.city || ''}, ${clinic.address.state || ''}, ${clinic.address.country || 'India'}` : '123 MG Road, Indore, Madhya Pradesh, India'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Plan Info & CTAs */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-end xl:items-center gap-4 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
              {/* Quick Subscription Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3 text-[11px] font-semibold text-slate-600">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Current Plan</span>
                  <span className="font-bold text-slate-900">{planName} ClinicOS</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Status</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {clinic.subscription?.status || 'Active'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Started On</span>
                  <span className="font-bold text-slate-800">
                    {clinic.subscription?.startDate
                      ? new Date(clinic.subscription.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : (clinic.createdAt ? new Date(clinic.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--')}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Expires On</span>
                  <span className="font-bold text-slate-900">
                    {clinic.subscription?.expiryDate
                      ? new Date(clinic.subscription.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '--'}
                  </span>
                  {daysRemaining !== null && (
                    <span className="text-[10px] text-emerald-600 font-bold ml-1">
                      {daysRemaining > 0 ? `in ${daysRemaining} days` : 'Expired'}
                    </span>
                  )}
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Auto Renewal</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {clinic.subscription?.autoRecharge ? 'Enabled' : 'Enabled'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.open(`/login`, '_blank')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <ExternalLink size={14} className="text-slate-400" />
                  <span>Open Clinic</span>
                </button>

                <button
                  onClick={() => {
                    setNewPlanId(clinic.subscription?.planId?._id || clinic.subscription?.planId || '');
                    setNewPlanCycle(clinic.subscription?.billingCycle || 'monthly');
                    setShowPlanModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#00B96B] hover:bg-[#00A25D] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
                >
                  <CreditCard size={14} />
                  <span>Manage Subscription</span>
                </button>

                {/* More dropdown */}
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu(prev => !prev)}
                    className="inline-flex items-center gap-1 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <span>More</span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-40 text-left animate-fadeIn">
                      <button
                        onClick={handleOpenFreeTier}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                      >
                        <Sparkles size={14} className="text-purple-600" />
                        Assign Free Tier
                      </button>

                      <button
                        onClick={() => {
                          setExtendMonths(1);
                          setShowExtendModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <CalendarDays size={14} className="text-slate-400" />
                        Extend Subscription
                      </button>

                      <button
                        onClick={() => {
                          setNewPlanId(clinic.subscription?.planId?._id || clinic.subscription?.planId || '');
                          setNewPlanCycle(clinic.subscription?.billingCycle || 'monthly');
                          setShowPlanModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Sparkles size={14} className="text-slate-400" />
                        Change Plan
                      </button>

                      <button
                        onClick={() => {
                          setNewPassword('');
                          setShowResetModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Key size={14} className="text-slate-400" />
                        Reset Password
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        onClick={handleToggleStatus}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                      >
                        <Ban size={14} className="text-amber-500" />
                        {isSuspended ? 'Reactivate Clinic' : 'Suspend Clinic'}
                      </button>

                      <button
                        onClick={handleDeleteClinic}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <Trash2 size={14} className="text-rose-500" />
                        Delete Clinic
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── 2. 6 NAVIGATION TABS (Strictly Preserving Clinic Privacy) ── */}
        <div className="border-b border-slate-200 flex items-center gap-6 overflow-x-auto [scrollbar-width:none] pt-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'providers', label: 'Healthcare Providers' },
            { id: 'feedback', label: 'Feedback' },
            { id: 'complaints', label: 'Complaints', badge: complaints.filter(c => c.status?.toLowerCase() === 'open').length },
            { id: 'subscription', label: 'Subscription' },
            { id: 'payments', label: 'Payments' },
            { id: 'activity', label: 'Activity' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition relative flex items-center gap-2 ${
                activeTab === tab.id ? 'text-[#00B96B]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00B96B] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── 3. TAB CONTENTS ── */}

        {/* ──────── TAB 1: OVERVIEW ──────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Awaiting Approval Action Card */}
            {clinic.approvalStatus === 'pending_approval' && (
              <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-200 text-amber-900 uppercase tracking-wide">
                      Awaiting Super Admin Review
                    </span>
                    {(clinic.paymentStatus === 'VERIFIED' || clinic.subscription?.isFreeTier) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Payment Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        <Clock size={12} /> Payment Pending Verification
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Ready for Clinic Approval Decision
                  </h3>
                  <p className="text-xs text-slate-600 max-w-2xl">
                    {(clinic.paymentStatus === 'VERIFIED' || clinic.subscription?.isFreeTier)
                      ? 'The clinic subscription payment has been verified. Review organization, owner, and plan details before granting clinic admin onboarding access.'
                      : 'Subscription payment verification is still required before full clinic approval.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleOpenFreeTier}
                    className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    Assign Free Tier
                  </button>
                  <button
                    onClick={handleOpenRejectModal}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApproveClinic}
                    disabled={approvalSubmitting}
                    className="px-5 py-2 bg-[#00B96B] hover:bg-[#00A25D] text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} />
                    {approvalSubmitting ? 'Approving...' : 'Approve Clinic'}
                  </button>
                </div>
              </div>
            )}

            {/* Top Aggregate Usage Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Doctors Aggregate */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Doctors</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      {doctorStats.total}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Stethoscope size={20} />
                  </div>
                </div>
                <div className="text-xs font-semibold text-emerald-600 mt-3 pt-2">
                  {doctorStats.active} active
                </div>
              </div>

              {/* Patients Aggregate */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Patients</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      {patientStats.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Users size={20} />
                  </div>
                </div>
                <div className="text-xs font-semibold text-emerald-600 mt-3 pt-2">
                  {patientStats.active.toLocaleString()} active
                </div>
              </div>

              {/* Staff Aggregate */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Staff</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      {staffStats.total}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <UserCheck size={20} />
                  </div>
                </div>
                <div className="text-xs font-semibold text-amber-600 mt-3 pt-2">
                  {staffStats.active} active
                </div>
              </div>

              {/* Providers */}
              <div 
                onClick={() => setActiveTab('providers')}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Providers</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      {providers.length}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                    <HeartPulse size={20} />
                  </div>
                </div>
                <div className="text-xs font-semibold text-teal-600 mt-3 pt-2">
                  {providers.filter(p => p.status === 'Active' || p.status === 'Connected').length} connected
                </div>
              </div>
            </div>

            {/* Middle Row: Subscription Status & All Good banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Subscription Status Card */}
              <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subscription Status</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {planName} ClinicOS
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Expires on {clinic.subscription?.expiryDate ? new Date(clinic.subscription.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                    {daysRemaining !== null && (
                      <span className="text-emerald-700 font-bold ml-1">in {daysRemaining} days</span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => {
                        setNewPlanId(clinic.subscription?.planId?._id || clinic.subscription?.planId || '');
                        setNewPlanCycle(clinic.subscription?.billingCycle || 'monthly');
                        setShowPlanModal(true);
                      }}
                      className="px-4 py-2 bg-[#00B96B] hover:bg-[#00A25D] text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Manage Subscription
                    </button>
                    <button
                      onClick={() => setActiveTab('subscription')}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      View History
                    </button>
                  </div>
                </div>

                <div className="hidden sm:flex items-center justify-center p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/80 shrink-0">
                  <ShieldCheck size={48} className="text-[#00B96B]" />
                </div>
              </div>

              {/* All Good / Alert Card */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Check size={24} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-900">All good!</h4>
                  <p className="text-xs text-emerald-800/80 font-medium mt-0.5 leading-relaxed">
                    This clinic's subscription is active and platform services are operational. No action required at this time.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom 4-Card Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {/* 1. Healthcare Providers Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Healthcare Providers</h4>
                    <p className="text-[11px] text-slate-400 font-semibold">Connected services for this clinic</p>
                  </div>
                  <button onClick={() => setActiveTab('providers')} className="text-xs font-bold text-[#00B96B] hover:underline">
                    View All
                  </button>
                </div>

                <div className="space-y-2.5">
                  {providers.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      <HeartPulse size={24} className="mx-auto mb-1 text-slate-300" />
                      No providers connected yet
                    </div>
                  ) : (
                    providers.slice(0, 2).map((prov, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            {prov.providerType?.toLowerCase().includes('pharmacy') ? <Pill size={16} className="text-blue-600" /> : <FlaskConical size={16} className="text-emerald-600" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{prov.name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{prov.providerType || 'Provider'}</div>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Recent Feedback Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Recent Feedback</h4>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      Based on {feedback.totalResponses || 0} responses
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('feedback')}
                    className="text-xs font-bold text-[#00B96B] hover:underline"
                  >
                    View All
                  </button>
                </div>

                {feedback.totalResponses > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-black text-slate-900">
                        {Number(feedback.overallRating || 0).toFixed(1)}
                      </div>
                      <div className="flex items-center justify-center gap-0.5 text-amber-400 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            fill={star <= Math.round(feedback.overallRating || 0) ? 'currentColor' : 'none'}
                            className={star <= Math.round(feedback.overallRating || 0) ? 'text-amber-400' : 'text-slate-200'}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 space-y-1 text-[10px] font-bold text-slate-500">
                      {[5, 4, 3, 2, 1].map((r) => {
                        const count = feedback.breakdown?.[r] || 0;
                        const pct = feedback.totalResponses > 0
                          ? Math.round((count / feedback.totalResponses) * 100)
                          : 0;
                        return (
                          <div key={r} className="flex items-center gap-2">
                            <span>{r}★</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-7 text-right text-slate-400 text-[9px]">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-5 text-center flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mb-1">
                      <Heart size={18} className="text-rose-400" />
                    </div>
                    <p className="text-xs font-black text-slate-800">No feedback yet</p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed">
                      This clinic hasn't received any patient feedback yet.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Open Complaints Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Open Complaints</h4>
                    <p className="text-[11px] text-slate-400 font-semibold">{complaints.length} registered</p>
                  </div>
                  <button onClick={() => setActiveTab('complaints')} className="text-xs font-bold text-[#00B96B] hover:underline">
                    View All
                  </button>
                </div>

                <div className="space-y-2">
                  {complaints.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-400" />
                      No open complaints
                    </div>
                  ) : (
                    complaints.slice(0, 2).map((c, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-800 text-xs truncate">
                            #{c.ticketId || `CMP-102${i}`} {c.subject}
                          </div>
                          <div className="text-[10px] text-slate-400">{c.department || c.category || 'General'}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          c.priority === 'High' || c.priority === 'Critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.priority || 'Medium'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Recent Activity Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Recent Activity</h4>
                    <p className="text-[11px] text-slate-400 font-semibold">Audit trail</p>
                  </div>
                  <button onClick={() => setActiveTab('activity')} className="text-xs font-bold text-[#00B96B] hover:underline">
                    View All
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800">New staff member registered</div>
                      <div className="text-[10px] text-slate-400">Today, 10:24 AM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800">Subscription renewed</div>
                      <div className="text-[10px] text-slate-400">Yesterday, 4:12 PM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800">Provider connected</div>
                      <div className="text-[10px] text-slate-400">03 Sep, 11:08 AM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ──────── TAB 2: HEALTHCARE PROVIDERS ──────── */}
        {activeTab === 'providers' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Connected Healthcare Providers</h3>
                <p className="text-xs text-slate-500 font-medium">Pharmacy, Laboratory and Diagnostic partners connected to {clinic.name}</p>
              </div>
            </div>

            {providers.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-3">
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <HeartPulse size={28} />
                </div>
                <h4 className="text-base font-black text-slate-800">No healthcare providers connected</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  This clinic has not connected a pharmacy or laboratory yet. Providers will appear here as soon as they are configured.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {providers.map((prov) => (
                  <div key={prov._id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base shrink-0 border border-teal-100">
                          {prov.providerType?.toLowerCase().includes('pharmacy') ? <Pill size={22} className="text-blue-600" /> : <FlaskConical size={22} className="text-emerald-600" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{prov.providerType || 'Healthcare Provider'}</span>
                          <h4 className="font-bold text-slate-900 text-sm">{prov.name}</h4>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Connected Date:</span>
                        <span className="font-semibold text-slate-700">
                          {prov.connectedDate ? new Date(prov.connectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ownership:</span>
                        <span className="font-semibold text-slate-700">{prov.providerSubtype || 'Internal'}</span>
                      </div>
                      {prov.contactPerson && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Contact:</span>
                          <span className="font-semibold text-slate-700 truncate max-w-[150px]">{prov.contactPerson}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────── TAB 3: FEEDBACK ──────── */}
        {activeTab === 'feedback' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Patient Feedback & Ratings</h3>
                <p className="text-xs text-slate-500 font-medium">Submitted ratings and satisfaction scores</p>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {['all', 'positive', 'neutral', 'negative'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFeedbackFilter(f)}
                    className={`px-3 py-1 rounded-lg capitalize transition ${
                      feedbackFilter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {feedback.totalResponses > 0 ? (
              <>
                {/* Score Hero */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-center gap-8">
                  <div className="text-center sm:text-left sm:border-r border-slate-100 sm:pr-8">
                    <div className="text-4xl sm:text-5xl font-black text-slate-900">
                      {Number(feedback.overallRating || 0).toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          fill={star <= Math.round(feedback.overallRating || 0) ? 'currentColor' : 'none'}
                          className={star <= Math.round(feedback.overallRating || 0) ? 'text-amber-400' : 'text-slate-200'}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-slate-400 font-semibold mt-1">
                      Based on {feedback.totalResponses} verified reviews
                    </div>
                  </div>

                  <div className="flex-1 max-w-md w-full space-y-2 text-xs font-semibold text-slate-600">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = feedback.breakdown?.[star] || 0;
                      const pct = feedback.totalResponses > 0 ? Math.round((count / feedback.totalResponses) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="w-6 text-slate-500 font-bold">{star}★</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-slate-400 text-[11px]">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback List */}
                <div className="space-y-3">
                  {(feedback.recentFeedback || []).length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center text-slate-400 text-xs">
                      <Star size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-700">No public reviews matching this filter</p>
                    </div>
                  ) : (
                    (feedback.recentFeedback || [])
                      .filter((item) => {
                        if (feedbackFilter === 'positive') return item.rating >= 4;
                        if (feedbackFilter === 'neutral') return item.rating === 3;
                        if (feedbackFilter === 'negative') return item.rating <= 2;
                        return true;
                      })
                      .map((item, idx) => (
                        <div key={item._id || idx} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                                {(item.patientName || 'P')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{item.patientName || 'Patient'}</p>
                                <p className="text-[10px] text-slate-400">{fmtDate(item.date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={12}
                                  fill={s <= (item.rating || 0) ? 'currentColor' : 'none'}
                                  className={s <= (item.rating || 0) ? 'text-amber-400' : 'text-slate-200'}
                                />
                              ))}
                            </div>
                          </div>
                          {item.comment && <p className="text-xs text-slate-600 leading-relaxed">{item.comment}</p>}
                        </div>
                      ))
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                  <Heart size={24} />
                </div>
                <h4 className="text-base font-black text-slate-800">No feedback yet</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This clinic hasn't received any patient feedback or satisfaction ratings yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ──────── TAB 4: COMPLAINTS ──────── */}
        {activeTab === 'complaints' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Complaints & Support Tickets</h3>
                <p className="text-xs text-slate-500 font-medium">Reported issues from clinic operators and doctors</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {['all', 'open', 'in_progress', 'resolved'].map(f => (
                  <button
                    key={f}
                    onClick={() => setComplaintFilter(f)}
                    className={`px-3 py-1 rounded-lg capitalize transition ${
                      complaintFilter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle size={24} />
                </div>
                <h4 className="text-base font-black text-slate-800">No complaints</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  There are no active support tickets or complaints registered for this clinic.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3.5">Ticket ID</th>
                        <th className="px-4 py-3.5">Subject</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">Priority</th>
                        <th className="px-4 py-3.5">Submitted By</th>
                        <th className="px-4 py-3.5">Created</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredComplaints.map((c, i) => (
                        <tr key={c._id || i} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                            #{c.ticketId || `CMP-102${i}`}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-800">{c.subject}</td>
                          <td className="px-4 py-3.5 text-slate-600">{c.department || c.category || 'General'}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              c.priority === 'High' || c.priority === 'Critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {c.priority || 'Medium'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {c.firstName ? `${c.firstName} ${c.lastName || ''}` : 'Clinic Admin'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {c.status || 'Open'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right pr-6">
                            <button
                              onClick={() => setSelectedComplaint(c)}
                              className="text-xs font-bold text-[#00B96B] hover:underline"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────── TAB 5: SUBSCRIPTION ──────── */}
        {activeTab === 'subscription' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Current Subscription Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Plan Tier</span>
                <h3 className="text-2xl font-black text-slate-900">{planName} ClinicOS</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Full multi-tenant healthcare enterprise system with AI modules & unlimited patient charts.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-2">
                  <div>Status: <span className="text-emerald-600 font-bold">{clinic.subscription?.status || 'Active'}</span></div>
                  <div>&bull;</div>
                  <div>Cycle: <span className="capitalize">{clinic.subscription?.billingCycle || 'Monthly'}</span></div>
                  <div>&bull;</div>
                  <div>
                    Expires: {clinic.subscription?.expiryDate ? new Date(clinic.subscription.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setExtendMonths(1);
                    setShowExtendModal(true);
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs"
                >
                  Extend Subscription
                </button>
                <button
                  onClick={() => {
                    setNewPlanId(clinic.subscription?.planId?._id || clinic.subscription?.planId || '');
                    setNewPlanCycle(clinic.subscription?.billingCycle || 'monthly');
                    setShowPlanModal(true);
                  }}
                  className="px-4 py-2.5 bg-[#00B96B] hover:bg-[#00A25D] text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition"
                >
                  Change Plan
                </button>
              </div>
            </div>

            {/* Subscription History */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Subscription History</h4>
                  <p className="text-xs text-slate-400 font-medium">Invoices and renewal transactions</p>
                </div>
              </div>

              {subscriptionHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <CreditCard size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700">No subscription history available</p>
                  <p className="text-slate-400 mt-0.5">Historical billing cycles will appear here upon completion.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3.5">Invoice #</th>
                        <th className="px-4 py-3.5">Plan</th>
                        <th className="px-4 py-3.5">Cycle</th>
                        <th className="px-4 py-3.5">Amount</th>
                        <th className="px-4 py-3.5">Payment Date</th>
                        <th className="px-4 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subscriptionHistory.map((sub) => (
                        <tr key={sub._id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{sub.invoiceNumber}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-800">{sub.planName || sub.planId?.name || 'AI Enterprise'}</td>
                          <td className="px-4 py-3.5 capitalize text-slate-600">{sub.billingCycle}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">₹{sub.amountPaid?.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {new Date(sub.paymentDate || sub.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ──────── TAB 6.5: PAYMENTS HISTORY ──────── */}
        {activeTab === 'payments' && (() => {
          // Lazy-load payments when this tab is first opened
          if (!paymentsLoading && payments.length === 0 && !paymentsError) {
            setPaymentsLoading(true);
            setPaymentsError('');
            subscriptionPaymentApi.getClinicPaymentHistory(clinicId)
              .then(res => {
                setPayments(res?.payments || res?.data?.payments || res || []);
              })
              .catch(err => {
                setPaymentsError(err?.response?.data?.message || 'Failed to load payment history.');
              })
              .finally(() => setPaymentsLoading(false));
          }
          const fmtAmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
          const fmtDt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '--';
          const STATUS_META = {
            PENDING_VERIFICATION: { label: 'Pending', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
            VERIFIED: { label: 'Verified', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            REJECTED: { label: 'Rejected', bg: 'bg-red-50 text-red-700 border-red-200' },
            REPAYMENT_REQUIRED: { label: 'Repayment Required', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
            SUBMITTED: { label: 'Submitted', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
          };
          return (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Payment History</h3>
                  <p className="text-xs text-slate-500 font-medium">All subscription payment submissions for this clinic</p>
                </div>
                <button
                  onClick={() => {
                    setPayments([]);
                    setPaymentsError('');
                    setPaymentsLoading(true);
                    subscriptionPaymentApi.getClinicPaymentHistory(clinicId)
                      .then(res => setPayments(res?.payments || res?.data?.payments || res || []))
                      .catch(err => setPaymentsError(err?.response?.data?.message || 'Failed.'))
                      .finally(() => setPaymentsLoading(false));
                  }}
                  className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={paymentsLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {paymentsLoading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Loading payment history...</p>
                </div>
              ) : paymentsError ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <AlertTriangle size={28} className="text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">{paymentsError}</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <CreditCard size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No payment records found</p>
                  <p className="text-xs text-slate-400 mt-1">Payment submissions will appear here once the clinic submits their UTR</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  {/* Payments list */}
                  <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attempt</th>
                            <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                            <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">UTR / Ref</th>
                            <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submitted</th>
                            <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {payments.map((p, i) => {
                            const meta = STATUS_META[p.status] || STATUS_META.SUBMITTED;
                            const isSelected = selectedPayment?._id === p._id;
                            return (
                              <tr
                                key={p._id || i}
                                onClick={() => setSelectedPayment(isSelected ? null : p)}
                                className={`hover:bg-slate-50/50 transition cursor-pointer ${isSelected ? 'bg-emerald-50/50 ring-1 ring-inset ring-emerald-200' : ''}`}
                              >
                                <td className="px-4 py-3">
                                  <span className="text-xs font-bold text-slate-500">#{p.attemptNumber || (i + 1)}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <p className="text-xs font-medium text-slate-800">{p.planId?.name || p.planName || '--'}</p>
                                  <p className="text-[10px] text-slate-400 capitalize">{p.billingCycle || '--'}</p>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-xs font-bold text-emerald-600">{fmtAmt(p.amount)}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{p.utr || '--'}</span>
                                </td>
                                <td className="px-3 py-3 text-[10px] text-slate-500 whitespace-nowrap">{fmtDt(p.submittedAt || p.createdAt)}</td>
                                <td className="px-3 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.bg}`}>{meta.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detail panel */}
                  <div className="xl:col-span-1">
                    {selectedPayment ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 sticky top-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900">Payment Details</h4>
                          <button onClick={() => setSelectedPayment(null)} className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between"><span className="text-xs text-slate-500">Attempt</span><span className="text-xs font-bold text-slate-900">#{selectedPayment.attemptNumber || 1}</span></div>
                            <div className="flex justify-between"><span className="text-xs text-slate-500">Plan</span><span className="text-xs font-semibold">{selectedPayment.planId?.name || selectedPayment.planName || '--'}</span></div>
                            <div className="flex justify-between"><span className="text-xs text-slate-500">Cycle</span><span className="text-xs text-slate-700 capitalize">{selectedPayment.billingCycle || '--'}</span></div>
                            <div className="flex justify-between"><span className="text-xs text-slate-500">Amount</span><span className="text-xs font-bold text-emerald-600">{fmtAmt(selectedPayment.amount)}</span></div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between items-start gap-2"><span className="text-xs text-slate-500 shrink-0">UTR / Ref</span><span className="font-mono text-[10px] font-bold text-slate-800 text-right break-all">{selectedPayment.utr || '--'}</span></div>
                            <div className="flex justify-between items-start gap-2"><span className="text-xs text-slate-500 shrink-0">Txn ID</span><span className="font-mono text-[10px] text-slate-700 text-right break-all">{selectedPayment.transactionId || '--'}</span></div>
                            <div className="flex justify-between"><span className="text-xs text-slate-500">Submitted</span><span className="text-[10px] text-slate-700">{fmtDt(selectedPayment.submittedAt || selectedPayment.createdAt)}</span></div>
                            {selectedPayment.verifiedAt && <div className="flex justify-between"><span className="text-xs text-slate-500">Verified</span><span className="text-[10px] text-slate-700">{fmtDt(selectedPayment.verifiedAt)}</span></div>}
                            {selectedPayment.verifiedBy?.name && <div className="flex justify-between"><span className="text-xs text-slate-500">Verified By</span><span className="text-[10px] font-medium text-slate-700">{selectedPayment.verifiedBy.name}</span></div>}
                          </div>
                          {selectedPayment.rejectionReason && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-red-700 mb-1">Rejection Reason</p>
                              <p className="text-xs text-red-800">{selectedPayment.rejectionReason}</p>
                              {selectedPayment.rejectionNotes && <p className="text-[10px] text-red-600 mt-0.5">{selectedPayment.rejectionNotes}</p>}
                            </div>
                          )}
                          {selectedPayment.paymentProofUrl && (
                            <a href={selectedPayment.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 hover:bg-blue-100 transition">
                              <FileText size={12} /> View Payment Screenshot
                            </a>
                          )}
                        </div>
                        {selectedPayment.status === 'PENDING_VERIFICATION' && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={async () => {
                                setPaymentActionLoading(true);
                                try {
                                  await subscriptionPaymentApi.verifyPayment(selectedPayment._id);
                                  const updated = payments.map(p => p._id === selectedPayment._id ? { ...p, status: 'VERIFIED', verifiedAt: new Date().toISOString() } : p);
                                  setPayments(updated);
                                  setSelectedPayment(prev => prev?._id === selectedPayment._id ? { ...prev, status: 'VERIFIED' } : prev);
                                } catch (err) {
                                  alert(err?.response?.data?.message || 'Verification failed.');
                                } finally {
                                  setPaymentActionLoading(false);
                                }
                              }}
                              disabled={paymentActionLoading}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1 disabled:opacity-60"
                            >
                              <Check size={12} /> Verify
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt('Rejection reason:');
                                if (!reason) return;
                                setPaymentActionLoading(true);
                                try {
                                  await subscriptionPaymentApi.rejectPayment(selectedPayment._id, { reason });
                                  const updated = payments.map(p => p._id === selectedPayment._id ? { ...p, status: 'REJECTED', rejectionReason: reason } : p);
                                  setPayments(updated);
                                  setSelectedPayment(prev => prev?._id === selectedPayment._id ? { ...prev, status: 'REJECTED', rejectionReason: reason } : prev);
                                } catch (err) {
                                  alert(err?.response?.data?.message || 'Rejection failed.');
                                } finally {
                                  setPaymentActionLoading(false);
                                }
                              }}
                              disabled={paymentActionLoading}
                              className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition flex items-center justify-center gap-1 disabled:opacity-60"
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                        <Eye size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">Click a payment row to view details</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ──────── TAB 6: ACTIVITY / AUDIT ──────── */}
        {activeTab === 'activity' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-base font-black text-slate-900">Audit & Activity Log</h3>
              <p className="text-xs text-slate-500 font-medium">Complete administrative activity timeline for this clinic</p>
            </div>

            {activityLogs.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <Activity size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No activity logged yet</p>
                <p className="text-xs text-slate-400 mt-1">Platform actions for this clinic will appear here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
                {activityLogs.map((log) => (
                  <div key={log._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs">{log.action || 'System Event'}</span>
                        <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{log.entity || 'Clinic'} - {log.status || 'SUCCESS'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODALS ── */}

      {/* 1. Manage / Change Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Change Subscription Plan</h3>
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
      {showExtendModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Extend Subscription</h3>
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
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Reset Clinic Password</h3>
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

      {/* 4. Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">
                  #{selectedComplaint.ticketId || 'CMP-1024'}
                </span>
                <h3 className="text-base font-black text-slate-900">{selectedComplaint.subject}</h3>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-bold text-slate-800">{selectedComplaint.department || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Priority:</span>
                <span className="font-bold text-rose-600">{selectedComplaint.priority || 'High'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Submitted By:</span>
                <span className="font-bold text-slate-800">{selectedComplaint.firstName ? `${selectedComplaint.firstName} ${selectedComplaint.lastName || ''}` : 'Clinic Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contact Phone:</span>
                <span className="font-semibold text-slate-800">{selectedComplaint.phone || '—'}</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Message Description:</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed text-slate-700">
                  {selectedComplaint.message || 'No description provided.'}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Assign Free Tier Modal */}
      {showFreeTierModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-600" />
                  <h3 className="text-base font-black text-slate-900">Assign Free Tier Subscription</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Clinic: <span className="text-slate-800 font-bold">{clinic.name}</span>
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

      {/* 6. Reject Registration Modal */}
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

    </div>
  );
};

export default Clinic360Page;
