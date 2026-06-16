const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const routeOptions = ['oral', 'topical', 'injection', 'inhalation', 'other'];

const MedicineItemForm = ({ item, index, onChange, onRemove, disableRemove = false }) => (
  <div className="grid gap-3 rounded-3xl border border-stone-200 bg-stone-50 p-4 xl:grid-cols-12">
    <input
      className={`${FIELD_CLASS} xl:col-span-3`}
      value={item.medicineName}
      onChange={(event) => onChange(index, 'medicineName', event.target.value)}
      placeholder="Medicine name"
    />
    <input
      className={`${FIELD_CLASS} xl:col-span-2`}
      value={item.genericName}
      onChange={(event) => onChange(index, 'genericName', event.target.value)}
      placeholder="Generic name"
    />
    <input
      className={`${FIELD_CLASS} xl:col-span-2`}
      value={item.dosage}
      onChange={(event) => onChange(index, 'dosage', event.target.value)}
      placeholder="Dosage"
    />
    <input
      className={`${FIELD_CLASS} xl:col-span-2`}
      value={item.frequency}
      onChange={(event) => onChange(index, 'frequency', event.target.value)}
      placeholder="Frequency"
    />
    <input
      className={`${FIELD_CLASS} xl:col-span-2`}
      value={item.duration}
      onChange={(event) => onChange(index, 'duration', event.target.value)}
      placeholder="Duration"
    />
    <select
      className={`${FIELD_CLASS} xl:col-span-1`}
      value={item.route}
      onChange={(event) => onChange(index, 'route', event.target.value)}
    >
      {routeOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    <input
      className={`${FIELD_CLASS} xl:col-span-2`}
      value={item.timing}
      onChange={(event) => onChange(index, 'timing', event.target.value)}
      placeholder="Timing"
    />
    <input
      className={`${FIELD_CLASS} xl:col-span-4`}
      value={item.instructions}
      onChange={(event) => onChange(index, 'instructions', event.target.value)}
      placeholder="Instructions"
    />
    <input
      className={`${FIELD_CLASS} xl:col-span-2`}
      type="number"
      min="1"
      value={item.quantity}
      onChange={(event) => onChange(index, 'quantity', event.target.value)}
      placeholder="Quantity"
    />
    <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 xl:col-span-2">
      <input
        type="checkbox"
        checked={Boolean(item.isSubstituteAllowed)}
        onChange={(event) => onChange(index, 'isSubstituteAllowed', event.target.checked)}
      />
      Substitute allowed
    </label>
    <button
      type="button"
      disabled={disableRemove}
      onClick={() => onRemove(index)}
      className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:border-stone-200 disabled:text-stone-400 xl:col-span-1"
    >
      Remove
    </button>
  </div>
);

export default MedicineItemForm;
