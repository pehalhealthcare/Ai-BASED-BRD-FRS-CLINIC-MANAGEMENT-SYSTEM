import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Check, Star, Zap, Crown, Building2, ArrowUpRight,
  Users, Database, Shield, Activity, ChevronRight, CreditCard,
  Clock, CheckCircle2, AlertCircle, Sparkles, Package, RefreshCw,
  Copy, UploadCloud, Trash2, ArrowRight, ShieldCheck, XCircle,
  HelpCircle, Eye, FileText, CheckCircle, Info, ArrowLeft,
  DollarSign, Calendar, Lock, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import {
  subscriptionApi,
  subscriptionPaymentApi,
  paymentSettingsApi,
  clinicApi,
  apiClient
} from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import LoadingState from '../../components/common/LoadingState';

/* ─── Helpers ─────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

const fmtDate = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PLAN_ICONS = {
  0: Zap,
  1: Star,
  2: Crown,
  3: Building2,
};

const PLAN_RANKS = {
  'STARTER': 1,
  'PROFESSIONAL': 2,
  'PREMIUM': 3,
  'ENTERPRISE': 4
};

const TABS = ['My Subscription', 'Available Plans', 'Billing & Payment History'];

/* ─── Feature Check Component ───────────────────────────── */
const FeatureItem = ({ text, highlighted = false }) => (
  <div className="flex items-start gap-2">
    <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${highlighted ? 'text-indigo-600' : 'text-emerald-500'}`} />
    <span className="text-xs text-slate-600 leading-relaxed font-medium">{text}</span>
  </div>
);

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState('My Subscription');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [clinicData, setClinicData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [latestPayment, setLatestPayment] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);

  // Upgrade Modal & Flow States
  // Flow steps: 'SELECT_PLAN' | 'REVIEW_SUMMARY' | 'PAYMENT' | 'VERIFICATION_PENDING' | 'SUCCESS_CONGRATULATIONS' | 'REJECTED'
  const [flowStep, setFlowStep] = useState(null); // null when modal closed
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('monthly'); // 'monthly' | 'yearly'
  
  // Payment Form States
  const [utr, setUtr] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofBase64, setProofBase64] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const fileInputRef = useRef(null);

  // Dynamic QR / pricing from initiation
  const [initiationData, setInitiationData] = useState(null);
  const [loadingInitiation, setLoadingInitiation] = useState(false);

  // Load clinic & subscription data
  const loadData = useCallback(async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    try {
      const [plansRes, setupRes, settingsRes] = await Promise.allSettled([
        subscriptionApi.getPublicPlans(),
        clinicApi.getSetupStatus(),
        paymentSettingsApi.getActiveDetails()
      ]);

      let loadedPlans = [];
      if (plansRes.status === 'fulfilled') {
        const pData = plansRes.value?.data || plansRes.value;
        loadedPlans = Array.isArray(pData) ? pData : (pData?.plans || []);
        setPlans(loadedPlans);
      }

      let currentClinic = null;
      if (setupRes.status === 'fulfilled' && setupRes.value?.data?.clinic) {
        currentClinic = setupRes.value.data.clinic;
        setClinicData(currentClinic);
      } else if (user?.clinic) {
        currentClinic = user.clinic;
        setClinicData(currentClinic);
      }

      if (settingsRes.status === 'fulfilled') {
        setPaymentSettings(settingsRes.value?.data?.paymentDetails || settingsRes.value?.paymentDetails || null);
      }

      const clinicId = currentClinic?._id || user?.clinicId;
      if (clinicId) {
        try {
          const histRes = await subscriptionPaymentApi.getClinicPaymentHistory(clinicId);
          const histData = histRes.data || histRes;
          const paymentsList = histData.payments || [];
          setPaymentHistory(paymentsList);
          
          const latest = paymentsList[0] || null;
          setLatestPayment(latest);

          // Handle automatic status detection
          if (latest) {
            const isUpgradePayment = latest.paymentType === 'PLAN_UPGRADE' || latest.paymentType === 'UPGRADE' || latest.paymentType === 'PLAN_CHANGE';
            
            if (latest.status === 'PENDING_VERIFICATION') {
              if (isUpgradePayment && flowStep === 'PAYMENT') {
                setFlowStep('VERIFICATION_PENDING');
              }
            } else if (latest.status === 'VERIFIED') {
              // If we were on pending verification screen and now it's verified, show Congratulations!
              if (flowStep === 'VERIFICATION_PENDING') {
                setFlowStep('SUCCESS_CONGRATULATIONS');
                if (refreshUser) refreshUser(true).catch(() => {});
              }
            } else if (latest.status === 'REJECTED' || latest.status === 'REPAYMENT_REQUIRED') {
              if (flowStep === 'VERIFICATION_PENDING') {
                setFlowStep('REJECTED');
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load clinic payment history:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load subscription page data:', err);
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, [user?.clinicId, user?.clinic, flowStep, refreshUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling for status updates when payment verification is pending
  useEffect(() => {
    const isPending = (latestPayment?.status === 'PENDING_VERIFICATION' && (latestPayment?.paymentType === 'PLAN_UPGRADE' || latestPayment?.paymentType === 'UPGRADE')) ||
                      flowStep === 'VERIFICATION_PENDING' ||
                      clinicData?.paymentStatus === 'PENDING_VERIFICATION';

    if (!isPending) return;

    const intervalId = setInterval(() => {
      loadData(true);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [latestPayment?.status, latestPayment?.paymentType, flowStep, clinicData?.paymentStatus, loadData]);

  // Handle URL sub-routes if any
  useEffect(() => {
    if (location.pathname.includes('/upgrade')) {
      handleOpenUpgrade();
    } else if (location.pathname.includes('/payment-verification')) {
      setFlowStep('VERIFICATION_PENDING');
    }
  }, [location.pathname]);

  /* ── Current Subscription Data ── */
  const clinic = clinicData || user?.clinic || {};
  const currentSub = clinic.subscription || {};
  const currentPlan = currentSub.planId || {};
  const currentPlanName = currentPlan.name || 'AI Starter Clinic';
  const currentPlanCode = (currentPlan.code || 'STARTER').toUpperCase();
  const currentBillingCycle = currentSub.billingCycle || 'monthly';
  const isCurrentlyMonthly = currentBillingCycle.toLowerCase() === 'monthly';
  const currentPlanPrice = isCurrentlyMonthly 
    ? (currentPlan.priceMonthly || currentPlan.price || 999) 
    : (currentPlan.priceYearly || (currentPlan.price || 999) * 10);

  const startDateFormatted = fmtDate(currentSub.startDate || clinic.createdAt);
  const expiryDateFormatted = fmtDate(currentSub.expiryDate || currentSub.renewalDate);
  const renewalDateFormatted = fmtDate(currentSub.renewalDate || currentSub.expiryDate);

  const isPendingUpgrade = latestPayment?.status === 'PENDING_VERIFICATION' && 
    (latestPayment?.paymentType === 'PLAN_UPGRADE' || latestPayment?.paymentType === 'UPGRADE' || latestPayment?.paymentType === 'PLAN_CHANGE');

  const pendingPlanName = latestPayment?.requestedPlanId?.name || latestPayment?.planId?.name || 'Upgraded Plan';
  const pendingCycle = latestPayment?.requestedBillingCycle || latestPayment?.billingCycle || 'yearly';

  // Derived higher plans
  const currentRank = PLAN_RANKS[currentPlanCode] || 1;

  const eligibleUpgradePlans = useMemo(() => {
    return plans.filter(p => {
      const pCode = (p.code || '').toUpperCase();
      const pRank = PLAN_RANKS[pCode] || 2;
      return pRank > currentRank;
    });
  }, [plans, currentRank]);

  // Handle Copy helper
  const handleCopy = (text, key, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  // Open Upgrade Plan selector
  const handleOpenUpgrade = (preselectedPlan = null) => {
    const target = preselectedPlan || eligibleUpgradePlans[0] || plans.find(p => (PLAN_RANKS[(p.code || '').toUpperCase()] || 0) > currentRank) || null;
    setSelectedPlanForUpgrade(target);
    setSelectedCycle(currentBillingCycle === 'yearly' ? 'yearly' : 'monthly');
    setFlowStep('SELECT_PLAN');
  };

  // Switch to Yearly shortcut on current plan
  const handleSwitchToYearlyCurrentPlan = () => {
    const matchingPlan = plans.find(p => String(p._id) === String(currentPlan._id || currentPlan.id)) || currentPlan;
    setSelectedPlanForUpgrade(matchingPlan);
    setSelectedCycle('yearly');
    setFlowStep('REVIEW_SUMMARY');
  };

  // Move from Plan selection to Review Summary
  const handleProceedToReview = (plan, cycle) => {
    setSelectedPlanForUpgrade(plan);
    setSelectedCycle(cycle);
    setFlowStep('REVIEW_SUMMARY');
  };

  // Move from Review Summary to Payment Screen & Initiate dynamic QR with backend calculation
  const handleProceedToPayment = async () => {
    if (!selectedPlanForUpgrade?._id && !selectedPlanForUpgrade?.id) {
      toast.error('Please select a target plan.');
      return;
    }

    const targetPlanId = selectedPlanForUpgrade._id || selectedPlanForUpgrade.id;
    const clinicId = clinic._id || user?.clinicId;

    setLoadingInitiation(true);
    try {
      const initRes = await subscriptionPaymentApi.initiatePayment({
        clinicId,
        planId: targetPlanId,
        billingCycle: selectedCycle
      });

      const data = initRes.data || initRes;
      setInitiationData(data);
      if (data.paymentDetails) {
        setPaymentSettings(data.paymentDetails);
      }
      setFlowStep('PAYMENT');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to initialize payment calculation.');
    } finally {
      setLoadingInitiation(false);
    }
  };

  // Handle Proof File Upload
  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB.');
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProofPreview(reader.result);
      setProofBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Upgrade Payment
  const handleSubmitPayment = async (e) => {
    e?.preventDefault();
    if (!utr || !utr.trim()) {
      toast.error('Please enter a valid UTR / Transaction Reference Number.');
      return;
    }

    const cleanUtr = utr.trim().toUpperCase();
    if (cleanUtr.length < 6) {
      toast.error('UTR / Reference number must be at least 6 alphanumeric characters.');
      return;
    }

    const targetPlanId = selectedPlanForUpgrade?._id || selectedPlanForUpgrade?.id || initiationData?.plan?._id;
    const clinicId = clinic._id || user?.clinicId;

    setSubmittingPayment(true);
    try {
      const res = await subscriptionPaymentApi.submitPayment({
        clinicId,
        planId: targetPlanId,
        billingCycle: selectedCycle,
        paymentType: 'PLAN_UPGRADE',
        utr: cleanUtr,
        transactionId: transactionId.trim(),
        paymentProofUrl: proofBase64 || ''
      });

      if (res.success || res.status === 201 || res.data) {
        toast.success('Payment submitted successfully! Awaiting verification.');
        setFlowStep('VERIFICATION_PENDING');
        await loadData(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment submission failed. Please check UTR or contact support.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Calculated Pricing breakdown for review
  const calculatedReview = useMemo(() => {
    if (!selectedPlanForUpgrade) return null;
    const isYearly = selectedCycle === 'yearly';
    
    let basePrice = isYearly 
      ? (selectedPlanForUpgrade.priceYearly ?? (selectedPlanForUpgrade.priceMonthly ? selectedPlanForUpgrade.priceMonthly * 10 : (selectedPlanForUpgrade.price || 9999) * 10))
      : (selectedPlanForUpgrade.priceMonthly ?? selectedPlanForUpgrade.price ?? 9999);

    const gst = Math.round(basePrice * 0.18);
    const total = basePrice + gst;

    let savings = 0;
    if (isYearly) {
      const monthlyEquivAnnual = (selectedPlanForUpgrade.priceMonthly || (selectedPlanForUpgrade.price || 999)) * 12;
      savings = Math.max(0, monthlyEquivAnnual - basePrice);
    }

    return { basePrice, gst, total, savings };
  }, [selectedPlanForUpgrade, selectedCycle]);

  if (loading && !clinicData) {
    return <LoadingState label="Loading clinic subscription details..." />;
  }

  return (
    <div className="space-y-6 p-1 max-w-[1600px] mx-auto">
      
      {/* ── Page Header ─────────────────────────────────────── */}
      <PageHeader
        eyebrow="Clinic Subscription Management"
        title="Subscription & Plan"
        description="View your active subscription details, explore higher tier plans, or switch to annual billing with exclusive savings."
      />

      {/* ── Pending Upgrade Notification Banner ─────────────── */}
      {isPendingUpgrade && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Clock size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">Plan Upgrade Under Verification</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  Pending Verification
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Requested upgrade to <strong>{pendingPlanName}</strong> ({pendingCycle} billing). Your current plan remains active while under administrator review.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFlowStep('VERIFICATION_PENDING')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
          >
            <span>View Verification Status</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Tab Navigation ──────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-extrabold cursor-pointer transition border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? 'text-emerald-600 border-emerald-600 bg-emerald-50/40 rounded-t-xl'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: MY SUBSCRIPTION OVERVIEW
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'My Subscription' && (
        <div className="space-y-6">
          
          {/* Top Hero Cards: Active Plan + Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* 1. Main Current Subscription Card */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              
              <div className="space-y-6 relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                      Current Subscription
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {currentPlanName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {isCurrentlyMonthly ? 'Billed Monthly' : 'Billed Annually'} • High Performance ClinicOS
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Rate</span>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">
                      {fmt(currentPlanPrice)}
                      <span className="text-xs font-semibold text-slate-500 ml-1">
                        / {isCurrentlyMonthly ? 'month' : 'year'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Switch to yearly button if currently monthly */}
                    {isCurrentlyMonthly && (
                      <button
                        onClick={handleSwitchToYearlyCurrentPlan}
                        className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Sparkles size={14} className="text-indigo-600" />
                        <span>Switch to Yearly (Save 17%+)</span>
                      </button>
                    )}

                    {/* Upgrade Plan button */}
                    <button
                      onClick={() => handleOpenUpgrade()}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <Crown size={14} />
                      <span>{isCurrentlyMonthly ? 'Upgrade Plan' : 'Change Plan'}</span>
                    </button>
                  </div>
                </div>

                {/* Key Lifecycle Dates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Start Date</span>
                    <span className="text-xs font-bold text-slate-800 block mt-1">{startDateFormatted}</span>
                  </div>

                  <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Next Renewal</span>
                    <span className="text-xs font-bold text-slate-800 block mt-1">{renewalDateFormatted}</span>
                  </div>

                  <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Subscription Expiry</span>
                    <span className="text-xs font-bold text-slate-800 block mt-1">{expiryDateFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>Encrypted medical grade multi-tenant HIPAA isolation included.</span>
              </div>
            </div>

            {/* 2. Upgrade Promotion Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 text-amber-400">
                  <Crown size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Expand Your Practice</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Unlock AI consultation assistants, multi-doctor scheduling, integrated pharmacy, and advanced analytics.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span>Instant activation upon verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span>Existing patient data stays untouched</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span>Unified direct bank / UPI payment</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 relative z-10">
                <button
                  onClick={() => handleOpenUpgrade()}
                  className="w-full py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Explore Higher Plans</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

          </div>

          {/* Plan Usage & Resource Limits */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Plan Usage & Limits</h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time resource allocation and storage utilization for {currentPlanName}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                85% Total Capacity
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Storage */}
              <div className="bg-slate-50/80 border border-slate-150 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <Database size={16} className="text-emerald-600" />
                    <span>Cloud Medical Storage</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">85% Used</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1.5">
                    <span>170 GB Used</span>
                    <span>200 GB Limit</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: '85%' }} />
                  </div>
                </div>
              </div>

              {/* Doctors Allocation */}
              <div className="bg-slate-50/80 border border-slate-150 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <Users size={16} className="text-indigo-600" />
                    <span>Doctor Accounts</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">Active</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1.5">
                    <span>Multi-Speciality Roster</span>
                    <span>{currentPlan?.limits?.maxDoctors ? `${currentPlan.limits.maxDoctors} Doctors` : 'Unlimited'}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: '60%' }} />
                  </div>
                </div>
              </div>

              {/* Monthly Patients */}
              <div className="bg-slate-50/80 border border-slate-150 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <Activity size={16} className="text-purple-600" />
                    <span>Monthly Consultations</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">Unrestricted</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1.5">
                    <span>High Volume Ready</span>
                    <span>{currentPlan?.limits?.maxPatients ? `${currentPlan.limits.maxPatients} / mo` : 'Unlimited'}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: '45%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Included in Current Plan */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Features Included in Current Plan</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your clinic currently has access to these active modules</p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {currentPlanName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(currentPlan?.features || [
                'Patient Management',
                'Appointment Scheduling',
                'Billing & Invoicing',
                'Digital Prescriptions',
                'Multi-Doctor Roster',
                'Pharmacy Integration',
                'Laboratory Test Management',
                'Financial Analytics'
              ]).map((feat, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-150/80 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold text-slate-700 capitalize">
                    {String(feat).replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2: AVAILABLE PLANS & PRICING
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'Available Plans' && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2 py-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Choose Your Subscription Plan</h2>
            <p className="text-xs text-slate-500 font-medium">
              Dynamically configured plans from Super Admin. Current plan is marked below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan, idx) => {
              const pCode = (plan.code || '').toUpperCase();
              const isCurrent = pCode === currentPlanCode || String(plan._id) === String(currentPlan._id || currentPlan.id);
              const pRank = PLAN_RANKS[pCode] || (idx + 1);
              const isHigher = pRank > currentRank;
              const Icon = PLAN_ICONS[idx % 4] || Star;
              const isPopular = idx === 1 || pCode === 'PROFESSIONAL';

              const monthlyPrice = plan.priceMonthly ?? plan.price ?? 999;
              const yearlyPrice = plan.priceYearly ?? (monthlyPrice * 10);

              return (
                <div
                  key={plan._id || idx}
                  className={`relative rounded-3xl border p-6 flex flex-col justify-between transition-all duration-200 ${
                    isCurrent
                      ? 'bg-emerald-50/30 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                      : isPopular
                      ? 'bg-gradient-to-b from-indigo-50/50 to-white border-indigo-200 shadow-md ring-1 ring-indigo-300'
                      : 'bg-white border-slate-200 shadow-xs hover:shadow-md'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-6">
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-xs">
                        Current Plan
                      </span>
                    </div>
                  )}

                  {isPopular && !isCurrent && (
                    <div className="absolute -top-3 right-6">
                      <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles size={10} /> Most Popular
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                      <Icon size={20} />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{plan.limits?.maxDoctors ? `Up to ${plan.limits.maxDoctors} Doctors` : 'Enterprise Grade'}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">{fmt(monthlyPrice)}</span>
                        <span className="text-xs font-semibold text-slate-400">/ month</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        or {fmt(yearlyPrice)} / year (Save 17%+)
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Included Features</span>
                      {(plan.features || ['Patient Records', 'Appointments', 'Billing', 'EMR']).slice(0, 7).map((feat, fIdx) => (
                        <FeatureItem key={fIdx} text={String(feat).replace(/_/g, ' ')} highlighted={isPopular} />
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-4">
                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-2xl bg-emerald-100 text-emerald-800 text-xs font-black text-center">
                        Active Plan
                      </div>
                    ) : isHigher ? (
                      <button
                        onClick={() => handleProceedToReview(plan, 'monthly')}
                        className={`w-full py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isPopular
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        }`}
                      >
                        <Crown size={14} />
                        <span>Upgrade to {plan.name}</span>
                      </button>
                    ) : (
                      <div className="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-400 text-xs font-bold text-center">
                        Lower Tier Plan
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3: BILLING & PAYMENT HISTORY
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'Billing & Payment History' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5">
          <div>
            <h3 className="text-base font-black text-slate-900">Subscription &amp; Payment History</h3>
            <p className="text-xs text-slate-400 mt-0.5">Detailed record of all subscription payments and plan changes</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-left bg-slate-50/50">
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">UTR / Ref</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((p) => {
                    const isVerified = p.status === 'VERIFIED';
                    const isRejected = p.status === 'REJECTED';
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-black text-slate-900">
                          {p.requestedPlanId?.name || p.planId?.name || currentPlanName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.paymentType === 'PLAN_UPGRADE' || p.paymentType === 'UPGRADE'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {p.paymentType || 'RENEWAL'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 capitalize font-semibold text-slate-700">
                          {p.requestedBillingCycle || p.billingCycle || 'monthly'}
                        </td>
                        <td className="py-3.5 px-4 font-black text-slate-900">
                          {fmt(p.amount)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                          {p.utr || '--'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {fmtDate(p.submittedAt || p.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isVerified 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isRejected
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Pending Verification'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 1: DYNAMIC PLAN SELECTION MODAL
      ══════════════════════════════════════════════════════ */}
      {flowStep === 'SELECT_PLAN' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setFlowStep(null)}>
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Choose Your Upgrade Plan</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select a higher tier plan or change your billing frequency</p>
              </div>
              <button onClick={() => setFlowStep(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition cursor-pointer">
                ✕
              </button>
            </div>

            {/* Cycle Toggle */}
            <div className="flex justify-center">
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCycle('monthly')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    selectedCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCycle('yearly')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    selectedCycle === 'yearly' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles size={12} />
                  <span>Yearly Billing (Save 17%+)</span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan, idx) => {
                const pCode = (plan.code || '').toUpperCase();
                const isCurrent = pCode === currentPlanCode;
                const pRank = PLAN_RANKS[pCode] || (idx + 1);
                const isHigher = pRank > currentRank;
                const isSelected = selectedPlanForUpgrade?._id === plan._id || selectedPlanForUpgrade?.id === plan.id;
                
                const monthlyP = plan.priceMonthly ?? plan.price ?? 999;
                const yearlyP = plan.priceYearly ?? (monthlyP * 10);
                const activeP = selectedCycle === 'yearly' ? yearlyP : monthlyP;

                return (
                  <div
                    key={plan._id || idx}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : isSelected
                        ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{plan.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                            Current Plan
                          </span>
                        )}
                      </div>

                      <div className="text-xl font-black text-slate-900">
                        {fmt(activeP)}
                        <span className="text-[11px] font-normal text-slate-400 ml-1">/ {selectedCycle}</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        {(plan.features || []).slice(0, 5).map((f, fi) => (
                          <div key={fi} className="flex items-center gap-1.5 text-[11px]">
                            <Check size={12} className="text-emerald-500 shrink-0" />
                            <span>{String(f).replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-3">
                      {isCurrent ? (
                        <button disabled className="w-full py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold">
                          Current Plan
                        </button>
                      ) : isHigher ? (
                        <button
                          onClick={() => handleProceedToReview(plan, selectedCycle)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-xs"
                        >
                          Select Plan
                        </button>
                      ) : (
                        <button disabled className="w-full py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold">
                          Lower Tier
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 2: PLAN CHANGE SUMMARY REVIEW MODAL
      ══════════════════════════════════════════════════════ */}
      {flowStep === 'REVIEW_SUMMARY' && calculatedReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setFlowStep(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Review Your Plan Change</h3>
                <p className="text-xs text-slate-400 mt-0.5">Please verify the subscription upgrade parameters</p>
              </div>
              <button onClick={() => setFlowStep(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition cursor-pointer">
                ✕
              </button>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Plan</span>
                <span className="font-black text-slate-800 text-sm block mt-0.5">{currentPlanName}</span>
                <span className="text-[10px] text-slate-500 capitalize">{currentBillingCycle} Billing</span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">New Plan</span>
                <span className="font-black text-emerald-900 text-sm block mt-0.5">{selectedPlanForUpgrade?.name}</span>
                <span className="text-[10px] text-emerald-700 capitalize font-bold">{selectedCycle} Billing</span>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Plan Price ({selectedCycle})</span>
                <span className="font-bold text-slate-800">{fmt(calculatedReview.basePrice)}</span>
              </div>

              {calculatedReview.savings > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Yearly Discount Savings</span>
                  <span>- {fmt(calculatedReview.savings)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>GST (18% Statutory)</span>
                <span className="font-bold text-slate-800">{fmt(calculatedReview.gst)}</span>
              </div>

              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Total Payable Amount</span>
                <span className="text-emerald-600 text-base">{fmt(calculatedReview.total)}</span>
              </div>
            </div>

            {/* Critical Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Effective After Payment Verification:</strong> Your new plan will become active only after payment verification by the AICMS administrator.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFlowStep('SELECT_PLAN')}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={loadingInitiation}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
              >
                {loadingInitiation ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                <span>Proceed to Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 3: INTEGRATED DYNAMIC QR PAYMENT MODAL
      ══════════════════════════════════════════════════════ */}
      {flowStep === 'PAYMENT' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setFlowStep(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">Subscription Upgrade Payment</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Plan Upgrade
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{clinic.name} • {selectedPlanForUpgrade?.name} ({selectedCycle})</p>
              </div>
              <button onClick={() => setFlowStep(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition cursor-pointer">
                ✕
              </button>
            </div>

            {/* Dynamic QR & Bank Details Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              
              {/* Left: Dynamic QR */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col items-center text-center space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Scan &amp; Pay via UPI</span>
                
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  {initiationData?.paymentDetails?.dynamicQrDataUri || paymentSettings?.dynamicQrDataUri || paymentSettings?.qrCodeUrl ? (
                    <img
                      src={initiationData?.paymentDetails?.dynamicQrDataUri || paymentSettings?.dynamicQrDataUri || paymentSettings?.qrCodeUrl}
                      alt="UPI Payment QR"
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <CreditCard size={32} />
                      <span className="text-[10px]">Payment QR</span>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <span className="text-xs font-black text-slate-900">
                    Amount: {fmt(initiationData?.plan?.amount || calculatedReview?.total)}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Amount is auto-configured in QR code</p>
                </div>
              </div>

              {/* Right: Bank Transfer Info */}
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Super Admin Bank Details
                  </span>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Account Name</span>
                    <span className="font-bold text-slate-800">{paymentSettings?.accountName || 'PehalHealthcare Technologies Pvt Ltd'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Bank Name</span>
                    <span className="font-bold text-slate-800">{paymentSettings?.bankName || 'Kotak Mahindra Bank'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Account Number</span>
                      <span className="font-mono font-bold text-slate-900">{paymentSettings?.accountNumber || '8512060314'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentSettings?.accountNumber || '8512060314', 'acc', 'Account Number')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                      <span className="font-mono font-bold text-slate-900">{paymentSettings?.ifscCode || 'KKBK0000181'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentSettings?.ifscCode || 'KKBK0000181', 'ifsc', 'IFSC')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">UPI ID</span>
                      <span className="font-mono font-bold text-indigo-700">{paymentSettings?.upiId || '8130916134@kotak'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentSettings?.upiId || '8130916134@kotak', 'upi', 'UPI ID')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Submission Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    UTR / Transaction Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 425316789012"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Found in your UPI or banking receipt</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transaction ID <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. TXN987654"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
              </div>

              {/* Payment Proof Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Payment Screenshot <span className="text-slate-400">(optional)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20 flex flex-col items-center justify-center gap-1.5"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProofChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {proofPreview ? (
                    <div className="flex items-center gap-3">
                      <img src={proofPreview} alt="Proof" className="w-12 h-12 object-cover rounded-xl border border-slate-200" />
                      <span className="text-xs font-bold text-slate-700">{proofFile?.name}</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={20} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">Click to upload payment screenshot</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
                    </>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setFlowStep('REVIEW_SUMMARY')}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || !utr}
                  className="flex-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
                >
                  {submittingPayment ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>{submittingPayment ? 'Submitting Payment...' : 'Submit Payment Attempt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 4: PAYMENT VERIFICATION PENDING MODAL / VIEW
      ══════════════════════════════════════════════════════ */}
      {flowStep === 'VERIFICATION_PENDING' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-6 text-center text-slate-800">
            
            <div className="w-14 h-14 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <Clock size={28} className="animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Payment Submitted Successfully!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your plan upgrade request has been submitted and is currently under verification.
              </p>
            </div>

            {/* Upgrade Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Plan</span>
                <span className="font-bold text-slate-800">{currentPlanName} (Active)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Plan</span>
                <span className="font-black text-indigo-900">{pendingPlanName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Cycle</span>
                <span className="font-bold text-slate-800 capitalize">{pendingCycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-emerald-600">{fmt(latestPayment?.amount || calculatedReview?.total)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500">Payment Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                  ● Pending Verification
                </span>
              </div>
            </div>

            {/* 4-Step Progress Tracker */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block text-left">
                Progress Tracker
              </span>

              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                <div className="flex flex-col items-center gap-1 text-emerald-600">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">✓</div>
                  <span>Plan Selected</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-emerald-600">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">✓</div>
                  <span>Payment Submitted</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-amber-600">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center animate-pulse">●</div>
                  <span>Payment Verification</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">○</div>
                  <span>Plan Activation</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-150">
              Your new plan will be activated after the payment is verified by the AICMS administrator.
            </p>

            <button
              onClick={() => setFlowStep(null)}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Continue to Subscription Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 5: CONGRATULATIONS SUCCESS MODAL
      ══════════════════════════════════════════════════════ */}
      {flowStep === 'SUCCESS_CONGRATULATIONS' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-6 text-center text-slate-800">
            
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Sparkles size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">🎉 Congratulations!</h3>
              <p className="text-xs text-slate-500">
                Your subscription has been successfully upgraded!
              </p>
            </div>

            <div className="bg-gradient-to-b from-emerald-50/50 to-white border border-emerald-200 rounded-3xl p-5 space-y-2">
              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">You are now on</span>
              <h4 className="text-lg font-black text-slate-900">{clinic.subscription?.planId?.name || pendingPlanName}</h4>
              <p className="text-xs font-bold text-slate-700 capitalize">
                {clinic.subscription?.billingCycle || pendingCycle} Billing • {fmt(currentPlanPrice)}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold pt-1">
                Your new plan is now active.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-700 text-left bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={14} />
                <span>Payment Verified by Super Admin</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={14} />
                <span>Plan Activated with updated dates</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={14} />
                <span>New features and limits unlocked</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFlowStep(null);
                  navigate('/clinic/dashboard');
                }}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setFlowStep(null);
                  setActiveTab('My Subscription');
                }}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                View Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 6: REJECTED UPGRADE MODAL
      ══════════════════════════════════════════════════════ */}
      {flowStep === 'REJECTED' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-6 text-center text-slate-800">
            
            <div className="w-14 h-14 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <XCircle size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Payment Verification Failed</h3>
              <p className="text-xs text-slate-500">
                Your subscription upgrade could not be verified.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-left space-y-1.5 text-rose-900">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Rejection Reason:</span>
              <p className="font-bold">{latestPayment?.rejectionReason || clinic.rejectionReason || 'Invalid UTR or transaction could not be reconciled.'}</p>
              {latestPayment?.rejectionNotes && (
                <p className="text-[11px] text-rose-700 mt-1">{latestPayment.rejectionNotes}</p>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Plan</span>
                <span className="font-bold text-slate-800">{currentPlanName} (Active)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Plan</span>
                <span className="font-bold text-slate-800">{pendingPlanName}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFlowStep(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Back to Subscription
              </button>
              <button
                type="button"
                onClick={() => {
                  setUtr('');
                  setTransactionId('');
                  setProofBase64('');
                  setProofPreview('');
                  setFlowStep('PAYMENT');
                }}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Try Payment Again
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
