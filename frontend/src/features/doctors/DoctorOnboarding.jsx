import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { doctorApi, specializationApi, organizationApi } from '../../lib/api';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800';

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

const DoctorOnboarding = ({ onProfileStatusChange }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [specializationsList, setSpecializationsList] = useState([]);

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

  const loadProfile = async () => {
    try {
      const [profileRes, specsRes, orgsRes] = await Promise.all([
        doctorApi.getMyProfile(),
        specializationApi.list(),
        organizationApi.getPublic()
      ]);
      
      const doc = profileRes.data?.doctor;
      setProfile(doc);
      setSpecializationsList(specsRes.data?.specializations || []);
      setOrganizations(orgsRes.data?.organizations || []);

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
    organizationId
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
    e.preventDefault();
    setSuccessMsg('');
    setError('');

    if (!organizationId) {
      setError('Organization selection is required.');
      return;
    }

    if (!documentPdf) {
      setError('Compulsory registration documents (PDF) must be uploaded.');
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

  if (loading) {
    return <LoadingState label="Loading onboarding wizard..." />;
  }

  if (error && !profile) {
    return <ErrorState title="Dashboard Offline" description={error} />;
  }

  // Approved but slot not accepted yet -> Celebration screen!
  if (currentStatus === 'approved' && !profile?.hasAcceptedSlot) {
    const clinic = profile.clinicId || {};

    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-white border border-stone-200 shadow-2xl text-center relative overflow-hidden">
        {/* Confetti/Stars visual simulation */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500"></div>
        
        <div className="w-24 h-24 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mb-6 animate-bounce">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-4xl font-black text-stone-900 mb-3 tracking-tight">Hurray!</h2>
        <h3 className="text-xl font-bold text-emerald-700 mb-6">You are successfully verified by admin!</h3>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-left space-y-4 mb-8">
          <div className="border-b border-stone-200 pb-3">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Assigned Practice Venue</span>
            <h4 className="text-lg font-bold text-stone-800 mt-0.5">{clinic.name || 'AI-CMS Branch'}</h4>
            <p className="text-xs text-stone-500 mt-1">{clinic.address?.line1 || ''}, {clinic.address?.city || ''}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-stone-600">
            <div>
              <span className="text-stone-400 font-semibold block">Clinic Code</span>
              <strong className="text-stone-800 font-mono text-sm">{clinic.code || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-stone-400 font-semibold block">Reception Contact</span>
              <strong className="text-stone-800 text-sm">{clinic.phone || 'N/A'}</strong>
            </div>
          </div>
          <div className="border-t border-stone-200 pt-3">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Assigned Practice Slots</span>
            <div className="space-y-1.5 mt-2 bg-white rounded-xl p-3 border border-stone-150">
              {profile?.availability?.filter(slot => slot.isAvailable).map((slot) => (
                <div key={slot.dayOfWeek} className="flex justify-between items-center text-xs py-1 border-b border-stone-100 last:border-0">
                  <span className="capitalize font-bold text-stone-700">{slot.dayOfWeek}</span>
                  <span className="text-stone-600 font-semibold">
                    {slot.startTime} - {slot.endTime} <span className="text-stone-400 font-normal">({slot.slotDurationMinutes} min slots)</span>
                  </span>
                </div>
              ))}
              {(!profile?.availability || profile.availability.filter(s => s.isAvailable).length === 0) && (
                <p className="text-xs text-stone-400 italic">No active slots configured.</p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleAcceptSlot}
          className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
        >
          Accept & Open Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-6 p-6 md:p-8 rounded-3xl bg-white border border-stone-200 shadow-xl">
      {/* Steps Visual Header */}
      <StepsProgress currentStatus={currentStatus} />

      <div className="mb-8 border-b border-stone-100 pb-5">
        <h2 className="text-3xl font-black text-stone-900 tracking-tight">Complete Doctor Profile</h2>
        <p className="text-stone-500 text-sm mt-1">Please enter your professional details and upload verification documents to submit your application.</p>
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
          <h3 className="text-lg font-bold text-stone-900">Waiting for Admin Approval</h3>
          <p className="text-stone-500 text-sm mt-2 max-w-md mx-auto">
            Your credentials have been submitted and are under validation. The dashboard will unlock once the admin assigns you to a clinic.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Professional info */}
          <div>
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">1. Professional Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-600 mb-1">
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
                <label className="block text-xs font-semibold text-stone-600 mb-1">
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
                <label className="block text-xs font-semibold text-stone-600 mb-1">
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
                  {/* Fallback option if current doctor specialization isn't matched in the current active list */}
                  {specialization && !specializationsList.some((s) => s.name === specialization) && (
                    <option value={specialization}>{specialization}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
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
                <label className="block text-xs font-semibold text-stone-600 mb-1">Years of Experience</label>
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

          {/* Section 2: Consultation Info */}
          <div>
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">2. Consultation Fees & Formats</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Consultation Fee (₹)</label>
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
                <label className="block text-xs font-semibold text-stone-600 mb-1">Follow-up Fee (₹)</label>
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
                <label htmlFor="isOnlineAvailable" className="text-sm font-semibold text-stone-700 cursor-pointer">
                  Available for Teleconsultation / Online Consultations
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Document uploads */}
          <div>
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">3. Profile & Credential Uploads</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-stone-100">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-2xl border border-stone-300 px-6 py-3.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/15 transition cursor-pointer"
            >
              Submit for Approval
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default DoctorOnboarding;
