import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import {
  Settings, Calendar, Search, Filter, Plus, Eye, Edit3, Trash,
  MoreVertical, Check, Users, Briefcase, DollarSign,
  Clock, ArrowRight, ShieldAlert, GraduationCap,
  ChevronLeft, ChevronRight, Download, Ban, CalendarDays, CheckCircle,
  Building, CheckSquare, PlusSquare, FileText, X, Trash2
} from 'lucide-react';
import { adminApi, clinicApi, userApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const MyReceptionistsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [flowData, setFlowData] = useState(null);

  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [staffToAdd, setStaffToAdd] = useState([{ name: '', email: '', phone: '', role: 'RECEPTIONIST' }]);
  const [adding, setAdding] = useState(false);

  // Dashboard state
  const [receptionists, setReceptionists] = useState([]);
  const [pendingReceptionists, setPendingReceptionists] = useState([]);

  // Search/Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStaffDetails, setSelectedStaffDetails] = useState(null);
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [dashRes, onboardingRes] = await Promise.all([
        adminApi.getMyReceptionistsDashboard(),
        user?.clinicId ? clinicApi.getOnboardingFlow(user.clinicId) : Promise.resolve({ data: null })
      ]);
      setFlowData(onboardingRes?.data);
      setReceptionists(dashRes.data?.receptionists || []);
      setPendingReceptionists(dashRes.data?.pendingReceptionists || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load Staff workspace.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const activeStaff = staffToAdd.filter(staff => staff.name?.trim() && staff.email?.trim() && staff.phone?.trim());
      if (activeStaff.length === 0) {
        toast.error('Please enter details for at least one staff member.');
        setAdding(false);
        return;
      }
      
      if (currentStaffCount + activeStaff.length > maxStaff) {
        toast.error(`Plan limit exceeded. You can only add up to ${maxStaff} staff members.`);
        setAdding(false);
        return;
      }

      const createdUsers = [];
      for (const staff of activeStaff) {
        const res = await userApi.create({
          name: staff.name.trim(),
          email: staff.email.trim(),
          password: staff.phone.trim(), // Phone is default password
          phone: staff.phone.trim(),
          role: staff.role
        });
        if (res.data?.user || res.user) {
          createdUsers.push(res.data?.user || res.user);
        }
      }

      toast.success('Staff member(s) added successfully!');
      setShowAddModal(false);
      loadData(true);
      if (createdUsers.length > 0) {
        setCreatedStaffCredentials(createdUsers);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error adding staff.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (userRec) => {
    if (!userRec.userId) {
      toast.error('Associated user account details not loaded for this staff member.');
      return;
    }
    const userId = userRec.userId?._id || userRec.userId;
    const nextActive = !userRec.isActive;
    if (!window.confirm(`Are you sure you want to update status for ${userRec.fullName}?`)) return;

    try {
      await userApi.updateStatus(userId, { isActive: nextActive });
      toast.success(`Staff status updated successfully`);
      loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleRemoveStaff = async (userRec) => {
    if (!userRec.userId) {
      toast.error('Associated user account details not loaded.');
      return;
    }
    const userId = userRec.userId?._id || userRec.userId;
    if (!window.confirm(`Are you sure you want to permanently remove ${userRec.fullName} from your organization? This action is irreversible.`)) return;

    try {
      await userApi.remove(userId);
      toast.success('Staff member removed successfully');
      loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove staff.');
    }
  };

  const handleApprove = async (userId) => {
    try {
      await adminApi.approveReceptionist(userId);
      toast.success('Staff application approved successfully');
      loadData(true);
    } catch (err) {
      toast.error('Failed to approve application');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      await adminApi.rejectReceptionist(userId);
      toast.success('Staff application rejected successfully');
      loadData(true);
    } catch (err) {
      toast.error('Failed to reject application');
    }
  };

  // Combine approved and pending/onboarding staff
  const allStaffCombined = useMemo(() => {
    const pendingMapped = pendingReceptionists.map(p => ({
      _id: p._id,
      fullName: p.fullName || p.name,
      email: p.email,
      phone: p.phone,
      role: p.role,
      receptionistCode: p.receptionistCode || `STF-${String(p._id).slice(-4).toUpperCase()}`,
      isActive: p.isActive,
      approvalStatus: p.approvalStatus,
      userId: p._id,
      availability: p.profile?.availability || [],
      qualification: p.profile?.qualification || '',
      experienceYears: p.profile?.experienceYears || 0,
      currentAddress: p.profile?.currentAddress || null
    }));

    const approvedMapped = receptionists.map(r => ({
      ...r,
      isActive: r.isActive ?? r.userId?.isActive ?? false,
      approvalStatus: r.approvalStatus || 'approved',
      availability: r.availability || [],
      qualification: r.qualification || '',
      experienceYears: r.experienceYears || 0,
      currentAddress: r.currentAddress || null
    }));

    return [...approvedMapped, ...pendingMapped];
  }, [receptionists, pendingReceptionists]);

  // Filtered receptionists
  const filteredReceptionists = useMemo(() => {
    return allStaffCombined.filter(staff => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const sName = (staff.fullName || staff.name || '').toLowerCase();
        const sEmail = (staff.email || '').toLowerCase();
        const sCode = (staff.receptionistCode || '').toLowerCase();
        if (!sName.includes(q) && !sEmail.includes(q) && !sCode.includes(q)) {
          return false;
        }
      }

      if (statusFilter) {
        if (statusFilter === 'active' && !staff.isActive) return false;
        if (statusFilter === 'inactive' && staff.isActive) return false;
      }

      return true;
    });
  }, [allStaffCombined, searchQuery, statusFilter]);

  const maxStaff = flowData?.limits?.maxStaff ?? 10;
  const currentStaffCount = receptionists.length;
  const activeStaffCount = receptionists.filter(r => r.isActive).length;
  const roleDiversityCount = new Set(receptionists.map(r => r.role || 'Receptionist').filter(Boolean)).size;

  const displayList = filteredReceptionists;

  return (
    <div className="space-y-6 bg-slate-50/50 p-1 min-h-screen">
      
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-905 tracking-tight">Staff</h1>
          <p className="text-xs text-slate-400 mt-1">Manage all receptionist and clinic support staff.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          {currentStaffCount >= maxStaff ? (
            <button
              onClick={() => navigate('/admin/subscription')}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              👑 Upgrade Plan
            </button>
          ) : (
            <button
              onClick={() => { setStaffToAdd([{ name: '', email: '', phone: '', role: 'RECEPTIONIST' }]); setShowAddModal(true); }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md"
            >
              <Plus size={16} /> Add New Staff
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center">
              <Users size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
              {Math.round((currentStaffCount / maxStaff) * 100)}% of {maxStaff} allowed
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{currentStaffCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-blue-50 text-blue-650 rounded-xl flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              100% of total
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{activeStaffCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-amber-50 text-amber-650 rounded-xl flex items-center justify-center">
              <CalendarDays size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
              0% of total
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Leave</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">0</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-purple-50 text-indigo-650 rounded-xl flex items-center justify-center">
              <Building size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role Diversity</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{roleDiversityCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-teal-50 text-teal-650 rounded-xl flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks Completed</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">0</h3>
          </div>
        </div>
      </div>

      {/* 3. Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        
        <div className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Search Staff</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search staff by name, email, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-805 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            />
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Role</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Roles</option>
            <option value="receptionist">Receptionist</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="lab_technician">Lab Technician</option>
          </select>
        </div>

      </div>

      {/* 4. Staff List Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-2">Staff Member</th>
                <th className="py-3 px-2">Role</th>
                <th className="py-3 px-2">Staff Code</th>
                <th className="py-3 px-2">Phone</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-bold">
                    No staff members registered yet.
                  </td>
                </tr>
              ) : displayList.map((staff) => (
                <tr key={staff._id} className="hover:bg-slate-50/50 transition">
                  
                  {/* Staff Member */}
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-500">
                        {staff.fullName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-905">{staff.fullName}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{staff.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-4 px-2">
                    <span className="font-bold text-slate-800">{staff.role || 'Receptionist'}</span>
                  </td>

                  {/* Staff Code */}
                  <td className="py-4 px-2 font-semibold text-slate-600">{staff.receptionistCode || 'ST101'}</td>

                  {/* Phone */}
                  <td className="py-4 px-2 font-medium text-slate-700">{staff.phone || '98765 43210'}</td>
                  <td className="py-4 px-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      staff.approvalStatus !== 'approved'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : staff.isActive 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {staff.approvalStatus !== 'approved'
                        ? staff.approvalStatus.replace(/_/g, ' ')
                        : staff.isActive 
                          ? 'Active' 
                          : 'Suspended'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          const targetId = typeof staff.userId === 'object' && staff.userId ? staff.userId._id : staff.userId;
                          navigate(`/admin/staff/${targetId}`);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-50 transition cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>

                      {staff.approvalStatus !== 'approved' ? (
                        <>
                          {['pending_approval', 'pending_profile', 'changes_requested', 're_edit'].includes(staff.approvalStatus) ? (
                            <button
                              onClick={() => navigate(`/admin/receptionists/${staff._id}/review`)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-bold transition cursor-pointer"
                            >
                              Review & Approve
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold italic tracking-wide">Onboarding</span>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(staff)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                            staff.isActive
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {staff.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveStaff(staff)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove Staff"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Bottom Row Pending Applications */}
      {pendingReceptionists.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-950 border-b border-slate-50 pb-2">Pending Staff Approvals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingReceptionists.map(p => (
              <div key={p._id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                <div>
                  <p className="font-extrabold text-slate-905">{p.fullName}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{p.email}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Code: {p.receptionistCode}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/admin/receptionists/${p._id}/review`)}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition"
                  >
                    Review & Approve
                  </button>
                  <button
                    onClick={() => handleReject(p._id)}
                    className="flex-1 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[10px] font-bold transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding-style Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-2xl p-6 md:p-8 space-y-6 animate-fadeIn max-h-[90vh] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Staff Setup</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure clinical desk staff, billing receptionists, etc (Limit: {maxStaff} maximum).</p>
                </div>
                <div className="flex items-center gap-2">
                  {currentStaffCount + staffToAdd.length < maxStaff && (
                    <button
                      type="button"
                      onClick={() => setStaffToAdd([...staffToAdd, { name: '', email: '', phone: '', role: 'RECEPTIONIST' }])}
                      className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Staff
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddStaffSubmit} className="space-y-4 overflow-y-auto pr-2 max-h-[50vh]">
                {staffToAdd.map((st, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-4">
                    {staffToAdd.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setStaffToAdd(staffToAdd.filter((_, i) => i !== idx))}
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Staff #{idx + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={st.name}
                          onChange={(e) => {
                            const u = [...staffToAdd];
                            u[idx].name = e.target.value;
                            setStaffToAdd(u);
                          }}
                          placeholder="Full name"
                          className="w-full px-3.5 py-2 bg-white border border-slate-250 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Staff Role *</label>
                        <select
                          value={st.role}
                          onChange={(e) => {
                            const u = [...staffToAdd];
                            u[idx].role = e.target.value;
                            setStaffToAdd(u);
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-slate-250 rounded-xl outline-none focus:border-blue-650 text-xs text-gray-800"
                        >
                          <option value="RECEPTIONIST">Receptionist</option>
                          <option value="PHARMACIST">Pharmacist</option>
                          <option value="LAB_TECHNICIAN">Lab Technician</option>
                          <option value="NURSE">Nurse</option>
                          <option value="ACCOUNTANT">Accountant</option>
                          <option value="CLINIC_MANAGER">Clinic Manager</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          value={st.email}
                          onChange={(e) => {
                            const u = [...staffToAdd];
                            u[idx].email = e.target.value;
                            setStaffToAdd(u);
                          }}
                          placeholder="staff@domain.com"
                          className="w-full px-3.5 py-2 bg-white border border-slate-250 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                        <input
                          type="tel"
                          value={st.phone}
                          onChange={(e) => {
                            const u = [...staffToAdd];
                            u[idx].phone = e.target.value;
                            setStaffToAdd(u);
                          }}
                          placeholder="Mobile number"
                          className="w-full px-3.5 py-2 bg-white border border-slate-250 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-100 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {adding ? 'Adding...' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {selectedStaffDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 relative text-slate-800 space-y-6">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedStaffDetails(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center text-sm font-black uppercase">
                {selectedStaffDetails.fullName?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-905 leading-snug">{selectedStaffDetails.fullName}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedStaffDetails.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Basic & Professional Info */}
              <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                <span className="text-slate-500 font-bold block mb-1 uppercase text-[9px] tracking-wider">Profile Information</span>
                <div className="flex justify-between items-center">
                  <span>Role</span>
                  <span className="text-slate-900 font-bold">{selectedStaffDetails.role || 'Staff'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Staff Code</span>
                  <span className="text-slate-900 font-bold">{selectedStaffDetails.receptionistCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Phone Number</span>
                  <span className="text-slate-900 font-bold">{selectedStaffDetails.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${selectedStaffDetails.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {selectedStaffDetails.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Registered Clinic</span>
                  <span className="text-slate-900 font-bold">{selectedStaffDetails.clinicId?.name || 'Main Clinic'}</span>
                </div>
                {selectedStaffDetails.qualification && (
                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    <span>Qualification</span>
                    <span className="text-slate-900 font-bold">{selectedStaffDetails.qualification}</span>
                  </div>
                )}
                {selectedStaffDetails.experienceYears !== undefined && selectedStaffDetails.experienceYears > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Experience</span>
                    <span className="text-slate-900 font-bold">{selectedStaffDetails.experienceYears} Years</span>
                  </div>
                )}
              </div>

              {/* Right Column: Work Slots Allotted */}
              <div className="space-y-3">
                <span className="text-slate-500 font-bold block mb-1 uppercase text-[9px] tracking-wider">Allotted Work Slots</span>
                {selectedStaffDetails.availability && selectedStaffDetails.availability.length > 0 ? (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {selectedStaffDetails.availability.map((slot, i) => (
                      <div key={i} className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-semibold text-slate-700 capitalize flex justify-between items-center">
                        <span className="text-slate-500">{slot.dayOfWeek?.slice(0, 3)}</span>
                        <span className="text-slate-900 font-bold">{slot.startTime} - {slot.endTime}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No working shifts scheduled yet.</p>
                )}
              </div>
            </div>

            {selectedStaffDetails.currentAddress?.line1 && (
              <div className="flex flex-col gap-0.5 border-t border-slate-105 pt-4 text-xs">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider font-bold">Residential Address</span>
                <span className="text-slate-900 font-bold leading-relaxed mt-1">
                  {selectedStaffDetails.currentAddress.line1}, {selectedStaffDetails.currentAddress.city}, {selectedStaffDetails.currentAddress.state} - {selectedStaffDetails.currentAddress.pincode}
                </span>
              </div>
            )}

            <button 
              onClick={() => setSelectedStaffDetails(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Credentials summary popup */}
      {createdStaffCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 relative text-slate-800 space-y-6">
            
            <button 
              onClick={() => setCreatedStaffCredentials(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-2 border-b border-slate-100 pb-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
                <Check size={24} />
              </div>
              <h4 className="text-lg font-black text-slate-900 leading-snug">Staff Account Created</h4>
              <p className="text-xs text-slate-500">The login credentials and onboarding instructions have been sent successfully.</p>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {createdStaffCredentials.map((u, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs font-medium text-slate-600">
                  <p className="text-[10px] font-black uppercase text-indigo-650 tracking-wider">Staff member: {u.name}</p>
                  <p>
                    Staff login credentials have been sent to <strong>{u.email}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Please ask the staff member to login using their registered email and temporary password (their phone number), verify the code sent to their email during the login process, and complete their profile details.
                  </p>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setCreatedStaffCredentials(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition text-center cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyReceptionistsDashboard;
