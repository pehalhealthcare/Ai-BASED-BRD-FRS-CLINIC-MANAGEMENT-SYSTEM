import ClinicalNotesEditor from './ClinicalNotesEditor';
import SOAPNoteEditor from './SOAPNoteEditor';
import VitalsForm from './VitalsForm';

const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const severityOptions = ['mild', 'moderate', 'severe'];

const ConsultationForm = ({
  form,
  error = '',
  saving = false,
  formatting = false,
  aiLoading = false,
  completing = false,
  isExistingConsultation = false,
  onFieldChange,
  onVitalsChange,
  onSymptomChange,
  onAddSymptom,
  onRemoveSymptom,
  onFormattedNoteChange,
  onSubmit,
  onFormatNotes,
  onRequestAi,
  onComplete
}) => (
  <form className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={onSubmit}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Consultation workspace</p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">Doctor consultation workflow</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-stone-300"
        >
          {saving ? 'Saving...' : isExistingConsultation ? 'Save draft' : 'Start consultation'}
        </button>
        <button
          type="button"
          disabled={!isExistingConsultation || formatting}
          onClick={onFormatNotes}
          className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:bg-stone-100"
        >
          {formatting ? 'Formatting...' : 'Format notes with AI'}
        </button>
        <button
          type="button"
          disabled={!isExistingConsultation || aiLoading}
          onClick={onRequestAi}
          className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:bg-stone-100"
        >
          {aiLoading ? 'Requesting...' : 'Request AI suggestions'}
        </button>
        {isExistingConsultation ? (
          <button
            type="button"
            disabled={completing}
            onClick={onComplete}
            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300"
          >
            {completing ? 'Completing...' : 'Complete consultation'}
          </button>
        ) : null}
      </div>
    </div>

    {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Chief complaint</span>
        <input
          className={FIELD_CLASS}
          value={form.chiefComplaint}
          onChange={(event) => onFieldChange('chiefComplaint', event.target.value)}
          placeholder="Fever and cough for 2 days"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Follow-up date</span>
        <input
          className={FIELD_CLASS}
          type="date"
          value={form.followUp.date}
          onChange={(event) => onFieldChange('followUp.date', event.target.value)}
        />
      </label>
    </div>

    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Symptoms</h3>
          <p className="mt-1 text-sm text-stone-600">Capture severity, duration, and notes for each symptom.</p>
        </div>
        <button
          type="button"
          onClick={onAddSymptom}
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Add symptom
        </button>
      </div>
      <div className="grid gap-4">
        {(form.symptoms || []).map((symptom, index) => (
          <div key={`symptom-${index}`} className="grid gap-3 rounded-3xl border border-stone-200 bg-stone-50 p-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr_1.2fr_auto]">
            <input
              className={FIELD_CLASS}
              value={symptom.name}
              onChange={(event) => onSymptomChange(index, 'name', event.target.value)}
              placeholder="Symptom name"
            />
            <select
              className={FIELD_CLASS}
              value={symptom.severity}
              onChange={(event) => onSymptomChange(index, 'severity', event.target.value)}
            >
              {severityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              className={FIELD_CLASS}
              value={symptom.duration}
              onChange={(event) => onSymptomChange(index, 'duration', event.target.value)}
              placeholder="Duration"
            />
            <input
              className={FIELD_CLASS}
              value={symptom.notes}
              onChange={(event) => onSymptomChange(index, 'notes', event.target.value)}
              placeholder="Notes"
            />
            <button
              type="button"
              onClick={() => onRemoveSymptom(index)}
              className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>

    <section className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-stone-900">Vitals</h3>
        <p className="mt-1 text-sm text-stone-600">Enter available measurements. Missing values are allowed.</p>
      </div>
      <VitalsForm vitals={form.vitals} onChange={onVitalsChange} />
    </section>

    <section className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-stone-900">Diagnosis</h3>
        <p className="mt-1 text-sm text-stone-600">Primary diagnosis remains doctor-controlled. AI will never set it automatically.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Primary diagnosis</span>
          <input
            className={FIELD_CLASS}
            value={form.diagnosis.primary}
            onChange={(event) => onFieldChange('diagnosis.primary', event.target.value)}
            placeholder="Viral fever"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Secondary diagnoses</span>
          <input
            className={FIELD_CLASS}
            value={form.secondaryDiagnosisInput}
            onChange={(event) => onFieldChange('secondaryDiagnosisInput', event.target.value)}
            placeholder="URI, dehydration risk"
          />
        </label>
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">
        <input
          type="checkbox"
          checked={Boolean(form.followUp.required)}
          onChange={(event) => onFieldChange('followUp.required', event.target.checked)}
        />
        Follow-up required
      </label>
    </section>

    <ClinicalNotesEditor form={form} onFieldChange={onFieldChange} />
    <SOAPNoteEditor value={form.formattedClinicalNotes} onChange={onFormattedNoteChange} />

    <div className="grid gap-3 md:grid-cols-2">
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Prescription creation is now available from the consultation workspace after the draft is saved.
      </p>
      <button
        type="button"
        disabled
        className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-500"
      >
        Generate bill in Phase 8
      </button>
    </div>
  </form>
);

export default ConsultationForm;
