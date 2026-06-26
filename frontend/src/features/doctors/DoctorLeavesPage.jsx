import { useState, useEffect } from 'react';
import { leaveApi } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import { Calendar, Clock, ClipboardList, CheckCircle, XCircle, AlertCircle, Plus, RefreshCw } from 'lucide-react';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black dark:bg-navy-800 dark:border-white/[0.08] dark:text-white';

const DoctorLeavesPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);

  const [form, setForm] = useState({
    start_datetime: '',
    end_datetime: '',
    leave_type: '',
    reason: ''
  });

  const fetchBalancesAndPolicy = async () => {
    try {
      const [balRes, policyRes] = await Promise.all([
        leaveApi.getBalances(),
        leaveApi.getPolicy()
      ]);
      setBalances(balRes.balances || []);
      const types = policyRes.policy?.leaveTypes || [];
      setLeaveTypes(types);
      if (types.length > 0 && !form.leave_type) {
        setForm(f => ({ ...f, leave_type: types[0].code }));
      }
    } catch (err) {
      console.error('Failed to fetch balances or leave policy', err);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const response = await leaveApi.list();
      setLeaves(response.leaves || []);
      await fetchBalancesAndPolicy();
    } catch (err) {
      console.error('Failed to load leaves', err);
      setError('Could not load leave history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await leaveApi.apply(form);
      setSuccess('Leave request submitted successfully!');
      setForm(prev => ({
        start_datetime: '',
        end_datetime: '',
        leave_type: leaveTypes[0]?.code || '',
        reason: ''
      }));
      setShowApplyModal(false);
      fetchLeaves();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    setError('');
    setSuccess('');
    try {
      await leaveApi.cancel(id);
      setSuccess('Leave request cancelled successfully.');
      fetchLeaves();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel leave request.');
    }
  };

  const getRequestedDays = () => {
    if (!form.start_datetime || !form.end_datetime) return 0;
    const start = new Date(form.start_datetime);
    const end = new Date(form.end_datetime);
    if (start >= end) return 0;
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours <= 4) return 0.5;
    if (diffHours <= 24) return 1.0;
    return Math.ceil(diffHours / 24);
  };

  const selectedBalance = balances.find(b => b.leaveType === form.leave_type);
  const requestedDays = getRequestedDays();
  const exceedsAllowance = selectedBalance && selectedBalance.remaining < requestedDays;

  return (
    <div className="grid gap-8 p-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Doctor Portal"
          title="My Leaves & Time Off"
          description="Apply for full day or partial day leaves, and track approval status."
        />
        <button
          onClick={() => setShowApplyModal(true)}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 hover:shadow-emerald-700/25 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {success && <p className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-100">{success}</p>}
      {error && <p className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-sm font-semibold border border-rose-100">{error}</p>}

      {/* Leave Balances Grid */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {balances.map((b) => (
            <div key={b.leaveType} className="rounded-2xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-4 shadow-sm text-center">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                {b.leaveType.replaceAll('_', ' ')}
              </span>
              <span className="text-2xl font-extrabold text-stone-900 dark:text-white block mt-1.5">
                {b.remaining}
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">
                Allocated: {b.allocated} | Used: {b.used}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Leave History List */}
      <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-emerald-600" size={20} />
            <span>Leave Requests History</span>
          </h3>
          <button onClick={fetchLeaves} className="text-stone-500 hover:text-stone-955 dark:hover:text-white">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <RefreshCw size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-stone-200 dark:border-white/[0.08] rounded-2xl">
            <Calendar className="mx-auto text-stone-400 mb-2" size={32} />
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No leave requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-white/[0.08]">
                  <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300">Leave Type</th>
                  <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300 font-bold"><Clock size={14} className="inline mr-1" />Start Datetime</th>
                  <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300 font-bold"><Clock size={14} className="inline mr-1" />End Datetime</th>
                  <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300">Reason</th>
                  <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300 text-center">Status</th>
                  <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id} className="border-b border-stone-100 dark:border-white/[0.04] transition hover:bg-stone-50/50 dark:hover:bg-navy-950/40">
                    <td className="py-4 px-4 font-semibold text-stone-905 dark:text-white">
                      {l.leave_type.replaceAll('_', ' ')}
                      {l.isUnpaid && <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Unpaid</span>}
                    </td>
                    <td className="py-4 px-4 text-stone-600 dark:text-stone-400">
                      {new Date(l.start_datetime).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4 text-stone-600 dark:text-stone-400">
                      {new Date(l.end_datetime).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4 text-stone-500 dark:text-stone-400 truncate max-w-xs" title={l.reason}>
                      {l.reason || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        l.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : l.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : l.status === 'cancelled'
                          ? 'bg-stone-50 text-stone-605 dark:bg-navy-800 dark:text-stone-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {l.status === 'approved' && <CheckCircle size={12} />}
                        {l.status === 'rejected' && <XCircle size={12} />}
                        {l.status === 'pending' && <AlertCircle size={12} />}
                        <span>{l.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {(l.status === 'pending' || l.status === 'approved') && (
                        <button
                          onClick={() => handleCancel(l._id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-750 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 rounded-3xl border border-stone-200 dark:border-white/[0.08] p-6 max-w-lg w-full shadow-2xl animate-in fade-in-50 duration-200">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2 flex items-center gap-2">
              <Calendar className="text-emerald-600" size={22} />
              <span>Apply for Leave</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
              Fill in your time-off details. If approved, conflicting slots will be handled by the administrator.
            </p>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">Leave Type</label>
                <select
                  value={form.leave_type}
                  onChange={(e) => setForm(prev => ({ ...prev, leave_type: e.target.value }))}
                  className={FIELD_CLASS}
                >
                  {leaveTypes.map(type => (
                    <option key={type.code} value={type.code}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">Start Datetime</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_datetime}
                    onChange={(e) => setForm(prev => ({ ...prev, start_datetime: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">End Datetime</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.end_datetime}
                    onChange={(e) => setForm(prev => ({ ...prev, end_datetime: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              {exceedsAllowance && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-start gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div className="text-[11px] font-semibold">
                    <span className="font-bold">Allowance Exceeded: </span>
                    You are requesting {requestedDays} days, but only have {selectedBalance.remaining} days remaining. 
                    This request will be flagged as <span className="font-bold underline">unpaid leave / salary deduction</span> if approved.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">Reason / Comments</label>
                <textarea
                  placeholder="State the reason for your leave request..."
                  value={form.reason}
                  onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  className={`${FIELD_CLASS} min-h-24 resize-none`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-white/[0.08] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-navy-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLeavesPage;
