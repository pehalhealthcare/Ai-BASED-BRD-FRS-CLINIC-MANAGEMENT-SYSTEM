import React, { useState, useEffect } from 'react';
import { Plus, Download, Upload, Search, Edit2, SlidersHorizontal, RefreshCw, X, ChevronDown, ChevronRight, Check, AlertCircle, FileSpreadsheet, Package, Sparkles, AlertTriangle, Layers, Award, Trash2 } from 'lucide-react';
import { healthcareCatalogApi } from '../../lib/api';
import ImportModal from './ImportModal';
import toast from 'react-hot-toast';

const GlobalMedicinePage = () => {
  const [generics, setGenerics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchVal);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' or 'review-queue'
  
  // Stats
  const [totalMeds, setTotalMeds] = useState(0);
  const [totalVerified, setTotalVerified] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isClassifyOpen, setIsClassifyOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  
  // Category management
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    medicineType: 'Generic', // 'Generic' | 'Brand-First' | 'Combination'
    displayName: '',
    genericName: '',
    brandName: '',
    manufacturer: '',
    strength: '',
    dosageForm: 'Tablet',
    route: 'Oral',
    category: '',
    drugSchedule: '',
    activeIngredients: [{ name: '', strength: '' }],
    classificationStatus: 'Verified',
    description: '',
    isActive: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Get categories
      const catRes = await healthcareCatalogApi.getCategories({ type: 'MEDICINE' });
      setCategories(catRes?.data ?? catRes ?? []);

      // Get catalog
      const params = {
        search,
        category: selectedCategory,
        medicineType: selectedType,
        classificationStatus: activeTab === 'review-queue' ? 'Pending Classification' : selectedStatus,
        page,
        limit: 10
      };
      const res = await healthcareCatalogApi.getMedicines(params);
      const data = res?.data ?? res ?? {};
      setGenerics(data.items || []);
      setTotalMeds(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 10));

      // Fetch global counts for stats
      const allMedsRes = await healthcareCatalogApi.getMedicines({ limit: 1000 });
      const allMeds = allMedsRes?.data?.items ?? allMedsRes?.items ?? [];
      setTotalVerified(allMeds.filter(m => m.classificationStatus === 'Verified').length);
      setPendingCount(allMeds.filter(m => m.classificationStatus === 'Pending Classification').length);

    } catch (err) {
      toast.error('Failed to load global medicine catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, selectedType, selectedStatus, page, activeTab]);

  const handleOpenAdd = () => {
    setEditingMedicine(null);
    setFormData({
      medicineType: 'Generic',
      displayName: '',
      genericName: '',
      brandName: '',
      manufacturer: '',
      strength: '',
      dosageForm: 'Tablet',
      route: 'Oral',
      category: categories[0]?._id || '',
      drugSchedule: '',
      activeIngredients: [{ name: '', strength: '' }],
      classificationStatus: 'Verified',
      description: '',
      isActive: true
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (med) => {
    setEditingMedicine(med);
    setFormData({
      ...med,
      category: med.category?._id || med.category || '',
      activeIngredients: med.activeIngredients?.length ? med.activeIngredients : [{ name: '', strength: '' }]
    });
    setIsAddOpen(true);
  };

  const handleOpenClassify = (med) => {
    setEditingMedicine(med);
    setFormData({
      ...med,
      category: med.category?._id || med.category || '',
      activeIngredients: med.activeIngredients?.length ? med.activeIngredients : [{ name: '', strength: '' }]
    });
    setIsClassifyOpen(true);
  };

  const handleAddIngredient = () => {
    setFormData(prev => ({
      ...prev,
      activeIngredients: [...prev.activeIngredients, { name: '', strength: '' }]
    }));
  };

  const handleRemoveIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      activeIngredients: prev.activeIngredients.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...formData.activeIngredients];
    newIngredients[index][field] = value;
    setFormData(prev => ({ ...prev, activeIngredients: newIngredients }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      // Validation and dynamic formatting
      if (payload.medicineType === 'Generic') {
        payload.displayName = payload.genericName;
        payload.brandName = '';
        payload.activeIngredients = [{ name: payload.genericName, strength: payload.strength || 'N/A' }];
      } else if (payload.medicineType === 'Brand-First') {
        payload.displayName = payload.brandName;
        if (!payload.genericName) {
          payload.classificationStatus = 'Pending Classification';
        }
      } else if (payload.medicineType === 'Combination') {
        payload.displayName = payload.displayName || 'Combination Formula';
      }

      // Filter empty ingredients
      payload.activeIngredients = payload.activeIngredients.filter(i => i.name && i.strength);

      if (editingMedicine) {
        await healthcareCatalogApi.updateMedicine(editingMedicine._id, payload);
        toast.success('Medicine catalog updated successfully');
      } else {
        await healthcareCatalogApi.createMedicine(payload);
        toast.success('Medicine added successfully');
      }
      setIsAddOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save medicine');
    }
  };

  const handleConfirmClassification = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData,
        classificationStatus: 'Verified' 
      };
      
      if (payload.medicineType === 'Generic') {
        payload.displayName = payload.genericName;
      } else if (payload.medicineType === 'Brand-First') {
        payload.displayName = payload.brandName;
      }
      
      payload.activeIngredients = payload.activeIngredients.filter(i => i.name && i.strength);

      await healthcareCatalogApi.classifyMedicine(editingMedicine._id, payload);
      toast.success('Medicine successfully classified & verified');
      setIsClassifyOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Classification failed');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await healthcareCatalogApi.createCategory({
        name: newCategoryName,
        type: 'MEDICINE',
        description: newCategoryDesc
      });
      toast.success('Category added successfully');
      setNewCategoryName('');
      setNewCategoryDesc('');
      setIsCategoryOpen(false);
      const catRes = await healthcareCatalogApi.getCategories({ type: 'MEDICINE' });
      setCategories(catRes?.data ?? catRes ?? []);
    } catch (err) {
      toast.error('Failed to create category');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Brand Name (Leave blank if Generic only)',
      'Generic Composition',
      'Strength',
      'Dosage Form',
      'Category',
      'Route',
      'Drug Schedule',
      'Description'
    ];
    
    const sampleRow = [
      'Augmentin 625',
      'Amoxicillin 500mg + Clavulanic Acid 125mg',
      '625mg',
      'Tablet',
      'Antibiotics',
      'Oral',
      'Schedule H',
      'Combination penicillin-type antibiotic'
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), sampleRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'medicine_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Global Medicine Catalog
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">Multi-classification</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage generic formulas, brand-first imports, combination drugs, and classifications.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryOpen(true)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition"
          >
            Manage Categories
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition"
          >
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-2xl hover:opacity-95 transition shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" /> Add Medicine
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-black text-slate-400 uppercase block tracking-wider">Total Cataloged</span>
          <span className="text-3xl font-black text-slate-800 mt-2 block">{totalMeds}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-black text-slate-400 uppercase block tracking-wider">Verified Formula</span>
          <span className="text-3xl font-black text-emerald-600 mt-2 block">{totalVerified}</span>
        </div>
        {/* Classification Queue Widget */}
        <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-3xl flex justify-between items-center col-span-2">
          <div>
            <span className="text-xs font-black text-amber-600 uppercase block tracking-wider">Medicines Pending Classification</span>
            <span className="text-3xl font-black text-amber-700 mt-2 block">{pendingCount}</span>
          </div>
          <button
            onClick={() => {
              setActiveTab('review-queue');
              setPage(1);
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition"
          >
            Review Queue
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab('catalog');
            setPage(1);
          }}
          className={`px-6 py-3 font-bold text-sm -mb-px border-b-2 transition ${activeTab === 'catalog' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          Master Catalog
        </button>
        <button
          onClick={() => {
            setActiveTab('review-queue');
            setPage(1);
          }}
          className={`px-6 py-3 font-bold text-sm -mb-px border-b-2 transition flex items-center gap-2 ${activeTab === 'review-queue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          Review Queue
          {pendingCount > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-black">{pendingCount}</span>}
        </button>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
          {/* Row 1: Search Input (Full Width) */}
          <div className="w-full relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by generic, brand, active ingredient, ID or manufacturer..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Row 2: Selectors */}
          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            {activeTab !== 'review-queue' && (
              <>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="Generic">Generic</option>
                  <option value="Brand-First">Brand-First</option>
                  <option value="Combination">Combination</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Verified">Verified</option>
                  <option value="Pending Classification">Pending Classification</option>
                  <option value="Needs Review">Needs Review</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Medicine Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                <th className="px-6 py-4">Medicine ID</th>
                <th className="px-6 py-4">Display / Brand Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Composition / Active Ingredients</th>
                <th className="px-6 py-4">Dosage Form</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Fetching medicine catalog...
                  </td>
                </tr>
              ) : generics.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No medicines found.
                  </td>
                </tr>
              ) : (
                generics.map((med) => (
                  <tr key={med._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{med.globalId}</td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-800 block">{med.displayName}</span>
                        {med.manufacturer && <span className="text-[10px] text-slate-400 block mt-0.5">{med.manufacturer}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        med.medicineType === 'Combination' ? 'bg-indigo-50 text-indigo-700' :
                        med.medicineType === 'Brand-First' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {med.medicineType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {med.medicineType === 'Combination' ? (
                        <div className="space-y-1">
                          {med.activeIngredients?.map((ing, idx) => (
                            <span key={idx} className="inline-block bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-600 mr-1">
                              {ing.name} {ing.strength}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>{med.genericName || 'Not Assigned'} {med.strength}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{med.dosageForm}</td>
                    <td className="px-6 py-4">{med.category?.name || 'General'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        med.classificationStatus === 'Verified' ? 'bg-emerald-50 text-emerald-700' :
                        med.classificationStatus === 'Pending Classification' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {med.classificationStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {med.classificationStatus === 'Pending Classification' && (
                        <button
                          onClick={() => handleOpenClassify(med)}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                        >
                          Classify
                        </button>
                      )}
                      <button onClick={() => handleOpenEdit(med)} className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-600 inline-flex items-center gap-1 text-xs">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${med.displayName}" from the Global Medicine Catalogue?`)) {
                            try {
                              await healthcareCatalogApi.deleteMedicine(med._id);
                              toast.success('Medicine deleted from Global Catalogue successfully.');
                              loadData();
                            } catch (err) {
                              toast.error(err?.response?.data?.message || 'Failed to delete medicine');
                            }
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-xl transition text-red-500 inline-flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold">Showing page {page} of {totalPages || 1}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Medicine Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {editingMedicine ? 'Modify Master Medicine' : 'Add New Medicine Formula'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Type Selectors */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Medicine Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Generic', 'Brand-First', 'Combination'].map(type => (
                    <label
                      key={type}
                      className={`border p-3.5 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition ${
                        formData.medicineType === type ? 'border-blue-600 bg-blue-50/20 text-blue-700' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="medicineType"
                        value={type}
                        checked={formData.medicineType === type}
                        onChange={(e) => setFormData({ ...formData, medicineType: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-xs font-black">{type} Medicine</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* DYNAMIC FORM FIELDS */}
              {formData.medicineType === 'Generic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Generic / Active Chemical Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Paracetamol"
                        value={formData.genericName}
                        onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Strength</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500mg, 10ml"
                        value={formData.strength}
                        onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.medicineType === 'Brand-First' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Brand Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Crocin"
                        value={formData.brandName}
                        onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Manufacturer</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GSK"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Strength</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500mg"
                        value={formData.strength}
                        onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Generic Formula Mapping (Optional)</label>
                      <input
                        type="text"
                        placeholder="Pending classification if left blank"
                        value={formData.genericName}
                        onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.medicineType === 'Combination' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Combination Medicine Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Augmentin 625"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Manufacturer</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GSK"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Active Ingredients list */}
                  <div className="space-y-2 border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Active Ingredients</label>
                      <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        + Add Active Ingredient
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.activeIngredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            type="text"
                            required
                            placeholder="Ingredient (e.g. Amoxicillin)"
                            value={ing.name}
                            onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Strength (e.g. 500 mg)"
                            value={ing.strength}
                            onChange={(e) => handleIngredientChange(idx, 'strength', e.target.value)}
                            className="w-32 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                          />
                          {formData.activeIngredients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(idx)}
                              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Dosage Form</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tablet, Capsule, Syrup"
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  >
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Route of Administration</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oral, Intravenous"
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Drug Schedule</label>
                  <input
                    type="text"
                    placeholder="e.g. Schedule H, Over The Counter"
                    value={formData.drugSchedule}
                    onChange={(e) => setFormData({ ...formData, drugSchedule: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase">Description / Indications</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                />
              </div>

              <div className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Active Medicine Item</label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-95 transition shadow-lg shadow-blue-100">Save Medicine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Classify Medicine Modal */}
      {isClassifyOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-black text-slate-900">Classify & Verify Medicine</h3>
              </div>
              <button onClick={() => setIsClassifyOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 p-4 border-b border-amber-100 text-xs text-amber-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              You are classifying medicine <strong className="text-amber-950 font-bold">{editingMedicine?.displayName}</strong> ({editingMedicine?.globalId}). The medicine ID will remain immutable.
            </div>

            <form onSubmit={handleConfirmClassification} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Target Classification Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Generic', 'Combination'].map(type => (
                    <label
                      key={type}
                      className={`border p-3 rounded-2xl flex flex-col items-center gap-1 cursor-pointer hover:bg-slate-50 transition ${
                        formData.medicineType === type ? 'border-blue-600 bg-blue-50/20 text-blue-700' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="classifyType"
                        value={type}
                        checked={formData.medicineType === type}
                        onChange={() => setFormData({ ...formData, medicineType: type })}
                        className="sr-only"
                      />
                      <span className="text-xs font-black">{type} Medicine</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.medicineType === 'Generic' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Map to Generic Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paracetamol"
                      value={formData.genericName}
                      onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Strength</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 500mg"
                      value={formData.strength}
                      onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {formData.medicineType === 'Combination' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Formula Display Name</label>
                    <input
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2 border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Active Ingredients</label>
                      <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        + Add Ingredient
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.activeIngredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            type="text"
                            required
                            placeholder="Ingredient (e.g. Amoxicillin)"
                            value={ing.name}
                            onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Strength (e.g. 500 mg)"
                            value={ing.strength}
                            onChange={(e) => handleIngredientChange(idx, 'strength', e.target.value)}
                            className="w-32 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                          />
                          {formData.activeIngredients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(idx)}
                              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsClassifyOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-100">
                  Verify & Classify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {isCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Manage Master Categories</h3>
              <button onClick={() => setIsCategoryOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleCreateCategory} className="space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Create Category</h4>
                <input
                  type="text"
                  placeholder="Category Name (e.g. Cardiovascular)"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                />
                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
                  Create Category
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Universal Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        importType="MEDICINE"
        onImportComplete={loadData}
      />
    </div>
  );
};

export default GlobalMedicinePage;
