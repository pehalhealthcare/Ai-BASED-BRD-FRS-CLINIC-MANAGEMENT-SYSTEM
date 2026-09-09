import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, Clock, CreditCard, AlertTriangle, XCircle,
  Plus, ChevronRight, Check, X, RefreshCw, Star, MessageSquare,
  ArrowUpRight, Loader2, CalendarDays, BarChart3, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { dashboardApi, subscriptionPaymentApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const AVATAR_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const getAvatarColor = (str = '') => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const MetricCard = ({ icon: Icon, iconBg, label, value, sub, subColor = 'text-slate-500' }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-2xl font-black text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
    {sub && <p className={`text-[10px] font-medium ${subColor}`}>{sub}</p>}
  </div>
);

const LineChart = ({ data = [], color = '#10b981', height = 80 }) => {
  if (!data.length) return <div className="flex items-center justify-center h-20 text-xs text-slate-400">No data</div>;
  const vals = data.map(d => d.value || 0);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const W = 400, H = height;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * W;
    const y = H - ((d.value - min) / range) * (H - 10) - 5;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(' L ')}`;
  const areaD = `${pathD} L ${W},${H} L 0,${H} Z`;
  const gradId = `grad-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * W;
        const y = H - ((d.value - min) / range) * (H - 10) - 5;
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
};

