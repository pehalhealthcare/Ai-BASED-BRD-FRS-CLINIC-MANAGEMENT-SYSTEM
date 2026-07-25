import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Download, UserPlus, Search, Filter, Eye, Edit2, MoreVertical,
  Users, CheckCircle2, UserCheck, Briefcase, Clock, ShieldAlert,
  ChevronLeft, ChevronRight, RefreshCw, Lock, Trash2, ShieldCheck, Mail, Phone, Calendar
} from 'lucide-react';
import { userApi, providersApi } from '../../lib/api';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

export default function PharmacyStaffModal({ providerId, onClose }) {
  const [provider, setProvider] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pharmacists: 0,
    assistants: 0,
    cashiers: 0,
    inactive: 0
  });

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStaff, setTotalStaff] = useState(0);
  const LIMIT = 5;

  // Modals & Panels
  const [activeSubModal, setActiveSubModal] = useState(null); // 'view' | 'add' | 'edit' | 'assign' | 'confirm-delete'
  const [selectedStaffMember, setSelectedStaffMember] = useState(null);
  const [moreMenuId, setMoreMenuId] = useState(null);

  // Form states
  const [newStaffForm, setNewStaffForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'PHARMACIST'
  });
  const [allClinicUsers, setAllClinicUsers] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');

  // Fetch Pharmacy Provider Info
  const loadProvider = useCallback(async () => {
    try {
      const res = await providersApi.getProvider(providerId);
      setProvider(res?.data ?? res ?? null);
    } catch {
      toast.error('Failed to load pharmacy details');
    }
  }, [providerId]);

  // Fetch Pharmacy Staff list and compute stats
  const loadStaffData = useCallback(async () => {
    setLoading(true);
    console.log('PharmacyStaffModal loadStaffData called. providerId:', providerId);
    try {
      const res = await userApi.list({
        providerId,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter === 'Active' ? true : statusFilter === 'Inactive' ? false : undefined,
        page,
        limit: LIMIT
      });
      console.log('PharmacyStaffModal loadStaffData API response:', res);

      const usersList = res?.data?.users ?? res?.users ?? [];
      console.log('PharmacyStaffModal usersList parsed:', usersList);
      setStaff(usersList);
      setTotalStaff(res?.data?.pagination?.total ?? res?.pagination?.total ?? usersList.length);
      setTotalPages(res?.data?.pagination?.totalPages ?? res?.pagination?.totalPages ?? 1);

      // Compute stats based on ALL users linked to this provider
      const allRes = await userApi.list({ providerId, limit: 100 });
      const allUsers = allRes?.data?.users ?? allRes?.users ?? [];
      
      const computed = {
        total: allUsers.length,
        active: allUsers.filter(u => u.isActive).length,
        pharmacists: allUsers.filter(u => u.role === 'PHARMACIST').length,
        assistants: allUsers.filter(u => u.role === 'Pharmacy Store Operator' || u.role === 'PHARMACY_OPERATOR').length,
        cashiers: allUsers.filter(u => u.role === 'ACCOUNTANT' || u.role === 'Cashier').length,
        inactive: allUsers.filter(u => !u.isActive).length
      };
      setStats(computed);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }, [providerId, search, roleFilter, statusFilter, page]);

  // Fetch all users for assigning existing staff
  const loadAllClinicUsers = useCallback(async () => {
    try {
      const res = await userApi.list({ limit: 100 });
      const list = res?.data?.users ?? res?.users ?? [];
      // Filter down to only pharmacy-friendly roles that don't belong to this provider
      const allowedRoles = ['PHARMACIST', 'Pharmacy Store Operator', 'PHARMACY_OPERATOR', 'ACCOUNTANT'];
      const filtered = list.filter(u => 
        allowedRoles.includes(u.role) && 
        String(u.providerId) !== String(providerId)
      );
      setAllClinicUsers(filtered);
    } catch {
      toast.error('Failed to load clinic employee list');
    }
  }, [providerId]);

  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  // Assign existing employee to provider
  const handleAssignStaff = async (userId) => {
    try {
      await userApi.updateProvider(userId, { providerId });
      toast.success('Staff member assigned successfully');
      setActiveSubModal(null);
      loadStaffData();
    } catch {
      toast.error('Failed to assign staff member');
    }
  };

  // Create new staff member
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaffForm.name || !newStaffForm.email || !newStaffForm.phone || !newStaffForm.password) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      // Create user record
      const res = await userApi.create({
        name: newStaffForm.name,
        email: newStaffForm.email,
        phone: newStaffForm.phone,
        password: newStaffForm.password,
        role: newStaffForm.role
      });
      const createdUser = res?.data?.user ?? res?.user;
      
      // Update providerId link immediately
      if (createdUser?._id) {
        await userApi.updateProvider(createdUser._id, { providerId });
      }

      toast.success('Staff member account created successfully');
      setNewStaffForm({ name: '', email: '', phone: '', password: '', role: 'PHARMACIST' });
      setActiveSubModal(null);
      loadStaffData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create new staff member');
    }
  };

  // Remove staff assignment
  const handleRemoveStaff = async () => {
    if (!selectedStaffMember) return;
    try {
      await userApi.updateProvider(selectedStaffMember._id, { providerId: null });
      toast.success('Staff member removed from pharmacy');
      setActiveSubModal(null);
      setSelectedStaffMember(null);
      loadStaffData();
    } catch {
      toast.error('Failed to remove staff member');
    }
  };

  // Mock download list
  const handleDownload = (format) => {
    toast.success(`Exporting staff list as ${format.toUpperCase()}...`);
  };

  if (!provider) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      {/* Centered Modal Wrapper */}
      <div className="bg-white w-[90vw] h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-100">
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-150 p-6 flex justify-between items-center z-10 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">{provider.name || 'Pharmacy Store'} Staff</h2>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg uppercase">
                    {provider.status || 'Active'}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  ID: {provider.globalId || 'PHR-0001'} | Branch: {provider.branchName || 'Main Branch'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownload('csv')}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              <Download className="w-3.5 h-3.5" /> Download List
            </button>
            <button
              onClick={() => { loadAllClinicUsers(); setActiveSubModal('add'); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 hover:shadow-lg transition"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Staff
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-450 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stats Segment */}
          <div className="grid grid-cols-6 gap-4 shrink-0">
            {[
              { label: 'Total Staff', val: stats.total, icon: Users, bg: 'bg-blue-50/50 text-blue-650' },
              { label: 'Active Staff', val: stats.active, icon: CheckCircle2, bg: 'bg-emerald-50/50 text-emerald-650' },
              { label: 'Pharmacists', val: stats.pharmacists, icon: UserCheck, bg: 'bg-teal-50/50 text-teal-650' },
              { label: 'Assistants', val: stats.assistants, icon: Briefcase, bg: 'bg-orange-50/50 text-orange-655' },
              { label: 'Cashiers', val: stats.cashiers, icon: Clock, bg: 'bg-purple-50/50 text-purple-650' },
              { label: 'Inactive Staff', val: stats.inactive, icon: ShieldAlert, bg: 'bg-rose-50/50 text-rose-650' }
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col gap-2 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">{card.label}</span>
                    <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-black text-slate-800">{card.val}</span>
                </div>
              );
            })}
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, employee ID, phone, email or role..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-650 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Roles</option>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="Pharmacy Store Operator">Store Operator / Assistant</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-650 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setPage(1); }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Reset Filters
            </button>
          </div>

          {/* Staff Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-bold text-slate-450">Loading staff records...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
              <Users className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-base font-black text-slate-800">No Staff Assigned</h3>
              <p className="text-xs font-semibold text-slate-400 mt-2">
                This pharmacy doesn't have any assigned staff yet. Add or assign staff members to begin managing pharmacy operations.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { loadAllClinicUsers(); setActiveSubModal('assign'); }}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  Assign Existing Staff
                </button>
                <button
                  onClick={() => setActiveSubModal('create')}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Create New Staff
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-slate-100 rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Shift</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Join Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-750">
                    {staff.map(member => (
                      <tr key={member._id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                              {member.name ? member.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <p className="font-black text-slate-800">{member.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Emp ID: {member._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                            member.role === 'PHARMACIST' 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-indigo-50 text-indigo-755'
                          }`}>
                            {member.role === 'PHARMACIST' ? 'Pharmacist' : 'Pharmacy Operator'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-650">{member.phone || '—'}</td>
                        <td className="p-4 text-slate-600">{member.email}</td>
                        <td className="p-4">
                          <div>
                            <p className="text-slate-855">Morning</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">09:00 AM - 05:00 PM</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 font-semibold">12 Jan 2024</td>
                        <td className="p-4 text-right relative">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedStaffMember(member); setActiveSubModal('view'); }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-455 hover:text-slate-700 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedStaffMember(member); setMoreMenuId(moreMenuId === member._id ? null : member._id); }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-455 hover:text-slate-700 transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {/* More Options Popover */}
                          {moreMenuId === member._id && (
                            <div className="absolute right-4 top-12 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 py-2 text-left animate-in fade-in slide-in-from-top-1">
                              <button
                                onClick={() => { setActiveSubModal('view'); setMoreMenuId(null); }}
                                className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-2 text-xs transition"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" /> View Profile
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to remove ${member.name} from this pharmacy?`)) {
                                    handleRemoveStaff();
                                  }
                                  setMoreMenuId(null);
                                }}
                                className="w-full px-4 py-2 hover:bg-rose-50 text-rose-650 font-bold flex items-center gap-2 text-xs transition"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Remove From Store
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold text-slate-455">
                  Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, totalStaff)} of {totalStaff} staff members
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Modal: Add / Create / Assign */}
      {activeSubModal === 'add' && (
        <div className="fixed inset-0 bg-slate-955/40 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative border border-slate-100">
            <button
              onClick={() => setActiveSubModal(null)}
              className="absolute right-4 top-4 w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-4">Add Staff Member</h3>
            
            <div className="space-y-4">
              <button
                onClick={() => { loadAllClinicUsers(); setActiveSubModal('assign'); }}
                className="w-full py-4 border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:bg-blue-50/50 transition group"
              >
                <UserCheck className="w-6 h-6 text-blue-600 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-black text-slate-750">Assign Existing Clinic Employee</span>
                <span className="text-[10px] text-slate-400 font-semibold">Select from active healthcare staff</span>
              </button>

              <button
                onClick={() => setActiveSubModal('create')}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:bg-slate-50 transition group"
              >
                <UserPlus className="w-6 h-6 text-slate-550 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-black text-slate-750">Create New Staff User</span>
                <span className="text-[10px] text-slate-400 font-semibold">Register and link new user account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Assign Existing Staff */}
      {activeSubModal === 'assign' && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative border border-slate-100 flex flex-col max-h-[80vh]">
            <button
              onClick={() => setActiveSubModal(null)}
              className="absolute right-4 top-4 w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-405"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1">Assign Existing Employee</h3>
            <p className="text-[11px] text-slate-400 font-bold mb-4">Choose from eligible pharmacy-related users in the clinic</p>

            {/* Local Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clinic employees..."
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {allClinicUsers.filter(u => 
                u.name?.toLowerCase().includes(assignSearch.toLowerCase()) ||
                u.email?.toLowerCase().includes(assignSearch.toLowerCase())
              ).length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-slate-400">No assignable clinic staff found.</div>
              ) : (
                allClinicUsers.filter(u => 
                  u.name?.toLowerCase().includes(assignSearch.toLowerCase()) ||
                  u.email?.toLowerCase().includes(assignSearch.toLowerCase())
                ).map(user => (
                  <div key={user._id} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition flex justify-between items-center text-xs">
                    <div>
                      <p className="font-black text-slate-800">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{user.email} | {user.role}</p>
                    </div>
                    <button
                      onClick={() => handleAssignStaff(user._id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase transition"
                    >
                      Assign Staff
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Create New Staff */}
      {activeSubModal === 'create' && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative border border-slate-100">
            <button
              onClick={() => setActiveSubModal(null)}
              className="absolute right-4 top-4 w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1">Create New Staff User</h3>
            <p className="text-[11px] text-slate-400 font-bold mb-4">Register a new operator profile linked to this pharmacy</p>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffForm.name}
                  onChange={e => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStaffForm.email}
                  onChange={e => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-blue-500"
                  placeholder="e.g. rahul@clinic.com"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1.5">Phone Number</label>
                <input
                  type="text"
                  required
                  value={newStaffForm.phone}
                  onChange={e => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold mb-1.5">Role / Designation</label>
                  <select
                    value={newStaffForm.role}
                    onChange={e => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="Pharmacy Store Operator">Pharmacy Store Operator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1.5">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={newStaffForm.password}
                    onChange={e => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-blue-500"
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md mt-6"
              >
                Create and Assign User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal: View Profile */}
      {activeSubModal === 'view' && selectedStaffMember && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative border border-slate-100">
            <button
              onClick={() => { setActiveSubModal(null); setSelectedStaffMember(null); }}
              className="absolute right-4 top-4 w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-405"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-5">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black">
                {selectedStaffMember.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">{selectedStaffMember.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  {selectedStaffMember.role === 'PHARMACIST' ? 'Pharmacist' : 'Pharmacy Operator'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-450 font-bold w-20">Email:</span>
                <span className="text-slate-855 font-semibold">{selectedStaffMember.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-455 font-bold w-20">Phone:</span>
                <span className="text-slate-855 font-semibold">{selectedStaffMember.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-450 font-bold w-20">Joined:</span>
                <span className="text-slate-850 font-semibold">12 Jan 2024</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-450 font-bold w-20">Shift:</span>
                <span className="text-slate-850 font-semibold">Morning (09:00 AM – 05:00 PM)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span className="text-slate-450 font-bold w-20">Status:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  selectedStaffMember.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {selectedStaffMember.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <button
              onClick={() => { setActiveSubModal(null); setSelectedStaffMember(null); }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-center transition mt-6"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
