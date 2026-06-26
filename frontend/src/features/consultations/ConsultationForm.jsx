import { useState } from 'react';

import ClinicalNotesEditor from './ClinicalNotesEditor';
import SOAPNoteEditor from './SOAPNoteEditor';
import VitalsForm from './VitalsForm';

const FIELD_CLASS =
  'w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 px-4 py-3 text-sm text-stone-800 dark:text-stone-200 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 placeholder:text-stone-400 dark:placeholder:text-stone-500';

const severityOptions = [
  { value: 'mild', label: 'Mild', colorClass: 'severity-mild' },
  { value: 'moderate', label: 'Moderate', colorClass: 'severity-moderate' },
  { value: 'severe', label: 'Severe', colorClass: 'severity-severe' }
];

const ChevronIcon = ({ expanded }) => (
  <svg
    className={`section-chevron h-5 w-5 text-stone-400`}
    data-expanded={expanded}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const CollapsibleSection = ({ title, icon, subtitle, defaultOpen = true, accentColor = 'emerald', children }) => {
  const [expanded, setExpanded] = useState(defaultOpen);
  const dotColors = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    violet: 'bg-violet-500',
    rose: 'bg-rose-500'
  };

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/40 overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-700/30"
      >
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${dotColors[accentColor] || dotColors.emerald}`} />
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              {icon && <span className="text-lg">{icon}</span>}
              {title}
            </h3>
            {subtitle && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
          </div>
        </div>
        <ChevronIcon expanded={expanded} />
      </button>
      <div
        className="section-collapsible-content"
        data-expanded={expanded}
        style={{ maxHeight: expanded ? '2000px' : '0' }}
      >
        <div className="px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
};

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
  <form className="grid gap-5 animate-slide-up" onSubmit={onSubmit} style={{ animationDelay: '180ms' }}>
    {/* Sticky toolbar */}
    <div className="toolbar-sticky rounded-2xl px-5 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <span className="text-xl">🩺</span> Consultation Workspace
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-glow rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-40"
        >
          {saving ? '⏳ Saving...' : isExistingConsultation ? '💾 Save Draft' : '▶️ Start Consultation'}
        </button>
        <button
          type="button"
          disabled={!isExistingConsultation || formatting}
          onClick={onFormatNotes}
          className="rounded-xl border border-sky-300 dark:border-sky-700 px-3.5 py-2 text-sm font-semibold text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-40 transition-all"
        >
          {formatting ? '⏳...' : '✨ Format with AI'}
        </button>
        <button
          type="button"
          disabled={!isExistingConsultation || aiLoading}
          onClick={onRequestAi}
          className="rounded-xl border border-violet-300 dark:border-violet-700 px-3.5 py-2 text-sm font-semibold text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40 transition-all"
        >
          {aiLoading ? '⏳...' : '🤖 AI Suggestions'}
        </button>
        {isExistingConsultation && (
          <button
            type="button"
            disabled={completing}
            onClick={onComplete}
            className="btn-glow rounded-xl bg-stone-900 dark:bg-stone-100 px-4 py-2 text-sm font-semibold text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-40 transition-all"
          >
            {completing ? '⏳...' : '✅ Complete'}
          </button>
        )}
      </div>
    </div>

    {error && (
      <p className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-700 dark:text-rose-400 animate-slide-down">
        {error}
      </p>
    )}

    {/* Chief complaint & Follow-up */}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
        <span className="flex items-center gap-2"><span>🗣️</span> Chief Complaint</span>
        <input
          className={FIELD_CLASS}
          value={form.chiefComplaint}
          onChange={(event) => onFieldChange('chiefComplaint', event.target.value)}
          placeholder="Fever and cough for 2 days"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
        <span className="flex items-center gap-2"><span>📅</span> Follow-up Date</span>
        <input
          className={FIELD_CLASS}
          type="date"
          value={form.followUp.date}
          onChange={(event) => onFieldChange('followUp.date', event.target.value)}
        />
      </label>
    </div>

    {/* Symptoms — Collapsible */}
    <CollapsibleSection title="Symptoms" icon="🤒" subtitle="Capture severity, duration, and notes for each symptom." accentColor="rose">
      <div className="grid gap-3">
        {(form.symptoms || []).map((symptom, index) => {
          const severityData = severityOptions.find((s) => s.value === symptom.severity) || severityOptions[0];

          return (
            <div
              key={`symptom-${index}`}
              className={`grid gap-2.5 rounded-xl border p-3.5 animate-fade-in md:grid-cols-[1.3fr_auto_1fr_1fr_auto] md:items-end ${severityData.colorClass}`}
            >
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
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                className="rounded-xl border border-rose-300 dark:border-rose-700 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
              >
                ✕
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAddSymptom}
          className="justify-self-start rounded-xl border border-dashed border-stone-300 dark:border-stone-600 px-4 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
        >
          + Add Symptom
        </button>
      </div>
    </CollapsibleSection>

    {/* Vitals — Collapsible */}
    <CollapsibleSection title="Vitals" icon="❤️" subtitle="Enter available measurements. Missing values are allowed." accentColor="sky">
      <VitalsForm vitals={form.vitals} onChange={onVitalsChange} />
    </CollapsibleSection>

    {/* Diagnosis — Collapsible */}
    <CollapsibleSection title="Diagnosis" icon="🔬" subtitle="Primary diagnosis remains doctor-controlled. AI will never set it automatically." accentColor="amber">
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <span>Primary Diagnosis</span>
            <input
              className={FIELD_CLASS}
              value={form.diagnosis.primary}
              onChange={(event) => onFieldChange('diagnosis.primary', event.target.value)}
              placeholder="Viral fever"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <span>Secondary Diagnoses</span>
            <input
              className={FIELD_CLASS}
              value={form.secondaryDiagnosisInput}
              onChange={(event) => onFieldChange('secondaryDiagnosisInput', event.target.value)}
              placeholder="URI, dehydration risk"
            />
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/30 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 cursor-pointer hover:border-emerald-300 transition-all">
          <input
            type="checkbox"
            checked={Boolean(form.followUp.required)}
            onChange={(event) => onFieldChange('followUp.required', event.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          Follow-up required
        </label>
      </div>
    </CollapsibleSection>

    {/* Clinical Notes — Collapsible */}
    <CollapsibleSection title="Clinical Notes" icon="📋" subtitle="Document findings, diagnosis reasoning, treatment plan, and follow-up." accentColor="emerald">
      <ClinicalNotesEditor form={form} onFieldChange={onFieldChange} />
    </CollapsibleSection>

    {/* SOAP Note — Collapsible */}
    <CollapsibleSection title="SOAP Note" icon="📄" subtitle="AI-formatted structure — review before saving." accentColor="violet" defaultOpen={false}>
      <SOAPNoteEditor value={form.formattedClinicalNotes} onChange={onFormattedNoteChange} />
    </CollapsibleSection>

    {/* Info footer */}
    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
      <span>💡</span>
      Prescription creation is available from the consultation workspace after the draft is saved.
    </div>
  </form>
);

export default ConsultationForm;
