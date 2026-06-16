import { useEffect, useState } from 'react';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const DateRangeFilter = ({ value, onApply, isLoading = false }) => {
  const [draft, setDraft] = useState({
    from: value?.from || '',
    to: value?.to || ''
  });

  useEffect(() => {
    setDraft({
      from: value?.from || '',
      to: value?.to || ''
    });
  }, [value?.from, value?.to]);

  return (
    <form
      className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-200/40 md:grid-cols-[1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>From</span>
        <input
          className={FIELD_CLASS}
          type="date"
          value={draft.from}
          onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>To</span>
        <input
          className={FIELD_CLASS}
          type="date"
          value={draft.to}
          onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
        />
      </label>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
        >
          {isLoading ? 'Refreshing...' : 'Apply'}
        </button>
        <button
          type="button"
          onClick={() => {
            const cleared = { from: '', to: '' };
            setDraft(cleared);
            onApply(cleared);
          }}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Last 30 days
        </button>
      </div>
    </form>
  );
};

export default DateRangeFilter;
