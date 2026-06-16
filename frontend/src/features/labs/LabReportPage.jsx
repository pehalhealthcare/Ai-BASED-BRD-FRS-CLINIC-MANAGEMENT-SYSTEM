import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import aiApi from '../../api/aiApi';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import LabResultTable from './LabResultTable';
import { finalizeLabReport, getLabReport, reviewLabAnalysis, updateLabReport } from './labApi';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const createEmptyEntry = () => ({
  code: '',
  name: '',
  value: '',
  numericValue: '',
  unit: '',
  normalRange: {
    min: '',
    max: '',
    text: ''
  },
  interpretationNote: ''
});

const riskTone = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
  unknown: 'neutral'
};

const reviewTone = {
  not_requested: 'neutral',
  pending_review: 'warning',
  reviewed: 'info',
  accepted: 'success',
  rejected: 'danger'
};

const modelStatusTone = {
  available: 'success',
  insufficient_reference_data: 'warning',
  unavailable: 'danger',
  ai_service_unavailable: 'danger',
  not_requested: 'neutral'
};

const formatLabel = (value = '') => String(value || '').replaceAll('_', ' ');

const normalizeEntriesForForm = (entries = []) =>
  entries.map((entry) => ({
    code: entry.code || '',
    name: entry.name || '',
    value: entry.value || '',
    numericValue: typeof entry.numericValue === 'number' ? entry.numericValue : '',
    unit: entry.unit || '',
    normalRange: {
      min: typeof entry.normalRange?.min === 'number' ? entry.normalRange.min : '',
      max: typeof entry.normalRange?.max === 'number' ? entry.normalRange.max : '',
      text: entry.normalRange?.text || ''
    },
    abnormalFlag: entry.abnormalFlag || 'normal',
    interpretationNote: entry.interpretationNote || ''
  }));

const LabReportPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [form, setForm] = useState({
    reportFileName: '',
    reportUrl: '',
    status: 'draft',
    resultEntries: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reviewingDecision, setReviewingDecision] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');

  const loadReport = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getLabReport(id);
      const nextReport = response.data.labReport;
      setReport(nextReport);
      setForm({
        reportFileName: nextReport.reportFileName || '',
        reportUrl: nextReport.reportUrl || '',
        status: nextReport.status || 'draft',
        resultEntries: normalizeEntriesForForm(nextReport.resultEntries || [])
      });
      setReviewNote(nextReport.aiReviewNote || '');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load the lab report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const isFinalized = report?.status === 'finalized';
  const aiOutput = report?.aiAnalysis?.output || null;
  const criticalValues = aiOutput?.critical_values || [];
  const abnormalValues = aiOutput?.abnormal_values || [];
  const trendSummary = aiOutput?.trend_summary || [];
  const manualReviewItems = aiOutput?.manual_review_items || [];
  const canReviewAi = [ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ...ADMIN_ROLES].includes(user?.role);
  const canSubmitAiReview =
    canReviewAi && !['not_requested', 'ai_service_unavailable'].includes(report?.aiAnalysisStatus || 'not_requested');

  const updateEntryField = (index, path, value) => {
    setForm((current) => {
      const nextEntries = current.resultEntries.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }

        const nextEntry = {
          ...entry,
          normalRange: {
            ...entry.normalRange
          }
        };

        if (path.startsWith('normalRange.')) {
          nextEntry.normalRange[path.replace('normalRange.', '')] = value;
        } else {
          nextEntry[path] = value;
        }

        return nextEntry;
      });

      return {
        ...current,
        resultEntries: nextEntries
      };
    });
  };

  const buildPayload = () => ({
    reportFileName: form.reportFileName,
    reportUrl: form.reportUrl,
    status: form.status,
    resultEntries: form.resultEntries.map((entry) => ({
      code: entry.code,
      name: entry.name,
      value: entry.value,
      ...(entry.numericValue !== '' ? { numericValue: Number(entry.numericValue) } : {}),
      ...(entry.unit ? { unit: entry.unit } : {}),
      normalRange: {
        ...(entry.normalRange.min !== '' ? { min: Number(entry.normalRange.min) } : {}),
        ...(entry.normalRange.max !== '' ? { max: Number(entry.normalRange.max) } : {}),
        ...(entry.normalRange.text ? { text: entry.normalRange.text } : {})
      },
      ...(entry.interpretationNote ? { interpretationNote: entry.interpretationNote } : {})
    }))
  });

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await updateLabReport(id, buildPayload());
      await loadReport();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the lab report.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    setError('');

    try {
      if (!isFinalized) {
        await updateLabReport(id, buildPayload());
      }
      await finalizeLabReport(id);
      await loadReport();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to finalize the lab report.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleLabReportUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file || isFinalized) {
      return;
    }

    setOcrLoading(true);
    setOcrMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await aiApi.extractLabReport(formData);
      const output = data?.output || data;
      const extractedEntries = output?.result_entries || output?.resultEntries || output?.entries || [];

      if (extractedEntries.length) {
        setForm((current) => ({
          ...current,
          reportFileName: file.name,
          resultEntries: normalizeEntriesForForm(extractedEntries)
        }));
        setOcrMessage(`Extracted ${extractedEntries.length} result entries from the uploaded report. Review before saving.`);
      } else {
        setForm((current) => ({
          ...current,
          reportFileName: file.name
        }));
        setOcrMessage('Report uploaded. No structured entries were detected — enter results manually.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to extract lab report data.');
    } finally {
      setOcrLoading(false);
      event.target.value = '';
    }
  };

  const handleAiReview = async (decision) => {
    setReviewingDecision(decision);
    setError('');

    try {
      await reviewLabAnalysis(id, {
        decision,
        reviewNote
      });
      await loadReport();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the AI review status.');
    } finally {
      setReviewingDecision('');
    }
  };

  if (loading) {
    return <LoadingState label="Loading lab report..." />;
  }

  if (error && !report) {
    return <ErrorState title="Lab report unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 11"
        title={report?.labOrderId?.orderNumber || 'Lab report'}
        description="Record report metadata, enter structured result values, and finalize the report after clinical review."
        actions={
          <>
            {report?.labOrderId?._id ? (
              <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/labs/orders/${report.labOrderId._id}`}>
                Back to order
              </Link>
            ) : null}
            {!isFinalized ? (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing}
                className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:border-stone-300 disabled:text-stone-400"
              >
                {finalizing ? 'Finalizing...' : 'Finalize report'}
              </button>
            ) : null}
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {criticalValues.length ? (
        <article className="grid gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-lg shadow-rose-100/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Critical Alerts</p>
              <h2 className="mt-2 text-2xl font-semibold text-rose-950">Doctor Review Required</h2>
            </div>
            <Badge tone="danger">{criticalValues.length} critical</Badge>
          </div>
          <div className="grid gap-3">
            {criticalValues.map((item, index) => (
              <div key={`${item.test_name}-${index}`} className="rounded-2xl border border-rose-200 bg-white px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-stone-900">
                    {item.test_name}: {item.value} {item.unit}
                  </p>
                  <Badge tone="danger">{item.severity || 'critical'}</Badge>
                </div>
                <p className="mt-2 text-sm text-rose-800">{item.message}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form className="grid gap-6" onSubmit={handleSave}>
          <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={report?.status === 'finalized' ? 'success' : report?.status === 'reviewed' ? 'info' : 'warning'}>
                {report?.status || 'draft'}
              </Badge>
              <Badge tone={(report?.resultEntries || []).some((entry) => entry.isAbnormal) ? 'danger' : 'success'}>
                {(report?.resultEntries || []).filter((entry) => entry.isAbnormal).length} abnormal
              </Badge>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Report file name</span>
              <input
                className={FIELD_CLASS}
                value={form.reportFileName}
                onChange={(event) => setForm((current) => ({ ...current, reportFileName: event.target.value }))}
                disabled={isFinalized}
              />
            </label>

            {!isFinalized ? (
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Upload lab report (OCR)</span>
                <input className={FIELD_CLASS} type="file" accept="image/*,.pdf" onChange={handleLabReportUpload} disabled={ocrLoading} />
                {ocrLoading ? <p className="text-sm text-sky-700">Extracting lab report values...</p> : null}
                {ocrMessage ? <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{ocrMessage}</p> : null}
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Report URL</span>
              <input
                className={FIELD_CLASS}
                value={form.reportUrl}
                onChange={(event) => setForm((current) => ({ ...current, reportUrl: event.target.value }))}
                disabled={isFinalized}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Workflow status</span>
              <select
                className={FIELD_CLASS}
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                disabled={isFinalized}
              >
                <option value="draft">Draft</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </label>

            {!isFinalized ? (
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
              >
                {saving ? 'Saving...' : 'Save report'}
              </button>
            ) : null}
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-stone-900">AI Lab Flags</h2>
              <Badge tone={riskTone[report?.aiRiskLevel || report?.aiAnalysis?.risk_level || 'unknown'] || 'neutral'}>
                Risk: {formatLabel(report?.aiRiskLevel || report?.aiAnalysis?.risk_level || 'unknown')}
              </Badge>
              <Badge tone={modelStatusTone[report?.aiAnalysisStatus || 'not_requested'] || 'neutral'}>
                Status: {formatLabel(report?.aiAnalysisStatus || 'not_requested')}
              </Badge>
              <Badge tone={reviewTone[report?.aiReviewStatus || 'not_requested'] || 'neutral'}>
                Review: {formatLabel(report?.aiReviewStatus || 'not_requested')}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-stone-700">
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-medium text-amber-900">
                Doctor Review Required
              </p>
              <p>
                <span className="font-semibold text-stone-900">Model:</span>{' '}
                {report?.aiAnalysis?.model_name || 'lab_rule_engine'} {report?.aiAnalysis?.model_version ? `(${report.aiAnalysis.model_version})` : ''}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Rule status:</span> {formatLabel(aiOutput?.rule_status || 'not_requested')}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Trend status:</span> {formatLabel(aiOutput?.trend_status || 'no_previous_data')}
              </p>
              {report?.aiReviewedBy?.name ? (
                <p>
                  <span className="font-semibold text-stone-900">AI reviewed by:</span> {report.aiReviewedBy.name}
                </p>
              ) : null}
            </div>

            {report?.aiAnalysis?.explanation ? (
              <p className="mt-4 text-sm text-stone-600">{report.aiAnalysis.explanation}</p>
            ) : null}

            {aiOutput?.notes?.length ? (
              <div className="mt-4 grid gap-2">
                {aiOutput.notes.map((note) => (
                  <p key={note} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    {note}
                  </p>
                ))}
              </div>
            ) : report?.aiAnalysis?.summary ? (
              <p className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                {report.aiAnalysis.summary}
              </p>
            ) : null}

            {manualReviewItems.length ? (
              <div className="mt-5 grid gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Manual Review Items</h3>
                {manualReviewItems.map((item, index) => (
                  <div key={`${item.test_name}-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">
                      {item.test_name}: {item.value} {item.unit}
                    </p>
                    <p className="mt-1">{item.message}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {canSubmitAiReview ? (
              <div className="mt-5 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Review note</span>
                  <textarea
                    className={FIELD_CLASS}
                    rows={3}
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  {['reviewed', 'accepted', 'rejected'].map((decision) => (
                    <button
                      key={decision}
                      type="button"
                      onClick={() => handleAiReview(decision)}
                      disabled={Boolean(reviewingDecision)}
                      className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 disabled:border-stone-300 disabled:text-stone-400"
                    >
                      {reviewingDecision === decision ? 'Saving...' : formatLabel(decision)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        </form>

        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Structured result entries</h2>
              <p className="mt-2 text-sm text-stone-600">The backend recalculates abnormal flags and ignores any client-provided abnormal status.</p>
            </div>
          </div>

          <div className="mt-5">
            <LabResultTable
              entries={form.resultEntries}
              editable={!isFinalized}
              onEntryChange={updateEntryField}
              onAddEntry={() =>
                setForm((current) => ({
                  ...current,
                  resultEntries: [...current.resultEntries, createEmptyEntry()]
                }))
              }
              onRemoveEntry={(index) =>
                setForm((current) => ({
                  ...current,
                  resultEntries: current.resultEntries.filter((_, entryIndex) => entryIndex !== index)
                }))
              }
            />
          </div>

          <div className="mt-8 grid gap-6">
            <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-stone-900">Abnormal Values</h3>
                <Badge tone={abnormalValues.length ? 'warning' : 'success'}>{abnormalValues.length}</Badge>
              </div>
              {abnormalValues.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-stone-700">
                    <thead className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      <tr>
                        <th className="pb-3 pr-4">Test</th>
                        <th className="pb-3 pr-4">Value</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Range</th>
                        <th className="pb-3">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abnormalValues.map((item, index) => (
                        <tr key={`${item.test_name}-${index}`} className="border-t border-stone-200 align-top">
                          <td className="py-3 pr-4 font-semibold text-stone-900">{item.test_name}</td>
                          <td className="py-3 pr-4">
                            {item.value} {item.unit}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge tone={item.severity === 'critical' ? 'danger' : item.status === 'high' ? 'danger' : 'warning'}>
                              {formatLabel(item.status)} / {formatLabel(item.severity)}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            {item.normal_range?.min ?? '-'} to {item.normal_range?.max ?? '-'} {item.normal_range?.unit || ''}
                          </td>
                          <td className="py-3">{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-stone-600">No abnormal values were flagged for the current structured result set.</p>
              )}
            </section>

            <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-stone-900">Trend Compared With Previous Report</h3>
                <Badge tone={trendSummary.length ? 'info' : 'neutral'}>{trendSummary.length}</Badge>
              </div>
              {trendSummary.length ? (
                <div className="mt-4 grid gap-3">
                  {trendSummary.map((item, index) => (
                    <div key={`${item.test_name}-${index}`} className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-stone-900">{item.test_name}</p>
                        <Badge tone={item.trend === 'stable' ? 'success' : item.trend === 'increasing' ? 'warning' : 'info'}>
                          {formatLabel(item.trend)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-stone-700">
                        Current: {item.current_value} | Previous: {item.previous_value} | Change: {item.change} ({item.change_percent}%)
                      </p>
                      <p className="mt-1 text-sm text-stone-600">{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-stone-600">No previous comparable data was available for trend analysis.</p>
              )}
            </section>
          </div>
        </article>
      </div>
    </section>
  );
};

export default LabReportPage;
