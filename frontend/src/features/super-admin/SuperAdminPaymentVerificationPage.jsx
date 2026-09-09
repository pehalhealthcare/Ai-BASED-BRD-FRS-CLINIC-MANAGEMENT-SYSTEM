import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Building2, Check, X, ShieldCheck, ShieldAlert,
  Clock, CreditCard, Copy, Eye, EyeOff, Calendar, AlertTriangle,
  CheckCircle2, XCircle, FileText, User, Mail, Phone, MapPin,
  ExternalLink, Download, ArrowUpRight, Sparkles, RefreshCw,
  Globe, Shield, ChevronRight, Lock, MessageSquare, HelpCircle,
  Package, DollarSign, Activity, FileCheck, Layers, Award,
  ZoomIn, ZoomOut, RotateCw, Maximize2
} from 'lucide-react';
import { subscriptionPaymentApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const AVATAR_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const getAvatarColor = (str = '') => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const REJECTION_REASONS = [
  'Payment amount does not match the selected plan',
  'UTR / Transaction Reference could not be verified in bank statement',
  'Payment not received / credited to company account',
  'Invalid or forged transaction details',
  'Payment proof receipt is unclear or illegible',
  'Duplicate transaction reference - UTR already submitted',
  'Transferred to incorrect bank account or UPI ID',
  'Other / Custom reason'
];

export default function SuperAdminPaymentVerificationPage() {
  const { id: routePaymentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState(null);
  const [otherAttempts, setOtherAttempts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Active tab: 'clinic', 'payment', 'subscription', 'documents', 'history', 'timeline', 'activity'
  const [activeTab, setActiveTab] = useState('clinic');

  // Reveal toggles for masked PII
  const [revealedPan, setRevealedPan] = useState(false);
  const [revealedAadhaar, setRevealedAadhaar] = useState(false);

  // Internal verification note for Super Admin
  const [internalNotes, setInternalNotes] = useState('');

  // Modals state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection modal form state
  const [selectedRejectReason, setSelectedRejectReason] = useState(REJECTION_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');

  // Proof full-size preview modal & zoom controls
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofZoom, setProofZoom] = useState(1);
  const [proofRotation, setProofRotation] = useState(0);

  // Copied feedback key
  const [copiedKey, setCopiedKey] = useState('');

  const getProofFileType = (url) => {
    if (!url || typeof url !== 'string') return 'none';
    if (url.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url)) return 'image';
    if (url.startsWith('data:application/pdf') || /\.pdf$/i.test(url) || url.includes('application/pdf')) return 'pdf';
    return 'other';
  };

  const handleOpenFileInNewTab = (dataUrl, filename = 'payment_proof.pdf') => {
    if (!dataUrl) return;
    if (dataUrl.startsWith('http')) {
      window.open(dataUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (dataUrl.startsWith('data:')) {
      try {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const newWin = window.open(blobUrl, '_blank');
        if (!newWin) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (e) {
        window.open(dataUrl, '_blank');
      }
    }
  };

  const handleDownloadFile = (dataUrl, baseFilename = 'payment_proof') => {
    if (!dataUrl) return;
    const fileType = getProofFileType(dataUrl);
    const ext = fileType === 'pdf' ? '.pdf' : '.png';
    const finalName = `${baseFilename}_${payment?.utr || 'receipt'}${ext}`;

    if (dataUrl.startsWith('data:')) {
      try {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        toast.success('Payment proof downloaded successfully');
        return;
      } catch (e) {
        console.warn('Blob download fallback:', e);
      }
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Payment proof downloaded successfully');
  };

  const loadPaymentData = async () => {
    setLoading(true);
    setError('');
    try {
      if (!routePaymentId) {
        setError('Payment attempt ID is required.');
        return;
      }
      const res = await subscriptionPaymentApi.getPaymentById(routePaymentId);
      const data = res.data || {};
      setPayment(data.payment || null);
      setOtherAttempts(data.otherAttempts || []);
      setAuditLogs(data.auditLogs || []);
      if (data.payment?.verificationNotes) {
        setInternalNotes(data.payment.verificationNotes);
      }
    } catch (err) {
      console.error('Failed to load payment details:', err);
      setError(err.response?.data?.message || 'Unable to load payment details. The payment or clinic record could not be found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, [routePaymentId]);

  const handleCopy = (text, key, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
    toast.success(`${label} copied to clipboard`);
  };

  // Verify Payment Action
  const handleConfirmVerify = async () => {
    if (!payment?._id) return;
    setActionLoading(true);
    try {
      await subscriptionPaymentApi.verifyPayment(payment._id, { notes: internalNotes });
      toast.success('Payment verified successfully! Removed from pending verification queue.');
      setShowVerifyModal(false);
      await loadPaymentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify payment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Payment Action
  const handleConfirmReject = async () => {
    if (!payment?._id) return;
    const finalReason = selectedRejectReason === 'Other / Custom reason'
      ? customRejectReason.trim()
      : selectedRejectReason;

    if (!finalReason) {
      toast.error('Please specify a rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      await subscriptionPaymentApi.rejectPayment(payment._id, {
        reason: finalReason,
        notes: internalNotes
      });
      toast.success('Payment rejected. Clinic placed in Repayment Required status.');
      setShowRejectModal(false);
      await loadPaymentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject payment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Clinic & Plan objects
  const clinic = payment?.clinicId || {};
  const plan = payment?.planId || clinic?.subscription?.planId || {};
  const clinicName = clinic.name || 'Clinic';
  const ownerDetails = clinic.ownerDetails || {};

  // Expected vs Submitted Amount
  const expectedAmount = useMemo(() => {
    if (payment?.billingCycle === 'yearly') {
      return plan.price?.yearly ?? plan.priceYearly ?? (plan.price?.monthly ? plan.price.monthly * 10 : 19990);
    }
    return plan.price?.monthly ?? plan.priceMonthly ?? plan.price ?? 1999;
  }, [plan, payment?.billingCycle]);

  const submittedAmount = payment?.amount ?? expectedAmount;
  const amountDifference = Math.abs(expectedAmount - submittedAmount);
  const isAmountMatch = amountDifference === 0;

  // Masking helpers
  const maskPan = (pan = '') => {
    if (!pan || pan.length < 4) return pan || 'Not provided';
    return revealedPan ? pan : `XXXXXX${pan.slice(-4)}`;
  };

  const maskAadhaar = (aadhaar = '') => {
    if (!aadhaar || aadhaar.length < 4) return aadhaar || 'Not provided';
    return revealedAadhaar ? aadhaar : `XXXX XXXX ${aadhaar.slice(-4)}`;
  };

  // Status variables
  const isPending = payment?.status === 'PENDING_VERIFICATION';
  const isVerified = payment?.status === 'VERIFIED';
  const isRejected = payment?.status === 'REJECTED' || payment?.status === 'REPAYMENT_REQUIRED';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600">Loading clinic verification workspace...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full text-center shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Unable to load payment details</h2>
            <p className="text-xs text-slate-500 mt-1">{error || 'The payment record could not be found.'}</p>
          </div>
          <Link
            to="/payments"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Payment Verifications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16 antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* ── TOP HEADER & BREADCRUMB ── */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/payments')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition cursor-pointer"
              title="Back to Payment Verifications"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Link to="/payments" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition">
                  Payment Verifications
                </Link>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-xs font-black text-slate-900">{clinicName}</span>
              </div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                Clinic Payment Verification
              </h1>
            </div>
          </div>

          {/* Right Status Badge & Refresh Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadPaymentData}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Refresh Payment Data"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {isPending ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs animate-pulse">
                <Clock size={13} /> Payment Pending Verification
              </span>
            ) : isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <CheckCircle2 size={13} /> Payment Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                <XCircle size={13} /> Payment Rejected
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ── WORKSPACE CONTAINER ── */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* 1. CLINIC SUMMARY CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Left: Avatar + Names + Metadata */}
            <div className="flex items-start sm:items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-sm"
                style={{ background: getAvatarColor(clinicName) }}
              >
                {clinic.image ? (
                  <img src={clinic.image} alt={clinicName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  getInitials(clinicName)
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{clinicName}</h2>
                  <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-700">
                    Code: {clinic.code || '--'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    <strong>Owner:</strong> {ownerDetails.name || '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-slate-400" />
                    {ownerDetails.email || '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-400" />
                    {ownerDetails.phone || clinic.phone || '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400" />
                    {clinic.address?.city || '—'}, {clinic.address?.state || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Registration Timestamps & Status */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium border-t lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto justify-between lg:justify-end">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration Date</span>
                <span className="font-bold text-slate-800">{fmtDate(clinic.createdAt)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Updated</span>
                <span className="font-bold text-slate-800">{fmtDate(clinic.updatedAt)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Clinic Approval</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase mt-0.5 ${
                  clinic.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {clinic.approvalStatus?.replace('_', ' ') || 'Pending'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* 2. QUICK SUMMARY METRIC CARDS (5 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Clinic Status</span>
            <span className="text-sm font-black text-slate-900 block mt-1 capitalize">
              {clinic.approvalStatus?.replace('_', ' ') || 'Payment Pending'}
            </span>
            <span className="text-[10px] font-medium text-slate-400 block mt-0.5">Registration status</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Selected Plan</span>
            <span className="text-sm font-black text-slate-900 block mt-1 truncate" title={plan.name}>
              {plan.name || 'AI Professional Clinic'}
            </span>
            <span className="text-[10px] font-medium text-slate-400 block mt-0.5 capitalize">{payment.billingCycle} cycle</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount</span>
            <span className="text-sm font-black text-emerald-600 block mt-1">
              {fmt(payment.amount)}
            </span>
            <span className="text-[10px] font-medium text-slate-400 block mt-0.5">INR (Inclusive of tax)</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Submitted</span>
            <span className="text-sm font-black text-slate-900 block mt-1">
              {payment.submittedAt ? new Date(payment.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
            </span>
            <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
              {payment.submittedAt ? new Date(payment.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Verification</span>
            <span className={`text-sm font-black block mt-1 ${
              isVerified ? 'text-emerald-600' : isRejected ? 'text-rose-600' : 'text-amber-600'
            }`}>
              {isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Pending'}
            </span>
            <span className="text-[10px] font-medium text-slate-400 block mt-0.5">Attempt #{payment.attemptNumber || 1}</span>
          </div>

        </div>

        {/* 3. TAB NAVIGATION */}
        <div className="border-b border-slate-200/80 flex flex-wrap gap-2 sm:gap-4 overflow-x-auto pb-px">
          {[
            { id: 'clinic', label: 'Clinic Details', icon: Building2 },
            { id: 'payment', label: 'Payment Details', icon: CreditCard },
            { id: 'subscription', label: 'Subscription', icon: Package },
            { id: 'documents', label: 'Documents', icon: FileCheck },
            { id: 'history', label: 'Payment History', icon: Clock, count: otherAttempts.length + 1 },
            { id: 'timeline', label: 'Timeline', icon: Layers },
            { id: 'activity', label: 'Activity Log', icon: Activity, count: auditLogs.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-black border-b-2 transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 bg-white/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4. MAIN LAYOUT: 75% TABS CONTENT + 25% STICKY VERIFICATION SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ==================== LEFT / CENTER: TABS (8 Cols / ~70-75%) ==================== */}
          <div className="lg:col-span-8 space-y-6">

            {/* TAB 1: CLINIC DETAILS */}
            {activeTab === 'clinic' && (
              <div className="space-y-6">
                
                {/* Owner Information Card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <User size={16} className="text-emerald-600" />
                      Owner / Administrator Information
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Read-only</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{ownerDetails.name || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Designation</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{ownerDetails.designation || 'Medical Director'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                      <span className="font-bold text-slate-900 block mt-0.5 truncate">{ownerDetails.email || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{ownerDetails.phone || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">PAN Number</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-slate-900">{maskPan(ownerDetails.pan)}</span>
                        {ownerDetails.pan && (
                          <button
                            type="button"
                            onClick={() => setRevealedPan(!revealedPan)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                            title={revealedPan ? 'Hide PAN' : 'Reveal PAN'}
                          >
                            {revealedPan ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Aadhaar Number</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-slate-900">{maskAadhaar(ownerDetails.aadhaar)}</span>
                        {ownerDetails.aadhaar && (
                          <button
                            type="button"
                            onClick={() => setRevealedAadhaar(!revealedAadhaar)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                            title={revealedAadhaar ? 'Hide Aadhaar' : 'Reveal Aadhaar'}
                          >
                            {revealedAadhaar ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{ownerDetails.gender || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {ownerDetails.dob ? new Date(ownerDetails.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Residential Address</span>
                      <span className="font-bold text-slate-900 block mt-0.5 truncate">{ownerDetails.address || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Clinic Information Card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Building2 size={16} className="text-emerald-600" />
                      Clinic Registration Parameters
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Clinic Name</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{clinic.name}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration / Reg Number</span>
                      <span className="font-bold text-slate-900 block mt-0.5 font-mono">{clinic.clinicDetails?.registrationNumber || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Established Year</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{clinic.clinicDetails?.establishedYear || '—'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Consultation Mode</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{clinic.clinicDetails?.consultationMode || 'Hybrid'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Languages Spoken</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {Array.isArray(clinic.clinicDetails?.languagesSpoken) ? clinic.clinicDetails.languagesSpoken.join(', ') : clinic.clinicDetails?.languagesSpoken || 'English, Hindi'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{clinic.phone || ownerDetails.phone || '—'}</span>
                    </div>

                    <div className="sm:col-span-2 md:col-span-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Address Line</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {[clinic.address?.line1, clinic.address?.line2, clinic.address?.city, clinic.address?.state, clinic.address?.pincode, clinic.address?.country].filter(Boolean).join(', ') || '—'}
                      </span>
                    </div>

                    {clinic.clinicDetails?.shortDescription && (
                      <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Description / Practice Notes</span>
                        <p className="text-slate-700 mt-1 leading-relaxed">{clinic.clinicDetails.shortDescription}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: PAYMENT DETAILS */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                
                {/* Main Payment Card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <CreditCard size={16} className="text-emerald-600" />
                      Payment Transaction Details
                    </h3>
                    <div className="flex items-center gap-2">
                      {(payment.paymentType === 'PLAN_UPGRADE' || payment.paymentType === 'UPGRADE') && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          PLAN UPGRADE
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                        Attempt #{payment.attemptNumber || 1}
                      </span>
                    </div>
                  </div>

                  {(payment.paymentType === 'PLAN_UPGRADE' || payment.paymentType === 'UPGRADE') && (
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">Subscription Plan Upgrade Request</span>
                        <p className="font-bold text-slate-800 mt-0.5">
                          Current: <span className="font-semibold text-slate-600">{payment.currentPlanId?.name || clinic.subscription?.planId?.name || 'Active Plan'}</span> ({payment.currentBillingCycle || clinic.subscription?.billingCycle || 'monthly'}) 
                          &nbsp;→&nbsp; 
                          Requested: <span className="font-black text-indigo-900">{payment.requestedPlanId?.name || plan.name}</span> ({payment.requestedBillingCycle || payment.billingCycle || 'monthly'})
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-xl font-bold text-xs shrink-0">
                        Verifying activates new plan
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Status</span>
                      <span className={`font-black block mt-0.5 ${
                        isVerified ? 'text-emerald-600' : isRejected ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {payment.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method</span>
                      <span className="font-bold text-slate-900 block mt-0.5">UPI / Bank Transfer (Direct)</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Currency</span>
                      <span className="font-bold text-slate-900 block mt-0.5">INR (₹)</span>
                    </div>

                    {/* UTR / Reference Number with Copy */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">UTR / Reference Number</span>
                          <span className="font-mono text-sm font-black text-slate-900 block mt-0.5">{payment.utr}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(payment.utr, 'utr', 'UTR')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'utr' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedKey === 'utr' ? 'Copied' : 'Copy UTR'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Transaction ID with Copy */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Transaction ID</span>
                          <span className="font-mono text-xs font-bold text-slate-900 block mt-0.5">{payment.transactionId || '—'}</span>
                        </div>
                        {payment.transactionId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(payment.transactionId, 'txnid', 'Transaction ID')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition"
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted At</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{fmtDate(payment.submittedAt || payment.createdAt)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Attempt ID</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700 truncate">{payment._id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(payment._id, 'payid', 'Payment ID')}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Settings Config Version</span>
                      <span className="font-bold text-slate-900 block mt-0.5">v{payment.paymentConfigurationVersion || 1} (Snapshot)</span>
                    </div>
                  </div>
                </div>

                {/* 9. PAYMENT AMOUNT COMPARISON CARD */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Payment Amount Comparison</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">Automated reconciliation against subscription pricing</p>
                    </div>

                    {isAmountMatch ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-black">
                        <CheckCircle2 size={13} /> Amount Matches
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-black">
                        <AlertTriangle size={13} /> Amount Mismatch
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Expected Amount</span>
                      <span className="text-xl font-black text-slate-900 block mt-1">{fmt(expectedAmount)}</span>
                      <span className="text-[10px] font-medium text-slate-400 block mt-0.5">{plan.name} ({payment.billingCycle})</span>
                    </div>

                    <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Submitted Amount</span>
                      <span className="text-xl font-black text-emerald-600 block mt-1">{fmt(submittedAmount)}</span>
                      <span className="text-[10px] font-medium text-emerald-600 block mt-0.5">Recorded via UTR</span>
                    </div>

                    <div className={`border rounded-2xl p-4 ${
                      isAmountMatch ? 'bg-slate-50 border-slate-200/80' : 'bg-rose-50 border-rose-200'
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Difference</span>
                      <span className={`text-xl font-black block mt-1 ${isAmountMatch ? 'text-slate-800' : 'text-rose-600'}`}>
                        {fmt(amountDifference)}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                        {isAmountMatch ? 'Zero discrepancy' : 'Discrepancy detected'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: SUBSCRIPTION DETAILS */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Package size={16} className="text-emerald-600" />
                      Subscription Plan &amp; Billing
                    </h3>
                    <span className="text-xs font-bold text-emerald-600 capitalize">
                      {payment.billingCycle} billing cycle
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Plan Name</span>
                      <span className="font-black text-slate-900 block mt-0.5">{plan.name || 'AI Professional Clinic'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Base Price</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{fmt(expectedAmount)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Discount</span>
                      <span className="font-bold text-slate-900 block mt-0.5">₹0.00</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Final Payable</span>
                      <span className="font-black text-emerald-600 block mt-0.5">{fmt(submittedAmount)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Subscription Status</span>
                      <span className="font-bold text-slate-800 block mt-0.5 capitalize">{clinic.subscription?.status || 'Pending Approval'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Start Date</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{fmtDate(clinic.subscription?.startDate)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Expiry Date</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{fmtDate(clinic.subscription?.expiryDate)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Renewal Date</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{fmtDate(clinic.subscription?.renewalDate)}</span>
                    </div>
                  </div>

                  {/* Included Plan Features */}
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-2.5">
                      <span className="text-xs font-bold text-slate-800 block">Included Modules &amp; Entitlements:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 font-medium">
                            <Check size={14} className="text-emerald-600 shrink-0" />
                            <span className="capitalize">{String(feat).replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DOCUMENTS */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <FileCheck size={16} className="text-emerald-600" />
                      Clinic Registration Documents &amp; Proofs
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Uploaded verification attachments</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Payment Receipt / Proof */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Payment Receipt / Proof</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          payment.paymentProofUrl
                            ? (getProofFileType(payment.paymentProofUrl) === 'pdf' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800')
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {payment.paymentProofUrl ? (getProofFileType(payment.paymentProofUrl) === 'pdf' ? 'PDF Uploaded' : 'Image Uploaded') : 'Not Uploaded'}
                        </span>
                      </div>

                      {payment.paymentProofUrl ? (
                        <div className="space-y-2.5">
                          {getProofFileType(payment.paymentProofUrl) === 'image' ? (
                            <img
                              src={payment.paymentProofUrl}
                              alt="Payment Proof"
                              className="w-full h-40 object-contain rounded-xl bg-white border border-slate-200 cursor-pointer hover:opacity-95 transition"
                              onClick={() => {
                                setProofZoom(1);
                                setProofRotation(0);
                                setShowProofModal(true);
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setProofZoom(1);
                                setProofRotation(0);
                                setShowProofModal(true);
                              }}
                              className="w-full h-40 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center text-slate-600 gap-1.5 cursor-pointer hover:bg-slate-50 transition"
                            >
                              <FileText size={36} className="text-rose-500" />
                              <span className="text-xs font-bold text-slate-800">PDF Document Uploaded</span>
                              <span className="text-[10px] text-slate-400 font-medium">Click to inspect / preview</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setProofZoom(1);
                                setProofRotation(0);
                                setShowProofModal(true);
                              }}
                              className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Eye size={13} />
                              <span>View Document</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenFileInNewTab(payment.paymentProofUrl, `payment_proof_${clinicName}`)}
                              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                              title="Open in new browser tab"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(payment.paymentProofUrl, `payment_proof_${clinicName}`)}
                              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                              title="Download document"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-6 text-center">
                          No payment receipt uploaded. The clinic completed submission using UTR / reference number.
                        </p>
                      )}
                    </div>

                    {/* Owner Identity Proof (Aadhaar/PAN) */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Owner Identity Verification</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Verified via OTP
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600 py-2">
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-400 font-medium">PAN</span>
                          <span className="font-mono font-bold text-slate-800">{maskPan(ownerDetails.pan)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-400 font-medium">Aadhaar</span>
                          <span className="font-mono font-bold text-slate-800">{maskAadhaar(ownerDetails.aadhaar)}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="text-slate-400 font-medium">Email Verified</span>
                          <span className="text-emerald-600 font-bold">✓ Verified</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PAYMENT HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Payment Attempts &amp; History</h3>
                      <p className="text-[11px] text-slate-400 font-medium">Chronological reconciliation records for this clinic</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      Total Attempts: {otherAttempts.length + 1}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                          <th className="text-left px-4 py-3">Attempt</th>
                          <th className="text-left px-3 py-3">Amount</th>
                          <th className="text-left px-3 py-3">UTR / Reference</th>
                          <th className="text-left px-3 py-3">Submitted At</th>
                          <th className="text-left px-3 py-3">Status</th>
                          <th className="text-right px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Current Payment */}
                        <tr className="bg-emerald-50/30">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            #{payment.attemptNumber || 1} <span className="text-[10px] text-emerald-600 font-extrabold">(Current)</span>
                          </td>
                          <td className="px-3 py-3 font-black text-emerald-600">{fmt(payment.amount)}</td>
                          <td className="px-3 py-3 font-mono font-bold text-slate-800">{payment.utr}</td>
                          <td className="px-3 py-3 text-slate-600">{fmtDate(payment.submittedAt || payment.createdAt)}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isVerified ? 'bg-emerald-100 text-emerald-800' : isRejected ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-400">Viewing</td>
                        </tr>

                        {/* Previous Attempts */}
                        {otherAttempts.map((att, idx) => (
                          <tr key={att._id || idx} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-bold text-slate-700">#{att.attemptNumber || 1}</td>
                            <td className="px-3 py-3 font-black text-slate-800">{fmt(att.amount)}</td>
                            <td className="px-3 py-3 font-mono text-slate-700">{att.utr}</td>
                            <td className="px-3 py-3 text-slate-500">{fmtDate(att.submittedAt || att.createdAt)}</td>
                            <td className="px-3 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                att.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : att.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {att.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                to={`/super-admin/payments/${att._id}`}
                                className="text-emerald-600 hover:text-emerald-700 font-bold"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900">Registration &amp; Payment Lifecycle</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Progress milestones for clinic onboarding</p>
                  </div>

                  <div className="space-y-6 relative pl-6 border-l-2 border-slate-100 ml-3">
                    {[
                      { title: 'Registration Started', desc: 'Owner and contact details initiated', done: true, date: clinic.createdAt },
                      { title: 'Clinic Details Submitted', desc: `Configured practice name "${clinic.name}" and address`, done: true, date: clinic.createdAt },
                      { title: 'Subscription Plan Selected', desc: `Selected ${plan.name} (${payment.billingCycle})`, done: true, date: clinic.createdAt },
                      { title: 'Email OTP Verified', desc: `Email ${ownerDetails.email} authenticated via OTP`, done: true, date: clinic.createdAt },
                      { title: 'Payment Submitted', desc: `UTR ${payment.utr} submitted for ₹${payment.amount}`, done: true, date: payment.submittedAt || payment.createdAt },
                      {
                        title: 'Payment Verification',
                        desc: isVerified ? 'Super Admin confirmed bank reconciliation' : isRejected ? 'Payment rejected by Super Admin' : 'Awaiting Super Admin bank reconciliation',
                        done: isVerified,
                        current: isPending,
                        rejected: isRejected,
                        date: payment.verifiedAt || payment.rejectedAt
                      },
                      { title: 'Clinic Approval', desc: clinic.approvalStatus === 'approved' ? 'Clinic activated by Super Admin' : 'Pending payment clearance', done: clinic.approvalStatus === 'approved' },
                      { title: 'Clinic Onboarding', desc: clinic.isOnboardingCompleted ? 'Staff, doctors, and departments configured' : 'Pending completion by clinic admin', done: clinic.isOnboardingCompleted }
                    ].map((step, idx) => (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step.done
                            ? 'bg-emerald-600 text-white'
                            : step.rejected
                            ? 'bg-rose-600 text-white'
                            : step.current
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                            : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}>
                          {step.done ? <Check size={12} strokeWidth={3} /> : step.rejected ? <X size={12} /> : idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-black ${
                              step.done ? 'text-slate-900' : step.rejected ? 'text-rose-600' : step.current ? 'text-amber-700' : 'text-slate-400'
                            }`}>
                              {step.title}
                            </h4>
                            {step.date && (
                              <span className="text-[10px] text-slate-400 font-medium">{fmtDate(step.date)}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: ACTIVITY LOG */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Activity size={16} className="text-emerald-600" />
                        Audit &amp; Activity Log
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">Immutable system records of actions taken</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {auditLogs.length} events logged
                    </span>
                  </div>

                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8 italic">No audit records found.</p>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div key={log._id} className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[11px] text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {log.action}
                              </span>
                              <span className="text-[10px] text-slate-400">by {log.actorUserId?.name || 'System / Super Admin'}</span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              {log.metadata?.details || log.metadata?.summary || log.entity || 'Action recorded'}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">{fmtDate(log.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ==================== RIGHT VERIFICATION SIDEBAR (4 Cols / ~25-30%) ==================== */}
          <div className="lg:col-span-4 space-y-6">

            {/* Payment Proof Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Payment Proof</h3>
                  {payment.paymentProofUrl && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      getProofFileType(payment.paymentProofUrl) === 'pdf'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {getProofFileType(payment.paymentProofUrl) === 'pdf' ? 'PDF' : 'IMAGE'}
                    </span>
                  )}
                </div>
                {payment.paymentProofUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setProofZoom(1);
                      setProofRotation(0);
                      setShowProofModal(true);
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View</span>
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </div>

              {payment.paymentProofUrl ? (
                <div className="space-y-3">
                  <div
                    onClick={() => {
                      setProofZoom(1);
                      setProofRotation(0);
                      setShowProofModal(true);
                    }}
                    className="cursor-pointer group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center h-48"
                  >
                    {getProofFileType(payment.paymentProofUrl) === 'image' ? (
                      <img
                        src={payment.paymentProofUrl}
                        alt="Payment Receipt"
                        className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                          <FileText size={32} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">PDF Receipt Uploaded</span>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Click to inspect / preview</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                      <Eye size={16} /> Click to open document
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-1">
                  <FileText size={24} className="mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-semibold text-slate-600">No Receipt Uploaded</p>
                  <p className="text-[10px]">Payment was submitted with UTR reference.</p>
                </div>
              )}
            </div>

            {/* Verification Actions Box (Sticky) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-5 sticky top-20">
              
              <div className="border-b border-slate-100 pb-3 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Verification Action</span>
                <h3 className="text-sm font-black text-slate-900">Review &amp; Decision</h3>
              </div>

              {/* Status Header */}
              {isPending ? (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-amber-800 font-black text-xs">
                    <Clock size={14} className="animate-spin" />
                    <span>Payment Pending Verification</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-snug">
                    Confirm that UTR <strong>{payment.utr}</strong> for <strong>{fmt(payment.amount)}</strong> is verified in your bank account before approving.
                  </p>
                </div>
              ) : isVerified ? (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-xs">
                    <CheckCircle2 size={15} />
                    <span>Payment Verified</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-snug">
                    Verified on {fmtDate(payment.verifiedAt)} by {payment.verifiedBy?.name || 'Super Admin'}.
                  </p>
                  {payment.verificationNotes && (
                    <div className="text-[11px] bg-white/80 p-2 rounded-xl border border-emerald-100 text-emerald-900">
                      <strong>Notes:</strong> {payment.verificationNotes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-800 font-black text-xs">
                    <XCircle size={15} />
                    <span>Payment Rejected</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-snug">
                    Rejected on {fmtDate(payment.rejectedAt)} by {payment.rejectedBy?.name || 'Super Admin'}.
                  </p>
                  {payment.rejectionReason && (
                    <div className="text-[11px] bg-white/80 p-2 rounded-xl border border-rose-100 text-rose-900">
                      <strong>Reason:</strong> {payment.rejectionReason}
                    </div>
                  )}
                </div>
              )}

              {/* Internal Super Admin Notes Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    Internal Verification Notes
                  </label>
                  <span className="text-[10px] text-emerald-600 font-bold">Only visible to Super Admin</span>
                </div>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add internal verification notes, reconciliation reference, or notes..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-500 transition outline-hidden"
                />
              </div>

              {/* Primary Action Buttons */}
              {isPending && (
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(true)}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    <span>Verify Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="w-full py-3 px-4 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle size={16} />
                    <span>Reject Payment</span>
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* ── MODAL 1: VERIFY CONFIRMATION MODAL ── */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Verify Payment?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm subscription payment and activate clinic.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Clinic</span>
                <span className="font-black text-slate-900">{clinicName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Plan</span>
                <span className="font-bold text-slate-800">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Expected</span>
                <span className="font-bold text-slate-900">{fmt(expectedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Submitted</span>
                <span className="font-black text-emerald-600">{fmt(submittedAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium">UTR / Reference</span>
                <span className="font-mono font-black text-slate-900">{payment.utr}</span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              By confirming, this payment attempt will be marked <strong>VERIFIED</strong> and the clinic registration will be activated.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVerify}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check size={14} />}
                <span>{actionLoading ? 'Verifying...' : 'Confirm Verification'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 2: REJECT PAYMENT MODAL ── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reject Payment Submission</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clinic will be placed in Repayment Required status.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 block">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {REJECTION_REASONS.map((r, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedRejectReason === r
                        ? 'bg-rose-50/70 border-rose-300 text-rose-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={r}
                      checked={selectedRejectReason === r}
                      onChange={() => setSelectedRejectReason(r)}
                      className="accent-rose-600"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              {selectedRejectReason === 'Other / Custom reason' && (
                <textarea
                  rows={2}
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="Enter specific rejection reason for the clinic..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-500 transition outline-hidden"
                />
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X size={14} />}
                <span>{actionLoading ? 'Rejecting...' : 'Reject Payment'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 3: FULL-SIZE PROOF PREVIEW ── */}
      {showProofModal && payment?.paymentProofUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5" onClick={() => setShowProofModal(false)}>
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  getProofFileType(payment.paymentProofUrl) === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 truncate">Payment Proof Document</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      getProofFileType(payment.paymentProofUrl) === 'pdf' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {getProofFileType(payment.paymentProofUrl) === 'pdf' ? 'PDF' : 'IMAGE'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono block">
                    UTR: {payment.utr} • Clinic: {clinicName}
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {getProofFileType(payment.paymentProofUrl) === 'image' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setProofZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut size={15} />
                    </button>
                    <span className="text-[11px] font-mono font-bold text-slate-500 w-10 text-center">
                      {Math.round(proofZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setProofZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofRotation(r => (r + 90) % 360)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title="Rotate"
                    >
                      <RotateCw size={15} />
                    </button>
                    <div className="h-5 w-px bg-slate-200 mx-1" />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenFileInNewTab(payment.paymentProofUrl, `payment_proof_${payment.utr}`)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Open in new tab"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Open in Tab</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFile(payment.paymentProofUrl, `payment_proof_${clinicName}`)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Download Document"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProofModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Content View */}
            <div className="flex-1 overflow-auto py-4 flex items-center justify-center bg-slate-100/70 rounded-2xl border border-slate-200/80 my-2 min-h-[450px]">
              {getProofFileType(payment.paymentProofUrl) === 'image' ? (
                <div className="overflow-auto max-h-[70vh] flex items-center justify-center p-2">
                  <img
                    src={payment.paymentProofUrl}
                    alt="Receipt Full"
                    style={{
                      transform: `scale(${proofZoom}) rotate(${proofRotation}deg)`,
                      transition: 'transform 0.2s ease-in-out'
                    }}
                    className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md select-none"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <object
                    data={payment.paymentProofUrl}
                    type="application/pdf"
                    className="w-full h-[70vh] rounded-xl border-none"
                  >
                    <div className="p-8 text-center space-y-4">
                      <FileText size={48} className="text-rose-500 mx-auto" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">PDF Document Ready</h4>
                        <p className="text-xs text-slate-500 mt-1">If your browser cannot preview the PDF inline, click below to open or download.</p>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenFileInNewTab(payment.paymentProofUrl)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <ExternalLink size={14} /> Open in Browser
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(payment.paymentProofUrl)}
                          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <Download size={14} /> Download PDF
                        </button>
                      </div>
                    </div>
                  </object>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Please verify that the UTR and amount match bank records before completing verification.
              </span>
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
