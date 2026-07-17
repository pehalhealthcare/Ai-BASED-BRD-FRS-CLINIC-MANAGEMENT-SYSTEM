import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, ArrowLeft, Calendar, FileText, CheckCircle2,
  ChevronLeft, ChevronRight, AlertTriangle, AlertCircle,
  Building2, Package, Layers, Info, Check, HelpCircle,
  Activity, Star, Sparkles, Filter, Shield, Eye, X,
  MoreVertical, Edit2, Ban, RefreshCw, BarChart2, CheckCircle,
  Link, Layout, EyeOff, Trash2, ArrowUpRight, Square, CheckSquare
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { createLabTest, listLabTests, updateLabTest } from './labApi';
import { healthcareCatalogApi } from '../../lib/api';
import { toast } from 'react-hot-toast';

const LabTestCatalogPage = () => {
  const { user } = useAuth();
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Dialog / Modal states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  // Global search & bulk states
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalResults, setGlobalResults] = useState([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [selectedGlobalItems, setSelectedGlobalItems] = useState([]);

  // Import wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedGlobalTest, setSelectedGlobalTest] = useState(null);
  const [clinicConfig, setClinicConfig] = useState({
    code: '',
    price: '',
    testPrice: '',
    turnaroundTime: '24 Hours',
    homeCollectionAvailable: false,
    sampleCollectionFee: 0,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    isActive: true
  });

  // Edit Clinic Config states
  const [isEditConfigOpen, setIsEditConfigOpen] = useState(false);
  const [editConfigForm, setEditConfigForm] = useState({
    code: '',
    price: '',
    testPrice: '',
    turnaroundTime: '24 Hours',
    homeCollectionAvailable: false,
    sampleCollectionFee: 0,
    availableDays: [],
    isActive: true
  });

  useEffect(() => {
    loadLocalTests();
  }, [searchQuery, selectedCategory]);

  const loadLocalTests = async () => {
    try {
      setLoading(true);
      const res = await listLabTests({
        search: searchQuery,
        category: selectedCategory,
        limit: 100
      });
      setLabTests(res.data?.labTests || res.labTests || []);
    } catch (err) {
      toast.error('Failed to load clinic lab catalog');
    } finally {
      setLoading(false);
    }
  };

  // Search Global Laboratory Tests Catalog
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
      // Use /search/labs which is accessible to clinic admins (read-only)
      const res = await healthcareCatalogApi.searchLabTests({ search: globalSearch, limit: 15 });
      // API returns { success, data: { total, items } } — items are under res.data
      setGlobalResults(res.data?.items || res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingGlobal(false);
    }
  };

  // Import single test wizard
  const handleStartImportWizard = (test) => {
    setSelectedGlobalTest(test);
    setClinicConfig({
      code: test.globalId || '',
      price: '',
      testPrice: '',
      turnaroundTime: test.normalReportingTime || '24 Hours',
      homeCollectionAvailable: false,
      sampleCollectionFee: 0,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      isActive: true
    });
    setWizardStep(2);
  };

  const handleSaveImport = async () => {
    if (!clinicConfig.code || !clinicConfig.testPrice) {
      return toast.error('Test Code and Price are required');
    }

    const payload = {
      globalLabTestId: selectedGlobalTest._id,
      code: clinicConfig.code,
      price: Number(clinicConfig.testPrice || 0),
      testPrice: Number(clinicConfig.testPrice || 0),
      turnaroundTime: clinicConfig.turnaroundTime,
      homeCollectionAvailable: clinicConfig.homeCollectionAvailable,
      sampleCollectionFee: Number(clinicConfig.sampleCollectionFee || 0),
      availableDays: clinicConfig.availableDays,
      isActive: clinicConfig.isActive
    };

    try {
      await createLabTest(payload);
      toast.success(`${selectedGlobalTest.name} imported successfully`);
      setIsImportOpen(false);
      setSelectedGlobalTest(null);
      setWizardStep(1);
      loadLocalTests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import lab test');
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
          globalLabTestId: item._id,
          code: item.globalId,
          price: 500, // standard default
          testPrice: 500,
          turnaroundTime: item.normalReportingTime || '24 Hours',
          homeCollectionAvailable: false,
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          isActive: true
        };
        try {
          await createLabTest(payload);
          importedCount++;
        } catch (err) {
          console.error('Bulk item already exists:', item.name);
        }
      }
      toast.success(`Imported ${importedCount} lab tests successfully`);
      setSelectedGlobalItems([]);
      setIsImportOpen(false);
      loadLocalTests();
    } catch (err) {
      toast.error('Bulk import completed with errors');
    }
  };

  // Edit Configuration
  const handleOpenEditConfig = () => {
    setEditConfigForm({
      code: selectedTest.code,
      price: selectedTest.price || selectedTest.testPrice,
      testPrice: selectedTest.testPrice || selectedTest.price,
      turnaroundTime: selectedTest.turnaroundTime,
      homeCollectionAvailable: selectedTest.homeCollectionAvailable,
      sampleCollectionFee: selectedTest.sampleCollectionFee,
      availableDays: selectedTest.availableDays || [],
      isActive: selectedTest.isActive
    });
    setIsEditConfigOpen(true);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await updateLabTest(selectedTest._id, {
        code: editConfigForm.code,
        price: Number(editConfigForm.testPrice),
        testPrice: Number(editConfigForm.testPrice),
        turnaroundTime: editConfigForm.turnaroundTime,
        homeCollectionAvailable: editConfigForm.homeCollectionAvailable,
        sampleCollectionFee: Number(editConfigForm.sampleCollectionFee),
        availableDays: editConfigForm.availableDays,
        isActive: editConfigForm.isActive
      });
      toast.success('Lab test setup updated');
      setIsEditConfigOpen(false);
      
      // Reload details
      const updated = await listLabTests({ search: selectedTest.name });
      const found = (updated.data?.labTests || updated.labTests || []).find(t => t._id === selectedTest._id);
      if (found) setSelectedTest(found);
      loadLocalTests();
    } catch (err) {
      toast.error('Failed to update lab test setup');
    }
  };

  return (
    <div className="min-h-screen bg-white text-stone-800 font-sans pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-50 via-white to-stone-100/50 border-b border-stone-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-550/10 text-emerald-600 px-2 py-0.5 rounded font-black tracking-wider uppercase">
              Clinic Workspace
            </span>
            <span className="text-stone-500 text-xs">Laboratory Catalog</span>
          </div>
          <h1 className="text-2xl font-black mt-1 text-stone-900 flex items-center gap-2">
            Local Lab Catalog <Layers className="w-5 h-5 text-emerald-600" />
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" /> Import Test From Global Catalog
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-stone-200">
        <div className="flex gap-2 w-full md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local lab tests..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-xs focus:outline-none focus:border-emerald-500 text-stone-800"
            />
          </div>
        </div>
      </div>

      {/* Local Tests Table */}
      <div className="p-6">
        {loading ? (
          <div className="py-20 text-center text-stone-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-650 mb-2" />
            <span>Syncing laboratory catalogs...</span>
          </div>
        ) : labTests.length === 0 ? (
          <div className="border border-dashed border-stone-200 rounded-3xl p-16 text-center max-w-xl mx-auto space-y-4">
            <Layers className="w-12 h-12 mx-auto text-stone-300" />
            <h3 className="text-lg font-black text-stone-700">No Laboratory Tests Imported</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              Import laboratory tests from the Global Healthcare Catalog to start booking tests and recording lab analysis reports.
            </p>
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
            >
              Import Laboratory Tests
            </button>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 uppercase tracking-wider font-bold">
                  <th className="py-4 px-5">Test Details</th>
                  <th className="py-4 px-5">Category</th>
                  <th className="py-4 px-5">Specimen</th>
                  <th className="py-4 px-5">turnaround</th>
                  <th className="py-4 px-5">Price</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-750">
                {labTests.map(test => (
                  <tr 
                    key={test._id} 
                    onClick={() => {
                      setSelectedTest(test);
                      setIsDetailOpen(true);
                    }}
                    className="hover:bg-stone-50/60 transition cursor-pointer"
                  >
                    <td className="py-4 px-5">
                      <span className="text-[10px] text-stone-400 font-bold block">{test.code}</span>
                      <span className="font-black text-stone-800 text-sm">{test.name}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold text-[10px]">
                        {test.category || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-stone-600">{test.specimenType || 'N/A'}</td>
                    <td className="py-4 px-5 text-stone-600">{test.turnaroundTime || '24 Hours'}</td>
                    <td className="py-4 px-5 font-black text-emerald-600">₹{test.price || test.testPrice}</td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTest(test);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 hover:bg-stone-105 rounded-lg text-stone-400 hover:text-stone-650 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FULLSCREEN IMPORT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" /> Import From Global Catalog
                </h3>
                <span className="text-xs text-stone-500">Search and map master tests to local laboratory</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setSelectedGlobalTest(null);
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
                    placeholder="Search global lab tests by Name, Code or Department..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-stone-200 text-sm text-stone-850 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {searchingGlobal && (
                  <div className="py-10 text-center text-stone-500 flex justify-center items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
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
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Square className="w-5 h-5 text-stone-300" />
                              )}
                            </button>
                            <div>
                              <span className="text-[10px] text-stone-400 font-bold block">{item.globalId} • {item.department}</span>
                              <span className="font-black text-stone-800 text-sm">{item.name}</span>
                              <span className="text-[10px] text-stone-500 block mt-0.5">
                                Sample: {item.sampleType} • TAT: {item.normalReportingTime}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleStartImportWizard(item)}
                            className="px-3.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            Configure <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !searchingGlobal && globalSearch.trim().length >= 2 && (
                    <div className="py-10 text-center text-stone-400 text-xs">
                      No matching records found in global catalog.
                    </div>
                  )
                )}

                {/* Bulk actions footer */}
                {selectedGlobalItems.length > 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-600">{selectedGlobalItems.length} global tests selected</span>
                    <button 
                      onClick={handleImportSelectedBulk}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition"
                    >
                      Import Selected
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Wizard Config Step */}
            {wizardStep === 2 && selectedGlobalTest && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-stone-700">
                {/* Global Read-Only Display */}
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                      Global Catalog Standard
                    </span>
                    <span className="font-mono text-stone-400">{selectedGlobalTest.globalId}</span>
                  </div>
                  <h4 className="text-base font-black text-stone-800">{selectedGlobalTest.name}</h4>
                  <p className="text-stone-600">
                    Category: <strong>{selectedGlobalTest.category?.name || 'N/A'}</strong> • Methodology: <strong>{selectedGlobalTest.methodology}</strong> • Specimen: <strong>{selectedGlobalTest.sampleType}</strong> • Standard TAT: <strong>{selectedGlobalTest.normalReportingTime}</strong>
                  </p>
                </div>

                {/* Step 3: Clinic Configuration Form */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-emerald-600 uppercase tracking-wider">Dispensary Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Test Code</label>
                      <input 
                        type="text" 
                        value={clinicConfig.code} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, code: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Selling Price</label>
                      <input 
                        type="number" 
                        value={clinicConfig.testPrice} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, testPrice: e.target.value })}
                        placeholder="₹"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Processing TAT Override</label>
                      <input 
                        type="text" 
                        value={clinicConfig.turnaroundTime} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, turnaroundTime: e.target.value })}
                        placeholder="e.g. 12 Hours"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-500 font-bold uppercase text-[10px]">Sample Collection Fee</label>
                      <input 
                        type="number" 
                        value={clinicConfig.sampleCollectionFee} 
                        onChange={(e) => setClinicConfig({ ...clinicConfig, sampleCollectionFee: Number(e.target.value) })}
                        placeholder="₹"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="home_col"
                      checked={clinicConfig.homeCollectionAvailable} 
                      onChange={(e) => setClinicConfig({ ...clinicConfig, homeCollectionAvailable: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-white border-stone-200 rounded"
                    />
                    <label htmlFor="home_col" className="text-stone-600 font-bold">Home collection sample logistics available</label>
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
                    Save & Map to Catalog
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3-PANEL DETAIL VIEW INSPECTOR */}
      {isDetailOpen && selectedTest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Layout className="w-5 h-5 text-indigo-600" /> Lab Test Specification Inspector
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
                  <h4 className="text-xs font-black text-blue-650 uppercase tracking-wider">Global Profile</h4>
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded text-[9px] font-black uppercase">
                    Global Catalog
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-stone-450 font-bold block uppercase tracking-wider">Test name</span>
                    <span className="text-sm font-black text-stone-800">{selectedTest.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-450 font-bold block uppercase tracking-wider">Specimen sample</span>
                    <span className="text-stone-600 block font-semibold">{selectedTest.specimenType || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-450 font-bold block uppercase tracking-wider">Category</span>
                    <span className="text-stone-600 block">{selectedTest.category || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-450 font-bold block uppercase tracking-wider">Reference Normal Range</span>
                    <span className="text-stone-600 block font-mono">
                      {selectedTest.normalRange?.text || `${selectedTest.normalRange?.min || ''} - ${selectedTest.normalRange?.max || ''} ${selectedTest.unit || ''}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* PANEL 2: Clinic Configuration */}
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider">Laboratory Setup</h4>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded text-[9px] font-black uppercase">
                    Clinic Settings
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-stone-450 font-bold block uppercase tracking-wider">Local Code</span>
                      <span className="text-stone-600 block font-mono">{selectedTest.code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-450 font-bold block uppercase tracking-wider">Selling Price</span>
                      <span className="text-stone-800 block font-black">₹{selectedTest.price || selectedTest.testPrice}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-stone-450 font-bold block uppercase tracking-wider">Turnaround Time</span>
                      <span className="text-stone-600 block">{selectedTest.turnaroundTime}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-450 font-bold block uppercase tracking-wider">Collection logistics</span>
                      <span className="text-stone-600 block">{selectedTest.homeCollectionAvailable ? 'Home collection' : 'In-clinic only'}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenEditConfig}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl font-bold flex items-center justify-center gap-1.5 mt-4"
                  >
                    <Edit2 className="w-4 h-4 text-emerald-600" /> Edit Lab Setup
                  </button>
                </div>
              </div>

              {/* PANEL 3: Turnaround Days list */}
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider">Operational schedule</h4>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded text-[9px] font-black uppercase">
                    Operations
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-stone-450 uppercase tracking-wider block">Available testing days</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(selectedTest.availableDays || []).map(day => (
                        <span key={day} className="px-2 py-1 bg-stone-50 border border-stone-200 text-[10px] rounded-lg text-stone-700">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveConfig} className="bg-white border border-stone-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-stone-900">Modify Clinic Laboratory Config</h3>
              <button type="button" onClick={() => setIsEditConfigOpen(false)} className="p-2 hover:bg-stone-100 rounded-xl text-stone-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-stone-700">
              <div className="space-y-1">
                <label className="text-stone-500 font-bold uppercase text-[10px]">Test Code</label>
                <input 
                  type="text" 
                  value={editConfigForm.code} 
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-bold uppercase text-[10px]">Price (INR)</label>
                <input 
                  type="number" 
                  value={editConfigForm.testPrice} 
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, testPrice: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-bold uppercase text-[10px]">Processing Turnaround Time</label>
                <input 
                  type="text" 
                  value={editConfigForm.turnaroundTime} 
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, turnaroundTime: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-850"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-bold uppercase text-[10px]">Home sample collection logistics fee</label>
                <input 
                  type="number" 
                  value={editConfigForm.sampleCollectionFee} 
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, sampleCollectionFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="edit_home_col"
                  checked={editConfigForm.homeCollectionAvailable} 
                  onChange={(e) => setEditConfigForm({ ...editConfigForm, homeCollectionAvailable: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 bg-white border-stone-200 rounded"
                />
                <label htmlFor="edit_home_col" className="text-stone-600 font-bold">Home collection sample logistics available</label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-2 bg-stone-50">
              <button
                type="button"
                onClick={() => setIsEditConfigOpen(false)}
                className="px-4 py-2 border border-stone-300 bg-white rounded-xl text-xs font-bold text-stone-500"
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
    </div>
  );
};

export default LabTestCatalogPage;
