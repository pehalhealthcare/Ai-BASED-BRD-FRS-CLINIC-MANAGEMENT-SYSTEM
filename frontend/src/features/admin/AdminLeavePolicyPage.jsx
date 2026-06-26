import { useState, useEffect } from 'react';
import { leaveApi } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import { Calendar, Shield, Trash2, Plus, Check, RefreshCw, Settings, AlertTriangle } from 'lucide-react';

const AdminLeavePolicyPage = () => {
  const [policy, setPolicy] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [deductionRule, setDeductionRule] = useState('mark_unpaid');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for adding/editing a leave type
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState({
    code: '',
    name: '',
    monthlyLimit: 1,
    yearlyLimit: 12,
    allowRollover: false,
    rolloverPercentage: 100,
    maxAccumulated: 10
  });

  const fetchPolicy = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await leaveApi.getPolicy();
      if (response?.policy) {
        setPolicy(response.policy);
        setLeaveTypes(response.policy.leaveTypes || []);
        setDeductionRule(response.policy.paymentDeductionRule || 'mark_unpaid');
      }
    } catch (err) {
      console.error('Failed to load leave policy', err);
      setError('Could not load clinic leave policy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSavePolicy = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await leaveApi.updatePolicy({
        leaveTypes,
        paymentDeductionRule: deductionRule
      });
      setSuccess('Leave policy saved successfully!');
      if (response?.policy) {
        setPolicy(response.policy);
        setLeaveTypes(response.policy.leaveTypes || []);
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update leave policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLeaveType = (e) => {
    e.preventDefault();
    if (!newType.code || !newType.name) {
      setError('Code and Name are required.');
      return;
    }

    const codeUpper = newType.code.toUpperCase().replace(/\s+/g, '_');
    if (leaveTypes.some(t => t.code === codeUpper)) {
      setError('A leave type with this code already exists.');
      return;
    }

    const updated = [...leaveTypes, { ...newType, code: codeUpper }];
    setLeaveTypes(updated);
    setShowAddForm(false);
    setNewType({
      code: '',
      name: '',
      monthlyLimit: 1,
      yearlyLimit: 12,
      allowRollover: false,
      rolloverPercentage: 100,
      maxAccumulated: 10
    });
    setError('');
  };

  const handleRemoveLeaveType = (code) => {
    if (!window.confirm(`Are you sure you want to remove the leave type ${code}?`)) return;
    setLeaveTypes(leaveTypes.filter(t => t.code !== code));
  };

  const handleUpdateField = (index, field, value) => {
    const updated = [...leaveTypes];
    updated[index][field] = value;
    setLeaveTypes(updated);
  };

  return (
    <div className="grid gap-8 p-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Clinic Panel"
          title="Leave Rules & Limits"
          description="Define sick, casual, vacation, or custom leaves, set monthly allowances, rollover rates, and exceeding rules."
        />
        <button
          onClick={() => handleSavePolicy()}
          disabled={saving || loading}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 hover:shadow-emerald-700/25 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          <span>{saving ? 'Saving...' : 'Save Policy Changes'}</span>
        </button>
      </div>

      {success && <p className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-100">{success}</p>}
      {error && <p className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-sm font-semibold border border-rose-100">{error}</p>}

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <RefreshCw size={32} className="animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rules Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Settings className="text-emerald-600" size={20} />
                  <span>Configure Leave Types</span>
                </h3>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="rounded-xl border border-emerald-300 dark:border-emerald-900 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create Custom Type</span>
                </button>
              </div>

              {/* Leave Types Editor Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-white/[0.08]">
                      <th className="py-3 px-2 font-bold text-stone-700 dark:text-stone-300">Name & Code</th>
                      <th className="py-3 px-2 font-bold text-stone-700 dark:text-stone-300">Monthly Limit</th>
                      <th className="py-3 px-2 font-bold text-stone-700 dark:text-stone-300 font-bold">Yearly Limit</th>
                      <th className="py-3 px-2 font-bold text-stone-700 dark:text-stone-300 text-center">Allow Rollover</th>
                      <th className="py-3 px-2 font-bold text-stone-700 dark:text-stone-300">Rollover %</th>
                      <th className="py-3 px-2 font-bold text-stone-700 dark:text-stone-300">Max Acc.</th>
                      <th className="py-3 px-2 font-bold text-stone-700 dark:text-stone-300 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveTypes.map((type, index) => (
                      <tr key={type.code} className="border-b border-stone-100 dark:border-white/[0.04] transition hover:bg-stone-50/50 dark:hover:bg-navy-950/40">
                        <td className="py-3 px-2">
                          <span className="font-bold text-stone-900 dark:text-white block">{type.name}</span>
                          <span className="text-[10px] text-stone-400 font-semibold">{type.code}</span>
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            value={type.monthlyLimit}
                            onChange={(e) => handleUpdateField(index, 'monthlyLimit', parseInt(e.target.value) || 0)}
                            className="w-16 rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-2 py-1 outline-none text-center font-semibold text-stone-800"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            value={type.yearlyLimit}
                            onChange={(e) => handleUpdateField(index, 'yearlyLimit', parseInt(e.target.value) || 0)}
                            className="w-16 rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-2 py-1 outline-none text-center font-semibold text-stone-800"
                          />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={type.allowRollover}
                            onChange={(e) => handleUpdateField(index, 'allowRollover', e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            disabled={!type.allowRollover}
                            value={type.rolloverPercentage}
                            onChange={(e) => handleUpdateField(index, 'rolloverPercentage', parseInt(e.target.value) || 0)}
                            className="w-16 rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-2 py-1 outline-none text-center font-semibold text-stone-800 disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="1"
                            disabled={!type.allowRollover}
                            value={type.maxAccumulated}
                            onChange={(e) => handleUpdateField(index, 'maxAccumulated', parseInt(e.target.value) || 1)}
                            className="w-16 rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-2 py-1 outline-none text-center font-semibold text-stone-800 disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => handleRemoveLeaveType(type.code)}
                            className="text-stone-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Limits & Deduction Config Panel */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
              <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2 mb-4">
                <Shield className="text-emerald-600" size={18} />
                <span>Enforcement & Deductions</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
                Choose what action the system should perform when a doctor requests leave exceeding their available monthly allowance.
              </p>

              <div className="space-y-4">
                {[
                  {
                    value: 'mark_unpaid',
                    label: 'Mark as Unpaid Leave',
                    desc: 'Flags the leave request as unpaid. Admins or payroll can deduct payments manually.'
                  },
                  {
                    value: 'warn_only',
                    label: 'Allow with Warn Only',
                    desc: 'Displays a warning flag on the leave request but retains full paid status.'
                  },
                  {
                    value: 'auto_reject',
                    label: 'Block Booking (Auto Reject)',
                    desc: 'Prevents the doctor from submitting leave requests that exceed their allowance.'
                  }
                ].map((item) => (
                  <label
                    key={item.value}
                    className={`flex items-start gap-3 p-4 border rounded-2xl cursor-pointer select-none transition-all ${
                      deductionRule === item.value
                        ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900'
                        : 'bg-transparent border-stone-200 dark:border-white/[0.04]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deductionRule"
                      checked={deductionRule === item.value}
                      onChange={() => setDeductionRule(item.value)}
                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-850 dark:text-white">{item.label}</span>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Leave Type Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 rounded-3xl border border-stone-200 dark:border-white/[0.08] p-6 max-w-md w-full shadow-2xl animate-in fade-in-50 duration-200">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2 flex items-center gap-2">
              <Calendar className="text-emerald-600" size={22} />
              <span>Create Custom Leave Type</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
              Define the leave type properties below. Once created, save the policy updates.
            </p>

            <form onSubmit={handleAddLeaveType} className="space-y-4 text-xs font-semibold text-stone-600 dark:text-stone-400">
              <div>
                <label className="block mb-1">Leave Name (e.g. Study Leave)</label>
                <input
                  type="text"
                  required
                  placeholder="Study Leave"
                  value={newType.name}
                  onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="block mb-1">Leave Code (e.g. STUDY_LEAVE)</label>
                <input
                  type="text"
                  required
                  placeholder="STUDY_LEAVE"
                  value={newType.code}
                  onChange={(e) => setNewType(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                  className="w-full rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-4 py-3 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Monthly Limit (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={newType.monthlyLimit}
                    onChange={(e) => setNewType(prev => ({ ...prev, monthlyLimit: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-4 py-3 outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block mb-1">Yearly Limit (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={newType.yearlyLimit}
                    onChange={(e) => setNewType(prev => ({ ...prev, yearlyLimit: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-4 py-3 outline-none text-center"
                  />
                </div>
              </div>

              <div className="p-3 border border-stone-100 dark:border-white/[0.04] rounded-2xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newType.allowRollover}
                    onChange={(e) => setNewType(prev => ({ ...prev, allowRollover: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-stone-850 dark:text-white">Enable Rollover / Accumulation</span>
                </label>
                {newType.allowRollover && (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block mb-1 text-[10px] text-stone-500">Rollover %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newType.rolloverPercentage}
                        onChange={(e) => setNewType(prev => ({ ...prev, rolloverPercentage: parseInt(e.target.value) || 0 }))}
                        className="w-full rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-3 py-2 outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] text-stone-500">Max Accumulated</label>
                      <input
                        type="number"
                        min="1"
                        value={newType.maxAccumulated}
                        onChange={(e) => setNewType(prev => ({ ...prev, maxAccumulated: parseInt(e.target.value) || 1 }))}
                        className="w-full rounded-xl border border-stone-300 dark:border-white/[0.08] dark:bg-navy-800 dark:text-white px-3 py-2 outline-none text-center"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-white/[0.08] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-navy-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeavePolicyPage;
