import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Tag, RefreshCw, User, ChevronDown, ChevronUp } from 'lucide-react';
import { appointmentApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';

const DECISION_LABELS = {
  percentage: 'Percentage Discount',
  fixed: 'Fixed Amount',
  full_waiver: 'Full Fee Waiver',
  senior_citizen: 'Senior Citizen',
  membership: 'Membership',
  corporate: 'Corporate',
  insurance: 'Insurance',
  employee: 'Employee',
  promotional: 'Promotional',
  doctor_courtesy: 'Doctor Courtesy',
  admin_courtesy: 'Admin Courtesy'
};

function CountdownTimer({ expiry }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const compute = () => {
      const diff = new Date(expiry) - new Date();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    };
    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [expiry]);

  const isUrgent = new Date(expiry) - new Date() < 5 * 60 * 1000;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
      isUrgent ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
    }`}>
      <Clock size={9} /> {timeLeft}
    </span>
  );
}

export default function DiscountApprovalQueue({ compact = false, onDecisionMade }) {
  const { user } = useAuth();
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deciding, setDeciding] = useState({});
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [showRejectInput, setShowRejectInput] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  const canDecide = ['ADMIN', 'DOCTOR', 'SUPER_ADMIN'].includes(user?.role);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await appointmentApi.getPendingApprovals();
      const list = res?.appointments || res?.data?.appointments || res || [];
      setPendingList(Array.isArray(list) ? list : []);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to fetch pending approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const handleDecide = async (appointmentId, decision) => {
    const reason = rejectionReasons[appointmentId] || '';
    if (decision === 'rejected' && !reason.trim()) {
      setShowRejectInput(prev => ({ ...prev, [appointmentId]: true }));
      return;
    }
    setDeciding(prev => ({ ...prev, [appointmentId]: true }));
    try {
      await appointmentApi.decideDiscount(appointmentId, { decision, rejectionReason: reason });
      setPendingList(prev => prev.filter(a => a._id !== appointmentId));
      if (onDecisionMade) onDecisionMade({ appointmentId, decision });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process decision.');
    } finally {
      setDeciding(prev => ({ ...prev, [appointmentId]: false }));
    }
  };

  if (pendingList.length === 0 && !loading) {
    if (compact) return null;
    return (
      <div className="bg-white border border-slate-150 rounded-2xl p-5 text-center">
        <CheckCircle2 size={24} className="text-teal-500 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">No pending discount approvals</p>
        <button onClick={fetchPending} className="mt-2 text-[10px] text-teal-600 hover:underline font-semibold flex items-center gap-1 mx-auto">
          <RefreshCw size={10} /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden'}>
      {/* Header */}
      {!compact && (
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 rounded-lg"><Tag size={14} className="text-amber-700" /></div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Discount Approval Queue</h3>
              <p className="text-[9px] text-slate-400 font-semibold">{pendingList.length} pending request{pendingList.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={fetchPending}
            disabled={loading}
            className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700 font-bold"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'}
          </button>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
          <AlertCircle size={13} className="text-rose-500 shrink-0" />
          <p className="text-[11px] text-rose-700 font-semibold">{error}</p>
        </div>
      )}

      <div className={compact ? 'space-y-2' : 'divide-y divide-slate-100'}>
        {pendingList.map((apt) => {
          const dr = apt.discountRequest || {};
          const patient = apt.patientId;
          const doctor = apt.doctorId;
          const isExpanded = expandedId === apt._id;
          const isDeciding = deciding[apt._id];
          const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : '—';
          const doctorName = doctor?.fullName || '—';
          const discountLabel = DECISION_LABELS[dr.type] || dr.type || '—';
          const discountDisplay = dr.type === 'percentage'
            ? `${dr.value}% (₹${dr.amount})`
            : dr.type === 'full_waiver'
            ? 'Full Waiver'
            : `₹${dr.amount}`;

          return (
            <div key={apt._id} className={compact ? 'bg-white border border-amber-200 rounded-2xl overflow-hidden' : 'p-4'}>
              {/* Summary Row */}
              <div
                className={`flex items-center justify-between gap-3 cursor-pointer ${compact ? 'p-3' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : apt._id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <User size={14} className="text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{patientName}</p>
                    <p className="text-[9px] text-slate-500 font-semibold">Dr. {doctorName} · {discountLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {discountDisplay}
                  </span>
                  {apt.slotReservedUntil && <CountdownTimer expiry={apt.slotReservedUntil} />}
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className={`border-t border-slate-100 mt-2 pt-3 ${compact ? 'px-3 pb-3' : ''} space-y-3`}>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-slate-400 font-bold">Original Fee</span><p className="font-bold text-slate-800">₹{apt.consultationFee}</p></div>
                    <div><span className="text-slate-400 font-bold">Discount</span><p className="font-bold text-amber-700">{discountDisplay}</p></div>
                    <div><span className="text-slate-400 font-bold">Net Payable</span><p className="font-bold text-teal-700">₹{dr.finalPayableAmount ?? (apt.consultationFee - (dr.amount || 0))}</p></div>
                    <div><span className="text-slate-400 font-bold">Authority</span><p className="font-bold text-slate-700 capitalize">{dr.approvalAuthority || 'admin'}</p></div>
                    <div className="col-span-2"><span className="text-slate-400 font-bold">Reason</span><p className="font-semibold text-slate-700 leading-relaxed">{dr.reason || '—'}</p></div>
                    <div className="col-span-2"><span className="text-slate-400 font-bold">Requested by</span><p className="font-semibold text-slate-700">{dr.requestedBy?.name || dr.requestedBy?.email || 'Receptionist'}</p></div>
                  </div>

                  {/* Reject reason input */}
                  {showRejectInput[apt._id] && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Rejection Reason (Required)</label>
                      <input
                        type="text"
                        placeholder="Enter reason for rejection..."
                        value={rejectionReasons[apt._id] || ''}
                        onChange={(e) => setRejectionReasons(prev => ({ ...prev, [apt._id]: e.target.value }))}
                        className="px-3 py-2 bg-slate-50 border border-rose-200 rounded-xl text-[11px] focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                  )}

                  {canDecide && (
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={isDeciding}
                        onClick={() => handleDecide(apt._id, 'approved')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-[11px] font-bold rounded-xl transition"
                      >
                        <CheckCircle2 size={12} />
                        {isDeciding ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        disabled={isDeciding}
                        onClick={() => handleDecide(apt._id, 'rejected')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 disabled:bg-slate-200 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-xl transition"
                      >
                        <XCircle size={12} />
                        {showRejectInput[apt._id] && rejectionReasons[apt._id] ? 'Confirm Reject' : 'Reject'}
                      </button>
                    </div>
                  )}

                  {!canDecide && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 font-semibold text-center">
                      Awaiting approval from {dr.approvalAuthority === 'doctor' ? 'the assigned doctor' : 'clinic admin'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
