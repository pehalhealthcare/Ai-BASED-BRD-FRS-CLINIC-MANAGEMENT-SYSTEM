import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Check, Sparkles, ArrowRight, ShieldCheck, Zap, 
  User, Building2, Crown, 
  Building, CalendarCheck, AlertCircle, RefreshCw, Layers 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { subscriptionApi } from '../../lib/api';

// Canonical feature labels lookup for system slugs
const FEATURE_LABELS = {
  appointments: 'Appointment Management',
  billing: 'Billing & Invoicing',
  prescriptions: 'Digital Prescriptions',
  emr: 'Full OPD & Digital EMR',
  sms: 'SMS & WhatsApp Reminders',
  reports: 'Daily & Financial Reports',
  multi_doctor: 'Multi-Doctor Management',
  ai_scheduling: 'AI Appointment Scheduling',
  pharmacy: 'Integrated Pharmacy Management',
  inventory: 'Medical Inventory & Stock Alerts',
  labs: 'Laboratory & Diagnostic Module',
  whatsapp: 'WhatsApp Notifications & Alerts',
  analytics: 'Advanced Clinical Analytics',
  symptom_checker: 'AI Symptom Checker',
  consultation_assistant: 'AI Clinical Consultation Assistant',
  voice_to_text: 'Voice-to-Text Clinical Dictation',
  ai_prescription_suggestions: 'AI Prescription & Drug Interaction Suggestions',
  ai_risk_scoring: 'AI Patient Risk Stratification',
  lab_recommendations: 'AI Lab Test Recommendations',
  online_consultation: 'Telemedicine & Video Consultation',
  multi_branch: 'Multi-Branch & Location Support',
  api_access: 'Developer API Access',
  unlimited_users: 'Unlimited Staff & Practitioners',
  unlimited_patients: 'Unlimited Patient Records',
  unlimited_branches: 'Unlimited Branch Locations',
  dedicated_server: 'Dedicated HIPAA-Ready Cloud Server',
  custom_branding: 'White-label & Custom Branding',
  insurance: 'Insurance & TPA Claims Processing',
  abdm: 'ABDM & Ayushman Bharat Integration',
  custom_apis: 'Custom Enterprise Integrations',
  priority_support: '24×7 Priority Healthcare Support'
};

