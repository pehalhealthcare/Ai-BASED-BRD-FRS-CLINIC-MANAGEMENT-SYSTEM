const TextareaField = ({ label, icon, value, onChange, rows = 4, placeholder }) => (
  <label className="group grid gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
    <span className="flex items-center gap-2">
      {icon && <span className="text-base">{icon}</span>}
      {label}
    </span>
    <textarea
      className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 px-4 py-3 text-sm text-stone-800 dark:text-stone-200 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 placeholder:text-stone-400 dark:placeholder:text-stone-500 resize-y"
      rows={rows}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
    />
  </label>
);

const ClinicalNotesEditor = ({ form, onFieldChange }) => (
  <div className="grid gap-5 animate-fade-in">
    <TextareaField
      label="Raw Clinical Note"
      icon="📋"
      value={form.clinicalNotes}
      onChange={(event) => onFieldChange('clinicalNotes', event.target.value)}
      rows={5}
      placeholder="Document relevant positives, negatives, examination findings, and progress notes."
    />
    <div className="grid gap-4 lg:grid-cols-2">
      <TextareaField
        label="Diagnosis Notes"
        icon="🔬"
        value={form.diagnosis.notes}
        onChange={(event) => onFieldChange('diagnosis.notes', event.target.value)}
        placeholder="Doctor-controlled diagnosis notes and reasoning."
      />
      <TextareaField
        label="Treatment Plan"
        icon="💊"
        value={form.treatmentPlan}
        onChange={(event) => onFieldChange('treatmentPlan', event.target.value)}
        placeholder="Hydration, monitoring, treatment plan, and precautions."
      />
    </div>
    <TextareaField
      label="Follow-up Notes"
      icon="📅"
      value={form.followUp.notes}
      onChange={(event) => onFieldChange('followUp.notes', event.target.value)}
      placeholder="When to return, warning signs, and follow-up instructions."
    />
  </div>
);

export default ClinicalNotesEditor;
