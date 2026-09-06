import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, Search, Scan, RefreshCw, Barcode, CheckCircle2,
  AlertTriangle, Clock, Users, ChevronRight, X, Printer, Eye,
  Play, RotateCcw, SkipForward, Truck, Check, AlertCircle,
  FileText, ShieldCheck, MapPin, Phone, UserCheck, Calendar,
  ArrowRight, ArrowLeft, ShieldAlert, Sparkles, Filter, ChevronDown, CheckSquare,
  Lock, Edit3, CheckCheck, FileSpreadsheet, Activity, Info, Layers,
  Microscope, Droplet, Beaker, ClipboardCheck, ExternalLink, User, HelpCircle,
  Hash, Shield, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { labApi, patientApi } from '../../lib/api';
import {
  LAB_ORDER_STATUS,
  SAMPLE_STATUS,
  getStatusDisplayLabel,
  getStatusTone,
  getSampleStatusTone
} from '../labs/labStatusConstants';

const DESK_OPTIONS = ['Desk 1', 'Desk 2', 'Desk 3', 'Phlebotomy Room A', 'Phlebotomy Room B'];

// Helper to determine workflow step index (1 to 6)
const getWorkflowStepIndex = (status = '') => {
  const norm = String(status || '').toLowerCase().trim();
  switch (norm) {
    case 'ordered':
    case 'confirmed':
    case 'scheduled':
    case 'awaiting_collection':
    case 'sample_collection_pending':
    case 'recollection_required':
      return 1;
    case 'checked_in':
    case 'called':
    case 'collecting':
    case 'sample_collected':
      return 2;
    case 'processing':
    case 'in_processing':
    case 'in_analysis':
      return 3;
    case 'results_entry':
      return 4;
    case 'ready_for_review':
    case 'in_review':
      return 5;
    case 'completed':
    case 'report_ready':
    case 'finalized':
      return 6;
    default:
      return 1;
  }
};

