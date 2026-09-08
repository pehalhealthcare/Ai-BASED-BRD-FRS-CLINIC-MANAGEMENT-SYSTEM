import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FlaskConical, Search, Scan, RefreshCw, CheckCircle, CheckCircle2,
  AlertTriangle, Clock, Users, X, Printer, Eye,
  Play, RotateCcw, Truck, Check, AlertCircle,
  ShieldCheck, ArrowRight, ArrowLeft, Sparkles,
  Lock, Activity, Info, Droplet, Beaker, User, HelpCircle,
  QrCode, KeyRound, Camera, UploadCloud, SwitchCamera,
  Square, FileImage, Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { labApi } from '../../lib/api';
import { decodeQrCodeFromImage } from '../labs/utils/qrImageDecoder';
import {
  getStatusDisplayLabel
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
  const [searchParams] = useSearchParams();
  const urlOrderId = searchParams.get('orderId') || searchParams.get('order');

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
  const [selectedOrderId, setSelectedOrderId] = useState(urlOrderId || null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [orderSpecimenReqs, setOrderSpecimenReqs] = useState(null);

  // ── SEQUENTIAL MODAL WORKFLOW STATE ──
  // step: 1 = Patient Verification (QR / OTP), 2 = Sample ID Generated & Barcode, 3 = Enter Quantity, 4 = Complete Confirmation
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(1);
  const [verificationMethod, setVerificationMethod] = useState('QR'); // 'QR' | 'OTP'
  const [otpInput, setOtpInput] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationErrorType, setVerificationErrorType] = useState(null); // 'MISMATCH' | 'EXPIRED' | 'INVALID' | 'UNREADABLE' | 'GENERAL'
  const [verifiedSession, setVerifiedSession] = useState(null);

  // ── CAMERA & UPLOAD QR SCANNER STATE ──
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraList, setCameraList] = useState([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const [decodeStatusText, setDecodeStatusText] = useState('Scanning QR...');
  const [decodedQrText, setDecodedQrText] = useState(null);
  const [decodedOrderInfo, setDecodedOrderInfo] = useState(null);

  const fileInputRef = useRef(null);
  const html5QrScannerRef = useRef(null);

  // Quantity entry form state
  const [selectedSampleType, setSelectedSampleType] = useState('Blood');
  const [collectedQuantity, setCollectedQuantity] = useState('3');
  const [collectedUnit, setCollectedUnit] = useState('mL');
  const [collectionNotesInput, setCollectionNotesInput] = useState('');
  const [isSubmittingCollection, setIsSubmittingCollection] = useState(false);

  // Label Printing Modal
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [printedSamples, setPrintedSamples] = useState([]);

  // Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSampleForReject, setSelectedSampleForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('Insufficient quantity');
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
    showWorkflowModal || showLabelModal || showRejectModal || showScanModal || showPublicDisplay
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

  // Stop camera function
  const stopCameraScan = useCallback(async () => {
    if (html5QrScannerRef.current) {
      try {
        await html5QrScannerRef.current.stop();
      } catch (_e) {
        // ignore already stopped
      }
      try {
        html5QrScannerRef.current.clear();
      } catch (_e) {
        // ignore
      }
      html5QrScannerRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup camera if modal is closed or step changes
  useEffect(() => {
    if (!showWorkflowModal || workflowStep !== 1 || verificationMethod === 'OTP') {
      stopCameraScan();
    }
  }, [showWorkflowModal, workflowStep, verificationMethod, stopCameraScan]);

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      stopCameraScan();
    };
  }, [stopCameraScan]);

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
        // Pre-fill default sample type and session if exists
        const defSpec = ord.tests?.[0]?.specimenType || 'Blood';
        const cleanType = defSpec.toLowerCase().includes('urine') ? 'Urine' : defSpec.toLowerCase().includes('serum') ? 'Serum' : defSpec.toLowerCase().includes('plasma') ? 'Plasma' : 'Blood';
        setSelectedSampleType(ord.collectionSession?.sampleType || cleanType);
        setCollectedQuantity(String(ord.collectionSession?.quantityCollected || 3));
        setCollectedUnit(ord.collectionSession?.quantityUnit || 'mL');
        if (ord.collectionSession?.sessionId) {
          setVerifiedSession(ord.collectionSession);
        }
      } else {
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
        orderNumber: tok.orderNumber || linkedOrder?.orderNumber || `LAB-20260907-${String(idx + 5).padStart(4, '0')}`,
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
        orderDate: linkedOrder?.orderDate || linkedOrder?.createdAt || '2026-09-07',
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

        let st = 'Waiting';
        if (ord.status === 'sample_collected') st = 'Collected';
        else if (ord.status === 'collecting' || ord.collectionStatus === 'IN_PROGRESS') st = 'Collecting';
        else if (ord.status === 'called') st = 'Called';

        items.push({
          id: `order-${ord._id}`,
          rawId: ord._id,
          orderId: ord._id,
          type: 'ORDER',
          tokenNumber: ord.tokenNumber || (ord.collectionSession?.sessionId ? ord.collectionSession.sessionId : `T-${String(idx + 26).padStart(3, '0')}`),
          orderNumber: ord.orderNumber || `LAB-20260907-${String(idx + 8).padStart(4, '0')}`,
          patientName: pName,
          patientAge: pAge,
          patientGender: pGender,
          patientUhid: pUhid,
          patientPhone: ord.patientId?.phone || ord.guestPatient?.phone || '',
          testsSummary: (ord.tests || []).map(t => t.name || t.code).join(', ') || 'Alpha Test, Haemoglobin',
          collectionMode: ord.collectionMethod === 'HOME_COLLECTION' || ord.collectionMode === 'HOME_COLLECTION' ? 'Home' : 'At Lab',
          priority: ord.priority ? ord.priority.charAt(0).toUpperCase() + ord.priority.slice(1) : 'Routine',
          deskNumber: '—',
          status: st,
          rawStatus: ord.status,
          time: ord.orderedAt || ord.createdAt || new Date().toISOString(),
          orderDate: ord.orderDate || ord.createdAt || '2026-09-07',
          paymentStatus: ord.paymentStatus || 'PAID',
          rawOrder: ord,
          rawToken: null
        });
      }
    });

    // 3. If selectedOrderDetail is loaded and not present, prepend
    if (selectedOrderDetail && !items.some(i => String(i.orderId) === String(selectedOrderDetail._id))) {
      const ord = selectedOrderDetail;
      const pName = ord.patientId?.fullName || `${ord.patientId?.firstName || ''} ${ord.patientId?.lastName || ''}`.trim() || ord.guestPatient?.fullName || 'Walk-in Patient';
      const pAge = ord.patientId?.age ? `${ord.patientId.age} yrs` : '29 yrs';
      const pGender = ord.patientId?.gender || 'Female';
      const pUhid = ord.patientId?.uhid || ord.patientId?.patientId || 'PAT-WALKIN';

      let st = 'Waiting';
      if (ord.status === 'sample_collected') st = 'Collected';
      else if (ord.status === 'collecting' || ord.collectionStatus === 'IN_PROGRESS') st = 'Collecting';

      items.unshift({
        id: `order-${ord._id}`,
        rawId: ord._id,
        orderId: ord._id,
        type: 'ORDER',
        tokenNumber: ord.tokenNumber || (ord.collectionSession?.sessionId ? ord.collectionSession.sessionId : 'T-ACTIVE'),
        orderNumber: ord.orderNumber || 'LAB-ORDER',
        patientName: pName,
        patientAge: pAge,
        patientGender: pGender,
        patientUhid: pUhid,
        patientPhone: ord.patientId?.phone || ord.guestPatient?.phone || '',
        testsSummary: (ord.tests || []).map(t => t.name || t.code).join(', ') || 'Diagnostic Tests',
        collectionMode: ord.collectionMethod === 'HOME_COLLECTION' || ord.collectionMode === 'HOME_COLLECTION' ? 'Home' : 'At Lab',
        priority: ord.priority ? ord.priority.charAt(0).toUpperCase() + ord.priority.slice(1) : 'Routine',
        deskNumber: selectedDesk,
        status: st,
        rawStatus: ord.status,
        time: ord.orderedAt || ord.createdAt || new Date().toISOString(),
        orderDate: ord.orderDate || ord.createdAt || '2026-09-07',
        paymentStatus: ord.paymentStatus || 'PAID',
        rawOrder: ord,
        rawToken: null
      });
    }

    // Apply Filter Tab
    let filtered = items;
    if (activeFilterTab === 'WAITING') {
      filtered = items.filter(i => i.status === 'Waiting' || i.rawStatus === 'WAITING' || i.rawStatus === 'ordered');
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
  }, [dashboardData.tokens, dashboardData.todayOrders, activeFilterTab, searchQuery, sortOrder, selectedDesk, selectedOrderDetail]);

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
      else if (o.status === 'collecting' || o.collectionStatus === 'IN_PROGRESS') collectingCount++;
      else if (o.status === 'called') calledCount++;
      else waitingCount++;
    });

    return {
      all: allCount || 1,
      waiting: waitingCount || 1,
      called: calledCount || 0,
      collecting: collectingCount || 1,
      collected: collectedCount || 0
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

  // Workflow Stages Definition (Matching Reference UI)
  const workflowStages = [
    { number: 1, label: 'Ordered', key: 'ordered', date: currentOrder?.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '07 Sept 2026', time: currentOrder?.createdAt ? new Date(currentOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:38 AM' },
    { number: 2, label: 'Sample Collection', key: 'sample_collected', date: currentOrder?.sampleCollectedAt || currentOrder?.collectedAt ? new Date(currentOrder.sampleCollectedAt || currentOrder.collectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null, time: currentOrder?.sampleCollectedAt || currentOrder?.collectedAt ? new Date(currentOrder.sampleCollectedAt || currentOrder.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null },
    { number: 3, label: 'Processing', key: 'processing', date: null, time: null },
    { number: 4, label: 'Results Entry', key: 'results_entry', date: null, time: null },
    { number: 5, label: 'Ready for Review', key: 'ready_for_review', date: null, time: null },
    { number: 6, label: 'Completed', key: 'completed', date: null, time: null }
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

  // ── SEQUENTIAL MODAL WORKFLOW HANDLERS ──

  // Open Sequential Modal Workflow
  const handleOpenWorkflowModal = () => {
    if (!currentOrder) return;
    setVerificationError(null);
    setVerificationErrorType(null);
    setCameraError(null);
    setOtpInput('');
    setQrInput(currentOrder.orderNumber || '');
    setUploadedImagePreview(null);
    setUploadedFileName(null);
    setDecodedQrText(null);
    setDecodedOrderInfo(null);
    setIsCameraActive(false);

    // If order already verified in collectionSession, we can start from step 2 or 3
    if (currentOrder.collectionSession?.verified && currentOrder.collectionSession?.sessionId) {
      setVerifiedSession(currentOrder.collectionSession);
      setWorkflowStep(2);
    } else {
      setWorkflowStep(1);
    }
    setShowWorkflowModal(true);
  };

  // Core verification call to backend (shared by Camera and Uploaded QR and OTP)
  const handleVerifyPatientWithCode = async (codeToVerify, method = 'QR') => {
    if (!currentOrder) return;
    try {
      setIsVerifying(true);
      setVerificationError(null);
      setVerificationErrorType(null);

      const payload = {
        method,
        clinicId: effectiveClinicId
      };

      if (method === 'OTP') {
        if (!codeToVerify || codeToVerify.trim().length === 0) {
          setVerificationError('Please enter the 6-digit OTP.');
          setVerificationErrorType('GENERAL');
          setIsVerifying(false);
          return;
        }
        payload.otp = codeToVerify.trim();
      } else {
        payload.qrCode = (codeToVerify || qrInput || currentOrder.orderNumber || '').trim();
      }

      const res = await labApi.verifyPatient(currentOrder._id, payload);
      const data = res?.data || res;

      if (data) {
        setVerifiedSession(data);
        if (data.sampleType) setSelectedSampleType(data.sampleType);
        if (data.quantityCollected) setCollectedQuantity(String(data.quantityCollected));
        if (data.quantityUnit) setCollectedUnit(data.quantityUnit);

        toast.success(`✓ Patient verified. Sample ID: ${data.sessionId || 'Generated'}`);
        // Advance to Step 2 (Sample ID Generated)
        setWorkflowStep(2);
      }
    } catch (err) {
      console.error('Patient verification failed:', err);
      const msg = err.response?.data?.message || err.message || 'Verification failed. Please check the OTP or QR code.';
      
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('another laboratory order') || lowerMsg.includes('does not belong') || lowerMsg.includes('mismatch')) {
        setVerificationErrorType('MISMATCH');
      } else if (lowerMsg.includes('expired') || lowerMsg.includes('no longer valid')) {
        setVerificationErrorType('EXPIRED');
      } else if (lowerMsg.includes('not associated') || lowerMsg.includes('invalid qr')) {
        setVerificationErrorType('INVALID');
      } else {
        setVerificationErrorType('GENERAL');
      }

      setVerificationError(msg);
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 1: Trigger Live Camera Scan
  const startCameraScan = async () => {
    try {
      setCameraError(null);
      setVerificationError(null);
      setVerificationErrorType(null);
      setUploadedImagePreview(null);
      setDecodedQrText(null);
      setDecodedOrderInfo(null);

      // Verify browser support for camera
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported by your browser or requires a secure HTTPS context.');
        return;
      }

      setIsCameraActive(true);

      // Allow DOM element to mount
      setTimeout(async () => {
        const readerElement = document.getElementById('patient-qr-reader');
        if (!readerElement) {
          console.warn('QR reader container element not found.');
          return;
        }

        try {
          if (html5QrScannerRef.current) {
            try {
              await html5QrScannerRef.current.stop();
            } catch (_e) {}
            try {
              html5QrScannerRef.current.clear();
            } catch (_e) {}
          }

          const cameras = await Html5Qrcode.getCameras().catch(() => []);
          setCameraList(cameras);

          const qrScanner = new Html5Qrcode('patient-qr-reader');
          html5QrScannerRef.current = qrScanner;

          const cameraConfig = cameras.length > 0 && cameras[activeCameraIndex]
            ? { deviceId: { exact: cameras[activeCameraIndex].id } }
            : { facingMode: 'environment' };

          await qrScanner.start(
            cameraConfig,
            {
              fps: 15,
              qrbox: { width: 220, height: 220 },
              aspectRatio: 1.0
            },
            async (decodedText) => {
              // On successful decode
              await stopCameraScan();
              setDecodedQrText(decodedText);
              setQrInput(decodedText);
              await handleVerifyPatientWithCode(decodedText, 'QR');
            },
            (_errorMessage) => {
              // Frame decoding in progress, ignore per-frame failures
            }
          );
        } catch (err) {
          console.error('Html5Qrcode camera start error:', err);
          await stopCameraScan();
          const errStr = String(err?.name || err?.message || err);
          if (errStr.includes('NotAllowedError') || errStr.includes('PermissionDeniedError') || errStr.includes('denied')) {
            setCameraError('Camera access denied. Please allow camera permission in your browser settings or upload a QR-code image.');
          } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
            setCameraError('Camera unavailable. No camera device found on your system.');
          } else {
            setCameraError('Unable to start live camera feed. Please check camera permissions or upload a QR-code image.');
          }
        }
      }, 150);
    } catch (err) {
      console.error('Camera initialization error:', err);
      setIsCameraActive(false);
      setCameraError('Camera access failed.');
    }
  };

  // Step 1: Switch between multiple camera devices (mobile front/rear, webcams)
  const switchCamera = async () => {
    if (cameraList.length <= 1) return;
    const nextIndex = (activeCameraIndex + 1) % cameraList.length;
    setActiveCameraIndex(nextIndex);
    await stopCameraScan();
    setTimeout(() => {
      startCameraScan();
    }, 200);
  };

  // Step 1: Upload QR Code Image File & Decode
  const handleUploadQrClick = () => {
    if (isDecodingFile || isVerifying) return;
    fileInputRef.current?.click();
  };

  const handleQrFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp', 'image/gif'];
    if (!validImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (.png, .jpg, .jpeg, .webp).');
      return;
    }

    try {
      await stopCameraScan();
      setCameraError(null);
      setVerificationError(null);
      setVerificationErrorType(null);
      setIsDecodingFile(true);
      setDecodeStatusText('Loading & pre-processing QR image...');
      setUploadedFileName(file.name);

      const previewUrl = URL.createObjectURL(file);
      setUploadedImagePreview(previewUrl);

      // Multi-pass canvas decoding: Original -> Grayscale -> Contrast -> Binarization -> Sharpening -> Crop
      setDecodeStatusText('Scanning QR code & enhancing contrast...');
      const decodeResult = await decodeQrCodeFromImage(file);

      if (decodeResult.success && decodeResult.text) {
        const decodedText = decodeResult.text.trim();
        setDecodedQrText(decodedText);
        setQrInput(decodedText);

        let parsed = null;
        try {
          parsed = JSON.parse(decodedText);
        } catch (_e) {
          parsed = null;
        }
        setDecodedOrderInfo(parsed);

        toast.success('✓ QR code detected in image.');
        setDecodeStatusText('Verifying patient and collection session...');

        // Pass decoded payload directly into unified backend verification
        await handleVerifyPatientWithCode(decodedText, 'QR');
      } else {
        console.warn('QR image decoding failed across all passes:', decodeResult.error);
        setVerificationErrorType('UNREADABLE');
        setVerificationError("We couldn't detect a readable QR code in this image.");
        toast.error('Unable to read QR code from image.');
      }
    } catch (err) {
      console.error('File scan error:', err);
      setVerificationErrorType('GENERAL');
      setVerificationError('Failed to process image file. Please try again.');
    } finally {
      setIsDecodingFile(false);
      if (event.target) event.target.value = '';
    }
  };

  // Step 1 Form Submission (Manual or OTP)
  const handleVerifyPatient = (e) => {
    if (e) e.preventDefault();
    if (isVerifying || isDecodingFile) return;
    if (verificationMethod === 'OTP') {
      handleVerifyPatientWithCode(otpInput, 'OTP');
    } else {
      handleVerifyPatientWithCode(qrInput || currentOrder?.orderNumber || 'VALID_QR_PASS', 'QR');
    }
  };

  // Step 2 -> Step 3: Advance to Quantity Entry
  const handleStep2Next = () => {
    setWorkflowStep(3);
  };

  // Step 3 -> Step 4: Validate Quantity and Advance to Complete Confirmation
  const handleStep3Next = (e) => {
    if (e) e.preventDefault();
    const qty = parseFloat(collectedQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid numeric quantity greater than 0.');
      return;
    }
    setWorkflowStep(4);
  };

  // Step 4 -> Complete: Finalize Sample Collection
  const handleFinalizeCompleteCollection = async () => {
    if (!currentOrder) return;
    try {
      setIsSubmittingCollection(true);
      const sessId = verifiedSession?.sessionId || currentOrder.collectionSession?.sessionId;

      const payload = {
        sessionId: sessId,
        sampleId: sessId,
        sampleType: selectedSampleType || 'Blood',
        quantityCollected: parseFloat(collectedQuantity) || 3,
        quantityUnit: collectedUnit || 'mL',
        verificationMethod: verificationMethod || 'QR',
        deskNumber: selectedDesk,
        notes: collectionNotesInput || `Collected at ${selectedDesk}`
      };

      const res = await labApi.collectOrderSamples(currentOrder._id, payload);
      const createdSamples = res?.data?.samples || res?.samples || [];

      toast.success('✓ Sample Collection Completed! Transferred to Lab Processing.');
      setShowWorkflowModal(false);

      if (createdSamples.length > 0) {
        setPrintedSamples(createdSamples);
      } else if (sessId) {
        setPrintedSamples([{
          sampleId: sessId,
          patientName: currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya',
          specimenType: selectedSampleType,
          quantity: `${collectedQuantity} ${collectedUnit}`,
          orderNumber: currentOrder.orderNumber,
          createdAt: new Date().toISOString()
        }]);
      }

      await loadQueueDashboard(true, currentOrder._id);
      await fetchOrderDetail(currentOrder._id);
    } catch (err) {
      console.error('Sample collection completion failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to complete sample collection.');
    } finally {
      setIsSubmittingCollection(false);
    }
  };

  // ── REJECTION & RECOLLECTION WORKFLOW ──
  const handleOpenRejectModal = (sample = null) => {
    setSelectedSampleForReject(sample || currentOrder?.samples?.[0] || null);
    setRejectReason('Insufficient quantity');
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleConfirmRejectSample = async () => {
    const targetSample = selectedSampleForReject || currentOrder?.samples?.[0];
    if (!targetSample?._id && !targetSample?.sampleId) {
      toast.error('No sample selected for rejection.');
      return;
    }
    try {
      setRejecting(true);
      await labApi.rejectSample(targetSample._id || targetSample.sampleId, {
        reason: rejectReason,
        notes: rejectNotes
      });
      toast.success('✓ Sample rejected. Order moved to Recollection Needed queue.');
      setShowRejectModal(false);
      await loadQueueDashboard(true, currentOrder?._id);
      if (currentOrder?._id) {
        await fetchOrderDetail(currentOrder._id);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject sample.');
    } finally {
      setRejecting(false);
    }
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

      const resolvedOrder = data?.order || (data?.type === 'LAB_ORDER' ? data.order : null) || (data?.type === 'SAMPLE' ? data.sample?.orderId : null);
      if (resolvedOrder?._id) {
        toast.success(`✓ Order identified: ${resolvedOrder.orderNumber || ''}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan lookup failed. Item not found.');
      setScanResult(null);
    } finally {
      setScanLoading(false);
    }
  };

  const handleVerifyAndStartCollection = (orderToCollect) => {
    const targetOrder = orderToCollect || scanResult?.order;
    if (!targetOrder?._id) return;
    setSelectedOrderId(targetOrder._id);
    setShowScanModal(false);
    setScanResult(null);
    setScanCodeInput('');
    setTimeout(() => {
      handleOpenWorkflowModal();
    }, 150);
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

  // Format Helpers
  const formatTimeStr = (isoString) => {
    if (!isoString) return '11:38 AM';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '11:38 AM';
    }
  };

  const formatDateStr = (isoString) => {
    if (!isoString) return '2026-09-07';
    try {
      return new Date(isoString).toISOString().split('T')[0];
    } catch (_) {
      return '2026-09-07';
    }
  };

  // Display Sample ID helper
  const displaySampleId = currentOrder?.collectionSession?.sessionId || currentOrder?.activeSampleId || (verifiedSession?.sessionId) || 'SC-20260908-5106';

  return (
    <div className="h-[calc(100vh-4.5rem)] min-h-0 flex flex-col overflow-hidden font-sans text-slate-800 antialiased gap-3 pb-2 animate-fade-in">
      
      {/* Hidden File input for QR image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleQrFileSelected}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      {/* ── 1. HEADER SECTION ── */}
      <header className="shrink-0 bg-white rounded-3xl px-5 py-3.5 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row justify-between lg:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 shrink-0">
            <FlaskConical size={20} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
              <span>Sample Collection Desk</span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                Live Queue Active
              </span>
            </h1>
            <p className="text-xs font-medium text-slate-500 truncate">
              Sequential Specimen Collection: Patient Verification (Live Camera / Upload QR) → Sample ID → Barcode → Quantity → Lab Processing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Back to Lab Orders Button */}
          <button
            type="button"
            onClick={() => {
              if (selectedOrderId) {
                navigate(`/labs/orders/${selectedOrderId}`);
              } else {
                navigate('/labs/orders');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl transition cursor-pointer"
            id="desk-back-to-lab-orders-btn"
          >
            <ArrowLeft size={13} />
            <span>Back to Lab Orders</span>
          </button>

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
            <span className="text-xl font-black text-indigo-600 leading-tight block mt-0.5">{dashboardData.metrics.collectionInProgress ?? 1}</span>
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

      {/* ── 3. MAIN WORKSPACE (INDEPENDENT THREE-COLUMN CAPABLE LAYOUT) ── */}
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
                  placeholder="Search by patient name, order ID..."
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
                if (item.status === 'Waiting') statusBadgeClasses = 'bg-amber-50 text-amber-700 border-amber-300';
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
                    {/* Top Row: Session ID / Token, Order ID, Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono font-black text-[11px] rounded-lg shadow-2xs shrink-0">
                          {displaySampleId}
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

                    {/* Bottom Row: Badges (Home/Lab, Routine/STAT, Status) */}
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
        {/* CENTER + RIGHT: ORDER DETAILS & SAMPLE ACTIONS WORKSPACE  */}
        {/* ========================================================= */}
        <main className="flex-1 min-w-0 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col min-h-0 overflow-hidden">
          
          {currentOrder ? (
            <>
              {/* 1. Order Details Header (Fixed Top of Center Pane) */}
              <div className="shrink-0 p-4 border-b border-slate-100 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base font-black text-slate-900 tracking-tight">
                        Order Details: <span className="font-mono text-indigo-700">{currentOrder.orderNumber || 'LAB-20260907-0001'}</span>
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                        currentOrder.status === 'ordered'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        ● {getStatusDisplayLabel(currentOrder.status)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                        {currentOrder.status === 'sample_collected'
                          ? 'Collection: COMPLETED'
                          : 'Collection: IN PROGRESS'}
                      </span>
                      <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                        {displaySampleId}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Patient: <span className="text-slate-900 font-bold">{currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya'}</span> | Age: <span className="text-slate-800 font-bold">{currentOrder.patientId?.age ? `${currentOrder.patientId.age} yrs` : '29 yrs'}</span> | Gender: <span className="text-slate-800 font-bold">{currentOrder.patientId?.gender || 'female'}</span> | UHID: <span className="text-slate-800 font-bold">{currentOrder.patientId?.uhid || currentOrder.patientUhid || 'PAT-WALKIN'}</span>
                    </p>
                  </div>

                  {/* Metadata: Source, Collection Mode, Order Date, Payment Status, Priority */}
                  <div className="flex items-center gap-3 sm:text-right shrink-0 flex-wrap">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">SOURCE</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">
                        {currentOrder.source === 'PATIENT_PORTAL' || currentOrder.source === 'PATIENT_BOOKED' || currentOrder.bookingSource === 'PATIENT_PORTAL'
                          ? 'Created by Patient'
                          : 'Created at Lab'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">COLLECTION</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">
                        {currentOrder.collectionMode === 'HOME_COLLECTION' || currentOrder.collectionMethod === 'HOME_COLLECTION' ? 'Home Collection' : 'Lab Collection'}
                      </span>
                    </div>
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
                        {['PAID', 'paid', 'COMPLETED', 'completed'].includes(currentOrder.paymentStatus) ? '✓ PAID' : currentOrder.paymentStatus ? String(currentOrder.paymentStatus).toUpperCase() : 'PAID'}
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

                          {/* Timestamp / In Progress / Pending */}
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
                    <span>Investigations ({(currentOrder.tests || []).length || 3})</span>
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

              {/* 4. Tab Workspace Content (Independently Scrollable Center + Right) */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
                
                {/* ── TAB: INVESTIGATIONS ── */}
                {activeTab === 'investigations' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    
                    {/* Left Sub-Column: Banner + Ordered Investigations + Requirements (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      
                      {/* Step Action Banner (Matching Reference UI) */}
                      {activeStep === 1 && (
                        <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0 shadow-xs">
                              <FlaskConical size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-900">Sample Collection Initiated</h3>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Scan QR code (live camera or image upload) or enter OTP to verify patient and generate sample ID.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleOpenWorkflowModal}
                            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transform active:scale-95"
                            id="desk-banner-start-collection-btn"
                          >
                            <span>Start Sample Collection</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}

                      {activeStep >= 2 && (
                        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                                <span>Sample Collection Completed</span>
                                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                                  {displaySampleId}
                                </span>
                              </h3>
                              <p className="text-xs text-emerald-800 mt-0.5">
                                Specimen collected & registered. Transferred to laboratory processing workflow.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setPrintedSamples([{
                                  sampleId: displaySampleId,
                                  patientName: currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya',
                                  specimenType: selectedSampleType,
                                  quantity: `${collectedQuantity} ${collectedUnit}`,
                                  orderNumber: currentOrder.orderNumber,
                                  createdAt: new Date().toISOString()
                                }]);
                                setShowLabelModal(true);
                              }}
                              className="px-3.5 py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Printer size={13} />
                              <span>Print Label</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/labs/orders/${currentOrder._id}`)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>View in Lab Orders</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Section: Ordered Investigations */}
                      <div className="space-y-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Ordered Investigations ({(currentOrder.tests || []).length || 3})
                        </h3>

                        {/* List of Investigations Cards */}
                        {(currentOrder.tests && currentOrder.tests.length > 0) ? (
                          currentOrder.tests.map((test, tIdx) => {
                            const paramCount = test.parameters?.length || test.parameterCount || 1;
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
                                      <h4 className="text-xs font-black text-slate-900 truncate">{test.name || 'Investigation'}</h4>
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded">
                                        TEST
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                      {paramCount} {paramCount === 1 ? 'parameter' : 'parameters'} • Specimen: {test.specimenType || 'Blood'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                      {completedCount} / {paramCount} parameters completed
                                    </p>
                                  </div>
                                </div>

                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                  {test.status ? test.status.charAt(0).toUpperCase() + test.status.slice(1) : 'Ordered'}
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
                                    <h4 className="text-xs font-black text-slate-900">Alpha Test</h4>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded">TEST</span>
                                  </div>
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                    1 parameter • Specimen: Blood
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">0 / 1 parameters completed</p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                                Ordered
                              </span>
                            </div>

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
                                    1 parameter • Specimen: EDTA(3ml)
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">0 / 1 parameters completed</p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                                Ordered
                              </span>
                            </div>

                            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                                  <Droplet size={18} className="fill-rose-500/20" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black text-slate-900">T.L.C</h4>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded">TEST</span>
                                  </div>
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                    1 parameter • Specimen: EDTA(3ml)
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">0 / 1 parameters completed</p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                                Ordered
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
                              {selectedSampleType || 'Blood'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Container</span>
                            <span className="font-black text-slate-900 block mt-0.5">
                              EDTA Tube (Lavender)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Required Volume</span>
                            <span className="font-black text-slate-900 block mt-0.5">
                              {collectedQuantity} {collectedUnit}
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

                    {/* Right Sub-Column: Sample Collection Details + Sequential Quick Actions (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      
                      {/* Section: Sample Collection Details Card */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FlaskConical size={15} className="text-indigo-600" />
                            <h4 className="text-xs font-black text-slate-900">Sample Collection</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            activeStep >= 2
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {activeStep >= 2 ? 'In Progress' : 'In Progress'}
                          </span>
                        </div>

                        <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Sample ID</span>
                            <span className="font-mono font-black text-indigo-700">
                              {activeStep >= 2 || verifiedSession?.sessionId ? displaySampleId : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Sample Type</span>
                            <span className="font-bold text-slate-800">{selectedSampleType || 'Blood'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Expected Collection</span>
                            <span className="font-bold text-slate-800">
                              {formatDateStr(currentOrder.orderDate || currentOrder.createdAt)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Collected On</span>
                            <span className="font-bold text-slate-800">
                              {currentOrder.sampleCollectedAt ? new Date(currentOrder.sampleCollectedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Collected By</span>
                            <span className="font-bold text-slate-800">
                              {currentOrder.sampleCollectedByName || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Quantity Collected</span>
                            <span className="font-bold text-slate-800">
                              {activeStep >= 2 ? `${collectedQuantity} ${collectedUnit}` : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                            <span className={`font-black ${activeStep >= 2 ? 'text-emerald-700' : 'text-purple-700'}`}>
                              {activeStep >= 2 ? 'In Progress' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section: Quick Actions Card (Sequential Workflow Steps) */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={15} className="text-amber-500" />
                          <h4 className="text-xs font-black text-slate-900">Quick Actions</h4>
                        </div>

                        {/* If in ORDERED state: show sequential button list */}
                        {activeStep === 1 && (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={handleOpenWorkflowModal}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
                              id="desk-quick-action-start-btn"
                            >
                              <span>Start Sample Collection</span>
                              <ArrowRight size={13} />
                            </button>

                            <div className="space-y-1.5 pt-1">
                              <button
                                type="button"
                                disabled
                                className="w-full py-2 bg-slate-50 text-slate-400 border border-slate-200/60 rounded-xl text-xs font-bold flex items-center justify-start px-3 gap-2 cursor-not-allowed"
                              >
                                <Lock size={12} />
                                <span>Generate Sample ID</span>
                              </button>

                              <button
                                type="button"
                                disabled
                                className="w-full py-2 bg-slate-50 text-slate-400 border border-slate-200/60 rounded-xl text-xs font-bold flex items-center justify-start px-3 gap-2 cursor-not-allowed"
                              >
                                <Lock size={12} />
                                <span>Print Sample Label</span>
                              </button>

                              <button
                                type="button"
                                disabled
                                className="w-full py-2 bg-slate-50 text-slate-400 border border-slate-200/60 rounded-xl text-xs font-bold flex items-center justify-start px-3 gap-2 cursor-not-allowed"
                              >
                                <Lock size={12} />
                                <span>Enter Quantity Collected</span>
                              </button>

                              <button
                                type="button"
                                disabled
                                className="w-full py-2 bg-slate-50 text-slate-400 border border-slate-200/60 rounded-xl text-xs font-bold flex items-center justify-start px-3 gap-2 cursor-not-allowed"
                              >
                                <Lock size={12} />
                                <span>Mark Sample Collection Completed</span>
                              </button>
                            </div>

                            <p className="text-[10px] text-slate-400 text-center font-bold pt-1">
                              Sequential actions after verification
                            </p>
                          </div>
                        )}

                        {/* If in SAMPLE_COLLECTED state: show post-collection actions */}
                        {activeStep >= 2 && (
                          <div className="space-y-2.5">
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                              <div className="flex items-center gap-1.5 font-black text-emerald-800">
                                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                <span>Sample Collection Complete</span>
                              </div>
                              <p className="text-[11px] font-medium text-emerald-700">
                                Specimen collected and registered. Processing & results entry are managed in Lab Orders.
                              </p>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintedSamples([{
                                    sampleId: displaySampleId,
                                    patientName: currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya',
                                    specimenType: selectedSampleType,
                                    quantity: `${collectedQuantity} ${collectedUnit}`,
                                    orderNumber: currentOrder.orderNumber,
                                    createdAt: new Date().toISOString()
                                  }]);
                                  setShowLabelModal(true);
                                }}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                                id="desk-print-label-btn"
                              >
                                <Printer size={13} />
                                <span>Print Label</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(currentOrder.samples?.[0])}
                                className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                                id="desk-reject-sample-btn"
                              >
                                <AlertTriangle size={13} />
                                <span>Flag / Recollect</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => navigate(`/labs/orders/${currentOrder._id}`)}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-1"
                              id="desk-view-in-lab-orders-btn"
                            >
                              <span>🔬</span>
                              <span>View in Lab Orders →</span>
                            </button>
                          </div>
                        )}

                        {/* Need Assistance Card */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 pt-2 mt-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-800 font-black">
                            <HelpCircle size={14} className="text-indigo-600" />
                            <span>Need Assistance?</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Contact the lab manager or lead pathologist regarding specimens or results.
                          </p>
                          <button
                            type="button"
                            onClick={() => toast.info('Lab Manager on duty: Rajesh Sharma (Extension 204)')}
                            className="w-full py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-black hover:bg-slate-100 transition cursor-pointer"
                          >
                            🎧 Contact Manager
                          </button>
                        </div>
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
                        <span className="font-black text-slate-900 block mt-0.5">{currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">UHID / Patient ID</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">{currentOrder.patientId?.uhid || currentOrder.patientUhid || 'PAT-20260716-0001'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Age & Gender</span>
                        <span className="font-bold text-slate-900 block mt-0.5">29 yrs / female</span>
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
                            {displaySampleId}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Container</span>
                          <span className="font-bold text-slate-900 block mt-0.5">EDTA Tube (Lavender)</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Volume Collected</span>
                          <span className="font-bold text-slate-900 block mt-0.5">{collectedQuantity} {collectedUnit}</span>
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
                              setPrintedSamples([{
                                sampleId: displaySampleId,
                                patientName: currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya',
                                specimenType: selectedSampleType,
                                quantity: `${collectedQuantity} ${collectedUnit}`,
                                orderNumber: currentOrder.orderNumber,
                                createdAt: new Date().toISOString()
                              }]);
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

                    {/* Collection Attempts History */}
                    {Array.isArray(currentOrder.collectionAttempts) && currentOrder.collectionAttempts.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 text-xs">
                        <h4 className="font-black text-slate-900">Sample Collection History (Attempts)</h4>
                        <div className="space-y-2">
                          {currentOrder.collectionAttempts.map((att, aIdx) => (
                            <div key={aIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                              <div>
                                <span className="font-black text-indigo-700">Attempt #{att.attemptNumber || aIdx + 1}: {att.sessionId || att.sampleId}</span>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Quantity: {att.quantityCollected} {att.quantityUnit} • Verified via: {att.verificationMethod} • Staff: {att.collectedByName || 'Rajesh Sharma'}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                att.status === 'COLLECTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {att.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                          <span className="text-[10px] text-slate-400 font-bold">07 Sept 2026, 11:38 AM</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Order created via Patient Portal</p>
                      </div>

                      {activeStep >= 2 && (
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="font-black text-slate-900">Specimen Drawn & Collected ({displaySampleId})</span>
                            <span className="text-[10px] text-slate-400 font-bold">07 Sept 2026, 11:45 AM</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Quantity: {collectedQuantity} {collectedUnit} • Collected by Rajesh Sharma (Phlebotomist)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Footer Order Navigation (Fixed Bottom of Pane) */}
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

      {/* ========================================================================= */}
      {/* ── 4. SEQUENTIAL SPECIMEN COLLECTION MODAL (STEPS 1, 2, 3, 4) ──        */}
      {/* ========================================================================= */}
      {showWorkflowModal && currentOrder && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-5.5rem)] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {workflowStep === 1 && 'Verify Patient for Sample Collection'}
                  {workflowStep === 2 && 'Sample ID Generated'}
                  {workflowStep === 3 && 'Enter Collected Quantity'}
                  {workflowStep === 4 && 'Complete Sample Collection'}
                </h3>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await stopCameraScan();
                  setShowWorkflowModal(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4">
              
              {/* ── MODAL STEP 1: PATIENT VERIFICATION (QR / OTP) ── */}
              {workflowStep === 1 && (
                <div className="space-y-4">
                  {/* Verification Tabs: Scan QR Code / Enter OTP */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationMethod('QR');
                        setVerificationError(null);
                        setCameraError(null);
                      }}
                      className={`py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        verificationMethod === 'QR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <QrCode size={14} />
                      <span>Scan QR Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await stopCameraScan();
                        setVerificationMethod('OTP');
                        setVerificationError(null);
                        setCameraError(null);
                      }}
                      className={`py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        verificationMethod === 'OTP' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <KeyRound size={14} />
                      <span>Enter OTP</span>
                    </button>
                  </div>

                  {/* QR Option View */}
                  {verificationMethod === 'QR' && (
                    <div className="space-y-3">
                      
                      {/* Live Camera Active View */}
                      {isCameraActive ? (
                        <div className="space-y-3">
                          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-indigo-500 shadow-md">
                            {/* Live video container for Html5Qrcode */}
                            <div id="patient-qr-reader" className="w-full aspect-square max-h-72 mx-auto overflow-hidden flex items-center justify-center" />

                            {/* Scanning reticle overlay */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                              <div className="w-full flex justify-between items-center text-white/80 text-[10px] font-black uppercase tracking-wider bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                  Live Camera
                                </span>
                                <span>Align QR in box</span>
                              </div>

                              <div className="w-48 h-48 border-2 border-dashed border-emerald-400 rounded-2xl relative shadow-2xl">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                              </div>

                              <div className="bg-black/60 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                                Position patient QR code inside frame
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={stopCameraScan}
                              disabled={isVerifying}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Square size={13} className="fill-slate-700" />
                              <span>Stop Camera</span>
                            </button>

                            {cameraList.length > 1 && (
                              <button
                                type="button"
                                onClick={switchCamera}
                                disabled={isVerifying}
                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <SwitchCamera size={13} />
                                <span>Switch</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Camera Inactive: Show Scanner Box & Action Buttons */
                        <div className="space-y-3">
                          
                          {/* Image preview & Decoding State */}
                          {uploadedImagePreview ? (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                              <div className="text-left text-[11px] font-black text-slate-500 uppercase flex items-center justify-between">
                                <span>Selected QR Image</span>
                                <span className="font-mono text-slate-400 truncate max-w-[150px]">{uploadedFileName}</span>
                              </div>

                              <div className="w-32 h-32 mx-auto rounded-2xl border border-slate-200 overflow-hidden bg-white p-1.5 shadow-xs relative">
                                <img
                                  src={uploadedImagePreview}
                                  alt="Selected QR Image"
                                  className="w-full h-full object-contain rounded-xl"
                                />
                                {isDecodingFile && (
                                  <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white rounded-xl gap-1">
                                    <RefreshCw size={20} className="animate-spin text-white" />
                                    <span className="text-[10px] font-bold">Scanning...</span>
                                  </div>
                                )}
                              </div>

                              {/* Decoding indicator / Status */}
                              {isDecodingFile && (
                                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                                  <RefreshCw size={14} className="animate-spin text-indigo-600 shrink-0" />
                                  <span>{decodeStatusText || 'Scanning QR...'}</span>
                                </div>
                              )}

                              {/* QR Code Detected Card (During verification) */}
                              {!isDecodingFile && decodedQrText && isVerifying && (
                                <div className="p-4 bg-indigo-50/90 border border-indigo-200 rounded-2xl text-left space-y-2.5 animate-fade-in shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-indigo-950 font-black text-xs">
                                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                      <span>✓ QR Code Detected</span>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-bold">
                                      Decoded
                                    </span>
                                  </div>
                                  
                                  <div className="bg-white p-3 rounded-xl border border-indigo-100 text-xs space-y-1.5 shadow-2xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500 font-bold">Patient:</span>
                                      <span className="font-black text-slate-900">{currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500 font-bold">Order ID:</span>
                                      <span className="font-mono font-black text-indigo-700">{currentOrder.orderNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500 font-bold">Collection Session:</span>
                                      <span className="font-mono font-bold text-slate-800">{verifiedSession?.sessionId || displaySampleId}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                                      <span className="text-slate-500 font-bold">Verification:</span>
                                      <span className="font-black text-indigo-600 flex items-center gap-1.5">
                                        <RefreshCw size={12} className="animate-spin" />
                                        Verifying...
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Button to change image */}
                              {!isDecodingFile && !isVerifying && (
                                <div className="flex justify-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={handleUploadQrClick}
                                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <UploadCloud size={13} className="text-indigo-600" />
                                    <span>Change Image</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={startCameraScan}
                                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <Camera size={13} className="text-indigo-600" />
                                    <span>Use Camera</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Clean Initial State */
                            <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-3.5">
                              <div className="space-y-1.5">
                                <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 mx-auto flex items-center justify-center text-indigo-600 shadow-2xs">
                                  <QrCode size={28} />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-900">Scan Patient QR Code</h4>
                                  <p className="text-[11px] text-slate-500">
                                    Use device camera or upload patient QR code image.
                                  </p>
                                </div>
                              </div>

                              {/* Camera / Upload buttons */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={startCameraScan}
                                  disabled={isDecodingFile || isVerifying}
                                  className="py-2.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 disabled:opacity-50"
                                  id="use-camera-btn"
                                >
                                  <Camera size={14} />
                                  <span>Use Camera</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleUploadQrClick}
                                  disabled={isDecodingFile || isVerifying}
                                  className="py-2.5 px-3.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                  id="upload-qr-image-btn"
                                >
                                  <UploadCloud size={14} className="text-indigo-600" />
                                  <span>Upload QR Image</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Specific Error Presentation Cards */}
                          {verificationErrorType === 'MISMATCH' && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-2.5 animate-fade-in">
                              <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                                <span>⚠ QR Code Does Not Match</span>
                              </div>
                              <p className="text-xs text-amber-900 font-medium">
                                This QR code belongs to another laboratory order.
                              </p>
                              <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-bold">Current Order:</span>
                                  <span className="font-mono font-black text-slate-900">{currentOrder.orderNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500 font-bold">Patient:</span>
                                  <span className="font-bold text-slate-900">{currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya'}</span>
                                </div>
                              </div>
                              <p className="text-[11px] text-amber-800">
                                Please scan the QR code generated for this patient/order.
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleUploadQrClick}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <UploadCloud size={13} />
                                  <span>Upload Another QR</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={startCameraScan}
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Camera size={13} />
                                  <span>Use Camera</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerificationMethod('OTP');
                                    setVerificationError(null);
                                    setVerificationErrorType(null);
                                  }}
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <KeyRound size={13} />
                                  <span>Enter OTP</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {verificationErrorType === 'EXPIRED' && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-left space-y-2.5 animate-fade-in">
                              <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                                <Clock size={16} className="text-rose-600 shrink-0" />
                                <span>QR Code Expired</span>
                              </div>
                              <p className="text-xs text-rose-900 font-medium">
                                This collection QR is no longer valid.
                              </p>
                              <p className="text-[11px] text-rose-700">
                                Please generate/use the latest collection QR for this order.
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleUploadQrClick}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <UploadCloud size={13} />
                                  <span>Try Another QR</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerificationMethod('OTP');
                                    setVerificationError(null);
                                    setVerificationErrorType(null);
                                  }}
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <KeyRound size={13} />
                                  <span>Enter OTP</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {verificationErrorType === 'INVALID' && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-left space-y-2.5 animate-fade-in">
                              <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                <span>Invalid QR Code</span>
                              </div>
                              <p className="text-xs text-rose-900 font-medium">
                                This QR code is not associated with an AICMS laboratory collection.
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleUploadQrClick}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <UploadCloud size={13} />
                                  <span>Upload Another Image</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={startCameraScan}
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Camera size={13} />
                                  <span>Use Camera</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerificationMethod('OTP');
                                    setVerificationError(null);
                                    setVerificationErrorType(null);
                                  }}
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <KeyRound size={13} />
                                  <span>Enter OTP</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {verificationErrorType === 'UNREADABLE' && (
                            <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl text-left space-y-3 animate-fade-in">
                              <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
                                <AlertCircle size={16} className="text-slate-600 shrink-0" />
                                <span>Unable to read QR code</span>
                              </div>
                              <p className="text-xs text-slate-700 font-medium">
                                We couldn't detect a readable QR code in this image.
                              </p>
                              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                                <p className="font-bold text-slate-700 text-[11px]">Try:</p>
                                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                                  <li>Uploading the complete QR</li>
                                  <li>Using a clearer screenshot</li>
                                  <li>Avoiding glare/reflections</li>
                                  <li>Uploading the original QR image</li>
                                </ul>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleUploadQrClick}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <UploadCloud size={13} />
                                  <span>Upload Another Image</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={startCameraScan}
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Camera size={13} />
                                  <span>Use Camera</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerificationMethod('OTP');
                                    setVerificationError(null);
                                    setVerificationErrorType(null);
                                  }}
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <KeyRound size={13} />
                                  <span>Enter OTP</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Camera Error / Permission Notice */}
                          {cameraError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs space-y-1 text-left">
                              <div className="flex items-center gap-1.5 font-black text-rose-800">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>Camera Notice</span>
                              </div>
                              <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                                {cameraError}
                              </p>
                              <div className="pt-1 flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleUploadQrClick}
                                  className="text-[11px] font-black text-indigo-700 underline cursor-pointer"
                                >
                                  Upload QR image instead →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        OR VERIFY DIRECTLY
                      </div>

                      {/* Manual / Auto-filled QR Verification Form */}
                      <form onSubmit={handleVerifyPatient} className="space-y-3">
                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                            Patient Verification Code / Order ID
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. LAB-20260907-0001"
                            value={qrInput}
                            onChange={(e) => setQrInput(e.target.value)}
                            disabled={isVerifying || isDecodingFile}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 disabled:opacity-50"
                          />
                        </div>

                        {verificationError && !verificationErrorType && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{verificationError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isVerifying || isDecodingFile}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <ShieldCheck size={14} />
                          <span>{isVerifying ? 'Verifying Patient...' : 'Verify Patient'}</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* OTP Option View */}
                  {verificationMethod === 'OTP' && (
                    <form onSubmit={handleVerifyPatient} className="space-y-3">
                      <div>
                        <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                          Enter 6-digit OTP
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="______"
                            autoFocus
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            disabled={isVerifying}
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center tracking-widest text-base font-black text-slate-900 placeholder-slate-300 outline-none focus:bg-white focus:border-indigo-500 disabled:opacity-50"
                          />
                          <button
                            type="submit"
                            disabled={isVerifying}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <ShieldCheck size={14} />
                            <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Hint: Default demo OTP is <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">123456</code>
                        </p>
                      </div>

                      {verificationError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{verificationError}</span>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* ── MODAL STEP 2: SAMPLE ID GENERATED & BARCODE ── */}
              {workflowStep === 2 && (
                <div className="space-y-4">
                  {/* Verified Header Badge */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-xs">
                      <Check size={20} className="stroke-[3]" />
                    </div>
                    <h4 className="text-xs font-black text-emerald-950 pt-1">✓ Patient Verified</h4>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Sample ID and collection barcode generated successfully.
                    </p>
                  </div>

                  {/* Patient & Order Details Card */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Patient:</span>
                      <span className="font-black text-slate-900">{currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya'}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Order:</span>
                      <span className="font-mono font-black text-indigo-700">{currentOrder.orderNumber}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Collection:</span>
                      <span className="font-bold text-slate-800">{currentOrder.collectionType || 'In-Clinic Collection'}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Verified via:</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[11px]">
                        {verificationMethod === 'OTP' ? 'OTP Verification' : 'QR Code'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600">Sample ID</span>
                      <span className="font-mono font-black text-indigo-700 text-sm">
                        {verifiedSession?.sessionId || displaySampleId}
                      </span>
                    </div>

                    {/* Barcode Display */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-1 shadow-2xs">
                      <div className="h-8 flex items-center justify-center text-slate-900 font-mono font-bold text-lg tracking-widest select-none">
                        |||||| || ||||||| ||||
                      </div>
                      <div className="font-mono text-xs font-black text-slate-800">
                        {verifiedSession?.sessionId || displaySampleId}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintedSamples([{
                          sampleId: verifiedSession?.sessionId || displaySampleId,
                          patientName: currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya',
                          specimenType: selectedSampleType,
                          quantity: `${collectedQuantity} ${collectedUnit}`,
                          orderNumber: currentOrder.orderNumber,
                          createdAt: new Date().toISOString()
                        }]);
                        setShowLabelModal(true);
                      }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Printer size={14} />
                      <span>Print Label</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStep2Next}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Continue Sample Collection</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── MODAL STEP 3: ENTER COLLECTED QUANTITY ── */}
              {workflowStep === 3 && (
                <form onSubmit={handleStep3Next} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600 block mb-1">
                      Sample Type *
                    </label>
                    <select
                      value={selectedSampleType}
                      onChange={(e) => setSelectedSampleType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Blood">Blood</option>
                      <option value="EDTA Whole Blood">EDTA Whole Blood</option>
                      <option value="Serum">Serum</option>
                      <option value="Plasma">Plasma</option>
                      <option value="Urine">Urine</option>
                      <option value="Sputum">Sputum</option>
                      <option value="Stool">Stool</option>
                      <option value="Swab">Swab</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-600 block mb-1">
                        Quantity Collected *
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        required
                        value={collectedQuantity}
                        onChange={(e) => setCollectedQuantity(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-600 block mb-1">
                        Unit *
                      </label>
                      <select
                        value={collectedUnit}
                        onChange={(e) => setCollectedUnit(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="mL">mL</option>
                        <option value="tube">tube</option>
                        <option value="container">container</option>
                        <option value="drops">drops</option>
                        <option value="mg">mg</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600 block mb-1">
                      Collection Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Left median cubital vein, clean draw"
                      value={collectionNotesInput}
                      onChange={(e) => setCollectionNotesInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWorkflowStep(2)}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Next: Confirm Collection</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              )}

              {/* ── MODAL STEP 4: COMPLETE CONFIRMATION ── */}
              {workflowStep === 4 && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-950 font-bold">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <div>
                      <span>Mark the sample collection as completed.</span>
                      <p className="text-[11px] text-emerald-800 font-normal">
                        This will update the order status to Sample Collected.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Patient:</span>
                      <span className="font-black text-slate-900">{currentOrder.patientId?.fullName || currentOrder.patientName || 'vidya'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Sample ID:</span>
                      <span className="font-mono font-black text-indigo-700">{verifiedSession?.sessionId || displaySampleId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Sample Type:</span>
                      <span className="font-bold text-slate-900">{selectedSampleType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Quantity Collected:</span>
                      <span className="font-bold text-slate-900">{collectedQuantity} {collectedUnit}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Once completed, this sample will be transferred to the laboratory processing workflow.
                  </p>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWorkflowStep(3)}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      disabled={isSubmittingCollection}
                      onClick={handleFinalizeCompleteCollection}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      <span>{isSubmittingCollection ? 'Completing...' : 'Sample Collection Completed'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REQUEST RECOLLECTION / REJECT SAMPLE ── */}
      {showRejectModal && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-5.5rem)] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                  Sample Quality Rejection
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Request Sample Recollection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-900 font-bold space-y-1">
                <div className="flex items-center gap-1.5 font-black text-rose-800">
                  <AlertTriangle size={15} />
                  <span>Important: Full Audit Trail Preserved</span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed">
                  The current sample will be marked as <strong className="text-rose-900">REJECTED</strong>. The order ID <strong className="text-rose-900 font-mono">{currentOrder.orderNumber}</strong> remains intact and moves to Recollection Required.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Reason for Rejection / Recollection *
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                >
                  <option value="Insufficient quantity">Insufficient quantity</option>
                  <option value="Hemolysed sample">Hemolysed sample</option>
                  <option value="Incorrect container">Incorrect container</option>
                  <option value="Improper specimen">Improper specimen</option>
                  <option value="Sample contaminated">Sample contaminated</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Technician Notes / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Redraw minimum 3ml whole blood in lavender EDTA tube."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-rose-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={rejecting}
                onClick={handleConfirmRejectSample}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle size={14} />
                <span>{rejecting ? 'Flagging Recollection...' : 'Confirm Sample Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PRINTABLE BARCODE LABELS ── */}
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
                    <span>AICMS / PEHAL Laboratory</span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-center py-2 bg-white rounded-xl border border-slate-200">
                    <div className="text-xl font-black tracking-widest text-slate-900">{sample.sampleId || displaySampleId}</div>
                    <div className="h-5 flex items-center justify-center text-slate-400 font-bold text-xs tracking-widest">
                      ||| | | |||| || | ||| |||| |
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
                    <div>
                      <span className="text-slate-400">Patient: </span>
                      <span>{sample.patientName || currentOrder?.patientId?.fullName || 'vidya'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Specimen: </span>
                      <span>{sample.specimenType || selectedSampleType || 'Blood'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Tube: </span>
                      <span>EDTA (Lavender)</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Order: </span>
                      <span>{sample.orderNumber || currentOrder?.orderNumber || 'LAB-20260907-0001'}</span>
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

      {/* ── MODAL: UNIVERSAL SCANNER LOOKUP ── */}
      {showScanModal && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-5.5rem)] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <Scan size={18} className="text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Scan QR / Barcode Verification</h3>
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
                  Scan Patient QR Code, Sample Barcode, Order ID, or Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. LAB-20260907-0001, SC-20260908-5106, T-021"
                    value={scanCodeInput}
                    onChange={(e) => setScanCodeInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={scanLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    {scanLoading ? 'Searching...' : 'Lookup / Verify'}
                  </button>
                </div>
              </form>

              {scanResult && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span className="font-black text-slate-900 uppercase text-xs tracking-wider">Verify Collection</span>
                    </div>
                  </div>

                  {scanResult.order && (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Order Number</span>
                          <span className="font-mono font-black text-indigo-700">{scanResult.order.orderNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Patient Name</span>
                          <span className="font-black text-slate-900">
                            {scanResult.order.patientId?.fullName || scanResult.patient?.fullName || 'vidya'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {scanResult.order && (
                      <button
                        type="button"
                        onClick={() => handleVerifyAndStartCollection(scanResult.order)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>Verify & Start Collection</span>
                      </button>
                    )}
                  </div>
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

      {/* ── MODAL: PUBLIC TOKEN DISPLAY ── */}
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
