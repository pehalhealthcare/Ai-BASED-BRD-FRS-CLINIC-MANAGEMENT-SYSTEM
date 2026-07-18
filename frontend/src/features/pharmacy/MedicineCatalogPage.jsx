import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, ArrowLeft, Calendar, FileText, CheckCircle2,
  ChevronLeft, ChevronRight, AlertTriangle, AlertCircle,
  Building2, Package, Layers, Info, Check, HelpCircle,
  Activity, Star, Sparkles, Filter, Shield, Eye, X,
  MoreVertical, Edit2, Ban, RefreshCw, BarChart2, CheckCircle,
  Link, Layout, EyeOff, Trash2, ArrowUpRight
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { 
  listMedicines, createMedicine, updateMedicine, addMedicineBatch, getMedicineForecast 
} from './pharmacyApi';
import { healthcareCatalogApi } from '../../lib/api';
import { toast } from 'react-hot-toast';

const MedicineCatalogPage = () => {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'low_stock' | 'near_expiry'
  
  // Dialog / Modal states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  
  // Forecast state
  const [forecastData, setForecastData] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Global search & bulk states
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalResults, setGlobalResults] = useState([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [selectedGlobalItems, setSelectedGlobalItems] = useState([]);

  // Draft Creation states
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const [draftForm, setDraftForm] = useState({
    displayName: '',
    genericName: '',
    brandName: '',
    strength: '',
    dosageForm: 'Tablet',
    manufacturer: '',
    category: '',
    medicineType: 'Generic'
  });

  // Import wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedGlobalMed, setSelectedGlobalMed] = useState(null);
  const [clinicConfig, setClinicConfig] = useState({
    code: '',
    purchasePrice: '',
    sellingPrice: '',
    unitPrice: '',
    gst: 0,
    discount: 0,
    minimumStock: 5,
    reorderLevel: 10,
    rackNumber: '',
    storageLocation: '',
    requiresPrescription: true
  });
  
  // Opening stock batches
  const [batches, setBatches] = useState([
    { batchNumber: '', quantity: '', expiryDate: '', purchasePrice: '', sellingPrice: '', supplier: '' }
  ]);

  // Edit Clinic Config states
  const [isEditConfigOpen, setIsEditConfigOpen] = useState(false);
  const [editConfigForm, setEditConfigForm] = useState({
    code: '',
    sellingPrice: '',
    gst: 0,
    minimumStock: 5,
    reorderLevel: 10,
    rackNumber: '',
    storageLocation: '',
    requiresPrescription: true
  });

  // Add Batch Form State
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({
    batchNumber: '',
    quantity: '',
    expiryDate: '',
    purchasePrice: '',
    sellingPrice: '',
    supplier: '',
    invoiceNumber: ''
  });

  useEffect(() => {
    loadLocalMedicines();
  }, [searchQuery, activeTab]);

  useEffect(() => {
    healthcareCatalogApi.searchCategories({ type: 'Medicine' })
      .then(res => {
        setCategoriesList(res.data?.items || res.data || res.items || res || []);
      })
      .catch((err) => {
        console.error('Failed to load catalog categories', err);
      });
  }, []);

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    if (!draftForm.displayName || !draftForm.dosageForm || !draftForm.category) {
      return toast.error('Display Name, Dosage Form, and Category are required');
    }

    try {
      await healthcareCatalogApi.createMedicineDraft(draftForm);
      toast.success('Medicine draft submitted successfully for Super Admin verification!');
      setIsDraftOpen(false);
      setGlobalSearch('');
      setGlobalResults([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit medicine draft');
    }
  };

  const loadLocalMedicines = async () => {
    try {
      setLoading(true);
      const res = await listMedicines({
        search: searchQuery,
        stockStatus: activeTab === 'low_stock' ? 'low' : 'all',
        expiryStatus: activeTab === 'near_expiry' ? 'near' : 'all',
        limit: 100
      });
      setMedicines(res.data?.medicines || res.medicines || []);
    } catch (err) {
      toast.error('Failed to load clinic inventory');
    } finally {
      setLoading(false);
    }
  };

  // Search Global Medicine Catalog
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (globalSearch.trim().length >= 2) {
        loadGlobalCatalog();
      } else {
        setGlobalResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [globalSearch]);

  const loadGlobalCatalog = async () => {
    try {
      setSearchingGlobal(true);
      // Use /search/medicines which is accessible to clinic admins (read-only)
      const res = await healthcareCatalogApi.searchMedicines({ search: globalSearch, limit: 15 });
      // API returns { success, data: { total, items } } — items live under res.data
      setGlobalResults(res.data?.items || res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingGlobal(false);
    }
  };

  // Import single medicine wizard
  const handleStartImportWizard = (med) => {
    setSelectedGlobalMed(med);
    setClinicConfig({
      code: med.globalId || '',
      purchasePrice: '',
      sellingPrice: '',
      unitPrice: '',
      gst: 12,
      discount: 0,
      minimumStock: 10,
      reorderLevel: 20,
      rackNumber: '',
      storageLocation: '',
      requiresPrescription: true
    });
    setBatches([{ batchNumber: '', quantity: '', expiryDate: '', purchasePrice: '', sellingPrice: '', supplier: '' }]);
    setWizardStep(2);
  };

  const handleAddBatchRow = () => {
    setBatches([...batches, { batchNumber: '', quantity: '', expiryDate: '', purchasePrice: '', sellingPrice: '', supplier: '' }]);
  };

  const handleBatchRowChange = (index, field, value) => {
    const next = [...batches];
    next[index][field] = value;
    setBatches(next);
  };

  const handleSaveImport = async () => {
    if (!clinicConfig.code || !clinicConfig.sellingPrice) {
      return toast.error('Medicine Code and Selling Price are required');
    }

    const formattedBatches = batches
      .filter(b => b.batchNumber && b.quantity && b.expiryDate)
      .map(b => ({
        batchNumber: b.batchNumber,
        quantity: Number(b.quantity),
        expiryDate: b.expiryDate,
        purchasePrice: Number(b.purchasePrice || clinicConfig.purchasePrice || 0),
        sellingPrice: Number(b.sellingPrice || clinicConfig.sellingPrice || 0),
        supplier: b.supplier
      }));

    const payload = {
      globalMedicineId: selectedGlobalMed._id,
      code: clinicConfig.code,
      purchasePrice: Number(clinicConfig.purchasePrice || 0),
      sellingPrice: Number(clinicConfig.sellingPrice || 0),
      unitPrice: Number(clinicConfig.sellingPrice || 0),
      gst: Number(clinicConfig.gst || 0),
      discount: Number(clinicConfig.discount || 0),
      minimumStock: Number(clinicConfig.minimumStock || 0),
      reorderLevel: Number(clinicConfig.reorderLevel || 0),
      rackNumber: clinicConfig.rackNumber,
      storageLocation: clinicConfig.storageLocation,
      requiresPrescription: clinicConfig.requiresPrescription,
      batches: formattedBatches
    };

    try {
      await createMedicine(payload);
      toast.success(`${selectedGlobalMed.displayName} imported successfully`);
      setIsImportOpen(false);
      setSelectedGlobalMed(null);
      setWizardStep(1);
      loadLocalMedicines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import medicine');
    }
  };

  // Bulk Import
  const handleToggleGlobalSelect = (id) => {
    if (selectedGlobalItems.includes(id)) {
      setSelectedGlobalItems(selectedGlobalItems.filter(item => item !== id));
    } else {
      setSelectedGlobalItems([...selectedGlobalItems, id]);
    }
  };

  const handleImportSelectedBulk = async () => {
    if (selectedGlobalItems.length === 0) return;
    try {
      let importedCount = 0;
      for (const id of selectedGlobalItems) {
        const item = globalResults.find(r => r._id === id);
        if (!item) continue;

        const payload = {
          globalMedicineId: item._id,
          code: item.globalId,
          purchasePrice: 0,
          sellingPrice: 100, // standard default
          unitPrice: 100,
          gst: 12,
          minimumStock: 10,
          reorderLevel: 20,
          requiresPrescription: true,
          batches: []
        };
        try {
          await createMedicine(payload);
          importedCount++;
        } catch (err) {
          console.error('Bulk item already exists:', item.displayName);
        }
      }
      toast.success(`Imported ${importedCount} medicines successfully`);
      setSelectedGlobalItems([]);
      setIsImportOpen(false);
      loadLocalMedicines();
    } catch (err) {
      toast.error('Bulk import completed with errors');
    }
  };

  // Fetch forecast data on select
  const handleInspectMedicine = async (med) => {
    setSelectedMed(med);
    setIsDetailOpen(true);
    setForecastData(null);
    try {
      setLoadingForecast(true);
      const res = await getMedicineForecast(med._id);
      setForecastData(res.data?.forecast || res.forecast || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingForecast(false);
    }
  };

  // Add Batch
  const handleAddBatchSubmit = async (e) => {
    e.preventDefault();
    if (!newBatch.batchNumber || !newBatch.quantity || !newBatch.expiryDate) {
      return toast.error('Batch Number, Quantity and Expiry are required');
    }

    try {
      await addMedicineBatch(selectedMed._id, {
        batchNumber: newBatch.batchNumber,
        quantity: Number(newBatch.quantity),
        expiryDate: newBatch.expiryDate,
        purchasePrice: Number(newBatch.purchasePrice || selectedMed.purchasePrice || 0),
        sellingPrice: Number(newBatch.sellingPrice || selectedMed.sellingPrice || 0),
        supplier: newBatch.supplier,
        invoiceNumber: newBatch.invoiceNumber
      });
      toast.success('Batch registered successfully');
      setIsAddBatchOpen(false);
      
      // Reload medicine details
      const updated = await listMedicines({ search: selectedMed.name });
      const found = (updated.data?.medicines || updated.medicines || []).find(m => m._id === selectedMed._id);
      if (found) setSelectedMed(found);
      loadLocalMedicines();
    } catch (err) {
      toast.error('Failed to register batch');
    }
  };

  // Edit Configuration
  const handleOpenEditConfig = () => {
    setEditConfigForm({
      code: selectedMed.code,
      sellingPrice: selectedMed.sellingPrice,
      gst: selectedMed.gst,
      minimumStock: selectedMed.minimumStock,
      reorderLevel: selectedMed.reorderLevel,
      rackNumber: selectedMed.rackNumber,
      storageLocation: selectedMed.storageLocation,
      requiresPrescription: selectedMed.requiresPrescription
    });
    setIsEditConfigOpen(true);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await updateMedicine(selectedMed._id, editConfigForm);
      toast.success('Clinic configuration updated');
      setIsEditConfigOpen(false);
      
      // Reload details
      const updated = await listMedicines({ search: selectedMed.name });
      const found = (updated.data?.medicines || updated.medicines || []).find(m => m._id === selectedMed._id);
      if (found) setSelectedMed(found);
      loadLocalMedicines();
    } catch (err) {
      toast.error('Failed to update clinic configuration');
    }
  };

  return (
    <div className="min-h-screen bg-white text-stone-800 font-sans pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-50 via-white to-stone-100/50 border-b border-stone-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded font-black tracking-wider uppercase">
              Clinic Workspace
            </span>
            <span className="text-stone-500 text-xs">Pharmacy Inventory</span>
          </div>
          <h1 className="text-2xl font-black mt-1 text-stone-900 flex items-center gap-2">
            Local Dispensary Inventory <Package className="w-5 h-5 text-indigo-500" />
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Import From Global Catalog
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="px-6 mt-6 flex justify-between items-center border-b border-stone-200">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('all')}
            className={`py-3 text-xs font-black border-b-2 transition ${activeTab === 'all' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            All Medicines
          </button>
          <button 
            onClick={() => setActiveTab('low_stock')}
            className={`py-3 text-xs font-black border-b-2 transition ${activeTab === 'low_stock' ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            Low Stock Alerts
          </button>
          <button 
            onClick={() => setActiveTab('near_expiry')}
            className={`py-3 text-xs font-black border-b-2 transition ${activeTab === 'near_expiry' ? 'border-rose-500 text-rose-600' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            Near Expiry / Expired
          </button>
        </div>

        <div className="relative w-full max-w-xs mb-2">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clinic inventory..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-550 border border-stone-200 text-xs focus:outline-none focus:border-indigo-500 text-stone-800"
          />
        </div>
      </div>

      {/* Main Grid View / List */}
      <div className="p-6">
        {loading ? (
          <div className="py-20 text-center text-stone-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <span>Syncing dispensary records...</span>
          </div>
        ) : medicines.length === 0 ? (
          <div className="border border-dashed border-stone-200 rounded-3xl p-16 text-center max-w-xl mx-auto space-y-4">
            <Package className="w-12 h-12 mx-auto text-stone-300" />
            <h3 className="text-lg font-black text-stone-700">No Medicines Imported</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              Import medicines from the Global Healthcare Catalog to start managing your pharmacy inventory and dispensing prescriptions.
            </p>
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
            >
              Import Medicines
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {medicines.map(med => {
              const totalStock = med.totalStock || 0;
              const reorder = med.reorderLevel || 10;
              const isLowStock = totalStock <= reorder;

              return (
                <div 
                  key={med._id} 
                  onClick={() => handleInspectMedicine(med)}
                  className="border border-stone-200 bg-stone-50 hover:bg-stone-100/60 transition rounded-3xl p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-lg hover:border-stone-300"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] bg-stone-200 text-stone-600 font-mono px-2 py-0.5 rounded">
                        {med.code}
                      </span>
                      {isLowStock && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-stone-850 text-base leading-tight mt-2.5">{med.name}</h3>
                    <span className="text-[11px] text-stone-500 block mt-0.5">{med.genericName}</span>

                    <div className="flex gap-1.5 mt-3">
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 rounded text-[9px] font-bold">
                        {med.form}
                      </span>
                      <span className="px-1.5 py-0.5 bg-stone-200 text-stone-600 rounded text-[9px] font-bold">
                        {med.strength}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[9px] text-stone-400 block uppercase font-bold">In Stock</span>
                      <span className={`text-base font-black ${isLowStock ? 'text-amber-600' : 'text-stone-700'}`}>
                        {totalStock} units
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-stone-400 block uppercase font-bold">Selling Price</span>
                      <span className="text-sm font-black text-indigo-600">₹{med.sellingPrice}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULLSCREEN IMPORT FROM GLOBAL CATALOG MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-205 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" /> Import From Global Catalog
                </h3>
                <span className="text-xs text-stone-500">Search and map master medicines to local dispensary</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setSelectedGlobalMed(null);
                  setWizardStep(1);
                }}
                className="p-2 hover:bg-stone-100 rounded-xl text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Catalog Search List */}
            {wizardStep === 1 && (
              <div className="p-6 flex flex-col overflow-y-auto flex-1 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search global medicines catalog by Brand name, Generic formula, or Manufacturer..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-stone-200 text-sm text-stone-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {searchingGlobal && (
                  <div className="py-10 text-center text-stone-500 flex justify-center items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                    <span>Searching catalog repository...</span>
                  </div>
                )}

                {globalResults.length > 0 ? (
                  <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/20 divide-y divide-stone-200 overflow-y-auto flex-1 max-h-80">
                    {globalResults.map(item => {
                      const isSelected = selectedGlobalItems.includes(item._id);
                      return (
                        <div key={item._id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition">
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleToggleGlobalSelect(item._id)}>
                              {isSelected ? (
                                <CheckCircle className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <Square className="w-5 h-5 text-stone-300" />
                              )}
                            </button>
                            <div>
                              <span className="text-[10px] text-stone-400 font-bold block">{item.globalId} • {item.medicineType}</span>
                              <span className="font-black text-stone-800 text-sm">{item.displayName}</span>
                              <span className="text-[10px] text-stone-500 block mt-0.5">
                                Generic: {item.genericName} • Manufacturer: {item.manufacturer}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleStartImportWizard(item)}
                            className="px-3.5 py-1.5 bg-indigo-600/10 text-indigo-600 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            Configure <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !searchingGlobal && globalSearch.trim().length >= 2 && (
                    <div className="py-10 text-center text-stone-400 text-xs space-y-3">
                      <p>No matching records found in global catalog.</p>
                      <button
                        onClick={() => {
                          setDraftForm({
                            displayName: globalSearch,
                            genericName: '',
                            brandName: globalSearch,
                            strength: '',
                            dosageForm: 'Tablet',
                            manufacturer: '',
                            category: categoriesList[0]?._id || '',
                            medicineType: 'Generic'
                          });
                          setIsDraftOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl font-bold transition shadow-md shadow-indigo-600/10"
                      >
                        ➕ Submit New Medicine Draft
                      </button>
                    </div>
                  )
                )}

                {/* Bulk actions footer */}
                {selectedGlobalItems.length > 0 && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-600">{selectedGlobalItems.length} global medicines selected</span>
                    <button 
                      onClick={handleImportSelectedBulk}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition"
                    >
                      Import Selected
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Wizard Config Step */}
            {wizardStep === 2 && selectedGlobalMed && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-stone-700">
                {/* Global Read-Only Display */}
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                      Global Catalog Standard
                    </span>
                    <span className="font-mono text-stone-400">{selectedGlobalMed.globalId}</span>
                  </div>
                  <h4 className="text-base font-black text-stone-800">{selectedGlobalMed.displayName}</h4>
                  <p className="text-stone-600">
                    Generic: <strong>{selectedGlobalMed.genericName}</strong> • Form: <strong>{selectedGlobalMed.dosageForm}</strong> • Strength: <strong>{selectedGlobalMed.strength}</strong> • Manufacturer: <strong>{selectedGlobalMed.manufacturer}</strong>
                  </p>
                </div>

                {/* Step 3: Clinic Configuration Form */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-emerald-600 uppercase tracking-wider">Dispensary Settings</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Medicine Code</label>
                      <input 
                        type="text" 
                        value={clinicConfig.code} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, code: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Selling Price (MRP)</label>
                      <input 
                        type="number" 
                        value={clinicConfig.sellingPrice} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, sellingPrice: e.target.value })}
                        placeholder="₹"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">GST %</label>
                      <input 
                        type="number" 
                        value={clinicConfig.gst} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, gst: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Min Alert Stock</label>
                      <input 
                        type="number" 
                        value={clinicConfig.minimumStock} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, minimumStock: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Reorder Level</label>
                      <input 
                        type="number" 
                        value={clinicConfig.reorderLevel} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, reorderLevel: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Rack Number</label>
                      <input 
                        type="text" 
                        value={clinicConfig.rackNumber} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, rackNumber: e.target.value })}
                        placeholder="e.g. Rack A"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Storage Location</label>
                      <input 
                        type="text" 
                        value={clinicConfig.storageLocation} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, storageLocation: e.target.value })}
                        placeholder="e.g. Cabinet 3"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="prescription_req"
                      checked={clinicConfig.requiresPrescription} 
                      onChange={(e) => setClinicConfig({ ...clinicConfig, requiresPrescription: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 bg-white border-stone-250 rounded"
                    />
                    <label htmlFor="prescription_req" className="text-stone-600 font-bold">Requires Prescription for dispensing</label>
                  </div>
                </div>

                {/* Step 4: Opening Stock Batches */}
                <div className="space-y-4 border-t border-stone-200 pt-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-amber-600 uppercase tracking-wider">Opening Stock Batches</h4>
                    <button 
                      type="button" 
                      onClick={handleAddBatchRow}
                      className="px-2.5 py-1 bg-stone-105 hover:bg-stone-200 border border-stone-300 rounded-lg font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Batch Row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {batches.map((b, idx) => (
                      <div key={idx} className="grid grid-cols-6 gap-2 bg-stone-50 p-3 border border-stone-200 rounded-2xl">
                        <div className="space-y-1">
                          <label className="text-stone-500 uppercase text-[9px] block">Batch ID</label>
                          <input 
                            type="text" 
                            placeholder="e.g. B-01"
                            value={b.batchNumber} 
                            onChange={(e) => handleBatchRowChange(idx, 'batchNumber', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-stone-800 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-stone-500 uppercase text-[9px] block">Quantity</label>
                          <input 
                            type="number" 
                            placeholder="Units"
                            value={b.quantity} 
                            onChange={(e) => handleBatchRowChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-stone-800 text-xs"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-stone-500 uppercase text-[9px] block">Expiry Date</label>
                          <input 
                            type="date" 
                            value={b.expiryDate} 
                            onChange={(e) => handleBatchRowChange(idx, 'expiryDate', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-stone-800 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-stone-500 uppercase text-[9px] block">Pur. Price</label>
                          <input 
                            type="number" 
                            placeholder="₹"
                            value={b.purchasePrice} 
                            onChange={(e) => handleBatchRowChange(idx, 'purchasePrice', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-stone-800 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-stone-500 uppercase text-[9px] block">Supplier</label>
                          <input 
                            type="text" 
                            placeholder="Name"
                            value={b.supplier} 
                            onChange={(e) => handleBatchRowChange(idx, 'supplier', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg text-stone-800 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-2 bg-stone-50">
              {wizardStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 border border-stone-300 bg-white rounded-xl text-xs font-bold hover:bg-stone-50 text-stone-500"
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 border border-stone-300 bg-white rounded-xl text-xs font-bold hover:bg-stone-50 text-stone-500"
                  >
                    Back to Search
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    Save & Map to Inventory
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW DRAFT MEDICINE CREATION DIALOG */}
      {isDraftOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" /> Create New Medicine Draft
              </h3>
              <button 
                type="button" 
                onClick={() => setIsDraftOpen(false)} 
                className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDraft} className="p-6 space-y-4 text-xs text-stone-700">
              <div className="space-y-1">
                <label className="text-stone-500 font-bold uppercase text-[10px]">Medicine Type</label>
                <select
                  value={draftForm.medicineType}
                  onChange={(e) => setDraftForm({ ...draftForm, medicineType: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                >
                  <option value="Generic">Generic</option>
                  <option value="Brand-First">Brand-First</option>
                  <option value="Combination">Combination</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-bold uppercase text-[10px]">Display Name *</label>
                <input 
                  type="text" 
                  value={draftForm.displayName} 
                  onChange={(e) => setDraftForm({ ...draftForm, displayName: e.target.value })}
                  required
                  placeholder="e.g. Paracetamol 500mg"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-stone-500 font-bold uppercase text-[10px]">Brand Name</label>
                  <input 
                    type="text" 
                    value={draftForm.brandName} 
                    onChange={(e) => setDraftForm({ ...draftForm, brandName: e.target.value })}
                    placeholder="e.g. Crocin"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-500 font-bold uppercase text-[10px]">Generic Name</label>
                  <input 
                    type="text" 
                    value={draftForm.genericName} 
                    onChange={(e) => setDraftForm({ ...draftForm, genericName: e.target.value })}
                    placeholder="e.g. Paracetamol"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-stone-500 font-bold uppercase text-[10px]">Strength</label>
                  <input 
                    type="text" 
                    value={draftForm.strength} 
                    onChange={(e) => setDraftForm({ ...draftForm, strength: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-500 font-bold uppercase text-[10px]">Dosage Form *</label>
                  <input 
                    type="text" 
                    value={draftForm.dosageForm} 
                    onChange={(e) => setDraftForm({ ...draftForm, dosageForm: e.target.value })}
                    required
                    placeholder="e.g. Tablet, Syrup"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-stone-500 font-bold uppercase text-[10px]">Manufacturer</label>
                  <input 
                    type="text" 
                    value={draftForm.manufacturer} 
                    onChange={(e) => setDraftForm({ ...draftForm, manufacturer: e.target.value })}
                    placeholder="e.g. GSK"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-500 font-bold uppercase text-[10px]">Category *</label>
                  <select
                    value={draftForm.category}
                    onChange={(e) => setDraftForm({ ...draftForm, category: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categoriesList.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-2 bg-stone-50 -mx-6 -mb-6 mt-6">
                <button
                  type="button"
                  onClick={() => setIsDraftOpen(false)}
                  className="px-4 py-2 border border-stone-300 bg-white rounded-xl text-xs font-bold hover:bg-stone-50 text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-755 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  Submit Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-PANEL DETAIL VIEW INSPECTOR */}
      {isDetailOpen && selectedMed && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Layout className="w-5 h-5 text-indigo-650" /> Medicine Specification Inspector
              </h3>
              <button 
                type="button" 
                onClick={() => setIsDetailOpen(false)} 
                className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* The 3 Panels Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-200 overflow-y-auto flex-1 text-xs text-stone-700">
              
              {/* PANEL 1: Global Information (Read-Only) */}
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider">Global Profile</h4>
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded text-[9px] font-black uppercase">
                    Global Catalog
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Medicine Name</span>
                    <span className="text-sm font-black text-stone-800">{selectedMed.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Generic Formula</span>
                    <span className="text-stone-600 block font-semibold">{selectedMed.genericName || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Dosage Form</span>
                      <span className="text-stone-600 block">{selectedMed.form}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Strength</span>
                      <span className="text-stone-600 block">{selectedMed.strength}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Manufacturer</span>
                    <span className="text-stone-600 block">{selectedMed.manufacturer || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Category</span>
                    <span className="text-stone-600 block">{selectedMed.category || 'General'}</span>
                  </div>
                </div>
              </div>

              {/* PANEL 2: Clinic Configuration (Editable) */}
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider">Dispensary Setup</h4>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded text-[9px] font-black uppercase">
                    Clinic Settings
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Local Code</span>
                      <span className="text-stone-600 block font-mono">{selectedMed.code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Selling Price</span>
                      <span className="text-stone-800 block font-black">₹{selectedMed.sellingPrice}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">GST</span>
                      <span className="text-stone-600 block">{selectedMed.gst}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Min Stock</span>
                      <span className="text-stone-600 block">{selectedMed.minimumStock}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Reorder Level</span>
                      <span className="text-stone-600 block">{selectedMed.reorderLevel}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Storage Area</span>
                      <span className="text-stone-600 block">{selectedMed.storageLocation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Rack Number</span>
                      <span className="text-stone-600 block">{selectedMed.rackNumber || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Prescription Required</span>
                    <span className="text-stone-600 block font-bold">{selectedMed.requiresPrescription ? 'Yes' : 'No'}</span>
                  </div>

                  <button
                    onClick={handleOpenEditConfig}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl font-bold flex items-center justify-center gap-1.5 mt-4"
                  >
                    <Edit2 className="w-4 h-4 text-emerald-600" /> Edit Clinic Setup
                  </button>
                </div>
              </div>

              {/* PANEL 3: Inventory / Batches & Forecast (Live Data) */}
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider">Stock & Batches</h4>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded text-[9px] font-black uppercase">
                    Inventory
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-stone-50 rounded-2xl flex justify-between items-center border border-stone-200">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Total Stock</span>
                      <span className="text-xl font-black text-stone-800">{selectedMed.totalStock || 0} units</span>
                    </div>
                    <button
                      onClick={() => setIsAddBatchOpen(true)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Batch
                    </button>
                  </div>

                  {/* Batches list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Active Batches</span>
                    {(selectedMed.batches || []).length === 0 ? (
                      <span className="text-stone-500 italic block">No active stock batches registered.</span>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {selectedMed.batches.map((batch, index) => (
                          <div key={index} className="p-2 border border-stone-200 bg-stone-50 rounded-xl flex justify-between items-center text-[10px]">
                            <div>
                              <span className="font-bold text-stone-700 block">Batch {batch.batchNumber}</span>
                              <span className="text-[9px] text-stone-400">Exp: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <span className="font-black text-indigo-600">{batch.availableStock || batch.quantity} units</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reorder / Forecast insights */}
                  {forecastData && (
                    <div className="border border-indigo-100 bg-indigo-50/50 p-3 rounded-2xl space-y-1.5">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Reorder Forecast (Assistive AI)
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-600">
                        <div>
                          <span>Est. 30 Day Demand:</span>
                          <strong className="block text-stone-800">{forecastData.next_30_days_demand || 0} units</strong>
                        </div>
                        <div>
                          <span>Risk Profile:</span>
                          <strong className={`block uppercase font-black ${forecastData.stockout_risk === 'high' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {forecastData.stockout_risk}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end bg-stone-50">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
              >
                Dismiss Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CONFIG DIALOG */}
      {isEditConfigOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-100">Modify Clinic Dispensary Config</h3>
              <button type="button" onClick={() => setIsEditConfigOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[10px]">Medicine Code</label>
                <input 
                  type="text" 
                  value={editConfigForm.code} 
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[10px]">Selling Price</label>
                <input 
                  type="number" 
                  value={editConfigForm.sellingPrice} 
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, sellingPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Min Stock Alert</label>
                  <input 
                    type="number" 
                    value={editConfigForm.minimumStock} 
                    onChange={(e) => setEditConfigForm({ ...editConfigForm, minimumStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Reorder Level</label>
                  <input 
                    type="number" 
                    value={editConfigForm.reorderLevel} 
                    onChange={(e) => setEditConfigForm({ ...editConfigForm, reorderLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Rack Number</label>
                  <input 
                    type="text" 
                    value={editConfigForm.rackNumber} 
                    onChange={(e) => setEditConfigForm({ ...editConfigForm, rackNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Storage Location</label>
                  <input 
                    type="text" 
                    value={editConfigForm.storageLocation} 
                    onChange={(e) => setEditConfigForm({ ...editConfigForm, storageLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="edit_prescription_req"
                  checked={editConfigForm.requiresPrescription} 
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, requiresPrescription: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded"
                />
                <label htmlFor="edit_prescription_req" className="text-slate-300 font-bold">Requires Prescription</label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsEditConfigOpen(false)}
                className="px-4 py-2 border border-slate-700 bg-slate-900 rounded-xl text-xs font-bold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
              >
                Apply Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD BATCH DIALOG */}
      {isAddBatchOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddBatchSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-100">Add Stock Batch</h3>
              <button type="button" onClick={() => setIsAddBatchOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Batch Number</label>
                  <input 
                    type="text" 
                    required
                    value={newBatch.batchNumber} 
                    onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                    placeholder="e.g. BATCH-99"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Quantity</label>
                  <input 
                    type="number" 
                    required
                    value={newBatch.quantity} 
                    onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
                    placeholder="Units count"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[10px]">Expiry Date</label>
                <input 
                  type="date" 
                  required
                  value={newBatch.expiryDate} 
                  onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Purchase Price</label>
                  <input 
                    type="number" 
                    value={newBatch.purchasePrice} 
                    onChange={(e) => setNewBatch({ ...newBatch, purchasePrice: e.target.value })}
                    placeholder="₹"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Supplier</label>
                  <input 
                    type="text" 
                    value={newBatch.supplier} 
                    onChange={(e) => setNewBatch({ ...newBatch, supplier: e.target.value })}
                    placeholder="Distributor"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsAddBatchOpen(false)}
                className="px-4 py-2 border border-slate-700 bg-slate-900 rounded-xl text-xs font-bold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
              >
                Register Batch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MedicineCatalogPage;
