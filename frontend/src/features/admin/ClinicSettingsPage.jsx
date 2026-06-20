import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import MapPicker from '../../components/common/MapPicker';
import { clinicApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import { MapPin, Save, Building } from 'lucide-react';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black dark:bg-navy-800 dark:border-white/[0.08] dark:text-white';

const ClinicSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [clinicData, setClinicData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  });

  const fetchClinicProfile = async () => {
    if (!user?.clinicId) {
      setError('No clinic context associated with your account.');
      setLoading(false);
      return;
    }
    try {
      const response = await clinicApi.getDetails(user.clinicId);
      const clinic = response.data?.clinic || {};
      setClinicData({
        name: clinic.name || '',
        code: clinic.code || '',
        phone: clinic.phone || '',
        email: response.data?.clinicEmail || clinic.email || '',
        address: clinic.address || {
          line1: '',
          line2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        }
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch clinic settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicProfile();
  }, [user?.clinicId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    try {
      await clinicApi.update(user.clinicId, {
        name: clinicData.name,
        phone: clinicData.phone,
        address: clinicData.address
      });
      setSuccess('Clinic profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update clinic profile.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading clinic profile..." />;
  }

  if (error && !clinicData.name) {
    return <ErrorState title="Error Loading Profile" description={error} />;
  }

  return (
    <div className="grid gap-8 p-1">
      <PageHeader
        eyebrow="Clinic Panel"
        title="Clinic Settings"
        description="Update your clinic contact details, reception phone, and address location using Leaflet maps."
      />

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {success && <p className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-100">{success}</p>}
        {error && <p className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-sm font-semibold border border-rose-100">{error}</p>}

        <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
            <Building className="text-emerald-600" size={20} />
            <span>Clinic Identity & Contact</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Clinic Name</label>
              <input
                type="text"
                required
                value={clinicData.name}
                onChange={(e) => setClinicData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Apollo Grace Branch"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Clinic Code (Read-only)</label>
              <input
                type="text"
                disabled
                value={clinicData.code}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500 cursor-not-allowed dark:bg-navy-800/50 dark:border-white/[0.04]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Receptionist Phone Number</label>
              <input
                type="tel"
                required
                value={clinicData.phone}
                onChange={(e) => setClinicData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. 9876543210"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Clinic Login Email (Read-only)</label>
              <input
                type="email"
                disabled
                value={clinicData.email}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500 cursor-not-allowed dark:bg-navy-800/50 dark:border-white/[0.04]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <MapPin className="text-emerald-600" size={20} />
              <span>Clinic Address Details</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
            >
              <MapPin size={15} />
              <span>Get address from maps</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Address Line 1"
                value={clinicData.address.line1}
                onChange={(e) => setClinicData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                className={FIELD_CLASS}
              />
              <input
                type="text"
                placeholder="Address Line 2 (optional)"
                value={clinicData.address.line2}
                onChange={(e) => setClinicData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                className={FIELD_CLASS}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input
                type="text"
                required
                placeholder="City"
                value={clinicData.address.city}
                onChange={(e) => setClinicData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                className={FIELD_CLASS}
              />
              <input
                type="text"
                required
                placeholder="State"
                value={clinicData.address.state}
                onChange={(e) => setClinicData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                className={FIELD_CLASS}
              />
              <input
                type="text"
                required
                placeholder="Pincode"
                value={clinicData.address.pincode}
                onChange={(e) => setClinicData(prev => ({ ...prev, address: { ...prev.address, pincode: e.target.value } }))}
                className={FIELD_CLASS}
              />
              <input
                type="text"
                required
                placeholder="Country"
                value={clinicData.address.country}
                onChange={(e) => setClinicData(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-stone-200 dark:border-white/[0.08]">
          <button
            type="submit"
            className="rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-700/35 transition-all duration-200 cursor-pointer flex items-center gap-2"
          >
            <Save size={16} />
            <span>Save Clinic Changes</span>
          </button>
        </div>
      </form>

      {showMapPicker && (
        <MapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelectAddress={(addressObj) => {
            setClinicData(prev => ({
              ...prev,
              address: {
                ...prev.address,
                ...addressObj
              }
            }));
          }}
          initialAddress={clinicData.address}
        />
      )}
    </div>
  );
};

export default ClinicSettingsPage;
