import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { clinicApi, promoApi, subscriptionApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, Lock, Calendar, MapPin,
  Check, ArrowRight, ArrowLeft, ShieldCheck,
  Clock, Globe, CheckCircle, HelpCircle, UploadCloud, Building2, X, RefreshCw,
  Eye, EyeOff, Shield, Sparkles, MessageSquare, CreditCard, PhoneCall, CheckSquare,
  AlertTriangle, AlertCircle, Zap, Star, Crown, Package
} from 'lucide-react';
import MapPicker from '../../components/common/MapPicker';
import PehalLogo from '../../components/common/PehalLogo';
import { motion, AnimatePresence } from 'framer-motion';

const FEATURE_LABELS = {
  appointments: 'Appointment Management',
  billing: 'Billing & Invoicing',
  prescriptions: 'Digital Prescriptions',
  emr: 'Electronic Medical Records (EMR)',
  sms: 'SMS & Email Reminders',
  reports: 'Daily & Financial Reports',
  multi_doctor: 'Multi-Doctor Management',
  ai_scheduling: 'AI Appointment Scheduling',
  pharmacy: 'Integrated Pharmacy Management',
  inventory: 'Medical Inventory Management',
  labs: 'Laboratory & Diagnostic Module',
  whatsapp: 'WhatsApp Notifications & Alerts',
  analytics: 'Advanced Clinical Analytics',
  symptom_checker: 'AI Symptom Checker',
  consultation_assistant: 'AI Clinical Consultation Assistant',
  voice_to_text: 'Voice-to-Text Clinical Dictation',
  ai_prescription_suggestions: 'AI Prescription & Drug Interaction Suggestions',
  ai_risk_scoring: 'AI Patient Risk Stratification',
  lab_recommendations: 'AI Lab Test Recommendations',
  online_consultation: 'Telemedicine & Video Consultation',
  multi_branch: 'Multi-Branch & Location Support',
  api_access: 'Developer API Access',
  unlimited_users: 'Unlimited Staff & Practitioners',
  unlimited_patients: 'Unlimited Patient Records',
  unlimited_branches: 'Unlimited Branch Locations',
  dedicated_server: 'Dedicated HIPAA-Ready Cloud Server',
  custom_branding: 'White-label & Custom Branding',
  insurance: 'Insurance & TPA Claims Processing',
  abdm: 'ABDM & Ayushman Bharat Integration',
  custom_apis: 'Custom Enterprise Integrations',
  priority_support: '24×7 Priority Healthcare Support'
};

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
  const [searchParams] = useSearchParams();
  const urlPlan = searchParams.get('plan');
  const urlBilling = searchParams.get('billing');

  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [stepThreeError, setStepThreeError] = useState('');
  const [billingCycle, setBillingCycle] = useState(urlBilling === 'yearly' ? 'yearly' : 'monthly');
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
  const [otpSeconds, setOtpSeconds] = useState(300);
  const [emailVerifiedMsg, setEmailVerifiedMsg] = useState(false);

  // 5-minute countdown timer effect
  useEffect(() => {
    let timer = null;
    if (showOtpModal && otpSeconds > 0) {
      timer = setInterval(() => {
        setOtpSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showOtpModal, otpSeconds]);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError('');
    try {
      let availablePlans = [];

      try {
        const response = await clinicApi.getRegistrationPlans();
        const extracted = response?.data?.plans || response?.plans || (Array.isArray(response?.data) ? response.data : []) || (Array.isArray(response) ? response : []);
        if (Array.isArray(extracted) && extracted.length > 0) {
          availablePlans = extracted;
        }
      } catch (e1) {
        console.warn('clinicApi.getRegistrationPlans failed, trying subscriptionApi:', e1);
      }

      if (!availablePlans || availablePlans.length === 0) {
        try {
          const response2 = await subscriptionApi.getPublicPlans();
          const extracted2 = response2?.data?.plans || response2?.plans || (Array.isArray(response2?.data) ? response2.data : []) || (Array.isArray(response2) ? response2 : []);
          if (Array.isArray(extracted2) && extracted2.length > 0) {
            availablePlans = extracted2;
          }
        } catch (e2) {
          console.warn('subscriptionApi.getPublicPlans failed:', e2);
        }
      }

      if (availablePlans && availablePlans.length > 0) {
        setPlans(availablePlans);
        setSelectedPlanId(prev => {
          if (prev && availablePlans.some(p => String(p._id) === String(prev))) return prev;
          if (urlPlan) {
            const matched = availablePlans.find(p => String(p._id) === String(urlPlan) || p.code === String(urlPlan).toUpperCase());
            if (matched) return matched._id;
          }
          const popularOrFirst = availablePlans.find(p => p.isPopular || p.code === 'PROFESSIONAL') || availablePlans[0];
          return popularOrFirst._id;
        });
      } else {
        setPlans([]);
        setPlansError('No subscription plans currently available.');
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
      setPlansError(err.response?.data?.message || err.message || 'Unable to fetch subscription plans.');
    } finally {
      setPlansLoading(false);
    }
  }, [urlPlan]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

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

  const scrollToFormTop = () => {
    const scrollContainers = document.querySelectorAll('.cw-scroll');
    scrollContainers.forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const errorEl = document.querySelector('.border-rose-500, .text-rose-500');
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        scrollToFormTop();
      }
    }, 50);
  };

  const validateStepOne = async () => {
    const newErrors = {};
    if (!ownerForm.name || !ownerForm.name.trim()) newErrors.name = 'Owner name is required.';
    if (!ownerForm.email || !ownerForm.email.trim()) newErrors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerForm.email.trim())) newErrors.email = 'Invalid email address format.';
    if (!ownerForm.phone || !ownerForm.phone.trim()) newErrors.phone = 'Mobile number is required.';
    else if (ownerForm.phone.replace(/\D/g, '').length !== 10) newErrors.phone = 'Mobile number must be exactly 10 digits.';
    if (!ownerForm.password) newErrors.password = 'Password is required.';
    else if (ownerForm.password.length < 8) newErrors.password = 'Password must be at least 8 characters.';
    if (ownerForm.password !== ownerForm.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    
    const dobVal = validateDOB(ownerForm.dob);
    if (!dobVal.valid) newErrors.dob = dobVal.error;

    if (ownerForm.aadhaar && ownerForm.aadhaar.trim()) {
      if (ownerForm.aadhaar.replace(/\D/g, '').length !== 12) newErrors.aadhaar = 'Aadhaar must be exactly 12 digits.';
    }
    if (ownerForm.pan && ownerForm.pan.trim()) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(ownerForm.pan.trim().toUpperCase())) newErrors.pan = 'Invalid PAN format (e.g. ABCDE1234F).';
    }
    if (!ownerForm.address || !ownerForm.address.trim()) newErrors.address = 'Residential address is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please complete all required owner details.');
      scrollToFirstError();
      return false;
    }

    try {
      const [emailRes, phoneRes] = await Promise.allSettled([
        clinicApi.validateEmail({ email: ownerForm.email.trim() }),
        clinicApi.validatePhone({ phone: ownerForm.phone.replace(/\D/g, '') })
      ]);

      if (emailRes.status === 'fulfilled' && emailRes.value?.data?.isUnique === false) {
        newErrors.email = 'Email already registered.';
      }
      if (phoneRes.status === 'fulfilled' && phoneRes.value?.data?.isUnique === false) {
        newErrors.phone = 'Mobile number already registered.';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast.error('Email or mobile number is already in use.');
        scrollToFirstError();
        return false;
      }
      setErrors({});
      return true;
    } catch {
      setErrors({});
      return true;
    }
  };

  const validateStepTwo = async () => {
    const newErrors = {};
    if (!clinicForm.name || !clinicForm.name.trim()) newErrors.clinicName = 'Clinic official name is required.';
    if (!clinicForm.registrationNumber || !clinicForm.registrationNumber.trim()) newErrors.registrationNumber = 'Registration number is required.';
    if (!clinicForm.establishedYear) newErrors.establishedYear = 'Establishment year is required.';
    else {
      const year = parseInt(clinicForm.establishedYear, 10);
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear) newErrors.establishedYear = `Must be between 1800 and ${currentYear}.`;
    }
    if (!clinicForm.addressLine1 || !clinicForm.addressLine1.trim()) newErrors.addressLine1 = 'Street address is required.';
    if (!clinicForm.pincode || !clinicForm.pincode.trim()) newErrors.pincode = 'Pincode is required.';
    else if (clinicForm.pincode.replace(/\D/g, '').length !== 6) newErrors.pincode = 'Pincode must be exactly 6 digits.';
    if (!clinicForm.city || !clinicForm.city.trim()) newErrors.city = 'City name is required.';
    if (!clinicForm.state || !clinicForm.state.trim()) newErrors.state = 'State name is required.';
    if (!clinicForm.contactNumber || !clinicForm.contactNumber.trim()) newErrors.contactNumber = 'Clinic phone number is required.';
    else if (clinicForm.contactNumber.replace(/\D/g, '').length !== 10) newErrors.contactNumber = 'Clinic phone must be exactly 10 digits.';
    if (!clinicForm.shortDescription || !clinicForm.shortDescription.trim()) newErrors.shortDescription = 'Clinic description is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please complete all required clinic details.');
      scrollToFirstError();
      return false;
    }

    try {
      const res = await clinicApi.validateRegistrationNumber({ registrationNumber: clinicForm.registrationNumber.trim() });
      if (res?.data?.isUnique === false) {
        newErrors.registrationNumber = 'Registration number already registered.';
        setErrors(newErrors);
        toast.error('Registration number already registered.');
        scrollToFirstError();
        return false;
      }
      setErrors({});
      return true;
    } catch {
      setErrors({});
      return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const valid = await validateStepOne();
      if (valid) {
        setErrors({});
        setCurrentStep(2);
        scrollToFormTop();
      }
    } else if (currentStep === 2) {
      const valid = await validateStepTwo();
      if (valid) {
        setErrors({});
        setStepThreeError('');
        setCurrentStep(3);
        scrollToFormTop();
        fetchPlans();
      }
    } else if (currentStep === 3) {
      if (!selectedPlanId || !plans.some(p => p._id === selectedPlanId)) {
        setStepThreeError('Please select a subscription plan to continue.');
        toast.error('Please select a subscription plan.');
        return;
      }
      setStepThreeError('');
      setCurrentStep(4);
      scrollToFormTop();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      scrollToFormTop();
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
      setWizardError('Please accept the registration terms & conditions to proceed to payment.');
      return;
    }
    try {
      setWizardError('');
      setIsSubmitting(true);
      const res = await clinicApi.sendOtp({ email: ownerForm.email });
      setShowOtpModal(true);
      setOtpCode('');
      setOtpError('');
      setOtpResent(false);
      setOtpSeconds(300); // 5 minutes countdown
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send OTP verification. Please try again.';
      setWizardError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError('');
      await clinicApi.verifyOtp({ email: ownerForm.email, otp: otpCode.trim() });
      setEmailVerifiedMsg(true);

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

      const res = await clinicApi.submitRegistration(payload);
      setShowOtpModal(false);

      const registeredUser = res.data?.user;
      const token = res.data?.accessToken;
      const registeredClinic = res.data?.clinic;

      if (token && registeredUser && login) {
        login(registeredUser, token);
      }

      toast.success('✓ Email verified & clinic registration created! Redirecting to payment...');

      // Transition to subscription payment screen
      navigate('/clinic-setup/payment', {
        state: {
          clinic: registeredClinic,
          plan: activePlanObj,
          billingCycle
        }
      });
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
      setOtpSeconds(300);
      toast.success('Verification code resent.');
    } catch (err) {
      setOtpError('Failed to resend code. Please try again.');
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
      <div className="min-h-screen bg-[#F5F9FE] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#0066FF]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="bg-white rounded-3xl p-8 max-w-xl w-full text-center shadow-2xl border border-[#D9E5F3] relative z-10 space-y-6">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-[#16A34A] shadow-inner">
            <CheckCircle className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-[#071B3A] tracking-tight">Registration Submitted</h1>
            <p className="text-sm text-[#647A9E] leading-relaxed font-semibold">
              Your clinic details have been submitted successfully. Verification usually takes 24–48 hours.
            </p>
          </div>

          <div className="bg-[#F8FBFF] border border-[#D9E5F3] rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5">
            <span className="text-[10px] font-black text-[#647A9E] uppercase tracking-widest block">Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm animate-pulse">
              <Clock className="w-3.5 h-3.5" /> Waiting for Super Admin Approval
            </span>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 text-white rounded-2xl text-xs font-black shadow-lg transition duration-200"
              style={{ background: 'linear-gradient(135deg, #1683FF 0%, #0057D9 100%)', boxShadow: '0 4px 14px rgba(0, 102, 255, 0.25)' }}
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col font-sans"
      style={{
        height: '100dvh',
        minHeight: '100vh',
        backgroundColor: '#F5F9FE',
        backgroundImage: [
          'radial-gradient(circle at 15% 15%, rgba(0, 102, 255, 0.04) 0%, transparent 45%)',
          'radial-gradient(circle at 85% 85%, rgba(22, 131, 255, 0.03) 0%, transparent 45%)'
        ].join(', ')
      }}
    >
      <style>{`
        :root {
          --primary-blue: #0066FF;
          --primary-blue-dark: #0057D9;
          --primary-blue-light: #EAF4FF;
          --primary-blue-soft: #F4F9FF;
          --bright-blue: #1683FF;
          --secondary-blue: #0A5FE7;
          --deep-blue: #0645C0;
          --blue-tint: #E8F2FF;
          --soft-blue: #DCEBFF;
          --text-primary: #071B3A;
          --text-secondary: #647A9E;
          --border-color: #D9E5F3;
          --surface: #FFFFFF;
          --background: #F5F9FE;
          --success: #16A34A;
          --warning: #F59E0B;
          --error: #EF4444;
        }
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
      <div className="w-full px-5 pt-3 pb-2 shrink-0 z-40 bg-[#F5F9FE]/95 backdrop-blur-md">
        <header className="max-w-[1840px] mx-auto bg-white border border-[#D9E5F3] px-5 py-2.5 rounded-full flex items-center justify-between shadow-sm">
          {/* Logo */}
          <Link to={"/"}>
          <div className="flex items-center gap-2 shrink-0">
            <PehalLogo variant="primary" height={32} />
            <div className="h-5 w-[1px] bg-[#D9E5F3] mx-1.5" />
            <div>
              <span className="text-[11px] font-black text-[#071B3A] block leading-none">AICMS</span>
              <span className="text-[8px] font-bold text-[#647A9E] block tracking-wider uppercase mt-0.5">AI-CMS Enterprise</span>
            </div>
          </div>
          </Link>

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
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-[#0066FF] border-[#0066FF] text-white shadow-xs'
                          : isActive
                          ? 'bg-white border-[#0066FF] text-[#0066FF] shadow-xs'
                          : 'bg-white border-[#D9E5F3] text-[#94A3B8]'
                      }`}
                    >
                      {isCompleted ? <Check size={10} strokeWidth={3} /> : s.id}
                    </button>
                    <span
                      className={`block text-[8px] font-black leading-none mt-1 ${
                        isActive ? 'text-[#0066FF]' : isCompleted ? 'text-[#071B3A]' : 'text-[#94A3B8]'
                      }`}
                    >
                      {s.name.split(' ')[0]} Step {s.id}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-3.5 h-[2px] mx-1 rounded-full ${
                        isCompleted ? 'bg-[#0066FF]' : 'bg-[#D9E5F3]'
                      }`}
                    />
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
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D9E5F3] hover:bg-[#F8FBFF] hover:border-[#1683FF] hover:text-[#0066FF] text-[#071B3A] rounded-full text-[11px] font-extrabold transition shadow-xs bg-white cursor-pointer"
            >
              <CheckSquare size={12} className="text-[#0066FF]" /> Save Draft
            </button>
            <Link
              to="/contact-support"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D9E5F3] hover:bg-[#F8FBFF] hover:border-[#1683FF] hover:text-[#0066FF] text-[#071B3A] rounded-full text-[11px] font-extrabold transition bg-white"
            >
              <HelpCircle size={12} className="text-[#0066FF]" /> Help
            </Link>
            <Link
              to="/book-demo"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D9E5F3] hover:bg-[#F8FBFF] hover:border-[#1683FF] hover:text-[#0066FF] text-[#071B3A] rounded-full text-[11px] font-extrabold transition bg-white"
            >
              <PhoneCall size={12} className="text-[#0066FF]" /> Contact Sales
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-full text-[11px] font-extrabold transition"
            >
              <X size={12} /> Exit Setup
            </Link>
          </div>
        </header>
      </div>

      {/* ── 3-COLUMN WORKSPACE ── */}
      <div className="flex-1 max-w-[1840px] w-full mx-auto px-5 py-3 flex flex-col lg:flex-row gap-4" style={{ minHeight: 0, overflow: 'hidden' }}>

        {/* ==================== LEFT SIDEBAR ==================== */}
        <div
          className="cw-scroll w-full lg:w-[22%] shrink-0 flex flex-col gap-4 bg-white border border-[#D9E5F3] rounded-2xl p-5 shadow-xs"
          style={{ overflowY: 'auto' }}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-[#071B3A] mb-1">Clinic Setup</h3>
              <p className="text-[11px] text-[#647A9E] font-bold leading-normal">Complete all steps to launch your clinic on AICMS</p>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex flex-col items-center justify-center py-6 bg-[#F8FBFF] rounded-2xl border border-[#D9E5F3]">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="46" stroke="#E1EAF5" strokeWidth="6.5" fill="transparent" />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="#0066FF"
                    strokeWidth="7"
                    fill="transparent"
                    strokeDasharray="289"
                    animate={{ strokeDashoffset: 289 - (289 * progress) / 100 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-[#071B3A]">{progress}%</span>
                  <span className="text-[9px] text-[#7A91B3] font-extrabold uppercase">Completed</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#647A9E] mt-4 flex items-center gap-1.5">
                <Clock size={12} className="text-[#0066FF]" /> Estimated time: 8 Minutes
              </span>
            </div>

            {/* Vertical timeline steps */}
            <div className="space-y-4 pl-2 relative">
              <div className="absolute top-1 bottom-1 left-[15px] w-[2px] bg-[#D9E5F3]" />
              {STEPS.map((s) => {
                const isActive = currentStep === s.id;
                const isCompleted = currentStep > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!isCompleted && !isActive}
                    onClick={() => setCurrentStep(s.id)}
                    className="w-full text-left flex gap-3.5 items-start relative z-10 hover:bg-[#F8FBFF] p-1.5 rounded-xl transition duration-150 group cursor-pointer disabled:cursor-default"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] border transition ${
                      isCompleted ? "bg-[#0066FF] border-[#0066FF] text-white"
                      : isActive ? "bg-white border-2 border-[#0066FF] text-[#0066FF] shadow-xs"
                      : "bg-white border border-[#D9E5F3] text-[#94A3B8]"
                    }`}>
                      {isCompleted ? <Check size={12} strokeWidth={3} /> : s.id}
                    </div>
                    <div className="flex-1">
                      <h5 className={`text-xs font-black leading-tight ${isActive ? "text-[#0066FF]" : isCompleted ? "text-[#071B3A]" : "text-[#647A9E]"} group-hover:text-[#0066FF] transition-colors`}>
                        {s.name}
                      </h5>
                      <span className="text-[9px] text-[#647A9E] block mt-0.5">{isActive ? 'In progress' : isCompleted ? 'Completed' : 'Pending'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Security Parameters */}
            <div className="bg-[#F8FBFF] border border-[#D9E5F3] rounded-2xl p-4.5 space-y-3.5">
              <span className="text-[9px] font-black text-[#7A91B3] uppercase tracking-widest block">Security parameters</span>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Shield size={14} className="text-[#0066FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-[#071B3A] block leading-tight">Secure Cloud</span>
                    <span className="text-[9px] text-[#647A9E] block">Enterprise grade security</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CheckCircle size={14} className="text-[#16A34A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-[#071B3A] block leading-tight">HIPAA Ready</span>
                    <span className="text-[9px] text-[#647A9E] block">Healthcare compliant</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Sparkles size={14} className="text-[#0066FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-[#071B3A] block leading-tight">AI Powered</span>
                    <span className="text-[9px] text-[#647A9E] block">Smart automation</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <RefreshCw size={14} className="text-[#0066FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-[#071B3A] block leading-tight">Auto Backup</span>
                    <span className="text-[9px] text-[#647A9E] block">Your data is always safe</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-[#F8FBFF] p-4 rounded-2xl border border-[#D9E5F3] space-y-3">
              <div>
                <span className="text-xs font-black text-[#071B3A] block">Need Help?</span>
                <span className="text-[10px] text-[#647A9E] mt-0.5 block leading-relaxed">We're here to help you set up your clinic.</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[#647A9E]">
                <Link to={'/contact-support'} className="flex items-center gap-1.5 py-2 justify-center bg-white border border-[#D9E5F3] rounded-xl hover:text-[#0066FF] hover:border-[#1683FF] transition"><MessageSquare size={11} className="text-[#0066FF]" /> Customer Support</Link>
                <Link to={'/book-demo'} className="flex items-center gap-1.5 py-2 justify-center bg-white border border-[#D9E5F3] rounded-xl hover:text-[#0066FF] hover:border-[#1683FF] transition"><Calendar size={11} className="text-[#0066FF]" /> Book Demo</Link>
                <Link to={'https://api.whatsapp.com/send/?phone=8130916134&text&type=phone_number&app_absent=0'} className="flex items-center gap-1.5 py-2 justify-center bg-white border border-[#D9E5F3] rounded-xl hover:text-[#0066FF] hover:border-[#1683FF] transition"><Globe size={11} className="text-[#0066FF]" />Chat</Link>
                {/* <a href="#" className="flex items-center gap-1.5 py-2 justify-center bg-white border border-[#D9E5F3] rounded-xl hover:text-[#0066FF] hover:border-[#1683FF] transition"><Clock size={11} className="text-[#0066FF]" /> Video Guide</a> */}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== CENTER SCROLLABLE FORM ==================== */}
        <div className="flex-1 lg:w-[56%] flex flex-col bg-white rounded-2xl border border-[#D9E5F3] overflow-hidden" style={{ boxShadow: '0 8px 24px rgba(0, 102, 255, 0.08)' }}>
          {/* Sticky step header inside card */}
          <div className="shrink-0 px-8 pt-7 pb-5 border-b border-[#D9E5F3] bg-white">
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
                    <h3 className="text-xl font-black text-[#071B3A]">Step {currentStep} of 4: {STEPS[currentStep - 1]?.name}</h3>
                    <p className="text-xs text-[#647A9E] mt-1 font-medium">{STEPS[currentStep - 1]?.desc}</p>
                  </div>
                  <div className="w-11 h-11 bg-[#EAF4FF] text-[#0066FF] rounded-2xl flex items-center justify-center shrink-0">
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
                    <div className="border border-[#D9E5F3] rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FBFF] border-b border-[#D9E5F3]">
                        <div className="w-8 h-8 bg-[#EAF4FF] text-[#0066FF] rounded-xl flex items-center justify-center shrink-0">
                          <User size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-[#071B3A] block leading-tight">Personal Information</span>
                          <span className="text-[10px] text-[#647A9E] font-medium">Basic details about the clinic owner</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Owner Full Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#647A9E] pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Enter owner full name"
                                className={`w-full pl-9 pr-3 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.name ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
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
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Designation <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#647A9E] pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Enter designation (e.g., Doctor, Director)"
                                className={`w-full pl-9 pr-3 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.designation ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
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
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                            <input
                              type="date"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.dob ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                              value={ownerForm.dob}
                              onChange={(e) => {
                                setOwnerForm({ ...ownerForm, dob: e.target.value });
                                if (errors.dob) setErrors(prev => ({ ...prev, dob: '' }));
                              }}
                            />
                            {errors.dob && <p className="text-[10px] text-rose-500 mt-1">{errors.dob}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Gender <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-3 bg-white border border-[#D9E5F3] rounded-xl outline-none text-sm text-[#071B3A] font-semibold focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
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

                    <div className="border border-[#D9E5F3] rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FBFF] border-b border-[#D9E5F3]">
                        <div className="w-8 h-8 bg-[#EAF4FF] text-[#0066FF] rounded-xl flex items-center justify-center shrink-0">
                          <Phone size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-[#071B3A] block leading-tight">Contact Information</span>
                          <span className="text-[10px] text-[#647A9E] font-medium">We will use this information to contact you</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Email Address <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#647A9E] pointer-events-none" />
                              <input
                                type="email"
                                placeholder="Enter email address"
                                className={`w-full pl-9 pr-24 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.email ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                                value={ownerForm.email}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, email: e.target.value });
                                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                  handleValidateEmail(e.target.value);
                                }}
                              />
                              {ownerEmailValidation && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase ${
                                  ownerEmailValidation.status === 'valid' ? 'text-[#16A34A]' : ownerEmailValidation.status === 'checking' ? 'text-[#647A9E]' : 'text-rose-500'
                                }`}>
                                  {ownerEmailValidation.status === 'checking' ? 'Checking...' : ownerEmailValidation.status === 'valid' ? '✓ Unique' : 'Taken'}
                                </span>
                              )}
                            </div>
                            {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#647A9E] pointer-events-none" />
                              <input
                                type="tel"
                                placeholder="Enter mobile number"
                                className={`w-full pl-9 pr-24 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.phone ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                                value={ownerForm.phone}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) });
                                  if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                  handleValidatePhone(e.target.value);
                                }}
                              />
                              {ownerPhoneValidation && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase ${
                                  ownerPhoneValidation.status === 'valid' ? 'text-[#16A34A]' : ownerPhoneValidation.status === 'checking' ? 'text-[#647A9E]' : 'text-rose-500'
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

                    <div className="border border-[#D9E5F3] rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FBFF] border-b border-[#D9E5F3]">
                        <div className="w-8 h-8 bg-[#EAF4FF] text-[#0066FF] rounded-xl flex items-center justify-center shrink-0">
                          <Lock size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-[#071B3A] block leading-tight">Account Security</span>
                          <span className="text-[10px] text-[#647A9E] font-medium">Create a secure account to access AICMS</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#647A9E] pointer-events-none" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter owner account password"
                                className={`w-full pl-9 pr-10 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.password ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                                value={ownerForm.password}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, password: e.target.value });
                                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#647A9E] hover:text-[#071B3A] outline-none"
                              >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#647A9E] pointer-events-none" />
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Re-enter password"
                                className={`w-full pl-9 pr-10 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.confirmPassword ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                                value={ownerForm.confirmPassword}
                                onChange={(e) => {
                                  setOwnerForm({ ...ownerForm, confirmPassword: e.target.value });
                                  if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#647A9E] hover:text-[#071B3A] outline-none"
                              >
                                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            {errors.confirmPassword && <p className="text-[10px] text-rose-500 mt-1">{errors.confirmPassword}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#D9E5F3] rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FBFF] border-b border-[#D9E5F3]">
                        <div className="w-8 h-8 bg-[#EAF4FF] text-[#0066FF] rounded-xl flex items-center justify-center shrink-0">
                          <Shield size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-[#071B3A] block leading-tight">Identity Information</span>
                          <span className="text-[10px] text-[#647A9E] font-medium">Official identification for verification</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">PAN Number (Optional)</label>
                            <input
                              type="text"
                              maxLength="10"
                              placeholder="Enter PAN number"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.pan ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                              value={ownerForm.pan}
                              onChange={(e) => {
                                setOwnerForm({ ...ownerForm, pan: e.target.value.toUpperCase() });
                                if (errors.pan) setErrors(prev => ({ ...prev, pan: '' }));
                              }}
                            />
                            {errors.pan && <p className="text-[10px] text-rose-500 mt-1">{errors.pan}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Aadhaar Number (Optional)</label>
                            <input
                              type="text"
                              maxLength="12"
                              placeholder="Enter Aadhaar number"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.aadhaar ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
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
                            <label className="block text-[11px] font-extrabold text-[#071B3A]">Residential Address <span className="text-red-500">*</span></label>
                            <button
                              type="button"
                              onClick={() => { setMapTarget('owner'); setShowMapPicker(true); }}
                              className="text-[10px] font-black text-[#0066FF] hover:text-[#0645C0] flex items-center gap-1 cursor-pointer transition"
                            >
                              <MapPin size={11} /> Locate your Address
                            </button>
                          </div>
                          <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#647A9E] pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Enter owner residential address"
                              className={`w-full pl-9 pr-3 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] placeholder-[#8AA0BE] ${errors.address ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                              value={ownerForm.address}
                              onChange={(e) => {
                                setOwnerForm({ ...ownerForm, address: e.target.value });
                                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                              }}
                            />
                          </div>
                          {errors.address && <p className="text-[10px] text-rose-500 mt-1">{errors.address}</p>}
                        </div>

                        <div className="flex items-center gap-4 pt-3 border-t border-[#D9E5F3]">
                          <div className="w-14 h-14 rounded-xl bg-[#F8FBFF] border border-[#D9E5F3] overflow-hidden flex items-center justify-center shrink-0">
                            {localPreviews.profilePhoto ? (
                              <img src={localPreviews.profilePhoto} alt="Profile preview" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-7 h-7 text-[#647A9E]" />
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-[#071B3A] mb-1">Profile Photo <span className="text-[#647A9E] font-medium">(Optional)</span></p>
                            <input type="file" id="profilePhotoFile" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0], 'profilePhoto')} />
                            <label htmlFor="profilePhotoFile" className="px-3.5 py-1.5 border border-[#D9E5F3] hover:bg-[#F8FBFF] hover:border-[#1683FF] hover:text-[#0066FF] rounded-xl text-[10px] font-extrabold cursor-pointer transition inline-flex items-center gap-1.5 text-[#071B3A]">
                              <UploadCloud size={12} className="text-[#0066FF]" /> Upload Image
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#D9E5F3] rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FBFF] border-b border-[#D9E5F3]">
                        <div className="w-8 h-8 bg-[#EAF4FF] text-[#0066FF] rounded-xl flex items-center justify-center shrink-0">
                          <Globe size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-[#071B3A] block leading-tight">Additional Details</span>
                          <span className="text-[10px] text-[#647A9E] font-medium">More information about the owner</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Nationality <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-3 bg-white border border-[#D9E5F3] rounded-xl outline-none text-sm text-[#071B3A] font-semibold focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                              value={ownerForm.nationality}
                              onChange={(e) => setOwnerForm({ ...ownerForm, nationality: e.target.value })}
                            >
                              <option value="Indian">Indian</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Preferred Language <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-3 bg-white border border-[#D9E5F3] rounded-xl outline-none text-sm text-[#071B3A] font-semibold focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
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
                    <div className="border border-[#D9E5F3] rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FBFF] border-b border-[#D9E5F3]">
                        <div className="w-8 h-8 bg-[#EAF4FF] text-[#0066FF] rounded-xl flex items-center justify-center shrink-0">
                          <Building2 size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-[#071B3A] block">Clinic Details</span>
                          <span className="text-[10px] text-[#647A9E] font-bold">Roster parameters and coordinates</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Clinic Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Enter clinic official name"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.clinicName ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                              value={clinicForm.name}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, name: e.target.value });
                                if (errors.clinicName) setErrors(prev => ({ ...prev, clinicName: '' }));
                              }}
                            />
                            {errors.clinicName && <p className="text-[10px] text-rose-500 mt-1">{errors.clinicName}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Registration Number <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="e.g. REG-12345"
                                className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.registrationNumber ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                                value={clinicForm.registrationNumber}
                                onChange={(e) => {
                                  setClinicForm({ ...clinicForm, registrationNumber: e.target.value });
                                  if (errors.registrationNumber) setErrors(prev => ({ ...prev, registrationNumber: '' }));
                                }}
                                onBlur={(e) => handleValidateRegNumber(e.target.value)}
                              />
                              {regNumValidation && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase ${
                                  regNumValidation.status === 'valid' ? 'text-[#16A34A]' : regNumValidation.status === 'checking' ? 'text-[#647A9E]' : 'text-rose-500'
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
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Established Year <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              placeholder="YYYY"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.establishedYear ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                              value={clinicForm.establishedYear}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, establishedYear: e.target.value.replace(/\D/g, '').slice(0, 4) });
                                if (errors.establishedYear) setErrors(prev => ({ ...prev, establishedYear: '' }));
                              }}
                            />
                            {errors.establishedYear && <p className="text-[10px] text-rose-500 mt-1">{errors.establishedYear}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Consultation Mode</label>
                            <select
                              className="w-full px-4 py-3 bg-white border border-[#D9E5F3] rounded-xl outline-none text-sm text-[#071B3A] font-semibold focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                              value={clinicForm.consultationMode}
                              onChange={(e) => setClinicForm({ ...clinicForm, consultationMode: e.target.value })}
                            >
                              <option value="In-Clinic">In-Clinic</option>
                              <option value="Video-Consultation">Video Consultation</option>
                              <option value="Hybrid">Hybrid</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Specialties</label>
                            <input
                              type="text"
                              placeholder="General Medicine, Cardiology"
                              className="w-full px-4 py-3 bg-white border border-[#D9E5F3] rounded-xl text-sm outline-none font-semibold text-[#071B3A] focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10"
                              value={clinicForm.specialties}
                              onChange={(e) => setClinicForm({ ...clinicForm, specialties: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Clinic Street Address <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="123 MG Road"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.addressLine1 ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
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
                              <label className="block text-[11px] font-extrabold text-[#071B3A]">PIN Code <span className="text-red-500">*</span></label>
                              <button
                                type="button"
                                onClick={() => { setMapTarget('clinic'); setShowMapPicker(true); }}
                                className="text-[10px] font-black text-[#0066FF] hover:text-[#0645C0] flex items-center gap-1 cursor-pointer transition"
                              >
                                <MapPin size={11} /> Locate on Map
                              </button>
                            </div>
                            <input
                              type="text"
                              maxLength="6"
                              placeholder="560001"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.pincode ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
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
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">City <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Bengaluru"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.city ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                              value={clinicForm.city}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, city: e.target.value });
                                if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
                              }}
                            />
                            {errors.city && <p className="text-[10px] text-rose-500 mt-1">{errors.city}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">State <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Karnataka"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.state ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                              value={clinicForm.state}
                              onChange={(e) => {
                                setClinicForm({ ...clinicForm, state: e.target.value });
                                if (errors.state) setErrors(prev => ({ ...prev, state: '' }));
                              }}
                            />
                            {errors.state && <p className="text-[10px] text-rose-500 mt-1">{errors.state}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Clinic Phone <span className="text-red-500">*</span></label>
                            <input
                              type="tel"
                              placeholder="9876543210"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.contactNumber ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
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
                          <label className="block text-[11px] font-extrabold text-[#071B3A] mb-1.5">Clinic Description <span className="text-red-500">*</span></label>
                          <textarea
                            rows="2"
                            placeholder="Brief overview of your clinic and healthcare practice."
                            className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition text-sm text-[#071B3A] ${errors.shortDescription ? 'border-rose-500 bg-rose-50/10' : 'border-[#D9E5F3]'}`}
                            value={clinicForm.shortDescription}
                            onChange={(e) => {
                              setClinicForm({ ...clinicForm, shortDescription: e.target.value });
                              if (errors.shortDescription) setErrors(prev => ({ ...prev, shortDescription: '' }));
                            }}
                          />
                          {errors.shortDescription && <p className="text-[10px] text-rose-500 mt-1">{errors.shortDescription}</p>}
                        </div>

                        <div className="flex items-center gap-4 pt-2 border-t border-[#D9E5F3]">
                          <div className="w-14 h-14 bg-[#F8FBFF] border border-[#D9E5F3] rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                            {localPreviews.logo ? (
                              <img src={localPreviews.logo} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-7 h-7 text-[#0066FF]" />
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[#071B3A] mb-1">Clinic Logo</p>
                            <input
                              type="file"
                              id="clinicLogo"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e.target.files[0], 'logo')}
                            />
                            <label
                              htmlFor="clinicLogo"
                              className="px-3.5 py-1.5 border border-[#D9E5F3] hover:bg-[#F8FBFF] hover:border-[#1683FF] hover:text-[#0066FF] rounded-xl text-[10px] font-extrabold cursor-pointer transition inline-flex items-center gap-1.5 text-[#071B3A]"
                            >
                              <UploadCloud size={12} className="text-[#0066FF]" /> Upload Logo
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: SUBSCRIPTION SELECTION ── */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FBFF] p-4 rounded-2xl border border-[#D9E5F3]">
                      <div>
                        <h4 className="text-sm font-black text-[#071B3A] flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[#0066FF]" /> Select Subscription Plan
                        </h4>
                        <p className="text-[11px] text-[#647A9E] font-medium mt-0.5">
                          Choose a clinic workspace scale configured and managed by Super Admin.
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D9E5F3] shadow-sm self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                            billingCycle === 'monthly' ? 'bg-[#0066FF] text-white shadow-sm' : 'text-[#647A9E] hover:text-[#071B3A]'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('yearly')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                            billingCycle === 'yearly' ? 'bg-[#0066FF] text-white shadow-sm' : 'text-[#647A9E] hover:text-[#071B3A]'
                          }`}
                        >
                          <span>Yearly</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            billingCycle === 'yearly' ? 'bg-white text-[#0066FF]' : 'bg-[#EAF4FF] text-[#0066FF]'
                          }`}>
                            Save 20%
                          </span>
                        </button>
                      </div>
                    </div>

                    {stepThreeError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between gap-2 animate-shake">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{stepThreeError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStepThreeError('')}
                          className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* SKELETON LOADING STATE */}
                    {plansLoading && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(n => (
                          <div
                            key={n}
                            className="flex flex-col h-[520px] rounded-2xl border border-[#D9E5F3] bg-white p-5 animate-pulse justify-between"
                          >
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <div className="w-32 h-5 bg-slate-200 rounded-lg" />
                                  <div className="w-16 h-3 bg-slate-100 rounded-md" />
                                </div>
                                <div className="w-20 h-7 bg-slate-200 rounded-lg" />
                              </div>
                              <div className="w-full h-10 bg-slate-100 rounded-xl" />
                              <div className="space-y-2 pt-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div key={i} className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 bg-slate-200 rounded-full shrink-0" />
                                    <div className="w-4/5 h-3.5 bg-slate-100 rounded" />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="w-full h-10 bg-slate-200 rounded-xl" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ERROR STATE */}
                    {!plansLoading && plansError && (
                      <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-rose-200 space-y-4">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-[#071B3A]">Failed to Load Subscription Plans</h4>
                          <p className="text-xs text-[#647A9E] max-w-sm mx-auto leading-relaxed">{plansError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={fetchPlans}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#071B3A] text-white rounded-xl text-xs font-black hover:bg-[#0066FF] transition cursor-pointer shadow-sm"
                        >
                          <RefreshCw size={12} /> Retry Loading Plans
                        </button>
                      </div>
                    )}

                    {/* EMPTY STATE */}
                    {!plansLoading && !plansError && plans.length === 0 && (
                      <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#D9E5F3] space-y-4">
                        <div className="w-12 h-12 bg-[#F8FBFF] text-[#647A9E] rounded-2xl flex items-center justify-center mx-auto">
                          <Package className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-[#071B3A]">No Plans Available</h4>
                          <p className="text-xs text-[#647A9E] max-w-md mx-auto leading-relaxed">
                            No subscription plans are currently available. Please contact your administrator.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={fetchPlans}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F8FBFF] border border-[#D9E5F3] text-[#071B3A] hover:bg-[#EAF4FF] hover:text-[#0066FF] rounded-xl text-xs font-black transition cursor-pointer"
                        >
                          <RefreshCw size={12} /> Refresh
                        </button>
                      </div>
                    )}

                    {/* DYNAMIC PLAN CARDS WITH INTERNAL SCROLLING */}
                    {!plansLoading && !plansError && plans.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plans.map(p => {
                          const isSelected = selectedPlanId === p._id;
                          const monthlyPrice = p.priceMonthly ?? p.price ?? 0;
                          const yearlyPrice = p.priceYearly ?? (monthlyPrice * 12);
                          const activePrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
                          
                          // Calculate yearly savings percentage if applicable
                          let yearlyDiscountPct = 0;
                          if (monthlyPrice > 0 && yearlyPrice < (monthlyPrice * 12)) {
                            yearlyDiscountPct = Math.round((1 - (yearlyPrice / (monthlyPrice * 12))) * 100);
                          }

                          return (
                            <div
                              key={p._id}
                              onClick={() => {
                                setSelectedPlanId(p._id);
                                if (stepThreeError) setStepThreeError('');
                              }}
                              className={`flex flex-col h-[520px] rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 relative group select-none ${
                                isSelected
                                  ? 'border-[#0066FF] bg-[#F8FBFF] shadow-[0_8px_24px_rgba(0,102,255,0.12)]'
                                  : 'border-[#D9E5F3] bg-white hover:border-[#B8D7FF] hover:shadow-sm'
                              }`}
                            >
                              {/* Selected check badge */}
                              {isSelected && (
                                <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-[#0066FF] text-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-white z-10">
                                  <Check size={13} className="stroke-[3]" />
                                </div>
                              )}

                              {/* FIXED HEADER */}
                              <div className="shrink-0 pb-3 border-b border-[#D9E5F3] space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className="text-xs font-black text-[#071B3A] uppercase tracking-wider truncate">
                                        {p.name}
                                      </h4>
                                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#F8FBFF] border border-[#D9E5F3] text-[#647A9E] font-mono">
                                        {p.code || 'PLAN'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="flex items-baseline justify-end gap-1">
                                      <span className="text-xl font-black text-[#071B3A]">
                                        ₹{activePrice.toLocaleString()}
                                      </span>
                                      <span className="text-[10px] text-[#7890A5] font-bold">
                                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                                      </span>
                                    </div>
                                    {billingCycle === 'yearly' && yearlyDiscountPct > 0 && (
                                      <span className="text-[9px] font-black text-[#0066FF] bg-[#EAF4FF] px-1.5 py-0.5 rounded inline-block mt-0.5">
                                        Save {yearlyDiscountPct}%
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {p.description ? (
                                  <p className="text-[11px] text-[#647A9E] font-medium leading-relaxed line-clamp-2">
                                    {p.description}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-[#647A9E] font-medium italic">
                                    Super Admin configured clinical plan.
                                  </p>
                                )}
                              </div>

                              {/* SCROLLABLE FEATURES CONTAINER */}
                              <div
                                className="cw-scroll flex-1 min-h-0 overflow-y-auto pr-1.5 my-3 space-y-2"
                                style={{
                                  scrollbarWidth: 'thin',
                                  scrollbarColor: '#B8D7FF transparent'
                                }}
                              >
                                <span className="text-[9px] font-black text-[#7890A5] uppercase tracking-widest block mb-1">
                                  Included Limits &amp; Features
                                </span>

                                {/* Limits list */}
                                <div className="space-y-1.5 text-[11px] font-bold text-[#071B3A]">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[#EAF4FF] text-[#0066FF] flex items-center justify-center shrink-0">
                                      <Check size={10} className="stroke-[3]" />
                                    </div>
                                    <span className="leading-tight">
                                      Doctors:{' '}
                                      <strong className="text-[#071B3A]">
                                        {p.limits?.maxDoctors ? (p.limits.maxDoctors >= 9999 ? 'Unlimited Doctors' : `Up to ${p.limits.maxDoctors} Doctor${p.limits.maxDoctors > 1 ? 's' : ''}`) : 'Unlimited Doctors'}
                                      </strong>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[#EAF4FF] text-[#0066FF] flex items-center justify-center shrink-0">
                                      <Check size={10} className="stroke-[3]" />
                                    </div>
                                    <span className="leading-tight">
                                      Staff:{' '}
                                      <strong className="text-[#071B3A]">
                                        {p.limits?.maxStaff ? (p.limits.maxStaff >= 9999 ? 'Unlimited Staff' : `Up to ${p.limits.maxStaff} Staff Account${p.limits.maxStaff > 1 ? 's' : ''}`) : 'Unlimited Staff'}
                                      </strong>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[#EAF4FF] text-[#0066FF] flex items-center justify-center shrink-0">
                                      <Check size={10} className="stroke-[3]" />
                                    </div>
                                    <span className="leading-tight">
                                      Branches:{' '}
                                      <strong className="text-[#071B3A]">
                                        {p.limits?.maxBranches ? (p.limits.maxBranches >= 9999 ? 'Unlimited Branches' : `Up to ${p.limits.maxBranches} Branch${p.limits.maxBranches > 1 ? 'es' : ''}`) : '1 Branch'}
                                      </strong>
                                    </span>
                                  </div>

                                  {p.limits?.maxPatients && p.limits.maxPatients !== 999999 && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded-full bg-[#EAF4FF] text-[#0066FF] flex items-center justify-center shrink-0">
                                        <Check size={10} className="stroke-[3]" />
                                      </div>
                                      <span className="leading-tight">
                                        Patients:{' '}
                                        <strong className="text-[#071B3A]">
                                          Up to {p.limits.maxPatients.toLocaleString()} Patients
                                        </strong>
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Dynamic Features */}
                                {p.features && p.features.length > 0 && (
                                  <div className="pt-2 border-t border-[#D9E5F3] space-y-1.5 text-[11px] font-semibold text-[#647A9E]">
                                    {p.features.map(f => {
                                      const label = FEATURE_LABELS[f] || f;
                                      return (
                                        <div key={f} className="flex items-start gap-2">
                                          <div className="w-4 h-4 rounded-full bg-[#EAF4FF] text-[#0066FF] flex items-center justify-center shrink-0 mt-0.5">
                                            <Check size={10} className="stroke-[3]" />
                                          </div>
                                          <span className="leading-snug text-[#071B3A]">{label}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* FIXED FOOTER CTA */}
                              <div className="shrink-0 pt-3 border-t border-[#D9E5F3]">
                                <button
                                  type="button"
                                  className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    isSelected
                                      ? 'text-white shadow-md shadow-[#0066FF]/20'
                                      : 'bg-[#F8FBFF] hover:bg-[#EAF4FF] hover:text-[#0066FF] text-[#071B3A] border border-[#D9E5F3]'
                                  }`}
                                  style={isSelected ? { background: 'linear-gradient(135deg, #1683FF 0%, #0057D9 100%)', color: '#FFFFFF' } : {}}
                                >
                                  {isSelected ? (
                                    <>
                                      <Check size={13} className="stroke-[3]" /> Plan Selected
                                    </>
                                  ) : (
                                    'Choose Plan'
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 4: REVIEW & SUBMIT ── */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {/* Summary Owner Card */}
                      <div className="bg-[#F8FBFF] p-5 rounded-2xl border border-[#D9E5F3] relative">
                        <button onClick={() => setCurrentStep(1)} className="absolute right-4 top-4 text-xs font-black text-[#0066FF] hover:underline cursor-pointer">Edit</button>
                        <h4 className="text-xs font-black text-[#7890A5] uppercase tracking-widest mb-3">Owner Summary</h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold text-[#64748B]">
                          <div>Name: <span className="text-[#071B3A] font-bold">{ownerForm.name || '-'}</span></div>
                          <div>Designation: <span className="text-[#071B3A] font-bold">{ownerForm.designation || '-'}</span></div>
                          <div>Email: <span className="text-[#071B3A] font-bold">{ownerForm.email || '-'}</span></div>
                          <div>Phone: <span className="text-[#071B3A] font-bold">{ownerForm.phone || '-'}</span></div>
                          <div>PAN: <span className="text-[#071B3A] font-bold">{ownerForm.pan || '-'}</span></div>
                          <div>Aadhaar: <span className="text-[#071B3A] font-bold">{ownerForm.aadhaar || '-'}</span></div>
                        </div>
                      </div>

                      {/* Summary Clinic Card */}
                      <div className="bg-[#F8FBFF] p-5 rounded-2xl border border-[#D9E5F3] relative">
                        <button onClick={() => setCurrentStep(2)} className="absolute right-4 top-4 text-xs font-black text-[#0066FF] hover:underline cursor-pointer">Edit</button>
                        <h4 className="text-xs font-black text-[#7890A5] uppercase tracking-widest mb-3">Clinic Summary</h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold text-[#64748B]">
                          <div>Name: <span className="text-[#071B3A] font-bold">{clinicForm.name || '-'}</span></div>
                          <div>Reg Number: <span className="text-[#071B3A] font-bold">{clinicForm.registrationNumber || '-'}</span></div>
                          <div>Consultation Mode: <span className="text-[#071B3A] font-bold">{clinicForm.consultationMode || '-'}</span></div>
                          <div>Languages: <span className="text-[#071B3A] font-bold">{clinicForm.languagesSpoken || '-'}</span></div>
                          <div className="col-span-2">Address: <span className="text-[#071B3A] font-bold">{clinicForm.addressLine1}, {clinicForm.city}, {clinicForm.state} - {clinicForm.pincode}</span></div>
                        </div>
                      </div>

                      {/* Subscription Summary */}
                      <div className="bg-[#F4F9FF] p-5 rounded-2xl border-2 border-[#0066FF] relative">
                        <button onClick={() => setCurrentStep(3)} className="absolute right-4 top-4 text-xs font-black text-[#0066FF] hover:underline cursor-pointer">Edit</button>
                        <h4 className="text-xs font-black text-[#7890A5] uppercase tracking-widest mb-3">Selected Plan Summary</h4>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-black text-[#071B3A] uppercase block">{activePlanObj?.name || 'No Plan Selected'}</span>
                            <span className="text-[10px] text-[#64748B] font-bold capitalize">Billing Cycle: {billingCycle}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-[#0066FF]">
                              ₹{(billingCycle === 'monthly' ? activePlanObj?.priceMonthly : activePlanObj?.priceYearly)?.toLocaleString() || 0}
                            </span>
                            <span className="text-[9px] text-[#7890A5] block font-bold">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terms Acceptance */}
                    <div className="flex items-start gap-3 pt-3 border-t border-[#D9E5F3]">
                      <input
                        type="checkbox"
                        id="terms"
                        className="mt-0.5 cursor-pointer w-4 h-4 accent-[#0066FF]"
                        checked={hasAcceptedTerms}
                        onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                      />
                      <label htmlFor="terms" className="text-[11px] font-bold text-[#64748B] leading-normal cursor-pointer">
                        I confirm that all clinic credentials, owner details, and identity documents provided are correct and legally valid. I accept the <a href="#" className="text-[#0066FF] hover:underline">AICMS Terms &amp; Conditions</a> and <a href="#" className="text-[#0066FF] hover:underline">Privacy Policy</a>.
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
          className="cw-scroll w-full lg:w-[22%] shrink-0 flex flex-col bg-white rounded-2xl border border-[#D9E5F3] shadow-sm"
          style={{ overflowY: 'auto' }}
        >
          <div className="flex flex-col gap-4 p-5 flex-1">
            <div>
              <h3 className="text-sm font-black text-[#071B3A] uppercase tracking-wider block">Setup Summary</h3>
              <p className="text-[10px] text-[#647A9E] font-bold block mt-0.5">Real-time overview of your setup</p>
            </div>

            {/* Progress bar */}
            <div className="pt-3 border-t border-[#D9E5F3] space-y-2">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-[#64748B]">
                <span>Progress</span>
                <span>Step {currentStep} of 4 ({progress}%)</span>
              </div>
              <div className="w-full bg-[#E1EAF5] h-2 rounded-full overflow-hidden">
                <div className="bg-[#0066FF] h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="bg-[#F4F9FF] border border-[#D9E5F3] p-3.5 rounded-xl flex items-start gap-2 text-xs text-[#0066FF] font-bold">
              <Building2 size={16} className="shrink-0 mt-0.5 text-[#0066FF]" />
              <div>
                <span className="block text-[11px] font-black text-[#071B3A]">You're setting up</span>
                <span className="text-[10px] text-[#64748B] mt-0.5 block">{clinicForm.name || 'New Clinic'}</span>
              </div>
            </div>

            {/* Selected Plan Real-time Card */}
            {activePlanObj ? (
              <div className="bg-[#F4F9FF] border border-[#D9E5F3] rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#7890A5] block">Selected Plan</span>
                    <span className="text-xs font-black text-[#071B3A] block mt-0.5 leading-snug">{activePlanObj.name}</span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#EAF4FF] text-[#0066FF] font-mono shrink-0">
                    {activePlanObj.code || 'PLAN'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#D9E5F3]/60 text-[11px]">
                  <span className="text-[#64748B] font-semibold capitalize">
                    Billing: <strong className="text-[#071B3A]">{billingCycle}</strong>
                  </span>
                  <span className="text-xs font-black text-[#0066FF]">
                    ₹{(billingCycle === 'monthly' ? activePlanObj.priceMonthly : activePlanObj.priceYearly)?.toLocaleString() || 0}
                    <span className="text-[9px] text-[#7890A5] font-bold">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#F8FBFF] border border-dashed border-[#D9E5F3] rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold text-[#64748B]">No plan selected yet</span>
              </div>
            )}

            {/* What's Next Checklist */}
            <div className="pt-3 border-t border-[#D9E5F3] space-y-2">
              <span className="text-[10px] font-black text-[#7890A5] uppercase tracking-wider block">What's Next?</span>
              <ul className="space-y-1.5 text-[10px] font-bold text-[#071B3A]">
                <li className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    currentStep > 1 
                      ? 'bg-[#0066FF] border-[#0066FF] text-white' 
                      : currentStep === 1 
                        ? 'border-2 border-[#0066FF] text-[#0066FF]' 
                        : 'border-[#D9E5F3] text-[#94A3B8]'
                  }`}>
                    {currentStep > 1 ? <Check size={8} className="stroke-[3]" /> : currentStep === 1 ? <div className="w-1 h-1 rounded-full bg-[#0066FF]" /> : null}
                  </div>
                  <span className={currentStep > 1 ? 'line-through text-[#64748B]' : currentStep === 1 ? 'text-[#071B3A] font-black' : 'text-[#64748B]'}>Fill in clinic details</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    currentStep > 2 
                      ? 'bg-[#0066FF] border-[#0066FF] text-white' 
                      : currentStep === 2 
                        ? 'border-2 border-[#0066FF] text-[#0066FF]' 
                        : 'border-[#D9E5F3] text-[#94A3B8]'
                  }`}>
                    {currentStep > 2 ? <Check size={8} className="stroke-[3]" /> : currentStep === 2 ? <div className="w-1 h-1 rounded-full bg-[#0066FF]" /> : null}
                  </div>
                  <span className={currentStep > 2 ? 'line-through text-[#64748B]' : currentStep === 2 ? 'text-[#071B3A] font-black' : 'text-[#64748B]'}>Choose your plan</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    currentStep > 3 
                      ? 'bg-[#0066FF] border-[#0066FF] text-white' 
                      : currentStep === 3 
                        ? 'border-2 border-[#0066FF] text-[#0066FF]' 
                        : 'border-[#D9E5F3] text-[#94A3B8]'
                  }`}>
                    {currentStep > 3 ? <Check size={8} className="stroke-[3]" /> : currentStep === 3 ? <div className="w-1 h-1 rounded-full bg-[#0066FF]" /> : null}
                  </div>
                  <span className={currentStep > 3 ? 'line-through text-[#64748B]' : currentStep === 3 ? 'text-[#071B3A] font-black' : 'text-[#64748B]'}>Review &amp; confirm</span>
                </li>
              </ul>
            </div>

            {/* Security & Compliance Checklist */}
            <div className="pt-3 border-t border-[#D9E5F3] space-y-2">
              <span className="text-[10px] font-black text-[#7890A5] uppercase tracking-wider block">Security &amp; Compliance</span>
              <ul className="space-y-1.5 text-[10px] font-bold text-[#071B3A]">
                <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#16A34A]" /> 256-bit SSL Encryption</li>
                <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#16A34A]" /> HIPAA Compliant</li>
                <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#16A34A]" /> Regular Backups</li>
                <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#16A34A]" /> Role-based Access</li>
              </ul>
            </div>

            {/* Promo Code Input */}
            <div className="pt-3 border-t border-[#D9E5F3]">
              <span className="text-[10px] font-black text-[#7890A5] uppercase tracking-wider block mb-1.5">Apply Promo Code</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CODE100"
                  className="flex-1 px-3 py-1.5 bg-white border border-[#D9E5F3] rounded-lg text-xs font-bold outline-none uppercase text-[#071B3A] focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-3 py-1.5 bg-[#0066FF] hover:bg-[#0057D9] text-white text-[10px] font-black rounded-lg transition cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {promoApplied && <p className="text-[10px] text-[#16A34A] font-bold mt-1">✓ Applied successfully!</p>}
              {promoError && <p className="text-[10px] text-rose-500 font-bold mt-1">{promoError}</p>}
            </div>

            {/* Have Questions Card */}
            <div className="mt-auto bg-[#F8FBFF] border border-[#D9E5F3] rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF4FF] text-[#0066FF] flex items-center justify-center shrink-0">
                  <PhoneCall size={15} className="text-[#0066FF]" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-[#071B3A] block">Have Questions?</span>
                  <p className="text-[10px] text-[#647A9E] leading-relaxed font-medium">Our setup experts are ready.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('tel:+18005550199')}
                className="w-full py-2 bg-[#071B3A] hover:bg-[#0066FF] text-white rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <PhoneCall size={11} /> Talk to Expert
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY FOOTER BAR ── */}
      <div className="shrink-0 w-full z-30" style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid #D9E5F3', boxShadow: '0 -4px 24px rgba(0,102,255,0.04)' }}>
        <div className="max-w-[1840px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          {/* Back to Home / Prev Step */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-extrabold text-[#071B3A] hover:text-[#0066FF] transition shrink-0 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs font-extrabold text-[#071B3A] hover:text-[#0066FF] transition shrink-0 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
          )}

          {/* Secure Message */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
            <ShieldCheck size={16} className="text-[#0066FF] shrink-0" />
            <span>
              <span className="font-black text-[#071B3A]">Your data is safe with us.</span>
              <span className="hidden sm:inline text-[#64748B]"> We use industry-standard encryption.</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-[#D9E5F3] rounded-xl text-xs font-black text-[#071B3A] bg-white hover:border-[#0066FF] hover:text-[#0066FF] transition cursor-pointer shadow-sm"
            >
              Save &amp; Continue Later
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer hover:opacity-95 active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #1683FF 0%, #0057D9 100%)', boxShadow: '0 4px 14px rgba(0, 102, 255, 0.25)' }}
              >
                Continue to Next Step <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-6 py-2.5 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer hover:opacity-95 active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #1683FF 0%, #0057D9 100%)', boxShadow: '0 4px 14px rgba(0, 102, 255, 0.25)' }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Payment</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[9999] bg-[#071B3A]/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 sm:p-8 shadow-2xl border border-[#D9E5F3] text-center space-y-5 relative">
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-[#64748B] hover:text-[#071B3A] p-1.5 rounded-full hover:bg-[#F8FBFF] transition"
            >
              <X size={16} />
            </button>

            <div className="w-14 h-14 bg-[#EAF4FF] text-[#0066FF] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0066FF]">Security Verification</span>
              <h3 className="text-xl font-black text-[#071B3A]">Verify Your Email</h3>
              <p className="text-xs text-[#64748B] font-medium">
                We've sent a 6-digit code to <strong className="text-[#071B3A] font-bold">{ownerForm.email}</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                maxLength="6"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center px-4 py-3 bg-white border border-[#D9E5F3] rounded-2xl outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 text-2xl font-mono font-black tracking-[0.4em] text-[#071B3A] shadow-xs"
              />
              {otpError && <p className="text-xs text-rose-500 font-bold">{otpError}</p>}
              {otpResent && <p className="text-xs text-[#16A34A] font-bold">✓ New verification code sent!</p>}

              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[#64748B] font-medium">
                  {otpSeconds > 0 ? (
                    <span className="text-[#071B3A] font-bold">
                      Resend in {Math.floor(otpSeconds / 60)}:{String(otpSeconds % 60).padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold">Code expired?</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpModal(false);
                    setCurrentStep(1);
                  }}
                  className="text-[#0066FF] hover:text-[#0645C0] font-bold text-[11px] underline cursor-pointer"
                >
                  Change Email
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpLoading || otpSeconds > 0}
                className="flex-1 py-3 border border-[#D9E5F3] hover:bg-[#F8FBFF] hover:border-[#0066FF] hover:text-[#0066FF] disabled:opacity-40 disabled:hover:bg-transparent text-[#071B3A] rounded-xl text-xs font-black transition cursor-pointer"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={handleVerifyAndRegister}
                disabled={otpLoading || otpCode.length < 6}
                className="flex-1 py-3 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1683FF 0%, #0057D9 100%)', boxShadow: '0 4px 14px rgba(0, 102, 255, 0.25)' }}
              >
                {otpLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Continue</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
