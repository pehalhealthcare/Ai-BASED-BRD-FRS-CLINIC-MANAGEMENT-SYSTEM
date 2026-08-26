import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Layers, Check, X, Ruler } from 'lucide-react';
import { healthcareCatalogApi } from '../../lib/api';
import toast from 'react-hot-toast';

const UnitsPage = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    symbol: '',
    category: 'General',
    description: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await healthcareCatalogApi.getUnits();
      setUnits(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to load laboratory units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.symbol || !form.name) {
      toast.error('Symbol and Name are required');
      return;
    }
    setSaving(true);
    try {
      await healthcareCatalogApi.createUnit(form);
      toast.success('Unit created successfully!');
      setIsAddOpen(false);
      setForm({ name: '', symbol: '', category: 'General', description: '' });
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save unit');
    } finally {
      setSaving(false);
    }
  };

  const filtered = units.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.symbol.toLowerCase().includes(search.toLowerCase()) ||
    u.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            Global Laboratory Units <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase font-bold">Catalogue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage symbols and units of measure for laboratory parameters.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Unit
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Units</span>
          <h3 className="text-2xl font-black text-slate-800">{units.length}</h3>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">System Defined</span>
          <h3 className="text-2xl font-black text-slate-800">{units.filter(u => u.isSystemDefined).length}</h3>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search units by name or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <th className="p-4">Symbol</th>
              <th className="p-4">Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Description</th>
              <th className="p-4 text-right">Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-55">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400 italic">No units match the search query.</td>
              </tr>
            ) : (
              filtered.map(u => (
                <tr key={u._id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-black text-slate-800">{u.symbol}</td>
                  <td className="p-4 font-bold text-slate-700">{u.name}</td>
                  <td className="p-4 text-slate-500">{u.category}</td>
                  <td className="p-4 text-slate-400">{u.description || '—'}</td>
                  <td className="p-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.isSystemDefined ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                      {u.isSystemDefined ? 'System' : 'Custom'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Add Global Laboratory Unit</h3>
              <button type="button" onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase">Symbol *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pg/mL"
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Endocrinology"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase">Unit Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Picograms per milliliter"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase">Description</label>
                <textarea
                  placeholder="Optional brief details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs min-h-[60px]"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl transition hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl transition hover:bg-indigo-700 shadow-lg shadow-indigo-150 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Unit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UnitsPage;
