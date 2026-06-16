const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-stone-200 text-stone-700'
};

const FollowUpStatusBadge = ({ status }) => (
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
      STATUS_STYLES[status] || 'bg-stone-100 text-stone-700'
    }`}
  >
    {status || 'unknown'}
  </span>
);

export default FollowUpStatusBadge;
