import {
  buildDrugSafetySections,
  canUserOverrideDrugSafety,
  getDrugSafetySeverity,
  requiresDrugSafetyOverride
} from './drugSafetyUi';

const severityClasses = {
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  high: 'border-orange-200 bg-orange-50 text-orange-800',
  critical: 'border-rose-200 bg-rose-50 text-rose-800'
};

const DrugSafetyWarningPanel = ({
  drugSafetyCheck,
  userRole,
  overrideReason,
  onOverrideReasonChange,
  onOverrideAndSave,
  onEditPrescription,
  finalizing = false
}) => {
  if (!drugSafetyCheck) {
    return null;
  }

  const severity = getDrugSafetySeverity(drugSafetyCheck);
  const sections = buildDrugSafetySections(drugSafetyCheck);
  const canOverride = canUserOverrideDrugSafety(userRole, drugSafetyCheck);
  const needsOverride = requiresDrugSafetyOverride(drugSafetyCheck);

  return (
    <article className={`grid gap-4 rounded-3xl border p-6 shadow-lg shadow-stone-200/40 ${severityClasses[severity] || severityClasses.medium}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Potential safety alert</p>
          <h2 className="mt-2 text-2xl font-semibold">Doctor review required</h2>
          <p className="mt-2 text-sm">{drugSafetyCheck?.output?.summary || 'Potential safety alert. Doctor review required.'}</p>
          <p className="mt-2 text-xs opacity-80">
            Assistive drug safety support only. This does not guarantee medication safety.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-current px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
          {severity}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <section key={section.key} className="rounded-2xl border border-white/70 bg-white/60 p-4">
            <h3 className="text-sm font-semibold text-stone-900">{section.title}</h3>
            <ul className="mt-3 grid gap-3 text-sm text-stone-700">
              {section.items.map((item, index) => (
                <li key={`${section.key}-${index}`} className="rounded-2xl bg-white px-4 py-3">
                  <p className="font-semibold text-stone-900">
                    {item.medicine || item.drug_a || item.medicines?.join(' + ') || 'Alert'}
                    {item.drug_b ? ` + ${item.drug_b}` : ''}
                  </p>
                  <p className="mt-1">{item.message}</p>
                  {item.recommendation ? <p className="mt-1 text-xs text-stone-600">{item.recommendation}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {needsOverride ? (
        <label className="grid gap-2 text-sm font-medium text-stone-800">
          <span>Override reason</span>
          <textarea
            className="min-h-[110px] rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={overrideReason}
            onChange={(event) => onOverrideReasonChange?.(event.target.value)}
            placeholder="Explain why you are proceeding despite this potential safety alert."
          />
        </label>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onEditPrescription}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Edit Prescription
        </button>
        {canOverride ? (
          <button
            type="button"
            onClick={onOverrideAndSave}
            disabled={finalizing}
            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-400"
          >
            {finalizing ? 'Saving...' : 'Override and Save'}
          </button>
        ) : null}
      </div>
    </article>
  );
};

export default DrugSafetyWarningPanel;
