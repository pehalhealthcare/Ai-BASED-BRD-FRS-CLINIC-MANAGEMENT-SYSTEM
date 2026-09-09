import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft, Check, Copy, UploadCloud, Trash2, Clock, CheckCircle2,
  AlertTriangle, ShieldCheck, Lock, Sparkles, HelpCircle, Mail, Phone,
  ExternalLink, ArrowRight, Eye, RefreshCw, FileText, ChevronRight, ChevronLeft,
  LogOut, Crown, Building2, Layers, Zap, X, Calendar, DollarSign,
  Share2, Shield, PhoneCall, BarChart3, Settings, UserCheck, AlertCircle,
  HelpCircle as HelpIcon, ArrowUpRight, Users, Heart, Headphones, Download, Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import PehalLogo from '../../components/common/PehalLogo';
import clinicBgSvg from '../../assets/aicms_clinic_background.svg';
import {
  subscriptionApi,
  subscriptionPaymentApi,
  paymentSettingsApi,
  clinicApi
} from '../../lib/api';

export default function SubscriptionRenewalFlow({ initialScreen = 'subscription_expired' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, refreshUser } = useAuth();

  // Screen State: 'subscription_expired' (Screen 0) | 'plan_selection' (Screen 1) | 'renewal_payment' (Screen 2)
  const [currentScreen, setCurrentScreen] = useState(
    location.state?.screen || (initialScreen === 'payment' ? 'renewal_payment' : (initialScreen === 'plan_selection' ? 'plan_selection' : 'subscription_expired'))
  );

  // Core Data
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);
  const [clinic, setClinic] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  // Payment configuration from server
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [latestPayment, setLatestPayment] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Form State for Renewal Payment
  const [utr, setUtr] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofBase64, setProofBase64] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Modals & UI States
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [viewingProof, setViewingProof] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  // Carousel State & Refs
  const carouselRef = useRef(null);
  const fileInputRef = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  // Load server-authoritative data
  const loadData = async (isBackgroundPoll = false) => {
    if (!isBackgroundPoll) {
      setLoading(true);
      setError('');
    }
    try {
      // 1. Fetch public subscription plans
      let activePlans = [];
      try {
        const plansRes = await subscriptionApi.getPublicPlans();
        const data = plansRes.data || plansRes;
        activePlans = Array.isArray(data) ? data : (data.plans || []);
        setPlans(activePlans);
      } catch (err) {
        console.warn('Could not load plans from API, using defaults:', err);
      }

      // 2. Fetch clinic setup & subscription status
      let currentClinic = user?.clinic || null;
      try {
        const setupRes = await clinicApi.getSetupStatus();
        if (setupRes?.data?.clinic) {
          currentClinic = { ...currentClinic, ...setupRes.data.clinic };
        }
      } catch (e) {
        console.warn('Could not load setup status:', e);
      }
      setClinic(currentClinic);

      // 3. Match initial selected plan
      const currentPlanId = currentClinic?.subscription?.planId?._id || currentClinic?.subscription?.planId;
      const initialPlan = activePlans.find(p => String(p._id) === String(currentPlanId)) ||
        activePlans.find(p => p.code === 'PROFESSIONAL' || p.code === 'PREMIUM') ||
        activePlans[0] || null;

      if (!selectedPlan) {
        setSelectedPlan(initialPlan);
      }

      // Billing cycle from clinic subscription
      if (currentClinic?.subscription?.billingCycle && !isBackgroundPoll) {
        setBillingCycle(currentClinic.subscription.billingCycle);
      }

      // 4. Fetch payment details & dynamic QR & payment history
      const clinicId = currentClinic?._id || user?.clinicId;
      if (clinicId && initialPlan?._id) {
        try {
          const initRes = await subscriptionPaymentApi.initiatePayment({
            clinicId,
            planId: (selectedPlan || initialPlan)._id,
            billingCycle: currentClinic?.subscription?.billingCycle || billingCycle || 'monthly'
          });
          const initData = initRes.data || {};
          setPaymentDetails(initData.paymentDetails || {});
          setLatestPayment(initData.latestPayment || null);
          setPaymentHistory(initData.paymentHistory || []);

          // Route to pending verification screen automatically if latest payment is pending
          if (initData.latestPayment?.status === 'PENDING_VERIFICATION' || initData.latestPayment?.status === 'SUBMITTED') {
            setCurrentScreen('payment_pending_verification');
          }
        } catch (initErr) {
          const res = await paymentSettingsApi.getActiveDetails();
          setPaymentDetails(res.data?.paymentDetails || {});
        }
      } else {
        const res = await paymentSettingsApi.getActiveDetails();
        setPaymentDetails(res.data?.paymentDetails || {});
      }
    } catch (err) {
      console.error('Failed to load renewal initialization:', err);
      if (!isBackgroundPoll) {
        setError('Unable to load subscription renewal details. Please try again.');
      }
    } finally {
      if (!isBackgroundPoll) {
        setLoading(false);
      }
    }
  };

  // Subscription & Payment Helpers
  const currentSub = clinic?.subscription || {};
  const isExpired = currentSub.status === 'Expired' || (currentSub.expiryDate && new Date(currentSub.expiryDate) < new Date());
  
  // Bank & Support details
  const accountName = paymentDetails?.accountName || 'PehalHealthcare Technologies Private Limited';
  const bankName = paymentDetails?.bankName || 'Kotak Mahindra Bank';
  const accountNumber = paymentDetails?.accountNumber || '8512060314';
  const ifscCode = paymentDetails?.ifscCode || 'KKBK0000181';
  const branch = paymentDetails?.branch || 'Sector-18, Noida';
  const upiId = paymentDetails?.upiId || '8130916134@kotak';
  const supportEmail = paymentDetails?.supportEmail || 'support@pehalhealthcare.com';
  const supportPhone = paymentDetails?.supportPhone || '+91 81309 16134';
  const qrImageSrc = paymentDetails?.dynamicQrDataUri || paymentDetails?.dynamicQr || paymentDetails?.qrCodeUrl;
  const currentPlanName = currentSub.planId?.name || 'AI Premium Clinic';

  // Latest payment status checks (Scoped strictly to active pending verification screen to avoid triggering on past historical payments)
  const isPaymentPendingVerification = currentScreen === 'payment_pending_verification' && (latestPayment?.status === 'PENDING_VERIFICATION' || latestPayment?.status === 'SUBMITTED');
  const isPaymentRejected = currentScreen === 'payment_pending_verification' && (latestPayment?.status === 'REJECTED' || latestPayment?.status === 'REPAYMENT_REQUIRED');
  const isPaymentVerified = currentScreen === 'payment_pending_verification' && latestPayment?.status === 'VERIFIED' && (currentSub?.status === 'Active' || clinic?.subscription?.status === 'Active');

  useEffect(() => {
    loadData();
  }, []);

  // Periodic polling ONLY when payment is actively pending verification on the verification screen
  useEffect(() => {
    const isPending = currentScreen === 'payment_pending_verification' && (latestPayment?.status === 'PENDING_VERIFICATION' || latestPayment?.status === 'SUBMITTED');
    if (!isPending) return;

    const intervalId = setInterval(() => {
      loadData(true);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [latestPayment?.status, currentScreen]);

  // Automated redirect to Clinic Dashboard when renewal payment is verified by Super Admin
  useEffect(() => {
    if (isPaymentVerified && currentScreen === 'payment_pending_verification') {
      const redirectTimer = setTimeout(async () => {
        try {
          if (refreshUser) {
            await refreshUser(true).catch(() => {});
          }
        } finally {
          navigate('/dashboard', { replace: true });
        }
      }, 1800);

      return () => clearTimeout(redirectTimer);
    }
  }, [isPaymentVerified, currentScreen, navigate, refreshUser]);

  // Update dynamic QR & payment settings when selectedPlan or billingCycle changes
  useEffect(() => {
    const clinicId = clinic?._id || user?.clinicId || user?.clinic?._id;
    if (clinicId && selectedPlan?._id && currentScreen === 'renewal_payment') {
      subscriptionPaymentApi.initiatePayment({
        clinicId,
        planId: selectedPlan._id,
        billingCycle
      }).then(res => {
        const initData = res.data || {};
        if (initData.paymentDetails) setPaymentDetails(initData.paymentDetails);
        if (initData.latestPayment) setLatestPayment(initData.latestPayment);
        if (initData.paymentHistory) setPaymentHistory(initData.paymentHistory);
      }).catch(err => {
        console.warn('Could not update payment initiation on plan change:', err);
      });
    }
  }, [selectedPlan?._id, billingCycle, currentScreen]);

  // Handle Carousel Scroll & Pagination Update
  const updateCarouselState = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Approximate card width including gap (card 300px + gap 16px = ~316px)
    const cardWidth = 316;
    const newIdx = Math.round(scrollLeft / cardWidth);
    setActiveSlideIndex(Math.max(0, Math.min(newIdx, totalCardCount - 1)));
  };

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const cardWidth = 316;
    const currentScroll = carouselRef.current.scrollLeft;
    const target = direction === 'left' ? currentScroll - cardWidth : currentScroll + cardWidth;
    carouselRef.current.scrollTo({ left: target, behavior: 'smooth' });
  };

  const scrollToCard = (index) => {
    if (!carouselRef.current) return;
    const cardWidth = 316;
    carouselRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
    setActiveSlideIndex(index);
  };

  // Mouse Drag to Scroll (Desktop Instagram-style drag)
  const handleMouseDown = (e) => {
    if (!carouselRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeftPos(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    carouselRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
  };

  // Calculations
  const formatINR = (amount) => {
    const num = Number(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(num);
  };

  const getBasePrice = (plan, cycle = billingCycle) => {
    if (!plan) return 0;
    if (cycle === 'yearly') {
      return plan.priceYearly || plan.price?.yearly || (plan.priceMonthly ? plan.priceMonthly * 10 : 28790);
    }
    return plan.priceMonthly || plan.price?.monthly || 2999;
  };

  const basePrice = getBasePrice(selectedPlan, billingCycle);
  const totalPayable = basePrice;
  
  const formatExpiryDate = (date) => {
    if (!date) return '09 Sep 2026';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (date) => {
    if (!date) return '09 Sep 2026, 02:15 PM';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '09 Sep 2026, 02:15 PM';
    const dayMonthYear = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dayMonthYear}, ${time}`;
  };

  const calculateNewExpiryDate = () => {
    const base = (currentSub.expiryDate && new Date(currentSub.expiryDate) > new Date())
      ? new Date(currentSub.expiryDate)
      : new Date();
    const durationDays = billingCycle === 'yearly' ? 365 : 30;
    const newDate = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
    return formatExpiryDate(newDate);
  };

  const handleCopy = (text, key, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
    toast.success(`${label} copied to clipboard`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Drag & drop file handler
  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    processProofFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processProofFile(file);
  };

  const processProofFile = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP images or PDF files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must not exceed 5 MB.');
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

  const handleRemoveProof = (e) => {
    e.stopPropagation();
    setProofFile(null);
    setProofPreview('');
    setProofBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Renewal Payment
  const handleSubmitRenewal = async (e) => {
    e.preventDefault();
    if (!utr.trim()) {
      toast.error('Please enter the mandatory UTR / Reference Number.');
      return;
    }

    const clinicId = clinic?._id || user?.clinicId || user?.clinic?._id;
    if (!clinicId || !selectedPlan?._id) {
      toast.error('Missing clinic or plan information. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await subscriptionPaymentApi.submitPayment({
        clinicId,
        planId: selectedPlan._id,
        billingCycle,
        amount: totalPayable,
        utr: utr.trim(),
        transactionId: transactionId.trim() || undefined,
        paymentProofUrl: proofBase64 || undefined
      });

      toast.success('Renewal payment submitted successfully for verification!');
      const newPayment = res.data?.payment || res.data || {};
      setLatestPayment(newPayment);
      setPaymentHistory(prev => [newPayment, ...prev]);

      // Transition immediately to Payment Verification Pending Screen
      setCurrentScreen('payment_pending_verification');

      if (refreshUser) {
        await refreshUser(true).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to submit renewal payment:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to submit renewal payment. Please check your details.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Retry Payment from Rejected State
  const handleRetryPayment = () => {
    setUtr('');
    setTransactionId('');
    setProofFile(null);
    setProofPreview('');
    setProofBase64('');
    setCurrentScreen('renewal_payment');
  };

  // Fallback plans if database plans are still loading
  const displayPlans = plans.length > 0 ? plans : [
    {
      _id: 'plan_starter',
      name: 'AI Starter Clinic',
      code: 'STARTER',
      description: 'Essential features for growing clinics',
      priceMonthly: 999,
      priceYearly: 11988,
      limits: { maxDoctors: 2, maxStaff: 3, maxPatients: 500 },
      features: ['Up to 2 Doctors', 'Up to 3 Staff Members', '500 Patients', 'Appointment Management', 'Basic Reports', 'Email Support']
    },
    {
      _id: 'plan_pro',
      name: 'AI Professional Clinic',
      code: 'PROFESSIONAL',
      description: 'Advanced AI consultation and clinic management',
      priceMonthly: 2999,
      priceYearly: 35988,
      limits: { maxDoctors: 10, maxStaff: 20, maxPatients: 5000 },
      features: ['Up to 10 Doctors', 'Up to 20 Staff Members', '5,000 Patients', 'AI Assistant', 'Advanced Reports', 'Pharmacy Management', 'Laboratory Management', 'Priority Support']
    },
    {
      _id: 'plan_ent',
      name: 'AI Enterprise Clinic',
      code: 'ENTERPRISE',
      description: 'For multi-speciality and large clinics',
      priceMonthly: 4999,
      priceYearly: 59988,
      limits: { maxDoctors: 999999, maxStaff: 999999, maxPatients: 999999 },
      features: ['Unlimited Doctors', 'Unlimited Staff Members', 'Unlimited Patients', 'AI Assistant (Advanced)', 'Advanced Analytics', 'Pharmacy Management', 'Laboratory Management', 'Dedicated Support']
    }
  ];

  const totalCardCount = displayPlans.length + 1; // plans + Custom Plan card

  const getPlanFeatureList = (p) => {
    if (Array.isArray(p.features) && p.features.length > 0 && typeof p.features[0] === 'string' && p.features[0].includes(' ')) {
      return p.features;
    }
    const list = [];
    if (p.limits?.maxDoctors >= 9999) list.push('Unlimited Doctors');
    else if (p.limits?.maxDoctors) list.push(`Up to ${p.limits.maxDoctors} Doctors`);

    if (p.limits?.maxStaff >= 9999) list.push('Unlimited Staff Members');
    else if (p.limits?.maxStaff) list.push(`Up to ${p.limits.maxStaff} Staff Members`);

    if (p.limits?.maxPatients >= 99999) list.push('Unlimited Patients');
    else if (p.limits?.maxPatients) list.push(`${p.limits.maxPatients.toLocaleString()} Patients`);

    if (p.code === 'STARTER') {
      list.push('Appointment Management', 'Basic Reports', 'Email Support');
    } else if (p.code === 'PROFESSIONAL' || p.code === 'PREMIUM') {
      list.push('AI Assistant', 'Advanced Reports', 'Pharmacy Management', 'Laboratory Management', 'Priority Support');
    } else if (p.code === 'ENTERPRISE') {
      list.push('AI Assistant (Advanced)', 'Advanced Analytics', 'Pharmacy Management', 'Laboratory Management', 'Dedicated Support');
    } else {
      list.push('Full Clinic EMR', 'Billing & Invoices', 'Reports & Analytics', 'Standard Support');
    }
    return list;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* ── TOP BILLING HEADER (No Sidebar) ── */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          
          {/* Left: Pehal Brand Logo + AICMS text */}
          <div className="flex items-center gap-3.5">
            <PehalLogo variant="primary" height={32} />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-sm font-black text-slate-900 block leading-tight tracking-tight">AICMS</span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">
                AI-CMS Enterprise
              </span>
            </div>
          </div>

          {/* Right Header Navigation Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Help Button */}
            <button
              type="button"
              onClick={() => setShowCompareModal(true)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <HelpCircle size={14} className="text-slate-500" />
              <span className="hidden sm:inline">Help</span>
            </button>

            {/* 24/7 Support Pill */}
            <a
              href={`tel:${supportPhone}`}
              className="px-3 py-1.5 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl text-xs font-bold text-emerald-800 transition flex items-center gap-1.5 shadow-2xs"
            >
              <HeadsetCustomIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>24/7 Support</span>
            </a>

            {/* Clinic Admin Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DT'}
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-xs font-black text-slate-900 block leading-tight truncate max-w-[120px]">
                    {user?.name || 'Dr. Test Security'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 block leading-none">
                    Clinic Admin
                  </span>
                </div>
                <ChevronRight size={14} className={`text-slate-400 transition-transform duration-150 ${showProfileMenu ? 'rotate-90' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl p-2 shadow-xl z-50 animate-fadeIn">
                  <div className="p-2.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 block truncate">{user?.name || 'Clinic Admin'}</span>
                    <span className="text-[11px] text-slate-400 block truncate">{user?.email || 'admin@clinic.local'}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1.5">
                      {clinic?.name || 'Active Clinic'}
                    </span>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-left"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      {currentScreen === 'subscription_expired' ? (
        /* ══════════════════════════════════════════════════════════════
            SCREEN 0: SUBSCRIPTION EXPIRED WITH SVG CLINIC BACKGROUND
        ══════════════════════════════════════════════════════════════ */
        <main className="flex-1 relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-slate-50/40 via-white to-slate-50/20 animate-fadeIn min-h-[calc(100vh-72px)]">
          
          {/* SVG Decorative Full-Width Clinic Illustration Background */}
          <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden flex items-start lg:items-center justify-center">
            <img
              src={clinicBgSvg}
              alt="AICMS Clinic Environment"
              className="w-full max-w-[1728px] h-full object-cover lg:object-contain object-top lg:object-center opacity-85 sm:opacity-95 pointer-events-none select-none"
            />
          </div>

          {/* Center Subscription Card & Feature Highlights Container */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center justify-center flex-1">
            
            {/* Centered Subscription Expired Card */}
            <div className="w-full max-w-[540px] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-300/40 p-6 sm:p-8 text-center space-y-5 transition-all">
              
              {/* Large Expiration Warning Icon Badge */}
              <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200/70 flex items-center justify-center mx-auto shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white font-black text-lg flex items-center justify-center shadow-xs">
                  !
                </div>
              </div>

              {/* Card Title & Description */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {isExpired ? 'Your subscription has expired' : 'Your subscription is expiring soon'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-[420px] mx-auto leading-relaxed">
                  Please renew your subscription plan to restore access to your clinic management dashboard and premium features.
                </p>
              </div>

              {/* 3 Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {/* 1. Primary Green CTA: Renew Subscription */}
                <button
                  type="button"
                  aria-label="Renew subscription"
                  onClick={() => setCurrentScreen('plan_selection')}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Crown size={16} className="text-white" />
                  <span>Renew Subscription</span>
                  <ArrowRight size={16} />
                </button>

                {/* 2. Secondary Button: View Invoice */}
                <button
                  type="button"
                  aria-label="View invoice"
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText size={15} className="text-slate-600" />
                  <span>View Invoice</span>
                </button>

                {/* 3. Third Button: Contact Support */}
                <button
                  type="button"
                  aria-label="Contact support"
                  onClick={() => setShowContactModal(true)}
                  className="w-full py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Headphones size={15} className="text-slate-600" />
                  <span>Contact Support</span>
                </button>
              </div>

              {/* Need Assistance Informational Box */}
              <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">
                    Need Assistance?
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
                    Our team is here to help you with plan selection, payments, or any billing related queries.
                  </p>
                </div>
              </div>

            </div>

            {/* Continue Your Journey with AICMS */}
            <div className="w-full max-w-5xl mt-12 sm:mt-16 text-center space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Continue Your Journey with AICMS
              </h2>
              <p className="text-xs text-slate-500 font-medium max-w-lg mx-auto">
                Restore access and keep providing the best care to your patients.
              </p>

              {/* 4 Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-left">
                {/* Feature 1: Manage Patients */}
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:border-slate-300 transition">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-tight">
                      Manage Patients
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                      Keep patient records safe and organized
                    </p>
                  </div>
                </div>

                {/* Feature 2: Book Appointments */}
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:border-slate-300 transition">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-tight">
                      Book Appointments
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                      Continue seamless appointment scheduling
                    </p>
                  </div>
                </div>

                {/* Feature 3: Generate Reports */}
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:border-slate-300 transition">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-tight">
                      Generate Reports
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                      Access insights and grow your clinic
                    </p>
                  </div>
                </div>

                {/* Feature 4: All-in-One Solution */}
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:border-slate-300 transition">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Heart size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-tight">
                      All-in-One Solution
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                      Your complete clinic management platform
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Security Footer inside Screen 0 */}
          <div className="relative z-10 bg-white/90 backdrop-blur-md border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-7xl mx-auto">
              <TrustBadgesSection />
            </div>
          </div>

        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 1: INSTAGRAM-STYLE PLAN CAROUSEL & RENEWAL SUMMARY
        ══════════════════════════════════════════════════════════════ */}
        {currentScreen === 'plan_selection' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Breadcrumb & Title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentScreen('subscription_expired')}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center shadow-2xs transition cursor-pointer shrink-0"
                title="Back to Subscription Status"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <span>Billing</span>
                  <ChevronRight size={12} />
                  <span className="cursor-pointer hover:text-slate-600" onClick={() => setCurrentScreen('subscription_expired')}>Subscription</span>
                  <ChevronRight size={12} />
                  <span className="text-slate-700">Renew</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                  Renew Your Subscription
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Choose a plan and billing cycle to continue using your AICMS clinic services.
                </p>
              </div>
            </div>

            {/* Top 2 Cards: Subscription Expired Warning + Keep Your Clinic Running */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left Top Card: Subscription Status (Col 7) */}
              <div className="lg:col-span-7 bg-rose-50/70 border border-rose-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 font-bold text-lg">
                    !
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-rose-950">
                      {isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                    </h3>
                    <p className="text-xs text-rose-800 font-medium mt-0.5 leading-relaxed max-w-md">
                      {isExpired
                        ? `Your subscription expired on ${formatExpiryDate(currentSub.expiryDate)}. Renew now to restore full access to your clinic.`
                        : `Your subscription expires on ${formatExpiryDate(currentSub.expiryDate)}. Renew now to continue your clinic services without interruption.`}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-center justify-center p-3 bg-white border border-rose-200 rounded-2xl shadow-2xs shrink-0 text-center">
                  <Calendar size={16} className="text-rose-600 mb-1" />
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    {isExpired ? 'Expired on' : 'Expires on'}
                  </span>
                  <span className="text-xs font-black text-rose-700 mt-0.5">
                    {formatExpiryDate(currentSub.expiryDate)}
                  </span>
                </div>
              </div>

              {/* Right Top Card: Keep Your Clinic Running (Col 5) */}
              <div className="lg:col-span-5 bg-emerald-50/60 border border-emerald-200/70 rounded-3xl p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      Keep Your Clinic Running
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
                      Renew your subscription to continue accessing all your data, patients, appointments and premium features.
                    </p>
                  </div>
                </div>

                {/* Stylized Browser Graphic */}
                <div className="hidden sm:flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border border-emerald-100 shadow-2xs shrink-0">
                  <div className="w-12 h-9 bg-emerald-50 rounded-lg flex items-center justify-center relative mb-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <ArrowRight size={11} className="-rotate-45" />
                    </div>
                  </div>
                  <span className="text-[8.5px] font-black text-emerald-800">Auto-Extend</span>
                </div>
              </div>

            </div>

            {/* ── DESKTOP SPLIT: HORIZONTAL CAROUSEL (Left) + RENEWAL SUMMARY (Right) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ==================== LEFT COLUMN: PLAN CAROUSEL (Col 8) ==================== */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Section Header & Segmented Monthly/Yearly Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Select a Plan</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Swipe to explore available plans and choose the one that fits your clinic's needs.
                    </p>
                  </div>

                  {/* Segmented Control */}
                  <div className="bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        billingCycle === 'monthly'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                        billingCycle === 'yearly'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Yearly</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
                        Save up to 20%
                      </span>
                    </button>
                  </div>
                </div>

                {/* ── INSTAGRAM-STYLE HORIZONTAL SWIPABLE CAROUSEL ── */}
                <div className="relative group/carousel">
                  
                  {/* Left Floating Arrow Button */}
                  <button
                    type="button"
                    onClick={() => scrollCarousel('left')}
                    disabled={!canScrollLeft}
                    aria-label="Previous plan"
                    className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-9 h-9 rounded-full bg-white border border-slate-200/90 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-md flex items-center justify-center transition cursor-pointer disabled:opacity-0 disabled:pointer-events-none`}
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>

                  {/* Right Floating Arrow Button */}
                  <button
                    type="button"
                    onClick={() => scrollCarousel('right')}
                    disabled={!canScrollRight}
                    aria-label="Next plan"
                    className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-9 h-9 rounded-full bg-white border border-slate-200/90 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-md flex items-center justify-center transition cursor-pointer disabled:opacity-0 disabled:pointer-events-none`}
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>

                  {/* Horizontal Scroll Area */}
                  <div
                    ref={carouselRef}
                    onScroll={updateCarouselState}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 pt-1 px-1 cursor-grab active:cursor-grabbing select-none"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    
                    {displayPlans.map((plan, idx) => {
                      const isSelected = selectedPlan?._id === plan._id;
                      const isCurrent = currentSub.planId?._id === plan._id || currentSub.planId === plan._id;
                      const monthlyP = plan.priceMonthly || plan.price?.monthly || 999;
                      const yearlyP = plan.priceYearly || plan.price?.yearly || (monthlyP * 10);
                      const featuresList = getPlanFeatureList(plan);

                      const isPro = plan.code === 'PROFESSIONAL' || plan.code === 'PREMIUM';
                      const isEnt = plan.code === 'ENTERPRISE';

                      return (
                        <div
                          key={plan._id || idx}
                          onClick={() => setSelectedPlan(plan)}
                          className={`w-[290px] sm:w-[300px] min-w-[290px] sm:min-w-[300px] snap-start bg-white rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 relative ${
                            isSelected
                              ? 'border-2 border-emerald-500 shadow-md ring-4 ring-emerald-50 bg-white'
                              : 'border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm'
                          }`}
                        >
                          {/* Current Plan Badge */}
                          {isCurrent && (
                            <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                              Current Plan
                            </span>
                          )}

                          <div className="space-y-3.5">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs ${
                              isPro ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              isEnt ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                              'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {isPro ? <Crown size={20} /> : isEnt ? <Building2 size={20} /> : <Layers size={20} />}
                            </div>

                            {/* Plan Name & Description */}
                            <div>
                              <h3 className="text-base font-black text-slate-900 leading-tight">
                                {plan.name}
                              </h3>
                              <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug min-h-[30px]">
                                {plan.description || 'Essential clinical operating toolkit.'}
                              </p>
                            </div>

                            {/* Pricing */}
                            <div className="pt-1 pb-2 border-b border-slate-100">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 tracking-tight">
                                  {formatINR(billingCycle === 'yearly' ? (yearlyP / 12) : monthlyP)}
                                </span>
                                <span className="text-xs font-bold text-slate-400">/month</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[11px] font-bold text-slate-400">
                                  {formatINR(yearlyP)} per year
                                </span>
                                {billingCycle === 'yearly' && (
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Save 20%
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Checklist */}
                            <div className="space-y-2 pt-1">
                              {featuresList.map((feat, fIdx) => (
                                <div key={fIdx} className="flex items-start gap-2">
                                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 font-black">
                                    <Check size={11} strokeWidth={3} />
                                  </div>
                                  <span className="text-xs text-slate-700 font-semibold leading-tight">
                                    {feat}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Bottom Select Action */}
                          <div className="pt-5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan); }}
                              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-black'
                                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={13} strokeWidth={3} />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Select Plan</span>
                              )}
                            </button>
                          </div>

                        </div>
                      );
                    })}

                    {/* Custom Plan Card in Carousel */}
                    <div className="w-[290px] sm:w-[300px] min-w-[290px] sm:min-w-[300px] snap-start bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                      <div className="space-y-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-2xs">
                          <Settings size={20} />
                        </div>

                        <div>
                          <h3 className="text-base font-black text-slate-900 leading-tight">
                            Custom Plan
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug min-h-[30px]">
                            Tailored solution for your clinic
                          </p>
                        </div>

                        <div className="pt-1 pb-2 border-b border-slate-100">
                          <span className="text-2xl font-black text-slate-900 block tracking-tight">
                            Contact Us
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 block mt-1">
                            Get a custom plan for your clinic
                          </span>
                        </div>

                        <div className="space-y-2 pt-1">
                          {[
                            'Custom feature limits',
                            'Multi-location support',
                            'Priority onboarding',
                            'Dedicated account manager',
                            'Custom integrations',
                            'SLA support'
                          ].map((feat, fIdx) => (
                            <div key={fIdx} className="flex items-start gap-2">
                              <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 font-black">
                                <Check size={11} strokeWidth={3} />
                              </div>
                              <span className="text-xs text-slate-700 font-semibold leading-tight">
                                {feat}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-5">
                        <button
                          type="button"
                          onClick={() => setShowContactModal(true)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 transition shadow-2xs flex items-center justify-center cursor-pointer"
                        >
                          Contact Sales
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Pagination Dots (● ○ ○ ○) */}
                  <div className="flex items-center justify-center gap-1.5 pt-3">
                    {Array.from({ length: totalCardCount }).map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        onClick={() => scrollToCard(dotIdx)}
                        aria-label={`Go to slide ${dotIdx + 1}`}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          activeSlideIndex === dotIdx
                            ? 'w-6 bg-emerald-600'
                            : 'w-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>

                </div>

              </div>

              {/* ==================== RIGHT COLUMN: RENEWAL SUMMARY & INFO (Col 4) ==================== */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Renewal Summary Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                  
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Renewal Summary
                  </h3>

                  {/* Selected Plan Row */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-bold">Selected Plan</span>
                    <span className="font-black text-slate-900">{selectedPlan?.name || 'AI Professional Clinic'}</span>
                  </div>

                  {/* Billing Cycle Row with Change action */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">Billing Cycle</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 capitalize">{billingCycle}</span>
                      <button
                        type="button"
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black hover:bg-emerald-100 transition cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <span>Plan Price ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})</span>
                      <span className="font-bold text-slate-900">{formatINR(basePrice)}</span>
                    </div>
                  </div>

                  {/* Total Payable */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Total Payable</span>
                    <span className="text-2xl font-black text-emerald-600 tracking-tight">
                      {formatINR(totalPayable)}
                    </span>
                  </div>

                  {/* Renewal Period & Extension Inset Card */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} className="text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Renewal Period</span>
                        <span className="font-black text-slate-800 block">
                          {billingCycle === 'yearly' ? '1 Year (365 Days)' : '1 Month (30 Days)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">New Expected Expiry Date</span>
                        <span className="font-black text-slate-900 block">
                          {calculateNewExpiryDate()}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Plan Change Information Card */}
                <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    i
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      Plan Change Information
                    </h4>
                    <p className="text-[11px] text-slate-600 font-medium mt-1 leading-relaxed">
                      Your new plan will become active after successful payment verification.
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Need Help Choosing a Plan? Banner */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">
                    Need help choosing a plan?
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Compare plan features or contact our team for a personalized recommendation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCompareModal(true)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black rounded-xl transition shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <BarChart3 size={14} className="text-emerald-600" />
                <span>Compare Plan Features</span>
              </button>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentScreen('subscription_expired')}
                className="px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black transition shadow-2xs cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setCurrentScreen('renewal_payment')}
                className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md hover:shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Payment</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Security Footer Badges */}
            <TrustBadgesSection />

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 2: RENEWAL PAYMENT
        ══════════════════════════════════════════════════════════════ */}
        {currentScreen === 'renewal_payment' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Breadcrumb & Title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentScreen('plan_selection')}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center shadow-2xs transition cursor-pointer shrink-0"
                title="Back to Plan Selection"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <span>Billing</span>
                  <ChevronRight size={12} />
                  <span>Subscription</span>
                  <ChevronRight size={12} />
                  <span>Renew</span>
                  <ChevronRight size={12} />
                  <span className="text-slate-700">Payment</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                  Renew Your Subscription
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Complete your renewal payment to continue using your AICMS clinic services.
                </p>
              </div>
            </div>

            {/* Status Alert Banner */}
            {isPaymentRejected ? (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <X size={20} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-rose-950">Renewal Payment Not Verified</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 uppercase">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 font-medium">
                      Your previous renewal payment could not be verified by our team. Please review the details below and submit a new payment attempt.
                    </p>
                  </div>
                </div>

                <div className="bg-white/80 border border-rose-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">Super Admin Rejection Reason:</span>
                  <p className="text-xs font-bold text-slate-900">
                    {latestPayment?.rejectionReason || 'Payment amount does not match the selected plan or UTR reference invalid.'}
                  </p>
                  {latestPayment?.rejectionNotes && (
                    <p className="text-[11px] text-slate-600 mt-1">{latestPayment.rejectionNotes}</p>
                  )}
                </div>
              </div>
            ) : isPaymentPendingVerification ? (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-md flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Clock size={24} className="animate-pulse" />
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">
                    Verification In Progress
                  </span>
                  <h3 className="text-lg font-black">Renewal Payment Under Review</h3>
                  <p className="text-xs text-blue-100 font-medium leading-relaxed">
                    Your renewal payment (UTR: <span className="font-mono font-bold text-white">{latestPayment?.utr}</span>) has been submitted successfully and is currently being verified by our team.
                  </p>
                </div>
              </div>
            ) : isPaymentVerified ? (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">Subscription Renewed Successfully!</h3>
                    <p className="text-xs text-emerald-100 font-medium">
                      Your payment has been verified and your subscription has been extended.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-black rounded-xl shadow transition"
                >
                  Go to Clinic Dashboard
                </button>
              </div>
            ) : (
              <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-rose-950">
                      {isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                    </h4>
                    <p className="text-[11px] text-rose-800 font-medium mt-0.5">
                      {isExpired
                        ? `Your subscription expired on ${formatExpiryDate(currentSub.expiryDate)}. Complete the renewal payment to restore your clinic access.`
                        : `Your subscription expires on ${formatExpiryDate(currentSub.expiryDate)}. Renew now to continue your clinic services without interruption.`}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-black text-rose-700 shadow-2xs">
                  <Calendar size={13} />
                  <span>{isExpired ? 'Expired on' : 'Expires on'} {formatExpiryDate(currentSub.expiryDate)}</span>
                </div>
              </div>
            )}

            {/* ── TWO-COLUMN PAYMENT LAYOUT ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: QR + Bank Details + Form (Col 7) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Payment Methods */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative items-stretch">
                    
                    {/* Scan & Pay (UPI) */}
                    <div className="flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <Zap size={15} />
                          </div>
                          <h3 className="text-sm font-black text-slate-900">Scan & Pay (UPI)</h3>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          Scan this QR code using any UPI app. The amount will be filled automatically.
                        </p>
                      </div>

                      {/* QR Box */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-2xs">
                        <div className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-3">
                          {qrImageSrc ? (
                            <img
                              src={qrImageSrc}
                              alt="UPI Renewal Payment QR"
                              className="w-40 h-40 object-contain rounded-md"
                            />
                          ) : (
                            <div className="w-40 h-40 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                              QR Code Loading...
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white px-2 py-0.5 rounded shadow border border-slate-100 flex items-center">
                              <span className="text-[9px] font-black tracking-widest text-emerald-800">UPI</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-xl font-black text-emerald-600 block tracking-tight">
                          {formatINR(totalPayable)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 block capitalize">
                          {selectedPlan?.name || 'AI Premium Clinic'} - {billingCycle} Renewal
                        </span>
                        <span className="text-[10px] font-medium text-blue-600 block pt-1">
                          • This QR code is valid for this renewal payment only.
                        </span>
                      </div>

                      {/* UPI ID Field with Copy */}
                      <div className="space-y-1">
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
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supported UPI Apps</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">GPay</span>
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">PhonePe</span>
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">Paytm</span>
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">BHIM</span>
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500">Any UPI App</span>
                        </div>
                      </div>
                    </div>

                    {/* Pay via Bank Transfer */}
                    <div className="flex flex-col justify-between space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Building2 size={15} />
                          </div>
                          <h3 className="text-sm font-black text-slate-900">Pay via Bank Transfer</h3>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          You can also transfer the exact amount to our bank account.
                        </p>
                      </div>

                      {/* Bank Details List */}
                      <div className="space-y-2">
                        {[
                          { label: 'Account Name', val: accountName, key: 'accName' },
                          { label: 'Bank Name', val: bankName, key: 'bankName' },
                          { label: 'Account Number', val: accountNumber, key: 'accNo', mono: true },
                          { label: 'IFSC Code', val: ifscCode, key: 'ifsc', mono: true },
                          { label: 'Branch', val: branch, key: 'branch' }
                        ].map((b, idx) => (
                          <div key={idx} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{b.label}</span>
                              <span className={`text-xs font-black text-slate-800 block ${b.mono ? 'font-mono' : ''}`}>{b.val}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(b.val, b.key, b.label)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                              title={`Copy ${b.label}`}
                            >
                              {copiedKey === b.key ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[10.5px] text-slate-600 space-y-0.5">
                        <span className="font-bold text-blue-800 block">Note:</span>
                        <span>Transfer the exact total of <strong className="text-slate-900">{formatINR(totalPayable)}</strong>. Enter your UTR reference below once completed.</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Transaction Details & Upload Form */}
                <form onSubmit={handleSubmitRenewal} className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                  
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                        Payment Completed? Enter your transaction details
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        After making the payment, please provide the transaction details below.
                      </p>
                    </div>
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    
                    {/* UTR Number */}
                    <div className="space-y-1 sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-800">
                        UTR / Reference Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="Enter UTR or Reference Number"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition outline-hidden"
                      />
                    </div>

                    {/* Transaction ID */}
                    <div className="space-y-1 sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Transaction ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter Transaction ID"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition outline-hidden"
                      />
                    </div>

                    {/* Payment Date */}
                    <div className="space-y-1 sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition outline-hidden"
                      />
                    </div>

                  </div>

                  {/* Payment Proof Upload Area */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Payment Proof (Optional)
                    </label>

                    {!proofFile ? (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex items-center justify-between gap-4 ${
                          isDragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
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
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <UploadCloud size={18} />
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-700 block">
                              Drag &amp; drop your file here, or <span className="text-emerald-600 underline">click to browse</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Supported formats: JPG, JPEG, PNG, PDF (Max 5 MB)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 shrink-0"
                        >
                          Choose File
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {proofFile.type === 'application/pdf' ? (
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 font-bold text-xs">
                              PDF
                            </div>
                          ) : (
                            <img
                              src={proofPreview}
                              alt="Proof Preview"
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate block">
                              {proofFile.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {(proofFile.size / 1024 / 1024).toFixed(2)} MB • <span className="text-emerald-600 font-bold">✓ Attached</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveProof}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                            title="Remove file"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={submitting || !utr.trim()}
                      className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-2xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Renewal Payment...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight size={16} className="-rotate-45" />
                          <span>Submit Renewal Payment</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                      <Lock size={12} className="text-emerald-600" />
                      <span>Your payment details are secure and encrypted</span>
                    </div>
                  </div>

                </form>

              </div>

              {/* Right Column: Summary & Support (Col 5) */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* Renewal Plan Summary Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Renewal Plan Summary
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('plan_selection')}
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black rounded-xl transition cursor-pointer"
                    >
                      Change Plan
                    </button>
                  </div>

                  {/* Plan Badge */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                      <Crown size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{selectedPlan?.name || 'AI Premium Clinic'}</h4>
                      <p className="text-[10.5px] text-slate-500 font-medium">
                        {selectedPlan?.description || 'Advanced AI consultation and clinic management'}
                      </p>
                    </div>
                  </div>

                  {/* Monthly / Yearly Switch Indicator */}
                  <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`flex-1 py-1 text-center rounded-lg text-xs font-bold transition ${
                        billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`flex-1 py-1 text-center rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                        billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
                      }`}
                    >
                      <span>Yearly</span>
                      <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded-full">Save 20%</span>
                    </button>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2.5 pt-1 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Plan Price ({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})</span>
                      <span className="font-bold text-slate-900">{formatINR(basePrice)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-black text-slate-900">Total Payable</span>
                      <span className="text-xl font-black text-emerald-600 tracking-tight">
                        {formatINR(totalPayable)}
                      </span>
                    </div>
                  </div>

                  {/* Expected Extension Period */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} className="text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Renewal Period</span>
                        <span className="font-black text-slate-800 block">
                          {billingCycle === 'yearly' ? '1 Year (365 Days)' : '1 Month (30 Days)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">New Expected Expiry Date</span>
                        <span className="font-black text-slate-900 block">
                          {calculateNewExpiryDate()}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 block font-medium pt-1">
                      Your subscription will be extended after payment verification.
                    </span>
                  </div>

                </div>

                {/* Why Renew Your Subscription? Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Settings size={15} />
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Why Renew Your Subscription?
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {[
                      'Scan the QR code or transfer the exact amount.',
                      'Complete the payment using your UPI or banking app.',
                      'Enter your UTR / Reference Number below.',
                      'Optionally upload your payment receipt.',
                      'Submit the renewal payment.',
                      'Our team will verify your payment.',
                      'Your subscription will be renewed after verification.'
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-snug">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Need Help? Support Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <HeadsetCustomIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">Need Help?</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Our team is here to help you with any payment related queries.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <a
                      href={`mailto:${supportEmail}`}
                      className="flex items-center gap-2 font-bold text-slate-700 hover:text-emerald-700 transition"
                    >
                      <Mail size={13} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{supportEmail}</span>
                    </a>
                    <a
                      href={`tel:${supportPhone}`}
                      className="flex items-center gap-2 font-bold text-slate-700 hover:text-emerald-700 transition"
                    >
                      <Phone size={13} className="text-emerald-600 shrink-0" />
                      <span>{supportPhone}</span>
                    </a>
                  </div>

                  <a
                    href={`mailto:${supportEmail}?subject=AICMS%20Renewal%20Assistance%20-${clinic?.code || ''}`}
                    className="w-full inline-flex items-center justify-center py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs"
                  >
                    Contact Support
                  </a>
                </div>

              </div>

            </div>

            {/* Security Footer Badges */}
            <TrustBadgesSection />

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 3: RENEWAL PAYMENT VERIFICATION PENDING
        ══════════════════════════════════════════════════════════════ */}
        {currentScreen === 'payment_pending_verification' && (
          <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto py-2 sm:py-4">
            
            {/* Main Centered Status Card */}
            <div className="relative bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-200/40 p-6 sm:p-10 overflow-hidden">
              
              {/* Soft Decorative Background Elements (Watermark Atmosphere) */}
              <div className="absolute left-4 top-4 bottom-4 w-48 pointer-events-none opacity-20 hidden lg:flex flex-col justify-between select-none">
                <div className="border border-emerald-200 rounded-2xl p-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-xs">+</div>
                  <span className="text-[10px] font-black text-slate-400 tracking-wider block mt-2">CLINIC<br/>OUR PRIORITY</span>
                </div>
              </div>
              <div className="absolute right-6 top-8 pointer-events-none opacity-30 hidden lg:block select-none text-right">
                <span className="font-serif italic text-emerald-700/80 text-lg font-bold tracking-wide block rotate-6">
                  Better<br/>Healthcare<br/>Together
                </span>
              </div>

              {/* STATE 1: VERIFIED */}
              {isPaymentVerified ? (
                <div className="text-center space-y-6 py-6 animate-fadeIn relative z-10">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
                    <CheckCircle2 size={44} strokeWidth={2.5} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      ✓ Payment Verified Successfully
                    </h2>
                    <p className="text-sm sm:text-base font-bold text-emerald-700">
                      Your renewal payment has been verified by AICMS.
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                      Your subscription is now active and your clinic access has been restored.
                    </p>
                  </div>

                  {/* Auto Redirect Progress Bar */}
                  <div className="max-w-md mx-auto bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-800">
                      <RefreshCw size={14} className="animate-spin text-emerald-600" />
                      <span>Redirecting you to your clinic dashboard...</span>
                    </div>
                    <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full animate-[pulse_1s_infinite] w-full" />
                    </div>
                  </div>

                  {/* Verified Summary Card */}
                  <div className="max-w-md mx-auto bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 text-left space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Plan</span>
                      <span className="font-black text-slate-900">{latestPayment?.planId?.name || selectedPlan?.name || 'AI Premium Clinic'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Renewal Period</span>
                      <span className="font-black text-slate-900 capitalize">{latestPayment?.billingCycle || billingCycle} (30 / 365 Days)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">New Expiry Date</span>
                      <span className="font-black text-emerald-700">{formatExpiryDate(clinic?.subscription?.expiryDate || latestPayment?.verifiedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Status</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="py-3.5 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer"
                    >
                      Go to Clinic Dashboard Now
                    </button>
                  </div>
                </div>
              ) : isPaymentRejected ? (
                /* STATE 2: REJECTED */
                <div className="text-center space-y-6 py-4 animate-fadeIn relative z-10">
                  <div className="w-20 h-20 rounded-full bg-rose-100 border-2 border-rose-400 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                    <X size={44} strokeWidth={2.5} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Payment Could Not Be Verified
                    </h2>
                    <p className="text-sm font-bold text-rose-700">
                      Your renewal payment could not be verified by our team.
                    </p>
                  </div>

                  {/* Rejection Reason Card */}
                  <div className="max-w-xl mx-auto bg-rose-50/80 border border-rose-200 rounded-2xl p-5 text-left space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">Rejection Reason:</span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                      {latestPayment?.rejectionReason || 'The submitted transaction reference could not be verified in bank records.'}
                    </p>
                    {latestPayment?.rejectionNotes && (
                      <p className="text-xs text-slate-600 pt-1 border-t border-rose-200/60 mt-2">
                        <strong>Super Admin Notes:</strong> {latestPayment.rejectionNotes}
                      </p>
                    )}
                  </div>

                  {/* Rejected Details List */}
                  <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-left">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Payment Amount:</span>
                      <span className="font-bold text-slate-900">{formatINR(latestPayment?.amount || totalPayable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">UTR Reference:</span>
                      <span className="font-mono font-bold text-slate-900">{latestPayment?.utr || '—'}</span>
                    </div>
                    {latestPayment?.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Transaction ID:</span>
                        <span className="font-mono font-bold text-slate-900">{latestPayment.transactionId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Submitted Date:</span>
                      <span className="font-bold text-slate-900">{formatDateTime(latestPayment?.submittedAt)}</span>
                    </div>
                    {latestPayment?.rejectedAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Rejection Date:</span>
                        <span className="font-bold text-rose-700">{formatDateTime(latestPayment.rejectedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('plan_selection')}
                      className="py-3 px-6 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black rounded-2xl shadow-2xs transition cursor-pointer"
                    >
                      Change Plan
                    </button>
                    <button
                      type="button"
                      onClick={handleRetryPayment}
                      className="py-3 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md transition cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw size={14} />
                      <span>Retry Payment</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STATE 3: PENDING VERIFICATION (Matches Reference Image Exactly) */
                <div className="space-y-8 relative z-10">
                  
                  {/* Top Status Icon + Sparkles */}
                  <div className="text-center space-y-4">
                    
                    {/* Glowing Amber Clock Badge */}
                    <div className="relative inline-flex items-center justify-center">
                      {/* Decorative Sparkle Stars around badge */}
                      <span className="absolute -top-1 -right-4 text-amber-400 text-sm animate-pulse">✦</span>
                      <span className="absolute -bottom-1 -left-4 text-amber-400 text-xs animate-pulse">✧</span>
                      <span className="absolute top-2 -left-6 text-amber-300 text-xs">✦</span>
                      <span className="absolute -top-3 left-3 text-amber-300 text-xs">✧</span>

                      <div className="w-20 h-20 rounded-full bg-amber-100/90 border-2 border-amber-300/80 flex items-center justify-center shadow-lg shadow-amber-100/50">
                        <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Clock size={28} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    {/* Main Titles */}
                    <div className="space-y-1.5 max-w-xl mx-auto">
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Payment Submitted Successfully!
                      </h1>
                      <h2 className="text-base sm:text-lg font-bold text-slate-800">
                        Your payment is under verification
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed pt-1">
                        We have received your payment details. Our team is verifying your payment.<br className="hidden sm:inline" />
                        You will receive a notification once the payment is verified and your subscription is renewed.
                      </p>
                    </div>

                  </div>

                  {/* ── 4-STAGE PROGRESS TRACKER ── */}
                  <div className="py-2">
                    
                    {/* Desktop Horizontal Tracker */}
                    <div className="hidden sm:grid sm:grid-cols-4 gap-2 relative items-start">
                      
                      {/* Connecting Lines Behind Steps */}
                      <div className="absolute top-4 left-[12%] right-[12%] h-0.5 -z-0">
                        <div className="w-full h-full flex">
                          {/* Step 1 to 2: Green solid */}
                          <div className="w-1/3 bg-emerald-500 h-0.5"></div>
                          {/* Step 2 to 3: Slate dashed */}
                          <div className="w-1/3 border-t-2 border-dashed border-slate-300 h-0.5"></div>
                          {/* Step 3 to 4: Slate dashed */}
                          <div className="w-1/3 border-t-2 border-dashed border-slate-200 h-0.5"></div>
                        </div>
                      </div>

                      {/* Stage 1: Payment Details Submitted */}
                      <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shadow-xs ring-4 ring-white">
                          <Check size={16} strokeWidth={3} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">Payment Details</h4>
                          <span className="text-[11px] font-bold text-emerald-700 block">Submitted</span>
                          <span className="text-[10px] font-semibold text-emerald-800 block mt-0.5">
                            {formatDateTime(latestPayment?.submittedAt || latestPayment?.paymentDate || new Date())}
                          </span>
                        </div>
                      </div>

                      {/* Stage 2: Under Verification */}
                      <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-500 text-amber-700 flex items-center justify-center font-black shadow-xs ring-4 ring-white animate-pulse">
                          <Clock size={15} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">Under Verification</h4>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            Our team is verifying<br/>your payment
                          </span>
                        </div>
                      </div>

                      {/* Stage 3: Payment Verified */}
                      <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center font-black shadow-2xs ring-4 ring-white">
                          <Check size={14} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-700">Payment Verified</h4>
                          <span className="text-[11px] text-slate-400 font-medium block">
                            You will get notified
                          </span>
                        </div>
                      </div>

                      {/* Stage 4: Subscription Renewed */}
                      <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center font-black shadow-2xs ring-4 ring-white">
                          <Crown size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-700">Subscription Renewed</h4>
                          <span className="text-[11px] text-slate-400 font-medium block">
                            Access will be restored<br/>automatically
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Mobile Vertical Tracker */}
                    <div className="sm:hidden space-y-4 border-l-2 border-slate-200 pl-4 ml-2">
                      <div className="relative">
                        <div className="absolute -left-[25px] top-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs">
                          ✓
                        </div>
                        <h4 className="text-xs font-black text-slate-900">Payment Details Submitted</h4>
                        <span className="text-[10px] text-emerald-700 font-bold block">
                          {formatDateTime(latestPayment?.submittedAt || latestPayment?.paymentDate || new Date())}
                        </span>
                      </div>

                      <div className="relative pt-2">
                        <div className="absolute -left-[25px] top-2 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs animate-pulse">
                          ◷
                        </div>
                        <h4 className="text-xs font-black text-slate-900">Under Verification</h4>
                        <span className="text-[10px] text-slate-500 block">Our team is verifying your payment.</span>
                      </div>

                      <div className="relative pt-2">
                        <div className="absolute -left-[25px] top-2 w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-xs">
                          ○
                        </div>
                        <h4 className="text-xs font-black text-slate-600">Payment Verified</h4>
                        <span className="text-[10px] text-slate-400 block">Pending verification</span>
                      </div>

                      <div className="relative pt-2">
                        <div className="absolute -left-[25px] top-2 w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-xs">
                          ○
                        </div>
                        <h4 className="text-xs font-black text-slate-600">Subscription Renewed</h4>
                        <span className="text-[10px] text-slate-400 block">Access will be restored</span>
                      </div>
                    </div>

                  </div>

                  {/* ── TWO-COLUMN INFORMATION GRID (Payment Information + What Happens Next & Help) ── */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                    
                    {/* Left Card: Payment Information (Col 6) */}
                    <div className="md:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                      
                      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <FileText size={18} className="text-blue-600" />
                        <h3 className="text-sm font-black text-slate-900">Payment Information</h3>
                      </div>

                      {/* Real Payment Details Rows */}
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Transaction Reference (UTR)</span>
                          <span className="font-mono font-black text-slate-900">
                            {latestPayment?.utr || utr || 'AXI512389047'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Payment Amount</span>
                          <span className="font-black text-slate-900">
                            {formatINR(latestPayment?.amount || totalPayable)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Plan</span>
                          <span className="font-black text-slate-900">
                            {latestPayment?.planId?.name || selectedPlan?.name || 'AI Premium Clinic'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Billing Cycle</span>
                          <span className="font-black text-slate-900 capitalize">
                            {latestPayment?.billingCycle || billingCycle || 'Monthly'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Payment Date</span>
                          <span className="font-black text-slate-900">
                            {formatDateTime(latestPayment?.paymentDate || latestPayment?.submittedAt || new Date())}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Payment Method</span>
                          <span className="font-black text-slate-900">
                            {latestPayment?.metadata?.paymentMethod || (proofFile || latestPayment?.paymentProofUrl ? 'UPI (PhonePe)' : 'UPI (Scan & Pay)')}
                          </span>
                        </div>

                        {latestPayment?.transactionId && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Transaction ID</span>
                            <span className="font-mono font-bold text-slate-900">
                              {latestPayment.transactionId}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Note inside Payment Info */}
                      <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
                        <Lock size={13} className="text-emerald-600 shrink-0" />
                        <span>Verified securely by AICMS platform administrators</span>
                      </div>

                    </div>

                    {/* Right Column: What Happens Next + Need Help? (Col 6) */}
                    <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                      
                      {/* Card 1: What happens next? (Blue Card) */}
                      <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            i
                          </div>
                          <h3 className="text-xs sm:text-sm font-black text-blue-950">
                            What happens next?
                          </h3>
                        </div>

                        <div className="space-y-2.5 text-xs">
                          {[
                            'Our team will verify your payment details',
                            'You will receive an email and in-app notification',
                            'Once verified, your subscription will be renewed',
                            'Your clinic access will automatically be restored'
                          ].map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2.5">
                              <div className="w-5 h-5 rounded-full border border-blue-300 bg-white text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>
                              <span className="text-slate-700 font-medium text-[11px] leading-snug">
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card 2: Need Help? (Green Card) */}
                      <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={18} className="text-emerald-700" />
                          <h3 className="text-xs sm:text-sm font-black text-slate-900">
                            Need Help?
                          </h3>
                        </div>

                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          If you have any questions or need assistance, our support team is here to help.
                        </p>

                        <div>
                          <a
                            href={`tel:${supportPhone}`}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black shadow-2xs transition"
                          >
                            <HeadsetCustomIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Contact Support</span>
                          </a>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* ── ACTION BUTTONS ── */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('subscription_expired')}
                      className="py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Billing</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPaymentDetailsModal(true)}
                      className="py-3 px-6 rounded-2xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={14} className="text-emerald-600" />
                      <span>View Payment Details</span>
                    </button>
                  </div>

                </div>
              )}

            </div>

            {/* Security Badges */}
            <TrustBadgesSection />

          </div>
        )}

      </main>
    )}

      {/* ── MODAL: VIEW PAYMENT DETAILS AUDIT MODAL ── */}
      {showPaymentDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200/90 shadow-2xl p-6 sm:p-8 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowPaymentDetailsModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Renewal Payment Details</h3>
                <p className="text-xs text-slate-500 font-medium">Submission Record &amp; Verification Status</p>
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verification Status</span>
                <span className={`text-xs font-black block mt-0.5 ${
                  latestPayment?.status === 'VERIFIED' ? 'text-emerald-700' :
                  latestPayment?.status === 'REJECTED' ? 'text-rose-700' :
                  'text-amber-700'
                }`}>
                  {latestPayment?.status === 'VERIFIED' ? '✓ Verified by Super Admin' :
                   latestPayment?.status === 'REJECTED' ? '✕ Rejected - Repayment Required' :
                   '◷ Pending Super Admin Verification'}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                latestPayment?.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                latestPayment?.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {latestPayment?.status || 'PENDING_VERIFICATION'}
              </span>
            </div>

            {/* Detailed Table */}
            <div className="space-y-2 text-xs border border-slate-100 rounded-2xl p-4 bg-white divide-y divide-slate-100">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Attempt Reference:</span>
                <span className="font-mono font-bold text-slate-900">
                  {latestPayment?._id ? `AICMS-REN-${latestPayment._id.slice(-6).toUpperCase()}` : 'AICMS-REN-101'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Plan Name:</span>
                <span className="font-bold text-slate-900">{latestPayment?.planId?.name || selectedPlan?.name || 'AI Premium Clinic'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Billing Cycle:</span>
                <span className="font-bold text-slate-900 capitalize">{latestPayment?.billingCycle || billingCycle}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Payment Amount:</span>
                <span className="font-black text-emerald-600">{formatINR(latestPayment?.amount || totalPayable)}</span>
              </div>
              <div className="flex justify-between py-1.5 items-center">
                <span className="text-slate-500 font-medium">UTR Reference:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900">{latestPayment?.utr || utr || '—'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(latestPayment?.utr || utr, 'modal_utr', 'UTR')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400"
                  >
                    {copiedKey === 'modal_utr' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
              {latestPayment?.transactionId && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-900">{latestPayment.transactionId}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Payment Date:</span>
                <span className="font-bold text-slate-900">{formatDateTime(latestPayment?.paymentDate || latestPayment?.submittedAt)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Submitted At:</span>
                <span className="font-bold text-slate-900">{formatDateTime(latestPayment?.submittedAt)}</span>
              </div>
            </div>

            {/* Payment Proof Preview if available */}
            {(proofPreview || latestPayment?.paymentProofUrl) && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attached Payment Proof</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                      {proofFile?.name || 'payment_proof_receipt.png'}
                    </span>
                  </div>
                  {proofPreview && (
                    <a
                      href={proofPreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1"
                    >
                      <Eye size={12} />
                      <span>View</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPaymentDetailsModal(false)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: COMPARE PLAN FEATURES ── */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Compare Plan Features</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comparison Matrix Table */}
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Feature</th>
                    <th className="p-3 text-center">Starter</th>
                    <th className="p-3 text-center bg-emerald-50 text-emerald-900">Professional</th>
                    <th className="p-3 text-center">Enterprise</th>
                    <th className="p-3 text-center">Custom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  <tr>
                    <td className="p-3 font-bold">Max Doctors</td>
                    <td className="p-3 text-center">Up to 2</td>
                    <td className="p-3 text-center bg-emerald-50/50 font-bold text-emerald-900">Up to 10</td>
                    <td className="p-3 text-center">Unlimited</td>
                    <td className="p-3 text-center">Custom</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Max Staff Members</td>
                    <td className="p-3 text-center">Up to 3</td>
                    <td className="p-3 text-center bg-emerald-50/50 font-bold text-emerald-900">Up to 20</td>
                    <td className="p-3 text-center">Unlimited</td>
                    <td className="p-3 text-center">Custom</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Max Patients</td>
                    <td className="p-3 text-center">500</td>
                    <td className="p-3 text-center bg-emerald-50/50 font-bold text-emerald-900">5,000</td>
                    <td className="p-3 text-center">Unlimited</td>
                    <td className="p-3 text-center">Custom</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">AI Consultation Assistant</td>
                    <td className="p-3 text-center text-slate-300">—</td>
                    <td className="p-3 text-center bg-emerald-50/50 text-emerald-600 font-bold">✓ Standard</td>
                    <td className="p-3 text-center text-purple-600 font-bold">✓ Advanced</td>
                    <td className="p-3 text-center text-amber-600 font-bold">✓ Dedicated</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Pharmacy &amp; Inventory</td>
                    <td className="p-3 text-center text-slate-300">—</td>
                    <td className="p-3 text-center bg-emerald-50/50 text-emerald-600 font-bold">✓ Yes</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Laboratory Management</td>
                    <td className="p-3 text-center text-slate-300">—</td>
                    <td className="p-3 text-center bg-emerald-50/50 text-emerald-600 font-bold">✓ Yes</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Telemedicine / Online Consult</td>
                    <td className="p-3 text-center text-slate-300">—</td>
                    <td className="p-3 text-center bg-emerald-50/50 text-emerald-600 font-bold">✓ Yes</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Support SLA</td>
                    <td className="p-3 text-center">Email</td>
                    <td className="p-3 text-center bg-emerald-50/50 font-bold text-emerald-900">Priority (24/7)</td>
                    <td className="p-3 text-center">Dedicated Account Mgr</td>
                    <td className="p-3 text-center">Custom SLA</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONTACT SALES ── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-amber-500" />
                <h3 className="text-base font-black text-slate-900">Custom Plan Inquiry</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Looking for tailored doctor limits, multi-chain hospital integrations, or custom on-premise deployments? Our enterprise sales engineering team is ready to assist you.
            </p>

            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-emerald-600" />
                <span className="font-bold text-slate-800">{supportEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-emerald-600" />
                <span className="font-bold text-slate-800">{supportPhone}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <a
                href={`mailto:${supportEmail}?subject=AICMS%20Custom%20Plan%20Inquiry%20-${clinic?.code || ''}`}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl text-center shadow-xs transition"
              >
                Email Sales Team
              </a>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200/90 shadow-2xl p-6 sm:p-8 space-y-6 relative max-h-[85vh] overflow-y-auto animate-fadeIn">
            <button
              type="button"
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Subscription Invoices</h3>
                <p className="text-xs text-slate-500 font-medium">Billing and transaction history for {clinic?.name || 'your clinic'}</p>
              </div>
            </div>

            {paymentHistory && paymentHistory.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
                {paymentHistory.map((item, idx) => (
                  <div key={item._id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.invoiceNumber || `INV-${item.utr?.slice(-6) || idx + 1}`}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          item.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {item.planId?.name || selectedPlan?.name || 'Subscription Plan'} • {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'Recent'}
                      </p>
                      {item.utr && (
                        <p className="text-[10px] text-slate-400 font-mono">UTR: {item.utr}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block">{formatINR(item.amount || item.totalPayable || totalPayable)}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{item.billingCycle || billingCycle}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <Receipt size={32} className="text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No invoices found for this subscription period</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Invoices and official payment receipts are generated automatically upon successful payment verification.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
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

// Inline Sub-Component: Security Footer Badges Row
function TrustBadgesSection() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-6 border-t border-slate-200/80">
      <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} />
        </div>
        <div>
          <span className="text-xs font-black text-slate-900 block leading-tight">Secure Payments</span>
          <span className="text-[10px] font-medium text-slate-400 block">Your data is protected</span>
        </div>
      </div>

      <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <Lock size={18} />
        </div>
        <div>
          <span className="text-xs font-black text-slate-900 block leading-tight">256-bit Encryption</span>
          <span className="text-[10px] font-medium text-slate-400 block">End-to-end security</span>
        </div>
      </div>

      <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <Zap size={18} />
        </div>
        <div>
          <span className="text-xs font-black text-slate-900 block leading-tight">Access Restored</span>
          <span className="text-[10px] font-medium text-slate-400 block">Immediately after verification</span>
        </div>
      </div>

      <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <HeadsetCustomIcon className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <span className="text-xs font-black text-slate-900 block leading-tight">24/7 Support</span>
          <span className="text-[10px] font-medium text-slate-400 block">We're here to help</span>
        </div>
      </div>
    </div>
  );
}

// Inline Headset icon matching the reference style
function HeadsetCustomIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
      <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
    </svg>
  );
}
