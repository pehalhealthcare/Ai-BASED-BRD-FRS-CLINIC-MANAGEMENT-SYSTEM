import React, { useState, useEffect } from 'react';
import { clinicApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { 
  Building2, Users, FileCheck, Ban, Clock, 
  IndianRupee, CalendarDays, RefreshCw, Key,
  Check, X, Search, ShieldAlert, Trash2, ArrowUpDown,
  AlertTriangle, Plus
} from 'lucide-react';

const SuperAdminClinics = () => {
  const [stats, setStats] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [plans, setPlans] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'pending'
  
  // Modal states
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanCycle, setNewPlanCycle] = useState('monthly');
  
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMonths, setExtendMonths] = useState(1);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingClinicId, setRejectingClinicId] = useState(null);
  const [rejectForm, setRejectForm] = useState({
    rejectionReason: '',
    rejectionComments: '',
    incorrectFields: [],
    requestedDocuments: [],
  });
  const [rejectFieldInput, setRejectFieldInput] = useState('');
  const [rejectDocInput, setRejectDocInput] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Create Clinic Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerPassword: '',
    clinicName: '',
    clinicPhone: '',
    clinicAddress: '',
    clinicCity: '',
    clinicState: '',
    clinicPincode: '',
    selectedPlanId: '',
    billingCycle: 'monthly',
    status: 'Active'
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, clinicsRes, pendingRes, plansRes] = await Promise.all([
        clinicApi.getSuperAdminStats(),
        clinicApi.list(),
        clinicApi.getPendingRequests(),
        clinicApi.getRegistrationPlans()
      ]);
      setStats(statsRes.data);
      setClinics(clinicsRes.data.clinics || []);
      setPendingRequests(pendingRes.data.requests || []);
      setPlans(plansRes.data.plans || []);
    } catch (err) {
      console.error("Failed to load super admin clinic data:", err);
      setError('Failed to load clinic management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this clinic registration?')) return;
    try {
      await clinicApi.approveRequest(id);
      alert('Clinic registration approved successfully! Credentials generated.');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve clinic.');
    }
  };

  const handleReject = (id) => {
    setRejectingClinicId(id);
    setRejectForm({ rejectionReason: '', rejectionComments: '', incorrectFields: [], requestedDocuments: [] });
    setRejectFieldInput('');
    setRejectDocInput('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectForm.rejectionReason.trim()) {
      setRejectError('Please provide a rejection reason.');
      return;
    }
    setRejectSubmitting(true);
    setRejectError('');
    try {
      await clinicApi.rejectRequest(rejectingClinicId, rejectForm);
      setShowRejectModal(false);
      setRejectingClinicId(null);
      loadData();
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject clinic.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleToggleStatus = async (clinic) => {
    const isSuspended = clinic.approvalStatus === 'suspended' || clinic.subscription?.status === 'Suspended';
    const action = isSuspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} this clinic?`)) return;
    try {
      if (isSuspended) {
        await clinicApi.activateClinic(clinic._id);
      } else {
        await clinicApi.suspendClinic(clinic._id);
      }
      alert(`Clinic ${isSuspended ? 'activated' : 'suspended'} successfully.`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('CRITICAL: Are you sure you want to permanently delete this clinic? This cannot be undone.')) return;
    try {
      await clinicApi.deleteClinic(id);
      alert('Clinic deleted successfully.');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete clinic.');
    }
  };

  const handleCreateClinicSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.ownerName || !createForm.ownerEmail || !createForm.ownerPassword || !createForm.clinicName || !createForm.selectedPlanId) {
      setCreateError('Please fill in all required fields (Owner Name, Email, Password, Clinic Name, Plan).');
      return;
    }
    setCreateSubmitting(true);
    setCreateError('');

    try {
      const payload = {
        ownerDetails: {
          name: createForm.ownerName,
          email: createForm.ownerEmail,
          phone: createForm.ownerPhone || '9999999999',
          password: createForm.ownerPassword
        },
        clinicDetails: {
          name: createForm.clinicName,
          contactNumber: createForm.clinicPhone || createForm.ownerPhone || '9999999999',
          addressLine1: createForm.clinicAddress,
          city: createForm.clinicCity,
          state: createForm.clinicState,
          pincode: createForm.clinicPincode
        },
        selectedPlan: {
          planId: createForm.selectedPlanId,
          billingCycle: createForm.billingCycle
        },
        status: createForm.status
      };

      await clinicApi.superAdminCreateClinic(payload);
      alert('Clinic and admin account created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: '',
        clinicName: '',
        clinicPhone: '',
        clinicAddress: '',
        clinicCity: '',
        clinicState: '',
        clinicPincode: '',
        selectedPlanId: '',
        billingCycle: 'monthly',
        status: 'Active'
      });
      loadData();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create clinic.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openPlanModal = (clinic) => {
    setSelectedClinic(clinic);
    setNewPlanId(clinic.subscription?.planId?._id || clinic.subscription?.planId || '');
    setNewPlanCycle(clinic.subscription?.billingCycle || 'monthly');
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    try {
      await clinicApi.changePlan(selectedClinic._id, { planId: newPlanId, billingCycle: newPlanCycle });
      alert('Subscription plan updated successfully.');
      setShowPlanModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update subscription plan.');
    }
  };

  const openExtendModal = (clinic) => {
    setSelectedClinic(clinic);
    setExtendMonths(1);
    setShowExtendModal(true);
  };

  const handleSaveExtend = async () => {
    try {
      await clinicApi.extendSubscription(selectedClinic._id, { months: extendMonths });
      alert('Subscription extended successfully.');
      setShowExtendModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to extend subscription.');
    }
  };

  const openResetModal = (clinic) => {
    setSelectedClinic(clinic);
    setNewPassword('');
    setShowResetModal(true);
  };

  const handleSaveReset = async () => {
    try {
      await clinicApi.resetPassword(selectedClinic._id, { password: newPassword });
      alert('Clinic administrator password reset successfully.');
      setShowResetModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  const openDetailsModal = (clinic) => {
    setSelectedClinic(clinic);
    setShowDetailsModal(true);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const filteredClinics = clinics.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ownerDetails?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Clinic Management & Subscriptions"
        subtitle="Platform-wide multi-tenant controls for clinic self-registrations, renewals, and features."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" /> Create Clinic
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Clinics</span>
            <div className="text-3xl font-extrabold text-stone-900 mt-1">{stats?.totalClinics || 0}</div>
            <div className="text-xs text-stone-500 mt-1">Active: {stats?.activeClinics || 0}</div>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Pending Approvals</span>
            <div className="text-3xl font-extrabold text-stone-900 mt-1">{stats?.pendingClinics || 0}</div>
            <div className="text-xs text-amber-600 font-semibold mt-1">Needs Attention</div>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Suspended / Expired</span>
            <div className="text-3xl font-extrabold text-stone-900 mt-1">
              {(stats?.suspendedClinics || 0) + (stats?.expiredSubscriptions || 0)}
            </div>
            <div className="text-xs text-stone-500 mt-1">Expired: {stats?.expiredSubscriptions || 0}</div>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
            <Ban className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Est. Monthly Revenue</span>
            <div className="text-3xl font-extrabold text-stone-900 mt-1">₹{stats?.monthlyRevenue?.toLocaleString()}</div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">From active tenants</div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`pb-2 px-1 font-bold text-sm transition relative ${activeTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-stone-400 hover:text-stone-700'}`}
        >
          Clinic Directory ({clinics.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-2 px-1 font-bold text-sm transition relative flex items-center gap-2 ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-stone-400 hover:text-stone-700'}`}
        >
          Pending Self-Registrations ({pendingRequests.length})
          {pendingRequests.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filters */}
      {activeTab === 'list' && (
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-stone-400" />
          <input 
            type="text" 
            placeholder="Search by clinic name, unique code, or owner email..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-2xl outline-none focus:border-blue-600 text-sm text-stone-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Content Render */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        {activeTab === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Clinic Info</th>
                  <th className="px-6 py-4">Owner Info</th>
                  <th className="px-6 py-4">Subscription</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700 text-sm">
                {filteredClinics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-stone-400">No clinics found.</td>
                  </tr>
                ) : (
                  filteredClinics.map((clinic) => {
                    const planName = clinic.subscription?.planId?.name || "N/A";
                    const isSuspended = clinic.approvalStatus === 'suspended' || clinic.subscription?.status === 'Suspended';
                    
                    return (
                      <tr key={clinic._id} className="hover:bg-stone-50/50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-stone-900">{clinic.name}</div>
                          <div className="text-xs text-stone-400 font-medium">Code: {clinic.code}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-stone-800">{clinic.ownerDetails?.name || "No owner info"}</div>
                          <div className="text-xs text-stone-400">{clinic.ownerDetails?.email || clinic.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-stone-800">{planName}</div>
                          <div className="text-xs text-stone-500">
                            Expires: {clinic.subscription?.expiryDate ? new Date(clinic.subscription.expiryDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isSuspended 
                              ? "bg-red-50 text-red-700 border-red-200" 
                              : clinic.approvalStatus === 'approved' 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {isSuspended ? 'Suspended' : clinic.approvalStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => openDetailsModal(clinic)}
                            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => openPlanModal(clinic)}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                          >
                            Plan
                          </button>
                          <button 
                            onClick={() => openExtendModal(clinic)}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition"
                          >
                            Extend
                          </button>
                          <button 
                            onClick={() => openResetModal(clinic)}
                            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition"
                          >
                            Password
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(clinic)}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                              isSuspended 
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                : "bg-red-50 hover:bg-red-100 text-red-700"
                            }`}
                          >
                            {isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                          <button 
                            onClick={() => handleDelete(clinic._id)}
                            className="px-2 py-1 hover:bg-stone-100 text-stone-400 hover:text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Clinic Info</th>
                  <th className="px-6 py-4">Owner Info</th>
                  <th className="px-6 py-4">Requested Plan</th>
                  <th className="px-6 py-4">Date Submitted</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700 text-sm">
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-stone-400">No pending registrations found.</td>
                  </tr>
                ) : (
                  pendingRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-stone-50/50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-stone-900">{req.name}</div>
                        <div className="text-xs text-stone-400">{`${req.address?.line1}, ${req.address?.city}`}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-stone-800">{req.ownerDetails?.name}</div>
                        <div className="text-xs text-stone-500">{req.ownerDetails?.email}</div>
                        <div className="text-xs text-stone-400">{req.ownerDetails?.phone}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-stone-800">
                        {req.subscription?.planId?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-stone-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => openDetailsModal(req)}
                          className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition"
                        >
                          Review Details
                        </button>
                        <button 
                          onClick={() => handleApprove(req._id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(req._id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan Update Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Change Plan for {selectedClinic?.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Select Plan</label>
                <select 
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm text-stone-800"
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                >
                  <option value="">Select Plan...</option>
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Billing Cycle</label>
                <select 
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm text-stone-800"
                  value={newPlanCycle}
                  onChange={(e) => setNewPlanCycle(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 text-sm font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSavePlan}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Extension Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Extend Subscription</h3>
            <p className="text-sm text-stone-500 mb-4">Extend the active subscription of {selectedClinic?.name}.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Extension Period</label>
                <select 
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm text-stone-800"
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(parseInt(e.target.value))}
                >
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>1 Year</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setShowExtendModal(false)}
                className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 text-sm font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveExtend}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Reset Clinic Admin Password</h3>
            <p className="text-sm text-stone-500 mb-4">Set a new password for {selectedClinic?.ownerDetails?.name || selectedClinic?.name}.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">New Password</label>
                <input 
                  type="password"
                  placeholder="At least 6 characters"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm text-stone-800 focus:bg-white focus:border-blue-600"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 text-sm font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveReset}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedClinic && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-stone-900">{selectedClinic.name}</h3>
                <p className="text-xs text-stone-400">Unique Code: {selectedClinic.code}</p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="p-1.5 hover:bg-stone-100 rounded-xl transition text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-sm">
              
              {/* Owner details */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
                <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> Owner Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-700">
                  <div><span className="text-stone-400 font-medium">Name:</span> <span className="font-semibold">{selectedClinic.ownerDetails?.name || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Designation:</span> <span>{selectedClinic.ownerDetails?.designation || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Email:</span> <span>{selectedClinic.ownerDetails?.email || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Phone:</span> <span>{selectedClinic.ownerDetails?.phone || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Gender:</span> <span>{selectedClinic.ownerDetails?.gender || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">DOB:</span> <span>{selectedClinic.ownerDetails?.dob ? new Date(selectedClinic.ownerDetails.dob).toLocaleDateString() : 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">PAN:</span> <span>{selectedClinic.ownerDetails?.pan || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Aadhaar:</span> <span>{selectedClinic.ownerDetails?.aadhaar || 'N/A'}</span></div>
                </div>
              </div>

              {/* Clinic details */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
                <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" /> Clinic Address & Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-700">
                  <div><span className="text-stone-400 font-medium">Established Year:</span> <span>{selectedClinic.clinicDetails?.establishedYear || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Registration Number:</span> <span>{selectedClinic.clinicDetails?.registrationNumber || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Consultation Mode:</span> <span>{selectedClinic.clinicDetails?.consultationMode || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Languages Spoken:</span> <span>{selectedClinic.clinicDetails?.languagesSpoken?.join(', ') || 'N/A'}</span></div>
                  <div className="md:col-span-2">
                    <span className="text-stone-400 font-medium">Address:</span> <span>{`${selectedClinic.address?.line1 || ''}, ${selectedClinic.address?.line2 || ''}, ${selectedClinic.address?.city || ''}, ${selectedClinic.address?.state || ''} - ${selectedClinic.address?.pincode || ''}`}</span>
                  </div>
                  {selectedClinic.clinicDetails?.shortDescription && (
                    <div className="md:col-span-2">
                      <span className="text-stone-400 font-medium font-semibold">Short Description:</span>
                      <p className="mt-1 text-stone-600">{selectedClinic.clinicDetails.shortDescription}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timings */}
              {selectedClinic.clinicDetails?.timings?.length > 0 && (
                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
                  <h4 className="font-bold text-stone-800 mb-3">Clinic Timings</h4>
                  <div className="space-y-2">
                    {selectedClinic.clinicDetails.timings.map((t, idx) => (
                      <div key={idx} className="flex justify-between bg-white px-4 py-2 rounded-xl border border-stone-200 text-stone-600">
                        <span className="font-semibold">{t.dayRange}</span>
                        <span>{t.startTime} - {t.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscription details */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
                <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" /> Subscription & Plan
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-700">
                  <div><span className="text-stone-400 font-medium">Current Plan:</span> <span className="font-bold text-stone-900">{selectedClinic.subscription?.planId?.name || "No active plan"}</span></div>
                  <div><span className="text-stone-400 font-medium">Billing Cycle:</span> <span className="capitalize">{selectedClinic.subscription?.billingCycle || 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Start Date:</span> <span>{selectedClinic.subscription?.startDate ? new Date(selectedClinic.subscription.startDate).toLocaleDateString() : 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Renewal Date:</span> <span>{selectedClinic.subscription?.renewalDate ? new Date(selectedClinic.subscription.renewalDate).toLocaleDateString() : 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Expiry Date:</span> <span>{selectedClinic.subscription?.expiryDate ? new Date(selectedClinic.subscription.expiryDate).toLocaleDateString() : 'N/A'}</span></div>
                  <div><span className="text-stone-400 font-medium">Subscription Status:</span> <span className="font-bold">{selectedClinic.subscription?.status || 'N/A'}</span></div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-stone-100 pt-4">
              <button 
                type="button" 
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── Rejection Modal ─────────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowRejectModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Reject Registration</h2>
              <button onClick={() => setShowRejectModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"><X className="w-4 h-4 text-slate-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              {rejectError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{rejectError}</div>}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Rejection Reason * <span className="text-red-500">(required)</span></label>
                <select value={rejectForm.rejectionReason} onChange={e => setRejectForm(f => ({ ...f, rejectionReason: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500">
                  <option value="">-- Select a reason --</option>
                  <option value="Incomplete Documents">Incomplete Documents</option>
                  <option value="Invalid Information">Invalid Information</option>
                  <option value="Duplicate Registration">Duplicate Registration</option>
                  <option value="Ineligible Applicant">Ineligible Applicant</option>
                  <option value="Policy Violation">Policy Violation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Detailed Comments</label>
                <textarea value={rejectForm.rejectionComments} onChange={e => setRejectForm(f => ({ ...f, rejectionComments: e.target.value }))}
                  rows={3} placeholder="Explain what needs to be corrected..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Incorrect Fields</label>
                <div className="flex gap-2 mb-2">
                  <input value={rejectFieldInput} onChange={e => setRejectFieldInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && rejectFieldInput.trim()) { setRejectForm(f => ({ ...f, incorrectFields: [...f.incorrectFields, rejectFieldInput.trim()] })); setRejectFieldInput(''); } }}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500" placeholder="e.g. Clinic Name, Phone..." />
                  <button type="button" onClick={() => { if (rejectFieldInput.trim()) { setRejectForm(f => ({ ...f, incorrectFields: [...f.incorrectFields, rejectFieldInput.trim()] })); setRejectFieldInput(''); }}}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-700 transition"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rejectForm.incorrectFields.map((field, i) => (
                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">
                      {field}
                      <button onClick={() => setRejectForm(f => ({ ...f, incorrectFields: f.incorrectFields.filter((_, j) => j !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Documents Requested</label>
                <div className="flex gap-2 mb-2">
                  <input value={rejectDocInput} onChange={e => setRejectDocInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && rejectDocInput.trim()) { setRejectForm(f => ({ ...f, requestedDocuments: [...f.requestedDocuments, rejectDocInput.trim()] })); setRejectDocInput(''); }}}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500" placeholder="e.g. GST Certificate, Address Proof..." />
                  <button type="button" onClick={() => { if (rejectDocInput.trim()) { setRejectForm(f => ({ ...f, requestedDocuments: [...f.requestedDocuments, rejectDocInput.trim()] })); setRejectDocInput(''); }}}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-700 transition"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rejectForm.requestedDocuments.map((doc, i) => (
                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
                      {doc}
                      <button onClick={() => setRejectForm(f => ({ ...f, requestedDocuments: f.requestedDocuments.filter((_, j) => j !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowRejectModal(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
                <button onClick={handleRejectSubmit} disabled={rejectSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-red-200 hover:opacity-90 transition disabled:opacity-50">
                  {rejectSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  {rejectSubmitting ? 'Rejecting...' : 'Reject Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ─── Create Clinic Modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" /> Create New Clinic</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"><X className="w-4 h-4 text-slate-600" /></button>
            </div>
            
            <form onSubmit={handleCreateClinicSubmit} className="p-6 space-y-6">
              {createError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{createError}</div>}

              {/* Owner Details */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-1">1. Owner Details (Admin Account)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Owner Name *</label>
                    <input type="text" value={createForm.ownerName} onChange={e => setCreateForm(f => ({ ...f, ownerName: e.target.value }))}
                      placeholder="e.g. Dr. Kaishav Gupta" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Owner Email *</label>
                    <input type="email" value={createForm.ownerEmail} onChange={e => setCreateForm(f => ({ ...f, ownerEmail: e.target.value }))}
                      placeholder="e.g. owner@clinic.com" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Owner Phone</label>
                    <input type="text" value={createForm.ownerPhone} onChange={e => setCreateForm(f => ({ ...f, ownerPhone: e.target.value }))}
                      placeholder="e.g. 9999999999" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Login Password *</label>
                    <input type="password" value={createForm.ownerPassword} onChange={e => setCreateForm(f => ({ ...f, ownerPassword: e.target.value }))}
                      placeholder="At least 6 characters" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" required minLength={6} />
                  </div>
                </div>
              </div>

              {/* Clinic Details */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-1">2. Clinic details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Clinic Name *</label>
                    <input type="text" value={createForm.clinicName} onChange={e => setCreateForm(f => ({ ...f, clinicName: e.target.value }))}
                      placeholder="e.g. Apollo Healthcare Indirapuram" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Clinic Contact Phone</label>
                    <input type="text" value={createForm.clinicPhone} onChange={e => setCreateForm(f => ({ ...f, clinicPhone: e.target.value }))}
                      placeholder="e.g. 08069049763" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Address Line</label>
                    <input type="text" value={createForm.clinicAddress} onChange={e => setCreateForm(f => ({ ...f, clinicAddress: e.target.value }))}
                      placeholder="Street/Building" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">City</label>
                    <input type="text" value={createForm.clinicCity} onChange={e => setCreateForm(f => ({ ...f, clinicCity: e.target.value }))}
                      placeholder="City" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">State</label>
                    <input type="text" value={createForm.clinicState} onChange={e => setCreateForm(f => ({ ...f, clinicState: e.target.value }))}
                      placeholder="State" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" />
                  </div>
                </div>
              </div>

              {/* Plan and Subscription */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-1">3. Subscription Plan Selection</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Select Plan *</label>
                    <select value={createForm.selectedPlanId} onChange={e => setCreateForm(f => ({ ...f, selectedPlanId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800" required>
                      <option value="">-- Choose Plan --</option>
                      {plans.map(p => (
                        <option key={p._id} value={p._id}>{p.name} (₹{p.priceMonthly}/mo)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Billing Cycle</label>
                    <select value={createForm.billingCycle} onChange={e => setCreateForm(f => ({ ...f, billingCycle: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800">
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Account Status</label>
                    <select value={createForm.status} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-800">
                      <option value="Active">Active (Instant Login)</option>
                      <option value="Pending">Pending Approval</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" disabled={createSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-100 hover:opacity-90 transition disabled:opacity-50">
                  {createSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {createSubmitting ? 'Creating...' : 'Create & Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminClinics;
