import EmptyState from '../../components/common/EmptyState';
import AbnormalFlagBadge from './AbnormalFlagBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const LabResultTable = ({ entries = [], editable = false, onEntryChange, onAddEntry, onRemoveEntry }) => {
  if (!entries.length) {
    return (
      <EmptyState
        title="No result entries yet"
        description="Add individual lab result rows to record measured values, reference ranges, and review notes."
        action={
          editable ? (
            <button
              type="button"
              onClick={onAddEntry}
              className="mt-4 rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Add first result
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      {entries.map((entry, index) => (
        <article key={`${entry.code || 'entry'}-${index}`} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-900">{entry.name || `Result ${index + 1}`}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{entry.code || 'Code pending'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AbnormalFlagBadge flag={entry.abnormalFlag || 'normal'} />
              {editable ? (
                <button
                  type="button"
                  onClick={() => onRemoveEntry(index)}
                  className="rounded-2xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Code</span>
              <input
                className={FIELD_CLASS}
                value={entry.code || ''}
                onChange={(event) => onEntryChange(index, 'code', event.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Name</span>
              <input
                className={FIELD_CLASS}
                value={entry.name || ''}
                onChange={(event) => onEntryChange(index, 'name', event.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Display value</span>
              <input
                className={FIELD_CLASS}
                value={entry.value || ''}
                onChange={(event) => onEntryChange(index, 'value', event.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Numeric value</span>
              <input
                className={FIELD_CLASS}
                type="number"
                step="0.01"
                value={entry.numericValue ?? ''}
                onChange={(event) => onEntryChange(index, 'numericValue', event.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Unit</span>
              <input
                className={FIELD_CLASS}
                value={entry.unit || ''}
                onChange={(event) => onEntryChange(index, 'unit', event.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Range min</span>
              <input
                className={FIELD_CLASS}
                type="number"
                step="0.01"
                value={entry.normalRange?.min ?? ''}
                onChange={(event) => onEntryChange(index, 'normalRange.min', event.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Range max</span>
              <input
                className={FIELD_CLASS}
                type="number"
                step="0.01"
                value={entry.normalRange?.max ?? ''}
                onChange={(event) => onEntryChange(index, 'normalRange.max', event.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Range text</span>
              <input
                className={FIELD_CLASS}
                value={entry.normalRange?.text || ''}
                onChange={(event) => onEntryChange(index, 'normalRange.text', event.target.value)}
                disabled={!editable}
              />
            </label>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-medium text-stone-700">
            <span>Interpretation note</span>
            <textarea
              className={FIELD_CLASS}
              rows={3}
              value={entry.interpretationNote || ''}
              onChange={(event) => onEntryChange(index, 'interpretationNote', event.target.value)}
              disabled={!editable}
            />
          </label>
        </article>
      ))}

      {editable ? (
        <button
          type="button"
          onClick={onAddEntry}
          className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Add result row
        </button>
      ) : null}
    </div>
  );
};

export default LabResultTable;
