const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const TextareaField = ({ label, value, onChange, rows = 4, placeholder }) => (
  <label className="grid gap-2 text-sm font-medium text-stone-700">
    <span>{label}</span>
    <textarea className={FIELD_CLASS} rows={rows} value={value || ''} onChange={onChange} placeholder={placeholder} />
  </label>
);

const ClinicalNotesEditor = ({ form, onFieldChange }) => (
  <div className="grid gap-4">
    <TextareaField
      label="Raw clinical note"
      value={form.clinicalNotes}
      onChange={(event) => onFieldChange('clinicalNotes', event.target.value)}
      rows={6}
      placeholder="Document relevant positives, negatives, examination findings, and progress notes."
    />
    <div className="grid gap-4 lg:grid-cols-2">
      <TextareaField
        label="Diagnosis notes"
        value={form.diagnosis.notes}
        onChange={(event) => onFieldChange('diagnosis.notes', event.target.value)}
        placeholder="Doctor-controlled diagnosis notes and reasoning."
      />
      <TextareaField
        label="Treatment plan"
        value={form.treatmentPlan}
        onChange={(event) => onFieldChange('treatmentPlan', event.target.value)}
        placeholder="Hydration, monitoring, treatment plan, and precautions."
      />
    </div>
    <TextareaField
      label="Follow-up notes"
      value={form.followUp.notes}
      onChange={(event) => onFieldChange('followUp.notes', event.target.value)}
      placeholder="When to return, warning signs, and follow-up instructions."
    />
  </div>
);

export default ClinicalNotesEditor;
