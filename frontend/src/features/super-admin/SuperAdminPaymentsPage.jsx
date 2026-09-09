import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CreditCard, Search, RefreshCw, Check, X, Eye, Clock,
  Building2, CalendarDays, AlertTriangle, CheckCircle2,
  XCircle, ChevronLeft, ChevronRight, Loader2,
  ArrowUpRight, FileText, ShieldCheck, ShieldX, Hash, User, Sparkles
} from 'lucide-react';
import { subscriptionPaymentApi } from '../../lib/api';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const STATUSES = [
  { key: 'all', label: 'All Payments' },
  { key: 'PENDING_VERIFICATION', label: 'Pending' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'REPAYMENT_REQUIRED', label: 'Repayment Required' },
];

const STATUS_META = {
  PENDING_VERIFICATION: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  VERIFIED: { label: 'Verified', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  REPAYMENT_REQUIRED: { label: 'Repayment Required', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: AlertTriangle },
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: FileText },
};

const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const AVATAR_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const getAvatarColor = (str = '') => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];

const REJECTION_REASONS = [
  'Invalid or unverifiable UTR/Transaction ID',
  'Payment amount does not match the plan price',
  'Duplicate submission - UTR already used',
  'Payment made to wrong account',
  'Screenshot does not match the transaction',
  'Transaction pending or failed at bank',
  'Other',
];

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.SUBMITTED;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

const PaymentTypeBadge = ({ type }) => {
  if (type === 'PLAN_UPGRADE' || type === 'UPGRADE' || type === 'PLAN_CHANGE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Sparkles size={10} className="text-indigo-500" />
        PLAN UPGRADE
      </span>
    );
  }
  if (type === 'RENEWAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <RefreshCw size={10} className="text-emerald-500" />
        RENEWAL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
      INITIAL
    </span>
  );
};

