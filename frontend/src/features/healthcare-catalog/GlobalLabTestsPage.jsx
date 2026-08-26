import React, { useState, useEffect } from 'react';
import { Plus, Download, Upload, Search, Edit2, SlidersHorizontal, RefreshCw, X, HelpCircle, Check, AlertCircle, FileSpreadsheet, Trash, ArrowUp, ArrowDown } from 'lucide-react';
import { healthcareCatalogApi } from '../../lib/api';
import ImportModal from './ImportModal';
import toast from 'react-hot-toast';

const GlobalLabTestsPage = () => {
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('investigations');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTests, setTotalTests] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [importedToday, setImportedToday] = useState(0);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [viewingTest, setViewingTest] = useState(null);
  const [paramSearch, setParamSearch] = useState('');
  
  // Category management
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Mapping state
  const [mappedParameters, setMappedParameters] = useState([]);
  const [allParameters, setAllParameters] = useState([]);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [newMappingId, setNewMappingId] = useState('');
  const [newMappingRequired, setNewMappingRequired] = useState(true);

  // Paginated Available Parameters Mapper
  const [mapperSearch, setMapperSearch] = useState('');
  const [mapperParameters, setMapperParameters] = useState([]);
  const [mapperPage, setMapperPage] = useState(1);
  const [mapperHasMore, setMapperHasMore] = useState(true);
  const [mapperLoading, setMapperLoading] = useState(false);

  const loadMapperParameters = async (pageNum, searchStr, isLoadMore = false) => {
    if (!viewingTest) return;
    setMapperLoading(true);
    try {
      const excludeIds = mappedParameters.map(m => m.parameterId?._id || m.parameterId).filter(Boolean).join(',');
      const res = await healthcareCatalogApi.getParameters({
        search: searchStr,
        excludeIds,
        page: pageNum,
        limit: 5
      });
      const data = res?.data ?? res ?? {};
      const newItems = data.items || [];
      
      if (isLoadMore) {
        setMapperParameters(prev => [...prev, ...newItems]);
      } else {
        setMapperParameters(newItems);
      }
      setMapperPage(pageNum);
      // More pages exist if we got exactly 5 items and total is greater than current size
      const currentLoadedCount = (isLoadMore ? mapperParameters.length : 0) + newItems.length;
      setMapperHasMore(newItems.length === 5 && (data.total > currentLoadedCount));
    } catch (err) {
      toast.error('Failed to load available parameters');
    } finally {
      setMapperLoading(false);
    }
  };

  // Load mapped parameters for viewingTest
  useEffect(() => {
    if (viewingTest) {
      loadMappedParameters();
      loadAllParameters();
      // Initialize mapper list
      setMapperSearch('');
      setMapperParameters([]);
      setMapperPage(1);
      setMapperHasMore(true);
    }
  }, [viewingTest]);

  const loadMappedParameters = async () => {
    try {
      const res = await healthcareCatalogApi.getLabTestParameters(viewingTest._id);
      setMappedParameters(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to load mapped parameters');
    }
  };

  const loadAllParameters = async () => {
    try {
      const res = await healthcareCatalogApi.getParameters({ limit: 100 });
      setAllParameters(res?.data?.items || res?.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMappingPanel = () => {
    const nextState = !isMappingOpen;
    setIsMappingOpen(nextState);
    if (nextState) {
      setMapperSearch('');
      setMapperParameters([]);
      setMapperPage(1);
      setMapperHasMore(true);
      // Load first page of available parameters
      setTimeout(() => {
        loadMapperParameters(1, '', false);
      }, 50);
    }
  };

  const handleMapParameterDirectly = async (parameter) => {
    if (!viewingTest) return;

    const isAlreadyMapped = mappedParameters.some(m => (m.parameterId?._id || m.parameterId) === parameter._id);
    if (isAlreadyMapped) {
      toast.error((t) => (
        <div>
          <span className="font-extrabold block">Parameter Already Associated</span>
          <span className="text-xs">{parameter.name} is already associated with this investigation.</span>
        </div>
      ), { id: 'dup-map-toast', duration: 4000 });
      return;
    }

    try {
      await healthcareCatalogApi.mapParameterToLabTest(viewingTest._id, {
        parameterId: parameter._id,
        isRequired: true
      });
      toast.success((t) => (
        <div>
          <span className="font-extrabold block">Parameter Added</span>
          <span className="text-xs">{parameter.name} has been successfully added to {viewingTest.name}.</span>
        </div>
      ), { id: 'map-success-toast', duration: 4000 });

      // Refresh mapped parameters list immediately
      await loadMappedParameters();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to map parameter');
    }
  };

  const handleRemoveMapping = async (parameterId) => {
    if (!window.confirm('Are you sure you want to remove this parameter association?')) return;
    try {
      await healthcareCatalogApi.unmapParameterFromLabTest(viewingTest._id, parameterId);
      toast.success('Parameter unmapped successfully');
      loadMappedParameters();
    } catch (err) {
      toast.error('Failed to unmap parameter');
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    alternateNamesString: '',
    department: 'Hematology',
    category: '',
    sampleType: 'Blood',
    sampleVolume: '',
    sampleContainer: '',
    methodology: '',
    clinicalDescription: '',
    patientPreparation: '',
    collectionInstructions: '',
    referenceRange: '',
    normalReportingTime: '24 Hours',
    internalCode: '',
    loincCode: '',
    investigationType: 'ATOMIC_TEST',
    isActive: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Get categories
      const catRes = await healthcareCatalogApi.getCategories({ type: 'LAB' });
      setCategories(catRes?.data ?? catRes ?? []);

      // Get lab tests
      const params = {
        search,
        category: selectedCategory,
        department: selectedDept,
        investigationType: selectedType,
        status: selectedStatus,
        page,
        limit: 10
      };
      const testRes = await healthcareCatalogApi.getLabTests(params);
      const data = testRes?.data ?? testRes ?? {};
      setTests(data.items || []);
      setTotalTests(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 10));

      // Fetch true active count from backend
      const activeRes = await healthcareCatalogApi.getLabTests({ status: 'Active', limit: 1 });
      setActiveCount(activeRes?.data?.total ?? activeRes?.total ?? 0);
    } catch (err) {
      toast.error('Failed to load global test catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadAllParameters();
  }, [search, selectedCategory, selectedDept, selectedType, selectedStatus, page]);

  const handleOpenAdd = () => {
    setEditingTest(null);
    setFormData({
      name: '',
      shortName: '',
      alternateNamesString: '',
      department: 'Hematology',
      category: categories[0]?._id || '',
      sampleType: 'Blood',
      sampleVolume: '',
      sampleContainer: '',
      methodology: '',
      clinicalDescription: '',
      patientPreparation: '',
      collectionInstructions: '',
      referenceRange: '',
      normalReportingTime: '24 Hours',
      internalCode: '',
      loincCode: '',
      investigationType: 'ATOMIC_TEST',
      isActive: true,
      parameters: []
    });
    setParamSearch('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = async (test) => {
    setEditingTest(test);
    
    // Load associated parameters
    let mapped = [];
    try {
      const res = await healthcareCatalogApi.getLabTestParameters(test._id);
      mapped = (res?.data || res || []).map(m => ({
        _id: m.parameterId?._id || m.parameterId,
        name: m.parameterId?.name || m.displayNameOverride,
        shortName: m.parameterId?.shortName || '',
        resultType: m.parameterId?.resultType || 'NUMERIC',
        unit: m.parameterId?.defaultUnitId?.symbol || '',
        isRequired: m.isRequired
      }));
    } catch (err) {
      toast.error('Failed to load mapped parameters');
    }

    setFormData({
      ...test,
      category: test.category?._id || test.category || '',
      alternateNamesString: (test.alternateNames || []).join(', '),
      collectionInstructions: test.collectionInstructions || '',
      investigationType: test.investigationType || 'ATOMIC_TEST',
      parameters: mapped
    });
    setParamSearch('');
    setIsAddOpen(true);
  };

  const toggleParameterSelection = (param) => {
    const isAdded = (formData.parameters || []).some(p => p._id === param._id);
    if (isAdded) {
      toast.error(`${param.name} is already included in this investigation.`);
      return;
    }
    setFormData(prev => ({
      ...prev,
      parameters: [...(prev.parameters || []), {
        _id: param._id,
        name: param.name,
        shortName: param.shortName,
        resultType: param.resultType,
        unit: param.defaultUnitId?.symbol || '',
        isRequired: true
      }]
    }));
  };

  const removeSelectedParameter = (paramId) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.filter(p => p._id !== paramId)
    }));
  };

  const toggleParameterRequired = (paramId) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p =>
        p._id === paramId ? { ...p, isRequired: !p.isRequired } : p
      )
    }));
  };

  const moveParameter = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= formData.parameters.length) return;
    
    const updated = [...formData.parameters];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    
    setFormData(prev => ({
      ...prev,
      parameters: updated
    }));
  };

  const handleSubmitTest = async (e) => {
    e.preventDefault();
    if (formData.investigationType === 'ATOMIC_TEST' && (!formData.parameters || formData.parameters.length === 0)) {
      toast.error('At least one parameter must be selected for an Atomic Test investigation');
      return;
    }

    try {
      const payload = {
        ...formData,
        alternateNames: formData.alternateNamesString
          ? formData.alternateNamesString.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        parameters: (formData.parameters || []).map(p => ({
          parameterId: p._id,
          isRequired: p.isRequired !== false
        }))
      };

      if (editingTest) {
        await healthcareCatalogApi.updateLabTest(editingTest._id, payload);
        toast.success('Investigation updated successfully');
      } else {
        await healthcareCatalogApi.createLabTest(payload);
        toast.success('Investigation created successfully');
      }
      setIsAddOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save test');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await healthcareCatalogApi.createCategory({
        name: newCategoryName,
        type: 'LAB',
        description: newCategoryDesc
      });
      toast.success('Category added successfully');
      setNewCategoryName('');
      setNewCategoryDesc('');
      setIsCategoryOpen(false);
      // Reload categories
      const catRes = await healthcareCatalogApi.getCategories({ type: 'LAB' });
      setCategories(catRes?.data ?? catRes ?? []);
    } catch (err) {
      toast.error('Failed to create category');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Test Name',
      'Short Name',
      'Alternate Names',
      'Department',
      'Category',
      'Sample Type',
      'Sample Volume',
      'Sample Container',
      'Methodology',
      'Clinical Description',
      'Patient Preparation',
      'Collection Instructions',
      'Reference Range',
      'Reporting Time',
      'Internal Code',
      'LOINC Code',
      'Investigation Type'
    ];
    
    const sampleRow = [
      'Complete Blood Count',
      'CBC',
      'Hemogram, CBC with Platelets',
      'Hematology',
      'Hematology',
      'Blood',
      '2 ml',
      'EDTA Purple Top',
      'Automated Cell Counter',
      'Screens for anemias and infections',
      'No fasting required',
      'Keep sample cool at 4C',
      'Hb: 12-16 g/dL',
      '12 Hours',
      'INT-CBC-01',
      '58410-2',
      'ATOMIC_TEST'
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), sampleRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'lab_test_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportData = () => {
    if (tests.length === 0) {
      toast.error('No tests to export');
      return;
    }
    const headers = ['Global ID', 'Test Name', 'Short Name', 'Type', 'Category', 'Department', 'Sample Type', 'Reporting Time', 'Collection Instructions', 'Status'];
    const rows = tests.map(t => [
      t.globalId,
      t.name,
      t.shortName || '',
      t.investigationType || 'ATOMIC_TEST',
      t.category?.name || '',
      t.department,
      t.sampleType,
      t.normalReportingTime,
      t.collectionInstructions || '',
      t.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'global_lab_tests_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueDeptsCount = Math.max(5, new Set(tests.map(t => t.department || 'Hematology')).size);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Global Laboratory Catalogue
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">Master Catalogue</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage global laboratory investigations and their foundational clinical properties used across all laboratories.</p>
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
            <Plus className="w-4 h-4" /> Add Investigation
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">🔬</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Investigations</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{totalTests}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">✅</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Investigations</span>
            <span className="text-2xl font-black text-emerald-600 mt-0.5 block">{activeCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">📁</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Categories</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{categories.length}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xl">🏢</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Departments</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{uniqueDeptsCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-4 border-b border-slate-150 pb-2">
        <button
          onClick={() => setActiveTab('investigations')}
          className={`pb-2 px-4 text-sm font-black border-b-2 transition duration-150 ${activeTab === 'investigations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          Investigations
        </button>
        <button
          disabled
          className="pb-2 px-4 text-sm font-bold text-slate-350 cursor-not-allowed flex items-center gap-1.5"
        >
          Parameters <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-black uppercase">Coming Soon</span>
        </button>
        <button
          disabled
          className="pb-2 px-4 text-sm font-bold text-slate-350 cursor-not-allowed flex items-center gap-1.5"
        >
          Panels & Profiles <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-black uppercase">Coming Soon</span>
        </button>
        <button
          disabled
          className="pb-2 px-4 text-sm font-bold text-slate-350 cursor-not-allowed flex items-center gap-1.5"
        >
          Packages <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-black uppercase">Coming Soon</span>
        </button>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, short name, alternate name, ID, code, methodology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="ATOMIC_TEST">Atomic Test</option>
              <option value="PANEL">Panel</option>
              <option value="PROFILE">Profile</option>
              <option value="PACKAGE">Package</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Departments</option>
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Immunology">Immunology</option>
              <option value="Pathology">Pathology</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {(search || selectedCategory || selectedDept || selectedType || selectedStatus) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setSelectedDept('');
                  setSelectedType('');
                  setSelectedStatus('');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Lab Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                <th className="px-6 py-4">Global ID</th>
                <th className="px-6 py-4">Investigation Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Sample Type</th>
                <th className="px-6 py-4">Reporting Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Fetching master lab catalogue...
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No laboratory investigations match your search/filters.
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr key={test._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{test.globalId}</td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-800 block">{test.name}</span>
                        {test.shortName && <span className="text-xs text-slate-400 block mt-0.5">Short: {test.shortName}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${test.investigationType === 'ATOMIC_TEST' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {test.investigationType === 'ATOMIC_TEST' ? 'ATOMIC TEST' : test.investigationType || 'ATOMIC TEST'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{test.category?.name || 'General'}</td>
                    <td className="px-6 py-4">{test.department}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-600">{test.sampleType}</span>
                    </td>
                    <td className="px-6 py-4">{test.normalReportingTime}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${test.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {test.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                      <button onClick={() => setViewingTest(test)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 inline-flex items-center gap-1" title="View details">
                        🔍 View
                      </button>
                      <button onClick={() => handleOpenEdit(test)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 inline-flex items-center gap-1" title="Edit investigation">
                        ✏️ Edit
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

      {/* Add / Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden border border-slate-100 flex flex-col h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">{editingTest ? 'Modify Global Investigation' : 'Add New Global Investigation'}</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTest} className="flex-1 flex overflow-hidden">
              {/* Left Column: Metadata */}
              <div className="w-1/2 p-6 border-r border-slate-100 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Investigation Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Short Name</label>
                    <input
                      type="text"
                      value={formData.shortName}
                      onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Alternate Names / Synonyms (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Hemogram, CBC, Complete Blood"
                      value={formData.alternateNamesString}
                      onChange={(e) => setFormData({ ...formData, alternateNamesString: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Investigation Type</label>
                    <select
                      value={formData.investigationType}
                      onChange={(e) => setFormData({ ...formData, investigationType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    >
                      <option value="ATOMIC_TEST">Atomic Test</option>
                      <option value="PANEL">Panel</option>
                      <option value="PROFILE">Profile</option>
                      <option value="PACKAGE">Package</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Department *</label>
                    <input
                      type="text"
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Sample Type *</label>
                    <input
                      type="text"
                      required
                      value={formData.sampleType}
                      onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Sample Volume</label>
                    <input
                      type="text"
                      value={formData.sampleVolume}
                      onChange={(e) => setFormData({ ...formData, sampleVolume: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Sample Container</label>
                    <input
                      type="text"
                      value={formData.sampleContainer}
                      onChange={(e) => setFormData({ ...formData, sampleContainer: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Methodology</label>
                    <input
                      type="text"
                      value={formData.methodology}
                      onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Normal Reporting Time *</label>
                    <input
                      type="text"
                      required
                      value={formData.normalReportingTime}
                      onChange={(e) => setFormData({ ...formData, normalReportingTime: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Internal Code</label>
                    <input
                      type="text"
                      value={formData.internalCode}
                      onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">LOINC Code</label>
                    <input
                      type="text"
                      value={formData.loincCode}
                      onChange={(e) => setFormData({ ...formData, loincCode: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Collection Instructions</label>
                  <textarea
                    value={formData.collectionInstructions}
                    onChange={(e) => setFormData({ ...formData, collectionInstructions: e.target.value })}
                    placeholder="Sample collection requirements, storage temp, etc."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Reference Range (Optional)</label>
                  <textarea
                    value={formData.referenceRange}
                    onChange={(e) => setFormData({ ...formData, referenceRange: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Clinical Description</label>
                  <textarea
                    value={formData.clinicalDescription}
                    onChange={(e) => setFormData({ ...formData, clinicalDescription: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Patient Preparation</label>
                  <textarea
                    value={formData.patientPreparation}
                    onChange={(e) => setFormData({ ...formData, patientPreparation: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Mark Investigation as Active</label>
                </div>
              </div>

              {/* Right Column: Parameters Setup */}
              <div className="w-1/2 flex flex-col h-full bg-slate-50 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Add Investigation Parameters</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search parameters by name, short name, ID, LOINC..."
                      value={paramSearch}
                      onChange={(e) => setParamSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Parameter selector dropdown popup */}
                  {paramSearch && (
                    <div className="absolute z-10 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto w-[400px] text-xs">
                      {(() => {
                        const filtered = allParameters.filter(p =>
                          p.name.toLowerCase().includes(paramSearch.toLowerCase()) ||
                          p.shortName?.toLowerCase().includes(paramSearch.toLowerCase()) ||
                          p.parameterId?.toLowerCase().includes(paramSearch.toLowerCase()) ||
                          p.loincCode?.toLowerCase().includes(paramSearch.toLowerCase()) ||
                          p.internalCode?.toLowerCase().includes(paramSearch.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return <div className="p-3 text-slate-400 italic">No parameters match search criteria.</div>;
                        }
                        return filtered.map(p => {
                          const isSelected = (formData.parameters || []).some(sp => sp._id === p._id);
                          return (
                            <button
                              type="button"
                              key={p._id}
                              onClick={() => {
                                toggleParameterSelection(p);
                                setParamSearch('');
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{p.name}</span>
                                {p.shortName && <span className="text-slate-400 ml-1.5">({p.shortName})</span>}
                                <span className="text-[10px] text-slate-400 block">{p.parameterId} • {p.resultType}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                {isSelected ? 'Added' : '+ Add'}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Selected Parameters List */}
                <div className="p-4 overflow-y-auto flex-1 space-y-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Selected Parameters ({(formData.parameters || []).length})</span>

                  {(!formData.parameters || formData.parameters.length === 0) ? (
                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 italic text-xs">
                      No parameters selected. Use search above to select and map parameters.
                    </div>
                  ) : (
                    (formData.parameters || []).map((p, idx) => (
                      <div key={p._id} className="bg-white p-3 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="flex flex-col gap-0.5">
                            <button type="button" onClick={() => moveParameter(idx, -1)} disabled={idx === 0} className="hover:text-blue-500 disabled:opacity-30">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => moveParameter(idx, 1)} disabled={idx === formData.parameters.length - 1} className="hover:text-blue-500 disabled:opacity-30">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{p.name}</span>
                            {p.shortName && <span className="text-slate-400 ml-1">({p.shortName})</span>}
                            <span className="text-[10px] text-slate-400 block">{p.resultType} {p.unit ? `• ${p.unit}` : ''}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={p.isRequired}
                              onChange={() => toggleParameterRequired(p._id)}
                              className="rounded text-blue-600 w-3 h-3"
                            />
                            Required
                          </label>
                          <button
                            type="button"
                            onClick={() => removeSelectedParameter(p._id)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Form Actions Footer */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-95 transition shadow-lg shadow-blue-100">Save Investigation</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read-Only Detailed View Modal */}
      {viewingTest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase block">{viewingTest.globalId}</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{viewingTest.name}</h3>
              </div>
              <button onClick={() => setViewingTest(null)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Identity & Classification */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Short Name</span>
                  <span className="text-sm font-bold text-slate-700">{viewingTest.shortName || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Investigation Type</span>
                  <span className="text-sm font-bold text-slate-700">{viewingTest.investigationType || 'ATOMIC_TEST'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Category</span>
                  <span className="text-sm font-bold text-slate-700">{viewingTest.category?.name || 'General'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Department</span>
                  <span className="text-sm font-bold text-slate-700">{viewingTest.department}</span>
                </div>
              </div>

              {/* Specimen Info */}
              <div className="border border-slate-150 p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Specimen Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sample Type</span>
                    <span className="text-sm font-bold text-slate-700">{viewingTest.sampleType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sample Volume</span>
                    <span className="text-sm font-bold text-slate-700">{viewingTest.sampleVolume || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sample Container</span>
                    <span className="text-sm font-bold text-slate-700">{viewingTest.sampleContainer || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Clinical / Operational properties */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Clinical & Operational Properties</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Methodology</span>
                    <span className="text-sm font-bold text-slate-700">{viewingTest.methodology || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Reporting Time</span>
                    <span className="text-sm font-bold text-slate-700">{viewingTest.normalReportingTime}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Patient Preparation</span>
                    <p className="text-sm text-slate-650 mt-1 whitespace-pre-wrap">{viewingTest.patientPreparation || 'None specified'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Collection Instructions</span>
                    <p className="text-sm text-slate-650 mt-1 whitespace-pre-wrap">{viewingTest.collectionInstructions || 'None specified'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Clinical Description</span>
                    <p className="text-sm text-slate-650 mt-1 whitespace-pre-wrap">{viewingTest.clinicalDescription || 'No description available'}</p>
                  </div>
                </div>
              </div>

              {/* Coding & References */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Internal Code</span>
                  <span className="text-sm font-bold text-slate-700">{viewingTest.internalCode || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">LOINC Code</span>
                  <span className="text-sm font-bold text-slate-700">{viewingTest.loincCode || '—'}</span>
                </div>
              </div>

              {/* Parameters List Section */}
              <div className="border border-slate-150 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Associated Parameters ({mappedParameters.length})</h4>
                  <button
                    onClick={toggleMappingPanel}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {isMappingOpen ? 'Cancel' : '+ Map Parameter'}
                  </button>
                </div>

                {isMappingOpen && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Search & Map Parameters</span>
                    
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search parameter name, short name, code..."
                        value={mapperSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMapperSearch(val);
                          loadMapperParameters(1, val, false);
                        }}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      {mapperLoading && mapperParameters.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400">Loading parameters...</div>
                      ) : mapperParameters.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">No available parameters match.</div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {mapperParameters.map((p) => {
                            const isSelected = mappedParameters.some(m => (m.parameterId?._id || m.parameterId) === p._id);
                            return (
                              <div key={p._id} className="bg-white p-3 rounded-xl border border-slate-150 flex items-center justify-between text-xs shadow-sm">
                                <div>
                                  <span className="font-bold text-slate-800">{p.name}</span>
                                  {p.shortName && <span className="text-slate-400 ml-1.5">({p.shortName})</span>}
                                  <span className="text-[10px] text-slate-400 block">{p.parameterId} • {p.resultType} {p.defaultUnitId?.symbol ? `• ${p.defaultUnitId.symbol}` : ''}</span>
                                </div>
                                <div>
                                  {isSelected ? (
                                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Already Added
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleMapParameterDirectly(p)}
                                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-bold text-[10px] transition"
                                    >
                                      + Add
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {mapperHasMore && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          disabled={mapperLoading}
                          onClick={() => loadMapperParameters(mapperPage + 1, mapperSearch, true)}
                          className="px-4 py-1.5 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 text-[10px] font-bold rounded-lg disabled:opacity-55"
                        >
                          {mapperLoading ? 'Loading more...' : 'Load 5 More'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {mappedParameters.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No parameters associated with this investigation yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {mappedParameters.map((map, index) => (
                      <div key={map._id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-black text-slate-400 mr-2">{index + 1}</span>
                          <span className="font-bold text-slate-800">{map.parameterId?.name || 'Unknown'}</span>
                          {map.parameterId?.shortName && <span className="text-slate-400 ml-1.5">({map.parameterId.shortName})</span>}
                          <span className="ml-2.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500 font-bold uppercase">{map.parameterId?.resultType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${map.isRequired ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {map.isRequired ? 'Required' : 'Optional'}
                          </span>
                          <button
                            onClick={() => handleRemoveMapping(map.parameterId?._id)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded transition"
                            title="Remove association"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setViewingTest(null)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">Close Details</button>
            </div>
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
                  placeholder="Category Name (e.g. Hematology)"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Existing Categories</h4>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {categories.map(c => (
                    <div key={c._id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-700">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        importType="LAB"
        onImportComplete={loadData}
      />
    </div>
  );
};

export default GlobalLabTestsPage;
