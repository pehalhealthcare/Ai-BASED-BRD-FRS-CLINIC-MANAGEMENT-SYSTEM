const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  sent: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-stone-200 text-stone-700'
};

const NotificationStatusBadge = ({ status }) => (
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
      STATUS_STYLES[status] || 'bg-stone-100 text-stone-700'
    }`}
  >
    {status || 'unknown'}
  </span>
);

export default NotificationStatusBadge;