const BarChart = ({ data = [], color = '#10b981', height = 100 }) => {
  if (!data.length) return <div className="flex items-center justify-center h-24 text-xs text-slate-400">No data</div>;
  const vals = data.map(d => d.value || 0);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-lg transition-all hover:opacity-80"
              style={{ height: `${pct}%`, background: color, minHeight: d.value > 0 ? 4 : 0 }}
              title={`${d.label}: ${fmt(d.value)}`}
            />
            <span className="text-[9px] text-slate-400 text-center leading-none">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const DonutChart = ({ segments = [], total = 0 }) => {
  const R = 56, cx = 70, cy = 70, stroke = 14;
  const circumference = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="w-full max-w-[140px]">
      {segments.map((seg, i) => {
        const pct = total > 0 ? seg.value / total : 0;
        const len = pct * circumference;
        const dasharray = `${len} ${circumference - len}`;
        const dashoffset = -offset * circumference;
        offset += pct;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px' }}
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#0f172a" style={{ fontSize: 22, fontWeight: 900 }}>{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 9 }}>Clinics</text>
    </svg>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
    VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    Payment_Pending: 'bg-orange-50 text-orange-700 border-orange-200',
    Pending_Approval: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const labels = {
    active: 'Active',
    PENDING_VERIFICATION: 'Pending',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
    Payment_Pending: 'Payment Pending',
    Pending_Approval: 'Pending Approval',
  };
  const cls = map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  const label = labels[status] || status || '--';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{label}</span>;
};

const VerifyModal = ({ payment, onClose, onConfirm, loading }) => {
  if (!payment) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ShieldCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Verify Payment</h3>
            <p className="text-xs text-slate-500">This will activate the clinic subscription</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm mb-4">
          <div className="flex justify-between"><span className="text-slate-500">Clinic</span><span className="font-semibold">{payment.clinicId?.name || payment.clinicName}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold text-emerald-600">{fmt(payment.amount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">UTR</span><span className="font-mono text-xs">{payment.utr}</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={() => onConfirm(payment._id)} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {loading ? 'Verifying...' : 'Confirm & Verify'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RejectModal = ({ payment, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  if (!payment) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><X size={20} className="text-red-600" /></div>
          <div>
            <h3 className="font-bold text-slate-900">Reject Payment</h3>
            <p className="text-xs text-slate-500">Clinic will be notified</p>
          </div>
        </div>
        <select value={reason} onChange={e => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm mb-4 focus:outline-none focus:border-red-400 transition">
          <option value="">Select reason...</option>
          <option value="Invalid UTR/Transaction ID">Invalid UTR/Transaction ID</option>
          <option value="Amount mismatch">Amount mismatch</option>
          <option value="Duplicate submission">Duplicate submission</option>
          <option value="Wrong account">Wrong account</option>
          <option value="Other">Other</option>
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={() => reason && onConfirm(payment._id, { reason })} disabled={loading || !reason} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
            {loading ? 'Rejecting...' : 'Reject Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regPeriod, setRegPeriod] = useState('7d');
  const [revPeriod, setRevPeriod] = useState('6m');
  const [verifyingPayment, setVerifyingPayment] = useState(null);
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardApi.getSuperAdminOverview();
      setData(res.data || res);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleVerify = async (paymentId) => {
    setActionLoading(true);
    try {
      await subscriptionPaymentApi.verifyPayment(paymentId);
      toast.success('Payment verified! Clinic is now active.');
      setVerifyingPayment(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (paymentId, payload) => {
    setActionLoading(true);
    try {
      await subscriptionPaymentApi.rejectPayment(paymentId, payload);
      toast('Payment rejected. Clinic notified.');
      setRejectingPayment(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <AlertTriangle size={40} className="text-red-400" />
        <p className="text-sm font-semibold text-slate-700">{error}</p>
        <button onClick={loadData} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2 transition">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const regData = data?.registrationsTimeSeries?.[regPeriod] || data?.registrations?.[regPeriod] || [];
  const revData = data?.revenueTimeSeries?.[revPeriod] || data?.revenue?.[revPeriod] || [];
  const statusSegments = [
    { label: 'Active', value: stats.activeClinics || 0, color: '#10b981' },
    { label: 'Pending Approval', value: stats.pendingApprovals || 0, color: '#3b82f6' },
    { label: 'Suspended', value: stats.suspendedClinics || 0, color: '#8b5cf6' },
    { label: 'Expired', value: stats.expiredClinics || 0, color: '#f87171' },
  ];
  const totalForDonut = statusSegments.reduce((acc, s) => acc + (s.value || 0), 0) || stats.totalClinics || 0;
  const recentClinics = data?.recentClinics || data?.recentRegistrations || [];
  const pendingPayments = (data?.pendingPayments || data?.paymentVerifications || []).filter(
    (p) => p.rawStatus === 'PENDING_VERIFICATION' || p.status === 'PENDING_VERIFICATION' || p.status === 'Pending'
  );
  const recentFeedback = data?.recentFeedback || data?.feedback || [];
  const recentComplaints = data?.recentComplaints || data?.complaints || [];
  const upcomingExpiries = data?.upcomingExpiries || data?.expiringSoon || [];
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const weekAgo = new Date(now - 7*86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50">
      {verifyingPayment && <VerifyModal payment={verifyingPayment} onClose={() => setVerifyingPayment(null)} onConfirm={handleVerify} loading={actionLoading} />}
      {rejectingPayment && <RejectModal payment={rejectingPayment} onClose={() => setRejectingPayment(null)} onConfirm={handleReject} loading={actionLoading} />}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Welcome back,</p>
            <h1 className="text-2xl font-black text-slate-900">Super Admin</h1>
            <p className="text-xs text-slate-400 mt-0.5">Here's what's happening across AICMS today.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition"><RefreshCw size={14} /></button>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600">
              <CalendarDays size={13} className="text-slate-400" />{weekAgo} - {dateStr}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={Building2} iconBg="bg-emerald-50 text-emerald-600" label="Total Clinics" value={stats.totalClinics || 0} sub={stats.activeClinics ? `Active: ${stats.activeClinics}` : undefined} />
          <MetricCard icon={CheckCircle2} iconBg="bg-green-50 text-green-600" label="Active Clinics" value={stats.activeClinics || 0} sub={stats.totalClinics ? `${Math.round((stats.activeClinics / stats.totalClinics) * 100)}% of total` : undefined} />
          <MetricCard icon={Clock} iconBg="bg-amber-50 text-amber-600" label="Pending Approvals" value={stats.pendingApprovals || 0} sub={stats.pendingApprovals > 0 ? 'Needs attention' : 'All clear'} subColor={stats.pendingApprovals > 0 ? 'text-amber-600' : 'text-emerald-600'} />
          <MetricCard icon={CreditCard} iconBg="bg-blue-50 text-blue-600" label="Payments Pending" value={stats.paymentsPending || 0} sub="Verify UTR / Txn" subColor="text-blue-600" />
          <MetricCard icon={AlertTriangle} iconBg="bg-orange-50 text-orange-600" label="Expiring Soon" value={stats.expiringSoon || 0} sub="Within 30 days" subColor="text-orange-600" />
          <MetricCard icon={XCircle} iconBg="bg-red-50 text-red-600" label="Expired" value={stats.expiredClinics || 0} sub="Subscription ended" subColor="text-red-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Clinic Registrations</h3>
                <p className="text-xs text-slate-400">New clinic registrations over time</p>
              </div>
              <select value={regPeriod} onChange={e => setRegPeriod(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white focus:outline-none focus:border-emerald-400 transition">
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="6m">Last 6 Months</option>
                <option value="1y">Last 1 Year</option>
              </select>
            </div>
            <div className="mt-3">
              <LineChart data={regData} color="#10b981" height={90} />
              {regData.length > 0 && (
                <div className="flex justify-between mt-1">
                  {[regData[0], regData[Math.floor(regData.length / 2)], regData[regData.length - 1]].filter(Boolean).map((d, i) => (
                    <span key={i} className="text-[9px] text-slate-400">{d.label || d.date || ''}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Revenue Overview</h3>
                <p className="text-xs text-slate-400">Estimated revenue from active subscriptions</p>
              </div>
              <select value={revPeriod} onChange={e => setRevPeriod(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white focus:outline-none focus:border-emerald-400 transition">
                <option value="6m">Last 6 Months</option>
                <option value="1y">Last 1 Year</option>
              </select>
            </div>
            <div className="mt-3"><BarChart data={revData} color="#10b981" height={100} /></div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Clinic Status Distribution</h3>
            <div className="flex items-center gap-4">
              <div className="shrink-0"><DonutChart segments={statusSegments} total={totalForDonut} /></div>
              <div className="space-y-2 flex-1">
                {statusSegments.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-slate-600">{s.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">{s.value}</span>
                      <span className="text-[9px] text-slate-400 ml-1">({totalForDonut > 0 ? Math.round((s.value / totalForDonut) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Create New Clinic', sub: 'Manually create and onboard a new clinic', icon: Plus, bg: 'bg-emerald-600', path: '/clinics', primary: true },
            { label: 'Manage Plans', sub: 'View and edit subscription plans', icon: CreditCard, bg: 'bg-blue-50', tc: 'text-blue-700', path: '/plans' },
            { label: 'Verify Payments', sub: 'Review pending payment verifications', icon: ShieldCheck, bg: 'bg-amber-50', tc: 'text-amber-700', badge: stats.paymentsPending || 0, path: '/payments' },
            { label: 'View Reports', sub: 'Platform usage, revenue and analytics', icon: BarChart3, bg: 'bg-purple-50', tc: 'text-purple-700', path: '/dashboard/revenue' },
          ].map(a => {
            const Icon = a.icon;
            return (
              <Link key={a.label} to={a.path} className={`rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col gap-2 ${a.primary ? 'bg-emerald-600' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${a.primary ? 'bg-white/20' : a.bg}`}>
                    <Icon size={16} className={a.primary ? 'text-white' : a.tc} />
                  </div>
                  <div className="flex items-center gap-1">
                    {a.badge > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{a.badge}</span>}
                    <ArrowUpRight size={14} className={a.primary ? 'text-white/70' : 'text-slate-400'} />
                  </div>
                </div>
                <div>
                  <p className={`text-xs font-bold ${a.primary ? 'text-white' : 'text-slate-900'}`}>{a.label}</p>
                  <p className={`text-[10px] ${a.primary ? 'text-white/70' : 'text-slate-400'}`}>{a.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Clinic Registrations</h3>
                <p className="text-[10px] text-slate-400">Latest clinic registration requests and setup progress</p>
              </div>
              <Link to="/clinics" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1">View All <ChevronRight size={12} /></Link>
            </div>
            {recentClinics.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-xs text-slate-400">No recent registrations</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Clinic</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Owner</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Plan</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentClinics.slice(0, 5).map((c, i) => {
                      const name = c.name || c.clinicName || 'Clinic';
                      return (
                        <tr key={c._id || i} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: getAvatarColor(name) }}>{getInitials(name)}</div>
                              <div>
                                <p className="text-xs font-semibold text-slate-900 leading-tight">{name}</p>
                                <p className="text-[9px] text-slate-400">Code: {c.code || '--'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-600">{c.owner?.name || c.ownerName || '--'}</td>
                          <td className="px-3 py-3 text-xs text-slate-600">{c.subscription?.planName || c.plan?.name || c.planName || '--'}</td>
                          <td className="px-3 py-3"><StatusBadge status={c.setupStatus || c.status || 'active'} /></td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/clinics/${c._id}`} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center justify-center text-slate-500 transition">
                              <ArrowUpRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Payment Verifications
                  {(stats.paymentsPending || 0) > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{stats.paymentsPending}</span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400">Clinic payments awaiting verification</p>
              </div>
              <Link to="/payments" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1">View All <ChevronRight size={12} /></Link>
            </div>
            {pendingPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <CheckCircle2 size={28} className="text-emerald-400 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No pending payment verifications</p>
                <p className="text-[10px] text-slate-400 mt-0.5">All submitted clinic payments have been reviewed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Clinic</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Amount</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">UTR</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingPayments.slice(0, 5).map((p, i) => {
                      const cName = p.clinicId?.name || p.clinicName || 'Clinic';
                      return (
                        <tr
                          key={p._id || i}
                          onClick={() => navigate(`/payments/verify/${p._id}`)}
                          className="hover:bg-slate-50/80 transition cursor-pointer group"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: getAvatarColor(cName) }}>{getInitials(cName)}</div>
                              <div>
                                <p className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600 transition leading-tight flex items-center gap-1">
                                  {cName}
                                  <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition text-emerald-500" />
                                </p>
                                <p className="text-[9px] text-slate-400">{p.clinicId?.code || p.clinicCode || '--'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-bold text-emerald-600 text-xs">{fmt(p.amount)}</td>
                          <td className="px-3 py-3"><span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.utr || '--'}</span></td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/payments/verify/${p._id}`);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1"
                              >
                                <Clock size={10} /> Pending
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Feedback</h3>
                <p className="text-[10px] text-slate-400">Latest feedback from clinics</p>
              </div>
              <Link to="/clinics" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">View All</Link>
            </div>
            {recentFeedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare size={20} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No feedback yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFeedback.slice(0, 3).map((f, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={10} className={s <= Math.round(f.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                      ))}
                      <span className="text-[10px] font-bold text-amber-600 ml-1">{Number(f.rating || 0).toFixed(1)}</span>
                    </div>
                    {f.comment && <p className="text-xs text-slate-600 italic">"{f.comment}"</p>}
                    <p className="text-[10px] text-slate-400 mt-1">{f.clinicName || f.clinic?.name || 'Clinic'} &bull; {fmtDate(f.date || f.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Complaints</h3>
                <p className="text-[10px] text-slate-400">Open and unresolved complaints</p>
              </div>
              <Link to="/clinics" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">View All</Link>
            </div>
            {recentComplaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 size={20} className="text-emerald-400 mb-2" />
                <p className="text-xs text-slate-400">No open complaints</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentComplaints.slice(0, 3).map((c, i) => {
                  const pColor = c.priority === 'High' || c.priority === 'Urgent'
                    ? 'bg-red-50 text-red-700'
                    : c.priority === 'Medium'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-600';
                  return (
                    <div key={i} className="border border-slate-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-slate-400">{c.id || c.ticketId || (`#CMP-${1000 + i}`)}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${pColor}`}>{c.priority || 'Medium'}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{c.title || c.subject || 'Issue reported'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(c.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Expiries</h3>
                <p className="text-[10px] text-slate-400">Clinics with subscription expiring soon</p>
              </div>
              <Link to="/clinics" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">View All</Link>
            </div>
            {upcomingExpiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 size={20} className="text-emerald-400 mb-2" />
                <p className="text-xs text-slate-400">No expiries in 30 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingExpiries.slice(0, 4).map((e, i) => {
                  const name = e.name || e.clinicName || 'Clinic';
                  const daysLeft = e.daysLeft || e.daysUntilExpiry || 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: getAvatarColor(name) }}>
                        {getInitials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 leading-tight truncate">{name}</p>
                        <p className="text-[9px] text-slate-400">{e.subscription?.planName || e.planName || '--'}</p>
                        <p className={`text-[10px] font-bold ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 15 ? 'text-orange-600' : 'text-amber-600'}`}>
                          Expires in {daysLeft} days
                        </p>
                      </div>
                      <Link to={`/clinics/${e._id}`} className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold shrink-0">View</Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
