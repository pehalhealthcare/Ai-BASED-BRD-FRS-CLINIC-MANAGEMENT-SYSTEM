import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { staffApi } from '../../lib/api';
import {
  User, Briefcase, Clock, FileText, CheckCircle, ArrowRight, ArrowLeft, LogOut, Sparkles, Check, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import MapPicker from '../../components/common/MapPicker';

const StaffOnboardingWizard = () => {
  const { user, logout, refreshUser } = useAuth();


  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form States
  const [personal, setPersonal] = useState({
    fullName: user?.name || '',
    gender: 'male',
    dob: '',
    phone: user?.phone || '',
    image: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      latitude: null,
      longitude: null
    }
  });

  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleMapSelect = (addr) => {
    setPersonal(prev => ({
      ...prev,
      address: {
        ...prev.address,
        line1: addr.line1 || prev.address.line1,
        line2: addr.line2 || prev.address.line2,
        city: addr.city || prev.address.city,
        state: addr.state || prev.address.state,
        pincode: addr.pincode || prev.address.pincode,
        country: addr.country || prev.address.country || 'India',
        latitude: addr.latitude,
        longitude: addr.longitude
      }
    }));
  };

  const [professional, setProfessional] = useState({
    qualification: '',
    experienceYears: 1,
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    governmentIdNumber: ''
  });

  const [availability, setAvailability] = useState({
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    slots: [
      { dayOfWeek: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'thursday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'friday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'saturday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' }
    ]
  });

  const [documents, setDocuments] = useState({
    governmentId: '',
    certificationsPdf: '',
    signatureImage: ''
  });

  useEffect(() => {
    if (user) {
      setPersonal(prev => ({ 
        ...prev, 
        fullName: user.name || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  const handleFileChange = (e, section, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (section === 'personal') {
        setPersonal(prev => ({ ...prev, [field]: reader.result }));
      } else {
        setDocuments(prev => ({ ...prev, [field]: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    // Basic validation for Step 1
    if (step === 1) {
      if (!personal.fullName || !personal.dob || !personal.address.line1 || !personal.address.city || !personal.address.pincode) {
        toast.error('Please fill all required personal information and address details.');
        return;
      }
    }
    // Basic validation for Step 2
    if (step === 2) {
      if (!professional.emergencyName || !professional.emergencyPhone || !professional.governmentIdNumber) {
        toast.error('Please enter emergency contact and government ID details.');
        return;
      }
    }
    // Basic validation for Step 3
    if (step === 3) {
      if (!professional.qualification) {
        toast.error('Please enter your qualification details.');
        return;
      }
      if (!documents.governmentId) {
        toast.error('Please upload a copy of your Government ID.');
        return;
      }
    }

    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleWorkingDay = (day) => {
    const isAvail = availability.workingDays.includes(day);
    let updatedDays = [...availability.workingDays];
    if (isAvail) {
      updatedDays = updatedDays.filter(d => d !== day);
    } else {
      updatedDays.push(day);
    }
    const updatedSlots = availability.slots.map(slot => {
      if (slot.dayOfWeek === day) {
        return { ...slot, isAvailable: !isAvail };
      }
      return slot;
    });

    setAvailability(prev => ({
      ...prev,
      workingDays: updatedDays,
      slots: updatedSlots
    }));
  };

  const handleTimeChange = (day, field, value) => {
    const updatedSlots = availability.slots.map(slot => {
      if (slot.dayOfWeek === day) {
        return { ...slot, [field]: value };
      }
      return slot;
    });
    setAvailability(prev => ({ ...prev, slots: updatedSlots }));
  };

  const handleSubmit = async () => {
    // Client-side validations
    if (!personal.fullName?.trim()) {
      toast.error('Full Name is required for submission.');
      setStep(1);
      return;
    }
    if (!personal.dob) {
      toast.error('Date of Birth is required for submission.');
      setStep(1);
      return;
    }
    if (!personal.address.line1?.trim()) {
      toast.error('Address is required for submission.');
      setStep(1);
      return;
    }
    if (!professional.qualification?.trim()) {
      toast.error('Highest Qualification / Degree is required for submission.');
      setStep(3);
      return;
    }
    if (!documents.governmentId) {
      toast.error('Government ID scan is required for submission.');
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firstName: personal.fullName.split(' ')[0],
        lastName: personal.fullName.split(' ').slice(1).join(' ') || '',
        fullName: personal.fullName,
        gender: personal.gender,
        dateOfBirth: personal.dob,
        phone: personal.phone,
        image: personal.image,
        currentAddress: {
          ...personal.address,
          latitude: personal.address.latitude || 20.5937,
          longitude: personal.address.longitude || 78.9629
        },
        permanentAddress: {
          ...personal.address,
          latitude: personal.address.latitude || 20.5937,
          longitude: personal.address.longitude || 78.9629
        },
        qualification: professional.qualification,
        experienceYears: professional.experienceYears,
        availability: availability.slots,
        documentPdf: documents.governmentId,
        signatureImage: documents.signatureImage,
        certificationsPdf: documents.certificationsPdf
      };

      await staffApi.updateMyProfile(payload);
      await staffApi.submitMyProfile(payload);

      // Update localStorage with fresh user (pending_approval status) before reloading
      await refreshUser();

      toast.success('Onboarding profile submitted! Awaiting Clinic Admin approval.');

      // Force a full page reload so RoleDashboardPage reads the fresh
      // pending_approval status and shows the "Waiting for Review" screen
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 1200);

    } catch (error) {
      console.error('Onboarding submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit onboarding profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-white font-sans">
      {/* Header */}
      <header className="bg-slate-950 border-b border-stone-850 py-4 px-6 md:px-8 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-md">
            <User className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">AI-CMS Staff Network</h1>
            <span className="text-[10px] text-stone-400 mt-1 block">Staff Profile Onboarding</span>
          </div>
        </div>
        <button onClick={logout} className="px-4 py-2 border border-stone-800 bg-stone-900/50 hover:bg-stone-900 rounded-xl text-xs font-bold text-stone-300 flex items-center gap-1.5 transition">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      {/* Main Form Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6 relative z-10">
        {/* Warning corrections banner */}
        {['changes_requested', 're_edit'].includes(user?.approvalStatus) && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-white">Corrections Requested by Clinic Admin</h3>
              <p className="text-xs text-rose-300 leading-relaxed font-semibold italic bg-slate-900/50 p-3 rounded-xl border border-rose-500/10 mt-2">
                "{user.reEditComments || 'Please check your submitted details and uploaded documents for accuracy.'}"
              </p>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { stepNum: 1, label: 'Personal Info', icon: User },
            { stepNum: 2, label: 'Security & Verification', icon: Briefcase },
            { stepNum: 3, label: 'Professional & Certs', icon: FileText }
          ].map(s => {
            const Icon = s.icon;
            const isActive = step === s.stepNum;
            const isCompleted = step > s.stepNum;
            return (
              <div key={s.stepNum} className="flex flex-col gap-2">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-emerald-500' : isCompleted ? 'bg-teal-650' : 'bg-stone-800'
                }`} />
                <div className="hidden md:flex items-center gap-2 px-1 text-left">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border text-[10px] font-bold ${
                    isActive
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : isCompleted
                      ? 'bg-teal-500/20 border-teal-500/40 text-teal-400'
                      : 'border-stone-800 text-stone-500'
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3" /> : s.stepNum}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? 'text-white' : isCompleted ? 'text-stone-400' : 'text-stone-600'
                  }`}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Wizard Box */}
        <div className="bg-slate-950 border border-stone-850 rounded-3xl p-6 md:p-8 shadow-2xl relative">
          
          <div className="min-h-[300px]">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-white">Personal Information</h2>
                  <p className="text-xs text-stone-400 mt-1">Please enter your basic identity, date of birth, and address details.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Photo upload */}
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-stone-850 p-4 rounded-3xl bg-stone-900/20 shrink-0">
                    {personal.image ? (
                      <img src={personal.image} alt="Staff profile" className="w-24 h-24 rounded-2xl object-cover border border-stone-800" />
                    ) : (
                      <div className="w-24 h-24 bg-stone-850 border border-stone-800 rounded-2xl flex items-center justify-center">
                        <User className="w-10 h-10 text-stone-600" />
                      </div>
                    )}
                    <label className="mt-4 px-4 py-1.5 bg-stone-800 hover:bg-stone-750 text-white rounded-xl text-[10px] font-bold cursor-pointer transition">
                      Upload Photo
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'personal', 'image')} />
                    </label>
                  </div>

                  {/* Form fields */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">Full Name *</label>
                      <input type="text" value={personal.fullName} onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">Gender *</label>
                      <select value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">Date of Birth *</label>
                      <input type="date" value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">Contact Phone *</label>
                      <input type="text" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                    </div>
                  </div>
                </div>

                {/* Address block */}
                <div className="border-t border-stone-850 pt-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Current Residential Address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">Address Line 1 *</label>
                      <input type="text" value={personal.address.line1} onChange={(e) => setPersonal({ ...personal, address: { ...personal.address, line1: e.target.value } })}
                        placeholder="House, apartment, road details" className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          className="px-4 py-2 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-sm"
                        >
                          Select on Map
                        </button>
                        {personal.address.latitude && personal.address.longitude ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                            📍 Located ({personal.address.latitude.toFixed(4)}, {personal.address.longitude.toFixed(4)})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-stone-500 bg-stone-900/50 px-2.5 py-1.5 rounded-lg border border-stone-850 flex items-center gap-1">
                            ⚠️ Map Location Optional (Default Coords will be used)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">City *</label>
                      <input type="text" value={personal.address.city} onChange={(e) => setPersonal({ ...personal, address: { ...personal.address, city: e.target.value } })}
                        className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">State *</label>
                      <input type="text" value={personal.address.state} onChange={(e) => setPersonal({ ...personal, address: { ...personal.address, state: e.target.value } })}
                        className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 mb-1">Pincode *</label>
                      <input type="text" value={personal.address.pincode} onChange={(e) => setPersonal({ ...personal, address: { ...personal.address, pincode: e.target.value } })}
                        className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Emergency Contact & Verification ID */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-white">Security &amp; Emergency Contact</h2>
                  <p className="text-xs text-stone-400 mt-1">Provide emergency relative details and identity proof parameters.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 mb-1">Emergency Contact Full Name *</label>
                    <input type="text" value={professional.emergencyName} onChange={(e) => setProfessional({ ...professional, emergencyName: e.target.value })}
                      placeholder="Name of contact person" className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 mb-1">Relationship to Contact *</label>
                    <input type="text" value={professional.emergencyRelation} onChange={(e) => setProfessional({ ...professional, emergencyRelation: e.target.value })}
                      placeholder="e.g. Spouse, Father, Sibling" className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 mb-1">Emergency Contact Phone Number *</label>
                    <input type="text" value={professional.emergencyPhone} onChange={(e) => setProfessional({ ...professional, emergencyPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 mb-1">Government ID Card Number (Aadhaar/PAN) *</label>
                    <input type="text" value={professional.governmentIdNumber} onChange={(e) => setProfessional({ ...professional, governmentIdNumber: e.target.value })}
                      placeholder="National ID identity number" className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Professional Credentials & Uploads */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-white">Qualifications &amp; Document Uploads</h2>
                  <p className="text-xs text-stone-400 mt-1">Upload files of ID proof, professional qualification degrees, and signature details.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 mb-1">Highest Qualification / Degree *</label>
                    <input type="text" value={professional.qualification} onChange={(e) => setProfessional({ ...professional, qualification: e.target.value })}
                      placeholder="e.g. B.Pharm, GNM Nursing, MBA" className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 mb-1">Years of Relevant Experience *</label>
                    <input type="number" value={professional.experienceYears} onChange={(e) => setProfessional({ ...professional, experienceYears: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-4">
                  {/* Government ID scan */}
                  <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-2xl flex flex-col justify-between min-h-[130px]">
                    <div>
                      <span className="block text-[11px] font-bold text-stone-300">Government ID Scan *</span>
                      <span className="block text-[10px] text-stone-500 mt-1">Aadhaar/PAN Card PDF copy</span>
                    </div>
                    <label className="w-full mt-4 py-2 border border-dashed border-stone-700 bg-stone-950 hover:bg-stone-900 rounded-xl text-center text-xs font-bold cursor-pointer text-stone-400 block transition">
                      {documents.governmentId ? '✓ ID Uploaded' : 'Choose File (PDF/JPG)'}
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFileChange(e, 'documents', 'governmentId')} />
                    </label>
                  </div>

                  {/* Certifications PDF */}
                  <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-2xl flex flex-col justify-between min-h-[130px]">
                    <div>
                      <span className="block text-[11px] font-bold text-stone-300">Certifications / Licenses</span>
                      <span className="block text-[10px] text-stone-500 mt-1">Registration or license PDF copy</span>
                    </div>
                    <label className="w-full mt-4 py-2 border border-dashed border-stone-700 bg-stone-950 hover:bg-stone-900 rounded-xl text-center text-xs font-bold cursor-pointer text-stone-400 block transition">
                      {documents.certificationsPdf ? '✓ Certifications Uploaded' : 'Choose File (PDF)'}
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileChange(e, 'documents', 'certificationsPdf')} />
                    </label>
                  </div>

                  {/* Digital Signature */}
                  <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-2xl flex flex-col justify-between min-h-[130px]">
                    <div>
                      <span className="block text-[11px] font-bold text-stone-300">Digital Signature</span>
                      <span className="block text-[10px] text-stone-500 mt-1">Upload clear PNG of your signature</span>
                    </div>
                    <label className="w-full mt-4 py-2 border border-dashed border-stone-700 bg-stone-950 hover:bg-stone-900 rounded-xl text-center text-xs font-bold cursor-pointer text-stone-400 block transition">
                      {documents.signatureImage ? '✓ Signature Uploaded' : 'Choose File (PNG)'}
                      <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => handleFileChange(e, 'documents', 'signatureImage')} />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center border-t border-stone-850 pt-6 mt-8">
            <button type="button" onClick={handleBack} disabled={step === 1}
              className="px-5 py-2.5 border border-stone-800 bg-stone-900/30 hover:bg-stone-900 rounded-xl text-stone-300 font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-40">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < 3 ? (
              <button type="button" onClick={handleNext}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                {loading ? 'Submitting profile...' : (
                  <>
                    <Sparkles size={16} />
                    Submit Profile for Approval
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {showMapPicker && (
        <MapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelectAddress={handleMapSelect}
          initialAddress={personal.address}
        />
      )}
    </div>
  );
};

export default StaffOnboardingWizard;