const formatFeatureText = (feat) => {
  if (!feat || typeof feat !== 'string') return '';
  if (FEATURE_LABELS[feat]) return FEATURE_LABELS[feat];
  if (feat.includes(' ')) return feat;
  return feat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export default function PricingSection({ onSelectPlan, isAuthenticated = false }) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const scrollRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Fetch real active plans from the database via backend public API
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await subscriptionApi.getPublicPlans();
      const list = res?.data?.plans ?? res?.plans ?? (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      
      if (Array.isArray(list)) {
        // Sort strictly by displayOrder, then priceMonthly
        const sorted = [...list].sort((a, b) => {
          const orderA = a.displayOrder !== undefined && a.displayOrder !== null ? a.displayOrder : 999;
          const orderB = b.displayOrder !== undefined && b.displayOrder !== null ? b.displayOrder : 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.priceMonthly || 0) - (b.priceMonthly || 0);
        });
        setPlans(sorted);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Failed to load subscription plans from backend API:', err);
      setError(err?.response?.data?.message || 'Unable to load pricing plans. Please check your connection or server status.');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Enhanced mouse wheel listener: allows vertical mouse wheel to scroll horizontally across plans on desktop, while preserving inner vertical scrolling for feature lists
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      // If trackpad horizontal scroll or Shift+wheel is already firing deltaX, let native handle it
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }

      // If user is hovering over an inner vertical feature list with overflow, let it scroll vertically
      const scrollableChild = e.target.closest('.custom-scrollbar, ul');
      if (scrollableChild && scrollableChild.scrollHeight > scrollableChild.clientHeight) {
        const atTop = scrollableChild.scrollTop <= 0 && e.deltaY < 0;
        const atBottom = Math.ceil(scrollableChild.scrollTop + scrollableChild.clientHeight) >= scrollableChild.scrollHeight && e.deltaY > 0;
        if (!atTop && !atBottom) {
          return;
        }
      }

      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY, behavior: 'auto' });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [loading, plans]);

  // Mouse Drag to Scroll handlers
  const handleMouseDown = (e) => {
    // If clicking on an interactive inner element (buttons, links, inputs, feature lists), skip outer drag
    if (e.target.closest('ul') || e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
      return;
    }
    if (!scrollRef.current) return;
    isDownRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDownRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 6) {
      isDraggingRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDownRef.current = false;
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);
  };

  // Keyboard navigation on the carousel
  const handleKeyDown = (e) => {
    if (!scrollRef.current) return;
    const step = scrollRef.current.clientWidth * 0.45 || 380;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollRef.current.scrollBy({ left: -step, behavior: 'smooth' });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollRef.current.scrollBy({ left: step, behavior: 'smooth' });
    }
  };

  // Calculate dynamic savings percentage from REAL database plans
  const maxSavingsPercent = useMemo(() => {
    let maxSaving = 0;
    plans.forEach(p => {
      if (p.priceMonthly > 0 && p.priceYearly > 0) {
        const annualMonthlyCost = p.priceMonthly * 12;
        const discount = ((annualMonthlyCost - p.priceYearly) / annualMonthlyCost) * 100;
        if (discount > maxSaving) maxSaving = Math.round(discount);
      }
    });
    return maxSaving > 0 ? maxSaving : null;
  }, [plans]);

  const handlePlanClick = (plan) => {
    if (isDraggingRef.current) return; // Prevent triggering click during mouse drag
    if (onSelectPlan) {
      onSelectPlan(plan, billingCycle);
    }
  };

  // Helper to render plan top icon based on plan metadata
  const renderPlanIcon = (plan) => {
    const code = (plan.code || '').toUpperCase();
    const name = (plan.name || '').toLowerCase();

    if (code.includes('ENTERPRISE') || name.includes('enterprise') || plan.isEnterprise) {
      return (
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <Building size={22} strokeWidth={2.2} />
        </div>
      );
    }
    if (code.includes('PREMIUM') || name.includes('premium')) {
      return (
        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <Crown size={22} strokeWidth={2.2} />
        </div>
      );
    }
    if (code.includes('PRO') || name.includes('pro') || plan.isPopular) {
      return (
        <div className="w-12 h-12 rounded-2xl bg-blue-100/90 text-blue-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <Building2 size={22} strokeWidth={2.2} />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <User size={22} strokeWidth={2.2} />
      </div>
    );
  };

  return (
    <section 
      id="pricing" 
      className="pricing-section-container py-16 sm:py-20 lg:py-24 bg-white relative scroll-mt-[90px] w-full overflow-hidden"
      aria-label="AI-CMS Pricing Plans"
    >
      {/* Subtle organic blue curved background accents */}
      <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[750px] h-[750px] bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-0 translate-x-1/4 w-[700px] h-[700px] bg-gradient-to-bl from-blue-50/80 via-indigo-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-blue-50/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-600 text-xs font-bold uppercase tracking-wider mb-3 shadow-xs">
            <Sparkles size={13} className="text-blue-600" />
            <span>PRICING PLANS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Simple, Transparent <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Pricing</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed font-normal">
            Choose a plan that fits your practice. Upgrade anytime as you grow.
          </p>

          {/* Interactive Billing Toggle: Monthly vs Yearly */}
          <div className="mt-8 flex items-center justify-center">
            <div className="relative bg-slate-100/90 p-1.5 rounded-full border border-slate-200/80 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`relative px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {billingCycle === 'monthly' && (
                  <motion.div
                    layoutId="billingTogglePill"
                    className="absolute inset-0 bg-blue-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Monthly</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`relative px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {billingCycle === 'yearly' && (
                  <motion.div
                    layoutId="billingTogglePill"
                    className="absolute inset-0 bg-blue-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Yearly</span>
                
                {/* Dynamic Discount Badge based purely on active plan calculations */}
                {maxSavingsPercent && maxSavingsPercent > 0 && (
                  <span className={`relative z-10 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-tight transition-colors ${
                    billingCycle === 'yearly' 
                      ? 'bg-white text-blue-700 shadow-xs' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    SAVE UP TO {maxSavingsPercent}%
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── LOADING SKELETON STATE ── */}
        {loading && (
          <div className="flex justify-center gap-6 overflow-hidden animate-pulse px-4 py-6">
            {[1, 2].map((n) => (
              <div key={n} className="bg-slate-50/80 rounded-3xl p-7 border border-slate-100 h-[520px] w-full max-w-[480px] flex flex-col justify-between shrink-0">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-200/80 mb-4" />
                  <div className="h-6 w-3/4 bg-slate-200/80 rounded-lg mb-2" />
                  <div className="h-4 w-full bg-slate-200/60 rounded-md mb-6" />
                  <div className="h-10 w-1/2 bg-slate-200/80 rounded-lg mb-6" />
                  <div className="space-y-3">
                    <div className="h-3 w-1/3 bg-slate-200/60 rounded" />
                    <div className="h-4 w-full bg-slate-200/50 rounded" />
                    <div className="h-4 w-5/6 bg-slate-200/50 rounded" />
                    <div className="h-4 w-4/5 bg-slate-200/50 rounded" />
                  </div>
                </div>
                <div className="h-12 w-full bg-slate-200/80 rounded-2xl" />
              </div>
            ))}
          </div>
        )}

        {/* ── ERROR STATE (RETRY BUTTON) ── */}
        {!loading && error && (
          <div className="text-center py-16 px-6 bg-red-50/70 border border-red-200/80 rounded-3xl max-w-xl mx-auto shadow-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to Load Pricing Plans</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={fetchPlans}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 transition shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && !error && plans.length === 0 && (
          <div className="text-center py-16 px-6 bg-slate-50/80 border border-dashed border-slate-200 rounded-3xl max-w-xl mx-auto">
            <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Plans Available</h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">No subscription plans are currently published by Super Admin.</p>
            <button
              type="button"
              onClick={fetchPlans}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        )}

        {/* ── TRUE USER-SCROLLABLE 2-CARD HORIZONTAL CAROUSEL WITH PARTIAL PEEK ── */}
        {!loading && !error && plans.length > 0 && (
          <div className="pricing-carousel-wrapper relative mx-auto">
            
            {/* ── HORIZONTAL SCROLL TRACK (SWIPEABLE / DRAGGABLE / ACCESSIBLE) ── */}
            <div 
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="region"
              aria-label="Pricing plans carousel. Scroll horizontally, swipe, or use arrow keys to view all plans."
              className="pricing-scroll-track focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-3xl"
            >
              {plans.map((plan, index) => {
                const isPopular = !!plan.isPopular || plan.badge === 'MOST POPULAR';
                const isCustom = !!plan.isEnterprise || (plan.priceMonthly === 0 && plan.priceYearly === 0);
                
                const currentPrice = billingCycle === 'yearly'
                  ? (plan.priceYearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly)
                  : plan.priceMonthly;

                const billedAnnuallyText = billingCycle === 'yearly' && plan.priceYearly > 0
                  ? `Billed ₹${plan.priceYearly.toLocaleString('en-IN')}/year`
                  : null;

                // Extract real limits from database
                const doctorLimit = plan.limits?.maxDoctors ? (plan.limits.maxDoctors >= 9999 ? 'Unlimited Doctors' : `Up to ${plan.limits.maxDoctors} Doctor${plan.limits.maxDoctors > 1 ? 's' : ''}`) : null;
                const staffLimit = plan.limits?.maxStaff ? (plan.limits.maxStaff >= 9999 ? 'Unlimited Staff' : `Up to ${plan.limits.maxStaff} Staff`) : null;
                const patientLimit = plan.limits?.maxPatients ? (plan.limits.maxPatients >= 999999 ? 'Unlimited Patients' : `${plan.limits.maxPatients.toLocaleString('en-IN')} Patients`) : null;
                const branchLimit = plan.limits?.maxBranches ? (plan.limits.maxBranches >= 9999 ? 'Unlimited Branches' : (plan.limits.maxBranches > 1 ? `Up to ${plan.limits.maxBranches} Branches` : 'Single Branch')) : null;

                const limitHighlights = [doctorLimit, staffLimit, patientLimit, branchLimit].filter(Boolean);

                return (
                  <div
                    key={plan._id || plan.code || index}
                    className="pricing-card-item group shrink-0"
                  >
                    <div className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full transition-all duration-300 bg-white ${
                      isPopular
                        ? 'border-2 border-blue-600 shadow-xl shadow-blue-500/10'
                        : 'border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-blue-200'
                    }`}>
                      {/* Floating Badge (Controlled by DB / Super Admin) */}
                      {(isPopular || plan.badge) && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md shadow-blue-600/30 flex items-center gap-1.5 whitespace-nowrap z-10">
                          <Sparkles size={12} />
                          <span>{plan.badge || 'MOST POPULAR'}</span>
                        </div>
                      )}

                      <div>
                        {/* Top Plan Icon */}
                        <div className="mb-4">
                          {renderPlanIcon(plan)}
                        </div>

                        {/* Plan Name */}
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                          {plan.name}
                        </h3>

                        {/* Plan Description */}
                        <p className="text-xs sm:text-[13px] text-slate-500 min-h-[38px] leading-relaxed mb-4">
                          {plan.description || 'Configured by Super Admin for modern healthcare clinics.'}
                        </p>

                        {/* Price Block */}
                        <div className="mb-5 pb-5 border-b border-slate-100">
                          {isCustom ? (
                            <div className="flex flex-col">
                              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                                Custom Pricing
                              </span>
                              <span className="text-xs text-slate-400 font-medium mt-1">
                                Tailored for healthcare networks & polyclinics
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                  ₹{currentPrice ? currentPrice.toLocaleString('en-IN') : '0'}
                                </span>
                                <span className="text-xs sm:text-sm text-slate-500 font-medium">
                                  / month
                                </span>
                              </div>
                              {billedAnnuallyText && (
                                <span className="text-[11px] text-emerald-600 font-semibold mt-1">
                                  {billedAnnuallyText}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Limit Badges if configured by Admin */}
                        {limitHighlights.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-slate-100">
                            {limitHighlights.map((limitText, lIdx) => (
                              <span key={lIdx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {limitText}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Feature List Header */}
                        <div className="mb-6">
                          <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
                            PLAN FEATURES
                          </div>
                          
                          {/* Real Features from Backend */}
                          <ul 
                            className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar text-xs sm:text-[13px] text-slate-700 select-text"
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {Array.isArray(plan.features) && plan.features.length > 0 ? (
                              plan.features.map((feature, fIdx) => (
                                <li key={fIdx} className="flex items-center gap-2.5 leading-snug">
                                  <Check size={14} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
                                  <span className="font-normal text-slate-700">{formatFeatureText(feature)}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-slate-400 italic">Full Clinic Management Suite</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* Plan CTA Button (Passes real plan._id) */}
                      <button
                        type="button"
                        onClick={() => handlePlanClick(plan)}
                        onFocus={(e) => {
                          e.currentTarget.closest('.pricing-card-item')?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                            inline: 'center'
                          });
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 cursor-pointer mt-4 ${
                          isPopular
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 hover:shadow-blue-600/35'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-slate-900 border border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <span>{plan.ctaText || (isCustom ? 'Contact Sales' : 'Get Started')}</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* Factual Guarantee / Benefits Footer Row */}
        <div className="mt-12 text-center flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-600" />
            <span>14-day free setup & onboarding</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-blue-600" />
            <span>Instant digital activation</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-blue-600" />
            <span>Cancel or change plans anytime</span>
          </div>
        </div>

      </div>
    </section>
  );
}
