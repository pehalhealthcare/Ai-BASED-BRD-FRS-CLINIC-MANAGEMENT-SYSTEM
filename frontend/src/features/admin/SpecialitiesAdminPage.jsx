import { useEffect, useState } from 'react';
import { specializationApi } from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  Building2,
  Users,
  UserCheck,
  Pill,
  FlaskConical,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Mail,
  Phone,
  FileText
} from 'lucide-react';


const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black';

const SpecialitiesAdminPage = () => {
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedSpec, setSelectedSpec] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    isActive: true
  });
  const [formError, setFormError] = useState('');

  // Analytics states
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleViewAnalytics = async (specId) => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError('');
      setShowAnalyticsModal(true);
      setActiveTab('overview');
      const response = await specializationApi.getAnalytics(specId);
      setAnalyticsData(response.data);
    } catch (err) {
      setAnalyticsError(err.response?.data?.message || 'Failed to fetch analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await specializationApi.list({ all: true });
      setSpecializations(response.data.specializations || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load specialities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedSpec(null);
    setForm({ name: '', description: '', isActive: true });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (spec) => {
    setModalMode('edit');
    setSelectedSpec(spec);
    setForm({
      name: spec.name,
      description: spec.description || '',
      isActive: spec.isActive
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (modalMode === 'create') {
        await specializationApi.create(form);
      } else {
        await specializationApi.update(selectedSpec._id, form);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Action failed. Please try again.');
    }
  };

  const handleToggleStatus = async (spec) => {
    try {
      await specializationApi.update(spec._id, {
        isActive: !spec.isActive
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this speciality?')) return;
    try {
      await specializationApi.remove(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete speciality.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading specialities..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load specialities" description={error} />;
  }

  return (
    <div className="grid gap-8 p-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          eyebrow="Admin Panel"
          title="Medical Specialities Directory"
          description="Create, update, toggle active states, or delete specialities across your network."
        />
        <button
          type="button"
          onClick={handleOpenCreate}
          className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-700/35 transition-all duration-200 cursor-pointer"
        >
          + Add Speciality
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Speciality Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-700">
              {specializations.map((spec) => (
                <tr
                  key={spec._id}
                  onClick={() => handleViewAnalytics(spec._id)}
                  className="hover:bg-stone-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-stone-900">{spec.name}</td>
                  <td className="px-6 py-4 text-stone-500 max-w-xs truncate">{spec.description || 'No description provided.'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(spec);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition ${
                        spec.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-200'
                      }`}
                      title="Click to toggle status"
                    >
                      {spec.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 text-stone-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(spec);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(spec._id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 cursor-pointer transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {specializations.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-stone-400">
                    No specialities registered yet. Click "+ Add Speciality" to register one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Speciality Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              {modalMode === 'create' ? 'Add Speciality' : 'Edit Speciality'}
            </h3>
            <p className="text-sm text-stone-500 mb-6">
              Define the speciality details for doctors and clinics.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <p className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm">{formError}</p>}
              
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Speciality Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Cardiology"
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Details about services provided..."
                  className={FIELD_CLASS}
                ></textarea>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-stone-700 cursor-pointer">
                  Mark as Active Speciality
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  {modalMode === 'create' ? 'Add' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Speciality Analytics Modal */}
      <Modal
        open={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        title={analyticsData ? `Analytics: ${analyticsData.specialization?.name}` : 'Speciality Analytics'}
        size="xl"
      >
        {analyticsLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm font-medium text-stone-500">Loading speciality analytics...</p>
          </div>
        ) : analyticsError ? (
          <div className="p-8 text-center">
            <p className="text-rose-600 font-semibold mb-2">Error Loading Analytics</p>
            <p className="text-sm text-stone-500">{analyticsError}</p>
          </div>
        ) : analyticsData ? (
          <div className="p-6 space-y-6">
            {/* Description */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
              <p className="text-sm text-stone-600">
                {analyticsData.specialization?.description || 'No description provided for this speciality.'}
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Branches</p>
                  <p className="text-2xl font-bold text-emerald-950">{analyticsData.clinics?.length || 0}</p>
                </div>
              </div>

              <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-sky-100 text-sky-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Doctors</p>
                  <p className="text-2xl font-bold text-sky-950">{analyticsData.doctors?.length || 0}</p>
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Patients</p>
                  <p className="text-2xl font-bold text-indigo-950">{analyticsData.patientsCount || 0}</p>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase">Revenue (Coll.)</p>
                  <p className="text-lg font-bold text-amber-950 truncate">
                    {formatCurrency(analyticsData.revenue?.totalRevenue || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200 overflow-x-auto gap-2 scrollbar-none">
              {[
                { id: 'overview', label: 'Financial Overview', icon: DollarSign },
                { id: 'clinics', label: 'Branches', icon: Building2 },
                { id: 'doctors', label: 'Doctors', icon: Users },
                { id: 'patients', label: 'Patients', icon: UserCheck },
                { id: 'pharmacy', label: 'Pharmacy Stock', icon: Pill },
                { id: 'labs', label: 'Lab Tests', icon: FlaskConical }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-semibold whitespace-nowrap cursor-pointer transition-all duration-150 ${
                      activeTab === tab.id
                        ? 'border-emerald-600 text-emerald-600 bg-emerald-50/35'
                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50/50'
                    } rounded-t-xl`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="mt-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3">
                      <h4 className="font-bold text-stone-800 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" /> Billing Stats
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Total Billed:</span>
                          <span className="font-semibold text-stone-900">
                            {formatCurrency(analyticsData.revenue?.totalBilled || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Total Collected:</span>
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(analyticsData.revenue?.totalRevenue || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-stone-200 pt-2 font-medium">
                          <span className="text-stone-500">Outstanding:</span>
                          <span className="text-rose-600">
                            {formatCurrency(
                              Math.max(0, (analyticsData.revenue?.totalBilled || 0) - (analyticsData.revenue?.totalRevenue || 0))
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3">
                      <h4 className="font-bold text-stone-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" /> Quick Insights
                      </h4>
                      <div className="space-y-2 text-sm text-stone-600">
                        <p>
                          This speciality is offered in <strong className="text-stone-950">{analyticsData.clinics?.length || 0}</strong> branches with <strong className="text-stone-950">{analyticsData.doctors?.length || 0}</strong> active doctors.
                        </p>
                        <p>
                          Average collected revenue per doctor is <strong className="text-stone-950">{formatCurrency((analyticsData.revenue?.totalRevenue || 0) / (analyticsData.doctors?.length || 1))}</strong>.
                        </p>
                        <p>
                          There are currently <strong className="text-stone-950">{analyticsData.unavailableMedicines?.length || 0}</strong> out-of-stock medicine items related to this category.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'clinics' && (
                <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                      <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Clinic Name</th>
                          <th className="px-6 py-3">Code</th>
                          <th className="px-6 py-3">Phone</th>
                          <th className="px-6 py-3">Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-stone-700">
                        {(analyticsData.clinics || []).map((clinic) => (
                          <tr key={clinic._id} className="hover:bg-stone-50/50">
                            <td className="px-6 py-3 font-semibold text-stone-900">{clinic.name}</td>
                            <td className="px-6 py-3">{clinic.code}</td>
                            <td className="px-6 py-3">{clinic.phone}</td>
                            <td className="px-6 py-3 max-w-xs truncate">
                              {clinic.address && typeof clinic.address === 'object'
                                ? [clinic.address.line1, clinic.address.line2, clinic.address.city, clinic.address.state, clinic.address.pincode, clinic.address.country].filter(Boolean).join(', ')
                                : (clinic.address || 'N/A')}
                            </td>
                          </tr>
                        ))}
                        {(analyticsData.clinics || []).length === 0 && (
                          <tr>
                            <td colSpan="4" className="text-center py-6 text-stone-400">
                              No clinic branches offer this speciality yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'doctors' && (
                <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                      <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Doctor Name</th>
                          <th className="px-6 py-3">Branch Clinic</th>
                          <th className="px-6 py-3">Contact</th>
                          <th className="px-6 py-3">Experience</th>
                          <th className="px-6 py-3">Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-stone-700">
                        {(analyticsData.doctors || []).map((doc) => (
                          <tr key={doc._id} className="hover:bg-stone-50/50">
                            <td className="px-6 py-3 font-semibold text-stone-900">{doc.fullName}</td>
                            <td className="px-6 py-3">
                              {doc.clinicId ? `${doc.clinicId.name} (${doc.clinicId.code})` : 'N/A'}
                            </td>
                            <td className="px-6 py-3 text-xs space-y-0.5">
                              <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-stone-400" /> {doc.email}</div>
                              <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-stone-400" /> {doc.phone}</div>
                            </td>
                            <td className="px-6 py-3">{doc.experienceYears} Years</td>
                            <td className="px-6 py-3 font-semibold">{formatCurrency(doc.consultationFee || 0)}</td>
                          </tr>
                        ))}
                        {(analyticsData.doctors || []).length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-6 text-stone-400">
                              No active doctors registered for this speciality.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'patients' && (
                <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                      <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Patient Name</th>
                          <th className="px-6 py-3">Patient ID</th>
                          <th className="px-6 py-3">Gender / Age</th>
                          <th className="px-6 py-3">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-stone-700">
                        {(analyticsData.patients || []).map((pat) => (
                          <tr key={pat._id} className="hover:bg-stone-50/50">
                            <td className="px-6 py-3 font-semibold text-stone-900">{pat.fullName}</td>
                            <td className="px-6 py-3 font-mono text-xs">{pat.patientId}</td>
                            <td className="px-6 py-3 capitalize">{pat.gender || 'N/A'} / {pat.age || 'N/A'} yrs</td>
                            <td className="px-6 py-3 text-xs space-y-0.5">
                              {pat.email && <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-stone-400" /> {pat.email}</div>}
                              {pat.phone && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-stone-400" /> {pat.phone}</div>}
                            </td>
                          </tr>
                        ))}
                        {(analyticsData.patients || []).length === 0 && (
                          <tr>
                            <td colSpan="4" className="text-center py-6 text-stone-400">
                              No patients treated under this speciality yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'pharmacy' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Showing medicines categorized under this speciality with zero stock level.
                  </div>
                  <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                        <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-3">Medicine Code</th>
                            <th className="px-6 py-3">Medicine Name</th>
                            <th className="px-6 py-3">Generic Name</th>
                            <th className="px-6 py-3">Clinic Branch</th>
                            <th className="px-6 py-3 text-right">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 text-stone-700">
                          {(analyticsData.unavailableMedicines || []).map((med) => (
                            <tr key={med._id} className="hover:bg-stone-50/50">
                              <td className="px-6 py-3 font-mono text-xs">{med.code}</td>
                              <td className="px-6 py-3 font-semibold text-stone-900">{med.name}</td>
                              <td className="px-6 py-3 text-stone-500 italic">{med.genericName}</td>
                              <td className="px-6 py-3 text-xs">
                                {med.clinicId ? `${med.clinicId.name} (${med.clinicId.code})` : 'N/A'}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className="px-2 py-0.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                                  Out of Stock
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(analyticsData.unavailableMedicines || []).length === 0 && (
                            <tr>
                              <td colSpan="5" className="text-center py-6 text-stone-400">
                                No medicines are currently out-of-stock for this speciality.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'labs' && (
                <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                      <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Test Code</th>
                          <th className="px-6 py-3">Test Name</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3">Clinic Branch</th>
                          <th className="px-6 py-3 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-stone-700">
                        {(analyticsData.labTests || []).map((test) => (
                          <tr key={test._id} className="hover:bg-stone-50/50">
                            <td className="px-6 py-3 font-mono text-xs">{test.code}</td>
                            <td className="px-6 py-3 font-semibold text-stone-900">{test.name}</td>
                            <td className="px-6 py-3 capitalize">{test.category}</td>
                            <td className="px-6 py-3 text-xs">
                              {test.clinicId ? `${test.clinicId.name} (${test.clinicId.code})` : 'N/A'}
                            </td>
                            <td className="px-6 py-3 text-right font-semibold">{formatCurrency(test.price || 0)}</td>
                          </tr>
                        ))}
                        {(analyticsData.labTests || []).length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-6 text-stone-400">
                              No lab tests are defined for this speciality.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowAnalyticsModal(false)}
                className="rounded-2xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 shadow-md cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default SpecialitiesAdminPage;
