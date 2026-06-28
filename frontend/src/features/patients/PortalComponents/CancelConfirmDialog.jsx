import { useState } from 'react';
import { X, Calendar, Clock, AlertTriangle, Info, Shield, RotateCcw, AlertCircle } from 'lucide-react';

function fmt12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = ((h % 12) || 12);
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
}

export default function CancelConfirmDialog({ appointment, appointmentApi, onClose, onSuccess }) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const dateLabel = appointment?.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    : '—';
  const timeLabel = fmt12(appointment?.startTime || '');
  const doctorName = appointment?.doctorId?.fullName || 'Doctor';

  const handleCancel = async () => {
    setError('');
    setCancelling(true);
    try {
      await appointmentApi.cancelAppointment(appointment._id, { cancellationReason: 'Cancelled by patient' });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to cancel. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !cancelling) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cancel Appointment?</h3>
              <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cancelling}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Appointment being cancelled */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-2">Appointment to be Cancelled</p>
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span>{dateLabel}</span>
            </div>
            {timeLabel && (
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Clock size={13} className="text-slate-400 shrink-0" />
                <span>{timeLabel}</span>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">with Dr. {doctorName}</p>
          </div>

          {/* Key messages */}
          <div className="space-y-2">
            <div className="flex items-start gap-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
              <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-blue-300 leading-relaxed">
                Your appointment slot on <strong>{dateLabel}</strong>{timeLabel ? ` at ${timeLabel}` : ''} will be freed and made available for other patients to book.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
              <Shield size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-emerald-300 leading-relaxed">
                <strong>No cancellation charges</strong> — your cancellation is completely free of cost.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-[12px] text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 border border-white/[0.08] transition"
          >
            Keep Appointment
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30 transition flex items-center gap-2"
          >
            {cancelling && <RotateCcw size={14} className="animate-spin" />}
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}
