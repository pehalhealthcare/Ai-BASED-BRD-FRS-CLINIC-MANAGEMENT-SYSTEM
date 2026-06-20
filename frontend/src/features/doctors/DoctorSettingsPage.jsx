import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { doctorApi, organizationApi } from '../../lib/api';
import { OpenStreetMapProvider } from 'leaflet-geosearch';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-850 disabled:bg-stone-100 disabled:text-stone-500';

// Dynamic Map Component using Leaflet via CDN
const DynamicMap = ({ id, lat, lng, onChange, disabled }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    let active = true;
    const loadLeaflet = () => {
      if (window.L) {
        if (active) setMapLoaded(true);
        return;
      }
      // CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // JS
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          if (active) setMapLoaded(true);
        };
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.L) {
            clearInterval(interval);
            if (active) setMapLoaded(true);
          }
        }, 100);
      }
    };
    loadLeaflet();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded) return;
    
    const container = document.getElementById(id);
    if (!container) return;

    let mapInstance;
    const defaultCoords = lat && lng ? [lat, lng] : [20.5937, 78.9629];
    const defaultZoom = lat && lng ? 15 : 5;

    try {
      mapInstance = window.L.map(id).setView(defaultCoords, defaultZoom);
      container._leaflet_map = mapInstance;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance);

      let marker;
      if (lat && lng) {
        marker = window.L.marker([lat, lng], { draggable: !disabled }).addTo(mapInstance);
        container._leaflet_marker = marker;
        if (!disabled) {
          marker.on('dragend', function () {
            const position = marker.getLatLng();
            onChange(position.lat, position.lng);
          });
        }
      }

      if (!disabled) {
        mapInstance.on('click', function (e) {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          let activeMarker = container._leaflet_marker;
          if (activeMarker) {
            activeMarker.setLatLng(e.latlng);
          } else {
            activeMarker = window.L.marker(e.latlng, { draggable: true }).addTo(mapInstance);
            container._leaflet_marker = activeMarker;
            activeMarker.on('dragend', function () {
              const position = activeMarker.getLatLng();
              onChange(position.lat, position.lng);
            });
          }
          onChange(clickLat, clickLng);
        });
      }

    } catch (e) {
      console.warn('Leaflet map initialization warning:', e);
    }

    return () => {
      if (mapInstance) {
        mapInstance.off();
        mapInstance.remove();
      }
    };
  }, [mapLoaded, id, disabled]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery || disabled) return;
    try {
      const provider = new OpenStreetMapProvider({
        params: {
          countrycodes: 'in',
          addressdetails: 1,
          limit: 10
        }
      });
      const results = await provider.search({ query: searchQuery });
      setSearchResults(results || []);
      if (!results || results.length === 0) {
        alert('No locations found for this query. Try adding road, locality, city or bank branch details.');
      }
    } catch (err) {
      console.error(err);
      alert('Error searching for location.');
    }
  };

  const selectResult = (item) => {
    const container = document.getElementById(id);
    if (!container || !container._leaflet_map || disabled) return;
    
    const parsedLat = parseFloat(item.y);
    const parsedLng = parseFloat(item.x);
    
    container._leaflet_map.setView([parsedLat, parsedLng], 16);
    
    let activeMarker = container._leaflet_marker;
    if (activeMarker) {
      activeMarker.setLatLng([parsedLat, parsedLng]);
    } else {
      activeMarker = window.L.marker([parsedLat, parsedLng], { draggable: true }).addTo(container._leaflet_map);
      container._leaflet_marker = activeMarker;
      activeMarker.on('dragend', function () {
        const position = activeMarker.getLatLng();
        onChange(position.lat, position.lng);
      });
    }
    onChange(parsedLat, parsedLng);
    setSearchResults([]);
  };

  return (
    <div className="space-y-2 mt-2">
      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search any road, locality, bank branch, landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 bg-white dark:bg-stone-850 dark:text-stone-100 outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-semibold shrink-0"
          >
            Search Map
          </button>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-2 max-h-48 overflow-y-auto space-y-1 shadow-lg z-20 relative">
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1 px-1">Matching Locations:</p>
          {searchResults.map((result, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectResult(result)}
              className="w-full text-left px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-750 text-xs text-stone-700 dark:text-stone-300 rounded transition-colors block border-b border-stone-100 dark:border-stone-800 last:border-0"
            >
              {result.label}
            </button>
          ))}
        </div>
      )}

      <div id={id} style={{ height: '200px' }} className="w-full rounded-2xl border border-stone-250 overflow-hidden z-10 relative">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-xs text-stone-500 font-semibold">
            Loading Map...
          </div>
        )}
      </div>
      {lat && lng ? (
        <p className="text-[10px] text-emerald-600 font-mono font-semibold">
          Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      ) : (
        <p className="text-[10px] text-rose-500 italic">
          * Location coordinates not pinned.
        </p>
      )}
    </div>
  );
};

