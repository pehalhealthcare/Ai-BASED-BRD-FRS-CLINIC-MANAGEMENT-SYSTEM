import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { organizationApi } from '../../lib/api';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black dark:bg-navy-800 dark:border-white/[0.08] dark:text-white';

const OrganizationSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [orgData, setOrgData] = useState({
    name: '',
    logo: '',
    headOfficeImage: '',
    headOfficeEmail: '',
    headOfficePassword: '',
    headOfficeAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    mission: '',
    achievements: [],
    facilities: []
  });

  const [newAchievement, setNewAchievement] = useState('');
  const [newFacility, setNewFacility] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await organizationApi.getProfile();
      const org = response.data?.organization || {};
      setOrgData({
        name: org.name || '',
        logo: org.logo || '',
        headOfficeImage: org.headOfficeImage || '',
        headOfficeEmail: org.headOfficeEmail || '',
        headOfficePassword: '',
        headOfficeAddress: org.headOfficeAddress || {
          line1: '',
          line2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        },
        mission: org.mission || '',
        achievements: org.achievements || [],
        facilities: org.facilities || []
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch organization settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setOrgData((prev) => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    try {
      await organizationApi.updateProfile(orgData);
      setSuccess('Organization profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update organization profile.');
    }
  };

  const addAchievement = () => {
    if (!newAchievement.trim()) return;
    setOrgData((prev) => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement.trim()]
    }));
    setNewAchievement('');
  };

  const removeAchievement = (index) => {
    setOrgData((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  const addFacility = () => {
    if (!newFacility.trim()) return;
    setOrgData((prev) => ({
      ...prev,
      facilities: [...prev.facilities, newFacility.trim()]
    }));
    setNewFacility('');
  };

  const removeFacility = (index) => {
    setOrgData((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <LoadingState label="Loading organization profile..." />;
  }

  if (error && !orgData.name) {
    return <ErrorState title="Error Loading Profile" description={error} />;
  }

  return (
    <div className="grid gap-8 p-1">
      <PageHeader
        eyebrow="Organization Panel"
        title="Organization Settings"
        description="Update your head office, profile branding, mission statements, and clinical facilities."
      />

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {success && <p className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-100">{success}</p>}
        {error && <p className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-sm font-semibold border border-rose-100">{error}</p>}

        {/* Branding & Logo */}
        <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-4">Branding & Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Logo upload */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">Organization Logo</span>
              <div className="relative w-32 h-32 rounded-3xl overflow-hidden bg-stone-100 dark:bg-navy-800 border border-stone-200 dark:border-white/[0.08] flex items-center justify-center">
                {orgData.logo ? (
                  <img src={orgData.logo} alt="Org Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-stone-400 font-bold text-4xl">{orgData.name.charAt(0)}</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'logo')}
                className="w-full text-xs text-stone-500 mt-3 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>

            {/* Name Input */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={orgData.name}
                  onChange={(e) => setOrgData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Apollo Healthcare Network"
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Mission Statement</label>
                <textarea
                  value={orgData.mission}
                  onChange={(e) => setOrgData((prev) => ({ ...prev, mission: e.target.value }))}
                  placeholder="e.g. Delivering compassionate, high-quality healthcare..."
                  rows={3}
                  className={`${FIELD_CLASS} resize-none`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Head Office Profile */}
        <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-4">Head Office details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Head office image */}
            <div className="flex flex-col items-center justify-start">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">Office Profile Image</span>
              <div className="relative w-full aspect-video md:h-32 md:w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-navy-800 border border-stone-200 dark:border-white/[0.08] flex items-center justify-center">
                {orgData.headOfficeImage ? (
                  <img src={orgData.headOfficeImage} alt="Head Office" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-stone-400 text-xs italic">No Image</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'headOfficeImage')}
                className="w-full text-xs text-stone-500 mt-3 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>

            {/* Address details */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={orgData.headOfficeAddress.line1}
                  onChange={(e) =>
                    setOrgData((prev) => ({
                      ...prev,
                      headOfficeAddress: { ...prev.headOfficeAddress, line1: e.target.value }
                    }))
                  }
                  className={FIELD_CLASS}
                />
                <input
                  type="text"
                  placeholder="Address Line 2 (optional)"
                  value={orgData.headOfficeAddress.line2}
                  onChange={(e) =>
                    setOrgData((prev) => ({
                      ...prev,
                      headOfficeAddress: { ...prev.headOfficeAddress, line2: e.target.value }
                    }))
                  }
                  className={FIELD_CLASS}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={orgData.headOfficeAddress.city}
                  onChange={(e) =>
                    setOrgData((prev) => ({
                      ...prev,
                      headOfficeAddress: { ...prev.headOfficeAddress, city: e.target.value }
                    }))
                  }
                  className={FIELD_CLASS}
                />
                <input
                  type="text"
                  placeholder="State"
                  value={orgData.headOfficeAddress.state}
                  onChange={(e) =>
                    setOrgData((prev) => ({
                      ...prev,
                      headOfficeAddress: { ...prev.headOfficeAddress, state: e.target.value }
                    }))
                  }
                  className={FIELD_CLASS}
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={orgData.headOfficeAddress.pincode}
                  onChange={(e) =>
                    setOrgData((prev) => ({
                      ...prev,
                      headOfficeAddress: { ...prev.headOfficeAddress, pincode: e.target.value }
                    }))
                  }
                  className={FIELD_CLASS}
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={orgData.headOfficeAddress.country}
                  onChange={(e) =>
                    setOrgData((prev) => ({
                      ...prev,
                      headOfficeAddress: { ...prev.headOfficeAddress, country: e.target.value }
                    }))
                  }
                  className={FIELD_CLASS}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Headquarters Login Email</label>
                  <input
                    type="email"
                    placeholder="e.g. hq-reception@lifeline.org"
                    value={orgData.headOfficeEmail}
                    onChange={(e) => setOrgData((prev) => ({ ...prev, headOfficeEmail: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Headquarters Login Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={orgData.headOfficePassword}
                    onChange={(e) => setOrgData((prev) => ({ ...prev, headOfficePassword: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements & Facilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Achievements */}
          <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-3">Key Achievements</h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                placeholder="e.g. Best Multi-Specialty Network 2025"
                className={FIELD_CLASS}
              />
              <button
                type="button"
                onClick={addAchievement}
                className="bg-stone-900 text-white dark:bg-white dark:text-stone-900 px-4 py-2.5 rounded-2xl font-semibold hover:bg-stone-800 text-xs transition cursor-pointer"
              >
                Add
              </button>
            </div>

            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {orgData.achievements.map((ach, idx) => (
                <li key={idx} className="flex justify-between items-center bg-stone-50 dark:bg-white/[0.03] p-3 rounded-xl border border-stone-100 dark:border-white/[0.04] text-sm">
                  <span className="text-stone-700 dark:text-stone-300 font-medium">{ach}</span>
                  <button
                    type="button"
                    onClick={() => removeAchievement(idx)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Delete
                  </button>
                </li>
              ))}
              {orgData.achievements.length === 0 && (
                <p className="text-xs text-stone-400 italic">No achievements added yet.</p>
              )}
            </ul>
          </div>

          {/* Facilities */}
          <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-3">Clinical Facilities</h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newFacility}
                onChange={(e) => setNewFacility(e.target.value)}
                placeholder="e.g. 24/7 ICU Support, Robotic Surgery"
                className={FIELD_CLASS}
              />
              <button
                type="button"
                onClick={addFacility}
                className="bg-stone-900 text-white dark:bg-white dark:text-stone-900 px-4 py-2.5 rounded-2xl font-semibold hover:bg-stone-800 text-xs transition cursor-pointer"
              >
                Add
              </button>
            </div>

            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {orgData.facilities.map((fac, idx) => (
                <li key={idx} className="flex justify-between items-center bg-stone-50 dark:bg-white/[0.03] p-3 rounded-xl border border-stone-100 dark:border-white/[0.04] text-sm">
                  <span className="text-stone-700 dark:text-stone-300 font-medium">{fac}</span>
                  <button
                    type="button"
                    onClick={() => removeFacility(idx)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Delete
                  </button>
                </li>
              ))}
              {orgData.facilities.length === 0 && (
                <p className="text-xs text-stone-400 italic">No facilities added yet.</p>
              )}
            </ul>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-stone-200 dark:border-white/[0.08]">
          <button
            type="submit"
            className="rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-700/35 transition-all duration-200 cursor-pointer"
          >
            Save All Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationSettingsPage;
