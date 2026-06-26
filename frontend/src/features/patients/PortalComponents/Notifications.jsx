import { Bell, X } from 'lucide-react';

export default function Notifications({ notifications, setNotifications, appointments }) {
  const getAppointmentEndDateTime = (appointment) => {
    if (!appointment) return null;
    const dateStr = appointment.appointmentDate;
    const timeStr = appointment.endTime || appointment.startTime;
    if (!dateStr || !timeStr) return null;
    const date = new Date(dateStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const activeNotifs = notifications.filter(notif => {
    if (!notif.appointmentId) return true;
    const aptId = typeof notif.appointmentId === 'object' ? notif.appointmentId._id : notif.appointmentId;
    const appointment = appointments.find(a => a._id === aptId);
    if (!appointment) return true;
    const endDateTime = getAppointmentEndDateTime(appointment);
    if (!endDateTime) return true;
    const expiryTime = new Date(endDateTime.getTime() + 10 * 60 * 1000);
    return new Date() < expiryTime;
  });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Active Alerts & Notifications</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Upcoming appointment reminders and clinic alerts.</p>
        </div>
      </div>

      <div className="space-y-4">
        {activeNotifs.length > 0 ? (
          activeNotifs.map((notif) => (
            <div key={notif._id} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/50 flex justify-between items-start gap-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
                  <Bell size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{notif.subject || 'Alert'}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{notif.body}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                    Received: {notif.createdAt ? new Date(notif.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n._id !== notif._id))}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X size={15} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Bell size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No active notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}
