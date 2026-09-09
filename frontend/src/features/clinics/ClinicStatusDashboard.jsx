import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  Clock, CheckCircle, CheckCircle2, XCircle, FileText, Calendar, Sparkles,
  Building2, RefreshCw, LogOut, CreditCard, ArrowRight, Bell,
  ShieldCheck, AlertTriangle, HelpCircle, Mail, Phone, ExternalLink,
  ChevronRight, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import PehalLogo from '../../components/common/PehalLogo';
import { subscriptionPaymentApi, paymentSettingsApi, clinicApi } from '../../lib/api';

const LIFECYCLE_STEPS = [
  { id: 1, label: 'Owner Details', desc: 'Identity verification' },
  { id: 2, label: 'Clinic Details', desc: 'Practice info & configs' },
  { id: 3, label: 'Plan Selected', desc: 'Subscription tier' },
  { id: 4, label: 'Email Verified', desc: 'OTP security check' },
  { id: 5, label: 'Payment Verification', desc: 'UTR & bank reconciliation' },
  { id: 6, label: 'Clinic Approval', desc: 'Super Admin review' },
  { id: 7, label: 'Ready for Launch', desc: 'Onboarding access' }
];

export default function ClinicStatusDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const clinic = user?.clinic || {};
  const clinicId = clinic?._id || user?.clinicId;

  // Local state
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [supportInfo, setSupportInfo] = useState({
    email: 'support@pehalhealthcare.com',
    phone: '+91 81309 16134'
  });

  const [setupStatus, setSetupStatus] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const loadStatusData = async () => {
    setLoading(true);
    try {
      // 1. Fetch authoritative setup status
      try {
        const setupRes = await clinicApi.getSetupStatus();
        if (setupRes?.data) {
          setSetupStatus(setupRes.data);
        }
      } catch (e) {
        console.warn('Could not load authoritative setup status:', e);
      }

      if (clinicId) {
        // 2. Fetch payment attempts for this clinic
        const res = await subscriptionPaymentApi.getClinicPaymentHistory(clinicId);
        const data = res.data || {};
        setPaymentHistory(data.payments || []);
        setPaymentSummary(data.summary || null);
      }

      // 3. Fetch support details
      const settingsRes = await paymentSettingsApi.getActiveDetails();
      const st = settingsRes.data?.paymentDetails || {};
      if (st.supportEmail || st.supportPhone) {
        setSupportInfo({
          email: st.supportEmail || 'support@pehalhealthcare.com',
          phone: st.supportPhone || '+91 81309 16134'
        });
      }
    } catch (err) {
      console.warn('Could not load detailed payment status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatusData();
  }, [clinicId]);

  const activeClinic = setupStatus?.clinic || clinic;
  const latestPayment = paymentHistory[0] || setupStatus?.latestPayment || null;
  const currentPaymentStatus = setupStatus?.paymentStatus || latestPayment?.status || clinic?.subscription?.status;
  const currentApprovalStatus = setupStatus?.approvalStatus || activeClinic?.approvalStatus;
  const isOnboardingDone = setupStatus?.isOnboardingCompleted ?? activeClinic?.isOnboardingCompleted;

  const isFreeTier = currentPaymentStatus === 'FREE_TIER' || activeClinic?.subscription?.isFreeTier;
  const isPaymentPending = currentPaymentStatus === 'PENDING_VERIFICATION' || latestPayment?.status === 'PENDING_VERIFICATION';
  const isPaymentVerified = currentPaymentStatus === 'VERIFIED' || isFreeTier;
  const isPaymentRejected = currentPaymentStatus === 'REJECTED' || currentPaymentStatus === 'REPAYMENT_REQUIRED';

  // Calculate current lifecycle active index
  const getLifecycleIndex = () => {
    if (currentApprovalStatus === 'approved' && isOnboardingDone) return 7;
    if (currentApprovalStatus === 'approved') return 7;
    if (isPaymentVerified && currentApprovalStatus === 'pending_approval') return 6;
    if (isPaymentRejected) return 5;
    if (isPaymentPending) return 5;
    return 4;
  };

  const activeIndex = getLifecycleIndex();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PehalLogo variant="primary" height={32} />
            <div className="h-5 w-[1px] bg-slate-200" />
            <div>
              <span className="text-xs font-black text-slate-900 block leading-tight">AICMS Portal</span>
              <span className="text-[10px] font-bold text-slate-400 block">{clinic.name || 'Clinic Account'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadStatusData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* 1. STATUS HERO BANNER */}
        {currentApprovalStatus === 'approved' ? (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-emerald-600/10 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle size={28} className="text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200 block">Registration Approved</span>
                <h1 className="text-2xl sm:text-3xl font-black">Clinic Approved &amp; Ready!</h1>
                <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-2xl leading-relaxed">
                  Congratulations! Your clinic registration and subscription payment have been verified and approved by the Super Admin. You can now complete your clinic onboarding.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isOnboardingDone ? (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Go to Clinic Dashboard</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/clinic/onboarding')}
                  className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue Clinic Onboarding</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        ) : isPaymentRejected ? (
          <div className="bg-gradient-to-r from-rose-600 to-red-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-rose-600/10 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={28} className="text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-200 block">Payment Rejected</span>
                <h1 className="text-2xl sm:text-3xl font-black">Payment Verification Failed</h1>
                <p className="text-xs sm:text-sm text-rose-100 font-medium max-w-2xl leading-relaxed">
                  Your recent payment submission was rejected during verification. Please review the reason below and submit your payment again. Onboarding remains locked.
                </p>
              </div>
            </div>

            {/* Rejection reason box */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] uppercase font-black text-rose-200 tracking-wider block">Super Admin Note:</span>
              <p className="text-xs font-bold text-white leading-relaxed">
                {latestPayment?.rejectionReason || clinic?.rejectionReason || 'Invalid UTR reference / Payment amount does not match the selected plan.'}
              </p>
              {latestPayment?.rejectionNotes && (
                <p className="text-[11px] text-rose-100 font-medium">{latestPayment.rejectionNotes}</p>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/clinic-setup/payment', { state: { clinic, plan: clinic?.subscription?.planId } })}
                className="px-6 py-3 bg-white hover:bg-rose-50 text-rose-800 rounded-2xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>Make Payment Again</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (isPaymentVerified && currentApprovalStatus === 'pending_approval') ? (
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-amber-600/10 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={28} className="text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200 block">✓ Payment Verified</span>
                <h1 className="text-2xl sm:text-3xl font-black">Awaiting Clinic Approval</h1>
                <p className="text-xs sm:text-sm text-amber-100 font-medium max-w-2xl leading-relaxed">
                  Your subscription payment has been verified successfully. Your clinic is currently awaiting final Super Admin review and approval. You will receive an update once approval is granted.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-200" />
                <span className="text-xs font-bold text-white">Status: Super Admin Clinic Approval Pending</span>
              </div>
              <span className="text-xs font-bold text-amber-200">Onboarding locked until approved</span>
            </div>
          </div>
        ) : isPaymentPending ? (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-600/10 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Clock size={28} className="text-white animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">Payment Submitted</span>
                <h1 className="text-2xl sm:text-3xl font-black">Payment Verification in Progress</h1>
                <p className="text-xs sm:text-sm text-blue-100 font-medium max-w-2xl leading-relaxed">
                  Your payment has been submitted successfully. Our team is verifying your payment details against bank records. Verification typically takes 2–4 hours.
                </p>
              </div>
            </div>

            {latestPayment && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-blue-200 block font-bold uppercase">UTR Reference</span>
                  <span className="font-mono font-bold text-white">{latestPayment.utrNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-200 block font-bold uppercase">Amount</span>
                  <span className="font-bold text-white">₹{(latestPayment.amount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-200 block font-bold uppercase">Verification Status</span>
                  <span className="font-bold text-amber-200">Pending Super Admin Action</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <CreditCard size={28} className="text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300 block">Payment Required</span>
                <h1 className="text-2xl sm:text-3xl font-black">Complete Your Subscription Payment</h1>
                <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-2xl leading-relaxed">
                  Your email has been verified, but your subscription payment has not yet been completed. Please complete payment to continue with clinic onboarding.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/clinic-setup/payment', { state: { clinic, plan: clinic?.subscription?.planId } })}
                className="px-6 py-3 bg-[#00B96B] hover:bg-[#00A25D] text-white rounded-2xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Payment</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* 2. LIFECYCLE PROGRESS TIMELINE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Registration Lifecycle Progress</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Track your clinic onboarding milestones</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {LIFECYCLE_STEPS.map((st) => {
              const isDone = st.id < activeIndex;
              const isCurrent = st.id === activeIndex;

              return (
                <div
                  key={st.id}
                  className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between gap-3 ${
                    isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : isCurrent
                        ? isPaymentRejected
                          ? 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-200'
                          : 'bg-blue-50 border-blue-300 text-blue-950 ring-2 ring-blue-200'
                        : 'bg-slate-50/70 border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider">Step {st.id}</span>
                    {isDone ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      isPaymentRejected ? (
                        <XCircle size={15} className="text-rose-600 shrink-0" />
                      ) : (
                        <Clock size={15} className="text-blue-600 shrink-0 animate-spin" />
                      )
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-black block leading-tight">{st.label}</span>
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5 leading-snug">{st.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. PAYMENT SUBMISSION & CLINIC DETAILS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left: Payment Attempts & Receipt (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Payment Submission History</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Reconciliation records for your subscription</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/clinic-setup/payment', { state: { clinic, plan: clinic?.subscription?.planId } })}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>New Payment</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {paymentHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <CreditCard size={32} className="mx-auto text-slate-300" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">No payment submissions found yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Please complete payment checkout to enable verification.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/clinic-setup/payment', { state: { clinic, plan: clinic?.subscription?.planId } })}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Go to Payment Checkout</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((p, idx) => {
                    const isPending = p.status === 'PENDING_VERIFICATION';
                    const isVerified = p.status === 'VERIFIED';
                    const isRejected = p.status === 'REJECTED';

                    return (
                      <div
                        key={p._id || idx}
                        className={`rounded-2xl p-4 border transition-all space-y-2.5 ${
                          isVerified
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isRejected
                              ? 'bg-rose-50/40 border-rose-200'
                              : 'bg-amber-50/30 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-900">UTR: {p.utr}</span>
                            <span className="text-[10px] text-slate-400 font-bold">• Attempt #{p.attemptNumber || 1}</span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRejected
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isVerified ? '✓ Verified' : isRejected ? '✗ Rejected' : '⧖ Pending Verification'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Amount</span>
                            <span className="font-black text-slate-800">₹{(p.amount || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Plan</span>
                            <span className="font-bold text-slate-800 capitalize">{p.planId?.name || 'Professional'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Submitted At</span>
                            <span className="font-semibold text-slate-600 text-[11px]">
                              {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        </div>

                        {p.rejectionReason && (
                          <div className="p-2.5 rounded-xl bg-rose-100/70 border border-rose-200 text-xs text-rose-900 font-medium">
                            <strong>Reason:</strong> {p.rejectionReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Clinic Details & Support (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Clinic Details Snapshot */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Clinic Profile</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Read-only application snapshot</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Clinic Name</span>
                  <span className="font-black text-slate-900">{clinic.name || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Clinic Code</span>
                  <span className="font-mono font-bold text-slate-800">{clinic.code || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Owner Contact</span>
                  <span className="font-semibold text-slate-700">{user?.name} ({user?.email})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Approval Status</span>
                  <span className="font-bold text-slate-800 capitalize">{clinic.approvalStatus?.replace('_', ' ') || 'Pending'}</span>
                </div>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <HelpCircle size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">Need Assistance?</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Contact our verification support desk</p>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <a
                  href={`mailto:${supportInfo.email}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium p-2 rounded-xl hover:bg-slate-50 transition"
                >
                  <Mail size={14} className="text-slate-400" />
                  <span className="truncate">{supportInfo.email}</span>
                </a>
                <a
                  href={`tel:${supportInfo.phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium p-2 rounded-xl hover:bg-slate-50 transition"
                >
                  <Phone size={14} className="text-slate-400" />
                  <span>{supportInfo.phone}</span>
                </a>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
