const STATUS_STYLES = {
  booked: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  checked_in: 'bg-amber-100 text-amber-700',
  in_consultation: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  no_show: 'bg-orange-100 text-orange-700',
  rescheduled: 'bg-stone-200 text-stone-700'
};

const AppointmentStatusBadge = ({ status }) => {
  const normalizedStatus = status || 'booked';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[normalizedStatus] || STATUS_STYLES.booked}`}>
      {normalizedStatus.replaceAll('_', ' ')}
    </span>
  );
};

export default AppointmentStatusBadge;
