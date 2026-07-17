import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clinicApi,promoApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import { 
  User, Mail, Phone, Lock, Calendar, MapPin, 
  CreditCard, Check, ArrowRight, ArrowLeft, ShieldCheck, 
  Clock, Plus, Trash, Globe, FileText, CheckCircle, HelpCircle, UploadCloud, Heart, Building2, X,RefreshCw
} from 'lucide-react';
import MapPicker from '../../components/common/MapPicker';

const CustomDatePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value) : new Date(2000, 0, 1);
  });
  const containerRef = useRef(null);

  // Sync state if value changes externally
  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 100; y--) {
    years.push(y);
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleYearChange = (year) => {
    const nextDate = new Date(currentDate);
    nextDate.setFullYear(year);
    setCurrentDate(nextDate);
  };

  const handleMonthChange = (monthIdx) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(monthIdx);
    setCurrentDate(nextDate);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  // Empty spaces for previous month's days offset
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handleDateSelect = (day) => {
    if (!day) return;
    const selected = new Date(year, month, day);
    // Format to YYYY-MM-DD local timezone
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus-within:bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition text-sm text-slate-800 flex items-center justify-between cursor-pointer"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Select date of birth"}
        </span>
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-white border border-slate-150 rounded-3xl shadow-xl w-72 animate-fadeIn left-0">
          <div className="flex gap-2 mb-3">
            <select 
              value={month} 
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-800 font-bold outline-none"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <select 
              value={year} 
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-800 font-bold outline-none w-24"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-800 mb-2">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!day}
                  onClick={() => handleDateSelect(day)}
                  className={`h-8 w-8 rounded-full text-xs font-semibold flex items-center justify-center transition ${
                    !day 
                      ? "invisible" 
                      : isSelected 
                        ? "bg-blue-600 text-white font-bold" 
                        : "text-slate-800 hover:bg-slate-105 hover:bg-slate-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const STEPS = [
  { id: 1, name: "Owner's Details", desc: "Tell us about the clinic owner." },
  { id: 2, name: "Clinic Details", desc: "Provide your clinic information." },
  { id: 3, name: "Plan Selection", desc: "Choose the best plan for you." },
  { id: 4, name: "Review & Submit", desc: "Review your details and submit." }
];

const ClinicWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0); 
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [wizardError, setWizardError] = useState('');

  // Clinic login states
  const { login } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Map and Language States
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState(['English', 'Hindi']);
  const [customLanguage, setCustomLanguage] = useState('');
  const [availableLanguages, setAvailableLanguages] = useState(['English', 'Hindi', 'Bengali', 'Spanish', 'French', 'Telugu', 'Tamil']);

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResent, setOtpResent] = useState(false);

  // Step 1: Owner Form
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: '',
    address: '',
    aadhaar: '',
    pan: '',
    profilePhoto: ''
  });

  const handleClinicLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Email and Password are required.');
      return;
    }
    setLoginSubmitting(true);
    setLoginError('');

    try {
      const authData = await login({ email: loginEmail, password: loginPassword });
      const userRole = authData?.user?.role;
      const clinic = authData?.user?.clinic;

      if (userRole === 'ADMIN' && clinic) {
        const { approvalStatus, subscription, isOnboardingCompleted } = clinic;

        if (approvalStatus === 'pending_approval') {
          navigate('/clinic/status', { replace: true });
          return;
        }
        if (approvalStatus === 'rejected') {
          navigate('/clinic/corrections', { replace: true });
          return;
        }
        if (approvalStatus === 'suspended' || subscription?.status === 'Suspended') {
          navigate('/clinic/suspended', { replace: true });
          return;
        }
        if (subscription?.status === 'Expired') {
          navigate('/clinic/expired', { replace: true });
          return;
        }
        if (approvalStatus === 'approved' && !isOnboardingCompleted) {
          navigate('/clinic/onboarding', { replace: true });
          return;
        }
      }

      // Default redirect
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Invalid credentials or login blocked.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Step 2: Clinic Form
  const [clinicForm, setClinicForm] = useState({
    name: '',
    clinicType: 'General Clinic',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    latitude: 26.8467,
    longitude: 80.9462,
    contactNumber: '',
    emailAddress: '',
    logo: '',
    description: '',
    registrationNumber: '',
    establishedYear: '',
    specialties: '',
    timings: [
      { dayRange: 'Monday - Friday', startTime: '09:00 AM', endTime: '08:00 PM' },
      { dayRange: 'Saturday', startTime: '09:00 AM', endTime: '02:00 PM' }
    ],
    closedOnSunday: true,
    consultationMode: 'In-Clinic',
    languagesSpoken: '',
    shortDescription: '',
    images: []
  });

  const [selectedPlanId, setSelectedPlanId] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await clinicApi.getRegistrationPlans();
        setPlans(response.data.plans || []);
        if (response.data.plans?.length > 0) {
          const professional = response.data.plans.find(p => p.code === 'PROFESSIONAL') || response.data.plans[0];
          setSelectedPlanId(professional._id);
        }
      } catch (err) {
        console.error("Failed to load plans:", err);
      }
    };
    fetchPlans();
  }, []);

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
        billingCycle: setBillingCycle
      });
      setPromoApplied(true);
      // Backend returns discountAmount and promo details
      // Let's store the discount value/amount computed by the backend
      const discountVal = response.data.discountAmount || 0;
      setPromoDiscount(discountVal);
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Invalid or inapplicable promo code');
      console.log(err);
      
    }
  };

  const handleAddTiming = () => {
    setClinicForm(prev => ({
      ...prev,
      timings: [...prev.timings, { dayRange: 'Monday - Friday', startTime: '09:00 AM', endTime: '06:00 PM' }]
    }));
  };

  const handleRemoveTiming = (index) => {
    setClinicForm(prev => ({
      ...prev,
      timings: prev.timings.filter((_, idx) => idx !== index)
    }));
  };

  const handleTimingChange = (index, field, value) => {
    const newTimings = [...clinicForm.timings];
    newTimings[index][field] = value;
    setClinicForm(prev => ({ ...prev, timings: newTimings }));
  };

  const validateStep = async () => {
    setWizardError('');
    if (currentStep === 1) {
      if (!ownerForm.name || !ownerForm.designation || !ownerForm.phone || !ownerForm.email || !ownerForm.password) {
        setWizardError('Please fill all required owner details marked with *');
        return false;
      }
      if (ownerForm.password !== ownerForm.confirmPassword) {
        setWizardError('Password confirmation does not match');
        return false;
      }
      if (ownerForm.password.length < 6) {
        setWizardError('Password must be at least 6 characters');
        return false;
      }

      // Backend validation for email uniqueness
      try {
        setIsSubmitting(true);
        const res = await clinicApi.validateEmail({ email: ownerForm.email });
        if (!res.data.isUnique) {
          setWizardError('this email id already exists with us');
          return false;
        }
      } catch (err) {
        setWizardError(err.response?.data?.message || 'Failed to validate email. Please try again.');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    } else if (currentStep === 2) {
      if (!clinicForm.name || !clinicForm.registrationNumber || !clinicForm.establishedYear || !clinicForm.shortDescription || !clinicForm.addressLine1 || !clinicForm.city || !clinicForm.state || !clinicForm.pincode || !clinicForm.contactNumber) {
        setWizardError('Please fill all required clinic details marked with *. Clinic Name, Registration Number, Established Year, Short Description, and Address are compulsory.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!selectedPlanId) {
        setWizardError('Please select a subscription plan');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    setWizardError('');
    if (!hasAcceptedTerms) {
      setWizardError('You must confirm that all information is correct');
      return;
    }
    
    // Send OTP to owner's email
    try {
      setIsSubmitting(true);
      await clinicApi.sendOtp({ email: ownerForm.email });
      setShowOtpModal(true);
      setOtpCode('');
      setOtpError('');
      setOtpResent(false);
    } catch (err) {
      setWizardError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otpCode.trim()) {
      setOtpError('Please enter the OTP');
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError('');
      // Verify OTP
      await clinicApi.verifyOtp({ email: ownerForm.email, otp: otpCode });
      
      // Proceed to Register
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
          languagesSpoken: clinicForm.languagesSpoken ? clinicForm.languagesSpoken.split(',').map(s => s.trim()).filter(Boolean) : []
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
      setOtpError(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
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
      setOtpError('Failed to resend code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-xl w-full text-center shadow-xl border border-stone-100 animate-fadeIn">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Registration Submitted!</h1>
          <p className="text-stone-500 font-medium mb-6">Status: <span className="text-amber-500 font-semibold px-2 py-1 bg-amber-50 rounded-full text-sm border border-amber-200">Pending Approval</span></p>
          <div className="bg-stone-50 rounded-2xl p-6 text-left mb-8 border border-stone-200">
            <h3 className="font-semibold text-stone-800 mb-2">What happens next?</h3>
            <ul className="space-y-3 text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                <span>Our Super Admin will review your clinic registration and details.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                <span>You will receive an email verification once approved.</span>
              </li>
            </ul>
          </div>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-2xl transition duration-200">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const selectedPlanObj = plans.find(p => p._id === selectedPlanId);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Heart size={18} fill="currentColor" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">AICMS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/set-your-clinic" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/25 transition cursor-pointer">
            Set Your Clinic
          </Link>
          <Link to="/login" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition cursor-pointer">
            Join as Patient
          </Link>
        </div>
      </header>

      {/* Wizard Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar Steps Indicator */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-150/70">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Set Up Your Clinic</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">Join AICMS and digitize your clinic operations in a few simple steps.</p>
            
            <div className="space-y-8 relative pl-2">
              <div className="absolute top-1 bottom-1 left-[19px] w-[2px] bg-slate-100 -z-10" />
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <div key={step.id} className="flex gap-4 items-start relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border-2 transition ${
                      isCompleted 
                        ? "bg-blue-50 border-blue-600 text-blue-600" 
                        : isActive 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm leading-tight ${isActive ? "text-blue-600" : isCompleted ? "text-slate-700" : "text-slate-400"}`}>
                        {step.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Safe banner */}
          <div className="bg-blue-50/50 border border-blue-100/70 rounded-3xl p-6 flex gap-4 items-start shadow-sm">
            <div className="p-2.5 bg-blue-100 rounded-2xl text-blue-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 text-xs">Your Data is Safe</h4>
              <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">We use advanced encryption to keep your data secure and private.</p>
            </div>
          </div>

          {/* Already have a clinic banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col gap-3 shadow-sm">
            <div className="flex gap-4 items-start">
              <div className="p-2.5 bg-slate-200 text-slate-700 rounded-2xl shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Already Registered?</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Access your clinic portal to check status, request corrections, or manage setup.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginError('');
                setLoginEmail('');
                setLoginPassword('');
                setShowLoginModal(true);
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition shadow-sm"
            >
              Login as Clinic Admin
            </button>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {wizardError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-medium">
              {wizardError}
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-150/70 min-h-[500px] flex flex-col justify-between">
            <div>
              
              {/* STEP 1: OWNER'S DETAILS */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900">Step 1 of 4: Owner's Details</h3>
                      <p className="text-xs text-slate-400 mt-1">Please provide the owner/administrator details who will manage this clinic.</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Owner Full Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="Enter owner full name" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={ownerForm.name}
                        onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Designation <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="Enter designation (e.g., Doctor, Director)" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={ownerForm.designation}
                        onChange={(e) => setOwnerForm({ ...ownerForm, designation: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                      <input 
                        type="email" 
                        placeholder="Enter email address" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={ownerForm.email}
                        onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Mobile Number <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <select className="px-3 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none text-sm text-slate-800">
                          <option value="+91">+91</option>
                        </select>
                        <input 
                          type="tel" 
                          placeholder="Enter mobile number" 
                          className="flex-1 px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                          value={ownerForm.phone}
                          onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Password <span className="text-red-500">*</span></label>
                      <input 
                        type="password" 
                        placeholder="Enter owner account password" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={ownerForm.password}
                        onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Confirm Password <span className="text-red-500">*</span></label>
                      <input 
                        type="password" 
                        placeholder="Re-enter password" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={ownerForm.confirmPassword}
                        onChange={(e) => setOwnerForm({ ...ownerForm, confirmPassword: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-2">Date of Birth</label>
                      <CustomDatePicker 
                        value={ownerForm.dob}
                        onChange={(val) => setOwnerForm({ ...ownerForm, dob: val })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Gender</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none text-sm text-slate-800"
                        value={ownerForm.gender}
                        onChange={(e) => setOwnerForm({ ...ownerForm, gender: e.target.value })}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-2">Address</label>
                      <input 
                        type="text" 
                        placeholder="Enter owner's address" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={ownerForm.address}
                        onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">PAN Number (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="Enter PAN number" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={ownerForm.pan}
                        onChange={(e) => setOwnerForm({ ...ownerForm, pan: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Aadhaar Number (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="Enter Aadhaar number" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={ownerForm.aadhaar}
                        onChange={(e) => setOwnerForm({ ...ownerForm, aadhaar: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-2">Profile Photo (Optional)</label>
                      <div className="flex items-center gap-4">
                        {ownerForm.profilePhoto ? (
                          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 group shadow-sm">
                            <img src={ownerForm.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setOwnerForm({ ...ownerForm, profilePhoto: '' })}
                              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 text-xs font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="border border-dashed border-slate-350 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setOwnerForm({ ...ownerForm, profilePhoto: reader.result });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                            <span className="text-xs font-bold text-blue-600">Upload photo</span>
                            <span className="text-[10px] text-slate-400 mt-1">JPG, PNG up to 2MB</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CLINIC DETAILS */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900">Step 2 of 4: Clinic Details</h3>
                      <p className="text-xs text-slate-400 mt-1">Provide your clinic information and contact details.</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Clinic Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. HealthCare Clinic" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={clinicForm.name}
                        onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Clinic Registration Number *</label>
                      <input 
                        type="text" 
                        placeholder="Enter registration number" 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                        value={clinicForm.registrationNumber}
                        onChange={(e) => setClinicForm({ ...clinicForm, registrationNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Established Year <span className="text-red-500">*</span></label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none text-sm text-slate-800"
                        value={clinicForm.establishedYear}
                        onChange={(e) => setClinicForm({ ...clinicForm, establishedYear: e.target.value })}
                      >
                        <option value="">Select year</option>
                        {(() => {
                          const currentYear = new Date().getFullYear();
                          const years = [];
                          for (let y = currentYear; y >= currentYear - 100; y--) {
                            years.push(y);
                          }
                          return years.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ));
                        })()}
                      </select>
                    </div>
                    <div />

                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-700">Clinic Timings <span className="text-red-500">*</span></label>
                        <button 
                          type="button" 
                          onClick={handleAddTiming}
                          className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Timing
                        </button>
                      </div>
                      <div className="space-y-3">
                        {clinicForm.timings.map((timing, idx) => {
                          const standardOptions = [
                            'Monday - Friday', 'Saturday', 'Sunday', 'Everyday',
                            'Monday - Saturday', 'Saturday & Sunday',
                            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
                          ];
                          const isCustom = timing.dayRange === 'Custom' || !standardOptions.includes(timing.dayRange);

                          return (
                            <div key={idx} className="flex gap-3 items-center bg-slate-50/60 p-3 rounded-2xl border border-slate-200">
                              {isCustom ? (
                                <div className="flex gap-1 items-center w-1/3">
                                  <input 
                                    type="text" 
                                    placeholder="e.g. Mon, Wed, Fri"
                                    className="bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl focus:border-blue-500 outline-none w-full text-slate-800 font-semibold"
                                    value={timing.dayRange === 'Custom' ? '' : timing.dayRange}
                                    onChange={(e) => handleTimingChange(idx, 'dayRange', e.target.value)}
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => handleTimingChange(idx, 'dayRange', 'Monday - Friday')}
                                    className="text-slate-400 hover:text-slate-650 text-xs font-bold px-1.5 py-1"
                                    title="Back to dropdown"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <select 
                                  className="bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl focus:border-blue-500 outline-none w-1/3 text-slate-800 font-semibold"
                                  value={timing.dayRange}
                                  onChange={(e) => handleTimingChange(idx, 'dayRange', e.target.value)}
                                >
                                  <option value="Monday - Friday">Monday - Friday</option>
                                  <option value="Saturday">Saturday</option>
                                  <option value="Sunday">Sunday</option>
                                  <option value="Everyday">Everyday</option>
                                  <option value="Monday - Saturday">Monday - Saturday</option>
                                  <option value="Saturday & Sunday">Saturday & Sunday</option>
                                  <option value="Monday">Monday</option>
                                  <option value="Tuesday">Tuesday</option>
                                  <option value="Wednesday">Wednesday</option>
                                  <option value="Thursday">Thursday</option>
                                  <option value="Friday">Friday</option>
                                  <option value="Custom">Custom...</option>
                                </select>
                              )}
                              <span className="text-xs text-slate-400 font-medium">from</span>
                              <input 
                                type="text" 
                                className="bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl focus:border-blue-500 outline-none w-1/4 text-slate-800 font-semibold"
                                value={timing.startTime}
                                onChange={(e) => handleTimingChange(idx, 'startTime', e.target.value)}
                              />
                              <span className="text-xs text-slate-400 font-medium">to</span>
                              <input 
                                type="text" 
                                className="bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl focus:border-blue-500 outline-none w-1/4 text-slate-800 font-semibold"
                                value={timing.endTime}
                                onChange={(e) => handleTimingChange(idx, 'endTime', e.target.value)}
                              />
                              {clinicForm.timings.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveTiming(idx)}
                                  className="text-red-500 hover:text-red-700 p-1.5"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                          checked={clinicForm.closedOnSunday}
                          onChange={(e) => setClinicForm({ ...clinicForm, closedOnSunday: e.target.checked })}
                        />
                        <span className="text-xs font-semibold text-slate-600">Closed on Sunday</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Consultation Mode <span className="text-red-500">*</span></label>
                      <div className="flex gap-4">
                        {['In-Clinic', 'Online', 'Both'].map(mode => (
                          <label key={mode} className={`flex-1 border rounded-2xl p-3 flex items-center justify-between cursor-pointer ${clinicForm.consultationMode === mode ? 'border-blue-600 bg-blue-50/20 text-blue-600 font-bold' : 'border-slate-200 text-slate-600 bg-slate-50/30'}`}>
                            <span className="text-xs">{mode}</span>
                            <input 
                              type="radio" 
                              name="consultationMode" 
                              checked={clinicForm.consultationMode === mode}
                              onChange={() => setClinicForm({ ...clinicForm, consultationMode: mode })}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Languages Spoken (Check all that apply)</label>
                      <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200">
                        {availableLanguages.map(lang => {
                          const isChecked = selectedLanguages.includes(lang);
                          return (
                            <label key={lang} className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let newLangs;
                                  if (e.target.checked) {
                                    newLangs = [...selectedLanguages, lang];
                                  } else {
                                    newLangs = selectedLanguages.filter(l => l !== lang);
                                  }
                                  setSelectedLanguages(newLangs);
                                  setClinicForm(prev => ({ ...prev, languagesSpoken: newLangs.join(', ') }));
                                }}
                                className="rounded border-slate-350 text-slate-800 focus:ring-blue-500"
                              />
                              {lang}
                            </label>
                          );
                        })}
                      </div>
                      
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Add other language..."
                          value={customLanguage}
                          onChange={(e) => setCustomLanguage(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customLanguage.trim();
                            if (trimmed) {
                              if (!availableLanguages.includes(trimmed)) {
                                setAvailableLanguages(prev => [...prev, trimmed]);
                              }
                              if (!selectedLanguages.includes(trimmed)) {
                                const newLangs = [...selectedLanguages, trimmed];
                                setSelectedLanguages(newLangs);
                                setClinicForm(prev => ({ ...prev, languagesSpoken: newLangs.join(', ') }));
                              }
                              setCustomLanguage('');
                            }
                          }}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-2">Short Description of Your Clinic *</label>
                      <div className="relative">
                        <textarea 
                          rows={3} 
                          placeholder="Write a short description about your clinic, services, and facilities..."
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-800"
                          value={clinicForm.shortDescription}
                          maxLength={300}
                          onChange={(e) => setClinicForm({ ...clinicForm, shortDescription: e.target.value })}
                        />
                        <span className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-bold">
                          {clinicForm.shortDescription.length}/300
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-700">Clinic Address Details</label>
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition border border-emerald-200 shadow-sm cursor-pointer"
                        >
                          <MapPin size={14} /> Locate on Map
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          placeholder="Address Line 1 *" 
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 text-sm text-slate-800"
                          value={clinicForm.addressLine1}
                          onChange={(e) => setClinicForm({ ...clinicForm, addressLine1: e.target.value })}
                        />
                        <input 
                          type="text" 
                          placeholder="Address Line 2" 
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 text-sm text-slate-800"
                          value={clinicForm.addressLine2}
                          onChange={(e) => setClinicForm({ ...clinicForm, addressLine2: e.target.value })}
                        />
                        <input 
                          type="text" 
                          placeholder="City *" 
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 text-sm text-slate-800"
                          value={clinicForm.city}
                          onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })}
                        />
                        <input 
                          type="text" 
                          placeholder="State *" 
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 text-sm text-slate-800"
                          value={clinicForm.state}
                          onChange={(e) => setClinicForm({ ...clinicForm, state: e.target.value })}
                        />
                        <input 
                          type="text" 
                          placeholder="Pincode *" 
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 text-sm text-slate-800"
                          value={clinicForm.pincode}
                          onChange={(e) => setClinicForm({ ...clinicForm, pincode: e.target.value })}
                        />
                        <input 
                          type="text" 
                          placeholder="Clinic Contact Number *" 
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 text-sm text-slate-800"
                          value={clinicForm.contactNumber}
                          onChange={(e) => setClinicForm({ ...clinicForm, contactNumber: e.target.value })}
                        />
                        
                        <div className="flex gap-4 md:col-span-2">
                          <div className="flex-1">
                            <span className="text-[10px] text-slate-400 font-semibold block mb-1">Latitude</span>
                            <input 
                              type="number" 
                              readOnly
                              placeholder="Latitude" 
                              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm text-slate-500 cursor-not-allowed outline-none"
                              value={clinicForm.latitude}
                            />
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] text-slate-400 font-semibold block mb-1">Longitude</span>
                            <input 
                              type="number" 
                              readOnly
                              placeholder="Longitude" 
                              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm text-slate-500 cursor-not-allowed outline-none"
                              value={clinicForm.longitude}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Clinic Logo (Optional)</label>
                      <div className="flex items-center gap-4">
                        {clinicForm.logo ? (
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 group shadow-sm">
                            <img src={clinicForm.logo} alt="Logo" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setClinicForm({ ...clinicForm, logo: '' })}
                              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 text-[10px] font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="border border-dashed border-slate-350 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex-1 aspect-video">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setClinicForm({ ...clinicForm, logo: reader.result });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <UploadCloud className="w-5 h-5 text-blue-500 mb-1" />
                            <span className="text-[10px] font-bold text-blue-600">Upload Logo</span>
                          </label>
                        )}
                      </div>
                    </div>
                    <div />

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-2">Clinic Images (Optional)</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {clinicForm.images?.map((img, idx) => (
                          <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video group shadow-sm">
                            <img src={img} alt={`Clinic ${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = clinicForm.images.filter((_, i) => i !== idx);
                                setClinicForm({ ...clinicForm, images: updated });
                              }}
                              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 text-xs font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        
                        <label className="border border-dashed border-slate-350 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer aspect-video">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              const loadFiles = async () => {
                                const newImages = [];
                                for (const file of files) {
                                  const base64 = await new Promise((resolve) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result);
                                    reader.readAsDataURL(file);
                                  });
                                  newImages.push(base64);
                                }
                                setClinicForm(prev => ({
                                  ...prev,
                                  images: [...(prev.images || []), ...newImages]
                                }));
                              };
                              loadFiles();
                            }}
                          />
                          <Plus className="w-5 h-5 text-blue-500 mb-1" />
                          <span className="text-[10px] font-bold text-blue-600">Upload images</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: PLAN SELECTION */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900">Step 3 of 4: Plan Selection</h3>
                      <p className="text-xs text-slate-400 mt-1">Choose the best plan that fits your clinic's needs.</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <CreditCard className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Toggle Monthly/Yearly */}
                  <div className="flex justify-center mb-8 relative">
                    <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex items-center gap-1 border border-slate-200 shadow-inner">
                      <button 
                        type="button" 
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 ${billingCycle === 'monthly' ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
                      >
                        Monthly
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-2 ${billingCycle === 'yearly' ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
                      >
                        Yearly <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Save 20%</span>
                      </button>
                    </div>
                    <span className="absolute right-0 top-3 text-[10px] font-bold text-slate-400">All prices are in INR</span>
                  </div>

                  {/* Plan Grids */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                      const isSelected = selectedPlanId === plan._id;
                      const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
                      const priceLabel = billingCycle === 'monthly' ? 'month' : 'year';
                      const isPopular = plan.code === 'PROFESSIONAL';

                      return (
                        <div 
                          key={plan._id}
                          onClick={() => setSelectedPlanId(plan._id)}
                          className={`relative cursor-pointer rounded-3xl p-6 border-2 transition duration-200 flex flex-col justify-between ${
                            isSelected 
                              ? "border-blue-600 bg-blue-50/10 shadow-md shadow-blue-50" 
                              : "border-slate-200 bg-white hover:border-slate-350 hover:shadow-sm"
                          }`}
                        >
                          {isPopular && (
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-650 bg-blue-600 text-white font-bold text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm">
                              Most Popular
                            </div>
                          )}
                          
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h4 className="text-base font-extrabold text-slate-900">{plan.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                                  {plan.code === 'STARTER' && "Perfect for small clinics getting started."}
                                  {plan.code === 'PROFESSIONAL' && "Ideal for growing clinics and practices."}
                                  {plan.code === 'PREMIUM' && "Advanced solution for multi-branch clinics."}
                                  {plan.code === 'ENTERPRISE' && "For large clinics and multi-location setups."}
                                </p>
                              </div>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                            
                            <div className="mb-6 pt-2 border-t border-slate-100">
                              <span className="text-3xl font-black text-slate-900">₹{price.toLocaleString()}</span>
                              <span className="text-slate-400 text-xs"> / {priceLabel}</span>
                            </div>

                            <ul className="space-y-3 mb-6 text-xs text-slate-600">
                              {plan.code === 'STARTER' && (
                                <>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Up to 5 Doctors</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Up to 500 Patients</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Appointment Management</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Basic Reports</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Email Support</li>
                                </>
                              )}
                              {plan.code === 'PROFESSIONAL' && (
                                <>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Up to 20 Doctors</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Up to 2,000 Patients</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Appointment Management</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Advanced Reports</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> SMS & Email Notifications</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Priority Support</li>
                                </>
                              )}
                              {plan.code === 'PREMIUM' && (
                                <>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Up to 50 Doctors</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Unlimited Patients</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> AI Prescription suggestions</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Multi Branch Support</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Whatsapp Integration</li>
                                </>
                              )}
                              {plan.code === 'ENTERPRISE' && (
                                <>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Unlimited Doctors</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Unlimited Patients</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> HMS & ABDM Integration</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Custom Branding</li>
                                  <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Dedicated Account Manager</li>
                                </>
                              )}
                            </ul>
                          </div>

                          <button 
                            type="button" 
                            className={`w-full py-3 rounded-2xl text-xs font-bold transition ${
                              isSelected 
                                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            Choose Plan
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Promo code */}
                  <div className="mt-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">Have a Promo Code?</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Apply a promo code to get exciting discounts.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Enter promo code"
                          className="px-4 py-3 bg-white border border-slate-350/80 rounded-2xl outline-none text-xs text-slate-800 uppercase focus:border-blue-600 w-44"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                        />
                        {promoApplied && (
                          <span className="absolute right-3 top-3 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Applied (₹{promoDiscount})
                          </span>
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={handleApplyPromo}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  {promoError && (
                    <p className="text-xs text-red-700 font-bold mt-2 ml-4">{promoError}</p>
                  )}
                </div>
              )}

              {/* STEP 4: REVIEW & SUBMIT */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900">Step 4 of 4: Review & Submit</h3>
                      <p className="text-xs text-slate-400 mt-1">Please review all your details carefully before submitting.</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Owner Details Card */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200 relative">
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(1)}
                        className="absolute right-6 top-6 text-xs text-blue-600 hover:underline font-bold"
                      >
                        Edit
                      </button>
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" /> Owner Details
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div><span className="text-slate-400 font-medium">Owner Name:</span> <span className="text-slate-800 font-semibold">{ownerForm.name || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-medium">Designation:</span> <span className="text-slate-800 font-semibold">{ownerForm.designation || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-medium">Email:</span> <span className="text-slate-800">{ownerForm.email || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-medium">Mobile Number:</span> <span className="text-slate-800">{ownerForm.phone || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-medium">Date of Birth:</span> <span className="text-slate-800">{ownerForm.dob || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-medium">Gender:</span> <span className="text-slate-800">{ownerForm.gender || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Clinic Details Card */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200 relative">
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(2)}
                        className="absolute right-6 top-6 text-xs text-blue-600 hover:underline font-bold"
                      >
                        Edit
                      </button>
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" /> Clinic Details
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div><span className="text-slate-400 font-medium">Clinic Name:</span> <span className="text-slate-800 font-semibold">{clinicForm.name || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-medium">Type:</span> <span className="text-slate-800 font-semibold">{clinicForm.clinicType || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-medium">Address:</span> <span className="text-slate-800">{`${clinicForm.addressLine1 || ''}, ${clinicForm.city || ''}, ${clinicForm.state || ''} - ${clinicForm.pincode || ''}`}</span></div>
                        <div><span className="text-slate-400 font-medium">Established Year:</span> <span className="text-slate-800">{clinicForm.establishedYear || 'N/A'}</span></div>
                        <div><span className="text-slate-400 font-medium">Timings:</span> <span className="text-slate-800">{clinicForm.timings.map(t => `${t.dayRange} (${t.startTime} - ${t.endTime})`).join(', ')}</span></div>
                        <div><span className="text-slate-400 font-medium">Consult Mode:</span> <span className="text-slate-800">{clinicForm.consultationMode}</span></div>
                      </div>
                    </div>

                    {/* Selected Plan card */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200 relative md:col-span-2">
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(3)}
                        className="absolute right-6 top-6 text-xs text-blue-600 hover:underline font-bold"
                      >
                        Edit
                      </button>
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" /> Selected Plan
                      </h4>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="text-base font-extrabold text-slate-900">{selectedPlanObj?.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{billingCycle} Billing Cycle</div>
                        </div>
                        <div className="text-right">
                          {promoApplied ? (
                            <div>
                              <span className="line-through text-slate-400 text-xs mr-2">
                                ₹{(billingCycle === 'monthly' ? selectedPlanObj?.priceMonthly : selectedPlanObj?.priceYearly)?.toLocaleString()}
                              </span>
                              <span className="text-xl font-black text-slate-900">
                                ₹{Math.max(0, (billingCycle === 'monthly' ? selectedPlanObj?.priceMonthly : selectedPlanObj?.priceYearly) - promoDiscount)?.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xl font-black text-slate-900">
                              ₹{(billingCycle === 'monthly' ? selectedPlanObj?.priceMonthly : selectedPlanObj?.priceYearly)?.toLocaleString()}
                            </span>
                          )}
                          <span className="text-xs text-slate-400"> / {billingCycle === 'monthly' ? 'month' : 'year'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission acceptance */}
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <label className="flex items-start gap-3 cursor-pointer mb-6">
                      <input 
                        type="checkbox" 
                        className="mt-1 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                        checked={hasAcceptedTerms}
                        onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                      />
                      <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                        I confirm all information is correct. By clicking "Proceed for Payment & Submit", I agree to the <span className="text-blue-600 hover:underline">Terms of Service</span> and <span className="text-blue-600 hover:underline">Privacy Policy</span>.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation action bar */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-8">
              {currentStep > 1 ? (
                <button 
                  type="button" 
                  onClick={handleBack}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-800 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4.5 h-4.5" /> Back
                </button>
              ) : (
                <Link 
                  to="/" 
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-800 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4.5 h-4.5" /> Back to Home
                </Link>
              )}

              <div className="flex items-center gap-3">
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> You can save and continue later
                </span>
                
                {currentStep < 4 ? (
                  <button 
                    type="button" 
                    onClick={handleNext}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    Save & Continue <ArrowRight className="w-4.5 h-4.5" />
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-750 disabled:bg-blue-400 text-white font-bold text-xs rounded-2xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    {isSubmitting ? "Submitting..." : "Proceed for Payment & Submit"}
                  </button>
                )}
              </div>
              </div>
            </div>

          {showMapPicker && (
            <MapPicker
              isOpen={showMapPicker}
              onClose={() => setShowMapPicker(false)}
              onSelectAddress={(addressObj) => {
                setClinicForm(prev => ({
                  ...prev,
                  addressLine1: addressObj.line1 || '',
                  addressLine2: addressObj.line2 || '',
                  city: addressObj.city || '',
                  state: addressObj.state || '',
                  pincode: addressObj.pincode || '',
                  country: addressObj.country || 'India',
                  latitude: addressObj.latitude || 26.8467,
                  longitude: addressObj.longitude || 80.9462
                }));
              }}
              initialAddress={{
                line1: clinicForm.addressLine1,
                line2: clinicForm.addressLine2,
                city: clinicForm.city,
                state: clinicForm.state,
                pincode: clinicForm.pincode,
                country: clinicForm.country
              }}
            />
          )}

          {showOtpModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col relative">
                <button 
                  type="button" 
                  onClick={() => setShowOtpModal(false)}
                  className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Mail className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-2">Verify Your Email</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  We have sent a 6-digit verification code to <span className="font-semibold text-slate-800">{ownerForm.email}</span>. Please enter it below.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      className="w-full text-center tracking-[0.5em] font-black text-xl px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition text-slate-800"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                    {otpError && (
                      <p className="text-xs text-red-650 font-bold mt-2 ml-1">{otpError}</p>
                    )}
                    {otpResent && !otpError && (
                      <p className="text-xs text-emerald-650 font-bold mt-2 ml-1">New code sent successfully!</p>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={otpLoading}
                      onClick={handleResendOtp}
                      className="flex-1 py-3 px-4 border border-slate-200 hover:bg-slate-50 rounded-2xl text-xs font-bold text-slate-650 transition disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                    <button
                      type="button"
                      disabled={otpLoading}
                      onClick={handleVerifyAndRegister}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:bg-blue-400"
                    >
                      {otpLoading ? "Verifying..." : "Verify & Submit"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Clinic Login Modal Overlay ─────────────────────────────────── */}
          {showLoginModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={e => e.target === e.currentTarget && setShowLoginModal(false)}>
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col relative">
                <button 
                  type="button" 
                  onClick={() => setShowLoginModal(false)}
                  className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="w-14 h-14 bg-slate-950 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-900/10">
                  <Building2 className="w-6 h-6" />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-1">Clinic Portal Login</h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">Log in to proceed with your setup, status, or dashboard.</p>
                
                {loginError && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                    {loginError}
                  </div>
                )}
                
                <form onSubmit={handleClinicLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Email Address</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        placeholder="owner@clinic.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 transition text-sm text-slate-800"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Password</label>
                    <div className="relative">
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 transition text-sm text-slate-800"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-50 mt-2"
                  >
                    {loginSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    {loginSubmitting ? 'Logging in...' : 'Sign In'}
                  </button>
                </form>
              </div>
            </div>
          )}

          </div>
        </div>

      </div>
  );
};

export default ClinicWizard;
