import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, SlidersHorizontal, MapPin, Phone, Mail, Globe, Check, AlertCircle, X, ChevronRight, ChevronLeft, Building, HelpCircle, Laptop, Settings, Clock, CheckSquare, Link } from 'lucide-react';
import { providersApi } from '../../lib/api';
import toast from 'react-hot-toast';

const ProvidersPage = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTypeTab, setActiveTypeTab] = useState('Pharmacy'); // 'Pharmacy' | 'Laboratory'
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubtype, setSelectedSubtype] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal / Wizard State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingId, setEditingId] = useState(null);

  // Form payload
  const [formData, setFormData] = useState({
    name: '',
    providerType: 'Pharmacy',
    providerSubtype: 'Internal',
    providerCategory: 'Own Provider',
    logo: '',
    description: '',
    contactPerson: '',
    phone: '',
    email: '',
    website: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    latitude: '',
    longitude: '',
    services: {
      homeSampleCollection: false,
      walkInTesting: false,
      reportUpload: false,
      reportDownload: false,
      digitalReports: false,
      walkInPurchase: false,
      homeDelivery: false,
      pickupAvailable: false,
      prescriptionRequired: false
    },
    workingHours: {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      openingTime: '09:00',
      closingTime: '21:00',
      emergencyServices: false,
      averageTurnaroundTime: '',
      homeDeliveryRadius: 0
    },
    assignedBranches: [],
    integrationType: 'None',
    apiProviderName: '',
    integrationStatus: 'Not Configured',
    status: 'Active'
  });

  // Summary Metrics
  const [stats, setStats] = useState({
    pharmacy: { total: 0, active: 0, internal: 0, external: 0 },
    laboratory: { total: 0, active: 0, internal: 0, external: 0 }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch branches
      const branchRes = await providersApi.getBranches();
      setBranches(branchRes?.data ?? branchRes ?? []);

      // 2. Fetch Providers list
      const params = {
        search,
        providerType: activeTypeTab,
        providerCategory: selectedCategory,
        status: selectedStatus,
        city: cityFilter,
        branch: selectedBranch,
        page,
        limit: 8
      };
      const res = await providersApi.getProviders(params);
      const data = res?.data ?? res ?? {};
      setProviders(data.items || []);
      setTotalPages(Math.ceil((data.total || 0) / 8));

      // 3. Compute Metrics/Stats (Load all to parse counts)
      const allRes = await providersApi.getProviders({ limit: 1000 });
      const allItems = allRes?.data?.items ?? allRes?.items ?? [];
      
      const pharmItems = allItems.filter(p => p.providerType === 'Pharmacy');
      const labItems = allItems.filter(p => p.providerType === 'Laboratory');

      setStats({
        pharmacy: {
          total: pharmItems.length,
          active: pharmItems.filter(p => p.status === 'Active').length,
          internal: pharmItems.filter(p => p.providerSubtype === 'Internal').length,
          external: pharmItems.filter(p => p.providerSubtype === 'External').length
        },
        laboratory: {
          total: labItems.length,
          active: labItems.filter(p => p.status === 'Active').length,
          internal: labItems.filter(p => p.providerSubtype === 'Internal').length,
          external: labItems.filter(p => p.providerSubtype === 'External').length
        }
      });

    } catch (err) {
      toast.error('Failed to load healthcare providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, activeTypeTab, selectedCategory, selectedStatus, cityFilter, selectedBranch, page]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setCurrentStep(1);
    setFormData({
      name: '',
      providerType: activeTypeTab,
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      logo: '',
      description: '',
      contactPerson: '',
      phone: '',
      email: '',
      website: '',
      address: { line1: '', line2: '', city: '', state: '', country: 'India', pincode: '' },
      latitude: '',
      longitude: '',
      services: {
        homeSampleCollection: false,
        walkInTesting: false,
        reportUpload: false,
        reportDownload: false,
        digitalReports: false,
        walkInPurchase: false,
        homeDelivery: false,
        pickupAvailable: false,
        prescriptionRequired: false
      },
      workingHours: {
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        openingTime: '09:00',
        closingTime: '21:00',
        emergencyServices: false,
        averageTurnaroundTime: '',
        homeDeliveryRadius: 0
      },
      assignedBranches: branches.length ? [branches[0]._id] : [],
      integrationType: 'None',
      apiProviderName: '',
      integrationStatus: 'Not Configured',
      status: 'Active'
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p._id);
    setCurrentStep(1);
    setFormData({
      ...p,
      address: { ...p.address },
      services: { ...p.services },
      workingHours: { ...p.workingHours },
      assignedBranches: p.assignedBranches?.map(b => b._id || b) || []
    });
    setIsAddOpen(true);
  };

  const handleToggleStatus = async (p) => {
    try {
      const nextStatus = p.status === 'Active' ? 'Inactive' : 'Active';
      await providersApi.changeStatus(p._id, nextStatus);
      toast.success(`Provider status changed to ${nextStatus}`);
      loadData();
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  const handleArchive = async (p) => {
    if (!window.confirm(`Are you sure you want to delete/archive provider: ${p.name}?`)) return;
    try {
      await providersApi.archiveProvider(p._id);
      toast.success('Provider archived successfully');
      loadData();
    } catch (err) {
      toast.error('Failed to archive provider');
    }
  };

  const handleBranchSelect = (branchId) => {
    setFormData(prev => {
      const alreadyAssigned = prev.assignedBranches.includes(branchId);
      const nextBranches = alreadyAssigned
        ? prev.assignedBranches.filter(id => id !== branchId)
        : [...prev.assignedBranches, branchId];
      return { ...prev, assignedBranches: nextBranches };
    });
  };

  const handleDaySelect = (day) => {
    setFormData(prev => {
      const workingDays = prev.workingHours.workingDays.includes(day)
        ? prev.workingHours.workingDays.filter(d => d !== day)
        : [...prev.workingHours.workingDays, day];
      return {
        ...prev,
        workingHours: { ...prev.workingHours, workingDays }
      };
    });
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !formData.name) {
      return toast.error('Provider Name is required');
    }
    if (currentStep === 2 && (!formData.contactPerson || !formData.phone || !formData.email)) {
      return toast.error('Please fill all required contact details');
    }
    if (currentStep === 3 && (!formData.address.line1 || !formData.address.city || !formData.address.pincode)) {
      return toast.error('Please fill required address fields');
    }
    setCurrentStep(s => Math.min(s + 1, 8));
  };

  const handleSubmit = async () => {
    try {
      const payload = { ...formData };
      if (editingId) {
        await providersApi.updateProvider(editingId, payload);
        toast.success('Provider updated successfully');
      } else {
        await providersApi.createProvider(payload);
        toast.success('Provider registered successfully');
      }
      setIsAddOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save provider');
    }
  };

  const activeStats = activeTypeTab === 'Pharmacy' ? stats.pharmacy : stats.laboratory;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Healthcare Providers
            <span className="text-xs font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-700">Clinic Admin</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage internal resources, partner networks, referral configurations, and integrations.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-2xl hover:opacity-95 transition shadow-lg shadow-blue-100"
        >
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Total {activeTypeTab}s</span>
          <span className="text-3xl font-black text-slate-800 mt-2 block">{activeStats.total}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Active Status</span>
          <span className="text-3xl font-black text-emerald-600 mt-2 block">{activeStats.active}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Internal Resources</span>
          <span className="text-3xl font-black text-indigo-600 mt-2 block">{activeStats.internal}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">External / Referrals</span>
          <span className="text-3xl font-black text-amber-600 mt-2 block">{activeStats.external}</span>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200">
        {['Pharmacy', 'Laboratory'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTypeTab(tab);
              setPage(1);
            }}
            className={`px-6 py-3 font-bold text-sm -mb-px border-b-2 transition ${
              activeTypeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
            }`}
          >
            {tab} Providers
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTypeTab.toLowerCase()} by name, contact, ID...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Own Provider">Own Provider</option>
              <option value="Partner Provider">Partner Provider</option>
              <option value="Third-party Provider">Third-party Provider</option>
              <option value="Government Provider">Government Provider</option>
              <option value="Corporate Provider">Corporate Provider</option>
            </select>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Grid of Providers Cards */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
            <Settings className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            Loading providers list...
          </div>
        ) : providers.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            No {activeTypeTab.toLowerCase()} providers found.
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {providers.map(p => (
              <div key={p._id} className="border border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-white transition hover:shadow-lg p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Card Header (Logo and Subtype) */}
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg">
                      {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover rounded-2xl" /> : p.name.substring(0,2).toUpperCase()}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                      p.status === 'Suspended' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Body details */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{p.globalId}</span>
                    <h3 className="font-black text-slate-800 text-base leading-tight mt-0.5">{p.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500">{p.providerSubtype}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-[9px] font-bold text-indigo-600">{p.providerCategory}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{p.address.city}, {p.address.state}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{p.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Branch badges */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {p.assignedBranches?.slice(0, 2).map((br, index) => (
                      <span key={index} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-600">
                        {br.name}
                      </span>
                    ))}
                    {p.assignedBranches?.length > 2 && (
                      <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-400">
                        +{p.assignedBranches.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedProvider(p);
                        setIsDetailOpen(true);
                      }}
                      title="View Details"
                      className="p-2 hover:bg-indigo-50 rounded-xl transition text-indigo-600 flex justify-center"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      title="Edit details"
                      className="p-2 hover:bg-blue-50 rounded-xl transition text-blue-600 flex justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/providers/${p._id}/mapping`)}
                      title="Manage Mappings"
                      className="p-2 hover:bg-emerald-50 rounded-xl transition text-emerald-600 flex justify-center"
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(p)}
                      title={p.status === 'Active' ? 'Deactivate' : 'Activate'}
                      className="p-2 hover:bg-amber-50 rounded-xl transition text-amber-600 flex justify-center"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleArchive(p)}
                      title="Archive Provider"
                      className="p-2 hover:bg-red-50 rounded-xl transition text-red-600 flex justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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

      {/* Multi-step Add / Edit Provider Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingId ? 'Modify Provider Record' : `Register ${activeTypeTab} Provider`}
                </h3>
                <span className="text-xs text-slate-400">Step {currentStep} of 8: Step Title</span>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Progress bar */}
            <div className="bg-slate-50 h-1.5 w-full flex">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`flex-1 h-full transition ${i + 1 <= currentStep ? 'bg-blue-600' : 'bg-slate-100'}`} />
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* STEP 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Provider Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Apollo Pharmacy Indirapuram"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Provider Type</label>
                      <select
                        value={formData.providerType}
                        onChange={(e) => setFormData({ ...formData, providerType: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
                      >
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Laboratory">Laboratory</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Subtype</label>
                      <select
                        value={formData.providerSubtype}
                        onChange={(e) => setFormData({ ...formData, providerSubtype: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
                      >
                        <option value="Internal">Internal Resource</option>
                        <option value="External">External Provider</option>
                        <option value="Referral">Referral Facility</option>
                        <option value="API Integrated">API Integrated Facility</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Category</label>
                      <select
                        value={formData.providerCategory}
                        onChange={(e) => setFormData({ ...formData, providerCategory: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
                      >
                        <option value="Own Provider">Own Provider</option>
                        <option value="Partner Provider">Partner Provider</option>
                        <option value="Third-party Provider">Third-party Provider</option>
                        <option value="Government Provider">Government Provider</option>
                        <option value="Corporate Provider">Corporate Provider</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Logo URL (Optional)</label>
                    <input
                      type="text"
                      value={formData.logo}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description about the facility services..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Contact Information */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Contact Person Name</label>
                    <input
                      type="text"
                      required
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Mobile Number</label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="rajesh@apollo.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Website URL (Optional)</label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="www.apollo.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Address Details */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Address Line 1</label>
                      <input
                        type="text"
                        required
                        value={formData.address.line1}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, line1: e.target.value }
                        })}
                        placeholder="Flat/House No, Building"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Landmark / Line 2</label>
                      <input
                        type="text"
                        value={formData.address.line2}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, line2: e.target.value }
                        })}
                        placeholder="Near Metro Station"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">City</label>
                      <input
                        type="text"
                        required
                        value={formData.address.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value }
                        })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">State</label>
                      <input
                        type="text"
                        required
                        value={formData.address.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value }
                        })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Pincode</label>
                      <input
                        type="text"
                        required
                        value={formData.address.pincode}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, pincode: e.target.value }
                        })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Coordinates */}
                  <div className="grid grid-cols-2 gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="28.6139"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="77.2090"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Branch Assignment */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Assign to Clinic Branches</span>
                  <p className="text-xs text-slate-400">Select which clinic branches can use this provider for orders and prescriptions.</p>

                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                    {branches.map(br => (
                      <label
                        key={br._id}
                        onClick={() => handleBranchSelect(br._id)}
                        className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-50 transition ${
                          formData.assignedBranches.includes(br._id)
                            ? 'border-blue-600 bg-blue-50/15 text-blue-700 font-bold'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Building className="w-4 h-4 text-slate-400" />
                          <div className="text-left">
                            <span className="text-sm block">{br.name}</span>
                            <span className="text-[9px] text-slate-400 block">{br.code}</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.assignedBranches.includes(br._id)}
                          onChange={() => {}}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 pointer-events-none"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: Service Configuration */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Service Switches</span>

                  {formData.providerType === 'Laboratory' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'homeSampleCollection', label: 'Home Sample Collection' },
                        { key: 'walkInTesting', label: 'Walk-in Testing' },
                        { key: 'reportUpload', label: 'Report Upload Enabled' },
                        { key: 'reportDownload', label: 'Report Download Enabled' },
                        { key: 'digitalReports', label: 'Digital Reports Generated' }
                      ].map(sw => (
                        <label
                          key={sw.key}
                          className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition ${
                            formData.services[sw.key] ? 'border-indigo-600 bg-indigo-50/10 text-indigo-700' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="text-xs font-bold">{sw.label}</span>
                          <input
                            type="checkbox"
                            checked={formData.services[sw.key]}
                            onChange={(e) => setFormData({
                              ...formData,
                              services: { ...formData.services, [sw.key]: e.target.checked }
                            })}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'walkInPurchase', label: 'Walk-in Purchase' },
                        { key: 'homeDelivery', label: 'Home Delivery Option' },
                        { key: 'pickupAvailable', label: 'Pickup Locker Available' },
                        { key: 'prescriptionRequired', label: 'Strict Rx Validation' }
                      ].map(sw => (
                        <label
                          key={sw.key}
                          className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition ${
                            formData.services[sw.key] ? 'border-indigo-600 bg-indigo-50/10 text-indigo-700' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="text-xs font-bold">{sw.label}</span>
                          <input
                            type="checkbox"
                            checked={formData.services[sw.key]}
                            onChange={(e) => setFormData({
                              ...formData,
                              services: { ...formData.services, [sw.key]: e.target.checked }
                            })}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: Operational Details */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Operational Details</span>
                  
                  {/* Working Days */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Working Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDaySelect(day)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                            formData.workingHours.workingDays.includes(day)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {day.substring(0,3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Opening Time</label>
                      <input
                        type="time"
                        value={formData.workingHours.openingTime}
                        onChange={(e) => setFormData({
                          ...formData,
                          workingHours: { ...formData.workingHours, openingTime: e.target.value }
                        })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 uppercase">Closing Time</label>
                      <input
                        type="time"
                        value={formData.workingHours.closingTime}
                        onChange={(e) => setFormData({
                          ...formData,
                          workingHours: { ...formData.workingHours, closingTime: e.target.value }
                        })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {formData.providerType === 'Laboratory' ? (
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase">Avg Turnaround Time</label>
                        <input
                          type="text"
                          value={formData.workingHours.averageTurnaroundTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            workingHours: { ...formData.workingHours, averageTurnaroundTime: e.target.value }
                          })}
                          placeholder="e.g. 12-24 Hours"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase">Delivery Radius (km)</label>
                        <input
                          type="number"
                          value={formData.workingHours.homeDeliveryRadius}
                          onChange={(e) => setFormData({
                            ...formData,
                            workingHours: { ...formData.workingHours, homeDeliveryRadius: parseInt(e.target.value) || 0 }
                          })}
                          placeholder="e.g. 5"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-6">
                      <input
                        type="checkbox"
                        id="emergencyServices"
                        checked={formData.workingHours.emergencyServices}
                        onChange={(e) => setFormData({
                          ...formData,
                          workingHours: { ...formData.workingHours, emergencyServices: e.target.checked }
                        })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <label htmlFor="emergencyServices" className="text-sm font-bold text-slate-700 cursor-pointer">Emergency Services (24/7)</label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: Integration Information */}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Integration Profile</span>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">Integration Type</label>
                    <select
                      value={formData.integrationType}
                      onChange={(e) => setFormData({ ...formData, integrationType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
                    >
                      <option value="None">None (Local Record)</option>
                      <option value="Manual">Manual Reconciliation</option>
                      <option value="API Integration">API Integration Ready</option>
                    </select>
                  </div>

                  {formData.integrationType === 'API Integration' && (
                    <div className="grid grid-cols-2 gap-4 p-4 border border-blue-50 rounded-2xl bg-blue-50/10">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase">API Provider Name</label>
                        <input
                          type="text"
                          value={formData.apiProviderName}
                          onChange={(e) => setFormData({ ...formData, apiProviderName: e.target.value })}
                          placeholder="e.g. Pharmeasy, SRL Labs"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500 uppercase">Integration Status</label>
                        <input
                          type="text"
                          value={formData.integrationStatus}
                          onChange={(e) => setFormData({ ...formData, integrationStatus: e.target.value })}
                          placeholder="e.g. Awaiting API Credentials"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 8: Review & Save */}
              {currentStep === 8 && (
                <div className="space-y-4">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider block text-center">Verification & Review Summary</span>

                  <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong className="text-slate-400 block uppercase font-bold">Facility Name</strong>
                        <span className="text-sm font-black text-slate-800">{formData.name}</span>
                      </div>
                      <div>
                        <strong className="text-slate-400 block uppercase font-bold">Type / Category</strong>
                        <span className="text-sm font-bold text-slate-800">{formData.providerType} / {formData.providerCategory}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong className="text-slate-400 block uppercase font-bold">Contact Person</strong>
                        <span className="text-slate-700 block">{formData.contactPerson} ({formData.phone})</span>
                      </div>
                      <div>
                        <strong className="text-slate-400 block uppercase font-bold">Address</strong>
                        <span className="text-slate-700 block">
                          {formData.address.line1}, {formData.address.city}, {formData.address.state} - {formData.address.pincode}
                        </span>
                      </div>
                    </div>

                    <div>
                      <strong className="text-slate-400 block uppercase font-bold">Assigned Branches count</strong>
                      <span className="text-slate-700 block font-bold">{formData.assignedBranches.length} branch(es) mapped</span>
                    </div>

                    <div>
                      <strong className="text-slate-400 block uppercase font-bold">Working schedule</strong>
                      <span className="text-slate-700 block">
                        {formData.workingHours.workingDays.length} days open ({formData.workingHours.openingTime} - {formData.workingHours.closingTime})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between bg-slate-50">
              <button
                type="button"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep(s => Math.max(s - 1, 1))}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                {currentStep < 8 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                  >
                    Register & Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Details Inspector Modal */}
      {isDetailOpen && selectedProvider && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Provider Specifications</h3>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Header profile */}
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-2xl">
                  {selectedProvider.logo ? <img src={selectedProvider.logo} alt="" className="w-full h-full object-cover rounded-2xl" /> : selectedProvider.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{selectedProvider.globalId}</span>
                  <h4 className="text-lg font-black text-slate-800 leading-tight">{selectedProvider.name}</h4>
                  <div className="flex gap-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">{selectedProvider.providerSubtype}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-[10px] font-bold text-indigo-600">{selectedProvider.providerCategory}</span>
                  </div>
                </div>
              </div>

              {/* Contact info grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1 text-xs">
                  <strong className="text-slate-400 uppercase font-black tracking-wider block">Contact Person</strong>
                  <span className="text-slate-700 block font-bold">{selectedProvider.contactPerson}</span>
                  <span className="text-slate-500 block">{selectedProvider.phone}</span>
                  <span className="text-slate-500 block">{selectedProvider.email}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <strong className="text-slate-400 uppercase font-black tracking-wider block">Full Address</strong>
                  <span className="text-slate-700 block">
                    {selectedProvider.address.line1}, {selectedProvider.address.city}, {selectedProvider.address.state} - {selectedProvider.address.pincode}
                  </span>
                </div>
              </div>

              {/* Assigned Branches */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <strong className="text-xs font-black text-slate-400 uppercase tracking-wider block">Assigned Branches</strong>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProvider.assignedBranches?.map((br, index) => (
                    <span key={index} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                      {br.name} ({br.code})
                    </span>
                  ))}
                </div>
              </div>

              {/* Service configurations switches enabled */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <strong className="text-xs font-black text-slate-400 uppercase tracking-wider block">Enabled Services</strong>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(selectedProvider.services || {})
                    .filter(([_, enabled]) => enabled)
                    .map(([key, _]) => (
                      <div key={key} className="flex items-center gap-2 text-slate-700">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Working Schedule */}
              <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
                <strong className="text-xs font-black text-slate-400 uppercase tracking-wider block">Working Schedule</strong>
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{selectedProvider.workingHours?.openingTime} - {selectedProvider.workingHours?.closingTime}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {selectedProvider.workingHours?.workingDays?.map(d => (
                    <span key={d} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px]">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Integration status */}
              <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
                <strong className="text-xs font-black text-slate-400 uppercase tracking-wider block">Integration Details</strong>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-slate-600 block">Type: <strong>{selectedProvider.integrationType}</strong></span>
                  {selectedProvider.integrationType === 'API Integration' && (
                    <div className="mt-1 text-slate-500">
                      <span>Provider: <strong>{selectedProvider.apiProviderName}</strong></span>
                      <span className="block">Status: <strong>{selectedProvider.integrationStatus}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  navigate(`/admin/providers/${selectedProvider._id}/mapping`);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Link className="w-4 h-4" />
                Manage Mappings
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvidersPage;
