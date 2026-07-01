import { useState, useEffect, useCallback } from 'react';
import {
  X, Calendar, Clock, MapPin, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, RotateCcw, Info, AlertTriangle, Shield
} from 'lucide-react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const RESCHEDULE_REASONS = [
  'Personal emergency',
  'Work conflict',
  'Travel plans',
  'Health not improved / worsened',
  'Doctor unavailability',
  'Change of mind',
  'Other',
];

// Generate 30-minute time slots 08:00–20:30
const ALL_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  ALL_SLOTS.push(`${String(h).padStart(2,'0')}:00`);
  ALL_SLOTS.push(`${String(h).padStart(2,'0')}:30`);
}

function fmt12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = ((h % 12) || 12);
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
}

function toLocalDateStr(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Confirmation Dialog ─── */
function ConfirmRescheduleDialog({ appointment, newDate, newTime, onConfirm, onCancel, submitting, error }) {
  const currentDateLabel = appointment?.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const currentTimeLabel = fmt12(appointment?.startTime || '');
  const newDateLabel = formatDateLabel(newDate);
  const newTimeLabel = fmt12(newTime);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Rescheduling</h3>
              <p className="text-xs text-slate-400 mt-0.5">Please review the changes below</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Change summary */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
            {/* Old slot → cancelled */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Current Appointment (will be cancelled)</p>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Calendar size={13} className="text-red-400 shrink-0" />
                <span className="line-through">{currentDateLabel}</span>
              </div>
              {currentTimeLabel && (
                <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                  <Clock size={13} className="text-red-400 shrink-0" />
                  <span className="line-through">{currentTimeLabel}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* New slot */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 mb-1.5">New Appointment</p>
              <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                <Calendar size={13} className="text-emerald-400 shrink-0" />
                <span>{newDateLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold mt-1">
                <Clock size={13} className="text-emerald-400 shrink-0" />
                <span>{newTimeLabel}</span>
              </div>
            </div>
          </div>

          {/* Key messages */}
          <div className="space-y-2">
            <div className="flex items-start gap-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
              <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-blue-300 leading-relaxed">
                Your current slot on <strong>{currentDateLabel}</strong> at <strong>{currentTimeLabel}</strong> will be freed and made available for other patients.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
              <Shield size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-emerald-300 leading-relaxed">
                <strong>No rescheduling charges</strong> — this is completely free of cost.
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
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 border border-white/[0.08] transition"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 transition flex items-center gap-2"
          >
            {submitting && <RotateCcw size={14} className="animate-spin" />}
            {submitting ? 'Rescheduling...' : 'Yes, Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Reschedule Modal ─── */
export default function RescheduleModal({ appointment, appointmentApi, onClose, onSuccess }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const doctor = appointment?.doctorId;
  const currentDateStr = toLocalDateStr(appointment?.appointmentDate);
  const currentTime = appointment?.startTime || '';

  const initMonth = appointment?.appointmentDate ? new Date(appointment.appointmentDate) : new Date();
  const [calMonth, setCalMonth] = useState(new Date(initMonth.getFullYear(), initMonth.getMonth(), 1));

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSlots = useCallback(async (dateStr) => {
    if (!dateStr || !doctor?._id) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot('');
    try {
      const res = await appointmentApi.getAvailableSlots({ doctorId: doctor._id, date: dateStr });
      const slots = Array.isArray(res) ? res : (res?.slots || res?.data?.slots || []);
      const normalized = slots
        .filter(s => typeof s === 'string' || s.available !== false)
        .map(s => (typeof s === 'string' ? s : s.startTime || s.time || ''))
        .filter(Boolean);
      setAvailableSlots(normalized.length > 0 ? normalized : ALL_SLOTS);
    } catch {
      setAvailableSlots(ALL_SLOTS);
    } finally {
      setLoadingSlots(false);
    }
  }, [doctor?._id, appointmentApi]);

  useEffect(() => { if (selectedDate) fetchSlots(selectedDate); }, [selectedDate, fetchSlots]);

  // Calendar
  const calYear = calMonth.getFullYear();
  const calMon = calMonth.getMonth();
  const firstDayOfWeek = new Date(calYear, calMon, 1).getDay();
  const daysInMonth = new Date(calYear, calMon + 1, 0).getDate();

  const isPast = (d) => new Date(calYear, calMon, d) < today;
  const isCurrentAppt = (d) => {
    const s = `${calYear}-${String(calMon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return s === currentDateStr;
  };
  const isSelected = (d) => {
    const s = `${calYear}-${String(calMon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return s === selectedDate;
  };
  const handleDayClick = (d) => {
    if (isPast(d)) return;
    setSelectedDate(`${calYear}-${String(calMon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  };

  const selectedDateLabel = selectedDate ? formatDateLabel(selectedDate) : null;
  const canConfirm = selectedDate && selectedSlot && reason && (reason !== 'Other' || customReason.trim());

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      const finalReason = reason === 'Other' ? customReason.trim() : reason;
      await appointmentApi.rescheduleAppointment(appointment._id, {
        appointmentDate: selectedDate,
        startTime: selectedSlot,
        reason: finalReason,
        durationMinutes: appointment?.durationMinutes || 30,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reschedule. Please try again.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget && !showConfirm) onClose(); }}
      >
        <div
          className="relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '92vh', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-white/[0.07]">
            <div>
              <h2 className="text-lg font-bold text-white">Reschedule Appointment</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select a new date &amp; time for your appointment</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row overflow-y-auto flex-1">

            {/* LEFT: Current Appointment */}
            <div className="md:w-72 shrink-0 p-5 border-r border-white/[0.07] flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-3">Current Appointment</p>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-aura-500/20 flex items-center justify-center text-lg font-bold text-aura-400 shrink-0">
                    {(doctor?.fullName || 'D').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      Dr. {doctor?.fullName || 'Unknown'}
                      {doctor?.isVerified && <CheckCircle2 size={12} className="inline ml-1 text-emerald-400" />}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{doctor?.specialization || 'General Physician'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-300">
                    {appointment?.appointmentDate
                      ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
                      : '—'}
                  </span>
                </div>
                {currentTime && (
                  <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                    <Clock size={13} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-300">{fmt12(currentTime)}</span>
                  </div>
                )}
                {appointment?.reasonForVisit && (
                  <div className="flex items-start gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-300 leading-relaxed">{appointment.reasonForVisit}</span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Reason for Reschedule <span className="text-slate-500">(Required)</span>
                </label>
                <select
                  value={reason}
                  onChange={e => { setReason(e.target.value); setCustomReason(''); }}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-200 text-xs px-3 py-2.5 focus:outline-none focus:border-emerald-500/50 transition"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px', appearance: 'none' }}
                >
                  <option value="" style={{ background: '#0f172a' }}>Select a reason</option>
                  {RESCHEDULE_REASONS.map(r => (
                    <option key={r} value={r} style={{ background: '#0f172a' }}>{r}</option>
                  ))}
                </select>
                {reason === 'Other' && (
                  <textarea rows={2} placeholder="Describe your reason..." value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-200 text-xs px-3 py-2.5 resize-none focus:outline-none focus:border-emerald-500/50 transition placeholder:text-slate-600"
                  />
                )}
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
                <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-300 leading-relaxed">You can reschedule up to 2 hours before the scheduled time.</p>
              </div>
            </div>

            {/* MIDDLE: Calendar */}
            <div className="flex-1 p-5 border-r border-white/[0.07]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Select New Date &amp; Time</p>

              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCalMonth(new Date(calYear, calMon - 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-white">{MONTH_NAMES[calMon]} {calYear}</span>
                <button onClick={() => setCalMonth(new Date(calYear, calMon + 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`b${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const past = isPast(d);
                  const isCurrent = isCurrentAppt(d);
                  const isSel = isSelected(d);
                  return (
                    <button key={d} disabled={past} onClick={() => handleDayClick(d)}
                      className={[
                        'relative mx-auto flex w-9 h-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-150',
                        past ? 'text-slate-700 cursor-not-allowed' :
                        isSel ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110' :
                        isCurrent ? 'text-slate-400 ring-1 ring-slate-600' :
                        'text-slate-300 hover:bg-white/10 cursor-pointer',
                      ].join(' ')}
                    >
                      {d}
                      {isCurrent && !isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-500" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/[0.05]">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-slate-500">Available</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" /><span className="text-[10px] text-slate-500">Selected Date</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" /><span className="text-[10px] text-slate-500">Current Appointment</span></div>
              </div>
            </div>

            {/* RIGHT: Time Slots */}
            <div className="md:w-56 shrink-0 p-5 flex flex-col">
              {selectedDate ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={13} className="text-emerald-400" />
                    <p className="text-xs font-bold text-white">{selectedDateLabel}</p>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Available Time Slots</p>
                  {loadingSlots ? (
                    <div className="flex-1 flex items-center justify-center"><RotateCcw size={20} className="text-emerald-400 animate-spin" /></div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5" style={{ maxHeight: '280px' }}>
                      {availableSlots.map(slot => {
                        const isSel = slot === selectedSlot;
                        return (
                          <button key={slot} onClick={() => setSelectedSlot(slot)}
                            className={[
                              'w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-150 border',
                              isSel ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                     : 'border-white/[0.08] text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300',
                            ].join(' ')}
                          >
                            {fmt12(slot)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-600 text-center mt-3">All timings in IST (UTC +05:30)</p>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                    <Calendar size={20} className="text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500">Select a date to see available time slots</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs flex-1">
                <AlertCircle size={13} /><span>{error}</span>
              </div>
            )}
            {!error && <div className="flex-1" />}
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 border border-white/[0.08] transition">
                Cancel
              </button>
              <button
                onClick={() => { setError(''); setShowConfirm(true); }}
                disabled={!canConfirm}
                className={[
                  'px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-150',
                  canConfirm ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                               : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                ].join(' ')}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <ConfirmRescheduleDialog
          appointment={appointment}
          newDate={selectedDate}
          newTime={selectedSlot}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
          error={error}
        />
      )}
    </>
  );
}
