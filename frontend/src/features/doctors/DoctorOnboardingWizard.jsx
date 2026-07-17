import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { doctorApi, specializationApi } from '../../lib/api';
import {
  User, Briefcase, Clock, FileText, CheckCircle, ArrowRight, ArrowLeft, Upload, LogOut, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const DoctorOnboardingWizard = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableSpecializations, setAvailableSpecializations] = useState([]);

  // Form States
  const [personal, setPersonal] = useState({
    fullName: user?.name || '',
    gender: 'male',
    dob: '',
    image: ''
  });

  const [professional, setProfessional] = useState({
    qualification: '',
    medicalRegistrationNumber: '',
    medicalCouncil: '',
    experienceYears: 1,
    specialization: '',
    subSpeciality: '',
    biography: '',
    languagesSpoken: ''
  });

  const [consultation, setConsultation] = useState({
    consultationFee: 500,
    followUpFee: 200,
    consultationDuration: 15,
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    availability: [
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
    registrationCertificate: '',
    qualificationCertificate: '',
    governmentId: '',
    signature: ''
  });

  useEffect(() => {
    specializationApi.list().then(res => {
      setAvailableSpecializations(res.specializations || res.data?.specializations || []);
    }).catch(() => {});

    // Prefill user data if exists
    if (user) {
      setPersonal(prev => ({ ...prev, fullName: user.name || '' }));
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
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleWorkingDay = (day) => {
    const isAvail = consultation.workingDays.includes(day);
    let updatedDays = [...consultation.workingDays];
    if (isAvail) {
      updatedDays = updatedDays.filter(d => d !== day);
    } else {
      updatedDays.push(day);
    }
    const updatedAvailability = consultation.availability.map(slot => {
      if (slot.dayOfWeek === day) {
        return { ...slot, isAvailable: !isAvail };
      }
      return slot;
    });

    setConsultation(prev => ({
      ...prev,
      workingDays: updatedDays,
      availability: updatedAvailability
    }));
  };

  const handleTimeChange = (day, field, value) => {
    const updatedAvailability = consultation.availability.map(slot => {
      if (slot.dayOfWeek === day) {
        return { ...slot, [field]: value };
      }
      return slot;
    });
    setConsultation(prev => ({ ...prev, availability: updatedAvailability }));
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!professional.qualification || !professional.medicalRegistrationNumber || !professional.specialization) {
      toast.error('Please complete all professional credentials.');
      return;
    }

    setLoading(true);
    try {
      // 1. Submit/Save Doctor Onboarding Info
      const payload = {
        fullName: personal.fullName,
        gender: personal.gender,
        dob: personal.dob,
        image: personal.image, // Profile Photo Base64
        qualification: professional.qualification,
        medicalRegistrationNumber: professional.medicalRegistrationNumber,
        medicalCouncil: professional.medicalCouncil,
        experienceYears: professional.experienceYears,
        specialization: professional.specialization,
        subSpeciality: professional.subSpeciality,
        biography: professional.biography,
        languagesSpoken: professional.languagesSpoken,
        consultationFee: consultation.consultationFee,
        followUpFee: consultation.followUpFee,
        consultationDuration: consultation.consultationDuration,
        availability: consultation.availability,
        documentPdf: documents.registrationCertificate, // Medical Registration Certificate Base64
        qualificationCertificate: documents.qualificationCertificate,
        governmentId: documents.governmentId,
        signature: documents.signature
      };

      // Put to /me/profile and submit
      await doctorApi.updateMyProfile(payload);
      await doctorApi.submitMyProfile();
      await refreshUser();
      
      toast.success('Profile submitted successfully! Awaiting Clinic Admin approval.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md">
            <User className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-none">AI-CMS Doctor Portal</h1>
            <span className="text-[10px] text-slate-400 mt-1 block">Account Activation & Onboarding</span>
          </div>
        </div>
        <button onClick={logout} className="px-4 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      {/* Main Form Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        {/* Step indicator */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { stepNum: 1, label: 'Personal Info', icon: User },
            { stepNum: 2, label: 'Professional Info', icon: Briefcase },
            { stepNum: 3, label: 'Consultation & Availability', icon: Clock },
            { stepNum: 4, label: 'Credentials & Verification', icon: FileText }
          ].map(s => {
            const Icon = s.icon;
            const isActive = step === s.stepNum;
            const isCompleted = step > s.stepNum;
            return (
              <div key={s.stepNum} className="flex flex-col gap-2">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-blue-600' : isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <div className="hidden sm:flex items-center gap-1.5 mt-1">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {isCompleted ? <Check className="w-2.5 h-2.5" /> : s.stepNum}
                  </span>
                  <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Cards */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6 flex-1 flex flex-col justify-between min-h-[460px]">
          <div>
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Personal Information</h2>
                  <p className="text-xs text-slate-400 mt-1">Enter your details to create your public medical practitioner identity.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-350">
                      {personal.image ? (
                        <img src={personal.image} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-slate-400" />
                      )}
                    </div>
                    <label className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> Photo Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'personal', 'image')} />
                    </label>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                      <input type="text" value={personal.fullName} onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Gender *</label>
                        <select value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-gray-800">
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Date of Birth *</label>
                        <input type="date" value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800" required />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Info */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Professional Credentials</h2>
                  <p className="text-xs text-slate-400 mt-1">Fill in your qualifications and medical council registry details.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Specialization / Primary Speciality *</label>
                    <select value={professional.specialization} onChange={(e) => setProfessional({ ...professional, specialization: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800" required>
                      <option value="">Select Speciality</option>
                      {availableSpecializations.map(spec => (
                        <option key={spec._id} value={spec.name}>{spec.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Sub-Speciality (Optional)</label>
                    <input type="text" value={professional.subSpeciality} onChange={(e) => setProfessional({ ...professional, subSpeciality: e.target.value })}
                      placeholder="e.g. Pediatric Cardiology" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Qualification Degree *</label>
                    <input type="text" value={professional.qualification} onChange={(e) => setProfessional({ ...professional, qualification: e.target.value })}
                      placeholder="e.g. MBBS, MD (General Medicine)" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Years of Experience *</label>
                    <input type="number" value={professional.experienceYears} onChange={(e) => setProfessional({ ...professional, experienceYears: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Medical Registration Number *</label>
                    <input type="text" value={professional.medicalRegistrationNumber} onChange={(e) => setProfessional({ ...professional, medicalRegistrationNumber: e.target.value })}
                      placeholder="Registration ID" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Medical Council *</label>
                    <input type="text" value={professional.medicalCouncil} onChange={(e) => setProfessional({ ...professional, medicalCouncil: e.target.value })}
                      placeholder="e.g. Medical Council of India" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Languages Spoken *</label>
                    <input type="text" value={professional.languagesSpoken} onChange={(e) => setProfessional({ ...professional, languagesSpoken: e.target.value })}
                      placeholder="e.g. English, Hindi, Spanish" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Biography / Short Summary</label>
                    <textarea rows="3" value={professional.biography} onChange={(e) => setProfessional({ ...professional, biography: e.target.value })}
                      placeholder="Short professional overview..." className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800 resize-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Consultation & Availability */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Consultation parameters</h2>
                  <p className="text-xs text-slate-400 mt-1">Configure standard patient consulting charges and timing schedule.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Consultation Fee (₹) *</label>
                    <input type="number" value={consultation.consultationFee} onChange={(e) => setConsultation({ ...consultation, consultationFee: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Follow-up Fee (₹)</label>
                    <input type="number" value={consultation.followUpFee} onChange={(e) => setConsultation({ ...consultation, followUpFee: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Consultation Duration (Mins) *</label>
                    <select value={consultation.consultationDuration} onChange={(e) => setConsultation({ ...consultation, consultationDuration: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800">
                      <option value={10}>10 Minutes</option>
                      <option value={15}>15 Minutes</option>
                      <option value={20}>20 Minutes</option>
                      <option value={30}>30 Minutes</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <span className="block text-[11px] font-bold text-slate-700 mb-1">Weekly availability *</span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {consultation.availability.map((slot) => {
                      const isAvail = consultation.workingDays.includes(slot.dayOfWeek);
                      return (
                        <div key={slot.dayOfWeek} className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-150 rounded-2xl text-xs">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={isAvail} onChange={() => toggleWorkingDay(slot.dayOfWeek)} />
                            <span className="font-bold text-slate-800 capitalize">{slot.dayOfWeek}</span>
                          </label>
                          {isAvail ? (
                            <div className="flex items-center gap-2">
                              <input type="time" value={slot.startTime} onChange={(e) => handleTimeChange(slot.dayOfWeek, 'startTime', e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]" />
                              <span className="text-slate-400">to</span>
                              <input type="time" value={slot.endTime} onChange={(e) => handleTimeChange(slot.dayOfWeek, 'endTime', e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">Not Available</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Documents Upload & Verification */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Documents Verification</h2>
                  <p className="text-xs text-slate-400 mt-1">Upload files of registration certificates and credentials for approval verification.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between min-h-[120px]">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-700">Medical Registration Certificate *</span>
                      <span className="block text-[10px] text-slate-400 mt-1">Compulsory registration certificate copy</span>
                    </div>
                    <label className="w-full mt-4 py-2 border border-dashed border-slate-350 hover:bg-slate-100 rounded-xl text-center text-xs font-bold cursor-pointer text-slate-600 block transition">
                      {documents.registrationCertificate ? '✓ File Uploaded' : 'Choose / Upload File'}
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFileChange(e, 'documents', 'registrationCertificate')} />
                    </label>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between min-h-[120px]">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-700">Qualification Certificates *</span>
                      <span className="block text-[10px] text-slate-400 mt-1">Copy of MD/MBBS degree certificates</span>
                    </div>
                    <label className="w-full mt-4 py-2 border border-dashed border-slate-350 hover:bg-slate-100 rounded-xl text-center text-xs font-bold cursor-pointer text-slate-600 block transition">
                      {documents.qualificationCertificate ? '✓ File Uploaded' : 'Choose / Upload File'}
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFileChange(e, 'documents', 'qualificationCertificate')} />
                    </label>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between min-h-[120px]">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-700">Government ID *</span>
                      <span className="block text-[10px] text-slate-400 mt-1">Aadhaar Card, Passport or National ID card</span>
                    </div>
                    <label className="w-full mt-4 py-2 border border-dashed border-slate-350 hover:bg-slate-100 rounded-xl text-center text-xs font-bold cursor-pointer text-slate-600 block transition">
                      {documents.governmentId ? '✓ File Uploaded' : 'Choose / Upload File'}
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => handleFileChange(e, 'documents', 'governmentId')} />
                    </label>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between min-h-[120px]">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-700">Digital Signature (Optional)</span>
                      <span className="block text-[10px] text-slate-400 mt-1">Used on prescriptions PDFs</span>
                    </div>
                    <label className="w-full mt-4 py-2 border border-dashed border-slate-350 hover:bg-slate-100 rounded-xl text-center text-xs font-bold cursor-pointer text-slate-600 block transition">
                      {documents.signature ? '✓ File Uploaded' : 'Choose / Upload Signature'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'documents', 'signature')} />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-8">
            <button type="button" onClick={handleBack} disabled={step === 1}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-800 font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-40">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < 4 ? (
              <button type="button" onClick={handleNext}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-50">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-50 disabled:opacity-50">
                {loading ? 'Submitting Credentials...' : 'Submit Profile for Verification'} <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorOnboardingWizard;
