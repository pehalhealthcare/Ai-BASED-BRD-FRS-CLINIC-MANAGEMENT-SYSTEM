import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clinicApi, promoApi } from '../../lib/api';
import {
  User, Mail, Phone, Lock, Calendar, MapPin,
  Check, ArrowRight, ArrowLeft, ShieldCheck,
  Clock, Globe, CheckCircle, HelpCircle, UploadCloud, Building2, X, RefreshCw,
  Eye, EyeOff, Shield, Sparkles, MessageSquare, CreditCard, PhoneCall, CheckSquare
} from 'lucide-react';
import MapPicker from '../../components/common/MapPicker';
import PehalLogo from '../../components/common/PehalLogo';
import { motion, AnimatePresence } from 'framer-motion';

const validateDOB = (dateStr) => {
  if (!dateStr) return { valid: false, error: 'Date of birth is required.' };
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return { valid: false, error: 'Please enter a valid date of birth.' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob > today) return { valid: false, error: 'Date of birth cannot be a future date.' };
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  if (age < 18) return { valid: false, error: 'You must be at least 18 years old to register.' };
  return { valid: true };
};

const STEPS = [
  { id: 1, name: 'Owner Details', desc: 'Provide the owner/administrator details who will manage this clinic.', duration: '2 min' },
  { id: 2, name: 'Clinic Details', desc: 'Identify your medical practice and setup configurations.', duration: '2 min' },
  { id: 3, name: 'Plan Selection', desc: 'Choose a subscription plan to access AI-CMS.', duration: '1 min' },
  { id: 4, name: 'Review & Submit', desc: 'Verify all parameters before launching.', duration: '1 min' }
];

