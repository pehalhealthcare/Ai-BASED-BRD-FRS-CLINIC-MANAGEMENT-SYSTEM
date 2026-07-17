import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { receptionistApi, staffApi, organizationApi, clinicApi } from '../../lib/api';
import MapPicker from '../../components/common/MapPicker';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 bg-white dark:bg-stone-700 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-stone-900 dark:text-white dark:border-stone-600 dark:placeholder-stone-400';

const StepsProgress = ({ currentStatus }) => {
  const steps = [
    { title: 'Sign up as Staff', desc: 'Account created', completed: true },
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
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm shadow-indigo-100/30' 
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

const ReceptionistOnboarding = ({ user, onProfileStatusChange }) => {
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
  const displayRole = profile?.role
    ? profile.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Staff';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form step
  const [formStep, setFormStep] = useState(1);

  // Form states
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
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
      const isReceptionist = user?.role === 'RECEPTIONIST';
      const [profileRes, clinicsRes] = await Promise.all([
        isReceptionist ? receptionistApi.getMyProfile() : staffApi.getMyProfile(),
        clinicApi.list().catch(() => ({ clinics: [] }))
      ]);
      
      const rec = profileRes.data?.profile;
      setProfile(rec);
      setClinics(clinicsRes.data?.clinics || clinicsRes.clinics || []);

      if (rec && rec.approvalStatus !== 'approved') {
        const orgsRes = await organizationApi.getPublic().catch(() => ({ data: { organizations: [] } }));
        setOrganizations(orgsRes.data?.organizations || []);
      }

      if (rec) {
        setQualification(rec.qualification || '');
        setExperienceYears(rec.experienceYears || 0);
        setOrganizationId(rec.organizationId || '');
        setImage(rec.image || '');
        setDocumentPdf(rec.documentPdf || '');
        if (rec.documentPdf) {
          setPdfName('Uploaded_Document.pdf');
        }
        if (rec.currentAddress) {
          setCurrentAddress({
            line1: rec.currentAddress.line1 || '',
            line2: rec.currentAddress.line2 || '',
            city: rec.currentAddress.city || '',
            state: rec.currentAddress.state || '',
            pincode: rec.currentAddress.pincode || '',
            country: rec.currentAddress.country || 'India',
            latitude: rec.currentAddress.latitude || null,
            longitude: rec.currentAddress.longitude || null
          });
        }
        if (rec.permanentAddress) {
          setPermanentAddress({
            line1: rec.permanentAddress.line1 || '',
            line2: rec.permanentAddress.line2 || '',
            city: rec.permanentAddress.city || '',
            state: rec.permanentAddress.state || '',
            pincode: rec.permanentAddress.pincode || '',
            country: rec.permanentAddress.country || 'India',
            latitude: rec.permanentAddress.latitude || null,
            longitude: rec.permanentAddress.longitude || null
          });
        }
        setPreferredPracticeLocation(rec.preferredPracticeLocation || '');
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
    qualification,
    experienceYears: Number(experienceYears),
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
      const response = await receptionistApi.updateMyProfile(getFormData());
      setSuccessMsg('Draft saved successfully!');
      setProfile(response.data?.profile);
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
      setError('Compulsory registration documents (PDF) must be uploaded in Step 1.');
      setFormStep(1);
      return;
    }

    // Step 2 validations
    if (!currentAddress.line1 || !currentAddress.city || !currentAddress.state || !currentAddress.pincode) {
      setError('Please fill in all current address details.');
      setFormStep(2);
      return;
    }

    if (!currentAddress.latitude || !currentAddress.longitude) {
      setError('Please choose your current address exact coordinates on the map.');
      setFormStep(2);
      return;
    }

    if (!permanentAddress.line1 || !permanentAddress.city || !permanentAddress.state || !permanentAddress.pincode) {
      setError('Please fill in all permanent address details.');
      setFormStep(2);
      return;
    }

    if (!permanentAddress.latitude || !permanentAddress.longitude) {
      setError('Please choose your permanent address exact coordinates on the map.');
      setFormStep(2);
      return;
    }

    if (!preferredPracticeLocation) {
      setError('Preferred branch selection is required.');
      setFormStep(3);
      return;
    }

    try {
      const response = await receptionistApi.submitMyProfile(getFormData());
      setProfile(response.data?.profile);
      if (onProfileStatusChange) {
        onProfileStatusChange(response.data?.profile?.approvalStatus);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit profile.');
    }
  };

  const handleAcceptSlot = async () => {
    setError('');
    try {
      if (profile?.role === 'RECEPTIONIST') {
        await receptionistApi.acceptMySlot();
        if (onProfileStatusChange) {
          onProfileStatusChange('approved');
        }
        window.location.replace('/appointments');
      } else {
        await staffApi.acceptMySlot();
        if (onProfileStatusChange) {
          onProfileStatusChange('approved');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept schedule details.');
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

    const slotsByDay = availableSlots.reduce((acc, slot) => {
      const day = slot.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(slot);
      return acc;
    }, {});

    const dayOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const sortedDays = dayOrder.filter(d => slotsByDay[d]);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-3xl">

          {/* Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden mb-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 p-8 text-center shadow-2xl shadow-indigo-900/40">
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Congratulations, Onboarded {displayRole}!</h1>
              <p className="text-indigo-100 text-base font-medium">You have been successfully verified and approved by the clinic admin.</p>
              <p className="text-white/70 text-sm mt-1">Please review your official venue assignment & working hours shift schedule below.</p>
            </div>
          </div>

          {/* Offer Letter Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Official Job Appointment & Schedule</p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">AI-CMS Reception Network</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                ✓ Approved
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Primary Clinic Info */}
              <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white overflow-hidden">
                <div className="px-5 py-3 bg-stone-100 border-b border-stone-200 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">Primary Assigned Clinic Venue</span>
                </div>
                <div className="px-5 py-4">
                  <h3 className="text-xl font-black text-stone-900">{clinic.name || 'AI-CMS Branch'}</h3>
                  <p className="text-stone-500 text-sm mt-1">
                    {[clinic.address?.line1, clinic.address?.line2, clinic.address?.city, clinic.address?.state].filter(Boolean).join(', ')}
                  </p>
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold">
                      Code: <span className="font-mono font-black text-slate-900">{clinic.code || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Hours Schedule */}
              <div className="rounded-2xl border border-stone-200 overflow-hidden">
                <div className="px-5 py-3 bg-stone-100 border-b border-stone-200 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">Weekly Shift Timing Schedule</span>
                </div>
                <div className="px-5 py-4">
                  {sortedDays.length === 0 ? (
                    <p className="text-stone-500 text-xs italic">No weekly slots/shift hours have been assigned yet. Please contact your administrator.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sortedDays.map((day) => (
                        <div key={day} className="bg-stone-50 rounded-xl p-3 border border-stone-150 flex flex-col justify-between">
                          <span className="text-xs font-black uppercase text-indigo-600 tracking-wider mb-1">{day}</span>
                          {slotsByDay[day].map((slot, idx) => (
                            <div key={idx} className="flex items-center justify-between text-stone-800 text-xs font-semibold py-1">
                              <span>⏰ Shift Hours:</span>
                              <span className="bg-white px-2 py-0.5 rounded border font-bold text-stone-900">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleAcceptSlot}
                className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 shadow-xl shadow-indigo-600/10 cursor-pointer text-sm transition-all"
              >
                Accept Schedule & Open Dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending/rejected status screen
  if (currentStatus === 'pending_approval' || currentStatus === 'rejected') {
    const isRejected = currentStatus === 'rejected';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl text-center">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-md ${isRejected ? 'bg-rose-50 border border-rose-200' : 'bg-amber-50 border border-amber-200'}`}>
            {isRejected ? (
              <span className="text-3xl text-rose-500 font-bold">✕</span>
            ) : (
              <span className="text-3xl text-amber-500 font-bold animate-spin">⏳</span>
            )}
          </div>

          <h2 className="text-2xl font-black text-stone-900 mb-2">
            {isRejected ? 'Profile Application Rejected' : 'Profile Under Review'}
          </h2>
          
          <p className="text-stone-600 text-sm mb-6">
            {isRejected 
              ? 'Unfortunately, your registration request has been rejected by the administrator. Please contact clinic support for details.' 
              : 'Thank you for submitting your profile details. The administrator of the clinic is currently verifying your details and setting up your shifts. You will receive an alert once approved.'}
          </p>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-stone-900 text-white rounded-2xl text-xs font-bold hover:bg-stone-850 cursor-pointer shadow-md transition-all"
          >
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  // Registration profile questionnaire
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white tracking-tight">Onboarding Profile Questionnaire</h1>
          <p className="text-indigo-200 text-sm mt-1">Provide your professional qualification details to unlock receptionist dashboard</p>
        </div>

        <StepsProgress currentStatus={currentStatus} />

        <div className="bg-white/95 dark:bg-stone-800 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-stone-200/50 dark:border-stone-700/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {successMsg && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold">
                ✓ {successMsg}
              </div>
            )}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-250 text-rose-800 text-xs font-bold">
                ⚠️ {error}
              </div>
            )}

            {/* Step 1: Details & Upload */}
            {formStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Step 1: Qualifications & Uploads</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Select Hospital Organization</label>
                      <select
                        value={organizationId}
                        onChange={(e) => setOrganizationId(e.target.value)}
                        className={getFieldClass('organizationId')}
                        required
                      >
                        <option value="" disabled>Choose organization...</option>
                        {organizations.map(org => (
                          <option key={org._id} value={org._id}>{org.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Highest Qualification</label>
                      <input
                        type="text"
                        placeholder="e.g. Bachelor of Commerce, Diploma in Administration"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        className={getFieldClass('qualification')}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        className={getFieldClass('experienceYears')}
                      />
                    </div>
                  </div>
                </div>

                {/* Upload pdf documents */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-2">Passport Size Photo (Image)</label>
                    <div className="flex items-center gap-4">
                      {image ? (
                        <img src={image} alt="Profile" className="w-16 h-16 rounded-2xl object-cover border" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center border text-2xl">👤</div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'image')}
                        className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white hover:file:bg-stone-850 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-2">Qualification Certificate (PDF Only)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, 'pdf')}
                        className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white hover:file:bg-stone-850 cursor-pointer"
                      />
                    </div>
                    {pdfName && <p className="text-[10px] text-indigo-600 font-mono font-semibold mt-1">📄 {pdfName}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Address pinpoint on Map */}
            {formStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Step 2: Location Map Coordinates</h3>
                  <p className="text-xs text-stone-500 mb-4">Please pinpoint your current address coordinates on the map.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        placeholder="House / Apartment no, Street"
                        value={currentAddress.line1}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, line1: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                        required
                      />
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button type="button" onClick={() => openMap('current')} className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors shadow-sm">
                          Select on Map
                        </button>
                        {currentAddress.latitude && currentAddress.longitude ? (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1">
                            📍 Located ({currentAddress.latitude.toFixed(4)}, {currentAddress.longitude.toFixed(4)})
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
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={currentAddress.city}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, city: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">State</label>
                      <input
                        type="text"
                        placeholder="State"
                        value={currentAddress.state}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, state: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Pincode</label>
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={currentAddress.pincode}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, pincode: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Country</label>
                      <input
                        type="text"
                        value={currentAddress.country}
                        onChange={(e) => setCurrentAddress({ ...currentAddress, country: e.target.value })}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                        required
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
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
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
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                          required={!isSameAddress}
                        />
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <button type="button" onClick={() => openMap('permanent')} className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors shadow-sm">
                            Select on Map
                          </button>
                          {permanentAddress.latitude && permanentAddress.longitude ? (
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1">
                              📍 Located ({permanentAddress.latitude.toFixed(4)}, {permanentAddress.longitude.toFixed(4)})
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
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">City</label>
                        <input
                          type="text"
                          placeholder="City"
                          value={permanentAddress.city}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, city: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                          required={!isSameAddress}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">State</label>
                        <input
                          type="text"
                          placeholder="State"
                          value={permanentAddress.state}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, state: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                          required={!isSameAddress}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Pincode</label>
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={permanentAddress.pincode}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, pincode: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                          required={!isSameAddress}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Country</label>
                        <input
                          type="text"
                          value={permanentAddress.country}
                          onChange={(e) => setPermanentAddress({ ...permanentAddress, country: e.target.value })}
                          className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-3 text-sm text-stone-900 dark:text-white dark:placeholder-stone-400 outline-none focus:border-indigo-500"
                          required={!isSameAddress}
                        />
                      </div>
                    </div>
                  )}

                  <MapPicker
                    isOpen={!!mapOpenFor}
                    onClose={closeMap}
                    onSelectAddress={handleMapSelect}
                    initialAddress={mapOpenFor === 'current' ? currentAddress : permanentAddress}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Preferred Location */}
            {formStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Step 3: Branch Location Preference</h3>
                
                {orgClinics.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-amber-50 text-amber-800 text-xs text-center border border-amber-200">
                    Please select an organization in Step 1 to view clinic branches.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Select Preferred Clinic Branch</label>
                      <select
                        value={preferredPracticeLocation}
                        onChange={(e) => setPreferredPracticeLocation(e.target.value)}
                        className="w-full rounded-2xl border border-stone-300 dark:border-stone-600 px-4 py-3 text-sm text-stone-900 dark:text-white bg-white dark:bg-stone-700 outline-none focus:border-indigo-500"
                        required
                      >
                        <option value="" disabled>Choose preferred branch...</option>
                        {orgClinics.map((clinic) => (
                          <option key={clinic._id} value={clinic._id}>
                            {clinic.name} ({clinic.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {orgClinics.map((clinic) => {
                        const isSelected = preferredPracticeLocation === clinic._id;
                        return (
                          <div 
                            key={clinic._id}
                            onClick={() => setPreferredPracticeLocation(clinic._id)}
                            className={`rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                              isSelected ? 'border-indigo-600 bg-indigo-50/10' : 'border-stone-200 bg-white'
                            }`}
                          >
                            <img 
                              src={getClinicImage(clinic)} 
                              alt={clinic.name}
                              className="w-full h-32 object-cover" 
                            />
                            <div className="p-4">
                              <h4 className="font-bold text-sm text-stone-900">{clinic.name}</h4>
                              <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                                {clinic.address?.line1 || ''}, {clinic.address?.city || ''}
                              </p>
                              <div className="mt-4 flex gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreferredPracticeLocation(clinic._id);
                                  }}
                                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                  }`}
                                >
                                  {isSelected ? '✓ Preferred' : 'Select Branch'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation and Actions */}
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
                    className="rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-lg transition cursor-pointer"
                  >
                    Submit for Approval
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistOnboarding;
