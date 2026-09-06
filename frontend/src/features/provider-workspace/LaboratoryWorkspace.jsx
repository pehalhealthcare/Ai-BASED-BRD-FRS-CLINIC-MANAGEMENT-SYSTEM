import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, FlaskConical, ShoppingBag, Users, AlertTriangle, 
  Search, Scan, RefreshCw, Barcode, Plus, Minus, Trash2, 
  CreditCard, CheckCircle2, ChevronRight, Ban, Eye, FileText, 
  Printer, ArrowLeftRight, Activity, ArrowUpRight, DollarSign, Calendar,
  ChevronDown, LogOut, Layers, Settings, HelpCircle, FileBarChart, Truck, Heart, X, Check, Clock, AlertCircle,
  FileCheck, Sparkles, UploadCloud, ChevronLeft, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { labApi, dashboardApi, clinicApi, patientApi, doctorApi } from '../../lib/api';
import aiApi from '../../api/aiApi';
import { getOrderResults, initializeOrderResults, updateLabOrderStatus, finalizeOrder, amendOrder } from '../labs/labApi';
import LabOrderFinalizationModal from '../labs/LabOrderFinalizationModal';
import CreateLabOrderModal from '../labs/CreateLabOrderModal';
import SampleCollectionDesk from './SampleCollectionDesk';
import { getStatusTone, getStatusDisplayLabel } from '../labs/labStatusConstants';

