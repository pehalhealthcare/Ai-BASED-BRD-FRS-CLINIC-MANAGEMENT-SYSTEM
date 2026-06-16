import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { organizationApi } from '../../lib/api';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black';

const OrganizationsPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null); // null means creating
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Preview State
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const loadOrganizations = async () => {
    try {
      const response = await organizationApi.list();
      setOrganizations(response.data?.organizations || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingOrg(null);
    setFormData({ name: '', email: '', password: '' });
    setFormError('');
    setFormSuccess('');
    setShowOrgModal(true);
  };

  const handleOpenEditModal = (org) => {
    setEditingOrg(org);
    setFormData({ name: org.name, email: org.email, password: '' });
    setFormError('');
    setFormSuccess('');
    setShowOrgModal(true);
  };

  const handleSaveOrganization = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      if (editingOrg) {
        // Update
        const payload = {
          name: formData.name,
          email: formData.email
        };
        if (formData.password) payload.password = formData.password;
        await organizationApi.update(editingOrg._id, payload);
        setFormSuccess('Organization updated successfully!');
      } else {
        // Create
        if (!formData.password) {
          setFormError('Password is required for new organizations.');
          return;
        }
        await organizationApi.create(formData);
        setFormSuccess('Organization created successfully!');
      }
      setShowOrgModal(false);
      loadOrganizations();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save organization.');
    }
  };

  const handleToggleStatus = async (org) => {
    try {
      const targetStatus = !org.isActive;
      await organizationApi.toggleStatus(org._id, targetStatus);
      setOrganizations((prev) =>
        prev.map((o) => (o._id === org._id ? { ...o, isActive: targetStatus } : o))
      );
      if (previewData && previewData.organization._id === org._id) {
        setPreviewData((prev) => ({
          ...prev,
          organization: { ...prev.organization, isActive: targetStatus }
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handlePreview = async (orgId) => {
    setPreviewLoading(true);
    setPreviewData(null);
    setShowPreviewModal(true);
    try {
      const response = await organizationApi.getDetails(orgId);
      setPreviewData(response.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch metrics.');
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading Organizations Portal..." />;
  }

  if (error) {
    return <ErrorState title="System Unavailable" description={error} />;
  }

  return (
    <div className="grid gap-8 p-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          eyebrow="Super Admin Portal"
          title="Organizations Dashboard"
          description="Provision, control, and preview metrics of multi-tenant healthcare organizations."
        />
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-700/35 transition-all duration-200 cursor-pointer"
        >
          + Create Organization
        </button>
      </div>

      {/* Grid of Organizations */}
      {organizations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
          <p className="text-stone-500 font-medium">No healthcare organizations registered. Click "+ Create Organization" to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <div key={org._id} className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">
                    {org.name.charAt(0)}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${org.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-stone-50 text-stone-500 border-stone-100'}`}>
                    {org.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                
                <h4 className="text-xl font-bold text-stone-900 truncate">{org.name}</h4>
                <p className="text-sm text-stone-500 mt-1 mb-4 truncate">{org.email}</p>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => handlePreview(org._id)}
                  className="rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold px-4 py-2.5 transition-colors cursor-pointer"
                >
                  Preview Analytics
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(org)}
                    className="rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold px-3 py-2.5 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(org)}
                    className={`rounded-xl text-xs font-semibold px-3 py-2.5 transition-all cursor-pointer ${org.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    {org.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation/Edit Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              {editingOrg ? 'Edit Healthcare Organization' : 'Create Healthcare Organization'}
            </h3>
            <p className="text-sm text-stone-500 mb-6">
              Configure name, login credentials, and provisioning status.
            </p>

            <form onSubmit={handleSaveOrganization} className="space-y-5">
              {formError && <p className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm">{formError}</p>}
              
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Lifeline Clinic Network"
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Admin Email ID</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g. admin@lifeline.org"
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  {editingOrg ? 'Reset Password (optional)' : 'Admin Password'}
                </label>
                <input
                  type="password"
                  required={!editingOrg}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingOrg ? 'Leave blank to keep current' : '••••••••'}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  {editingOrg ? 'Save Changes' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            {previewLoading && <LoadingState label="Fetching live organization metrics..." />}
            {!previewLoading && !previewData && <p className="text-stone-500 py-10 text-center">Failed to load preview details.</p>}
            
            {!previewLoading && previewData && (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-stone-100 pb-4">
                  <div>
                    <h3 className="text-3xl font-bold text-stone-900">{previewData.organization.name}</h3>
                    <p className="text-stone-500 text-sm mt-0.5">{previewData.organization.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    className="rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 px-4 py-2 text-sm font-semibold cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>

                {/* Aggregated Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <span className="text-xs text-stone-500 block uppercase tracking-wider font-semibold">Total Clinics</span>
                    <p className="text-2xl font-bold font-mono text-stone-900 mt-1">{previewData.metrics.totalClinics}</p>
                  </div>
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <span className="text-xs text-stone-500 block uppercase tracking-wider font-semibold">Total Doctors</span>
                    <p className="text-2xl font-bold font-mono text-stone-900 mt-1">{previewData.metrics.totalDoctors}</p>
                  </div>
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <span className="text-xs text-stone-500 block uppercase tracking-wider font-semibold">Total Patients</span>
                    <p className="text-2xl font-bold font-mono text-stone-900 mt-1">{previewData.metrics.totalPatients}</p>
                  </div>
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                    <span className="text-xs text-emerald-800 block uppercase tracking-wider font-semibold">Total Revenue</span>
                    <p className="text-2xl font-bold font-mono text-emerald-900 mt-1">₹ {previewData.metrics.totalRevenue.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Clinics breakdown list */}
                <div>
                  <h4 className="text-lg font-bold text-stone-900 mb-3">Clinics Performance Summary</h4>
                  {previewData.metrics.clinics.length === 0 ? (
                    <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200">
                      <p className="text-stone-500 text-sm">No clinics registered under this organization yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-stone-200">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            <th className="px-6 py-4">Clinic Name</th>
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4 font-mono">Doctors</th>
                            <th className="px-6 py-4 font-mono">Patients</th>
                            <th className="px-6 py-4 font-mono">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {previewData.metrics.clinics.map((clinic) => (
                            <tr key={clinic._id} className="hover:bg-stone-50/55 transition-colors">
                              <td className="px-6 py-4 font-semibold text-stone-900">{clinic.name}</td>
                              <td className="px-6 py-4 text-stone-500 font-medium">
                                <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md text-xs">{clinic.code}</span>
                              </td>
                              <td className="px-6 py-4 font-mono text-stone-700">{clinic.doctorCount}</td>
                              <td className="px-6 py-4 font-mono text-stone-700">{clinic.patientCount}</td>
                              <td className="px-6 py-4 font-mono font-bold text-stone-900">₹ {clinic.revenue.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationsPage;
