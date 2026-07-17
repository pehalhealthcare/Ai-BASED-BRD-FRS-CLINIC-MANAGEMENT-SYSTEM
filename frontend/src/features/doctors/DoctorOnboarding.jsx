import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { doctorApi, specializationApi, organizationApi, clinicApi } from '../../lib/api';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import MapPicker from '../../components/common/MapPicker';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 bg-white dark:bg-stone-700 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-stone-900 dark:text-white dark:border-stone-600 dark:placeholder-stone-400';

const StepsProgress = ({ currentStatus }) => {
  const steps = [
    { title: 'Sign up as Doctor', desc: 'Account created', completed: true },
    { 
      title: 'Fill Profile Form', 
      desc: currentStatus === 'pending_profile' || currentStatus === 're_edit' ? 'In Progress' : 'Completed', 
      completed: currentStatus !== 'pending_profile' && currentStatus !== 're_edit',
      active: currentStatus === 'pending_profile' || currentStatus === 're_edit'
    },
    { 
      title: 'Approved by Admin', 
      desc: (currentStatus === 'pending_profile' || currentStatus === 're_edit')
        ? 'Pending Submission' 
        : currentStatus === 'pending_approval' 
        ? 'Waiting for Approval' 
        : 'Approved', 
      completed: currentStatus === 'approved',
      waiting: currentStatus === 'pending_approval'
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {steps.map((step, idx) => (
        <div 
          key={idx} 
          className={`relative p-4 rounded-2xl border text-center transition-all duration-300 ${
            step.completed 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm shadow-emerald-100/30' 
              : step.waiting 
              ? 'bg-amber-50 border-amber-200 text-amber-900 animate-pulse' 
              : step.active 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
              : 'bg-stone-50 border-stone-200 text-stone-400'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1">Step {idx + 1}</div>
          <div className="font-black text-xs md:text-sm">{step.title}</div>
          <div className="text-[10px] mt-1 opacity-90">{step.desc}</div>
        </div>
      ))}
    </div>
  );
};

// Dynamic Map Component using Leaflet via CDN
const DynamicMap = ({ id, lat, lng, onChange }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const mapInstanceRef = window.useRef ? window.useRef(null) : { current: null };
  const markerRef = window.useRef ? window.useRef(null) : { current: null };

  // Re-declare refs if window.useRef isn't accessible directly in global scope
  const localMapRef = useEffect ? null : {}; 

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
        marker = window.L.marker([lat, lng], { draggable: true }).addTo(mapInstance);
        container._leaflet_marker = marker;
        marker.on('dragend', function () {
          const position = marker.getLatLng();
          onChange(position.lat, position.lng);
        });
      }

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

    } catch (e) {
      console.warn('Leaflet map initialization warning:', e);
    }

    return () => {
      if (mapInstance) {
        mapInstance.off();
        mapInstance.remove();
      }
    };
  }, [mapLoaded, id]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
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
    if (!container || !container._leaflet_map) return;
    
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
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search any road, locality, bank branch, landmark..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 bg-white dark:bg-stone-850 dark:text-grey-600 outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-semibold shrink-0"
        >
          Search Map
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-2 max-h-48 overflow-y-auto space-y-1 shadow-lg z-20 relative">
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1 px-1">Matching Locations:</p>
          {searchResults.map((result, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectResult(result)}
              className="w-full text-left px-2 py-1.5 hover:bg-stone-50 text-xs text-stone-700 rounded transition-colors block border-b border-stone-100 last:border-0"
            >
              {result.label}
            </button>
          ))}
        </div>
      )}

      <div id={id} style={{ height: '220px' }} className="w-full rounded-2xl border border-stone-250 overflow-hidden z-10 relative">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-xs text-stone-500 font-semibold">
            Loading Map...
          </div>
        )}
      </div>
      {lat && lng ? (
        <p className="text-[10px] text-emerald-600 font-mono font-semibold">
          Coordinates Selected: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      ) : (
        <p className="text-[10px] text-rose-500 italic">
          * Click on the map or search to pinpoint exact location.
        </p>
      )}
    </div>
  );
};

const DoctorOnboarding = ({ onProfileStatusChange }) => {
  const [mapOpenFor, setMapOpenFor] = useState(null); // 'current' | 'permanent' | null
  const openMap = (type) => setMapOpenFor(type);
  const closeMap = () => setMapOpenFor(null);
  const handleMapSelect = (addr) => {
    if (mapOpenFor === 'current') {
      setCurrentAddress(prev => ({
        ...prev,
        line1: addr.line1 || prev.line1,
        line2: addr.line2 || prev.line2,
        city:  addr.city  || prev.city,
        state: addr.state || prev.state,
        pincode: addr.pincode || prev.pincode,
        country: addr.country || prev.country || 'India',
        latitude: addr.latitude,
        longitude: addr.longitude,
      }));
    } else if (mapOpenFor === 'permanent') {
      setPermanentAddress(prev => ({
        ...prev,
        line1: addr.line1 || prev.line1,
        line2: addr.line2 || prev.line2,
        city:  addr.city  || prev.city,
        state: addr.state || prev.state,
        pincode: addr.pincode || prev.pincode,
        country: addr.country || prev.country || 'India',
        latitude: addr.latitude,
        longitude: addr.longitude,
      }));
    }
    closeMap();
  };
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [specializationsList, setSpecializationsList] = useState([]);

  // Form step
  const [formStep, setFormStep] = useState(1);

  // Form states
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [medicalRegistrationNumber, setMedicalRegistrationNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [consultationFee, setConsultationFee] = useState(0);
  const [followUpFee, setFollowUpFee] = useState(0);
  const [isOnlineAvailable, setIsOnlineAvailable] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState('');
  const [image, setImage] = useState('');
  const [documentPdf, setDocumentPdf] = useState('');
  const [pdfName, setPdfName] = useState('');

  // Step 3 Personal Address States
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
  const [isSameAddress, setIsSameAddress] = useState(false);
  const [preferredPracticeLocation, setPreferredPracticeLocation] = useState('');
  const [clinics, setClinics] = useState([]);
  const [orgClinics, setOrgClinics] = useState([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const loadProfile = async () => {
    try {
      const [profileRes, specsRes, orgsRes, clinicsRes] = await Promise.all([
        doctorApi.getMyProfile(),
        specializationApi.list().catch(() => ({ data: { specializations: [] } })),
        organizationApi.getPublic().catch(() => ({ data: { organizations: [] } })),
        clinicApi.list().catch(() => ({ clinics: [] }))
      ]);
      
      const doc = profileRes.data?.doctor;
      setProfile(doc);
      setSpecializationsList(specsRes.data?.specializations || []);
      setOrganizations(orgsRes.data?.organizations || []);
      setClinics(clinicsRes.data?.clinics || clinicsRes.clinics || []);

      if (doc) {
        setSpecialization(doc.specialization || '');
        setQualification(doc.qualification || '');
        setMedicalRegistrationNumber(doc.medicalRegistrationNumber || '');
        setExperienceYears(doc.experienceYears || 0);
        setConsultationFee(doc.consultationFee || 0);
        setFollowUpFee(doc.followUpFee || 0);
        setIsOnlineAvailable(doc.isOnlineAvailable || false);
        setOrganizationId(doc.organizationId || '');
        setImage(doc.image || '');
        setDocumentPdf(doc.documentPdf || '');
        if (doc.documentPdf) {
          setPdfName('Uploaded_Document.pdf');
        }
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
        setPreferredPracticeLocation(doc.preferredPracticeLocation || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch onboarding context.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (organizationId) {
      const filtered = clinics.filter(c => c.organizationId === organizationId);
      setOrgClinics(filtered);
    } else {
      setOrgClinics([]);
    }
  }, [organizationId, clinics]);

  useEffect(() => {
    if (isSameAddress) {
      setPermanentAddress({ ...currentAddress });
    }
  }, [isSameAddress, currentAddress]);

  const currentStatus = profile?.approvalStatus || 'pending_profile';

  const hasReEditError = (fieldName) => {
    return currentStatus === 're_edit' && !!profile?.reEditFields?.[fieldName];
  };

  const getFieldClass = (fieldName) => {
    return `${FIELD_CLASS} ${hasReEditError(fieldName) ? 'border-rose-500 ring-2 ring-rose-100' : ''}`;
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF documents are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'image') {
        setImage(reader.result);
      } else {
        setDocumentPdf(reader.result);
        setPdfName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const getFormData = () => ({
    specialization,
    qualification,
    medicalRegistrationNumber,
    experienceYears: Number(experienceYears),
    consultationFee: Number(consultationFee),
    followUpFee: Number(followUpFee),
    isOnlineAvailable,
    image,
    documentPdf,
    organizationId,
    currentAddress,
    permanentAddress,
    preferredPracticeLocation
  });

  const handleSaveDraft = async () => {
    setSuccessMsg('');
    setError('');
    try {
      const response = await doctorApi.updateMyProfile(getFormData());
      setSuccessMsg('Draft saved successfully!');
      setProfile(response.data?.doctor);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft.');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSuccessMsg('');
    setError('');

    if (!organizationId) {
      setError('Organization selection is required in Step 1.');
      setFormStep(1);
      return;
    }

    if (!documentPdf) {
      setError('Compulsory registration documents (PDF) must be uploaded in Step 2.');
      setFormStep(2);
      return;
    }

    // Step 3 validations
    if (!currentAddress.line1 || !currentAddress.city || !currentAddress.state || !currentAddress.pincode) {
      setError('Please fill in all current address details.');
      setFormStep(3);
      return;
    }

    if (!currentAddress.latitude || !currentAddress.longitude) {
      setError('Please choose your current address exact coordinates on the map.');
      setFormStep(3);
      return;
    }

    if (!permanentAddress.line1 || !permanentAddress.city || !permanentAddress.state || !permanentAddress.pincode) {
      setError('Please fill in all permanent address details.');
      setFormStep(3);
      return;
    }

    if (!permanentAddress.latitude || !permanentAddress.longitude) {
      setError('Please choose your permanent address exact coordinates on the map.');
      setFormStep(3);
      return;
    }

    if (!preferredPracticeLocation) {
      setError('Preferred practice location branch selection is required.');
      setFormStep(3);
      return;
    }

    try {
      const response = await doctorApi.submitMyProfile(getFormData());
      setProfile(response.data?.doctor);
      if (onProfileStatusChange) {
        onProfileStatusChange(response.data?.doctor?.approvalStatus);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit profile.');
    }
  };

  const handleAcceptSlot = async () => {
    setError('');
    try {
      await doctorApi.acceptMySlot();
      if (onProfileStatusChange) {
        onProfileStatusChange('approved');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept slot.');
    }
  };

  const getGoogleMapsUrl = (clinic) => {
    const addr = clinic.address || {};
    if (addr.latitude && addr.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`;
    }
    const query = `${clinic.name}, ${addr.line1 || ''}, ${addr.city || ''}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const getClinicImage = (clinic) => {
    if (clinic.image && (clinic.image.startsWith('data:') || clinic.image.startsWith('http') || clinic.image.startsWith('gridfs:'))) {
      return clinic.image;
    }
    return 'https://images.unsplash.com/photo-1586773860418-d3b34998c66c?auto=format&fit=crop&w=400&q=80';
  };

  if (loading) {
    return <LoadingState label="Loading onboarding wizard..." />;
  }

  if (error && !profile) {
    return <ErrorState title="Dashboard Offline" description={error} />;
  }

  if (currentStatus === 'approved' && !profile?.hasAcceptedSlot) {
    const clinic = profile.clinicId || {};
    const primaryId = profile.clinicId?._id || profile.clinicId;
    const assignedList = profile.assignedClinics?.length
      ? profile.assignedClinics
      : (primaryId ? [primaryId] : []);

    const availableSlots = profile?.availability?.filter(s => s.isAvailable) || [];

    // Group slots by day for cleaner display
    const slotsByDay = availableSlots.reduce((acc, slot) => {
      const day = slot.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(slot);
      return acc;
    }, {});

    const dayOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const sortedDays = dayOrder.filter(d => slotsByDay[d]);

    const modeColor = (mode) =>
      mode === 'online'
        ? 'bg-sky-100 text-sky-700 border-sky-200'
        : 'bg-violet-100 text-violet-700 border-violet-200';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-3xl">

          {/* ── Hero Banner ── */}
          <div className="relative rounded-3xl overflow-hidden mb-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 p-8 text-center shadow-2xl shadow-emerald-900/40">
            <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize:"30px 30px"}} />
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Congratulations, Doctor!</h1>
              <p className="text-emerald-100 text-base font-medium">You have been successfully verified and approved by the admin.</p>
              <p className="text-white/70 text-sm mt-1">Please review your offer letter carefully before accepting.</p>
            </div>
          </div>

          {/* ── Offer Letter Card ── */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">

            {/* Header strip */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Official Offer Letter</p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">AI-CMS Healthcare Network</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                ✓ Verified
              </span>
            </div>

            <div className="p-6 space-y-6">

              {/* ── Primary Clinic Info ── */}
              <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white overflow-hidden">
                <div className="px-5 py-3 bg-stone-100 border-b border-stone-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">Primary Appointed Clinic</span>
                </div>
                <div className="px-5 py-4">
                  <h3 className="text-xl font-black text-stone-900">{clinic.name || 'AI-CMS Branch'}</h3>
                  <p className="text-stone-500 text-sm mt-1">
                    {[clinic.address?.line1, clinic.address?.line2, clinic.address?.city, clinic.address?.state].filter(Boolean).join(', ')}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                      Code: <span className="font-mono font-black text-slate-900">{clinic.code || 'N/A'}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold ${profile.isOnlineAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg>
                      Teleconsultation: {profile.isOnlineAvailable ? '✓ Enabled' : '✗ Disabled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Assigned Venues ── */}
              {assignedList.length > 0 && (
                <div className="rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="px-5 py-3 bg-stone-100 border-b border-stone-200 flex items-center gap-2">
                    <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">Appointed Practice Venues</span>
                  </div>
                  <div className="px-5 py-4 flex flex-wrap gap-2">
                    {assignedList.map((c) => {
                      const cObj = clinics.find(item => String(item._id) === String(c._id || c));
                      if (!cObj) return null;
                      const isPrimary = String(cObj._id) === String(primaryId);
                      return (
                        <div key={cObj._id} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-semibold text-sm ${
                          isPrimary
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white border-stone-200 text-stone-700'
                        }`}>
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                          </svg>
                          {cObj.name}
                          {isPrimary && <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isPrimary ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>PRIMARY</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Practice Slots ── */}
              <div className="rounded-2xl border border-stone-200 overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Assigned Practice Schedule</span>
                  <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    {availableSlots.length} slots
                  </span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="px-5 py-8 text-center text-stone-400 italic text-sm">
                    No active practice slots have been configured yet.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {sortedDays.map((day) => (
                      <div key={day} className="px-5 py-4">
                        {/* Day heading */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="capitalize font-black text-stone-900 text-sm">{day}</span>
                          <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold">
                            {slotsByDay[day].length} slot{slotsByDay[day].length > 1 ? 's' : ''}
                          </span>
                        </div>
                        {/* Slot cards for the day */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {slotsByDay[day].map((slot, idx) => {
                            const matchedClinic = clinics.find(c => String(c._id) === String(slot.clinicId?._id || slot.clinicId));
                            return (
                              <div key={slot._id || idx} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 hover:bg-stone-100 transition-colors">
                                {/* Time icon */}
                                <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-sm">
                                  <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  {/* Time range */}
                                  <p className="font-black text-stone-900 text-sm">
                                    {slot.startTime} – {slot.endTime}
                                  </p>
                                  {/* Duration */}
                                  <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                    {slot.slotDurationMinutes} min per slot
                                  </p>
                                  {/* Tags */}
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${modeColor(slot.consultationMode)}`}>
                                      {slot.consultationMode === 'online' ? '🌐 Online' : '🏥 In-Clinic'}
                                    </span>
                                    {matchedClinic && (
                                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200" title={matchedClinic.name}>
                                        📍 {matchedClinic.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Terms & Conditions ── */}
              <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <h4 className="font-black text-amber-900 text-sm mb-1">Terms &amp; Conditions of Appointment</h4>
                    <div className="text-xs text-amber-800 space-y-1.5 leading-relaxed">
                      <p>• You confirm that all credentials and documents you submitted are authentic and accurate.</p>
                      <p>• You agree to adhere to the clinic's code of professional conduct and patient care standards.</p>
                      <p>• You agree to fulfill the assigned practice schedule unless prior notice is given to the administration.</p>
                      <p>• You authorize the clinic to display your profile, specialization, and availability to patients for appointment booking.</p>
                      <p>• You agree that teleconsultation (if enabled) will be conducted through the clinic's approved platform only.</p>
                      <p>• Any breach of conduct may result in suspension or revocation of your clinic access.</p>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer rounded"
                  />
                  <span className="text-sm font-bold text-amber-900 group-hover:text-amber-700 transition-colors select-none">
                    I have read and agree to all the terms &amp; conditions of this appointment
                  </span>
                </label>
              </div>

              {/* ── Accept Button ── */}
              <button
                onClick={handleAcceptSlot}
                disabled={!acceptedTerms}
                className={`w-full py-4 rounded-2xl text-sm font-black tracking-wide shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  acceptedTerms
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-300 cursor-pointer scale-100 hover:scale-[1.01]'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                }`}
              >
                {acceptedTerms ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept Offer &amp; Open My Workspace
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Accept Terms &amp; Conditions to Continue
                  </>
                )}
              </button>

              {error && (
                <p className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold border border-rose-200 text-center">{error}</p>
              )}
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-slate-500 text-xs mt-4">
            By accepting this offer, you agree to join the AI-CMS Healthcare Network as a registered practitioner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-6 p-6 md:p-8 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl">
      <StepsProgress currentStatus={currentStatus} />

      <div className="mb-8 border-b border-stone-100 dark:border-stone-700 pb-5">
        <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">Complete Doctor Profile</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Please enter your professional details and upload verification documents to submit your application.</p>
      </div>

      {successMsg && <p className="mb-5 p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-100">{successMsg}</p>}
      {error && <p className="mb-5 p-3.5 rounded-2xl bg-rose-50 text-rose-700 text-sm font-semibold border border-rose-100">{error}</p>}

      {currentStatus === 're_edit' && profile?.reEditComments && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm shadow-amber-100/20">
          <div className="flex items-center gap-2 mb-2 font-bold text-sm">
            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Feedback from Super Admin</span>
          </div>
          <p className="text-xs leading-relaxed">{profile.reEditComments}</p>
          <div className="mt-3 text-[10px] uppercase font-bold text-amber-800 tracking-wider">
            Flagged for correction: {Object.keys(profile.reEditFields || {}).filter(k => profile.reEditFields[k]).map(k => k.replace(/([A-Z])/g, ' $1')).join(', ') || 'General review'}
          </div>
        </div>
      )}

      {currentStatus === 'pending_approval' ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4 border border-amber-100">
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-white">Waiting for Admin Approval</h3>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-2 max-w-md mx-auto">
            Your credentials have been submitted and are under validation. The dashboard will unlock once the admin assigns you to a clinic.
          </p>
        </div>
      ) : (
        <div>
          {/* Inner step navigator tabs for interactive wizard feel */}
          <div className="flex border-b border-stone-200 dark:border-stone-700 mb-6 text-xs md:text-sm">
            <button
              onClick={() => setFormStep(1)}
              className={`flex-1 pb-3 text-center font-bold transition-all border-b-2 ${
                formStep === 1 ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              1. Credentials & Fees
            </button>
            <button
              onClick={() => setFormStep(2)}
              className={`flex-1 pb-3 text-center font-bold transition-all border-b-2 ${
                formStep === 2 ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              2. Upload Documents
            </button>
            <button
              onClick={() => setFormStep(3)}
              className={`flex-1 pb-3 text-center font-bold transition-all border-b-2 ${
                formStep === 3 ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              3. Address & Practice Venue
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1 Form Fields */}
            {formStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-4">Professional Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Select Organization to Join {hasReEditError('organizationId') && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      <select
                        required
                        value={organizationId}
                        onChange={(e) => setOrganizationId(e.target.value)}
                        className={getFieldClass('organizationId')}
                      >
                        <option value="" disabled>Choose an organization to join...</option>
                        {organizations.map((org) => (
                          <option key={org._id} value={org._id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Medical Registration Number {hasReEditError('medicalRegistrationNumber') && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MCI-12345"
                        value={medicalRegistrationNumber}
                        onChange={(e) => setMedicalRegistrationNumber(e.target.value)}
                        className={getFieldClass('medicalRegistrationNumber')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Specialization {hasReEditError('specialization') && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      <select
                        required
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className={getFieldClass('specialization')}
                      >
                        <option value="" disabled>Choose allowed specialty...</option>
                        {specializationsList.map((spec) => (
                          <option key={spec._id} value={spec.name}>
                            {spec.name}
                          </option>
                        ))}
                        {specialization && !specializationsList.some((s) => s.name === specialization) && (
                          <option value={specialization}>{specialization}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Qualification {hasReEditError('qualification') && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MBBS, MD"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        className={getFieldClass('qualification')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Years of Experience</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        className={getFieldClass('experienceYears')}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-4">Consultation Fees & Formats</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Consultation Fee (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(e.target.value)}
                        className={getFieldClass('consultationFee')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Follow-up Fee (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={followUpFee}
                        onChange={(e) => setFollowUpFee(e.target.value)}
                        className={getFieldClass('followUpFee')}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        id="isOnlineAvailable"
                        checked={isOnlineAvailable}
                        onChange={(e) => setIsOnlineAvailable(e.target.checked)}
                        className="w-5 h-5 accent-emerald-600 cursor-pointer"
                      />
                      <label htmlFor="isOnlineAvailable" className="text-sm font-semibold text-stone-700 dark:text-stone-200 cursor-pointer">
                        Available for Teleconsultation / Online Consultations
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 Form Fields */}
            {formStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Profile & Credential Uploads</h3>
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Profile Photo {hasReEditError('image') && <span className="text-rose-500 font-bold">(needs re-upload)</span>}
                    </label>
                    <div className={`flex items-center gap-4 p-3 rounded-2xl border ${hasReEditError('image') ? 'border-rose-500 bg-rose-50/20' : 'border-stone-150'}`}>
                      {image ? (
                        <img src={image} alt="Doctor preview" className="w-16 h-16 rounded-full object-cover border border-stone-200" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-400 border border-stone-200">Photo</div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'image')}
                        className="text-xs text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-stone-50 file:text-stone-700 hover:file:bg-stone-100 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Registration Document / Degree (Compulsory PDF) {hasReEditError('documentPdf') && <span className="text-rose-500 font-bold">(needs re-upload)</span>}
                    </label>
                    <div className={`p-3 rounded-2xl border ${hasReEditError('documentPdf') ? 'border-rose-500 bg-rose-50/20' : 'border-stone-150'}`}>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, 'pdf')}
                        className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-stone-50 file:text-stone-700 hover:file:bg-stone-100 cursor-pointer"
                      />
                      {pdfName && <p className="text-xs text-emerald-600 mt-2 font-semibold">✓ {pdfName}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 Form Fields */}
            {formStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-4">Current Personal Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        placeholder="House / Apartment no, Street"
                        value={currentAddress.line1}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, line1: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                        required={formStep === 3}
                      />
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button type="button" onClick={() => openMap('current')} className="map-button px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors shadow-sm">
                          Select on Map
                        </button>
                        {currentAddress.latitude && currentAddress.longitude ? (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1">
                            📍 Located on Map ({currentAddress.latitude.toFixed(4)}, {currentAddress.longitude.toFixed(4)})
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 animate-pulse">
                            ⚠️ Map Location Required
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        placeholder="Locality / Landmark"
                        value={currentAddress.line2}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, line2: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={currentAddress.city}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, city: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                        required={formStep === 3}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">State</label>
                      <input
                        type="text"
                        placeholder="State"
                        value={currentAddress.state}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, state: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                        required={formStep === 3}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Pincode</label>
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={currentAddress.pincode}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, pincode: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                        required={formStep === 3}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Country</label>
                      <input
                        type="text"
                        value={currentAddress.country}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, country: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                        required={formStep === 3}
                      />
                    </div>
                    
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-150">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Permanent Address</h3>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="checkbox"
                        id="same_address"
                        checked={isSameAddress}
                        onChange={(e) => setIsSameAddress(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                      />
                      <label htmlFor="same_address" className="text-xs font-semibold text-stone-700 cursor-pointer">
                        Same as current address
                      </label>
                    </div>
                  </div>

                  {!isSameAddress && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Address Line 1</label>
                        <input
                          type="text"
                          placeholder="House / Apartment no, Street"
                          value={permanentAddress.line1}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, line1: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                          required={formStep === 3 && !isSameAddress}
                        />
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <button type="button" onClick={() => openMap('permanent')} className="map-button px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors shadow-sm">
                            Select on Map
                          </button>
                          {permanentAddress.latitude && permanentAddress.longitude ? (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1">
                              📍 Located on Map ({permanentAddress.latitude.toFixed(4)}, {permanentAddress.longitude.toFixed(4)})
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 animate-pulse">
                              ⚠️ Map Location Required
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Address Line 2</label>
                        <input
                          type="text"
                          placeholder="Locality / Landmark"
                          value={permanentAddress.line2}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, line2: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">City</label>
                        <input
                          type="text"
                          placeholder="City"
                          value={permanentAddress.city}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, city: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                          required={formStep === 3 && !isSameAddress}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">State</label>
                        <input
                          type="text"
                          placeholder="State"
                          value={permanentAddress.state}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, state: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                          required={formStep === 3 && !isSameAddress}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Pincode</label>
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={permanentAddress.pincode}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, pincode: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                          required={formStep === 3 && !isSameAddress}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Country</label>
                        <input
                          type="text"
                          value={permanentAddress.country}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, country: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-emerald-500"
                          required={formStep === 3 && !isSameAddress}
                        />
                      </div>

                      <MapPicker
                        isOpen={!!mapOpenFor}
                        onClose={closeMap}
                        onSelectAddress={handleMapSelect}
                        initialAddress={mapOpenFor === 'current' ? currentAddress : permanentAddress}
                      />
                    </div>
                  )}
                </div>

                {/* Organization Branches & Preference Selection */}
                <div className="pt-6 border-t border-stone-150">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Practice Branch Location Preference</h3>
                  <p className="text-xs text-stone-500 mb-4">Choose your preferred branch for the hospital organization you selected in Step 1.</p>
                  
                  {orgClinics.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-amber-50 text-amber-800 text-xs text-center border border-amber-200">
                      Please select an organization in Step 1 to view clinic branches.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Dropdown for Selection */}
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Select Preferred Branch</label>
                        <select
                          value={preferredPracticeLocation}
                          onChange={(e) => setPreferredPracticeLocation(e.target.value)}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 px-4 py-3 text-sm text-stone-900 dark:text-white bg-white dark:bg-stone-700 outline-none focus:border-emerald-500"
                          required={formStep === 3}
                        >
                          <option value="" disabled>Choose preferred branch...</option>
                          {orgClinics.map((clinic) => (
                            <option key={clinic._id} value={clinic._id}>
                              {clinic.name} ({clinic.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Displaying clinics beautifully with images */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {orgClinics.map((clinic) => {
                          const isSelected = preferredPracticeLocation === clinic._id;
                          return (
                            <div 
                              key={clinic._id}
                              onClick={() => setPreferredPracticeLocation(clinic._id)}
                              className={`rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                                isSelected ? 'border-emerald-600 bg-emerald-50/10' : 'border-stone-200 bg-white'
                              }`}
                            >
                              <img 
                                src={getClinicImage(clinic)} 
                                alt={clinic.name}
                                className="w-full h-32 object-cover" 
                              />
                              <div className="p-4">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-bold text-sm text-stone-900">{clinic.name}</h4>
                                  <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-bold">{clinic.code}</span>
                                </div>
                                <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                                  {clinic.address?.line1 || ''}, {clinic.address?.city || ''}, {clinic.address?.state || ''} {clinic.address?.pincode || ''}
                                </p>
                                {clinic.phone && (
                                  <p className="text-[11px] text-stone-600 mt-1 font-semibold">📞 Reception: {clinic.phone}</p>
                                )}
                                
                                <div className="mt-4 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreferredPracticeLocation(clinic._id);
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                      isSelected 
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                    }`}
                                  >
                                    {isSelected ? '✓ Preferred' : 'Select Branch'}
                                  </button>
                                  <a
                                    href={getGoogleMapsUrl(clinic)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-3 py-2 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                                    title="Get Directions on Google Maps"
                                  >
                                    🗺️ Directions
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation and Action Buttons */}
            <div className="flex justify-between gap-3 pt-6 border-t border-stone-100">
              <div className="flex gap-2">
                {formStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setFormStep(prev => prev - 1)}
                    className="rounded-2xl border border-stone-300 px-5 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                  >
                    ← Back
                  </button>
                )}
                {formStep < 3 && (
                  <button
                    type="button"
                    onClick={() => setFormStep(prev => prev + 1)}
                    className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 text-xs font-semibold shadow transition cursor-pointer"
                  >
                    Next Step →
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="rounded-2xl border border-stone-300 px-5 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                >
                  Save as Draft
                </button>
                {formStep === 3 && (
                  <button
                    type="submit"
                    className="rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/15 transition cursor-pointer"
                  >
                    Submit for Approval
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DoctorOnboarding;
