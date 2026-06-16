import NoDataState from './NoDataState';

const formatTimestamp = (value) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
};

const ActivityFeed = ({ items = [] }) => {
  if (!items.length) {
    return (
      <NoDataState
        title="No recent activity"
        description="Recent appointments, consultations, invoices, lab reports, dispensings, and sent notifications will appear here."
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={`${item.type}-${item.entityId}-${item.timestamp}`} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                {String(item.type || 'activity').replaceAll('_', ' ')}
              </p>
              <p className="mt-1 text-sm text-stone-800">{item.label || 'Activity logged'}</p>
            </div>
            <p className="text-sm text-stone-500">{formatTimestamp(item.timestamp)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ActivityFeed;
