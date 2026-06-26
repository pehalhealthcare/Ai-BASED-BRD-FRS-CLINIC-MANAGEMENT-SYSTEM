import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import MapPicker from '../../components/common/MapPicker';
import { clinicApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import {
  MapPin,
  Save,
  Building,
  Calendar,
  Trash2,
  Plus,
  Check,
  RefreshCw,
  AlertCircle,
  Info,
  Layers
} from 'lucide-react';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black dark:bg-navy-800 dark:border-white/[0.08] dark:text-white';

const ClinicSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'holidays'

  // Profile fields state
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

  // Holiday management state
  const [holidays, setHolidays] = useState([]);
  const [suggestedHolidays, setSuggestedHolidays] = useState([]);
  const [allClinics, setAllClinics] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // Holiday object to delete

  // Add/Edit Holiday form state
  const [holidayForm, setHolidayForm] = useState({
    _id: null,
    holiday_name: '',
    holiday_date: '',
    is_recurring: false,
    all_clinics: false,
    allow_emergency: false,
    closeAll: true,
    closed_portions: ['appointments', 'doctor_slots', 'labs', 'pharmacy'],
    clinicIds: []
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

  const fetchHolidays = async () => {
    setLoadingHolidays(true);
    try {
      // Fetch both active and soft-deleted holidays
      const res = await clinicApi.getHolidays({ includeDeleted: 'true' });
      setHolidays(res.holidays || []);
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const fetchUpcomingSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const year = new Date().getFullYear();
      // Fetch upcoming public holidays in India
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
      if (response.ok) {
        const data = await response.json();
        // Sort and filter for upcoming/current year holidays
        const todayStr = new Date().toISOString().split('T')[0];
        const upcoming = data.filter(h => h.date >= todayStr).slice(0, 5);
        setSuggestedHolidays(upcoming);
      }
    } catch (err) {
      console.error('Failed to fetch suggested public holidays:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchClinicProfile();
  }, [user?.clinicId]);

  const fetchClinics = async () => {
    try {
      const res = await clinicApi.list();
      setAllClinics(res.data?.clinics || res.clinics || []);
    } catch (err) {
      console.error('Failed to fetch clinics:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'holidays') {
      fetchHolidays();
      fetchUpcomingSuggestions();
      fetchClinics();
    }
  }, [activeTab]);

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

  const handleOpenAddModal = (initialData = null) => {
    if (initialData) {
      // Edit mode
      const isAllClosed =
        initialData.closed_portions?.includes('all') ||
        (initialData.closed_portions?.includes('appointments') &&
          initialData.closed_portions?.includes('doctor_slots') &&
          initialData.closed_portions?.includes('labs') &&
          initialData.closed_portions?.includes('pharmacy'));

      setHolidayForm({
        _id: initialData._id,
        holiday_name: initialData.holiday_name,
        holiday_date: new Date(initialData.holiday_date).toISOString().split('T')[0],
        is_recurring: initialData.is_recurring || false,
        all_clinics: initialData.all_clinics || false,
        allow_emergency: initialData.allow_emergency || false,
        closeAll: isAllClosed,
        closed_portions: initialData.closed_portions?.includes('all')
          ? ['appointments', 'doctor_slots', 'labs', 'pharmacy']
          : initialData.closed_portions || [],
        clinicIds: initialData.clinicId ? [initialData.clinicId._id || initialData.clinicId] : []
      });
    } else {
      // Add mode
      setHolidayForm({
        _id: null,
        holiday_name: '',
        holiday_date: '',
        is_recurring: false,
        all_clinics: false,
        allow_emergency: false,
        closeAll: true,
        closed_portions: ['appointments', 'doctor_slots', 'labs', 'pharmacy'],
        clinicIds: []
      });
    }
    setShowAddModal(true);
  };

  const handleQuickAdd = (suggestion) => {
    setHolidayForm({
      _id: null,
      holiday_name: suggestion.name,
      holiday_date: suggestion.date,
      is_recurring: false,
      all_clinics: false,
      allow_emergency: false,
      closeAll: true,
      closed_portions: ['appointments', 'doctor_slots', 'labs', 'pharmacy'],
      clinicIds: []
    });
    setShowAddModal(true);
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    setError('');
    const portions = holidayForm.closeAll ? ['all'] : holidayForm.closed_portions;

    if (!holidayForm.closeAll && portions.length === 0) {
      setError('Please select at least one clinic service to close.');
      return;
    }

    try {
      const payload = {
        holiday_name: holidayForm.holiday_name,
        holiday_date: holidayForm.holiday_date,
        is_recurring: holidayForm.is_recurring,
        all_clinics: holidayForm.all_clinics,
        allow_emergency: holidayForm.allow_emergency,
        closed_portions: portions,
        clinicIds: holidayForm.all_clinics ? [] : holidayForm.clinicIds
      };

      if (holidayForm._id) {
        // Update
        await clinicApi.updateHoliday(holidayForm._id, payload);
      } else {
        // Create
        await clinicApi.createHoliday(payload);
      }
      setShowAddModal(false);
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save holiday.');
    }
  };

  const toggleClosedPortion = (portion) => {
    setHolidayForm(prev => {
      const exists = prev.closed_portions.includes(portion);
      let updated;
      if (exists) {
        updated = prev.closed_portions.filter(p => p !== portion);
      } else {
        updated = [...prev.closed_portions, portion];
      }
      return { ...prev, closed_portions: updated };
    });
  };

  const handleToggleRestoreHoliday = async (holiday) => {
    try {
      await clinicApi.updateHoliday(holiday._id, { is_deleted: false });
      fetchHolidays();
    } catch (err) {
      console.error('Failed to restore holiday:', err);
    }
  };

  const handleDeleteHoliday = async (permanent = false) => {
    if (!showDeleteConfirm) return;
    try {
      await clinicApi.deleteHoliday(showDeleteConfirm._id, permanent);
      setShowDeleteConfirm(null);
      fetchHolidays();
    } catch (err) {
      console.error('Failed to delete holiday:', err);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          eyebrow="Clinic Panel"
          title="Clinic Settings & Holidays"
          description="Update your clinic settings, reception phone, and manage schedule closures & holidays."
        />

        {/* Tab system switcher */}
        <div className="flex bg-stone-100 dark:bg-navy-800 p-1 rounded-2xl border border-stone-200 dark:border-white/[0.08] max-w-sm">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-navy-900 text-emerald-600 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Building size={16} />
            <span>Clinic Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'holidays'
                ? 'bg-white dark:bg-navy-900 text-emerald-600 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Calendar size={16} />
            <span>Manage Holidays</span>
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
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
      ) : (
        <div className="space-y-8 max-w-6xl">
          {/* Nager.Date suggestions bar */}
          <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-stone-50/50 dark:bg-navy-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Info className="text-emerald-500 animate-pulse" size={18} />
                <span>Upcoming Public Holidays (Nager.Date Suggestions)</span>
              </h4>
              <button
                onClick={fetchUpcomingSuggestions}
                disabled={loadingSuggestions}
                className="text-stone-500 hover:text-stone-950 dark:hover:text-white flex items-center gap-1 text-xs cursor-pointer"
              >
                <RefreshCw size={12} className={loadingSuggestions ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
            {loadingSuggestions ? (
              <p className="text-xs text-stone-500 dark:text-stone-400">Fetching local public holiday suggestions...</p>
            ) : suggestedHolidays.length === 0 ? (
              <p className="text-xs text-stone-500 dark:text-stone-400">No upcoming public holidays found for this year.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {suggestedHolidays.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all"
                  >
                    <div>
                      <p className="text-xs font-bold text-stone-800 dark:text-white line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                        {new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleQuickAdd(item)}
                      className="mt-3 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} />
                      <span>Add as Holiday</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Holidays List */}
          <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-navy-900 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Calendar className="text-emerald-600" size={20} />
                  <span>Clinic Holiday Schedule</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Manage the dates on which your clinic services, booking slots, and appointments are closed.
                </p>
              </div>

              <button
                onClick={() => handleOpenAddModal()}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 hover:shadow-emerald-700/25 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Add Custom Holiday</span>
              </button>
            </div>

            {loadingHolidays ? (
              <div className="py-12 flex justify-center items-center">
                <RefreshCw size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-200 dark:border-white/[0.08] rounded-2xl">
                <AlertCircle className="mx-auto text-stone-400 mb-2" size={32} />
                <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No holidays scheduled yet.</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Use public suggestions or click "Add Custom Holiday" to close a date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-white/[0.08]">
                      <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300">Holiday Name</th>
                      <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300">Date</th>
                      <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300">Recurring Yearly</th>
                      <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300">Closed portions</th>
                      <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300">Status</th>
                      <th className="py-3.5 px-4 font-bold text-stone-700 dark:text-stone-300 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((h) => {
                      const isDeleted = h.is_deleted;
                      const formattedDate = new Date(h.holiday_date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });

                      const portionsList = h.closed_portions || ['all'];
                      const displaysAll = portionsList.includes('all') || portionsList.length >= 4;

                      return (
                        <tr
                          key={h._id}
                          className={`border-b border-stone-100 dark:border-white/[0.04] transition hover:bg-stone-50/50 dark:hover:bg-navy-950/40 ${
                            isDeleted ? 'opacity-50 line-through' : ''
                          }`}
                        >
                          <td className="py-4 px-4 font-semibold text-stone-900 dark:text-white">
                            <div className="flex flex-col gap-1">
                              <span>{h.holiday_name}</span>
                              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                                Clinic: {h.all_clinics ? 'All Clinics (Global)' : (h.clinicId?.name || 'Local Clinic')}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-stone-600 dark:text-stone-400">
                            {formattedDate}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              h.is_recurring
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                                : 'bg-stone-100 text-stone-700 dark:bg-navy-800 dark:text-stone-400'
                            }`}>
                              {h.is_recurring ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1.5">
                              {displaysAll ? (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-bold flex items-center gap-1 w-max">
                                  <Layers size={12} />
                                  <span>All Portions Closed</span>
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {portionsList.map((p, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-bold"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {h.allow_emergency && (
                                <span className="text-[9px] uppercase tracking-wider bg-emerald-50 text-emerald-705 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded w-max">
                                  Emergency Open
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-bold ${isDeleted ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {isDeleted ? 'Closed (Temporary Delete)' : 'Active (Closed)'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2.5">
                              {isDeleted ? (
                                <button
                                  onClick={() => handleToggleRestoreHoliday(h)}
                                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                                >
                                  Restore
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleOpenAddModal(h)}
                                    className="text-xs font-bold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(h)}
                                    className="text-xs font-bold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map picker rendering */}
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

      {/* Add/Edit Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 rounded-3xl border border-stone-200 dark:border-white/[0.08] p-6 max-w-lg w-full shadow-2xl animate-in fade-in-50 duration-200">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2 flex items-center gap-2">
              <Calendar className="text-emerald-600" size={22} />
              <span>{holidayForm._id ? 'Edit Clinic Holiday' : 'Schedule Clinic Closure / Holiday'}</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
              Designate a date to stop appointments, availability slots, and laboratory/pharmacy bookings.
            </p>

            <form onSubmit={handleSaveHoliday} className="space-y-5">
              {error && <p className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 rounded-xl font-semibold border border-rose-100 dark:border-rose-950">{error}</p>}

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">Holiday/Closure Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Republic Day or Maintenance Shutdown"
                  value={holidayForm.holiday_name}
                  onChange={(e) => setHolidayForm(prev => ({ ...prev, holiday_name: e.target.value }))}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.holiday_date}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, holiday_date: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
                </div>
                <div className="flex items-center h-full pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={holidayForm.is_recurring}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
                      className="rounded border-stone-300 dark:border-white/[0.08] text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5"
                    />
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Repeat Yearly</span>
                  </label>
                </div>

              {/* Scope and Emergency Options */}
              <div className="border-t border-stone-150 dark:border-white/[0.08] pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-6">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={holidayForm.all_clinics}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, all_clinics: e.target.checked }))}
                      className="rounded border-stone-300 dark:border-white/[0.08] text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-850 dark:text-white">Apply to All Clinics</span>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">Closure date will affect all clinics in the network.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={holidayForm.allow_emergency}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, allow_emergency: e.target.checked }))}
                      className="rounded border-stone-300 dark:border-white/[0.08] text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-850 dark:text-white">Allow Emergency Services</span>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">Keep emergency-type bookings and doctor availability open.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Target Clinics selection */}
              {!holidayForm.all_clinics && allClinics.length > 0 && (
                <div className="border-t border-stone-150 dark:border-white/[0.08] pt-4">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">Target Clinics (Select specific clinics to close)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto p-1">
                    {allClinics.map((clinic) => {
                      const isChecked = holidayForm.clinicIds.includes(clinic._id);
                      return (
                        <label
                          key={clinic._id}
                          className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-2xl transition-all duration-200 cursor-pointer select-none ${
                            isChecked
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800/80 dark:text-emerald-400 font-bold'
                              : 'bg-transparent border-stone-200 hover:bg-stone-50 text-stone-700 dark:border-white/[0.08] dark:hover:bg-navy-800 dark:text-stone-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setHolidayForm(prev => {
                                const exists = prev.clinicIds.includes(clinic._id);
                                let updated;
                                if (exists) {
                                  updated = prev.clinicIds.filter(id => id !== clinic._id);
                                } else {
                                  updated = [...prev.clinicIds, clinic._id];
                                }
                                return { ...prev, clinicIds: updated };
                              });
                            }}
                            className="rounded border-stone-300 dark:border-white/[0.08] text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5"
                          />
                          <span className="text-xs truncate">{clinic.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Portions config */}
              <div className="border-t border-stone-150 dark:border-white/[0.08] pt-4">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">Close Portions of the Clinic</label>

                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="closureType"
                      checked={holidayForm.closeAll}
                      onChange={() => setHolidayForm(prev => ({ ...prev, closeAll: true }))}
                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-850 dark:text-white">Close Entire Clinic</span>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400">Blocks all appointments, slots, lab orders and pharmacy bookings</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="closureType"
                      checked={!holidayForm.closeAll}
                      onChange={() => setHolidayForm(prev => ({ ...prev, closeAll: false }))}
                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-850 dark:text-white">Close Specific Sections</span>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400">Configure separate blockages for individual services</p>
                    </div>
                  </label>

                  {!holidayForm.closeAll && (
                    <div className="ml-6 grid grid-cols-2 gap-3 pt-1.5 animate-in slide-in-from-top-1 duration-150">
                      {[
                        { key: 'appointments', label: 'Appointments' },
                        { key: 'doctor_slots', label: 'Doctor Availability' },
                        { key: 'labs', label: 'Lab Bookings' },
                        { key: 'pharmacy', label: 'Pharmacy Operations' }
                      ].map((item) => {
                        const active = holidayForm.closed_portions.includes(item.key);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => toggleClosedPortion(item.key)}
                            className={`flex items-center justify-between px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
                              active
                                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400'
                                : 'bg-stone-50 border-stone-200 text-stone-600 dark:bg-navy-800 dark:border-white/[0.04] dark:text-stone-400'
                            }`}
                          >
                            <span>{item.label}</span>
                            {active && <Check size={14} className="text-rose-600 dark:text-rose-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-white/[0.08] text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-navy-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition cursor-pointer"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 rounded-3xl border border-stone-200 dark:border-white/[0.08] p-6 max-w-sm w-full shadow-2xl text-center">
            <AlertCircle className="mx-auto text-rose-500 mb-3" size={40} />
            <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1">Delete "{showDeleteConfirm.holiday_name}"?</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
              You can mark this holiday as temporarily deleted (soft-deleted) to preserve the history, or delete it permanently.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDeleteHoliday(false)}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-stone-800 dark:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Delete Temporarily (Soft-delete)
              </button>
              <button
                onClick={() => handleDeleteHoliday(true)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Delete Permanently
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="w-full py-2.5 border border-stone-200 dark:border-white/[0.08] text-stone-600 dark:text-stone-450 hover:bg-stone-50 dark:hover:bg-navy-800 rounded-xl text-xs font-semibold transition cursor-pointer mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicSettingsPage;
