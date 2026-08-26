import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Download, Upload, Search, Edit2, SlidersHorizontal, RefreshCw, X, HelpCircle, Check, AlertCircle, FileSpreadsheet, Trash, ArrowUp, ArrowDown, Eye, ChevronDown } from 'lucide-react';
import { healthcareCatalogApi } from '../../lib/api';
import toast from 'react-hot-toast';

const GlobalPanelsProfilesPage = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allParameters, setAllParameters] = useState([]);
  const [allInvestigations, setAllInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offsetRef] = useState({ current: 0 }); // mutable ref to track loaded item count
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const pageSizeRef = useRef(20);

  // Metrics
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [panelsCount, setPanelsCount] = useState(0);
  const [profilesCount, setProfilesCount] = useState(0);

  // Modals & Drawers
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderType, setBuilderType] = useState('PANEL'); // PANEL or PROFILE
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');
  const [viewingComposition, setViewingComposition] = useState(null);

  // Builder States
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    alternateNames: [],
    department: 'Pathology',
    category: '',
    sampleType: 'Blood',
    sampleVolume: '',
    sampleContainer: '',
    methodology: '',
    clinicalDescription: '',
    patientPreparation: '',
    collectionInstructions: '',
    normalReportingTime: 'Same Day',
    internalCode: '',
    loincCode: '',
    isActive: true
  });
  const [altInput, setAltInput] = useState('');
  const [selectedParameters, setSelectedParameters] = useState([]); // Array of selected investigations/panels composition
  const [paramSearch, setParamSearch] = useState('');

  // Refs for infinite scroll
  const tableContainerRef = useRef(null);
  const sentinelRef = useRef(null);
  const isLoadingRef = useRef(false); // prevents duplicate parallel fetches
  const currentFiltersRef = useRef({ search: '', selectedType: '', selectedDept: '', selectedCategory: '', selectedStatus: '', pageSize: 20 });

  // ─── Load metrics via real backend count queries ───────────────────────────
  const loadMetrics = useCallback(async () => {
    try {
      const [totalRes, activeRes, panelsRes, profilesRes] = await Promise.all([
        healthcareCatalogApi.getLabTests({ investigationType: 'PANEL,PROFILE', limit: 1 }),
        healthcareCatalogApi.getLabTests({ investigationType: 'PANEL,PROFILE', status: 'Active', limit: 1 }),
        healthcareCatalogApi.getLabTests({ investigationType: 'PANEL', limit: 1 }),
        healthcareCatalogApi.getLabTests({ investigationType: 'PROFILE', limit: 1 })
      ]);
      setTotalCount(totalRes?.data?.total ?? totalRes?.total ?? 0);
      setActiveCount(activeRes?.data?.total ?? activeRes?.total ?? 0);
      setPanelsCount(panelsRes?.data?.total ?? panelsRes?.total ?? 0);
      setProfilesCount(profilesRes?.data?.total ?? profilesRes?.total ?? 0);
    } catch (_) { /* metrics are best-effort */ }
  }, []);

  // ─── Load support lists (categories & investigations for autocomplete) ──────
  const loadSupportData = useCallback(async () => {
    try {
      const [catRes, paramRes, invRes] = await Promise.all([
        healthcareCatalogApi.getCategories({ type: 'LAB' }),
        healthcareCatalogApi.getParameters({ limit: 500 }),
        healthcareCatalogApi.getLabTests({ limit: 1000 })
      ]);
      setCategories(catRes?.data || catRes || []);
      setAllParameters((paramRes?.data?.items || paramRes?.items || []).filter(p => p.isActive));
      setAllInvestigations((invRes?.data?.items || invRes?.items || []).filter(i => i.isActive));
    } catch (_) { /* non-critical */ }
  }, []);

  // ─── INITIAL LOAD: reset list and fetch first batch ─────────────────────────
  const loadInitial = useCallback(async (filters) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    setItems([]);
    setHasMore(true);
    offsetRef.current = 0;
    try {
      const res = await healthcareCatalogApi.getLabTests({
        search: filters.search,
        category: filters.selectedCategory,
        department: filters.selectedDept,
        status: filters.selectedStatus,
        investigationType: filters.selectedType || 'PANEL,PROFILE',
        page: 1,
        limit: filters.pageSize
      });
      const data = res?.data ?? res ?? {};
      const newItems = data.items || [];
      const total = data.total || 0;
      setItems(newItems);
      offsetRef.current = newItems.length;
      setHasMore(newItems.length < total);
    } catch (err) {
      toast.error('Failed to load global catalogue');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // ─── APPEND: load next page and append ─────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;
    isLoadingRef.current = true;
    setIsLoadingMore(true);
    const filters = currentFiltersRef.current;
    const currentOffset = offsetRef.current;
    const batchSize = filters.pageSize;
    const nextPage = Math.floor(currentOffset / batchSize) + 1;
    try {
      const res = await healthcareCatalogApi.getLabTests({
        search: filters.search,
        category: filters.selectedCategory,
        department: filters.selectedDept,
        status: filters.selectedStatus,
        investigationType: filters.selectedType || 'PANEL,PROFILE',
        page: nextPage + 1,
        limit: batchSize
      });
      const data = res?.data ?? res ?? {};
      const newItems = data.items || [];
      const total = data.total || 0;
      if (newItems.length > 0) {
        setItems(prev => {
          const existingIds = new Set(prev.map(i => i._id));
          const filtered = newItems.filter(item => !existingIds.has(item._id));
          const merged = [...prev, ...filtered];
          offsetRef.current = merged.length;
          return merged;
        });
        setHasMore(offsetRef.current < total);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      toast.error('Failed to load more catalogue items');
    } finally {
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [hasMore]);

  // ─── Effect: trigger initial load when filters change ───────────────────────
  useEffect(() => {
    const filters = { search, selectedType, selectedDept, selectedCategory, selectedStatus, pageSize };
    currentFiltersRef.current = filters;
    pageSizeRef.current = pageSize;
    loadInitial(filters);
    loadMetrics();
  }, [search, selectedType, selectedDept, selectedCategory, selectedStatus, pageSize]);

  // ─── Effect: load support data once on mount ────────────────────────────────
  useEffect(() => {
    loadSupportData();
  }, []);

  // ─── Effect: IntersectionObserver for infinite scroll sentinel ───────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingRef.current && hasMore && !loading) {
          loadMore();
        }
      },
      { root: tableContainerRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  // Fetch composition when viewingItem changes
  useEffect(() => {
    if (viewingItem) {
      loadViewingComposition();
    } else {
      setViewingComposition(null);
    }
  }, [viewingItem]);

  const loadViewingComposition = async () => {
    try {
      const res = await healthcareCatalogApi.getLabTestComposition(viewingItem._id);
      setViewingComposition(res?.data || res || null);
    } catch (err) {
      toast.error('Failed to load composition details');
    }
  };

  const handleOpenCreate = (type) => {
    setBuilderType(type);
    setEditingItem(null);
    setFormData({
      name: '',
      shortName: '',
      alternateNames: [],
      department: 'Pathology',
      category: categories[0]?._id || '',
      sampleType: 'Blood',
      sampleVolume: '',
      sampleContainer: '',
      methodology: '',
      clinicalDescription: '',
      patientPreparation: '',
      collectionInstructions: '',
      normalReportingTime: 'Same Day',
      internalCode: '',
      loincCode: '',
      isActive: true
    });
    setAltInput('');
    setSelectedParameters([]);
    setParamSearch('');
    setIsBuilderOpen(true);
  };

  const handleOpenEdit = async (item) => {
    setEditingItem(item);
    setBuilderType(item.investigationType);
    setFormData({
      ...item,
      category: item.category?._id || item.category || '',
      alternateNames: item.alternateNames || []
    });
    setAltInput('');
    setParamSearch('');
    
    // Load existing mapped parameters
    try {
      const res = await healthcareCatalogApi.getLabTestComposition(item._id);
      const composition = res?.data || res || {};
      if (item.investigationType === 'PANEL') {
        setSelectedParameters((composition.investigations || []).map(inv => ({
          _id: inv.investigationId?._id || inv.investigationId,
          name: inv.name,
          shortName: inv.shortName,
          department: inv.department,
          category: inv.category,
          investigationType: 'ATOMIC_TEST',
          parametersCount: inv.parameters?.length || 0,
          isRequired: inv.isRequired
        })));
      } else if (item.investigationType === 'PROFILE') {
        setSelectedParameters((composition.composition || []).map(comp => ({
          _id: comp.panelId || comp.investigationId,
          name: comp.name,
          shortName: comp.shortName,
          type: comp.type, // 'PANEL' or 'INVESTIGATION'
          investigationType: comp.type,
          parametersCount: comp.details?.parameters?.length || comp.details?.investigations?.length || 0,
          isRequired: comp.isRequired
        })));
      }
    } catch (err) {
      toast.error('Failed to load associated composition');
    }

    setIsBuilderOpen(true);
  };

  // Alternate names chip handlers
  const addAltName = () => {
    const trimmed = altInput.trim();
    if (trimmed && !formData.alternateNames.includes(trimmed)) {
      setFormData({
        ...formData,
        alternateNames: [...formData.alternateNames, trimmed]
      });
      setAltInput('');
    }
  };

  const removeAltName = (idx) => {
    setFormData({
      ...formData,
      alternateNames: formData.alternateNames.filter((_, i) => i !== idx)
    });
  };

  // Builder selection helpers
  const toggleParameterSelection = (param) => {
    const isAdded = selectedParameters.some(p => p._id === param._id);
    if (isAdded) {
      toast.error((t) => (
        <div>
          <span className="font-extrabold block">Investigation Already Added</span>
          <span className="text-xs">{param.name} is already included in this {builderType === 'PANEL' ? 'panel' : 'profile'}.</span>
        </div>
      ), { id: 'dup-panel-toast', duration: 4000 });
      return;
    }
    // Add the investigation/panel
    setSelectedParameters([...selectedParameters, {
      _id: param._id,
      name: param.name,
      shortName: param.shortName,
      department: param.department,
      category: param.category?.name || param.category,
      investigationType: param.investigationType,
      parametersCount: param.parameters?.length || 0,
      isRequired: true
    }]);
  };

  const removeSelectedParameter = (paramId) => {
    setSelectedParameters(selectedParameters.filter(p => p._id !== paramId));
  };

  const toggleParameterRequired = (paramId) => {
    setSelectedParameters(selectedParameters.map(p => 
      p._id === paramId ? { ...p, isRequired: !p.isRequired } : p
    ));
  };

  const moveParameter = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedParameters.length) return;
    
    const updated = [...selectedParameters];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    
    setSelectedParameters(updated);
  };

  const handleSavePanelProfile = async (e) => {
    e.preventDefault();

    if (selectedParameters.length === 0) {
      toast.error(`Please add at least one ${builderType === 'PANEL' ? 'investigation' : 'panel'} to save.`);
      return;
    }

    try {
      const payload = {
        ...formData,
        investigationType: builderType
      };

      if (builderType === 'PANEL') {
        payload.investigations = selectedParameters.map((p, idx) => ({
          investigationId: p._id,
          isRequired: p.isRequired !== false,
          displayOrder: idx + 1
        }));
      } else if (builderType === 'PROFILE') {
        payload.composition = selectedParameters.map((p, idx) => ({
          panelId: p.investigationType === 'PANEL' ? p._id : null,
          investigationId: p.investigationType === 'ATOMIC_TEST' || p.investigationType === 'INVESTIGATION' ? p._id : null,
          isRequired: p.isRequired !== false,
          displayOrder: idx + 1
        }));
      }

      if (editingItem) {
        await healthcareCatalogApi.updateLabTest(editingItem._id, payload);
        toast.success(`${builderType === 'PANEL' ? 'Panel' : 'Profile'} updated successfully`);
      } else {
        await healthcareCatalogApi.createLabTest(payload);
        toast.success(`${builderType === 'PANEL' ? 'Panel' : 'Profile'} created successfully`);
      }

      setIsBuilderOpen(false);
      const filters = currentFiltersRef.current;
      await loadInitial(filters);
      await loadMetrics();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save panel/profile');
    }
  };

  const toggleStatus = async (item) => {
    try {
      await healthcareCatalogApi.updateLabTest(item._id, {
        isActive: !item.isActive
      });
      toast.success(`${item.investigationType === 'PANEL' ? 'Panel' : 'Profile'} ${item.isActive ? 'deactivated' : 'activated'} successfully`);
      const filters = currentFiltersRef.current;
      await loadInitial(filters);
      await loadMetrics();
      if (viewingItem && viewingItem._id === item._id) {
        setViewingItem({ ...viewingItem, isActive: !item.isActive });
      }
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }
    const headers = ['Global ID', 'Name', 'Short Name', 'Type', 'Department', 'Reporting Time', 'Status'];
    const rows = items.map(p => [
      p.globalId,
      p.name,
      p.shortName || '',
      p.investigationType,
      p.department,
      p.normalReportingTime,
      p.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'global_panels_profiles.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter available investigations/panels on the left of builder
  const filteredCompositionItems = allInvestigations.filter(item => {
    // Exclude self if editing
    if (editingItem && item._id === editingItem._id) return false;

    if (builderType === 'PANEL') {
      // Panel selects Atomic Tests
      if (item.investigationType !== 'ATOMIC_TEST') return false;
    } else if (builderType === 'PROFILE') {
      // Profile selects Panels or Atomic Tests
      if (!['PANEL', 'ATOMIC_TEST'].includes(item.investigationType)) return false;
    }

    if (!paramSearch) return true;
    const searchLower = paramSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.shortName?.toLowerCase().includes(searchLower) ||
      item.globalId?.toLowerCase().includes(searchLower) ||
      item.loincCode?.toLowerCase().includes(searchLower) ||
      item.internalCode?.toLowerCase().includes(searchLower) ||
      item.department?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            Global Laboratory Panels & Profiles <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase font-bold">Master Catalogue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Create and manage global laboratory panels and profiles.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition inline-flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={() => handleOpenCreate('PANEL')}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-95 transition inline-flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            + Create Panel
          </button>
          <button
            onClick={() => handleOpenCreate('PROFILE')}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-95 transition inline-flex items-center gap-2 shadow-lg shadow-purple-100"
          >
            <Plus className="w-4 h-4" />
            + Create Profile
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">🧬</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Panels & Profiles</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{totalCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">✅</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Panels & Profiles</span>
            <span className="text-2xl font-black text-emerald-600 mt-0.5 block">{activeCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">🧪</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Panels</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{panelsCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl">📋</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Profiles</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{profilesCount}</span>
          </div>
        </div>
      </div>

      {/* Main Content: Search/Filters & Grid */}
      <div className="flex gap-6 items-start">
        {/* Left Side List View */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex-1 transition-all">
          {/* Filters row */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, short name, global ID, LOINC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-655 text-sm rounded-2xl focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="PANEL">Panel</option>
                <option value="PROFILE">Profile</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-655 text-sm rounded-2xl focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {/* Page size picker */}
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="appearance-none pl-4 pr-8 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-2xl focus:outline-none font-bold cursor-pointer"
                >
                  <option value={20}>20 Per Page</option>
                  <option value={50}>50 Per Page</option>
                  <option value={100}>100 Per Page</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-blue-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table — independent scroll container */}
          <div
            ref={tableContainerRef}
            className="overflow-auto"
            style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '300px' }}
          >
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                  <th className="px-6 py-4">Global ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Short Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">TAT</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-500" />
                      <span className="text-sm font-bold">Loading panels & profiles...</span>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">📋</div>
                        <p className="text-sm font-bold">{search || selectedType || selectedStatus ? 'No panels or profiles match search criteria.' : 'No panels or profiles found.'}</p>
                        {(search || selectedType || selectedStatus) && (
                          <button
                            onClick={() => { setSearch(''); setSelectedType(''); setSelectedStatus(''); }}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >Clear filters</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition cursor-pointer" onClick={() => setViewingItem(item)}>
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono text-xs">{item.globalId}</td>
                      <td className="px-6 py-4 font-bold text-slate-805">{item.name}</td>
                      <td className="px-6 py-4 text-slate-500">{item.shortName || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.investigationType === 'PANEL' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}>
                          {item.investigationType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-655">{item.department}</td>
                      <td className="px-6 py-4 text-slate-655">{item.normalReportingTime}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setViewingItem(item)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenEdit(item)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500" title="Edit details">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Infinite Scroll Sentinel */}
            {!loading && (
              <div ref={sentinelRef} className="py-6 text-center">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2 text-blue-500">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold">Loading more items...</span>
                  </div>
                )}
                {!hasMore && items.length > 0 && (
                  <p className="text-xs font-bold text-slate-400">All {items.length} panels & profiles loaded</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Detail Drawer */}
        {viewingItem && (
          <div className="w-[380px] bg-white border border-slate-100 rounded-3xl shadow-lg p-5 space-y-5 sticky top-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{viewingItem.globalId}</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{viewingItem.name}</h3>
                <span className="text-xs text-slate-400">Type: {viewingItem.investigationType}</span>
              </div>
              <button onClick={() => setViewingItem(null)} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-100 pb-1.5">
              <button
                onClick={() => setActiveDetailTab('overview')}
                className={`pb-1 text-xs font-bold border-b-2 transition ${activeDetailTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-450'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveDetailTab('composition')}
                className={`pb-1 text-xs font-bold border-b-2 transition ${activeDetailTab === 'composition' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-450'}`}
              >
                {viewingItem.investigationType === 'PANEL' ? 'Investigations' : 'Composition'} ({viewingItem.investigationType === 'PANEL' ? viewingComposition?.investigations?.length || 0 : viewingComposition?.composition?.length || 0})
              </button>
            </div>

            {activeDetailTab === 'overview' ? (
              <div className="space-y-4 text-sm text-slate-650">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Department</span>
                    <span className="font-bold text-slate-700">{viewingItem.department}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Sample Type</span>
                    <span className="font-bold text-slate-700">{viewingItem.sampleType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Reporting TAT</span>
                    <span className="font-bold text-slate-700">{viewingItem.normalReportingTime || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">LOINC Code</span>
                    <span className="font-bold text-slate-700">{viewingItem.loincCode || '—'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clinical Description</span>
                  <p className="text-xs mt-1 leading-relaxed text-slate-500">{viewingItem.clinicalDescription || 'No description added.'}</p>
                </div>

                <div className="flex gap-2.5 pt-4">
                  <button
                    onClick={() => handleOpenEdit(viewingItem)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition"
                  >
                    Edit {viewingItem.investigationType === 'PANEL' ? 'Panel' : 'Profile'}
                  </button>
                  <button
                    onClick={() => toggleStatus(viewingItem)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition ${viewingItem.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50/20' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50/20'}`}
                  >
                    {viewingItem.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {viewingItem.investigationType === 'PANEL' ? (
                  (viewingComposition?.investigations || []).map((inv, idx) => {
                    const isExpanded = viewingComposition?._expandedId === inv.investigationId;
                    return (
                      <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <div
                          onClick={() => {
                            setViewingComposition(prev => ({
                              ...prev,
                              _expandedId: prev._expandedId === inv.investigationId ? null : inv.investigationId
                            }));
                          }}
                          className="p-3 bg-slate-50 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100/60 transition"
                        >
                          <div>
                            <span className="font-black text-slate-455 mr-1.5">{inv.displayOrder}</span>
                            <span className="font-bold text-slate-800">{inv.name}</span>
                            {inv.shortName && <span className="text-slate-400 ml-1">({inv.shortName})</span>}
                            <span className="text-[10px] text-slate-400 block">{inv.parameters?.length || 0} Parameters • {inv.department}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${inv.isRequired ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                              {inv.isRequired ? 'Req' : 'Opt'}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="bg-white border-t border-slate-50 p-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                            {(!inv.parameters || inv.parameters.length === 0) ? (
                              <p className="text-[10px] text-slate-400 italic pl-6">No parameters configured for this investigation.</p>
                            ) : (
                              inv.parameters.map((p, pIdx) => (
                                <div key={pIdx} className="pl-6 flex items-center justify-between text-[11px] py-1 border-b border-slate-50 last:border-0">
                                  <div>
                                    <span className="font-bold text-slate-700">{p.name}</span>
                                    {p.shortName && <span className="text-slate-400 ml-1">({p.shortName})</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                                    <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-bold">{p.resultType}</span>
                                    {p.unit && <span className="text-blue-600 font-bold">{p.unit}</span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  (viewingComposition?.composition || []).map((comp, idx) => {
                    const isExpanded = viewingComposition?._expandedId === (comp.panelId || comp.investigationId);
                    const nestedInvs = comp.details?.investigations || [];
                    const nestedParams = comp.details?.parameters || [];
                    return (
                      <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <div
                          onClick={() => {
                            setViewingComposition(prev => ({
                              ...prev,
                              _expandedId: prev._expandedId === (comp.panelId || comp.investigationId) ? null : (comp.panelId || comp.investigationId)
                            }));
                          }}
                          className="p-3 bg-slate-50 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100/60 transition"
                        >
                          <div>
                            <span className="font-black text-slate-455 mr-1.5">{comp.displayOrder}</span>
                            <span className="font-bold text-slate-800">{comp.name}</span>
                            {comp.shortName && <span className="text-slate-400 ml-1">({comp.shortName})</span>}
                            <span className="text-[10px] text-slate-400 block">{comp.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${comp.isRequired ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                              {comp.isRequired ? 'Req' : 'Opt'}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="bg-white border-t border-slate-50 p-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                            {comp.type === 'PANEL' ? (
                              nestedInvs.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic pl-6">No investigations in this panel.</p>
                              ) : (
                                nestedInvs.map((nestedInv, nIdx) => (
                                  <div key={nIdx} className="pl-6 space-y-1 py-1 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                      <span>{nestedInv.name}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">{nestedInv.parameters?.length || 0} Params</span>
                                    </div>
                                    <div className="pl-4 space-y-0.5">
                                      {nestedInv.parameters?.map((p, pIdx) => (
                                        <div key={pIdx} className="flex justify-between text-[10px] text-slate-500 py-0.5">
                                          <span>{p.name}</span>
                                          <span className="text-blue-600 font-bold">{p.unit}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              )
                            ) : (
                              nestedParams.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic pl-6">No parameters configured.</p>
                              ) : (
                                nestedParams.map((p, pIdx) => (
                                  <div key={pIdx} className="pl-6 flex items-center justify-between text-[11px] py-1 border-b border-slate-50 last:border-0">
                                    <div>
                                      <span className="font-bold text-slate-700">{p.name}</span>
                                      {p.shortName && <span className="text-slate-400 ml-1">({p.shortName})</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                                      <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-bold">{p.resultType}</span>
                                      {p.unit && <span className="text-blue-600 font-bold">{p.unit}</span>}
                                    </div>
                                  </div>
                                ))
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Builder modal Workspace */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-xl overflow-hidden border border-slate-100 flex flex-col h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {editingItem ? `Modify Global ${builderType === 'PANEL' ? 'Panel' : 'Profile'}` : `Create Global ${builderType === 'PANEL' ? 'Panel' : 'Profile'}`}
              </h3>
              <button onClick={() => setIsBuilderOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePanelProfile} className="flex-1 flex overflow-hidden">
              {/* Left Form: Metadata */}
              <div className="w-1/2 p-6 border-r border-slate-100 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
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
                    <label className="text-xs font-black text-slate-500 uppercase">Department</label>
                    <input
                      type="text"
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    >
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Sample Type</label>
                    <input
                      type="text"
                      required
                      value={formData.sampleType}
                      onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Sample Volume</label>
                    <input
                      type="text"
                      value={formData.sampleVolume}
                      onChange={(e) => setFormData({ ...formData, sampleVolume: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Reporting TAT</label>
                    <input
                      type="text"
                      required
                      value={formData.normalReportingTime}
                      onChange={(e) => setFormData({ ...formData, normalReportingTime: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                    />
                  </div>
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
              </div>

              {/* Right Panel: Composition Builder */}
              <div className="w-1/2 flex flex-col h-full bg-slate-50 overflow-hidden">
                {/* Search Parameter */}
                <div className="p-4 border-b border-slate-200 bg-white">
                  <span className="text-xs font-black text-slate-500 uppercase block mb-1">
                    {builderType === 'PANEL' ? 'Add Investigations to Panel' : 'Add Composition to Profile'}
                  </span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={builderType === 'PANEL' ? 'Search investigations by name, short name, ID, LOINC...' : 'Search panels/investigations...'}
                      value={paramSearch}
                      onChange={(e) => setParamSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  
                  {/* Dropdown popup */}
                  {paramSearch && (
                    <div className="absolute z-10 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto w-[400px] text-xs">
                      {filteredCompositionItems.length === 0 ? (
                        <div className="p-3 text-slate-400 italic">No matching items found.</div>
                      ) : (
                        filteredCompositionItems.map(p => {
                          const isSelected = selectedParameters.some(sp => sp._id === p._id);
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
                                <span className="text-[10px] text-slate-400 block">{p.globalId} • {p.department}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isSelected ? 'bg-emerald-55 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {isSelected ? '✓ Already Added' : '+ Add'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Investigations Lists */}
                <div className="p-4 overflow-y-auto flex-1 space-y-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                    {builderType === 'PANEL' ? 'Selected Investigations' : 'Selected Composition'} ({selectedParameters.length})
                  </span>
                  
                  {selectedParameters.length === 0 ? (
                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 italic text-xs">
                      {builderType === 'PANEL' ? 'No investigations selected. Use search above.' : 'No composition selected. Use search above.'}
                    </div>
                  ) : (
                    selectedParameters.map((p, idx) => (
                      <div key={p._id} className="bg-white p-3 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="flex flex-col gap-0.5">
                            <button type="button" onClick={() => moveParameter(idx, -1)} disabled={idx === 0} className="hover:text-blue-500 disabled:opacity-30">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => moveParameter(idx, 1)} disabled={idx === selectedParameters.length - 1} className="hover:text-blue-500 disabled:opacity-30">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <span className="font-black text-slate-400 mr-1.5">{idx + 1}</span>
                            <span className="font-bold text-slate-800">{p.name}</span>
                            {p.shortName && <span className="text-slate-450 ml-1">({p.shortName})</span>}
                            <span className="text-[10px] text-slate-400 block">{p.globalId || p.parameterId} • {p.department || p.type}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-[10px] text-slate-500">
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
                            className="p-1 hover:bg-red-50 text-red-500 rounded transition"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Save block */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                  <button type="button" onClick={() => setIsBuilderOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl transition hover:opacity-95 shadow-lg shadow-indigo-150">Save changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalPanelsProfilesPage;
