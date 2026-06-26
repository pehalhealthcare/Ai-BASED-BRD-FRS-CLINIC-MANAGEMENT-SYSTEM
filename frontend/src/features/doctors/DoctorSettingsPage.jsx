import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { doctorApi, organizationApi, clinicApi } from '../../lib/api';

// Simplified Non-Editable Map Component using Leaflet via CDN
const ReadOnlyMap = ({ id, lat, lng }) => {
  const [mapLoaded, setMapLoaded] = useState(false);

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
    if (!mapLoaded || !lat || !lng) return;
    
    const container = document.getElementById(id);
    if (!container) return;

    let mapInstance;
    const defaultCoords = [lat, lng];

    try {
      // Set up marker icon to avoid path resolution errors in React build
      const DefaultIcon = window.L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        shadowSize: [41, 41]
      });

      mapInstance = window.L.map(id, {
        dragging: false,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false
      }).setView(defaultCoords, 15);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance);

      window.L.marker(defaultCoords, { icon: DefaultIcon }).addTo(mapInstance);

    } catch (e) {
      console.warn('Leaflet map initialization warning:', e);
    }

    return () => {
      if (mapInstance) {
        mapInstance.off();
        mapInstance.remove();
      }
    };
  }, [mapLoaded, id, lat, lng]);

  return (
    <div className="space-y-2 mt-2">
      <div id={id} style={{ height: '180px' }} className="w-full rounded-2xl border border-stone-200 dark:border-white/10 overflow-hidden z-10 relative">
        {(!lat || !lng) ? (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50 dark:bg-white/[0.02] text-xs text-stone-400 font-semibold italic">
            Location Coordinates Pending Selection
          </div>
        ) : !mapLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50 dark:bg-white/[0.02] text-xs text-stone-500 font-semibold">
            Loading Map View...
          </div>
        ) : null}
      </div>
      {lat && lng && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
          Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};

