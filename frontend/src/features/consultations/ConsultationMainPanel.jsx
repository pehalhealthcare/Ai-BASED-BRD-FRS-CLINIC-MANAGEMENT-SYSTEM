import { useState, useRef } from 'react';
import VitalsForm from './VitalsForm';

/* ─── Field class ─── */
const FC = 'w-full rounded-xl border border-slate-600/40 bg-slate-800/50 px-3.5 py-2.5 text-sm text-slate-200 outline-none transition-all focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-slate-500';

/* ─── Collapsible Section ─── */
const Section = ({ number, title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="cons-section">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/20 transition-colors rounded-t-xl"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold shrink-0">{number}</span>
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        <svg className={`ml-auto w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

/* ─── SOAP Tab ─── */
const SOAP_TABS = [
  { key: 'subjective', label: 'S', full: 'Subjective' },
  { key: 'objective', label: 'O', full: 'Objective' },
  { key: 'assessment', label: 'A', full: 'Assessment' },
  { key: 'plan', label: 'P', full: 'Plan' }
];

const SEVERITY_OPTIONS = ['mild', 'moderate', 'severe'];

const ConsultationMainPanel = ({
  form, consultation, patient, doctor, appointment,
  saving, formatting, aiLoading, completing,
  voiceUploading, aiDraftSaving, aiDraftApproving, aiDraftRejecting,
  selectedAudioFile,
  onFieldChange, onVitalsChange, onSymptomChange, onAddSymptom, onRemoveSymptom,
  onFormattedNoteChange, onAiSoapNoteChange, onAudioSelected,
  onSubmit, onFormatNotes, onRequestAi, onComplete,
  onUploadVoiceNote, onSaveAiDraftEdits, onApproveAiNote, onRejectAiNote
}) => {
  const [soapActiveTab, setSoapActiveTab] = useState('subjective');
  const [activeNotesMode, setActiveNotesMode] = useState('free'); // 'free' | 'soap'
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'live_recording.webm', { type: 'audio/webm' });
        onAudioSelected(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = form.voiceNoteLanguage === 'auto' ? 'en-US' : (form.voiceNoteLanguage === 'hi' ? 'hi-IN' : 'en-US');

        recognition.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            const currentText = form.transcript_text || '';
            onFieldChange('transcript_text', currentText + finalTranscript);
          }
        };

        recognition.onerror = (e) => console.error('Speech recognition error', e);
        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  return (
    <div className="grid gap-4">

      {/* ─── AI Voice Dictation & Audio Upload Panel ─── */}
      <div className="cons-section p-4 bg-slate-800/30 border border-slate-700/40 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🎙️</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">AI Clinical Dictation & Audio Upload</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-3.5">
          Record or upload a patient consultation recording. The AI will transcribe and automatically extract vitals, symptoms, diagnosis, and prescriptions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end mb-3">
          {/* File Upload Dropzone */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Audio File</label>
            <input
              type="file"
              accept=".wav,.mp3,.m4a,.webm,.ogg,audio/*"
              onChange={(e) => onAudioSelected(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer"
            />
            {selectedAudioFile && (
              <p className="text-[10px] text-emerald-400 mt-1 truncate">📄 Selected: {selectedAudioFile.name}</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${isRecording ? 'bg-red-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
              <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
              {isRecording ? 'Stop' : 'Record Mic'}
            </button>

            <button
              type="button"
              disabled={voiceUploading || (!selectedAudioFile && !form.transcript_text?.trim())}
              onClick={onUploadVoiceNote}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {voiceUploading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>🚀 Transcribe & Auto-fill EMR</span>
              )}
            </button>
          </div>
        </div>

        {/* Live Transcript text field */}
        <div>
          <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Live Transcript Preview</label>
          <textarea
            className="w-full rounded-xl border border-slate-600/40 bg-slate-900/40 px-3 py-2 text-xs font-mono text-slate-300 outline-none placeholder:text-slate-600 min-h-[60px]"
            value={form.transcript_text}
            onChange={(e) => onFieldChange('transcript_text', e.target.value)}
            placeholder="Dictated transcription or typed text ready for AI extraction..."
          />
        </div>
      </div>

      {/* ─── Section 1: Chief Complaint ─── */}
      <Section number="1" title="Chief Complaint">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Chief Complaint *</label>
            <input
              className={FC}
              value={form.chiefComplaint}
              onChange={(e) => onFieldChange('chiefComplaint', e.target.value)}
              placeholder="Enter chief complaint..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Duration</label>
            <input
              className={FC}
              value={form.followUp?.date || ''}
              type="date"
              onChange={(e) => onFieldChange('followUp.date', e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${form.followUp?.required ? 'bg-emerald-500' : 'bg-slate-600'}`}
              onClick={() => onFieldChange('followUp.required', !form.followUp?.required)}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.followUp?.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-slate-400">Follow-up Required</span>
          </label>
        </div>
      </Section>

      {/* ─── Section 2: Symptoms ─── */}
      <Section number="2" title="Symptoms">
        <div className="grid gap-2.5 mb-3">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 px-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Symptom</span>
            <span className="text-[10px] font-semibold uppercase text-slate-500">Severity</span>
            <span className="text-[10px] font-semibold uppercase text-slate-500">Duration</span>
            <span className="text-[10px] font-semibold uppercase text-slate-500">Notes</span>
            <span></span>
          </div>

          {(form.symptoms || []).map((symptom, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 items-center">
              <input
                className={FC}
                value={symptom.name}
                onChange={(e) => onSymptomChange(index, 'name', e.target.value)}
                placeholder="Select or type symptom..."
              />
              <select
                className={FC}
                value={symptom.severity}
                onChange={(e) => onSymptomChange(index, 'severity', e.target.value)}
              >
                {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <input
                className={FC}
                value={symptom.duration}
                onChange={(e) => onSymptomChange(index, 'duration', e.target.value)}
                placeholder="e.g. 2 days"
              />
              <input
                className={FC}
                value={symptom.notes}
                onChange={(e) => onSymptomChange(index, 'notes', e.target.value)}
                placeholder="Additional notes..."
              />
              <button
                type="button"
                onClick={() => onRemoveSymptom(index)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddSymptom}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-dashed border-emerald-500/30 rounded-lg px-3 py-2 hover:bg-emerald-500/5 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Add Symptom
        </button>
      </Section>

      {/* ─── Section 3: Vitals ─── */}
      <Section number="3" title="Vitals">
        <VitalsForm vitals={form.vitals} onChange={onVitalsChange} />
        <button type="button" className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-300 border border-dashed border-slate-600/40 rounded-lg px-3 py-2 hover:bg-slate-700/20 transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Add More Vitals
        </button>
      </Section>

      {/* ─── Section 4: Diagnosis ─── */}
      <Section number="4" title="Diagnosis">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Primary Diagnosis</label>
            <div className="relative">
              <input
                className={FC}
                value={form.diagnosis.primary}
                onChange={(e) => onFieldChange('diagnosis.primary', e.target.value)}
                placeholder="Enter primary diagnosis"
              />
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Secondary Diagnosis (Optional)</label>
            <div className="relative">
              <input
                className={FC}
                value={form.secondaryDiagnosisInput}
                onChange={(e) => onFieldChange('secondaryDiagnosisInput', e.target.value)}
                placeholder="Enter secondary diagnosis"
              />
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Treatment Plan *</label>
          <textarea
            className={`${FC} min-h-[60px] resize-y`}
            value={form.treatmentPlan}
            onChange={(e) => onFieldChange('treatmentPlan', e.target.value)}
            placeholder="Enter treatment plan (medicines, lifestyle, advice)..."
          />
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.followUp?.required)}
              onChange={(e) => onFieldChange('followUp.required', e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-400">Follow-up required</span>
          </label>
        </div>
      </Section>

      {/* ─── Section 5: Clinical Notes ─── */}
      <Section number="5" title="Clinical Notes">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 mb-3 w-fit">
          <button
            type="button"
            onClick={() => setActiveNotesMode('free')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeNotesMode === 'free' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => setActiveNotesMode('soap')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeNotesMode === 'soap' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
          >
            SOAP
          </button>
        </div>

        {activeNotesMode === 'free' ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
                {['B', 'I', 'U'].map((f) => (
                  <button key={f} type="button" className="w-6 h-6 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">{f}</button>
                ))}
              </div>
              <button
                type="button"
                disabled={!consultation?._id || formatting}
                onClick={onFormatNotes}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 hover:bg-emerald-500/5 disabled:opacity-40 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                {formatting ? 'Formatting...' : '✨ Format to SOAP'}
              </button>
            </div>
            <textarea
              className={`${FC} min-h-[140px] resize-y`}
              value={form.clinicalNotes}
              onChange={(e) => onFieldChange('clinicalNotes', e.target.value)}
              placeholder="Write clinical notes, examination findings, treatment plan, advice..."
            />
          </div>
        ) : (
          <div>
            <div className="flex gap-1 mb-3">
              {SOAP_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSoapActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${soapActiveTab === tab.key ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-300 border border-transparent'}`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold ${soapActiveTab === tab.key ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{tab.label}</span>
                  {tab.full}
                </button>
              ))}
            </div>
            <textarea
              className={`${FC} min-h-[120px] resize-y`}
              value={form.formattedClinicalNotes[soapActiveTab] || ''}
              onChange={(e) => onFormattedNoteChange(soapActiveTab, e.target.value)}
              placeholder={`Enter ${SOAP_TABS.find(t => t.key === soapActiveTab)?.full} notes...`}
            />
          </div>
        )}
      </Section>

      {/* ─── AI Note Draft Section ─── */}
      {consultation?._id && form.ai_soap_note?.subjective && (
        <Section number="AI" title="AI SOAP Note Draft" defaultOpen={false}>
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4 mb-3">
            {SOAP_TABS.map((tab) => (
              form.ai_soap_note[tab.key] && (
                <div key={tab.key} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded bg-violet-500/30 text-violet-300 text-[10px] font-bold flex items-center justify-center">{tab.label}</span>
                    <span className="text-xs font-semibold text-violet-300">{tab.full}</span>
                  </div>
                  <textarea
                    className={`${FC} border-violet-500/20 bg-violet-900/10 min-h-[60px]`}
                    value={form.ai_soap_note[tab.key] || ''}
                    onChange={(e) => onAiSoapNoteChange(tab.key, e.target.value)}
                  />
                </div>
              )
            ))}
          </div>
          {form.ai_soap_note?.missing_information?.length > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 mb-3">
              <p className="text-xs font-semibold text-amber-400 mb-1">Missing Information:</p>
              <ul className="text-xs text-amber-300 list-disc list-inside">
                {form.ai_soap_note.missing_information.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={onSaveAiDraftEdits} disabled={aiDraftSaving} className="cons-btn cons-btn-ghost text-xs py-1.5 px-3">{aiDraftSaving ? 'Saving...' : '💾 Save Edits'}</button>
            <button type="button" onClick={onApproveAiNote} disabled={aiDraftApproving} className="cons-btn cons-btn-primary text-xs py-1.5 px-3">{aiDraftApproving ? 'Approving...' : '✓ Approve Note'}</button>
            <button type="button" onClick={onRejectAiNote} disabled={aiDraftRejecting} className="cons-btn cons-btn-ghost text-xs py-1.5 px-3 border-red-500/30 text-red-400 hover:bg-red-500/10">{aiDraftRejecting ? 'Rejecting...' : '✕ Reject'}</button>
          </div>
        </Section>
      )}

      {/* ─── Info footer ─── */}
      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        Prescription creation is available from the toolbar after saving the consultation draft.
      </div>
    </div>
  );
};

export default ConsultationMainPanel;
