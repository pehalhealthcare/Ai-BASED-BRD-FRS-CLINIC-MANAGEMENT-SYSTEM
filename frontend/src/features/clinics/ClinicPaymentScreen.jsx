import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Building2, CreditCard, ShieldCheck, Check, Copy, Upload, Trash2,
  Clock, ArrowLeft, Sparkles, CheckCircle2, AlertTriangle, Eye, EyeOff,
  HelpCircle, Mail, Phone, ExternalLink, ArrowRight, CheckCircle, RefreshCw,
  FileText, Lock, X, PhoneCall, UploadCloud, ChevronRight, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import PehalLogo from '../../components/common/PehalLogo';
import { paymentSettingsApi, subscriptionPaymentApi, clinicApi } from '../../lib/api';

const SETUP_STEPS = [
  { id: 1, name: 'Owner Details', status: 'Completed' },
  { id: 2, name: 'Clinic Details', status: 'Completed' },
  { id: 3, name: 'Plan Selection', status: 'Completed' },
  { id: 4, name: 'Review & Submit', status: 'Completed' },
  { id: 5, name: 'Payment', status: 'In progress' },
  { id: 6, name: 'Approval', status: 'Pending' },
  { id: 7, name: 'Onboarding', status: 'Pending' }
];

export default function ClinicPaymentScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();

  // Clinic & Plan data from navigation state or logged in user
  const passedClinic = location.state?.clinic || user?.clinic || {};
  const passedPlan = location.state?.plan || null;
  const passedBillingCycle = location.state?.billingCycle || passedClinic?.subscription?.billingCycle || 'monthly';

  const clinicId = passedClinic?._id || user?.clinicId || user?.clinic?._id;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Payment configuration from server
  const [initData, setInitData] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(passedPlan);
  const [billingCycle, setBillingCycle] = useState(passedBillingCycle);

  // Form submission state
  const [utr, setUtr] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofBase64, setProofBase64] = useState('');
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // History & Proof viewing state
  const [showHistory, setShowHistory] = useState(false);
  const [viewingProof, setViewingProof] = useState(null);

  // Copy states
  const [copiedKey, setCopiedKey] = useState('');

  const fileInputRef = useRef(null);
  const newPaymentFormRef = useRef(null);

  // Load server-authoritative payment initiation data
  const loadPaymentInitiation = async () => {
    setLoading(true);
    setError('');
    try {
      // If user already has a pending or verified payment, redirect to status
      try {
        const setupRes = await clinicApi.getSetupStatus();
        if (setupRes?.data) {
          const { paymentStatus, approvalStatus } = setupRes.data;
          if (paymentStatus === 'PENDING_VERIFICATION') {
            navigate('/clinic-setup/payment-status', { replace: true });
            return;
          }
          if (approvalStatus === 'approved' && setupRes.data.clinic?.isOnboardingCompleted) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }
      } catch (e) {
        // Continue loading if check fails
      }

      const planId = passedPlan?._id || passedClinic?.subscription?.planId?._id || passedClinic?.subscription?.planId;

      if (clinicId && planId) {
        const res = await subscriptionPaymentApi.initiatePayment({
          clinicId,
          planId: typeof planId === 'object' ? planId._id : planId,
          billingCycle
        });
        const data = res.data || {};
        setInitData(data);
        setPaymentDetails(data.paymentDetails || {});
        if (data.plan) {
          setSelectedPlan(data.plan);
        }
      } else {
        const res = await paymentSettingsApi.getActiveDetails();
        setPaymentDetails(res.data?.paymentDetails || {});
      }
    } catch (err) {
      console.error('Failed to initiate payment:', err);
      try {
        const res = await paymentSettingsApi.getActiveDetails();
        setPaymentDetails(res.data?.paymentDetails || {});
      } catch (e) {
        setError('Unable to load payment configuration. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentInitiation();
  }, [clinicId, billingCycle]);

  // Copy helper
  const handleCopy = (text, key, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
    toast.success(`${label} copied to clipboard`);
  };

  // Proof upload handler
  const processUploadedFile = (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Payment receipt file size must be less than 5 MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Supported formats: JPG, JPEG, PNG, WEBP, PDF.');
      return;
    }

    setProofFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setProofBase64(reader.result);
      setProofPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    processUploadedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processUploadedFile(file);
  };

  const handleRemoveProof = () => {
    setProofFile(null);
    setProofPreview('');
    setProofBase64('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit payment attempt
  const handleSubmitPayment = async (e) => {
    e?.preventDefault();

    const cleanUtr = utr.trim().toUpperCase();
    if (!cleanUtr) {
      toast.error('Please enter the UTR / Transaction Reference Number.');
      return;
    }

    if (cleanUtr.length < 6) {
      toast.error('UTR / Reference Number must be at least 6 alphanumeric characters.');
      return;
    }

    setSubmitting(true);
    try {
      const planId = selectedPlan?._id || passedPlan?._id || passedClinic?.subscription?.planId;

      await subscriptionPaymentApi.submitPayment({
        clinicId,
        planId: typeof planId === 'object' ? planId._id : planId,
        billingCycle,
        utr: cleanUtr,
        transactionId: transactionId.trim(),
        paymentProofUrl: proofBase64
      });

      toast.success('✓ Payment details submitted! Super Admin verification in progress.');
      await refreshUser(true);

      navigate('/clinic-setup/payment-status', {
        state: {
          submitted: true,
          utr: cleanUtr,
          plan: selectedPlan,
          amount: selectedPlan?.amount || initData?.plan?.amount || 1999
        }
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit payment details. Please check the UTR and retry.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatINR = (amt) => {
    const num = Number(amt || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(num);
  };

  // Calculated values
  const latestPayment = initData?.latestPayment || null;
  const paymentHistory = initData?.paymentHistory || [];
  const isRejected = latestPayment?.status === 'REJECTED' || passedClinic?.paymentStatus === 'REJECTED';

  const planName = selectedPlan?.name || initData?.plan?.name || 'AI Professional Clinic';
  const rawAmount = selectedPlan?.amount ?? initData?.plan?.amount ?? (billingCycle === 'yearly' ? 19990 : 1999);
  const formattedAmount = formatINR(rawAmount);

  const bankName = paymentDetails?.bankName || 'Kotak Mahindra Bank';
  const accountName = paymentDetails?.accountName || 'PehalHealthcare Technologies Private Limited';
  const accountNumber = paymentDetails?.accountNumber || '8512060314';
  const ifscCode = paymentDetails?.ifscCode || 'KKBK0000181';
  const branch = paymentDetails?.branch || 'Sector-18, Noida';
  const upiId = paymentDetails?.upiId || '8130916134@kotak';

  const supportEmail = paymentDetails?.supportEmail || 'support@pehalhealthcare.com';
  const supportPhone = paymentDetails?.supportPhone || '+91 98765 43210';

  // Dynamic QR: server-generated Data URI or dynamic payload
  const qrImageSrc = paymentDetails?.dynamicQr || paymentDetails?.qrCodeUrl || '';

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const scrollToNewPayment = () => {
    newPaymentFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* ── TOP HEADER (Existing AICMS Setup Header) ── */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Subtitle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PehalLogo variant="primary" height={32} />
            <div className="h-6 w-[1px] bg-slate-200 mx-1" />
            <div>
              <span className="text-xs font-black text-slate-900 block leading-tight tracking-tight">AICMS</span>
              <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase mt-0.5">AI CLINIC MANAGEMENT SYSTEM</span>
            </div>
          </div>

          {/* Stepper Navigation (1 to 7) */}
          <div className="hidden xl:flex items-center gap-2">
            {SETUP_STEPS.map((s, idx) => {
              const isCompleted = s.id < 5;
              const isCurrent = s.id === 5;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm'
                          : 'bg-slate-100 border border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check size={12} strokeWidth={3} /> : s.id}
                    </div>
                    <span
                      className={`block text-[9px] font-bold leading-none mt-1.5 ${
                        isCurrent
                          ? 'text-emerald-600 font-black'
                          : isCompleted
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.name}
                    </span>
                  </div>
                  {idx < SETUP_STEPS.length - 1 && (
                    <div
                      className={`w-5 sm:w-7 h-[1.5px] mx-1.5 mb-3.5 rounded-full ${
                        s.id < 5 ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`mailto:${supportEmail}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold transition shadow-2xs bg-white"
            >
              <HelpCircle size={13} className="text-slate-500" /> Help
            </a>
            <a
              href={`tel:${supportPhone}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold transition shadow-2xs bg-white"
            >
              <PhoneCall size={13} className="text-slate-500" /> Contact Sales
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50/80 border border-red-200/80 hover:bg-red-100 text-red-600 rounded-full text-xs font-bold transition shadow-2xs"
            >
              <X size={13} /> Exit Setup
            </Link>
          </div>
        </div>
      </header>

      {/* ── 3-COLUMN WORKSPACE ── */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ==================== LEFT SIDEBAR ==================== */}
          <div className="lg:col-span-3 space-y-5">
            
            {/* Clinic Setup Steps Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="mb-5">
                <h3 className="text-base font-black text-slate-900 leading-tight">Clinic Setup</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Complete all steps to launch your clinic on AICMS</p>
              </div>

              <div className="space-y-4 relative pl-1">
                <div className="absolute top-3 bottom-3 left-[15px] w-[2px] bg-slate-100" />
                
                {SETUP_STEPS.map((s) => {
                  const isCompleted = s.id < 5;
                  const isCurrent = s.id === 5;
                  return (
                    <div key={s.id} className="flex items-start gap-3 relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : isCurrent
                            ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-600 ring-2 ring-emerald-100 font-black'
                            : 'bg-white border border-slate-200 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <Check size={13} strokeWidth={3} /> : s.id}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h4
                          className={`text-xs leading-tight ${
                            isCurrent
                              ? 'font-black text-emerald-700'
                              : isCompleted
                              ? 'font-bold text-slate-800'
                              : 'font-semibold text-slate-400'
                          }`}
                        >
                          {s.name}
                        </h4>
                        <span
                          className={`text-[10px] block mt-0.5 font-medium ${
                            isCurrent
                              ? 'text-emerald-600 font-bold'
                              : isCompleted
                              ? 'text-slate-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Need Help? Contact Card (Left Bottom) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <HeadsetCustomIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Need Help?</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Our team is here to help you with payment or setup.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
                >
                  <Mail size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{supportEmail}</span>
                </a>
                <a
                  href={`tel:${supportPhone}`}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
                >
                  <Phone size={13} className="text-emerald-600 shrink-0" />
                  <span>{supportPhone}</span>
                </a>
              </div>

              <a
                href={`mailto:${supportEmail}?subject=AICMS%20Payment%20Assistance%20-${clinicId || ''}`}
                className="w-full inline-flex items-center justify-center py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs"
              >
                Contact Support
              </a>
            </div>

          </div>

          {/* ==================== CENTER MAIN CONTENT ==================== */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Complete Your Payment</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {isRejected
                  ? 'Your previous subscription payment could not be verified. Please review the rejection details below and submit a new payment attempt.'
                  : 'Your clinic setup is almost complete. Make the subscription payment to submit your registration for approval.'}
              </p>
            </div>

            {/* 1. STATE BANNER: REJECTED vs EMAIL VERIFIED */}
            {isRejected ? (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl sm:rounded-3xl p-5 shadow-xs space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <X size={20} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-rose-950">Payment Not Verified</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 uppercase tracking-wide">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 leading-relaxed font-medium">
                      Your payment could not be verified by our team. Please review the details below and submit a new payment.
                    </p>
                  </div>
                </div>

                {/* Prominent Reason Callout */}
                <div className="bg-white/80 border border-rose-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">Super Admin Rejection Reason</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    {latestPayment?.rejectionReason || passedClinic?.rejectionReason || 'Payment amount does not match the selected plan.'}
                  </p>
                  {latestPayment?.rejectionNotes && (
                    <p className="text-[11px] text-slate-600 mt-1 font-medium">{latestPayment.rejectionNotes}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Email Verified</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    Your email has been successfully verified. Please complete the payment to continue.
                  </p>
                </div>
              </div>
            )}

            {/* 2. REJECTED PAYMENT ATTEMPT DETAILS CARD */}
            {isRejected && latestPayment && (
              <div className="bg-white border border-rose-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-sm font-black text-slate-900">
                      Rejected Payment Attempt (Attempt #{latestPayment.attemptNumber || 1})
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <X size={12} className="text-rose-600" />
                    Rejected
                  </span>
                </div>

                {/* Key-Value Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan</span>
                    <span className="font-bold text-slate-900 block">{latestPayment.planId?.name || planName}</span>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Method</span>
                    <span className="font-bold text-slate-900 block">{latestPayment.paymentMethod || 'UPI / Bank Transfer'}</span>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Amount</span>
                    <span className="font-bold text-slate-900 block">{formattedAmount}</span>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount Submitted</span>
                    <span className="font-bold text-rose-700 block">{formatINR(latestPayment.amount)}</span>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UTR / Reference Number</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-slate-900 truncate">{latestPayment.utr}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(latestPayment.utr, 'rejUtr', 'UTR')}
                        className="text-slate-400 hover:text-slate-700"
                        title="Copy UTR"
                      >
                        {copiedKey === 'rejUtr' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transaction ID</span>
                    <span className="font-mono font-bold text-slate-900 truncate block">{latestPayment.transactionId || '—'}</span>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted On</span>
                    <span className="font-semibold text-slate-800 block">{formatDateTime(latestPayment.submittedAt || latestPayment.createdAt)}</span>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rejected On</span>
                    <span className="font-semibold text-rose-800 block">{formatDateTime(latestPayment.rejectedAt)}</span>
                  </div>
                </div>

                {/* Proof & Notes */}
                {latestPayment.paymentProofUrl && (
                  <div className="pt-1 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-700">Submitted Payment Proof</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingProof(latestPayment.paymentProofUrl)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1.5"
                    >
                      <Eye size={13} />
                      <span>View Proof</span>
                    </button>
                  </div>
                )}

                {/* Make Payment Again CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={scrollToNewPayment}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Make Payment Again (Attempt #{((latestPayment.attemptNumber || 1) + 1)})</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* 3. ACTIVE PAYMENT METHODS & NEW PAYMENT ATTEMPT */}
            <div ref={newPaymentFormRef} id="newPaymentSection" className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isRejected ? `New Payment Attempt (#${((latestPayment?.attemptNumber || 0) + 1)})` : 'Select Payment Method'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Transfer the exact amount of <span className="font-bold text-emerald-700">{formattedAmount}</span> to activate your clinic.
                  </p>
                </div>
                {isRejected && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    Attempt #{((latestPayment?.attemptNumber || 0) + 1)}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Loading payment details...</p>
                </div>
              ) : error ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">Payment Currently Unavailable</h4>
                  <p className="text-xs text-slate-600">{error}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative items-stretch">
                    
                    {/* 1. LEFT CARD: SCAN & PAY (UPI) */}
                    <div className="flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          Scan & Pay (UPI)
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Scan this QR code using any UPI app. The amount will be filled automatically.
                        </p>
                      </div>

                      {/* QR Card Container */}
                      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-2xs">
                        <div className="relative bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs mb-3">
                          {qrImageSrc ? (
                            <img
                              src={qrImageSrc}
                              alt="UPI Payment QR Code"
                              className="w-44 h-44 object-contain rounded-md"
                            />
                          ) : (
                            <div className="w-44 h-44 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                              QR Code Unavailable
                            </div>
                          )}

                          {/* Center UPI Badge Overlay if applicable */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white px-2 py-0.5 rounded shadow-md border border-slate-100 flex items-center gap-1">
                              <span className="text-[9px] font-black tracking-widest text-emerald-800">UPI</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Plan Note Under QR */}
                        <div className="space-y-0.5">
                          <span className="text-lg font-black text-slate-900 block tracking-tight">
                            {formattedAmount}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 block capitalize">
                            {planName} - {billingCycle}
                          </span>
                          <span className="text-[10px] font-medium text-blue-600 block pt-1">
                            • This QR code is valid for this payment only.
                          </span>
                        </div>
                      </div>

                      {/* UPI ID Field with Copy Button */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700">UPI ID</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={upiId}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopy(upiId, 'upi', 'UPI ID')}
                            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            {copiedKey === 'upi' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            <span>{copiedKey === 'upi' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Supported UPI Apps */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supported UPI Apps</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">GPay</span>
                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">PhonePe</span>
                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">Paytm</span>
                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">BHIM</span>
                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500">Any UPI App</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle OR Divider */}
                    <div className="hidden md:flex flex-col items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      <div className="w-7 h-7 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-400 flex items-center justify-center shadow-xs">
                        OR
                      </div>
                    </div>

                    {/* 2. RIGHT CARD: PAY VIA BANK TRANSFER */}
                    <div className="flex flex-col justify-between space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Pay via Bank Transfer</h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          You can also transfer the exact amount to our bank account.
                        </p>
                      </div>

                      {/* Bank Details Key-Value List */}
                      <div className="space-y-2.5">
                        
                        {/* Account Name */}
                        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Account Name</span>
                            <span className="text-xs font-black text-slate-800 block">{accountName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(accountName, 'accName', 'Account Name')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                            title="Copy Account Name"
                          >
                            {copiedKey === 'accName' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>

                        {/* Bank Name */}
                        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Bank Name</span>
                            <span className="text-xs font-black text-slate-800 block">{bankName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(bankName, 'bankName', 'Bank Name')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                            title="Copy Bank Name"
                          >
                            {copiedKey === 'bankName' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>

                        {/* Account Number */}
                        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Account Number</span>
                            <span className="text-xs font-black text-slate-800 block font-mono">
                              {showAccountNumber ? accountNumber : accountNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(accountNumber, 'accNo', 'Account Number')}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                              title="Copy Account Number"
                            >
                              {copiedKey === 'accNo' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* IFSC Code */}
                        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">IFSC Code</span>
                            <span className="text-xs font-black text-slate-800 block font-mono">{ifscCode}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(ifscCode, 'ifsc', 'IFSC Code')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                            title="Copy IFSC Code"
                          >
                            {copiedKey === 'ifsc' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>

                        {/* Branch */}
                        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Branch</span>
                            <span className="text-xs font-black text-slate-800 block">{branch}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(branch, 'branch', 'Branch')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                            title="Copy Branch"
                          >
                            {copiedKey === 'branch' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>

                      </div>

                      {/* Important Instructions Box */}
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
                          <HelpCircle size={13} />
                          <span>Important</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
                          <li>Transfer the exact amount as mentioned.</li>
                          <li>Use UTR / Reference Number for payment confirmation.</li>
                          <li>Payments are manually verified by our team.</li>
                          <li>You will be notified once the payment is verified.</li>
                        </ul>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </div>

            {/* 4. TRANSACTION DETAILS & UPLOAD FORM */}
            <form onSubmit={handleSubmitPayment} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
              
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {isRejected ? 'Submit New Payment Details' : 'Payment Completed? Enter your transaction details'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  After completing the new payment, enter the fresh transaction reference and upload proof below.
                </p>
              </div>

              {/* Form Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* UTR / Reference Number */}
                <div className="space-y-1">
                  <label htmlFor="utrInput" className="block text-xs font-bold text-slate-800">
                    UTR / Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="utrInput"
                    type="text"
                    required
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="Enter new UTR or reference number"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Mandatory. Found on your payment receipt or banking app.
                  </span>
                </div>

                {/* Transaction ID */}
                <div className="space-y-1">
                  <label htmlFor="txnInput" className="block text-xs font-bold text-slate-800">
                    Transaction ID
                  </label>
                  <input
                    id="txnInput"
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID (optional)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Optional. Provided by your UPI or banking application.
                  </span>
                </div>

              </div>

              {/* Upload Payment Proof Drag & Drop */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Upload Payment Proof (Optional)
                </label>

                {!proofFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col sm:flex-row items-center justify-between gap-4 ${
                      isDragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={handleProofChange}
                      className="hidden"
                    />

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <UploadCloud size={20} />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-700 block">
                          Drag & drop your file here <span className="font-normal text-slate-400">or</span>
                        </span>
                        <button
                          type="button"
                          className="mt-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                        >
                          Choose File
                        </button>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-[10px] text-slate-400 space-y-0.5">
                      <span className="block">Supported formats: JPG, JPEG, PNG, PDF, WEBP</span>
                      <span className="block">Max file size: 5 MB</span>
                      <span className="block text-emerald-600 font-semibold">Optional, but recommended.</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {proofFile.type === 'application/pdf' ? (
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 font-bold text-xs">
                          PDF
                        </div>
                      ) : (
                        <img
                          src={proofPreview}
                          alt="Proof Thumbnail"
                          className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {proofFile.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {(proofFile.size / 1024 / 1024).toFixed(2)} MB • <span className="text-emerald-600 font-bold">✓ Uploaded</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveProof}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Complete Payment Submit Button */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={submitting || !utr.trim()}
                  className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-2xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting New Payment Details...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Payment</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <Lock size={12} className="text-emerald-600" />
                  <span>Your information is secure with us. We use industry-standard encryption.</span>
                </div>
              </div>

            </form>

            {/* 5. COLLAPSIBLE PAYMENT HISTORY */}
            {paymentHistory.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div 
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-500 group-hover:text-emerald-600 transition" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Payment History ({paymentHistory.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>{showHistory ? 'Hide History' : 'View History'}</span>
                    <ChevronRight size={14} className={`transition-transform duration-200 ${showHistory ? 'rotate-90' : ''}`} />
                  </button>
                </div>

                {showHistory && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 animate-fadeIn">
                    {paymentHistory.map((p, idx) => (
                      <div
                        key={p._id || idx}
                        className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                          p.status === 'VERIFIED'
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-blue-50/50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            Attempt #{p.attemptNumber || (paymentHistory.length - idx)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {p.status === 'VERIFIED' ? '✓ Verified' : (p.status === 'REJECTED' ? '✕ Rejected' : '● Pending Verification')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Amount</span>
                            <span className="font-bold text-slate-800">{formatINR(p.amount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">UTR</span>
                            <span className="font-mono font-bold text-slate-800">{p.utr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Date</span>
                            <span className="font-semibold text-slate-800">{formatDateTime(p.submittedAt || p.createdAt)}</span>
                          </div>
                        </div>

                        {p.status === 'REJECTED' && p.rejectionReason && (
                          <div className="p-2 bg-white/80 rounded-xl border border-rose-100 text-[11px] text-rose-800">
                            <span className="font-bold block">Reason:</span> {p.rejectionReason}
                          </div>
                        )}

                        {p.paymentProofUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingProof(p.paymentProofUrl)}
                            className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <Eye size={12} /> View Uploaded Proof
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ==================== RIGHT SIDEBAR ==================== */}
          <div className="lg:col-span-3 space-y-5">
            
            {/* Payment Summary Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Payment Summary</h3>
                <Link
                  to="/set-your-clinic"
                  state={{ editPlan: true }}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  Edit Plan
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan Name</span>
                  <span className="text-xs font-black text-slate-800 block mt-0.5">{planName}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Cycle</span>
                  <span className="text-xs font-black text-slate-800 block mt-0.5 capitalize">{billingCycle}</span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount Payable</span>
                  <span className="text-xl font-black text-emerald-600 block mt-0.5 tracking-tight">
                    {formattedAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* How It Works Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">How it works?</h3>
              
              <div className="space-y-3 relative">
                {[
                  'Scan the QR code or transfer the amount to the bank account.',
                  'Complete the payment from your bank/UPI app.',
                  'Enter your UTR / Reference Number below.',
                  'Optionally upload the transaction screenshot or receipt.',
                  'Click on "Complete Payment" to submit for verification.',
                  'Our team will verify the payment and notify you.'
                ].map((text, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug font-medium">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Need Help? Contact Card (Right Bottom) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <HeadsetCustomIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Need Help?</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Contact our support team for any payment related queries.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
                >
                  <Mail size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{supportEmail}</span>
                </a>
                <a
                  href={`tel:${supportPhone}`}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
                >
                  <Phone size={13} className="text-emerald-600 shrink-0" />
                  <span>{supportPhone}</span>
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition text-center"
                >
                  <Mail size={12} /> Email Support
                </a>
                <a
                  href={`tel:${supportPhone}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 border border-emerald-600 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold transition text-center"
                >
                  <PhoneCall size={12} /> Call Support
                </a>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Proof Viewer Modal Overlay */}
      {viewingProof && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setViewingProof(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">Submitted Payment Proof</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingProof(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center min-h-[300px]">
              {viewingProof.endsWith('.pdf') || viewingProof.includes('application/pdf') ? (
                <iframe
                  src={viewingProof}
                  title="Payment Proof PDF"
                  className="w-full h-96 rounded-xl border-none"
                />
              ) : (
                <img
                  src={viewingProof}
                  alt="Payment Proof"
                  className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href={viewingProof}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Open full size in new tab</span>
              </a>

              <button
                type="button"
                onClick={() => setViewingProof(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline Headset icon matching the SVG style in reference image
function HeadsetCustomIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
      <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
    </svg>
  );
}
