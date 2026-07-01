import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, ArrowLeft, Calendar, FileText, CheckCircle2,
  ChevronLeft, ChevronRight, AlertTriangle, AlertCircle,
  Building2, Package, Layers, Info, Check, HelpCircle,
  Activity, Star, Sparkles, Filter, Shield, Eye, X,
  MoreVertical, Edit2, Ban, RefreshCw, BarChart2, CheckCircle
} from 'lucide-react';

import useAuth from '../../hooks/useAuth';
import { listMedicines, createMedicine } from './pharmacyApi';
import { clinicApi } from '../../lib/api';
import { toast } from 'react-hot-toast';

const MedicineCatalogPage = () => {
  const { user } = useAuth();

  // Mode: 'catalog' or 'add_medicine' or 'reports'
  const [mode, setMode] = useState('catalog');
  const [selectedReportMedicineName, setSelectedReportMedicineName] = useState('');

  // Reports Filter States
  const [reportSearch, setReportSearch] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [reportClinicId, setReportClinicId] = useState('');
  const [reportStockStatus, setReportStockStatus] = useState('all');

  useEffect(() => {
    if (selectedReportMedicineName) {
      setReportSearch(selectedReportMedicineName);
    }
  }, [selectedReportMedicineName]);

  // Catalog States
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    stockStatus: 'all',
    expiryStatus: 'all',
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Add Medicine Form States
  const [step, setStep] = useState(1); // 1: Details & Batch, 2: Distribute, 3: Overview
  const [distributionMethod, setDistributionMethod] = useState('manual'); // 'manual', 'equal', 'ai'
  const [form, setForm] = useState({
    code: '',
    name: '',
    genericName: '',
    brandName: '',
    category: '',
    form: '',
    strength: '',
    unit: 'mg',
    manufacturer: '',
    supplier: '',
    unitPriceSelling: '',
    purchasePrice: '',
    reorderLevel: '',
    supplierLeadTimeDays: 7,
    description: '',
    requiresPrescription: true,
    isActive: true,
    // Batch
    batchNumber: '',
    batchQuantity: '',
    mfgDate: '',
    expiryDate: '',
    batchPurchasePrice: '',
    batchSellingPrice: '',
    supplierInvoiceNumber: '',
  });

  // Distribute Medicine States (step 2 & 3)
  const [distributions, setDistributions] = useState([]);
  const [clinics, setClinics] = useState([]);

  // Load Real Medicines and Clinics of the Admin's Organization
  const loadMedicinesAndClinics = async () => {
    setLoading(true);
    setError('');
    try {
      const [medRes, clinicsRes] = await Promise.all([
        listMedicines({ limit: 100, allClinics: true }),
        clinicApi.list()
      ]);
      
      setMedicines(medRes.data?.medicines || medRes.medicines || []);

      const orgId = user?.organizationId;
      const rawClinics = clinicsRes.data?.clinics || [];
      const orgClinics = rawClinics.filter(c => String(c.organizationId) === String(orgId));
      setClinics(orgClinics);

      const initialDists = orgClinics.map((c, idx) => ({
        clinicId: c._id,
        clinicName: c.name,
        currentStock: 0,
        reorderLevel: 10,
        quantity: idx === 0 ? '500' : '0',
        location: c.address?.city || 'India',
        checked: idx === 0
      }));
      setDistributions(initialDists);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load pharmacy assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.organizationId) {
      loadMedicinesAndClinics();
    }
  }, [user]);

  // Sync Equal Distribution quantities when quantity or active list changes
  useEffect(() => {
    if (distributionMethod === 'equal') {
      const activeClinics = distributions.filter(d => d.checked);
      const totalQuantity = Number(form.batchQuantity || 1000);
      if (activeClinics.length > 0) {
        const equalQty = Math.floor(totalQuantity / activeClinics.length);
        const updated = distributions.map(d => ({
          ...d,
          quantity: d.checked ? String(equalQty) : '0'
        }));
        setDistributions(updated);
      }
    } else if (distributionMethod === 'ai') {
      // AI Recommended ratios (32%, 28%, 20%, 15%, 5%)
      const totalQuantity = Number(form.batchQuantity || 1000);
      const ratios = { c1: 0.32, c2: 0.28, c3: 0.20, c4: 0.15, c5: 0.05 };
      const updated = distributions.map(d => ({
        ...d,
        quantity: d.checked ? String(Math.floor(totalQuantity * (ratios[d.clinicId] || 0.20))) : '0'
      }));
      setDistributions(updated);
    }
  }, [distributionMethod, form.batchQuantity]);

  // Group medicines by code/name to aggregate stock across clinics
  const groupedMedicines = useMemo(() => {
    const groups = {};
    medicines.forEach(m => {
      const key = (m.code || m.name || '').trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          _id: m._id,
          code: m.code,
          name: m.name,
          genericName: m.genericName,
          brandName: m.brandName,
          category: m.category,
          form: m.form,
          strength: m.strength,
          manufacturer: m.manufacturer,
          unitPrice: m.unitPrice,
          reorderLevel: m.reorderLevel || 10,
          isActive: m.isActive,
          requiresPrescription: m.requiresPrescription,
          totalStock: 0,
          batches: [],
          stockFlags: { nearExpiry: false },
          clinicStocks: {}
        };
      }
      
      const g = groups[key];
      g.totalStock += (m.totalStock || 0);
      if (m.batches && m.batches.length > 0) {
        g.batches = [...g.batches, ...m.batches];
      }
      if (m.stockFlags?.nearExpiry) {
        g.stockFlags.nearExpiry = true;
      }
      
      g.clinicStocks[String(m.clinicId)] = {
        totalStock: m.totalStock || 0,
        batches: m.batches || []
      };
    });
    return Object.values(groups);
  }, [medicines]);

  // Filter medicines
  const filteredMedicines = groupedMedicines.filter((m) => {
    const matchesSearch =
      !filters.search ||
      m.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      m.code?.toLowerCase().includes(filters.search.toLowerCase()) ||
      m.genericName?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesCategory =
      !filters.category ||
      m.category?.toLowerCase() === filters.category.toLowerCase();

    // Stock Status
    let matchesStock = true;
    if (filters.stockStatus === 'low') {
      matchesStock = m.totalStock <= (m.reorderLevel || 10);
    } else if (filters.stockStatus === 'out') {
      matchesStock = m.totalStock === 0;
    }

    // Expiry Status
    let matchesExpiry = true;
    if (filters.expiryStatus === 'near_expiry') {
      matchesExpiry = m.stockFlags?.nearExpiry === true;
    }

    return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
  });

  // Pagination logic
  const totalItems = filteredMedicines.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMedicines.slice(indexOfFirstItem, indexOfLastItem);

  // Dynamic statistics from database medicines list
  const totalMedicinesCount = groupedMedicines.length;
  const totalStockValueSum = groupedMedicines.reduce((sum, m) => sum + (m.totalStock || 0) * (m.unitPrice || 0), 0);
  const lowStockCount = groupedMedicines.filter(m => (m.totalStock || 0) <= (m.reorderLevel || 10)).length;
  const nearExpiryCount = groupedMedicines.filter(m => m.stockFlags?.nearExpiry === true).length;

  const actualLowStockAlerts = groupedMedicines
    .filter(m => (m.totalStock || 0) <= (m.reorderLevel || 10))
    .slice(0, 5)
    .map(m => ({
      name: m.name,
      stock: m.totalStock || 0,
      reorder: m.reorderLevel || 10
    }));

  const clinicLowStockSummary = clinics.map(clinic => {
    const clinicMeds = medicines.filter(m => String(m.clinicId) === String(clinic._id));
    const low = clinicMeds.filter(m => (m.totalStock || 0) <= (m.reorderLevel || 10)).length;
    const near = clinicMeds.filter(m => m.stockFlags?.nearExpiry === true).length;
    return {
      name: clinic.name,
      low,
      near
    };
  });

  // Add Medicine Form Submission
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    const activeDists = distributions.filter(d => d.checked && Number(d.quantity) > 0);
    if (activeDists.length === 0) {
      alert('Please assign stock to at least one clinic.');
      return;
    }

    try {
      // Create medicine document for each clinic with its specific allocated batch quantity
      await Promise.all(activeDists.map(dist => {
        return createMedicine({
          clinicId: dist.clinicId, // Pass the target clinicId explicitly
          code: form.code || undefined,
          name: form.name.trim(),
          genericName: form.genericName || undefined,
          brandName: form.brandName || undefined,
          category: form.category || undefined,
          form: form.form || undefined,
          strength: form.strength ? `${form.strength} ${form.unit}`.trim() : undefined,
          manufacturer: form.manufacturer || undefined,
          unitPrice: Number(form.unitPriceSelling || 0),
          reorderLevel: Number(dist.reorderLevel || form.reorderLevel || 10),
          supplierLeadTimeDays: Number(form.supplierLeadTimeDays || 7),
          requiresPrescription: Boolean(form.requiresPrescription),
          isActive: Boolean(form.isActive),
          batches: form.batchNumber ? [{
            batchNumber: form.batchNumber,
            quantity: Number(dist.quantity || 0),
            expiryDate: form.expiryDate || undefined,
            purchasePrice: Number(form.batchPurchasePrice || form.purchasePrice || 0),
            sellingPrice: Number(form.batchSellingPrice || form.unitPriceSelling || 0),
          }] : []
        });
      }));

      const savedName = form.name.trim();

      toast.success('Medicine created and distributed successfully!');
      setMode('catalog');
      setStep(1);
      // Reset form
      setForm({
        code: '', name: '', genericName: '', brandName: '', category: '', form: '',
        strength: '', unit: 'mg', manufacturer: '', supplier: '', unitPriceSelling: '',
        purchasePrice: '', reorderLevel: '', supplierLeadTimeDays: 7, description: '',
        requiresPrescription: true, isActive: true, batchNumber: '', batchQuantity: '',
        mfgDate: '', expiryDate: '', batchPurchasePrice: '', batchSellingPrice: '',
        supplierInvoiceNumber: ''
      });
      
      // Auto-populate search with the newly created medicine name
      setFilters(prev => ({ ...prev, search: savedName }));
      loadMedicinesAndClinics();
    } catch (err) {
      console.error('Error during medicine distribution save:', err);
      const serverError = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Failed to save and distribute medicine. Error detail: ${serverError}`);
    }
  };

  // Helper values derived from form/mock
  const medicineName = form.name || 'Paracetamol';
  const medicineForm = form.form || 'Tablets';
  const genericName = form.genericName || 'Acetaminophen';
  const strengthStr = form.strength ? `${form.strength} ${form.unit}` : '650mg';
  const batchNum = form.batchNumber || 'PCM240601';
  const mfgDateStr = form.mfgDate || '01 Jun 2024';
  const expiryDateStr = form.expiryDate || '31 Jan 2028';
  const purchasedQty = Number(form.batchQuantity || 1000);
  const purchasePriceVal = Number(form.batchPurchasePrice || form.purchasePrice || 2.20);
  const sellingPriceVal = Number(form.unitPriceSelling || form.batchSellingPrice || 3.50);
  
  const assignedQty = distributions.reduce((sum, d) => sum + (d.checked ? Number(d.quantity || 0) : 0), 0);
  const remainingQty = Math.max(0, purchasedQty - assignedQty);

  // UI Components
  if (mode === 'add_medicine') {
    return (
      <div className="w-full min-h-screen bg-[#080e1a] text-slate-100 p-6 font-sans">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="cursor-pointer hover:text-white" onClick={() => setMode('catalog')}>Pharmacy</span>
              <span>&gt;</span>
              <span className="cursor-pointer hover:text-white" onClick={() => setStep(1)}>Add Medicine</span>
              {step >= 2 && (
                <>
                  <span>&gt;</span>
                  <span className="text-emerald-400">
                    {step === 2 
                      ? (distributionMethod === 'equal' ? 'Equal Distribution' : distributionMethod === 'ai' ? 'AI Recommendation' : 'Distribute Medicine') 
                      : 'Overview'
                    }
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-black text-white mt-1">
              {step === 1 ? 'Add Medicine' : step === 2 
                ? (distributionMethod === 'equal' ? 'Equal Distribution' : distributionMethod === 'ai' ? 'AI Recommendation' : 'Distribute Medicine')
                : 'Overview'
              }
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 1 ? 'Add a new medicine and distribute stock across clinics.' : step === 2
                ? 'Assign the purchased stock batch to one or more clinics.'
                : 'Review and confirm the medicine details and stock distribution before adding to inventory.'
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-350 text-xs font-bold transition flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={() => setMode('catalog')}
              className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold transition"
            >
              Save & Exit
            </button>
            <button
              onClick={() => {
                if (step < 3) setStep(step + 1);
                else handleSave();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              {step === 3 ? 'Confirm & Add Stock' : 'Next Step'}
              {step < 3 && <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        {/* Steps Bar */}
        <div className="flex items-center justify-center w-full mb-8 relative max-w-4xl mx-auto">
          <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-[2px] bg-slate-800 -z-10" />
          <div className="absolute left-[10%] w-[33%] top-1/2 -translate-y-1/2 h-[2px] bg-emerald-500 -z-10 transition-all"
               style={{ width: step === 1 ? '0%' : step === 2 ? '40%' : '80%' }} />

          <div className="flex justify-between w-full">
            <div className="flex flex-col items-center gap-2 bg-[#080e1a] px-4 cursor-pointer" onClick={() => setStep(1)}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {step > 1 ? <Check size={14} /> : '1'}
              </div>
              <span className="text-xs font-bold text-white">Create Medicine</span>
              <span className="text-[10px] text-slate-500">Medicine details added</span>
            </div>

            <div className="flex flex-col items-center gap-2 bg-[#080e1a] px-4 cursor-pointer" onClick={() => form.name && setStep(2)}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {step > 2 ? <Check size={14} /> : '2'}
              </div>
              <span className="text-xs font-bold text-white">Distribute Medicine</span>
              <span className="text-[10px] text-slate-500">Assign stock to clinics</span>
            </div>

            <div className="flex flex-col items-center gap-2 bg-[#080e1a] px-4 cursor-pointer" onClick={() => step === 3}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 3 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}>3</div>
              <span className="text-xs font-bold text-white">Overview</span>
              <span className="text-[10px] text-slate-500">Review & confirm</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Medicine Details & Batch Details */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            {/* Left 2 Columns */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-black">1</span>
                  Medicine Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Medicine Code *</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. MED001"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Medicine Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Enter medicine name"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Generic Name *</label>
                    <input
                      type="text"
                      value={form.genericName}
                      onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                      placeholder="Enter generic name"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Brand Name</label>
                    <input
                      type="text"
                      value={form.brandName}
                      onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                      placeholder="Enter brand name (optional)"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="">Select category</option>
                      <option value="Asthma Care">Asthma Care</option>
                      <option value="Heart Care">Heart Care</option>
                      <option value="Antibiotics">Antibiotics</option>
                      <option value="Pain Relief">Pain Relief</option>
                      <option value="Antihistamine">Antihistamine</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Form *</label>
                    <select
                      value={form.form}
                      onChange={(e) => setForm({ ...form, form: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="">Select form</option>
                      <option value="Inhaler">Inhaler</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Liquid">Liquid</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Strength *</label>
                    <input
                      type="text"
                      value={form.strength}
                      onChange={(e) => setForm({ ...form, strength: e.target.value })}
                      placeholder="e.g. 500mg, 10ml"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Unit</label>
                    <select
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="mg">mg</option>
                      <option value="ml">ml</option>
                      <option value="mcg">mcg</option>
                      <option value="%">%</option>
                    </select>
                  </div>

                   <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Manufacturer *</label>
                    <input
                      type="text"
                      value={form.manufacturer}
                      onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                      placeholder="Enter manufacturer name"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Supplier *</label>
                    <input
                      type="text"
                      value={form.supplier}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      placeholder="Enter supplier name"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Unit Price (Selling) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                      <input
                        type="number"
                        value={form.unitPriceSelling}
                        onChange={(e) => setForm({ ...form, unitPriceSelling: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Purchase Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                      <input
                        type="number"
                        value={form.purchasePrice}
                        onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Reorder Level *</label>
                    <input
                      type="number"
                      value={form.reorderLevel}
                      onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                      placeholder="Enter minimum stock level"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Supplier Lead Time (days)</label>
                    <input
                      type="number"
                      value={form.supplierLeadTimeDays}
                      onChange={(e) => setForm({ ...form, supplierLeadTimeDays: e.target.value })}
                      placeholder="Enter lead time in days"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Description</label>
                  <textarea
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 250) })}
                    placeholder="Enter medicine description (optional)"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition resize-none"
                  />
                  <div className="text-right text-[10px] text-slate-600">
                    {form.description.length} / 250
                  </div>
                </div>

                <div className="flex gap-6 border-t border-white/[0.04] pt-4">
                  <label className="flex items-center gap-2.5 text-xs text-slate-350 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiresPrescription}
                      onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })}
                      className="rounded border-white/10 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                    />
                    Requires Prescription
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-350 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="rounded border-white/10 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                    />
                    Active Medicine
                  </label>
                </div>
              </div>
            </div>

            {/* Sidebar Panels (Right 1 Column) */}
            <div className="space-y-6">
              {/* Step 2 Panel: Opening Stock Batch */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <h3 className="text-xs font-bold text-white border-b border-white/[0.06] pb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-black">2</span>
                  Opening Stock Batch
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Batch Number *</label>
                    <input
                      type="text"
                      value={form.batchNumber}
                      onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                      placeholder="e.g. B-MED001-001"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity *</label>
                    <input
                      type="number"
                      value={form.batchQuantity}
                      onChange={(e) => setForm({ ...form, batchQuantity: e.target.value })}
                      placeholder="Enter quantity"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Manufacturing Date</label>
                    <input
                      type="date"
                      value={form.mfgDate}
                      onChange={(e) => setForm({ ...form, mfgDate: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date *</label>
                    <input
                      type="date"
                      value={form.expiryDate}
                      onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Purchase Price (per unit) *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                      <input
                        type="number"
                        value={form.batchPurchasePrice}
                        onChange={(e) => setForm({ ...form, batchPurchasePrice: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-6 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Selling Price (per unit) *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                      <input
                        type="number"
                        value={form.batchSellingPrice}
                        onChange={(e) => setForm({ ...form, batchSellingPrice: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-6 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Supplier Invoice Number</label>
                    <input
                      type="text"
                      value={form.supplierInvoiceNumber}
                      onChange={(e) => setForm({ ...form, supplierInvoiceNumber: e.target.value })}
                      placeholder="Enter invoice number (optional)"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 text-[10px] leading-relaxed text-indigo-400 flex gap-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>This will be the first stock batch for the medicine. You can add more batches and distribute to clinics in the next step.</span>
                  </div>
                </div>
              </div>

              {/* Step 3 Panel: Overview checklist */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <h3 className="text-xs font-bold text-white border-b border-white/[0.06] pb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-black">3</span>
                  Overview (After Distribution)
                </h3>

                <div className="space-y-3.5 text-xs text-slate-400">
                  <p>You will be able to review the medicine and stock distribution summary here before saving.</p>

                  <div className="space-y-2 border-t border-white/[0.04] pt-3 text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${form.name ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-600'}`}>
                        {form.name && <Check size={10} />}
                      </div>
                      <span>Medicine Details (Completed: {form.name ? 'Yes' : 'No'})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${step >= 2 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-600'}`}>
                        {step >= 2 && <Check size={10} />}
                      </div>
                      <span>Stock Distribution (Completed: {step >= 2 ? 'Yes' : 'No'})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${step >= 3 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-600'}`}>
                        {step >= 3 && <Check size={10} />}
                      </div>
                      <span>Summary Overview</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Distribute Medicine */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Top Cards Row: Medicine & Batch Details (left) and Distribution Method (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Medicine & Batch Details */}
              <div className="lg:col-span-3 rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                  <Package size={14} className="text-emerald-400" />
                  Medicine & Batch Details
                </h3>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <Package size={22} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-white">{medicineName}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">{medicineForm}</span>
                    </div>
                    <p className="text-xs text-slate-400">Generic: {genericName} &nbsp;|&nbsp; Strength: {strengthStr}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-3 border-t border-white/[0.04] text-xs">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Batch Number</p>
                    <p className="font-bold text-white mt-0.5">{batchNum}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Mfg. Date</p>
                    <p className="font-bold text-white mt-0.5">{mfgDateStr}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Expiry Date</p>
                    <p className="font-bold text-white mt-0.5">{expiryDateStr}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-505 uppercase">Purchased Quantity</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="number"
                        min="1"
                        value={form.batchQuantity}
                        onChange={(e) => setForm({ ...form, batchQuantity: e.target.value })}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-emerald-400 font-bold w-20 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-500">{medicineForm}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Purchase Price (per unit)</p>
                    <p className="font-bold text-white mt-0.5">₹{purchasePriceVal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Distribution Method Selector */}
              <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                  <Layers size={14} className="text-emerald-400" />
                  Distribution Method
                </h3>
                <p className="text-[10px] text-slate-500">Choose how you want to distribute this stock.</p>

                <div className="grid grid-cols-3 gap-3">
                  {/* Manual */}
                  <button
                    onClick={() => setDistributionMethod('manual')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all ${
                      distributionMethod === 'manual'
                        ? 'border-emerald-500 bg-emerald-500/5 text-white'
                        : 'border-white/10 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[11px] font-bold">Manual Distribution</span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${distributionMethod === 'manual' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-800'}`}>
                        {distributionMethod === 'manual' && <Check size={10} />}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 leading-snug">Manually assign quantities to clinics</span>
                  </button>

                  {/* Equal */}
                  <button
                    onClick={() => setDistributionMethod('equal')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all ${
                      distributionMethod === 'equal'
                        ? 'border-emerald-500 bg-emerald-500/5 text-white'
                        : 'border-white/10 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[11px] font-bold">Equal Distribution</span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${distributionMethod === 'equal' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-800'}`}>
                        {distributionMethod === 'equal' && <Check size={10} />}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 leading-snug">Distribute equally across all clinics</span>
                  </button>

                  {/* AI Recommended */}
                  <button
                    onClick={() => setDistributionMethod('ai')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all relative ${
                      distributionMethod === 'ai'
                        ? 'border-emerald-500 bg-emerald-500/5 text-white'
                        : 'border-white/10 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        AI Recommended
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${distributionMethod === 'ai' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-800'}`}>
                        {distributionMethod === 'ai' && <Check size={10} />}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 leading-snug">Distribute based on AI demand forecast</span>
                    <span className="absolute bottom-2.5 right-2.5 bg-purple-500/20 text-purple-400 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border border-purple-500/30">AI</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Overall Margin Summary */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                <Layers size={14} className="text-indigo-400" />
                <span>Overall Margin Summary (Entire Batch)</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Total Units */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Units</p>
                  <p className="text-sm font-bold text-white">
                    {purchasedQty.toLocaleString()} {medicineForm}
                  </p>
                </div>

                {/* Avg. Purchase Price / Unit */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Avg. Purchase Price / Unit</p>
                  <p className="text-sm font-bold text-white">
                    ₹{purchasePriceVal.toFixed(2)}
                  </p>
                </div>

                {/* Avg. Selling Price / Unit */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Avg. Selling Price / Unit</p>
                  <p className="text-sm font-bold text-white">
                    ₹{sellingPriceVal.toFixed(2)}
                  </p>
                </div>

                {/* Avg. Margin / Unit */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Avg. Margin / Unit</p>
                  <p className="text-sm font-bold text-emerald-400">
                    ₹{(sellingPriceVal - purchasePriceVal).toFixed(2)}{' '}
                    <span className="text-[10px] text-emerald-550 font-semibold">
                      ({purchasePriceVal > 0 ? (((sellingPriceVal - purchasePriceVal) / purchasePriceVal) * 100).toFixed(2) : '0.00'}%)
                    </span>
                  </p>
                </div>

                {/* Total Margin (All Units) */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Margin (All Units)</p>
                  <p className="text-sm font-bold text-emerald-400">
                    ₹{((sellingPriceVal - purchasePriceVal) * purchasedQty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Total Margin % */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Margin %</p>
                  <p className="text-sm font-bold text-purple-400">
                    {purchasePriceVal > 0 ? (((sellingPriceVal - purchasePriceVal) / purchasePriceVal) * 100).toFixed(2) : '0.00'}%
                  </p>
                </div>
              </div>
            </div>

            {/* MANUAL DISTRIBUTION INTERFACE */}
            {distributionMethod === 'manual' && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.06] pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Assign Stock to Clinics</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Enter the quantity you want to assign to each clinic.</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="text-slate-400">Purchased Quantity: <strong className="text-emerald-400">{purchasedQty.toLocaleString()} {medicineForm}</strong></span>
                    <span className="text-slate-400">Assigned Quantity: <strong className="text-emerald-400">{assignedQty.toLocaleString()} {medicineForm}</strong></span>
                    <span className="text-slate-400">Remaining Quantity: <strong className={remainingQty > 0 ? 'text-amber-500' : 'text-emerald-400'}>{remainingQty.toLocaleString()} {medicineForm}</strong></span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/[0.04]">
                        <th className="py-3 w-8"></th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Clinic</th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Current Stock (Available)</th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Reorder Level</th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Assign Quantity ({medicineForm})</th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Assigned Value (Approx.)</th>
                        <th className="py-3 w-8 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributions.map((dist, idx) => {
                        const assignedValue = Number(dist.quantity || 0) * purchasePriceVal;
                        return (
                          <tr key={dist.clinicId} className={`border-b border-white/[0.03] hover:bg-white/[0.01] ${!dist.checked ? 'opacity-40' : ''}`}>
                            <td className="py-3.5">
                              <input
                                type="checkbox"
                                checked={dist.checked}
                                onChange={(e) => {
                                  const updated = [...distributions];
                                  updated[idx].checked = e.target.checked;
                                  if (!e.target.checked) updated[idx].quantity = '0';
                                  setDistributions(updated);
                                }}
                                className="rounded border-white/10 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                                  <Building2 size={14} />
                                </div>
                                <div>
                                  <p className="font-bold text-white leading-tight">{dist.clinicName}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{dist.location}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 text-slate-350">{dist.currentStock}</td>
                            <td className="py-3.5 text-slate-400">{dist.reorderLevel}</td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={dist.quantity}
                                  disabled={!dist.checked}
                                  onChange={(e) => {
                                    const updated = [...distributions];
                                    updated[idx].quantity = e.target.value;
                                    setDistributions(updated);
                                  }}
                                  className="w-24 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                                <span className="text-slate-500">{medicineForm}</span>
                              </div>
                            </td>
                            <td className="py-3.5 font-bold text-slate-200">₹{assignedValue.toFixed(2)}</td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => {
                                  const updated = [...distributions];
                                  updated[idx].quantity = '0';
                                  updated[idx].checked = false;
                                  setDistributions(updated);
                                }}
                                className="text-slate-500 hover:text-white transition"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/[0.04]">
                  <button
                    onClick={() => {
                      alert('Add clinic modal opened');
                    }}
                    className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Another Clinic
                  </button>

                  <div className="flex gap-6 text-xs text-slate-400">
                    <span>Purchased Quantity: <strong className="text-white font-bold">{purchasedQty.toLocaleString()} Tablets</strong></span>
                    <span>Assigned Quantity: <strong className="text-emerald-400 font-bold">{assignedQty.toLocaleString()} Tablets</strong></span>
                    <span>Remaining Quantity: <strong className={remainingQty > 0 ? 'text-amber-500' : 'text-emerald-400'}>{remainingQty.toLocaleString()} Tablets</strong></span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 text-xs text-indigo-400 flex gap-2">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>Stock will be added to the selected clinics as a new batch ({batchNum}). You can manage and transfer stock later from the inventory section.</span>
                </div>
              </div>
            )}

            {/* EQUAL DISTRIBUTION INTERFACE */}
            {distributionMethod === 'equal' && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Equal Distribution Preview</h3>
                    <p className="text-xs text-slate-400 mt-0.5">The stock will be distributed equally to all active clinics.</p>
                  </div>
                  
                  <div className="flex gap-6 text-xs text-slate-400 bg-slate-900/50 border border-white/5 px-4 py-2 rounded-xl">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase leading-none">Total Clinics</p>
                      <p className="text-sm font-bold text-white mt-1.5">{distributions.filter(d => d.checked).length}</p>
                    </div>
                    <div className="w-[1px] bg-white/10" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase leading-none">Purchased Quantity</p>
                      <p className="text-sm font-bold text-white mt-1.5">{purchasedQty.toLocaleString()} {medicineForm}</p>
                    </div>
                    <div className="w-[1px] bg-white/10" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase leading-none">Quantity Per Clinic</p>
                      <p className="text-sm font-bold text-blue-400 mt-1.5">
                        {Math.floor(purchasedQty / (distributions.filter(d => d.checked).length || 1)).toLocaleString()} {medicineForm}
                      </p>
                    </div>
                    <div className="w-[1px] bg-white/10" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase leading-none">Remaining Quantity</p>
                      <p className="text-sm font-bold text-emerald-400 mt-1.5">{remainingQty.toLocaleString()} {medicineForm}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/[0.04]">
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Clinic</th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Location</th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Current Stock (Available)</th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-emerald-400">Will Receive</th>
                        <th className="py-3 font-bold uppercase tracking-wider text-[10px]">After Distribution (Estimated)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributions.filter(d => d.checked).map((dist) => {
                        const willReceive = Math.floor(purchasedQty / (distributions.filter(d => d.checked).length || 1));
                        const afterDist = dist.currentStock + willReceive;
                        return (
                          <tr key={dist.clinicId} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                                  <Building2 size={14} />
                                </div>
                                <span className="font-bold text-white">{dist.clinicName}</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-slate-400">{dist.location}</td>
                            <td className="py-3.5 text-slate-350">{dist.currentStock} Tablets</td>
                            <td className="py-3.5 text-emerald-400 font-bold">{willReceive.toLocaleString()} Tablets</td>
                            <td className="py-3.5 text-slate-200 font-bold">{afterDist.toLocaleString()} Tablets</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 text-xs text-indigo-400 flex gap-2">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>After confirmation, the batch ({batchNum}) will be created in each clinic with {Math.floor(purchasedQty / (distributions.filter(d => d.checked).length || 1))} Tablets.</span>
                </div>
              </div>
            )}

            {/* AI RECOMMENDATION INTERFACE */}
            {distributionMethod === 'ai' && (
              <div className="space-y-6">
                {/* AI Recommendation Summary */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-4">
                  <h3 className="text-xs font-bold text-white border-b border-white/[0.06] pb-2 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-400" />
                    AI Recommendation Summary
                  </h3>
                  <p className="text-xs text-slate-400">Based on demand forecast and current inventory status.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">High Demand Clinics</p>
                        <p className="text-lg font-bold text-white mt-1">2</p>
                        <p className="text-[9px] text-slate-500 mt-1">Clinics with high predicted demand</p>
                      </div>
                      <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Activity size={14} />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Moderate Demand Clinics</p>
                        <p className="text-lg font-bold text-white mt-1">2</p>
                        <p className="text-[9px] text-slate-500 mt-1">Clinics with moderate demand</p>
                      </div>
                      <div className="w-7 h-7 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <Activity size={14} />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Low Demand Clinics</p>
                        <p className="text-lg font-bold text-white mt-1">1</p>
                        <p className="text-[9px] text-slate-500 mt-1">Clinics with low predicted demand</p>
                      </div>
                      <div className="w-7 h-7 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Activity size={14} />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Recommended</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">{purchasedQty.toLocaleString()} Tablets</p>
                        <p className="text-[9px] text-slate-500 mt-1">100% of purchased quantity</p>
                      </div>
                      <div className="w-7 h-7 rounded bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <Package size={14} />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">AI Confidence Score</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">92%</p>
                        <p className="text-[9px] text-emerald-400 mt-1 font-bold">High accuracy based on data</p>
                      </div>
                      <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Star size={14} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommended Distribution Table */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">Recommended Distribution</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Review AI recommended distribution. You can adjust quantities if needed.</p>
                    </div>
                    <button className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition">
                      <RefreshCw size={12} /> Regenerate Recommendation
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-white/[0.04]">
                          <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Clinic</th>
                          <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Location</th>
                          <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Current Stock (Available)</th>
                          <th className="py-3 font-bold uppercase tracking-wider text-[10px]">AI Demand Forecast (Next 30 Days)</th>
                          <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-purple-400">Recommended Quantity</th>
                          <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Percentage</th>
                          <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-emerald-400">Estimated After Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: 'c1', name: 'Apollo Clinic - Indiranagar', loc: 'Indiranagar', stock: 120, forecast: 'High', demandText: '320 Tablets', recommended: 320, percent: 32, progressColor: 'bg-purple-500', target: 440 },
                          { id: 'c2', name: 'Apollo Clinic - Whitefield', loc: 'Whitefield', stock: 80, forecast: 'High', demandText: '280 Tablets', recommended: 280, percent: 28, progressColor: 'bg-purple-500', target: 360 },
                          { id: 'c3', name: 'Apollo Clinic - HSR Layout', loc: 'HSR Layout', stock: 50, forecast: 'Moderate', demandText: '200 Tablets', recommended: 200, percent: 20, progressColor: 'bg-purple-500', target: 250 },
                          { id: 'c4', name: 'Apollo Clinic - Koramangala', loc: 'Koramangala', stock: 20, forecast: 'Moderate', demandText: '150 Tablets', recommended: 150, percent: 15, progressColor: 'bg-purple-500', target: 170 },
                          { id: 'c5', name: 'Apollo Clinic - Jayanagar', loc: 'Jayanagar', stock: 40, forecast: 'Low', demandText: '70 Tablets', recommended: 50, percent: 5, progressColor: 'bg-purple-500', target: 90 },
                        ].map((aiDist) => (
                          <tr key={aiDist.id} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                                  <Building2 size={14} />
                                </div>
                                <span className="font-bold text-white">{aiDist.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-slate-400">{aiDist.loc}</td>
                            <td className="py-3.5 text-slate-350">{aiDist.stock} Tablets</td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                aiDist.forecast === 'High' ? 'bg-rose-500/10 text-rose-400' : aiDist.forecast === 'Moderate' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                              }`}>{aiDist.forecast}</span>
                              <span className="text-[10px] text-slate-500 ml-1.5">{aiDist.demandText}</span>
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-1 text-purple-400 font-bold">
                                <span>{aiDist.recommended}</span>
                                <span className="text-[10px] text-slate-500">Tablets</span>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${aiDist.percent}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-400">{aiDist.percent}%</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-emerald-400 font-bold">{aiDist.target} Tablets</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3.5 rounded-xl border border-purple-500/15 bg-purple-500/5 text-xs text-purple-350 flex gap-2.5 items-start">
                    <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-purple-300">AI Insight</p>
                      <p className="mt-0.5 text-slate-400 leading-relaxed text-[11px]">Demand for {medicineName} is expected to increase by 18% in the upcoming month due to seasonal trends and recent patient history.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Overview */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Top Row Grid: Medicine & Batch Details (left) and Distribution Summary (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Medicine & Batch Details */}
              <div className="lg:col-span-3 rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                  <Package size={14} className="text-emerald-400" />
                  Medicine & Batch Details
                </h3>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <Package size={22} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-white">{medicineName}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">{medicineForm}</span>
                    </div>
                    <p className="text-xs text-slate-400">Generic: {genericName} &nbsp;|&nbsp; Strength: {strengthStr}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-3 border-t border-white/[0.04] text-xs">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Batch Number</p>
                    <p className="font-bold text-white mt-0.5">{batchNum}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Mfg. Date</p>
                    <p className="font-bold text-white mt-0.5">{mfgDateStr}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Expiry Date</p>
                    <p className="font-bold text-white mt-0.5">{expiryDateStr}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Purchased Quantity</p>
                    <p className="font-bold text-emerald-400 mt-0.5">{purchasedQty.toLocaleString()} {medicineForm}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Purchase Price (per unit)</p>
                    <p className="font-bold text-white mt-0.5">₹{purchasePriceVal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Distribution Summary */}
              <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                  <Layers size={14} className="text-emerald-400" />
                  Distribution Summary
                </h3>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Clinics</p>
                    <p className="text-sm font-bold text-white">{distributions.filter(d => d.checked).length} selected</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Purchased Quantity</p>
                    <p className="text-sm font-bold text-white">{purchasedQty.toLocaleString()} Tablets</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Assigned</p>
                    <p className="text-sm font-bold text-purple-400">{assignedQty.toLocaleString()} Tablets</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Remaining Quantity</p>
                    <p className="text-sm font-bold text-emerald-400">{remainingQty.toLocaleString()} Tablets</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 text-[10px] text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle size={14} />
                  <span>All purchased stock has been successfully assigned.</span>
                </div>
              </div>
            </div>

            {/* Stock Distribution Table */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-white/[0.06] pb-2">Stock Distribution to Clinics</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-white/[0.04]">
                      <th className="py-3 w-12 font-bold uppercase tracking-wider text-[10px]">#</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Clinic</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Location</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Current Stock (Available)</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Reorder Level</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-emerald-400">Assigned Quantity (Tablets)</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-right">Estimated Value (Approx.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.filter(d => d.checked).map((dist, idx) => {
                      const qty = Number(dist.quantity || 0);
                      const estimatedVal = qty * purchasePriceVal;
                      return (
                        <tr key={dist.clinicId} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                          <td className="py-3.5 text-slate-500">{idx + 1}</td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                                <Building2 size={14} />
                              </div>
                              <span className="font-bold text-white">{dist.clinicName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-slate-400">{dist.location.split(',')[0]}</td>
                          <td className="py-3.5 text-slate-350">{dist.currentStock} Tablets</td>
                          <td className="py-3.5 text-slate-450">{dist.reorderLevel}</td>
                          <td className="py-3.5 text-emerald-400 font-bold">{qty.toLocaleString()} Tablets</td>
                          <td className="py-3.5 text-right font-bold text-slate-200">₹{estimatedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-900/40 font-bold border-t border-white/10 text-white">
                      <td className="py-3 px-2" colSpan="3">Total</td>
                      <td className="py-3">310 Tablets</td>
                      <td className="py-3"></td>
                      <td className="py-3 text-emerald-400">{assignedQty.toLocaleString()} Tablets</td>
                      <td className="py-3 text-right">₹{(assignedQty * purchasePriceVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Row Panel: What happens next? and Important Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* What happens next? */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                <h3 className="text-xs font-bold text-white border-b border-white/[0.06] pb-2 flex items-center gap-2">
                  <HelpCircle size={14} className="text-blue-400" />
                  What happens next?
                </h3>
                
                <ul className="space-y-2.5 text-xs text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                    <span>A new batch ({batchNum}) will be created in each selected clinic.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                    <span>The assigned stock will be available in the pharmacy inventory immediately.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                    <span>You can manage and transfer stock between clinics from the inventory section.</span>
                  </li>
                </ul>
              </div>

              {/* Important Notes */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white border-b border-white/[0.06] pb-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    Important Notes
                  </h3>
                  
                  <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside">
                    <li>This stock distribution will be recorded as a new batch in each clinic.</li>
                    <li>You can view batch details and history from the inventory section.</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl mt-2">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Estimated Value</p>
                    <p className="text-xl font-extrabold text-white mt-1">₹{(assignedQty * purchasePriceVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Layers size={18} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'reports') {
    // Dynamic allocations calculations for reports table
    const filteredReportMeds = groupedMedicines.filter(m => {
      const matchesSearch = !reportSearch || 
        m.name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        m.code?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        m.genericName?.toLowerCase().includes(reportSearch.toLowerCase());
      const matchesCategory = !reportCategory || m.category?.toLowerCase() === reportCategory.toLowerCase();
      const matchesClinic = !reportClinicId || !!m.clinicStocks[String(reportClinicId)];
      
      let matchesStock = true;
      if (reportStockStatus === 'low') {
        matchesStock = m.totalStock <= (m.reorderLevel || 10);
      } else if (reportStockStatus === 'out') {
        matchesStock = m.totalStock === 0;
      }
      return matchesSearch && matchesCategory && matchesClinic && matchesStock;
    });

    const totalAllocatedStock = groupedMedicines.reduce((sum, m) => sum + (m.totalStock || 0), 0);
    const totalAvailableStock = groupedMedicines.reduce((sum, m) => {
      // Available stock is non-expired batches sum
      return sum + (m.batches || []).reduce((bSum, b) => bSum + (Number(b.quantity) || 0), 0);
    }, 0);

    const adequateCount = groupedMedicines.filter(m => m.totalStock > (m.reorderLevel || 10)).length;
    const outOfStockCount = groupedMedicines.filter(m => m.totalStock === 0).length;
    const lowCount = groupedMedicines.filter(m => m.totalStock > 0 && m.totalStock <= (m.reorderLevel || 10)).length;

    const adequatePercent = totalMedicinesCount > 0 ? ((adequateCount / totalMedicinesCount) * 100).toFixed(1) : '0';
    const lowPercent = totalMedicinesCount > 0 ? ((lowCount / totalMedicinesCount) * 100).toFixed(1) : '0';
    const outPercent = totalMedicinesCount > 0 ? ((outOfStockCount / totalMedicinesCount) * 100).toFixed(1) : '0';

    return (
      <div className="w-full min-h-screen bg-[#080e1a] text-slate-100 p-6 font-sans">
        {/* Header Path */}
        <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="cursor-pointer hover:text-white" onClick={() => { setMode('catalog'); setSelectedReportMedicineName(''); }}>Pharmacy</span>
              <span>&gt;</span>
              <span>Reports</span>
              <span>&gt;</span>
              <span className="text-emerald-400">Medicine Stock Analysis</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">Medicine Stock Analysis</h1>
            <p className="text-xs text-slate-400 mt-0.5">Complete overview of medicine stock allocation and availability across all clinics.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-350">
              <Calendar size={14} className="text-slate-500" />
              <span>20 May 2025 - 19 Jun 2025</span>
            </div>
            <button
              onClick={() => alert('Exporting PDF/Excel report...')}
              className="px-4 py-2 bg-slate-900 border border-white/10 hover:bg-white/5 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
            >
              <FileText size={14} /> Export Report
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Medicines</span>
              <p className="text-2xl font-extrabold text-white">{totalMedicinesCount}</p>
              <p className="text-[10px] text-slate-500">Active medicines</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Package size={16} /></div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Clinics</span>
              <p className="text-2xl font-extrabold text-white">{clinics.length}</p>
              <p className="text-[10px] text-slate-500">Clinics receiving stock</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><Building2 size={16} /></div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Allocated Stock</span>
              <p className="text-2xl font-extrabold text-white">{totalAllocatedStock.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Units allocated</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Layers size={16} /></div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Available Stock</span>
              <p className="text-2xl font-extrabold text-white">{totalAvailableStock.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Units in hand</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400"><CheckCircle2 size={16} /></div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Low Stock Items</span>
              <p className="text-2xl font-extrabold text-white">{lowStockCount}</p>
              <p className="text-[10px] text-rose-400">Require attention</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400"><AlertTriangle size={16} /></div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="relative min-w-[200px] flex-1">
              <input
                type="text"
                placeholder="Search Medicine..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>

            <select
              value={reportCategory}
              onChange={(e) => setReportCategory(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Asthma Care">Asthma Care</option>
              <option value="Heart Care">Heart Care</option>
              <option value="Antibiotics">Antibiotics</option>
              <option value="Pain Relief">Pain Relief</option>
              <option value="Antihistamine">Antihistamine</option>
            </select>

            <select
              value={reportClinicId}
              onChange={(e) => setReportClinicId(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Clinics</option>
              {clinics.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={reportStockStatus}
              onChange={(e) => setReportStockStatus(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setReportSearch('');
                setReportCategory('');
                setReportClinicId('');
                setReportStockStatus('all');
              }}
              className="px-3 py-2 text-slate-400 hover:text-white text-xs font-bold transition"
            >
              Clear Filters
            </button>
            <button
              onClick={() => loadMedicinesAndClinics()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Allocation Grid Table */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] overflow-x-auto mb-6">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Medicine Stock Allocation by Clinic</h2>
              <p className="text-xs text-slate-500 mt-0.5">Overview of allocated vs available stock for each medicine across all clinics.</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" /> Adequate Stock</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" /> Low Stock</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/40" /> Out of Stock</span>
            </div>
          </div>

          <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="text-slate-500 border-b border-white/[0.04] bg-[#07101e]">
                <th className="p-4 font-bold uppercase tracking-wider text-[10px] w-64">Medicine Details</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center w-36">Total Allocated (All Clinics)</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center w-36">Total Available (All Clinics)</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center w-36">Overall Stock Status</th>
                
                {/* Dynamically render clinic columns */}
                {clinics.map(clinic => (
                  <th key={clinic._id} className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">{clinic.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReportMeds.length > 0 ? (
                // Group report by medicine name/code so we show each medicine as one row
                // To keep it simple and correct, we map the medicines
                filteredReportMeds.map(med => {
                  const isLow = med.totalStock <= (med.reorderLevel || 10);
                  const isOut = med.totalStock === 0;
                  const overallStatus = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Adequate';
                  const statusBg = isOut ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' 
                                  : isLow ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10';

                  return (
                    <tr key={med._id} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                      <td className="p-4 font-semibold text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                            <Package size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-white leading-tight">{med.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{med.genericName} &nbsp;|&nbsp; {med.form}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <p className="font-bold text-white">{med.totalStock}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Units Allocated</p>
                      </td>
                      <td className="p-4 text-center">
                        <p className="font-bold text-emerald-400">{med.totalStock}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Units Available</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${statusBg}`}>
                          {overallStatus}
                        </span>
                      </td>

                      {/* Render clinic specific allocation details */}
                      {clinics.map(clinic => {
                        const clinicStockInfo = med.clinicStocks[String(clinic._id)];
                        const qty = clinicStockInfo ? clinicStockInfo.totalStock : 0;
                        const available = clinicStockInfo ? clinicStockInfo.totalStock : 0;
                        
                        return (
                          <td key={clinic._id} className="p-4 text-center border-l border-white/[0.02]">
                            {clinicStockInfo ? (
                              <div className="space-y-1 text-[11px]">
                                <p className="text-slate-400">Allocated: <strong className="text-white font-black">{qty}</strong></p>
                                <p className="text-slate-500">Available: <strong className="text-emerald-400 font-bold">{available}</strong></p>
                              </div>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4 + clinics.length} className="p-8 text-center text-slate-500">No medicines found matching filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Stock Summary by Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Adequate Stock</span>
              <p className="text-2xl font-extrabold text-white mt-1">{adequateCount}</p>
              <p className="text-[10px] text-slate-500">Medicines</p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">{adequatePercent}%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Low Stock</span>
              <p className="text-2xl font-extrabold text-white mt-1">{lowCount}</p>
              <p className="text-[10px] text-slate-500">Medicines</p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400">{lowPercent}%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Out of Stock</span>
              <p className="text-2xl font-extrabold text-white mt-1">{outOfStockCount}</p>
              <p className="text-[10px] text-slate-500">Medicines</p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400">{outPercent}%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
              <p className="text-2xl font-extrabold text-white mt-1">{totalMedicinesCount}</p>
              <p className="text-[10px] text-slate-500">Medicines registered</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show beautiful catalog Dashboard View
  return (
    <div className="w-full min-h-screen bg-[#080e1a] text-slate-100 p-6 font-sans">
      {/* Header and Date */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06] mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Pharmacy</h1>
          <p className="text-xs text-slate-400 mt-1">Manage medicine catalog, stock, and dispensing across all clinics.</p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300">
            <Calendar size={14} className="text-slate-500" />
            <span>30 May 2025</span>
          </div>
        </div>
      </div>

      {/* Stats Cards Row (5 columns grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Medicines */}
        <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Medicines</span>
            <p className="text-2xl font-extrabold text-white">{totalMedicinesCount}</p>
            <p className="text-[10px] text-slate-500">In central catalog</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Package size={16} />
          </div>
        </div>

        {/* Total Stock Value */}
        <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Stock Value</span>
            <p className="text-2xl font-extrabold text-white">₹{totalStockValueSum.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Across all clinics</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Layers size={16} />
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Low Stock Items</span>
            <p className="text-2xl font-extrabold text-white">{lowStockCount}</p>
            <p className="text-[10px] text-amber-500">Reorder recommended</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <AlertTriangle size={16} />
          </div>
        </div>

        {/* Near Expiry Items */}
        <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Near Expiry Items</span>
            <p className="text-2xl font-extrabold text-white">{nearExpiryCount}</p>
            <p className="text-[10px] text-rose-400">Within 30 days</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
            <AlertCircle size={16} />
          </div>
        </div>

        {/* Total Dispensings Today */}
        <div className="p-4 rounded-2xl bg-[#060d18] border border-white/[0.06] flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Dispensings Today</span>
            <p className="text-2xl font-extrabold text-white">0</p>
            <p className="text-[10px] text-slate-500">No data available</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
            <Activity size={16} />
          </div>
        </div>
      </div>

      {/* Middle Row (Low Stock Alerts & Which Clinics Have Low Medicines) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              Low Stock Alerts
            </h3>
            <button className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider">View all</button>
          </div>

          <div className="space-y-3">
            {actualLowStockAlerts.length > 0 ? (
              actualLowStockAlerts.map((alertItem, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.04] rounded-xl text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-slate-200">{alertItem.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500">Stock: <strong className="text-white font-bold">{alertItem.stock}</strong></span>
                    <span className="text-slate-500">Reorder level: <strong className="text-white font-bold">{alertItem.reorder}</strong></span>
                    <button className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[10px] font-bold transition">
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No low stock items detected.</p>
            )}
          </div>
          <p className="text-[10px] font-bold text-amber-500">Total low stock items: {lowStockCount}</p>
        </div>

        {/* Which Clinics Have Low Medicines? */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Building2 size={14} className="text-emerald-400" />
              Which Clinics Have Low Medicines?
            </h3>
            <button className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider">View all</button>
          </div>

          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="text-slate-500 border-b border-white/[0.04]">
                <th className="py-2 font-bold uppercase tracking-wider text-[10px]">Clinic Name</th>
                <th className="py-2 font-bold uppercase tracking-wider text-[10px]">Low Stock Items</th>
                <th className="py-2 font-bold uppercase tracking-wider text-[10px]">Near Expiry Items</th>
                <th className="py-2 font-bold uppercase tracking-wider text-[10px] text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {clinicLowStockSummary.length > 0 ? (
                clinicLowStockSummary.map((cRow, idx) => (
                  <tr key={idx} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01]">
                    <td className="py-3 font-semibold text-slate-200">{cRow.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cRow.low > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>{cRow.low}</span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cRow.near > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>{cRow.near}</span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[10px] font-bold transition">
                        View Clinic
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">No clinics registered under this organization.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-slate-550">Total clinics: {clinics.length}</span>
            <span className="font-bold text-rose-400 flex items-center gap-1">
              {clinicLowStockSummary.filter(c => c.low > 0 || c.near > 0).length} clinics need attention <AlertCircle size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* Search, Filter and Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name, code, or generic name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="">All Categories</option>
            <option value="Asthma Care">Asthma Care</option>
            <option value="Heart Care">Heart Care</option>
            <option value="Antibiotics">Antibiotics</option>
            <option value="Pain Relief">Pain Relief</option>
            <option value="Antihistamine">Antihistamine</option>
          </select>

          <select
            value={filters.stockStatus}
            onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="all">All Stock Status</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <select
            value={filters.expiryStatus}
            onChange={(e) => setFilters({ ...filters, expiryStatus: e.target.value })}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="all">All Expiry Status</option>
            <option value="near_expiry">Near Expiry</option>
          </select>
        </div>

        <button
          onClick={() => setMode('add_medicine')}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Add Medicine
        </button>
      </div>

      {/* Medicines Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="text-slate-500 border-b border-white/[0.04] bg-[#07101e]">
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Medicine</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Code</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Category</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Form</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Strength</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Stock</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Reorder Level</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Expiry Status</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Unit Price</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((med) => {
                const stockVal = med.totalStock ?? 0;
                const reorderVal = med.reorderLevel ?? 10;
                const isLow = stockVal <= reorderVal;
                const isNearExpiry = med.stockFlags?.nearExpiry || false;

                return (
                  <tr key={med._id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                    <td className="p-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <Package size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-white leading-tight">{med.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{med.genericName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{med.code || 'N/A'}</td>
                    <td className="p-4">
                      {med.category && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/10">
                          {med.category}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-350">{med.form || 'N/A'}</td>
                    <td className="p-4 text-slate-350">{med.strength || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`font-bold text-sm ${
                        stockVal === 0 ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-emerald-400'
                      }`}>
                        {stockVal}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{reorderVal}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isNearExpiry ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {isNearExpiry ? 'Near Expiry' : 'Good'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-200">₹{Number(med.unitPrice || 0).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/pharmacy/medicines/${med._id}`} className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all text-slate-300" title="View Details">
                          <Eye size={12} />
                        </Link>
                        
                        <div className="relative group/menu inline-block">
                          <button className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all text-slate-300">
                            <MoreVertical size={12} />
                          </button>
                          
                          {/* Circular More Actions Menu */}
                          <div className="absolute right-0 bottom-full mb-2 bg-[#09111e] border border-white/10 rounded-full shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-50 px-2 py-1.5 flex items-center gap-2">
                            <button onClick={() => alert('Edit selected')} title="Edit" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition-all">
                              <Edit2 size={10} />
                            </button>
                            <button onClick={() => alert('Disable selected')} title="Disable" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center transition-all">
                              <Ban size={10} />
                            </button>
                            <button onClick={() => alert('Transfer selected')} title="Transfer" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-all">
                              <RefreshCw size={10} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReportMedicineName(med.name);
                                setMode('reports');
                              }}
                              title="Reports"
                              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-purple-600 text-white flex items-center justify-center transition-all"
                            >
                              <BarChart2 size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <div className="w-12 h-12 rounded-full bg-slate-900/60 border border-white/5 flex items-center justify-center text-slate-400">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">No medicines found</p>
                      <p className="text-xs text-slate-500 mt-1">There are no medicines added to this clinic's inventory yet.</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <p className="text-xs text-slate-500">
          Showing {totalItems > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} medicines
        </p>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-white/5 transition text-slate-400"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const isActive = currentPage === pageNum;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 border border-white/10 hover:bg-white/5 text-slate-400'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-white/5 transition text-slate-400"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicineCatalogPage;