export default function ClinicRegister() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [mapTarget, setMapTarget] = useState('clinic');
  const [ownerEmailValidation, setOwnerEmailValidation] = useState(null);
  const [ownerPhoneValidation, setOwnerPhoneValidation] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailTimeout = useRef(null);
  const phoneTimeout = useRef(null);

  // Form states
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    designation: 'Medical Director',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'Male',
    nationality: 'Indian',
    preferredLanguage: 'English',
    aadhaar: '',
    pan: '',
    address: '',
    profilePhoto: ''
  });

  const [clinicForm, setClinicForm] = useState({
    name: '',
    registrationNumber: '',
    establishedYear: '',
    consultationMode: 'Hybrid',
    languagesSpoken: 'English, Hindi',
    addressLine1: '',
    pincode: '',
    city: '',
    state: '',
    contactNumber: '',
    shortDescription: '',
    logo: '',
    specialties: 'General Medicine',
    latitude: 12.9716,
    longitude: 77.5946
  });

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [regNumValidation, setRegNumValidation] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [localPreviews, setLocalPreviews] = useState({ logo: '', profilePhoto: '' });
  const [errors, setErrors] = useState({});

  // OTP Verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResent, setOtpResent] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await clinicApi.getRegistrationPlans();
        const availablePlans = response.data?.plans || [];
        setPlans(availablePlans);
        if (availablePlans.length > 0) {
          const professional = availablePlans.find(p => p.code === 'PROFESSIONAL') || availablePlans[0];
          setSelectedPlanId(professional._id);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      }
    };
    fetchPlans();
  }, []);

  const handleValidateEmail = (emailVal) => {
    if (emailTimeout.current) clearTimeout(emailTimeout.current);
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setOwnerEmailValidation(null);
      return;
    }
    setOwnerEmailValidation({ status: 'checking', message: '' });
    emailTimeout.current = setTimeout(async () => {
      try {
        const res = await clinicApi.validateEmail({ email: emailVal });
        setOwnerEmailValidation(res.data?.isUnique ? { status: 'valid', message: '' } : { status: 'invalid', message: 'Email already registered.' });
      } catch (err) {
        setOwnerEmailValidation(null);
      }
    }, 500);
  };

  const handleValidatePhone = (phoneVal) => {
    if (phoneTimeout.current) clearTimeout(phoneTimeout.current);
    const cleaned = phoneVal.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setOwnerPhoneValidation(null);
      return;
    }
    setOwnerPhoneValidation({ status: 'checking', message: '' });
    phoneTimeout.current = setTimeout(async () => {
      try {
        const res = await clinicApi.validatePhone({ phone: cleaned });
        setOwnerPhoneValidation(res.data?.isUnique ? { status: 'valid', message: '' } : { status: 'invalid', message: 'Mobile number already registered.' });
      } catch (err) {
        setOwnerPhoneValidation(null);
      }
    }, 500);
  };

  const handleValidateRegNumber = async (regVal) => {
    if (!regVal.trim()) {
      setRegNumValidation(null);
      return;
    }
    setRegNumValidation({ status: 'checking', message: '' });
    try {
      const res = await clinicApi.validateRegistrationNumber({ registrationNumber: regVal });
      setRegNumValidation(res.data?.isUnique ? { status: 'valid', message: '' } : { status: 'invalid', message: 'Registration number already taken.' });
    } catch (err) {
      setRegNumValidation(null);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Content = reader.result;
        const res = await clinicApi.uploadFile({
          file_data: base64Content,
          file_name: file.name
        });
        const fileRef = res.data?.fileRef;
        if (type === 'logo') {
          setClinicForm(prev => ({ ...prev, logo: fileRef }));
          setLocalPreviews(prev => ({ ...prev, logo: base64Content }));
        } else {
          setOwnerForm(prev => ({ ...prev, profilePhoto: fileRef }));
          setLocalPreviews(prev => ({ ...prev, profilePhoto: base64Content }));
        }
      } catch (err) {
        console.error('File upload failed:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMapLocationSelect = (addrObj) => {
    if (mapTarget === 'clinic') {
      setClinicForm(prev => ({
        ...prev,
        addressLine1: addrObj.street || prev.addressLine1,
        city: addrObj.city || prev.city,
        state: addrObj.state || prev.state,
        pincode: addrObj.pincode || prev.pincode,
        latitude: addrObj.latitude || prev.latitude,
        longitude: addrObj.longitude || prev.longitude
      }));
    } else if (mapTarget === 'owner') {
      const formatted = `${addrObj.street || ''}, ${addrObj.city || ''}, ${addrObj.state || ''} - ${addrObj.pincode || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '');
      setOwnerForm(prev => ({
        ...prev,
        address: formatted
      }));
      if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
    }
    setShowMapPicker(false);
  };

  const validateStepOne = async () => {
    const newErrors = {};
    if (!ownerForm.name.trim()) newErrors.name = 'Owner name is required.';
    if (!ownerForm.email.trim()) newErrors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerForm.email)) newErrors.email = 'Invalid email address.';
    if (!ownerForm.phone.trim()) newErrors.phone = 'Mobile number is required.';
    else if (ownerForm.phone.replace(/\D/g, '').length !== 10) newErrors.phone = 'Mobile number must be exactly 10 digits.';
    if (!ownerForm.password) newErrors.password = 'Password is required.';
    else if (ownerForm.password.length < 8) newErrors.password = 'Password must be at least 8 characters.';
    if (ownerForm.password !== ownerForm.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    
    const dobVal = validateDOB(ownerForm.dob);
    if (!dobVal.valid) newErrors.dob = dobVal.error;

    if (ownerForm.aadhaar.trim()) {
      if (ownerForm.aadhaar.replace(/\D/g, '').length !== 12) newErrors.aadhaar = 'Aadhaar must be exactly 12 digits.';
    }
    if (ownerForm.pan.trim()) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(ownerForm.pan.toUpperCase())) newErrors.pan = 'Invalid PAN format (e.g. ABCDE1234F).';
    }
    if (!ownerForm.address.trim()) newErrors.address = 'Residential address is required.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;

    try {
      const [emailRes, phoneRes] = await Promise.all([
        clinicApi.validateEmail({ email: ownerForm.email }),
        clinicApi.validatePhone({ phone: ownerForm.phone.replace(/\D/g, '') })
      ]);
      if (!emailRes.data.isUnique) newErrors.email = 'Email already registered.';
      if (!phoneRes.data.isUnique) newErrors.phone = 'Mobile number already registered.';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    } catch {
      return false;
    }
  };

  const validateStepTwo = async () => {
    const newErrors = {};
    if (!clinicForm.name.trim()) newErrors.clinicName = 'Clinic official name is required.';
    if (!clinicForm.registrationNumber.trim()) newErrors.registrationNumber = 'Registration number is required.';
    if (!clinicForm.establishedYear) newErrors.establishedYear = 'Establishment year is required.';
    else {
      const year = parseInt(clinicForm.establishedYear, 10);
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear) newErrors.establishedYear = `Must be between 1800 and ${currentYear}.`;
    }
    if (!clinicForm.addressLine1.trim()) newErrors.addressLine1 = 'Street address is required.';
    if (!clinicForm.pincode.trim()) newErrors.pincode = 'Pincode is required.';
    else if (clinicForm.pincode.replace(/\D/g, '').length !== 6) newErrors.pincode = 'Pincode must be exactly 6 digits.';
    if (!clinicForm.city.trim()) newErrors.city = 'City name is required.';
    if (!clinicForm.state.trim()) newErrors.state = 'State name is required.';
    if (!clinicForm.contactNumber.trim()) newErrors.contactNumber = 'Clinic phone number is required.';
    else if (clinicForm.contactNumber.replace(/\D/g, '').length !== 10) newErrors.contactNumber = 'Clinic phone must be exactly 10 digits.';
    if (!clinicForm.shortDescription.trim()) newErrors.shortDescription = 'Clinic description is required.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;

    try {
      const res = await clinicApi.validateRegistrationNumber({ registrationNumber: clinicForm.registrationNumber });
      if (!res.data.isUnique) newErrors.registrationNumber = 'Registration number already registered.';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    } catch {
      return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const valid = await validateStepOne();
      if (valid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await validateStepTwo();
      if (valid) setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!selectedPlanId) {
        alert('Please select a subscription plan');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await clinicApi.saveDraft({
        ownerDetails: ownerForm,
        clinicDetails: clinicForm,
        selectedPlanId,
        billingCycle,
        currentStep
      });
      alert('Draft saved successfully!');
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  const handleSubmit = async () => {
    setWizardError('');
    if (!hasAcceptedTerms) {
      setWizardError('Please accept the registration terms & conditions.');
      return;
    }
    try {
      setIsSubmitting(true);
      await clinicApi.sendOtp({ email: ownerForm.email });
      setShowOtpModal(true);
      setOtpCode('');
      setOtpError('');
      setOtpResent(false);
    } catch (err) {
      setWizardError(err.response?.data?.message || 'Failed to send OTP verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otpCode.trim()) {
      setOtpError('Please enter the verification code.');
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError('');
      await clinicApi.verifyOtp({ email: ownerForm.email, otp: otpCode });

      const payload = {
        ownerDetails: {
          name: ownerForm.name,
          designation: ownerForm.designation,
          phone: ownerForm.phone,
          email: ownerForm.email,
          password: ownerForm.password,
          dob: ownerForm.dob,
          gender: ownerForm.gender,
          address: ownerForm.address,
          aadhaar: ownerForm.aadhaar,
          pan: ownerForm.pan,
          profilePhoto: ownerForm.profilePhoto
        },
        clinicDetails: {
          ...clinicForm,
          specialties: clinicForm.specialties ? clinicForm.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
          languagesSpoken: clinicForm.languagesSpoken ? clinicForm.languagesSpoken.split(',').map(s => s.trim()).filter(Boolean) : [],
          doctorsList: [],
          departmentsList: [],
          branchesList: [],
          staffList: [],
          pharmacyDetails: { name: '', contact: '', active: false },
          labDetails: { name: '', contact: '', active: false },
          aiModules: { voiceTranscription: false, consultationAssistant: false, symptomChecker: false, prescriptionSuggestions: false },
          videoConsultation: { provider: 'Zoom', fee: '0', duration: '15', waitingRoom: false, recording: false, reminders: false }
        },
        selectedPlan: {
          planId: selectedPlanId,
          billingCycle
        }
      };
      await clinicApi.submitRegistration(payload);
      setShowOtpModal(false);
      setSubmitSuccess(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setOtpLoading(true);
      setOtpError('');
      await clinicApi.sendOtp({ email: ownerForm.email });
      setOtpResent(true);
    } catch (err) {
      setOtpError('Failed to resend code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    setPromoError('');
    setPromoApplied(false);
    if (!promoCode.trim()) {
      setPromoError('Please enter a code');
      return;
    }
    try {
      const response = await promoApi.validate({
        code: promoCode.trim(),
        planId: selectedPlanId,
        billingCycle
      });
      setPromoApplied(true);
      setPromoDiscount(response.data.discountAmount || 0);
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Invalid or inapplicable promo code');
    }
  };

  const activePlanObj = plans.find(p => p._id === selectedPlanId);
  const progress = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  // Success view
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="bg-white rounded-3xl p-8 max-w-xl w-full text-center shadow-2xl border border-slate-100 relative z-10 space-y-6">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-inner">
            <CheckCircle className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Registration Submitted</h1>
            <p className="text-sm text-slate-500 leading-relaxed font-semibold">
              Your clinic details have been submitted successfully. Verification usually takes 24–48 hours.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm animate-pulse">
              <Clock className="w-3.5 h-3.5" /> Waiting for Super Admin Approval
            </span>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-lg transition duration-200"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] flex flex-col font-sans" style={{ height: '100dvh', minHeight: '100vh' }}>
      <style>{`
        .cw-scroll { overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: smooth; }
        .cw-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* MAP PICKER PORTAL */}
      <MapPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectAddress={handleMapLocationSelect}
      />

      {/* ── FIXED TOP NAVIGATION ── */}
      <div className="w-full px-5 pt-3 pb-2 shrink-0 z-40 bg-[#F8FAFC]/95 backdrop-blur-md">
        <header className="max-w-[1840px] mx-auto bg-white border border-slate-100 px-5 py-2.5 rounded-full flex items-center justify-between shadow-md">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <PehalLogo variant="primary" height={32} />
            <div className="h-5 w-[1px] bg-slate-200 mx-1.5" />
            <div>
              <span className="text-[11px] font-black text-slate-900 block leading-none">AICMS</span>
              <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase mt-0.5">AI Clinic Management System</span>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="hidden xl:flex items-center gap-1">
            {STEPS.map((s, idx) => {
              const isCompleted = currentStep > s.id;
              const isActive = currentStep === s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => isCompleted && setCurrentStep(s.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all ${
                        isCompleted ? 'bg-green-600 border-green-600 text-white shadow-sm'
                        : isActive ? 'bg-white border-green-500 text-green-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check size={9} /> : s.id}
                    </button>
                    <span className={`block text-[8px] font-black leading-none mt-1 ${
                      isActive ? 'text-green-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                    }`}>{s.name.split(' ')[0]} Step {s.id}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-3.5 h-[1.5px] mx-1 rounded-full ${
                      isCompleted ? 'bg-green-400' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-[11px] font-extrabold transition shadow-sm bg-white cursor-pointer"
            >
              <CheckSquare size={12} /> Save Draft
            </button>
            <Link to="/set-your-clinic" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-[11px] font-extrabold transition bg-white">
              <HelpCircle size={12} /> Help
            </Link>
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-[11px] font-extrabold transition bg-white">
              <PhoneCall size={12} /> Contact Sales
            </Link>
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-full text-[11px] font-extrabold transition">
              <X size={12} /> Exit Setup
            </Link>
          </div>
        </header>
      </div>

      {/* ── 3-COLUMN WORKSPACE ── */}
      <div className="flex-1 max-w-[1840px] w-full mx-auto px-5 py-3 flex flex-col lg:flex-row gap-4" style={{ minHeight: 0, overflow: 'hidden' }}>

        {/* ==================== LEFT SIDEBAR ==================== */}
        <div
          className="cw-scroll w-full lg:w-[22%] shrink-0 flex flex-col gap-4 bg-white border border-slate-150/70 rounded-2xl p-5 shadow-sm"
          style={{ overflowY: 'auto' }}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Clinic Setup</h3>
              <p className="text-[11px] text-slate-400 font-bold leading-normal">Complete all steps to launch your clinic on AICMS</p>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="46" stroke="#E2E8F0" strokeWidth="6.5" fill="transparent" />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="#16A34A"
                    strokeWidth="7"
                    fill="transparent"
                    strokeDasharray="289"
                    animate={{ strokeDashoffset: 289 - (289 * progress) / 100 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-slate-900">{progress}%</span>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase">Completed</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-4 flex items-center gap-1.5">
                <Clock size={12} /> Estimated time: 8 Minutes
              </span>
            </div>

            {/* Vertical timeline steps */}
            <div className="space-y-4 pl-2 relative">
              <div className="absolute top-1 bottom-1 left-[15px] w-[2px] bg-slate-100" />
              {STEPS.map((s) => {
                const isActive = currentStep === s.id;
                const isCompleted = currentStep > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!isCompleted && !isActive}
                    onClick={() => setCurrentStep(s.id)}
                    className="w-full text-left flex gap-3.5 items-start relative z-10 hover:bg-slate-50/50 p-1.5 rounded-xl transition duration-150 group cursor-pointer disabled:cursor-default"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] border transition ${
                      isCompleted ? "bg-green-600 border-green-600 text-white"
                      : isActive ? "bg-green-50 border-green-600 text-green-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {isCompleted ? <Check size={12} /> : s.id}
                    </div>
                    <div className="flex-1">
                      <h5 className={`text-xs font-black leading-tight ${isActive ? "text-green-600" : isCompleted ? "text-slate-700" : "text-slate-400"} group-hover:text-green-600 transition-colors`}>
                        {s.name}
                      </h5>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{isActive ? 'In progress' : isCompleted ? 'Completed' : 'Pending'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Security Parameters */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Security parameters</span>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Shield size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block leading-tight">Secure Cloud</span>
                    <span className="text-[9px] text-slate-400 block">Enterprise grade security</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block leading-tight">HIPAA Ready</span>
                    <span className="text-[9px] text-slate-400 block">Healthcare compliant</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Sparkles size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block leading-tight">AI Powered</span>
                    <span className="text-[9px] text-slate-400 block">Smart automation</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <RefreshCw size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block leading-tight">Auto Backup</span>
                    <span className="text-[9px] text-slate-400 block">Your data is always safe</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <div>
                <span className="text-xs font-black text-slate-800 block">Need Help?</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block leading-relaxed">We're here to help you set up your clinic.</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-slate-200 rounded-xl hover:text-green-600 hover:border-green-200 transition"><MessageSquare size={11} /> Live Chat</a>
                <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-slate-200 rounded-xl hover:text-green-600 hover:border-green-200 transition"><Calendar size={11} /> Book Demo</a>
                <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-slate-200 rounded-xl hover:text-green-600 hover:border-green-200 transition"><Globe size={11} /> Documentation</a>
                <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-slate-200 rounded-xl hover:text-green-600 hover:border-green-200 transition"><Clock size={11} /> Video Guide</a>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== CENTER SCROLLABLE FORM ==================== */}
        <div className="flex-1 lg:w-[56%] flex flex-col bg-white rounded-2xl shadow-md border border-slate-150/80 overflow-hidden">
          {/* Sticky step header inside card */}
          <div className="shrink-0 px-8 pt-7 pb-5 border-b border-slate-100 bg-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={`header-${currentStep}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Step {currentStep} of 4: {STEPS[currentStep - 1]?.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{STEPS[currentStep - 1]?.desc}</p>
                  </div>
                  <div className="w-11 h-11 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                    {currentStep === 1 ? <User className="w-5 h-5" /> : currentStep === 2 ? <Building2 className="w-5 h-5" /> : currentStep === 3 ? <CreditCard className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Scrollable form body */}
          <div className="cw-scroll flex-1 px-8 py-5" style={{ overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {/* ── STEP 1: OWNER DETAILS ── */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <User size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-800 block leading-tight">Personal Information</span>
                          <span className="text-[10px] text-slate-400 font-medium">Basic details about the clinic owner</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Owner Full Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Enter owner full name"
                                className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.name ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={ownerForm.name}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, name: e.target.value });
                                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                }}
                              />
                            </div>
                            {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Designation <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Enter designation (e.g., Doctor, Director)"
                                className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.designation ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={ownerForm.designation}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, designation: e.target.value });
                                  if (errors.designation) setErrors(prev => ({ ...prev, designation: '' }));
                                }}
                              />
                            </div>
                            {errors.designation && <p className="text-[10px] text-rose-500 mt-1">{errors.designation}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                            <input
                              type="date"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.dob ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={ownerForm.dob}
                              onChange={(e) => {
                                setOwnerForm({ ...ownerForm, dob: e.target.value });
                                if (errors.dob) setErrors(prev => ({ ...prev, dob: '' }));
                              }}
                            />
                            {errors.dob && <p className="text-[10px] text-rose-500 mt-1">{errors.dob}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Gender <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 font-semibold"
                              value={ownerForm.gender}
                              onChange={(e) => setOwnerForm({ ...ownerForm, gender: e.target.value })}
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <div className="w-8 h-8 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                          <Phone size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-800 block leading-tight">Contact Information</span>
                          <span className="text-[10px] text-slate-400 font-medium">We will use this information to contact you</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="email"
                                placeholder="Enter email address"
                                className={`w-full pl-9 pr-24 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.email ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={ownerForm.email}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, email: e.target.value });
                                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                  handleValidateEmail(e.target.value);
                                }}
                              />
                              {ownerEmailValidation && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase ${
                                  ownerEmailValidation.status === 'valid' ? 'text-green-600' : ownerEmailValidation.status === 'checking' ? 'text-slate-400' : 'text-rose-500'
                                }`}>
                                  {ownerEmailValidation.status === 'checking' ? 'Checking...' : ownerEmailValidation.status === 'valid' ? '✓ Unique' : 'Taken'}
                                </span>
                              )}
                            </div>
                            {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="tel"
                                placeholder="Enter mobile number"
                                className={`w-full pl-9 pr-24 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.phone ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={ownerForm.phone}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) });
                                  if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                  handleValidatePhone(e.target.value);
                                }}
                              />
                              {ownerPhoneValidation && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase ${
                                  ownerPhoneValidation.status === 'valid' ? 'text-green-600' : ownerPhoneValidation.status === 'checking' ? 'text-slate-400' : 'text-rose-500'
                                }`}>
                                  {ownerPhoneValidation.status === 'checking' ? 'Checking...' : ownerPhoneValidation.status === 'valid' ? '✓ Unique' : 'Taken'}
                                </span>
                              )}
                            </div>
                            {errors.phone && <p className="text-[10px] text-rose-500 mt-1">{errors.phone}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <div className="w-8 h-8 bg-purple-100 text-purple-650 rounded-xl flex items-center justify-center shrink-0">
                          <Lock size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-800 block leading-tight">Account Security</span>
                          <span className="text-[10px] text-slate-400 font-medium">Create a secure account to access AICMS</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter owner account password"
                                className={`w-full pl-9 pr-10 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.password ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={ownerForm.password}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, password: e.target.value });
                                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                              >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Re-enter password"
                                className={`w-full pl-9 pr-10 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.confirmPassword ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={ownerForm.confirmPassword}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, confirmPassword: e.target.value });
                                  if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                              >
                                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            {errors.confirmPassword && <p className="text-[10px] text-rose-500 mt-1">{errors.confirmPassword}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                          <Shield size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-800 block leading-tight">Identity Information</span>
                          <span className="text-[10px] text-slate-400 font-medium">Official identification for verification</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">PAN Number (Optional)</label>
                            <input
                              type="text"
                              maxLength="10"
                              placeholder="Enter PAN number"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.pan ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={ownerForm.pan}
                              onChange={(e) => {
                                setOwnerForm({ ...ownerForm, pan: e.target.value.toUpperCase() });
                                if (errors.pan) setErrors(prev => ({ ...prev, pan: '' }));
                              }}
                            />
                            {errors.pan && <p className="text-[10px] text-rose-500 mt-1">{errors.pan}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Aadhaar Number (Optional)</label>
                            <input
                              type="text"
                              maxLength="12"
                              placeholder="Enter Aadhaar number"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.aadhaar ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={ownerForm.aadhaar}
                              onChange={(e) => {
                                setOwnerForm({ ...ownerForm, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) });
                                if (errors.aadhaar) setErrors(prev => ({ ...prev, aadhaar: '' }));
                              }}
                            />
                            {errors.aadhaar && <p className="text-[10px] text-rose-500 mt-1">{errors.aadhaar}</p>}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[11px] font-extrabold text-slate-600">Residential Address <span className="text-red-500">*</span></label>
                            <button
                              type="button"
                              onClick={() => { setMapTarget('owner'); setShowMapPicker(true); }}
                              className="text-[10px] font-black text-green-600 hover:text-green-800 flex items-center gap-1 cursor-pointer"
                            >
                              <MapPin size={11} /> Locate your Address
                            </button>
                          </div>
                          <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Enter owner residential address"
                              className={`w-full pl-9 pr-3 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.address ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={ownerForm.address}
                              onChange={(e) => {
                                setOwnerForm({ ...ownerForm, address: e.target.value });
                                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                              }}
                            />
                          </div>
                          {errors.address && <p className="text-[10px] text-rose-500 mt-1">{errors.address}</p>}
                        </div>

                        <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {localPreviews.profilePhoto ? (
                              <img src={localPreviews.profilePhoto} alt="Profile preview" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-7 h-7 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-700 mb-1">Profile Photo <span className="text-slate-400 font-medium">(Optional)</span></p>
                            <input type="file" id="profilePhotoFile" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0], 'profilePhoto')} />
                            <label htmlFor="profilePhotoFile" className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-extrabold cursor-pointer transition inline-flex items-center gap-1.5 text-slate-600">
                              <UploadCloud size={12} /> Upload Image
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <Globe size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-800 block leading-tight">Additional Details</span>
                          <span className="text-[10px] text-slate-400 font-medium">More information about the owner</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Nationality <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 font-semibold"
                              value={ownerForm.nationality}
                              onChange={(e) => setOwnerForm({ ...ownerForm, nationality: e.target.value })}
                            >
                              <option value="Indian">Indian</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Preferred Language <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 font-semibold"
                              value={ownerForm.preferredLanguage}
                              onChange={(e) => setOwnerForm({ ...ownerForm, preferredLanguage: e.target.value })}
                            >
                              <option value="English">English</option>
                              <option value="Hindi">Hindi</option>
                              <option value="Bengali">Bengali</option>
                              <option value="Tamil">Tamil</option>
                              <option value="Telugu">Telugu</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: CLINIC DETAILS ── */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <Building2 size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-800 block">Clinic Details</span>
                          <span className="text-[10px] text-slate-400 font-bold">Roster parameters and coordinates</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Clinic Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Enter clinic official name"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.clinicName ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={clinicForm.name}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, name: e.target.value });
                                if (errors.clinicName) setErrors(prev => ({ ...prev, clinicName: '' }));
                              }}
                            />
                            {errors.clinicName && <p className="text-[10px] text-rose-500 mt-1">{errors.clinicName}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Registration Number <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="e.g. REG-12345"
                                className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.registrationNumber ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                                value={clinicForm.registrationNumber}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, registrationNumber: e.target.value });
                                  if (errors.registrationNumber) setErrors(prev => ({ ...prev, registrationNumber: '' }));
                                }}
                                onBlur={(e) => handleValidateRegNumber(e.target.value)}
                              />
                              {regNumValidation && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase ${
                                  regNumValidation.status === 'valid' ? 'text-green-600' : regNumValidation.status === 'checking' ? 'text-slate-400' : 'text-rose-500'
                                }`}>
                                  {regNumValidation.status === 'checking' ? 'Checking...' : regNumValidation.status === 'valid' ? '✓ Available' : 'Taken'}
                                </span>
                              )}
                            </div>
                            {errors.registrationNumber && <p className="text-[10px] text-rose-500 mt-1">{errors.registrationNumber}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Established Year <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              placeholder="YYYY"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.establishedYear ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={clinicForm.establishedYear}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, establishedYear: e.target.value.replace(/\D/g, '').slice(0, 4) });
                                if (errors.establishedYear) setErrors(prev => ({ ...prev, establishedYear: '' }));
                              }}
                            />
                            {errors.establishedYear && <p className="text-[10px] text-rose-500 mt-1">{errors.establishedYear}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-605 mb-1.5">Consultation Mode</label>
                            <select
                              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none text-sm text-slate-800 font-semibold"
                              value={clinicForm.consultationMode}
                              onChange={(e) => setClinicForm({ ...clinicForm, consultationMode: e.target.value })}
                            >
                              <option value="In-Clinic">In-Clinic</option>
                              <option value="Video-Consultation">Video Consultation</option>
                              <option value="Hybrid">Hybrid</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-605 mb-1.5">Specialties</label>
                            <input
                              type="text"
                              placeholder="General Medicine, Cardiology"
                              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none font-semibold text-slate-800"
                              value={clinicForm.specialties}
                              onChange={(e) => setClinicForm({ ...clinicForm, specialties: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Clinic Street Address <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="123 MG Road"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.addressLine1 ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={clinicForm.addressLine1}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, addressLine1: e.target.value });
                                if (errors.addressLine1) setErrors(prev => ({ ...prev, addressLine1: '' }));
                              }}
                            />
                            {errors.addressLine1 && <p className="text-[10px] text-rose-500 mt-1">{errors.addressLine1}</p>}
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-[11px] font-extrabold text-slate-600">PIN Code <span className="text-red-500">*</span></label>
                              <button
                                type="button"
                                onClick={() => { setMapTarget('clinic'); setShowMapPicker(true); }}
                                className="text-[10px] font-black text-green-600 hover:text-green-800 flex items-center gap-1 cursor-pointer"
                              >
                                <MapPin size={11} /> Locate on Map
                              </button>
                            </div>
                            <input
                              type="text"
                              maxLength="6"
                              placeholder="560001"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.pincode ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={clinicForm.pincode}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) });
                                if (errors.pincode) setErrors(prev => ({ ...prev, pincode: '' }));
                              }}
                            />
                            {errors.pincode && <p className="text-[10px] text-rose-500 mt-1">{errors.pincode}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">City <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Bengaluru"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.city ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={clinicForm.city}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, city: e.target.value });
                                if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
                              }}
                            />
                            {errors.city && <p className="text-[10px] text-rose-500 mt-1">{errors.city}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">State <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Karnataka"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.state ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={clinicForm.state}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, state: e.target.value });
                                if (errors.state) setErrors(prev => ({ ...prev, state: '' }));
                              }}
                            />
                            {errors.state && <p className="text-[10px] text-rose-500 mt-1">{errors.state}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Clinic Phone <span className="text-red-500">*</span></label>
                            <input
                              type="tel"
                              placeholder="9876543210"
                              className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.contactNumber ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                              value={clinicForm.contactNumber}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) });
                                if (errors.contactNumber) setErrors(prev => ({ ...prev, contactNumber: '' }));
                              }}
                            />
                            {errors.contactNumber && <p className="text-[10px] text-rose-500 mt-1">{errors.contactNumber}</p>}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-600 mb-1.5">Clinic Description <span className="text-red-500">*</span></label>
                          <textarea
                            rows="2"
                            placeholder="Brief overview of your clinic and healthcare practice."
                            className={`w-full px-4 py-3 bg-slate-50/50 border rounded-xl outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm text-slate-800 ${errors.shortDescription ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200'}`}
                            value={clinicForm.shortDescription}
                            onChange={(e) => {
                              setClinicForm({ ...clinicForm, shortDescription: e.target.value });
                              if (errors.shortDescription) setErrors(prev => ({ ...prev, shortDescription: '' }));
                            }}
                          />
                          {errors.shortDescription && <p className="text-[10px] text-rose-500 mt-1">{errors.shortDescription}</p>}
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                          <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                            {localPreviews.logo ? (
                              <img src={localPreviews.logo} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-7 h-7 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-700 mb-1">Clinic Logo</p>
                            <input
                              type="file"
                              id="clinicLogo"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e.target.files[0], 'logo')}
                            />
                            <label
                              htmlFor="clinicLogo"
                              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-extrabold cursor-pointer transition inline-flex items-center gap-1.5 text-slate-600"
                            >
                              <UploadCloud size={12} /> Upload Logo
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: SUBSCRIPTION SELECTION ── */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Select Subscription Plan</h4>
                        <p className="text-[10px] text-slate-400 font-bold font-semibold">Choose a plan scale for your clinic workspace.</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition ${billingCycle === 'monthly' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-500'}`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('yearly')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition ${billingCycle === 'yearly' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-500'}`}
                        >
                          Yearly (Save 20%)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plans.map(p => {
                        const isSelected = selectedPlanId === p._id;
                        const isStarter = (p.name || '').toLowerCase().includes('starter');
                        const isProfessional = (p.name || '').toLowerCase().includes('professional');
                        
                        let price = billingCycle === 'monthly' ? p.monthlyPrice || p.price : p.yearlyPrice || (p.price * 10);
                        if (!price && price !== 0) price = 4999;

                        return (
                          <div
                            key={p._id}
                            onClick={() => setSelectedPlanId(p._id)}
                            className={`border-2 rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between relative hover:shadow-md ${
                              isSelected ? 'border-green-600 bg-green-50/5 shadow-md' : 'border-slate-200 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg">
                                <Check size={12} />
                              </div>
                            )}
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{p.name}</h4>
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 block">{p.code || 'LICENSE'}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-black text-slate-900">₹{price}</span>
                                  <span className="text-[9px] text-slate-400 block font-bold">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                </div>
                              </div>
                              <ul className="space-y-1.5 text-[10px] font-bold text-slate-600 mb-6">
                                <li className="flex items-center gap-1.5">
                                  <Check className="text-green-600 shrink-0" size={11} /> 
                                  <span>Doctors Limit: {isStarter ? '1 Active Doctor' : isProfessional ? 'Up to 3 Doctors' : 'Unlimited Doctors'}</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                  <Check className="text-green-600 shrink-0" size={11} />
                                  <span>Staff Limit: {isStarter ? '2 Staff Accounts' : isProfessional ? 'Up to 5 Staff' : 'Unlimited Staff'}</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                  <Check className="text-green-600 shrink-0" size={11} />
                                  <span>Branches: {isStarter ? '1 Branch' : isProfessional ? 'Up to 2 Branches' : 'Unlimited Branches'}</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                  <Check className="text-green-600 shrink-0" size={11} />
                                  <span>AI Modules: {isStarter || isProfessional ? 'Locked' : 'All Modules Enabled'}</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                  <Check className="text-green-600 shrink-0" size={11} />
                                  <span>Telemedicine Consultations: {isStarter ? 'Unavailable' : 'Zoom/GMeet Integration'}</span>
                                </li>
                              </ul>
                            </div>
                            <button
                              type="button"
                              className={`w-full py-2.5 rounded-xl text-[10px] font-black transition ${
                                isSelected ? 'bg-green-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {isSelected ? 'Plan Selected' : 'Choose Plan'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── STEP 4: REVIEW & SUBMIT ── */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {/* Summary Owner Card */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative">
                        <button onClick={() => setCurrentStep(1)} className="absolute right-4 top-4 text-xs font-black text-green-600 hover:underline">Edit</button>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Owner Summary</h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold text-slate-700">
                          <div>Name: <span className="text-slate-900 font-bold">{ownerForm.name || '-'}</span></div>
                          <div>Designation: <span className="text-slate-900 font-bold">{ownerForm.designation || '-'}</span></div>
                          <div>Email: <span className="text-slate-900 font-bold">{ownerForm.email || '-'}</span></div>
                          <div>Phone: <span className="text-slate-900 font-bold">{ownerForm.phone || '-'}</span></div>
                          <div>PAN: <span className="text-slate-900 font-bold">{ownerForm.pan || '-'}</span></div>
                          <div>Aadhaar: <span className="text-slate-900 font-bold">{ownerForm.aadhaar || '-'}</span></div>
                        </div>
                      </div>

                      {/* Summary Clinic Card */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative">
                        <button onClick={() => setCurrentStep(2)} className="absolute right-4 top-4 text-xs font-black text-green-600 hover:underline">Edit</button>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Clinic Summary</h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold text-slate-700">
                          <div>Name: <span className="text-slate-900 font-bold">{clinicForm.name || '-'}</span></div>
                          <div>Reg Number: <span className="text-slate-900 font-bold">{clinicForm.registrationNumber || '-'}</span></div>
                          <div>Consultation Mode: <span className="text-slate-900 font-bold">{clinicForm.consultationMode || '-'}</span></div>
                          <div>Languages: <span className="text-slate-900 font-bold">{clinicForm.languagesSpoken || '-'}</span></div>
                          <div className="col-span-2">Address: <span className="text-slate-900 font-bold">{clinicForm.addressLine1}, {clinicForm.city}, {clinicForm.state} - {clinicForm.pincode}</span></div>
                        </div>
                      </div>

                      {/* Subscription Summary */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative">
                        <button onClick={() => setCurrentStep(3)} className="absolute right-4 top-4 text-xs font-black text-green-600 hover:underline">Edit</button>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Selected Plan Summary</h4>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-black text-slate-900 uppercase block">{activePlanObj?.name || 'Professional Plan'}</span>
                            <span className="text-[10px] text-slate-400 font-bold capitalize">Billing Cycle: {billingCycle}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-slate-900">
                              ₹{billingCycle === 'monthly' ? activePlanObj?.monthlyPrice || activePlanObj?.price : activePlanObj?.yearlyPrice || (activePlanObj?.price * 10)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terms Acceptance */}
                    <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                      <input
                        type="checkbox"
                        id="terms"
                        className="mt-0.5 cursor-pointer w-4 h-4 text-green-605"
                        checked={hasAcceptedTerms}
                        onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                      />
                      <label htmlFor="terms" className="text-[11px] font-bold text-slate-500 leading-normal cursor-pointer">
                        I confirm that all clinic credentials, owner details, and identity documents provided are correct and legally valid. I accept the AICMS Terms &amp; Conditions and Privacy Policy.
                      </label>
                    </div>

                    {wizardError && (
                      <div className="bg-rose-50 text-rose-600 border border-rose-100 p-3 rounded-xl text-xs font-bold animate-shake">
                        {wizardError}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ==================== RIGHT SIDEBAR ==================== */}
        <div
          className="cw-scroll w-full lg:w-[22%] shrink-0 flex flex-col bg-white rounded-2xl border border-slate-150/70 shadow-sm"
          style={{ overflowY: 'auto' }}
        >
          <div className="flex flex-col gap-4 p-5 flex-1">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider block">Setup Summary</h3>
              <p className="text-[10px] text-slate-400 font-bold block mt-0.5">Real-time overview of your setup</p>
            </div>

            {/* Progress bar */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500">
                <span>Progress</span>
                <span>Step {currentStep} of 4 ({progress}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="bg-green-50/50 border border-green-100 p-3.5 rounded-xl flex items-start gap-2 text-xs text-green-700 font-bold">
              <Building2 size={16} className="shrink-0 mt-0.5 text-green-600" />
              <div>
                <span className="block text-[11px] font-black text-slate-800">You're setting up</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{clinicForm.name || 'New Clinic'}</span>
              </div>
            </div>

            {/* What's Next Checklist */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">What's Next?</span>
              <ul className="space-y-1.5 text-[10px] font-bold text-slate-600">
                <li className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${currentStep > 1 ? 'bg-green-150 border-green-500 text-green-600' : 'border-slate-300'}`}>
                    {currentStep > 1 && <Check size={8} />}
                  </div>
                  <span className={currentStep > 1 ? 'line-through text-slate-400' : ''}>Fill in clinic details</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${currentStep > 2 ? 'bg-green-150 border-green-500 text-green-600' : 'border-slate-300'}`}>
                    {currentStep > 2 && <Check size={8} />}
                  </div>
                  <span className={currentStep > 2 ? 'line-through text-slate-400' : ''}>Choose your plan</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${currentStep > 3 ? 'bg-green-150 border-green-500 text-green-600' : 'border-slate-300'}`}>
                    {currentStep > 3 && <Check size={8} />}
                  </div>
                  <span className={currentStep > 3 ? 'line-through text-slate-400' : ''}>Review &amp; confirm</span>
                </li>
              </ul>
            </div>

            {/* Security & Compliance Checklist */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Security &amp; Compliance</span>
              <ul className="space-y-1.5 text-[10px] font-bold text-slate-650">
                <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-600" /> 256-bit SSL Encryption</li>
                <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-600" /> HIPAA Compliant</li>
                <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-600" /> Regular Backups</li>
                <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-600" /> Role-based Access</li>
              </ul>
            </div>

            {/* Promo Code Input */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Apply Promo Code</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CODE100"
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold outline-none uppercase focus:border-green-500"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg hover:bg-slate-800"
                >
                  Apply
                </button>
              </div>
              {promoApplied && <p className="text-[10px] text-green-600 font-bold mt-1">✓ Applied successfully!</p>}
              {promoError && <p className="text-[10px] text-rose-500 font-bold mt-1">{promoError}</p>}
            </div>

            {/* Have Questions Card */}
            <div className="mt-auto bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <PhoneCall size={15} className="text-green-600" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-800 block">Have Questions?</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Our setup experts are ready.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('tel:+18005550199')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <PhoneCall size={11} /> Talk to Expert
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY FOOTER BAR ── */}
      <div className="shrink-0 w-full z-30" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 24px rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1840px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          {/* Back to Home / Prev Step */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-slate-900 transition shrink-0 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-slate-900 transition shrink-0 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
          )}

          {/* Secure Message */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ShieldCheck size={16} className="text-green-600 shrink-0" />
            <span>
              <span className="font-black text-slate-700">Your data is safe with us.</span>
              <span className="hidden sm:inline text-slate-400"> We use industry-standard encryption.</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer shadow-sm"
            >
              Save &amp; Continue Later
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}
              >
                Continue to Next Step <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}
              >
                {isSubmitting ? 'Submitting...' : 'Verify & Submit'} <Check size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-6">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">Email Verification</h3>
              <p className="text-xs text-slate-400">We've sent a 6-digit security code to <strong className="text-slate-800">{ownerForm.email}</strong>.</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                maxLength="6"
                placeholder="0 0 0 0 0 0"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-green-600 text-lg font-black tracking-widest"
              />
              {otpError && <p className="text-xs text-rose-500 font-bold">{otpError}</p>}
              {otpResent && <p className="text-xs text-green-600 font-bold">✓ Verification code resent successfully</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpLoading}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black transition cursor-pointer"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={handleVerifyAndRegister}
                disabled={otpLoading}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:opacity-90 text-white rounded-2xl text-xs font-black shadow-md shadow-green-500/20 transition cursor-pointer"
              >
                {otpLoading ? 'Verifying...' : 'Verify & Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
