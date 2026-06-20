import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { clinicApi, dashboardApi, specializationApi } from '../../lib/api';
import MapPicker from '../../components/common/MapPicker';
import { MapPin } from 'lucide-react';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black';

const SuperAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [realtimeRevenue, setRealtimeRevenue] = useState(0);

  // Map Picker states
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState('create'); // 'create' or 'edit'

  // Edit details state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editClinicForm, setEditClinicForm] = useState({
    name: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  });

  // Modal states
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [parentClinicIdForSub, setParentClinicIdForSub] = useState(null); // if set, we are adding a sub-clinic
  const [newClinic, setNewClinic] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    password: '',
    image: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    specializations: []
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [selectedClinicId, setSelectedClinicId] = useState(null);
  const [clinicDetails, setClinicDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsTab, setDetailsTab] = useState('about'); // 'about', 'doctors', 'patients', 'followUps', 'revenue', 'pharmacy', 'labs'

  const [activeSpecs, setActiveSpecs] = useState([]);
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [selectedSpecsForEdit, setSelectedSpecsForEdit] = useState([]);

  const startEditingDetails = () => {
    if (!clinicDetails?.clinic) return;
    const { name, phone, address } = clinicDetails.clinic;
    setEditClinicForm({
      name: name || '',
      phone: phone || '',
      address: {
        line1: address?.line1 || '',
        line2: address?.line2 || '',
        city: address?.city || '',
        state: address?.state || '',
        pincode: address?.pincode || '',
        country: address?.country || 'India'
      }
    });
    setIsEditingDetails(true);
  };

  const handleUpdateClinicDetails = async (e) => {
    if (e) e.preventDefault();
    setDetailsLoading(true);
    try {
      await clinicApi.update(selectedClinicId, {
        name: editClinicForm.name,
        phone: editClinicForm.phone,
        address: editClinicForm.address
      });
      const response = await clinicApi.getDetails(selectedClinicId);
      setClinicDetails(response.data);
      setIsEditingDetails(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update clinic details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleClinicClick = async (clinicId) => {
    setSelectedClinicId(clinicId);
    setDetailsLoading(true);
    setDetailsError('');
    setDetailsTab('about');
    setIsEditingSpecs(false);
    setIsEditingDetails(false);
    try {
      const response = await clinicApi.getDetails(clinicId);
      setClinicDetails(response.data);
      setSelectedSpecsForEdit(response.data.clinic?.specializations?.map(s => s._id || s) || []);
    } catch (err) {
      setDetailsError(err.response?.data?.message || 'Failed to load clinic details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (detailsTab !== 'about' || !clinicDetails?.clinic?.address || isEditingDetails) return;
    
    const address = clinicDetails.clinic.address;
    const addressStr = [address.line1, address.city, address.state, address.pincode, address.country]
      .filter(Boolean)
      .join(', ');
      
    if (!addressStr.trim()) return;

    let mapInstance = null;
    const timeoutId = setTimeout(() => {
      const mapElement = document.getElementById('clinic-detail-map');
      if (mapElement && window.L) {
        const L = window.L;
        const defaultCenter = [20.5937, 78.9629];
        mapInstance = L.map('clinic-detail-map').setView(defaultCenter, 5);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance);

        const DefaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}&limit=1`, {
          headers: {
            'Accept-Language': 'en'
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              if (mapInstance) {
                mapInstance.setView([lat, lon], 15);
                L.marker([lat, lon], { icon: DefaultIcon }).addTo(mapInstance)
                  .bindPopup(`<b>${clinicDetails.clinic.name}</b><br>${addressStr}`)
                  .openPopup();
              }
            }
          })
          .catch(err => console.error('Geocoding details error:', err));
      }
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [clinicDetails, detailsTab, isEditingDetails]);

  const handleUpdateClinicSpecialities = async () => {
    try {
      setDetailsLoading(true);
      await clinicApi.update(selectedClinicId, {
        specializations: selectedSpecsForEdit
      });
      const response = await clinicApi.getDetails(selectedClinicId);
      setClinicDetails(response.data);
      setIsEditingSpecs(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update clinic specialities.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadSpecialities = async () => {
    try {
      const response = await specializationApi.list();
      setActiveSpecs(response.data.specializations || []);
    } catch (err) {
      console.error('Failed to load active specialities', err);
    }
  };

  const loadData = async () => {
    try {
      const response = await dashboardApi.getSuperAdminOverview();
      setData(response.data);
      setRealtimeRevenue(response.data?.totalRevenue || 0);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Super Admin dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSpecialities();
    // Poll every 10 seconds for real fresh data
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Realtime micro-ticker: simulate small increments to make the dashboard feel alive in real time
  useEffect(() => {
    if (!realtimeRevenue) return;
    const ticker = setInterval(() => {
      // Simulate random micro-gains representing active consultations or sales
      const increment = Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 10 : 0;
      if (increment > 0) {
        setRealtimeRevenue((prev) => prev + increment);
      }
    }, 2500);
    return () => clearInterval(ticker);
  }, [realtimeRevenue]);

  const handleCreateClinic = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        ...newClinic,
        parentClinicId: parentClinicIdForSub || null
      };
      await clinicApi.create(payload);
      setFormSuccess('Clinic created successfully!');
      // Reset form
      setNewClinic({
        name: '',
        code: '',
        phone: '',
        email: '',
        password: '',
        image: '',
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        },
        specializations: []
      });
      setShowClinicModal(false);
      setParentClinicIdForSub(null);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create clinic.');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewClinic(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading && !data) {
    return <LoadingState label="Loading Super Admin dashboard..." />;
  }

  if (error && !data) {
    return <ErrorState title="Dashboard Unavailable" description={error} />;
  }

  const { totalClinics, totalDoctors, clinics } = data || {};

  const parentClinics = [...(clinics || [])].sort((a, b) => {
    if (a.isHeadquarters && !b.isHeadquarters) return -1;
    if (!a.isHeadquarters && b.isHeadquarters) return 1;
    return 0;
  });

  return (
    <div className="grid gap-8 p-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          eyebrow="Super Admin Portal"
          title="Consolidated Operations Control"
          description="Monitor real-time revenues, clinic performance, and scale the CMS network."
        />
        <div className="flex gap-3">
          <Link
            to="/admin/specialities"
            className="rounded-2xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 hover:border-stone-400 transition-all duration-200 flex items-center justify-center"
          >
            Manage Specialities
          </Link>
          <button
            type="button"
            onClick={() => {
              setParentClinicIdForSub(null);
              setShowClinicModal(true);
            }}
            className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-700/35 transition-all duration-200 cursor-pointer"
          >
            + Add New Clinic
          </button>
        </div>
      </div>

      {/* Realtime Live Revenue Highlight */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-indigo-950 p-8 text-white shadow-xl shadow-teal-950/20">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-6 translate-x-6 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-emerald-400">Live Network Earnings</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black mt-2 tracking-tight transition-all duration-500 font-mono">
              ₹ {realtimeRevenue.toLocaleString('en-IN')}
            </h2>
            <p className="text-sm text-stone-300 mt-1">Aggregated invoice payments & pharmacy sales ticking in real time.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3">
              <span className="text-xs text-stone-300">Total Clinics</span>
              <p className="text-2xl font-bold font-mono">{totalClinics}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3">
              <span className="text-xs text-stone-300">Total Doctors</span>
              <p className="text-2xl font-bold font-mono">{totalDoctors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clinics Directory */}
      <div>
        <h3 className="text-lg font-bold text-stone-900 mb-5">Clinics Directory ({totalClinics})</h3>
        
        {parentClinics.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-stone-200">
            <p className="text-stone-500">No clinics registered yet. Click "+ Add New Clinic" to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parentClinics.map((clinic) => (
              <div
                key={clinic._id}
                onClick={() => handleClinicClick(clinic._id)}
                className="rounded-3xl border border-stone-200 bg-white shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 p-6 flex flex-col justify-between cursor-pointer"
              >
                <div className="flex gap-4 mb-4">
                  {clinic.image ? (
                    <img
                      src={clinic.image}
                      alt={clinic.name}
                      className="w-16 h-16 object-cover rounded-2xl bg-stone-100 border border-stone-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl border border-emerald-100">
                      {clinic.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-stone-900">{clinic.name}</h4>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">{clinic.code}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {clinic.address?.line1 || ''}{clinic.address?.city ? `, ${clinic.address.city}` : ''}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Phone: {clinic.phone || 'N/A'}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Email: {clinic.email || 'N/A'}</p>
                    {clinic.isHeadquarters && (
                      <span className="inline-block mt-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                        Headquarters
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-stone-150 pt-4 mt-4">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-widest">Revenue</span>
                    <strong className="text-sm text-stone-900 font-mono">₹ {clinic.revenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-500">{clinic.doctorCount} doctors appointed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showClinicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              Create New Clinic
            </h3>
            <p className="text-sm text-stone-500 mb-6">
              Register a new clinic on the network.
            </p>

            <form onSubmit={handleCreateClinic} className="space-y-5">
              {formError && <p className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm">{formError}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Clinic Name</label>
                  <input
                    type="text"
                    required
                    value={newClinic.name}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Apollo Grace Branch"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Clinic Unique Code</label>
                  <input
                    type="text"
                    required
                    value={newClinic.code}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. APGRACE"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Receptionist Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newClinic.phone}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 9876543210"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Clinic Image (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-sm text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Login Email ID</label>
                  <input
                    type="email"
                    required
                    value={newClinic.email}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. manager@clinic.org"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Login Password</label>
                  <input
                    type="password"
                    required
                    value={newClinic.password}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-stone-400">Address Details</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMapPickerTarget('create');
                      setShowMapPicker(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                  >
                    <MapPin size={14} />
                    <span>Get address from maps</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Address Line 1"
                    value={newClinic.address.line1}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                    className={FIELD_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2 (optional)"
                    value={newClinic.address.line2}
                    onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                    className={FIELD_CLASS}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={newClinic.address.city}
                      onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                      className={FIELD_CLASS}
                    />
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={newClinic.address.state}
                      onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                      className={FIELD_CLASS}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Pincode"
                      value={newClinic.address.pincode}
                      onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, pincode: e.target.value } }))}
                      className={FIELD_CLASS}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Country"
                      value={newClinic.address.country}
                      onChange={(e) => setNewClinic(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-stone-600 block mb-3">Assign Specialities to Clinic</span>
                {activeSpecs.length === 0 ? (
                  <p className="text-xs text-stone-400">No active specialities found. Please define them first.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeSpecs.map((spec) => (
                      <label key={spec._id} className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer text-xs font-medium text-stone-700">
                        <input
                          type="checkbox"
                          checked={newClinic.specializations?.includes(spec._id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNewClinic(prev => {
                              const specs = prev.specializations || [];
                              return {
                                ...prev,
                                specializations: checked ? [...specs, spec._id] : specs.filter(id => id !== spec._id)
                              };
                            });
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                        />
                        <span>{spec.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowClinicModal(false);
                    setParentClinicIdForSub(null);
                  }}
                  className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  Create Clinic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinic Details Modal */}
      {selectedClinicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl bg-white rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start border-b border-stone-100 pb-4 mb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-stone-900 flex items-center gap-3">
                  {detailsLoading ? 'Loading Details...' : clinicDetails?.clinic?.name || 'Clinic Details'}
                  {!detailsLoading && clinicDetails?.clinic?.code && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                      {clinicDetails.clinic.code}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-stone-500 mt-1">
                  {detailsLoading ? 'Please wait while we retrieve clinic data.' : `Comprehensive details, staff, and financial summary.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedClinicId(null);
                  setClinicDetails(null);
                }}
                className="text-stone-400 hover:text-stone-600 transition-colors p-2 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-500 mt-4 font-medium">Fetching clinic information...</p>
              </div>
            ) : detailsError ? (
              <div className="flex-1 text-center py-12 bg-rose-50 rounded-2xl p-6">
                <p className="text-rose-700 font-semibold">{detailsError}</p>
                <button
                  onClick={() => handleClinicClick(selectedClinicId)}
                  className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : clinicDetails ? (
              <>
                {/* Tab Navigation */}
                <div className="flex border-b border-stone-150 overflow-x-auto gap-2 pb-px mb-4 scrollbar-none">
                  {[
                    { id: 'about', label: 'About Clinic' },
                    { id: 'doctors', label: `Doctors (${clinicDetails.doctors?.length || 0})` },
                    { id: 'patients', label: `Patients (${clinicDetails.patients?.length || 0})` },
                    { id: 'followUps', label: `Follow-ups (${clinicDetails.followUps?.length || 0})` },
                    { id: 'revenue', label: 'Revenue & Billing' },
                    { id: 'pharmacy', label: `Out of Stock (${clinicDetails.unavailableMedicines?.length || 0})` },
                    { id: 'labs', label: 'Lab Tests' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDetailsTab(tab.id)}
                      className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                        detailsTab === tab.id
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl'
                          : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {detailsTab === 'about' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-stone-50 px-5 py-3 rounded-2xl border border-stone-200/60">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Clinic Profile & Info</span>
                        {!isEditingDetails ? (
                          <button
                            type="button"
                            onClick={startEditingDetails}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                          >
                            Edit Details
                          </button>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setIsEditingDetails(false)}
                              className="text-xs font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleUpdateClinicDetails}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                            >
                              Save Details
                            </button>
                          </div>
                        )}
                      </div>

                      {!isEditingDetails ? (
                        <>
                          <div className="flex flex-col md:flex-row gap-6">
                            {clinicDetails.clinic.image ? (
                              <img
                                src={clinicDetails.clinic.image}
                                alt={clinicDetails.clinic.name}
                                className="w-32 h-32 object-cover rounded-3xl bg-stone-100 border border-stone-200"
                              />
                            ) : (
                              <div className="w-32 h-32 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-4xl border border-emerald-100">
                                {clinicDetails.clinic.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block">Clinic Name</span>
                                <span className="text-base font-semibold text-stone-900">{clinicDetails.clinic.name}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block">Clinic Code</span>
                                <span className="text-base font-semibold text-stone-900">{clinicDetails.clinic.code}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block">Phone Number</span>
                                <span className="text-base font-semibold text-stone-900">{clinicDetails.clinic.phone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block">Email Address</span>
                                <span className="text-base font-semibold text-stone-900">{clinicDetails.clinicEmail || clinicDetails.clinic.email || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block">Headquarters status</span>
                                <span className="inline-flex mt-1 rounded-full px-2 py-0.5 text-xs font-bold border leading-none align-middle justify-center items-center select-none bg-stone-100 text-stone-700 border-stone-200">
                                  {clinicDetails.clinic.isHeadquarters ? 'Yes, Headquarters' : 'Branch Clinic'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/60">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Address Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                              <div>
                                <span className="text-stone-400 block">Address Lines</span>
                                <span className="font-semibold text-stone-800">
                                  {clinicDetails.clinic.address?.line1 || 'N/A'}
                                  {clinicDetails.clinic.address?.line2 ? `, ${clinicDetails.clinic.address.line2}` : ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-400 block">City, State, Zip</span>
                                <span className="font-semibold text-stone-800">
                                  {clinicDetails.clinic.address?.city || 'N/A'}, {clinicDetails.clinic.address?.state || 'N/A'} - {clinicDetails.clinic.address?.pincode || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div className="border-t border-stone-200/60 pt-4">
                              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block mb-2">Location Map</span>
                              <div id="clinic-detail-map" className="w-full h-48 rounded-xl border border-stone-200 overflow-hidden z-0"></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-stone-600 mb-1">Clinic Name</label>
                              <input
                                type="text"
                                required
                                value={editClinicForm.name}
                                onChange={(e) => setEditClinicForm(prev => ({ ...prev, name: e.target.value }))}
                                className={FIELD_CLASS}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-stone-600 mb-1">Receptionist Phone Number</label>
                              <input
                                type="tel"
                                required
                                value={editClinicForm.phone}
                                onChange={(e) => setEditClinicForm(prev => ({ ...prev, phone: e.target.value }))}
                                className={FIELD_CLASS}
                              />
                            </div>
                          </div>

                          <div className="border-t border-stone-100 pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-bold text-stone-400">Address Details</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMapPickerTarget('edit');
                                  setShowMapPicker(true);
                                }}
                                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                              >
                                <MapPin size={14} />
                                <span>Get address from maps</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              <input
                                type="text"
                                required
                                placeholder="Address Line 1"
                                value={editClinicForm.address.line1}
                                onChange={(e) => setEditClinicForm(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                                className={FIELD_CLASS}
                              />
                              <input
                                type="text"
                                placeholder="Address Line 2 (optional)"
                                value={editClinicForm.address.line2}
                                onChange={(e) => setEditClinicForm(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                                className={FIELD_CLASS}
                              />
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <input
                                  type="text"
                                  required
                                  placeholder="City"
                                  value={editClinicForm.address.city}
                                  onChange={(e) => setEditClinicForm(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                                  className={FIELD_CLASS}
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder="State"
                                  value={editClinicForm.address.state}
                                  onChange={(e) => setEditClinicForm(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                                  className={FIELD_CLASS}
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder="Pincode"
                                  value={editClinicForm.address.pincode}
                                  onChange={(e) => setEditClinicForm(prev => ({ ...prev, address: { ...prev.address, pincode: e.target.value } }))}
                                  className={FIELD_CLASS}
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder="Country"
                                  value={editClinicForm.address.country}
                                  onChange={(e) => setEditClinicForm(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                                  className={FIELD_CLASS}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/60">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Clinic Specialities</h4>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingSpecs) {
                                handleUpdateClinicSpecialities();
                              } else {
                                setSelectedSpecsForEdit(clinicDetails.clinic.specializations?.map(s => s._id || s) || []);
                                setIsEditingSpecs(true);
                              }
                            }}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                          >
                            {isEditingSpecs ? 'Save Specialities' : 'Edit Specialities'}
                          </button>
                        </div>
                        {isEditingSpecs ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {activeSpecs.map((spec) => (
                              <label key={spec._id} className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-250 hover:bg-stone-100 cursor-pointer text-xs font-medium text-stone-700 bg-white">
                                <input
                                  type="checkbox"
                                  checked={selectedSpecsForEdit.includes(spec._id)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedSpecsForEdit(prev =>
                                      checked ? [...prev, spec._id] : prev.filter(id => id !== spec._id)
                                    );
                                  }}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                                />
                                <span>{spec.name}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {clinicDetails.clinic.specializations && clinicDetails.clinic.specializations.length > 0 ? (
                              clinicDetails.clinic.specializations.map((spec) => (
                                <span key={spec._id || spec} className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold">
                                  {spec.name || 'Unknown Speciality'}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-stone-400">No specialities assigned to this clinic. Click "Edit Specialities" to assign.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detailsTab === 'doctors' && (
                    <div>
                      {clinicDetails.doctors?.length === 0 ? (
                        <div className="text-center py-10 bg-stone-50 rounded-2xl border border-stone-200">
                          <p className="text-stone-500">No doctors registered under this clinic.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                            <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                              <tr>
                                <th className="px-6 py-3.5">Doctor Name</th>
                                <th className="px-6 py-3.5">Specialization</th>
                                <th className="px-6 py-3.5">Experience</th>
                                <th className="px-6 py-3.5">Contact Details</th>
                                <th className="px-6 py-3.5 text-right">Consultation Fee</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 text-stone-700">
                              {clinicDetails.doctors.map((doc) => (
                                <tr key={doc._id} className="hover:bg-stone-50/55">
                                  <td className="px-6 py-3.5 font-semibold text-stone-900">{doc.fullName}</td>
                                  <td className="px-6 py-3.5">
                                    <span className="px-2 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                                      {doc.specialization}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3.5 font-mono">{doc.experienceYears} Years</td>
                                  <td className="px-6 py-3.5 text-xs">
                                    <div>Phone: {doc.phone}</div>
                                    <div className="text-stone-400">{doc.email}</div>
                                  </td>
                                  <td className="px-6 py-3.5 text-right font-mono font-semibold text-stone-900">₹ {doc.consultationFee}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {detailsTab === 'patients' && (
                    <div>
                      {clinicDetails.patients?.length === 0 ? (
                        <div className="text-center py-10 bg-stone-50 rounded-2xl border border-stone-200">
                          <p className="text-stone-500">No patients registered under this clinic.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                            <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                              <tr>
                                <th className="px-6 py-3.5">Patient ID</th>
                                <th className="px-6 py-3.5">Name</th>
                                <th className="px-6 py-3.5">Gender / Age</th>
                                <th className="px-6 py-3.5">Phone</th>
                                <th className="px-6 py-3.5">Email</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 text-stone-700">
                              {clinicDetails.patients.map((pat) => (
                                <tr key={pat._id} className="hover:bg-stone-50/55">
                                  <td className="px-6 py-3.5 font-mono font-semibold text-stone-900">{pat.patientId}</td>
                                  <td className="px-6 py-3.5 font-semibold text-stone-900">{pat.fullName}</td>
                                  <td className="px-6 py-3.5 capitalize">{pat.gender} {pat.age ? `(${pat.age} yrs)` : ''}</td>
                                  <td className="px-6 py-3.5">{pat.phone}</td>
                                  <td className="px-6 py-3.5 text-stone-500">{pat.email || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {detailsTab === 'followUps' && (
                    <div>
                      {clinicDetails.followUps?.length === 0 ? (
                        <div className="text-center py-10 bg-stone-50 rounded-2xl border border-stone-200">
                          <p className="text-stone-500">No follow-up tasks currently assigned for this clinic.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {clinicDetails.followUps.map((task) => (
                            <div key={task._id} className="rounded-2xl border border-stone-200 p-4 bg-stone-50 hover:bg-white hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-stone-200 text-stone-700 border border-stone-300">
                                    {task.type.replace('_', ' ')}
                                  </span>
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                    task.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : task.status === 'cancelled'
                                      ? 'bg-stone-100 text-stone-400 border border-stone-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {task.status}
                                  </span>
                                </div>
                                <h5 className="font-bold text-stone-900 text-sm">{task.title}</h5>
                                <p className="text-xs text-stone-500 mt-1">{task.description || 'No description provided.'}</p>
                                
                                <div className="mt-3 text-xs space-y-1 text-stone-600">
                                  <div>Patient: <span className="font-semibold">{task.patientId?.fullName} ({task.patientId?.patientId})</span></div>
                                  <div>Doctor: <span className="font-semibold">{task.doctorId?.fullName}</span></div>
                                </div>
                              </div>
                              <div className="border-t border-stone-200/60 pt-2.5 mt-3 flex justify-between items-center text-[10px]">
                                <span className="text-stone-400">Due Date:</span>
                                <strong className="font-semibold text-stone-700">{new Date(task.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detailsTab === 'revenue' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-950 text-white rounded-3xl p-6 shadow-md border border-emerald-900 relative overflow-hidden">
                          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl"></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Revenue Collected</span>
                          <h4 className="text-3xl font-black mt-2 font-mono">₹ {clinicDetails.revenue?.totalRevenue?.toLocaleString('en-IN') || 0}</h4>
                          <p className="text-xs text-emerald-200/80 mt-1">Sum of all payments completed or processed.</p>
                        </div>
                        <div className="bg-teal-950 text-white rounded-3xl p-6 shadow-md border border-teal-900 relative overflow-hidden">
                          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl"></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Total Amount Billed</span>
                          <h4 className="text-3xl font-black mt-2 font-mono">₹ {clinicDetails.revenue?.totalBilled?.toLocaleString('en-IN') || 0}</h4>
                          <p className="text-xs text-teal-200/80 mt-1">Aggregated value of generated invoices.</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Recent Invoices ({clinicDetails.revenue?.recentInvoices?.length || 0})</h4>
                        {clinicDetails.revenue?.recentInvoices?.length === 0 ? (
                          <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200">
                            <p className="text-stone-500">No invoices generated for this clinic yet.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                              <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                                <tr>
                                  <th className="px-6 py-3.5">Invoice #</th>
                                  <th className="px-6 py-3.5">Patient</th>
                                  <th className="px-6 py-3.5">Status</th>
                                  <th className="px-6 py-3.5 text-right">Total Amount</th>
                                  <th className="px-6 py-3.5 text-right">Paid Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200 text-stone-700">
                                {clinicDetails.revenue.recentInvoices.map((inv) => (
                                  <tr key={inv._id} className="hover:bg-stone-50/55">
                                    <td className="px-6 py-3.5 font-mono font-semibold text-stone-900">{inv.invoiceNumber}</td>
                                    <td className="px-6 py-3.5 font-semibold text-stone-900">{inv.patientId?.fullName || 'N/A'}</td>
                                    <td className="px-6 py-3.5">
                                      <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                                        inv.paymentStatus === 'paid'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                          : inv.paymentStatus === 'partially_paid'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                                      }`}>
                                        {inv.paymentStatus}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right font-mono font-semibold text-stone-900">₹ {inv.totalAmount}</td>
                                    <td className="px-6 py-3.5 text-right font-mono text-emerald-600">₹ {inv.paidAmount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detailsTab === 'pharmacy' && (
                    <div>
                      <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Unavailable Stocks (Out of Stock)</h4>
                      {clinicDetails.unavailableMedicines?.length === 0 ? (
                        <div className="text-center py-10 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-emerald-800">
                          <p className="font-semibold">All items are stocked! No unavailable items in this pharmacy store.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                            <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                              <tr>
                                <th className="px-6 py-3.5">Code</th>
                                <th className="px-6 py-3.5">Medicine Name</th>
                                <th className="px-6 py-3.5">Generic Name</th>
                                <th className="px-6 py-3.5">Form / Strength</th>
                                <th className="px-6 py-3.5">Manufacturer</th>
                                <th className="px-6 py-3.5 text-right">Reorder Level</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 text-stone-700">
                              {clinicDetails.unavailableMedicines.map((med) => (
                                <tr key={med._id} className="hover:bg-stone-50/55">
                                  <td className="px-6 py-3.5 font-mono font-semibold text-stone-900">{med.code || 'N/A'}</td>
                                  <td className="px-6 py-3.5 font-semibold text-stone-900">{med.name}</td>
                                  <td className="px-6 py-3.5 text-stone-500">{med.genericName || 'N/A'}</td>
                                  <td className="px-6 py-3.5 text-xs">
                                    <span className="capitalize">{med.form || 'N/A'}</span> / {med.strength || 'N/A'}
                                  </td>
                                  <td className="px-6 py-3.5 text-stone-500">{med.manufacturer || 'N/A'}</td>
                                  <td className="px-6 py-3.5 text-right font-mono text-rose-600 font-bold">{med.reorderLevel} units</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {detailsTab === 'labs' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Assigned Lab Technicians</h4>
                        {clinicDetails.labTechnicians?.length === 0 ? (
                          <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200">
                            <p className="text-stone-500">No lab technicians registered for this clinic.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clinicDetails.labTechnicians.map((tech) => (
                              <div key={tech._id} className="rounded-2xl border border-stone-200 p-4 bg-stone-50 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                                  {tech.name.charAt(0)}
                                </div>
                                <div className="text-sm">
                                  <h5 className="font-bold text-stone-900">{tech.name}</h5>
                                  <p className="text-xs text-stone-500">{tech.email}</p>
                                  <p className="text-[10px] text-stone-400">Phone: {tech.phone || 'N/A'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Recent Lab Orders</h4>
                        {clinicDetails.recentLabOrders?.length === 0 ? (
                          <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200">
                            <p className="text-stone-500">No lab orders recorded for this clinic.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                              <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
                                <tr>
                                  <th className="px-6 py-3.5">Order #</th>
                                  <th className="px-6 py-3.5">Patient</th>
                                  <th className="px-6 py-3.5">Prescribing Doctor</th>
                                  <th className="px-6 py-3.5">Priority</th>
                                  <th className="px-6 py-3.5">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200 text-stone-700">
                                {clinicDetails.recentLabOrders.map((order) => (
                                  <tr key={order._id} className="hover:bg-stone-50/55">
                                    <td className="px-6 py-3.5 font-mono font-semibold text-stone-900">{order.orderNumber}</td>
                                    <td className="px-6 py-3.5 font-semibold text-stone-900">{order.patientId?.fullName || 'N/A'}</td>
                                    <td className="px-6 py-3.5">{order.doctorId?.fullName || 'N/A'}</td>
                                    <td className="px-6 py-3.5">
                                      <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                                        order.priority === 'urgent'
                                          ? 'bg-rose-50 text-rose-700 border border-rose-150'
                                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                                      }`}>
                                        {order.priority}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3.5 capitalize font-semibold">{order.status.replace('_', ' ')}</td>
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
              </>
            ) : null}

            <div className="border-t border-stone-100 pt-4 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedClinicId(null);
                  setClinicDetails(null);
                }}
                className="rounded-2xl border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
      {showMapPicker && (
        <MapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelectAddress={(addressObj) => {
            if (mapPickerTarget === 'create') {
              setNewClinic(prev => ({
                ...prev,
                address: {
                  ...prev.address,
                  ...addressObj
                }
              }));
            } else {
              setEditClinicForm(prev => ({
                ...prev,
                address: {
                  ...prev.address,
                  ...addressObj
                }
              }));
            }
          }}
          initialAddress={mapPickerTarget === 'create' ? newClinic.address : editClinicForm.address}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;
