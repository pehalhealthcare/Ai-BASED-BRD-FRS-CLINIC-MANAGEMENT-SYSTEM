import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  FlaskConical, Search, QrCode, Phone, User, FileText, Plus,
  Check, X, AlertCircle, Clock, Droplet, Upload, Shield, CheckCircle2,
  Building2, ArrowRight, Sparkles, RefreshCw
} from 'lucide-react';
import { labApi, clinicApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { FullPageSpinner } from '../../components/ui/Spinner';

export default function LabOrderCreatePage() {
  const { consultationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode: 'REGISTERED' vs 'WALK_IN'
  const [patientType, setPatientType] = useState('REGISTERED');

  // Clinic Context
  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(
    user?.clinicId || (typeof user?.activeClinic === 'string' ? user.activeClinic : user?.activeClinic?._id) || ''
  );
  const [attachedLaboratories, setAttachedLaboratories] = useState([]);
  const [selectedLaboratoryId, setSelectedLaboratoryId] = useState('');

  // Lookup criteria
  const [lookupType, setLookupType] = useState('phone'); // 'phone' | 'patientId' | 'prescriptionNumber' | 'consultationId' | 'scanCode'
  const [lookupValue, setLookupValue] = useState(searchParams.get('phone') || searchParams.get('prescriptionNumber') || '');
  const [isSearching, setIsSearching] = useState(false);

  // Resolved Patient & Prescription Context
  const [resolvedPatient, setResolvedPatient] = useState(null);
  const [latestPrescription, setLatestPrescription] = useState(null);
  const [previousPrescriptions, setPreviousPrescriptions] = useState([]);
  const [activePrescriptionTab, setActivePrescriptionTab] = useState('latest');

  // Walk-in Guest Form
  const [guestForm, setGuestForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male',
    address: ''
  });

  // Selected Order Tests
  const [orderedTests, setOrderedTests] = useState([]);
  const [priority, setPriority] = useState('routine');
  const [collectionMethod, setCollectionMethod] = useState('AT_LAB');
  const [staffNotes, setStaffNotes] = useState('');

  // Documents
  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('Doctor Prescription');
  const [docName, setDocName] = useState('');

  // Catalog tests for adding extra tests
  const [catalogTests, setCatalogTests] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial Load: Clinics & Clinic Labs
  useEffect(() => {
    clinicApi.list().then(res => {
      const list = res?.data?.clinics || res?.clinics || [];
      setClinics(list);
      if (list.length > 0 && !selectedClinicId) {
        setSelectedClinicId(String(list[0]._id));
      }
    }).catch(err => console.error('Failed to load clinics:', err));
  }, []);

  // 2. Load Clinic Labs when clinic changes
  useEffect(() => {
    if (!selectedClinicId) return;
    labApi.searchAllLabs({ clinicId: selectedClinicId }).then(res => {
      const results = res?.data?.results || res?.results || [];
      const attached = res?.data?.attachedLaboratories || res?.attachedLaboratories || [];
      setCatalogTests(results);
      setAttachedLaboratories(attached);
      if (attached.length > 0 && !selectedLaboratoryId) {
        setSelectedLaboratoryId(String(attached[0]._id));
      }
    }).catch(err => console.error('Failed to load catalog:', err));
  }, [selectedClinicId]);

  // Auto-trigger lookup if consultationId is in route
  useEffect(() => {
    if (consultationId) {
      setLookupType('consultationId');
      setLookupValue(consultationId);
      handleLookup({ consultationId });
    }
  }, [consultationId]);

  // Lookup Handler
  const handleLookup = async (overrideParams = null) => {
    const params = overrideParams || {
      clinicId: selectedClinicId,
      [lookupType]: lookupValue.trim()
    };

    if (!overrideParams && !lookupValue.trim()) {
      toast.error('Please enter a lookup search value.');
      return;
    }

    setIsSearching(true);
    try {
      const res = await labApi.lookupPrescription(params);
      const data = res?.data || res;
      setResolvedPatient(data.patient);
      setLatestPrescription(data.latestPrescription);
      setPreviousPrescriptions(data.previousPrescriptions || []);

      if (data.latestPrescription?.labs?.length > 0) {
        const prefilled = data.latestPrescription.labs.map(l => ({
          name: l.testName,
          code: l.code || 'TEST',
          category: l.category || 'General',
          specimenType: l.sampleRequired || 'Blood',
          price: l.priceSnapshot || l.price || 350,
          turnaroundTime: l.tatSnapshot || l.turnaroundTime || '24 Hours',
          patientPreparation: l.instructions || 'No Fasting Required',
          globalLabTestId: l.globalLabTestId || null,
          labTestId: l.localInventoryId || null,
          fromPrescription: true
        }));
        setOrderedTests(prefilled);
        toast.success(`Found prescription with ${prefilled.length} recommended tests.`);
      } else {
        toast.success('Patient record found. You can now select tests from catalog.');
      }
    } catch (err) {
      console.error('Prescription lookup error:', err);
      toast.error(err?.response?.data?.message || 'No matching patient or prescription found.');
    } finally {
      setIsSearching(false);
    }
  };

  // Add test from catalog to order
  const handleAddCatalogTest = (test) => {
    const exists = orderedTests.some(t => t.name.toLowerCase() === test.name.toLowerCase());
    if (exists) {
      toast('Test is already added to the order.');
      return;
    }
    const itemPrice = typeof test.price === 'number' ? test.price : 350;
    setOrderedTests(prev => [
      ...prev,
      {
        name: test.name,
        code: test.code || 'TEST',
        category: test.category || 'General',
        specimenType: test.sampleType || test.specimenType || 'Blood',
        price: itemPrice,
        turnaroundTime: test.reportingTime || test.tat || '24 Hours',
        patientPreparation: test.patientPreparation || 'No Fasting Required',
        globalLabTestId: test.globalInvestigationId || test.globalLabTestId || null,
        labTestId: test.localInventoryIds?.[0] || test._id || null,
        fromPrescription: false
      }
    ]);
    setShowCatalogModal(false);
    toast.success(`Added ${test.name} to order.`);
  };

  const handleRemoveTest = (index) => {
    setOrderedTests(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddDocument = () => {
    if (!docName.trim()) {
      toast.error('Please enter document title.');
      return;
    }
    setDocuments(prev => [
      ...prev,
      {
        documentType: docType,
        name: docName.trim(),
        url: 'uploaded_doc_ref',
        uploadedAt: new Date()
      }
    ]);
    setDocName('');
    toast.success('Document attached to order.');
  };

  const handleCreateOrder = async () => {
    if (patientType === 'REGISTERED' && !resolvedPatient) {
      toast.error('Please search and select a patient first.');
      return;
    }

    if (patientType === 'WALK_IN') {
      if (!guestForm.fullName.trim() || !guestForm.phone.trim()) {
        toast.error('Please provide walk-in patient Full Name and Phone Number.');
        return;
      }
    }

    if (orderedTests.length === 0) {
      toast.error('Please add at least one test to the order.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clinicId: selectedClinicId,
        laboratoryId: selectedLaboratoryId || null,
        patientType,
        patientId: patientType === 'REGISTERED' ? resolvedPatient?._id : undefined,
        prescriptionId: latestPrescription?._id || undefined,
        consultationId: latestPrescription?.consultationId || consultationId || undefined,
        nonRegisteredPatientDetails: patientType === 'WALK_IN' ? guestForm : undefined,
        priority,
        collectionMethod,
        notes: staffNotes,
        price: orderedTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0),
        source: patientType === 'WALK_IN' ? 'WALK_IN' : (latestPrescription ? 'PRESCRIPTION' : 'LAB_CREATED'),
        documents,
        tests: orderedTests.map(t => ({
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
      const createdOrder = res?.data?.labOrder || res?.labOrder || res?.data;
      toast.success(`Lab Order #${createdOrder.orderNumber || 'CONFIRMED'} created successfully!`);
      navigate(`/labs/orders/${createdOrder._id || ''}`);
    } catch (err) {
      console.error('Order creation error:', err);
      toast.error(err?.response?.data?.message || 'Failed to create laboratory order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPrice = orderedTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);

  return (
    <div className="w-full space-y-6 p-4 md:p-8 animate-fade-in text-slate-800 dark:text-slate-100 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 shadow-2xl text-white">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <FlaskConical size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Laboratory Staff Desk
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 text-white">
                Create Laboratory Order
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Lookup doctor prescriptions via phone, QR/barcode, or enter walk-in guest details.
              </p>
            </div>
          </div>

          {/* Clinic context */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col gap-1 min-w-[240px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 size={12} className="text-emerald-400" /> Performing Clinic
            </span>
            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="w-full bg-slate-900/90 text-xs font-semibold text-white px-3 py-2 rounded-xl border border-white/10"
            >
              {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* PATIENT TYPE TOGGLE */}
      <div className="flex gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md">
        <button
          type="button"
          onClick={() => setPatientType('REGISTERED')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            patientType === 'REGISTERED'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User size={15} /> Registered Patient
        </button>
        <button
          type="button"
          onClick={() => setPatientType('WALK_IN')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            patientType === 'WALK_IN'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Plus size={15} /> Walk-in / Guest Patient
        </button>
      </div>

      {/* MAIN TWO-COLUMN FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Patient Lookup / Guest Form + Prescriptions (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* REGISTERED PATIENT LOOKUP */}
          {patientType === 'REGISTERED' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Search size={16} className="text-indigo-500" /> Omni-channel Prescription Lookup
              </h3>

              {/* Lookup Subtabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'phone', label: 'Phone Number', icon: Phone },
                  { id: 'patientId', label: 'Patient ID', icon: User },
                  { id: 'prescriptionNumber', label: 'Prescription ID (PRS-XXXXXX)', icon: FileText },
                  { id: 'scanCode', label: 'Scan QR / Barcode', icon: QrCode }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setLookupType(tab.id); setLookupValue(''); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                      lookupType === tab.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <tab.icon size={13} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lookupValue}
                  onChange={(e) => setLookupValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder={
                    lookupType === 'phone' ? 'Enter 10-digit mobile number...' :
                    lookupType === 'patientId' ? 'Enter UHID or Patient ID...' :
                    lookupType === 'scanCode' ? 'Scan Barcode or enter Token...' :
                    'Enter Prescription number (e.g. PRS-000123)...'
                  }
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={isSearching}
                  onClick={() => handleLookup()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} Search
                </button>
              </div>

              {/* Resolved Patient Profile */}
              {resolvedPatient && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {resolvedPatient.fullName || `${resolvedPatient.firstName} ${resolvedPatient.lastName}`}
                      </strong>
                      <span className="text-xs text-slate-500 ml-2">
                        {resolvedPatient.gender || '—'}, {resolvedPatient.age || '—'} yrs
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                      Verified Patient
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div>Phone: <span className="font-semibold">{resolvedPatient.phone || '—'}</span></div>
                    <div>UHID: <span className="font-semibold">{resolvedPatient.patientId || resolvedPatient._id}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WALK-IN GUEST FORM */}
          {patientType === 'WALK_IN' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <User size={16} className="text-indigo-500" /> Walk-In Guest Patient Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Patient Full Name"
                    value={guestForm.fullName}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Age</label>
                  <input
                    type="number"
                    placeholder="Age in years"
                    value={guestForm.age}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Gender</label>
                  <select
                    value={guestForm.gender}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Address details"
                    value={guestForm.address}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* REQUIRED DOCUMENT ATTACHMENTS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Upload size={16} className="text-indigo-500" /> Document Attachments
            </h3>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option>Doctor Prescription</option>
                <option>Previous Report</option>
                <option>Referral Document</option>
                <option>Identity Document</option>
              </select>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Document Title (e.g. Rx Dr. Sharma 17-Aug)"
                className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={handleAddDocument}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition"
              >
                + Attach
              </button>
            </div>

            {documents.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-700 dark:text-slate-300">
                      📄 <strong className="text-indigo-600 dark:text-indigo-400">[{doc.documentType}]</strong> {doc.name}
                    </span>
                    <button
                      onClick={() => setDocuments(docs => docs.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Selected Tests & Order Submission (1 Col) */}
        <div className="space-y-6">

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Order Tests ({orderedTests.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Plus size={13} /> Add Extra Test
              </button>
            </div>

            {/* Test Items */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {orderedTests.length > 0 ? (
                orderedTests.map((test, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <strong className="text-slate-800 dark:text-slate-100 block">{test.name}</strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Sample: {test.specimenType} • TAT: {test.turnaroundTime}
                      </span>
                      {test.fromPrescription && (
                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800">
                          From Prescription
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-800 dark:text-white">₹{test.price}</strong>
                      <button
                        type="button"
                        onClick={() => handleRemoveTest(idx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  No tests added to order yet.
                </div>
              )}
            </div>

            {/* Priority & Collection Selection */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT / Emergency</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Collection Method</label>
                <select
                  value={collectionMethod}
                  onChange={(e) => setCollectionMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  <option value="AT_LAB">At Laboratory Desk</option>
                  <option value="HOME_COLLECTION">Home Phlebotomy Collection</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Lab Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="Technician instructions..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 resize-none text-xs"
                />
              </div>
            </div>

            {/* Total Price & Submit */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm font-extrabold">
                <span>Total Amount:</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-lg">₹{totalPrice}</span>
              </div>

              <button
                type="button"
                disabled={isSubmitting || orderedTests.length === 0}
                onClick={handleCreateOrder}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Creating Order...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Confirm &amp; Create Lab Order
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: ADD EXTRA TEST FROM CATALOG */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Add Investigation from Catalog
              </h3>
              <button onClick={() => setShowCatalogModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search tests..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
            />

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
              {catalogTests
                .filter(t => !catalogSearch || t.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                .map(test => (
                  <div key={test.investigationId || test._id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition">
                    <div>
                      <strong className="text-xs font-bold text-slate-800 dark:text-slate-100 block">{test.name}</strong>
                      <span className="text-[10px] text-slate-400">Sample: {test.sampleType || 'Blood'} • Price: ₹{test.price || 350}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddCatalogTest(test)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition"
                    >
                      + Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
