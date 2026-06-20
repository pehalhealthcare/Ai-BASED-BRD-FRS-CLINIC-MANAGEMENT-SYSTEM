import { useState, useRef } from 'react';

const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

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

      // Set up Web Speech API recognition
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

  return (
  <section className="grid gap-5 rounded-3xl border border-sky-200 bg-sky-50/60 p-6">
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Voice note draft</p>
        <h3 className="mt-1 text-xl font-semibold text-stone-900">Speech-to-text and SOAP draft</h3>
        <p className="mt-2 text-sm text-stone-700">AI-generated draft. Doctor review required.</p>
        <p className="text-sm text-stone-700">Do not treat as final clinical documentation until approved.</p>
      </div>
      <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-stone-700">
        <p>
          <span className="font-semibold text-stone-900">Status:</span>{' '}
          {consultation?.ai_note_status ? consultation.ai_note_status.replaceAll('_', ' ') : 'not started'}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-stone-900">Model:</span>{' '}
          {consultation?.ai_note_metadata?.model_name || 'Not available'}
        </p>
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span className="flex items-center justify-between">
              Audio file
              <button 
                type="button" 
                onClick={isRecording ? stopRecording : startRecording}
                className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'}`}
              >
                {isRecording ? 'Stop Recording' : 'Record Mic'}
              </button>
            </span>
            <input
              className={FIELD_CLASS}
              type="file"
              accept=".wav,.mp3,.m4a,.webm,.ogg,audio/*"
              onChange={(event) => onAudioSelected(event.target.files?.[0] || null)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Language</span>
            <select
              className={FIELD_CLASS}
              value={form.voiceNoteLanguage}
              onChange={(event) => onLanguageChange(event.target.value)}
            >
              <option value="auto">Auto detect</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!consultation?._id || !selectedAudioName || voiceUploading}
            onClick={onUpload}
            className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-stone-300"
          >
            {voiceUploading ? 'Transcribing...' : 'Upload and draft'}
          </button>
        </div>
        <p className="text-sm text-stone-600">
          Selected file: <span className="font-medium text-stone-900">{selectedAudioName || 'None'}</span>
        </p>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Transcript preview</span>
          <textarea
            className={`${FIELD_CLASS} min-h-40`}
            value={form.transcript_text}
            onChange={(event) => onTranscriptChange(event.target.value)}
            placeholder="Transcribed doctor voice note will appear here."
          />
        </label>
      </div>

      <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5">
        <h4 className="text-lg font-semibold text-stone-900">SOAP draft preview</h4>
        {['subjective', 'objective', 'assessment', 'plan'].map((field) => (
          <label key={field} className="grid gap-2 text-sm font-medium capitalize text-stone-700">
            <span>{field}</span>
            <textarea
              className={`${FIELD_CLASS} min-h-24`}
              value={form.ai_soap_note?.[field] || ''}
              onChange={(event) => onAiNoteFieldChange(field, event.target.value)}
              placeholder={`Edit ${field}`}
            />
          </label>
        ))}
      </div>
    </div>

    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={!consultation?._id || aiDraftSaving}
        onClick={onSaveDraftEdits}
        className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-white disabled:bg-stone-100"
      >
        {aiDraftSaving ? 'Saving draft...' : 'Save AI draft edits'}
      </button>
      <button
        type="button"
        disabled={!consultation?._id || aiDraftApproving}
        onClick={onApprove}
        className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
      >
        {aiDraftApproving ? 'Approving...' : 'Approve and save to EMR'}
      </button>
      <button
        type="button"
        disabled={!consultation?._id || aiDraftRejecting}
        onClick={onReject}
        className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:bg-stone-100"
      >
        {aiDraftRejecting ? 'Rejecting...' : 'Reject AI note'}
      </button>
    </div>
  </section>
  );
};

export default VoiceNotePanel;