const DoctorSettingsPage = () => {
  const [profile, setProfile] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgName, setOrgName] = useState('N/A');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    accountHolderName: '',
    passbookCopy: ''
  });

  const fetchProfileData = async () => {
    try {
      const [profileRes, clinicsRes] = await Promise.all([
        doctorApi.getMyProfile(),
        clinicApi.list().catch(() => ({ clinics: [] }))
      ]);

      const doc = profileRes.data?.doctor || profileRes.doctor;
      setProfile(doc);
      setClinics(clinicsRes.data?.clinics || clinicsRes.clinics || []);

      if (doc?.bankAccount) {
        setBankForm({
          accountNumber: doc.bankAccount.accountNumber || '',
          ifscCode: doc.bankAccount.ifscCode || '',
          bankName: doc.bankAccount.bankName || '',
          accountHolderName: doc.bankAccount.accountHolderName || '',
          passbookCopy: doc.bankAccount.passbookCopy || ''
        });
      }

      if (doc?.organizationId) {
        try {
          const orgsRes = await organizationApi.getPublic();
          const org = orgsRes.data?.organizations?.find(o => o._id === doc.organizationId);
          if (org) setOrgName(org.name);
        } catch (e) {
          console.error('Failed to load organization info:', e);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch doctor profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        specialization: profile.specialization,
        qualification: profile.qualification,
        medicalRegistrationNumber: profile.medicalRegistrationNumber,
        experienceYears: profile.experienceYears,
        consultationFee: profile.consultationFee,
        followUpFee: profile.followUpFee,
        isOnlineAvailable: profile.isOnlineAvailable,
        organizationId: profile.organizationId?._id || profile.organizationId,
        currentAddress: profile.currentAddress,
        permanentAddress: profile.permanentAddress,
        preferredPracticeLocation: profile.preferredPracticeLocation,
        phone: profile.phone,
        bankAccount: bankForm
      };
      const response = await doctorApi.updateMyProfile(payload);
      const updatedDoc = response.data?.doctor || response.doctor || response;
      setProfile(updatedDoc);
      setIsEditingBank(false);
      alert('Bank details updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update bank details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  if (loading) {
    return <LoadingState label="Loading doctor profile details..." />;
  }

  if (error || !profile) {
    return <ErrorState title="Profile Load Failed" description={error || 'Profile not loaded'} />;
  }

  const primaryClinicId = profile.clinicId?._id || profile.clinicId;
  const assignedList = profile.assignedClinics?.length
    ? profile.assignedClinics
    : (primaryClinicId ? [primaryClinicId] : []);

  const activeSlots = profile.availability?.filter(s => s.isAvailable) || [];

  return (
    <div className="max-w-6xl mx-auto my-6 px-4 animate-fade-in">
      {/* Premium Header Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-stone-200 dark:border-white/[0.06] bg-gradient-to-br from-slate-900 via-stone-900 to-emerald-950 p-6 md:p-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
        <div className="relative flex flex-col md:flex-row items-center gap-6 z-10">
          {profile.image ? (
            <img 
              src={profile.image} 
              alt={profile.fullName} 
              className="w-28 h-28 rounded-full object-cover border-4 border-emerald-500/30 shadow-2xl" 
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-emerald-800 text-white font-black text-3xl flex items-center justify-center border-4 border-emerald-500/20 shadow-2xl">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </div>
          )}
          
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-1.5">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{profile.fullName}</h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                ✓ Verified Practitioner
              </span>
            </div>
            <p className="text-sm font-bold text-emerald-400 mb-1">{profile.specialization || 'Medical Specialist'}</p>
            <p className="text-xs text-stone-400">{orgName} Healthcare Network</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Education, Qualifications & Contact */}
        <div className="space-y-6">
          
          {/* Professional Details Card */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-md">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
              Professional Credentials
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Qualification</span>
                <p className="text-sm font-bold text-stone-800 dark:text-white mt-0.5">{profile.qualification || 'N/A'}</p>
              </div>
              
              <div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Years of Experience</span>
                <p className="text-sm font-bold text-stone-800 dark:text-white mt-0.5">{profile.experienceYears || '0'} Years Practice</p>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Medical Registration Number</span>
                <p className="text-sm font-mono font-bold text-stone-800 dark:text-white mt-0.5">{profile.medicalRegistrationNumber || 'N/A'}</p>
              </div>

              {profile.documentPdf && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPdfModal(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30 transition-colors w-full justify-center cursor-pointer"
                  >
                    📄 View Registration Certificate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Consultation Formats Card */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-md">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
              Consultation Rates & Setup
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Consultation Fee</span>
                  <p className="text-base font-black text-stone-900 dark:text-white mt-0.5">₹ {profile.consultationFee}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Follow-up Fee</span>
                  <p className="text-base font-black text-stone-900 dark:text-white mt-0.5">₹ {profile.followUpFee}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-white/[0.04]">
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block mb-1.5">Teleconsultation Format</span>
                {profile.isOnlineAvailable ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-900/30">
                    🌐 Available Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-white/[0.04] px-2 py-1 rounded border border-stone-200 dark:border-white/[0.08]">
                    🏥 Offline consultations Only
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-md">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
              Contact Info
            </h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Primary Phone</span>
                <p className="text-sm font-bold text-stone-800 dark:text-white mt-0.5">{profile.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Email Address</span>
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 mt-0.5 break-all">{profile.userId?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Bank Account Details Card */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Bank Account Details
              </h3>
              {!isEditingBank && (
                <button
                  onClick={() => setIsEditingBank(true)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Edit details
                </button>
              )}
            </div>

            {isEditingBank ? (
              <form onSubmit={handleSaveBankDetails} className="space-y-3">
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountHolderName}
                    onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-stone-250 dark:border-white/10 bg-transparent text-stone-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-stone-250 dark:border-white/10 bg-transparent text-stone-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={bankForm.ifscCode}
                    onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-stone-250 dark:border-white/10 bg-transparent text-stone-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-stone-250 dark:border-white/10 bg-transparent text-stone-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Passbook Copy / Cancelled Cheque</label>
                  {bankForm.passbookCopy ? (
                    <div className="mb-2 flex items-center justify-between bg-stone-50 dark:bg-white/[0.02] p-2 rounded-xl border border-stone-200 dark:border-white/10">
                      <span className="text-xs text-stone-600 dark:text-stone-300 truncate max-w-[200px]">📄 Passbook uploaded</span>
                      <button
                        type="button"
                        onClick={() => setBankForm({ ...bankForm, passbookCopy: '' })}
                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30 transition-colors w-full justify-center cursor-pointer">
                      📁 Upload Passbook Copy
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBankForm({ ...bankForm, passbookCopy: reader.result });
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 text-center bg-emerald-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingBank(false);
                      if (profile?.bankAccount) {
                        setBankForm({
                          accountNumber: profile.bankAccount.accountNumber || '',
                          ifscCode: profile.bankAccount.ifscCode || '',
                          bankName: profile.bankAccount.bankName || '',
                          accountHolderName: profile.bankAccount.accountHolderName || '',
                          passbookCopy: profile.bankAccount.passbookCopy || ''
                        });
                      }
                    }}
                    className="flex-1 text-center bg-stone-100 dark:bg-white/[0.04] text-stone-700 dark:text-stone-300 rounded-xl py-2 text-xs font-bold hover:bg-stone-200 dark:hover:bg-white/[0.08] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Account Holder</span>
                  <p className="text-sm font-bold text-stone-800 dark:text-white mt-0.5">{profile.bankAccount?.accountHolderName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Account Number</span>
                  <p className="text-sm font-mono font-bold text-stone-800 dark:text-white mt-0.5">{profile.bankAccount?.accountNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">IFSC Code</span>
                  <p className="text-sm font-mono font-bold text-stone-800 dark:text-white mt-0.5">{profile.bankAccount?.ifscCode || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Bank Name</span>
                  <p className="text-sm font-bold text-stone-800 dark:text-white mt-0.5">{profile.bankAccount?.bankName || 'N/A'}</p>
                </div>
                {profile.bankAccount?.passbookCopy && (
                  <div>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Passbook Copy</span>
                    <a
                      href={profile.bankAccount.passbookCopy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1 inline-block"
                    >
                      📄 View Passbook Document
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Digital Signature Card */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-md">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
              Digital Signature
            </h3>
            
            <div className="space-y-4">
              {profile.signature ? (
                <div className="space-y-2">
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider block">Current Signature</span>
                  <div className="bg-stone-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-stone-150 dark:border-white/[0.06] flex items-center justify-center">
                    <img 
                      src={profile.signature} 
                      alt="Doctor Signature" 
                      className="max-h-20 object-contain dark:invert" 
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic">No signature uploaded yet. Please upload a signature for prescriptions.</p>
              )}

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30 transition-colors w-full justify-center cursor-pointer">
                  📁 {profile.signature ? 'Replace Signature' : 'Upload Signature'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        try {
                          const base64Data = reader.result;
                          // Prepare a payload with existing fields
                          const payload = {
                            specialization: profile.specialization,
                            qualification: profile.qualification,
                            medicalRegistrationNumber: profile.medicalRegistrationNumber,
                            experienceYears: profile.experienceYears,
                            consultationFee: profile.consultationFee,
                            followUpFee: profile.followUpFee,
                            isOnlineAvailable: profile.isOnlineAvailable,
                            organizationId: profile.organizationId?._id || profile.organizationId,
                            currentAddress: profile.currentAddress,
                            permanentAddress: profile.permanentAddress,
                            preferredPracticeLocation: profile.preferredPracticeLocation,
                            phone: profile.phone,
                            signature: base64Data
                          };
                          setLoading(true);
                          const response = await doctorApi.updateMyProfile(payload);
                          const updatedDoc = response.data?.doctor || response.doctor || response;
                          setProfile(updatedDoc);
                          alert('Signature updated successfully!');
                        } catch (err) {
                          alert(err.response?.data?.message || 'Failed to update signature.');
                        } finally {
                          setLoading(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Right Columns: Practice Venues, Schedule & Address Maps */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Assigned Practice Venues */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-md">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
              Assigned Practice Clinic Venues
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedList.map((c) => {
                const cObj = clinics.find(item => String(item._id) === String(c._id || c));
                if (!cObj) return null;
                const isPrimary = String(cObj._id) === String(primaryClinicId);
                
                return (
                  <div key={cObj._id} className={`p-4 rounded-2xl border-2 transition-all ${
                    isPrimary 
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10' 
                      : 'border-stone-200 dark:border-white/[0.04] bg-stone-50/50 dark:bg-white/[0.01]'
                  }`}>
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-sm text-stone-900 dark:text-white">{cObj.name}</h4>
                      <span className="text-[9px] font-mono font-bold bg-stone-100 dark:bg-white/[0.06] text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded">
                        {cObj.code}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                      {cObj.address?.line1 || ''}, {cObj.address?.city || ''}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      {isPrimary && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm">
                          Primary Clinic
                        </span>
                      )}
                      {cObj.phone && (
                        <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-450">
                          📞 {cObj.phone}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {assignedList.length === 0 && (
                <p className="text-xs text-stone-400 italic md:col-span-2">No clinics assigned yet.</p>
              )}
            </div>
          </div>

          {/* Assigned Practice Slots */}
          <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-md">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
              Weekly Assigned Practice Slots
            </h3>
            
            <div className="space-y-3">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const daySlots = activeSlots.filter(s => s.dayOfWeek === day);
                if (daySlots.length === 0) return null;
                
                return (
                  <div key={day} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-white/[0.01] border border-stone-150 dark:border-white/[0.04] gap-2.5">
                    <span className="capitalize text-xs font-extrabold text-stone-900 dark:text-white w-24 shrink-0">{day}</span>
                    
                    <div className="flex-1 space-y-1.5">
                      {daySlots.map((slot, idx) => {
                        const matchedClinic = clinics.find(c => String(c._id) === String(slot.clinicId?._id || slot.clinicId));
                        return (
                          <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-stone-700 dark:text-stone-200">
                              ⏰ {slot.startTime} - {slot.endTime}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                              slot.consultationMode === 'online'
                                ? 'bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/30'
                                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                            }`}>
                              {slot.consultationMode === 'online' ? 'Online' : 'Offline'}
                            </span>
                            {matchedClinic && (
                              <span className="text-[10px] font-semibold text-stone-550 dark:text-stone-400 bg-stone-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded border border-stone-200 dark:border-white/[0.06] max-w-[180px] truncate" title={matchedClinic.name}>
                                📍 {matchedClinic.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {activeSlots.length === 0 && (
                <p className="text-xs text-stone-400 italic">No practice slots configured.</p>
              )}
            </div>
          </div>

          {/* Address & Located Coordinate Maps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Current Address Details */}
            {profile.currentAddress && (
              <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-5 shadow-md flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
                    Current Address
                  </h4>
                  <p className="text-xs font-bold text-stone-850 dark:text-white leading-relaxed">
                    {profile.currentAddress.line1}
                    {profile.currentAddress.line2 && <span className="block mt-0.5 font-medium text-stone-500">{profile.currentAddress.line2}</span>}
                    <span className="block mt-1 text-stone-600 dark:text-stone-400">{profile.currentAddress.city}, {profile.currentAddress.state} - {profile.currentAddress.pincode}</span>
                  </p>
                </div>
                <div className="mt-4">
                  <ReadOnlyMap
                    id="profile-current-map"
                    lat={profile.currentAddress.latitude}
                    lng={profile.currentAddress.longitude}
                  />
                </div>
              </div>
            )}

            {/* Permanent Address Details */}
            {profile.permanentAddress && (
              <div className="bg-white dark:bg-navy-900 border border-stone-200 dark:border-white/[0.06] rounded-3xl p-5 shadow-md flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3 pb-2 border-b border-stone-100 dark:border-white/[0.04]">
                    Permanent Address
                  </h4>
                  <p className="text-xs font-bold text-stone-850 dark:text-white leading-relaxed">
                    {profile.permanentAddress.line1}
                    {profile.permanentAddress.line2 && <span className="block mt-0.5 font-medium text-stone-500">{profile.permanentAddress.line2}</span>}
                    <span className="block mt-1 text-stone-600 dark:text-stone-400">{profile.permanentAddress.city}, {profile.permanentAddress.state} - {profile.permanentAddress.pincode}</span>
                  </p>
                </div>
                <div className="mt-4">
                  <ReadOnlyMap
                    id="profile-permanent-map"
                    lat={profile.permanentAddress.latitude}
                    lng={profile.permanentAddress.longitude}
                  />
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* PDF Registration Document Viewer Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl flex flex-col h-[85vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-stone-850">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white">Registration Certificate Viewer</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Previewing uploaded practitioner qualification certificate</p>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body: Embedded PDF iframe */}
            <div className="flex-1 min-h-0 py-4">
              <iframe
                src={profile.documentPdf}
                className="w-full h-full rounded-2xl border border-stone-200 dark:border-white/10"
                title="Practitioner Registration Certificate"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-850">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="rounded-2xl border border-stone-300 dark:border-white/[0.1] px-5 py-3 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/[0.04] cursor-pointer"
              >
                Cancel
              </button>
              <a
                href={profile.documentPdf}
                download="Medical_Registration.pdf"
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                Download Certificate
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSettingsPage;
