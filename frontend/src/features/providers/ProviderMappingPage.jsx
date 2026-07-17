import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, Plus, Upload, Download, Check, AlertCircle, X, 
  Trash2, Edit, CheckSquare, Square, Eye, FileText, Database, ShieldAlert,
  HelpCircle, ChevronRight, Play, RefreshCw, Layers, Sparkles
} from 'lucide-react';
import { providersApi, healthcareCatalogApi } from '../../lib/api';
import toast from 'react-hot-toast';

const ProviderMappingPage = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();

  // Provider details
  const [provider, setProvider] = useState(null);
  const [loadingProvider, setLoadingProvider] = useState(true);

  // Mapping records
  const [mappings, setMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, pending: 0 });

  // Dialog / Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Auto-complete catalog search states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [selectedGlobalItem, setSelectedGlobalItem] = useState(null);

  // Form State
  const [formType, setFormType] = useState('CREATE'); // 'CREATE' | 'UPDATE'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    providerCode: '',
    providerName: '',
    packSize: '',
    manufacturer: '',
    dosageForm: '',
    strength: '',
    sampleType: '',
    methodology: '',
    normalReportingTime: '',
    notes: '',
    status: 'Active'
  });

  // Spreadsheet import states
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadProvider();
    loadMappings();
  }, [providerId, page, searchQuery]);

  const loadProvider = async () => {
    try {
      setLoadingProvider(true);
      const data = await providersApi.getProvider(providerId);
      setProvider(data);
    } catch (err) {
      toast.error('Failed to load provider details');
      navigate('/admin/providers');
    } finally {
      setLoadingProvider(false);
    }
  };

  const loadMappings = async () => {
    if (!provider) return;
    try {
      setLoadingMappings(true);
      const data = await providersApi.getMappings(providerId, {
        search: searchQuery,
        mappingType: provider.providerType === 'Pharmacy' ? 'Medicine' : 'LabTest',
        page,
        limit: 10
      });
      setMappings(data.items || []);
      setTotalPages(Math.ceil((data.total || 0) / 10));

      // Calculate simple client stats
      const total = data.total || 0;
      let active = 0, inactive = 0, pending = 0;
      (data.items || []).forEach(m => {
        if (m.status === 'Active') active++;
        else if (m.status === 'Inactive') inactive++;
        else if (m.status === 'Pending Review') pending++;
      });
      setStats({ total, active, inactive, pending });
    } catch (err) {
      toast.error('Failed to load mappings');
    } finally {
      setLoadingMappings(false);
    }
  };

  useEffect(() => {
    if (provider) {
      loadMappings();
    }
  }, [provider]);

  // Handle Autocomplete Catalog Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (catalogSearch.trim().length >= 2) {
        searchCatalog();
      } else {
        setCatalogResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [catalogSearch]);

  const searchCatalog = async () => {
    if (!provider) return;
    try {
      setSearchingCatalog(true);
      if (provider.providerType === 'Pharmacy') {
        // Use /search/medicines which is accessible to clinic admins (read-only)
        const res = await healthcareCatalogApi.searchMedicines({ search: catalogSearch, limit: 10 });
        // API returns { success, data: { total, items } } — items live under res.data
        setCatalogResults(res.data?.items || res.items || []);
      } else {
        // Use /search/labs which is accessible to clinic admins (read-only)
        const res = await healthcareCatalogApi.searchLabTests({ search: catalogSearch, limit: 10 });
        setCatalogResults(res.data?.items || res.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingCatalog(false);
    }
  };

  // Form Reset / Open
  const handleOpenCreate = () => {
    setFormType('CREATE');
    setSelectedGlobalItem(null);
    setCatalogSearch('');
    setCatalogResults([]);
    setFormData({
      providerCode: '',
      providerName: '',
      packSize: '',
      manufacturer: '',
      dosageForm: '',
      strength: '',
      sampleType: '',
      methodology: '',
      normalReportingTime: '',
      notes: '',
      status: 'Active'
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (m) => {
    setFormType('UPDATE');
    setEditingId(m._id);
    setSelectedGlobalItem(m.globalMedicineId || m.globalLabTestId);
    setFormData({
      providerCode: m.providerCode,
      providerName: m.providerName,
      packSize: m.packSize || '',
      manufacturer: m.manufacturer || '',
      dosageForm: m.dosageForm || '',
      strength: m.strength || '',
      sampleType: m.sampleType || '',
      methodology: m.methodology || '',
      normalReportingTime: m.normalReportingTime || '',
      notes: m.notes || '',
      status: m.status || 'Active'
    });
    setIsAddOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGlobalItem) {
      return toast.error('Please select a record from the global catalog first');
    }
    if (!formData.providerCode || !formData.providerName) {
      return toast.error('Provider Code and Provider Name are required');
    }

    const payload = {
      ...formData,
      providerId,
      mappingType: provider.providerType === 'Pharmacy' ? 'Medicine' : 'LabTest',
      globalMedicineId: provider.providerType === 'Pharmacy' ? selectedGlobalItem._id : undefined,
      globalLabTestId: provider.providerType === 'Laboratory' ? selectedGlobalItem._id : undefined
    };

    try {
      if (formType === 'CREATE') {
        await providersApi.createMapping(payload);
        toast.success('Mapping added successfully');
      } else {
        await providersApi.updateMapping(editingId, payload);
        toast.success('Mapping updated successfully');
      }
      setIsAddOpen(false);
      loadMappings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save mapping');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this mapping translation? Deleting this mapping will not affect global catalog records.')) return;
    try {
      await providersApi.deleteMapping(id);
      toast.success('Mapping removed successfully');
      loadMappings();
    } catch (err) {
      toast.error('Failed to delete mapping');
    }
  };

  // Bulk Actions
  const handleToggleSelectAll = () => {
    if (selectedItems.length === mappings.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mappings.map(m => m._id));
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleBulkStatusChange = async (nextStatus) => {
    if (selectedItems.length === 0) return;
    try {
      let successCount = 0;
      for (const id of selectedItems) {
        await providersApi.updateMapping(id, { status: nextStatus });
        successCount++;
      }
      toast.success(`Successfully updated status to ${nextStatus} for ${successCount} mappings`);
      setSelectedItems([]);
      loadMappings();
    } catch (err) {
      toast.error('Failed to complete status update on all items');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to remove all ${selectedItems.length} selected mappings?`)) return;
    try {
      let successCount = 0;
      for (const id of selectedItems) {
        await providersApi.deleteMapping(id);
        successCount++;
      }
      toast.success(`Deleted ${successCount} mappings`);
      setSelectedItems([]);
      loadMappings();
    } catch (err) {
      toast.error('Failed to delete all selected mappings');
    }
  };

  // Smart Spreadsheet Import
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const b64 = evt.target.result.split(',')[1];
          const preview = await providersApi.previewImportMapping({
            fileData: b64,
            mappingType: provider.providerType === 'Pharmacy' ? 'Medicine' : 'LabTest',
            providerId
          });
          setImportPreview(preview);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to parse sheet. Please check headers.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSuggestion = (index, record) => {
    setImportPreview(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        matchedRecord: record,
        matchStatus: 'EXISTING'
      };
      return next;
    });
  };

  const handleCommitImport = async () => {
    const itemsToSave = importPreview.filter(p => p.matchedRecord && p.matchStatus !== 'MAPPED');
    if (itemsToSave.length === 0) {
      return toast.error('No new unmapped matches selected to import');
    }

    try {
      setImporting(true);
      let created = 0;
      for (const row of itemsToSave) {
        const payload = {
          providerCode: row.data.providerCode,
          providerName: row.data.providerName,
          packSize: row.data.packSize,
          manufacturer: row.data.manufacturer,
          dosageForm: row.data.dosageForm,
          strength: row.data.strength,
          sampleType: row.data.sampleType,
          methodology: row.data.methodology,
          normalReportingTime: row.data.normalReportingTime,
          status: 'Active',
          providerId,
          mappingType: provider.providerType === 'Pharmacy' ? 'Medicine' : 'LabTest',
          globalMedicineId: provider.providerType === 'Pharmacy' ? row.matchedRecord._id : undefined,
          globalLabTestId: provider.providerType === 'Laboratory' ? row.matchedRecord._id : undefined
        };
        try {
          await providersApi.createMapping(payload);
          created++;
        } catch (err) {
          console.error('Failed to map row:', row.data.providerName);
        }
      }
      toast.success(`Imported and mapped ${created} items successfully`);
      setIsImportOpen(false);
      setImportFile(null);
      setImportPreview([]);
      loadMappings();
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (loadingProvider) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          <span>Configuring mapping context...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Top Gradient Header */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-emerald-950/60 border-b border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/providers')}
            className="p-2.5 hover:bg-slate-800 rounded-2xl transition border border-slate-700 text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                {provider?.providerType}
              </span>
              <span className="text-slate-500 text-xs">Mapping Engine</span>
            </div>
            <h1 className="text-2xl font-black mt-1 text-slate-100 flex items-center gap-2">
              {provider?.name} <Database className="w-5 h-5 text-indigo-400" />
            </h1>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2.5 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-black transition flex items-center gap-2 text-slate-300"
          >
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Add Mapping
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Translations</span>
          <span className="text-3xl font-black text-slate-200 mt-2">{stats.total}</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Active</span>
          <span className="text-3xl font-black text-emerald-400 mt-2">{stats.active}</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Pending Review</span>
          <span className="text-3xl font-black text-amber-400 mt-2">{stats.pending}</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inactive</span>
          <span className="text-3xl font-black text-slate-400 mt-2">{stats.inactive}</span>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search global catalog or provider code...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/40 border border-slate-800 focus:outline-none focus:border-indigo-500 text-sm text-slate-200"
          />
        </div>

        {/* Bulk Action Controls */}
        {selectedItems.length > 0 && (
          <div className="flex gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl items-center text-xs animate-pulse">
            <span className="font-bold text-slate-400">{selectedItems.length} selected</span>
            <button 
              onClick={() => handleBulkStatusChange('Active')}
              className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition font-bold"
            >
              Activate
            </button>
            <button 
              onClick={() => handleBulkStatusChange('Inactive')}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition font-bold"
            >
              Deactivate
            </button>
            <button 
              onClick={handleBulkDelete}
              className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition font-bold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Mapping Data Table Grid */}
      <div className="p-6">
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl overflow-hidden">
          {loadingMappings ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <span>Fetching mapping table...</span>
            </div>
          ) : mappings.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <Database className="w-10 h-10 mx-auto text-slate-700" />
              <p>No mappings matching filters configured for this provider.</p>
              <p className="text-xs text-slate-600">Click Add Mapping to connect this provider to the Global Catalog.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-4 px-5 w-10">
                      <button onClick={handleToggleSelectAll}>
                        {selectedItems.length === mappings.length ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </th>
                    <th className="py-4 px-5">Global Reference</th>
                    <th className="py-4 px-5">Provider Details</th>
                    <th className="py-4 px-5">Provider Code</th>
                    <th className="py-4 px-5">
                      {provider?.providerType === 'Pharmacy' ? 'Dosage / Strength' : 'Reporting turnaround'}
                    </th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {mappings.map(m => {
                    const globalName = m.globalMedicineId?.displayName || m.globalLabTestId?.name;
                    const globalCode = m.globalMedicineId?.globalId || m.globalLabTestId?.globalId;
                    
                    return (
                      <tr key={m._id} className="hover:bg-slate-900/30 transition">
                        <td className="py-4 px-5">
                          <button onClick={() => handleToggleSelect(m._id)}>
                            {selectedItems.includes(m._id) ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-700" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-[10px] text-slate-500 font-bold tracking-wider block">{globalCode}</span>
                          <span className="font-black text-slate-200 text-sm">{globalName}</span>
                          {m.globalMedicineId && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">{m.globalMedicineId.genericName}</span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-bold text-slate-200 text-sm">{m.providerName}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {provider?.providerType === 'Pharmacy' ? m.manufacturer : m.sampleType}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <code className="px-2 py-1 rounded bg-slate-800/80 text-[10px] font-mono text-indigo-300">
                            {m.providerCode}
                          </code>
                        </td>
                        <td className="py-4 px-5">
                          {provider?.providerType === 'Pharmacy' ? (
                            <span>{m.dosageForm || 'N/A'} {m.strength ? `(${m.strength})` : ''}</span>
                          ) : (
                            <span>{m.normalReportingTime || 'N/A'}</span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                            m.status === 'Inactive' ? 'bg-slate-800 text-slate-500' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedMapping(m);
                              setIsDetailOpen(true);
                            }}
                            title="Inspect details"
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition inline-block"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            title="Edit"
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition inline-block"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m._id)}
                            title="Delete mapping"
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition inline-block"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-5">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MAP MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-100">
                {formType === 'CREATE' ? 'Add Catalog Translation Mapping' : 'Modify Mapping details'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddOpen(false)} 
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
              {/* STEP 1: Global Catalog Selector (Bypass on Update) */}
              {formType === 'CREATE' ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Search Global Catalog</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder={`Type to search global ${provider?.providerType === 'Pharmacy' ? 'Medicines' : 'Lab Tests'} catalog...`}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-indigo-500 text-xs text-slate-200"
                    />
                  </div>

                  {/* Autocomplete Results Box */}
                  {searchingCatalog && (
                    <div className="p-3 text-slate-500 text-xs text-center">Searching catalog...</div>
                  )}

                  {catalogResults.length > 0 && (
                    <div className="border border-slate-800 rounded-xl max-h-48 overflow-y-auto bg-slate-950 divide-y divide-slate-850">
                      {catalogResults.map(item => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => {
                            setSelectedGlobalItem(item);
                            setFormData(prev => ({
                              ...prev,
                              providerName: item.displayName || item.name,
                              strength: item.strength || ''
                            }));
                            setCatalogResults([]);
                            setCatalogSearch('');
                          }}
                          className="w-full text-left p-3 hover:bg-slate-900 flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-200">{item.displayName || item.name}</span>
                            <span className="text-[10px] text-slate-500 block">{item.globalId} {item.genericName ? `• ${item.genericName}` : ''}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedGlobalItem && (
                    <div className="p-4 border border-indigo-900/50 rounded-2xl bg-indigo-950/20 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-indigo-400 font-bold block">{selectedGlobalItem.globalId}</span>
                        <span className="font-black text-slate-200">{selectedGlobalItem.displayName || selectedGlobalItem.name}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[9px] font-bold">Selected</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 border border-slate-800 rounded-2xl bg-slate-950 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Immutable Catalog ID</span>
                    <span className="font-black text-slate-200">
                      {selectedGlobalItem?.displayName || selectedGlobalItem?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Provider Code and Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-400">Provider Specific Code</label>
                  <input
                    type="text"
                    required
                    value={formData.providerCode}
                    onChange={(e) => setFormData({ ...formData, providerCode: e.target.value })}
                    placeholder="e.g. PH-0041"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-400">Provider Specific Brand/Name</label>
                  <input
                    type="text"
                    required
                    value={formData.providerName}
                    onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                    placeholder="e.g. Crocin 650mg"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* PHARMACY MAPPING FIELD SET */}
              {provider?.providerType === 'Pharmacy' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400">Dosage Form</label>
                      <input
                        type="text"
                        value={formData.dosageForm}
                        onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                        placeholder="e.g. Tablet, Syrup"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400">Strength</label>
                      <input
                        type="text"
                        value={formData.strength}
                        onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                        placeholder="e.g. 500 mg, 5 ml"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400">Pack Size</label>
                      <input
                        type="text"
                        value={formData.packSize}
                        onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                        placeholder="e.g. Strip of 10"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400">Manufacturer</label>
                      <input
                        type="text"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        placeholder="e.g. GSK, Cipla"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LABORATORY MAPPING FIELD SET */}
              {provider?.providerType === 'Laboratory' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400">Sample Type</label>
                      <input
                        type="text"
                        value={formData.sampleType}
                        onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                        placeholder="e.g. Blood, Urine"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400">Methodology</label>
                      <input
                        type="text"
                        value={formData.methodology}
                        onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                        placeholder="e.g. ELISA, PCR"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400">Turnaround Time</label>
                      <input
                        type="text"
                        value={formData.normalReportingTime}
                        onChange={(e) => setFormData({ ...formData, normalReportingTime: e.target.value })}
                        placeholder="e.g. 12 hours"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-400">Availability Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-250 focus:outline-none text-slate-300"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending Review">Pending Review</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-400">Notes / Remarks</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Internal reference details"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 border border-slate-700 bg-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
              >
                Commit Translation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MAPPING DETAIL INSPECTOR */}
      {isDetailOpen && selectedMapping && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" /> Translation Inspector
              </h3>
              <button 
                type="button" 
                onClick={() => setIsDetailOpen(false)} 
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-xs">
              {/* Left Column: Global Catalog Information */}
              <div className="p-6 space-y-4">
                <h4 className="text-sm font-black text-indigo-400 uppercase tracking-wider">Global Standard Profile</h4>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Catalog Code</span>
                    <span className="text-sm font-black text-slate-200">
                      {selectedMapping.globalMedicineId?.globalId || selectedMapping.globalLabTestId?.globalId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Catalog Item Name</span>
                    <span className="text-sm font-black text-slate-200">
                      {selectedMapping.globalMedicineId?.displayName || selectedMapping.globalLabTestId?.name}
                    </span>
                  </div>
                  {selectedMapping.globalMedicineId && (
                    <>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Generic Name</span>
                        <span className="text-slate-300 block">{selectedMapping.globalMedicineId.genericName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Medicine Type</span>
                        <span className="text-slate-300 block">{selectedMapping.globalMedicineId.medicineType}</span>
                      </div>
                    </>
                  )}
                  {selectedMapping.globalLabTestId && (
                    <>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Short Name</span>
                        <span className="text-slate-300 block">{selectedMapping.globalLabTestId.shortName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Department</span>
                        <span className="text-slate-300 block">{selectedMapping.globalLabTestId.department || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Provider Information */}
              <div className="p-6 space-y-4">
                <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider">Provider Local profile</h4>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Local Provider Code</span>
                    <span className="text-sm font-black text-slate-200">{selectedMapping.providerCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Local Brand/Name</span>
                    <span className="text-sm font-black text-slate-200">{selectedMapping.providerName}</span>
                  </div>

                  {provider?.providerType === 'Pharmacy' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Strength</span>
                          <span className="text-slate-300 block">{selectedMapping.strength || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Dosage Form</span>
                          <span className="text-slate-300 block">{selectedMapping.dosageForm || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Pack Size</span>
                          <span className="text-slate-300 block">{selectedMapping.packSize || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Manufacturer</span>
                          <span className="text-slate-300 block">{selectedMapping.manufacturer || 'N/A'}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Sample Type</span>
                          <span className="text-slate-300 block">{selectedMapping.sampleType || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Methodology</span>
                          <span className="text-slate-300 block">{selectedMapping.methodology || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Normal TAT</span>
                        <span className="text-slate-300 block">{selectedMapping.normalReportingTime || 'N/A'}</span>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Mapping Status</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black inline-block mt-0.5 ${
                        selectedMapping.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {selectedMapping.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Notes</span>
                      <span className="text-slate-300 block italic">{selectedMapping.notes || 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end bg-slate-900/60">
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

      {/* DYNAMIC SPREADSHEET MAPPING IMPORT PANEL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" /> Smart Excel Mapping Assistant
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                }} 
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {!importFile ? (
                <div className="border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center hover:border-indigo-500/50 transition cursor-pointer relative bg-slate-950/20">
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                  <p className="font-bold text-slate-300">Drag & drop your provider inventory sheet here</p>
                  <p className="text-slate-500 text-[10px] mt-1">Accepts Excel (.xlsx) and CSV format</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border border-slate-800 rounded-2xl bg-slate-950">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-indigo-400" />
                      <div>
                        <h4 className="font-bold text-slate-200">{importFile.name}</h4>
                        <span className="text-[10px] text-slate-500">{(importFile.size / 1024).toFixed(1)} KB • Previewing parsed rows</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setImportFile(null);
                        setImportPreview([]);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold"
                    >
                      Clear File
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                          <th className="py-3 px-4">Row</th>
                          <th className="py-3 px-4">Imported Item</th>
                          <th className="py-3 px-4">Match Status</th>
                          <th className="py-3 px-4">Global Catalog Translation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300 bg-slate-950/10">
                        {importPreview.map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-3 px-4 text-slate-500 font-mono">{row.index}</td>
                            <td className="py-3 px-4">
                              <span className="font-black text-slate-200">{row.data.providerName}</span>
                              <span className="text-[10px] text-slate-500 block">Code: {row.data.providerCode}</span>
                            </td>
                            <td className="py-3 px-4">
                              {row.matchStatus === 'EXISTING' && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">Auto Matched</span>
                              )}
                              {row.matchStatus === 'MAPPED' && (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 font-bold">Already Mapped</span>
                              )}
                              {row.matchStatus === 'CONFLICT' && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">Suggestions</span>
                              )}
                              {row.matchStatus === 'NEW' && (
                                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold">No Match</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {row.matchedRecord ? (
                                <div className="flex items-center justify-between bg-indigo-950/20 border border-indigo-900/50 p-2 rounded-xl">
                                  <div>
                                    <span className="text-[9px] text-indigo-400 block font-bold">{row.matchedRecord.globalId}</span>
                                    <span className="font-bold text-slate-200">{row.matchedRecord.displayName || row.matchedRecord.name}</span>
                                  </div>
                                  <Check className="w-4 h-4 text-indigo-400" />
                                </div>
                              ) : row.suggestions?.length > 0 ? (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] text-slate-500 block">Fuzzy match suggestions:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {row.suggestions.map(sug => (
                                      <button
                                        key={sug._id}
                                        onClick={() => handleSelectSuggestion(idx, sug)}
                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:border-indigo-500 transition text-[9px] font-bold"
                                      >
                                        Map to {sug.displayName || sug.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-600 block italic">Cannot map: Please add item to global catalog first</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/60">
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="px-4 py-2 border border-slate-700 bg-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 text-slate-400"
              >
                Close Assistant
              </button>
              {importPreview.length > 0 && (
                <button
                  onClick={handleCommitImport}
                  disabled={importing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Commit Mappings
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderMappingPage;
