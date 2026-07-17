import React, { useState, useEffect } from 'react';
import { promoApi, subscriptionApi } from '../../lib/api';
import {
  Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, Check, X, Tag, IndianRupee, Calendar,
  Percent, Search
} from 'lucide-react';

const EMPTY_PROMO = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  applicablePlans: [],
  maxUsage: '',
  perUserLimit: 1,
  minPurchaseAmount: 0,
  maxDiscount: 0,
  isActive: true,
};

const statusBadge = (promo) => {
  if (!promo.isActive) return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">Inactive</span>;
  const now = new Date();
  if (now < new Date(promo.startDate)) return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">Upcoming</span>;
  if (now > new Date(promo.endDate)) return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">Expired</span>;
  return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Active</span>;
};

const SuperAdminPromoCodes = () => {
  const [promos, setPromos] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingPromo, setEditingPromo] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [promosRes, plansRes] = await Promise.all([promoApi.getAll(), subscriptionApi.getAllPlans()]);
      setPromos(promosRes.data?.promos || promosRes.promos || []);
      setPlans(plansRes.data?.plans || plansRes.plans || []);
    } catch (e) {
      setError('Failed to load promo codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openNew = () => { setEditingPromo({ ...EMPTY_PROMO, applicablePlans: [] }); setIsNew(true); setError(''); setSuccess(''); };
  const openEdit = (p) => { setEditingPromo({ ...p, applicablePlans: (p.applicablePlans || []).map(pl => pl._id || pl) }); setIsNew(false); setError(''); setSuccess(''); };
  const closeEdit = () => { setEditingPromo(null); setIsNew(false); };

  const handleSave = async () => {
    if (!editingPromo.code || !editingPromo.discountValue) {
      setError('Code and Discount Value are required.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        ...editingPromo,
        maxUsage: editingPromo.maxUsage === '' ? null : Number(editingPromo.maxUsage),
      };
      if (isNew) {
        await promoApi.create(payload);
        setSuccess('Promo code created successfully.');
      } else {
        await promoApi.update(editingPromo._id, payload);
        setSuccess('Promo code updated successfully.');
      }
      await loadData();
      closeEdit();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save promo code.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promo code? This action cannot be undone.')) return;
    try {
      await promoApi.remove(id);
      setSuccess('Promo code deleted.');
      await loadData();
    } catch (e) {
      setError('Failed to delete promo code.');
    }
  };

  const handleToggle = async (promo) => {
    try {
      await promoApi.update(promo._id, { isActive: !promo.isActive });
      setSuccess(`Promo code ${promo.isActive ? 'deactivated' : 'activated'}.`);
      await loadData();
    } catch (e) { setError('Failed to update promo status.'); }
  };

  const togglePlan = (planId) => {
    setEditingPromo(prev => ({
      ...prev,
      applicablePlans: prev.applicablePlans.includes(planId)
        ? prev.applicablePlans.filter(p => p !== planId)
        : [...prev.applicablePlans, planId]
    }));
  };

  const filtered = promos.filter(p =>
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Tag className="w-7 h-7 text-purple-600" /> Promo Codes
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage discount codes for subscriptions.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-200 hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> New Promo Code
        </button>
      </div>

      {error && <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><X className="w-4 h-4" />{error}</div>}
      {success && <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2"><Check className="w-4 h-4" />{success}</div>}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search promo codes..." className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 shadow-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-purple-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No promo codes found</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Code', 'Discount', 'Validity', 'Usage', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(promo => (
                <tr key={promo._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-800 text-sm font-mono">{promo.code}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{promo.description}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {promo.discountType === 'percentage'
                        ? <Percent className="w-3.5 h-3.5 text-purple-500" />
                        : <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />}
                      <span className="font-bold text-slate-800 text-sm">
                        {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue}`}
                      </span>
                    </div>
                    {promo.maxDiscount > 0 && <p className="text-xs text-slate-400 mt-0.5">Max ₹{promo.maxDiscount}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-slate-700 font-semibold">{new Date(promo.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                    <p className="text-xs text-slate-400">→ {new Date(promo.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-slate-700">{promo.usageCount} / {promo.maxUsage ?? '∞'}</p>
                  </td>
                  <td className="px-5 py-4">{statusBadge(promo)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggle(promo)} title={promo.isActive ? 'Deactivate' : 'Activate'}>
                        {promo.isActive ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                      </button>
                      <button onClick={() => openEdit(promo)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(promo._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Modal */}
      {editingPromo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeEdit()}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h2 className="text-xl font-black text-slate-900">{isNew ? 'New Promo Code' : 'Edit Promo Code'}</h2>
              <button onClick={closeEdit} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"><X className="w-4 h-4 text-slate-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Promo Code *</label>
                <input value={editingPromo.code} onChange={e => setEditingPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))} disabled={!isNew}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:opacity-50 uppercase"
                  placeholder="SAVE20" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
                <input value={editingPromo.description} onChange={e => setEditingPromo(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  placeholder="Save 20% on first month" />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Discount Type</label>
                  <select value={editingPromo.discountType} onChange={e => setEditingPromo(p => ({ ...p, discountType: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500">
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Discount Value</label>
                  <input type="number" value={editingPromo.discountValue} onChange={e => setEditingPromo(p => ({ ...p, discountValue: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500" />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Start Date</label>
                  <input type="date" value={editingPromo.startDate?.slice(0, 10)} onChange={e => setEditingPromo(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">End Date</label>
                  <input type="date" value={editingPromo.endDate?.slice(0, 10)} onChange={e => setEditingPromo(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500" />
                </div>
              </div>

              {/* Advanced Config */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Max Total Uses (blank = ∞)</label>
                  <input type="number" value={editingPromo.maxUsage ?? ''} onChange={e => setEditingPromo(p => ({ ...p, maxUsage: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500" placeholder="∞" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Per User Limit</label>
                  <input type="number" value={editingPromo.perUserLimit} onChange={e => setEditingPromo(p => ({ ...p, perUserLimit: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Min Purchase (₹)</label>
                  <input type="number" value={editingPromo.minPurchaseAmount} onChange={e => setEditingPromo(p => ({ ...p, minPurchaseAmount: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Max Discount Cap (₹)</label>
                  <input type="number" value={editingPromo.maxDiscount} onChange={e => setEditingPromo(p => ({ ...p, maxDiscount: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500" placeholder="0 = no cap" />
                </div>
              </div>

              {/* Applicable Plans */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Applicable Plans (none = all plans)</label>
                <div className="flex flex-wrap gap-2">
                  {plans.map(plan => {
                    const selected = editingPromo.applicablePlans.includes(plan._id);
                    return (
                      <button key={plan._id} type="button" onClick={() => togglePlan(plan._id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${selected ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-purple-300'}`}>
                        {plan.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800 text-sm">Active</p>
                  <p className="text-xs text-slate-400">Inactive codes cannot be applied during checkout.</p>
                </div>
                <button onClick={() => setEditingPromo(p => ({ ...p, isActive: !p.isActive }))}>
                  {editingPromo.isActive ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={closeEdit} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-purple-200 hover:opacity-90 transition disabled:opacity-50">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPromoCodes;
