import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, ShieldAlert, ArrowLeft, Trash2, 
  ToggleLeft, ToggleRight, DollarSign, Calendar, Clock,
  Users, CheckSquare, Square, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { doctorApi, userApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import LoadingState from '../../components/common/LoadingState';

// Real API helper for catalog
import axios from 'axios';
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

const catalogApi = {
  list: () => axios.get(`${apiBase}/procedures/settings`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  create: (data) => axios.post(`${apiBase}/procedures/settings`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  update: (id, data) => axios.put(`${apiBase}/procedures/settings/${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data),
  getBranches: () => axios.get(`${apiBase}/procedures/settings/branches`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.data)
};

export default function ProcedureSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  
  // Subscription info
  const [subscriptionLimits, setSubscriptionLimits] = useState({ maxDoctors: 5, maxStaff: 12 });
  const [currentCounts, setCurrentCounts] = useState({ doctors: 0, staff: 0 });

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const initialForm = {
    name: '',
    code: '',
    department: '',
    description: '',
    defaultDuration: 30,
    preparationInstructions: '',
    recoveryInstructions: '',
    consentRequired: false,
    isActive: true,
    treatmentPlan: {
      type: 'one_time',
      sessions: 1,
      intervalDays: 1
    },
    standardPrice: 0,
    insurancePrice: 0,
    memberPrice: 0,
    advancePaymentRequired: false,
    branches: [],
    eligibleDoctors: [],
    eligibleStaff: []
  };

  const [form, setForm] = useState(initialForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, docsRes, usersRes, branchesRes] = await Promise.all([
        catalogApi.list().catch(() => ({ data: { catalog: [] } })),
        doctorApi.list({ limit: 100 }).catch(() => ({ doctors: [] })),
        userApi.list({ limit: 100 }).catch(() => ({ users: [] })),
        catalogApi.getBranches().catch(() => ({ data: { branches: [] } }))
      ]);

      setCatalog(catRes?.data?.catalog || []);
      const activeDocs = (docsRes?.doctors || docsRes?.data?.doctors || []).filter(d => d.isActive);
      setDoctors(activeDocs);
      
      const allUsers = usersRes?.users || usersRes?.data?.users || [];
      const supportStaff = allUsers.filter(u => ['NURSE', 'LAB_TECHNICIAN', 'RECEPTIONIST', 'PHARMACIST'].includes(u.role));
      setStaff(supportStaff);

      setBranchesList(branchesRes?.data?.branches || branchesRes?.branches || []);

      setCurrentCounts({
        doctors: activeDocs.length,
        staff: supportStaff.length
      });

      // Fetch limits
      if (user?.clinic?.customLimits) {
        setSubscriptionLimits({
          maxDoctors: user.clinic.customLimits.maxDoctors || 5,
          maxStaff: user.clinic.customLimits.maxStaff || 12
        });
      }
    } catch (err) {
      toast.error('Failed to load procedure configurations.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleEditClick = (item) => {
    setEditingItem(item);
    setForm({
      ...initialForm,
      ...item,
      treatmentPlan: {
        ...initialForm.treatmentPlan,
        ...(item.treatmentPlan || {})
      }
    });
    setIsEditing(true);
  };

  const handleCreateClick = () => {
    setEditingItem(null);
    setForm(initialForm);
    setIsEditing(true);
  };

  const toggleBranchSelection = (branch) => {
    const exists = form.branches.find(b => b.branchId === branch._id);
    if (exists) {
      setForm(prev => ({
        ...prev,
        branches: prev.branches.filter(b => b.branchId !== branch._id)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        branches: [
          ...prev.branches,
          {
            branchId: branch._id,
            branchName: branch.name,
            standardPrice: form.standardPrice || 0,
            insurancePrice: form.insurancePrice || 0,
            memberPrice: form.memberPrice || 0
          }
        ]
      }));
    }
  };

  const updateBranchPrice = (branchId, key, value) => {
    setForm(prev => ({
      ...prev,
      branches: prev.branches.map(b => 
        b.branchId === branchId ? { ...b, [key]: Number(value) } : b
      )
    }));
  };

  const toggleDoctorSelection = (docId) => {
    const isAlreadyAssigned = form.eligibleDoctors.includes(docId);
    if (isAlreadyAssigned) {
      setForm(prev => ({
        ...prev,
        eligibleDoctors: prev.eligibleDoctors.filter(id => id !== docId)
      }));
    } else {
      // Validate subscription limits if adding a doctor beyond capacity
      if (currentCounts.doctors >= subscriptionLimits.maxDoctors) {
        toast.error('Doctor limit reached for your current subscription. Upgrade your clinic plan to add more doctors.');
        return;
      }
      setForm(prev => ({
        ...prev,
        eligibleDoctors: [...prev.eligibleDoctors, docId]
      }));
    }
  };

  const toggleStaffSelection = (staffId) => {
    const isAlreadyAssigned = form.eligibleStaff.includes(staffId);
    if (isAlreadyAssigned) {
      setForm(prev => ({
        ...prev,
        eligibleStaff: prev.eligibleStaff.filter(id => id !== staffId)
      }));
    } else {
      // Validate subscription limits if adding a staff member beyond capacity
      if (currentCounts.staff >= subscriptionLimits.maxStaff) {
        toast.error('Staff limit reached for your current subscription. Upgrade your clinic plan to add more staff.');
        return;
      }
      setForm(prev => ({
        ...prev,
        eligibleStaff: [...prev.eligibleStaff, staffId]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.department) {
      toast.error('Please fill name, code, and department.');
      return;
    }

    try {
      if (editingItem) {
        await catalogApi.update(editingItem._id, form);
        toast.success('Procedure configuration updated successfully.');
      } else {
        await catalogApi.create(form);
        toast.success('Procedure configuration created successfully.');
      }
      setIsEditing(false);
      loadData();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to save procedure config.';
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return <LoadingState label="Loading catalog settings..." />;
  }

  return (
    <div className="space-y-6 bg-slate-50/50 min-h-screen p-6 font-sans">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/procedures')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {!isEditing && (
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Procedure Config
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="mb-4">
            <h1 className="text-lg font-black text-slate-900">Procedure Settings Catalog</h1>
            <p className="text-xs text-slate-400">Configure standard procedure definitions, branching price lists, and assigned providers.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Treatment Plan</th>
                  <th className="py-3 px-4">Standard Price</th>
                  <th className="py-3 px-4">Branches</th>
                  <th className="py-3 px-4">Eligible Providers</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                {catalog.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No custom procedures added yet. Click "Add Procedure Config" to get started.
                    </td>
                  </tr>
                ) : (
                  catalog.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 text-blue-650">{item.code}</td>
                      <td className="py-3.5 px-4 text-slate-900">{item.name}</td>
                      <td className="py-3.5 px-4">{item.department}</td>
                      <td className="py-3.5 px-4 capitalize">{item.treatmentPlan?.type?.replace('_', ' ')} ({item.treatmentPlan?.sessions} sessions)</td>
                      <td className="py-3.5 px-4">₹{item.standardPrice?.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        {item.branches?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.branches.map(b => (
                              <span key={b.branchId} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">{b.branchName}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Standard Only</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-purple-650">{item.eligibleDoctors?.length || 0} Docs</span>
                        <span className="text-slate-400 mx-1">|</span>
                        <span className="text-teal-650">{item.eligibleStaff?.length || 0} Staff</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button 
                          onClick={() => handleEditClick(item)}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div>
            <h1 className="text-lg font-black text-slate-900">
              {editingItem ? 'Modify Procedure Configuration' : 'Configure Custom Procedure'}
            </h1>
            <p className="text-xs text-slate-400">Set availability bounds, price tiers, and session counts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block uppercase mb-1">Procedure Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-2xl outline-none focus:border-blue-650"
                placeholder="e.g. Tooth Extraction"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 block uppercase mb-1">Procedure Code</label>
              <input 
                type="text" 
                value={form.code} 
                onChange={(e) => setForm({ ...form, code: e.target.value })} 
                className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-2xl outline-none focus:border-blue-650"
                placeholder="e.g. DENT-EXTR"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 block uppercase mb-1">Department</label>
              <input 
                type="text" 
                value={form.department} 
                onChange={(e) => setForm({ ...form, department: e.target.value })} 
                className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-2xl outline-none focus:border-blue-650"
                placeholder="e.g. Dentistry"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block uppercase mb-1">Default Duration (mins)</label>
              <input 
                type="number" 
                value={form.defaultDuration} 
                onChange={(e) => setForm({ ...form, defaultDuration: Number(e.target.value) })} 
                className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-2xl outline-none focus:border-blue-650"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 block uppercase mb-1">Standard Price (₹)</label>
              <input 
                type="number" 
                value={form.standardPrice} 
                onChange={(e) => setForm({ ...form, standardPrice: Number(e.target.value) })} 
                className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-2xl outline-none focus:border-blue-650"
              />
            </div>
            <div className="flex items-center gap-4 mt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input 
                  type="checkbox" 
                  checked={form.consentRequired} 
                  onChange={(e) => setForm({ ...form, consentRequired: e.target.checked })} 
                />
                Consent Form Required
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input 
                  type="checkbox" 
                  checked={form.advancePaymentRequired} 
                  onChange={(e) => setForm({ ...form, advancePaymentRequired: e.target.checked })} 
                />
                Advance Required
              </label>
            </div>
          </div>

          {/* Treatment Plan Section */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-black text-slate-900 mb-3">Treatment Plan Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block uppercase mb-1">Plan Interval</label>
                <select
                  value={form.treatmentPlan.type}
                  onChange={(e) => setForm({
                    ...form,
                    treatmentPlan: { ...form.treatmentPlan, type: e.target.value }
                  })}
                  className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-2xl outline-none"
                >
                  <option value="one_time">One Time</option>
                  <option value="daily">Daily</option>
                  <option value="alternate">Alternate Days</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block uppercase mb-1">Total Sessions</label>
                <input 
                  type="number" 
                  value={form.treatmentPlan.sessions} 
                  onChange={(e) => setForm({
                    ...form,
                    treatmentPlan: { ...form.treatmentPlan, sessions: Number(e.target.value) }
                  })} 
                  className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-2xl outline-none focus:border-blue-650"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Branch Availability & Branch-wise Pricing */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-black text-slate-900 mb-2">Branch Availability & Customized Pricing</h3>
            <p className="text-[11px] text-slate-400 mb-4">Toggle branches and configure customized prices per location.</p>

            <div className="space-y-4">
              {branchesList.map((branch) => {
                const isSelected = form.branches.find(b => b.branchId === branch._id);
                return (
                  <div key={branch._id} className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleBranchSelection(branch)}
                        className="text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        {isSelected ? <ToggleRight className="w-8 h-8 text-blue-600" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                      </button>
                      <span className="text-xs font-bold text-slate-700">{branch.name}</span>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
                          <span className="text-[10px] text-slate-405 font-bold uppercase">Standard:</span>
                          <input 
                            type="number"
                            value={isSelected.standardPrice}
                            onChange={(e) => updateBranchPrice(branch._id, 'standardPrice', e.target.value)}
                            className="w-16 text-xs font-black text-slate-750 outline-none text-right"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
                          <span className="text-[10px] text-slate-405 font-bold uppercase">Insurance:</span>
                          <input 
                            type="number"
                            value={isSelected.insurancePrice}
                            onChange={(e) => updateBranchPrice(branch._id, 'insurancePrice', e.target.value)}
                            className="w-16 text-xs font-black text-slate-750 outline-none text-right"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
                          <span className="text-[10px] text-slate-405 font-bold uppercase">Member:</span>
                          <input 
                            type="number"
                            value={isSelected.memberPrice}
                            onChange={(e) => updateBranchPrice(branch._id, 'memberPrice', e.target.value)}
                            className="w-16 text-xs font-black text-slate-750 outline-none text-right"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Provider Mapping & Subscription Limit Enforcement */}
          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Doctors assignment */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-black text-slate-900">Assign Eligible Doctors</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Limit: {currentCounts.doctors}/{subscriptionLimits.maxDoctors} Active</span>
              </div>
              
              {currentCounts.doctors >= subscriptionLimits.maxDoctors && (
                <div className="flex items-start gap-2 p-3 bg-amber-50/50 border border-amber-100/50 rounded-2xl mb-3 text-[10px] text-amber-800 leading-tight">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Subscribed doctor limit reached ({subscriptionLimits.maxDoctors}). You cannot add new doctors to this procedure config unless they are already active. Upgrade subscription to allocate more.</span>
                </div>
              )}

              <div className="border border-slate-100 rounded-2xl max-h-48 overflow-y-auto p-2.5 space-y-2">
                {doctors.map(doc => {
                  const isChecked = form.eligibleDoctors.includes(doc._id);
                  return (
                    <div 
                      key={doc._id}
                      onClick={() => toggleDoctorSelection(doc._id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700"
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                      <span>{doc.fullName} ({doc.specialization || 'General Doctor'})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staff assignment */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-black text-slate-900">Assign Eligible Treatment Staff</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Limit: {currentCounts.staff}/{subscriptionLimits.maxStaff} Active</span>
              </div>

              {currentCounts.staff >= subscriptionLimits.maxStaff && (
                <div className="flex items-start gap-2 p-3 bg-amber-50/50 border border-amber-100/50 rounded-2xl mb-3 text-[10px] text-amber-800 leading-tight">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Subscribed staff limit reached ({subscriptionLimits.maxStaff}). Allocate only already available personnel or upgrade your plan.</span>
                </div>
              )}

              <div className="border border-slate-100 rounded-2xl max-h-48 overflow-y-auto p-2.5 space-y-2">
                {staff.map(member => {
                  const isChecked = form.eligibleStaff.includes(member._id);
                  return (
                    <div 
                      key={member._id}
                      onClick={() => toggleStaffSelection(member._id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700"
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                      <span>{member.fullName} ({member.role})</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
