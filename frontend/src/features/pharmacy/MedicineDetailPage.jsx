// src/features/pharmacy/MedicineDetailPage.jsx
import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import useAuth from '../../hooks/useAuth';
import { addMedicineBatch, getMedicine, getMedicineForecast, updateMedicine, listMedicines, createMedicine } from './pharmacyApi';
import { clinicApi } from '../../lib/api';
import {
  ArrowLeft, Edit3, MoreHorizontal, Check, AlertTriangle, Info,
  DollarSign, Calendar, Shield, Package, Layers, Activity, FileText, Plus, Edit, Trash2, X, ChevronRight, ChevronLeft, Sparkles, Building2, CheckCircle
} from 'lucide-react';

const MedicineDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [medicine, setMedicine] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Add batch modal/form state
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [batchStep, setBatchStep] = useState(1);
  const [newBatch, setNewBatch] = useState({
    batchNumber: '',
    quantity: '',
    expiryDate: '',
    purchasePrice: '',
    sellingPrice: '',
    supplier: 'ABC Pharma Distributors',
    mfgDate: '',
    reorderLevel: 10,
    notes: ''
  });
  const [distributionMethod, setDistributionMethod] = useState('manual');
  const [distributions, setDistributions] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [allOrgMedicines, setAllOrgMedicines] = useState([]);
  const [batchSaving, setBatchSaving] = useState(false);

  // Edit medicine states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    genericName: '',
    brandName: '',
    category: '',
    form: '',
    strength: '',
    manufacturer: '',
    unitPrice: 0,
    reorderLevel: 10,
    supplierLeadTimeDays: 7,
    isActive: true,
    requiresPrescription: false
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [medRes, forecastRes] = await Promise.all([
        getMedicine(id),
        getMedicineForecast(id).catch(() => ({ data: { forecast: null } }))
      ]);
      
      const med = medRes.data?.medicine;
      if (!med) {
        toast.error('Medicine details not found.');
        navigate('/pharmacy/medicines');
        return;
      }
      
      setMedicine(med);
      setEditForm({
        name: med.name || '',
        genericName: med.genericName || '',
        brandName: med.brandName || '',
        category: med.category || '',
        form: med.form || '',
        strength: med.strength || '',
        manufacturer: med.manufacturer || '',
        unitPrice: med.unitPrice || 0,
        reorderLevel: med.reorderLevel || 10,
        supplierLeadTimeDays: med.supplierLeadTimeDays || 7,
        isActive: med.isActive !== false,
        requiresPrescription: med.requiresPrescription === true
      });
      
      if (forecastRes.data?.forecast) {
        setForecast(forecastRes.data.forecast);
      }

      if (user?.organizationId) {
        const [clinicsRes, allMedsRes] = await Promise.all([
          clinicApi.list().catch(() => ({ data: { clinics: [] } })),
          listMedicines({ limit: 100, allClinics: true }).catch(() => ({ data: { medicines: [] } }))
        ]);
        const orgId = user.organizationId;
        const rawClinics = clinicsRes.data?.clinics || [];
        const orgClinics = rawClinics.filter(c => String(c.organizationId) === String(orgId));
        setClinics(orgClinics);
        setAllOrgMedicines(allMedsRes.data?.medicines || allMedsRes.medicines || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load medicine details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (isAddBatchOpen && clinics.length > 0 && medicine) {
      const initialDists = clinics.map((c, idx) => {
        const matchingMed = allOrgMedicines.find(
          m => String(m.clinicId) === String(c._id) && (m.code === medicine.code || m.name?.toLowerCase() === medicine.name?.toLowerCase())
        );
        return {
          clinicId: c._id,
          clinicName: c.name,
          currentStock: matchingMed ? (matchingMed.totalStock || 0) : 0,
          reorderLevel: matchingMed ? (matchingMed.reorderLevel || 10) : 10,
          quantity: idx === 0 ? String(newBatch.quantity || 500) : '0',
          location: c.address?.city || 'India',
          checked: idx === 0
        };
      });
      setDistributions(initialDists);
    }
  }, [isAddBatchOpen, clinics, medicine, allOrgMedicines]);

  // Sync Equal Distribution quantities when quantity or active list changes
  useEffect(() => {
    if (distributionMethod === 'equal') {
      const activeClinics = distributions.filter(d => d.checked);
      const totalQuantity = Number(newBatch.quantity || 1000);
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
      const totalQuantity = Number(newBatch.quantity || 1000);
      const ratios = { c1: 0.32, c2: 0.28, c3: 0.20, c4: 0.15, c5: 0.05 };
      const updated = distributions.map((d, index) => {
        const key = `c${(index % 5) + 1}`;
        return {
          ...d,
          quantity: d.checked ? String(Math.floor(totalQuantity * (ratios[key] || 0.20))) : '0'
        };
      });
      setDistributions(updated);
    }
  }, [distributionMethod, newBatch.quantity]);

  // Handle Edit Save
  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateMedicine(id, editForm);
      setMedicine(res.data.medicine);
      setIsEditMode(false);
      toast.success('Medicine updated successfully!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update medicine');
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Batch Save (Distributed to selected clinics)
  const handleAddBatchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newBatch.batchNumber || !newBatch.quantity) {
      toast.error('Batch number and quantity are required.');
      return;
    }

    const activeDists = distributions.filter(d => d.checked && Number(d.quantity) > 0);
    if (activeDists.length === 0) {
      toast.error('Please assign stock to at least one clinic.');
      return;
    }

    setBatchSaving(true);
    try {
      // Loop over the selected clinic allocations
      await Promise.all(activeDists.map(async (dist) => {
        // Find existing medicine document in this clinic
        let matchingMed = allOrgMedicines.find(
          m => String(m.clinicId) === String(dist.clinicId) && (m.code === medicine.code || m.name?.toLowerCase() === medicine.name?.toLowerCase())
        );

        let targetMedicineId = matchingMed?._id;

        // If it doesn't exist, create the medicine document in that clinic first!
        if (!targetMedicineId) {
          const createRes = await createMedicine({
            clinicId: dist.clinicId,
            code: medicine.code || undefined,
            name: medicine.name.trim(),
            genericName: medicine.genericName || undefined,
            brandName: medicine.brandName || undefined,
            category: medicine.category || undefined,
            form: medicine.form || undefined,
            strength: medicine.strength || undefined,
            manufacturer: medicine.manufacturer || undefined,
            unitPrice: Number(medicine.unitPrice || 0),
            reorderLevel: Number(dist.reorderLevel || medicine.reorderLevel || 10),
            supplierLeadTimeDays: Number(medicine.supplierLeadTimeDays || 7),
            requiresPrescription: Boolean(medicine.requiresPrescription),
            isActive: Boolean(medicine.isActive),
            batches: [] // Created empty first
          });
          targetMedicineId = createRes.data?.medicine?._id || createRes.medicine?._id;
        }

        // Add the batch to that clinic's medicine document
        return addMedicineBatch(targetMedicineId, {
          batchNumber: newBatch.batchNumber,
          quantity: Number(dist.quantity),
          expiryDate: newBatch.expiryDate || undefined,
          purchasePrice: Number(newBatch.purchasePrice || 0),
          sellingPrice: Number(newBatch.sellingPrice || 0),
          supplier: newBatch.supplier
        });
      }));

      toast.success('Stock batch added and distributed successfully!');
      setIsAddBatchOpen(false);
      setBatchStep(1);
      setNewBatch({
        batchNumber: '',
        quantity: '',
        expiryDate: '',
        purchasePrice: '',
        sellingPrice: '',
        supplier: 'ABC Pharma Distributors',
        mfgDate: '',
        reorderLevel: 10,
        notes: ''
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to distribute batch');
    } finally {
      setBatchSaving(false);
    }
  };

  // Dynamic content logic based on medicine name
  const drugDetails = useMemo(() => {
    const nameLower = (medicine?.name || '').toLowerCase();
    
    if (nameLower.includes('albuterol')) {
      return {
        whatIsIt: 'Albuterol Sulfate is a bronchodilator medication used to prevent and treat bronchospasm in patients with reversible obstructive airway disease such as asthma and chronic obstructive pulmonary disease (COPD). It works by relaxing the muscles in the airways and increasing airflow to the lungs.',
        uses: [
          'Relief of bronchospasm in asthma',
          'Treatment of reversible obstructive airway disease (COPD)',
          'Prevention of exercise-induced bronchospasm'
        ],
        howItWorks: 'Albuterol belongs to a class of drugs called short-acting beta-agonists (SABAs). It stimulates beta-2 receptors in the airway smooth muscles, causing them to relax and open up the airways.',
        dosage: [
          'Use as directed by the physician.',
          'Inhale using the provided inhaler.',
          'Do not exceed the recommended dose.',
          'Rinse mouth after use to reduce risk of oral thrush.'
        ],
        sideEffects: [
          'Tremors',
          'Headache',
          'Nervousness',
          'Rapid heartbeat',
          'Throat irritation'
        ],
        warning: 'This is a prescription medicine. Take only as directed by your physician.'
      };
    }

    if (nameLower.includes('paracetamol') || nameLower.includes('acetaminophen')) {
      return {
        whatIsIt: 'Paracetamol (Acetaminophen) is a widely used pain reliever (analgesic) and fever reducer (antipyretic). It is commonly used to treat mild to moderate pain, including headaches, muscle aches, backaches, toothaches, and colds.',
        uses: [
          'Relief of mild to moderate pain',
          'Reduction of fever in adults and children',
          'Management of headache and tension states'
        ],
        howItWorks: 'Paracetamol works by inhibiting prostaglandins in the central nervous system, thereby elevating the pain threshold and acting on the hypothalamic heat-regulating center.',
        dosage: [
          'Take with or after food.',
          'Do not exceed 4g (4000mg) in 24 hours.',
          'Keep a minimum gap of 4-6 hours between doses.'
        ],
        sideEffects: [
          'Nausea',
          'Allergic skin reactions (rare)',
          'Liver issues in case of overdose'
        ],
        warning: 'Do not take with other paracetamol-containing medications to avoid accidental overdose.'
      };
    }

    // Default template for any medicine
    return {
      whatIsIt: `${medicine?.name || 'This medicine'} is used for clinical therapeutics under professional supervision. Refer to your treating physician for specific diagnostic guidelines.`,
      uses: [
        `Management of indications aligned with ${medicine?.category || 'general medicine'}`,
        'Symptomatic relief under clinical supervision',
        'Restoring physiological balance'
      ],
      howItWorks: `This therapeutic agent acts on target receptors to modulate the metabolic or physiological pathways associated with ${medicine?.genericName || 'the active ingredient'}.`,
      dosage: [
        'Administer strictly as advised by the clinician.',
        'Store in a cool, dry place away from direct sunlight.',
        'Keep out of reach of children.'
      ],
      sideEffects: [
        'Mild nausea',
        'Dizziness',
        'Dry mouth'
      ],
      warning: medicine?.requiresPrescription 
        ? 'This is a prescription medicine. Take only as directed by your physician.'
        : 'Take as directed by your healthcare professional.'
    };
  }, [medicine]);

  if (loading) {
    return <LoadingState label="Loading medicine details..." />;
  }

  if (error || !medicine) {
    return <ErrorState title="Medicine details unavailable" description={error || 'Medicine not found.'} />;
  }

  return (
    <div className="w-full min-h-screen bg-[#080e1a] text-slate-100 p-6 font-sans">
      
      {/* Top Navigation / Breadcrumbs */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
        <div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-wider mb-2">
            <span>Pharmacy</span>
            <span>&rsaquo;</span>
            <span className="text-slate-300">Medicine Description</span>
          </div>
          <button
            onClick={() => navigate('/pharmacy/medicines')}
            className="text-xs font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition"
          >
            <ArrowLeft size={13} /> Back to medicines
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => toast.success('Options drawer opened.')}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-white/5 text-slate-350 transition flex items-center gap-1 text-xs"
          >
            <MoreHorizontal size={14} /> More
          </button>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5"
          >
            <Edit3 size={13} /> {isEditMode ? 'View Mode' : 'Edit Medicine'}
          </button>
        </div>
      </div>

      {isEditMode ? (
        /* EDIT MEDICINE WORKSPACE */
        <form onSubmit={handleUpdateMedicine} className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-6">
          <div className="border-b border-white/[0.06] pb-4">
            <h3 className="text-base font-black text-white">Edit Medicine Parameters</h3>
            <p className="text-[10px] text-slate-500">Update metadata, rules, and stock policies for this pharmaceutical unit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Medicine Name
              <input
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Generic Name
              <input
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.genericName}
                onChange={(e) => setEditForm({ ...editForm, genericName: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Brand Name
              <input
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.brandName}
                onChange={(e) => setEditForm({ ...editForm, brandName: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Category
              <input
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Form (e.g. Inhaler, Tablet)
              <input
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.form}
                onChange={(e) => setEditForm({ ...editForm, form: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Strength
              <input
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.strength}
                onChange={(e) => setEditForm({ ...editForm, strength: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Manufacturer
              <input
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.manufacturer}
                onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Unit Price (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.unitPrice}
                onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-450 uppercase">
              Reorder Level
              <input
                type="number"
                min="0"
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                value={editForm.reorderLevel}
                onChange={(e) => setEditForm({ ...editForm, reorderLevel: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="rounded border-white/10 bg-slate-900 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              Active Product Status
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={editForm.requiresPrescription}
                onChange={(e) => setEditForm({ ...editForm, requiresPrescription: e.target.checked })}
                className="rounded border-white/10 bg-slate-900 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              Requires Prescription Tag
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        /* MEDICINE DESCRIPTION MOCKUP DESIGN VIEW */
        <div className="space-y-6">
          
          {/* Hero Header Card */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-white/5 flex items-center justify-center shrink-0">
              {/* Dynamic capsule illustration depending on category */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-450 border border-white/15 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-500/20">
                Pill
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{medicine.name || 'Albuterol Sulfate'}</h2>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                  medicine.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-slate-800 text-slate-400'
                }`}>
                  {medicine.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-full text-[9px] font-bold">Generic</span>
                {medicine.category && (
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/10 rounded-full text-[9px] font-bold">{medicine.category}</span>
                )}
                {medicine.form && (
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/10 rounded-full text-[9px] font-bold">{medicine.form}</span>
                )}
                {medicine.requiresPrescription && (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/10 rounded-full text-[9px] font-bold">Prescription Required</span>
                )}
              </div>

              <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-3 flex-wrap">
                <span>Brand: <strong className="text-slate-300 font-semibold">{medicine.brandName || 'N/A'}</strong></span>
                <span>•</span>
                <span>Code: <strong className="text-slate-300 font-semibold">{medicine.code || 'MED-CODE'}</strong></span>
                <span>•</span>
                <span>Reorder Level: <strong className="text-slate-300 font-semibold">{medicine.reorderLevel || 10} Units</strong></span>
                <span>•</span>
                <span>Lead Time: <strong className="text-slate-300 font-semibold">{medicine.supplierLeadTimeDays || 7} days</strong></span>
              </div>
            </div>
          </div>

          {/* Three Column Details Body */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.3fr_1.1fr] gap-6">
            
            {/* Column 1: Medicine Description Details */}
            <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-5 text-xs">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-400" /> Medicine Description
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-200">What is {medicine.name}?</h4>
                  <p className="text-slate-400 leading-relaxed mt-1">{drugDetails.whatIsIt}</p>
                </div>
                
                <div>
                  <h4 className="font-extrabold text-slate-200">Uses</h4>
                  <ul className="space-y-1.5 mt-1.5">
                    {drugDetails.uses.map((use, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-400">
                        <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{use}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-200">How it works</h4>
                  <p className="text-slate-400 leading-relaxed mt-1">{drugDetails.howItWorks}</p>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-200">Dosage & Administration</h4>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-400">
                    {drugDetails.dosage.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-200">Side Effects</h4>
                  <ul className="space-y-1 mt-1 text-slate-400">
                    {drugDetails.sideEffects.map((effect, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-amber-500/90 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{effect}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-2 mt-4 text-[10px] text-blue-300">
                <Info size={14} className="shrink-0" />
                <p>{drugDetails.warning}</p>
              </div>
            </div>

            {/* Column 2: Key Information Table */}
            <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-400" /> Key Information
              </h3>
              
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Generic Name', value: medicine.genericName || 'N/A' },
                  { label: 'Brand Name', value: medicine.brandName || 'N/A' },
                  { label: 'Category', value: medicine.category || 'N/A' },
                  { label: 'Form', value: medicine.form || 'N/A' },
                  { label: 'Strength', value: medicine.strength || 'N/A' },
                  { label: 'Unit Price', value: `₹${(medicine.unitPrice || 0).toFixed(2)}` },
                  { label: 'Manufacturer', value: medicine.manufacturer || 'N/A' },
                  { label: 'Storage', value: 'Store below 30°C. Protect from light.' },
                  { label: 'Requires Prescription', value: medicine.requiresPrescription ? 'Yes' : 'No' },
                  { label: 'Active Status', value: medicine.isActive ? 'Active' : 'Inactive' },
                  { label: 'Created On', value: '12 May 2025, 10:30 AM' },
                  { label: 'Last Updated', value: '19 May 2025, 04:45 PM' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-white/[0.03] text-[11px]">
                    <span className="text-slate-500 font-semibold">{item.label}</span>
                    <span className="text-slate-200 font-bold text-right truncate max-w-[160px]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Stock Summary & Composition */}
            <div className="space-y-6">
              
              {/* Stock Summary Widget */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-4 text-xs">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-indigo-400" /> Stock Summary
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900/50 border border-white/5 rounded-2xl">
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Available Stock</p>
                    <p className="text-emerald-400 font-black text-lg mt-1">{medicine.totalStock ?? 0} <span className="text-[10px] font-normal text-slate-500">Units</span></p>
                  </div>
                  <div className="p-3 bg-slate-900/50 border border-white/5 rounded-2xl">
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Reorder Level</p>
                    <p className="text-slate-300 font-black text-lg mt-1">{medicine.reorderLevel || 10} <span className="text-[10px] font-normal text-slate-505">Units</span></p>
                  </div>
                  <div className="p-3 bg-slate-900/50 border border-white/5 rounded-2xl">
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Suggested Reorder Qty</p>
                    <p className="text-slate-300 font-black text-lg mt-1">{forecast?.output?.reorder_quantity || 60} <span className="text-[10px] font-normal text-slate-500">Units</span></p>
                  </div>
                  <div className="p-3 bg-slate-900/50 border border-white/5 rounded-2xl">
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Days Until Stockout</p>
                    <p className="text-amber-500 font-black text-lg mt-1">{forecast?.output?.days_until_stockout || 7} <span className="text-[10px] font-normal text-slate-505">Days</span></p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-white/[0.04] text-[10px]">
                  <div>
                    <p className="text-slate-505 uppercase">Stock Status</p>
                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded font-black text-[9px] mt-1 inline-block uppercase">In Stock</span>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-505 uppercase">Last Updated</p>
                    <p className="text-slate-350 font-bold mt-1">19 May 2025, 04:45 PM</p>
                  </div>
                </div>
              </div>

              {/* Composition & Packaging Widget */}
              <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-5 space-y-3 text-xs">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-400" /> Composition & Packaging
                </h3>

                <div className="space-y-2 pt-1 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-white/[0.02]"><span className="text-slate-500">Composition</span><span className="text-slate-300 font-bold text-right">{medicine.strength || 'Albuterol Sulfate 90 mcg'}</span></div>
                  <div className="flex justify-between py-1 border-b border-white/[0.02]"><span className="text-slate-500">Packaging Size</span><span className="text-slate-300 font-bold text-right">{medicine.form || 'Inhaler'}</span></div>
                  <div className="flex justify-between py-1 border-b border-white/[0.02]"><span className="text-slate-500">Shelf Life</span><span className="text-slate-300 font-bold text-right">24 Months</span></div>
                  <div className="flex justify-between py-1"><span className="text-slate-500">Barcode</span><span className="text-slate-350 font-bold">8901234567890</span></div>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Batches List Widget */}
          <div className="bg-[#060d18] border border-white/[0.08] rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Stock Batches</h3>
                <p className="text-[10px] text-slate-500">Batch-level inventory tracking, purchase ledger and expirations.</p>
              </div>
              <button
                onClick={() => setIsAddBatchOpen(true)}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition flex items-center gap-1"
              >
                <Plus size={13} /> Add Batch
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-white/[0.04]">
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-center">Available Qty</th>
                    <th className="py-2.5 px-3 text-center">Purchase Price</th>
                    <th className="py-2.5 px-3 text-center">Selling Price</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Added On</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(medicine.batches || []).map((batch, index) => {
                    const isExpired = new Date(batch.expiryDate) < new Date();
                    return (
                      <tr key={index} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                        <td className="py-3 px-3 font-bold text-slate-200">{batch.batchNumber}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-400">{batch.quantity} Units</td>
                        <td className="py-3 px-3 text-center text-slate-350">₹{(batch.purchasePrice || 0).toFixed(2)}</td>
                        <td className="py-3 px-3 text-center text-slate-200 font-semibold">₹{(batch.sellingPrice || 0).toFixed(2)}</td>
                        <td className="py-3 px-3 text-slate-400">{batch.supplier || 'ABC Pharma Distributors'}</td>
                        <td className="py-3 px-3 text-slate-500">12 May 2025</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            isExpired ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {isExpired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => toast.success('Batch options clicked.')}
                            className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(medicine.batches || []).length === 0 && (
                    <tr>
                      <td colSpan="9" className="py-4 text-center text-slate-500 italic">No batches created for this medicine yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
             {/* ADD BATCH MODAL/OVERLAY */}
          {isAddBatchOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
              <div className="relative w-full max-w-6xl bg-[#080e1a] border border-white/[0.08] rounded-3xl p-6 space-y-6 animate-fadeIn text-xs text-slate-200 my-8">
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-4 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Package className="text-indigo-400" size={18} />
                      Add New Stock Batch
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Add a new stock batch and distribute it to clinics</p>
                  </div>
                  <button
                    onClick={() => { setIsAddBatchOpen(false); setBatchStep(1); }}
                    className="text-slate-400 hover:text-white transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center justify-center w-full mb-6 relative max-w-3xl mx-auto">
                  <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-[2px] bg-slate-800 -z-10" />
                  <div className="absolute left-[10%] w-[33%] top-1/2 -translate-y-1/2 h-[2px] bg-indigo-500 -z-10 transition-all"
                       style={{ width: batchStep === 1 ? '0%' : batchStep === 2 ? '40%' : '80%' }} />

                  <div className="flex justify-between w-full">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center gap-1 bg-[#080e1a] px-3 cursor-pointer" onClick={() => setBatchStep(1)}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        batchStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {batchStep > 1 ? <Check size={14} /> : '1'}
                      </div>
                      <span className="text-[11px] font-bold text-white">Add Batch Details</span>
                      <span className="text-[9px] text-slate-500">Enter batch information</span>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center gap-1 bg-[#080e1a] px-3 cursor-pointer" onClick={() => {
                      if (newBatch.batchNumber && newBatch.quantity) setBatchStep(2);
                    }}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        batchStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {batchStep > 2 ? <Check size={14} /> : '2'}
                      </div>
                      <span className="text-[11px] font-bold text-white">Distribute to Clinics</span>
                      <span className="text-[9px] text-slate-500">Allocate stock to clinics</span>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center gap-1 bg-[#080e1a] px-3 cursor-pointer" onClick={() => {
                      if (newBatch.batchNumber && newBatch.quantity && batchStep === 2) setBatchStep(3);
                    }}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        batchStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>3</div>
                      <span className="text-[11px] font-bold text-white">Overview</span>
                      <span className="text-[9px] text-slate-500">Review and confirm</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddBatchSubmit}>
                  {/* STEP 1: Add Batch Details */}
                  {batchStep === 1 && (
                    <div className="space-y-6">
                      {/* Batch Details Card */}
                      <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2">
                          <FileText size={14} className="text-indigo-400" />
                          <span>Batch Details</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Batch Number *</label>
                            <input
                              type="text"
                              placeholder="Enter batch number"
                              value={newBatch.batchNumber}
                              onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                              required
                            />
                            <p className="text-[9px] text-slate-505">Unique batch/lot number</p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity *</label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="Enter quantity"
                                value={newBatch.quantity}
                                onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-4 pr-12 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                                required
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">Units</span>
                            </div>
                            <p className="text-[9px] text-slate-550">Total number of units in this batch</p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Expiry Date *</label>
                            <input
                              type="date"
                              value={newBatch.expiryDate}
                              onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              required
                            />
                            <p className="text-[9px] text-slate-505">Select expiry date of the batch</p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Purchase Price (₹) *</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Enter purchase price"
                              value={newBatch.purchasePrice}
                              onChange={(e) => setNewBatch({ ...newBatch, purchasePrice: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                              required
                            />
                            <p className="text-[9px] text-slate-505">Price at which this batch was purchased</p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Selling Price (₹) *</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Enter selling price"
                              value={newBatch.sellingPrice}
                              onChange={(e) => setNewBatch({ ...newBatch, sellingPrice: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                              required
                            />
                            <p className="text-[9px] text-slate-505">Price at which this batch will be sold</p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Supplier *</label>
                            <select
                              value={newBatch.supplier}
                              onChange={(e) => setNewBatch({ ...newBatch, supplier: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500"
                              required
                            >
                              <option value="ABC Pharma Distributors">ABC Pharma Distributors</option>
                              <option value="Global Meds Supplier">Global Meds Supplier</option>
                              <option value="Reddy Labs Sales">Reddy Labs Sales</option>
                            </select>
                            <p className="text-[9px] text-slate-550">Select the supplier of this batch</p>
                          </div>
                        </div>
                      </div>

                      {/* Additional Information Optional Card */}
                      <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2">
                          <Sparkles size={14} className="text-indigo-400" />
                          <span>Additional Information (Optional)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Manufacture Date</label>
                            <input
                              type="date"
                              value={newBatch.mfgDate}
                              onChange={(e) => setNewBatch({ ...newBatch, mfgDate: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                            <p className="text-[9px] text-slate-505">Date when the stock was manufactured</p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Reorder Level</label>
                            <input
                              type="number"
                              placeholder="Enter reorder level"
                              value={newBatch.reorderLevel}
                              onChange={(e) => setNewBatch({ ...newBatch, reorderLevel: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500"
                            />
                            <p className="text-[9px] text-slate-550">Minimum stock level before reorder</p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Notes</label>
                            <textarea
                              rows="2"
                              placeholder="Enter any notes (optional)"
                              value={newBatch.notes}
                              onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 resize-none"
                            />
                            <p className="text-[9px] text-slate-550">Any additional information about this batch</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer buttons */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => setIsAddBatchOpen(false)}
                          className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-slate-305 text-xs font-bold rounded-xl transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newBatch.batchNumber || !newBatch.quantity) {
                              toast.error('Batch number and quantity are required.');
                              return;
                            }
                            setBatchStep(2);
                          }}
                          className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                          Next: Distribute to Clinics <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Distribute to Clinics */}
                  {batchStep === 2 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Medicine & Batch Details Card */}
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
                                <span className="text-sm font-extrabold text-white">{medicine?.name}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">{medicine?.form || 'Tablets'}</span>
                              </div>
                              <p className="text-xs text-slate-400">Generic: {medicine?.genericName} &nbsp;|&nbsp; Strength: {medicine?.strength}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-3 border-t border-white/[0.04] text-xs">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase">Batch Number</p>
                              <p className="font-bold text-white mt-0.5">{newBatch.batchNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-555 uppercase">Mfg. Date</p>
                              <p className="font-bold text-white mt-0.5">{newBatch.mfgDate || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-555 uppercase">Expiry Date</p>
                              <p className="font-bold text-white mt-0.5">{newBatch.expiryDate || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-555 uppercase">Total Quantity</p>
                              <p className="font-bold text-emerald-400 mt-0.5">{Number(newBatch.quantity).toLocaleString()} Units</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-555 uppercase">Purchase Price (per unit)</p>
                              <p className="font-bold text-white mt-0.5">₹{Number(newBatch.purchasePrice || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Distribution Method Card */}
                        <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                          <h3 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                            <Layers size={14} className="text-emerald-400" />
                            Distribution Method
                          </h3>
                          <p className="text-[10px] text-slate-500">Choose how you want to distribute this stock.</p>

                          <div className="grid grid-cols-3 gap-3">
                            {/* Manual */}
                            <button
                              type="button"
                              onClick={() => setDistributionMethod('manual')}
                              className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all ${
                                distributionMethod === 'manual'
                                  ? 'border-emerald-500 bg-emerald-500/5 text-white'
                                  : 'border-white/10 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[11px] font-bold">Manual</span>
                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${distributionMethod === 'manual' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-800'}`}>
                                  {distributionMethod === 'manual' && <Check size={10} />}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 leading-snug">Manually assign quantities</span>
                            </button>

                            {/* Equal */}
                            <button
                              type="button"
                              onClick={() => setDistributionMethod('equal')}
                              className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all ${
                                distributionMethod === 'equal'
                                  ? 'border-emerald-500 bg-emerald-500/5 text-white'
                                  : 'border-white/10 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[11px] font-bold">Equal</span>
                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${distributionMethod === 'equal' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-800'}`}>
                                  {distributionMethod === 'equal' && <Check size={10} />}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 leading-snug">Distribute equally</span>
                            </button>

                            {/* AI */}
                            <button
                              type="button"
                              onClick={() => setDistributionMethod('ai')}
                              className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all relative ${
                                distributionMethod === 'ai'
                                  ? 'border-emerald-500 bg-emerald-500/5 text-white'
                                  : 'border-white/10 bg-slate-900/50 hover:bg-slate-900 text-slate-400'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[11px] font-bold">AI Recommended</span>
                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${distributionMethod === 'ai' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-800'}`}>
                                  {distributionMethod === 'ai' && <Check size={10} />}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 leading-snug">AI demand forecast</span>
                              <span className="absolute bottom-2 right-2 bg-purple-500/20 text-purple-400 text-[8px] font-extrabold px-1 rounded">AI</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Overall Margin Summary */}
                      {(() => {
                        const totalQtyVal = Number(newBatch.quantity || 1000);
                        const purchasePriceVal = Number(newBatch.purchasePrice || 0);
                        const sellingPriceVal = Number(newBatch.sellingPrice || 0);
                        const unitMargin = sellingPriceVal - purchasePriceVal;
                        const marginPct = purchasePriceVal > 0 ? (unitMargin / purchasePriceVal) * 100 : 0;
                        const totalMarginVal = unitMargin * totalQtyVal;
                        return (
                          <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                              <Layers size={14} className="text-indigo-400" />
                              <span>Overall Margin Summary (Entire Batch)</span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 text-xs">
                              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Units</p>
                                <p className="text-sm font-bold text-white">{totalQtyVal.toLocaleString()} Units</p>
                              </div>
                              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                                <p className="text-[10px] text-slate-505 uppercase font-semibold">Avg. Purchase Price / Unit</p>
                                <p className="text-sm font-bold text-white">₹{purchasePriceVal.toFixed(2)}</p>
                              </div>
                              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                                <p className="text-[10px] text-slate-505 uppercase font-semibold">Avg. Selling Price / Unit</p>
                                <p className="text-sm font-bold text-white">₹{sellingPriceVal.toFixed(2)}</p>
                              </div>
                              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                                <p className="text-[10px] text-slate-505 uppercase font-semibold">Avg. Margin / Unit</p>
                                <p className="text-sm font-bold text-emerald-400">₹{unitMargin.toFixed(2)} ({marginPct.toFixed(2)}%)</p>
                              </div>
                              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                                <p className="text-[10px] text-slate-505 uppercase font-semibold">Total Margin (All Units)</p>
                                <p className="text-sm font-bold text-emerald-400">₹{totalMarginVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-1">
                                <p className="text-[10px] text-slate-505 uppercase font-semibold">Total Margin %</p>
                                <p className="text-sm font-bold text-purple-400">{marginPct.toFixed(2)}%</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Assign Stock to Clinics Table */}
                      <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-6">
                        {(() => {
                          const totalQtyVal = Number(newBatch.quantity || 1000);
                          const assignedQty = distributions.reduce((sum, d) => sum + (d.checked ? Number(d.quantity || 0) : 0), 0);
                          const remainingQty = Math.max(0, totalQtyVal - assignedQty);
                          const purchasePriceVal = Number(newBatch.purchasePrice || 0);
                          const sellingPriceVal = Number(newBatch.sellingPrice || 0);
                          const unitMargin = sellingPriceVal - purchasePriceVal;
                          const marginPct = purchasePriceVal > 0 ? (unitMargin / purchasePriceVal) * 100 : 0;
                          return (
                            <>
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.06] pb-4">
                                <div>
                                  <h3 className="text-sm font-bold text-white">Assign Stock to Clinics</h3>
                                  <p className="text-xs text-slate-400 mt-0.5">Enter the quantity you want to assign to each clinic.</p>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs">
                                  <span className="text-slate-450">Purchased Quantity: <strong className="text-emerald-400">{totalQtyVal.toLocaleString()} Units</strong></span>
                                  <span className="text-slate-450">Assigned Quantity: <strong className="text-emerald-400">{assignedQty.toLocaleString()} Units</strong></span>
                                  <span className="text-slate-450">Remaining Quantity: <strong className={remainingQty > 0 ? 'text-amber-500' : 'text-emerald-400'}>{remainingQty.toLocaleString()} Units</strong></span>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                                  <thead>
                                    <tr className="text-slate-500 border-b border-white/[0.04]">
                                      <th className="py-3 w-8"></th>
                                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Clinic</th>
                                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Current Stock (Available)</th>
                                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Reorder Level</th>
                                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Assign Quantity (Units)</th>
                                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Assigned Value (Approx.)</th>
                                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Margin / Unit</th>
                                      <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-emerald-400">Total Margin</th>
                                      <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-right">Margin %</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {distributions.map((dist, idx) => {
                                      const assignedValue = Number(dist.quantity || 0) * purchasePriceVal;
                                      const totalMargin = Number(dist.quantity || 0) * unitMargin;
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
                                          <td className="py-3.5 text-slate-350">{dist.currentStock} Units</td>
                                          <td className="py-3.5 text-slate-450">{dist.reorderLevel}</td>
                                          <td className="py-3.5">
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
                                          </td>
                                          <td className="py-3.5 font-bold text-slate-200">₹{assignedValue.toFixed(2)}</td>
                                          <td className="py-3.5 text-slate-400">₹{unitMargin.toFixed(2)}</td>
                                          <td className="py-3.5 text-emerald-450 font-extrabold">₹{totalMargin.toFixed(2)}</td>
                                          <td className="py-3.5 text-right text-purple-400 font-bold">{marginPct.toFixed(2)}%</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 text-xs text-indigo-400 flex gap-2">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>Stock will be added to the selected clinics as a new batch ({newBatch.batchNumber}). You can manage and transfer stock later from the inventory section.</span>
                      </div>

                      {/* Footer buttons */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => setBatchStep(1)}
                          className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-slate-350 text-xs font-bold rounded-xl transition flex items-center gap-1"
                        >
                          <ChevronLeft size={14} /> Back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const totalQtyVal = Number(newBatch.quantity || 1000);
                            const assignedQty = distributions.reduce((sum, d) => sum + (d.checked ? Number(d.quantity || 0) : 0), 0);
                            if (assignedQty === 0) {
                              toast.error('Please assign stock to at least one clinic.');
                              return;
                            }
                            setBatchStep(3);
                          }}
                          className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                          Next Step <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Overview */}
                  {batchStep === 3 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Left: Batch & Medicine Summary Card */}
                        <div className="lg:col-span-3 rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                          <h3 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                            <Package size={14} className="text-emerald-400" />
                            Batch & Medicine Summary
                          </h3>
                          
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                              <Package size={22} />
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-extrabold text-white">{medicine?.name}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">{medicine?.form || 'Tablets'}</span>
                              </div>
                              <p className="text-xs text-slate-400">Generic: {medicine?.genericName} &nbsp;|&nbsp; Strength: {medicine?.strength}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-3 border-t border-white/[0.04] text-xs">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase">Batch Number</p>
                              <p className="font-bold text-white mt-0.5">{newBatch.batchNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase">Mfg. Date</p>
                              <p className="font-bold text-white mt-0.5">{newBatch.mfgDate || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase">Expiry Date</p>
                              <p className="font-bold text-white mt-0.5">{newBatch.expiryDate || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase">Total Quantity</p>
                              <p className="font-bold text-emerald-400 mt-0.5">{Number(newBatch.quantity).toLocaleString()} Units</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase">Purchase Price (per unit)</p>
                              <p className="font-bold text-white mt-0.5">₹{Number(newBatch.purchasePrice || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Right: Margin Summary Card */}
                        {(() => {
                          const totalQtyVal = Number(newBatch.quantity || 1000);
                          const purchasePriceVal = Number(newBatch.purchasePrice || 0);
                          const sellingPriceVal = Number(newBatch.sellingPrice || 0);
                          const unitMargin = sellingPriceVal - purchasePriceVal;
                          const marginPct = purchasePriceVal > 0 ? (unitMargin / purchasePriceVal) * 100 : 0;
                          const totalMarginVal = unitMargin * totalQtyVal;
                          return (
                            <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                              <h3 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                                <Layers size={14} className="text-emerald-400" />
                                Overall Margin Summary (Entire Batch)
                              </h3>
                              
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Total Units</p>
                                  <p className="font-bold text-white mt-0.5">{totalQtyVal.toLocaleString()} Units</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Avg. Purchase Price / Unit</p>
                                  <p className="font-bold text-white mt-0.5">₹{purchasePriceVal.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Avg. Selling Price / Unit</p>
                                  <p className="font-bold text-white mt-0.5">₹{sellingPriceVal.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Avg. Margin / Unit</p>
                                  <p className="font-bold text-emerald-400 mt-0.5">₹{unitMargin.toFixed(2)} ({marginPct.toFixed(2)}%)</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Total Margin (All Units)</p>
                                  <p className="font-bold text-emerald-400 mt-0.5">₹{totalMarginVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Total Margin %</p>
                                  <p className="font-bold text-purple-400 mt-0.5">{marginPct.toFixed(2)}%</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Distribution to Clinics Overview Table */}
                      <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-6 space-y-4">
                        <h3 className="text-sm font-bold text-white border-b border-white/[0.06] pb-2">Distribution to Clinics Overview</h3>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                            <thead>
                              <tr className="text-slate-500 border-b border-white/[0.04]">
                                <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Clinic</th>
                                <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Assigned Quantity (Units)</th>
                                <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Assigned Value (Approx.)</th>
                                <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Margin / Unit</th>
                                <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-emerald-400 font-extrabold">Total Margin</th>
                                <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Margin %</th>
                                <th className="py-3 font-bold uppercase tracking-wider text-[10px] text-right">Current Stock (After Allocation)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const purchasePriceVal = Number(newBatch.purchasePrice || 0);
                                const sellingPriceVal = Number(newBatch.sellingPrice || 0);
                                const unitMargin = sellingPriceVal - purchasePriceVal;
                                const marginPct = purchasePriceVal > 0 ? (unitMargin / purchasePriceVal) * 100 : 0;
                                const activeDists = distributions.filter(d => d.checked);
                                return (
                                  <>
                                    {activeDists.map((dist, idx) => {
                                      const qty = Number(dist.quantity || 0);
                                      const assignedValue = qty * purchasePriceVal;
                                      const totalMargin = qty * unitMargin;
                                      return (
                                        <tr key={dist.clinicId} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
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
                                          <td className="py-3.5 font-bold text-slate-350">{qty.toLocaleString()} Units</td>
                                          <td className="py-3.5 font-semibold text-slate-200">₹{assignedValue.toFixed(2)}</td>
                                          <td className="py-3.5 text-slate-400">₹{unitMargin.toFixed(2)}</td>
                                          <td className="py-3.5 text-emerald-450 font-extrabold">₹{totalMargin.toFixed(2)}</td>
                                          <td className="py-3.5 text-purple-400 font-bold">{marginPct.toFixed(2)}%</td>
                                          <td className="py-3.5 text-right text-slate-300">{(dist.currentStock + qty).toLocaleString()} Units</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Bottom widgets row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Clinic-wise Margin Contribution */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-1.5">
                            <Activity size={14} className="text-indigo-400" />
                            Clinic-wise Margin Contribution
                          </h4>
                          <div className="flex items-center justify-between gap-4">
                            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center rounded-full border-[6px] border-indigo-500/10 border-t-indigo-500">
                              <span className="text-[9px] font-black text-center leading-none text-slate-200">Total<br/><span className="text-[11px] text-emerald-400">100%</span></span>
                            </div>
                            <div className="space-y-1.5 flex-1">
                              {distributions.filter(d => d.checked && Number(d.quantity) > 0).map((d, index) => {
                                const totalMarginAmt = distributions.reduce((sum, db) => sum + (db.checked ? Number(db.quantity || 0) * (Number(newBatch.sellingPrice || 0) - Number(newBatch.purchasePrice || 0)) : 0), 0);
                                const currentMarginAmt = Number(d.quantity || 0) * (Number(newBatch.sellingPrice || 0) - Number(newBatch.purchasePrice || 0));
                                const share = totalMarginAmt > 0 ? ((currentMarginAmt / totalMarginAmt) * 100).toFixed(0) : '0';
                                const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500'];
                                return (
                                  <div key={d.clinicId} className="flex justify-between items-center text-[10px]">
                                    <span className="flex items-center gap-1.5 truncate max-w-[120px]">
                                      <span className={`w-2 h-2 rounded-full ${colors[index % colors.length]}`} />
                                      <span className="text-slate-400 font-semibold">{d.clinicName.split(' - ')[0]}</span>
                                    </span>
                                    <span className="font-bold text-slate-200">₹{currentMarginAmt.toFixed(0)} ({share}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Distribution Summary */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-2 flex items-center gap-1.5">
                            <Package size={14} className="text-indigo-400" />
                            Distribution Summary
                          </h4>
                          <div className="flex items-center justify-between gap-4">
                            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center rounded-full border-[6px] border-emerald-500/10 border-t-emerald-500">
                              <span className="text-[9px] font-black text-center leading-none text-slate-200">Allocated<br/><span className="text-[11px] text-emerald-400">100%</span></span>
                            </div>
                            <div className="space-y-2 flex-1 text-[10px] text-slate-400">
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Allocated</span>
                                <strong className="text-white font-bold">{Number(newBatch.quantity).toLocaleString()} Units (100%)</strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Remaining</span>
                                <strong className="text-white font-bold">0 Units (0%)</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Key Insights */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#060d18] p-5 space-y-3.5">
                          <h4 className="text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-1.5 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-indigo-400" />
                            Key Insights
                          </h4>
                          <ul className="space-y-2 text-[10px] text-slate-400 font-semibold">
                            <li className="flex items-start gap-1.5">
                              <CheckCircle size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                              <span>All {Number(newBatch.quantity).toLocaleString()} units have been successfully allocated.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                              <span>Total expected margin from this batch is ₹{((Number(newBatch.sellingPrice || 0) - Number(newBatch.purchasePrice || 0)) * Number(newBatch.quantity || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({Number(newBatch.purchasePrice) > 0 ? (((Number(newBatch.sellingPrice) - Number(newBatch.purchasePrice)) / Number(newBatch.purchasePrice)) * 100).toFixed(0) : '0'}%).</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="p-3 text-[10px] text-slate-500 border-t border-white/[0.04]">
                        Please review all distribution details carefully before confirming. Once confirmed, the stock will be added to the clinics and inventory will be updated.
                      </div>

                      {/* Footer buttons */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => setBatchStep(2)}
                          className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-slate-350 text-xs font-bold rounded-xl transition flex items-center gap-1"
                        >
                          <ChevronLeft size={14} /> Back
                        </button>
                        <button
                          type="button"
                          onClick={handleAddBatchSubmit}
                          disabled={batchSaving}
                          className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition"
                        >
                          {batchSaving ? 'Saving...' : 'Confirm & Add Stock'}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}  </div>

        </div>
      )}

    </div>
  );
};

export default MedicineDetailPage;