const VerifyModal = ({ payment, onClose, onConfirm, loading }) => {
  if (!payment) return null;
  const isUpgrade = payment.paymentType === 'PLAN_UPGRADE' || payment.paymentType === 'UPGRADE';
  const currentPlanName = payment.currentPlanId?.name || payment.clinicId?.subscription?.planId?.name;
  const requestedPlanName = payment.requestedPlanId?.name || payment.planId?.name || payment.planName || '--';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ShieldCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Verify Payment</h3>
            <p className="text-xs text-slate-500">{isUpgrade ? 'This will activate the requested plan upgrade' : 'This will activate the clinic subscription'}</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-5">
          <div className="flex justify-between"><span className="text-slate-500">Clinic</span><span className="font-semibold text-slate-900">{payment.clinicId?.name || payment.clinicName || '--'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Payment Type</span><PaymentTypeBadge type={payment.paymentType} /></div>
          {isUpgrade && currentPlanName && (
            <div className="flex justify-between"><span className="text-slate-500">Current Plan</span><span className="font-medium text-slate-700">{currentPlanName}</span></div>
          )}
          <div className="flex justify-between"><span className="text-slate-500">{isUpgrade ? 'Requested Plan' : 'Plan'}</span><span className="font-bold text-slate-900">{requestedPlanName}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Billing Cycle</span><span className="font-medium text-slate-800 capitalize">{payment.requestedBillingCycle || payment.billingCycle || '--'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold text-emerald-600">{fmt(payment.amount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">UTR / Ref</span><span className="font-mono text-xs text-slate-700">{payment.utr || '--'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Submitted</span><span className="text-slate-700">{fmtDate(payment.submittedAt || payment.createdAt)}</span></div>
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
          Verify that the UTR has been confirmed in your bank statement before proceeding.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button
            onClick={() => onConfirm(payment._id)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {loading ? 'Verifying...' : 'Confirm & Verify'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RejectModal = ({ payment, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  if (!payment) return null;
  const handleSubmit = () => {
    if (!reason) { toast.error('Please select a rejection reason'); return; }
    onConfirm(payment._id, { reason, notes });
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <ShieldX size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Reject Payment</h3>
            <p className="text-xs text-slate-500">Clinic will be notified with the reason</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rejection Reason <span className="text-red-500">*</span></label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition"
          >
            <option value="">Select a reason...</option>
            {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Additional Notes <span className="text-slate-400">(optional)</span></label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any specific instructions for the clinic..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            {loading ? 'Rejecting...' : 'Reject Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};



const SuperAdminPaymentsPage = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;
  const [verifyingPayment, setVerifyingPayment] = useState(null);
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState({});

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (activeStatus !== 'all') params.status = activeStatus;
      if (search.trim()) params.search = search.trim();
      const res = await subscriptionPaymentApi.listPayments(params);
      const data = res.data || res;
      setPayments(data.payments || data.items || []);
      setTotal(data.total || data.count || 0);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit) || 1);
      setStatusCounts(data.statusCounts || {});
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError(err.response?.data?.message || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [page, activeStatus, search]);

  useEffect(() => { loadPayments(); }, [loadPayments]);
  useEffect(() => { setPage(1); }, [activeStatus, search]);

  const handleVerifyConfirm = async (paymentId) => {
    setActionLoading(true);
    try {
      await subscriptionPaymentApi.verifyPayment(paymentId);
      toast.success('Payment verified! Clinic subscription has been activated.');
      setVerifyingPayment(null);
      loadPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async (paymentId, payload) => {
    setActionLoading(true);
    try {
      await subscriptionPaymentApi.rejectPayment(paymentId, payload);
      toast('Payment rejected. Clinic has been notified.');
      setRejectingPayment(null);
      loadPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = statusCounts['PENDING_VERIFICATION'] || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {verifyingPayment && (
        <VerifyModal payment={verifyingPayment} onClose={() => setVerifyingPayment(null)} onConfirm={handleVerifyConfirm} loading={actionLoading} />
      )}
      {rejectingPayment && (
        <RejectModal payment={rejectingPayment} onClose={() => setRejectingPayment(null)} onConfirm={handleRejectConfirm} loading={actionLoading} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <CreditCard size={20} className="text-emerald-600" />
              Payment Verifications
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">{pendingCount}</span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Review and verify clinic subscription payment submissions</p>
          </div>
          <button onClick={loadPayments} className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition" title="Refresh">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex gap-1 mb-4 bg-white border border-slate-100 rounded-2xl p-1 overflow-x-auto shadow-sm">
          {STATUSES.map(s => {
            const count = s.key === 'all' ? total : (statusCounts[s.key] || 0);
            return (
              <button
                key={s.key}
                onClick={() => setActiveStatus(s.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${activeStatus === s.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                {s.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeStatus === s.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by UTR, clinic name, transaction ID..." className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-500">
              <Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading payments...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <AlertTriangle size={28} className="text-red-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700">{error}</p>
              <button onClick={loadPayments} className="mt-3 text-xs text-blue-600 hover:underline">Try again</button>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <CreditCard size={24} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No payments found</p>
              <p className="text-xs text-slate-400 mt-1">{search ? 'Try a different search term' : activeStatus !== 'all' ? 'No payments with this status' : 'Payment submissions will appear here'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">UTR / Ref</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map(p => {
                      const clinicName = p.clinicId?.name || p.clinicName || 'Unknown';
                      const clinicCode = p.clinicId?.code || p.clinicCode || '';
                      const planName = p.planId?.name || p.planName || '--';
                      return (
                        <tr
                          key={p._id}
                          className="hover:bg-slate-50/70 transition cursor-pointer group"
                          onClick={() => navigate(`/payments/verify/${p._id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: getAvatarColor(clinicName) }}>
                                {getInitials(clinicName)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 group-hover:text-emerald-600 transition text-xs leading-tight flex items-center gap-1">
                                  {clinicName}
                                  <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition text-emerald-500" />
                                </p>
                                {clinicCode && <p className="text-[10px] text-slate-400">{clinicCode}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-slate-800">{p.requestedPlanId?.name || planName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 capitalize">{p.requestedBillingCycle || p.billingCycle || '--'}</span>
                              <PaymentTypeBadge type={p.paymentType} />
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className="font-bold text-emerald-600">{fmt(p.amount)}</span></td>
                          <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">{p.utr || '--'}</span></td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(p.submittedAt || p.createdAt)}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/payments/verify/${p._id}`)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-emerald-600 transition"
                                title="Open Verification Workspace"
                              >
                                <Eye size={13} />
                              </button>
                              {p.status === 'PENDING_VERIFICATION' && (
                                <>
                                  <button onClick={() => setVerifyingPayment(p)} className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition flex items-center gap-1"><Check size={11} /> Verify</button>
                                  <button onClick={() => setRejectingPayment(p)} className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition flex items-center gap-1"><X size={11} /> Reject</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Showing {((page - 1) * limit) + 1}--{Math.min(page * limit, total)} of {total} payments</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"><ChevronLeft size={14} /></button>
                    <span className="text-xs font-medium text-slate-700 px-2">{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPaymentsPage;
