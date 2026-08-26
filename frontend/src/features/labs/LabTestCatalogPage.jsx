import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Info, Check, Filter, X, Edit2, ShieldAlert,
  Sparkles, Layers, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { labApi } from '../../lib/api';
import { toast } from 'react-hot-toast';

const LabTestCatalogPage = () => {
  const [activeTab, setActiveTab] = useState('ATOMIC_TEST'); // ATOMIC_TEST, PANEL, PROFILE
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    panels: 0,
    profiles: 0
  });

  // Drawer / Selection
  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Drawer fields
  const [drawerForm, setDrawerForm] = useState({
    price: '',
    turnaroundTime: '24 Hours',
    processingMode: 'IN_HOUSE',
    outsourcedLabName: '',
    isActive: true
  });

  // Sentinel ref for infinite scroll
  const observerRef = useRef(null);

  // Load categories and metrics on mount
  useEffect(() => {
    loadCategories();
    loadMetrics();
  }, []);

  // Reload lists when search, category, tab, or page changes
  useEffect(() => {
    loadInitial();
  }, [activeTab, searchQuery, selectedCategory, pageSize]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page]);

  const loadCategories = async () => {
    try {
      const res = await labApi.listTests({ limit: 1 }); // Or categories fetch
      // fallback categories list
      setCategories(['Hematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Immunology', 'Serology']);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await labApi.listTests({ limit: 1 });
      const activeCount = res.pagination?.total || 0;
      setStats(prev => ({
        ...prev,
        active: activeCount,
        total: activeCount
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const loadInitial = async () => {
    setLoading(true);
    setPage(1);
    try {
      const res = await labApi.listAvailableGlobalTests({
        page: 1,
        limit: pageSize,
        search: searchQuery,
        category: selectedCategory,
        investigationType: activeTab
      });
      const data = res.data?.items || res.items || [];
      setItems(data);
      setHasMore(data.length >= pageSize);
    } catch (err) {
      toast.error('Failed to load catalog items');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await labApi.listAvailableGlobalTests({
        page: nextPage,
        limit: pageSize,
        search: searchQuery,
        category: selectedCategory,
        investigationType: activeTab
      });
      const data = res.data?.items || res.items || [];
      if (data.length > 0) {
        setItems(prev => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(data.length >= pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      toast.error('Failed to load more catalogue items');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (item) => {
    setSelectedItem(item);
    if (item.isActivated && item.localSettings) {
      setDrawerForm({
        price: item.localSettings.price || '',
        turnaroundTime: item.localSettings.turnaroundTime || '24 Hours',
        processingMode: item.localSettings.processingMode || 'IN_HOUSE',
        outsourcedLabName: item.localSettings.outsourcedLabName || '',
        isActive: item.localSettings.isActive
      });
    } else {
      setDrawerForm({
        price: '',
        turnaroundTime: item.normalReportingTime || '24 Hours',
        processingMode: 'IN_HOUSE',
        outsourcedLabName: '',
        isActive: true
      });
    }
    setDrawerOpen(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!drawerForm.price) {
      return toast.error('Please enter a valid pricing value');
    }

    try {
      if (selectedItem.isActivated && selectedItem.localSettings?._id) {
        // Update configuration
        await labApi.updateTest(selectedItem.localSettings._id, {
          price: Number(drawerForm.price),
          testPrice: Number(drawerForm.price),
          turnaroundTime: drawerForm.turnaroundTime,
          processingMode: drawerForm.processingMode,
          outsourcedLabName: drawerForm.outsourcedLabName,
          isActive: drawerForm.isActive
        });
        toast.success(`${selectedItem.name} local configuration saved successfully`);
      } else {
        // Activate single
        await labApi.bulkActivateGlobalTests({
          globalTestIds: [selectedItem._id]
        });
        // Find newly activated test and update its overrides
        const localList = await labApi.listTests({ limit: 100 });
        const found = (localList.data?.labTests || localList.labTests || []).find(t => String(t.globalLabTestId?._id || t.globalLabTestId) === String(selectedItem._id));
        if (found) {
          await labApi.updateTest(found._id, {
            price: Number(drawerForm.price),
            testPrice: Number(drawerForm.price),
            turnaroundTime: drawerForm.turnaroundTime,
            processingMode: drawerForm.processingMode,
            outsourcedLabName: drawerForm.outsourcedLabName,
            isActive: drawerForm.isActive
          });
        }
        toast.success(`${selectedItem.name} activated and configured successfully`);
      }

      setDrawerOpen(false);
      loadInitial();
      loadMetrics();
    } catch (err) {
      toast.error('Failed to configure local settings');
    }
  };

  // Bulk activation handler
  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    try {
      await labApi.bulkActivateGlobalTests({
        globalTestIds: selectedIds
      });
      toast.success(`Successfully activated ${selectedIds.length} tests`);
      setSelectedIds([]);
      loadInitial();
      loadMetrics();
    } catch (err) {
      toast.error('Bulk activation failed');
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px]" />

      {/* Header section */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                Laboratory Workspace
              </span>
              <span className="text-slate-400 text-xs">Clinic Master Catalogue Settings</span>
            </div>
            <h1 className="text-2xl font-black mt-1 text-white flex items-center gap-2">
              Laboratory Test Configuration <Layers className="w-5 h-5 text-indigo-500" />
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure the investigations, panels and profiles available at this laboratory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={loadInitial}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex gap-2">
            {[
              { id: 'ATOMIC_TEST', label: 'Investigations' },
              { id: 'PANEL', label: 'Panels' },
              { id: 'PROFILE', label: 'Profiles' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedIds([]);
                }}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-indigo-650 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, shortname or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map((c, idx) => (
                <option key={idx} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end">
            <span className="text-[10px] text-slate-400 font-bold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800/80">
              Showing {items.length} items
            </span>
          </div>
        </div>

        {/* Configurations Table */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-md">
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.length === items.filter(i => !i.isActivated).length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(items.filter(i => !i.isActivated).map(i => i._id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded border-slate-800 text-indigo-650 focus:ring-indigo-500 bg-slate-950" 
                    />
                  </th>
                  <th className="p-4">Test Code</th>
                  <th className="p-4">Investigation Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Processing Mode</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Local Price</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500">
                      {loading ? 'Searching master catalog...' : 'No available global catalogue items matching criteria.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr 
                      key={item._id} 
                      className={`hover:bg-slate-800/30 transition-all ${
                        item.isActivated ? 'bg-slate-900/20' : 'bg-transparent'
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          disabled={item.isActivated}
                          checked={selectedIds.includes(item._id)}
                          onChange={() => handleToggleSelect(item._id)}
                          className="rounded border-slate-800 text-indigo-650 focus:ring-indigo-500 bg-slate-950 disabled:opacity-30"
                        />
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-350">{item.globalId}</td>
                      <td className="p-4 font-bold text-slate-100">{item.name}</td>
                      <td className="p-4 text-slate-450">{item.department}</td>
                      <td className="p-4 text-slate-450">{item.investigationType}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.localSettings?.processingMode === 'OUTSOURCED'
                            ? 'bg-amber-500/10 text-amber-450 border border-amber-500/20'
                            : item.isActivated 
                            ? 'bg-blue-500/10 text-blue-450 border border-blue-500/20'
                            : 'text-slate-500 bg-slate-900/50'
                        }`}>
                          {item.localSettings?.processingMode || (item.isActivated ? 'IN_HOUSE' : '--')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.isActivated 
                            ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                            : 'bg-slate-850 text-slate-400 border border-slate-800/50'
                        }`}>
                          {item.isActivated ? 'Activated' : 'Not Configured'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-200">
                        {item.localSettings?.price ? `₹${item.localSettings.price}` : '--'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenDrawer(item)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-white rounded-lg transition-all font-bold flex items-center gap-1.5 ml-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          {item.isActivated ? 'Configure' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {/* Sentinel Loader element for Infinite scrolling */}
                {hasMore && (
                  <tr ref={observerRef}>
                    <td colSpan={9} className="p-4 text-center text-slate-500 animate-pulse text-[11px]">
                      Loading more diagnostic items...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Bulk Activation Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 border border-slate-700/80 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-lg flex items-center gap-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-xs font-bold text-slate-300">
            Selected <strong className="text-indigo-400">{selectedIds.length}</strong> catalog items for activation
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 hover:bg-slate-800 text-xs font-bold text-slate-400 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkActivate}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-xs font-black text-white rounded-xl transition shadow-lg shadow-indigo-600/30"
            >
              Activate Selected
            </button>
          </div>
        </div>
      )}

      {/* Right sliding Drawer for settings override configuration */}
      {drawerOpen && selectedItem && (
        <>
          {/* Overlay backdrop */}
          <div 
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 transition-all duration-300"
          />

          <div className="fixed top-0 right-0 h-full w-[420px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-350">
            <div>
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-black text-white">Configure Local Test Settings</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Customize local price, TAT, and availability parameters.</p>
                </div>
                <button 
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Item info header card */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 my-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Test Reference</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono uppercase">{selectedItem.globalId}</span>
                </div>
                <h3 className="text-sm font-black text-slate-100">{selectedItem.name}</h3>
                <div className="text-[11px] text-slate-400 flex gap-2">
                  <span>{selectedItem.category}</span>
                  <span>•</span>
                  <span>{selectedItem.sampleType}</span>
                </div>
              </div>

              {/* Main settings form */}
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1.5">Local Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter local test price e.g. 350"
                    value={drawerForm.price}
                    onChange={(e) => setDrawerForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-650"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1.5">Turnaround Time (TAT)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12 Hours, 24 Hours, Same Day"
                    value={drawerForm.turnaroundTime}
                    onChange={(e) => setDrawerForm(prev => ({ ...prev, turnaroundTime: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-650"
                  />
                  {/* Preset Pills */}
                  <div className="flex gap-2 mt-2">
                    {['4 Hours', '12 Hours', '24 Hours', '48 Hours'].map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setDrawerForm(prev => ({ ...prev, turnaroundTime: time }))}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition ${
                          drawerForm.turnaroundTime === time
                            ? 'bg-indigo-650 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-2">Performing Processing Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="processingMode"
                        value="IN_HOUSE"
                        checked={drawerForm.processingMode === 'IN_HOUSE'}
                        onChange={(e) => setDrawerForm(prev => ({ ...prev, processingMode: e.target.value }))}
                        className="text-indigo-650 focus:ring-indigo-500 border-slate-800 bg-slate-950"
                      />
                      <span className="text-xs text-slate-200 font-bold">In-House</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="processingMode"
                        value="OUTSOURCED"
                        checked={drawerForm.processingMode === 'OUTSOURCED'}
                        onChange={(e) => setDrawerForm(prev => ({ ...prev, processingMode: e.target.value }))}
                        className="text-indigo-650 focus:ring-indigo-500 border-slate-800 bg-slate-950"
                      />
                      <span className="text-xs text-slate-200 font-bold">Outsourced</span>
                    </label>
                  </div>
                </div>

                {drawerForm.processingMode === 'OUTSOURCED' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1.5">Laboratory Partner Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Reference Labs"
                      value={drawerForm.outsourcedLabName}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, outsourcedLabName: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-650"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={drawerForm.isActive}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-slate-800 text-indigo-650 focus:ring-indigo-500 bg-slate-950"
                    />
                    <div>
                      <span className="text-xs text-slate-100 font-bold block">Available for Patient Booking</span>
                      <span className="text-[10px] text-slate-500 block">Uncheck to temporarily hide from local patient catalogs.</span>
                    </div>
                  </label>
                </div>
              </form>
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="w-1/2 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-lg shadow-indigo-650/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LabTestCatalogPage;