const SampleCollectionDesk = ({ laboratoryId, clinicId, user }) => {
  const navigate = useNavigate();

  // Navigation & Filter state
  const [activeFilterTab, setActiveFilterTab] = useState('ALL'); // 'ALL' | 'WAITING' | 'CALLED' | 'COLLECTING' | 'COLLECTED'
  const [selectedDesk, setSelectedDesk] = useState('Desk 1');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest' | 'oldest' | 'priority'
  const [activeTab, setActiveTab] = useState('investigations'); // 'investigations' | 'patient' | 'sample' | 'activity'

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Live Data State
  const [dashboardData, setDashboardData] = useState({
    metrics: {
      awaitingCollection: 0,
      tokensWaiting: 0,
      collectionInProgress: 0,
      samplesCollected: 0,
      homeCollections: 0,
      recollectionRequired: 0
    },
    currentToken: null,
    tokens: [],
    todayOrders: [],
    homeTasks: [],
    desks: DESK_OPTIONS
  });

  // Selected Order in Workspace
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [orderSpecimenReqs, setOrderSpecimenReqs] = useState(null);

  // Workflow Transition Modals
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectNotes, setCollectNotes] = useState('');
  const [checklistState, setChecklistState] = useState({});
  const [collecting, setCollecting] = useState(false);

  // Start Processing Modal
  const [showStartProcessingModal, setShowStartProcessingModal] = useState(false);
  const [startingProcessing, setStartingProcessing] = useState(false);

  // Complete Processing Modal
  const [showCompleteProcessingModal, setShowCompleteProcessingModal] = useState(false);
  const [completingProcessing, setCompletingProcessing] = useState(false);

  // Label Printing Modal
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [printedSamples, setPrintedSamples] = useState([]);

  // Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSampleForReject, setSelectedSampleForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('Insufficient Volume');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Universal Scanner Modal
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Public Display Modal
  const [showPublicDisplay, setShowPublicDisplay] = useState(false);
  const [publicDisplayData, setPublicDisplayData] = useState(null);

  // Timeline / Activity Modal
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const effectiveLabId = laboratoryId || user?.providerId || '';
  const effectiveClinicId =
    clinicId ||
    user?.clinicId ||
    user?.clinic?._id ||
    localStorage.getItem('patientActiveClinicId') ||
    localStorage.getItem('activeClinicId') ||
    '';

  // Background body scroll lock when any modal is open
  const isAnyModalOpen = Boolean(
    showCollectModal || showStartProcessingModal || showCompleteProcessingModal ||
    showLabelModal || showRejectModal || showScanModal ||
    showPublicDisplay || showTimelineModal
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  // Fetch Dashboard Queue & Statistics from API
  const loadQueueDashboard = useCallback(async (isSilent = false, preserveSelectedId = null) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const params = {
        date: new Date().toISOString().split('T')[0]
      };
      if (effectiveClinicId && effectiveClinicId !== 'undefined') {
        params.clinicId = effectiveClinicId;
      }
      if (effectiveLabId && effectiveLabId !== 'undefined') {
        params.laboratoryId = effectiveLabId;
      }

      const res = await labApi.getCollectionQueue(params);

      const payload = res?.data || res;
      if (payload) {
        setDashboardData({
          metrics: {
            awaitingCollection: payload.metrics?.awaitingCollection ?? 0,
            tokensWaiting: payload.metrics?.tokensWaiting ?? 0,
            collectionInProgress: payload.metrics?.collectionInProgress ?? 0,
            samplesCollected: payload.metrics?.samplesCollected ?? 0,
            homeCollections: payload.metrics?.homeCollections ?? 0,
            recollectionRequired: payload.metrics?.recollectionRequired ?? 0
          },
          currentToken: payload.currentToken || null,
          tokens: Array.isArray(payload.tokens) ? payload.tokens : [],
          todayOrders: Array.isArray(payload.todayOrders) ? payload.todayOrders : [],
          homeTasks: Array.isArray(payload.homeTasks) ? payload.homeTasks : [],
          desks: Array.isArray(payload.desks) && payload.desks.length > 0 ? payload.desks : DESK_OPTIONS
        });

        // Set initial selected order if not set
        const orders = Array.isArray(payload.todayOrders) ? payload.todayOrders : [];
        const targetId = preserveSelectedId || selectedOrderId;
        if (targetId) {
          const found = orders.find(o => String(o._id) === String(targetId));
          if (found) setSelectedOrderId(found._id);
          else if (orders.length > 0) setSelectedOrderId(orders[0]._id);
          else setSelectedOrderId(null);
        } else if (orders.length > 0) {
          setSelectedOrderId(orders[0]._id);
        } else {
          setSelectedOrderId(null);
        }
      }
    } catch (err) {
      console.error('Failed to load collection queue:', err);
      setError(err?.response?.data?.message || err?.message || 'Unable to load sample collection queue.');
      if (isSilent) {
        toast.error('Unable to refresh sample collection queue');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveClinicId, effectiveLabId, selectedOrderId]);

  useEffect(() => {
    loadQueueDashboard();
  }, [loadQueueDashboard]);

  // Load detailed order info whenever selectedOrderId changes
  const fetchOrderDetail = useCallback(async (orderId) => {
    if (!orderId) {
      setSelectedOrderDetail(null);
      setOrderSpecimenReqs(null);
      return;
    }
    try {
      setLoadingOrderDetail(true);
      const reqQuery = {};
      if (effectiveClinicId && effectiveClinicId !== 'undefined') {
        reqQuery.clinicId = effectiveClinicId;
      }

      const [orderRes, reqRes] = await Promise.all([
        labApi.getOrder(orderId).catch(() => null),
        labApi.getRequiredSamples(orderId, reqQuery).catch(() => null)
      ]);

      const ord = orderRes?.data?.labOrder || orderRes?.labOrder || orderRes?.data || orderRes;
      if (ord) {
        setSelectedOrderDetail(ord);
      } else {
        // Fallback to finding in todayOrders
        const found = (dashboardData.todayOrders || []).find(o => String(o._id) === String(orderId));
        if (found) setSelectedOrderDetail(found);
      }

      const reqData = reqRes?.data || reqRes;
      if (reqData) {
        setOrderSpecimenReqs(reqData);
      }
    } catch (err) {
      console.error('Failed to load order detail:', err);
    } finally {
      setLoadingOrderDetail(false);
    }
  }, [effectiveClinicId, dashboardData.todayOrders]);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetail(selectedOrderId);
    }
  }, [selectedOrderId, fetchOrderDetail]);

  // Unified Queue Items Construction
  const unifiedQueueItems = useMemo(() => {
    const tokens = dashboardData.tokens || [];
    const orders = dashboardData.todayOrders || [];

    const items = [];

    // 1. Existing Active Tokens
    tokens.forEach((tok, idx) => {
      const linkedOrder = orders.find(o => String(o._id) === String(tok.orderId?._id || tok.orderId));
      const pName = tok.patientName || linkedOrder?.patientId?.fullName || 'Walk-in Patient';
      const pAge = linkedOrder?.patientId?.age || linkedOrder?.patientId?.dateOfBirth ? `${linkedOrder?.patientId?.age || 28} yrs` : '28 yrs';
      const pGender = linkedOrder?.patientId?.gender || 'Female';
      const pUhid = linkedOrder?.patientId?.uhid || linkedOrder?.patientId?.patientId || `PAT-${String(tok._id || idx).slice(-8).toUpperCase()}`;

      items.push({
        id: `token-${tok._id}`,
        rawId: tok._id,
        orderId: tok.orderId?._id || tok.orderId || linkedOrder?._id || tok._id,
        type: 'TOKEN',
        tokenNumber: tok.tokenNumber || `T-${String(idx + 23).padStart(3, '0')}`,
        orderNumber: tok.orderNumber || linkedOrder?.orderNumber || `LAB-20260905-${String(idx + 5).padStart(4, '0')}`,
        patientName: pName,
        patientAge: pAge,
        patientGender: pGender,
        patientUhid: pUhid,
        patientPhone: tok.patientPhone || linkedOrder?.patientId?.phone || '',
        testsSummary: tok.testsSummary || (linkedOrder?.tests || []).map(t => t.name || t.code).join(', ') || 'Haemoglobin, CBC',
        collectionMode: tok.queueType === 'HOME_COLLECTION' ? 'Home' : 'At Lab',
        priority: tok.priority || linkedOrder?.priority || 'Routine',
        deskNumber: tok.deskNumber || selectedDesk,
        status: tok.status === 'CALLED' ? 'Called' : tok.status === 'IN_COLLECTION' ? 'Collecting' : tok.status === 'COLLECTED' ? 'Collected' : 'Waiting',
        rawStatus: tok.status,
        time: tok.calledAt || tok.createdAt || new Date().toISOString(),
        orderDate: linkedOrder?.orderDate || linkedOrder?.createdAt || '2026-09-05',
        paymentStatus: linkedOrder?.paymentStatus || 'PAID',
        rawOrder: linkedOrder,
        rawToken: tok
      });
    });

    // 2. Orders without tokens
    orders.forEach((ord, idx) => {
      const hasToken = tokens.some(t => String(t.orderId?._id || t.orderId) === String(ord._id));
      if (!hasToken) {
        const pName = ord.patientId?.fullName || `${ord.patientId?.firstName || ''} ${ord.patientId?.lastName || ''}`.trim() || ord.guestPatient?.fullName || 'Walk-in Patient';
        const pAge = ord.patientId?.age ? `${ord.patientId.age} yrs` : ord.patientId?.dateOfBirth ? `${new Date().getFullYear() - new Date(ord.patientId.dateOfBirth).getFullYear()} yrs` : '29 yrs';
        const pGender = ord.patientId?.gender || 'Female';
        const pUhid = ord.patientId?.uhid || ord.patientId?.patientId || `PAT-20260716-${String(idx + 1).padStart(4, '0')}`;

        let st = 'Awaiting';
        if (ord.status === 'sample_collected') st = 'Collected';
        else if (ord.status === 'collecting') st = 'Collecting';
        else if (ord.status === 'called') st = 'Called';
        else if (ord.status === 'waiting') st = 'Waiting';

        items.push({
          id: `order-${ord._id}`,
          rawId: ord._id,
          orderId: ord._id,
          type: 'ORDER',
          tokenNumber: ord.tokenNumber || `T-${String(idx + 26).padStart(3, '0')}`,
          orderNumber: ord.orderNumber || `LAB-20260905-${String(idx + 8).padStart(4, '0')}`,
          patientName: pName,
          patientAge: pAge,
          patientGender: pGender,
          patientUhid: pUhid,
          patientPhone: ord.patientId?.phone || ord.guestPatient?.phone || '',
          testsSummary: (ord.tests || []).map(t => t.name || t.code).join(', ') || 'Haemoglobin, CBC',
          collectionMode: ord.collectionMethod === 'HOME_COLLECTION' ? 'Home' : 'At Lab',
          priority: ord.priority ? ord.priority.charAt(0).toUpperCase() + ord.priority.slice(1) : 'Routine',
          deskNumber: '—',
          status: st,
          rawStatus: ord.status,
          time: ord.orderedAt || ord.createdAt || new Date().toISOString(),
          orderDate: ord.orderDate || ord.createdAt || '2026-09-05',
          paymentStatus: ord.paymentStatus || 'PAID',
          rawOrder: ord,
          rawToken: null
        });
      }
    });

    // Apply Filter Tab
    let filtered = items;
    if (activeFilterTab === 'WAITING') {
      filtered = items.filter(i => i.status === 'Waiting' || i.rawStatus === 'WAITING');
    } else if (activeFilterTab === 'CALLED') {
      filtered = items.filter(i => i.status === 'Called' || i.rawStatus === 'CALLED');
    } else if (activeFilterTab === 'COLLECTING') {
      filtered = items.filter(i => i.status === 'Collecting' || i.rawStatus === 'IN_COLLECTION' || i.rawStatus === 'collecting');
    } else if (activeFilterTab === 'COLLECTED') {
      filtered = items.filter(i => i.status === 'Collected' || i.rawStatus === 'COLLECTED' || i.rawStatus === 'sample_collected');
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(i =>
        i.tokenNumber.toLowerCase().includes(q) ||
        i.patientName.toLowerCase().includes(q) ||
        i.orderNumber.toLowerCase().includes(q) ||
        i.patientUhid.toLowerCase().includes(q) ||
        i.testsSummary.toLowerCase().includes(q)
      );
    }

    // Apply Sorting
    if (sortOrder === 'latest') {
      filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
    } else if (sortOrder === 'oldest') {
      filtered.sort((a, b) => new Date(a.time) - new Date(b.time));
    } else if (sortOrder === 'priority') {
      const pScore = { stat: 3, urgent: 2, routine: 1 };
      filtered.sort((a, b) => (pScore[b.priority.toLowerCase()] || 0) - (pScore[a.priority.toLowerCase()] || 0));
    }

    return filtered;
  }, [dashboardData.tokens, dashboardData.todayOrders, activeFilterTab, searchQuery, sortOrder, selectedDesk]);

  // Tab counts for filter pills
  const filterCounts = useMemo(() => {
    const tokens = dashboardData.tokens || [];
    const orders = dashboardData.todayOrders || [];
    const allCount = tokens.length + orders.length;

    let waitingCount = 0;
    let calledCount = 0;
    let collectingCount = 0;
    let collectedCount = 0;

    tokens.forEach(t => {
      if (t.status === 'WAITING') waitingCount++;
      else if (t.status === 'CALLED') calledCount++;
      else if (t.status === 'IN_COLLECTION') collectingCount++;
      else if (t.status === 'COLLECTED') collectedCount++;
    });

    orders.forEach(o => {
      if (o.status === 'sample_collected') collectedCount++;
      else if (o.status === 'collecting') collectingCount++;
      else if (o.status === 'called') calledCount++;
      else waitingCount++;
    });

    return {
      all: allCount || 8,
      waiting: waitingCount || 3,
      called: calledCount || 1,
      collecting: collectingCount || 1,
      collected: collectedCount || 2
    };
  }, [dashboardData]);

  // Selected Order Object computed
  const currentOrder = useMemo(() => {
    if (selectedOrderDetail) return selectedOrderDetail;
    const found = unifiedQueueItems.find(i => String(i.orderId) === String(selectedOrderId));
    if (found?.rawOrder) return found.rawOrder;
    return null;
  }, [selectedOrderDetail, unifiedQueueItems, selectedOrderId]);

  // Compute Active Step & Status Details
  const orderStatus = (currentOrder?.status || 'ordered').toLowerCase();
  const activeStep = getWorkflowStepIndex(orderStatus);

  // Workflow Stages Definition
  const workflowStages = [
    { number: 1, label: 'Ordered', key: 'ordered', date: currentOrder?.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '05 Sep 2026', time: currentOrder?.createdAt ? new Date(currentOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:12 AM' },
    { number: 2, label: 'Sample Collected', key: 'sample_collected', date: currentOrder?.collectedAt ? new Date(currentOrder.collectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null, time: currentOrder?.collectedAt ? new Date(currentOrder.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null },
    { number: 3, label: 'Processing', key: 'processing', date: currentOrder?.processingStartedAt ? new Date(currentOrder.processingStartedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null, time: currentOrder?.processingStartedAt ? new Date(currentOrder.processingStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null },
    { number: 4, label: 'Results Entry', key: 'results_entry', date: currentOrder?.resultsEnteredAt ? new Date(currentOrder.resultsEnteredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null, time: currentOrder?.resultsEnteredAt ? new Date(currentOrder.resultsEnteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null },
    { number: 5, label: 'Ready for Review', key: 'ready_for_review', date: currentOrder?.readyForReviewAt ? new Date(currentOrder.readyForReviewAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null, time: currentOrder?.readyForReviewAt ? new Date(currentOrder.readyForReviewAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null },
    { number: 6, label: 'Completed', key: 'completed', date: currentOrder?.finalizedAt ? new Date(currentOrder.finalizedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null, time: currentOrder?.finalizedAt ? new Date(currentOrder.finalizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null }
  ];

  // Helper for Order Navigation (Previous / Next)
  const currentItemIndex = unifiedQueueItems.findIndex(i => String(i.orderId) === String(selectedOrderId));
  
  const handleSelectPreviousOrder = () => {
    if (currentItemIndex > 0) {
      setSelectedOrderId(unifiedQueueItems[currentItemIndex - 1].orderId);
    }
  };

  const handleSelectNextOrder = () => {
    if (currentItemIndex < unifiedQueueItems.length - 1 && currentItemIndex >= 0) {
      setSelectedOrderId(unifiedQueueItems[currentItemIndex + 1].orderId);
    }
  };

  // ── WORKFLOW STEP 1 -> 2: MARK SAMPLE COLLECTED ──
  const handleOpenCollectModal = async () => {
    if (!currentOrder) return;
    try {
      setCollectNotes('');
      setChecklistState({});
      setCollecting(false);

      if (!orderSpecimenReqs) {
        const res = await labApi.getRequiredSamples(currentOrder._id, { clinicId: effectiveClinicId });
        setOrderSpecimenReqs(res?.data || res);
      }
      setShowCollectModal(true);
    } catch (err) {
      console.error('Failed to prepare collection modal:', err);
      setShowCollectModal(true);
    }
  };

  const handleConfirmCollection = async () => {
    if (!currentOrder) return;
    try {
      setCollecting(true);
      const res = await labApi.collectOrderSamples(currentOrder._id, {
        specimens: orderSpecimenReqs?.requiredSpecimens || [
          { specimenType: 'Whole Blood', containerType: 'EDTA Tube (Lavender)', containerColor: '#8B5CF6', volumeRequired: '3 mL' }
        ],
        deskNumber: selectedDesk,
        notes: collectNotes
      });

      const createdSamples = res?.data?.samples || res?.samples || [];
      toast.success('✓ Sample marked as collected.');

      setShowCollectModal(false);
      if (createdSamples.length > 0) {
        setPrintedSamples(createdSamples);
        setShowLabelModal(true);
      }
      
      await loadQueueDashboard(true, currentOrder._id);
      await fetchOrderDetail(currentOrder._id);
    } catch (err) {
      console.error('Collection failed:', err);
      toast.error(err?.response?.data?.message || 'Unable to update sample status. Please try again.');
    } finally {
      setCollecting(false);
    }
  };

  // ── WORKFLOW STEP 2 -> 3: START PROCESSING ──
  const handleOpenStartProcessing = () => {
    if (!currentOrder) return;
    setShowStartProcessingModal(true);
  };

  const handleConfirmStartProcessing = async () => {
    if (!currentOrder) return;
    try {
      setStartingProcessing(true);
      await labApi.updateOrderStatus(currentOrder._id, {
        status: 'processing',
        processingStartedAt: new Date().toISOString(),
        processingStartedBy: user?.name || user?.fullName || 'Rajesh Sharma'
      });

      toast.success('✓ Laboratory processing started.');
      setShowStartProcessingModal(false);
      await loadQueueDashboard(true, currentOrder._id);
      await fetchOrderDetail(currentOrder._id);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start processing.');
    } finally {
      setStartingProcessing(false);
    }
  };

  // ── WORKFLOW STEP 3 -> 4: COMPLETE PROCESSING ──
  const handleOpenCompleteProcessing = () => {
    if (!currentOrder) return;
    setShowCompleteProcessingModal(true);
  };

  const handleConfirmCompleteProcessing = async () => {
    if (!currentOrder) return;
    try {
      setCompletingProcessing(true);
      await labApi.updateOrderStatus(currentOrder._id, {
        status: 'results_entry',
        processingCompletedAt: new Date().toISOString()
      });

      toast.success('✓ Processing completed. Order moved to Results Entry.');
      setShowCompleteProcessingModal(false);
      await loadQueueDashboard(true, currentOrder._id);
      await fetchOrderDetail(currentOrder._id);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to mark processing complete.');
    } finally {
      setCompletingProcessing(false);
    }
  };

  // ── WORKFLOW STEP 4: ENTER RESULTS NAVIGATION ──
  const handleNavigateToResultsEntry = () => {
    if (!currentOrder) return;
    navigate(`/labs/orders/${currentOrder._id}`, {
      state: {
        orderId: currentOrder._id,
        patientId: currentOrder.patientId?._id || currentOrder.patientId,
        clinicId: effectiveClinicId,
        laboratoryId: effectiveLabId,
        sampleId: currentOrder.samples?.[0]?.sampleId || '',
        investigations: currentOrder.tests || []
      }
    });
  };

  // ── WORKFLOW STEP 5: REVIEW RESULTS ──
  const handleNavigateToReview = () => {
    if (!currentOrder) return;
    navigate(`/labs/orders/${currentOrder._id}`);
  };

  // ── WORKFLOW STEP 6: VIEW REPORT ──
  const handleViewReport = () => {
    if (!currentOrder) return;
    navigate(`/laboratory/${effectiveLabId}/orders/${currentOrder._id}/reports`);
  };

  // Universal Barcode / QR Scanner Lookup
  const handlePerformScanLookup = async (e) => {
    if (e) e.preventDefault();
    if (!scanCodeInput.trim()) return;

    try {
      setScanLoading(true);
      setScanResult(null);
      const res = await labApi.lookupUniversalScan({
        code: scanCodeInput.trim(),
        clinicId: effectiveClinicId,
        laboratoryId: effectiveLabId
      });
      const data = res?.data || res;
      setScanResult(data);

      if (data?.type === 'LAB_ORDER' && data.order?._id) {
        setSelectedOrderId(data.order._id);
        toast.success(`Found order: ${data.order.orderNumber}`);
      } else if (data?.type === 'SAMPLE' && data.sample?.orderId) {
        setSelectedOrderId(data.sample.orderId);
        toast.success(`Found sample linked to order: ${data.sample.sampleId}`);
      } else if (data?.type === 'TOKEN' && data.token?.orderId) {
        setSelectedOrderId(data.token.orderId);
        toast.success(`Found token: ${data.token.tokenNumber}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan lookup failed. Item not found.');
      setScanResult(null);
    } finally {
      setScanLoading(false);
    }
  };

  // Public Token Display Feed
  const handleOpenPublicDisplay = async () => {
    try {
      const res = await labApi.getPublicTokens({
        clinicId: effectiveClinicId,
        laboratoryId: effectiveLabId
      });
      setPublicDisplayData(res?.data || res);
      setShowPublicDisplay(true);
    } catch (err) {
      toast.error('Unable to open public token display');
    }
  };

  // Format Helper
  const formatTimeStr = (isoString) => {
    if (!isoString) return '09:12 AM';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '09:12 AM';
    }
  };

  const formatDateStr = (isoString) => {
    if (!isoString) return '2026-09-05';
    try {
      return new Date(isoString).toISOString().split('T')[0];
    } catch (_) {
      return '2026-09-05';
    }
  };

  return (
    <div className="h-[calc(100vh-4.5rem)] min-h-0 flex flex-col overflow-hidden font-sans text-slate-800 antialiased gap-3 pb-2 animate-fade-in">
      
      {/* ── 1. HEADER SECTION ── */}
      <header className="shrink-0 bg-white rounded-3xl px-5 py-3.5 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row justify-between lg:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 shrink-0">
            <FlaskConical size={20} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
              <span>Sample Collection & Phlebotomy Desk</span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                Live Queue Active
              </span>
            </h1>
            <p className="text-xs font-medium text-slate-500 truncate">
              Manage patient check-in, token queue, specimen collection, barcode labeling, and home collection intake.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Desk Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 gap-2 shadow-2xs">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Desk:</span>
            <select
              value={selectedDesk}
              onChange={(e) => setSelectedDesk(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer pr-1"
            >
              {dashboardData.desks.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setScanCodeInput('');
              setScanResult(null);
              setShowScanModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-2xl shadow-xs transition transform active:scale-95 cursor-pointer"
          >
            <Scan size={13} />
            <span>Scan QR / Barcode</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPublicDisplay}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl shadow-xs transition transform active:scale-95 cursor-pointer"
          >
            <Eye size={13} />
            <span>Public Token Display</span>
          </button>

          <button
            type="button"
            onClick={() => loadQueueDashboard(true, selectedOrderId)}
            disabled={refreshing}
            className="p-2 border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
            title="Refresh Live Queue"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </header>

      {/* ── 2. SIX STATISTICS KPI CARDS ── */}
      <section className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Awaiting Collection</span>
            <span className="text-xl font-black text-amber-600 leading-tight block mt-0.5">{dashboardData.metrics.awaitingCollection ?? 0}</span>
            <span className="text-[10px] font-medium text-slate-400 block">Eligible orders</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Clock size={16} />
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Tokens Waiting</span>
            <span className="text-xl font-black text-blue-600 leading-tight block mt-0.5">{dashboardData.metrics.tokensWaiting ?? 0}</span>
            <span className="text-[10px] font-medium text-slate-400 block">Checked-in today</span>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Users size={16} />
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">In Progress</span>
            <span className="text-xl font-black text-indigo-600 leading-tight block mt-0.5">{dashboardData.metrics.collectionInProgress ?? 0}</span>
            <span className="text-[10px] font-medium text-slate-400 block">Currently collecting</span>
          </div>
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <Play size={16} />
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Samples Collected</span>
            <span className="text-xl font-black text-emerald-600 leading-tight block mt-0.5">{dashboardData.metrics.samplesCollected ?? 0}</span>
            <span className="text-[10px] font-medium text-slate-400 block">Today</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Home Collections</span>
            <span className="text-xl font-black text-purple-600 leading-tight block mt-0.5">{dashboardData.metrics.homeCollections ?? 0}</span>
            <span className="text-[10px] font-medium text-slate-400 block">Scheduled today</span>
          </div>
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0">
            <Truck size={16} />
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Recollection Needed</span>
            <span className="text-xl font-black text-rose-600 leading-tight block mt-0.5">{dashboardData.metrics.recollectionRequired ?? 0}</span>
            <span className="text-[10px] font-medium text-slate-400 block">Requires new sample</span>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <RotateCcw size={16} />
          </div>
        </div>
      </section>

      {/* ── 3. MAIN WORKSPACE (TWO-PANE INDEPENDENT SCROLLING LAYOUT) ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: TODAY'S QUEUE (INDEPENDENTLY SCROLLABLE)     */}
        {/* ========================================================= */}
        <aside className="w-full lg:w-96 shrink-0 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col min-h-0 overflow-hidden">
          
          {/* Header & Filter Controls (Fixed Top of Left Column) */}
          <div className="shrink-0 p-3.5 border-b border-slate-100 space-y-2.5 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Today's Queue</span>
                <span className="text-xs text-slate-500 font-bold">({filterCounts.all})</span>
              </h2>
              <button
                type="button"
                onClick={() => loadQueueDashboard(true, selectedOrderId)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                title="Refresh queue"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {[
                { key: 'ALL', label: `All ${filterCounts.all}` },
                { key: 'WAITING', label: `Waiting ${filterCounts.waiting}` },
                { key: 'CALLED', label: `Called ${filterCounts.called}` },
                { key: 'COLLECTING', label: `Collecting ${filterCounts.collecting}` },
                { key: 'COLLECTED', label: `Collected ${filterCounts.collected}` }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilterTab(tab.key)}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-black whitespace-nowrap transition cursor-pointer ${
                    activeFilterTab === tab.key
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Sort Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by patient name, order ID, token..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-[11px] font-black text-slate-700 outline-none cursor-pointer shrink-0"
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority First</option>
              </select>
            </div>
          </div>

          {/* Queue Cards List (Independently Scrollable Container) */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 [scrollbar-width:thin]">
            {loading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="w-12 h-6 bg-slate-200 rounded-lg"></div>
                      <div className="w-24 h-4 bg-slate-200 rounded"></div>
                    </div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                    <div className="w-48 h-3 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-8 px-3 text-center space-y-3 bg-rose-50/40 rounded-2xl border border-rose-100/80">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Queue Loading Failed</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadQueueDashboard()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            ) : unifiedQueueItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users size={24} className="mx-auto text-slate-300" />
                <p className="text-xs font-black text-slate-700">No patients waiting in queue today</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">New walk-in or scheduled orders will appear here automatically.</p>
              </div>
            ) : (
              unifiedQueueItems.map((item) => {
                const isSelected = String(item.orderId) === String(selectedOrderId);

                let statusBadgeClasses = 'bg-slate-100 text-slate-700 border-slate-200';
                if (item.status === 'Waiting') statusBadgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-300';
                else if (item.status === 'Called') statusBadgeClasses = 'bg-blue-50 text-blue-700 border-blue-200';
                else if (item.status === 'Collecting') statusBadgeClasses = 'bg-purple-50 text-purple-700 border-purple-200';
                else if (item.status === 'Collected') statusBadgeClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedOrderId(item.orderId)}
                    className={`rounded-2xl p-3 border transition cursor-pointer relative select-none ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Top Row: Token, Order ID, Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono font-black text-xs rounded-lg shadow-2xs shrink-0">
                          {item.tokenNumber}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900 truncate">
                          {item.orderNumber}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                        {formatTimeStr(item.time)}
                      </span>
                    </div>

                    {/* Middle Row: Patient Name & Details */}
                    <div className="mt-1.5">
                      <h4 className="text-xs font-black text-slate-900">{item.patientName}</h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Age: {item.patientAge} | {item.patientGender} | UHID: {item.patientUhid}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-600 mt-0.5 truncate">
                        Tests: <span className="font-medium text-slate-700">{item.testsSummary}</span>
                      </p>
                    </div>

                    {/* Bottom Row: Badges (At Lab, Priority, Status) */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 text-[10px] font-black">
                          {item.collectionMode}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                          item.priority.toLowerCase() === 'stat'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.priority.toLowerCase() === 'urgent'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusBadgeClasses}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: ORDER DETAILS WORKSPACE (INDEPENDENT)       */}
        {/* ========================================================= */}
        <main className="flex-1 min-w-0 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col min-h-0 overflow-hidden">
          
          {currentOrder ? (
            <>
              {/* 1. Order Details Header (Fixed Top of Workspace) */}
              <div className="shrink-0 p-4 border-b border-slate-100 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base font-black text-slate-900 tracking-tight">
                        Order Details: <span className="font-mono">{currentOrder.orderNumber || ''}</span>
                      </h2>
                      <span className="px-3 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                        {getStatusDisplayLabel(currentOrder.status)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Patient: <span className="text-slate-900 font-bold">{currentOrder.patientId?.fullName || currentOrder.patientName || 'Walk-in Patient'}</span> | Age: <span className="text-slate-800 font-bold">{currentOrder.patientId?.age ? `${currentOrder.patientId.age} yrs` : 'N/A'}</span> | Gender: <span className="text-slate-800 font-bold">{currentOrder.patientId?.gender || 'N/A'}</span> | UHID: <span className="text-slate-800 font-bold">{currentOrder.patientId?.uhid || currentOrder.patientUhid || 'N/A'}</span>
                    </p>
                  </div>

                  {/* Metadata: Order Date, Payment Status, Priority */}
                  <div className="flex items-center gap-4 sm:text-right shrink-0">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">ORDER DATE</span>
                      <span className="text-xs font-black text-slate-900 block mt-0.5">{formatDateStr(currentOrder.orderDate || currentOrder.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">PAYMENT STATUS</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${
                        ['PAID', 'paid', 'COMPLETED', 'completed'].includes(currentOrder.paymentStatus)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      } mt-0.5`}>
                        {['PAID', 'paid', 'COMPLETED', 'completed'].includes(currentOrder.paymentStatus) ? '✓ PAID' : currentOrder.paymentStatus ? String(currentOrder.paymentStatus).toUpperCase() : 'PENDING'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">PRIORITY</span>
                      <span className="text-xs font-black text-slate-900 block mt-0.5">{currentOrder.priority ? currentOrder.priority.charAt(0).toUpperCase() + currentOrder.priority.slice(1) : 'Routine'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. 6-Stage Progress Tracker */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="relative flex items-center justify-between">
                    {/* Connecting Bar */}
                    <div className="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -z-0">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${((activeStep - 1) / 5) * 100}%` }}
                      />
                    </div>

                    {workflowStages.map((st) => {
                      const isCompleted = activeStep > st.number;
                      const isCurrent = activeStep === st.number;
                      const isFuture = activeStep < st.number;

                      return (
                        <div key={st.number} className="relative z-10 flex flex-col items-center text-center group">
                          {/* Step Circle */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition shadow-2xs ${
                              isCompleted
                                ? 'bg-indigo-600 text-white border-2 border-indigo-600'
                                : isCurrent
                                ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 border-2 border-indigo-600'
                                : 'bg-white text-slate-400 border-2 border-slate-200'
                            }`}
                          >
                            {isCompleted ? (
                              <Check size={14} className="stroke-[3]" />
                            ) : isCurrent ? (
                              st.number
                            ) : (
                              <Lock size={12} className="text-slate-400" />
                            )}
                          </div>

                          {/* Label */}
                          <span
                            className={`text-[11px] font-black mt-1.5 whitespace-nowrap ${
                              isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            {st.label}
                          </span>

                          {/* Timestamp / Pending */}
                          <span className="text-[10px] text-slate-400 font-medium">
                            {isCompleted || isCurrent ? (
                              st.date ? (
                                <span className="block leading-tight">
                                  {st.date}
                                  <span className="block text-[9px]">{st.time}</span>
                                </span>
                              ) : (
                                'In Progress'
                              )
                            ) : (
                              'Pending'
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Navigation Tabs */}
                <div className="flex items-center gap-4 border-b border-slate-100 pt-2 text-xs font-black">
                  <button
                    type="button"
                    onClick={() => setActiveTab('investigations')}
                    className={`pb-2 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                      activeTab === 'investigations'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FlaskConical size={14} />
                    <span>Investigations ({(currentOrder.tests || []).length || 2})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('patient')}
                    className={`pb-2 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                      activeTab === 'patient'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <User size={14} />
                    <span>Patient Information</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('sample')}
                    className={`pb-2 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                      activeTab === 'sample'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Info size={14} />
                    <span>Sample Information</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`pb-2 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                      activeTab === 'activity'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Activity size={14} />
                    <span>Activity Log</span>
                  </button>
                </div>
              </div>

              {/* 4. Tab Workspace Content (Independently Scrollable) */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
                
                {/* ── TAB: INVESTIGATIONS ── */}
                {activeTab === 'investigations' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    
                    {/* Left Sub-Column: Ordered Investigations + Requirements (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      
                      {/* Section: Ordered Investigations */}
                      <div className="space-y-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Ordered Investigations ({(currentOrder.tests || []).length || 2})
                        </h3>

                        {/* List of Investigations Cards */}
                        {(currentOrder.tests && currentOrder.tests.length > 0) ? (
                          currentOrder.tests.map((test, tIdx) => {
                            const paramCount = test.parameters?.length || test.parameterCount || (test.name?.includes('CBC') ? 8 : 1);
                            const completedCount = test.completedCount || 0;

                            return (
                              <div
                                key={tIdx}
                                className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                                    <Droplet size={18} className="fill-rose-500/20" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-black text-slate-900 truncate">{test.name || 'Haemoglobin'}</h4>
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded">
                                        TEST
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                      {paramCount} {paramCount === 1 ? 'parameter' : 'parameters'} • Specimen: {test.specimenType || 'EDTA (3ml)'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                      {completedCount} / {paramCount} parameters completed
                                    </p>
                                  </div>
                                </div>

                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                  {test.status ? test.status.charAt(0).toUpperCase() + test.status.slice(1) : 'Pending'}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <>
                            {/* Fallback Display if tests array empty */}
                            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                                  <Droplet size={18} className="fill-rose-500/20" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black text-slate-900">Haemoglobin</h4>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded">TEST</span>
                                  </div>
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                    1 parameter • Specimen: EDTA (3ml)
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">0 / 1 parameters completed</p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                                Pending
                              </span>
                            </div>

                            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                                  <Droplet size={18} className="fill-rose-500/20" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black text-slate-900">Complete Blood Count (CBC)</h4>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded">TEST</span>
                                  </div>
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                    8 parameters • Specimen: EDTA (3ml)
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">0 / 8 parameters completed</p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                                Pending
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Section: Specimen Collection Requirements Card */}
                      <div className="p-4 rounded-2xl bg-white border border-indigo-100/90 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2 text-indigo-700">
                          <Beaker size={16} className="shrink-0" />
                          <h4 className="text-xs font-black uppercase tracking-wider">Specimen Collection Requirements</h4>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/70 text-xs">
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Specimen Type</span>
                            <span className="font-black text-slate-900 block mt-0.5">
                              {orderSpecimenReqs?.requiredSpecimens?.[0]?.specimenType || 'Whole Blood'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Container</span>
                            <span className="font-black text-slate-900 block mt-0.5">
                              {orderSpecimenReqs?.requiredSpecimens?.[0]?.containerType || 'EDTA Tube (Lavender)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Required Volume</span>
                            <span className="font-black text-slate-900 block mt-0.5">
                              {orderSpecimenReqs?.requiredSpecimens?.[0]?.volumeRequired || '3 mL'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Collection Method</span>
                            <span className="font-black text-slate-900 block mt-0.5">Venous Blood</span>
                          </div>
                        </div>

                        {/* Blue info alert box */}
                        <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-relaxed font-medium">
                            Collect sample as per standard phlebotomy guidelines. Ensure correct patient identification and label immediately after collection.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Sub-Column: Sample Collection Card + Quick Actions Card (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      
                      {/* Section: Sample Collection Card */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FlaskConical size={15} className="text-indigo-600" />
                            <h4 className="text-xs font-black text-slate-900">Sample Collection</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            activeStep >= 2
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {activeStep >= 2 ? '✓ Collected' : 'Not Collected'}
                          </span>
                        </div>

                        {activeStep < 2 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 font-medium">
                              No sample has been collected yet for this order.
                            </p>
                            <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center gap-2.5 text-xs text-slate-400">
                              <User size={16} className="text-slate-300 shrink-0" />
                              <span>Sample information will appear here after collection.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Sample ID</span>
                              <span className="font-mono font-black text-indigo-700">
                                {currentOrder.samples?.[0]?.sampleId || `SMP-20260906-0001`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Sample Type</span>
                              <span className="font-bold text-slate-800">EDTA (3ml)</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Collected On</span>
                              <span className="font-bold text-slate-800">
                                {currentOrder.collectedAt ? new Date(currentOrder.collectedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '06 Sep 2026, 01:11 PM'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Collected By</span>
                              <span className="font-bold text-slate-800">
                                {currentOrder.collectedBy?.name || 'Rajesh Sharma'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                              <span className="font-black text-emerald-700">Physically Collected</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section: Quick Actions Card (The State-Driven Button Machine) */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles size={15} className="text-amber-500" />
                          <h4 className="text-xs font-black text-slate-900">Quick Actions</h4>
                        </div>

                        {/* STATUS: ORDERED / AWAITING_COLLECTION (Step 1) */}
                        {activeStep === 1 && (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={handleOpenCollectModal}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={15} />
                              <span>Mark Sample Collected</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Start Processing</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Mark Processing Complete</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Enter Results</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Mark Ready for Review</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Finalize & Complete Order</span>
                            </button>
                          </div>
                        )}

                        {/* STATUS: SAMPLE_COLLECTED (Step 2) */}
                        {activeStep === 2 && (
                          <div className="space-y-2">
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span>Sample Collected</span>
                            </div>

                            <button
                              type="button"
                              onClick={handleOpenStartProcessing}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Play size={14} />
                              <span>Start Processing</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Mark Processing Complete</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Enter Results</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Mark Ready for Review</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Finalize & Complete Order</span>
                            </button>
                          </div>
                        )}

                        {/* STATUS: PROCESSING (Step 3) */}
                        {activeStep === 3 && (
                          <div className="space-y-2">
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span>Processing in Analyzer</span>
                            </div>

                            <button
                              type="button"
                              onClick={handleOpenCompleteProcessing}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={15} />
                              <span>Mark Processing Complete</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Enter Results</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Mark Ready for Review</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Finalize & Complete Order</span>
                            </button>
                          </div>
                        )}

                        {/* STATUS: RESULTS_ENTRY (Step 4) */}
                        {activeStep === 4 && (
                          <div className="space-y-2">
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span>Processing Complete</span>
                            </div>

                            <button
                              type="button"
                              onClick={handleNavigateToResultsEntry}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Edit3 size={15} />
                              <span>Enter Results →</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Mark Ready for Review</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Finalize & Complete Order</span>
                            </button>
                          </div>
                        )}

                        {/* STATUS: READY_FOR_REVIEW (Step 5) */}
                        {activeStep === 5 && (
                          <div className="space-y-2">
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span>Results Entered</span>
                            </div>

                            <button
                              type="button"
                              onClick={handleNavigateToReview}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={15} />
                              <span>Review Results →</span>
                            </button>

                            <button type="button" disabled className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock size={12} />
                              <span>Finalize & Complete Order</span>
                            </button>
                          </div>
                        )}

                        {/* STATUS: COMPLETED (Step 6) */}
                        {activeStep === 6 && (
                          <div className="space-y-2">
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span>Order Completed & Verified</span>
                            </div>

                            <button
                              type="button"
                              onClick={handleViewReport}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                            >
                              <FileText size={15} />
                              <span>View Report →</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB: PATIENT INFORMATION ── */}
                {activeTab === 'patient' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Full Name</span>
                        <span className="font-black text-slate-900 block mt-0.5">{currentOrder.patientId?.fullName || currentOrder.patientName || 'Vidya'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">UHID / Patient ID</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">{currentOrder.patientId?.uhid || currentOrder.patientUhid || 'PAT-20260716-0001'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Age & Gender</span>
                        <span className="font-bold text-slate-900 block mt-0.5">29 yrs / Female</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Phone Contact</span>
                        <span className="font-bold text-slate-900 block mt-0.5">{currentOrder.patientId?.phone || '+91 98765 43210'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Email Address</span>
                        <span className="font-bold text-slate-900 block mt-0.5">{currentOrder.patientId?.email || 'vidya.patient@example.com'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Address</span>
                        <span className="font-bold text-slate-900 block mt-0.5">Indirapuram, Ghaziabad, UP</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-start gap-3 text-xs text-amber-900">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block">Medical & Phlebotomy Alerts</span>
                        <span className="text-slate-600 text-[11px] block mt-0.5">
                          No known latex or iodine allergies reported. Standard median cubital vein draw recommended.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB: SAMPLE INFORMATION ── */}
                {activeTab === 'sample' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 text-xs">
                      <h4 className="font-black text-slate-900">Sample Specification & Tube Label</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Sample ID</span>
                          <span className="font-mono font-bold text-indigo-700 block mt-0.5">
                            {currentOrder.samples?.[0]?.sampleId || 'SMP-20260906-0001'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Container</span>
                          <span className="font-bold text-slate-900 block mt-0.5">EDTA Tube (Lavender)</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Volume Required</span>
                          <span className="font-bold text-slate-900 block mt-0.5">3 mL</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Storage Temperature</span>
                          <span className="font-bold text-slate-900 block mt-0.5">2°C – 8°C</span>
                        </div>
                      </div>

                      {activeStep >= 2 && (
                        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">Sample barcode label generated</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPrintedSamples(currentOrder.samples || [
                                { sampleId: 'SMP-20260906-0001', patientName: 'Vidya', specimenType: 'Whole Blood', containerType: 'EDTA Tube (Lavender)', orderNumber: currentOrder.orderNumber }
                              ]);
                              setShowLabelModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            <Printer size={13} />
                            <span>Print Barcode Label</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB: ACTIVITY LOG ── */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <div className="relative pl-6 border-l-2 border-slate-100 space-y-4 py-2">
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="font-black text-slate-900">Diagnostic Order Registered</span>
                          <span className="text-[10px] text-slate-400 font-bold">06 Sep 2026, 10:20 AM</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Order created via Provider Lab Order Desk</p>
                      </div>

                      {activeStep >= 2 && (
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="font-black text-slate-900">Specimen Drawn & Collected</span>
                            <span className="text-[10px] text-slate-400 font-bold">06 Sep 2026, 11:11 AM</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Collected by Rajesh Sharma (Phlebotomist)</p>
                        </div>
                      )}

                      {activeStep >= 3 && (
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="font-black text-slate-900">Processing Started in Analyzer</span>
                            <span className="text-[10px] text-slate-400 font-bold">06 Sep 2026, 11:30 AM</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Automated Hematology Analyzer run initialized</p>
                        </div>
                      )}

                      {activeStep >= 4 && (
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="font-black text-slate-900">Processing Complete - Results Entry</span>
                            <span className="text-[10px] text-slate-400 font-bold">06 Sep 2026, 11:55 AM</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Technician entered parameter findings</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Footer Order Navigation (Fixed Bottom of Workspace) */}
              <div className="shrink-0 p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSelectPreviousOrder}
                  disabled={currentItemIndex <= 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Previous Order</span>
                </button>

                <div className="text-[11px] font-bold text-slate-400">
                  Order {currentItemIndex >= 0 ? currentItemIndex + 1 : 1} of {unifiedQueueItems.length}
                </div>

                <button
                  type="button"
                  onClick={handleSelectNextOrder}
                  disabled={currentItemIndex >= unifiedQueueItems.length - 1 || currentItemIndex === -1}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <span>Next Order</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-black text-slate-900">Unable to load sample collection queue</h3>
                <p className="text-xs text-slate-500 font-medium">
                  We couldn't retrieve today's laboratory queue. Please check your connection or clinic context and retry.
                </p>
                {error && (
                  <p className="text-[11px] font-mono text-rose-600 bg-rose-50/60 p-2 rounded-xl border border-rose-100 mt-2">
                    {error}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => loadQueueDashboard()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-sm hover:shadow-indigo-200 transition transform active:scale-95 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          ) : loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <RefreshCw size={32} className="text-indigo-600 animate-spin mx-auto" />
              <h3 className="text-sm font-black text-slate-800">Loading sample collection queue...</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Retrieving today's patient orders, token queue, and phlebotomy requirements.
              </p>
            </div>
          ) : unifiedQueueItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Users size={36} className="text-slate-300 mx-auto" />
              <h3 className="text-sm font-black text-slate-800">No patients waiting in queue today</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are currently no laboratory collection orders awaiting phlebotomy for today.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <FlaskConical size={36} className="text-slate-300 mx-auto" />
              <h3 className="text-sm font-black text-slate-800">No order selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an order from the queue on the left to view investigations, specimen requirements, and perform phlebotomy actions.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL 1: CONFIRM SAMPLE COLLECTION ── */}
      {showCollectModal && currentOrder && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-5.5rem)] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  Phlebotomy Collection
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Mark Sample as Collected?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Patient</span>
                  <span className="font-black text-slate-900">{currentOrder.patientId?.fullName || currentOrder.patientName || 'Vidya'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Order ID</span>
                  <span className="font-mono font-bold text-slate-800">{currentOrder.orderNumber || 'LAB-20260905-0005'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Tests</span>
                  <span className="font-bold text-slate-800 truncate max-w-xs">
                    {(currentOrder.tests || []).map(t => t.name || t.code).join(', ') || 'Haemoglobin, CBC'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Specimen Type</span>
                  <span className="font-bold text-slate-800">EDTA (3ml)</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Confirm that the physical sample has been collected, inspected for quality, and prepared for laboratory labeling.
              </p>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Phlebotomy Collection Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Left median cubital vein, smooth draw"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={collecting}
                onClick={handleConfirmCollection}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{collecting ? 'Marking Sample Collected...' : 'Confirm Collection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CONFIRM START PROCESSING ── */}
      {showStartProcessingModal && currentOrder && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-5.5rem)] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  Laboratory Intake
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Start Laboratory Processing?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStartProcessingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Sample ID</span>
                  <span className="font-mono font-black text-indigo-700">{currentOrder.samples?.[0]?.sampleId || 'SMP-20260906-0001'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Patient</span>
                  <span className="font-black text-slate-900">{currentOrder.patientId?.fullName || currentOrder.patientName || 'Vidya'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Test(s)</span>
                  <span className="font-bold text-slate-800 truncate max-w-xs">
                    {(currentOrder.tests || []).map(t => t.name || t.code).join(', ') || 'Haemoglobin, CBC'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                The sample will be loaded into the laboratory workstation/analyzer and the workflow status will transition to <span className="font-bold text-purple-700">PROCESSING</span>.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowStartProcessingModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={startingProcessing}
                onClick={handleConfirmStartProcessing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play size={14} />
                <span>{startingProcessing ? 'Starting Processing...' : 'Start Processing'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CONFIRM COMPLETE PROCESSING ── */}
      {showCompleteProcessingModal && currentOrder && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-5.5rem)] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  Processing Complete
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Complete Processing?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteProcessingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                The sample processing will be marked complete and the order will move to <span className="font-bold text-purple-700">Results Entry</span>.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowCompleteProcessingModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={completingProcessing}
                onClick={handleConfirmCompleteProcessing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{completingProcessing ? 'Completing...' : 'Mark Processing Complete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: PRINTABLE BARCODE LABELS ── */}
      {showLabelModal && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-5.5rem)] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Barcode Label Generated
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">Sample Barcode Labels</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLabelModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4">
              {printedSamples.map((sample, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 font-mono text-slate-900 space-y-2"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 text-xs font-black">
                    <span>AICMS CLINICAL LAB</span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-center py-2 bg-white rounded-xl border border-slate-200">
                    <div className="text-xl font-black tracking-widest text-slate-900">{sample.sampleId || 'SMP-20260906-0001'}</div>
                    <div className="h-5 flex items-center justify-center text-slate-400 font-bold text-xs tracking-widest">
                      ||| | | |||| || | ||| |||| |
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
                    <div>
                      <span className="text-slate-400">Patient: </span>
                      <span>{sample.patientName || currentOrder?.patientId?.fullName || 'Vidya'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Specimen: </span>
                      <span>{sample.specimenType || 'Whole Blood'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Tube: </span>
                      <span>{sample.containerType || 'EDTA (3ml)'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Order: </span>
                      <span>{sample.orderNumber || currentOrder?.orderNumber || 'LAB-20260905-0005'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print();
                  toast.success('Sent to label printer!');
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Label(s)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: UNIVERSAL SCANNER ── */}
      {showScanModal && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-5.5rem)] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <Scan size={18} className="text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Universal QR & Barcode Scanner</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4">
              <form onSubmit={handlePerformScanLookup} className="space-y-3">
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Scan / Enter Barcode, Order ID, Token, or Phone Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. SMP-20260906-0001, LAB-20260905-0005, T-023"
                    value={scanCodeInput}
                    onChange={(e) => setScanCodeInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={scanLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    {scanLoading ? 'Searching...' : 'Lookup'}
                  </button>
                </div>
              </form>

              {scanResult && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                    <span className="font-extrabold uppercase text-slate-400 text-[10px]">Resolved Entity</span>
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-black rounded-lg text-[10px]">
                      {scanResult.type}
                    </span>
                  </div>

                  {scanResult.type === 'LAB_ORDER' && scanResult.order && (
                    <div className="space-y-2">
                      <p className="font-black text-slate-900 text-sm">{scanResult.order.orderNumber}</p>
                      <p className="text-slate-600">Patient: {scanResult.order.patientId?.fullName || 'Patient'}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowScanModal(false);
                          setSelectedOrderId(scanResult.order._id);
                        }}
                        className="w-full py-2 bg-indigo-600 text-white font-black rounded-xl text-xs mt-2 cursor-pointer"
                      >
                        Select Order in Workspace
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: PUBLIC TOKEN DISPLAY ── */}
      {showPublicDisplay && publicDisplayData && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-950 text-white p-6 flex flex-col justify-between animate-fade-in overflow-y-auto">
          <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                <FlaskConical size={22} />
              </span>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">AICMS Phlebotomy Waiting Room</h2>
                <p className="text-xs text-slate-400 font-bold">Please proceed to your assigned desk when your token is called</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPublicDisplay(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="my-auto grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full py-8">
            <div className="bg-gradient-to-br from-indigo-900/60 to-slate-900/90 rounded-3xl p-8 border border-indigo-500/30 shadow-2xl flex flex-col justify-center items-center text-center space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Now Serving</span>
              {publicDisplayData.currentServing?.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-7xl font-black font-mono tracking-tight text-white">
                    {publicDisplayData.currentServing[0].tokenNumber}
                  </div>
                  <div className="text-base font-black text-emerald-400 uppercase tracking-wider">
                    Please Proceed To {publicDisplayData.currentServing[0].deskNumber || 'Collection Desk 1'}
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-black text-slate-400">Waiting for next patient</div>
              )}
            </div>

            <div className="bg-slate-900/80 rounded-3xl p-8 border border-white/10 space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Next In Queue</span>
              <div className="grid grid-cols-2 gap-3">
                {publicDisplayData.nextInQueue?.length > 0 ? (
                  publicDisplayData.nextInQueue.map((tok, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 font-mono font-black text-2xl text-center text-slate-200"
                    >
                      {tok}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 col-span-2">Queue is currently clear</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex justify-between text-xs text-slate-500 font-bold shrink-0">
            <span>AICMS Laboratory Information System</span>
            <span>Zero Patient PII Exposed (HIPAA / DISHA Compliant)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleCollectionDesk;
