import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import aiApi from '../../api/aiApi';

import {
  getLabOrder,
  listLabOrders,
  getOrderResults,
  initializeOrderResults,
  updateLabOrderStatus,
  amendOrder
} from './labApi';

import LabOrderFinalizationModal from './LabOrderFinalizationModal';
import CreateLabOrderModal from './CreateLabOrderModal';
import { getStatusTone, getStatusDisplayLabel } from './labStatusConstants';

const LabOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Create Lab Order Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Master list state (Column 1 - Left pane)
  const [ordersList, setOrdersList] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ORDERED, SAMPLE_COLLECTED, PROCESSING, RESULTS_ENTRY, REVIEW, COMPLETED
  const [sortBy, setSortBy] = useState('latest');

  // Selected Order details (Column 2 - Middle pane)
  const [order, setOrder] = useState(null);
  const [report, setReport] = useState(null);
  const [resultsData, setResultsData] = useState({ groups: [], totalParams: 0, completedParams: 0, abnormalCount: 0, criticalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tests'); // tests, sample, patient, files, activity

  // Workflow Transition Modals
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [isCompleteProcessingModalOpen, setIsCompleteProcessingModalOpen] = useState(false);
  const [isReadyForReviewModalOpen, setIsReadyForReviewModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnCorrectionReason, setReturnCorrectionReason] = useState('');
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);

  // Missing parameters validation modal
  const [missingParamsAlert, setMissingParamsAlert] = useState(null);

  // Amendment state
  const [isAmending, setIsAmending] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [showAmendDialog, setShowAmendDialog] = useState(false);

  // Notes state
  const [orderNotes, setOrderNotes] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // File Upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedReports, setAttachedReports] = useState([]);

  const canManageOrder = [ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.LAB_OPERATOR, ...ADMIN_ROLES].includes(user?.role);
  const isFinalized = order?.status === 'completed';

  // 1. Load Orders for Left Master List
  const loadOrdersList = useCallback(async (selectId = null) => {
    setOrdersLoading(true);
    try {
      const res = await listLabOrders({ limit: 100 });
      const items = res.data?.labOrders || [];
      setOrdersList(items);
      
      const targetId = selectId || id;
      if (!targetId && items.length > 0) {
        navigate(`/labs/orders/${items[0]._id}`, { replace: true });
      } else if (!targetId) {
        setLoading(false);
      }
    } catch (_) {
      if (!id) setLoading(false);
    } finally {
      setOrdersLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadOrdersList();
  }, [loadOrdersList]);

  // 2. Load Active Order & Results Summary
  const loadActiveOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');

    try {
      const [orderRes, resultsRes] = await Promise.all([
        getLabOrder(id),
        getOrderResults(id).catch(() => ({ data: { groups: [], totalParams: 0, completedParams: 0 } }))
      ]);

      const labOrder = orderRes.data.labOrder;
      setOrder(labOrder);
      setOrderNotes(labOrder.notes || '');
      const rep = orderRes.data.report || null;
      setReport(rep);

      // Build attached reports list
      const attached = [];
      if (labOrder.status === 'completed' || rep?.generatedReportUrl || rep?.status === 'finalized') {
        attached.push({
          id: 'rep-gen',
          fileName: rep?.generatedReportFileName || `${labOrder.orderNumber}_Official_Report.pdf`,
          fileSize: '1.8 MB',
          date: (labOrder.finalizedAt || rep?.updatedAt || labOrder.updatedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
          type: 'Generated',
          url: `/labs/orders/${labOrder._id}/reports`
        });
      }
      if (rep?.reportUrl) {
        attached.push({
          id: 'rep-orig',
          fileName: rep.reportFileName || 'Original Lab Report.pdf',
          fileSize: '2.4 MB',
          date: (rep.createdAt || '').slice(0, 10),
          type: 'Original',
          url: rep.reportUrl
        });
      }
      setAttachedReports(attached);

      let rData = resultsRes.data || { groups: [], totalParams: 0, completedParams: 0 };
      setResultsData(rData);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load diagnostic order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadActiveOrder();
  }, [loadActiveOrder]);

  // Completion stats
  const overallProgress = useMemo(() => {
    const total = resultsData.totalParams || 0;
    const completed = resultsData.completedParams || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isAllComplete = total > 0 && completed === total;
    return { total, completed, pct, isAllComplete };
  }, [resultsData]);

  // Dynamic filter tabs counts
  const tabCounts = useMemo(() => {
    return {
      all: ordersList.length,
      ordered: ordersList.filter((o) => ['ordered', 'confirmed', 'scheduled', 'sample_collection_pending'].includes(o.status)).length,
      collected: ordersList.filter((o) => o.status === 'sample_collected').length,
      processing: ordersList.filter((o) => ['processing', 'in_processing', 'in_analysis'].includes(o.status)).length,
      resultsEntry: ordersList.filter((o) => o.status === 'results_entry').length,
      review: ordersList.filter((o) => o.status === 'ready_for_review').length,
      completed: ordersList.filter((o) => ['completed', 'finalized', 'report_ready'].includes(o.status)).length
    };
  }, [ordersList]);

  // Filtered Orders for Left Master List
  const filteredOrders = useMemo(() => {
    return ordersList.filter((ord) => {
      // Search filter
      if (orderSearchQuery) {
        const q = orderSearchQuery.toLowerCase();
        const mNum = (ord.orderNumber || '').toLowerCase().includes(q);
        const mPat = (ord.patientId?.fullName || ord.guestPatient?.fullName || '').toLowerCase().includes(q);
        const mUHID = (ord.patientId?.patientId || '').toLowerCase().includes(q);
        const mTests = (ord.tests || []).some((t) => (t.name || t.code || '').toLowerCase().includes(q));
        if (!mNum && !mPat && !mUHID && !mTests) return false;
      }

      // Status tab filter
      if (statusFilter === 'ORDERED') return ['ordered', 'confirmed', 'scheduled', 'sample_collection_pending'].includes(ord.status);
      if (statusFilter === 'SAMPLE_COLLECTED') return ord.status === 'sample_collected';
      if (statusFilter === 'PROCESSING') return ['processing', 'in_processing', 'in_analysis'].includes(ord.status);
      if (statusFilter === 'RESULTS_ENTRY') return ord.status === 'results_entry';
      if (statusFilter === 'REVIEW') return ord.status === 'ready_for_review';
      if (statusFilter === 'COMPLETED') return ['completed', 'finalized', 'report_ready'].includes(ord.status);

    }).sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.orderedAt || a.createdAt) - new Date(b.orderedAt || b.createdAt);
      }
      return new Date(b.orderedAt || b.createdAt) - new Date(a.orderedAt || a.createdAt);
    });
  }, [ordersList, orderSearchQuery, statusFilter, sortBy]);

  // Payment & Collection Eligibility
  const isPaymentPending = ['PENDING', 'pending', 'UNPAID', 'unpaid', 'DUE', 'due'].includes(order?.paymentStatus);
  const isCollectionEligible = ['ordered', 'confirmed', 'scheduled', 'sample_collection_pending'].includes(order?.status) && !isPaymentPending;

  // Workflow Action Handlers
  const handleTransitionStatus = async (newStatus, modalCloseCallback) => {
    if (!order?._id || isSubmittingTransition) return;
    setIsSubmittingTransition(true);
    try {
      await updateLabOrderStatus(order._id, { status: newStatus });
      if (modalCloseCallback) modalCloseCallback();
      toast.success(
        newStatus === 'sample_collected'
          ? 'Sample marked as collected.'
          : newStatus === 'processing'
          ? 'Laboratory processing started.'
          : newStatus === 'results_entry'
          ? 'Processing completed. Results entry is now available.'
          : newStatus === 'ready_for_review'
          ? 'Order submitted for review.'
          : 'Status updated successfully.'
      );
      await loadActiveOrder();
      await loadOrdersList();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update laboratory status.';
      toast.error(msg);
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  // Step 1 -> 2: Confirm Sample Collected
  const handleConfirmSampleCollected = () => {
    handleTransitionStatus('sample_collected', () => setIsCollectModalOpen(false));
  };

  // Step 2 -> 3: Confirm Start Processing
  const handleConfirmStartProcessing = () => {
    handleTransitionStatus('processing', () => setIsProcessingModalOpen(false));
  };

  // Step 3 -> 4: Confirm Processing Completed
  const handleConfirmCompleteProcessing = () => {
    handleTransitionStatus('results_entry', () => setIsCompleteProcessingModalOpen(false));
  };

  // Return Results for Correction
  const handleConfirmReturnForCorrection = async () => {
    if (!returnCorrectionReason.trim() || returnCorrectionReason.trim().length < 5) {
      toast.error('Please enter a mandatory correction reason (at least 5 characters).');
      return;
    }
    setIsSubmittingTransition(true);
    try {
      await updateLabOrderStatus(order._id, {
        status: 'results_entry',
        notes: returnCorrectionReason.trim(),
        reason: returnCorrectionReason.trim()
      });
      setIsReturnModalOpen(false);
      setReturnCorrectionReason('');
      toast.success('Results returned for correction. Technician editing unlocked.');
      await loadActiveOrder();
      await loadOrdersList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return results for correction.');
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  // Step 4 -> 5: Confirm Ready for Review
  const handleConfirmReadyForReview = async () => {
    if (!overallProgress.isAllComplete) {
      // Find missing parameters
      const missingList = [];
      (resultsData.groups || []).forEach((g) => {
        (g.results || []).forEach((r) => {
          if (r.isRequired && (r.status === 'pending' || r.value === '' || r.value == null)) {
            missingList.push(`${g.testName}: ${r.parameterName}`);
          }
        });
      });
      setMissingParamsAlert(missingList.length > 0 ? missingList : ['Required parameters are missing']);
      setIsReadyForReviewModalOpen(false);
      return;
    }
    handleTransitionStatus('ready_for_review', () => setIsReadyForReviewModalOpen(false));
  };

  // Handle Amendment
  const handleAmendOrder = async () => {
    if (!amendReason.trim() || amendReason.trim().length < 5) {
      toast.error('Please enter an amendment reason (at least 5 characters).');
      return;
    }
    setIsAmending(true);
    try {
      await amendOrder(id, { reason: amendReason.trim() });
      setShowAmendDialog(false);
      setAmendReason('');
      toast.success('Order unlocked for amendment.');
      await loadActiveOrder();
      await loadOrdersList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock order.');
    } finally {
      setIsAmending(false);
    }
  };

  // Upload Laboratory Report File
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await aiApi.extractLabReport(formData);
      const output = data?.output || data;
      const extractedEntries = output?.result_entries || output?.resultEntries || output?.entries || [];

      setAttachedReports((prev) => [
        ...prev,
        {
          id: `doc-${Date.now()}`,
          fileName: file.name,
          fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          type: extractedEntries.length > 0 ? 'Extracted' : 'Original',
          url: '#'
        }
      ]);

      alert(`Report "${file.name}" uploaded successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload report.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const primaryTestName = order?.tests?.[0]?.name || 'Diagnostic Investigation';
  const sampleIdDisplay = order?.sampleId || (order?.status !== 'ordered' ? 'SMP-20260905-0010' : 'Not collected');
  const sampleTypeDisplay = order?.sampleType || order?.tests?.[0]?.specimenType || 'Whole Blood (EDTA)';
  const sampleCollectedOnDisplay = order?.sampleCollectedAt ? new Date(order.sampleCollectedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const sampleCollectedByDisplay = order?.sampleCollectedByName || (order?.status !== 'ordered' ? (user?.fullName || user?.name || 'Rajesh Sharma') : '—');

  // Stepper items
  const steps = [
    {
      key: 'ordered',
      stepNum: 1,
      label: 'Ordered',
      time: order?.orderedAt || order?.createdAt ? new Date(order.orderedAt || order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '05 Sep',
      subTime: order?.orderedAt || order?.createdAt ? new Date(order.orderedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:20 AM',
      isDone: ['sample_collected', 'processing', 'in_processing', 'results_entry', 'ready_for_review', 'completed'].includes(order?.status),
      isActive: order?.status === 'ordered',
      isLocked: false
    },
    {
      key: 'sample_collected',
      stepNum: 2,
      label: 'Sample Collected',
      time: order?.sampleCollectedAt ? new Date(order.sampleCollectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending',
      subTime: order?.sampleCollectedAt ? new Date(order.sampleCollectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      isDone: ['processing', 'in_processing', 'results_entry', 'ready_for_review', 'completed'].includes(order?.status),
      isActive: order?.status === 'sample_collected',
      isLocked: false
    },
    {
      key: 'processing',
      stepNum: 3,
      label: 'Processing',
      time: order?.processingStartedAt ? new Date(order.processingStartedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending',
      subTime: order?.processingStartedAt ? new Date(order.processingStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      isDone: ['results_entry', 'ready_for_review', 'completed'].includes(order?.status),
      isActive: ['processing', 'in_processing', 'in_analysis'].includes(order?.status),
      isLocked: false
    },
    {
      key: 'results_entry',
      stepNum: 4,
      label: 'Results Entry',
      time: order?.resultsCompletedAt ? 'Entered' : 'Pending',
      subTime: '',
      isDone: ['ready_for_review', 'completed'].includes(order?.status),
      isActive: order?.status === 'results_entry',
      isLocked: ['ordered', 'sample_collected', 'processing', 'in_processing', 'in_analysis'].includes(order?.status)
    },
    {
      key: 'ready_for_review',
      stepNum: 5,
      label: 'Ready for Review',
      time: order?.status === 'ready_for_review' ? 'Submitted' : 'Pending',
      subTime: '',
      isDone: order?.status === 'completed',
      isActive: order?.status === 'ready_for_review',
      isLocked: !['ready_for_review', 'completed'].includes(order?.status)
    },
    {
      key: 'completed',
      stepNum: 6,
      label: 'Completed',
      time: order?.finalizedAt ? new Date(order.finalizedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending',
      subTime: '',
      isDone: order?.status === 'completed',
      isActive: false,
      isLocked: order?.status !== 'completed'
    }
  ];

  if (loading && !order) {
    return <LoadingState label="Loading Diagnostic Work Orders..." />;
  }

  if (error && !order) {
    return <ErrorState title="Diagnostic order unavailable" description={error} />;
  }

  return (
    <div
      className="h-full min-h-0 flex-1 flex flex-col overflow-hidden font-sans antialiased text-stone-800"
      id="diagnostic-work-orders-page"
    >
      {/* ========================================================= */}
      {/* FIXED WORKSPACE TOP HEADER BAR                            */}
      {/* ========================================================= */}
      <div className="shrink-0 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-transparent">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Diagnostic Work Orders</span>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800">
              {ordersList.length} Orders
            </span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage and process laboratory orders from sample collection to final reports.
          </p>
        </div>

        {/* Primary + Create Lab Order Action Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-violet-200 transition cursor-pointer shrink-0"
          id="create-lab-order-btn"
        >
          <span className="text-base font-black leading-none">+</span>
          <span>Create Lab Order</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 3-COLUMN INDEPENDENT SCROLL WORKSPACE GRID                */}
      {/* ========================================================= */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-5 h-full overflow-hidden">
        
        {/* ========================================================= */}
        {/* COLUMN 1: Orders List (Left - 4 cols / 3.5 on xl)        */}
        {/* ========================================================= */}
        <aside className="lg:col-span-4 xl:col-span-3.5 h-full flex flex-col rounded-3xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden min-h-0">
          
          {/* Sticky Header inside Column 1 */}
          <div className="p-3.5 border-b border-stone-100 bg-white space-y-2.5 shrink-0">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {[
                { key: 'ALL', label: `All (${tabCounts.all})` },
                { key: 'ORDERED', label: `Ordered (${tabCounts.ordered})` },
                { key: 'SAMPLE_COLLECTED', label: `Collected (${tabCounts.collected})` },
                { key: 'PROCESSING', label: `Processing (${tabCounts.processing})` },
                { key: 'RESULTS_ENTRY', label: `Results (${tabCounts.resultsEntry})` },
                { key: 'REVIEW', label: `Review (${tabCounts.review})` },
                { key: 'COMPLETED', label: `Completed (${tabCounts.completed})` }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <svg className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by patient, order ID, test..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/70 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 transition"
              />
            </div>

            {/* Count & Sort */}
            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5 font-medium">
              <span>{filteredOrders.length} orders found</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-2 py-0.5 font-semibold text-stone-700 outline-none text-[11px]"
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Independently Scrollable Orders Cards List */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-2 [scrollbar-width:thin]">
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-xs text-stone-400">
                No orders match this filter.
              </div>
            ) : (
              filteredOrders.map((ord) => {
                const isSelected = String(ord._id) === String(id);
                const testNames = (ord.tests || []).map((t) => t.name || t.code).join(', ');

                return (
                  <div
                    key={ord._id}
                    onClick={() => navigate(`/labs/orders/${ord._id}`)}
                    className={`cursor-pointer rounded-2xl p-3.5 transition border ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50/60 shadow-xs ring-1 ring-violet-300'
                        : 'border-stone-200/80 bg-white hover:bg-stone-50/80 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-extrabold text-xs text-stone-900 tracking-tight">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {(ord.orderedAt || ord.createdAt || '').slice(0, 10)}
                      </span>
                    </div>

                    <div className="mt-1 font-bold text-xs text-stone-900">
                      {ord.patientId?.fullName || ord.guestPatient?.fullName || 'Patient Alpha'}
                    </div>

                    <div className="mt-0.5 text-[10px] text-stone-500">
                      UHID: <strong className="font-mono text-stone-700">{ord.patientId?.patientId || 'PAT-0010'}</strong> • {ord.patientId?.age || ord.guestPatient?.age || 28}y • {ord.patientId?.gender || ord.guestPatient?.gender || 'Other'}
                    </div>

                    <div className="mt-1 text-[11px] text-stone-600 truncate max-w-[280px]">
                      Tests: <span className="font-medium text-stone-800">{testNames || 'CBC'}</span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] pt-1.5 border-t border-stone-100">
                      <span className="text-stone-400 capitalize">
                        Priority: <strong className={ord.priority === 'urgent' || ord.priority === 'stat' ? 'text-rose-600 font-bold' : 'text-stone-700'}>{ord.priority || 'Routine'}</strong>
                      </span>
                      <Badge tone={getStatusTone(ord.status)}>
                        {getStatusDisplayLabel(ord.status)}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ========================================================= */}
        {/* COLUMN 2: Order Details (Middle - 5 cols / 5.5 on xl)     */}
        {/* ========================================================= */}
        <section className="lg:col-span-5 xl:col-span-5.5 h-full flex flex-col rounded-3xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden min-h-0">
          
          {/* Sticky Header inside Column 2: Order Info + Stepper + Banner + Tabs */}
          <div className="p-4 sm:p-5 border-b border-stone-100 bg-white shrink-0 space-y-3.5">
            {/* Header Top Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight">
                    Order: {order?.orderNumber}
                  </h2>
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-extrabold text-violet-800">
                    {getStatusDisplayLabel(order?.status)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-600">
                  Patient: <strong className="text-stone-900 font-bold">{order?.patientId?.fullName || order?.guestPatient?.fullName || 'Patient Alpha'}</strong>
                  {' '}| UHID: <strong className="font-mono text-stone-800 font-bold">{order?.patientId?.patientId || 'PAT-20260905-0010'}</strong>
                  {' '}| {order?.patientId?.age || order?.guestPatient?.age || 28}y, {order?.patientId?.gender || order?.guestPatient?.gender || 'Other'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-600 flex-wrap">
                <div>
                  <span className="text-stone-400 text-[9px] font-bold uppercase block">Order Date</span>
                  <span className="font-bold text-stone-800 text-[11px]">{(order?.orderedAt || order?.createdAt || '').slice(0, 10) || '05 Sep 2026'}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[9px] font-bold uppercase block">Payment</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.2 text-[10px]">
                    <span>✓</span>
                    <span>{order?.paymentStatus || 'Paid'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 text-[9px] font-bold uppercase block">Priority</span>
                  <span className={`inline-flex items-center font-bold px-1.5 py-0.2 rounded text-[10px] ${
                    order?.priority === 'urgent' || order?.priority === 'stat'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-stone-100 text-stone-700'
                  }`}>
                    {order?.priority ? order.priority.charAt(0).toUpperCase() + order.priority.slice(1) : 'Routine'}
                  </span>
                </div>
              </div>
            </div>

            {/* 6-Step Horizontal Progress Stepper */}
            <div className="grid grid-cols-6 gap-1.5 text-center text-xs">
              {steps.map((step) => (
                <div key={step.key} className="flex flex-col items-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs transition-all ${
                    step.isDone
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : step.isActive
                      ? 'bg-violet-600 text-white ring-3 ring-violet-200 shadow-xs'
                      : step.isLocked
                      ? 'border border-stone-200 bg-stone-100 text-stone-400'
                      : 'border border-stone-300 bg-white text-stone-500'
                  }`}>
                    {step.isDone ? '✓' : step.isLocked ? '🔒' : step.stepNum}
                  </div>

                  <span className={`mt-1 font-bold text-[10px] truncate max-w-full ${
                    step.isActive ? 'text-violet-900 font-extrabold' : step.isDone ? 'text-stone-800' : 'text-stone-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Next Step Action Banner */}
            <div className="rounded-2xl bg-violet-50/80 border border-violet-200/80 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white font-bold text-sm shrink-0">
                  🧪
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-violet-950">
                    {order?.status === 'ordered' && 'Next Step: Sample Collection'}
                    {order?.status === 'sample_collected' && 'Next Step: Start Laboratory Processing'}
                    {['processing', 'in_processing'].includes(order?.status) && 'Next Step: Complete Processing & Results Entry'}
                    {order?.status === 'results_entry' && (overallProgress.isAllComplete ? 'Next Step: Submit for Review' : 'Next Step: Enter Test Results')}
                    {order?.status === 'ready_for_review' && 'Next Step: Finalize & Complete Order'}
                    {order?.status === 'completed' && 'Order Completed & Report Published'}
                  </h3>
                  <p className="text-[10px] text-violet-800 mt-0.5">
                    {order?.status === 'ordered' && 'The order has been placed. Please collect the sample to proceed.'}
                    {order?.status === 'sample_collected' && 'Sample collected. Move the sample into laboratory testing.'}
                    {['processing', 'in_processing'].includes(order?.status) && 'Laboratory testing in progress. Complete processing to unlock results entry.'}
                    {order?.status === 'results_entry' && (overallProgress.isAllComplete ? 'All parameter results entered. Submit results for review.' : `${overallProgress.completed} of ${overallProgress.total} parameters completed. Enter remaining parameters.`)}
                    {order?.status === 'ready_for_review' && 'All results entered. Authorized staff can finalize and publish report.'}
                    {order?.status === 'completed' && 'The official laboratory report is published and available.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                {['ordered', 'confirmed', 'scheduled', 'sample_collection_pending'].includes(order?.status) && (
                  isCollectionEligible ? (
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => setIsCollectModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-200 transition cursor-pointer"
                      id="banner-collect-sample-btn"
                    >
                      <span>✓</span>
                      <span>{isSubmittingTransition ? 'Saving...' : 'Mark Collected'}</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Payment Required</span>
                    </div>
                  )
                )}

                {order?.status === 'sample_collected' && (
                  <button
                    type="button"
                    disabled={isSubmittingTransition}
                    onClick={() => setIsProcessingModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-200 transition cursor-pointer"
                    id="banner-start-processing-btn"
                  >
                    <span>⚙️</span>
                    <span>{isSubmittingTransition ? 'Starting...' : 'Start Processing'}</span>
                  </button>
                )}

                {['processing', 'in_processing', 'in_analysis'].includes(order?.status) && (
                  <button
                    type="button"
                    disabled={isSubmittingTransition}
                    onClick={() => setIsCompleteProcessingModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-200 transition cursor-pointer"
                    id="banner-complete-processing-btn"
                  >
                    <span>✓</span>
                    <span>{isSubmittingTransition ? 'Completing...' : 'Complete Processing'}</span>
                  </button>
                )}

                {order?.status === 'results_entry' && (
                  overallProgress.isAllComplete ? (
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => setIsReadyForReviewModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-200 transition cursor-pointer"
                      id="banner-mark-review-btn"
                    >
                      <span>✓</span>
                      <span>{isSubmittingTransition ? 'Submitting...' : 'Mark Ready for Review'}</span>
                    </button>
                  ) : (
                    <Link
                      to={`/labs/orders/${order?._id}/results`}
                      className="w-full sm:w-auto px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-violet-200 transition cursor-pointer"
                      id="banner-enter-results-btn"
                    >
                      <span>✏️</span>
                      <span>Enter Results</span>
                    </Link>
                  )
                )}

                {order?.status === 'ready_for_review' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => setIsReturnModalOpen(true)}
                      className="w-full sm:w-auto px-3.5 py-2 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      id="banner-return-correction-btn"
                    >
                      <span>↩</span>
                      <span>Return for Correction</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => setIsFinalizeModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 transition cursor-pointer"
                      id="banner-finalize-btn"
                    >
                      <span>✓</span>
                      <span>Approve & Finalize</span>
                    </button>
                  </div>
                )}

                {order?.status === 'completed' && (
                  <Link
                    to={`/labs/orders/${order?._id}/reports`}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 transition cursor-pointer"
                    id="banner-view-report-btn"
                  >
                    <span>📄</span>
                    <span>View Report</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-stone-200 flex items-center gap-4 text-xs font-bold pt-1 overflow-x-auto no-scrollbar">
              {[
                { key: 'tests', label: 'Tests & Results', icon: '🧪' },
                { key: 'sample', label: 'Sample Information', icon: '📋' },
                { key: 'patient', label: 'Patient Details', icon: '👤' },
                { key: 'files', label: `Attached Files (${attachedReports.length})`, icon: '📎' },
                { key: 'activity', label: 'Activity Log', icon: '⏱️' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 pb-2 transition cursor-pointer whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-b-2 border-violet-600 text-violet-700'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Independently Scrollable Details Body in Column 2 */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5 [scrollbar-width:thin]">
            
            {/* TAB 1: Tests & Results */}
            {activeTab === 'tests' && (
              <div className="space-y-4">
                {/* Ordered Investigations List */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 mb-2.5">
                    Ordered Investigations ({order?.tests?.length || 0})
                  </h3>

                  <div className="space-y-3">
                    {(order?.tests || []).map((test, index) => {
                      const group = (resultsData.groups || []).find(
                        (g) => g.testCode === test.code || g.testName === test.name
                      ) || { results: [] };

                      const testTotal = group.results?.length || (test.code === 'CBC' ? 8 : 1);
                      const testCompleted = (group.results || []).filter((r) => ['entered', 'not_applicable'].includes(r.status)).length;
                      const testPct = testTotal > 0 ? Math.round((testCompleted / testTotal) * 100) : 0;

                      return (
                        <div
                          key={test._id || `${test.code}-${index}`}
                          className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold text-sm shrink-0">
                                🩸
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-extrabold text-stone-900">{test.name}</h4>
                                  {test.code && (
                                    <span className="rounded bg-stone-100 px-1 py-0.2 text-[9px] font-mono text-stone-600 font-bold">
                                      {test.code}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-stone-500 mt-0.5">
                                  {testTotal} parameters • Specimen: {test.specimenType || 'Whole Blood (EDTA)'}
                                </p>
                              </div>
                            </div>

                            <Badge tone={getStatusTone(order?.status)}>
                              {getStatusDisplayLabel(order?.status)}
                            </Badge>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    order?.status === 'completed'
                                      ? 'bg-emerald-500'
                                      : 'bg-violet-600'
                                  }`}
                                  style={{ width: `${order?.status === 'ordered' ? 0 : order?.status === 'completed' ? 100 : testPct}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-stone-600 shrink-0">
                              {order?.status === 'ordered' ? 0 : testCompleted} / {testTotal} parameters
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Test Information Card */}
                <article className="rounded-2xl border border-stone-200/90 bg-stone-50/50 p-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2.5 flex items-center gap-1.5">
                    <span>📄</span>
                    <span>Test Information & Specs</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs">
                    <div>
                      <span className="text-stone-400 text-[10px] block">Test Name</span>
                      <div className="font-bold text-stone-900 mt-0.5">{primaryTestName}</div>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block">Total Parameters</span>
                      <div className="font-bold text-stone-900 mt-0.5">{resultsData.totalParams || (primaryTestName.includes('CBC') ? 8 : 1)}</div>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block">Specimen Type</span>
                      <div className="font-bold text-stone-900 mt-0.5">{sampleTypeDisplay}</div>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block">Turnaround Time</span>
                      <div className="font-bold text-stone-900 mt-0.5">Same day</div>
                    </div>
                  </div>
                </article>

                {/* Clinical Notes Card */}
                <article className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <span>📝</span>
                      <span>Order Notes</span>
                    </h4>
                    {!isAddingNote && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNote(true)}
                        className="text-xs font-bold text-violet-600 hover:underline cursor-pointer"
                      >
                        + Add Note
                      </button>
                    )}
                  </div>

                  {isAddingNote ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Add special instructions or collection notes..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 p-2 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setIsAddingNote(false); setNewNoteText(''); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOrderNotes(newNoteText);
                            setIsAddingNote(false);
                          }}
                          className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : orderNotes ? (
                    <p className="text-xs text-stone-800 bg-stone-50 p-2.5 rounded-xl border border-stone-100">{orderNotes}</p>
                  ) : (
                    <div className="py-2 text-center text-xs text-stone-400">
                      No special notes for this order.
                    </div>
                  )}
                </article>
              </div>
            )}

            {/* TAB 2: Sample Information */}
            {activeTab === 'sample' && (
              <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="text-sm font-bold text-stone-900">Specimen & Sample Information</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                    <span className="text-stone-400 text-[10px] block">Sample ID Barcode</span>
                    <div className="font-mono font-extrabold text-xs text-stone-900 mt-0.5">{sampleIdDisplay}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                    <span className="text-stone-400 text-[10px] block">Specimen Type & Container</span>
                    <div className="font-bold text-xs text-stone-900 mt-0.5">{sampleTypeDisplay}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                    <span className="text-stone-400 text-[10px] block">Collection Location</span>
                    <div className="font-bold text-xs text-stone-900 mt-0.5">{order?.collectionMethod === 'HOME_COLLECTION' ? 'Home Collection' : 'At Laboratory Desk'}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                    <span className="text-stone-400 text-[10px] block">Collection Timestamp</span>
                    <div className="font-bold text-xs text-stone-900 mt-0.5">{sampleCollectedOnDisplay}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                    <span className="text-stone-400 text-[10px] block">Collected By</span>
                    <div className="font-bold text-xs text-stone-900 mt-0.5">{sampleCollectedByDisplay}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                    <span className="text-stone-400 text-[10px] block">Current Status</span>
                    <div className="font-bold text-xs text-emerald-800 mt-0.5">{order?.status === 'ordered' ? 'Awaiting Collection' : 'Collected & Processed'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Patient Details */}
            {activeTab === 'patient' && (
              <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="text-sm font-bold text-stone-900">Patient Demographic Profile</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-stone-400 text-[10px] block">Full Name</span>
                    <div className="font-bold text-stone-900 mt-0.5">{order?.patientId?.fullName || order?.guestPatient?.fullName || 'Patient Alpha'}</div>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">UHID / Patient ID</span>
                    <div className="font-mono font-bold text-stone-900 mt-0.5">{order?.patientId?.patientId || 'PAT-20260905-0010'}</div>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Age & Gender</span>
                    <div className="font-bold text-stone-900 mt-0.5">{order?.patientId?.age || 28} yrs, {order?.patientId?.gender || 'Other'}</div>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Phone Number</span>
                    <div className="font-bold text-stone-900 mt-0.5">{order?.patientId?.phone || order?.guestPatient?.phone || '+91 98765 43210'}</div>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Referring Doctor</span>
                    <div className="font-bold text-stone-900 mt-0.5">{order?.doctorId?.fullName || 'Self / Direct Walk-in'}</div>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Address</span>
                    <div className="font-bold text-stone-900 mt-0.5">{order?.patientId?.address || 'Indirapuram, Ghaziabad'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Attached Files */}
            {activeTab === 'files' && (
              <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">Diagnostic Reports & Deliverables</h3>
                  <label className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold cursor-pointer transition">
                    + Upload File
                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                  </label>
                </div>

                <div className="space-y-2.5">
                  {attachedReports.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-xl border border-stone-200 p-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white font-bold text-[10px]">
                          PDF
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">{doc.fileName}</div>
                          <div className="text-[11px] text-stone-500">{doc.fileSize} • Uploaded on {doc.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {doc.type}
                        </span>
                        {doc.url && doc.url !== '#' && (
                          <Link
                            to={doc.url}
                            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
                          >
                            Open Report
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}

                  {attachedReports.length === 0 && (
                    <div className="py-6 text-center text-xs text-stone-400">
                      No files attached yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: Activity Log */}
            {activeTab === 'activity' && (
              <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="text-sm font-bold text-stone-900">Order Activity & Audit Log</h3>
                
                <div className="space-y-3.5 border-l-2 border-violet-200 pl-3.5">
                  {order?.timeline && order.timeline.length > 0 ? (
                    order.timeline.map((entry, idx) => (
                      <div key={entry._id || idx} className="relative">
                        <div className="font-bold text-stone-900">
                          {entry.performedByName || 'Staff'} • <span className="capitalize">{entry.oldStatus?.replaceAll('_', ' ') || 'Ordered'} → {entry.newStatus?.replaceAll('_', ' ') || 'Sample Collected'}</span>
                        </div>
                        <div className="text-stone-500 text-[11px]">
                          {new Date(entry.performedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {entry.notes ? ` • ${entry.notes}` : ''}
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="relative">
                        <div className="font-bold text-stone-900">Order Placed & Registered</div>
                        <div className="text-stone-500">{(order?.orderedAt || order?.createdAt || '').slice(0, 10)} • Payment Received</div>
                      </div>
                      {order?.sampleCollectedAt && (
                        <div className="relative">
                          <div className="font-bold text-stone-900">{order?.sampleCollectedByName || 'Lab Technician'} • Ordered → Sample Collected</div>
                          <div className="text-stone-500">{new Date(order.sampleCollectedAt).toLocaleString('en-GB')}</div>
                        </div>
                      )}
                      {order?.processingStartedAt && (
                        <div className="relative">
                          <div className="font-bold text-stone-900">{order?.processingStartedByName || 'Lab Technician'} • Sample Collected → Processing</div>
                          <div className="text-stone-500">{new Date(order.processingStartedAt).toLocaleString('en-GB')}</div>
                        </div>
                      )}
                      {order?.finalizedAt && (
                        <div className="relative">
                          <div className="font-bold text-emerald-800">{order?.finalizedByName || 'Reviewer'} • Order Finalized & Report Published</div>
                          <div className="text-stone-500">{new Date(order.finalizedAt).toLocaleString('en-GB')}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* COLUMN 3: Sample & Quick Actions (Right - 3 cols)         */}
        {/* ========================================================= */}
        <aside className="lg:col-span-3 xl:col-span-3 h-full flex flex-col rounded-3xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden min-h-0">
          
          {/* Header */}
          <div className="p-3.5 border-b border-stone-100 bg-white shrink-0 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-stone-900 tracking-tight flex items-center gap-1.5">
              <span className="text-violet-600">🧪</span>
              <span>Sample & Actions</span>
            </h3>
            <Badge tone={order?.status === 'ordered' ? 'neutral' : 'success'}>
              {order?.status === 'ordered' ? '● Pending' : '✓ Collected'}
            </Badge>
          </div>

          {/* Independently Scrollable Right Panel Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 space-y-3.5 [scrollbar-width:thin]">
            
            {/* Sample Collection Status Card */}
            <article className="rounded-2xl border border-stone-200/90 bg-stone-50/60 p-3.5 space-y-2.5">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 flex items-center justify-between">
                <span>Sample Collection</span>
              </h4>

              <div className="space-y-2 text-xs divide-y divide-stone-100">
                <div className="pt-0.5 flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Sample ID</span>
                  <span className="font-mono font-bold text-stone-800">{sampleIdDisplay}</span>
                </div>
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Sample Type</span>
                  <span className="font-bold text-stone-800 text-[11px]">{order?.status === 'ordered' ? '—' : sampleTypeDisplay}</span>
                </div>
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Collected On</span>
                  <span className="font-semibold text-stone-800 text-[11px]">{sampleCollectedOnDisplay}</span>
                </div>
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Collected By</span>
                  <span className="font-semibold text-stone-800 text-[11px]">{sampleCollectedByDisplay}</span>
                </div>
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Status</span>
                  <span className="font-bold text-stone-800 text-[11px]">
                    {order?.status === 'ordered' ? 'Pending collection' : 'Physically Collected'}
                  </span>
                </div>
              </div>
            </article>

            {/* Quick Actions Card */}
            <article className="rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-2xs space-y-2.5">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <span className="text-violet-600">⚡</span>
                <span>Quick Actions</span>
              </h4>

              <div className="space-y-2">
                {/* Action 1: Mark Sample Collected */}
                {['ordered', 'confirmed', 'scheduled', 'sample_collection_pending'].includes(order?.status) ? (
                  isCollectionEligible ? (
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => setIsCollectModalOpen(true)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-violet-600 text-white shadow-md shadow-violet-200 hover:bg-violet-700 cursor-pointer transition transform active:scale-98"
                      id="action-collect-sample-btn"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>✓</span>
                        <span>{isSubmittingTransition ? 'Saving...' : 'Mark Sample Collected'}</span>
                      </span>
                      <span>→</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>Payment Required</span>
                        </span>
                        <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded font-black text-amber-950">UNPAID</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Settlement required before specimen collection can proceed.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Sample Collected</span>
                    </span>
                    <span className="text-[10px] font-mono font-black">{order?.sampleId || 'Done'}</span>
                  </div>
                )}

                {/* Action 2: Start Processing */}
                {order?.status === 'sample_collected' ? (
                  <button
                    type="button"
                    disabled={isSubmittingTransition}
                    onClick={() => setIsProcessingModalOpen(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-violet-600 text-white shadow-md shadow-violet-200 hover:bg-violet-700 cursor-pointer transition transform active:scale-98"
                    id="action-start-processing-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>{isSubmittingTransition ? 'Starting...' : 'Start Processing'}</span>
                    </span>
                    <span>→</span>
                  </button>
                ) : ['processing', 'in_processing', 'in_analysis', 'results_entry', 'ready_for_review', 'completed'].includes(order?.status) ? (
                  <div className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Processing Initiated</span>
                    </span>
                    <span className="text-[10px] font-bold">Done</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed"
                    id="action-start-processing-locked-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Start Processing (Locked)</span>
                    </span>
                    <span>🔒</span>
                  </button>
                )}

                {/* Action 3: Complete Processing (when processing) */}
                {['processing', 'in_processing', 'in_analysis'].includes(order?.status) && (
                  <button
                    type="button"
                    disabled={isSubmittingTransition}
                    onClick={() => setIsCompleteProcessingModalOpen(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-violet-600 text-white shadow-md shadow-violet-200 hover:bg-violet-700 cursor-pointer transition transform active:scale-98"
                    id="action-complete-processing-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>✓</span>
                      <span>{isSubmittingTransition ? 'Completing...' : 'Mark Processing Complete'}</span>
                    </span>
                    <span>→</span>
                  </button>
                )}

                {/* Action 4: Enter Results */}
                {['results_entry', 'ready_for_review', 'completed'].includes(order?.status) ? (
                  <Link
                    to={`/labs/orders/${order?._id}/results`}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition ${
                      order?.status === 'results_entry'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200 hover:bg-violet-700 cursor-pointer'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer'
                    }`}
                    id="action-enter-results-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>✏️</span>
                      <span>{order?.status === 'results_entry' ? 'Enter Results' : 'View / Edit Results'}</span>
                    </span>
                    <span>→</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed"
                    id="action-enter-results-locked-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Enter Results (Locked)</span>
                    </span>
                    <span>🔒</span>
                  </button>
                )}

                {/* Action 5: Mark Ready for Review */}
                {order?.status === 'results_entry' ? (
                  <button
                    type="button"
                    disabled={isSubmittingTransition}
                    onClick={() => setIsReadyForReviewModalOpen(true)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      overallProgress.isAllComplete
                        ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                    id="action-mark-review-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>📋</span>
                      <span>{isSubmittingTransition ? 'Submitting...' : 'Mark Ready for Review'}</span>
                    </span>
                    <span>→</span>
                  </button>
                ) : ['ready_for_review', 'completed'].includes(order?.status) ? (
                  <div className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Results Reviewed</span>
                    </span>
                    <span className="text-[10px] font-bold">Done</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed"
                    id="action-mark-review-locked-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Mark Ready for Review (Locked)</span>
                    </span>
                    <span>🔒</span>
                  </button>
                )}

                {/* Action 6: Finalize & Complete */}
                {order?.status === 'ready_for_review' ? (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => setIsFinalizeModalOpen(true)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 cursor-pointer transition transform active:scale-98"
                      id="action-finalize-btn"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>✓</span>
                        <span>Approve & Finalize Order</span>
                      </span>
                      <span>→</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmittingTransition}
                      onClick={() => setIsReturnModalOpen(true)}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100 cursor-pointer transition"
                      id="action-return-btn"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>↩</span>
                        <span>Return for Correction</span>
                      </span>
                      <span>→</span>
                    </button>
                  </div>
                ) : order?.status === 'completed' ? (
                  <div className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Order Completed & Verified</span>
                    </span>
                    <span className="text-[10px] font-bold">Final</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed"
                    id="action-finalize-locked-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Finalize & Complete (Locked)</span>
                    </span>
                    <span>🔒</span>
                  </button>
                )}

                {/* Action 7: View Official Report (if completed) */}
                {order?.status === 'completed' && (
                  <Link
                    to={`/labs/orders/${order?._id}/reports`}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition cursor-pointer"
                    id="action-view-report-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>📄</span>
                      <span>View Official Report</span>
                    </span>
                    <span>→</span>
                  </Link>
                )}
              </div>
            </article>

            {/* Need Help Card */}
            <article className="rounded-2xl bg-sky-50/70 border border-sky-200/80 p-3 text-xs text-sky-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <span>ℹ️</span>
                <span>Need Assistance?</span>
              </div>
              <p className="text-[11px] text-sky-800">
                Contact the lab manager or lead pathologist for any query regarding specimens or results.
              </p>
              <button
                type="button"
                onClick={() => alert('Contacting Lab Manager on duty...')}
                className="w-full py-1.5 bg-white border border-sky-200 text-sky-800 font-bold rounded-xl text-xs shadow-2xs hover:bg-sky-50 cursor-pointer"
              >
                🎧 Contact Manager
              </button>
            </article>
          </div>
        </aside>

      </div>

      {/* ========================================================= */}
      {/* MODAL 0: CREATE LAB ORDER MODAL                           */}
      {/* ========================================================= */}
      <CreateLabOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOrderCreated={(newOrder) => {
          loadOrdersList(newOrder._id);
          if (newOrder._id) {
            navigate(`/labs/orders/${newOrder._id}`);
          }
        }}
      />

      {/* ========================================================= */}
      {/* MODAL 1: Mark Sample Collected Confirmation               */}
      {/* ========================================================= */}
      {isCollectModalOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 text-lg">
                🧪
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Mark Sample Collected</h3>
                <p className="text-xs text-stone-500">Physical specimen collection confirmation</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Order:</span>
                <span className="font-mono font-bold text-stone-900">{order?.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Patient:</span>
                <span className="font-bold text-stone-900">{order?.patientId?.fullName || order?.guestPatient?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Test:</span>
                <span className="font-bold text-stone-900">{primaryTestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Specimen:</span>
                <span className="font-bold text-stone-900">{sampleTypeDisplay}</span>
              </div>
            </div>

            <p className="text-xs text-stone-600">
              Confirm that the specimen has been physically collected from the patient and labeled?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCollectModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingTransition}
                onClick={handleConfirmSampleCollected}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-200"
              >
                {isSubmittingTransition ? 'Saving...' : 'Confirm Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: Start Laboratory Processing                      */}
      {/* ========================================================= */}
      {isProcessingModalOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 text-lg">
                ⚙️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Start Laboratory Processing?</h3>
                <p className="text-xs text-stone-500">Initiate diagnostic laboratory testing</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Sample:</span>
                <span className="font-mono font-bold text-stone-900">{sampleIdDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Test:</span>
                <span className="font-bold text-stone-900">{primaryTestName}</span>
              </div>
            </div>

            <p className="text-xs text-stone-600">
              This will mark the investigation as being processed by the laboratory.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsProcessingModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingTransition}
                onClick={handleConfirmStartProcessing}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-200"
              >
                {isSubmittingTransition ? 'Starting...' : 'Start Processing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Mark Processing Complete                         */}
      {/* ========================================================= */}
      {isCompleteProcessingModalOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-lg">
                ✓
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Complete Laboratory Processing?</h3>
                <p className="text-xs text-stone-500">Unlocks Results Entry for this order</p>
              </div>
            </div>

            <p className="text-xs text-stone-600">
              Testing on specimen <strong className="font-mono text-stone-900">{sampleIdDisplay}</strong> will be marked complete. This will unlock the parameter input workspace for the technician.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCompleteProcessingModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingTransition}
                onClick={handleConfirmCompleteProcessing}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-200"
              >
                {isSubmittingTransition ? 'Updating...' : 'Confirm & Unlock Results Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: Mark Ready for Review Confirmation               */}
      {/* ========================================================= */}
      {isReadyForReviewModalOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-lg">
                📋
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Mark Results Ready for Review?</h3>
                <p className="text-xs text-stone-500">Submit entered results for final review</p>
              </div>
            </div>

            <p className="text-xs text-stone-600">
              All <strong className="text-stone-900 font-bold">{overallProgress.total} required parameters</strong> have been entered. The results will be submitted to the authorized doctor/reviewer for final sign-off.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReadyForReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingTransition}
                onClick={handleConfirmReadyForReview}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-200"
              >
                {isSubmittingTransition ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: Missing Parameters Validation Alert              */}
      {/* ========================================================= */}
      {missingParamsAlert && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-rose-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 text-lg font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-rose-900">Cannot Proceed</h3>
                <p className="text-xs text-rose-600 font-medium">Required result parameters are missing</p>
              </div>
            </div>

            <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-100 space-y-2 text-xs">
              <p className="font-bold text-rose-900">Missing results for:</p>
              <ul className="list-disc pl-5 space-y-1 text-rose-800">
                {missingParamsAlert.map((param, i) => (
                  <li key={i}>{param}</li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMissingParamsAlert(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Dismiss
              </button>
              <Link
                to={`/labs/orders/${order?._id}/results`}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-200"
              >
                Go to Missing Results →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5B: Return for Correction Modal                     */}
      {/* ========================================================= */}
      {isReturnModalOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-amber-200 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-lg font-bold">
                ↩
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Return Results for Correction?</h3>
                <p className="text-xs text-stone-500">Order: {order?.orderNumber}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Correction Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Please explain what needs to be corrected by the technician..."
                value={returnCorrectionReason}
                onChange={(e) => setReturnCorrectionReason(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 p-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition shadow-2xs"
              />
            </div>

            <p className="text-[11px] text-stone-500">
              The order status will transition back to <strong>RESULTS_ENTRY</strong> and technician editing will be unlocked.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingTransition || returnCorrectionReason.trim().length < 5}
                onClick={handleConfirmReturnForCorrection}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-200 disabled:bg-stone-300 disabled:shadow-none cursor-pointer"
                id="confirm-return-order-btn"
              >
                {isSubmittingTransition ? 'Returning...' : 'Return for Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: Finalize & Complete Order (Review Modal)         */}
      {/* ========================================================= */}
      <LabOrderFinalizationModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        orderId={order?._id}
        orderNumber={order?.orderNumber}
        onFinalized={() => {
          loadActiveOrder();
          loadOrdersList();
        }}
        onOpenTestResultEntry={(testName) => {
          navigate(`/labs/orders/${order?._id}/results?testCode=${encodeURIComponent(testName)}`);
        }}
      />

      {/* Amend Dialog */}
      {showAmendDialog && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="w-full max-w-md max-h-[calc(100vh-5.5rem)] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 overflow-y-auto">
            <h3 className="text-base font-bold text-stone-900 mb-2">Amend Completed Lab Order</h3>
            <p className="text-xs text-stone-600 mb-4">
              This will unlock all diagnostic results for editing and record an audit log with your reason.
            </p>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Amendment Reason (Mandatory)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Doctor requested re-test of platelet count..."
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
      )}
    </div>
  );
};

export default LabOrderDetailPage;
