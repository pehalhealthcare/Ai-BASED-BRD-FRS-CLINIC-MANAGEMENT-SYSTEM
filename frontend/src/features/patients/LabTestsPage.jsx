import { useEffect, useState, useMemo } from 'react';
import {
  FlaskConical, Search, Clock, Droplet, ClipboardList, CheckCircle,
  AlertCircle, Calendar, X, ChevronRight, Activity, Bell, FileText,
  Filter, ArrowRight, ShieldAlert, BadgeInfo, Sparkles, Building2,
  Home, Check, HelpCircle, RefreshCw, ShoppingCart, Tag
} from 'lucide-react';
import { labApi, patientApi, prescriptionApi, clinicApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function LabTestsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation Modes: 'prescription' | 'catalog' | 'history'
  const [activeMode, setActiveMode] = useState('prescription');
  
  // Clinic & Lab context
  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [attachedLaboratories, setAttachedLaboratories] = useState([]);
  const [selectedLaboratoryId, setSelectedLaboratoryId] = useState('');
  
  // Data
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [catalogTests, setCatalogTests] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  
  // Selection state
  const [selectedTests, setSelectedTests] = useState([]);
  const [collectionMethod, setCollectionMethod] = useState('AT_LAB');
  const [collectionAddress, setCollectionAddress] = useState({
    line1: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [priority, setPriority] = useState('routine');
  const [orderNotes, setOrderNotes] = useState('');
  
  // Search & Filter for catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Smart Package Suggestions
  const [smartPackages, setSmartPackages] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [appliedPackage, setAppliedPackage] = useState(null);
  
  // Booking modal / Confirmation modal
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState(null);
  const [priceGuardWarning, setPriceGuardWarning] = useState(null);

  // 1. Initial Load: Patient profile, clinics, orders
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      try {
        setLoading(true);
        const meRes = await patientApi.me().catch(() => null);
        const pt = meRes?.data?.patient || meRes?.patient;
        if (!isMounted) return;
        
        if (pt) {
          setPatient(pt);
          if (pt.address) {
            setCollectionAddress({
              line1: pt.address.line1 || pt.address || '',
              city: pt.address.city || '',
              state: pt.address.state || '',
              pincode: pt.address.pincode || ''
            });
          }
          
          // Fetch prescriptions for this patient
          const rxRes = await prescriptionApi.getPatientPrescriptions(pt._id).catch(() => ({ data: { prescriptions: [] } }));
          const rxList = rxRes?.data?.prescriptions || rxRes?.prescriptions || [];
          const rxWithLabs = rxList.filter(p => p.labs && p.labs.length > 0);
          setPrescriptions(rxWithLabs);
          
          if (rxWithLabs.length > 0) {
            setSelectedPrescription(rxWithLabs[0]);
            // Auto-select tests from the latest prescription
            const autoSelected = rxWithLabs[0].labs.map(l => ({
              id: l._id || l.investigationId,
              name: l.testName,
              code: l.code || 'TEST',
              category: l.category || 'General',
              specimenType: l.sampleRequired || 'Blood',
              price: l.priceSnapshot || l.price || 350,
              turnaroundTime: l.tatSnapshot || l.turnaroundTime || '24 Hours',
              patientPreparation: l.instructions || 'No Fasting Required',
              globalLabTestId: l.globalLabTestId || null,
              labTestId: l.localInventoryId || null,
              isFromPrescription: true,
              isBooked: l.isBooked
            }));
            setSelectedTests(autoSelected);
            if (rxWithLabs[0].clinicId?._id || rxWithLabs[0].clinicId) {
              setSelectedClinicId(String(rxWithLabs[0].clinicId?._id || rxWithLabs[0].clinicId));
            }
          } else {
            setActiveMode('catalog');
          }

          // Fetch orders
          const ordersRes = await patientApi.labs(pt._id).catch(() => ({ data: { labOrders: [] } }));
          setMyOrders(ordersRes?.data?.labOrders || ordersRes?.labOrders || []);
        }

        // Fetch Clinics
        const clinicRes = await clinicApi.list().catch(() => ({ data: { clinics: [] } }));
        const clinicList = clinicRes?.data?.clinics || clinicRes?.clinics || [];
        setClinics(clinicList);
        if (clinicList.length > 0 && !selectedClinicId) {
          setSelectedClinicId(String(clinicList[0]._id));
        }
      } catch (err) {
        console.error('Error loading patient lab data:', err);
        setError('Failed to load laboratory catalog and prescription records.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initData();
    return () => { isMounted = false; };
  }, []);

  // 2. Load merged lab catalog and attached laboratories whenever clinic changes
  useEffect(() => {
    let isMounted = true;
    const fetchClinicLabs = async () => {
      if (!selectedClinicId) return;
      try {
        const res = await labApi.searchAllLabs({ clinicId: selectedClinicId });
        if (!isMounted) return;
        const results = res?.data?.results || res?.results || [];
        const attached = res?.data?.attachedLaboratories || res?.attachedLaboratories || [];
        setCatalogTests(results);
        setAttachedLaboratories(attached);
        if (attached.length > 0 && !selectedLaboratoryId) {
          setSelectedLaboratoryId(String(attached[0]._id));
        }
      } catch (err) {
        console.error('Failed to load clinic labs:', err);
      }
    };
    fetchClinicLabs();
    return () => { isMounted = false; };
  }, [selectedClinicId]);

  // 3. Load Smart Package Suggestions whenever selected tests change
  useEffect(() => {
    let isMounted = true;
    const fetchSmartSuggestions = async () => {
      if (selectedTests.length === 0 || !selectedClinicId) {
        setSmartPackages([]);
        return;
      }
      try {
        setLoadingSuggestions(true);
        const testIds = selectedTests.map(t => t.globalLabTestId || t.code || t.name).join(',');
        const res = await labApi.getSmartPackages({
          clinicId: selectedClinicId,
          testIds,
          ...(selectedPrescription?._id ? { prescriptionId: selectedPrescription._id } : {})
        });
        if (!isMounted) return;
        const suggestions = res?.data?.suggestions || res?.suggestions || [];
        setSmartPackages(suggestions);
      } catch (err) {
        console.error('Smart suggestion error:', err);
      } finally {
        if (isMounted) setLoadingSuggestions(false);
      }
    };
    fetchSmartSuggestions();
    return () => { isMounted = false; };
  }, [selectedTests, selectedClinicId, selectedPrescription]);

  // Calculate pricing & totals
  const subtotalPrice = useMemo(() => {
    if (appliedPackage) {
      return appliedPackage.packagePrice;
    }
    return selectedTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  }, [selectedTests, appliedPackage]);

  const homeCollectionFee = collectionMethod === 'HOME_COLLECTION' ? 150 : 0;
  const grandTotal = subtotalPrice + homeCollectionFee;

  // Toggle individual test in prescription or catalog
  const handleToggleTest = (test) => {
    setAppliedPackage(null); // Reset custom package override
    setSelectedTests(prev => {
      const exists = prev.some(t => t.name.toLowerCase() === test.name.toLowerCase());
      if (exists) {
        return prev.filter(t => t.name.toLowerCase() !== test.name.toLowerCase());
      } else {
        const itemPrice = typeof test.price === 'number' ? test.price : 350;
        return [
          ...prev,
          {
            id: test.investigationId || test._id,
            name: test.name,
            code: test.code || 'TEST',
            category: test.category || 'General',
            specimenType: test.sampleType || test.specimenType || 'Blood',
            price: itemPrice,
            turnaroundTime: test.reportingTime || test.tat || '24 Hours',
            patientPreparation: test.patientPreparation || 'No Fasting Required',
            globalLabTestId: test.globalInvestigationId || test.globalLabTestId || null,
            labTestId: test.localInventoryIds?.[0] || test._id || null,
            isFromPrescription: false
          }
        ];
      }
    });
  };

  // Switch to Smart Package
  const handleApplySmartPackage = (pkg) => {
    setAppliedPackage(pkg);
    toast.success(`Switched to ${pkg.packageName}! You save ₹${pkg.savings}.`);
  };

  // Select prescription
  const handleSelectPrescription = (rx) => {
    setSelectedPrescription(rx);
    setAppliedPackage(null);
    if (rx.clinicId?._id || rx.clinicId) {
      setSelectedClinicId(String(rx.clinicId?._id || rx.clinicId));
    }
    const rxTests = rx.labs.map(l => ({
      id: l._id || l.investigationId,
      name: l.testName,
      code: l.code || 'TEST',
      category: l.category || 'General',
      specimenType: l.sampleRequired || 'Blood',
      price: l.priceSnapshot || l.price || 350,
      turnaroundTime: l.tatSnapshot || l.turnaroundTime || '24 Hours',
      patientPreparation: l.instructions || 'No Fasting Required',
      globalLabTestId: l.globalLabTestId || null,
      labTestId: l.localInventoryId || null,
      isFromPrescription: true,
      isBooked: l.isBooked
    }));
    setSelectedTests(rxTests);
  };

  // Book Order Handler
  const handleConfirmOrder = async () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one laboratory test.');
      return;
    }

    if (collectionMethod === 'HOME_COLLECTION' && !collectionAddress.line1) {
      toast.error('Please provide your home collection address.');
      return;
    }

    try {
      setIsBooking(true);
      const payload = {
        clinicId: selectedClinicId,
        patientId: patient?._id,
        prescriptionId: activeMode === 'prescription' && selectedPrescription ? selectedPrescription._id : null,
        laboratoryId: selectedLaboratoryId || null,
        collectionMethod,
        collectionAddress: collectionMethod === 'HOME_COLLECTION' ? collectionAddress : undefined,
        priority,
        price: grandTotal,
        source: 'PATIENT_BOOKED',
        notes: orderNotes,
        tests: selectedTests.map(t => ({
          name: t.name,
          code: t.code,
          category: t.category,
          specimenType: t.specimenType,
          price: t.price,
          turnaroundTime: t.turnaroundTime,
          patientPreparation: t.patientPreparation,
          globalLabTestId: t.globalLabTestId,
          labTestId: t.labTestId
        }))
      };

      const res = await labApi.createOrder(payload);
      const order = res?.data?.labOrder || res?.labOrder || res?.data;

      setBookingSuccessModal(order);
      toast.success(`Lab Order #${order.orderNumber || 'CONFIRMED'} placed successfully!`);

      // Refresh orders
      if (patient?._id) {
        const ordersRes = await patientApi.labs(patient._id).catch(() => ({ data: { labOrders: [] } }));
        setMyOrders(ordersRes?.data?.labOrders || ordersRes?.labOrders || []);
      }
    } catch (err) {
      console.error('Order creation error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to place laboratory order.';
      if (err?.response?.status === 409) {
        setPriceGuardWarning(errorMsg);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Filtered catalog tests
  const filteredCatalog = useMemo(() => {
    return catalogTests.filter(t => {
      const matchQuery = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.code && t.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [catalogTests, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    return ['All', ...new Set(catalogTests.map(t => t.category).filter(Boolean))];
  }, [catalogTests]);

  if (loading) return <FullPageSpinner message="Loading Laboratory Ordering Portal..." />;

  return (
    <div className="w-full space-y-6 p-4 md:p-8 animate-fade-in text-slate-800 dark:text-slate-100 max-w-7xl mx-auto">
      
      {/* HEADER HERO */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <FlaskConical size={32} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Patient Laboratory Portal
                </span>
                <span className="text-xs text-slate-400">• High Precision Diagnostics</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 text-white">
                Book Diagnostic Laboratory Tests
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
                Order tests directly from your doctor's prescription, browse individual tests, or select money-saving smart packages.
              </p>
            </div>
          </div>

          {/* Clinic Selector */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col gap-1 min-w-[240px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 size={12} className="text-emerald-400" /> Selected Clinic Context
            </span>
            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="w-full bg-slate-900/90 text-xs font-semibold text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500"
            >
              {clinics.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3-WAY TOP NAVIGATION */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setActiveMode('prescription')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'prescription'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ClipboardList size={16} />
          Option 1: Use Prescription ({prescriptions.length})
        </button>

        <button
          onClick={() => setActiveMode('catalog')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'catalog'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Search size={16} />
          Option 2: Browse Individual Tests
        </button>

        <button
          onClick={() => setActiveMode('history')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'history'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock size={16} />
          Option 3: My Orders &amp; History ({myOrders.length})
        </button>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Test Selection & Discovery (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* SMART PACKAGE SUGGESTION BANNER */}
          {smartPackages.length > 0 && activeMode !== 'history' && (
            <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 shadow-lg backdrop-blur-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} /> Suggested Option
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                      You Save ₹{smartPackages[0].savings}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    {smartPackages[0].packageName}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Individual Tests: <span className="line-through text-slate-400">₹{smartPackages[0].individualTotal}</span> vs. Package Price: <strong className="text-emerald-400 text-sm">₹{smartPackages[0].packagePrice}</strong>
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {smartPackages[0].coveredTests.map(ct => (
                      <span key={ct} className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white">
                        ✓ {ct}
                      </span>
                    ))}
                    {smartPackages[0].extraInvestigations.map(ex => (
                      <span key={ex} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        + EXTRA: {ex}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleApplySmartPackage(smartPackages[0])}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 shadow-md ${
                    appliedPackage?.packageId === smartPackages[0].packageId
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
                >
                  {appliedPackage?.packageId === smartPackages[0].packageId ? (
                    <>
                      <Check size={14} /> Package Applied
                    </>
                  ) : (
                    <>
                      Switch to Package &amp; Save
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODE 1: USE PRESCRIPTION */}
          {activeMode === 'prescription' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Tests from Doctor's Prescription
                  </h2>
                  <p className="text-xs text-slate-500">
                    Recommended investigations from Dr. {selectedPrescription?.doctorId?.fullName || 'Consultation Doctor'}
                  </p>
                </div>
                {prescriptions.length > 1 && (
                  <select
                    value={selectedPrescription?._id || ''}
                    onChange={(e) => {
                      const found = prescriptions.find(p => p._id === e.target.value);
                      if (found) handleSelectPrescription(found);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  >
                    {prescriptions.map((rx, i) => (
                      <option key={rx._id} value={rx._id}>
                        Rx #{rx.prescriptionNumber || i + 1} ({new Date(rx.createdAt).toLocaleDateString('en-IN')})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedPrescription?.labs?.length > 0 ? (
                <div className="space-y-3">
                  {selectedPrescription.labs.map((test, idx) => {
                    const isChecked = selectedTests.some(t => t.name.toLowerCase() === test.testName.toLowerCase());
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleTest({
                          name: test.testName,
                          code: test.code,
                          category: test.category,
                          sampleType: test.sampleRequired,
                          price: test.priceSnapshot || test.price || 350,
                          reportingTime: test.tatSnapshot || test.turnaroundTime || '24 Hours',
                          patientPreparation: test.instructions || 'No Fasting Required',
                          globalInvestigationId: test.globalLabTestId,
                          localInventoryIds: test.localInventoryId ? [test.localInventoryId] : []
                        })}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isChecked
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/60'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by parent container click
                            className="mt-1 w-4 h-4 rounded border-slate-300 accent-emerald-600"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-bold text-slate-900 dark:text-white">
                                {test.testName}
                              </strong>
                              {test.isBooked ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                                  Already Booked
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                                  Prescribed
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Sample: <span className="font-semibold text-slate-700 dark:text-slate-300">{test.sampleRequired || 'Blood'}</span> • TAT: {test.tatSnapshot || test.turnaroundTime || '24 Hours'}
                            </p>
                            {test.instructions && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                                ℹ️ Prep: {test.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                            ₹{test.priceSnapshot || test.price || 350}
                          </span>
                          <span className="text-[10px] text-slate-400">Standard Rate</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <ClipboardList size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No Active Prescriptions with Lab Recommendations
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    You can browse the complete clinic diagnostic catalog to choose individual investigations.
                  </p>
                  <button
                    onClick={() => setActiveMode('catalog')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                  >
                    Browse Individual Tests
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: BROWSE INDIVIDUAL TESTS */}
          {activeMode === 'catalog' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tests by name (e.g. CBC, Lipid, Vitamin D)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none w-full sm:w-auto"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Catalog Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-3.5">Investigation</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Sample</th>
                      <th className="p-3.5">Price</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCatalog.length > 0 ? (
                      filteredCatalog.map(test => {
                        const isAdded = selectedTests.some(t => t.name.toLowerCase() === test.name.toLowerCase());
                        const isAvailable = test.availability === 'AVAILABLE';
                        return (
                          <tr key={test.investigationId || test._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                            <td className="p-3.5">
                              <strong className="text-slate-800 dark:text-slate-100 font-bold block">{test.name}</strong>
                              <span className="text-[10px] text-slate-400 block mt-0.5">TAT: {test.reportingTime || test.tat || '24 Hours'}</span>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {test.category || 'General'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500">
                              <span className="flex items-center gap-1 text-[11px]">
                                <Droplet size={11} className="text-rose-500" /> {test.sampleType || 'Blood'}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                              {typeof test.price === 'number' ? `₹${test.price}` : (test.estimatedPriceRange || '—')}
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => handleToggleTest(test)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                                  isAdded
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {isAdded ? 'Added ✓' : '+ Add Test'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          No laboratory investigations found matching your filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODE 3: MY ORDERS & HISTORY */}
          {activeMode === 'history' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Laboratory Order History
              </h2>

              {myOrders.length > 0 ? (
                <div className="space-y-3">
                  {myOrders.map(order => (
                    <div key={order._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-xs font-black text-slate-800 dark:text-white">
                            Order #{order.orderNumber}
                          </strong>
                          <span className="text-[10px] text-slate-400 ml-2">
                            {new Date(order.createdAt || order.orderedAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(order.tests || []).map((t, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                            {t.name}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                        <span className="text-slate-500">Method: {order.collectionMethod === 'HOME_COLLECTION' ? '🏠 Home Collection' : '🏥 Visit Laboratory'}</span>
                        <strong className="text-slate-900 dark:text-white">₹{order.price}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No previous laboratory orders found.
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Order Summary & Checkout Panel (1 Col) */}
        <div className="space-y-6">

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <ShoppingCart size={16} className="text-emerald-500" /> Selected Tests ({selectedTests.length})
              </h3>
              {selectedTests.length > 0 && (
                <button
                  onClick={() => { setSelectedTests([]); setAppliedPackage(null); }}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selected items list */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {selectedTests.length > 0 ? (
                selectedTests.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="min-w-0 pr-2">
                      <strong className="text-slate-800 dark:text-slate-100 truncate block">{item.name}</strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">TAT: {item.turnaroundTime}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <strong className="text-slate-800 dark:text-slate-100">₹{item.price}</strong>
                      <button
                        onClick={() => handleToggleTest(item)}
                        className="text-slate-400 hover:text-rose-500 transition"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  No tests selected yet.
                </div>
              )}
            </div>

            {/* Laboratory Selection */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Performing Laboratory
              </label>
              <select
                value={selectedLaboratoryId}
                onChange={(e) => setSelectedLaboratoryId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
              >
                {attachedLaboratories.map(lab => (
                  <option key={lab._id} value={lab._id}>{lab.name} ({lab.address?.city || 'Main Hub'})</option>
                ))}
              </select>
            </div>

            {/* Collection Method Toggle */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Sample Collection Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCollectionMethod('AT_LAB')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    collectionMethod === 'AT_LAB'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Building2 size={13} /> Visit Lab
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionMethod('HOME_COLLECTION')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    collectionMethod === 'HOME_COLLECTION'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Home size={13} /> Home (+₹150)
                </button>
              </div>

              {collectionMethod === 'HOME_COLLECTION' && (
                <div className="space-y-1.5 pt-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Street Address / House No"
                    value={collectionAddress.line1}
                    onChange={(e) => setCollectionAddress(prev => ({ ...prev, line1: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={collectionAddress.city}
                      onChange={(e) => setCollectionAddress(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={collectionAddress.pincode}
                      onChange={(e) => setCollectionAddress(prev => ({ ...prev, pincode: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Tests Subtotal:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">₹{subtotalPrice}</span>
              </div>
              {collectionMethod === 'HOME_COLLECTION' && (
                <div className="flex items-center justify-between text-slate-500">
                  <span>Home Collection Fee:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">₹{homeCollectionFee}</span>
                </div>
              )}
              {appliedPackage && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Package Savings:</span>
                  <span>-₹{appliedPackage.savings}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total Amount:</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{grandTotal}</span>
              </div>
            </div>

            {/* Order Confirmation Button */}
            <button
              disabled={selectedTests.length === 0 || isBooking}
              onClick={handleConfirmOrder}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
            >
              {isBooking ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Processing Order...
                </>
              ) : (
                <>
                  <Check size={16} /> Confirm &amp; Place Lab Order
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* SUCCESS MODAL */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Laboratory Order Confirmed!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Order #{bookingSuccessModal.orderNumber || 'LAB-ORD'} has been successfully sent to the laboratory team.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Price:</span>
                <strong className="text-slate-800 dark:text-white">₹{bookingSuccessModal.price}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Collection:</span>
                <strong className="text-slate-800 dark:text-white">{bookingSuccessModal.collectionMethod === 'HOME_COLLECTION' ? 'Home Collection' : 'At Laboratory'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  {bookingSuccessModal.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setBookingSuccessModal(null);
                setActiveMode('history');
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
            >
              View in My Orders
            </button>
          </div>
        </div>
      )}

      {/* PRICE GUARD / DUPLICATE WARNING MODAL */}
      {priceGuardWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-amber-500">
              <ShieldAlert size={28} />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Active Order Notice
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800">
              {priceGuardWarning}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPriceGuardWarning(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPriceGuardWarning(null);
                  setActiveMode('history');
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                View Existing Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
