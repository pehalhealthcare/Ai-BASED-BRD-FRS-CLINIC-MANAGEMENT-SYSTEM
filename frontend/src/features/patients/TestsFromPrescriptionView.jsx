import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Search, Clock, Droplet, ClipboardList, CheckCircle,
  AlertCircle, Calendar, X, ChevronRight, Activity, Bell, FileText,
  Filter, ArrowRight, ShieldAlert, BadgeInfo, Sparkles, Building2,
  Home, Check, HelpCircle, RefreshCw, ShoppingCart, Tag, ChevronDown,
  ChevronUp, Info, User, Phone, MapPin, Truck, Stethoscope, CheckCircle2
} from 'lucide-react';
import { labApi, patientApi, prescriptionApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function TestsFromPrescriptionView({
  selectedClinic,
  selectedLab,
  patient,
  prescriptions = [],
  onNavigate,
  onOrderPlaced
}) {
  const clinicId = selectedClinic?._id || selectedClinic?.id || '';
  const labId = selectedLab?._id || selectedLab?.id || '';

  // Local state
  const [catalogTests, setCatalogTests] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [expandedRxIds, setExpandedRxIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [showAllPrescriptions, setShowAllPrescriptions] = useState(false);
  const [selectedTestForDetails, setSelectedTestForDetails] = useState(null);

  // Cart state
  const [labCart, setLabCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`patient_lab_cart_${patient?._id || 'guest'}_${labId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Package suggestions & applied package
  const [smartPackages, setSmartPackages] = useState([]);
  const [appliedPackage, setAppliedPackage] = useState(null);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Checkout modal & sample collection state
  const [showCheckoutDrawer, setShowCheckoutDrawer] = useState(false);
  const [collectionMethod, setCollectionMethod] = useState('AT_LAB'); // 'AT_LAB' | 'HOME_COLLECTION'
  const [collectionAddress, setCollectionAddress] = useState({
    line1: patient?.address?.line1 || patient?.address || '',
    city: patient?.address?.city || 'Ghaziabad',
    state: patient?.address?.state || 'Uttar Pradesh',
    pincode: patient?.address?.pincode || '201001',
    landmark: ''
  });

  useEffect(() => {
    if (patient) {
      setCollectionAddress({
        line1: patient.address?.line1 || patient.address || '',
        city: patient.address?.city || 'Ghaziabad',
        state: patient.address?.state || 'Uttar Pradesh',
        pincode: patient.address?.pincode || '201001',
        landmark: ''
      });
    }
  }, [patient]);

  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [collectionDate, setCollectionDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [collectionSlot, setCollectionSlot] = useState('08:00 AM - 10:00 AM');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);

  // 1. Fetch complete lab catalog for the selected laboratory to resolve local pricing
  useEffect(() => {
    let isMounted = true;
    const fetchLabCatalog = async () => {
      if (!clinicId || !labId) return;
      try {
        setLoadingCatalog(true);
        const res = await labApi.searchAllLabs({
          clinicId,
          laboratoryId: labId
        });
        if (!isMounted) return;
        const results = res?.data?.results || res?.results || [];
        setCatalogTests(results);
      } catch (err) {
        console.error('Failed to load lab catalog for pricing:', err);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };
    fetchLabCatalog();
    return () => { isMounted = false; };
  }, [clinicId, labId]);

  // Sync cart with localStorage
  useEffect(() => {
    if (patient?._id && labId) {
      localStorage.setItem(`patient_lab_cart_${patient._id}_${labId}`, JSON.stringify(labCart));
    }
  }, [labCart, patient, labId]);

  // Filter prescriptions that have lab recommendations
  const rxWithLabs = useMemo(() => {
    return (prescriptions || []).filter(p => p.labs && p.labs.length > 0);
  }, [prescriptions]);

  // Expand first prescription card by default on mount
  useEffect(() => {
    if (rxWithLabs.length > 0 && expandedRxIds.size === 0) {
      setExpandedRxIds(new Set([rxWithLabs[0]._id]));
    }
  }, [rxWithLabs]);

  // Helper: Match a prescription test against the selected laboratory catalog
  const resolveTestDetails = (rxLab, prescription) => {
    const rxName = (rxLab.testName || rxLab.name || '').trim().toLowerCase();
    const rxGlobalId = rxLab.globalLabTestId ? String(rxLab.globalLabTestId?._id || rxLab.globalLabTestId) : '';
    const rxLocalId = rxLab.localInventoryId ? String(rxLab.localInventoryId?._id || rxLab.localInventoryId) : '';
    const rxCode = (rxLab.code || '').trim().toLowerCase();

    // Match in catalogTests
    const matched = catalogTests.find(t => {
      const tGlobal = t.globalInvestigationId ? String(t.globalInvestigationId) : '';
      const tLocalIds = (t.localInventoryIds || []).map(String);
      const tName = (t.name || '').trim().toLowerCase();
      const tShort = (t.shortName || '').trim().toLowerCase();
      const tCode = (t.code || '').trim().toLowerCase();

      return (
        (rxGlobalId && tGlobal === rxGlobalId) ||
        (rxLocalId && tLocalIds.includes(rxLocalId)) ||
        (rxCode && (tCode === rxCode || tShort === rxCode)) ||
        (rxName && (tName === rxName || tShort === rxName || tName.includes(rxName) || rxName.includes(tName)))
      );
    });

    const isAvailable = matched ? matched.availability === 'AVAILABLE' : (rxLab.availabilitySnapshot === 'AVAILABLE' || rxLab.price > 0);
    const localPrice = matched?.price !== null && typeof matched?.price === 'number' 
      ? matched.price 
      : (typeof rxLab.priceSnapshot === 'number' && rxLab.priceSnapshot > 0 ? rxLab.priceSnapshot : (rxLab.price || 150));

    const sample = matched?.sampleType || rxLab.sampleRequired || 'Whole Blood';
    const reportingTime = matched?.reportingTime || matched?.tat || rxLab.turnaroundTime || '24 Hours';
    const patientPreparation = matched?.patientPreparation || rxLab.instructions || 'No special preparation required';
    const fastingRequired = patientPreparation.toLowerCase().includes('fasting') ? 'Yes (10-12 hrs)' : 'No';
    const methodology = matched?.methodology || 'Automated Cell Counter';
    const department = matched?.department || 'Hematology';
    const category = matched?.category || rxLab.category || 'Pathology';
    const parameters = matched?.parameters?.length > 0 
      ? matched.parameters.map(p => p.name || p) 
      : [
          'Total Leucocyte Count',
          'Neutrophils % & Count',
          'Lymphocytes % & Count',
          'Eosinophils % & Count',
          'Monocytes % & Count',
          'Basophils % & Count'
        ];

    const clinicalDescription = matched?.clinicalDescription || 
      `The ${rxLab.testName || 'investigation'} measures key biological indicators to detect infections, allergies, inflammation, and clinical disorders.`;

    return {
      id: rxLab._id || rxLab.investigationId || rxGlobalId || rxName,
      globalLabTestId: rxGlobalId || matched?.globalInvestigationId || null,
      labTestId: rxLocalId || matched?.localInventoryIds?.[0] || null,
      prescriptionId: prescription?._id,
      prescriptionNumber: prescription?.prescriptionNumber || `RX-2026-${(prescription?._id || '0891').slice(-4).toUpperCase()}`,
      doctorName: prescription?.doctorId?.fullName || prescription?.doctorName || 'Dr. Shyam',
      doctorDept: prescription?.doctorId?.specialization || prescription?.doctorId?.department || 'General Medicine',
      testName: rxLab.testName || rxLab.name || 'Diagnostic Investigation',
      shortName: matched?.shortName || rxLab.code || 'TEST',
      code: matched?.code || rxLab.code || 'TEST-01',
      sample,
      reportingTime,
      localPrice,
      isAvailable,
      patientPreparation,
      fastingRequired,
      methodology,
      department,
      category,
      parameters,
      clinicalDescription,
      isBooked: Boolean(rxLab.isBooked || rxLab.labOrderId),
      laboratoryName: selectedLab?.name || 'Radha Krishna Laboratory'
    };
  };

  // Toggle card expansion
  const toggleCardExpansion = (rxId) => {
    setExpandedRxIds(prev => {
      const next = new Set(prev);
      if (next.has(rxId)) {
        next.delete(rxId);
      } else {
        next.add(rxId);
      }
      return next;
    });
  };

  // Add individual test to cart with duplicate prevention
  const handleAddTestToCart = (testItem) => {
    if (!testItem.isAvailable) {
      toast.error(`"${testItem.testName}" is not available at ${selectedLab?.name || 'this laboratory'}.`);
      return;
    }
    if (testItem.isBooked) {
      toast.error(`"${testItem.testName}" has already been booked.`);
      return;
    }

    const alreadyInCart = labCart.some(item => 
      String(item.id) === String(testItem.id) || 
      item.testName.toLowerCase() === testItem.testName.toLowerCase() ||
      (item.globalLabTestId && item.globalLabTestId === testItem.globalLabTestId)
    );

    if (alreadyInCart) {
      toast.success(`"${testItem.testName}" is already in your cart.`);
      return;
    }

    setLabCart(prev => [...prev, testItem]);
    toast.success(`Added "${testItem.testName}" to cart!`);
  };

  // Add all available tests from a prescription
  const handleAddPrescriptionToCart = (prescription) => {
    const resolvedTests = (prescription.labs || []).map(l => resolveTestDetails(l, prescription));
    const availableTests = resolvedTests.filter(t => t.isAvailable && !t.isBooked);
    const unavailableCount = resolvedTests.length - availableTests.length;

    if (availableTests.length === 0) {
      toast.error('None of the tests in this prescription are currently available for booking.');
      return;
    }

    let addedCount = 0;
    setLabCart(prev => {
      const next = [...prev];
      for (const t of availableTests) {
        const exists = next.some(item => 
          String(item.id) === String(t.id) || 
          item.testName.toLowerCase() === t.testName.toLowerCase() ||
          (item.globalLabTestId && item.globalLabTestId === t.globalLabTestId)
        );
        if (!exists) {
          next.push(t);
          addedCount++;
        }
      }
      return next;
    });

    if (unavailableCount > 0) {
      toast.success(`${addedCount} tests added. ${unavailableCount} test(s) are unavailable at this laboratory.`);
    } else {
      toast.success(`${addedCount} tests added to cart.`);
    }
  };

  // Remove test from cart
  const handleRemoveFromCart = (testId) => {
    setLabCart(prev => prev.filter(item => String(item.id) !== String(testId)));
    toast.success('Test removed from cart.');
  };

  // Check smart packages when cart changes
  useEffect(() => {
    let isMounted = true;
    const fetchPackages = async () => {
      if (labCart.length < 2 || !clinicId) {
        setSmartPackages([]);
        return;
      }
      try {
        setLoadingPackages(true);
        const testIds = labCart.map(t => t.globalLabTestId || t.code || t.testName).join(',');
        const res = await labApi.getSmartPackages({
          clinicId,
          testIds
        });
        if (!isMounted) return;
        const suggestions = res?.data?.suggestions || res?.suggestions || [];
        setSmartPackages(suggestions);
      } catch (err) {
        console.error('Smart package error:', err);
      } finally {
        if (isMounted) setLoadingPackages(false);
      }
    };
    fetchPackages();
    return () => { isMounted = false; };
  }, [labCart, clinicId]);

  // Pricing calculations
  const subtotalPrice = useMemo(() => {
    if (appliedPackage) {
      return appliedPackage.packagePrice;
    }
    return labCart.reduce((sum, item) => sum + (Number(item.localPrice) || 0), 0);
  }, [labCart, appliedPackage]);

  const homeCollectionFee = collectionMethod === 'HOME_COLLECTION' ? 100 : 0;
  const grandTotal = subtotalPrice + homeCollectionFee;

  // Handle Lab Order Placement
  const handlePlaceOrder = async () => {
    if (labCart.length === 0) {
      toast.error('Your lab cart is empty. Select tests to place an order.');
      return;
    }

    if (collectionMethod === 'HOME_COLLECTION') {
      if (!collectionAddress.line1 || !collectionAddress.city || !collectionAddress.pincode) {
        toast.error('Please enter a complete delivery address for home sample collection.');
        return;
      }
    }

    try {
      setIsSubmittingOrder(true);

      const orderPayload = {
        clinicId,
        laboratoryId: labId,
        patientId: patient?._id,
        prescriptionId: labCart[0]?.prescriptionId || null,
        tests: labCart.map(item => ({
          globalLabTestId: item.globalLabTestId || null,
          labTestId: item.labTestId || null,
          code: item.code || 'TEST',
          name: item.testName,
          price: item.localPrice,
          specimenType: item.sample,
          patientPreparation: item.patientPreparation,
          turnaroundTime: item.reportingTime
        })),
        collectionMethod: collectionMethod === 'HOME_COLLECTION' ? 'HOME_COLLECTION' : 'AT_LAB',
        collectionAddress: collectionMethod === 'HOME_COLLECTION' ? collectionAddress : {},
        collectionDate,
        collectionSlot,
        price: grandTotal,
        notes: orderNotes
      };

      const res = await labApi.createOrder(orderPayload);
      const created = res?.data?.labOrder || res?.labOrder || res?.data;

      // Clear cart
      setLabCart([]);
      localStorage.removeItem(`patient_lab_cart_${patient?._id || 'guest'}_${labId}`);
      setShowCheckoutDrawer(false);

      setOrderSuccessModal(created || {
        orderNumber: `ORD-LAB-${Math.floor(1000 + Math.random() * 9000)}`,
        price: grandTotal,
        collectionMethod: collectionMethod === 'HOME_COLLECTION' ? 'Home Collection' : 'At Laboratory'
      });

      toast.success('Laboratory order placed successfully!');
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      console.error('Order creation failed:', err);
      toast.error(err.response?.data?.message || 'Failed to place laboratory order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Pagination slicing
  const displayedPrescriptions = useMemo(() => {
    if (showAllPrescriptions) {
      return rxWithLabs;
    }
    const startIdx = (currentPage - 1) * pageSize;
    return rxWithLabs.slice(startIdx, startIdx + pageSize);
  }, [rxWithLabs, currentPage, pageSize, showAllPrescriptions]);

  const totalPages = Math.ceil(rxWithLabs.length / pageSize) || 1;

  return (
    <div className="space-y-6 pb-20 animate-fade-in relative">
      {/* ── 1. Top Header & Breadcrumbs ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">
              PRESCRIPTION RECOMMENDATIONS • {selectedLab?.name || 'RADHA KRISHNA LABORATORY'}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tests From Prescription</h1>
            <p className="text-xs text-slate-500 mt-1">
              View your previous prescriptions and book lab tests directly at {selectedLab?.name || 'Radha Krishna Laboratory'}.
            </p>
          </div>

          {/* Cart Floating / Summary trigger */}
          {labCart.length > 0 && (
            <button
              onClick={() => setShowCheckoutDrawer(true)}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 transition duration-150 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} />
                <span>Cart ({labCart.length} {labCart.length === 1 ? 'Test' : 'Tests'})</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
              <span className="text-sm font-black">₹{subtotalPrice}</span>
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900 shadow-sm">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-blue-950">Select tests from your prescriptions</p>
            <p className="text-blue-800/90 text-[11px] leading-relaxed">
              Doctor recommendations are for your clinical care. Choose tests and add them to cart to book at this laboratory.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Main Prescriptions Content Layout (Main + Right Drawer) ── */}
      <div className="flex gap-6 items-start">
        {/* Main Prescriptions List Column */}
        <div className="flex-1 min-w-0 space-y-4">
          {rxWithLabs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl mx-auto text-blue-600">
                📋
              </div>
              <h3 className="text-sm font-black text-slate-800">No Prescriptions with Lab Recommendations</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You do not have any pending doctor-prescribed lab tests for this clinic. You can browse the complete test catalog directly.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('lab-tests')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm inline-flex items-center gap-2 mt-2"
                >
                  <FlaskConical size={14} />
                  <span>Browse All Tests</span>
                </button>
              )}
            </div>
          ) : (
            displayedPrescriptions.map((rx) => {
              const isExpanded = expandedRxIds.has(rx._id);
              const rxIdFormatted = rx.prescriptionNumber || `RX-2026-${rx._id.slice(-4).toUpperCase()}`;
              const rxDateFormatted = rx.createdAt 
                ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '31 Aug 2026, 04:25 PM';
              
              const doctorName = rx.doctorId?.fullName || rx.doctorName || 'Dr. Shyam';
              const doctorDept = rx.doctorId?.specialization || rx.doctorId?.department || 'General Medicine';
              const resolvedTests = (rx.labs || []).map(l => resolveTestDetails(l, rx));
              const availableCount = resolvedTests.filter(t => t.isAvailable && !t.isBooked).length;

              return (
                <div 
                  key={rx._id} 
                  className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
                >
                  {/* Compact Header Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <ClipboardList size={22} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prescription ID</p>
                          <p className="text-xs font-black text-slate-900 mt-0.5">{rxIdFormatted}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Time</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">{rxDateFormatted}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prescribed By</p>
                          <p className="text-xs font-black text-slate-900 mt-0.5">{doctorName}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{doctorDept}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
                      <button
                        onClick={() => toggleCardExpansion(rx._id)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition duration-150"
                      >
                        <span>{isExpanded ? 'View Less' : 'View Details'}</span>
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </button>

                      <button
                        onClick={() => handleAddPrescriptionToCart(rx)}
                        disabled={availableCount === 0}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition duration-150"
                      >
                        <ShoppingCart size={14} />
                        <span>Add to Cart ({rx.labs.length} {rx.labs.length === 1 ? 'Test' : 'Tests'})</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tests Section */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-100 space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">Tests in this Prescription</h4>
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold flex items-center justify-center">
                            {rx.labs.length}
                          </span>
                        </div>
                      </div>

                      {/* Tests Table */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-150 bg-slate-50/40">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200/80 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-100/50">
                              <th className="py-3 px-4">Test Name</th>
                              <th className="py-3 px-4">Sample</th>
                              <th className="py-3 px-4">Reporting Time</th>
                              <th className="py-3 px-4">Price (₹)</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {resolvedTests.map((test) => {
                              const inCart = labCart.some(item => String(item.id) === String(test.id) || item.testName.toLowerCase() === test.testName.toLowerCase());

                              return (
                                <tr key={test.id} className="hover:bg-white/80 transition duration-150">
                                  <td className="py-3.5 px-4">
                                    <div>
                                      <p className="font-black text-slate-900 text-xs">{test.testName}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{test.shortName || 'Diagnostic Test'}</p>
                                      <span className="inline-block mt-1 text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded uppercase">
                                        CLINIC LABORATORY
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                      <Droplet size={13} className="text-rose-500 shrink-0" />
                                      <span>{test.sample}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-600">
                                    {test.reportingTime}
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <span className="font-black text-slate-900 text-xs">
                                      ₹{test.localPrice}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    {test.isBooked ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                                        <CheckCircle2 size={11} className="text-slate-400" />
                                        Booked
                                      </span>
                                    ) : test.isAvailable ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Available
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        Not Available
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setSelectedTestForDetails(test)}
                                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[10px] transition duration-150 inline-flex items-center gap-1"
                                      >
                                        <BadgeInfo size={12} className="text-blue-600" />
                                        <span>View Details</span>
                                      </button>

                                      <button
                                        onClick={() => handleAddTestToCart(test)}
                                        disabled={!test.isAvailable || test.isBooked || inCart}
                                        className={`px-3 py-1.5 rounded-xl font-black text-[10px] transition duration-150 inline-flex items-center gap-1 ${
                                          inCart
                                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                            : test.isBooked
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : test.isAvailable
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                      >
                                        {inCart ? (
                                          <>
                                            <Check size={12} />
                                            <span>Added</span>
                                          </>
                                        ) : (
                                          <>
                                            <ShoppingCart size={12} />
                                            <span>Add</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* View Less Link at table bottom */}
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => toggleCardExpansion(rx._id)}
                          className="text-[11px] font-black text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition"
                        >
                          <span>View Less</span>
                          <ChevronUp size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* ── 3. Pagination / Load More Controls ── */}
          {rxWithLabs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>
                  Showing {showAllPrescriptions ? rxWithLabs.length : Math.min(pageSize * currentPage, rxWithLabs.length)} of {rxWithLabs.length} prescriptions
                </span>
                {rxWithLabs.length > pageSize && (
                  <button
                    onClick={() => setShowAllPrescriptions(prev => !prev)}
                    className="ml-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-[10px] transition"
                  >
                    {showAllPrescriptions ? 'View Less' : 'Load More'}
                  </button>
                )}
              </div>

              {!showAllPrescriptions && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold transition"
                  >
                    ‹
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition ${
                        currentPage === pg
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold transition"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 4. Right Test Details Slide-over Drawer / Panel ── */}
        {selectedTestForDetails && (
          <div className="w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5 shrink-0 animate-slide-left sticky top-6 max-h-[85vh] overflow-y-auto [scrollbar-width:none]">
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">{selectedTestForDetails.testName}</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{selectedTestForDetails.shortName || 'Diagnostic Investigation'}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    selectedTestForDetails.isAvailable 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedTestForDetails.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {selectedTestForDetails.isAvailable ? 'Available at this laboratory' : 'Not Available at this laboratory'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTestForDetails(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Price Box */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Laboratory Price</span>
              <span className="text-xl font-black text-slate-900">₹{selectedTestForDetails.localPrice}</span>
            </div>

            {/* About This Test */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={12} className="text-blue-600" />
                About This Test
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                {selectedTestForDetails.clinicalDescription}
              </p>
            </div>

            {/* Parameters Checked */}
            {selectedTestForDetails.parameters?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={12} className="text-blue-600" />
                  Parameters Checked ({selectedTestForDetails.parameters.length})
                </h4>
                <ul className="space-y-1.5 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700">
                  {selectedTestForDetails.parameters.map((param, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span className="font-semibold text-slate-800">{param}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata Specs */}
            <div className="space-y-2.5 border-t border-slate-100 pt-4 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Droplet size={13} className="text-rose-500" /> Sample Type
                </span>
                <span className="font-black text-slate-800">{selectedTestForDetails.sample}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Clock size={13} className="text-blue-500" /> Reporting Time
                </span>
                <span className="font-black text-slate-800">{selectedTestForDetails.reportingTime}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Info size={13} className="text-emerald-500" /> Preparation
                </span>
                <span className="font-black text-slate-800 truncate max-w-[170px]">{selectedTestForDetails.patientPreparation}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <HelpCircle size={13} className="text-amber-500" /> Fasting Required
                </span>
                <span className="font-black text-slate-800">{selectedTestForDetails.fastingRequired}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <FlaskConical size={13} className="text-purple-500" /> Method
                </span>
                <span className="font-black text-slate-800">{selectedTestForDetails.methodology}</span>
              </div>
            </div>

            {/* Laboratory Location Card */}
            <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-150 text-[11px] space-y-1">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Laboratory Provider</span>
              <p className="font-black text-slate-900">{selectedTestForDetails.laboratoryName}</p>
              <p className="text-slate-500 text-[10px]">Verified diagnostic service provider for {selectedClinic?.name || 'Clinic'}.</p>
            </div>

            {/* Bottom Add to Cart Button */}
            <div className="pt-2">
              <button
                onClick={() => handleAddTestToCart(selectedTestForDetails)}
                disabled={!selectedTestForDetails.isAvailable || selectedTestForDetails.isBooked}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition duration-150"
              >
                <ShoppingCart size={15} />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Smart Package Recommendations Card (When 2+ tests selected) ── */}
      {smartPackages.length > 0 && labCart.length >= 2 && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Smart Laboratory Recommendation</span>
              <h3 className="text-base font-black">Save More With a Configured Health Package</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {smartPackages.slice(0, 2).map((pkg) => (
              <div key={pkg.packageId} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-black">{pkg.packageName}</h4>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-extrabold text-[10px]">
                      Save ₹{pkg.savings}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-1">
                    Includes {pkg.coveredTestsCount} of your selected investigations + additional full-panel screenings.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <div>
                    <span className="text-[10px] text-blue-300 line-through mr-2 font-bold">₹{pkg.individualTotal}</span>
                    <span className="text-base font-black text-emerald-300">₹{pkg.packagePrice}</span>
                  </div>
                  <button
                    onClick={() => {
                      setAppliedPackage(pkg);
                      toast.success(`Package "${pkg.packageName}" applied for checkout!`);
                    }}
                    className="px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 font-extrabold rounded-xl text-xs transition shadow"
                  >
                    {appliedPackage?.packageId === pkg.packageId ? 'Package Applied ✓' : 'Add Package'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Slide-over / Modal Cart & Checkout Drawer ── */}
      {showCheckoutDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-left overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/60 border border-blue-200 flex items-center justify-center text-blue-600">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Laboratory Cart & Checkout</h3>
                  <p className="text-[10px] text-slate-400 font-bold">{selectedLab?.name || 'Radha Krishna Laboratory'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutDrawer(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 [scrollbar-width:none]">
              {/* Selected Tests List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Selected Investigations ({labCart.length})
                </h4>

                <div className="space-y-2">
                  {labCart.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-2xl border border-slate-150 bg-slate-50/50 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{item.testName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Sample: {item.sample} • TAT: {item.reportingTime}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-black text-slate-800">₹{item.localPrice}</span>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                          title="Remove item"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Collection Mode Section */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Choose Sample Collection Mode
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setCollectionMethod('AT_LAB')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 ${
                      collectionMethod === 'AT_LAB'
                        ? 'border-2 border-blue-600 bg-blue-50/40 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">Collect at Laboratory</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Visit diagnostic center</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700">Free Collection</span>
                  </div>

                  <div
                    onClick={() => setCollectionMethod('HOME_COLLECTION')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 ${
                      collectionMethod === 'HOME_COLLECTION'
                        ? 'border-2 border-blue-600 bg-blue-50/40 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Home size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">Collect at Home</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Phlebotomist visits you</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-purple-700">+₹100 Collection Fee</span>
                  </div>
                </div>

                {/* Mode Details Form */}
                {collectionMethod === 'AT_LAB' ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-2 text-xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Laboratory Address</p>
                    <p className="font-black text-slate-800">{selectedLab?.name || 'Radha Krishna Laboratory'}</p>
                    <p className="text-slate-500 text-[11px]">
                      {selectedLab?.address ? `${selectedLab.address.line1 || ''}, ${selectedLab.address.city || ''}` : 'Main Road, Near City Hospital, Ghaziabad'}
                    </p>
                    <p className="text-slate-400 text-[10px]">Working Hours: {selectedLab?.timings || '08:00 AM - 08:00 PM'}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home Collection Address</p>
                      <button
                        onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}
                        className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700"
                      >
                        {isAddingNewAddress ? 'Use Saved Address' : '+ New Address'}
                      </button>
                    </div>

                    {isAddingNewAddress ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Flat / House / Street Address"
                          value={collectionAddress.line1}
                          onChange={(e) => setCollectionAddress(prev => ({ ...prev, line1: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="City"
                            value={collectionAddress.city}
                            onChange={(e) => setCollectionAddress(prev => ({ ...prev, city: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Pincode"
                            value={collectionAddress.pincode}
                            onChange={(e) => setCollectionAddress(prev => ({ ...prev, pincode: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-800">{patient?.firstName} {patient?.lastName}</p>
                        <p className="text-slate-500 text-[11px]">
                          {collectionAddress.line1 || 'Indirapuram'}, {collectionAddress.city} {collectionAddress.pincode}
                        </p>
                        <p className="text-slate-400 text-[10px]">Mobile: {patient?.phone || '+91 98765 43210'}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date</label>
                        <input
                          type="date"
                          value={collectionDate}
                          onChange={(e) => setCollectionDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Time Slot</label>
                        <select
                          value={collectionSlot}
                          onChange={(e) => setCollectionSlot(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none font-bold"
                        >
                          <option value="07:00 AM - 09:00 AM">07:00 AM - 09:00 AM</option>
                          <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                          <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                          <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bill Summary */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Summary</h4>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Tests Subtotal</span>
                    <span className="font-bold text-slate-900">₹{subtotalPrice}</span>
                  </div>
                  {appliedPackage && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Package Discount</span>
                      <span>-₹{appliedPackage.savings}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Home Collection Fee</span>
                    <span className="font-bold text-slate-900">{homeCollectionFee > 0 ? `₹${homeCollectionFee}` : 'Free'}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-black text-slate-900">
                    <span>Total Payable</span>
                    <span className="text-blue-600">₹{grandTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmittingOrder || labCart.length === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition duration-150"
              >
                {isSubmittingOrder ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Placing Lab Order...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Place Lab Order (₹{grandTotal})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Order Success Modal ── */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🎉
            </div>

            <div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Order Confirmed</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">Laboratory Order Created!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your lab test booking has been confirmed at {selectedLab?.name || 'Radha Krishna Laboratory'}.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Order Number</span>
                <span className="font-black text-blue-600">{orderSuccessModal.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Collection Mode</span>
                <span className="font-bold text-slate-800">{orderSuccessModal.collectionMethod || 'At Laboratory'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5">
                <span className="text-slate-400 font-bold">Total Paid</span>
                <span className="font-black text-slate-900">₹{orderSuccessModal.price}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setOrderSuccessModal(null);
                if (onNavigate) onNavigate('lab-bookings');
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs transition shadow-md"
            >
              Track Order in My Lab Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
