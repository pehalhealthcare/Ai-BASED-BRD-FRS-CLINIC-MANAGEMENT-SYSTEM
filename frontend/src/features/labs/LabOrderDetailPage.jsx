import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import aiApi from '../../api/aiApi';

import {
  getLabOrder,
  getOrderResults,
  initializeOrderResults,
  updateLabOrderStatus,
  amendOrder
} from './labApi';

import LabResultEntryDrawer from './LabResultEntryDrawer';
import LabExtractionReviewDrawer from './LabExtractionReviewDrawer';
import LabOrderFinalizationModal from './LabOrderFinalizationModal';

const getStatusTone = (status = '') => {
  switch (status) {
    case 'completed':
    case 'finalized':
    case 'REPORT_AVAILABLE':
      return 'success';
    case 'cancelled':
    case 'rejected':
      return 'danger';
    case 'results_entry':
    case 'ready_for_review':
    case 'processing':
    case 'in_processing':
    case 'sample_collected':
      return 'warning';
    default:
      return 'info';
  }
};

const getFlagTone = (flag) => {
  switch (flag) {
    case 'normal':
      return 'success';
    case 'low':
    case 'high':
    case 'abnormal':
      return 'warning';
    case 'critical_low':
    case 'critical_high':
      return 'danger';
    case 'not_applicable':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const LabOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [report, setReport] = useState(null);
  const [resultsData, setResultsData] = useState({ groups: [], totalParams: 0, completedParams: 0, abnormalCount: 0, criticalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedTestCards, setExpandedTestCards] = useState({});

  // Drawers & Modals state
  const [isEntryDrawerOpen, setIsEntryDrawerOpen] = useState(false);
  const [selectedTestGroup, setSelectedTestGroup] = useState(null);

  const [isExtractionDrawerOpen, setIsExtractionDrawerOpen] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');

  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

  const [isAmending, setIsAmending] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [showAmendDialog, setShowAmendDialog] = useState(false);

  const canManageOrder = [ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ...ADMIN_ROLES].includes(user?.role);
  const isFinalized = order?.status === 'completed';

  // Load Order & Results
  const loadOrderAndResults = useCallback(async () => {
    setError('');
    try {
      const [orderRes, resultsRes] = await Promise.all([
        getLabOrder(id),
        getOrderResults(id).catch(() => ({ data: { groups: [], totalParams: 0, completedParams: 0 } }))
      ]);

      const labOrder = orderRes.data.labOrder;
      setOrder(labOrder);
      setReport(orderRes.data.report || null);

      const rData = resultsRes.data || { groups: [], totalParams: 0, completedParams: 0 };
      setResultsData(rData);

      // Auto initialize parameters if order has tests but no results yet
      if ((!rData.groups || rData.groups.length === 0) && labOrder?.tests?.length && labOrder.status !== 'cancelled') {
        try {
          const initRes = await initializeOrderResults(id);
          if (initRes.data?.results?.length) {
            const freshResults = await getOrderResults(id);
            setResultsData(freshResults.data);
          }
        } catch (_) {
          // ignore auto-init error on initial view
        }
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load lab order details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadOrderAndResults();
  }, [loadOrderAndResults]);

  // Handle Manual Parameter Initialization
  const handleInitializeParameters = async () => {
    setInitializing(true);
    setError('');
    try {
      await initializeOrderResults(id);
      await loadOrderAndResults();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize parameters.');
    } finally {
      setInitializing(false);
    }
  };

  // Open Result Entry Drawer for specific test
  const handleOpenResultEntry = (testGroup) => {
    setSelectedTestGroup(testGroup || resultsData.groups?.[0] || null);
    setIsEntryDrawerOpen(true);
  };

  // Handle Document OCR Extraction
  const handleReportUploadAndExtract = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await aiApi.extractLabReport(formData);
      const output = data?.output || data;
      const entries = output?.result_entries || output?.resultEntries || output?.entries || [];

      if (entries.length > 0) {
        setExtractedData(entries);
        setIsExtractionDrawerOpen(true);
        setOcrMessage(`Detected ${entries.length} extracted parameters from ${file.name}. Review mappings to apply.`);
      } else {
        setOcrMessage('Document uploaded, but no structured test parameters were automatically identified. You can enter values manually.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'AI document extraction failed.');
    } finally {
      setOcrLoading(false);
      event.target.value = '';
    }
  };

  // Handle Amendment
  const handleAmendOrder = async () => {
    if (!amendReason.trim() || amendReason.trim().length < 5) {
      alert('Please provide a valid amendment reason (at least 5 characters).');
      return;
    }

    setIsAmending(true);
    try {
      await amendOrder(id, { reason: amendReason.trim() });
      setShowAmendDialog(false);
      setAmendReason('');
      await loadOrderAndResults();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unlock order for amendment.');
    } finally {
      setIsAmending(false);
    }
  };

  // Toggle card expansion
  const toggleTestCardExpansion = (cardId) => {
    setExpandedTestCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Progress metrics calculation
  const overallProgress = useMemo(() => {
    const total = resultsData.totalParams || 0;
    const completed = resultsData.completedParams || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isAllComplete = total > 0 && completed === total;
    return { total, completed, pct, isAllComplete };
  }, [resultsData]);

  if (loading) {
    return <LoadingState label="Loading laboratory diagnostic workspace..." />;
  }

  if (error && !order) {
    return <ErrorState title="Diagnostic order unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Laboratory Information Management System (LIMS)"
        title={order?.orderNumber || 'Diagnostic Work Order'}
        description="Comprehensive diagnostic result entry, multi-parameter validation, automated flagging, and official report generation."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
              to="/labs/orders"
            >
              ← Back to Orders
            </Link>

            {/* If Finalized -> View PDF or Amend */}
            {isFinalized ? (
              <>
                {report?.generatedReportUrl || report?.reportUrl ? (
                  <a
                    href={report.generatedReportUrl || report.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-200 hover:bg-violet-700"
                    id="view-official-pdf-btn"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>View Official PDF Report</span>
                  </a>
                ) : null}

                {canManageOrder ? (
                  <button
                    type="button"
                    onClick={() => setShowAmendDialog(true)}
                    className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    id="amend-order-btn"
                  >
                    Amend Completed Order
                  </button>
                ) : null}
              </>
            ) : canManageOrder && order?.status !== 'cancelled' ? (
              <>
                {/* Enter / Edit All Results Button */}
                <button
                  type="button"
                  onClick={() => handleOpenResultEntry(resultsData.groups?.[0])}
                  className="flex items-center gap-1.5 rounded-2xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-stone-800"
                  id="open-result-entry-all-btn"
                >
                  <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Enter / Edit Results</span>
                </button>

                {/* Finalize Button */}
                <button
                  type="button"
                  onClick={() => setIsFinalizeModalOpen(true)}
                  className={`flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition ${
                    overallProgress.isAllComplete
                      ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'
                      : 'bg-stone-400 shadow-none hover:bg-stone-500'
                  }`}
                  id="finalize-order-btn"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Finalize Diagnostic Order</span>
                </button>
              </>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      {/* Top Banner: Order Status & Overall LIMS Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient & Prescription Info */}
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Patient Details</span>
              <div className="flex items-center gap-1.5">
                <Badge tone={getStatusTone(order?.status)}>
                  {String(order?.status || 'ordered').replaceAll('_', ' ')}
                </Badge>
                <Badge tone={order?.priority === 'urgent' || order?.priority === 'stat' ? 'danger' : 'info'}>
                  {order?.priority || 'routine'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-700">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-stone-900">{order?.patientId?.fullName || order?.guestPatient?.fullName || 'Walk-in Patient'}</span>
                {order?.patientId?.patientId ? (
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600">
                    {order.patientId.patientId}
                  </span>
                ) : null}
              </div>
              <p className="text-stone-500">
                {order?.patientId?.gender || order?.guestPatient?.gender || '—'} • {order?.patientId?.age || order?.guestPatient?.age ? `${order?.patientId?.age || order?.guestPatient?.age} yrs` : 'Age not provided'}
              </p>
              <p className="text-stone-600">
                <span className="font-semibold text-stone-800">Doctor:</span> {order?.doctorId?.fullName || 'Self / Direct Order'}
              </p>
              <p className="text-stone-600">
                <span className="font-semibold text-stone-800">Collection:</span> {order?.collectionMethod === 'HOME_COLLECTION' ? 'Home Sample Collection' : 'At Laboratory Desk'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span>Ordered: {(order?.orderedAt || order?.createdAt || '').slice(0, 10)}</span>
            {order?.tokenNumber ? (
              <span className="font-bold text-violet-700">Token #{order.tokenNumber}</span>
            ) : null}
          </div>
        </article>

        {/* LIMS Progress & Completion Bar */}
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col justify-between md:col-span-2">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Diagnostic Order Completion Progress</h3>
                <p className="text-xs text-stone-500">
                  Every ordered investigation must be fully entered and validated before final release.
                </p>
              </div>

              <span className={`text-lg font-extrabold ${overallProgress.isAllComplete ? 'text-emerald-600' : 'text-violet-700'}`}>
                {overallProgress.pct}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallProgress.isAllComplete
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600'
                }`}
                style={{ width: `${overallProgress.pct}%` }}
              />
            </div>

            {/* Key Count Badges */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-2xl border border-stone-100 bg-stone-50/75 p-3">
                <div className="text-xs font-semibold text-stone-500">Total Tests</div>
                <div className="mt-1 text-base font-bold text-stone-900">{order?.tests?.length || 0}</div>
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50/75 p-3">
                <div className="text-xs font-semibold text-stone-500">Parameters</div>
                <div className="mt-1 text-base font-bold text-stone-900">
                  {overallProgress.completed} / {overallProgress.total}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                <div className="text-xs font-semibold text-amber-700">Abnormal</div>
                <div className="mt-1 text-base font-bold text-amber-900">{resultsData.abnormalCount || 0}</div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
                <div className="text-xs font-semibold text-rose-700">Critical</div>
                <div className="mt-1 text-base font-bold text-rose-900">{resultsData.criticalCount || 0}</div>
              </div>
            </div>
          </div>

          {overallProgress.total === 0 && !isFinalized ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-2 border border-violet-100">
              <span className="text-xs text-violet-800">
                Diagnostic parameter templates not generated yet.
              </span>
              <button
                type="button"
                onClick={handleInitializeParameters}
                disabled={initializing}
                className="text-xs font-bold text-violet-700 hover:underline disabled:text-stone-400"
              >
                {initializing ? 'Initializing...' : 'Initialize Templates →'}
              </button>
            </div>
          ) : null}
        </article>
      </div>

      {/* Main Content: Investigations / Diagnostic Work Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Diagnostic Investigations List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>Diagnostic Investigations</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 font-semibold">
                {order?.tests?.length || 0}
              </span>
            </h2>
            <span className="text-xs text-stone-500">Click any investigation to enter or review results</span>
          </div>

          {(order?.tests || []).map((test, index) => {
            const groupKey = test.code || test.name;
            const group = (resultsData.groups || []).find((g) => g.testCode === test.code || g.testName === test.name) || {
              testName: test.name,
              testCode: test.code,
              results: []
            };

            const isExpanded = expandedTestCards[groupKey] ?? true;
            const testTotal = group.results?.length || 0;
            const testCompleted = (group.results || []).filter((r) => ['entered', 'not_applicable'].includes(r.status)).length;
            const testPct = testTotal > 0 ? Math.round((testCompleted / testTotal) * 100) : 0;
            const testAbnormal = (group.results || []).filter((r) => ['low', 'high', 'abnormal'].includes(r.effectiveFlag)).length;
            const testCritical = (group.results || []).filter((r) => ['critical_low', 'critical_high'].includes(r.effectiveFlag)).length;
            const isTestDone = testTotal > 0 && testCompleted === testTotal;

            return (
              <div
                key={test._id || `${test.code}-${index}`}
                className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden transition hover:border-stone-300"
              >
                {/* Investigation Card Header */}
                <div className="p-5 border-b border-stone-100 bg-stone-50/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl font-bold text-xs shrink-0 ${
                        isTestDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-violet-100 text-violet-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-stone-900">{test.name}</h3>
                          {test.code ? (
                            <span className="rounded bg-stone-200/80 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-stone-700">
                              {test.code}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {test.category || 'General Diagnostic'} • Specimen: {test.specimenType || 'Blood/Serum'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Badges */}
                      {testCritical > 0 ? (
                        <Badge tone="danger">{testCritical} Critical</Badge>
                      ) : null}
                      {testAbnormal > 0 ? (
                        <Badge tone="warning">{testAbnormal} Abnormal</Badge>
                      ) : null}
                      <span className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                        isTestDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {testCompleted}/{testTotal} Params ({testPct}%)
                      </span>

                      {/* Enter Results Button */}
                      {!isFinalized && canManageOrder ? (
                        <button
                          type="button"
                          onClick={() => handleOpenResultEntry(group)}
                          className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>{testCompleted > 0 ? 'Edit Results' : 'Enter Results'}</span>
                        </button>
                      ) : null}

                      {/* Expand / Collapse Button */}
                      <button
                        type="button"
                        onClick={() => toggleTestCardExpansion(groupKey)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      >
                        <svg
                          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Parameters Preview Table (if expanded) */}
                {isExpanded ? (
                  <div className="p-4">
                    {group.results?.length === 0 ? (
                      <div className="py-4 text-center text-xs text-stone-400">
                        No parameter breakdown found. Click Enter Results to initialize.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-stone-100 bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] font-semibold text-stone-500 uppercase">
                              <th className="py-2.5 px-3">Parameter</th>
                              <th className="py-2.5 px-3">Result Value</th>
                              <th className="py-2.5 px-3">Unit</th>
                              <th className="py-2.5 px-3">Reference Range</th>
                              <th className="py-2.5 px-3">Flag</th>
                              <th className="py-2.5 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {group.results.map((r) => {
                              const flag = r.effectiveFlag || r.autoFlag || 'not_evaluated';
                              const isEntered = ['entered', 'not_applicable'].includes(r.status);

                              return (
                                <tr key={r._id} className="hover:bg-stone-50/50">
                                  <td className="py-2.5 px-3 font-semibold text-stone-800">
                                    {r.parameterName}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                                    {r.value ? r.value : <span className="text-stone-300 font-normal">Pending</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">
                                    {r.unit || '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-stone-500 text-[11px]">
                                    {r.referenceRange?.text ||
                                      (r.referenceRange?.min != null && r.referenceRange?.max != null
                                        ? `${r.referenceRange.min} - ${r.referenceRange.max}`
                                        : '—')}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <Badge tone={getFlagTone(flag)}>
                                      {flag === 'not_evaluated' ? 'Normal' : flag.replace('_', ' ')}
                                    </Badge>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span className={`text-[11px] font-semibold ${isEntered ? 'text-emerald-700' : 'text-amber-700'}`}>
                                      {isEntered ? '✓ Done' : 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Right 1 Col: Attached Reports & AI Extraction Sidebar */}
        <div className="space-y-6">
          {/* AI Assisted Report Extraction Box */}
          {!isFinalized && canManageOrder ? (
            <article className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50/70 to-indigo-50/50 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-violet-900 font-bold text-sm mb-2">
                <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI Lab Report OCR & Extraction</span>
              </div>
              <p className="text-xs text-stone-600 mb-4">
                Have a paper report or machine printout? Upload the PDF/image to automatically extract parameters and autofill this order.
              </p>

              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-white/80 p-5 text-center cursor-pointer transition hover:bg-white hover:border-violet-400">
                <svg className="h-8 w-8 text-violet-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-xs font-bold text-violet-900">Choose Lab Report File</span>
                <span className="text-[11px] text-stone-500 mt-0.5">Supports PDF, PNG, JPG</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReportUploadAndExtract}
                  disabled={ocrLoading}
                  className="hidden"
                />
              </label>

              {ocrLoading ? (
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-violet-700">
                  <svg className="h-4 w-4 animate-spin text-violet-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Running AI optical character recognition...</span>
                </div>
              ) : null}

              {ocrMessage ? (
                <p className="mt-3 rounded-xl bg-white p-2.5 text-xs text-stone-700 border border-violet-100">
                  {ocrMessage}
                </p>
              ) : null}
            </article>
          ) : null}

          {/* Attached Reports & PDF Deliverables Card */}
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900 mb-3">Diagnostic Deliverables</h3>
            <div className="space-y-3">
              {report?.generatedReportUrl ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs">
                        PDF
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">Official Structured PDF</div>
                        <div className="text-[10px] text-emerald-700">Generated by AICMS LIMS</div>
                      </div>
                    </div>
                    <a
                      href={report.generatedReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ) : null}

              {report?.reportUrl && report.reportUrl !== report.generatedReportUrl ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-700 text-white font-bold text-xs">
                        DOC
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">{report.reportFileName || 'Original Upload'}</div>
                        <div className="text-[10px] text-stone-500">External Uploaded Scan</div>
                      </div>
                    </div>
                    <a
                      href={report.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      View
                    </a>
                  </div>
                </div>
              ) : null}

              {!report?.generatedReportUrl && !report?.reportUrl ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  No reports published yet. Complete results entry and finalize to generate the official report.
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </div>

      {/* Drawers and Modals */}
      <LabResultEntryDrawer
        isOpen={isEntryDrawerOpen}
        onClose={() => setIsEntryDrawerOpen(false)}
        orderId={order?._id}
        testGroup={selectedTestGroup}
        allGroups={resultsData.groups || []}
        onSaved={loadOrderAndResults}
        isReadOnly={isFinalized}
      />

      <LabExtractionReviewDrawer
        isOpen={isExtractionDrawerOpen}
        onClose={() => setIsExtractionDrawerOpen(false)}
        orderId={order?._id}
        allGroups={resultsData.groups || []}
        extractedData={extractedData}
        onApplied={loadOrderAndResults}
      />

      <LabOrderFinalizationModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        orderId={order?._id}
        orderNumber={order?.orderNumber}
        onFinalized={() => {
          loadOrderAndResults();
        }}
        onOpenTestResultEntry={(testName) => {
          const group = (resultsData.groups || []).find((g) => g.testName === testName || g.testCode === testName);
          handleOpenResultEntry(group);
        }}
      />

      {/* Amendment Reason Dialog */}
      {showAmendDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-2">Amend Completed Lab Order</h3>
            <p className="text-xs text-stone-600 mb-4">
              This action will unlock diagnostic parameter results for editing. An audit log entry will permanently record your identity and reason for reopening this order.
            </p>

            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Amendment Reason (Mandatory)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Doctor requested re-verification of platelet count; corrected transposition error..."
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 p-3 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAmendDialog(false)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAmendOrder}
                disabled={isAmending || amendReason.trim().length < 5}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:bg-stone-300"
              >
                {isAmending ? 'Unlocking...' : 'Unlock for Amendment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default LabOrderDetailPage;
