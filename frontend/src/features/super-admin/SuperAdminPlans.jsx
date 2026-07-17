import React, { useState, useEffect } from 'react';
import { subscriptionApi } from '../../lib/api';
import {
  Plus, Edit3, Copy, Archive, ToggleLeft, ToggleRight, RefreshCw,
  Check, X, ChevronDown, ChevronUp, Sparkles, Zap, Star, Crown, Package
} from 'lucide-react';

const ALL_FEATURES = [
  { key: 'appointments', label: 'Appointment Management' },
  { key: 'billing', label: 'Billing' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'emr', label: 'Basic EMR' },
  { key: 'sms', label: 'SMS Reminders' },
  { key: 'reports', label: 'Daily Reports' },
  { key: 'multi_doctor', label: 'Multi Doctor Management' },
  { key: 'ai_scheduling', label: 'AI Appointment Scheduling' },
  { key: 'pharmacy', label: 'Pharmacy Module' },
  { key: 'inventory', label: 'Inventory Management' },
  { key: 'labs', label: 'Lab Module' },
  { key: 'whatsapp', label: 'WhatsApp Integration' },
  { key: 'analytics', label: 'Analytics Dashboard' },
  { key: 'symptom_checker', label: 'AI Symptom Checker' },
  { key: 'consultation_assistant', label: 'AI Consultation Assistant' },
  { key: 'voice_to_text', label: 'Voice-to-Text Notes' },
  { key: 'ai_prescription_suggestions', label: 'AI Prescription Suggestions' },
  { key: 'ai_risk_scoring', label: 'AI Patient Risk Scoring' },
  { key: 'online_consultation', label: 'Online Consultation' },
  { key: 'multi_branch', label: 'Multi-Branch Support' },
  { key: 'api_access', label: 'API Access' },
  { key: 'unlimited_users', label: 'Unlimited Users' },
  { key: 'unlimited_patients', label: 'Unlimited Patients' },
  { key: 'unlimited_branches', label: 'Unlimited Branches' },
  { key: 'dedicated_server', label: 'Dedicated Server' },
  { key: 'custom_branding', label: 'Custom Branding' },
  { key: 'insurance', label: 'Insurance Integration' },
  { key: 'abdm', label: 'ABDM Integration' },
  { key: 'custom_apis', label: 'Custom APIs' },
  { key: 'priority_support', label: '24×7 Priority Support' },
];

const EMPTY_PLAN = {
  name: '',
  code: '',
  priceMonthly: 0,
  priceYearly: 0,
  features: [],
  trialPeriodDays: 14,
  displayOrder: 0,
  limits: { maxDoctors: null, maxStaff: null, maxPatients: null },
  isActive: true,
};

const planIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('enterprise')) return <Crown className="w-5 h-5" />;
  if (n.includes('premium')) return <Star className="w-5 h-5" />;
  if (n.includes('professional')) return <Zap className="w-5 h-5" />;
  return <Package className="w-5 h-5" />;
};

const SuperAdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingPlan, setEditingPlan] = useState(null); // null | plan object
  const [isNew, setIsNew] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    setError('');
    try {
      // Admin endpoint: returns all plans including inactive & archived
      const res = await subscriptionApi.getAllPlans();
      const list = res?.data?.plans ?? res?.plans ?? [];
      setPlans(list);
    } catch (e) {
      // Fallback: public endpoint (active plans only)
      try {
        const res = await subscriptionApi.getPublicPlans();
        const list = res?.data?.plans ?? res?.plans ?? [];
        setPlans(list);
        if (list.length > 0) {
          setError('Showing active plans only — archived/inactive plans hidden (auth issue with admin endpoint).');
        } else {
          setError('No plans found. Check that the backend is running and database is seeded.');
        }
      } catch (e2) {
        setError('Failed to load plans. Check if the backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const openNew = () => {
    setEditingPlan({ ...EMPTY_PLAN });
    setIsNew(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (plan) => {
    setEditingPlan({
      ...plan,
      features: [...(plan.features || [])],
      limits: { ...plan.limits }
    });
    setIsNew(false);
    setError('');
    setSuccess('');
  };

  const closeEdit = () => { setEditingPlan(null); setIsNew(false); };

  const toggleFeature = (key) => {
    setEditingPlan(prev => ({
      ...prev,
      features: prev.features.includes(key)
        ? prev.features.filter(f => f !== key)
        : [...prev.features, key]
    }));
  };

  const handleSave = async () => {
    if (!editingPlan.name || !editingPlan.code) {
      setError('Name and Code are required.'); return;
    }
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        await subscriptionApi.createPlan(editingPlan);
        setSuccess('Plan created successfully.');
      } else {
        await subscriptionApi.updatePlan(editingPlan._id, editingPlan);
        setSuccess('Plan updated successfully.');
      }
      await loadPlans();
      closeEdit();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await subscriptionApi.duplicatePlan(id);
      setSuccess('Plan duplicated.');
      await loadPlans();
    } catch (e) {
      setError('Failed to duplicate plan.');
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this plan? It will be hidden from the registration wizard.')) return;
    try {
      await subscriptionApi.archivePlan(id);
      setSuccess('Plan archived.');
      await loadPlans();
    } catch (e) {
      setError('Failed to archive plan.');
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      await subscriptionApi.updatePlan(plan._id, { isActive: !plan.isActive });
      setSuccess(`Plan ${plan.isActive ? 'disabled' : 'enabled'}.`);
      await loadPlans();
    } catch (e) {
      setError('Failed to update plan status.');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-blue-600" /> Subscription Plans
            {plans.length > 0 && (
              <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage pricing, features, and limits dynamically — no code changes required.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
            title="Refresh plans"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><X className="w-4 h-4 shrink-0" />{error}</span>
          <button onClick={loadPlans} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition"><RefreshCw className="w-3 h-3" /> Retry</button>
        </div>
      )}
      {success && <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2"><Check className="w-4 h-4" />{success}</div>}

      {/* Plans Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-blue-400 animate-spin" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <Package className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-black text-slate-700 mb-1">No Plans Found</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
            No subscription plans exist yet. Create your first plan or check that the backend server is running and database is seeded.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={loadPlans} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition">
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
            <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:opacity-90 transition">
              <Plus className="w-4 h-4" /> Create First Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
          {plans.map(plan => (
            <div key={plan._id} className={`bg-white rounded-3xl shadow-sm border transition-all ${plan.isArchived ? 'opacity-50 border-dashed border-slate-300' : plan.isActive ? 'border-slate-100 hover:border-blue-100 hover:shadow-md' : 'border-slate-200 opacity-70'}`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      {planIcon(plan.name)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg">{plan.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">{plan.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.isArchived && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">Archived</span>}
                    {!plan.isArchived && (
                      <button onClick={() => handleToggleActive(plan)} title={plan.isActive ? 'Disable' : 'Enable'}>
                        {plan.isActive
                          ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                          : <ToggleLeft className="w-7 h-7 text-slate-300" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <p className="text-xs text-slate-400 font-bold mb-0.5">Monthly</p>
                    <p className="text-slate-900 font-black text-lg">₹{plan.priceMonthly?.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <p className="text-xs text-slate-400 font-bold mb-0.5">Yearly</p>
                    <p className="text-slate-900 font-black text-lg">₹{plan.priceYearly?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  {[
                    { label: 'Doctors', val: plan.limits?.maxDoctors ?? '∞' },
                    { label: 'Staff', val: plan.limits?.maxStaff ?? '∞' },
                    { label: 'Patients', val: plan.limits?.maxPatients === 999999 ? '∞' : plan.limits?.maxPatients ?? '∞' },
                  ].map(l => (
                    <div key={l.label} className="bg-blue-50 rounded-xl p-2">
                      <p className="text-xs text-blue-400 font-bold">{l.label}</p>
                      <p className="text-blue-700 font-black text-sm">{l.val}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {(plan.features || []).slice(0, 4).map(f => {
                    const feat = ALL_FEATURES.find(x => x.key === f);
                    return <span key={f} className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">{feat?.label || f}</span>;
                  })}
                  {plan.features?.length > 4 && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold">+{plan.features.length - 4} more</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEdit(plan)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDuplicate(plan._id)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!plan.isArchived && (
                    <button onClick={() => handleArchive(plan._id)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-red-100 hover:text-red-600 transition">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeEdit()}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h2 className="text-xl font-black text-slate-900">{isNew ? 'New Plan' : 'Edit Plan'}</h2>
              <button onClick={closeEdit} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

              {/* Name & Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Plan Name *</label>
                  <input value={editingPlan.name} onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="AI Starter Clinic" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Code * (uppercase)</label>
                  <input value={editingPlan.code} onChange={e => setEditingPlan(p => ({ ...p, code: e.target.value.toUpperCase() }))} disabled={!isNew}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 font-mono" placeholder="STARTER" />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Monthly Price (₹)</label>
                  <input type="number" value={editingPlan.priceMonthly} onChange={e => setEditingPlan(p => ({ ...p, priceMonthly: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Yearly Price (₹)</label>
                  <input type="number" value={editingPlan.priceYearly} onChange={e => setEditingPlan(p => ({ ...p, priceYearly: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

              {/* Limits */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Usage Limits (leave blank for unlimited)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'maxDoctors', label: 'Max Doctors' },
                    { key: 'maxStaff', label: 'Max Staff' },
                    { key: 'maxPatients', label: 'Max Patients' },
                  ].map(l => (
                    <div key={l.key}>
                      <label className="block text-xs text-slate-400 mb-1">{l.label}</label>
                      <input
                        type="number"
                        value={editingPlan.limits?.[l.key] ?? ''}
                        onChange={e => setEditingPlan(p => ({ ...p, limits: { ...p.limits, [l.key]: e.target.value === '' ? null : Number(e.target.value) } }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                        placeholder="∞"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Trial & Display Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Trial Period (days)</label>
                  <input type="number" value={editingPlan.trialPeriodDays} onChange={e => setEditingPlan(p => ({ ...p, trialPeriodDays: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Display Order</label>
                  <input type="number" value={editingPlan.displayOrder} onChange={e => setEditingPlan(p => ({ ...p, displayOrder: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500" />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800 text-sm">Active</p>
                  <p className="text-xs text-slate-400">Inactive plans won't appear in the registration wizard.</p>
                </div>
                <button onClick={() => setEditingPlan(p => ({ ...p, isActive: !p.isActive }))} className="focus:outline-none">
                  {editingPlan.isActive ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

              {/* Features */}
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedFeatures(v => !v)}
                  className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Feature Catalog ({editingPlan.features.length} selected)
                  {expandedFeatures ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedFeatures && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_FEATURES.map(feat => {
                      const selected = editingPlan.features.includes(feat.key);
                      return (
                        <button
                          key={feat.key}
                          type="button"
                          onClick={() => toggleFeature(feat.key)}
                          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${selected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                        >
                          <span className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${selected ? 'bg-white/20' : 'bg-slate-200'}`}>
                            {selected && <Check className="w-3 h-3" />}
                          </span>
                          {feat.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={closeEdit} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:opacity-90 transition disabled:opacity-50">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPlans;
