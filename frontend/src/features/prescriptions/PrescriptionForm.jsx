import MedicineItemForm from './MedicineItemForm';

const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const PrescriptionForm = ({
  form,
  error = '',
  saving = false,
  finalizing = false,
  formattingAdvice = false,
  isDraft = true,
  onFieldChange,
  onMedicineChange,
  onAddMedicine,
  onRemoveMedicine,
  onSubmitDraft,
  onFinalize,
  onFormatAdvice,
  disableFinalize = false
}) => (
  <form className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={onSubmitDraft}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Prescription workspace</p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">
          {isDraft ? 'Create or update prescription draft' : 'Finalized prescription'}
        </h2>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!isDraft || saving}
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-stone-300"
        >
          {saving ? 'Saving...' : 'Save draft'}
        </button>
        <button
          type="button"
          disabled={!isDraft || formattingAdvice}
          onClick={onFormatAdvice}
          className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:bg-stone-100"
        >
          {formattingAdvice ? 'Formatting...' : 'Format advice with AI'}
        </button>
        <button
          type="button"
          disabled={!isDraft || finalizing || disableFinalize}
          onClick={onFinalize}
          className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300"
        >
          {finalizing ? 'Finalizing...' : 'Finalize prescription'}
        </button>
      </div>
    </div>

    {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

    <div className="grid gap-4 lg:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Diagnosis snapshot</span>
        <textarea className={`${FIELD_CLASS} bg-stone-50`} rows={3} value={form.diagnosisSnapshot} readOnly />
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Symptoms snapshot</span>
        <textarea className={`${FIELD_CLASS} bg-stone-50`} rows={3} value={form.symptomsSnapshot} readOnly />
      </label>
    </div>

    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Medicines</h3>
          <p className="mt-1 text-sm text-stone-600">Doctor-reviewed medicines only. At least one medicine is required.</p>
        </div>
        <button
          type="button"
          disabled={!isDraft}
          onClick={onAddMedicine}
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:border-stone-200 disabled:text-stone-400"
        >
          Add medicine
        </button>
      </div>
      <div className="grid gap-4">
        {(form.medicines || []).map((item, index) => (
          <MedicineItemForm
            key={`medicine-${index}`}
            item={item}
            index={index}
            onChange={onMedicineChange}
            onRemove={onRemoveMedicine}
            disableRemove={!isDraft || form.medicines.length === 1}
          />
        ))}
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Doctor notes</span>
        <textarea
          className={FIELD_CLASS}
          rows={4}
          value={form.notes}
          onChange={(event) => onFieldChange('notes', event.target.value)}
          placeholder="Additional prescription notes"
          disabled={!isDraft}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Advice</span>
        <textarea
          className={FIELD_CLASS}
          rows={4}
          value={form.advice}
          onChange={(event) => onFieldChange('advice', event.target.value)}
          placeholder="Doctor advice for the patient"
          disabled={!isDraft}
        />
      </label>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Follow-up date</span>
        <input
          className={FIELD_CLASS}
          type="date"
          value={form.followUpDate}
          onChange={(event) => onFieldChange('followUpDate', event.target.value)}
          disabled={!isDraft}
        />
      </label>
      <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">
        <input
          type="checkbox"
          checked={Boolean(form.aiAssist.used)}
          onChange={(event) => onFieldChange('aiAssist.used', event.target.checked)}
          disabled={!isDraft}
        />
        AI formatting assistance used
      </label>
    </div>
  </form>
);

export default PrescriptionForm;
