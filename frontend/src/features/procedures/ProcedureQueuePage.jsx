import { useEffect, useState, useCallback } from 'react';
import { 
  Activity, Play, CheckCircle, XCircle, Search, Clock, 
  MapPin, User, AlertTriangle, ShieldCheck, RefreshCw, FileText, ArrowRight, Loader2, Undo2
} from 'lucide-react';
import { procedureApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function ProcedureQueuePage() {
  const { user } = useAuth();
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Ready To Perform'); // Tab filters: 'Payment Pending', 'Ready To Perform', 'In Progress', 'Completed', 'Cancelled', 'Refund Pending'

  // Modals state
  const [activeProcedure, setActiveProcedure] = useState(null);
  const [modalType, setModalType] = useState(null); // 'start', 'complete', 'cancel', 'timeline'
  
  // Action inputs
  const [room, setRoom] = useState('Procedure Room 2');
  const [performingStaff, setPerformingStaff] = useState(user?.fullName || '');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');
  const [complications, setComplications] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    try {
      // Use list API. Filtering by tab is done on frontend or backend.
      const res = await procedureApi.list();
      setProcedures(res.procedures || res.data?.procedures || []);
    } catch (err) {
      toast.error('Failed to load procedure queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  const handleOpenModal = (proc, type) => {
    setActiveProcedure(proc);
    setModalType(type);
    setNotes('');
    setComplications('');
    setCancelReason('');
    if (type === 'start') {
      setRoom('Procedure Room 2');
      setPerformingStaff(user?.fullName || '');
      setEquipment('');
    }
  };

  const handleStartProcedure = async () => {
    if (!activeProcedure) return;
    setActionLoading(true);
    try {
      await procedureApi.start(activeProcedure._id, {
        room,
        performingStaffId: user?._id,
        equipmentUsed: equipment ? equipment.split(',').map(e => e.trim()) : [],
        notes
      });
      toast.success('Procedure started. Status updated to In Progress.');
      setModalType(null);
      fetchProcedures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start procedure');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteProcedure = async () => {
    if (!activeProcedure) return;
    setActionLoading(true);
    try {
      await procedureApi.complete(activeProcedure._id, {
        notes,
        complications
      });
      toast.success('Procedure completed successfully.');
      setModalType(null);
      fetchProcedures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete procedure');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelProcedure = async () => {
    if (!activeProcedure) return;
    if (!cancelReason) {
      toast.error('Please enter a cancellation reason.');
      return;
    }
    setActionLoading(true);
    try {
      await procedureApi.cancel(activeProcedure._id, {
        reason: cancelReason
      });
      toast.success('Procedure status updated.');
      setModalType(null);
      fetchProcedures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel procedure');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRefund = async (procId) => {
    if (!window.confirm('Approve and process refund for this procedure?')) return;
    try {
      await procedureApi.approveRefund(procId);
      toast.success('Refund approved and marked as completed.');
      fetchProcedures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve refund');
    }
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'emergency':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'urgent':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-105 text-slate-600 border-slate-200';
    }
  };

  // Filter local state based on activeTab and search
  const filteredList = procedures.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientId?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = false;
    if (activeTab === 'Payment Pending') matchesTab = p.status === 'Payment Pending';
    else if (activeTab === 'Ready To Perform') matchesTab = p.status === 'Ready To Perform' || p.status === 'Called';
    else if (activeTab === 'In Progress') matchesTab = p.status === 'In Progress';
    else if (activeTab === 'Completed') matchesTab = p.status === 'Completed';
    else if (activeTab === 'Cancelled') matchesTab = p.status.includes('Cancelled') || p.status === 'Refunded';
    else if (activeTab === 'Refund Pending') matchesTab = p.status === 'Refund Pending';

    return matchesSearch && matchesTab;
  });

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="text-indigo-650" size={24} />
            Clinical Procedure Queue
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage and track procedure workflows and payments</p>
        </div>
        <button 
          onClick={fetchProcedures}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl shadow-sm transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Queue
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-full sm:w-auto">
          {['Payment Pending', 'Ready To Perform', 'In Progress', 'Completed', 'Refund Pending', 'Cancelled'].map((tab) => {
            const count = procedures.filter(p => {
              if (tab === 'Payment Pending') return p.status === 'Payment Pending';
              if (tab === 'Ready To Perform') return p.status === 'Ready To Perform' || p.status === 'Called';
              if (tab === 'In Progress') return p.status === 'In Progress';
              if (tab === 'Completed') return p.status === 'Completed';
              if (tab === 'Refund Pending') return p.status === 'Refund Pending';
              return p.status.includes('Cancelled') || p.status === 'Refunded';
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-indigo-650 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search patient / procedure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Queue List */}
      {loading && procedures.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic text-sm">
          No procedures currently in this state.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((proc) => (
            <div key={proc._id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 space-y-4 relative overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-start gap-3">
                <div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getPriorityBadge(proc.priority)}`}>
                    {proc.priority}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-850 mt-2">{proc.name}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Patient: {proc.patientId?.fullName || 'N/A'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-indigo-700">₹{proc.totalAmount}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">Qty: {proc.quantity}</p>
                </div>
              </div>

              {/* Status and Receipt Badge */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {proc.receiptNumber ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                    <ShieldCheck size={12} /> Payment Verified ✔ (Ref: {proc.receiptNumber})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                    <Clock size={12} /> Unpaid
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-400">
                  Doctor: {proc.doctorId?.fullName}
                </span>
              </div>

              {/* Meta details if active or finished */}
              {(proc.room || proc.notes) && (
                <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                  {proc.room && <div className="flex gap-2"><MapPin size={11} className="text-slate-400 mt-0.5 shrink-0" /> <span className="font-semibold">{proc.room}</span></div>}
                  {proc.notes && <div className="flex gap-2"><FileText size={11} className="text-slate-400 mt-0.5 shrink-0" /> <span>{proc.notes}</span></div>}
                  {proc.complications && <div className="text-rose-600 font-semibold flex gap-1"><AlertTriangle size={11} /> Complication: {proc.complications}</div>}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenModal(proc, 'timeline')}
                  className="text-[11px] font-bold text-indigo-650 hover:text-indigo-800 transition"
                >
                  View Timeline
                </button>
                <div className="flex items-center gap-2">
                  {/* Cancel button */}
                  {!['Completed', 'Refunded', 'Cancelled Before Payment', 'Cancelled After Payment'].includes(proc.status) && (
                    <button
                      onClick={() => handleOpenModal(proc, 'cancel')}
                      className="px-3 py-1.5 border border-slate-200 hover:border-rose-400 text-slate-500 hover:text-rose-600 text-xs font-bold rounded-xl transition"
                    >
                      Cancel
                    </button>
                  )}

                  {/* Start Procedure */}
                  {proc.status === 'Ready To Perform' && (
                    <button
                      onClick={() => handleOpenModal(proc, 'start')}
                      className="flex items-center gap-1 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                    >
                      <Play size={12} />
                      Start
                    </button>
                  )}

                  {/* Complete Procedure */}
                  {proc.status === 'In Progress' && (
                    <button
                      onClick={() => handleOpenModal(proc, 'complete')}
                      className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl shadow-sm transition"
                    >
                      <CheckCircle size={12} />
                      Complete
                    </button>
                  )}

                  {/* Admin Refund Approve */}
                  {proc.status === 'Refund Pending' && isAdmin && (
                    <button
                      onClick={() => handleApproveRefund(proc._id)}
                      className="flex items-center gap-1 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                    >
                      <Undo2 size={12} />
                      Approve Refund
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Procedure Modal */}
      {modalType === 'start' && activeProcedure && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Start Procedure: {activeProcedure.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Room / Location</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Procedure Room 2"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Performing Staff</label>
                <input
                  type="text"
                  value={performingStaff}
                  onChange={(e) => setPerformingStaff(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Equipment Used (comma separated)</label>
                <input
                  type="text"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="e.g. Nebulizer Mask, Oxygen Hose"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes / Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional start notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none h-16"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setModalType(null)} className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition">
                Cancel
              </button>
              <button
                onClick={handleStartProcedure}
                disabled={actionLoading}
                className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
              >
                {actionLoading && <Loader2 size={12} className="animate-spin" />}
                Confirm Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Procedure Modal */}
      {modalType === 'complete' && activeProcedure && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Complete Procedure: {activeProcedure.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Completion Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record procedure outcomes, values, or notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none h-20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Complications (if any)</label>
                <input
                  type="text"
                  value={complications}
                  onChange={(e) => setComplications(e.target.value)}
                  placeholder="e.g. Minor bleeding, skin irritation"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setModalType(null)} className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition">
                Cancel
              </button>
              <button
                onClick={handleCompleteProcedure}
                disabled={actionLoading}
                className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
              >
                {actionLoading && <Loader2 size={12} className="animate-spin" />}
                Confirm Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Procedure Modal */}
      {modalType === 'cancel' && activeProcedure && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Cancel Procedure: {activeProcedure.name}</h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for Cancellation</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why is this procedure being cancelled?"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none h-20"
              />
              {activeProcedure.status !== 'Payment Pending' && (
                <div className="mt-2 bg-rose-50 text-rose-700 text-[10px] p-2.5 rounded-lg font-semibold flex gap-1.5 border border-rose-100">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  This procedure is paid. Cancelling will initiate a refund request of ₹{activeProcedure.totalAmount} for Admin approval.
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setModalType(null)} className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition">
                Back
              </button>
              <button
                onClick={handleCancelProcedure}
                disabled={actionLoading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
              >
                {actionLoading && <Loader2 size={12} className="animate-spin" />}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {modalType === 'timeline' && activeProcedure && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Workflow Timeline: {activeProcedure.name}</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-xs">Close</button>
            </div>
            
            <div className="relative border-l-2 border-slate-200 pl-4 py-2 space-y-5 max-h-[350px] overflow-y-auto">
              {activeProcedure.timeline?.map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Dot indicator */}
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-sm ring-4 ring-slate-100" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{step.status}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(step.timestamp).toLocaleString('en-IN')}</p>
                    {step.notes && <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2 mt-1.5 leading-relaxed">{step.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-2 border-t border-slate-100">
              <button onClick={() => setModalType(null)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
