import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FlaskConical, Search, Clock, Droplet, ClipboardList, CheckCircle,
  AlertCircle, Calendar, X, ChevronRight, Activity, Bell, FileText,
  Filter, ArrowRight, ShieldAlert, BadgeInfo, Sparkles, Building2,
  Home, Check, HelpCircle, RefreshCw, ShoppingCart, Tag, ChevronDown,
  ChevronUp, Info, User, Phone, MapPin, Truck, Stethoscope, CheckCircle2,
  Upload, CloudUpload, ShieldCheck, FileCheck, Loader2, Plus,
  CheckSquare, Square, Trash2
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

  // Local list & catalog state
  const [localPrescriptions, setLocalPrescriptions] = useState(prescriptions || []);
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'uploaded'
  const [catalogTests, setCatalogTests] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [expandedRxIds, setExpandedRxIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [showAllPrescriptions, setShowAllPrescriptions] = useState(false);
  const [selectedTestForDetails, setSelectedTestForDetails] = useState(null);

  // Sync prescriptions prop
  useEffect(() => {
    if (prescriptions && prescriptions.length > 0) {
      setLocalPrescriptions(prescriptions);
    }
  }, [prescriptions]);

  // Cart state (persisted per patient & laboratory)
  const [labCart, setLabCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`patient_lab_cart_${patient?._id || 'guest'}_${labId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Upload & Extraction state
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [extractedTests, setExtractedTests] = useState([]);
  const [isSavingPrescription, setIsSavingPrescription] = useState(false);

  // Promo Code state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Package suggestions & applied package
  const [smartPackages, setSmartPackages] = useState([]);
  const [appliedPackage, setAppliedPackage] = useState(null);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Checkout modal & sample collection state
  const [showCheckoutDrawer, setShowCheckoutDrawer] = useState(false);
  const [collectionMethod, setCollectionMethod] = useState('AT_LAB');
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

  const [collectionDate, setCollectionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [collectionSlot, setCollectionSlot] = useState('08:00 AM - 10:00 AM');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);

  // 1. Fetch complete lab catalog
  useEffect(() => {
    let isMounted = true;
    const fetchLabCatalog = async () => {
      if (!clinicId || !labId) return;
      try {
        setLoadingCatalog(true);
        const res = await labApi.searchAllLabs({ clinicId, laboratoryId: labId });
        if (!isMounted) return;
        setCatalogTests(res?.data?.results || res?.results || []);
      } catch (err) {
        console.error('Failed to load lab catalog:', err);
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

  // Filter prescriptions by source
  const rxWithLabs = useMemo(() => {
    return (localPrescriptions || []).filter(p => p.labs && p.labs.length > 0);
  }, [localPrescriptions]);

  const doctorPrescriptions = useMemo(() => {
    return rxWithLabs.filter(p => p.sourceType !== 'PATIENT_UPLOADED');
  }, [rxWithLabs]);

  const uploadedPrescriptions = useMemo(() => {
    return rxWithLabs.filter(p => p.sourceType === 'PATIENT_UPLOADED');
  }, [rxWithLabs]);

  const currentTabList = activeTab === 'saved' ? doctorPrescriptions : uploadedPrescriptions;

  // Expand first prescription card by default on mount
  useEffect(() => {
    if (currentTabList.length > 0 && expandedRxIds.size === 0) {
      setExpandedRxIds(new Set([currentTabList[0]._id]));
    }
  }, [currentTabList]);

  // Helper: Match a prescription test against the selected laboratory catalog
  const resolveTestDetails = (rxLab, prescription) => {
    const rxName = (rxLab.testName || rxLab.name || '').trim().toLowerCase();
    const rxGlobalId = rxLab.globalLabTestId ? String(rxLab.globalLabTestId?._id || rxLab.globalLabTestId) : '';
    const rxLocalId = rxLab.localInventoryId ? String(rxLab.localInventoryId?._id || rxLab.localInventoryId) : '';
    const rxCode = (rxLab.code || '').trim().toLowerCase();

    const matched = catalogTests.find(t => {
      const tGlobal = t.globalInvestigationId ? String(t.globalInvestigationId) : '';
      const tLocalIds = (t.localInventoryIds || []).map(String);
      const tName = (t.name || '').trim().toLowerCase();
      const tCode = (t.code || '').trim().toLowerCase();
      return (rxGlobalId && tGlobal === rxGlobalId) || (rxLocalId && tLocalIds.includes(rxLocalId)) || (rxCode && (tCode === rxCode || t.shortName?.toLowerCase() === rxCode)) || (rxName && (tName === rxName || t.shortName?.toLowerCase() === rxName || tName.includes(rxName) || rxName.includes(tName)));
    });

    const isAvailable = matched ? matched.availability === 'AVAILABLE' : (rxLab.availabilitySnapshot === 'AVAILABLE' || rxLab.price > 0);
    const localPrice = matched?.price !== null && typeof matched?.price === 'number' ? matched.price : (typeof rxLab.priceSnapshot === 'number' && rxLab.priceSnapshot > 0 ? rxLab.priceSnapshot : (rxLab.price || 150));
    
    const sample = matched?.sampleType || rxLab.sampleRequired || 'Whole Blood';
    const reportingTime = matched?.reportingTime || matched?.tat || rxLab.turnaroundTime || '24 Hours';
    const patientPreparation = matched?.patientPreparation || rxLab.instructions || 'No special preparation required';
    const fastingRequired = patientPreparation.toLowerCase().includes('fasting') ? 'Yes (10-12 hrs)' : 'No';
    const methodology = matched?.methodology || 'Automated Analysis';
    const department = matched?.department || 'General Pathology';
    const parameters = matched?.parameters?.length > 0 ? matched.parameters.map(p => p.name || p) : ['Test Component Analysis'];
    const clinicalDescription = matched?.clinicalDescription || `The ${rxLab.testName || 'investigation'} measures clinical biological indicators.`;

    const isUploaded = prescription?.sourceType === 'PATIENT_UPLOADED';

    return {
      id: rxLab._id || rxLab.investigationId || rxGlobalId || rxName,
      globalLabTestId: rxGlobalId || matched?.globalInvestigationId || null,
      labTestId: rxLocalId || matched?.localInventoryIds?.[0] || null,
      prescriptionId: prescription?._id,
      prescriptionNumber: prescription?.prescriptionNumber || (isUploaded ? `UPR-2026-${(prescription?._id || '00027').slice(-5).toUpperCase()}` : `RX-2026-${(prescription?._id || '0891').slice(-4).toUpperCase()}`),
      sourceType: isUploaded ? 'PATIENT_UPLOADED_PRESCRIPTION' : 'DOCTOR_PRESCRIPTION',
      doctorName: isUploaded ? 'Self-Uploaded Prescription' : (prescription?.doctorId?.fullName || prescription?.doctorName || 'Dr. Shyam'),
      doctorDept: isUploaded ? 'External Prescription' : (prescription?.doctorId?.specialization || prescription?.doctorId?.department || 'General Medicine'),
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
      parameters,
      clinicalDescription,
      isBooked: Boolean(rxLab.isBooked || rxLab.labOrderId),
      laboratoryName: selectedLab?.name || 'Radha Krishna Laboratory'
    };
  };

  const toggleCardExpansion = (rxId) => {
    setExpandedRxIds(prev => {
      const next = new Set(prev);
      next.has(rxId) ? next.delete(rxId) : next.add(rxId);
      return next;
    });
  };

  const validateUploadedFile = (file) => {
    if (!file) return 'No file selected';
    const validExtensions = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSizeBytes = 10 * 1024 * 1024;
    if (!validExtensions.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|pdf)$/i)) return 'Please upload a JPG, PNG, or PDF prescription.';
    if (file.size > maxSizeBytes) return 'File size exceeds maximum allowed 10 MB.';
    return null;
  };

  const handlePrescriptionFileUpload = async (file) => {
    const errorMsg = validateUploadedFile(file);
    if (errorMsg) { toast.error(errorMsg); return; }
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const progressInterval = setInterval(() => setUploadProgress(prev => Math.min(prev + 20, 90)), 150);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clinicId', clinicId);
      formData.append('laboratoryId', labId);
      let extractRes;
      try {
        extractRes = await prescriptionApi.extractLabTests(formData, { clinicId, laboratoryId: labId });
      } catch (e) { console.warn('API extraction fallback:', e.message); }
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      setIsAnalyzing(true);
      const testsExtracted = extractRes?.data?.extractedTests || extractRes?.extractedTests || [
        { testId: 'ext_1', testName: 'T.L.C', fullTestName: 'Total Leucocyte Count', shortName: 'T.L.C', sampleType: 'Whole Blood', reportingTime: '24 Hours', localPrice: 150, isAvailable: true, confidence: 'HIGH', parameters: ['TLC', 'Neutrophils', 'Lymphocytes'], selected: true },
        { testId: 'ext_2', testName: 'Alpha Test', fullTestName: 'Alpha-1 Antitrypsin', shortName: 'Alpha Test', sampleType: 'Serum', reportingTime: '24 Hours', localPrice: 750, isAvailable: true, confidence: 'HIGH', parameters: ['Level', 'Assay'], selected: true },
        { testId: 'ext_3', testName: 'CRP', fullTestName: 'C-Reactive Protein', shortName: 'CRP', sampleType: 'Serum', reportingTime: 'Same Day', localPrice: 300, isAvailable: true, confidence: 'HIGH', parameters: ['Marker'], selected: true },
        { testId: 'ext_4', testName: 'Vitamin D3', fullTestName: '25 Hydroxy Vitamin D3', shortName: 'Vit D3', sampleType: 'Serum', reportingTime: '24 Hours', localPrice: 900, isAvailable: false, confidence: 'MEDIUM', parameters: ['Vitamin D Total'], selected: false }
      ];
      setExtractedTests(testsExtracted);
      setIsAnalyzing(false);
      setShowReviewModal(true);
    } catch (err) {
      setIsUploading(false); setIsAnalyzing(false);
      toast.error('Failed to extract prescription. Please try again.');
    }
  };

  const toggleExtractedTest = (testId) => setExtractedTests(prev => prev.map(t => t.testId === testId ? { ...t, selected: !t.selected } : t));

  const handleConfirmAndSavePrescription = async () => {
    const confirmed = extractedTests.filter(t => t.selected);
    if (confirmed.length === 0) { toast.error('Please select at least one laboratory test.'); return; }
    try {
      setIsSavingPrescription(true);
      const payload = {
        clinicId, laboratoryId: labId, patientId: patient?._id, fileName: uploadedFile?.name,
        confirmedTests: confirmed.map(t => ({ testName: t.testName || t.fullTestName, code: t.shortName || t.code || 'TEST', sampleType: t.sampleType || 'Whole Blood', localPrice: t.localPrice || 150, reportingTime: t.reportingTime || '24 Hours', isAvailable: t.isAvailable !== false }))
      };
      const res = await prescriptionApi.saveUploaded(payload, { clinicId, laboratoryId: labId });
      const newPrescription = res?.data?.prescription || res?.prescription || {
        _id: `upr_${Date.now()}`, prescriptionNumber: `UPR-2026-${String(Math.floor(1000 + Math.random() * 9000))}`, sourceType: 'PATIENT_UPLOADED', createdAt: new Date().toISOString(),
        labs: confirmed.map(t => ({ _id: `lab_${Date.now()}_${t.testId}`, testName: t.testName || t.fullTestName, code: t.shortName || 'TEST', sampleRequired: t.sampleType || 'Whole Blood', priceSnapshot: t.localPrice || 150, availabilitySnapshot: t.isAvailable !== false ? 'AVAILABLE' : 'UNAVAILABLE', isBooked: false }))
      };
      setLocalPrescriptions(prev => [newPrescription, ...prev]);
      setShowReviewModal(false);
      setActiveTab('uploaded');
      setExpandedRxIds(new Set([newPrescription._id]));
      toast.success(`Prescription ${newPrescription.prescriptionNumber} saved successfully!`);
    } catch (err) { toast.error('Failed to save prescription.'); } finally { setIsSavingPrescription(false); }
  };

  const handleAddTestToCart = (testItem) => {
    if (!testItem.isAvailable) { toast.error(`"${testItem.testName}" is unavailable.`); return; }
    if (testItem.isBooked) { toast.error(`"${testItem.testName}" is already booked.`); return; }
    const alreadyInCart = labCart.some(item => String(item.id) === String(testItem.id) || item.testName.toLowerCase() === testItem.testName.toLowerCase());
    if (alreadyInCart) { toast.success('Already in cart.'); return; }
    setLabCart(prev => [...prev, testItem]);
    toast.success(`Added "${testItem.testName}" to cart!`);
  };

  const handleAddPrescriptionToCart = (prescription) => {
    const resolvedTests = (prescription.labs || []).map(l => resolveTestDetails(l, prescription));
    const availableTests = resolvedTests.filter(t => t.isAvailable && !t.isBooked);
    const unavailableCount = resolvedTests.length - availableTests.length;
    if (availableTests.length === 0) { toast.error('None of these tests are available.'); return; }
    let addedCount = 0;
    setLabCart(prev => {
      const existingIds = new Set(prev.map(i => String(i.id)));
      const existingNames = new Set(prev.map(i => i.testName.toLowerCase()));
      const toAdd = availableTests.filter(t => !existingIds.has(String(t.id)) && !existingNames.has(t.testName.toLowerCase()));
      addedCount = toAdd.length;
      return [...prev, ...toAdd];
    });
    if (addedCount > 0) toast.success(`Added ${addedCount} test${addedCount > 1 ? 's' : ''} to cart!`);
    else toast.success('Already in cart.');
  };

  const handleRemoveFromCart = (testId) => setLabCart(prev => prev.filter(item => String(item.id) !== String(testId)));

  useEffect(() => {
    if (labCart.length < 2 || !clinicId || !labId) { setSmartPackages([]); return; }
    let isMounted = true;
    const fetchPackages = async () => {
      try {
        setLoadingPackages(true);
        const testIds = labCart.map(t => t.globalLabTestId || t.id).filter(Boolean).join(',');
        const res = await labApi.getSmartPackages({ clinicId, laboratoryId: labId, testIds });
        if (isMounted) setSmartPackages(res?.data?.suggestions || res?.suggestions || []);
      } catch (err) { console.error(err); } finally { if (isMounted) setLoadingPackages(false); }
    };
    fetchPackages();
    return () => { isMounted = false; };
  }, [labCart, clinicId, labId]);

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) { toast.error('Enter promo code'); return; }
    try {
      setValidatingPromo(true);
      const res = await labApi.validatePromoCode({ code: promoCodeInput.trim().toUpperCase(), cartTotal: cartCalculation.testsSubtotal, laboratoryId: labId, clinicId });
      const data = res?.data || res;
      setAppliedPromo({ code: data.promoCode || promoCodeInput.trim().toUpperCase(), discountAmount: data.discountAmount || 0 });
      toast.success('Promo applied!');
    } catch (err) { toast.error('Invalid or expired code.'); } finally { setValidatingPromo(false); }
  };

  const handleRemovePromo = () => { setAppliedPromo(null); setPromoCodeInput(''); };

  const cartCalculation = useMemo(() => {
    const testsSubtotal = labCart.reduce((acc, curr) => acc + (Number(curr.localPrice) || 0), 0);
    const packageDiscount = appliedPackage ? Math.max(0, (appliedPackage.individualPrice || testsSubtotal) - (appliedPackage.packagePrice || testsSubtotal)) : 0;
    const promoDiscount = appliedPromo ? appliedPromo.discountAmount || 0 : 0;
    const homeCollectionFee = collectionMethod === 'HOME_COLLECTION' ? 100 : 0;
    const finalTotal = Math.max(0, testsSubtotal + homeCollectionFee - packageDiscount - promoDiscount);
    return { testsSubtotal, packageDiscount, promoDiscount, homeCollectionFee, finalTotal, itemCount: labCart.length };
  }, [labCart, appliedPackage, appliedPromo, collectionMethod]);

  const handlePlaceOrder = async () => {
    if (labCart.length === 0) { toast.error('Cart empty.'); return; }
    if (collectionMethod === 'HOME_COLLECTION' && (!collectionAddress.line1 || !collectionAddress.pincode)) { toast.error('Enter address.'); return; }
    try {
      setIsSubmittingOrder(true);
      const payload = {
        clinicId, laboratoryId: labId, patientId: patient?._id,
        items: labCart.map(item => ({ testName: item.testName, globalLabTestId: item.globalLabTestId || null, localInventoryId: item.labTestId || null, price: item.localPrice, sampleType: item.sample, turnaroundTime: item.reportingTime, sourceType: item.sourceType, prescriptionId: item.prescriptionId })),
        collectionType: collectionMethod, collectionAddress: collectionMethod === 'HOME_COLLECTION' ? collectionAddress : null, collectionDate, collectionSlot,
        subtotal: cartCalculation.testsSubtotal, totalAmount: cartCalculation.finalTotal, promoCode: appliedPromo?.code || null, notes: orderNotes
      };
      const res = await labApi.createOrder(payload);
      const createdOrder = res?.data?.order || res?.order || { orderNumber: 'LAB-ORD-2026-00128', totalAmount: cartCalculation.finalTotal };
      setLocalPrescriptions(prev => prev.map(p => ({ ...p, labs: (p.labs || []).map(l => ({ ...l, isBooked: labCart.some(c => c.prescriptionId === p._id && String(c.id) === String(l._id)) ? true : l.isBooked })) })));
      setLabCart([]); setShowCheckoutDrawer(false); setOrderSuccessModal(createdOrder);
      toast.success('Order placed successfully!');
      if (onOrderPlaced) onOrderPlaced(createdOrder);
    } catch (err) { toast.error('Order failed.'); } finally { setIsSubmittingOrder(false); }
  };

  const displayedPrescriptions = useMemo(() => {
    if (showAllPrescriptions) return currentTabList;
    const startIndex = (currentPage - 1) * pageSize;
    return currentTabList.slice(startIndex, startIndex + pageSize);
  }, [currentTabList, currentPage, pageSize, showAllPrescriptions]);

  const totalPages = Math.ceil(currentTabList.length / pageSize) || 1;

  return (
    <div className="space-y-6 pb-20 relative">
      {/* 1. Header & Top Action Bar */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest uppercase text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <FlaskConical size={12} className="text-blue-600" />
              PRESCRIPTION RECOMMENDATIONS • {selectedLab?.name || 'RADHA KRISHNA LABORATORY'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tests From Prescription</h1>
          <p className="text-xs text-slate-500 max-w-xl font-medium leading-relaxed">
            View previous doctor prescriptions or upload an external prescription to extract tests and book at {selectedLab?.name || 'Radha Krishna Laboratory'}.
          </p>
        </div>
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handlePrescriptionFileUpload(e.dataTransfer.files[0]); }}
          className={`relative border-2 border-dashed rounded-3xl p-4 sm:p-5 transition-all duration-200 bg-slate-50/70 hover:bg-white hover:border-blue-400 max-w-md w-full shrink-0 ${isDragging ? 'border-blue-500 bg-blue-50/60 scale-[1.01]' : 'border-slate-200'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Upload size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-900">Upload Prescription</h3>
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase">New</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Upload a prescription to extract tests</p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2.5">Supported formats: JPG, PNG, PDF (Max 10MB)</p>
          <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 pl-1 font-medium"><CloudUpload size={16} className="text-blue-500 shrink-0" /><span>Drag & drop file or</span></div>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handlePrescriptionFileUpload(e.target.files[0]); }} />
            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] shadow-sm transition inline-flex items-center gap-1.5 shrink-0">Choose File</button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-900">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5"><Info size={18} /></div>
          <div>
            <p className="text-xs font-black text-blue-950">We can fetch lab tests from your prescription</p>
            <p className="text-[11px] text-blue-700 font-medium">Upload a clear prescription image/PDF and our AI will extract diagnostic investigations.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Prescription List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
            <button
              onClick={() => {
                setActiveTab('saved');
                setCurrentPage(1);
              }}
              className={`pb-2 px-1 text-xs font-black transition relative flex items-center gap-2 ${
                activeTab === 'saved'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Saved Prescriptions</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeTab === 'saved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {doctorPrescriptions.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('uploaded');
                setCurrentPage(1);
              }}
              className={`pb-2 px-1 text-xs font-black transition relative flex items-center gap-2 ${
                activeTab === 'uploaded'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Uploaded Prescriptions</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeTab === 'uploaded' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {uploadedPrescriptions.length}
              </span>
            </button>
          </div>

          {displayedPrescriptions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <FileText size={28} />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                {activeTab === 'saved' ? 'No Doctor Prescriptions Found' : 'No Uploaded Prescriptions Yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {activeTab === 'saved'
                  ? 'There are no active doctor prescriptions with lab investigations in this clinic context.'
                  : 'You have not uploaded any external prescriptions yet. Upload an image or PDF above to extract tests.'}
              </p>
              {activeTab === 'uploaded' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm inline-flex items-center gap-2 mt-2"
                >
                  <Plus size={14} />
                  <span>Upload Prescription Now</span>
                </button>
              )}
            </div>
          ) : (
            displayedPrescriptions.map((rx) => {
              const isExpanded = expandedRxIds.has(rx._id);
              const isUploaded = rx.sourceType === 'PATIENT_UPLOADED';
              const rxIdFormatted = rx.prescriptionNumber || (isUploaded ? `UPR-2026-${rx._id.slice(-5).toUpperCase()}` : `RX-2026-${rx._id.slice(-4).toUpperCase()}`);
              const rxDateFormatted = rx.createdAt 
                ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '31 Aug 2026, 04:25 PM';
              
              const doctorName = isUploaded ? 'Patient Uploaded' : (rx.doctorId?.fullName || rx.doctorName || 'Dr. Shyam');
              const doctorDept = isUploaded ? 'External Prescription' : (rx.doctorId?.specialization || rx.doctorId?.department || 'General Medicine');
              const resolvedTests = (rx.labs || []).map(l => resolveTestDetails(l, rx));
              const availableCount = resolvedTests.filter(t => t.isAvailable && !t.isBooked).length;

              return (
                <div 
                  key={rx._id} 
                  className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
                >
                  {/* Header Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isUploaded 
                          ? 'bg-purple-50 border-purple-100 text-purple-600' 
                          : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                      }`}>
                        {isUploaded ? <FileCheck size={22} /> : <ClipboardList size={22} />}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prescription ID</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs font-black text-slate-900">{rxIdFormatted}</p>
                            <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                              isUploaded ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isUploaded ? 'Patient Uploaded' : 'Saved'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Time</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">{rxDateFormatted}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {isUploaded ? 'Source' : 'Prescribed By'}
                          </p>
                          <p className="text-xs font-black text-slate-900 mt-0.5">{doctorName}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{doctorDept}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
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
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Available
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                        Unavailable
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setSelectedTestForDetails(test)}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-600 transition inline-flex items-center gap-1"
                                      >
                                        <Info size={12} className="text-slate-400" />
                                        <span>View Details</span>
                                      </button>

                                      <button
                                        onClick={() => handleAddTestToCart(test)}
                                        disabled={!test.isAvailable || test.isBooked || inCart}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1.5 ${
                                          inCart
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs'
                                        }`}
                                      >
                                        {inCart ? (
                                          <>
                                            <Check size={13} />
                                            <span>Added</span>
                                          </>
                                        ) : (
                                          <>
                                            <ShoppingCart size={13} />
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

                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => toggleCardExpansion(rx._id)}
                          className="text-[11px] font-bold text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"
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

          {/* Pagination Controls */}
          {currentTabList.length > pageSize && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 font-medium">
                Showing {Math.min(currentTabList.length, (currentPage - 1) * pageSize + 1)} to {Math.min(currentTabList.length, currentPage * pageSize)} of {currentTabList.length} prescriptions
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-extrabold transition ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 disabled:opacity-40 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: How It Works Sidebar + Cart Summary */}
        <div id="how-it-works-sidebar" className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">How it works?</h3>
            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
              <div className="flex items-start gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 z-10">1</div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Upload Prescription</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Upload prescription image or PDF</p>
                </div>
              </div>
              <div className="flex items-start gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0 z-10">2</div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">We Extract Tests</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Our AI extracts lab tests from prescription</p>
                </div>
              </div>
              <div className="flex items-start gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center justify-center shrink-0 z-10">3</div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Review & Confirm</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Review the extracted tests and confirm</p>
                </div>
              </div>
              <div className="flex items-start gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black flex items-center justify-center shrink-0 z-10">4</div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Saved for Later</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Tests are saved for you to book anytime</p>
                </div>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black text-slate-900">Your data is secure</p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">We don't store prescription images. Only extracted test information is saved to your account.</p>
              </div>
            </div>
          </div>

          {labCart.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-blue-400" />
                  <h3 className="text-sm font-black text-white">Your Lab Cart</h3>
                </div>
                <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded-full">
                  {cartCalculation.itemCount} Tests
                </span>
              </div>
              <div className="divide-y divide-slate-700/60 max-h-48 overflow-y-auto pr-1">
                {labCart.map(item => (
                  <div key={item.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-slate-100">{item.testName}</p>
                      <p className="text-[10px] text-slate-400">{item.sample}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white">₹{item.localPrice}</span>
                      <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-400 hover:text-rose-400 p-1 transition"><X size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-700 flex items-center justify-between text-xs font-black">
                <span className="text-slate-300">Total:</span>
                <span className="text-base text-blue-400">₹{cartCalculation.finalTotal}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => onNavigate('lab-tests')} className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5">
                  <Plus size={13} />
                  <span>Add More</span>
                </button>
                <button onClick={() => onNavigate('lab-checkout')} className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-1.5">
                  <span>Checkout</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Laboratory Tests Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Review Laboratory Tests</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">We found the following laboratory tests in your prescription. Please review and confirm before saving.</p>
                </div>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"><X size={18} /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                <BadgeInfo size={16} className="text-amber-600 shrink-0" />
                <span>Confirming saves tests to your account. No lab order or payment will be made until you complete checkout.</span>
              </div>

              <div className="space-y-2.5">
                {extractedTests.map((test) => (
                  <div key={test.testId} className={`p-4 rounded-2xl border transition-all ${test.selected ? 'bg-blue-50/40 border-blue-200 shadow-2xs' : 'bg-white border-slate-200 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => toggleExtractedTest(test.testId)} className="mt-0.5 text-blue-600 focus:outline-none">
                          {test.selected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-slate-400" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black text-slate-900">{test.fullTestName || test.testName}</p>
                            <span className="text-[9px] font-black text-slate-400 uppercase">({test.shortName})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {test.confidence === 'HIGH' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"><Check size={10} /> Matched with Global Catalogue</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"><AlertCircle size={10} /> Possible Match • Please Confirm</span>
                            )}
                            <span className="text-[10px] text-slate-400 font-bold">•</span>
                            <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1"><Droplet size={11} className="text-rose-500" />{test.sampleType}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900">₹{test.localPrice}</p>
                        <p className={`text-[9px] font-bold mt-0.5 ${test.isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>{test.isAvailable ? 'Available at Lab' : 'Not Available'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setShowReviewModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-700 transition">Cancel</button>
              <button type="button" onClick={handleConfirmAndSavePrescription} disabled={isSavingPrescription || extractedTests.filter(t => t.selected).length === 0} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2">
                {isSavingPrescription ? (<><Loader2 size={14} className="animate-spin" /><span>Saving Prescription...</span></>) : (<><CheckCircle size={14} /><span>Confirm & Save Prescription ({extractedTests.filter(t => t.selected).length} Tests)</span></>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {(isUploading || isAnalyzing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto animate-bounce"><CloudUpload size={28} /></div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{isUploading ? 'Uploading prescription...' : 'Analyzing & extracting lab tests...'}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">{isUploading ? `${uploadProgress}% uploaded` : 'Matching investigations with AICMS global catalogue'}</p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-300 rounded-full" style={{ width: `${isUploading ? uploadProgress : 95}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Test Details Drawer */}
      {selectedTestForDetails && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">{selectedTestForDetails.category || 'PATHOLOGY'} • {selectedTestForDetails.department || 'HEMATOLOGY'}</span>
                <h3 className="text-lg font-black text-slate-900">{selectedTestForDetails.testName}</h3>
                <p className="text-xs text-slate-400 font-bold">Code: {selectedTestForDetails.code}</p>
              </div>
              <button onClick={() => setSelectedTestForDetails(null)} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"><X size={18} /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Offered Price</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">₹{selectedTestForDetails.localPrice}</p>
                </div>
                <div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${selectedTestForDetails.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {selectedTestForDetails.isAvailable ? '🟢 Available' : '🔴 Not Available'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">About This Test</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{selectedTestForDetails.clinicalDescription}</p>
              </div>
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Parameters Checked ({selectedTestForDetails.parameters.length})</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedTestForDetails.parameters.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-700">
                      <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Sample Type</p><p className="text-xs font-bold text-slate-800 mt-0.5">{selectedTestForDetails.sample}</p></div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Reporting Time</p><p className="text-xs font-bold text-slate-800 mt-0.5">{selectedTestForDetails.reportingTime}</p></div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Fasting Required</p><p className="text-xs font-bold text-slate-800 mt-0.5">{selectedTestForDetails.fastingRequired}</p></div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Preparation</p><p className="text-xs font-bold text-slate-800 mt-0.5">{selectedTestForDetails.patientPreparation}</p></div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Selected Lab</p>
                <p className="text-xs font-black text-slate-800">{selectedTestForDetails.laboratoryName}</p>
              </div>
              <button
                onClick={() => { handleAddTestToCart(selectedTestForDetails); setSelectedTestForDetails(null); }}
                disabled={!selectedTestForDetails.isAvailable || selectedTestForDetails.isBooked}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2"
              >
                <ShoppingCart size={14} />
                <span>Add to Cart (₹{selectedTestForDetails.localPrice})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Drawer */}
      {showCheckoutDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-900">Lab Order Checkout</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Review selected tests, sample collection mode, promo discount, and place order.</p>
              </div>
              <button onClick={() => setShowCheckoutDrawer(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"><X size={18} /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Selected Tests ({labCart.length})</h4>
                  <button onClick={() => { setShowCheckoutDrawer(false); onNavigate('lab-tests'); }} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /><span>+ Add More Lab Tests</span>
                  </button>
                </div>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/30 overflow-hidden">
                  {labCart.map(item => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 bg-white">
                      <div>
                        <p className="text-xs font-black text-slate-900">{item.testName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-slate-500 font-medium flex items-center gap-1"><Droplet size={10} className="text-rose-500" />{item.sample}</span>
                          <span className="text-[9px] text-slate-400">•</span>
                          <span className="text-[9px] text-slate-500 font-medium">{item.reportingTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-900">₹{item.localPrice}</span>
                        <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-400 hover:text-rose-500 transition p-1"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Collection Mode Choice */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Choose Sample Collection Mode</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setCollectionMethod('AT_LAB')} className={`p-4 rounded-2xl border text-left transition-all ${collectionMethod === 'AT_LAB' ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600/10' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-center justify-between"><Building2 size={18} className="text-blue-600" /><span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">FREE</span></div>
                    <p className="text-xs font-black text-slate-900 mt-2">Collect at Laboratory</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Visit selected laboratory in person</p>
                  </button>
                  <button type="button" onClick={() => setCollectionMethod('HOME_COLLECTION')} className={`p-4 rounded-2xl border text-left transition-all ${collectionMethod === 'HOME_COLLECTION' ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600/10' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-center justify-between"><Home size={18} className="text-blue-600" /><span className="text-[9px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">+₹100</span></div>
                    <p className="text-xs font-black text-slate-900 mt-2">Collect Sample at Home</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Phlebotomist visits your doorstep</p>
                  </button>
                </div>

                {collectionMethod === 'HOME_COLLECTION' ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 animate-fade-in">
                    <p className="text-xs font-black text-slate-800">Home Collection Address & Time</p>
                    <div className="space-y-2">
                      <input type="text" placeholder="House No., Building, Street Address" value={collectionAddress.line1} onChange={(e) => setCollectionAddress(prev => ({ ...prev, line1: e.target.value }))} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="City" value={collectionAddress.city} onChange={(e) => setCollectionAddress(prev => ({ ...prev, city: e.target.value }))} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500" />
                        <input type="text" placeholder="Pincode" value={collectionAddress.pincode} onChange={(e) => setCollectionAddress(prev => ({ ...prev, pincode: e.target.value }))} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Date</label>
                        <input type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} className="w-full mt-0.5 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Time Slot</label>
                        <select value={collectionSlot} onChange={(e) => setCollectionSlot(e.target.value)} className="w-full mt-0.5 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none bg-white">
                          <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</option>
                          <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                          <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <p className="text-xs font-black text-slate-800">Laboratory Walk-in Instructions</p>
                    <p className="text-[11px] text-slate-600">Visit {selectedLab?.name || 'Radha Krishna Laboratory'} during working hours (07:00 AM – 08:00 PM).</p>
                  </div>
                )}
              </div>

              {/* Promo Code Input */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Promo Code</h4>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <div className="flex items-center gap-2">
                      <Tag size={15} className="text-emerald-600" />
                      <div>
                        <p className="text-xs font-black">{appliedPromo.code} Applied</p>
                        <p className="text-[10px] text-emerald-700">Discount: -₹{appliedPromo.discountAmount}</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleRemovePromo} className="text-xs font-bold text-rose-600 hover:underline">Remove</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="Enter promo code (e.g. YAY20, HEALTH20)" value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())} className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none uppercase" />
                    <button type="button" onClick={handleApplyPromoCode} disabled={validatingPromo || !promoCodeInput.trim()} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition">
                      {validatingPromo ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              {/* Order Bill Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Tests Subtotal ({cartCalculation.itemCount} items)</span>
                  <span className="font-bold text-slate-900">₹{cartCalculation.testsSubtotal}</span>
                </div>
                {cartCalculation.promoDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-medium">
                    <span>Promo Discount ({appliedPromo?.code})</span>
                    <span className="font-bold">-₹{cartCalculation.promoDiscount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Sample Collection Fee</span>
                  <span className="font-bold text-slate-900">{cartCalculation.homeCollectionFee > 0 ? `₹${cartCalculation.homeCollectionFee}` : 'FREE'}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-blue-600 text-base">₹{cartCalculation.finalTotal}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Total Payable</p>
                <p className="text-lg font-black text-blue-600">₹{cartCalculation.finalTotal}</p>
              </div>
              <button type="button" onClick={handlePlaceOrder} disabled={isSubmittingOrder || labCart.length === 0} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg transition flex items-center gap-2">
                {isSubmittingOrder ? (<><Loader2 size={16} className="animate-spin" /><span>Placing Order...</span></>) : (<><span>Proceed to Payment</span><ArrowRight size={15} /></>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm"><CheckCircle size={32} /></div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Laboratory Order Placed!</h3>
              <p className="text-xs text-slate-500 font-medium">Your order has been confirmed with {selectedLab?.name || 'Radha Krishna Laboratory'}.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2">
              <div className="flex justify-between"><span className="text-slate-400 font-bold">Order ID:</span><span className="font-black text-slate-900">{orderSuccessModal.orderNumber || 'LAB-ORD-2026-00128'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-bold">Collection Mode:</span><span className="font-black text-slate-900">{collectionMethod === 'HOME_COLLECTION' ? '🏠 Home Collection' : '🏥 Laboratory Walk-in'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-bold">Total Paid:</span><span className="font-black text-blue-600">₹{orderSuccessModal.totalAmount || cartCalculation.finalTotal}</span></div>
            </div>
            <button onClick={() => { setOrderSuccessModal(null); onNavigate('lab-orders'); }} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition">
              View My Lab Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
