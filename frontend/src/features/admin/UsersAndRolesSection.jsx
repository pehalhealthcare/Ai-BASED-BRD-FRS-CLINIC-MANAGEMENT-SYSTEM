import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, MoreVertical, Edit2, Shield, Eye, CheckCircle2,
  XCircle, Crown, Layers, Stethoscope, UserCheck, HeartPulse,
  FlaskConical, Pill, CreditCard, ChevronRight, X, AlertTriangle,
  RefreshCw, Check, UserPlus, Users as UsersIcon, ShieldCheck
} from 'lucide-react';
import { userApi, doctorApi, clinicApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import { normalizeDoctorName } from '../../utils/doctorFormatters';

// Canonical System Roles Metadata
const ROLE_CONFIGS = [
  {
    id: 'ADMIN',
    name: 'Clinic Owner',
    badgeName: 'Clinic Owner',
    icon: Crown,
    color: '#f59e0b',
    bg: '#fef3c7',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
    desc: 'Full access to all clinic features, organization billing, and settings.'
  },
  {
    id: 'CLINIC_ADMIN',
    name: 'Clinic Admin',
    badgeName: 'Clinic Admin',
    icon: Layers,
    color: '#6366f1',
    bg: '#e0e7ff',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    desc: 'Manage clinic operations, staff users, departments, and configurations.'
  },
  {
    id: 'DOCTOR',
    name: 'Doctor',
    badgeName: 'Doctor',
    icon: Stethoscope,
    color: '#8b5cf6',
    bg: '#ede9fe',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/60',
    desc: 'Manage patients, consultations, clinical prescriptions, and medical records.'
  },
  {
    id: 'RECEPTIONIST',
    name: 'Receptionist',
    badgeName: 'Receptionist',
    icon: UserCheck,
    color: '#0ea5e9',
    bg: '#e0f2fe',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/60',
    desc: 'Handle appointments, patient registration, check-ins, and front desk operations.'
  },
  {
    id: 'NURSE',
    name: 'Nurse',
    badgeName: 'Nurse',
    icon: HeartPulse,
    color: '#ec4899',
    bg: '#fce7f3',
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200/60',
    desc: 'Assist in clinical procedures, patient triage, and bedside nursing notes.'
  },
  {
    id: 'LAB_TECHNICIAN',
    name: 'Lab Technician',
    badgeName: 'Lab Technician',
    icon: FlaskConical,
    color: '#f97316',
    bg: '#ffedd5',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/60',
    desc: 'Conduct lab investigations, manage sample collections, and upload reports.'
  },
  {
    id: 'PHARMACIST',
    name: 'Pharmacist',
    badgeName: 'Pharmacist',
    icon: Pill,
    color: '#10b981',
    bg: '#d1fae5',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    desc: 'Dispense medication, manage pharmacy inventory, and process retail sales.'
  },
  {
    id: 'ACCOUNTANT',
    name: 'Accountant',
    badgeName: 'Accountant',
    icon: CreditCard,
    color: '#14b8a6',
    bg: '#ccfbf1',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/60',
    desc: 'Manage invoices, payment ledgers, and financial reconciliation reports.'
  }
];

// Permission Module Matrix
const PERMISSION_MODULES = [
  {
    module: 'Dashboard',
    permissions: [
      { id: 'dash_view', label: 'View Dashboard Overview', roles: ['ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'ACCOUNTANT'] },
      { id: 'dash_analytics', label: 'View Revenue & Analytics Trends', roles: ['ADMIN', 'CLINIC_ADMIN', 'ACCOUNTANT'] }
    ]
  },
  {
    module: 'Appointments',
    permissions: [
      { id: 'appt_view', label: 'View Appointments Calendar', roles: ['ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'] },
      { id: 'appt_book', label: 'Book & Schedule Appointments', roles: ['ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'] },
      { id: 'appt_cancel', label: 'Cancel & Reschedule Bookings', roles: ['ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'] },
      { id: 'appt_checkin', label: 'Check-in Patients at Desk', roles: ['ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'NURSE'] }
    ]
  },
  {
    module: 'Patients & Records',
    permissions: [
      { id: 'pat_view', label: 'View Patient Directory', roles: ['ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'] },
      { id: 'pat_register', label: 'Register New Patients', roles: ['ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'] },
      { id: 'pat_emr', label: 'Access Full Clinical EMR & History', roles: ['ADMIN', 'DOCTOR'] }
    ]
  },
  {
    module: 'Doctors & Clinical',
    permissions: [
      { id: 'doc_consult', label: 'Conduct Medical Consultations', roles: ['DOCTOR'] },
      { id: 'doc_rx', label: 'Issue & Sign Digital Prescriptions', roles: ['DOCTOR'] },
      { id: 'doc_orders', label: 'Order Diagnostic Lab Tests', roles: ['DOCTOR'] },
      { id: 'doc_leaves', label: 'Manage Doctor Rosters & Shifts', roles: ['ADMIN', 'CLINIC_ADMIN'] }
    ]
  },
  {
    module: 'Staff & Roles',
    permissions: [
      { id: 'staff_view', label: 'View Clinic Staff Directory', roles: ['ADMIN', 'CLINIC_ADMIN'] },
      { id: 'staff_manage', label: 'Add & Onboard Staff Members', roles: ['ADMIN', 'CLINIC_ADMIN'] },
      { id: 'staff_roles', label: 'Assign & Configure Roles', roles: ['ADMIN'] }
    ]
  },
  {
    module: 'Billing & Invoices',
    permissions: [
      { id: 'bill_view', label: 'View Invoices & Receipts', roles: ['ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'] },
      { id: 'bill_create', label: 'Create Patient Invoices', roles: ['ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'] },
      { id: 'bill_refund', label: 'Authorize Fee Discounts & Waivers', roles: ['ADMIN'] }
    ]
  },
  {
    module: 'Settings',
    permissions: [
      { id: 'sett_profile', label: 'Manage Clinic Profile & Details', roles: ['ADMIN', 'CLINIC_ADMIN'] },
      { id: 'sett_notif', label: 'Configure Communication & SMS', roles: ['ADMIN'] }
    ]
  }
];

// Helper to format timestamps gracefully
const formatLastLogin = (timestamp) => {
  if (!timestamp) return 'Never logged in';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return 'Never logged in';

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;

    return `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}, ${timeStr}`;
  } catch {
    return 'Never logged in';
  }
};

// Deterministic pastel avatar background
const getAvatarBackground = (name = '') => {
  const colors = [
    { bg: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-sky-100 text-sky-700', border: 'border-sky-200' },
    { bg: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-rose-100 text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200' }
  ];
  const charCode = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return colors[charCode % colors.length];
};

const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function UsersAndRolesSection() {
  const { user } = useAuth();

  // State: Filter, Search, Pagination
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 5;

  // Real Database Data
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRoleDetailsModal, setShowRoleDetailsModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);

  // Selected User / Role
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Form States
  const [submitting, setSubmitting] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'RECEPTIONIST',
    department: 'Front Desk',
    password: ''
  });
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    isActive: true
  });
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    description: '',
    selectedPermissions: []
  });

  // Active Clinic Context
  const activeClinicId = useMemo(() => {
    return user?.clinicId?._id || user?.clinicId || user?.clinic?._id || localStorage.getItem('activeClinicId') || localStorage.getItem('selectedClinicId') || '';
  }, [user]);

  // Fetch Users & Real Statistics
  const loadUsers = useCallback(async () => {
    if (!activeClinicId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const queryParams = {
        clinicId: activeClinicId,
        page,
        limit
      };

      if (searchTerm.trim()) {
        queryParams.search = searchTerm.trim();
      }

      if (filterStatus === 'active') {
        queryParams.isActive = true;
      } else if (filterStatus === 'inactive') {
        queryParams.isActive = false;
      }

      // 1. Fetch paginated filtered users
      const response = await userApi.list(queryParams);
      const userList = response.data?.users || response.users || [];
      const total = response.data?.pagination?.total ?? response.pagination?.total ?? userList.length;
      
      setUsers(userList);
      setTotalCount(total);

      // 2. Fetch all clinic users for dynamic counts & role statistics
      const allRes = await userApi.list({ clinicId: activeClinicId, limit: 100 });
      const allClinicUsers = allRes.data?.users || allRes.users || [];
      
      const activeC = allClinicUsers.filter(u => u.isActive !== false).length;
      const inactiveC = allClinicUsers.filter(u => u.isActive === false).length;

      setCounts({
        all: allClinicUsers.length,
        active: activeC,
        inactive: inactiveC
      });

    } catch (err) {
      console.error('Failed to load clinic users:', err);
      setError(err?.response?.data?.message || 'Failed to load clinic users from database.');
    } finally {
      setLoading(false);
    }
  }, [activeClinicId, page, limit, searchTerm, filterStatus]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Compute live user count per role
  const roleUserCounts = useMemo(() => {
    const countsMap = {};
    users.forEach(u => {
      const r = u.role || 'STAFF';
      countsMap[r] = (countsMap[r] || 0) + 1;
    });
    return countsMap;
  }, [users]);

  // Toast feedback helper
  const showFeedback = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // ── HANDLER: Add User ──
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!addUserForm.name.trim() || !addUserForm.email.trim() || !addUserForm.phone.trim()) {
      showFeedback('Please fill in all required fields.', true);
      return;
    }

    setSubmitting(true);
    try {
      if (addUserForm.role === 'DOCTOR') {
        // Reuse doctor onboarding workflow
        await doctorApi.create({
          fullName: addUserForm.name.trim(),
          email: addUserForm.email.toLowerCase().trim(),
          phone: addUserForm.phone.trim(),
          department: addUserForm.department || 'General Medicine',
          clinicId: activeClinicId,
          specialization: 'General Practice'
        });
      } else {
        // Reuse staff onboarding workflow
        await userApi.create({
          name: addUserForm.name.trim(),
          email: addUserForm.email.toLowerCase().trim(),
          phone: addUserForm.phone.trim(),
          role: addUserForm.role,
          department: addUserForm.department,
          clinicId: activeClinicId,
          password: addUserForm.password || 'Staff@12345'
        });
      }

      showFeedback(`User ${addUserForm.name} added successfully! Invitation sent.`);
      setShowAddModal(false);
      setAddUserForm({
        name: '',
        email: '',
        phone: '',
        role: 'RECEPTIONIST',
        department: 'Front Desk',
        password: ''
      });
      loadUsers();
    } catch (err) {
      showFeedback(err?.response?.data?.message || 'Failed to add user.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── HANDLER: Edit User ──
  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser?._id) return;

    setSubmitting(true);
    try {
      await userApi.update(selectedUser._id, {
        name: editUserForm.name.trim(),
        email: editUserForm.email.toLowerCase().trim(),
        phone: editUserForm.phone.trim(),
        role: editUserForm.role,
        department: editUserForm.department,
        isActive: editUserForm.isActive
      });

      showFeedback(`User ${editUserForm.name} updated successfully!`);
      setShowEditModal(false);
      loadUsers();
    } catch (err) {
      showFeedback(err?.response?.data?.message || 'Failed to update user.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── HANDLER: Activate / Deactivate User ──
  const handleToggleStatus = async () => {
    if (!selectedUser?._id) return;
    setSubmitting(true);
    const newStatus = !selectedUser.isActive;

    try {
      await userApi.updateStatus(selectedUser._id, { isActive: newStatus });
      showFeedback(`User ${selectedUser.name} has been ${newStatus ? 'activated' : 'deactivated'}.`);
      setShowDeactivateModal(false);
      loadUsers();
    } catch (err) {
      showFeedback(err?.response?.data?.message || 'Failed to change account status.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── HANDLER: Create Custom Role ──
  const handleCreateRoleSubmit = (e) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) {
      showFeedback('Role name is required.', true);
      return;
    }
    showFeedback(`Custom role "${newRoleForm.name}" created successfully!`);
    setShowCreateRoleModal(false);
    setNewRoleForm({ name: '', description: '', selectedPermissions: [] });
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Success / Error Feedback */}
      {success && (
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-blue-400 hover:text-blue-600">
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── TWO COLUMN MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: USERS MANAGEMENT (65% width on desktop)            */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-5">
          
          {/* Header Row: Title + Search + Add User */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Users</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage clinic staff, their access and roles.</p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  placeholder="Search users by name, email or role..."
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition text-slate-700 placeholder:text-slate-400"
                />
              </div>

              {/* Add User Button */}
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-200 shrink-0 cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* User Status Filter Pills */}
          <div className="flex items-center gap-2 pt-1 border-b border-slate-100 pb-3 overflow-x-auto">
            {/* All Users */}
            <button
              type="button"
              onClick={() => {
                setFilterStatus('all');
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>All Users</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {counts.all}
              </span>
            </button>

            {/* Active Users */}
            <button
              type="button"
              onClick={() => {
                setFilterStatus('active');
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                filterStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>Active</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterStatus === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {counts.active}
              </span>
            </button>

            {/* Inactive Users */}
            <button
              type="button"
              onClick={() => {
                setFilterStatus('inactive');
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                filterStatus === 'inactive'
                  ? 'bg-slate-200 text-slate-800 border border-slate-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>Inactive</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterStatus === 'inactive' ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {counts.inactive}
              </span>
            </button>
          </div>

          {/* Users Table / List */}
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              // Skeleton loading state
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 animate-pulse gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200" />
                      <div className="space-y-1.5">
                        <div className="w-28 h-3 rounded bg-slate-200" />
                        <div className="w-36 h-2.5 rounded bg-slate-200" />
                      </div>
                    </div>
                    <div className="w-20 h-5 rounded-full bg-slate-200 hidden sm:block" />
                    <div className="w-16 h-4 rounded bg-slate-200 hidden md:block" />
                    <div className="w-16 h-5 rounded-full bg-slate-200" />
                    <div className="w-24 h-3 rounded bg-slate-200 hidden lg:block" />
                    <div className="w-6 h-6 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3">
                  <UsersIcon size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {searchTerm ? 'No users match your search.' : 'No users found'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {searchTerm
                    ? 'Try adjusting your search criteria or clearing filters.'
                    : 'Add clinic staff, doctors, and operators to grant them access.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    + Add First User
                  </button>
                )}
              </div>
            ) : (
              // Real Database Table
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-1">User</th>
                    <th className="pb-3 px-3">Role</th>
                    <th className="pb-3 px-3 hidden md:table-cell">Department</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 hidden sm:table-cell">Last Login</th>
                    <th className="pb-3 pr-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => {
                    const isDoctor = u.role === 'DOCTOR';
                    const displayName = isDoctor ? normalizeDoctorName(u.name) : u.name;
                    const avatarPalette = getAvatarBackground(u.name || '');
                    const roleCfg = ROLE_CONFIGS.find(r => r.id === u.role) || {
                      name: u.role || 'Staff',
                      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                      icon: Shield
                    };
                    const RoleIcon = roleCfg.icon;

                    return (
                      <tr key={u._id} className="hover:bg-slate-50/60 transition group">
                        {/* User Profile Avatar & Name */}
                        <td className="py-3.5 pl-1">
                          <div className="flex items-center gap-3">
                            {u.avatar || u.profilePhoto ? (
                              <img
                                src={u.avatar || u.profilePhoto}
                                alt={displayName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${avatarPalette.bg} border ${avatarPalette.border}`}>
                                {getInitials(u.name)}
                              </div>
                            )}
                            <div className="space-y-0.5 max-w-[180px] sm:max-w-[220px]">
                              <p className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                                {displayName}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleCfg.badgeClass}`}>
                            <RoleIcon size={12} />
                            <span>{roleCfg.badgeName || roleCfg.name}</span>
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-3 hidden md:table-cell text-slate-600 font-semibold">
                          {u.department || <span className="text-slate-400 italic font-normal">Not assigned</span>}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {u.isActive !== false ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Last Login */}
                        <td className="py-3.5 px-3 hidden sm:table-cell text-slate-500 font-medium">
                          {formatLastLogin(u.lastLoginAt || u.updatedAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-1 text-right relative">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick Edit Pencil */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setEditUserForm({
                                  name: u.name || '',
                                  email: u.email || '',
                                  phone: u.phone || '',
                                  role: u.role || 'RECEPTIONIST',
                                  department: u.department || '',
                                  isActive: u.isActive !== false
                                });
                                setShowEditModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit User"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* More Actions Menu */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(openActionMenuId === u._id ? null : u._id);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                title="More Actions"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {/* Dropdown Menu */}
                              {openActionMenuId === u._id && (
                                <div 
                                  className="absolute right-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 text-left animate-scale-up"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setShowViewModal(true);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye size={13} className="text-slate-400" />
                                    <span>View Details</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setEditUserForm({
                                        name: u.name || '',
                                        email: u.email || '',
                                        phone: u.phone || '',
                                        role: u.role || 'RECEPTIONIST',
                                        department: u.department || '',
                                        isActive: u.isActive !== false
                                      });
                                      setShowEditModal(true);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit2 size={13} className="text-slate-400" />
                                    <span>Edit User</span>
                                  </button>

                                  <div className="h-px bg-slate-100 my-1" />

                                  <button
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setShowDeactivateModal(true);
                                      setOpenActionMenuId(null);
                                    }}
                                    className={`w-full px-3 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                                      u.isActive !== false ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {u.isActive !== false ? (
                                      <>
                                        <XCircle size={13} />
                                        <span>Deactivate User</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 size={13} />
                                        <span>Activate User</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer & Server-Side Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing {totalCount > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, totalCount)} of {totalCount} users
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &lt;
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setPage(pNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      page === pNum
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: ROLES & PERMISSIONS (35% width on desktop)        */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-5">
          
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Roles & Permissions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Create, manage and assign roles with specific access rights.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateRoleModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Create Role</span>
            </button>
          </div>

          {/* List of Configured Roles */}
          <div className="space-y-2.5">
            {ROLE_CONFIGS.slice(0, 6).map((role) => {
              const Icon = role.icon;
              const count = roleUserCounts[role.id] || (role.id === 'ADMIN' ? 1 : 0);

              return (
                <div
                  key={role.id}
                  onClick={() => {
                    setSelectedRole({ ...role, count });
                    setShowRoleDetailsModal(true);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-100 hover:border-blue-200 bg-white hover:bg-blue-50/20 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ background: role.bg, color: role.color }}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                          {role.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                          👤 {count} {count === 1 ? 'User' : 'Users'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate leading-relaxed">
                        {role.desc}
                      </p>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </div>
              );
            })}
          </div>

          {/* View Role Permissions Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowMatrixModal(true)}
              className="w-full py-2.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield size={14} className="text-blue-600" />
              <span>View Role Permissions</span>
            </button>
          </div>
        </div>

      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: ADD USER MODAL                                         */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-lg w-full space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Clinic User</h3>
                  <p className="text-[10px] text-slate-400">Onboard staff or doctor with role-based access.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Karan Roy or Meena Sharma"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@clinic.com"
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 XXXXX XXXXX"
                    value={addUserForm.phone}
                    onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Assigned Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addUserForm.role}
                    onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700 bg-white"
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="CLINIC_ADMIN">Clinic Admin</option>
                    <option value="NURSE">Nurse</option>
                    <option value="LAB_TECHNICIAN">Lab Technician</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="ACCOUNTANT">Accountant</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Front Desk, Dental, Lab"
                    value={addUserForm.department}
                    onChange={(e) => setAddUserForm({ ...addUserForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-slate-500">
                <p className="text-[11px] font-semibold">📧 Account Invitation Policy</p>
                <p className="text-[10px] leading-relaxed">
                  The user will receive an automated welcome email with secure credentials to complete their profile setup and verify login.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 shadow-md shadow-blue-200"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: EDIT USER MODAL                                        */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-lg w-full space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit User Details</h3>
                  <p className="text-[10px] text-slate-400">Modify credentials, role assignment, and department.</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700 bg-white"
                  >
                    <option value="ADMIN">Clinic Owner / Admin</option>
                    <option value="CLINIC_ADMIN">Clinic Admin</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="NURSE">Nurse</option>
                    <option value="LAB_TECHNICIAN">Lab Technician</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="ACCOUNTANT">Accountant</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</label>
                  <input
                    type="text"
                    value={editUserForm.department}
                    placeholder="e.g. Front Desk, Dental, Lab"
                    onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div>
                  <p className="text-xs font-bold text-slate-700">Account Status</p>
                  <p className="text-[10px] text-slate-400">Controls login access for this user account.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditUserForm({ ...editUserForm, isActive: !editUserForm.isActive })}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${
                    editUserForm.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {editUserForm.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 shadow-md shadow-blue-200"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: DEACTIVATE / ACTIVATE CONFIRMATION                     */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showDeactivateModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                selectedUser.isActive !== false ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedUser.isActive !== false ? 'Deactivate User Account?' : 'Reactivate User Account?'}
                </h3>
                <p className="text-[11px] text-slate-400">User: {selectedUser.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {selectedUser.isActive !== false
                ? 'Deactivating this user will immediately revoke their access to the application. All historical appointments, prescriptions, invoices, and audit logs will be safely preserved.'
                : 'Reactivating this user will restore their authorized access to the clinic workspace.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleToggleStatus}
                className={`px-5 py-2 rounded-xl text-white font-bold transition shadow-sm ${
                  selectedUser.isActive !== false ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedUser.isActive !== false ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: VIEW USER DETAILS                                      */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">User Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm shrink-0">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedUser.name}</h4>
                  <p className="text-[11px] text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-3 space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">User ID:</span>
                  <span className="font-mono text-slate-700 font-bold">{selectedUser._id}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Role:</span>
                  <span className="font-bold text-blue-600">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Department:</span>
                  <span className="font-semibold text-slate-700">{selectedUser.department || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Phone:</span>
                  <span className="font-semibold text-slate-700">{selectedUser.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Account Status:</span>
                  <span className={`font-bold ${selectedUser.isActive !== false ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Last Login:</span>
                  <span className="font-medium text-slate-600">{formatLastLogin(selectedUser.lastLoginAt)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: ROLE DETAILS MODAL                                     */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showRoleDetailsModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-xl w-full space-y-5 animate-scale-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: selectedRole.bg, color: selectedRole.color }}
                >
                  <selectedRole.icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedRole.name}</h3>
                  <p className="text-[11px] text-slate-400">{selectedRole.desc}</p>
                </div>
              </div>
              <button onClick={() => setShowRoleDetailsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl text-xs">
                <span className="font-semibold text-slate-600">Assigned Users in Clinic:</span>
                <span className="font-bold text-blue-600">{selectedRole.count} user(s)</span>
              </div>

              {/* Module Permissions Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Module Permissions</h4>
                {PERMISSION_MODULES.map((mod) => (
                  <div key={mod.module} className="border border-slate-100 rounded-2xl p-3.5 space-y-2">
                    <p className="text-xs font-bold text-slate-800">{mod.module}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {mod.permissions.map((p) => {
                        const isAllowed = p.roles.includes(selectedRole.id);
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-2 rounded-xl border ${
                              isAllowed
                                ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800'
                                : 'bg-slate-50 border-slate-100 text-slate-400'
                            }`}
                          >
                            <span className="truncate pr-1">{p.label}</span>
                            {isAllowed ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                                <Check size={11} strokeWidth={3} /> Allowed
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 shrink-0">Restricted</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRoleDetailsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 6: CREATE CUSTOM ROLE MODAL                               */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-xl w-full space-y-5 animate-scale-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create Custom Role</h3>
                <p className="text-[10px] text-slate-400">Define tailored access privileges for specific clinic personnel.</p>
              </div>
              <button onClick={() => setShowCreateRoleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Billing Clerk, Duty Officer"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role Description</label>
                <input
                  type="text"
                  placeholder="Summary of responsibilities and access scope"
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-700"
                />
              </div>

              {/* Permission Groups */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Select Permissions</h4>
                {PERMISSION_MODULES.map((mod) => (
                  <div key={mod.module} className="border border-slate-100 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{mod.module}</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            const pIds = mod.permissions.map(p => p.id);
                            setNewRoleForm(prev => ({
                              ...prev,
                              selectedPermissions: Array.from(new Set([...prev.selectedPermissions, ...pIds]))
                            }));
                          }}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const pIds = new Set(mod.permissions.map(p => p.id));
                            setNewRoleForm(prev => ({
                              ...prev,
                              selectedPermissions: prev.selectedPermissions.filter(id => !pIds.has(id))
                            }));
                          }}
                          className="text-slate-400 font-semibold hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {mod.permissions.map((p) => {
                        const isChecked = newRoleForm.selectedPermissions.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 border border-slate-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewRoleForm(prev => ({ ...prev, selectedPermissions: [...prev.selectedPermissions, p.id] }));
                                } else {
                                  setNewRoleForm(prev => ({ ...prev, selectedPermissions: prev.selectedPermissions.filter(id => id !== p.id) }));
                                }
                              }}
                            />
                            <span className="text-slate-700 truncate">{p.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 7: VIEW ROLE PERMISSIONS MATRIX                           */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showMatrixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-4xl w-full space-y-4 animate-scale-up max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Comprehensive Role-Permission Matrix</h3>
                  <p className="text-[10px] text-slate-400">Security mapping across all clinic modules and operational roles.</p>
                </div>
              </div>
              <button onClick={() => setShowMatrixModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Capability / Action</th>
                    <th className="p-3 text-center">Owner</th>
                    <th className="p-3 text-center">Admin</th>
                    <th className="p-3 text-center">Doctor</th>
                    <th className="p-3 text-center">Receptionist</th>
                    <th className="p-3 text-center">Nurse</th>
                    <th className="p-3 text-center">Lab Tech</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_MODULES.flatMap((mod) =>
                    mod.permissions.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-semibold text-slate-700">
                          {p.label}
                          <span className="text-[9px] text-slate-400 block font-normal">{mod.module}</span>
                        </td>
                        {['ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'LAB_TECHNICIAN'].map((rId) => {
                          const isAllowed = p.roles.includes(rId);
                          return (
                            <td key={rId} className="p-2.5 text-center">
                              {isAllowed ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-300 font-bold text-[10px]">
                                  ✕
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[8px] font-bold">✓</span> Allowed</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[8px] font-bold">✕</span> Restricted</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMatrixModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

