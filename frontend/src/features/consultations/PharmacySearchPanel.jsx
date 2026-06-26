import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, AlertCircle, ArrowLeft, Check, ShoppingCart } from 'lucide-react';
import { pharmacyApi } from '../../lib/api';

export default function PharmacySearchPanel({
  isOpen,
  onClose,
  patient,
  consultation,
  onAddMedicines
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [inHouseMeds, setInHouseMeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [addedMedicines, setAddedMedicines] = useState([]);

  // Mock dosage configuration for suggestions
  const [dosageForm, setDosageForm] = useState({
    dosage: '650 mg',
    frequency: '1-1-1',
    duration: '3 days',
    timing: 'After Food',
    instructions: 'Take after food with water.'
  });

  const categories = ['All Categories', 'Analgesic / Antipyretic', 'Antibiotic', 'Antihistamine', 'Cardiovascular', 'Respiratory'];

  // Load real in-house medicines
  useEffect(() => {
    if (!isOpen) return;
    const fetchInHouseMeds = async () => {
      setLoading(true);
      try {
        const res = await pharmacyApi.listMedicines({ limit: 100 });
        if (res?.medicines) {
          setInHouseMeds(res.medicines);
        }
      } catch (err) {
        console.error('Failed to fetch in-house medicines:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInHouseMeds();
  }, [isOpen]);

  // Hide/show sidebar and header layout
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('hide-sidebar-all');
    } else {
      document.body.classList.remove('hide-sidebar-all');
    }
    return () => {
      document.body.classList.remove('hide-sidebar-all');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Partner/Alternative medicines mock database
  const partnerMedicines = [
    {
      _id: 'partner-med-1',
      name: 'Paracetamol 650 mg Tablet',
      genericName: 'Paracetamol',
      category: 'Analgesic / Antipyretic',
      brand: 'Crocin 650 Tablet',
      partner: 'Partner Lab',
      pricePerTablet: 1.10,
      strength: '650 mg',
      form: 'Tablet',
      manufacturer: 'GlaxoSmithKline',
      shelfLife: '36 Months',
      storage: 'Store below 30°C',
      composition: 'Paracetamol IP 650mg'
    },
    {
      _id: 'partner-med-2',
      name: 'Paracetamol 650 mg Tablet',
      genericName: 'Paracetamol',
      category: 'Analgesic / Antipyretic',
      brand: 'Dolo 650 Tablet',
      partner: 'Partner Lab',
      pricePerTablet: 1.25,
      strength: '650 mg',
      form: 'Tablet',
      manufacturer: 'Micro Labs',
      shelfLife: '24 Months',
      storage: 'Store below 25°C',
      composition: 'Paracetamol IP 650mg'
    },
    {
      _id: 'partner-med-3',
      name: 'Paracetamol 500 mg Tablet',
      genericName: 'Paracetamol',
      category: 'Analgesic / Antipyretic',
      brand: 'Calpol 500 Tablet',
      partner: 'Partner Lab',
      pricePerTablet: 0.80,
      strength: '500 mg',
      form: 'Tablet',
      manufacturer: 'GlaxoSmithKline',
      shelfLife: '36 Months',
      storage: 'Store below 25°C',
      composition: 'Paracetamol IP 500mg'
    }
  ];

  // Filtering
  const filteredInHouse = inHouseMeds.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (m.genericName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || 
                            m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPartner = partnerMedicines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.genericName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || 
                            m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Select a medicine to view/edit details on the right
  const handleSelectForDetails = (med, isInHouse = true) => {
    const defaultDetails = {
      _id: med._id,
      name: med.name,
      genericName: med.genericName || 'Paracetamol',
      category: med.category || 'Analgesic / Antipyretic',
      strength: med.strength || '650 mg',
      form: med.form || 'Tablet',
      route: 'Oral',
      therapeuticClass: med.category || 'Analgesic / Antipyretic',
      composition: med.composition || `${med.name} Active Compounds`,
      manufacturer: med.manufacturer || 'Micro Labs',
      shelfLife: med.shelfLife || '24 Months',
      storage: med.storage || 'Store below 25°C',
      isInHouse,
      price: med.pricePerTablet || 1.25
    };
    setSelectedMedicine(defaultDetails);

    // Sync form suggested fields
    setDosageForm({
      dosage: med.strength || '650 mg',
      frequency: '1-1-1',
      duration: '3 days',
      timing: 'After Food',
      instructions: `Take ${med.form || 'Tablet'} after food with water.`
    });
  };

  const handleAddSelection = () => {
    if (!selectedMedicine) return;
    const exists = addedMedicines.some(m => m._id === selectedMedicine._id);
    if (exists) return;

    setAddedMedicines([
      ...addedMedicines,
      {
        ...selectedMedicine,
        ...dosageForm
      }
    ]);
  };

  const handleRemoveSelection = (id) => {
    setAddedMedicines(addedMedicines.filter(m => m._id !== id));
  };

  const handleConfirm = () => {
    onAddMedicines(addedMedicines.map(m => ({
      medicineName: m.name,
      genericName: m.genericName,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      route: m.route.toLowerCase(),
      timing: m.timing.toLowerCase(),
      instructions: m.instructions,
      quantity: 10,
      isSubstituteAllowed: true
    })));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0B0F19] text-slate-100 font-sans overflow-hidden">
      
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#111827] border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">💊</span>
              Add Medicine / Pharmacy
            </h1>
            <p className="text-xs text-slate-400">Search and select medicines to add to prescription.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-850 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition"
          >
            Add to Prescription ({addedMedicines.length})
          </button>
        </div>
      </div>

      {/* ─── Grid Layout ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.3fr_1.1fr] overflow-hidden">
        
        {/* ─── Left Side: Search & Lists ─── */}
        <div className="bg-[#0B0F19] border-r border-slate-850 flex flex-col overflow-hidden">
          
          {/* Search inputs */}
          <div className="p-5 border-b border-slate-850 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-800 bg-[#111827] text-xs text-white outline-none focus:border-emerald-500 placeholder:text-slate-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicine (e.g. Paracetamol)..."
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                className="w-full md:w-44 py-2.5 px-3 rounded-xl border border-slate-800 bg-[#111827] text-xs text-white outline-none focus:border-emerald-500 cursor-pointer transition"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {searchQuery && (
              <p className="text-xs text-slate-400 font-medium">
                Showing results for <span className="text-white">"{searchQuery}"</span>
              </p>
            )}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* 1. Medicines Available in Your Organization */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <span>🏥</span> 1. Medicines Available in Your Organization
              </div>

              <div className="space-y-2.5">
                {loading ? (
                  <p className="text-xs text-slate-500 italic py-4">Loading in-house inventory...</p>
                ) : filteredInHouse.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">No in-house medicines found matching search query.</p>
                ) : (
                  filteredInHouse.map(m => (
                    <div 
                      key={m._id} 
                      onClick={() => handleSelectForDetails(m, true)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedMedicine?._id === m._id 
                          ? 'border-emerald-500/50 bg-[#111827]' 
                          : 'border-slate-850 bg-[#111827]/40 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-800/80 rounded-xl flex items-center justify-center text-lg">💊</div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{m.name}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Generic: {m.genericName || 'N/A'} • {m.category || 'N/A'}</p>
                          <div className="flex items-center gap-4 mt-2 text-[11px]">
                            <div><span className="text-slate-500">Strength:</span> <span className="text-slate-300 font-semibold">{m.strength || '—'}</span></div>
                            <div><span className="text-slate-500">Form:</span> <span className="text-slate-300 font-semibold">{m.form || '—'}</span></div>
                            <div><span className="text-slate-500">Stock:</span> <span className="text-emerald-400 font-extrabold">450 In stock</span></div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectForDetails(m, true);
                          handleAddSelection();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-555 text-xs font-bold text-white rounded-xl transition shadow-md"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Medicines from Other Partners */}
            <div className="space-y-3 pt-4 border-t border-slate-850">
              <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
                <span>📦</span> 2. Medicines from Other Partners
              </div>

              <div className="space-y-2.5">
                {filteredPartner.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">No partner medicine options found.</p>
                ) : (
                  filteredPartner.map(m => (
                    <div 
                      key={m._id} 
                      onClick={() => handleSelectForDetails(m, false)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedMedicine?._id === m._id 
                          ? 'border-violet-500/50 bg-[#111827]' 
                          : 'border-slate-850 bg-[#111827]/40 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-800/80 rounded-xl flex items-center justify-center text-lg">📦</div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{m.name}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Brand: {m.brand} • Generic: {m.genericName}</p>
                          <div className="flex items-center gap-4 mt-2 text-[11px]">
                            <div><span className="text-slate-500">Partner:</span> <span className="text-slate-300 font-semibold">{m.partner}</span></div>
                            <div><span className="text-slate-500">Strength:</span> <span className="text-slate-300 font-semibold">{m.strength}</span></div>
                            <div><span className="text-slate-500">Price:</span> <span className="text-violet-400 font-bold">₹{m.pricePerTablet}/tablet</span></div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectForDetails(m, false);
                          handleAddSelection();
                        }}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-555 text-xs font-bold text-white rounded-xl transition shadow-md"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* ─── Right Side: Selected & Details ─── */}
        <div className="bg-[#111827] flex flex-col overflow-hidden">
          
          {/* Selected medicines list overview */}
          <div className="p-5 border-b border-slate-850 shrink-0">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Selected Medicines</h3>
            <div className="space-y-2 max-h-[140px] overflow-y-auto">
              {addedMedicines.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-1">No medicines added to selection yet.</p>
              ) : (
                addedMedicines.map(m => (
                  <div key={m._id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {m.dosage} • {m.frequency} • {m.duration} • {m.timing}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveSelection(m._id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Details Form Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {selectedMedicine ? (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Medicine Details</h4>
                  <h3 className="text-base font-extrabold text-white mt-1">{selectedMedicine.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Generic: {selectedMedicine.genericName} • {selectedMedicine.category}</p>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs pt-3 border-t border-slate-800/50">
                  <div>
                    <span className="text-slate-500 font-medium">Strength</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{selectedMedicine.strength}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Form</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{selectedMedicine.form}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Route</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{selectedMedicine.route}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Therapeutic Class</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{selectedMedicine.therapeuticClass}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Composition</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{selectedMedicine.composition}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Manufacturer</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{selectedMedicine.manufacturer}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Shelf Life</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{selectedMedicine.shelfLife}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Storage</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{selectedMedicine.storage}</p>
                  </div>
                </div>

                {/* Suggested dosage inputs */}
                <div className="pt-4 border-t border-slate-800/50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dosage & Instructions (Suggested)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Dose</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-800 bg-[#0B0F19] px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        value={dosageForm.dosage}
                        onChange={(e) => setDosageForm({ ...dosageForm, dosage: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Frequency</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-800 bg-[#0B0F19] px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        value={dosageForm.frequency}
                        onChange={(e) => setDosageForm({ ...dosageForm, frequency: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Duration</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-800 bg-[#0B0F19] px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        value={dosageForm.duration}
                        onChange={(e) => setDosageForm({ ...dosageForm, duration: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Timing</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-800 bg-[#0B0F19] px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        value={dosageForm.timing}
                        onChange={(e) => setDosageForm({ ...dosageForm, timing: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Special Instructions</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-800 bg-[#0B0F19] px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                      value={dosageForm.instructions}
                      onChange={(e) => setDosageForm({ ...dosageForm, instructions: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={handleAddSelection}
                    className="w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                  >
                    Add to Selection list
                  </button>
                </div>

                {/* Substitutes / Alternatives */}
                <div className="pt-4 border-t border-slate-800/50 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Substitutes / Alternatives</p>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between bg-slate-900/20 border border-slate-850 p-2.5 rounded-xl">
                      <div>
                        <p className="font-bold text-white">Crocin 650 Tablet</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">650 mg • Tablet • ₹1.10/tab</p>
                      </div>
                      <button
                        onClick={() => handleOfferTest({
                          _id: 'sub-crocin',
                          name: 'Crocin 650 Tablet',
                          genericName: 'Paracetamol',
                          category: 'Analgesic / Antipyretic',
                          strength: '650 mg',
                          form: 'Tablet',
                          pricePerTablet: 1.10
                        }, false)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 rounded"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/20 border border-slate-850 p-2.5 rounded-xl">
                      <div>
                        <p className="font-bold text-white">Dolo 650 Tablet</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">650 mg • Tablet • ₹1.25/tab</p>
                      </div>
                      <button
                        onClick={() => handleOfferTest({
                          _id: 'sub-dolo',
                          name: 'Dolo 650 Tablet',
                          genericName: 'Paracetamol',
                          category: 'Analgesic / Antipyretic',
                          strength: '650 mg',
                          form: 'Tablet',
                          pricePerTablet: 1.25
                        }, false)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 rounded"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom availability banner */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-emerald-400 font-bold block mb-0.5">This medicine is available in your hospital pharmacy.</span>
                    It will be dispensed to the patient from in-house inventory.
                  </p>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-48 border border-dashed border-slate-800 rounded-2xl p-5">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Select a medicine from the list to view strength, substitutes, and configure dosages</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
