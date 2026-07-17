import { useEffect, useMemo, useState } from 'react';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import PremiumFeaturePlaceholder from '../../components/PremiumFeaturePlaceholder';

const normalizeSelectionState = (review = {}) => ({
  accepted: review.acceptedSuggestions || [],
  rejected: review.rejectedSuggestions || [],
  doctorComment: review.doctorComment || ''
});

const AiSuggestionsPanel = ({
  consultationId,
  patient,
  consultation,
  aiSuggestions,
  aiReview,
  aiLoading = false,
  reviewLoading = false,
  completing = false,
  vitals = {},
  onRequestSuggestions,
  onReview,
  onComplete
}) => {
  const [selectionState, setSelectionState] = useState(normalizeSelectionState(aiReview));
  const [panelError, setPanelError] = useState('');
  const [activeSection, setActiveSection] = useState('summary');

  useEffect(() => {
    setSelectionState(normalizeSelectionState(aiReview));
    setPanelError('');
  }, [aiReview, consultationId]);

  const suggestionItems = aiSuggestions?.suggestions || [];
  const aiStatus = aiSuggestions?.status || 'not_requested';
  const rawResponse = aiSuggestions?.rawResponse || {};

  const toggleSelection = (type, value) => {
    setSelectionState((current) => {
      const nextAccepted = new Set(current.accepted);
      const nextRejected = new Set(current.rejected);
      if (type === 'accepted') {
        nextRejected.delete(value);
        nextAccepted.has(value) ? nextAccepted.delete(value) : nextAccepted.add(value);
      } else {
        nextAccepted.delete(value);
        nextRejected.has(value) ? nextRejected.delete(value) : nextRejected.add(value);
      }
      return { ...current, accepted: Array.from(nextAccepted), rejected: Array.from(nextRejected) };
    });
  };

  const decision = useMemo(() => {
    if (selectionState.accepted.length && selectionState.rejected.length) return 'partially_accepted';
    if (selectionState.accepted.length) return 'accepted';
    if (selectionState.rejected.length) return 'rejected';
    return '';
  }, [selectionState.accepted.length, selectionState.rejected.length]);

  const handleSubmitReview = () => {
    if (!decision) { setPanelError('Select at least one suggestion to accept or reject.'); return; }
    setPanelError('');
    onReview({ decision, acceptedSuggestions: selectionState.accepted, rejectedSuggestions: selectionState.rejected, doctorComment: selectionState.doctorComment });
  };

  // Patient summary
  const patientName = patient?.fullName || 'Patient';
  const patientAge = patient?.age;
  const patientGender = patient?.gender;
  const patientConditions = patient?.chronicConditions || [];
  const chiefComplaint = consultation?.chiefComplaint;
  const bmi = (vitals.weight && vitals.height)
    ? (Number(vitals.weight) / Math.pow(Number(vitals.height) / 100, 2)).toFixed(1)
    : null;

  // AI data
  const possibleConditions = suggestionItems.slice(0, 3);
  const recommendedLabs = rawResponse?.recommendedTests || suggestionItems.flatMap(s => s.recommendedTests || []).filter(Boolean);
  const suggestedMedications = rawResponse?.suggestedMedications || [];
  const generalAdvice = rawResponse?.generalAdvice || '';

  const statusBadge = {
    not_requested: 'bg-slate-700/60 text-slate-300',
    pending: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    generated: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    accepted: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    partially_accepted: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    rejected: 'bg-red-500/20 text-red-300 border border-red-500/30',
    failed: 'bg-red-500/20 text-red-300 border border-red-500/30'
  };

  const { getFeatureDetail, refresh } = useFeatureAccess();
  const assistantFeature = getFeatureDetail('consultation_assistant');

  return (
    <div className="xl:sticky xl:top-4 self-start">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-400"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">AI Consultation</p>
              <span className="ml-1 inline-flex items-center rounded px-1 py-0 text-[9px] font-bold bg-violet-500/20 text-violet-300">NEW</span>
            </div>
          </div>
          {assistantFeature.isTrial && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 mr-2">
              ⭐ Trial: {assistantFeature.daysRemaining}d
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">Get AI-powered insights and suggestions for better clinical decisions</p>
      </div>

      {/* AI Assistant Panel */}
      <div className="ai-panel-body">
        {!assistantFeature.enabled ? (
          <div className="p-4 bg-slate-900/40 rounded-2xl">
            <PremiumFeaturePlaceholder
              featureCode="consultation_assistant"
              featureName="AI Consultation Assistant"
              description="Provides real-time clinical assistance and treatment suggestions."
              onRequested={refresh}
            />
          </div>
        ) : (
          <>

        {/* Patient Summary */}
        <div className="ai-panel-section">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Patient Summary</p>
          <ul className="text-xs text-slate-300 space-y-1">
            {patientAge && patientGender && <li className="flex items-start gap-1.5"><span className="text-slate-500 mt-0.5">•</span>{patientAge} y/o {patientGender.charAt(0).toUpperCase() + patientGender.slice(1)}</li>}
            {patientConditions.length > 0 && <li className="flex items-start gap-1.5"><span className="text-slate-500 mt-0.5">•</span>Known conditions: {patientConditions.join(', ')}</li>}
            {chiefComplaint && <li className="flex items-start gap-1.5"><span className="text-slate-500 mt-0.5">•</span>Chief complaint: {chiefComplaint}</li>}
            {(vitals.bloodPressure || vitals.pulse || vitals.temperature) && (
              <li className="flex items-start gap-1.5">
                <span className="text-slate-500 mt-0.5">•</span>
                Vitals: {[vitals.bloodPressure && `BP ${vitals.bloodPressure}`, vitals.pulse && `Pulse ${vitals.pulse}`, vitals.temperature && `Temp ${vitals.temperature}°F`].filter(Boolean).join(', ')}
              </li>
            )}
            {bmi && <li className="flex items-start gap-1.5"><span className="text-slate-500 mt-0.5">•</span>BMI: {bmi}</li>}
          </ul>
        </div>

        {/* Status row */}
        {aiStatus !== 'not_requested' && (
          <div className="px-3 pb-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge[aiStatus] || statusBadge.not_requested}`}>
              {aiStatus.replaceAll('_', ' ')}
            </span>
          </div>
        )}

        {/* Error */}
        {aiSuggestions?.errorMessage && (
          <div className="mx-3 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            {aiSuggestions.errorMessage}
          </div>
        )}

        {/* No consultation yet */}
        {!consultationId && (
          <div className="px-3 pb-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-700/60 flex items-center justify-center mx-auto mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            </div>
            <p className="text-xs text-slate-400">Save the consultation first to enable AI suggestions.</p>
          </div>
        )}

        {/* AI Suggestions */}
        {consultationId && suggestionItems.length === 0 && aiStatus !== 'pending' && (
          <div className="px-3 pb-3">
            <div className="ai-panel-section">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">AI Suggestions</p>
              <p className="text-xs text-slate-500">No suggestions yet. Request AI analysis when enough clinical data is available.</p>
            </div>
          </div>
        )}

        {aiStatus === 'pending' && (
          <div className="px-3 pb-3">
            <div className="ai-panel-section flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin shrink-0" />
              <p className="text-xs text-slate-400">AI is analyzing the consultation data...</p>
            </div>
          </div>
        )}

        {/* Possible Conditions */}
        {possibleConditions.length > 0 && (
          <div className="px-3 pb-2">
            <div className="ai-panel-section">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Possible Conditions</p>
              <ul className="space-y-1.5">
                {possibleConditions.map((s) => {
                  const isAccepted = selectionState.accepted.includes(s.condition);
                  const isRejected = selectionState.rejected.includes(s.condition);
                  return (
                    <li key={s.condition} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all ${isAccepted ? 'bg-emerald-500/15 border border-emerald-500/30' : isRejected ? 'bg-red-500/10 border border-red-500/20' : 'bg-slate-800/40 border border-transparent'}`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAccepted ? 'bg-emerald-400' : isRejected ? 'bg-red-400' : 'bg-slate-500'}`} />
                        <span className="text-slate-200 truncate">{s.condition}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => toggleSelection('accepted', s.condition)} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-all ${isAccepted ? 'bg-emerald-500 text-white' : 'text-emerald-400 hover:bg-emerald-500/20'}`}>✓</button>
                        <button type="button" onClick={() => toggleSelection('rejected', s.condition)} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-all ${isRejected ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-500/20'}`}>✕</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {possibleConditions.length > 0 && (
                <button type="button" className="mt-2 text-[10px] text-emerald-400 hover:underline">View more</button>
              )}
            </div>
          </div>
        )}

        {/* Recommended Lab Tests */}
        {recommendedLabs.length > 0 && (
          <div className="px-3 pb-2">
            <div className="ai-panel-section">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Recommended Lab Tests</p>
              <ul className="space-y-1">
                {recommendedLabs.slice(0, 5).map((lab, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span className="text-slate-500">•</span>{lab}
                  </li>
                ))}
              </ul>
              {recommendedLabs.length > 5 && <button type="button" className="mt-2 text-[10px] text-emerald-400 hover:underline">View more</button>}
            </div>
          </div>
        )}

        {/* Suggested Medications */}
        {suggestedMedications.length > 0 && (
          <div className="px-3 pb-2">
            <div className="ai-panel-section">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Suggested Medications</p>
              <ul className="space-y-1">
                {suggestedMedications.slice(0, 5).map((med, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span className="text-slate-500">•</span>{typeof med === 'string' ? med : `${med.name} ${med.dosage || ''}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* General Advice */}
        {generalAdvice && (
          <div className="px-3 pb-2">
            <div className="ai-panel-section">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">General Advice</p>
              <p className="text-xs text-slate-400 leading-relaxed">{generalAdvice}</p>
            </div>
          </div>
        )}

        {/* Doctor Comment */}
        {suggestionItems.length > 0 && (
          <div className="px-3 pb-2">
            <div className="ai-panel-section">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Doctor Comment</p>
              <textarea
                className="w-full rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 outline-none transition-all focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-slate-500 resize-none"
                rows={2}
                value={selectionState.doctorComment}
                onChange={(e) => setSelectionState((c) => ({ ...c, doctorComment: e.target.value }))}
                placeholder="Add your clinical comments..."
              />
            </div>
          </div>
        )}

        {panelError && (
          <div className="mx-3 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{panelError}</div>
        )}

        {/* Disclaimer */}
        <div className="px-3 pb-3">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            AI suggestions are assistive only. Please use your clinical judgment before finalizing.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-700/60 p-3 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRequestSuggestions}
              disabled={!consultationId || aiLoading}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-40 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              {aiLoading ? 'Analyzing...' : 'Regenerate Suggestions'}
            </button>
            {suggestionItems.length > 0 && (
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={reviewLoading || !decision}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
                {reviewLoading ? 'Saving...' : 'Save Review'}
              </button>
            )}
          </div>

          {consultationId && (
            <button
              type="button"
              onClick={onComplete}
              disabled={completing}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {completing ? 'Completing...' : '✓ Complete Consultation'}
            </button>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AiSuggestionsPanel;