const DoctorSettingsPage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [orgName, setOrgName] = useState('N/A');

  // Editable settings
  const [phone, setPhone] = useState('');
  const [currentAddress, setCurrentAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    latitude: null,
    longitude: null
  });
  const [permanentAddress, setPermanentAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    latitude: null,
    longitude: null
  });

  // Read-only checks (true if values already exist)
  const [isCurrentAddressAlreadyFilled, setIsCurrentAddressAlreadyFilled] = useState(false);
  const [isPermanentAddressAlreadyFilled, setIsPermanentAddressAlreadyFilled] = useState(false);

  const fetchProfileData = async () => {
    try {
      const res = await doctorApi.getMyProfile();
      const doc = res.data?.doctor || res.doctor;
      setProfile(doc);

      if (doc) {
        setPhone(doc.phone || '');
        
        const curFilled = !!(doc.currentAddress && doc.currentAddress.line1 && doc.currentAddress.latitude);
        setIsCurrentAddressAlreadyFilled(curFilled);

        const permFilled = !!(doc.permanentAddress && doc.permanentAddress.line1 && doc.permanentAddress.latitude);
        setIsPermanentAddressAlreadyFilled(permFilled);

        if (doc.currentAddress) {
          setCurrentAddress({
            line1: doc.currentAddress.line1 || '',
            line2: doc.currentAddress.line2 || '',
            city: doc.currentAddress.city || '',
            state: doc.currentAddress.state || '',
            pincode: doc.currentAddress.pincode || '',
            country: doc.currentAddress.country || 'India',
            latitude: doc.currentAddress.latitude || null,
            longitude: doc.currentAddress.longitude || null
          });
        }

        if (doc.permanentAddress) {
          setPermanentAddress({
            line1: doc.permanentAddress.line1 || '',
            line2: doc.permanentAddress.line2 || '',
            city: doc.permanentAddress.city || '',
            state: doc.permanentAddress.state || '',
            pincode: doc.permanentAddress.pincode || '',
            country: doc.permanentAddress.country || 'India',
            latitude: doc.permanentAddress.latitude || null,
            longitude: doc.permanentAddress.longitude || null
          });
        }

        if (doc.organizationId) {
          try {
            const orgsRes = await organizationApi.getPublic();
            const org = orgsRes.data?.organizations?.find(o => o._id === doc.organizationId);
            if (org) setOrgName(org.name);
          } catch (e) {
            console.error('Failed to load organization info:', e);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch doctor profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setError('');

    // Validations for addresses if they were previously unfilled and are being filled now
    if (!isCurrentAddressAlreadyFilled) {
      if (!currentAddress.line1 || !currentAddress.city || !currentAddress.state || !currentAddress.pincode) {
        setError('Please complete all current address details.');
        return;
      }
      if (!currentAddress.latitude || !currentAddress.longitude) {
        setError('Please pinpoint your current address coordinates on the map.');
        return;
      }
    }

    if (!isPermanentAddressAlreadyFilled) {
      if (!permanentAddress.line1 || !permanentAddress.city || !permanentAddress.state || !permanentAddress.pincode) {
        setError('Please complete all permanent address details.');
        return;
      }
      if (!permanentAddress.latitude || !permanentAddress.longitude) {
        setError('Please pinpoint your permanent address coordinates on the map.');
        return;
      }
    }

    try {
      const payload = {
        phone,
        currentAddress: isCurrentAddressAlreadyFilled ? undefined : currentAddress,
        permanentAddress: isPermanentAddressAlreadyFilled ? undefined : permanentAddress
      };
      
      await doctorApi.updateMyProfile(payload);
      setSuccessMsg('Settings saved successfully!');
      fetchProfileData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading profile settings..." />;
  }

  if (error && !profile) {
    return <ErrorState title="Profile Error" description={error} />;
  }

  return (
    <div className="max-w-4xl mx-auto my-6 p-6 md:p-8 bg-white dark:bg-navy-900 rounded-3xl border border-stone-200 dark:border-white/[0.06] shadow-xl">
      <PageHeader 
        eyebrow="Settings"
        title="Doctor Profile Settings"
        description="View your credentials and edit your contact phone or addresses if they haven't been configured yet."
      />

      {successMsg && <p className="my-5 p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-100">{successMsg}</p>}
      {error && <p className="my-5 p-3.5 rounded-2xl bg-rose-50 text-rose-700 text-sm font-semibold border border-rose-100">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Left Side: Display read-only filled credentials */}
        <div className="lg:col-span-1 space-y-6 bg-stone-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-stone-150 dark:border-white/[0.04]">
          <div className="text-center">
            {profile.image ? (
              <img 
                src={profile.image} 
                alt="Doctor Profile" 
                className="w-24 h-24 mx-auto rounded-full object-cover border border-stone-200 dark:border-white/10" 
              />
            ) : (
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 text-emerald-700 font-black text-xl flex items-center justify-center border border-emerald-200">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </div>
            )}
            <h3 className="font-extrabold text-stone-900 dark:text-white mt-3 text-lg">{profile.fullName}</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-semibold">{profile.specialization || 'General Practitioner'}</p>
          </div>

          <div className="border-t border-stone-200 dark:border-white/10 pt-4 space-y-3.5 text-xs text-stone-600 dark:text-stone-400">
            <div>
              <span className="text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-wider block text-[10px]">Medical Registration Number</span>
              <strong className="text-stone-800 dark:text-white mt-0.5 block">{profile.medicalRegistrationNumber || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-wider block text-[10px]">Qualification</span>
              <strong className="text-stone-800 dark:text-white mt-0.5 block">{profile.qualification || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-wider block text-[10px]">Hospital Organization</span>
              <strong className="text-stone-800 dark:text-white mt-0.5 block">{orgName}</strong>
            </div>
            <div>
              <span className="text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-wider block text-[10px]">Practice Clinic Branch</span>
              <strong className="text-stone-800 dark:text-white mt-0.5 block">{profile.clinicId?.name || 'Assigned Branch'} ({profile.clinicId?.code || 'N/A'})</strong>
            </div>
            <div>
              <span className="text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-wider block text-[10px]">Consultation Fee</span>
              <strong className="text-stone-800 dark:text-white mt-0.5 block">₹ {profile.consultationFee} (Follow-up: ₹ {profile.followUpFee})</strong>
            </div>
            <div>
              <span className="text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-wider block text-[10px]">Teleconsultation</span>
              <strong className="text-stone-800 dark:text-white mt-0.5 block">{profile.isOnlineAvailable ? '✅ Enabled' : '❌ Disabled'}</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Edit Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          {/* Phone editing (Always allowed) */}
          <div>
            <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">Contact Information</h3>
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Phone Number (Editable)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={FIELD_CLASS}
                required
              />
            </div>
          </div>

          {/* Current Address section */}
          <div className="pt-4 border-t border-stone-150 dark:border-white/10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Current Address</h3>
              {isCurrentAddressAlreadyFilled ? (
                <span className="bg-emerald-150 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Locked (Already Filled)</span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">✏️ Editable (Unfilled)</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={currentAddress.line1}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, line1: e.target.value })}
                  disabled={isCurrentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isCurrentAddressAlreadyFilled}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={currentAddress.line2}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, line2: e.target.value })}
                  disabled={isCurrentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">City</label>
                <input
                  type="text"
                  value={currentAddress.city}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, city: e.target.value })}
                  disabled={isCurrentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isCurrentAddressAlreadyFilled}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">State</label>
                <input
                  type="text"
                  value={currentAddress.state}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, state: e.target.value })}
                  disabled={isCurrentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isCurrentAddressAlreadyFilled}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Pincode</label>
                <input
                  type="text"
                  value={currentAddress.pincode}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, pincode: e.target.value })}
                  disabled={isCurrentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isCurrentAddressAlreadyFilled}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Country</label>
                <input
                  type="text"
                  value={currentAddress.country}
                  onChange={(e) => setCurrentAddress({ ...currentAddress, country: e.target.value })}
                  disabled={isCurrentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isCurrentAddressAlreadyFilled}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Current Coordinates Map</label>
                <DynamicMap
                  id="settings-current-map"
                  lat={currentAddress.latitude}
                  lng={currentAddress.longitude}
                  disabled={isCurrentAddressAlreadyFilled}
                  onChange={(lat, lng) => setCurrentAddress(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                />
              </div>
            </div>
          </div>

          {/* Permanent Address section */}
          <div className="pt-4 border-t border-stone-150 dark:border-white/10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Permanent Address</h3>
              {isPermanentAddressAlreadyFilled ? (
                <span className="bg-emerald-150 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Locked (Already Filled)</span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">✏️ Editable (Unfilled)</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={permanentAddress.line1}
                  onChange={(e) => setPermanentAddress({ ...permanentAddress, line1: e.target.value })}
                  disabled={isPermanentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isPermanentAddressAlreadyFilled}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={permanentAddress.line2}
                  onChange={(e) => setPermanentAddress({ ...permanentAddress, line2: e.target.value })}
                  disabled={isPermanentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">City</label>
                <input
                  type="text"
                  value={permanentAddress.city}
                  onChange={(e) => setPermanentAddress({ ...permanentAddress, city: e.target.value })}
                  disabled={isPermanentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isPermanentAddressAlreadyFilled}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">State</label>
                <input
                  type="text"
                  value={permanentAddress.state}
                  onChange={(e) => setPermanentAddress({ ...permanentAddress, state: e.target.value })}
                  disabled={isPermanentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isPermanentAddressAlreadyFilled}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Pincode</label>
                <input
                  type="text"
                  value={permanentAddress.pincode}
                  onChange={(e) => setPermanentAddress({ ...permanentAddress, pincode: e.target.value })}
                  disabled={isPermanentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isPermanentAddressAlreadyFilled}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Country</label>
                <input
                  type="text"
                  value={permanentAddress.country}
                  onChange={(e) => setPermanentAddress({ ...permanentAddress, country: e.target.value })}
                  disabled={isPermanentAddressAlreadyFilled}
                  className={FIELD_CLASS}
                  required={!isPermanentAddressAlreadyFilled}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Permanent Coordinates Map</label>
                <DynamicMap
                  id="settings-permanent-map"
                  lat={permanentAddress.latitude}
                  lng={permanentAddress.longitude}
                  disabled={isPermanentAddressAlreadyFilled}
                  onChange={(lat, lng) => setPermanentAddress(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="rounded-2xl bg-emerald-600 px-8 py-3.5 text-xs font-extrabold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/15 transition cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorSettingsPage;
