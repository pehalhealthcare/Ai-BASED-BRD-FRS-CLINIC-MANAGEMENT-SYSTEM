import { useEffect, useMemo, useState } from 'react';

import EmptyState from '../../components/common/EmptyState';

const badgeClassMap = {
  not_requested: 'bg-stone-200 text-stone-700',
  pending: 'bg-amber-100 text-amber-800',
  generated: 'bg-sky-100 text-sky-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  partially_accepted: 'bg-blue-100 text-blue-800',
  rejected: 'bg-rose-100 text-rose-800',
  failed: 'bg-rose-100 text-rose-800'
};

const normalizeSelectionState = (review = {}) => ({
  accepted: review.acceptedSuggestions || [],
  rejected: review.rejectedSuggestions || [],
  doctorComment: review.doctorComment || ''
});

const AiSuggestionsPanel = ({
  consultationId,
  aiSuggestions,
  aiReview,
  aiLoading = false,
  reviewLoading = false,
  onRequestSuggestions,
  onReview
}) => {
  const [selectionState, setSelectionState] = useState(normalizeSelectionState(aiReview));
  const [panelError, setPanelError] = useState('');

  useEffect(() => {
    setSelectionState(normalizeSelectionState(aiReview));
    setPanelError('');
  }, [aiReview, consultationId]);

  const suggestionItems = aiSuggestions?.suggestions || [];
  const aiStatus = aiSuggestions?.status || 'not_requested';
  const disclaimer = aiSuggestions?.rawResponse?.disclaimer || 'AI-generated suggestions are assistive only and require doctor validation.';

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

      return {
        ...current,
        accepted: Array.from(nextAccepted),
        rejected: Array.from(nextRejected)
      };
    });
  };

  const decision = useMemo(() => {
    if (selectionState.accepted.length && selectionState.rejected.length) {
      return 'partially_accepted';
    }

    if (selectionState.accepted.length) {
      return 'accepted';
    }

    if (selectionState.rejected.length) {
      return 'rejected';
    }

    return '';
  }, [selectionState.accepted.length, selectionState.rejected.length]);

  const handleSubmitReview = () => {
    if (!decision) {
      setPanelError('Select at least one suggestion to accept or reject.');
      return;
    }

    setPanelError('');
    onReview({
      decision,
      acceptedSuggestions: selectionState.accepted,
      rejectedSuggestions: selectionState.rejected,
      doctorComment: selectionState.doctorComment
    });
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">AI suggestions</p>
          <h3 className="mt-2 text-xl font-semibold text-stone-900">Assistive suggestions only</h3>
          <p className="mt-2 text-sm text-stone-600">{disclaimer}</p>
        </div>
        <button
          type="button"
          onClick={onRequestSuggestions}
          disabled={!consultationId || aiLoading}
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {aiLoading ? 'Requesting suggestions...' : 'Request AI suggestions'}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClassMap[aiStatus] || 'bg-stone-200 text-stone-700'}`}>
          {aiStatus.replaceAll('_', ' ')}
        </span>
        {aiSuggestions?.generatedAt ? (
          <span className="text-xs text-stone-500">Generated {new Date(aiSuggestions.generatedAt).toLocaleString()}</span>
        ) : null}
      </div>

      {aiSuggestions?.errorMessage ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{aiSuggestions.errorMessage}</p>
      ) : null}

      {!consultationId ? (
        <div className="mt-6">
          <EmptyState
            title="Save the consultation first"
            description="AI suggestions become available after the consultation draft is created."
          />
        </div>
      ) : null}

      {consultationId && !suggestionItems.length ? (
        <div className="mt-6">
          <EmptyState
            title="No AI suggestions yet"
            description="Request AI suggestions when enough symptoms, vitals, and notes are available."
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {suggestionItems.map((suggestion) => {
          const isAccepted = selectionState.accepted.includes(suggestion.condition);
          const isRejected = selectionState.rejected.includes(suggestion.condition);

          return (
            <article key={`${suggestion.condition}-${suggestion.confidence}`} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-stone-900">{suggestion.condition || 'Untitled suggestion'}</h4>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{suggestion.reasoning || 'No reasoning provided.'}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-700 shadow-sm">
                  Confidence: <span className="font-semibold text-stone-900">{Math.round((suggestion.confidence || 0) * 100)}%</span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-stone-700">
                <p>
                  <span className="font-semibold text-stone-900">Recommended specialization:</span>{' '}
                  {suggestion.recommendedSpecialization || 'General Physician'}
                </p>
                <p>
                  <span className="font-semibold text-stone-900">Recommended tests:</span>{' '}
                  {suggestion.recommendedTests?.length ? suggestion.recommendedTests.join(', ') : 'None suggested'}
                </p>
                <p>
                  <span className="font-semibold text-stone-900">Red flags:</span>{' '}
                  {suggestion.redFlags?.length ? suggestion.redFlags.join(', ') : 'None identified'}
                </p>
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  {suggestion.safetyNote || disclaimer}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleSelection('accepted', suggestion.condition)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isAccepted ? 'bg-emerald-600 text-white' : 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {isAccepted ? 'Accepted' : 'Accept'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelection('rejected', suggestion.condition)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isRejected ? 'bg-rose-600 text-white' : 'border border-rose-300 text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  {isRejected ? 'Rejected' : 'Reject'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {suggestionItems.length ? (
        <div className="mt-6 grid gap-4">
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            AI suggestions are assistive only. Please confirm before adding anything into doctor-controlled diagnosis notes.
          </p>
          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Doctor comment</span>
            <textarea
              className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              rows={4}
              value={selectionState.doctorComment}
              onChange={(event) =>
                setSelectionState((current) => ({
                  ...current,
                  doctorComment: event.target.value
                }))
              }
              placeholder="Confirm how these assistive suggestions should influence your doctor-controlled notes."
            />
          </label>
          {panelError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{panelError}</p> : null}
          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={reviewLoading}
            className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300"
          >
            {reviewLoading ? 'Saving review...' : 'Save AI review'}
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default AiSuggestionsPanel;
