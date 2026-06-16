import { useEffect, useState } from 'react';

import Badge from '../../components/common/Badge';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Table from '../../components/common/Table';
import PageHeader from '../../components/layout/PageHeader';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { getBillingAnomaly, listBillingAnomalies, reviewBillingAnomaly } from './dashboardApi';
import NoDataState from './NoDataState';
import SectionCard from './SectionCard';
import StatCard from './StatCard';

const badgeTone = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
  available: 'success',
  fallback: 'warning',
  insufficient_data: 'warning',
  unavailable: 'danger',
  pending: 'warning',
  reviewed: 'info',
  dismissed: 'neutral',
  confirmed: 'danger'
};

const labelize = (value) => String(value || 'unknown').replace(/_/g, ' ');

const DashboardBillingAnomaliesPage = () => {
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [anomalies, setAnomalies] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const loadAnomalies = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listBillingAnomalies();
      setAnomalies(response.data.anomalies || []);
      setSummary(response.data.summary || {});
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load billing anomaly reviews.');
    } finally {
      setLoading(false);
    }
  };

  const loadAnomalyDetail = async (id) => {
    setDetailLoading(true);
    setDetailError('');

    try {
      const response = await getBillingAnomaly(id);
      setSelectedAnomaly(response.data.anomaly);
      setReviewNotes(response.data.anomaly.reviewNotes || '');
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || 'Unable to load billing anomaly detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  const handleReview = async (reviewStatus) => {
    if (!selectedAnomaly?._id) {
      return;
    }

    setReviewSaving(true);
    setDetailError('');

    try {
      const response = await reviewBillingAnomaly(selectedAnomaly._id, {
        reviewStatus,
        reviewNotes
      });
      setSelectedAnomaly(response.data.anomaly);
      await loadAnomalies();
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || 'Unable to update review status.');
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading billing fraud review..." />;
  }

  if (error) {
    return <ErrorState title="Billing anomaly dashboard unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Admin Review"
        title="Billing Fraud / Revenue Leakage"
        description="Review assistive anomaly signals from billing rule checks and optional IsolationForest scoring. These flags are for admin review only and are not final fraud judgments."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Flagged invoices" value={summary?.totalFlagged ?? 0} />
        <StatCard label="High risk" value={summary?.highRiskCount ?? 0} />
        <StatCard label="Medium risk" value={summary?.mediumRiskCount ?? 0} />
        <StatCard label="Pending review" value={summary?.pendingReviewCount ?? 0} />
      </div>

      <SectionCard
        title="Flagged invoices"
        description="Rule-based fallback remains available if the trained model is missing or insufficient."
      >
        <Table
          columns={[
            {
              key: 'invoice',
              label: 'Invoice',
              render: (row) => row.invoiceId?.invoiceNumber || row.invoiceId?._id || 'Not linked'
            },
            {
              key: 'patient',
              label: 'Patient',
              render: (row) => row.patientId?.fullName || row.patientId?.patientId || 'Not linked'
            },
            {
              key: 'amount',
              label: 'Amount',
              render: (row) => formatCurrency(row.invoiceId?.totalAmount || 0)
            },
            {
              key: 'risk',
              label: 'Risk',
              render: (row) => <Badge tone={badgeTone[row.riskLevel] || 'neutral'}>{labelize(row.riskLevel)}</Badge>
            },
            {
              key: 'score',
              label: 'Anomaly score',
              render: (row) => row.anomalyScore ?? 0
            },
            {
              key: 'rules',
              label: 'Triggered rules',
              render: (row) => (row.triggeredRules || []).map((rule) => rule.code).join(', ') || 'None'
            },
            {
              key: 'model',
              label: 'Model status',
              render: (row) => <Badge tone={badgeTone[row.modelStatus] || 'neutral'}>{labelize(row.modelStatus)}</Badge>
            },
            {
              key: 'createdAt',
              label: 'Created',
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: 'actions',
              label: 'Review action',
              render: (row) => (
                <button
                  type="button"
                  className="rounded-2xl border border-cyan-300 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
                  onClick={() => loadAnomalyDetail(row._id)}
                >
                  View details
                </button>
              )
            }
          ]}
          rows={anomalies}
          emptyState={
            <NoDataState
              title="No billing anomalies flagged"
              description="Billing anomaly review records will appear here when invoices are screened."
            />
          }
        />
      </SectionCard>

      <SectionCard
        title="Review details"
        description="Confirm or dismiss the signal after reviewing the invoice context and triggered rules."
      >
        {detailLoading ? <LoadingState label="Loading anomaly detail..." /> : null}
        {detailError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{detailError}</p> : null}
        {!selectedAnomaly && !detailLoading ? (
          <NoDataState
            title="Select a flagged invoice"
            description="Choose View details on a row to inspect the anomaly signal and review it."
          />
        ) : null}

        {selectedAnomaly && !detailLoading ? (
          <div className="grid gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone={badgeTone[selectedAnomaly.riskLevel] || 'neutral'}>{labelize(selectedAnomaly.riskLevel)}</Badge>
              <Badge tone={badgeTone[selectedAnomaly.modelStatus] || 'neutral'}>
                {selectedAnomaly.modelStatus === 'fallback'
                  ? 'Rule-based fallback used'
                  : selectedAnomaly.modelStatus === 'insufficient_data'
                    ? 'More historical billing data required for ML scoring'
                    : labelize(selectedAnomaly.modelStatus)}
              </Badge>
              <Badge tone={badgeTone[selectedAnomaly.reviewStatus] || 'neutral'}>
                {labelize(selectedAnomaly.reviewStatus)}
              </Badge>
            </div>

            <dl className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Invoice</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">
                  {selectedAnomaly.invoiceId?.invoiceNumber || 'Not linked'}
                </dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Patient</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">
                  {selectedAnomaly.patientId?.fullName || selectedAnomaly.patientId?.patientId || 'Not linked'}
                </dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Amount</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">
                  {formatCurrency(selectedAnomaly.invoiceId?.totalAmount || 0)}
                </dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Anomaly score</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">{selectedAnomaly.anomalyScore ?? 0}</dd>
              </div>
            </dl>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-semibold text-stone-900">Triggered rules</p>
              <div className="mt-3 grid gap-3">
                {(selectedAnomaly.triggeredRules || []).length ? (
                  selectedAnomaly.triggeredRules.map((rule) => (
                    <div key={`${selectedAnomaly._id}-${rule.code}`} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={badgeTone[rule.severity] || 'neutral'}>{rule.code}</Badge>
                        <Badge tone={badgeTone[rule.severity] || 'neutral'}>{labelize(rule.severity)}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-stone-700">{rule.message}</p>
                      <pre className="mt-3 overflow-x-auto rounded-2xl bg-stone-950/95 p-4 text-xs text-stone-100">
                        {JSON.stringify(rule.evidence || {}, null, 2)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">No rule evidence was stored for this record.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-semibold text-stone-900">Model explanation</p>
              <p className="mt-2 text-sm text-stone-600">{selectedAnomaly.explanation || 'Not provided'}</p>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Review note</span>
              <textarea
                className="min-h-28 rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Add the outcome of the admin review here."
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={reviewSaving}
                className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:border-stone-300 disabled:text-stone-400"
                onClick={() => handleReview('reviewed')}
              >
                Mark reviewed
              </button>
              <button
                type="button"
                disabled={reviewSaving}
                className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:text-stone-400"
                onClick={() => handleReview('dismissed')}
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={reviewSaving}
                className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:bg-stone-300"
                onClick={() => handleReview('confirmed')}
              >
                Confirm issue
              </button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </section>
  );
};

export default DashboardBillingAnomaliesPage;
