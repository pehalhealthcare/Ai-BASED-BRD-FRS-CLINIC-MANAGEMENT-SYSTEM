const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const SOAPNoteEditor = ({ value = {}, onChange }) => (
  <section className="grid gap-4">
    <div>
      <h3 className="text-lg font-semibold text-stone-900">SOAP note</h3>
      <p className="mt-1 text-sm text-stone-600">AI formatting is assistive only. Review and edit before saving.</p>
    </div>
    <div className="grid gap-4">
      {[
        ['subjective', 'Subjective'],
        ['objective', 'Objective'],
        ['assessment', 'Assessment'],
        ['plan', 'Plan']
      ].map(([key, label]) => (
        <label key={key} className="grid gap-2 text-sm font-medium text-stone-700">
          <span>{label}</span>
          <textarea
            className={FIELD_CLASS}
            rows={3}
            value={value?.[key] || ''}
            onChange={(event) => onChange(key, event.target.value)}
            placeholder="Not provided."
          />
        </label>
      ))}
    </div>
  </section>
);

export default SOAPNoteEditor;
