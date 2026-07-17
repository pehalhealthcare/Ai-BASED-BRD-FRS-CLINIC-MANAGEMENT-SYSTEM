import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Check, Star, Zap, Crown, Building2, ArrowUpRight,
  Users, Database, Shield, Activity, ChevronRight, CreditCard,
  Clock, CheckCircle2, AlertCircle, Sparkles, Package, RefreshCw
} from 'lucide-react';
import { subscriptionApi, clinicApi, apiClient } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';

/* ─── Helpers ─────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

/* ─── Plan icon map ────────────────────────────────────── */
const PLAN_ICONS = {
  0: Zap,
  1: Star,
  2: Crown,
  3: Building2,
};

const PLAN_COLORS = [
  { grad: 'from-slate-50 to-slate-100', ring: 'border-slate-200', btn: 'border border-slate-300 text-slate-700 hover:bg-slate-50', icon: '#64748b', accent: '#6366f1' },
  { grad: 'from-indigo-50 to-purple-50', ring: 'border-indigo-400 ring-2 ring-indigo-200', btn: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200', icon: '#6366f1', accent: '#6366f1' },
  { grad: 'from-amber-50 to-orange-50', ring: 'border-amber-300', btn: 'border border-amber-400 text-amber-700 hover:bg-amber-50', icon: '#f59e0b', accent: '#f59e0b' },
  { grad: 'from-slate-800 to-slate-900', ring: 'border-slate-700', btn: 'border border-slate-400 text-slate-300 hover:bg-slate-700', icon: '#94a3b8', accent: '#94a3b8' },
];

const TABS = ['Plans & Pricing', 'My Subscription', 'Requested Premium Features', 'Billing History', 'Payment Methods'];

/* ─── Progress Bar ─────────────────────────────────────── */
const ProgressBar = ({ value, max, color = '#6366f1' }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
};

/* ─── Feature check item ───────────────────────────────── */
const Feature = ({ text, dark = false, color = '#6366f1' }) => (
  <div className="flex items-start gap-2">
    <CheckCircle2 size={13} style={{ color }} className="mt-0.5 shrink-0" />
    <span className={`text-xs leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{text}</span>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
const SubscriptionPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Plans & Pricing');
  const [plans, setPlans]         = useState([]);
  const [clinicData, setClinicData] = useState(null);
  const [featureRequests, setFeatureRequests] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Upgrade Plan state hooks
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState(null);
  const [targetBillingCycle, setTargetBillingCycle] = useState('monthly');
  const [upgradePreview, setUpgradePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleChoosePlan = async (plan) => {
    const PLAN_RANKS = {
      'STARTER': 1,
      'PROFESSIONAL': 2,
      'PREMIUM': 3,
      'ENTERPRISE': 4
    };
    const currentCode = currentPlan?.code || 'STARTER';
    const currentRank = PLAN_RANKS[currentCode] || 1;
    const targetRank = PLAN_RANKS[plan.code] || 1;

    if (targetRank < currentRank) {
      toast.error("Currently you can't downgrade the plan");
      return;
    }

    setSelectedTargetPlan(plan);
    setTargetBillingCycle('monthly');
    setLoadingPreview(true);
    setUpgradePreview(null);
    setShowUpgradeModal(true);

    try {
      const backendPlan = plans.find(p => p.code === plan.code);
      if (!backendPlan) {
        throw new Error('Selected plan option not registered in backend catalog.');
      }
      const res = await apiClient.post('/subscriptions/upgrade/preview', {
        targetPlanId: backendPlan._id,
        billingCycle: 'monthly'
      });
      setUpgradePreview(res.data?.data || res.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upgrade preview failed.');
      setShowUpgradeModal(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePreviewUpgradeForCycle = async (cycle) => {
    if (!selectedTargetPlan) return;
    setTargetBillingCycle(cycle);
    setLoadingPreview(true);
    setUpgradePreview(null);
    try {
      const backendPlan = plans.find(p => p.code === selectedTargetPlan.code);
      if (!backendPlan) {
        throw new Error('Plan not registered in catalog.');
      }
      const res = await apiClient.post('/subscriptions/upgrade/preview', {
        targetPlanId: backendPlan._id,
        billingCycle: cycle
      });
      setUpgradePreview(res.data?.data || res.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upgrade preview failed.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmUpgrade = async (e) => {
    e.preventDefault();
    if (!selectedTargetPlan) return;
    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
      toast.error('Please enter complete credit card billing details.');
      return;
    }

    setProcessingPayment(true);
    try {
      const backendPlan = plans.find(p => p.code === selectedTargetPlan.code);
      if (!backendPlan) {
        throw new Error('Plan not registered in catalog.');
      }
      const res = await apiClient.post('/subscriptions/upgrade', {
        targetPlanId: backendPlan._id,
        billingCycle: targetBillingCycle,
        paymentMethod: {
          last4: cardNumber.slice(-4),
          brand: 'Visa',
          token: `TOK_${Date.now()}`
        }
      });

      if (res.data?.success) {
        toast.success('Subscription plan upgraded successfully!');
        setShowUpgradeModal(false);
        setSelectedTargetPlan(null);
        setUpgradePreview(null);
        setCardName('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        window.location.reload(); // Refresh the app context for updated role limits
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Subscription upgrade payment failed.');
    } finally {
      setProcessingPayment(false);
    }
  };


  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, clinicRes, reqsRes] = await Promise.allSettled([
        subscriptionApi.getPublicPlans(),
        user?.clinicId ? clinicApi.getOnboardingFlow(user.clinicId) : Promise.resolve(null),
        user?.clinicId ? apiClient.get('/clinics/features/requests') : Promise.resolve(null),
      ]);
      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value?.data?.plans || plansRes.value?.plans || []);
      }
      if (clinicRes.status === 'fulfilled' && clinicRes.value) {
        setClinicData(clinicRes.value?.data || clinicRes.value || null);
      }
      if (reqsRes.status === 'fulfilled' && reqsRes.value) {
        setFeatureRequests(reqsRes.value?.data?.requests || reqsRes.value?.requests || []);
      }
    } catch(e) {
      // silently fail — show static data
    } finally {
      setLoading(false);
    }
  }, [user?.clinicId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* Current subscription from user object */
  const currentPlan = user?.clinic?.subscription?.planId || {};
  const subscription = user?.clinic?.subscription || {};
  const expiryFormatted = subscription.expiryDate
    ? new Date(subscription.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '25 Dec 2025';
  const planName = currentPlan?.name || 'AI Professional Clinic';

  /* Merge real plans with fallback display data */
  const displayPlans = useMemo(() => {
    const fallback = [
      {
        _id: 'starter', name: 'AI Starter Clinic', subtitle: 'Single Doctor Clinic',
        priceYearly: 1499, code: 'STARTER',
        features: ['Patient Registration','Appointment Management','Billing & Invoices','Prescription & Basic EMR','Daily Reports','Staff Login (2 Users)','500 Patient Records','Cloud Backup','Email Support'],
        isCurrent: planName.toLowerCase().includes('starter'),
      },
      {
        _id: 'professional', name: 'AI Professional Clinic', subtitle: '1+ Two-Three Doctors',
        priceYearly: 2999, code: 'PROFESSIONAL',
        features: ['AI Appointment Scheduling','Doctor Calendar','Multi Doctor Management','WhatsApp Integration','Inventory & Pharmacy','Lab Module','Digital Prescription','Unlimited Patients','Analytics Dashboard','Role-Based Access','Up to 10 Users'],
        isCurrent: planName.toLowerCase().includes('professional'),
        isPopular: true,
        prefix: 'Everything in Starter, plus:',
      },
      {
        _id: 'premium', name: 'AI Premium Clinic', subtitle: '2+ (5-15) Doctors Multi Speciality Clinic',
        priceYearly: 5999, code: 'PREMIUM',
        features: ['AI Symptom Checker','AI Consultation Assistant','Voice-to-Text','AI Prescription Suggestions','AI Lab Recommendation','AI Patient Risk Scoring','Referral Management','Advanced Analytics','Priority Support','Up to 25 Users'],
        isCurrent: planName.toLowerCase().includes('premium'),
        prefix: 'Everything in Professional, plus:',
      },
      {
        _id: 'enterprise', name: 'Enterprise Clinic', subtitle: '15+ Doctors / Multi Branch',
        priceYearly: null, code: 'ENTERPRISE',
        features: ['Multi-Branch Management','Custom Integrations','Dedicated Account Manager','Advanced Security','SLA & Uptime Guarantee','Custom Reports','Unlimited Users','On-Premise Deployment (Optional)'],
        isCurrent: planName.toLowerCase().includes('enterprise'),
        prefix: 'Everything in Premium, plus:',
      },
    ];

    // Merge real API plans if available
    if (plans.length > 0) {
      return plans.map((p, i) => ({
        ...p,
        subtitle: p.limits?.maxDoctors ? `Up to ${p.limits.maxDoctors} Doctors` : fallback[i]?.subtitle || '',
        isPopular: i === 1,
        isCurrent: p.name === planName || p.code === (currentPlan?.code || ''),
        prefix: i > 0 ? fallback[i]?.prefix : undefined,
      }));
    }
    return fallback;
  }, [plans, planName, currentPlan]);

  /* Usage stats from clinic / user */
  const usage = useMemo(() => {
    const maxUsers    = currentPlan?.limits?.maxDoctors || 10;
    const maxPatients = currentPlan?.limits?.maxPatients || null;
    const currentUsers    = (user?.clinic?.doctorCount || 0) + (user?.clinic?.staffCount || 0) || 7;
    const currentPatients = user?.clinic?.patientCount || 18452;
    const storageGB   = 45.6;
    const storageMax  = 200;
    return { maxUsers, maxPatients, currentUsers, currentPatients, storageGB, storageMax };
  }, [currentPlan, user]);

  if (loading) return <LoadingState label="Loading subscription data..." />;

  return (
    <div className="space-y-6 p-1">

      {/* ── Header ─────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Admin Panel"
        title="Subscription & Plan"
        description="Manage your subscription, billing and choose the best plan for your clinic."
      />

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-bold cursor-pointer transition border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-indigo-600 border-indigo-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: Plans & Pricing
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'Plans & Pricing' && (
        <div className="space-y-6">

          {/* Plan Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {displayPlans.map((plan, idx) => {
              const cfg  = PLAN_COLORS[idx] || PLAN_COLORS[0];
              const Icon = PLAN_ICONS[idx] || Star;
              const isDark = idx === 3;
              return (
                <div
                  key={plan._id || idx}
                  className={`relative rounded-2xl border p-6 flex flex-col gap-4 bg-gradient-to-b ${cfg.grad} ${cfg.ring} transition hover:shadow-lg h-full`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {plan.isCurrent && !plan.isPopular && (
                    <div className="absolute -top-3 left-4">
                      <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full">
                        Current
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: cfg.icon + '22' }}>
                      <Icon size={18} style={{ color: cfg.icon }} />
                    </div>
                    <p className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </p>
                    <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {plan.subtitle}
                    </p>
                  </div>

                  <div>
                    {plan.priceYearly !== null ? (
                      <>
                        <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {fmt(plan.priceYearly)}
                          <span className={`text-sm font-semibold ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>
                        </p>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Billed annually</p>
                      </>
                    ) : (
                      <>
                        <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Custom Pricing</p>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                          For large clinics and hospital chains
                        </p>
                      </>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {plan.prefix && (
                      <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {plan.prefix}
                      </p>
                    )}
                    {(plan.features || []).map((f, fi) => (
                      <Feature key={fi} text={f} dark={isDark} color={cfg.accent} />
                    ))}
                  </div>

                  <button
                    onClick={() => !plan.isCurrent && plan.priceYearly !== null && handleChoosePlan(plan)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${cfg.btn} ${plan.isCurrent ? 'opacity-100' : ''}`}
                  >
                    {plan.isCurrent ? 'Current Plan' : plan.priceYearly === null ? 'Contact Sales' : 'Choose Plan'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Current Subscription + Usage + Why Upgrade */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Current Subscription */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Current Subscription</p>
                  <p className="text-xs text-slate-400 mt-0.5">{planName}</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  ['Plan Status',      'Active'],
                  ['Billing Cycle',    subscription.billingCycle || 'Annual'],
                  ['Current Period',   `${subscription.startDate ? new Date(subscription.startDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '25 Dec 2024'} – ${expiryFormatted}`],
                  ['Next Billing Date', expiryFormatted],
                  ['Users',            `${usage.currentUsers} / ${usage.maxUsers} Users`],
                  ['Patient Records',  `${fmtNum(usage.currentPatients)} / ${usage.maxPatients ? fmtNum(usage.maxPatients) : 'Unlimited'}`],
                  ['Storage Used',     `${usage.storageGB} GB / ${usage.storageMax} GB`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-500">{k}</span>
                    <span className={`font-semibold ${k === 'Plan Status' ? 'text-emerald-600' : 'text-slate-700'}`}>{v}</span>
                  </div>
                ))}
              </div>

              <button className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                Manage Subscription
              </button>
            </div>

            {/* Usage Overview */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <p className="text-sm font-bold text-slate-800">Usage Overview</p>

              {[
                {
                  icon: Users,        label: 'Users',           iconColor: '#6366f1', iconBg: '#eef2ff',
                  current: usage.currentUsers,  max: usage.maxUsers, unit: 'Users',
                  pctLabel: `${usage.currentUsers} / ${usage.maxUsers} Users`,
                  barPct: pct => pct, color: '#6366f1',
                },
                {
                  icon: Package,     label: 'Patient Records', iconColor: '#10b981', iconBg: '#ecfdf5',
                  current: usage.currentPatients, max: usage.maxPatients || usage.currentPatients,
                  unit: '', pctLabel: `${fmtNum(usage.currentPatients)} / Unlimited`,
                  color: '#10b981',
                },
                {
                  icon: Database,    label: 'Storage',          iconColor: '#f59e0b', iconBg: '#fffbeb',
                  current: usage.storageGB,  max: usage.storageMax,
                  unit: 'GB', pctLabel: `${usage.storageGB} GB / ${usage.storageMax} GB`,
                  color: '#f59e0b',
                },
              ].map((row, i) => {
                const Icon = row.icon;
                const pctVal = row.max > 0 ? Math.min(100, Math.round((row.current / row.max) * 100)) : 0;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: row.iconBg }}>
                          <Icon size={13} style={{ color: row.iconColor }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{row.label}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-600">{row.pctLabel}</span>
                    </div>
                    <ProgressBar value={row.current} max={row.max} color={row.color} />
                    <p className="text-[10px] text-slate-400 text-right">{pctVal}%</p>
                  </div>
                );
              })}

              <button className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                View Usage Details <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Why Upgrade */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <p className="text-sm font-bold text-slate-800">Why Upgrade?</p>

              <div className="space-y-4">
                {[
                  { icon: '⚡', label: 'Increase Efficiency', desc: 'Automate appointments, billing and reports with AI.', color: 'bg-indigo-50 text-indigo-600' },
                  { icon: '❤️', label: 'Improve Patient Experience', desc: 'Faster service, digital prescriptions, and follow-ups.', color: 'bg-rose-50 text-rose-500' },
                  { icon: '📊', label: 'Advanced Analytics', desc: 'Deep insights and grow your clinic.', color: 'bg-amber-50 text-amber-600' },
                  { icon: '📈', label: 'Scalable Solution', desc: 'Add more users, branches and features as you grow.', color: 'bg-emerald-50 text-emerald-600' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${item.color}`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2">
                Compare All Features <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          {/* Help Footer */}
          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm font-bold text-slate-800">Need help choosing the right plan?</p>
                <p className="text-xs text-slate-500 mt-0.5">Our team is here to help you choose the perfect plan for your clinic.</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition cursor-pointer shadow-md shadow-indigo-200">
              <CreditCard size={14} />
              Contact Support
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: My Subscription
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'My Subscription' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-black text-slate-900">{planName}</p>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">Active</span>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ['Plan Status',      <span className="text-emerald-600 font-bold">Active</span>],
                ['Billing Cycle',    subscription.billingCycle || 'Annual'],
                ['Next Billing',     expiryFormatted],
                ['Users',            `${usage.currentUsers} / ${usage.maxUsers}`],
                ['Storage',          `${usage.storageGB} GB / ${usage.storageMax} GB`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-700">{v}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition cursor-pointer shadow">
              Manage Subscription
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-sm font-bold text-slate-800 mb-4">Plan Features</p>
            <div className="space-y-2">
              {(currentPlan?.features || ['Patient Management','Billing','Appointments','Pharmacy','Laboratory','Analytics','Multi-Doctor Support']).map((f, i) => (
                <Feature key={i} text={f} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Billing History
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'Billing History' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm font-bold text-slate-800 mb-4">Billing History</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Invoice','Plan','Date','Amount','Status'].map(h => (
                    <th key={h} className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-left pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { inv: 'INV-2024-001', plan: planName, date: '25 Dec 2024', amount: fmt(currentPlan?.priceYearly || 2999), status: 'Paid' },
                  { inv: 'INV-2023-001', plan: planName, date: '25 Dec 2023', amount: fmt(currentPlan?.priceYearly || 2999), status: 'Paid' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="py-3 pr-6 text-indigo-600 font-bold">{row.inv}</td>
                    <td className="py-3 pr-6 text-slate-700">{row.plan}</td>
                    <td className="py-3 pr-6 text-slate-500">{row.date}</td>
                    <td className="py-3 pr-6 font-bold text-slate-800">{row.amount}</td>
                    <td className="py-3">
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Requested Premium Features
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'Requested Premium Features' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Requested Premium Features</h3>
            <p className="text-xs text-slate-400 mt-1">Review AI features requested by your clinical staff and upgrade your subscription plan to unlock them.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Requested Feature</th>
                  <th className="py-3 px-4">Requested On</th>
                  <th className="py-3 px-4">Recommendation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {featureRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">No premium feature requests submitted.</td>
                  </tr>
                ) : (
                  featureRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4.5 px-4 font-semibold text-slate-700">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{req.doctorName}</p>
                          <p className="text-[10px] text-slate-400">{req.doctorEmail}</p>
                        </div>
                      </td>
                      <td className="py-4.5 px-4 font-bold text-violet-600">{req.featureName}</td>
                      <td className="py-4.5 px-4 text-slate-500">
                        {new Date(req.requestedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4.5 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-600 border border-violet-100">
                          Upgrade to {req.recommendedPlan}
                        </span>
                      </td>
                      <td className="py-4.5 px-4 text-right">
                        <button
                          onClick={() => setActiveTab('Plans & Pricing')}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          Upgrade Plan
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Payment Methods
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'Payment Methods' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-xl">
          <p className="text-sm font-bold text-slate-800 mb-4">Saved Payment Methods</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <CreditCard size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">•••• •••• •••• 4242</p>
                  <p className="text-xs text-slate-400">Expires 12/26</p>
                </div>
              </div>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full">Default</span>
            </div>
          </div>
          <button className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline cursor-pointer">
            <span className="text-lg leading-none">+</span> Add Payment Method
          </button>
        </div>
      )}
      {/* Upgrade Plan Checkout Modal */}
      {showUpgradeModal && selectedTargetPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-100 shadow-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start relative max-h-[90vh] overflow-y-auto text-slate-800">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowUpgradeModal(false);
                setSelectedTargetPlan(null);
                setUpgradePreview(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition"
            >
              <Check className="rotate-45" size={18} />
            </button>

            {/* Left side: select billing cycle */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-black text-slate-900">Upgrade to {selectedTargetPlan.name}</h4>
                <p className="text-xs text-slate-500 mt-1">Select your preferred billing cycle to apply prorated credits.</p>
              </div>

              {/* Cycle selection toggle */}
              <div className="flex p-1 rounded-xl bg-slate-100 text-[10px] font-bold text-slate-600 gap-1 w-fit">
                {['monthly', 'yearly'].map((cycle) => (
                  <button 
                    key={cycle}
                    type="button"
                    onClick={() => handlePreviewUpgradeForCycle(cycle)}
                    className={`px-3 py-1.5 rounded-lg transition uppercase ${
                      targetBillingCycle === cycle ? 'bg-white text-slate-950 font-black shadow-sm' : 'hover:bg-white/50'
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>

              {/* Core Limits Summary */}
              <div className="space-y-3 bg-indigo-50/30 border border-indigo-50/50 p-4 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Plan Highlights</p>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <p>✓ Premium clinic features unlocked immediately</p>
                  <p>✓ Prorated credit applied automatically from remaining period</p>
                  <p>✓ Cloud backup & HIPAA data isolation included</p>
                </div>
              </div>
            </div>

            {/* Right side: prorated math and checkout form */}
            <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-100">
              <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Upgrade checkout summary</p>

              {loadingPreview && (
                <div className="flex justify-center p-4 text-slate-400 gap-2 items-center text-xs">
                  <RefreshCw size={14} className="animate-spin text-indigo-600" />
                  <span>Calculating prorated discount...</span>
                </div>
              )}

              {upgradePreview && (
                <div className="space-y-4">
                  
                  {/* Prorated breakdown */}
                  <div className="space-y-2 text-xs border-b border-slate-200 pb-4">
                    <div className="flex justify-between items-center text-slate-500 font-semibold">
                      <span>New Plan Price</span>
                      <span className="font-bold text-slate-800">₹{upgradePreview.selectedPlanPrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 font-semibold">
                      <span>Unused Credit (Prorated)</span>
                      <span className="font-black">- ₹{upgradePreview.currentPlanCredit}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 font-semibold">
                      <span>Credit Applied</span>
                      <span className="font-bold text-slate-800">₹{upgradePreview.creditApplied}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-1" />
                    <div className="flex justify-between items-center font-black text-slate-900 text-sm pt-1">
                      <span>Final Payable Amount</span>
                      <span className="text-indigo-600">₹{upgradePreview.finalPayableAmount}</span>
                    </div>
                  </div>

                  {/* Payment form */}
                  <form onSubmit={handleConfirmUpgrade} className="space-y-3.5">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Debit / Credit card</p>
                    
                    <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                      Cardholder Name
                      <input 
                        type="text" 
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-indigo-500 outline-none transition"
                        required
                      />
                    </label>

                    <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                      Card Number
                      <input 
                        type="text" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4111 2222 3333 4444"
                        className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-indigo-500 outline-none transition"
                        required
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                        Expiry Date
                        <input 
                          type="text" 
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-indigo-500 outline-none transition"
                          required
                        />
                      </label>
                      <label className="grid gap-1.5 text-[10px] font-bold text-slate-700">
                        CVV
                        <input 
                          type="password" 
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="•••"
                          className="rounded-xl border border-slate-200 p-3 text-xs bg-white focus:border-indigo-500 outline-none transition"
                          required
                        />
                      </label>
                    </div>

                    <button 
                      type="submit"
                      disabled={processingPayment}
                      className="w-full py-3 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow"
                    >
                      {processingPayment ? (
                        <span>Processing payment...</span>
                      ) : (
                        <span>Pay & Upgrade Now</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
