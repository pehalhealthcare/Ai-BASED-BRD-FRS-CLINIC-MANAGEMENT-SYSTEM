import { useState, useRef } from 'react';

const SOAP_TABS = [
  { key: 'subjective', label: 'S', full: 'Subjective', color: 'bg-blue-500' },
  { key: 'objective', label: 'O', full: 'Objective', color: 'bg-emerald-500' },
  { key: 'assessment', label: 'A', full: 'Assessment', color: 'bg-amber-500' },
  { key: 'plan', label: 'P', full: 'Plan', color: 'bg-violet-500' }
];

const VoiceNotePanel = ({
  consultation,
  form,
  selectedAudioName,
  voiceUploading,
  aiDraftSaving,
  aiDraftApproving,
  aiDraftRejecting,
  onAudioSelected,
  onLanguageChange,
  onTranscriptChange,
  onAiNoteFieldChange,
  onUpload,
  onSaveDraftEdits,
  onApprove,
  onReject
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('subjective');
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
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
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
            onTranscriptChange(currentText + finalTranscript);
          }
        };

        recognition.onerror = (e) => {
          console.error('Speech recognition error', e);
        };

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

  const aiStatus = consultation?.ai_note_status || 'not started';
  const isProcessing = aiStatus === 'processing' || voiceUploading;

  return (
    <section className="card-premium card-premium-accent p-0 animate-slide-up" style={{ animationDelay: '120ms' }}>
      {/* Header */}
      <div className="flex flex-col gap-3 p-5 pb-0 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎙️</span>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Voice Note Draft</p>
          </div>
          <h3 className="mt-1.5 text-xl font-bold text-stone-900 dark:text-stone-100">Speech-to-Text & SOAP Draft</h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">AI-generated draft — doctor review required before EMR save.</p>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${
          isProcessing
            ? 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30 badge-pulse'
            : 'border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50'
        }`}>
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400">Status</p>
            <p className="font-semibold text-stone-800 dark:text-stone-200 capitalize">{aiStatus.replaceAll('_', ' ')}</p>
          </div>
          <div className="h-8 w-px bg-stone-200 dark:bg-stone-700" />
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400">Model</p>
            <p className="font-medium text-stone-700 dark:text-stone-300 text-xs">{consultation?.ai_note_metadata?.model_name || '—'}</p>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left — Audio input and transcript */}
        <div className="grid gap-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid flex-1 gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
              <span>Audio file</span>
              <input
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-emerald-700 dark:file:bg-emerald-900/30 dark:file:text-emerald-400"
                type="file"
                accept=".wav,.mp3,.m4a,.webm,.ogg,audio/*"
                onChange={(event) => onAudioSelected(event.target.files?.[0] || null)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300" style={{ minWidth: 130 }}>
              <span>Language</span>
              <select
                className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2.5 text-sm outline-none dark:text-stone-200"
                value={form.voiceNoteLanguage}
                onChange={(event) => onLanguageChange(event.target.value)}
              >
                <option value="auto">Auto detect</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </label>
          </div>

          {/* Recording & Upload controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                isRecording
                  ? 'bg-rose-500 text-white recording-glow'
                  : 'border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-rose-500'}`} />
              {isRecording ? 'Stop Recording' : 'Record Mic'}
            </button>
            <button
              type="button"
              disabled={!consultation?._id || !selectedAudioName || voiceUploading}
              onClick={onUpload}
              className="btn-glow rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {voiceUploading ? '⏳ Transcribing...' : '🚀 Upload & Draft'}
            </button>
            {selectedAudioName && (
              <span className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-48">
                📄 {selectedAudioName}
              </span>
            )}
          </div>

          {/* Transcript */}
          <label className="grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
            <span className="flex items-center gap-2">
              <span>📝</span> Transcript Preview
            </span>
            <textarea
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900/50 px-4 py-3 text-sm font-mono text-stone-800 dark:text-stone-200 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 placeholder:text-stone-400 resize-y min-h-32"
              value={form.transcript_text}
              onChange={(event) => onTranscriptChange(event.target.value)}
              placeholder="Transcribed doctor voice note will appear here..."
            />
          </label>
        </div>

        {/* Right — SOAP Draft with Tabs */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 p-4">
          <h4 className="mb-3 text-base font-bold text-stone-900 dark:text-stone-100">SOAP Draft Preview</h4>
          
          {/* Tab selector */}
          <div className="mb-3 flex gap-1.5 rounded-xl bg-stone-200/60 dark:bg-stone-700/50 p-1">
            {SOAP_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab.key
                    ? `${tab.color} text-white shadow-md`
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white/50 dark:hover:bg-stone-600/50'
                }`}
              >
                <span className="hidden sm:inline">{tab.full}</span>
                <span className="sm:hidden">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Active tab content */}
          {SOAP_TABS.map((tab) => (
            <div
              key={tab.key}
              className={`transition-all duration-200 ${activeTab === tab.key ? 'block animate-fade-in' : 'hidden'}`}
            >
              <textarea
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900/50 px-4 py-3 text-sm text-stone-800 dark:text-stone-200 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 placeholder:text-stone-400 resize-y"
                rows={8}
                value={form.ai_soap_note?.[tab.key] || ''}
                onChange={(event) => onAiNoteFieldChange(tab.key, event.target.value)}
                placeholder={`Edit ${tab.full.toLowerCase()} notes...`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2.5 border-t border-stone-200 dark:border-stone-700 px-5 py-4">
        <button
          type="button"
          disabled={!consultation?._id || aiDraftSaving}
          onClick={onSaveDraftEdits}
          className="rounded-xl border border-stone-300 dark:border-stone-600 px-4 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40 transition-all"
        >
          {aiDraftSaving ? '⏳ Saving...' : '💾 Save Draft Edits'}
        </button>
        <button
          type="button"
          disabled={!consultation?._id || aiDraftApproving}
          onClick={onApprove}
          className="btn-glow rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition-all"
        >
          {aiDraftApproving ? '⏳ Approving...' : '✅ Approve & Save to EMR'}
        </button>
        <button
          type="button"
          disabled={!consultation?._id || aiDraftRejecting}
          onClick={onReject}
          className="rounded-xl border border-rose-300 dark:border-rose-700 px-4 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40 transition-all"
        >
          {aiDraftRejecting ? '⏳ Rejecting...' : '❌ Reject AI Note'}
        </button>
      </div>
    </section>
  );
};

export default VoiceNotePanel;
