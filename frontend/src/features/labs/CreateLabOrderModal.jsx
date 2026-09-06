import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  FlaskConical,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  FileText,
  DollarSign,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Droplet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { labApi, patientApi, doctorApi, clinicApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';

export default function CreateLabOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  initialClinicId = null,
  initialLaboratoryId = null
}) {
  const { user } = useAuth();

  // Mode: 'REGISTERED' | 'WALK_IN'
  const [patientType, setPatientType] = useState('REGISTERED');

  // Patient Search & Selected Patient
  const [patientSearch, setPatientSearch] = useState('');
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Walk-in Form
  const [guestForm, setGuestForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male',
    address: ''
  });

  // Tests Search & Catalog
  const [catalogTests, setCatalogTests] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);

  // Order Settings
  const [priority, setPriority] = useState('routine');
  const [collectionMethod, setCollectionMethod] = useState('AT_LAB');
  const [notes, setNotes] = useState('');

  // Doctor list & selected doctor
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Clinics & Laboratories
  const [clinicId, setClinicId] = useState(
    initialClinicId || user?.clinicId || (typeof user?.activeClinic === 'string' ? user.activeClinic : user?.activeClinic?._id) || ''
  );
  const [laboratoryId, setLaboratoryId] = useState(initialLaboratoryId || '');

  // Home Collection details
  const [homeDetails, setHomeDetails] = useState({
    line1: '',
    city: '',
    state: '',
    pincode: '',
    preferredDate: new Date().toISOString().slice(0, 10),
    preferredSlot: '08:00 AM - 10:00 AM',
    instructions: ''
  });

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPatientType('REGISTERED');
      setPatientSearch('');
      setSelectedPatient(null);
      setGuestForm({
        fullName: '',
        phone: '',
        email: '',
        age: '',
        gender: 'Male',
        address: ''
      });
      setSelectedTests([]);
      setPriority('routine');
      setCollectionMethod('AT_LAB');
      setNotes('');
      setSelectedDoctorId('');
      setHomeDetails({
        line1: '',
        city: '',
        state: '',
        pincode: '',
        preferredDate: new Date().toISOString().slice(0, 10),
        preferredSlot: '08:00 AM - 10:00 AM',
        instructions: ''
      });
      loadCatalog();
      loadDoctors();
    }
  }, [isOpen]);

  // Load Test Catalog
  const loadCatalog = useCallback(async () => {
    setIsLoadingTests(true);
    try {
      const [testsRes, searchRes] = await Promise.allSettled([
        labApi.listTests({ limit: 100 }),
        labApi.searchAllLabs({ clinicId }).catch(() => ({ results: [] }))
      ]);

      let tests = [];
      if (testsRes.status === 'fulfilled' && testsRes.value?.data?.tests) {
        tests = testsRes.value.data.tests;
      } else if (testsRes.status === 'fulfilled' && testsRes.value?.tests) {
        tests = testsRes.value.tests;
      }

      if (tests.length === 0 && searchRes.status === 'fulfilled') {
        const sResults = searchRes.value?.data?.results || searchRes.value?.results || [];
        tests = sResults;
      }

      // Fallback default test catalog if empty
      if (tests.length === 0) {
        tests = [
          {
            _id: 'test-cbc-default',
            name: 'Complete Blood Count (CBC)',
            code: 'CBC',
            category: 'Hematology',
            specimenType: 'EDTA Whole Blood (3ml)',
            parametersCount: 8,
            price: 450,
            turnaroundTime: '4 hours'
          },
          {
            _id: 'test-hgb-default',
            name: 'Haemoglobin (Hb)',
            code: 'HGB',
            category: 'Hematology',
            specimenType: 'EDTA Whole Blood (2ml)',
            parametersCount: 1,
            price: 150,
            turnaroundTime: '2 hours'
          },
          {
            _id: 'test-vitd-default',
            name: 'Vitamin D (25-OH)',
            code: 'VITD',
            category: 'Biochemistry',
            specimenType: 'Serum (2ml)',
            parametersCount: 1,
            price: 1200,
            turnaroundTime: '24 hours'
          },
          {
            _id: 'test-lft-default',
            name: 'Liver Function Test (LFT)',
            code: 'LFT',
            category: 'Biochemistry',
            specimenType: 'Serum (3ml)',
            parametersCount: 7,
            price: 750,
            turnaroundTime: '6 hours'
          },
          {
            _id: 'test-kft-default',
            name: 'Kidney Function Test (KFT)',
            code: 'KFT',
            category: 'Biochemistry',
            specimenType: 'Serum (3ml)',
            parametersCount: 5,
            price: 650,
            turnaroundTime: '6 hours'
          },
          {
            _id: 'test-lipid-default',
            name: 'Lipid Profile',
            code: 'LIPID',
            category: 'Biochemistry',
            specimenType: 'Serum (Fasting 3ml)',
            parametersCount: 5,
            price: 600,
            turnaroundTime: '6 hours'
          },
          {
            _id: 'test-thyroid-default',
            name: 'Thyroid Profile (T3, T4, TSH)',
            code: 'THYROID',
            category: 'Endocrinology',
            specimenType: 'Serum (2ml)',
            parametersCount: 3,
            price: 550,
            turnaroundTime: '6 hours'
          },
          {
            _id: 'test-uriner-default',
            name: 'Urine Routine & Microscopy',
            code: 'URINE_R',
            category: 'Clinical Pathology',
            specimenType: 'Clean Catch Midstream Urine',
            parametersCount: 12,
            price: 200,
            turnaroundTime: '2 hours'
          }
        ];
      }

      setCatalogTests(tests);
    } catch (err) {
      console.error('Failed to load lab tests catalog:', err);
    } finally {
      setIsLoadingTests(false);
    }
  }, [clinicId]);

  // Load Doctors
  const loadDoctors = async () => {
    try {
      const res = await doctorApi.list({ limit: 50 });
      const list = res?.data?.doctors || res?.doctors || [];
      setDoctors(list);
    } catch (err) {
      console.error('Failed to load doctors list:', err);
    }
  };

  // Debounced Patient Search
  useEffect(() => {
    if (patientType !== 'REGISTERED' || !patientSearch.trim()) {
      setPatientResults([]);
      setIsSearchingPatients(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPatients(true);
      try {
        const res = await patientApi.list({ search: patientSearch.trim(), limit: 10 });
        const list = res?.data?.patients || res?.patients || [];
        setPatientResults(list);
      } catch (err) {
        console.error('Patient search error:', err);
      } finally {
        setIsSearchingPatients(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch, patientType]);

  // Filter Catalog Tests
  const filteredCatalogTests = useMemo(() => {
    if (!testSearch.trim()) return catalogTests;
    const q = testSearch.toLowerCase().trim();
    return catalogTests.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [catalogTests, testSearch]);

  // Handle Add/Remove Test
  const toggleTestSelection = (test) => {
    const exists = selectedTests.some(
      (t) => (t._id && t._id === test._id) || (t.code && t.code === test.code)
    );

    if (exists) {
      setSelectedTests((prev) =>
        prev.filter((t) => (t._id ? t._id !== test._id : t.code !== test.code))
      );
    } else {
      setSelectedTests((prev) => [
        ...prev,
        {
          _id: test._id,
          name: test.name,
          code: test.code,
          category: test.category || 'General',
          specimenType: test.specimenType || 'Blood',
          parametersCount: test.parametersCount || (test.code === 'CBC' ? 8 : 1),
          price: Number(test.price) || 0,
          turnaroundTime: test.turnaroundTime || 'Same day',
          labTestId: test._id
        }
      ]);
    }
  };

  // Totals calculations
  const totalAmount = useMemo(() => {
    return selectedTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  }, [selectedTests]);

  const totalParams = useMemo(() => {
    return selectedTests.reduce((sum, t) => sum + (Number(t.parametersCount) || 1), 0);
  }, [selectedTests]);

  // Form Validation
  const isValid = useMemo(() => {
    if (selectedTests.length === 0) return false;
    if (patientType === 'REGISTERED') {
      return Boolean(selectedPatient?._id);
    }
    if (patientType === 'WALK_IN') {
      return Boolean(guestForm.fullName.trim() && guestForm.phone.trim());
    }
    return false;
  }, [selectedTests, patientType, selectedPatient, guestForm]);

  // Create Order Handler
  const handleCreateOrder = async (e) => {
    e?.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const payload = {
        clinicId: clinicId || undefined,
        laboratoryId: laboratoryId || undefined,
        patientType,
        patientId: patientType === 'REGISTERED' ? selectedPatient._id : undefined,
        doctorId: selectedDoctorId || undefined,
        nonRegisteredPatientDetails:
          patientType === 'WALK_IN'
            ? {
                fullName: guestForm.fullName.trim(),
                phone: guestForm.phone.trim(),
                email: guestForm.email?.trim() || undefined,
                age: guestForm.age ? Number(guestForm.age) : undefined,
                gender: guestForm.gender,
                address: guestForm.address?.trim() || undefined
              }
            : undefined,
        priority,
        collectionMethod,
        collectionAddress:
          collectionMethod === 'HOME_COLLECTION'
            ? {
                line1: homeDetails.line1,
                city: homeDetails.city,
                state: homeDetails.state,
                pincode: homeDetails.pincode
              }
            : undefined,
        collectionDate:
          collectionMethod === 'HOME_COLLECTION' ? homeDetails.preferredDate : undefined,
        collectionSlot:
          collectionMethod === 'HOME_COLLECTION' ? homeDetails.preferredSlot : undefined,
        notes: notes.trim(),
        price: totalAmount,
        source: 'LAB_CREATED',
        tests: selectedTests.map((t) => ({
          name: t.name,
          code: t.code,
          category: t.category,
          specimenType: t.specimenType,
          price: t.price,
          turnaroundTime: t.turnaroundTime,
          labTestId: t.labTestId
        }))
      };

      const res = await labApi.createOrder(payload);
      const createdOrder = res?.data?.labOrder || res?.labOrder || res?.data;

      toast.success(
        `✓ Laboratory Order ${createdOrder?.orderNumber || ''} created successfully!`
      );

      if (onOrderCreated) {
        onOrderCreated(createdOrder);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create lab order:', err);
      toast.error(err?.response?.data?.message || 'Failed to create laboratory order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-16 right-0 bottom-0 left-0 z-40 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 lg:p-6 backdrop-blur-xs animate-fade-in overflow-hidden"
      id="create-lab-order-modal-backdrop"
      onClick={(e) => {
        if (e.target.id === 'create-lab-order-modal-backdrop') {
          onClose();
        }
      }}
    >
      <div
        className="flex h-auto max-h-[calc(100vh-5.5rem)] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden text-stone-800 animate-scale-up"
        id="create-lab-order-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/70 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-xs">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                Create Laboratory Order
              </h2>
              <p className="text-xs text-stone-500">
                Register a new diagnostic work order with patient and test selection.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            id="close-create-order-modal-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* MODAL SCROLLABLE BODY                                     */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain [scrollbar-width:thin]">
          {/* 1. PATIENT SELECTION */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-violet-600" />
                <span>1. Patient Information</span>
              </h3>

              {/* Patient Type Toggle */}
              <div className="flex items-center rounded-xl bg-stone-100 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setPatientType('REGISTERED');
                    setSelectedPatient(null);
                  }}
                  className={`rounded-lg px-3 py-1 transition cursor-pointer ${
                    patientType === 'REGISTERED'
                      ? 'bg-white text-violet-700 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Registered Patient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPatientType('WALK_IN');
                    setSelectedPatient(null);
                  }}
                  className={`rounded-lg px-3 py-1 transition cursor-pointer ${
                    patientType === 'WALK_IN'
                      ? 'bg-white text-violet-700 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Walk-In / Guest
                </button>
              </div>
            </div>

            {/* REGISTERED PATIENT LOOKUP */}
            {patientType === 'REGISTERED' && (
              <div className="space-y-3">
                {!selectedPatient ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search patient by Name, UHID, or Phone number..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 transition"
                        id="patient-search-input"
                      />
                      {isSearchingPatients && (
                        <div className="absolute right-3.5 top-3">
                          <RefreshCw className="h-4 w-4 text-violet-600 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Patient Search Results Dropdown */}
                    {patientResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-lg divide-y divide-stone-100">
                        {patientResults.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearch('');
                              setPatientResults([]);
                            }}
                            className="flex items-center justify-between p-3 text-xs hover:bg-violet-50/60 cursor-pointer transition"
                          >
                            <div>
                              <span className="font-extrabold text-stone-900">{p.fullName}</span>
                              <div className="text-[11px] text-stone-500 mt-0.5">
                                UHID: <strong className="font-mono text-stone-700">{p.patientId || 'PAT-0000'}</strong> • Age: {p.age || '—'} yrs • {p.gender || 'Other'} • Phone: {p.phone || '—'}
                              </div>
                            </div>
                            <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                              Select
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {patientSearch && !isSearchingPatients && patientResults.length === 0 && (
                      <div className="rounded-xl bg-stone-50 p-3 text-center text-xs text-stone-400">
                        No registered patients found matching "{patientSearch}".
                      </div>
                    )}
                  </div>
                ) : (
                  /* Selected Patient Card */
                  <div className="flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white font-bold text-sm">
                        {selectedPatient.fullName?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-stone-900">
                            {selectedPatient.fullName}
                          </span>
                          <span className="rounded bg-violet-100 px-2 py-0.5 font-mono text-[11px] font-bold text-violet-800">
                            {selectedPatient.patientId || 'PAT-0000'}
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 mt-0.5">
                          Age: {selectedPatient.age || 28} yrs • {selectedPatient.gender || 'Other'} • Phone: {selectedPatient.phone || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs font-bold text-stone-500 hover:text-rose-600 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* WALK-IN PATIENT FORM */}
            {patientType === 'WALK_IN' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-stone-500 font-bold block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={guestForm.fullName}
                    onChange={(e) => setGuestForm({ ...guestForm, fullName: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 outline-none focus:border-violet-500 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-stone-500 font-bold block mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 outline-none focus:border-violet-500 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-stone-500 font-bold block mb-1">Age (Years)</label>
                  <input
                    type="number"
                    placeholder="e.g. 32"
                    value={guestForm.age}
                    onChange={(e) => setGuestForm({ ...guestForm, age: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 outline-none focus:border-violet-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-stone-500 font-bold block mb-1">Gender</label>
                  <select
                    value={guestForm.gender}
                    onChange={(e) => setGuestForm({ ...guestForm, gender: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 outline-none focus:border-violet-500 focus:bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* 2. LAB TESTS CATALOG PICKER */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5 text-violet-600" />
                <span>2. Select Laboratory Tests</span>
              </h3>
              <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                {selectedTests.length} Selected
              </span>
            </div>

            {/* Test Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search test by name (e.g. CBC, Vitamin D, Lipid, LFT)..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 transition"
                id="test-search-input"
              />
            </div>

            {/* Catalog Grid */}
            <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 [scrollbar-width:thin]">
              {filteredCatalogTests.map((test) => {
                const isSelected = selectedTests.some(
                  (t) => (t._id && t._id === test._id) || (t.code && t.code === test.code)
                );

                return (
                  <div
                    key={test._id || test.code}
                    onClick={() => toggleTestSelection(test)}
                    className={`flex items-start justify-between p-3 rounded-2xl border transition cursor-pointer text-xs ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50/60 ring-1 ring-violet-300 shadow-2xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/80'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-stone-900">{test.name}</span>
                        {test.code && (
                          <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[10px] font-mono text-stone-600 font-bold">
                            {test.code}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {test.parametersCount || (test.code === 'CBC' ? 8 : 1)} params • {test.specimenType || 'Blood'}
                      </div>
                      <div className="text-[11px] font-bold text-violet-700">
                        ₹ {Number(test.price) || 450}
                      </div>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border transition shrink-0 ${
                        isSelected
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-3 w-3 text-stone-400" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Tests Summary Chips */}
            {selectedTests.length > 0 && (
              <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                  <span>Selected Investigations:</span>
                  <span>{totalParams} Total Parameters • ₹ {totalAmount}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTests.map((t) => (
                    <span
                      key={t._id || t.code}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-stone-200 px-3 py-1 text-xs font-bold text-stone-800 shadow-2xs"
                    >
                      <span>{t.name}</span>
                      <span className="text-[10px] text-stone-400">({t.parametersCount}p)</span>
                      <span className="text-violet-700 font-extrabold">₹{t.price}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTestSelection(t);
                        }}
                        className="text-stone-400 hover:text-rose-600 cursor-pointer ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 3. ORDER DETAILS & COLLECTION MODE */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-violet-600" />
              <span>3. Order Details & Collection Mode</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Priority */}
              <div>
                <label className="text-stone-500 font-bold block mb-1">Order Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 font-bold text-stone-800 outline-none focus:border-violet-500 focus:bg-white"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">Stat (Immediate)</option>
                </select>
              </div>

              {/* Referring Doctor */}
              <div>
                <label className="text-stone-500 font-bold block mb-1">Referring Doctor (Optional)</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 text-stone-800 outline-none focus:border-violet-500 focus:bg-white"
                >
                  <option value="">No Doctor / Self Referred</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.fullName} ({d.speciality || 'General'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Collection Mode Radio */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-stone-500 font-bold text-xs block">Specimen Collection Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    collectionMethod === 'AT_LAB'
                      ? 'border-violet-500 bg-violet-50/50 ring-1 ring-violet-300'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="collectionMode"
                    value="AT_LAB"
                    checked={collectionMethod === 'AT_LAB'}
                    onChange={() => setCollectionMethod('AT_LAB')}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="font-extrabold text-stone-900 block">At Laboratory Desk</span>
                    <span className="text-[11px] text-stone-500">Patient visits lab / phlebotomy station</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    collectionMethod === 'HOME_COLLECTION'
                      ? 'border-violet-500 bg-violet-50/50 ring-1 ring-violet-300'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="collectionMode"
                    value="HOME_COLLECTION"
                    checked={collectionMethod === 'HOME_COLLECTION'}
                    onChange={() => setCollectionMethod('HOME_COLLECTION')}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="font-extrabold text-stone-900 block">Home Collection</span>
                    <span className="text-[11px] text-stone-500">Phlebotomist dispatched to patient address</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Home Collection Details Form */}
            {collectionMethod === 'HOME_COLLECTION' && (
              <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-stone-500 font-bold block mb-1">Collection Address Line</label>
                    <input
                      type="text"
                      placeholder="Street address, Apartment / House No."
                      value={homeDetails.line1}
                      onChange={(e) => setHomeDetails({ ...homeDetails, line1: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-stone-500 font-bold block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={homeDetails.city}
                      onChange={(e) => setHomeDetails({ ...homeDetails, city: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-stone-500 font-bold block mb-1">Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. 400001"
                      value={homeDetails.pincode}
                      onChange={(e) => setHomeDetails({ ...homeDetails, pincode: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-stone-500 font-bold block mb-1">Preferred Date</label>
                    <input
                      type="date"
                      value={homeDetails.preferredDate}
                      onChange={(e) => setHomeDetails({ ...homeDetails, preferredDate: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 outline-none focus:border-violet-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-stone-500 font-bold block mb-1">Time Slot</label>
                    <select
                      value={homeDetails.preferredSlot}
                      onChange={(e) => setHomeDetails({ ...homeDetails, preferredSlot: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-white p-2.5 outline-none focus:border-violet-500 font-bold"
                    >
                      <option value="07:00 AM - 09:00 AM">07:00 AM - 09:00 AM (Early Fasting)</option>
                      <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM</option>
                      <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                      <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                      <option value="05:00 PM - 07:00 PM">05:00 PM - 07:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-stone-500 font-bold block mb-1 text-xs">Staff Instructions / Notes</label>
              <textarea
                rows={2}
                placeholder="Add special instructions, fasting status, or collection notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs outline-none focus:border-violet-500 focus:bg-white"
              />
            </div>
          </section>

          {/* 4. ORDER SUMMARY BANNER */}
          <section className="rounded-2xl bg-gradient-to-br from-violet-900 to-indigo-950 p-5 text-white shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Order Summary</span>
              </span>
              <span className="text-xs font-bold text-violet-200">
                Mode: <strong className="text-white">{collectionMethod === 'AT_LAB' ? 'At Laboratory' : 'Home Collection'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-violet-300 text-[11px] block">Patient</span>
                <span className="font-extrabold text-sm text-white">
                  {patientType === 'REGISTERED'
                    ? selectedPatient?.fullName || 'Not selected'
                    : guestForm.fullName || 'Walk-in Guest'}
                </span>
                {patientType === 'REGISTERED' && selectedPatient?.patientId && (
                  <span className="font-mono text-[10px] text-violet-200 block">
                    {selectedPatient.patientId}
                  </span>
                )}
              </div>

              <div>
                <span className="text-violet-300 text-[11px] block">Selected Tests</span>
                <span className="font-extrabold text-sm text-white">
                  {selectedTests.length} Tests ({totalParams} params)
                </span>
                <span className="text-[10px] text-violet-200 block truncate max-w-[200px]">
                  {selectedTests.map((t) => t.name).join(', ') || 'No tests selected'}
                </span>
              </div>

              <div>
                <span className="text-violet-300 text-[11px] block">Total Amount</span>
                <span className="font-extrabold text-xl text-amber-300">
                  ₹ {totalAmount}
                </span>
                <span className="text-[10px] text-emerald-300 block font-bold">
                  ● Status: Ordered (Initial)
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* ========================================================= */}
        {/* MODAL FOOTER ACTIONS                                      */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/70 px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!isValid || isSubmitting}
            onClick={handleCreateOrder}
            className={`rounded-2xl px-6 py-2.5 text-xs font-extrabold text-white shadow-md transition flex items-center gap-2 ${
              isValid && !isSubmitting
                ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-200 cursor-pointer'
                : 'bg-stone-300 text-stone-500 shadow-none cursor-not-allowed opacity-70'
            }`}
            id="submit-create-lab-order-btn"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Creating Order...</span>
              </>
            ) : (
              <>
                <span>Create Lab Order</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