const LaboratoryWorkspace = ({ tab: propTab, laboratoryId: propLaboratoryId }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = propTab || searchParams.get('tab') || 'dashboard';
  const sub = searchParams.get('sub') || 'test';
  
  const laboratoryId = propLaboratoryId || searchParams.get('labId') || user?.providerId || '';
  
  const setActiveTab = (newTab) => {
    if (laboratoryId) {
      navigate(`/laboratory/${laboratoryId}/${newTab}`);
    } else {
      setSearchParams({ tab: newTab });
    }
  };
  const setCatalogueSubTab = (newSub) => {
    if (laboratoryId) {
      navigate(`/laboratory/${laboratoryId}/catalogue?sub=${newSub}`);
    } else {
      setSearchParams({ tab: 'catalogue', sub: newSub });
    }
  };

  // Clinic & Branch Context
  const [activeClinicId, setActiveClinicId] = useState(
    () => localStorage.getItem('patientActiveClinicId') || user?.clinicId || user?.clinic?._id || ''
  );
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('ALL'); // 'ALL' or specific branch clinicId

  // Live Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [consumables, setConsumables] = useState([]);

  // Filters & Interactivity State
  const [trendRange, setTrendRange] = useState('7'); // '7', '14', '30', '90'
  const [globalSearch, setGlobalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDetailTest, setSelectedDetailTest] = useState(null);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  
  // Results Management State for Lab Orders Tab
  const [selectedOrderResults, setSelectedOrderResults] = useState({ groups: [], totalParams: 0, completedParams: 0, abnormalCount: 0, criticalCount: 0 });
  const [orderResultsLoading, setOrderResultsLoading] = useState(false);
  const [orderActiveSubTab, setOrderActiveSubTab] = useState('tests'); // 'tests' | 'reports' | 'activity' | 'patient'
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL'); // 'ALL' | 'ORDERED' | 'PROCESSING' | 'REVIEW' | 'COMPLETED'
  const [orderSortBy, setOrderSortBy] = useState('latest');
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [showAmendDialog, setShowAmendDialog] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [isAmending, setIsAmending] = useState(false);
  const [uploadingReportFile, setUploadingReportFile] = useState(false);
  const [attachedReports, setAttachedReports] = useState([]);
  
  // Modals
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [showAddConsumableModal, setShowAddConsumableModal] = useState(false);
  const [showNewTestModal, setShowNewTestModal] = useState(false);
  const [reportFile, setReportFile] = useState(null);

  // Walk-in order form state
  const [patientsList, setPatientsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [walkinPriority, setWalkinPriority] = useState('routine');
  const [walkinNotes, setWalkinNotes] = useState('');
  const [submittingWalkin, setSubmittingWalkin] = useState(false);

  // Consumable form state
  const [newConsumable, setNewConsumable] = useState({ name: '', category: 'Consumables', stock: 50, reorderLevel: 20, rack: '', supplier: '' });

  // Test form state
  const [newTest, setNewTest] = useState({
    name: '',
    code: '',
    category: 'Biochemistry',
    department: 'Pathology',
    sampleType: 'Serum',
    methodology: '',
    price: 0,
    normalTime: '24 Hours',
    importantInstructions: '',
    doctorPrescriptionRequired: false,
    homeCollectionAvailable: false,
    localParameters: []
  });

  const [showLocalTestParamForm, setShowLocalTestParamForm] = useState(false);
  const [tempLocalParam, setTempLocalParam] = useState({
    name: '',
    shortName: '',
    resultType: 'NUMERIC',
    unit: '',
    description: ''
  });

  // Global Catalogue Search Modal states
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [loadingGlobalResults, setLoadingGlobalResults] = useState(false);
  const [selectedGlobalTestIds, setSelectedGlobalTestIds] = useState([]);

  // Wizard States
  const [wizardStep, setWizardStep] = useState(1); // 1 = Select, 2 = Configure Parameters, 3 = Test Details, 4 = Review
  const [wizardTestConfigs, setWizardTestConfigs] = useState({}); // { [globalTestId]: config }
  
  // Deactivate states
  const [testToDeactivate, setTestToDeactivate] = useState(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const handleConfirmDeactivate = (test) => {
    setTestToDeactivate(test);
    setShowDeactivateConfirm(true);
  };

  const handleExecuteDeactivate = async () => {
    if (!testToDeactivate) return;
    try {
      await labApi.updateTest(testToDeactivate._id, {
        laboratoryId,
        isActive: false
      });
      toast.success('Test deactivated successfully');
      setShowDeactivateConfirm(false);
      setTestToDeactivate(null);
      loadDashboardData();
    } catch (err) {
      toast.error('Failed to deactivate test');
    }
  };

  const [activeParamAddingTestId, setActiveParamAddingTestId] = useState(null);
  const [newLocalParam, setNewLocalParam] = useState({
    name: '',
    shortName: '',
    resultType: 'NUMERIC',
    unit: '',
    decimalPrecision: 1,
    description: '',
    gender: 'ALL',
    ageFrom: '',
    ageTo: '',
    ageUnit: 'YEARS',
    lowerOperator: 'Between',
    upperOperator: 'Between',
    lowerValue: '',
    upperValue: '',
    qualitativeValueText: '',
    allowedValues: []
  });

  const handleOpenGlobalCatalogueWizard = () => {
    setWizardStep(1);
    setSelectedGlobalTestIds([]);
    setWizardTestConfigs({});
    setShowGlobalSearchModal(true);
  };

  const handleGoToStep2 = () => {
    const selectedTests = globalSearchResults.filter(g => selectedGlobalTestIds.includes(g._id));
    const newConfigs = { ...wizardTestConfigs };
    selectedTests.forEach(test => {
      if (!newConfigs[test._id]) {
        newConfigs[test._id] = {
          globalLabTestId: test._id,
          code: test.internalCode || test.globalId || '',
          name: test.name,
          price: test.testPrice || 300,
          turnaroundTime: test.normalReportingTime || '24 Hours',
          doctorPrescriptionRequired: false,
          importantInstructions: '',
          collectionLocations: ['Laboratory'],
          homeCollectionAvailable: false,
          parameterOverrides: (test.parameters || []).map(p => ({
            parameterId: p._id || p,
            isAvailable: true
          })),
          localParameters: []
        };
      }
    });
    setWizardTestConfigs(newConfigs);
    setWizardStep(2);
  };

  // Configure Test states
  const [editingLabTest, setEditingLabTest] = useState(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingPrice, setEditingPrice] = useState(0);
  const [editingTAT, setEditingTAT] = useState('');
  const [editingParamsOverride, setEditingParamsOverride] = useState([]); // [{ parameterId, isAvailable }]

  const handleOpenConfigureTest = (test) => {
    setEditingLabTest(test);
    setEditingCode(test.code || '');
    setEditingPrice(test.price || test.testPrice || 0);
    setEditingTAT(test.TAT || test.normalReportingTime || '24 Hours');
    setEditingParamsOverride(test.parameterOverrides || []);
  };

  const handleSaveConfigureTest = async (e) => {
    e.preventDefault();
    try {
      await labApi.updateTest(editingLabTest._id, {
        laboratoryId,
        code: editingCode,
        price: editingPrice,
        TAT: editingTAT,
        parameterOverrides: editingParamsOverride
      });
      toast.success('Test configuration updated successfully!');
      setEditingLabTest(null);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update test configuration');
    }
  };

  const handleSearchGlobalCatalog = async () => {
    if (!laboratoryId) return;
    setLoadingGlobalResults(true);
    try {
      const res = await labApi.listAvailableGlobalTests({
        search: globalSearchQuery,
        laboratoryId,
        clinicId: activeClinicId
      });
      setGlobalSearchResults(res.data?.items || res?.items || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGlobalResults(false);
    }
  };

  const handleBulkActivateGlobal = async () => {
    if (selectedGlobalTestIds.length === 0) {
      toast.error('Please select at least one test to add');
      return;
    }
    try {
      const configs = selectedGlobalTestIds.map(gid => {
        const conf = wizardTestConfigs[gid] || {};
        return {
          globalLabTestId: gid,
          price: Number(conf.price) || 0,
          turnaroundTime: conf.turnaroundTime || '24 Hours',
          doctorPrescriptionRequired: !!conf.doctorPrescriptionRequired,
          importantInstructions: conf.importantInstructions || '',
          parameterOverrides: (conf.parameterOverrides || []).map(o => ({
            parameterId: o.parameterId,
            isAvailable: !!o.isAvailable
          })),
          localParameters: conf.localParameters || []
        };
      });

      console.log("Creating Lab Test payload configs:", configs);

      await labApi.bulkActivateGlobalTests({
        laboratoryId,
        configs
      });
      toast.success('Selected tests activated successfully!');
      setShowGlobalSearchModal(false);
      setSelectedGlobalTestIds([]);
      setWizardTestConfigs({});
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate tests');
    }
  };

  // Perform initial load when search modal opens
  useEffect(() => {
    if (showGlobalSearchModal) {
      handleSearchGlobalCatalog();
    }
  }, [showGlobalSearchModal, globalSearchQuery]);

  const getTestAvailabilityStatus = (test) => {
    const params = test.globalLabTestId?.parameters || [];
    if (params.length === 0) return 'Fully Available';
    
    const overrides = test.parameterOverrides || [];
    let availableCount = 0;
    
    params.forEach(p => {
      const match = overrides.find(o => String(o.parameterId) === String(p._id));
      if (!match || match.isAvailable !== false) {
        availableCount++;
      }
    });

    if (availableCount === 0) return 'Unavailable';
    if (availableCount < params.length) return 'Partially Available';
    return 'Fully Available';
  };

  // Debounce global search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(globalSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [globalSearch]);

  // Handle global search API call
  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults(null);
      return;
    }
    const performSearch = async () => {
      setSearching(true);
      try {
        const res = await labApi.searchAllLabs({ q: debouncedSearch, clinicId: activeClinicId });
        setSearchResults(res.data || res || null);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setSearching(false);
      }
    };
    performSearch();
  }, [debouncedSearch, activeClinicId]);

  // Load clinic details/branches
  useEffect(() => {
    if (!activeClinicId) return;
    const loadClinicMeta = async () => {
      try {
        const details = await clinicApi.getDetails(activeClinicId);
        if (details && details.branches) {
          setBranches(details.branches);
        } else {
          setBranches([]);
        }
      } catch (err) {
        console.error('Failed to load clinic branches', err);
      }
    };
    loadClinicMeta();
  }, [activeClinicId]);

  // Main Dashboard Data Fetch
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetClinicId = selectedBranchId === 'ALL' ? activeClinicId : selectedBranchId;
      const daysCount = parseInt(trendRange) || 7;
      
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - daysCount);

      // 1. Fetch dashboard metrics
      const metricsData = await dashboardApi.getLabs({
        clinicId: targetClinicId,
        laboratoryId,
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      });
      setMetrics(metricsData?.data || metricsData || {});

      // 2. Fetch Equipment List
      const equipData = await labApi.listEquipment({ clinicId: targetClinicId, laboratoryId });
      setEquipment(equipData?.data || equipData || []);

      // 3. Fetch Alerts
      const alertsData = await labApi.getLabAlerts({ clinicId: targetClinicId, laboratoryId });
      setAlerts(alertsData?.data || alertsData || []);

      // 4. Fetch Recent Orders & Completed Tests
      const ordersData = await labApi.listOrders({ clinicId: targetClinicId, laboratoryId, limit: 20 });
      setOrders(ordersData?.data?.labOrders || ordersData?.labOrders || []);

      const completedData = await labApi.listOrders({ clinicId: targetClinicId, laboratoryId, status: 'completed', limit: 15 });
      setCompletedTests(completedData?.data?.labOrders || completedData?.labOrders || []);

      // 5. Fetch Tests for dropdowns & inventory
      const testsData = await labApi.listTests({ clinicId: targetClinicId, laboratoryId });
      setAllTests(testsData?.data?.labTests || testsData?.labTests || []);

      const inventoryData = await labApi.listConsumables({ clinicId: targetClinicId, laboratoryId });
      setConsumables(inventoryData?.data?.consumables || inventoryData?.consumables || []);

    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || 'Unable to load laboratory metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeClinicId) {
      loadDashboardData();
    }
  }, [activeClinicId, selectedBranchId, trendRange, laboratoryId]);

  // Load patients and doctors when Walk-in modal opens
  useEffect(() => {
    if (!showWalkinModal) return;
    const fetchWalkinMeta = async () => {
      try {
        const patientsRes = await patientApi.list({ limit: 100 });
        setPatientsList(patientsRes?.data?.patients || patientsRes?.patients || []);
        
        const doctorsRes = await doctorApi.list({ limit: 100 });
        setDoctorsList(doctorsRes?.data?.doctors || doctorsRes?.doctors || []);
      } catch (err) {
        console.error('Failed to load walk-in metadata', err);
      }
    };
    fetchWalkinMeta();
  }, [showWalkinModal]);

  // Walk-in order submission
  const handleCreateWalkinOrder = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return toast.error('Please select a patient');
    if (selectedTestIds.length === 0) return toast.error('Select at least one test');
    
    setSubmittingWalkin(true);
    try {
      // Find selected test details to match API payload structure
      const testsPayload = selectedTestIds.map(testId => {
        const test = allTests.find(t => t._id === testId);
        return {
          labTestId: test._id,
          code: test.code,
          name: test.name,
          category: test.category,
          specimenType: test.specimenType,
          unit: test.unit,
          normalRange: test.normalRange
        };
      });

      const payload = {
        patientId: selectedPatientId,
        doctorId: selectedDoctorId || undefined,
        priority: walkinPriority,
        notes: walkinNotes,
        tests: testsPayload
      };

      await labApi.createOrder(payload);
      toast.success('Walk-in lab order created successfully!');
      setShowWalkinModal(false);
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setSelectedTestIds([]);
      setWalkinNotes('');
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmittingWalkin(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      await labApi.updateOrderStatus(orderId, { status: nextStatus });
      toast.success(`Order status updated to ${getStatusDisplayLabel(nextStatus)}.`);
      loadDashboardData();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  // Load Results and Attached Reports for Selected Order
  const loadOrderResultsData = useCallback(async (orderId) => {
    if (!orderId) {
      setSelectedOrderResults({ groups: [], totalParams: 0, completedParams: 0, abnormalCount: 0, criticalCount: 0 });
      setAttachedReports([]);
      return;
    }
    setOrderResultsLoading(true);
    try {
      const [orderRes, resultsRes] = await Promise.all([
        labApi.getOrder(orderId),
        getOrderResults(orderId).catch(() => ({ data: { groups: [], totalParams: 0, completedParams: 0 } }))
      ]);

      const labOrder = orderRes?.data?.labOrder || orderRes?.labOrder || selectedOrder;
      const rep = orderRes?.data?.report || null;

      // Build attached reports
      const attached = [];
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
      if (rep?.generatedReportUrl) {
        attached.push({
          id: 'rep-gen',
          fileName: rep.generatedReportFileName || `${labOrder?.orderNumber || 'Report'}_Official.pdf`,
          fileSize: '1.1 MB',
          date: (rep.updatedAt || '').slice(0, 10),
          type: 'Generated',
          url: rep.generatedReportUrl
        });
      }
      setAttachedReports(attached);

      let rData = resultsRes?.data || { groups: [], totalParams: 0, completedParams: 0 };
      if ((!rData.groups || rData.groups.length === 0) && labOrder?.tests?.length && labOrder.status !== 'cancelled') {
        try {
          await initializeOrderResults(orderId);
          const freshResults = await getOrderResults(orderId);
          rData = freshResults.data || { groups: [], totalParams: 0, completedParams: 0 };
        } catch (_) {}
      }

      setSelectedOrderResults(rData);
    } catch (err) {
      console.error('Failed to load order results:', err);
    } finally {
      setOrderResultsLoading(false);
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (selectedOrder?._id) {
      loadOrderResultsData(selectedOrder._id);
    }
  }, [selectedOrder?._id, loadOrderResultsData]);

  const handleMarkReadyForReview = async () => {
    if (!selectedOrder) return;
    try {
      await updateLabOrderStatus(selectedOrder._id, { status: 'ready_for_review' });
      toast.success('Order marked as Ready for Review.');
      setSelectedOrder(prev => ({ ...prev, status: 'ready_for_review' }));
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  const handleAmendOrder = async () => {
    if (!selectedOrder || !amendReason.trim() || amendReason.trim().length < 5) {
      toast.error('Please enter an amendment reason (at least 5 characters).');
      return;
    }
    setIsAmending(true);
    try {
      await amendOrder(selectedOrder._id, { reason: amendReason.trim() });
      setShowAmendDialog(false);
      setAmendReason('');
      toast.success('Order unlocked for amendment.');
      setSelectedOrder(prev => ({ ...prev, status: 'results_entry' }));
      loadOrderResultsData(selectedOrder._id);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock order.');
    } finally {
      setIsAmending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder) return;

    setUploadingReportFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // OCR Extraction
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

      toast.success(`Report "${file.name}" uploaded successfully! ${extractedEntries.length > 0 ? `${extractedEntries.length} parameters extracted. You can review them in the Enter Results workspace.` : ''}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload report.');
    } finally {
      setUploadingReportFile(false);
      e.target.value = '';
    }
  };

  // Filtered orders for Diagnostic Work Orders list
  const filteredWorkOrders = useMemo(() => {
    return (orders || []).filter((ord) => {
      if (orderSearchQuery) {
        const q = orderSearchQuery.toLowerCase();
        const mNum = (ord.orderNumber || '').toLowerCase().includes(q);
        const mPat = (ord.patientId?.fullName || ord.guestPatient?.fullName || '').toLowerCase().includes(q);
        const mTests = (ord.tests || []).some((t) => (t.name || t.code || '').toLowerCase().includes(q));
        if (!mNum && !mPat && !mTests) return false;
      }

      if (orderStatusFilter === 'ORDERED') return ['ordered', 'confirmed', 'scheduled', 'sample_collection_pending'].includes(ord.status);
      if (orderStatusFilter === 'SAMPLE_COLLECTED') return ord.status === 'sample_collected';
      if (orderStatusFilter === 'PROCESSING') return ['processing', 'in_processing', 'in_analysis'].includes(ord.status);
      if (orderStatusFilter === 'RESULTS_ENTRY') return ord.status === 'results_entry';
      if (orderStatusFilter === 'REVIEW') return ord.status === 'ready_for_review';
      if (orderStatusFilter === 'COMPLETED') return ['completed', 'finalized', 'report_ready'].includes(ord.status);

      return true;
    }).sort((a, b) => {
      if (orderSortBy === 'oldest') {
        return new Date(a.orderedAt || a.createdAt) - new Date(b.orderedAt || b.createdAt);
      }
      return new Date(b.orderedAt || b.createdAt) - new Date(a.orderedAt || a.createdAt);
    });
  }, [orders, orderSearchQuery, orderStatusFilter, orderSortBy]);

  const orderTabCounts = useMemo(() => {
    return {
      all: (orders || []).length,
      ordered: (orders || []).filter((o) => ['ordered', 'confirmed', 'scheduled', 'sample_collection_pending'].includes(o.status)).length,
      collected: (orders || []).filter((o) => o.status === 'sample_collected').length,
      processing: (orders || []).filter((o) => ['processing', 'in_processing', 'in_analysis'].includes(o.status)).length,
      resultsEntry: (orders || []).filter((o) => o.status === 'results_entry').length,
      review: (orders || []).filter((o) => o.status === 'ready_for_review').length,
      completed: (orders || []).filter((o) => ['completed', 'finalized', 'report_ready'].includes(o.status)).length
    };
  }, [orders]);

  const selectedOrderProgress = useMemo(() => {
    const total = selectedOrderResults.totalParams || 0;
    const completed = selectedOrderResults.completedParams || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isAllComplete = total > 0 && completed === total;
    return { total, completed, pct, isAllComplete };
  }, [selectedOrderResults]);

  const handleAddConsumable = async (e) => {
    e.preventDefault();
    try {
      await labApi.createConsumable(newConsumable);
      toast.success(`Consumable item "${newConsumable.name}" registered successfully.`);
      setShowAddConsumableModal(false);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register consumable');
    }
  };

  const handleCreateNewTest = async (e) => {
    e.preventDefault();
    try {
      await labApi.createTest({
        ...newTest,
        laboratoryId
      });
      toast.success(`Test request "${newTest.name}" added successfully.`);
      setShowNewTestModal(false);
      setNewTest({
        name: '',
        code: '',
        category: 'Biochemistry',
        department: 'Pathology',
        sampleType: 'Serum',
        methodology: '',
        price: 0,
        normalTime: '24 Hours',
        importantInstructions: '',
        doctorPrescriptionRequired: false,
        homeCollectionAvailable: false,
        localParameters: []
      });
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register test');
    }
  };

  const handleAddLocalParamToNewTest = (e) => {
    e.preventDefault();
    if (!tempLocalParam.name.trim()) return toast.error('Parameter Name is required');
    setNewTest(prev => ({
      ...prev,
      localParameters: [...prev.localParameters, { ...tempLocalParam }]
    }));
    setTempLocalParam({
      name: '',
      shortName: '',
      resultType: 'NUMERIC',
      unit: '',
      description: ''
    });
    setShowLocalTestParamForm(false);
  };

  const handleRemoveLocalParamFromNewTest = (index) => {
    setNewTest(prev => ({
      ...prev,
      localParameters: prev.localParameters.filter((_, idx) => idx !== index)
    }));
  };

  // Scoped metrics derived from states
  const totalTestsCount = useMemo(() => orders.length, [orders]);
  const samplesReceivedCount = useMemo(() => orders.filter(o => o.status !== 'ordered').length, [orders]);
  const completedCount = useMemo(() => orders.filter(o => o.status === 'completed').length, [orders]);
  const pendingCount = useMemo(() => orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length, [orders]);
  const criticalCount = useMemo(() => alerts.filter(a => a.priority === 'Emergency').length, [alerts]);

  // Stage workflow counts
  const workflowCounts = useMemo(() => {
    return {
      received: orders.filter(o => ['sample_collected', 'processing', 'completed'].includes(o.status)).length,
      processing: orders.filter(o => o.status === 'sample_collected').length,
      analysis: orders.filter(o => o.status === 'processing').length,
      completed: orders.filter(o => o.status === 'completed').length,
      reported: completedTests.length
    };
  }, [orders, completedTests]);

  // Test Category distribution logic
  const categoryDistribution = useMemo(() => {
    const counts = {};
    orders.forEach(order => {
      order.tests?.forEach(test => {
        counts[test.category] = (counts[test.category] || 0) + 1;
      });
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.keys(counts).map(key => ({
      name: key || 'General',
      count: counts[key],
      pct: total ? Math.round((counts[key] / total) * 100) : 0
    }));
  }, [orders]);

  // Date Trend lines rendering logic
  const trendPoints = useMemo(() => {
    const grouped = {};
    orders.forEach(order => {
      const dateStr = new Date(order.orderedAt || order.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      grouped[dateStr] = (grouped[dateStr] || 0) + 1;
    });

    const dates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    return dates.map(d => ({ date: d, count: grouped[d] }));
  }, [orders]);

  return (
    <div className="space-y-6 bg-slate-50/50 p-6 min-h-screen pb-16 font-sans text-slate-800 antialiased">

      {/* Error and Loading states */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between gap-4 text-rose-800">
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertCircle size={16} />
            <span>Unable to load laboratory metrics: {error}</span>
          </div>
          <button onClick={loadDashboardData} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse space-y-4">
              <div className="w-16 h-3 bg-slate-100 rounded"></div>
              <div className="w-8 h-6 bg-slate-100 rounded"></div>
              <div className="w-24 h-2 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        /* --- MAIN DASHBOARD TAB CONTENT --- */
        activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'TOTAL TESTS ORDERED', val: totalTestsCount, desc: 'All orders registered', color: 'text-purple-650 bg-purple-50' },
                { label: 'SAMPLES RECEIVED', val: samplesReceivedCount, desc: 'Tubes checked-in', color: 'text-blue-600 bg-blue-50' },
                { label: 'TESTS COMPLETED', val: completedCount, desc: 'Finalized reports', color: 'text-emerald-600 bg-emerald-50' },
                { label: 'PENDING TESTS', val: pendingCount, desc: 'Currently in processing', color: 'text-amber-600 bg-amber-50' },
                { label: 'CRITICAL RESULTS', val: criticalCount, desc: 'Require doctor review', color: 'text-rose-600 bg-rose-50' }
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-purple-200/50 transition duration-300">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full w-max ${kpi.color}`}>{kpi.label}</span>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-slate-900">{kpi.val === 0 ? "0" : kpi.val.toLocaleString()}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">{kpi.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Workflow Tracker Overview */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Today's Live Workflow</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center text-center">
                {[
                  { label: 'Samples Received', val: workflowCounts.received, color: 'text-purple-650', bg: 'bg-purple-50' },
                  { label: 'In Processing', val: workflowCounts.processing, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'In Analysis', val: workflowCounts.analysis, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Completed', val: workflowCounts.completed, color: 'text-emerald-650', bg: 'bg-emerald-50' },
                  { label: 'Reported', val: workflowCounts.reported, color: 'text-slate-600', bg: 'bg-slate-50' }
                ].map((st, idx) => (
                  <React.Fragment key={idx}>
                    <div className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition cursor-pointer" onClick={() => setActiveTab('orders')}>
                      <span className={`text-xl font-black ${st.color} ${st.bg} px-3 py-1 rounded-2xl`}>{st.val}</span>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-3 uppercase tracking-wide">{st.label}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Charts & Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Trend Line Chart */}
              <div className="lg:col-span-2 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Daily Test Volume Trend</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Live test volume over time</p>
                  </div>
                  <select 
                    value={trendRange} 
                    onChange={e => setTrendRange(e.target.value)} 
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-purple-650"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="14">Last 14 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>

                <div className="h-44 w-full overflow-x-auto">
                  {trendPoints.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                      No test data in this range.
                    </div>
                  ) : (
                    <div className="min-w-[500px] h-full flex flex-col justify-end">
                      <div className="flex-1 flex items-end justify-between px-4 pb-2 border-b border-slate-100">
                        {trendPoints.map((pt, idx) => {
                          const maxCount = Math.max(...trendPoints.map(p => p.count), 1);
                          const heightPct = (pt.count / maxCount) * 100;
                          return (
                            <div key={idx} className="flex flex-col items-center group relative w-full">
                              <div className="absolute -top-6 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-150">
                                {pt.count} tests
                              </div>
                              <div 
                                style={{ height: `${Math.max(heightPct, 5)}%` }} 
                                className="w-8 bg-gradient-to-t from-purple-500/80 to-purple-600 rounded-t-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-[0_4px_12px_rgba(139,92,246,0.15)]"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-black pt-2 px-2">
                        {trendPoints.map((pt, idx) => (
                          <span key={idx} className="w-8 text-center">{pt.date}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders Panel */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recent Orders</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-[10px] text-purple-650 font-bold hover:underline">View All</button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {orders.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-12">No orders registered today.</p>
                  ) : (
                    orders.slice(0, 5).map(o => (
                      <div key={o._id} onClick={() => { setSelectedOrder(o); setActiveTab('orders'); }} className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100/50 flex flex-col gap-1 text-[11px] transition cursor-pointer">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-slate-800">{o.orderNumber || o._id.slice(-6).toUpperCase()}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            o.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            o.status === 'processing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>{o.status}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="font-extrabold text-slate-700">{o.patientId?.fullName || "Walk-in"} · <span className="text-slate-400">{o.patientId?.gender || "M"}</span></span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {o.tests?.map(t => t.name).join(', ') || 'No tests'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Reagents, Equipment & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Category distribution */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Test Category Mix</h3>
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                  {categoryDistribution.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-12">No categories mapped.</p>
                  ) : (
                    categoryDistribution.map((cat, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{cat.name}</span>
                          <span>{cat.pct}% ({cat.count})</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div style={{ width: `${cat.pct}%` }} className="h-full bg-purple-500 rounded-full" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Equipment list */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Equipment Status</h3>
                  <button onClick={() => toast.success('Equipment maintenance schedules are active')} className="text-[10px] text-purple-650 font-bold hover:underline">Manage</button>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {equipment.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-12">No registered analyzers.</p>
                  ) : (
                    equipment.map(eq => (
                      <div key={eq._id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <div>
                          <p className="font-extrabold text-slate-800">{eq.name}</p>
                          <p className="text-[9px] text-slate-400">Workload: {eq.workload}% | Calibration: {eq.calibrationStatus}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          eq.status === 'Running' ? 'bg-emerald-50 text-emerald-600' :
                          eq.status === 'Maintenance' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>{eq.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Critical Alerts */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Critical Alerts</h3>
                  <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full font-black">Live</span>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-12">No critical alerts detected.</p>
                  ) : (
                    alerts.map(a => (
                      <div key={a.id} className="flex gap-3 items-start text-xs bg-rose-50/20 border border-rose-100/50 p-3 rounded-2xl">
                        <span className="text-base">⚠️</span>
                        <div className="flex-1">
                          <p className="font-extrabold text-slate-900 leading-tight">{a.msg}</p>
                          <p className="text-[9px] text-slate-400 mt-1">{a.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent Completed Tests */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recent Completed Tests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-2">Order ID</th>
                      <th className="py-2.5 px-2">Patient</th>
                      <th className="py-2.5 px-2">Investigation</th>
                      <th className="py-2.5 px-2">Completed On</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {completedTests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">No completed tests found.</td>
                      </tr>
                    ) : (
                      completedTests.map(test => (
                        <tr key={test._id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-2 font-black text-purple-600">{test.orderNumber}</td>
                          <td className="py-3 px-2 font-bold text-slate-800">{test.patientId?.fullName || "Walk-in"}</td>
                          <td className="py-3 px-2">{test.tests?.map(t => t.name).join(', ') || 'General Investigations'}</td>
                          <td className="py-3 px-2 text-slate-500 font-bold">{new Date(test.updatedAt).toLocaleDateString()}</td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600">Normal</span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => toast.success('Preview report...')} className="p-1 border border-slate-100 hover:bg-slate-100 rounded-lg text-slate-500"><Eye size={12} /></button>
                              <button onClick={() => toast.success('Downloading report PDF...')} className="p-1 border border-slate-100 hover:bg-slate-100 rounded-lg text-slate-500">📥</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* --- SAMPLE COLLECTION TAB (PHASE 7) --- */}
      {(activeTab === 'collection' || activeTab === 'sample-collection') && (
        <SampleCollectionDesk
          laboratoryId={laboratoryId}
          clinicId={activeClinicId}
          user={user}
        />
      )}

      {/* --- LAB ORDERS TAB (DIAGNOSTIC WORK ORDERS & RESULT MANAGEMENT) --- */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: Diagnostic Work Orders List (4 cols)         */}
          {/* ========================================================= */}
          <aside className="lg:col-span-4 rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col min-h-[600px] lg:sticky lg:top-6">
            {/* Master Header */}
            <div className="p-5 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Diagnostic Work Orders</h2>
                <button
                  type="button"
                  onClick={() => setIsCreateOrderModalOpen(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                >
                  <Plus size={13} /> Create Order
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-3 relative">
                <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by patient, order ID, test..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs font-bold outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 transition text-slate-800"
                />
              </div>

              {/* Filter Tabs */}
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { key: 'ALL', label: `All (${orderTabCounts.all})` },
                  { key: 'ORDERED', label: `Ordered (${orderTabCounts.ordered})` },
                  { key: 'SAMPLE_COLLECTED', label: `Collected (${orderTabCounts.collected})` },
                  { key: 'PROCESSING', label: `Processing (${orderTabCounts.processing})` },
                  { key: 'RESULTS_ENTRY', label: `Results Entry (${orderTabCounts.resultsEntry})` },
                  { key: 'REVIEW', label: `Review (${orderTabCounts.review})` },
                  { key: 'COMPLETED', label: `Completed (${orderTabCounts.completed})` }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setOrderStatusFilter(tab.key)}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-black whitespace-nowrap transition cursor-pointer ${
                      orderStatusFilter === tab.key
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span>{filteredWorkOrders.length} orders found</span>
                <select
                  value={orderSortBy}
                  onChange={(e) => setOrderSortBy(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-bold text-slate-700 outline-none text-[11px]"
                >
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Orders Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 p-2 space-y-2 max-h-[calc(100vh-280px)]">
              {filteredWorkOrders.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 font-bold">
                  No orders match your filter.
                </div>
              ) : (
                filteredWorkOrders.map((ord) => {
                  const isSelected = selectedOrder?._id === ord._id;
                  const testNames = (ord.tests || []).map((t) => t.name || t.code).join(', ');

                  return (
                    <div
                      key={ord._id}
                      onClick={() => setSelectedOrder(ord)}
                      className={`cursor-pointer rounded-2xl p-4 transition border ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-1 ring-purple-400'
                          : 'border-slate-100 bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-black text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(ord.orderedAt || ord.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="mt-2 font-extrabold text-xs text-slate-900">
                        {ord.patientId?.fullName || ord.guestPatient?.fullName || 'Walk-in Patient'}
                      </div>

                      <div className="mt-1 text-[11px] text-slate-500 font-bold truncate max-w-[280px]">
                        Tests: {testNames || 'General Investigation'}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] font-bold pt-2 border-t border-slate-50">
                        <span className="text-slate-400 capitalize">
                          Priority: <strong className="text-slate-700">{ord.priority || 'routine'}</strong>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[9px] border ${getStatusTone(ord.status)}`}>
                          {getStatusDisplayLabel(ord.status)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Order Details Workspace (8 cols)            */}
          {/* ========================================================= */}
          <main className="lg:col-span-8 space-y-6">
            {selectedOrder ? (
              <div className="space-y-6">
                {/* 1. Header Card */}
                <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h1 className="text-lg font-black text-slate-900 tracking-tight">
                          Order Details: {selectedOrder.orderNumber}
                        </h1>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${getStatusTone(selectedOrder.status)}`}>
                          {getStatusDisplayLabel(selectedOrder.status)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500 font-bold">
                        Patient: <strong className="text-slate-800">{selectedOrder.patientId?.fullName || selectedOrder.guestPatient?.fullName || 'vidya'}</strong>
                        {' '}| Age: {selectedOrder.patientId?.age || selectedOrder.guestPatient?.age ? `${selectedOrder.patientId?.age || selectedOrder.guestPatient?.age} yrs` : '28 yrs'}
                        {' '}| {selectedOrder.patientId?.gender || selectedOrder.guestPatient?.gender || 'Female'}
                        {' '}| UHID: <strong className="font-mono text-purple-700">{selectedOrder.patientId?.patientId || 'PAT-00125'}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-4 text-xs text-slate-600 font-bold">
                        <div>
                          <span className="text-slate-400 text-[9px] font-black uppercase block">Order Date</span>
                          <span className="font-extrabold text-slate-800">
                            {new Date(selectedOrder.orderedAt || selectedOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] font-black uppercase block">Sample Collected</span>
                          <span className="font-extrabold text-slate-800">
                            {selectedOrder.sampleCollectedAt ? new Date(selectedOrder.sampleCollectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Sep 2026'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] font-black uppercase block">Priority</span>
                          <span className="font-extrabold text-slate-800 capitalize">{selectedOrder.priority || 'Routine'}</span>
                        </div>
                      </div>

                      {selectedOrder.status === 'ordered' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/labs/orders/${selectedOrder._id}`)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-200 transition cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Mark Sample Collected
                        </button>
                      )}
                      {selectedOrder.status === 'sample_collected' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/labs/orders/${selectedOrder._id}`)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-200 transition cursor-pointer"
                        >
                          <FlaskConical size={14} /> Start Processing
                        </button>
                      )}
                      {['processing', 'in_processing', 'in_analysis'].includes(selectedOrder.status) && (
                        <button
                          type="button"
                          onClick={() => navigate(`/labs/orders/${selectedOrder._id}`)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-200 transition cursor-pointer"
                        >
                          <Check size={14} /> Complete Processing
                        </button>
                      )}
                      {selectedOrder.status === 'results_entry' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/labs/orders/${selectedOrder._id}/results`)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-200 transition cursor-pointer"
                        >
                          <FileText size={14} /> Results Entry
                        </button>
                      )}
                      {selectedOrder.status === 'ready_for_review' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/labs/orders/${selectedOrder._id}`)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-200 transition cursor-pointer"
                        >
                          <FileCheck size={14} /> Review & Finalize
                        </button>
                      )}
                      {['completed', 'finalized'].includes(selectedOrder.status) && (
                        <button
                          type="button"
                          onClick={() => navigate(`/labs/orders/${selectedOrder._id}/reports`)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-200 transition cursor-pointer"
                        >
                          <FileText size={14} /> View Report
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Progress Line */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900 uppercase tracking-wider text-[11px] font-black">Order Progress</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-purple-700 font-mono text-sm">{selectedOrderProgress.pct}%</span>
                        <span className="text-slate-500 text-xs">
                          {selectedOrderProgress.completed} / {selectedOrderProgress.total} completed
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedOrderProgress.isAllComplete
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                        }`}
                        style={{ width: `${selectedOrderProgress.pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Horizontal 6-Stage Workflow Stepper */}
                  <div className="mt-6 grid grid-cols-6 gap-2 border-t border-slate-100 pt-5 text-center text-xs">
                    {[
                      { 
                        key: 'ordered', 
                        label: 'Ordered', 
                        done: ['sample_collected', 'processing', 'in_processing', 'results_entry', 'ready_for_review', 'completed'].includes(selectedOrder.status), 
                        active: selectedOrder.status === 'ordered',
                        time: new Date(selectedOrder.orderedAt || selectedOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) 
                      },
                      { 
                        key: 'sample_collected', 
                        label: 'Sample Collected', 
                        done: ['processing', 'in_processing', 'results_entry', 'ready_for_review', 'completed'].includes(selectedOrder.status),
                        active: selectedOrder.status === 'sample_collected',
                        time: selectedOrder.sampleCollectedAt ? new Date(selectedOrder.sampleCollectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending'
                      },
                      { 
                        key: 'processing', 
                        label: 'Processing', 
                        done: ['results_entry', 'ready_for_review', 'completed'].includes(selectedOrder.status),
                        active: ['processing', 'in_processing', 'in_analysis'].includes(selectedOrder.status),
                        time: selectedOrder.processingStartedAt ? 'In Lab' : 'Pending'
                      },
                      { 
                        key: 'results_entry', 
                        label: 'Results Entry', 
                        done: ['ready_for_review', 'completed'].includes(selectedOrder.status),
                        active: selectedOrder.status === 'results_entry',
                        locked: ['ordered', 'sample_collected', 'processing', 'in_processing', 'in_analysis'].includes(selectedOrder.status),
                        sub: selectedOrder.status === 'results_entry' ? 'In Progress' : 'Locked 🔒'
                      },
                      { 
                        key: 'ready_for_review', 
                        label: 'Review', 
                        done: selectedOrder.status === 'completed',
                        active: selectedOrder.status === 'ready_for_review',
                        locked: !['ready_for_review', 'completed'].includes(selectedOrder.status)
                      },
                      { 
                        key: 'completed', 
                        label: 'Completed', 
                        done: selectedOrder.status === 'completed',
                        active: false,
                        locked: selectedOrder.status !== 'completed'
                      }
                    ].map((step, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full font-black text-[11px] shadow-xs ${
                          step.done
                            ? 'bg-purple-600 text-white'
                            : step.active
                            ? 'border-2 border-purple-200 bg-purple-600 text-white animate-pulse'
                            : step.locked
                            ? 'border border-slate-200 bg-slate-100 text-slate-400'
                            : 'border border-slate-200 bg-white text-slate-400'
                        }`}>
                          {step.done ? '✓' : step.locked ? '🔒' : idx + 1}
                        </div>
                        <span className={`mt-1.5 font-bold text-[10px] ${step.active ? 'text-purple-900 font-black' : step.done ? 'text-slate-800' : 'text-slate-400'}`}>
                          {step.label}
                        </span>
                        {step.time ? (
                          <span className="text-[9px] text-slate-400 font-semibold">{step.time}</span>
                        ) : step.sub ? (
                          <span className={`text-[9px] font-black ${step.active ? 'text-purple-600' : 'text-slate-400'}`}>{step.sub}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>

                {/* 2. Navigation Tabs */}
                <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-black">
                  {[
                    { key: 'tests', label: 'Tests & Results', icon: '🧪' },
                    { key: 'reports', label: `Reports (${attachedReports.length})`, icon: '📄' },
                    { key: 'activity', label: 'Activity Log', icon: '⏱️' },
                    { key: 'patient', label: 'Patient Details', icon: '👤' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setOrderActiveSubTab(tab.key)}
                      className={`flex items-center gap-2 pb-3 transition cursor-pointer ${
                        orderActiveSubTab === tab.key
                          ? 'border-b-2 border-purple-600 text-purple-700'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* 3. Tab Content */}
                {orderActiveSubTab === 'tests' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Left: Ordered Investigations (7 cols) */}
                    <div className="md:col-span-7 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Ordered Investigations ({selectedOrder.tests?.length || 0})
                        </h3>
                        <button
                          type="button"
                          onClick={() => navigate(`/labs/orders/${selectedOrder._id}/results`)}
                          className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
                        >
                          Expand All Results →
                        </button>
                      </div>

                      {(selectedOrder.tests || []).map((test, index) => {
                        const group = (selectedOrderResults.groups || []).find(
                          (g) => g.testCode === test.code || g.testName === test.name
                        ) || { results: [] };

                        const testTotal = group.results?.length || (test.name === 'Alpha Test' ? 5 : test.name === 'Haemoglobin' ? 10 : test.name === 'T.L.C' || test.name === 'T.L.C.' ? 5 : 5);
                        const testCompleted = (group.results || []).filter((r) => ['entered', 'not_applicable'].includes(r.status)).length;
                        const testPct = testTotal > 0 ? Math.round((testCompleted / testTotal) * 100) : 0;
                        const isTestDone = testTotal > 0 && testCompleted === testTotal;
                        const isInProgress = testCompleted > 0 && !isTestDone;

                        return (
                          <div
                            key={test._id || `${test.code}-${index}`}
                            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-purple-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl font-black text-xs ${
                                  isTestDone
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                  🧪
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black text-slate-900">{test.name}</h4>
                                    {test.code ? (
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 font-bold">
                                        {test.code}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                    {testTotal} parameters • Specimen: {test.specimenType || 'Blood'}
                                  </p>
                                </div>
                              </div>

                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                                isTestDone
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isInProgress
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {isTestDone ? '✓ Completed' : isInProgress ? '• In Progress' : 'Pending'}
                              </span>
                            </div>

                            {/* Progress bar inside card */}
                            <div className="mt-4 flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
                                  <div
                                    className={`h-full transition-all duration-300 ${isTestDone ? 'bg-emerald-500' : 'bg-purple-600'}`}
                                    style={{ width: `${testPct}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-slate-700 shrink-0">
                                {testCompleted} / {testTotal}
                              </span>

                              {/* Action Button -> Navigates to Enter Results or Order Details */}
                              {['results_entry', 'ready_for_review', 'completed'].includes(selectedOrder.status) ? (
                                <Link
                                  to={`/labs/orders/${selectedOrder._id}/results?testCode=${encodeURIComponent(test.code || test.name)}`}
                                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition shrink-0 cursor-pointer ${
                                    isTestDone
                                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs'
                                      : isInProgress
                                      ? 'bg-purple-600 text-white shadow-md shadow-purple-200 hover:bg-purple-700'
                                      : 'border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                                  }`}
                                >
                                  <span>{isTestDone ? 'View Results' : 'Enter Results'}</span>
                                  <ArrowRight size={12} />
                                </Link>
                              ) : (
                                <Link
                                  to={`/labs/orders/${selectedOrder._id}`}
                                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer border border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100"
                                >
                                  <span>🔒 Results Locked</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right: Upload & Attached Reports (5 cols) */}
                    <div className="md:col-span-5 space-y-5">
                      {/* Upload Laboratory Report Card */}
                      <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <UploadCloud size={16} className="text-purple-600" />
                          <span>Upload Laboratory Report</span>
                        </h4>

                        <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/20 p-5 text-center cursor-pointer transition hover:bg-purple-50/50 hover:border-purple-400">
                          <FileText className="h-7 w-7 text-purple-400 mb-1.5" />
                          <span className="text-xs font-black text-slate-800">Drag & drop report here or click to upload</span>
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5">Supports PDF, JPG, PNG (Max 10 MB)</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileUpload}
                            disabled={uploadingReportFile}
                            className="hidden"
                          />
                        </label>

                        {uploadingReportFile && (
                          <div className="text-center text-xs text-purple-600 font-black animate-pulse">
                            Uploading and processing document with GridFS...
                          </div>
                        )}
                      </article>

                      {/* Attached Reports Card */}
                      <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black text-slate-900">
                            Attached Reports ({attachedReports.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => setOrderActiveSubTab('reports')}
                            className="text-[10px] font-black text-purple-600 hover:underline cursor-pointer"
                          >
                            View All
                          </button>
                        </div>

                        <div className="space-y-2">
                          {attachedReports.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white font-black text-[9px]">
                                  PDF
                                </div>
                                <div>
                                  <div className="text-xs font-extrabold text-slate-900 truncate max-w-[140px]">{doc.fileName}</div>
                                  <div className="text-[9px] text-slate-400 font-bold">{doc.fileSize} • {doc.date}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${
                                  doc.type === 'Original'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                  {doc.type}
                                </span>
                                {doc.url && doc.url !== '#' ? (
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"
                                  >
                                    <ArrowUpRight size={14} />
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ))}

                          {attachedReports.length === 0 && (
                            <div className="py-4 text-center text-xs text-slate-400 font-bold">
                              No reports attached yet.
                            </div>
                          )}
                        </div>
                      </article>
                    </div>
                  </div>
                )}

                {/* Tab: Reports List */}
                {orderActiveSubTab === 'reports' && (
                  <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-black text-slate-900">Diagnostic Reports & Deliverables</h3>
                    <div className="space-y-3">
                      {attachedReports.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold py-6 text-center">No reports attached yet for this order.</p>
                      ) : (
                        attachedReports.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white font-black text-xs">
                                PDF
                              </div>
                              <div>
                                <div className="font-extrabold text-xs text-slate-900">{doc.fileName}</div>
                                <div className="text-[10px] text-slate-500 font-bold">{doc.fileSize} • Uploaded on {doc.date}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                                {doc.type}
                              </span>
                              {doc.url && doc.url !== '#' ? (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700 transition"
                                >
                                  Open Report
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Activity Log */}
                {orderActiveSubTab === 'activity' && (
                  <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-3 text-xs">
                    <h3 className="text-sm font-black text-slate-900 mb-4">Diagnostic Activity Log</h3>
                    <div className="space-y-3 border-l-2 border-purple-200 pl-4">
                      <div>
                        <div className="font-black text-slate-900">Order Placed & Registered</div>
                        <div className="text-[10px] text-slate-400 font-bold">{new Date(selectedOrder.orderedAt || selectedOrder.createdAt).toLocaleDateString()} • Clinic System</div>
                      </div>
                      <div>
                        <div className="font-black text-slate-900">Diagnostic Parameters Initialized</div>
                        <div className="text-[10px] text-slate-400 font-bold">LIMS Catalogue Engine</div>
                      </div>
                      {selectedOrder.sampleCollectedAt && (
                        <div>
                          <div className="font-black text-slate-900">Sample Specimen Collected</div>
                          <div className="text-[10px] text-slate-400 font-bold">{new Date(selectedOrder.sampleCollectedAt).toLocaleDateString()}</div>
                        </div>
                      )}
                      {selectedOrder.finalizedAt && (
                        <div>
                          <div className="font-black text-emerald-700">Order Finalized & Published to Patient EMR</div>
                          <div className="text-[10px] text-slate-400 font-bold">{new Date(selectedOrder.finalizedAt).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Patient Details */}
                {orderActiveSubTab === 'patient' && (
                  <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4 text-xs">
                    <h3 className="text-sm font-black text-slate-900">Patient Demographic Profile</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Full Name</span>
                        <div className="font-black text-slate-900">{selectedOrder.patientId?.fullName || selectedOrder.guestPatient?.fullName || 'vidya'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Gender & Age</span>
                        <div className="font-black text-slate-900">{selectedOrder.patientId?.gender || 'Female'}, {selectedOrder.patientId?.age || 28} years</div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Contact Phone</span>
                        <div className="font-black text-slate-900">{selectedOrder.patientId?.phone || selectedOrder.guestPatient?.phone || 'Not provided'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Referring Doctor</span>
                        <div className="font-black text-slate-900">{selectedOrder.doctorId?.fullName || 'Self / Walk-in'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Bottom Sticky Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => toast.success('Order draft saved securely.')}
                    className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span>💾</span>
                    <span>Save Draft</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {selectedOrder.status !== 'completed' ? (
                      <>
                        <button
                          type="button"
                          onClick={handleMarkReadyForReview}
                          className="flex items-center gap-1.5 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-2.5 text-xs font-black text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Mark Ready for Review</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsFinalizeModalOpen(true)}
                          className={`flex items-center gap-1.5 rounded-2xl px-6 py-2.5 text-xs font-black text-white shadow-md transition cursor-pointer ${
                            selectedOrderProgress.isAllComplete
                              ? 'bg-purple-600 shadow-purple-200 hover:bg-purple-700'
                              : 'bg-purple-600/90 shadow-purple-200 hover:bg-purple-700'
                          }`}
                          id="finalize-order-btn"
                        >
                          <CheckCircle2 size={14} />
                          <span>Finalize & Complete Order</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAmendDialog(true)}
                        className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-xs font-black text-amber-800 hover:bg-amber-100 transition cursor-pointer"
                      >
                        Amend Completed Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-8 text-center text-slate-400 py-20 font-bold space-y-3">
                <FlaskConical size={40} className="mx-auto text-purple-300 animate-pulse" />
                <h4 className="text-sm font-black text-slate-700">No Work Order Selected</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Select a diagnostic work order from the queue on the left to enter parameter results, review flags, and finalize reports.
                </p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* --- DIAGNOSTIC CATALOGUE --- */}
      {activeTab === 'catalogue' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900">Laboratory Catalogued Investigations</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleOpenGlobalCatalogueWizard} 
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Search size={12} /> Add from Global Catalogue
                </button>
                <button onClick={() => setShowNewTestModal(true)} className="px-3.5 py-2 bg-purple-600 hover:bg-purple-750 text-white rounded-xl text-xs font-black flex items-center gap-1 transition cursor-pointer">
                  <Plus size={12} /> Add Local Test
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-2">Test Name</th>
                    <th className="py-2.5 px-2">Code</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2">Specimen</th>
                    <th className="py-2.5 px-2">Parameters</th>
                    <th className="py-2.5 px-2">Availability</th>
                    <th className="py-2.5 px-2">Source</th>
                    <th className="py-2.5 px-2">Price</th>
                    <th className="py-2.5 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allTests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                        No laboratory tests configured yet.<br />
                        Add tests from the Global Catalogue or create a local laboratory test.
                      </td>
                    </tr>
                  ) : (
                    allTests.map(test => {
                      const globalCount = test.globalLabTestId?.parameters?.length || 0;
                      const localCount = test.localParameters?.length || 0;

                      return (
                        <tr 
                          key={test._id} 
                          onClick={() => handleOpenConfigureTest(test)}
                          className="hover:bg-slate-50/55 transition cursor-pointer"
                        >
                          <td className="py-3 px-2 font-black text-slate-800">{test.name}</td>
                          <td className="py-3 px-2 font-mono text-slate-505">{test.code}</td>
                          <td className="py-3 px-2 text-slate-500">{test.category}</td>
                          <td className="py-3 px-2 text-slate-500">{test.specimenType || 'Serum'}</td>
                          <td className="py-3 px-2 text-slate-500 font-bold">
                            {globalCount > 0 ? `${globalCount} Global` : ''}
                            {globalCount > 0 && localCount > 0 ? ' • ' : ''}
                            {localCount > 0 ? `${localCount} Local` : ''}
                            {globalCount === 0 && localCount === 0 ? '0' : ''}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              getTestAvailabilityStatus(test) === 'Fully Available' ? 'bg-emerald-50 text-emerald-700' :
                              getTestAvailabilityStatus(test) === 'Partially Available' ? 'bg-amber-50 text-amber-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {getTestAvailabilityStatus(test)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            {test.globalLabTestId ? (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded uppercase">Global</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded uppercase">Local</span>
                            )}
                          </td>
                          <td className="py-3 px-2 font-black text-slate-800">₹{test.price || test.testPrice}</td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenConfigureTest(test)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-[10px] font-black transition cursor-pointer"
                              >
                                Configure
                              </button>
                              <button
                                onClick={() => handleConfirmDeactivate(test)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black transition cursor-pointer"
                              >
                                Deactivate
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- LAB INVENTORY TAB --- */}
      {activeTab === 'inventory' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-sm font-black text-slate-905">Reagents &amp; Consumables Stock</h3>
            <button 
              onClick={() => setShowAddConsumableModal(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add Consumable
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2">Consumable Item</th>
                  <th className="py-3 px-2">Category</th>
                  <th className="py-3 px-2">Available Stock</th>
                  <th className="py-3 px-2">Reorder Level</th>
                  <th className="py-3 px-2">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {consumables.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-2 font-extrabold text-slate-905">{item.name}</td>
                    <td className="py-3.5 px-2 text-slate-500 font-semibold">{item.category}</td>
                    <td className="py-3.5 px-2">
                      <span className={`font-black ${item.stock <= item.reorderLevel ? 'text-amber-600' : 'text-slate-900'}`}>
                        {item.stock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-semibold">{item.reorderLevel} units</td>
                    <td className="py-3.5 px-2 text-slate-550">{item.supplier || 'Lab Supplies Corp'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- LAB PATIENTS TAB --- */}
      {activeTab === 'patients' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-sm font-black text-slate-905">Laboratory Patients Registry</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2">Patient Name</th>
                  <th className="py-3 px-2">UHID / Patient ID</th>
                  <th className="py-3 px-2">Gender / Age</th>
                  <th className="py-3 px-2">Contact</th>
                  <th className="py-3 px-2">Total Lab Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {orders.map(o => o.patientId).filter((p, index, self) => p && self.findIndex(t => t._id === p._id) === index).map(patient => (
                  <tr key={patient._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-2 font-extrabold text-slate-905">{patient.fullName}</td>
                    <td className="py-3.5 px-2 text-purple-650">{patient.patientId || patient._id.slice(-8).toUpperCase()}</td>
                    <td className="py-3.5 px-2">{patient.gender} / {patient.age || '32'} yrs</td>
                    <td className="py-3.5 px-2 text-slate-550">{patient.phone || '—'}</td>
                    <td className="py-3.5 px-2 text-slate-900 font-black">
                      {orders.filter(o => o.patientId?._id === patient._id).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- REPORTS LIST TAB --- */}
      {activeTab === 'reports' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-sm font-black text-slate-905">Laboratory Analysis Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2">Order ID</th>
                  <th className="py-3 px-2">Patient</th>
                  <th className="py-3 px-2">Investigation</th>
                  <th className="py-3 px-2">AI Risk Level</th>
                  <th className="py-3 px-2">Review Status</th>
                  <th className="py-3 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {orders.map(o => (
                  <tr key={o._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-2 font-black text-purple-600">{o.orderNumber || o._id.slice(-6).toUpperCase()}</td>
                    <td className="py-3.5 px-2 font-bold text-slate-805">{o.patientId?.fullName || "Walk-in"}</td>
                    <td className="py-3.5 px-2">{o.tests?.map(t => t.name).join(', ')}</td>
                    <td className="py-3.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        o.report?.aiRiskLevel === 'high' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                      }`}>{o.report?.aiRiskLevel || 'low'}</span>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 uppercase">
                        {o.report?.aiReviewStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <button onClick={() => toast.success('Displaying PDF report...')} className="px-3 py-1 bg-purple-50 text-purple-650 hover:bg-purple-100 rounded-xl font-bold transition">View Report</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- QC & CALIBRATION TAB --- */}
      {activeTab === 'qc' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-sm font-black text-slate-905">Analyzer Calibration Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2">Equipment / Analyzer</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Last Calibration</th>
                  <th className="py-3 px-2">Next Scheduled Check</th>
                  <th className="py-3 px-2">Operator Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {equipment.map(eq => (
                  <tr key={eq._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-2 font-extrabold text-slate-905">{eq.name}</td>
                    <td className="py-3.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        eq.calibrationStatus === 'Pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>{eq.calibrationStatus || 'Pass'}</span>
                    </td>
                    <td className="py-3.5 px-2 text-slate-500">{eq.lastCalibration ? new Date(eq.lastCalibration).toLocaleDateString() : 'Active'}</td>
                    <td className="py-3.5 px-2 text-slate-500">{eq.nextCalibration ? new Date(eq.nextCalibration).toLocaleDateString() : 'Scheduled'}</td>
                    <td className="py-3.5 px-2 text-slate-400 font-bold">Verified (Auto)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- REPORTS & ANALYTICS TAB --- */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Turnaround Time (TAT) Analytics</h3>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100/50">
                <span className="text-[10px] font-black text-purple-655 uppercase">AVERAGE TESTING TAT</span>
                <h4 className="text-3xl font-black text-purple-750 mt-1">2.4 Hours</h4>
                <p className="text-[9px] text-slate-400 mt-1 font-bold">Target SLA threshold: 4.0 Hours</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Laboratory Volume mix</h3>
            <div className="p-12 text-center text-xs text-slate-400 font-bold">
              Charts & performance trends updated live.
            </div>
          </div>
        </div>
      )}

      {/* --- STAFF MANAGEMENT TAB --- */}
      {activeTab === 'staff' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-sm font-black text-slate-905">Laboratory Operators &amp; Pathologists</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2">Staff Member</th>
                  <th className="py-3 px-2">Role Assignment</th>
                  <th className="py-3 px-2">Contact Info</th>
                  <th className="py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-2 font-extrabold text-slate-905">Dr. Sarah Conner</td>
                  <td className="py-3.5 px-2 text-purple-600">Chief Pathologist</td>
                  <td className="py-3.5 px-2 text-slate-500">sarah@clinic.com</td>
                  <td className="py-3.5 px-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 uppercase">On duty</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-2 font-extrabold text-slate-905">Alex Vance</td>
                  <td className="py-3.5 px-2 text-purple-600">Lab Technician</td>
                  <td className="py-3.5 px-2 text-slate-550">alex@clinic.com</td>
                  <td className="py-3.5 px-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 uppercase">On duty</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h3 className="text-sm font-black text-slate-905">Laboratory Scoped Configuration</h3>
          </div>
          <div className="max-w-md space-y-4 text-xs font-semibold text-slate-700">
            <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div>
                <p className="font-extrabold text-slate-805">Enable AI Result Pre-validation</p>
                <p className="text-[9px] text-slate-400">Pre-analyze entries using clinical AI model.</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-purple-600 rounded" />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div>
                <p className="font-extrabold text-slate-805">Auto-Notify Critical Values</p>
                <p className="text-[9px] text-slate-400">Instantly trigger SMS alerts to physicians.</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-purple-600 rounded" />
            </div>
          </div>
        </div>
      )}

      {/* --- NEW WALK-IN ORDER MODAL --- */}
      {showWalkinModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905">Register Walk-in Lab Order</h3>
              <button onClick={() => setShowWalkinModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateWalkinOrder} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Select Patient *</label>
                <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
                  <option value="">-- Choose Patient --</option>
                  {patientsList.map(p => (
                    <option key={p._id} value={p._id}>{p.fullName} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Requesting Doctor (Optional)</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                  <option value="">-- Choose Doctor --</option>
                  {doctorsList.map(d => (
                    <option key={d._id} value={d._id}>{d.fullName || d.firstName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Investigations / Tests *</label>
                <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-2.5 space-y-1.5">
                  {allTests.map(t => (
                    <label key={t._id} className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedTestIds.includes(t._id)} 
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedTestIds([...selectedTestIds, t._id]);
                          } else {
                            setSelectedTestIds(selectedTestIds.filter(id => id !== t._id));
                          }
                        }}
                      />
                      <span>{t.name} (₹{t.price || t.testPrice})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Priority</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" value={walkinPriority} onChange={e => setWalkinPriority(e.target.value)}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent / STAT</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Notes</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" value={walkinNotes} onChange={e => setWalkinNotes(e.target.value)} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-55 flex gap-2">
                <button type="submit" disabled={submittingWalkin} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition">
                  {submittingWalkin ? 'Creating...' : 'Create Lab Order'}
                </button>
                <button type="button" onClick={() => setShowWalkinModal(false)} className="flex-1 py-2.5 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD CONSUMABLE MODAL --- */}
      {showAddConsumableModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905">Register Reagents &amp; Consumables</h3>
              <button onClick={() => setShowAddConsumableModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddConsumable} className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Item Name</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.name} onChange={e => setNewConsumable({ ...newConsumable, name: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Category</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.category} onChange={e => setNewConsumable({ ...newConsumable, category: e.target.value })}>
                  <option value="Consumables">Consumables</option>
                  <option value="Reagents">Reagents</option>
                  <option value="Chemicals">Chemicals</option>
                  <option value="Glassware">Glassware</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Available Qty</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.stock} onChange={e => setNewConsumable({ ...newConsumable, stock: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Reorder Level</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.reorderLevel} onChange={e => setNewConsumable({ ...newConsumable, reorderLevel: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Rack Location</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.rack} onChange={e => setNewConsumable({ ...newConsumable, rack: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Supplier</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newConsumable.supplier} onChange={e => setNewConsumable({ ...newConsumable, supplier: e.target.value })} />
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-50 flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-xl font-bold">Add to Stock</button>
                <button type="button" onClick={() => setShowAddConsumableModal(false)} className="flex-1 py-2 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TEST MODAL --- */}
      {showNewTestModal && (
        <div className="fixed inset-x-0 bottom-0 top-[64px] bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-6 z-40 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-2xl w-full p-6 space-y-4 my-auto max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-black text-slate-905 text-sm">Create Local Laboratory Test</h3>
              <button onClick={() => setShowNewTestModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
              <form onSubmit={handleCreateNewTest} className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Test Name</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold" value={newTest.name} onChange={e => setNewTest({ ...newTest, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Local Test Code</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono" value={newTest.code} onChange={e => setNewTest({ ...newTest, code: e.target.value })} />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Category</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold" value={newTest.category} onChange={e => setNewTest({ ...newTest, category: e.target.value })}>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Serology">Serology</option>
                    <option value="Hormones">Hormones</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Department</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.department} onChange={e => setNewTest({ ...newTest, department: e.target.value })} />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Sample / Specimen Type</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.sampleType} onChange={e => setNewTest({ ...newTest, sampleType: e.target.value })} />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Methodology</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.methodology} onChange={e => setNewTest({ ...newTest, methodology: e.target.value })} />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Reporting Time / TAT</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.normalTime} onChange={e => setNewTest({ ...newTest, normalTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Price (₹)</label>
                  <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newTest.price} onChange={e => setNewTest({ ...newTest, price: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 font-bold block mb-1">Important Instructions</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 h-16 resize-none" value={newTest.importantInstructions} onChange={e => setNewTest({ ...newTest, importantInstructions: e.target.value })} />
                </div>
                <div className="flex items-center gap-4 py-2 col-span-2">
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={newTest.doctorPrescriptionRequired} onChange={e => setNewTest({ ...newTest, doctorPrescriptionRequired: e.target.checked })} className="rounded text-purple-600 focus:ring-purple-500" />
                    Doctor Prescription Required
                  </label>
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={newTest.homeCollectionAvailable} onChange={e => setNewTest({ ...newTest, homeCollectionAvailable: e.target.checked })} className="rounded text-purple-600 focus:ring-purple-500" />
                    Home Collection Available
                  </label>
                </div>

                {/* Parameters Segment */}
                <div className="col-span-2 border-t border-slate-100 pt-3 mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-slate-900 text-xs">Test Parameters ({newTest.localParameters.length})</h4>
                    <button type="button" onClick={() => setShowLocalTestParamForm(true)} className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-[10px] font-black cursor-pointer">
                      + Add Parameter
                    </button>
                  </div>

                  {showLocalTestParamForm && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Parameter Name</label>
                          <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5" value={tempLocalParam.name} onChange={e => setTempLocalParam({ ...tempLocalParam, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Short Name</label>
                          <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5" value={tempLocalParam.shortName} onChange={e => setTempLocalParam({ ...tempLocalParam, shortName: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Result Type</label>
                          <select className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5" value={tempLocalParam.resultType} onChange={e => setTempLocalParam({ ...tempLocalParam, resultType: e.target.value })}>
                            <option value="NUMERIC">Numeric</option>
                            <option value="QUALITATIVE">Qualitative</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Measurement Unit</label>
                          <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5" value={tempLocalParam.unit} onChange={e => setTempLocalParam({ ...tempLocalParam, unit: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Description</label>
                          <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5" value={tempLocalParam.description} onChange={e => setTempLocalParam({ ...tempLocalParam, description: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button type="button" onClick={() => setShowLocalTestParamForm(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-[10px] text-slate-700 bg-white">Cancel</button>
                        <button type="button" onClick={handleAddLocalParamToNewTest} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-black text-[10px]">Add Parameter</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {newTest.localParameters.map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-slate-800">{p.name}</span>
                          {p.shortName && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-slate-200/50 text-slate-500 rounded font-bold">{p.shortName}</span>}
                          <span className="ml-2 text-[9px] text-purple-650 font-black tracking-wider bg-purple-50 px-1.5 py-0.5 rounded">{p.resultType}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveLocalParamFromNewTest(idx)} className="text-rose-500 hover:text-rose-700 font-bold text-[10px]">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 pt-3 border-t border-slate-100 flex gap-2 shrink-0">
                  <button type="submit" className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition shadow-md">Create & Save Local Test</button>
                  <button type="button" onClick={() => setShowNewTestModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD FROM GLOBAL CATALOGUE MODAL (WIZARD) --- */}
      {showGlobalSearchModal && (
        <div className="fixed inset-x-0 bottom-0 top-[64px] bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-6 z-40 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-4xl w-full p-6 space-y-4 flex flex-col my-auto max-h-[80vh]">
            
            {/* Modal Header & Progress Indicator */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="font-black text-slate-905 text-sm">Add Tests from Global Catalogue</h3>
                <div className="flex items-center gap-2 mt-1.5 text-[9px] font-black text-slate-400">
                  <span className={wizardStep === 1 ? 'text-purple-600' : ''}>1. Select Tests</span>
                  <span>→</span>
                  <span className={wizardStep === 2 ? 'text-purple-600' : ''}>2. Configure Parameters</span>
                  <span>→</span>
                  <span className={wizardStep === 3 ? 'text-purple-600' : ''}>3. Test Details</span>
                  <span>→</span>
                  <span className={wizardStep === 4 ? 'text-purple-600' : ''}>4. Review & Confirm</span>
                </div>
              </div>
              <button onClick={() => setShowGlobalSearchModal(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X size={18} /></button>
            </div>

            {/* Step 1 — Select Tests */}
            {wizardStep === 1 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search global test name, short name, global ID, category, methodology, LOINC..."
                    value={globalSearchQuery}
                    onChange={e => setGlobalSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-705 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50 min-h-0 bg-slate-50/10">
                  {loadingGlobalResults ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-400">Searching master catalog...</div>
                  ) : globalSearchResults.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-400">No matching global tests found.</div>
                  ) : (
                    globalSearchResults.map(g => (
                      <div key={g._id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition text-xs">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            disabled={g.isActivated}
                            checked={selectedGlobalTestIds.includes(g._id) || g.isActivated}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedGlobalTestIds([...selectedGlobalTestIds, g._id]);
                              } else {
                                setSelectedGlobalTestIds(selectedGlobalTestIds.filter(id => id !== g._id));
                              }
                            }}
                            className="mt-1 h-3.5 w-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800">{g.name}</span>
                              {g.shortName && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">{g.shortName}</span>}
                              {g.isActivated && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-black uppercase">Already Added</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">
                              ID: {g.globalId} | Dept: {g.department} | Sample: {g.sampleType || 'Serum'} | LOINC: {g.loincCode || 'N/A'} | Parameters: {g.parameterCount || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end shrink-0">
                  <button onClick={() => setShowGlobalSearchModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-705 hover:bg-slate-50">Cancel</button>
                  <button 
                    onClick={handleGoToStep2}
                    disabled={selectedGlobalTestIds.filter(id => !allTests.some(t => t.globalLabTestId?._id === id)).length === 0}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    Continue — {selectedGlobalTestIds.length} Selected
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Configure Parameters */}
            {wizardStep === 2 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pr-1">
                  {selectedGlobalTestIds.map(testId => {
                    const globalTest = globalSearchResults.find(g => g._id === testId);
                    const config = wizardTestConfigs[testId];
                    if (!globalTest || !config) return null;

                    return (
                      <div key={testId} className="border border-slate-100 rounded-3xl p-5 space-y-4 bg-slate-50/15">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                          <div>
                            <span className="text-[9px] font-black text-purple-650 uppercase">Investigation Parameters Configuration</span>
                            <h4 className="font-black text-slate-800 text-sm mt-0.5">{globalTest.name}</h4>
                          </div>
                        </div>

                        {/* Hierarchical T-Shaped Tree structure */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                          
                          {/* Left Branch: Global Parameters */}
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Global Parameters (Read-Only)</span>
                            <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-1">
                              {globalTest.parameters?.length === 0 ? (
                                <p className="text-slate-400 italic text-[11px]">No global parameters defined.</p>
                              ) : (
                                globalTest.parameters?.map(p => {
                                  const currentOverride = config.parameterOverrides.find(o => String(o.parameterId) === String(p._id));
                                  const isAvailable = !currentOverride || currentOverride.isAvailable !== false;

                                  return (
                                    <div key={p._id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-xs">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-extrabold text-slate-800 text-xs">{p.name}</span>
                                          <span className="text-[8px] px-1 bg-slate-100 text-slate-500 rounded font-black">GLOBAL</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{p.code} | {p.dataType}</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = config.parameterOverrides.filter(o => String(o.parameterId) !== String(p._id));
                                          const updatedConfigs = { ...wizardTestConfigs };
                                          updatedConfigs[testId].parameterOverrides = [
                                            ...filtered,
                                            { parameterId: p._id, isAvailable: !isAvailable }
                                          ];
                                          setWizardTestConfigs(updatedConfigs);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition ${
                                          isAvailable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                        }`}
                                      >
                                        {isAvailable ? 'Available' : 'Unavailable'}
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Right Branch: Laboratory Local Parameters */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Laboratory Parameters (Local)</span>
                              <button 
                                type="button" 
                                onClick={() => setActiveParamAddingTestId(testId)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-650 rounded-lg text-[10px] font-black flex items-center gap-1 transition"
                              >
                                <Plus size={10} /> Add Local Parameter
                              </button>
                            </div>
                            
                            <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-1">
                              {config.localParameters.length === 0 ? (
                                <p className="text-slate-400 italic text-[11px] py-2">No local parameters configured.</p>
                              ) : (
                                config.localParameters.map((lp, idx) => (
                                  <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-xs">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-slate-800 text-xs">{lp.name}</span>
                                        <span className="text-[8px] px-1 bg-amber-50 text-amber-600 rounded font-black">LOCAL</span>
                                      </div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{lp.resultType} {lp.unit ? `| ${lp.unit}` : ''}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = { ...wizardTestConfigs };
                                        updated[testId].localParameters = config.localParameters.filter((_, i) => i !== idx);
                                        setWizardTestConfigs(updated);
                                      }}
                                      className="text-rose-500 hover:text-rose-700 font-bold text-[10px]"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between shrink-0">
                  <button onClick={() => setWizardStep(1)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-705 hover:bg-slate-50">Back</button>
                  <button onClick={() => setWizardStep(3)} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition">Continue to Test Details</button>
                </div>
              </div>
            )}

            {/* Step 3 — Configure Laboratory Test Details */}
            {wizardStep === 3 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pr-1">
                  {selectedGlobalTestIds.map(testId => {
                    const globalTest = globalSearchResults.find(g => g._id === testId);
                    const config = wizardTestConfigs[testId];
                    if (!globalTest || !config) return null;

                    return (
                      <div key={testId} className="border border-slate-100 rounded-3xl p-5 space-y-4 bg-slate-50/15">
                        <div className="border-b border-slate-50 pb-2">
                          <span className="text-[9px] font-black text-purple-650 uppercase">Operational & Commercial Specifications</span>
                          <h4 className="font-black text-slate-800 text-sm mt-0.5">{globalTest.name}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="text-slate-400 font-bold block mb-1">Local Test Name</label>
                            <input 
                              type="text" 
                              required 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none" 
                              value={config.name} 
                              onChange={e => {
                                const updated = { ...wizardTestConfigs };
                                updated[testId].name = e.target.value;
                                setWizardTestConfigs(updated);
                              }} 
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 font-bold block mb-1">Local Test Code</label>
                            <input 
                              type="text" 
                              required 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none" 
                              value={config.code} 
                              onChange={e => {
                                const updated = { ...wizardTestConfigs };
                                updated[testId].code = e.target.value;
                                setWizardTestConfigs(updated);
                              }} 
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 font-bold block mb-1">Laboratory Pricing (₹)</label>
                            <input 
                              type="number" 
                              required 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none" 
                              value={config.price} 
                              onChange={e => {
                                const updated = { ...wizardTestConfigs };
                                updated[testId].price = Number(e.target.value);
                                setWizardTestConfigs(updated);
                              }} 
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 font-bold block mb-1">Reporting / Delivery Time (TAT)</label>
                            <select 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none"
                              value={config.turnaroundTime}
                              onChange={e => {
                                const updated = { ...wizardTestConfigs };
                                updated[testId].turnaroundTime = e.target.value;
                                setWizardTestConfigs(updated);
                              }}
                            >
                              <option value="Same Day">Same Day</option>
                              <option value="24 Hours">24 Hours</option>
                              <option value="48 Hours">48 Hours</option>
                              <option value="Custom">Custom</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={config.doctorPrescriptionRequired}
                                onChange={e => {
                                  const updated = { ...wizardTestConfigs };
                                  updated[testId].doctorPrescriptionRequired = e.target.checked;
                                  setWizardTestConfigs(updated);
                                }}
                              />
                              <span>Doctor Prescription Required</span>
                            </label>

                            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={config.homeCollectionAvailable}
                                onChange={e => {
                                  const updated = { ...wizardTestConfigs };
                                  updated[testId].homeCollectionAvailable = e.target.checked;
                                  setWizardTestConfigs(updated);
                                }}
                              />
                              <span>Home Collection Available</span>
                            </label>
                          </div>

                          <div>
                            <label className="text-slate-400 font-bold block mb-1">Collection Locations</label>
                            <div className="flex gap-4 mt-1.5">
                              {['Laboratory', 'Home Collection', 'External Collection Centre'].map(loc => {
                                const activeLocs = config.collectionLocations || [];
                                const isChecked = activeLocs.includes(loc);
                                return (
                                  <label key={loc} className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={e => {
                                        const updated = { ...wizardTestConfigs };
                                        if (e.target.checked) {
                                          updated[testId].collectionLocations = [...activeLocs, loc];
                                        } else {
                                          updated[testId].collectionLocations = activeLocs.filter(l => l !== loc);
                                        }
                                        setWizardTestConfigs(updated);
                                      }}
                                    />
                                    <span>{loc}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <label className="text-slate-400 font-bold block mb-1">Important Instructions (Patient Prep, etc.)</label>
                            <textarea 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold focus:outline-none" 
                              rows={2}
                              value={config.importantInstructions}
                              onChange={e => {
                                const updated = { ...wizardTestConfigs };
                                updated[testId].importantInstructions = e.target.value;
                                setWizardTestConfigs(updated);
                              }}
                              placeholder="Fasting required 8-12 hours before, etc."
                            />
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between shrink-0">
                  <button onClick={() => setWizardStep(2)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-705 hover:bg-slate-50">Back</button>
                  <button onClick={() => setWizardStep(4)} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition">Continue to Review</button>
                </div>
              </div>
            )}

            {/* Step 4 — Review Summary & Ingestion */}
            {wizardStep === 4 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
                  <div className="p-4 bg-purple-50/20 border border-purple-100/50 rounded-2xl">
                    <p className="text-[11px] text-purple-750 font-black">Please review your configurations before publishing them to your Diagnostic Catalogue.</p>
                  </div>

                  <div className="border border-slate-100 rounded-3xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="py-2.5 px-4">Test Description</th>
                          <th className="py-2.5 px-2">Parameters Map</th>
                          <th className="py-2.5 px-2">Operational Scope</th>
                          <th className="py-2.5 px-2">Calculated Status</th>
                          <th className="py-2.5 px-4 text-right">Selling Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedGlobalTestIds.map(testId => {
                          const config = wizardTestConfigs[testId];
                          if (!config) return null;
                          const dynamicStatus = getTestAvailabilityStatus(config);

                          return (
                            <tr key={testId} className="hover:bg-slate-50/30 transition">
                              <td className="py-3 px-4">
                                <p className="font-black text-slate-800">{config.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{config.code}</p>
                              </td>
                              <td className="py-3 px-2">
                                <p className="font-semibold text-slate-600">{(config.parameterOverrides || []).filter(o => o.isAvailable !== false).length} Active Globals</p>
                                <p className="text-[10px] text-purple-600 font-bold mt-0.5">{lp => lp.localParameters?.length || 0} Local Additions</p>
                              </td>
                              <td className="py-3 px-2">
                                <p className="text-slate-500 font-semibold">{config.turnaroundTime}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Prescription: {config.doctorPrescriptionRequired ? 'Required' : 'Optional'}</p>
                              </td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  dynamicStatus === 'Fully Available' ? 'bg-emerald-50 text-emerald-700' :
                                  dynamicStatus === 'Partially Available' ? 'bg-amber-50 text-amber-700' :
                                  'bg-rose-50 text-rose-700'
                                }`}>
                                  {dynamicStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-black text-slate-800 text-sm">₹{config.price}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between shrink-0">
                  <button onClick={() => setWizardStep(3)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-705 hover:bg-slate-50">Back</button>
                  <button onClick={handleBulkActivateGlobal} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer">Save &amp; Add Tests</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* --- ADD LOCAL PARAMETER WIZARD INNER FORM DRAWER --- */}
      {activeParamAddingTestId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="font-black text-slate-905 text-sm">Create Local Test Parameter</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">This parameter will only belong to this laboratory test configuration</p>
              </div>
              <button onClick={() => setActiveParamAddingTestId(null)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X size={18} /></button>
            </div>

            <form 
              onSubmit={e => {
                e.preventDefault();
                const config = wizardTestConfigs[activeParamAddingTestId];
                if (config) {
                  const updated = { ...wizardTestConfigs };
                  updated[activeParamAddingTestId].localParameters = [
                    ...config.localParameters,
                    {
                      name: newLocalParam.name,
                      shortName: newLocalParam.shortName,
                      resultType: newLocalParam.resultType,
                      unit: newLocalParam.resultType === 'NUMERIC' ? newLocalParam.unit : '',
                      decimalPrecision: newLocalParam.resultType === 'NUMERIC' ? Number(newLocalParam.decimalPrecision) : 0,
                      description: newLocalParam.description,
                      referenceRanges: newLocalParam.resultType === 'NUMERIC' ? [
                        {
                          gender: newLocalParam.gender,
                          ageFrom: newLocalParam.ageFrom ? Number(newLocalParam.ageFrom) : null,
                          ageTo: newLocalParam.ageTo ? Number(newLocalParam.ageTo) : null,
                          ageUnit: newLocalParam.ageUnit,
                          lowerOperator: newLocalParam.lowerOperator,
                          upperOperator: newLocalParam.upperOperator,
                          lowerValue: newLocalParam.lowerValue ? Number(newLocalParam.lowerValue) : null,
                          upperValue: newLocalParam.upperValue ? Number(newLocalParam.upperValue) : null
                        }
                      ] : [],
                      allowedValues: newLocalParam.resultType === 'QUALITATIVE' ? newLocalParam.allowedValues : []
                    }
                  ];
                  setWizardTestConfigs(updated);
                }
                // Reset form
                setNewLocalParam({
                  name: '',
                  shortName: '',
                  resultType: 'NUMERIC',
                  unit: '',
                  decimalPrecision: 1,
                  description: '',
                  gender: 'ALL',
                  ageFrom: '',
                  ageTo: '',
                  ageUnit: 'YEARS',
                  lowerOperator: 'Between',
                  upperOperator: 'Between',
                  lowerValue: '',
                  upperValue: '',
                  qualitativeValueText: '',
                  allowedValues: []
                });
                setActiveParamAddingTestId(null);
              }}
              className="flex-1 overflow-y-auto space-y-4 text-xs min-h-0 pr-1"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Parameter Name *</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newLocalParam.name} onChange={e => setNewLocalParam({ ...newLocalParam, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Short Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newLocalParam.shortName} onChange={e => setNewLocalParam({ ...newLocalParam, shortName: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Result Type</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" 
                    value={newLocalParam.resultType} 
                    onChange={e => setNewLocalParam({ ...newLocalParam, resultType: e.target.value, allowedValues: [] })}
                  >
                    <option value="NUMERIC">Numeric</option>
                    <option value="QUALITATIVE">Qualitative</option>
                    <option value="TEXT">Text</option>
                  </select>
                </div>
                {newLocalParam.resultType === 'NUMERIC' && (
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Measurement Unit</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newLocalParam.unit} onChange={e => setNewLocalParam({ ...newLocalParam, unit: e.target.value })} placeholder="e.g. g/dL, mg/dL" />
                  </div>
                )}
              </div>

              {newLocalParam.resultType === 'NUMERIC' && (
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 space-y-3">
                  <span className="text-[10px] font-black text-purple-650 uppercase">Structured Reference Range</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Gender</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1" value={newLocalParam.gender} onChange={e => setNewLocalParam({ ...newLocalParam, gender: e.target.value })}>
                        <option value="ALL">All</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Lower Operator</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1" value={newLocalParam.lowerOperator} onChange={e => setNewLocalParam({ ...newLocalParam, lowerOperator: e.target.value })}>
                        <option value="Between">Between</option>
                        <option value=">=">&gt;=</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="<=">&lt;=</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Lower Value</label>
                      <input type="number" step="any" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1" value={newLocalParam.lowerValue} onChange={e => setNewLocalParam({ ...newLocalParam, lowerValue: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Upper Operator</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1" value={newLocalParam.upperOperator} onChange={e => setNewLocalParam({ ...newLocalParam, upperOperator: e.target.value })}>
                        <option value="Between">Between</option>
                        <option value=">=">&gt;=</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="<=">&lt;=</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Upper Value</label>
                      <input type="number" step="any" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1" value={newLocalParam.upperValue} onChange={e => setNewLocalParam({ ...newLocalParam, upperValue: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {newLocalParam.resultType === 'QUALITATIVE' && (
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 space-y-3">
                  <span className="text-[10px] font-black text-purple-650 uppercase">Allowed Qualitative Values</span>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add tag (e.g. Positive, Negative)" 
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                      value={newLocalParam.qualitativeValueText}
                      onChange={e => setNewLocalParam({ ...newLocalParam, qualitativeValueText: e.target.value })}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (newLocalParam.qualitativeValueText.trim()) {
                          setNewLocalParam({
                            ...newLocalParam,
                            allowedValues: [...newLocalParam.allowedValues, { value: newLocalParam.qualitativeValueText.trim(), isAbnormal: false }],
                            qualitativeValueText: ''
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-lg"
                    >
                      + Add Value
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {newLocalParam.allowedValues.map((av, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg font-extrabold flex items-center gap-1.5">
                        {av.value}
                        <button 
                          type="button" 
                          onClick={() => setNewLocalParam({ ...newLocalParam, allowedValues: newLocalParam.allowedValues.filter((_, i) => i !== idx) })}
                          className="text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 font-bold block mb-1">Description</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newLocalParam.description} onChange={e => setNewLocalParam({ ...newLocalParam, description: e.target.value })} />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button type="button" onClick={() => setActiveParamAddingTestId(null)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-705">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl">Add Parameter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIGURE TEST MODAL / DRAWER --- */}
      {editingLabTest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="font-black text-slate-905 text-sm">Configure Investigation</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Customize local price, TAT, and parameter availabilities</p>
              </div>
              <button onClick={() => setEditingLabTest(null)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveConfigureTest} className="flex-1 overflow-y-auto space-y-4 text-xs min-h-0 pr-1">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100/55 space-y-1.5">
                <span className="text-[9px] font-black text-purple-650 uppercase tracking-wide">Global Master Specification</span>
                <h4 className="font-black text-slate-800 text-xs">{editingLabTest.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold">
                  Category: {editingLabTest.category} | Specimen: {editingLabTest.specimenType || 'Serum'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Local Test Code</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none" 
                    value={editingCode} 
                    onChange={e => setEditingCode(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Local Pricing (₹)</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none" 
                    value={editingPrice} 
                    onChange={e => setEditingPrice(Number(e.target.value))} 
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Turnaround Time (TAT)</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none" 
                  value={editingTAT} 
                  onChange={e => setEditingTAT(e.target.value)} 
                />
              </div>

              {editingLabTest.globalLabTestId?.parameters?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-slate-400 font-bold block mb-1">Parameter / Analyte Availabilities</label>
                  <div className="border border-slate-100 rounded-2xl divide-y divide-slate-50 overflow-hidden bg-slate-50/20">
                    {editingLabTest.globalLabTestId.parameters.map(param => {
                      const match = editingParamsOverride.find(o => String(o.parameterId) === String(param._id));
                      const isAvailable = !match || match.isAvailable !== false;
                      
                      return (
                        <div key={param._id} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-extrabold text-slate-800">{param.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{param.code} | {param.dataType} ({param.unit || '—'})</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const otherOverrides = editingParamsOverride.filter(o => String(o.parameterId) !== String(param._id));
                              setEditingParamsOverride([
                                ...otherOverrides,
                                { parameterId: param._id, isAvailable: !isAvailable }
                              ]);
                            }}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition cursor-pointer ${
                              isAvailable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            {isAvailable ? 'Available' : 'Unavailable'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end shrink-0">
                <button 
                  type="button" 
                  onClick={() => setEditingLabTest(null)} 
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-705 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- DEACTIVATE CONFIRMATION MODAL --- */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905 text-sm">Remove Test from Laboratory?</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{testToDeactivate?.name}</p>
            </div>
            
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              This test will no longer be available in this laboratory's catalogued investigations. Existing historical orders and reports will remain unaffected.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => {
                  setShowDeactivateConfirm(false);
                  setTestToDeactivate(null);
                }} 
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-750 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleExecuteDeactivate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Deactivate Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalization Modal */}
      <LabOrderFinalizationModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        orderId={selectedOrder?._id}
        orderNumber={selectedOrder?.orderNumber}
        onFinalized={() => {
          loadOrderResultsData(selectedOrder?._id);
          loadDashboardData();
        }}
        onOpenTestResultEntry={(testName) => {
          navigate(`/labs/orders/${selectedOrder?._id}/results?testCode=${encodeURIComponent(testName)}`);
        }}
      />

      {/* Create Lab Order Modal */}
      <CreateLabOrderModal
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        initialLaboratoryId={laboratoryId}
        initialClinicId={activeClinicId}
        onOrderCreated={(newOrder) => {
          loadDashboardData();
          if (newOrder) setSelectedOrder(newOrder);
        }}
      />

      {/* Amend Dialog */}
      {showAmendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-2">Amend Completed Lab Order</h3>
            <p className="text-xs text-slate-600 mb-4 font-semibold">
              This will unlock all diagnostic parameter results for editing and record an audit log with your reason.
            </p>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Amendment Reason (Mandatory)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Doctor requested re-test of parameter values..."
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAmendDialog(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAmendOrder}
                disabled={isAmending || amendReason.trim().length < 5}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 disabled:bg-slate-300 cursor-pointer"
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

export default LaboratoryWorkspace;
