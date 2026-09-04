import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Search, Scan, RefreshCw, Barcode, CheckCircle2,
  AlertTriangle, Clock, Users, ChevronRight, X, Printer, Eye,
  Play, RotateCcw, SkipForward, Truck, Check, AlertCircle,
  FileText, ShieldCheck, MapPin, Phone, UserCheck, Calendar,
  ArrowRight, ShieldAlert, Sparkles, Filter, ChevronDown, CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { labApi, patientApi, doctorApi } from '../../lib/api';

const SampleCollectionDesk = ({ laboratoryId, clinicId, user }) => {
  // Active state & filters
  const [activeSubTab, setActiveSubTab] = useState('queue'); // 'queue', 'orders', 'home', 'collected'
  const [selectedDesk, setSelectedDesk] = useState('Desk 1');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Data
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
    desks: ['Desk 1', 'Desk 2', 'Desk 3', 'Phlebotomy Room A', 'Phlebotomy Room B']
  });

  const [collectedSamplesList, setCollectedSamplesList] = useState([]);

  // Modals state
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedOrderForCollection, setSelectedOrderForCollection] = useState(null);
  const [specimenRequirements, setSpecimenRequirements] = useState(null);
  const [checklistState, setChecklistState] = useState({});
  const [collectionNotes, setCollectionNotes] = useState('');
  const [collecting, setCollecting] = useState(false);

  // Label Printing Modal
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [printedSamples, setPrintedSamples] = useState([]);

  // Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSampleForReject, setSelectedSampleForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('Insufficient Volume');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // QR / Barcode Scanner Modal
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Public Token Display Modal
  const [showPublicDisplay, setShowPublicDisplay] = useState(false);
  const [publicDisplayData, setPublicDisplayData] = useState(null);

  // Timeline Modal
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Home Collection Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedHomeTask, setSelectedHomeTask] = useState(null);
  const [collectorNameInput, setCollectorNameInput] = useState('Rajesh Sharma (Phlebotomist)');
  const [collectorPhoneInput, setCollectorPhoneInput] = useState('+91 98765 43210');
  const [assigningCollector, setAssigningCollector] = useState(false);

  // Home Sample Receive Modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedTaskForReceive, setSelectedTaskForReceive] = useState(null);
  const [receiveCondition, setReceiveCondition] = useState('GOOD');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receivingSample, setReceivingSample] = useState(false);

  const effectiveLabId = laboratoryId || user?.providerId || '';
  const effectiveClinicId = clinicId || user?.clinicId || user?.clinic?._id || '';

  // Fetch Dashboard Queue & Stats
  const loadQueueDashboard = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await labApi.getCollectionQueue({
        clinicId: effectiveClinicId,
        laboratoryId: effectiveLabId,
        date: new Date().toISOString().split('T')[0]
      });

      const payload = res?.data || res;
      if (payload) {
        setDashboardData({
          metrics: payload.metrics || {
            awaitingCollection: 0,
            tokensWaiting: 0,
            collectionInProgress: 0,
            samplesCollected: 0,
            homeCollections: 0,
            recollectionRequired: 0
          },
          currentToken: payload.currentToken || null,
          tokens: payload.tokens || [],
          todayOrders: payload.todayOrders || [],
          homeTasks: payload.homeTasks || [],
          desks: payload.desks || ['Desk 1', 'Desk 2', 'Desk 3', 'Phlebotomy Room A', 'Phlebotomy Room B']
        });
      }
    } catch (err) {
      console.error('Failed to load collection queue:', err);
      toast.error('Unable to refresh sample collection queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQueueDashboard();
  }, [effectiveClinicId, effectiveLabId]);

  // Handle Token Calling
  const handleCallToken = async (tokenId) => {
    try {
      const res = await labApi.callToken(tokenId, { deskNumber: selectedDesk });
      toast.success(res?.message || 'Token called to desk!');
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to call token');
    }
  };

  const handleRecallToken = async (tokenId) => {
    try {
      const res = await labApi.recallToken(tokenId, { deskNumber: selectedDesk });
      toast.success(res?.message || 'Token recalled!');
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to recall token');
    }
  };

  const handleSkipToken = async (tokenId) => {
    try {
      const res = await labApi.skipToken(tokenId);
      toast.success(res?.message || 'Token marked as skipped');
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to skip token');
    }
  };

  // Generate Token for Order / Patient
  const handleGenerateTokenForOrder = async (order) => {
    try {
      const res = await labApi.generateToken({
        clinicId: effectiveClinicId,
        laboratoryId: effectiveLabId,
        orderId: order._id,
        patientId: order.patientId?._id || order.patientId,
        deskNumber: selectedDesk,
        priority: order.priority || 'routine'
      });
      const token = res?.data?.token || res?.token;
      toast.success(`Token ${token?.tokenNumber || 'generated'} created successfully!`);
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate token');
    }
  };

  // Start Collection Workflow
  const handleOpenCollectionModal = async (order) => {
    if (!order) return;
    try {
      setSelectedOrderForCollection(order);
      setCollectionNotes('');
      setChecklistState({});
      setCollecting(false);

      const res = await labApi.getRequiredSamples(order._id, { clinicId: effectiveClinicId });
      const data = res?.data || res;
      setSpecimenRequirements(data);
      setShowCollectModal(true);
    } catch (err) {
      console.error('Failed to calculate required specimens:', err);
      toast.error('Could not compute specimen requirements for this order.');
    }
  };

  // Confirm Collection & Generate Sample IDs
  const handleConfirmCollection = async () => {
    if (!specimenRequirements || !selectedOrderForCollection) return;

    // Check checklist items
    const checklist = specimenRequirements.checklist || [];
    const allChecked = checklist.every(item => !item.required || checklistState[item.id]);

    if (!allChecked) {
      toast.error('Please verify and confirm all mandatory safety checklist items.');
      return;
    }

    try {
      setCollecting(true);
      const res = await labApi.collectOrderSamples(selectedOrderForCollection._id, {
        specimens: specimenRequirements.requiredSpecimens || [],
        deskNumber: selectedDesk,
        notes: collectionNotes
      });

      const createdSamples = res?.data?.samples || res?.samples || [];
      toast.success(`Collected ${createdSamples.length} specimen(s) successfully!`);

      setShowCollectModal(false);
      setPrintedSamples(createdSamples);
      setShowLabelModal(true);
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record sample collection');
    } finally {
      setCollecting(false);
    }
  };

  // Reject Sample
  const handleOpenRejectModal = (sample) => {
    setSelectedSampleForReject(sample);
    setRejectReason('Insufficient Volume');
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedSampleForReject) return;
    try {
      setRejecting(true);
      await labApi.rejectSample(selectedSampleForReject._id || selectedSampleForReject.sampleId, {
        reason: rejectReason,
        notes: rejectNotes
      });
      toast.success('Sample marked as rejected. Order flagged for recollection.');
      setShowRejectModal(false);
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject sample');
    } finally {
      setRejecting(false);
    }
  };

  // Recollect Sample
  const handleRecollectSample = async (sample) => {
    try {
      const res = await labApi.recollectSample(sample._id || sample.sampleId, {
        deskNumber: selectedDesk,
        notes: 'Recollection recorded at collection desk'
      });
      const newSample = res?.data?.sample || res?.sample;
      toast.success(`Recollected sample generated with ID ${newSample?.sampleId || ''}`);
      setPrintedSamples([newSample]);
      setShowLabelModal(true);
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to recollect sample');
    }
  };

  // Open Sample Timeline
  const handleViewTimeline = async (sampleOrOrder) => {
    try {
      setLoadingTimeline(true);
      setShowTimelineModal(true);
      const isSample = Boolean(sampleOrOrder?.sampleId);
      const params = isSample
        ? { sampleId: sampleOrOrder._id || sampleOrOrder.sampleId }
        : { orderId: sampleOrOrder._id };

      const res = await labApi.getSampleTimeline(params);
      setTimelineData(res?.data || res);
    } catch (err) {
      toast.error('Failed to load sample audit timeline');
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Handle Universal QR / Barcode Scan Lookup
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

  // Home Collection Handlers
  const handleAssignCollector = async () => {
    if (!selectedHomeTask) return;
    try {
      setAssigningCollector(true);
      await labApi.assignHomeCollector(selectedHomeTask._id, {
        collectorId: user?._id,
        collectorName: collectorNameInput,
        collectorPhone: collectorPhoneInput
      });
      toast.success('Collector assigned successfully');
      setShowAssignModal(false);
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign collector');
    } finally {
      setAssigningCollector(false);
    }
  };

  const handleUpdateHomeTaskStatus = async (taskId, status) => {
    try {
      await labApi.updateHomeCollectionStatus(taskId, { status });
      toast.success(`Home collection status updated to ${status}`);
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleReceiveHomeSample = async () => {
    if (!selectedTaskForReceive) return;
    try {
      setReceivingSample(true);
      await labApi.receiveHomeCollection(selectedTaskForReceive._id, {
        sampleCondition: receiveCondition,
        notes: receiveNotes
      });
      toast.success('Home collection sample received at laboratory!');
      setShowReceiveModal(false);
      loadQueueDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record sample intake');
    } finally {
      setReceivingSample(false);
    }
  };

  // Filtered Tokens
  const filteredTokens = useMemo(() => {
    return dashboardData.tokens.filter(token => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (token.tokenNumber || '').toLowerCase().includes(q) ||
        (token.patientName || '').toLowerCase().includes(q) ||
        (token.orderNumber || '').toLowerCase().includes(q) ||
        (token.testsSummary || '').toLowerCase().includes(q);

      const matchPriority =
        priorityFilter === 'ALL' ||
        (token.priority || 'routine').toLowerCase() === priorityFilter.toLowerCase();

      return matchSearch && matchPriority;
    });
  }, [dashboardData.tokens, searchQuery, priorityFilter]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return dashboardData.todayOrders.filter(order => {
      const q = searchQuery.toLowerCase();
      const pName = order.patientId?.fullName || `${order.patientId?.firstName || ''} ${order.patientId?.lastName || ''}`;
      const matchSearch =
        !q ||
        (order.orderNumber || '').toLowerCase().includes(q) ||
        pName.toLowerCase().includes(q) ||
        (order.tokenNumber || '').toLowerCase().includes(q);

      return matchSearch;
    });
  }, [dashboardData.todayOrders, searchQuery]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in font-sans text-slate-800">
      {/* ── HEADER WITH DESK SELECTOR & QUICK ACTIONS ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FlaskConical size={22} className="stroke-[2.5]" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Sample Collection & Phlebotomy Desk
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Queue Active
                </span>
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Manage patient check-in, token queue, specimen calculation, barcode labeling, and home collection intake
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Desk Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 gap-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Desk:</span>
            <select
              value={selectedDesk}
              onChange={(e) => setSelectedDesk(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer"
            >
              {dashboardData.desks.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setScanCodeInput('');
              setScanResult(null);
              setShowScanModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-2xl shadow-sm transition transform active:scale-95"
          >
            <Scan size={15} />
            <span>Scan QR / Barcode</span>
          </button>

          <button
            onClick={handleOpenPublicDisplay}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl shadow-sm transition transform active:scale-95"
          >
            <Eye size={15} />
            <span>Public Token Display</span>
          </button>

          <button
            onClick={() => loadQueueDashboard(true)}
            disabled={refreshing}
            className="p-2 border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Live Queue"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* ── SUMMARY METRICS CARDS (REAL DATA ONLY) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Awaiting Collection</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{dashboardData.metrics.awaitingCollection}</span>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock size={16} />
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Tokens Waiting</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600">{dashboardData.metrics.tokensWaiting}</span>
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
              <Users size={16} />
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">In Progress</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-600">{dashboardData.metrics.collectionInProgress}</span>
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Play size={16} />
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Samples Collected</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{dashboardData.metrics.samplesCollected}</span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Home Collections</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-600">{dashboardData.metrics.homeCollections}</span>
            <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
              <Truck size={16} />
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Recollection Needed</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600">{dashboardData.metrics.recollectionRequired}</span>
            <span className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
              <RotateCcw size={16} />
            </span>
          </div>
        </div>
      </div>

      {/* ── CURRENT SERVING / CALLER PANEL ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Currently Serving at {selectedDesk}
          </span>
          {dashboardData.currentToken ? (
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-black tracking-tight text-white font-mono bg-white/10 px-4 py-1 rounded-2xl border border-white/15">
                {dashboardData.currentToken.tokenNumber}
              </span>
              <div>
                <p className="text-sm font-black text-slate-100">{dashboardData.currentToken.patientName}</p>
                <p className="text-xs text-indigo-200">{dashboardData.currentToken.testsSummary || 'Lab Investigations'}</p>
              </div>
            </div>
          ) : (
            <div className="py-1">
              <span className="text-2xl font-black text-slate-300">No token currently called</span>
              <p className="text-xs text-slate-400 mt-0.5">Click 'Call Next Token' below to serve the next patient in line</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dashboardData.tokens.find(t => t.status === 'WAITING') && (
            <button
              onClick={() => {
                const nextWaiting = dashboardData.tokens.find(t => t.status === 'WAITING');
                if (nextWaiting) handleCallToken(nextWaiting._id);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-2xl shadow transition transform active:scale-95"
            >
              <Play size={15} className="fill-slate-950" />
              <span>Call Next Token</span>
            </button>
          )}

          {dashboardData.currentToken && (
            <>
              <button
                onClick={() => handleRecallToken(dashboardData.currentToken._id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-2xl border border-white/20 transition"
              >
                <RotateCcw size={14} />
                <span>Recall</span>
              </button>

              <button
                onClick={() => handleSkipToken(dashboardData.currentToken._id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-2xl border border-white/20 transition"
              >
                <SkipForward size={14} />
                <span>Skip</span>
              </button>

              <button
                onClick={() => {
                  const ord = dashboardData.todayOrders.find(o => String(o._id) === String(dashboardData.currentToken.orderId?._id || dashboardData.currentToken.orderId));
                  if (ord) handleOpenCollectionModal(ord);
                  else if (dashboardData.currentToken.orderId) handleOpenCollectionModal(dashboardData.currentToken.orderId);
                  else toast.error('No linked order found for this token');
                }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black rounded-2xl shadow transition transform active:scale-95"
              >
                <FlaskConical size={15} />
                <span>Collect Samples Now</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── NAVIGATION TABS & SEARCH / PRIORITY FILTERS ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('queue')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition ${
              activeSubTab === 'queue'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Today's Queue ({dashboardData.tokens.length})
          </button>

          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition ${
              activeSubTab === 'orders'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Awaiting Orders ({dashboardData.todayOrders.length})
          </button>

          <button
            onClick={() => setActiveSubTab('home')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition ${
              activeSubTab === 'home'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Home Collections ({dashboardData.homeTasks.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search token, patient, order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-500 w-52 sm:w-64"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">STAT</option>
          </select>
        </div>
      </div>

      {/* ── TAB 1: TODAY'S TOKEN QUEUE ── */}
      {activeSubTab === 'queue' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredTokens.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                <Users size={24} />
              </div>
              <h3 className="text-sm font-black text-slate-800">No patients waiting in queue today</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Patients who arrive at the laboratory can have a token generated from the 'Awaiting Orders' tab.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Token</th>
                    <th className="py-3.5 px-4">Patient & Order</th>
                    <th className="py-3.5 px-4">Investigations</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Desk</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {filteredTokens.map((token) => {
                    const isCalled = token.status === 'CALLED' || token.status === 'IN_COLLECTION';
                    const isCollected = token.status === 'COLLECTED';
                    const isWaiting = token.status === 'WAITING';

                    return (
                      <tr key={token._id} className={`hover:bg-slate-50/80 transition ${isCalled ? 'bg-indigo-50/30' : ''}`}>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-xl font-mono font-black text-xs border ${
                              isCalled
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm animate-pulse'
                                : isCollected
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {token.tokenNumber}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-slate-900 font-black text-xs">{token.patientName || 'Walk-in Patient'}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{token.patientPhone || 'No Phone'}</span>
                            {token.orderNumber && (
                              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-bold">
                                {token.orderNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                          {token.testsSummary || 'General Investigations'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              token.priority === 'stat'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : token.priority === 'urgent'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {token.priority || 'Routine'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-bold">{token.deskNumber || 'Desk 1'}</td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                              isCalled
                                ? 'bg-indigo-100 text-indigo-800'
                                : isCollected
                                ? 'bg-emerald-100 text-emerald-800'
                                : isWaiting
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {token.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {isWaiting && (
                              <button
                                onClick={() => handleCallToken(token._id)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition"
                              >
                                Call to {selectedDesk}
                              </button>
                            )}

                            {isCalled && (
                              <button
                                onClick={() => {
                                  const ord = dashboardData.todayOrders.find(
                                    (o) => String(o._id) === String(token.orderId?._id || token.orderId)
                                  );
                                  if (ord) handleOpenCollectionModal(ord);
                                  else if (token.orderId) handleOpenCollectionModal(token.orderId);
                                  else toast.error('No linked order found');
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                              >
                                Collect Sample
                              </button>
                            )}

                            <button
                              onClick={() => handleViewTimeline(token)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                              title="Audit Timeline"
                            >
                              <Clock size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: AWAITING ORDERS TABLE ── */}
      {activeSubTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                <FileText size={24} />
              </div>
              <h3 className="text-sm font-black text-slate-800">No laboratory orders scheduled for collection today</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Orders booked online or through doctors will appear here ready for token generation and collection.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">Collection Method</th>
                    <th className="py-3.5 px-4">Tests Included</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {filteredOrders.map((order) => {
                    const pName =
                      order.patientId?.fullName ||
                      `${order.patientId?.firstName || ''} ${order.patientId?.lastName || ''}`.trim() ||
                      order.guestPatient?.fullName ||
                      'Walk-in Patient';

                    return (
                      <tr key={order._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-black text-indigo-600">
                          {order.orderNumber}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-slate-900 font-black">{pName}</p>
                          <p className="text-[10px] text-slate-400">{order.patientId?.phone || order.guestPatient?.phone || 'No phone'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              order.collectionMethod === 'HOME_COLLECTION'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {order.collectionMethod === 'HOME_COLLECTION' ? 'Home Collection' : 'At Laboratory'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {order.tests?.length || 0} Test(s)
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                            {order.orderStatus || order.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {!order.tokenNumber && (
                              <button
                                onClick={() => handleGenerateTokenForOrder(order)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition"
                              >
                                Generate Token
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenCollectionModal(order)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition"
                            >
                              Collect Sample
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: HOME COLLECTIONS LOGISTICS ── */}
      {activeSubTab === 'home' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {dashboardData.homeTasks.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                <Truck size={24} />
              </div>
              <h3 className="text-sm font-black text-slate-800">No home collections scheduled for today</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Orders with home sample collection selected by patients will appear here for dispatch and logistics tracking.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Task ID</th>
                    <th className="py-3.5 px-4">Patient & Address</th>
                    <th className="py-3.5 px-4">Slot</th>
                    <th className="py-3.5 px-4">Collector</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {dashboardData.homeTasks.map((task) => (
                    <tr key={task._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-black text-purple-600">
                        {task.taskId || task.orderNumber}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-900 font-black">{task.patientName}</p>
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                          {[task.collectionAddress?.line1, task.collectionAddress?.city, task.collectionAddress?.pincode].filter(Boolean).join(', ')}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-bold">
                        {task.slot || '10:00 AM - 11:00 AM'}
                      </td>

                      <td className="py-3.5 px-4">
                        {task.collectorName ? (
                          <div>
                            <p className="text-slate-800 font-bold">{task.collectorName}</p>
                            <p className="text-[10px] text-slate-400">{task.collectorPhone}</p>
                          </div>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-black">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            task.status === 'RECEIVED_AT_LAB'
                              ? 'bg-emerald-100 text-emerald-800'
                              : task.status === 'COLLECTED'
                              ? 'bg-blue-100 text-blue-800'
                              : task.status === 'ASSIGNED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!task.collectorId && (
                            <button
                              onClick={() => {
                                setSelectedHomeTask(task);
                                setShowAssignModal(true);
                              }}
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-black transition"
                            >
                              Assign Collector
                            </button>
                          )}

                          {task.status === 'ASSIGNED' && (
                            <button
                              onClick={() => handleUpdateHomeTaskStatus(task._id, 'COLLECTOR_DISPATCHED')}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black transition"
                            >
                              Dispatch
                            </button>
                          )}

                          {task.status === 'COLLECTOR_DISPATCHED' && (
                            <button
                              onClick={() => handleUpdateHomeTaskStatus(task._id, 'ARRIVED')}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition"
                            >
                              Mark Arrived
                            </button>
                          )}

                          {task.status === 'ARRIVED' && (
                            <button
                              onClick={() => handleUpdateHomeTaskStatus(task._id, 'COLLECTED')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                            >
                              Complete Collection
                            </button>
                          )}

                          {task.status === 'COLLECTED' && (
                            <button
                              onClick={() => {
                                setSelectedTaskForReceive(task);
                                setReceiveCondition('GOOD');
                                setReceiveNotes('');
                                setShowReceiveModal(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition"
                            >
                              Receive at Lab
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: SAMPLE COLLECTION & SPECIMEN VERIFICATION ── */}
      {showCollectModal && specimenRequirements && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  Phlebotomy Collection Workflow
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Specimen Collection for Order {specimenRequirements.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowCollectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Patient Verification Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row justify-between gap-3 text-xs">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Patient Identification</p>
                <h4 className="text-sm font-black text-slate-900">
                  {specimenRequirements.patient?.fullName ||
                    `${specimenRequirements.patient?.firstName || ''} ${specimenRequirements.patient?.lastName || ''}`.trim() ||
                    'Walk-in Patient'}
                </h4>
                <p className="text-slate-500 mt-0.5">
                  Phone: <span className="font-bold text-slate-700">{specimenRequirements.patient?.phone || 'N/A'}</span>
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Priority & Token</p>
                <div className="flex items-center gap-2 sm:justify-end mt-0.5">
                  {specimenRequirements.tokenNumber && (
                    <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                      {specimenRequirements.tokenNumber}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] font-black uppercase text-slate-700">
                    {specimenRequirements.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Preparation / Fasting Alert */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center gap-3 text-xs text-amber-900">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-black">Patient Preparation Instructions:</span>{' '}
                <span>{specimenRequirements.preparationInstructions}</span>
              </div>
            </div>

            {/* Required Specimens & Combined Container Requirements */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Required Specimens ({specimenRequirements.requiredSpecimensCount} Container(s))
                </h4>
                <span className="text-[10px] text-slate-400 font-bold">Compatible tests merged automatically</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {specimenRequirements.requiredSpecimens?.map((spec, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 bottom-0 w-1.5"
                      style={{ backgroundColor: spec.containerColor || '#8B5CF6' }}
                    />
                    <div className="pl-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: spec.containerColor || '#8B5CF6' }}
                        />
                        <h5 className="text-xs font-black text-slate-900">{spec.containerType}</h5>
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 mt-1">
                        Specimen: <span className="text-slate-800">{spec.specimenType}</span> ({spec.volumeRequired})
                      </p>
                      <div className="mt-2 text-[10px] text-slate-600">
                        <span className="font-extrabold text-slate-400 uppercase">Tests: </span>
                        {spec.tests?.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6-Point Phlebotomy Safety Checklist */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                Safety & Verification Checklist
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {specimenRequirements.checklist?.map((chk) => (
                  <label
                    key={chk.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      checklistState[chk.id]
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checklistState[chk.id])}
                      onChange={(e) =>
                        setChecklistState((prev) => ({ ...prev, [chk.id]: e.target.checked }))
                      }
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] leading-tight">{chk.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Collection Notes */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Phlebotomy Collection Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Left median cubital vein, smooth draw without hemolysis"
                value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={collecting}
                onClick={handleConfirmCollection}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md transition transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{collecting ? 'Recording Collection...' : 'Confirm & Collect Samples'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PRINTABLE BARCODE LABELS MODAL ── */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Barcode Label Ready
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">Print Sample Barcode Labels</h3>
              </div>
              <button
                onClick={() => setShowLabelModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {printedSamples.map((sample, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 font-mono text-slate-900 space-y-2 relative"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 text-xs font-black">
                    <span>AICMS CLINICAL LAB</span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-center py-2 bg-white rounded-xl border border-slate-200">
                    <div className="text-xl font-black tracking-widest text-slate-900">{sample.sampleId}</div>
                    <div className="h-6 flex items-center justify-center text-slate-400 font-bold text-xs tracking-widest">
                      ||| | | |||| || | ||| |||| |
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
                    <div>
                      <span className="text-slate-400">Patient: </span>
                      <span>{sample.patientName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Specimen: </span>
                      <span>{sample.specimenType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Tube: </span>
                      <span>{sample.containerType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Order: </span>
                      <span>{sample.orderNumber}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print();
                  toast.success('Sent to label printer!');
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-2"
              >
                <Printer size={15} />
                <span>Print Label(s)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: SAMPLE REJECTION & RECOLLECTION MODAL ── */}
      {showRejectModal && selectedSampleForReject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle size={20} />
                <h3 className="text-base font-black text-slate-900">Reject Sample & Flag Recollection</h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Rejecting sample <span className="font-mono font-black text-slate-800">{selectedSampleForReject.sampleId}</span> will log a rejection audit event and place the order in the recollection queue.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-black text-slate-700 block mb-1">Standard Rejection Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="Insufficient Volume">Insufficient Volume</option>
                  <option value="Hemolysed">Hemolysed</option>
                  <option value="Clotted">Clotted</option>
                  <option value="Wrong Container">Wrong Container</option>
                  <option value="Wrong Specimen">Wrong Specimen</option>
                  <option value="Leaking Container">Leaking Container</option>
                  <option value="Improper Collection">Improper Collection</option>
                  <option value="Unlabelled / Mislabeled">Unlabelled / Mislabeled</option>
                  <option value="Expired Sample">Expired Sample</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-black text-slate-700 block mb-1">Specific Notes / Observation</label>
                <textarea
                  rows={2}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="e.g. Severe hemolysis observed upon centrifugation"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow transition"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Sample Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: UNIVERSAL QR / BARCODE SCANNER ── */}
      {showScanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scan size={20} className="text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Universal QR & Barcode Scanner</h3>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePerformScanLookup} className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Scan / Enter Barcode, Order ID, Prescription ID, Token or Phone
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. SMP-20260901-4192, ORD-LAB-1021, A-021, 9876543210"
                    value={scanCodeInput}
                    onChange={(e) => setScanCodeInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={scanLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition"
                  >
                    {scanLoading ? 'Scanning...' : 'Lookup'}
                  </button>
                </div>
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
                      onClick={() => {
                        setShowScanModal(false);
                        handleOpenCollectionModal(scanResult.order);
                      }}
                      className="w-full py-2 bg-indigo-600 text-white font-black rounded-xl text-xs mt-2"
                    >
                      Open Specimen Collection
                    </button>
                  </div>
                )}

                {scanResult.type === 'SAMPLE' && scanResult.sample && (
                  <div className="space-y-1.5">
                    <p className="font-mono font-black text-slate-900 text-sm">{scanResult.sample.sampleId}</p>
                    <p className="text-slate-600">Specimen: {scanResult.sample.specimenType} ({scanResult.sample.containerType})</p>
                    <p className="text-slate-600">Status: <span className="font-bold text-emerald-700">{scanResult.sample.status}</span></p>
                    <button
                      onClick={() => {
                        setShowScanModal(false);
                        handleViewTimeline(scanResult.sample);
                      }}
                      className="w-full py-2 bg-slate-900 text-white font-black rounded-xl text-xs mt-2"
                    >
                      View Audit Timeline
                    </button>
                  </div>
                )}

                {scanResult.type === 'TOKEN' && scanResult.token && (
                  <div className="space-y-1.5">
                    <p className="font-mono font-black text-slate-900 text-sm">Token {scanResult.token.tokenNumber}</p>
                    <p className="text-slate-600">Patient: {scanResult.token.patientName}</p>
                    <p className="text-slate-600">Status: {scanResult.token.status}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 5: PUBLIC TOKEN DISPLAY ── */}
      {showPublicDisplay && publicDisplayData && (
        <div className="fixed inset-0 bg-slate-950 text-white p-6 z-50 flex flex-col justify-between animate-fade-in">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                <FlaskConical size={24} />
              </span>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white">AICMS Phlebotomy Waiting Room</h2>
                <p className="text-xs text-slate-400 font-bold">Please proceed to your assigned desk when your token is called</p>
              </div>
            </div>
            <button
              onClick={() => setShowPublicDisplay(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="my-auto grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
            <div className="bg-gradient-to-br from-indigo-900/60 to-slate-900/90 rounded-3xl p-8 border border-indigo-500/30 shadow-2xl flex flex-col justify-center items-center text-center space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Now Serving</span>
              {publicDisplayData.currentServing?.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-7xl font-black font-mono tracking-tight text-white">
                    {publicDisplayData.currentServing[0].tokenNumber}
                  </div>
                  <div className="text-lg font-black text-emerald-400 uppercase tracking-wider">
                    Please Proceed To {publicDisplayData.currentServing[0].deskNumber || 'Collection Desk 1'}
                  </div>
                </div>
              ) : (
                <div className="text-3xl font-black text-slate-400">Waiting for next patient</div>
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

          <div className="border-t border-white/10 pt-4 flex justify-between text-xs text-slate-500 font-bold">
            <span>AICMS Laboratory Information System</span>
            <span>Zero Patient PII Exposed (HIPAA / DISHA Compliant)</span>
          </div>
        </div>
      )}

      {/* ── MODAL 6: SAMPLE AUDIT TIMELINE ── */}
      {showTimelineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Sample Lifecycle Audit Timeline</h3>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {loadingTimeline ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">Loading audit history...</div>
            ) : timelineData?.timeline?.length > 0 ? (
              <div className="space-y-4 relative pl-4 border-l-2 border-slate-100">
                {timelineData.timeline.map((item, idx) => (
                  <div key={idx} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-black text-slate-900">{item.action}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{item.notes || 'Status progression recorded'}</p>
                    <p className="text-[10px] text-slate-400">By: {item.actorName || 'System'} ({item.actorRole || 'Staff'})</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">No audit timeline events logged yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 7: ASSIGN HOME COLLECTOR MODAL ── */}
      {showAssignModal && selectedHomeTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-600">
                <Truck size={20} />
                <h3 className="text-base font-black text-slate-900">Assign Phlebotomist / Collector</h3>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-black text-slate-700 block mb-1">Collector Full Name</label>
                <input
                  type="text"
                  value={collectorNameInput}
                  onChange={(e) => setCollectorNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-black text-slate-700 block mb-1">Collector Mobile Number</label>
                <input
                  type="text"
                  value={collectorPhoneInput}
                  onChange={(e) => setCollectorPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigningCollector}
                onClick={handleAssignCollector}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs shadow transition"
              >
                {assigningCollector ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 8: RECEIVE HOME COLLECTION SPECIMEN AT LAB MODAL ── */}
      {showReceiveModal && selectedTaskForReceive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={20} />
                <h3 className="text-base font-black text-slate-900">Receive Home Specimen at Lab</h3>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-black text-slate-700 block mb-1">Specimen Intake Condition</label>
                <select
                  value={receiveCondition}
                  onChange={(e) => setReceiveCondition(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="GOOD">Good (Properly sealed, refrigerated transport)</option>
                  <option value="HEMOLYSED">Hemolysed</option>
                  <option value="CLOTTED">Clotted</option>
                  <option value="INSUFFICIENT">Insufficient Volume</option>
                  <option value="LEAKING">Leaking Container</option>
                  <option value="DAMAGED">Damaged / Broken Container</option>
                </select>
              </div>

              <div>
                <label className="font-black text-slate-700 block mb-1">Receipt Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Cold chain maintained, received within 45 mins"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={receivingSample}
                onClick={handleReceiveHomeSample}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow transition"
              >
                {receivingSample ? 'Receiving...' : 'Confirm Receipt & Handover to Testing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleCollectionDesk;
