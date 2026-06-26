import { useState } from 'react';
import {
  Bell, Building2, Calendar, CalendarPlus, CheckCircle2, ChevronLeft,
  ChevronRight, Clock, MapPin, RotateCcw, Search, Shield, Star,
  XCircle, Video, Eye, Filter, CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../../../components/ui/Avatar';

export default function Appointments({
  appointments,
  appointmentApi,
  loadPortal,
  cancellingApptId,
  setCancellingApptId,
  apptFilterTab, setApptFilterTab,
  apptSearch, setApptSearch,
  apptSort, setApptSort,
  calendarMonth, setCalendarMonth,
  clinics,
  invoices
}) {
  const now = new Date();

  // Custom Date Range State
  const [startVal, setStartVal] = useState('');
  const [endVal, setEndVal] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const filteredAppts = appointments.filter(apt => {
    const status = apt.status?.toLowerCase() || 'scheduled';
    const doctorName = apt.doctorId?.fullName?.toLowerCase() || '';
    const reason = apt.reasonForVisit?.toLowerCase() || '';
    const searchMatch = !apptSearch || doctorName.includes(apptSearch.toLowerCase()) || reason.includes(apptSearch.toLowerCase());
    if (!searchMatch) return false;

    // Date filtering
    if (apt.appointmentDate) {
      const apptTime = new Date(apt.appointmentDate);

      // If custom date range is set, filter by that
      if (startVal || endVal) {
        if (startVal) {
          const sDate = new Date(startVal);
          sDate.setHours(0, 0, 0, 0);
          if (apptTime < sDate) return false;
        }
        if (endVal) {
          const eDate = new Date(endVal);
          eDate.setHours(23, 59, 59, 999);
          if (apptTime > eDate) return false;
        }
      } else {
        // Fallback: Default to only show current calendar month's appointments
        const calYear = calendarMonth.getFullYear();
        const calMon = calendarMonth.getMonth();
        if (apptTime.getFullYear() !== calYear || apptTime.getMonth() !== calMon) {
          return false;
        }
      }
    }

    if (apptFilterTab === 'upcoming') return status !== 'cancelled' && status !== 'completed';
    if (apptFilterTab === 'completed') return status === 'completed';
    if (apptFilterTab === 'cancelled') return status === 'cancelled';
    return true;
  }).sort((a, b) => {
    if (apptFilterTab === 'all') {
      const statusOrder = { scheduled: 0, booked: 0, confirmed: 0, checked_in: 0, in_consultation: 0, completed: 1, cancelled: 2, no_show: 3 };
      const statusA = a.status?.toLowerCase() || 'scheduled';
      const statusB = b.status?.toLowerCase() || 'scheduled';
      const orderA = statusOrder[statusA] ?? 99;
      const orderB = statusOrder[statusB] ?? 99;

      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If both are upcoming (confirmed/scheduled), sort ascending (first appointment first)
      if (orderA === 0) {
        return new Date(a.appointmentDate) - new Date(b.appointmentDate);
      }
      // Otherwise sort descending (most recent completed/cancelled first)
      return new Date(b.appointmentDate) - new Date(a.appointmentDate);
    }

    if (apptSort === 'date') {
      // Default to sorting ascending for upcoming, descending for completed/cancelled
      if (apptFilterTab === 'upcoming') {
        return new Date(a.appointmentDate) - new Date(b.appointmentDate);
      }
      return new Date(b.appointmentDate) - new Date(a.appointmentDate);
    }
    if (apptSort === 'doctor') return (a.doctorId?.fullName || '').localeCompare(b.doctorId?.fullName || '');
    return 0;
  });

  const upcomingCount = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

  const calYear = calendarMonth.getFullYear();
  const calMon = calendarMonth.getMonth();
  const firstDay = new Date(calYear, calMon, 1).getDay();
  const daysInMonth = new Date(calYear, calMon + 1, 0).getDate();
  const apptDays = new Set(
    appointments.map(a => {
      if (!a.appointmentDate) return null;
      const d = new Date(a.appointmentDate);
      if (d.getFullYear() === calYear && d.getMonth() === calMon) return d.getDate();
      return null;
    }).filter(Boolean)
  );
  const todayDate = now.getDate();
  const todayMon = now.getMonth();
  const todayYear = now.getFullYear();
  const isToday = (d) => d === todayDate && calMon === todayMon && calYear === todayYear;
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const next7 = appointments.filter(a => {
    if (!a.appointmentDate) return false;
    const d = new Date(a.appointmentDate);
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7 && a.status !== 'cancelled';
  }).sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));

  const primaryClinic = clinics[0];

  return (
    <div className="flex flex-col lg:flex-row gap-5 w-full">
      {/* LEFT: Main Content */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Header and Stats Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-aura-500/10 border border-aura-500/20 flex items-center justify-center shrink-0">
              <Calendar size={22} className="text-aura-500 dark:text-aura-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Appointments</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">View, manage and track all your appointments.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 text-center min-w-[76px]">
              <span className="text-lg font-bold text-emerald-500 dark:text-emerald-400">{upcomingCount}</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Upcoming</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 text-center min-w-[76px]">
              <span className="text-lg font-bold text-slate-600 dark:text-slate-300">{completedCount}</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Completed</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 text-center min-w-[76px]">
              <span className="text-lg font-bold text-slate-600 dark:text-slate-300">{cancelledCount}</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Cancelled</span>
            </div>
            <button
              onClick={() => alert('Integration to Google / Apple Calendar coming soon!')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-navy-900/60 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-center min-w-[90px] transition"
            >
              <CalendarPlus size={16} className="text-aura-500 dark:text-aura-400" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">Add to Calendar</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs + Search + Sort */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 overflow-hidden">
          <div className="flex items-center border-b border-slate-100 dark:border-white/[0.06] px-5 pt-3 bg-slate-50/50 dark:bg-navy-900/20">
            {[
              ['all', 'All Appointments'],
              ['upcoming', 'Upcoming'],
              ['completed', 'Completed'],
              ['cancelled', 'Cancelled']
            ].map(([id, label]) => (
              <button key={id} onClick={() => setApptFilterTab(id)}
                className={`px-4 pb-3 text-sm font-semibold border-b-2 transition-all duration-150 mr-1
                  ${apptFilterTab === id
                    ? 'border-aura-500 text-aura-500 dark:text-aura-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 p-4">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search appointments, doctors..."
                value={apptSearch}
                onChange={e => setApptSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/60 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-aura-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setPickerOpen(!pickerOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition ${pickerOpen ? 'border-aura-500 text-aura-550' : 'text-slate-600 dark:text-slate-300'}`}
              >
                <Calendar size={13} className="text-slate-400" />
                Date Range
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition">
                <Filter size={13} className="text-slate-400" />
                Filter
              </button>
              <select value={apptSort} onChange={e => setApptSort(e.target.value)} className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-aura-400">
                <option value="date">Sort by: Date</option>
                <option value="doctor">Sort by: Doctor</option>
              </select>
            </div>
          </div>

          {pickerOpen && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-navy-900/10 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">From</span>
                <input
                  type="date"
                  value={startVal}
                  onChange={(e) => setStartVal(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 text-xs text-slate-700 dark:text-slate-200 px-3 py-2 outline-none focus:border-aura-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">To</span>
                <input
                  type="date"
                  value={endVal}
                  onChange={(e) => setEndVal(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/60 text-xs text-slate-700 dark:text-slate-200 px-3 py-2 outline-none focus:border-aura-400"
                />
              </div>
              <button
                onClick={() => {
                  setStartVal('');
                  setEndVal('');
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 sm:ml-auto"
              >
                Clear Range
              </button>
            </div>
          )}

          {/* Appointment List (Cards Layout) */}
          <div className="p-4 space-y-4 bg-slate-50/30 dark:bg-navy-900/10 border-t border-slate-100 dark:border-white/[0.04]">
            {filteredAppts.length > 0 ? (
              filteredAppts.map(apt => {
                const isCancelled = apt.status?.toLowerCase() === 'cancelled';
                const isCompleted = apt.status?.toLowerCase() === 'completed';
                const apptDate = apt.appointmentDate ? new Date(apt.appointmentDate) : null;
                const dayNum = apptDate?.toLocaleDateString('en-IN', { day: '2-digit' });
                const monthYear = apptDate?.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) || '';
                const dayName = apptDate?.toLocaleDateString('en-IN', { weekday: 'long' }) || '';
                const apptId = apt.appointmentId || `APT-${apt._id?.slice(-8).toUpperCase()}`;
                const timeString = apt.startTime || 'TBD';

                return (
                  <div
                    key={apt._id}
                    className={`
                      p-5 rounded-2xl border
                      bg-white dark:bg-navy-800
                      border-slate-200 dark:border-white/[0.08]
                      hover:border-aura-400 dark:hover:border-aura-500/50
                      hover:shadow-sm transition-all duration-150
                      grid grid-cols-1 md:grid-cols-[110px_minmax(180px,_1fr)_200px_140px] gap-5 items-start md:items-center
                      ${isCancelled ? 'opacity-70' : ''}
                    `}
                  >
                    {/* Date Block */}
                    <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 rounded-2xl shrink-0 text-center min-w-[110px] w-full md:w-auto">
                      <Calendar size={15} className="text-emerald-500 dark:text-emerald-400 mb-1.5" />
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{dayNum || '--'}</span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5">
                        {monthYear}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">
                        {dayName}
                      </span>
                      <div className="mt-3 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-center w-full">
                        {timeString}
                      </div>
                    </div>

                    {/* Doctor Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <Avatar
                        name={apt.doctorId?.fullName || 'Doctor'}
                        src={apt.doctorId?.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2050/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'}
                        size="xl"
                      />
                      <div className="min-w-0">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider mb-2 border ${isCancelled
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/10'
                            : isCompleted
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10'
                              : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/10'
                          }`}>
                          {apt.status ? apt.status.toUpperCase() : 'UPCOMING'}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Dr. {apt.doctorId?.fullName || 'Unknown Doctor'}</h4>
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{apt.doctorId?.specialization || 'General Physician'}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                          {apt.doctorId?.qualifications?.join(', ') || 'MBBS, MD - General Medicine'}
                        </p>

                        <div className="flex items-center gap-1 mt-2 text-slate-500 dark:text-slate-450">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="text-[11px] font-medium">{apt.clinicId?.name || 'AI-CMS Health Clinic'}, {apt.clinicId?.address?.city || 'Gurugram'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Details Column */}
                    <div className="flex flex-col gap-2.5 shrink-0 w-full md:w-auto md:min-w-[180px] text-left md:border-l md:border-slate-100 md:dark:border-white/[0.06] md:pl-5">
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Appointment ID</p>
                        <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5">{apptId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Reason for Visit</p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate max-w-[180px]">{apt.reasonForVisit || 'Regular Checkup'}</p>
                      </div>
                      <button
                        onClick={() => alert(`Appointment Details:\nID: ${apptId}\nDoctor: Dr. ${apt.doctorId?.fullName}\nReason: ${apt.reasonForVisit || 'Regular Checkup'}\nTime: ${timeString}\nDate: ${apptDate?.toDateString()}`)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-aura-500 dark:text-aura-400 hover:underline mt-1 self-start"
                      >
                        <Eye size={12} />
                        View Details
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto md:min-w-[130px] md:border-l md:border-slate-100 md:dark:border-white/[0.06] md:pl-5">
                      {isCompleted ? (
                        <>
                          {(() => {
                            const relatedInvoice = (invoices || []).find(
                              (inv) =>
                                String(inv.appointmentId?._id || inv.appointmentId) === String(apt._id) ||
                                String(inv.consultationId?._id || inv.consultationId) === String(apt.consultationId?._id || apt.consultationId)
                            );
                            const isPaid = relatedInvoice?.paymentStatus === 'paid';
                            const consultationId = apt.consultationId?._id || apt.consultationId || relatedInvoice?.consultationId?._id || relatedInvoice?.consultationId;

                            return (
                              <>
                                {!isPaid && relatedInvoice ? (
                                  <Link
                                    to={`/billing/${relatedInvoice._id}/checkout`}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition text-center"
                                  >
                                    <CreditCard size={12} />
                                    Pay Appointment fees
                                  </Link>
                                ) : (
                                  <div className="w-full text-center py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Fees Paid
                                  </div>
                                )}

                                {consultationId && (
                                  <Link
                                    to={`/consultations/${consultationId}`}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-aura-600 dark:bg-aura-500 text-white hover:bg-aura-700 dark:hover:bg-aura-600 transition text-center"
                                  >
                                    <Eye size={12} />
                                    View Consultation
                                  </Link>
                                )}
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          {!isCancelled && (
                            <button
                              onClick={() => alert('To reschedule, please cancel this slot and book a new one using the Symptom Checker.')}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-aura-600 dark:bg-aura-500 text-white hover:bg-aura-700 dark:hover:bg-aura-600 transition"
                            >
                              <CalendarPlus size={12} />
                              Reschedule
                            </button>
                          )}

                          {!isCancelled && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to cancel this appointment?')) {
                                  setCancellingApptId(apt._id);
                                  try {
                                    await appointmentApi.cancelAppointment(apt._id, { reason: 'Cancelled by patient' });
                                    loadPortal(false);
                                  } catch (err) {
                                    alert(err.response?.data?.message || 'Failed to cancel appointment');
                                  } finally {
                                    setCancellingApptId(null);
                                  }
                                }
                              }}
                              disabled={cancellingApptId === apt._id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition"
                            >
                              {cancellingApptId === apt._id ? <RotateCcw size={12} className="animate-spin" /> : <XCircle size={12} />}
                              Cancel
                            </button>
                          )}

                          <button
                            onClick={() => {
                              const event = {
                                title: `Appt with Dr. ${apt.doctorId?.fullName || 'Doctor'}`,
                                date: apt.appointmentDate,
                                time: timeString
                              };
                              alert(`Adding to calendar:\n${event.title}\nDate: ${event.date}\nTime: ${event.time}`);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition"
                          >
                            <Calendar size={12} />
                            Add to Calendar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
                <div className="w-16 h-16 rounded-2xl bg-aura-500/10 flex items-center justify-center mb-4">
                  <Calendar size={28} className="text-aura-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No appointments found</h3>
                <p className="text-xs text-slate-400 text-center max-w-xs">
                  {apptFilterTab === 'upcoming' ? "You don't have any upcoming appointments." : `No ${apptFilterTab} appointments found.`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Appointment Reminders Banner */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 overflow-hidden relative">
          <div className="flex items-center justify-between gap-5 p-5">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Bell size={22} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Appointment Reminders</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  You will receive a reminder notification 24 hours before your appointment.
                </p>
              </div>
            </div>

            {/* Calendar icon bell illustration on the right */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-aura-500/20 to-indigo-500/10 border border-aura-500/20 dark:border-white/10 flex flex-col items-center justify-center">
                  <Calendar size={20} className="text-aura-500 dark:text-aura-400 mb-0.5" />
                  <Bell size={10} className="text-amber-400" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white dark:border-navy-800 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">1</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center flex items-center justify-center gap-1">
          <Shield size={11} /> Your appointment information is private and secure.
        </p>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="hidden lg:flex flex-col gap-4 w-[280px] shrink-0">
        {/* Calendar Widget */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Calendar View</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[100px] text-center">{MONTH_NAMES[calMon]} {calYear}</span>
              <button onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map(d => <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const hasAppt = apptDays.has(day);
              const today = isToday(day);
              return (
                <div key={day} className={`relative flex items-center justify-center h-7 w-7 mx-auto rounded-full text-[11px] font-medium transition-colors ${today ? 'bg-aura-500 text-white font-bold' : hasAppt ? 'bg-aura-500/15 text-aura-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                  {day}
                  {hasAppt && !today && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-aura-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Next 7 Days */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming (Next 7 Days)</h3>
            <button onClick={() => { setApptFilterTab('all'); setApptSearch(''); }} className="text-[11px] text-aura-400 hover:text-aura-500 font-semibold">View All</button>
          </div>
          {next7.length > 0 ? (
            <div className="space-y-2.5">
              {next7.slice(0, 3).map(apt => {
                const d = apt.appointmentDate ? new Date(apt.appointmentDate) : null;
                return (
                  <div key={apt._id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900/50 border border-slate-100 dark:border-white/[0.04]">
                    <div className="w-8 h-8 rounded-xl bg-aura-500/10 flex items-center justify-center shrink-0"><Calendar size={14} className="text-aura-400" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {d?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} {apt.startTime ? `• ${apt.startTime}` : ''}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{apt.doctorId?.fullName || 'Doctor'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-4">No appointments in the next 7 days</p>}
        </div>

        {/* Reschedule */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-4">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0"><Calendar size={14} className="text-emerald-500" /></div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Need to Reschedule?</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Can't make it to your appointment? Reschedule anytime, hassle-free.</p>
            </div>
          </div>
          <button onClick={() => alert('To reschedule, please cancel your existing slot and book a new one.')} className="block text-center w-full py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition">Reschedule Appointment</button>
        </div>

        {/* Clinic Info */}
        {primaryClinic && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clinic Information</h3>
            </div>

            <div className="p-4 space-y-3">
              {/* Graphic/Image of the clinic */}
              <div className="w-full h-32 rounded-xl bg-slate-100 dark:bg-navy-900/60 overflow-hidden relative border border-slate-200 dark:border-white/10">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-aura-500/10 to-indigo-500/20">
                  <Building2 size={48} className="text-aura-400/30 dark:text-aura-400/20" />
                </div>
                <div className="absolute bottom-2.5 left-3 z-20">
                  <p className="text-xs font-bold text-white">{primaryClinic.name}</p>
                </div>
              </div>

              <div className="min-w-0">
                {primaryClinic.address && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {[primaryClinic.address.line1, primaryClinic.address.city, primaryClinic.address.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <Link to="/appointments" className="block text-center w-full py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-aura-500 dark:text-aura-400 transition">
                View Clinic Details
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
