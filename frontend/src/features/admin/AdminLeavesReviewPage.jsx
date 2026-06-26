import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveApi } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import { Calendar, User, Clock, CheckCircle2, XCircle, AlertTriangle, Layers, ArrowLeftRight, Ban, Settings } from 'lucide-react';

const AdminLeavesReviewPage = () => {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'

  const [confirmApprove, setConfirmApprove] = useState(null); // Leave request to approve
  const [policy, setPolicy] = useState('reassign'); // 'reassign' | 'reschedule' | 'cancel'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const response = await leaveApi.list();
      setLeaves(response.leaves || []);
    } catch (err) {
      console.error('Failed to fetch leaves', err);
      setError('Failed to load leave applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleReview = async (leaveId, status) => {
    if (status === 'approved' && !confirmApprove) {
      const leave = leaves.find(l => l._id === leaveId);
      setConfirmApprove(leave);
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await leaveApi.review(leaveId, {
        status,
        conflictPolicy: status === 'approved' ? policy : undefined
      });
      setSuccess(`Leave request has been successfully ${status}!`);
      setConfirmApprove(null);
      fetchLeaves();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${status} leave request.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await leaveApi.cancel(id);
      setSuccess('Leave request cancelled successfully.');
      fetchLeaves();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel leave request.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const processedLeaves = leaves.filter(l => l.status !== 'pending');

  const visibleLeaves = activeTab === 'pending' ? pendingLeaves : processedLeaves;

  return (
    <div className="grid gap-8 p-1">
      <PageHeader
        eyebrow="Clinic Panel"
        title="Doctor Leave Review"
        description="Review doctor leaves, manage schedules, and configure appointment conflict resolution."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Tab system switcher */}
            <div className="flex bg-stone-100 dark:bg-navy-800 p-1 rounded-2xl border border-stone-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'pending'
                    ? 'bg-white dark:bg-navy-900 text-emerald-600 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <span>Pending Review ({pendingLeaves.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-navy-900 text-emerald-600 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <span>History</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/leave-policy')}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-600/10 cursor-pointer animate-fadeIn"
            >
              <Settings size={16} />
              <span>Leave Rules & Limits</span>
            </button>
          </div>
        }
      />

      {success && <p className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-100">{success}</p>}
      {error && <p className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-sm font-semibold border border-rose-100">{error}</p>}

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <CheckCircle2 size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : visibleLeaves.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-stone-200 dark:border-white/[0.08] rounded-2xl">
          <Calendar className="mx-auto text-stone-400 mb-2" size={32} />
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No leaves found for this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleLeaves.map((l) => (
            <div
              key={l._id}
              className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                      Dr. {l.doctorId?.fullName || 'Doctor'}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {l.doctorId?.specialization || 'General'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-stone-400" />
                    <span>
                      <strong>From:</strong> {new Date(l.start_datetime).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-stone-400" />
                    <span>
                      <strong>To:</strong> {new Date(l.end_datetime).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-stone-100 dark:border-white/[0.04]">
                    <span className="font-semibold text-stone-850 dark:text-stone-300">Reason: </span>
                    <span className="italic">"{l.reason || 'N/A'}"</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-white/[0.04] mt-4">
                <span className="text-xs font-bold uppercase tracking-wider bg-stone-100 dark:bg-navy-800 px-2.5 py-1 rounded-md text-stone-700 dark:text-stone-300">
                  {l.leave_type.replaceAll('_', ' ')}
                </span>

                {l.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCancel(l._id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-white/[0.08] text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReview(l._id, 'rejected')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-950/40 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(l._id, 'approved')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      l.status === 'approved' ? 'text-emerald-500' : l.status === 'rejected' ? 'text-rose-500' : 'text-stone-500'
                    }`}>
                      {l.status}
                    </span>
                    {l.status === 'approved' && (
                      <button
                        onClick={() => handleCancel(l._id)}
                        disabled={actionLoading}
                        className="px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-950/40 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                      >
                        Cancel Leave
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Approve & Resolution Policy Modal */}
      {confirmApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 rounded-3xl border border-stone-200 dark:border-white/[0.08] p-6 max-w-md w-full shadow-2xl">
            <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
            <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1 text-center">
              Approve Leave for Dr. {confirmApprove.doctorId?.fullName}?
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 text-center">
              Select the policy to resolve existing appointments during the leave window:
            </p>

            <div className="space-y-3 mb-6">
              {[
                {
                  key: 'reassign',
                  label: 'Assign Alternate Doctor (Best)',
                  desc: 'Search for another active cardiologist / specialist in this clinic and reassign slots automatically.',
                  icon: <ArrowLeftRight className="text-emerald-500" size={16} />
                },
                {
                  key: 'reschedule',
                  label: 'Trigger Patient Rescheduling',
                  desc: 'Cancel the slots and notify patients that doctor leave requires rescheduling.',
                  icon: <Layers className="text-indigo-500" size={16} />
                },
                {
                  key: 'cancel',
                  label: 'Auto Cancel',
                  desc: 'Automatically cancel appointments and notify patients.',
                  icon: <Ban className="text-rose-500" size={16} />
                }
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3 border rounded-2xl cursor-pointer select-none transition-all ${
                    policy === item.key
                      ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900'
                      : 'bg-transparent border-stone-200 dark:border-white/[0.04]'
                  }`}
                >
                  <input
                    type="radio"
                    name="policy"
                    checked={policy === item.key}
                    onChange={() => setPolicy(item.key)}
                    className="text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      {item.icon}
                      <span className="text-xs font-bold text-stone-850 dark:text-white">{item.label}</span>
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setConfirmApprove(null)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-white/[0.08] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-navy-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(confirmApprove._id, 'approved')}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition cursor-pointer"
              >
                {actionLoading ? 'Processing...' : 'Approve & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeavesReviewPage;
