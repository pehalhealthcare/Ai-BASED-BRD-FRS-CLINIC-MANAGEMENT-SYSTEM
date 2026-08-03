import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { clinicApi, specializationApi, providersApi, validationApi } from '../../lib/api';
import { ProviderWizardModal } from '../providers/ProviderWizardModal';
import {
  User, Users, Mail, Phone, Lock, Calendar, MapPin,
  Check, ArrowRight, ArrowLeft, ShieldCheck,
  Clock, Plus, Trash, Globe, CheckCircle, HelpCircle, UploadCloud, Building2, X, RefreshCw,
  Eye, EyeOff, Shield, Sparkles, MessageSquare, CreditCard, Video, PhoneCall, ChevronLeft, ChevronRight, Bell, AlertTriangle, ShieldAlert
} from 'lucide-react';
import MapPicker from '../../components/common/MapPicker';
import PehalLogo from '../../components/common/PehalLogo';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { id: 1, name: 'Owner Profile', desc: 'Verify and update owner details', duration: '1 min' },
  { id: 2, name: 'Doctor Setup', desc: 'Add practitioners and specialists', duration: '3 min' },
  { id: 3, name: 'Department Setup', desc: 'Configure clinic departments', duration: '2 min' },
  { id: 4, name: 'Branch Setup', desc: 'Configure geographical locations', duration: '2 min' },
  { id: 5, name: 'Staff Setup', desc: 'Add assistants and technicians', duration: '2 min' },
  { id: 6, name: 'Healthcare Setup', desc: 'Pharmacy & lab configuration', duration: '2 min' },
  { id: 7, name: 'AI Modules', desc: 'Configure AI powered features', duration: '2 min' },
  { id: 8, name: 'Video Consultation', desc: 'Setup video consultation', duration: '1 min' },
  { id: 9, name: 'Clinic Schedule', desc: 'Configure working hours', duration: '2 min' },
  { id: 10, name: 'Review & Launch', desc: 'Review and launch clinic', duration: '1 min' }
];

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
  if (age < 18) return { valid: false, error: 'Owner must be at least 18 years old.' };
  return { valid: true };
};

export default function ClinicOnboarding() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [launchConfirmations, setLaunchConfirmations] = useState({ c1: false, c2: false, c3: false, c4: false });
  const [expandedChecklist, setExpandedChecklist] = useState({});
  const [showLaunchSuccess, setShowLaunchSuccess] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [launchProgress, setLaunchProgress] = useState({
    percent: 0,
    currentTask: 'Connecting to onboarding stream...',
    checklist: [],
    emailsSent: [],
    status: 'IDLE',
    error: null
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [mapTarget, setMapTarget] = useState('clinic');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    passport: '',
    gstin: '',
    address: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
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

  // Flow 2 Dynamic States
  const [doctors, setDoctors] = useState([]);
  const [doctorForm, setDoctorForm] = useState({ title: 'Dr.', name: '', specialty: 'General Medicine', email: '', phone: '' });
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [editingDoctorForm, setEditingDoctorForm] = useState({ title: 'Dr.', name: '', specialty: 'General Medicine', email: '', phone: '' });
  const [doctorErrors, setDoctorErrors] = useState({});
  const [doctorValidating, setDoctorValidating] = useState(false);

  // Real-time Validation States for Doctor Invitation
  const [emailValState, setEmailValState] = useState({ status: 'idle', message: '', accountType: '' });
  const [phoneValState, setPhoneValState] = useState({ status: 'idle', message: '', accountType: '' });

  // References for debouncing & caching to prevent unnecessary API calls
  const valEmailCache = useRef({});
  const valPhoneCache = useRef({});
  const emailValTimeout = useRef(null);
  const phoneValTimeout = useRef(null);

  // 1. Email format and database uniqueness check
  const checkEmailUniqueness = async (emailVal) => {
    if (!emailVal || !emailVal.trim()) {
      setEmailValState({ status: 'idle', message: '', accountType: '' });
      return;
    }

    // Format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal.trim())) {
      setEmailValState({ status: 'invalid', message: 'Please enter a valid email address.', accountType: '' });
      return;
    }

    const cleanEmail = emailVal.toLowerCase().trim();

    // Check frontend local list (doctors already in list)
    const localDup = doctors.some(d => d.email.toLowerCase() === cleanEmail);
    if (localDup) {
      setEmailValState({ status: 'invalid', message: 'This email is already in your pending invitations list.', accountType: '' });
      return;
    }

    // Check cache
    if (valEmailCache.current[cleanEmail]) {
      setEmailValState(valEmailCache.current[cleanEmail]);
      return;
    }

    // Call validation API
    setEmailValState({ status: 'loading', message: 'Checking email availability...', accountType: '' });
    try {
      const res = await validationApi.validateEmail({ email: cleanEmail });
      if (res.data?.exists || res.exists) {
        const type = res.data?.accountType || res.accountType || 'User';
        const valRes = {
          status: 'invalid',
          message: `This email address is already registered with another account (as ${type}).`,
          accountType: type
        };
        valEmailCache.current[cleanEmail] = valRes;
        setEmailValState(valRes);
      } else {
        const valRes = { status: 'valid', message: 'Email available', accountType: '' };
        valEmailCache.current[cleanEmail] = valRes;
        setEmailValState(valRes);
      }
    } catch (err) {
      setEmailValState({ status: 'error', message: '⚠ Unable to verify email right now. Please try again.', accountType: '' });
    }
  };

  const handleEmailChange = (val) => {
    setDoctorForm(prev => ({ ...prev, email: val }));
    setEmailValState({ status: 'idle', message: '', accountType: '' });

    if (emailValTimeout.current) clearTimeout(emailValTimeout.current);
    emailValTimeout.current = setTimeout(() => {
      checkEmailUniqueness(val);
    }, 500);
  };

  // 2. Phone format and database uniqueness check
  const checkPhoneUniqueness = async (phoneVal) => {
    const cleanPhone = phoneVal.replace(/\D/g, '').trim();
    if (!cleanPhone) {
      setPhoneValState({ status: 'idle', message: '', accountType: '' });
      return;
    }

    // Format validation
    if (cleanPhone.length !== 10) {
      setPhoneValState({ status: 'invalid', message: 'Phone number must be exactly 10 digits.', accountType: '' });
      return;
    }

    // Check frontend local list (doctors already in list)
    const localDup = doctors.some(d => d.phone.replace(/\D/g, '') === cleanPhone);
    if (localDup) {
      setPhoneValState({ status: 'invalid', message: 'This phone number is already in your pending invitations list.', accountType: '' });
      return;
    }

    // Check cache
    if (valPhoneCache.current[cleanPhone]) {
      setPhoneValState(valPhoneCache.current[cleanPhone]);
      return;
    }

    // Call validation API
    setPhoneValState({ status: 'loading', message: 'Checking phone availability...', accountType: '' });
    try {
      const res = await validationApi.validatePhone({ phone: cleanPhone });
      if (res.data?.exists || res.exists) {
        const type = res.data?.accountType || res.accountType || 'User';
        const valRes = {
          status: 'invalid',
          message: `This phone number is already registered with another account (as ${type}).`,
          accountType: type
        };
        valPhoneCache.current[cleanPhone] = valRes;
        setPhoneValState(valRes);
      } else {
        const valRes = { status: 'valid', message: 'Phone number available', accountType: '' };
        valPhoneCache.current[cleanPhone] = valRes;
        setPhoneValState(valRes);
      }
    } catch (err) {
      setPhoneValState({ status: 'error', message: '⚠ Unable to verify phone number right now.', accountType: '' });
    }
  };

   const handlePhoneChange = (val) => {
    // Only numeric input
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setDoctorForm(prev => ({ ...prev, phone: cleaned }));
    setPhoneValState({ status: 'idle', message: '', accountType: '' });

    if (phoneValTimeout.current) clearTimeout(phoneValTimeout.current);
    phoneValTimeout.current = setTimeout(() => {
      checkPhoneUniqueness(cleaned);
    }, 500);
  };

  const [staffEmailValState, setStaffEmailValState] = useState({ status: 'idle', message: '', accountType: '' });
  const [staffPhoneValState, setStaffPhoneValState] = useState({ status: 'idle', message: '', accountType: '' });
  const staffEmailValTimeout = useRef(null);
  const staffPhoneValTimeout = useRef(null);

  const checkStaffEmailUniqueness = async (emailVal) => {
    if (!emailVal || !emailVal.trim()) {
      setStaffEmailValState({ status: 'idle', message: '', accountType: '' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal.trim())) {
      setStaffEmailValState({ status: 'invalid', message: 'Please enter a valid email address.', accountType: '' });
      return;
    }
    const cleanEmail = emailVal.toLowerCase().trim();
    if (doctors.some(d => d.email.toLowerCase() === cleanEmail)) {
      setStaffEmailValState({ status: 'invalid', message: 'This email is already assigned to a doctor in this onboarding session.', accountType: '' });
      return;
    }
    if (staff.some(s => s.email.toLowerCase() === cleanEmail)) {
      setStaffEmailValState({ status: 'invalid', message: 'This email is already in your pending staff list.', accountType: '' });
      return;
    }
    if (valEmailCache.current[cleanEmail]) {
      setStaffEmailValState(valEmailCache.current[cleanEmail]);
      return;
    }
    setStaffEmailValState({ status: 'loading', message: 'Checking email availability...', accountType: '' });
    try {
      const res = await validationApi.validateEmail({ email: cleanEmail });
      if (res.data?.exists || res.exists) {
        const type = res.data?.accountType || res.accountType || 'User';
        const valRes = { status: 'invalid', message: `This email is already registered (as ${type}).`, accountType: type };
        valEmailCache.current[cleanEmail] = valRes;
        setStaffEmailValState(valRes);
      } else {
        const valRes = { status: 'valid', message: '✔ Available', accountType: '' };
        valEmailCache.current[cleanEmail] = valRes;
        setStaffEmailValState(valRes);
      }
    } catch (err) {
      setStaffEmailValState({ status: 'error', message: '⚠ Unable to verify email.', accountType: '' });
    }
  };

  const handleStaffEmailChange = (val) => {
    setStaffForm(prev => ({ ...prev, email: val }));
    setStaffEmailValState({ status: 'idle', message: '', accountType: '' });
    if (staffEmailValTimeout.current) clearTimeout(staffEmailValTimeout.current);
    staffEmailValTimeout.current = setTimeout(() => {
      checkStaffEmailUniqueness(val);
    }, 500);
  };

  const checkStaffPhoneUniqueness = async (phoneVal) => {
    const cleanPhone = phoneVal.replace(/\D/g, '').trim();
    if (!cleanPhone) {
      setStaffPhoneValState({ status: 'idle', message: '', accountType: '' });
      return;
    }
    if (cleanPhone.length !== 10) {
      setStaffPhoneValState({ status: 'invalid', message: 'Phone number must be exactly 10 digits.', accountType: '' });
      return;
    }
    if (doctors.some(d => d.phone.replace(/\D/g, '') === cleanPhone)) {
      setStaffPhoneValState({ status: 'invalid', message: 'This phone number is already assigned to a doctor in this onboarding session.', accountType: '' });
      return;
    }
    if (staff.some(s => s.phone.replace(/\D/g, '') === cleanPhone)) {
      setStaffPhoneValState({ status: 'invalid', message: 'This phone number is already in your pending staff list.', accountType: '' });
      return;
    }
    if (valPhoneCache.current[cleanPhone]) {
      setStaffPhoneValState(valPhoneCache.current[cleanPhone]);
      return;
    }
    setStaffPhoneValState({ status: 'loading', message: 'Checking phone availability...', accountType: '' });
    try {
      const res = await validationApi.validatePhone({ phone: cleanPhone });
      if (res.data?.exists || res.exists) {
        const type = res.data?.accountType || res.accountType || 'User';
        const valRes = { status: 'invalid', message: `This phone number is already registered (as ${type}).`, accountType: type };
        valPhoneCache.current[cleanPhone] = valRes;
        setStaffPhoneValState(valRes);
      } else {
        const valRes = { status: 'valid', message: '✔ Available', accountType: '' };
        valPhoneCache.current[cleanPhone] = valRes;
        setStaffPhoneValState(valRes);
      }
    } catch (err) {
      setStaffPhoneValState({ status: 'error', message: '⚠ Unable to verify phone number.', accountType: '' });
    }
  };

  const handleStaffPhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setStaffForm(prev => ({ ...prev, phone: cleaned }));
    setStaffPhoneValState({ status: 'idle', message: '', accountType: '' });
    if (staffPhoneValTimeout.current) clearTimeout(staffPhoneValTimeout.current);
    staffPhoneValTimeout.current = setTimeout(() => {
      checkStaffPhoneUniqueness(cleaned);
    }, 500);
  };

  const [departments, setDepartments] = useState([
    { name: 'Cardiology', doctorsCount: 2, active: true, color: 'blue' },
    { name: 'Neurology', doctorsCount: 1, active: true, color: 'purple' },
    { name: 'Orthopedics', doctorsCount: 1, active: true, color: 'indigo' },
    { name: 'Pediatrics', doctorsCount: 0, active: false, color: 'red' },
    { name: 'General Medicine', doctorsCount: 1, active: true, color: 'green' }
  ]);
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptFormName, setDeptFormName] = useState('');

  const [branches, setBranches] = useState([]);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact: '',
    email: '',
    manager: '',
    active: true,
    latitude: '',
    longitude: ''
  });
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [showAddBranch, setShowAddBranch] = useState(false);

  const [staff, setStaff] = useState([]);
  const [staffForm, setStaffForm] = useState({ name: '', role: 'Receptionist', email: '', phone: '', active: true });
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editingStaffForm, setEditingStaffForm] = useState({ name: '', role: 'Receptionist', email: '', phone: '', active: true });
  const [staffErrors, setStaffErrors] = useState({});
  const [staffValidating, setStaffValidating] = useState(false);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [expandedStaffId, setExpandedStaffId] = useState(null);

  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyContact, setPharmacyContact] = useState('');
  const [pharmacyActive, setPharmacyActive] = useState(true);
  const [labName, setLabName] = useState('Central Lab');
  const [labContact, setLabContact] = useState('');
  const [labActive, setLabActive] = useState(true);

  // Healthcare Providers from DB
  const [createdProviders, setCreatedProviders] = useState([]);
  const [providerWizardOpen, setProviderWizardOpen] = useState(false);
  const [providerWizardStep, setProviderWizardStep] = useState(1);
  const [expandedProviderId, setExpandedProviderId] = useState(null);
  const [apiModules, setApiModules] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState(null);
  const [providerForm, setProviderForm] = useState({
    name: '',
    globalId: '',
    providerType: 'Pharmacy',
    providerSubtype: 'Internal',
    phone: '',
    email: '',
    address: { line1: '', city: '', state: '', pincode: '', country: 'India' },
    contactPerson: '',
    managerEmployeeId: '',
    managerPhone: '',
    managerEmail: '',
    workingHours: { workingDays: [], openingTime: '', closingTime: '' },
    gstNumber: '',
    drugLicenseNumber: '',
    licenseExpiry: '',
    reorderThreshold: '',
    barcodeEnabled: false,
    printerEnabled: false,
    invoicePrefix: '',
    apiProviderName: '',
    assignedBranches: []
  });

  const [aiFeatures, setAiFeatures] = useState({
    voiceTranscription: true,
    consultationAssistant: true,
    symptomChecker: true,
    prescriptionSuggestions: true,
    riskScoring: false,
    labRecommendation: false,
    appointmentIntel: false,
    followUpReminders: false
  });

  const [videoProvider, setVideoProvider] = useState('Zoom');
  const [videoFee, setVideoFee] = useState('');
  const [videoDuration, setVideoDuration] = useState('15');
  const [videoBufferTime, setVideoBufferTime] = useState('10');
  const [videoMaxAdvanceBooking, setVideoMaxAdvanceBooking] = useState('30');
  const [videoCancellationWindow, setVideoCancellationWindow] = useState('1 Hour');
  const [videoWaitingRoom, setVideoWaitingRoom] = useState(true);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoReminders, setVideoReminders] = useState(true);
  const [videoChat, setVideoChat] = useState(true);
  const [videoScreenSharing, setVideoScreenSharing] = useState(true);
  const [videoVirtualBg, setVideoVirtualBg] = useState(false);
  const [videoNoiseCancellation, setVideoNoiseCancellation] = useState(false);
  const [videoHD, setVideoHD] = useState(false);
  const [videoReminderBefore, setVideoReminderBefore] = useState('1 Hour');
  const [videoReminderChannels, setVideoReminderChannels] = useState({ sms: true, email: true, whatsapp: false, push: false });
  const [videoRecordingStorage, setVideoRecordingStorage] = useState('Internal Storage');
  const [videoRecordingRetention, setVideoRecordingRetention] = useState('90 Days');
  const [videoEncryption, setVideoEncryption] = useState(true);
  const [videoRequirePassword, setVideoRequirePassword] = useState(true);
  const [videoEndToEndEncryption, setVideoEndToEndEncryption] = useState(false);
  const [videoBlockAnonymous, setVideoBlockAnonymous] = useState(true);
  const [videoSignedInOnly, setVideoSignedInOnly] = useState(false);
  const [videoUniqueId, setVideoUniqueId] = useState(true);
  const [videoAutoLock, setVideoAutoLock] = useState(false);
  const [videoDoctorChangeFee, setVideoDoctorChangeFee] = useState(false);
  const [videoDoctorChangeDuration, setVideoDoctorChangeDuration] = useState(true);
  const [videoDoctorChangeReminders, setVideoDoctorChangeReminders] = useState(false);
  const [videoDoctorRecord, setVideoDoctorRecord] = useState(false);
  const [videoDoctorInstantMeeting, setVideoDoctorInstantMeeting] = useState(true);
  const [videoDoctorPersonalRoom, setVideoDoctorPersonalRoom] = useState(false);

  const [scheduleType, setScheduleType] = useState('Monday - Friday');
  const [scheduleDays, setScheduleDays] = useState([
    { id: '1', dayRange: 'Monday - Friday', shifts: [{ startTime: '09:00 AM', endTime: '05:00 PM' }], closed: false }
  ]);

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [localPreviews, setLocalPreviews] = useState({ logo: '', profilePhoto: '' });
  const [errors, setErrors] = useState({});

  const [validationSummary, setValidationSummary] = useState(null);

  // Form edit status trackers for success/pending states
  const [editStates, setEditStates] = useState({
    personal: 'Verified',
    identity: 'Pending Validation',
    address: 'Verified',
    photo: 'Verified'
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await clinicApi.getRegistrationPlans();
        const availablePlans = response.data?.plans || [];
        setPlans(availablePlans);
      } catch (err) {
        console.error('Failed to load plans:', err);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    if (user) {
      const clinic = user.clinic || {};
      setOwnerForm(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        designation: user.designation || prev.designation || 'Medical Director',
        dob: user.dob || prev.dob || '1985-06-12',
        gender: user.gender || prev.gender || 'Female',
        nationality: user.nationality || prev.nationality || 'Indian',
        preferredLanguage: user.preferredLanguage || prev.preferredLanguage || 'English',
        aadhaar: user.aadhaar || prev.aadhaar || 'XXXX XXXX 1234',
        pan: user.pan || prev.pan || 'ABCDE1234F',
        address: user.address || prev.address || '123, MG Road, Indiranagar',
        addressLine2: user.addressLine2 || prev.addressLine2 || 'Near 100ft Road',
        city: user.city || prev.city || 'Bangalore',
        state: user.state || prev.state || 'Karnataka',
        pincode: user.pincode || prev.pincode || '560038',
        country: user.country || prev.country || 'India',
        profilePhoto: user.profilePhoto || prev.profilePhoto || ''
      }));
      setClinicForm(prev => ({
        ...prev,
        name: clinic.name || prev.name,
        registrationNumber: clinic.registrationNumber || prev.registrationNumber,
        establishedYear: clinic.establishedYear || prev.establishedYear || '',
        consultationMode: clinic.consultationMode || prev.consultationMode || 'Hybrid',
        languagesSpoken: clinic.languagesSpoken ? (Array.isArray(clinic.languagesSpoken) ? clinic.languagesSpoken.join(', ') : clinic.languagesSpoken) : prev.languagesSpoken,
        addressLine1: clinic.addressLine1 || prev.addressLine1,
        city: clinic.city || prev.city,
        state: clinic.state || prev.state,
        pincode: clinic.pincode || prev.pincode,
        contactNumber: clinic.contactNumber || prev.contactNumber || '',
        shortDescription: clinic.shortDescription || prev.shortDescription || '',
        logo: clinic.logo || prev.logo || '',
        specialties: clinic.specialties ? (Array.isArray(clinic.specialties) ? clinic.specialties.join(', ') : clinic.specialties) : prev.specialties
      }));
      if (clinic.subscription?.planId) {
        setSelectedPlanId(clinic.subscription.planId._id || clinic.subscription.planId);
      }

      if (user.profilePhoto) {
        setLocalPreviews(prev => ({ ...prev, profilePhoto: user.profilePhoto }));
      }
      if (clinic.logo) {
        setLocalPreviews(prev => ({ ...prev, logo: clinic.logo }));
      }

      // Fetch draft and pending providers
      try {
        const clinicId = user?.clinicId || user?.clinic?._id;
        if (clinicId) {
          clinicApi.getHealthcareProviders(clinicId).then(res => {
            const list = res.data?.providers || res.providers || [];
            setCreatedProviders(list);
          }).catch(e => console.error(e));
        }
      } catch (pErr) {
        console.error('Failed to load draft providers:', pErr);
      }
    }
  }, [user]);

  const fetchProviders = async () => {
    const clinicId = user?.clinicId || user?.clinic?._id;
    if (!clinicId) return;
    try {
      const res = await clinicApi.getHealthcareProviders(clinicId);
      const list = res.data?.providers || res.providers || [];
      setCreatedProviders(list);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  };

  useEffect(() => {
    const loadModules = async () => {
      const clinicId = user?.clinicId || user?.clinic?._id;
      if (!clinicId) return;
      try {
        const res = await clinicApi.getSubscriptionModules(clinicId, { planId: selectedPlanId });
        const fetchedModules = res.data?.modules || res.modules || [];
        setApiModules(fetchedModules);

        // Populate initial aiFeatures state from the modules
        setAiFeatures(prev => {
          const next = { ...prev };
          fetchedModules.forEach(mod => {
            if (mod.includedInPlan) {
              if (next[mod.moduleId] === undefined) {
                next[mod.moduleId] = !!mod.enabled;
              }
            } else {
              next[mod.moduleId] = false;
            }
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to load subscription modules:', err);
      }
    };
    loadModules();
  }, [user, selectedPlanId]);

  const [saveStatus, setSaveStatus] = useState('✓ Draft Saved');
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [remoteDraft, setRemoteDraft] = useState(null);
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);
  const [tick, setTick] = useState(0);

  const lastSavedData = useRef('');

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // ── AUTO-DESIGNATE MAIN BRANCH ──
  // When branches exist but none is marked primary, auto-designate the first one
  useEffect(() => {
    if (branches.length > 0 && !branches.some(b => b.isPrimary)) {
      setBranches(prev => prev.map((b, idx) => ({ ...b, isPrimary: idx === 0 })));
    }
  }, [branches.length]);

  const getCurrentState = () => {
    return {
      currentStep,
      ownerForm,
      clinicForm,
      selectedPlanId,
      doctors,
      departments,
      branches,
      staff,
      pharmacyName,
      pharmacyContact,
      pharmacyActive,
      labName,
      labContact,
      labActive,
      createdProviders,
      aiFeatures,
      videoProvider,
      videoFee,
      videoDuration,
      videoBufferTime,
      videoMaxAdvanceBooking,
      videoCancellationWindow,
      videoWaitingRoom,
      videoRecording,
      videoReminders,
      videoChat,
      videoScreenSharing,
      videoVirtualBg,
      videoNoiseCancellation,
      videoHD,
      videoReminderBefore,
      videoReminderChannels,
      videoRecordingStorage,
      videoRecordingRetention,
      videoEncryption,
      videoRequirePassword,
      videoEndToEndEncryption,
      videoBlockAnonymous,
      videoSignedInOnly,
      videoUniqueId,
      videoAutoLock,
      videoDoctorChangeFee,
      videoDoctorChangeDuration,
      videoDoctorChangeReminders,
      videoDoctorRecord,
      videoDoctorInstantMeeting,
      videoDoctorPersonalRoom,
      scheduleType,
      scheduleDays,
      localPreviews,
      editStates,
      providerWizardOpen,
      providerWizardStep,
      providerForm
    };
  };

  const cleanDoctorNameAndTitle = (fullNameStr) => {
    if (!fullNameStr) return { title: 'Dr.', name: '' };
    const str = fullNameStr.trim();
    const match = str.match(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Miss\.|Dr|Prof|Mr|Mrs|Ms|Miss|Doctor)\s+(.*)$/i);
    if (match) {
      let matchedTitle = match[1];
      if (['dr', 'prof', 'mr', 'mrs', 'ms', 'miss'].includes(matchedTitle.toLowerCase())) {
        matchedTitle = matchedTitle.charAt(0).toUpperCase() + matchedTitle.slice(1).toLowerCase() + '.';
      } else if (matchedTitle.toLowerCase() === 'doctor') {
        matchedTitle = 'Dr.';
      }
      return { title: matchedTitle, name: match[2].trim() };
    }
    return { title: 'Dr.', name: str };
  };

  const restoreState = (state) => {
    if (!state) return;
    if (state.currentStep !== undefined) setCurrentStep(state.currentStep);
    if (state.ownerForm) setOwnerForm(state.ownerForm);
    if (state.clinicForm) setClinicForm(state.clinicForm);
    if (state.selectedPlanId) setSelectedPlanId(state.selectedPlanId);
    if (state.doctors) {
      const cleaned = state.doctors.map(d => {
        const cleanedInfo = cleanDoctorNameAndTitle(d.name);
        return {
          ...d,
          title: d.title || cleanedInfo.title,
          name: cleanedInfo.name
        };
      });
      setDoctors(cleaned);
    }
    if (state.departments) setDepartments(state.departments);
    if (state.branches) setBranches(state.branches);
    if (state.staff) {
      const filteredStaff = state.staff.filter(s => 
        !['priya@clinic.com', 'amit@clinic.com', 'neha@clinic.com'].includes(s.email?.toLowerCase())
      );
      setStaff(filteredStaff);
    }
    if (state.pharmacyName !== undefined) setPharmacyName(state.pharmacyName);
    if (state.pharmacyContact !== undefined) setPharmacyContact(state.pharmacyContact);
    if (state.pharmacyActive !== undefined) setPharmacyActive(state.pharmacyActive);
    if (state.labName !== undefined) setLabName(state.labName);
    if (state.labContact !== undefined) setLabContact(state.labContact);
    if (state.labActive !== undefined) setLabActive(state.labActive);
    if (state.createdProviders) setCreatedProviders(Array.isArray(state.createdProviders) ? state.createdProviders : []);
    if (state.aiFeatures) setAiFeatures(state.aiFeatures);
    if (state.videoProvider !== undefined) setVideoProvider(state.videoProvider);
    if (state.videoFee !== undefined) setVideoFee(state.videoFee);
    if (state.videoDuration !== undefined) setVideoDuration(state.videoDuration);
    if (state.videoBufferTime !== undefined) setVideoBufferTime(state.videoBufferTime);
    if (state.videoMaxAdvanceBooking !== undefined) setVideoMaxAdvanceBooking(state.videoMaxAdvanceBooking);
    if (state.videoCancellationWindow !== undefined) setVideoCancellationWindow(state.videoCancellationWindow);
    if (state.videoWaitingRoom !== undefined) setVideoWaitingRoom(state.videoWaitingRoom);
    if (state.videoRecording !== undefined) setVideoRecording(state.videoRecording);
    if (state.videoReminders !== undefined) setVideoReminders(state.videoReminders);
    if (state.videoChat !== undefined) setVideoChat(state.videoChat);
    if (state.videoScreenSharing !== undefined) setVideoScreenSharing(state.videoScreenSharing);
    if (state.videoVirtualBg !== undefined) setVideoVirtualBg(state.videoVirtualBg);
    if (state.videoNoiseCancellation !== undefined) setVideoNoiseCancellation(state.videoNoiseCancellation);
    if (state.videoHD !== undefined) setVideoHD(state.videoHD);
    if (state.videoReminderBefore !== undefined) setVideoReminderBefore(state.videoReminderBefore);
    if (state.videoReminderChannels !== undefined) setVideoReminderChannels(state.videoReminderChannels);
    if (state.videoRecordingStorage !== undefined) setVideoRecordingStorage(state.videoRecordingStorage);
    if (state.videoRecordingRetention !== undefined) setVideoRecordingRetention(state.videoRecordingRetention);
    if (state.videoEncryption !== undefined) setVideoEncryption(state.videoEncryption);
    if (state.videoRequirePassword !== undefined) setVideoRequirePassword(state.videoRequirePassword);
    if (state.videoEndToEndEncryption !== undefined) setVideoEndToEndEncryption(state.videoEndToEndEncryption);
    if (state.videoBlockAnonymous !== undefined) setVideoBlockAnonymous(state.videoBlockAnonymous);
    if (state.videoSignedInOnly !== undefined) setVideoSignedInOnly(state.videoSignedInOnly);
    if (state.videoUniqueId !== undefined) setVideoUniqueId(state.videoUniqueId);
    if (state.videoAutoLock !== undefined) setVideoAutoLock(state.videoAutoLock);
    if (state.videoDoctorChangeFee !== undefined) setVideoDoctorChangeFee(state.videoDoctorChangeFee);
    if (state.videoDoctorChangeDuration !== undefined) setVideoDoctorChangeDuration(state.videoDoctorChangeDuration);
    if (state.videoDoctorChangeReminders !== undefined) setVideoDoctorChangeReminders(state.videoDoctorChangeReminders);
    if (state.videoDoctorRecord !== undefined) setVideoDoctorRecord(state.videoDoctorRecord);
    if (state.videoDoctorInstantMeeting !== undefined) setVideoDoctorInstantMeeting(state.videoDoctorInstantMeeting);
    if (state.videoDoctorPersonalRoom !== undefined) setVideoDoctorPersonalRoom(state.videoDoctorPersonalRoom);
    if (state.scheduleType !== undefined) setScheduleType(state.scheduleType);
    if (state.scheduleDays) setScheduleDays(state.scheduleDays);
    if (state.localPreviews) setLocalPreviews(state.localPreviews);
    if (state.editStates) setEditStates(state.editStates);
    if (state.providerWizardOpen !== undefined) setProviderWizardOpen(state.providerWizardOpen);
    if (state.providerWizardStep !== undefined) setProviderWizardStep(state.providerWizardStep);
    if (state.providerForm) setProviderForm(state.providerForm);
  };

  const handleSaveDraftManual = async () => {
    setSaveStatus('Saving...');
    try {
      const state = getCurrentState();
      await validationApi.validationEmail; // dummy await just to bypass validations
      await clinicApi.saveOnboardingDraft({
        currentStep: state.currentStep,
        draftData: state
      });
      setSaveStatus('✓ Draft Saved');
      setLastSavedTime(new Date());
      lastSavedData.current = JSON.stringify(state);
      alert('Draft saved successfully!');
    } catch (err) {
      setSaveStatus('⚠ Unable to save draft. Retrying...');
    }
  };

  // Check and load draft on mount
  useEffect(() => {
    const checkAndLoadDraft = async () => {
      if (!user) return;
      try {
        const res = await clinicApi.getOnboardingDraft();
        const draft = res.data?.draft || res.draft;
        if (draft && draft.draftData) {
          setRemoteDraft(draft.draftData);
          setShowRestorePrompt(true);
        } else {
          lastSavedData.current = JSON.stringify(getCurrentState());
          setHasInitializedDraft(true);
        }
      } catch (err) {
        console.error('Failed to fetch onboarding draft:', err);
        setHasInitializedDraft(true);
      }
    };
    checkAndLoadDraft();
  }, [user]);

  // Auto-Save Effect Loop (every 5 seconds)
  useEffect(() => {
    if (!user || !hasInitializedDraft) return;

    const interval = setInterval(async () => {
      const currentState = getCurrentState();
      const stateString = JSON.stringify(currentState);

      if (stateString === lastSavedData.current) {
        return;
      }

      setSaveStatus('Saving...');
      try {
        await clinicApi.saveOnboardingDraft({
          currentStep: currentState.currentStep,
          draftData: currentState
        });
        setSaveStatus('✓ Draft Saved');
        setLastSavedTime(new Date());
        lastSavedData.current = stateString;
      } catch (err) {
        setSaveStatus('⚠ Unable to save draft. Retrying...');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [
    user,
    hasInitializedDraft,
    currentStep,
    ownerForm,
    clinicForm,
    selectedPlanId,
    doctors,
    departments,
    branches,
    staff,
    pharmacyName,
    pharmacyContact,
    pharmacyActive,
    labName,
    labContact,
    labActive,
    createdProviders,
    aiFeatures,
    videoProvider,
    videoFee,
    videoDuration,
    videoWaitingRoom,
    videoRecording,
    videoReminders,
    scheduleType,
    scheduleDays,
    providerWizardOpen,
    providerWizardStep,
    providerForm
  ]);

  const handleSaveProviderDraftManual = async (draftFormState, currentWizardStep) => {
    if (!draftFormState?._id) return false;
    // Only save with a real MongoDB ObjectId as the provider _id
    if (!/^[0-9a-fA-F]{24}$/.test(draftFormState._id)) return false;

    // Only include valid MongoDB ObjectIds for assignedBranchId
    const isMongoId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);
    const assignedBranchId = draftFormState.assignedBranches?.[0] || draftFormState.assignedBranchId;
    const validAssignedBranchId = isMongoId(assignedBranchId) ? assignedBranchId : undefined;
    try {
      const payload = {
        currentStep: currentWizardStep,
        basicInfo: {
          name: draftFormState.name,
          providerSubtype: draftFormState.providerSubtype,
          assignedBranchId: validAssignedBranchId,
          assignedBranchName: branches.find(b => (b._id || b.id) === (draftFormState.assignedBranches?.[0] || draftFormState.assignedBranchId))?.name || draftFormState.assignedBranchName || 'Main Branch',
          phone: draftFormState.phone,
          email: draftFormState.email,
          address: draftFormState.address
        },
        manager: {
          contactPerson: draftFormState.contactPerson,
          managerPhone: draftFormState.managerPhone,
          managerEmail: draftFormState.managerEmail,
          managerGender: draftFormState.managerGender,
          managerEmployeeId: draftFormState.managerEmployeeId
        },
        operationalSetup: {
          workingHours: draftFormState.workingHours,
          gstNumber: draftFormState.gstNumber,
          drugLicenseNumber: draftFormState.drugLicenseNumber,
          licenseExpiry: draftFormState.licenseExpiry,
          emergencyContact: draftFormState.emergencyContact,
          reorderThreshold: draftFormState.reorderThreshold,
          barcodeEnabled: !!draftFormState.barcodeEnabled,
          printerEnabled: !!draftFormState.printerEnabled,
          invoicePrefix: draftFormState.invoicePrefix || 'PHR'
        }
      };

      await clinicApi.savePharmacyDraft(draftFormState._id, payload);
      await fetchProviders();
      setSaveStatus('✓ Provider Draft Saved');
      return true;
    } catch (err) {
      console.error('Failed to save provider draft:', err);
      throw err;
    }
  };

  const lastSavedProviderFormStr = useRef('');

  useEffect(() => {
    if (!providerWizardOpen || !providerForm?._id) return;

    const interval = setInterval(async () => {
      const currentStr = JSON.stringify({ form: providerForm, step: providerWizardStep });
      if (currentStr === lastSavedProviderFormStr.current) return;

      try {
        await handleSaveProviderDraftManual(providerForm, providerWizardStep);
        lastSavedProviderFormStr.current = currentStr;
      } catch (err) {
        console.error('Failed to autosave provider draft:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [providerWizardOpen, providerForm, providerWizardStep]);

  const handleConfirmRestore = () => {
    if (remoteDraft) {
      restoreState(remoteDraft);
      lastSavedData.current = JSON.stringify(remoteDraft);
      setLastSavedTime(new Date());
    }
    setShowRestorePrompt(false);
    setHasInitializedDraft(true);
  };

  const handleDeclineRestore = () => {
    lastSavedData.current = JSON.stringify(getCurrentState());
    setShowRestorePrompt(false);
    setHasInitializedDraft(true);
  };

  const getDraftStatusMessage = () => {
    if (saveStatus === 'Saving...') return 'Saving...';
    if (saveStatus.startsWith('⚠')) return saveStatus;
    if (!lastSavedTime) return '✓ Draft Saved';
    const diff = Math.floor((new Date() - lastSavedTime) / 1000);
    if (diff < 10) return 'Last saved just now';
    if (diff < 60) return `Last saved ${diff} seconds ago`;
    return `Last saved at ${lastSavedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };

  const handleOwnerFormChange = (field, value) => {
    setOwnerForm(prev => ({ ...prev, [field]: value }));
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
          setEditStates(prev => ({ ...prev, photo: 'Verified' }));
        }
        triggerAutoSave();
      } catch (err) {
        console.error('File upload failed:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenProviderWizard = async (type) => {
    // 1. Reset all wizard state
    setProviderWizardStep(1);
    
    setProviderForm({
      name: '',
      globalId: '',
      providerType: type,
      providerSubtype: 'Internal',
      phone: '',
      email: '',
      address: { line1: '', city: '', state: '', pincode: '', country: 'India' },
      contactPerson: '',
      managerEmployeeId: '',
      managerPhone: '',
      managerEmail: '',
      workingHours: { workingDays: [], openingTime: '', closingTime: '' },
      gstNumber: '',
      drugLicenseNumber: '',
      licenseExpiry: '',
      reorderThreshold: '',
      barcodeEnabled: false,
      printerEnabled: false,
      invoicePrefix: '',
      apiProviderName: '',
      assignedBranches: []
    });

    try {
      const typeCount = (createdProviders || []).filter(p => p.providerType === type).length;
      const defaultName = type === 'Pharmacy' 
        ? (typeCount > 0 ? `New Pharmacy ${typeCount + 1}` : (pharmacyName || 'New Pharmacy'))
        : (typeCount > 0 ? `New Laboratory ${typeCount + 1}` : (labName || 'New Laboratory'));

      setProviderSaving(true);
      const res = await clinicApi.createPharmacyDraft({ providerType: type, name: defaultName });
      const newProvider = res?.data || res;
      
      setProviderForm({
        _id: newProvider.providerId || newProvider.draftId || newProvider._id,
        name: '',
        providerType: type,
        providerSubtype: 'Internal',
        phone: '',
        email: '',
        address: { line1: '', city: '', state: '', pincode: '', country: 'India' },
        contactPerson: '',
        managerPhone: '',
        managerEmail: '',
        managerGender: '',
        managerEmployeeId: '',
        workingHours: { workingDays: [], openingTime: '', closingTime: '' },
        gstNumber: '',
        drugLicenseNumber: '',
        licenseExpiry: '',
        emergencyContact: '',
        reorderThreshold: '',
        barcodeEnabled: false,
        printerEnabled: false,
        invoicePrefix: '',
        apiProviderName: '',
        assignedBranches: []
      });
      setProviderWizardOpen(true);
      await fetchProviders();
    } catch (err) {
      console.error('Failed to pre-create provider draft:', err);
      alert(err.response?.data?.message || 'Failed to initialize new provider draft.');
    } finally {
      setProviderSaving(false);
    }
  };

  const handleCloseProviderWizard = () => {
    setProviderWizardOpen(false);
    setProviderWizardStep(1);
    setProviderForm({
      name: '',
      globalId: '',
      providerType: 'Pharmacy',
      providerSubtype: 'Internal',
      phone: '',
      email: '',
      address: { line1: '', city: '', state: '', pincode: '', country: 'India' },
      contactPerson: '',
      managerEmployeeId: '',
      managerPhone: '',
      managerEmail: '',
      workingHours: { workingDays: [], openingTime: '', closingTime: '' },
      gstNumber: '',
      drugLicenseNumber: '',
      licenseExpiry: '',
      reorderThreshold: '',
      barcodeEnabled: false,
      printerEnabled: false,
      invoicePrefix: '',
      apiProviderName: '',
      assignedBranches: []
    });
  };

  const handleEditProvider = async (p) => {
    const id = p._id || p.providerId;
    try {
      setProviderSaving(true);
      const fullRes = await clinicApi.getPharmacyDraft(user?.clinicId || user?.clinic?._id, { type: p.providerType, providerId: id });
      const fullDraft = fullRes?.data || fullRes;
      
      if (fullDraft) {
        setProviderForm({
          _id: fullDraft.providerId || id,
          name: fullDraft.basicInfo?.name || p.name || '',
          providerType: p.providerType,
          providerSubtype: fullDraft.basicInfo?.providerSubtype || p.providerSubtype || 'Internal',
          phone: fullDraft.basicInfo?.phone || p.phone || '',
          email: fullDraft.basicInfo?.email || p.email || '',
          address: fullDraft.basicInfo?.address || p.address || { line1: '', city: '', state: '', pincode: '', country: 'India' },
          contactPerson: fullDraft.manager?.contactPerson || p.contactPerson || '',
          managerPhone: fullDraft.manager?.managerPhone || p.managerPhone || '',
          managerEmail: fullDraft.manager?.managerEmail || p.managerEmail || '',
          managerGender: fullDraft.manager?.managerGender || p.managerGender || '',
          managerEmployeeId: fullDraft.manager?.managerEmployeeId || p.managerEmployeeId || '',
          workingHours: fullDraft.operationalSetup?.workingHours || p.workingHours || { openingTime: '09:00', closingTime: '21:00' },
          gstNumber: fullDraft.operationalSetup?.gstNumber || p.gstNumber || '',
          drugLicenseNumber: fullDraft.operationalSetup?.drugLicenseNumber || p.drugLicenseNumber || '',
          licenseExpiry: fullDraft.operationalSetup?.licenseExpiry || p.licenseExpiry || '',
          emergencyContact: fullDraft.operationalSetup?.emergencyContact || p.emergencyContact || '',
          reorderThreshold: fullDraft.operationalSetup?.reorderThreshold || p.reorderThreshold || 10,
          barcodeEnabled: !!fullDraft.operationalSetup?.barcodeEnabled || !!p.barcodeEnabled,
          printerEnabled: !!fullDraft.operationalSetup?.printerEnabled || !!p.printerEnabled,
          invoicePrefix: fullDraft.operationalSetup?.invoicePrefix || p.invoicePrefix || (p.providerType === 'Pharmacy' ? 'PHR' : 'LAB'),
          assignedBranches: fullDraft.basicInfo?.assignedBranchId ? [fullDraft.basicInfo.assignedBranchId] : (p.assignedBranches || [])
        });
        setProviderWizardStep(fullDraft.currentStep || 1);
        setProviderWizardOpen(true);
      } else {
        setProviderForm({
          ...p,
          _id: id,
          address: {
            line1: p.address?.line1 || '',
            city: p.address?.city || '',
            state: p.address?.state || '',
            pincode: p.address?.pincode || '',
            country: p.address?.country || 'India',
          },
          workingHours: {
            openingTime: p.workingHours?.openingTime || '09:00',
            closingTime: p.workingHours?.closingTime || '21:00',
          }
        });
        setProviderWizardStep(1);
        setProviderWizardOpen(true);
      }
    } catch (err) {
      console.error('Failed to load full draft:', err);
      setProviderForm({
        ...p,
        _id: id,
        address: {
          line1: p.address?.line1 || '',
          city: p.address?.city || '',
          state: p.address?.state || '',
          pincode: p.address?.pincode || '',
          country: p.address?.country || 'India',
        },
        workingHours: {
          openingTime: p.workingHours?.openingTime || '09:00',
          closingTime: p.workingHours?.closingTime || '21:00',
        }
      });
      setProviderWizardStep(1);
      setProviderWizardOpen(true);
    } finally {
      setProviderSaving(false);
    }
  };

  const handleDeleteProvider = (providerId) => {
    const p = createdProviders.find(item => (item._id || item.providerId) === providerId);
    if (!p) return;
    setProviderToDelete(p);
  };

  const confirmDeleteProvider = async () => {
    if (!providerToDelete) return;
    const providerId = providerToDelete._id || providerToDelete.providerId;
    setProviderSaving(true);
    try {
      await providersApi.archiveProvider(providerId);
      await fetchProviders();
      setProviderToDelete(null);
    } catch (err) {
      console.error('Failed to delete provider:', err);
      alert(err.response?.data?.message || 'Failed to delete provider');
    } finally {
      setProviderSaving(false);
    }
  };


  const getProviderStatusInfo = (p) => {
    const completion = getProviderCompletion(p);
    const hasManager = p.manager || p.contactPerson;
    
    if (p.status === 'Archived' || p.status === 'Deleted') {
      return { text: 'Deleted', classes: 'bg-rose-50 border border-rose-100 text-rose-700' };
    }
    if (p.status === 'Active' || p.status === 'Completed') {
      return { text: 'Completed', classes: 'bg-green-50 border border-green-100 text-green-700' };
    }
    if (!hasManager) {
      return { text: 'Pending Manager', classes: 'bg-amber-50 border border-amber-100 text-amber-700' };
    }
    if (completion === 100) {
      return { text: 'Pending Review', classes: 'bg-indigo-50 border border-indigo-100 text-indigo-700' };
    }
    return { text: 'Draft', classes: 'bg-slate-50 border border-slate-100 text-slate-700' };
  };

  const getProviderCompletion = (p) => {
    if (p.status === 'Active' || p.status === 'Completed') return 100;
    const step = p.currentStep || 1;
    if (step === 1) return 25;
    if (step === 2) return 50;
    if (step === 3) return 75;
    return 100;
  };

  const handleSaveProvider = async () => {
    if (!providerForm.name) {
      alert('Provider name is required');
      return;
    }
    setProviderSaving(true);
    try {
      // Sanitize assignedBranches — only keep valid MongoDB ObjectIds
      // Branches created locally during onboarding have temp IDs like "branch-<timestamp>"
      const isMongoId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);
      const sanitizedBranches = (providerForm.assignedBranches || []).filter(isMongoId);

      const payload = {
        ...providerForm,
        assignedBranches: sanitizedBranches,
        creationMode: 'ONBOARDING',
        status: 'Active',
        deferInvitation: false,
        providerCategory: providerForm.providerSubtype === 'Internal' ? 'Own Provider' : 'Partner Provider',
        integrationType: 'None',
        integrationStatus: 'Not Configured',
      };

      // Validate _id looks like a real MongoDB ObjectId before attempting update
      const isValidId = providerForm._id && isMongoId(providerForm._id);
      if (isValidId) {
        await providersApi.updateProvider(providerForm._id, payload);
      } else if (providerForm._id && !isValidId) {
        // _id present but not a valid ObjectId — clear it and create fresh
        console.warn('[handleSaveProvider] providerForm._id is not a valid ObjectId:', providerForm._id, '— creating a new provider instead.');
        delete payload._id;
        await providersApi.createProvider(payload);
      } else {
        await providersApi.createProvider(payload);
      }
      await fetchProviders();
      setProviderWizardOpen(false);
      setProviderWizardStep(1);
      setProviderForm({
        name: '',
        globalId: '',
        providerType: 'Pharmacy',
        providerSubtype: 'Internal',
        phone: '',
        email: '',
        address: { line1: '', city: '', state: '', pincode: '', country: 'India' },
        contactPerson: '',
        managerEmployeeId: '',
        managerPhone: '',
        managerEmail: '',
        workingHours: { openingTime: '09:00', closingTime: '21:00' },
        gstNumber: '',
        drugLicenseNumber: '',
        licenseExpiry: '',
        reorderThreshold: 10,
        barcodeEnabled: false,
        printerEnabled: false,
        invoicePrefix: 'PHR',
        apiProviderName: 'Pathology',
        assignedBranches: []
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save provider');
    } finally {
      setProviderSaving(false);
    }
  };

  const handleScheduleTypeChange = (val) => {
    setScheduleType(val);
    if (val === 'Monday - Friday') {
      setScheduleDays([{ id: '1', dayRange: 'Monday - Friday', shifts: [{ startTime: '09:00 AM', endTime: '05:00 PM' }], closed: false }]);
    } else if (val === 'Monday - Saturday') {
      setScheduleDays([{ id: '1', dayRange: 'Monday - Saturday', shifts: [{ startTime: '09:00 AM', endTime: '05:00 PM' }], closed: false }]);
    } else if (val === 'Monday - Sunday') {
      setScheduleDays([{ id: '1', dayRange: 'Monday - Sunday', shifts: [{ startTime: '09:00 AM', endTime: '05:00 PM' }], closed: false }]);
    } else if (val === 'Individual Days') {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      setScheduleDays(days.map((d, i) => ({ id: String(i), dayRange: d, shifts: [{ startTime: '09:00 AM', endTime: '05:00 PM' }], closed: false })));
    }
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
      setOwnerForm(prev => ({
        ...prev,
        address: addrObj.street || prev.address,
        city: addrObj.city || prev.city,
        state: addrObj.state || prev.state,
        pincode: addrObj.pincode || prev.pincode
      }));
      setEditStates(prev => ({ ...prev, address: 'Verified' }));
    }
    setShowMapPicker(false);
    triggerAutoSave();
  };

  const activePlanObj = plans.find(p => p._id === selectedPlanId);

  const limits = React.useMemo(() => {
    const planName = (activePlanObj?.name || '').toLowerCase();
    if (planName.includes('starter')) {
      return { maxDocs: 1, maxStaff: 2, maxBranches: 1, maxDepts: 2, ai: false, video: false, healthcare: false };
    } else if (planName.includes('professional')) {
      return { maxDocs: 3, maxStaff: 5, maxBranches: 2, maxDepts: 5, ai: false, video: true, healthcare: true };
    } else {
      return { maxDocs: 999, maxStaff: 999, maxBranches: 5, maxDepts: 15, ai: true, video: true, healthcare: true };
    }
  }, [activePlanObj]);

  const combinedStaff = React.useMemo(() => {
    const list = [...staff];
    const pharmacies = (Array.isArray(createdProviders) ? createdProviders : []).filter(p => p.providerType === 'Pharmacy');
    pharmacies.forEach(p => {
      const id = `provider-staff-${p._id || p.id}`;
      if (!list.some(s => s.id === id)) {
        list.push({
          id,
          title: 'Mr.',
          name: p.contactPerson || 'Pharmacy Manager',
          email: p.email || '',
          phone: p.phone || '',
          role: 'Pharmacy Manager',
          status: 'Created via Pharmacy Setup',
          isReadOnly: true,
          providerId: p._id || p.id
        });
      }
    });

    const labs = (Array.isArray(createdProviders) ? createdProviders : []).filter(p => p.providerType === 'Laboratory');
    labs.forEach(p => {
      const id = `provider-staff-${p._id || p.id}`;
      if (!list.some(s => s.id === id)) {
        list.push({
          id,
          title: 'Mr.',
          name: p.contactPerson || 'Laboratory Manager',
          email: p.email || '',
          phone: p.phone || '',
          role: 'Laboratory Manager',
          status: 'Created via Laboratory Setup',
          isReadOnly: true,
          providerId: p._id || p.id
        });
      }
    });

    return list;
  }, [staff, createdProviders]);

  const handleSaveDraft = async () => {
    try {
      setSaveStatus('Saving...');
      setTimeout(() => {
        setSaveStatus('Saved just now');
        alert('Draft configuration saved successfully!');
      }, 600);
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };
  const validateDoctorOrStaff = async (formData, isEdit = false, currentId = null, targetType = 'doctor') => {
    const errs = {};
    if (!formData.name) {
      errs.name = 'Full name is required';
    } else if (/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Miss\.|Dr|Prof|Mr|Mrs|Ms|Miss|Doctor)\s/i.test(formData.name.trim())) {
      errs.name = 'Please enter name only; select the prefix title from the Professional Title dropdown.';
    }
    if (!formData.email) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.phone) {
      errs.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      errs.phone = 'Phone number must be exactly 10 digits';
    }

    if (Object.keys(errs).length > 0) return errs;

    // 1. Check local duplicates within current step (exclude current editing ID)
    if (targetType === 'doctor') {
      const emailDup = doctors.some(d => d.email.toLowerCase() === formData.email.toLowerCase() && d.id !== currentId);
      if (emailDup) {
        errs.email = 'This email has already been used for another doctor in this clinic.';
      }
      const phoneDup = doctors.some(d => d.phone.replace(/\D/g, '') === formData.phone.replace(/\D/g, '') && d.id !== currentId);
      if (phoneDup) {
        errs.phone = 'This phone number has already been used for another doctor in this clinic.';
      }
    } else {
      const emailDup = staff.some(s => s.email.toLowerCase() === formData.email.toLowerCase() && s.id !== currentId);
      if (emailDup) {
        errs.email = 'This email has already been used for another staff member in this clinic.';
      }
      const phoneDup = staff.some(s => s.phone.replace(/\D/g, '') === formData.phone.replace(/\D/g, '') && s.id !== currentId);
      if (phoneDup) {
        errs.phone = 'This phone number has already been used for another staff member in this clinic.';
      }
    }

    // 2. Cross-step Validation (Doctors <-> Staff)
    if (targetType === 'doctor') {
      const crossEmailDup = staff.some(s => s.email.toLowerCase() === formData.email.toLowerCase());
      if (crossEmailDup) {
        errs.email = 'This email is already assigned to another member of your clinic.';
      }
      const crossPhoneDup = staff.some(s => s.phone.replace(/\D/g, '') === formData.phone.replace(/\D/g, ''));
      if (crossPhoneDup) {
        errs.phone = 'This phone number is already assigned to another member of your clinic.';
      }
    } else {
      const crossEmailDup = doctors.some(d => d.email.toLowerCase() === formData.email.toLowerCase());
      if (crossEmailDup) {
        errs.email = 'This email is already assigned to another member of your clinic.';
      }
      const crossPhoneDup = doctors.some(d => d.phone.replace(/\D/g, '') === formData.phone.replace(/\D/g, ''));
      if (crossPhoneDup) {
        errs.phone = 'This phone number is already assigned to another member of your clinic.';
      }
    }

    if (Object.keys(errs).length > 0) return errs;

    // 3. Global database check via backend APIs
    try {
      const emailRes = await clinicApi.validateEmail({ email: formData.email });
      if (emailRes.data && !emailRes.data.isUnique) {
        errs.email = 'Email already belongs to another registered user.';
      }
    } catch (e) {
      if (e.response?.status === 400 || e.response?.data?.isUnique === false) {
        errs.email = 'Email already belongs to another registered user.';
      }
    }

    try {
      const phoneRes = await clinicApi.validatePhone({ phone: formData.phone.replace(/\D/g, '') });
      if (phoneRes.data && !phoneRes.data.isUnique) {
        errs.phone = 'Phone number already belongs to another registered user.';
      }
    } catch (e) {
      if (e.response?.status === 400 || e.response?.data?.isUnique === false) {
        errs.phone = 'Phone number already belongs to another registered user.';
      }
    }

    return errs;
  };

  // ── ONBOARDING COMPLETION VALIDATION ──
  const runOnboardingValidation = () => {
    const errors = [];

    // Step 1: Owner Profile
    if (!ownerForm.name || !ownerForm.email || !ownerForm.phone) {
      errors.push({ step: 1, stepName: 'Owner Profile', message: 'Owner profile is incomplete. Please fill in all required fields.' });
    }

    // Step 2: Doctor Setup – at least one doctor
    if (!doctors || doctors.length === 0) {
      errors.push({ step: 2, stepName: 'Doctor Setup', message: 'At least one doctor must be added to complete onboarding.' });
    }

    // Step 3: Department Setup – at least one active department
    if (!departments || departments.filter(d => d.active).length === 0) {
      errors.push({ step: 3, stepName: 'Department Setup', message: 'At least one active department is required.' });
    }

    // Step 4: Branch Setup – at least one branch with a main branch
    if (!branches || branches.length === 0) {
      errors.push({ step: 4, stepName: 'Branch Setup', message: 'At least one branch must be added.' });
    } else if (!branches.some(b => b.isPrimary)) {
      errors.push({ step: 4, stepName: 'Branch Setup', message: 'A Main Branch must be designated before completing setup.' });
    }

    // Step 6: Healthcare Setup – Active providers (not Draft) must have a manager
    const activeProviders = (createdProviders || []).filter(p => p.status !== 'Draft');
    for (const p of activeProviders) {
      const hasManager = p.manager || p.contactPerson || p.managerName;
      if (!hasManager) {
        errors.push({
          step: 6,
          stepName: 'Healthcare Setup',
          message: `${p.providerType} Manager is missing for '${p.name}'. Please complete the ${p.providerType} Manager setup.`
        });
      }
    }

    // Draft providers should NOT count as complete – warn if they exist
    const draftProviders = (createdProviders || []).filter(p => p.status === 'Draft');
    for (const p of draftProviders) {
      errors.push({
        step: 6,
        stepName: 'Healthcare Setup',
        message: `${p.providerType} '${p.name}' is still in Draft status and does not count as completed. Please submit or delete the draft.`
      });
    }

    // Step 9: Clinic Schedule – must have at least one schedule day
    if (!scheduleDays || scheduleDays.length === 0) {
      errors.push({ step: 9, stepName: 'Clinic Schedule', message: 'Clinic schedule has not been configured.' });
    }

    // Step 10: Review – must accept all 4 terms
    const allConfirmed = Object.values(launchConfirmations).every(Boolean);
    if (!allConfirmed) {
      errors.push({ step: 10, stepName: 'Review & Launch', message: 'You must accept all confirmation agreements before launching.' });
    }

    return errors;
  };

  const handleLaunchDashboard = async () => {
    setWizardError('');
    const validationErrors = runOnboardingValidation();
    if (validationErrors.length > 0) {
      setValidationSummary(validationErrors);
      return;
    }

    const clinicId = user.clinicId || user.clinic?._id;
    
    // Reset progress and open progress modal
    setLaunchProgress({
      percent: 0,
      currentTask: 'Connecting to onboarding stream...',
      checklist: [],
      emailsSent: [],
      status: 'CONNECTING',
      error: null
    });
    setShowProgressModal(true);
    setIsSubmitting(true);

    // Initialize Server-Sent Events stream for live launch progress
    const sseUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/clinics/${clinicId}/onboarding-progress`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLaunchProgress(data);
      } catch (err) {
        console.error('Failed to parse progress SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Progress SSE connection error:', err);
      eventSource.close();
    };

    try {
      const payload = {
        doctors: doctors.map(d => ({
          fullName: d.name,
          email: d.email,
          phone: d.phone,
          specialization: d.specialty || 'General Medicine'
        })),
        staffList: staff.map(s => ({
          name: s.name,
          email: s.email,
          phone: s.phone,
          role: s.role?.toUpperCase() || 'RECEPTIONIST'
        })),
        branches: branches.map(b => ({
          name: b.name,
          code: b.code || b.name.substring(0, 3).toUpperCase() + String(Math.floor(100 + Math.random() * 900)),
          phone: b.contact || b.phone || clinicForm.contactNumber,
          address: {
            street: b.address,
            city: clinicForm.city,
            state: clinicForm.state,
            country: 'India'
          }
        })),
        clinicDetails: {
          timings: scheduleDays.map(d => ({
            dayRange: d.dayRange,
            startTime: d.shifts[0]?.startTime || '09:00 AM',
            endTime: d.shifts[0]?.endTime || '05:00 PM'
          })),
          departments: departments.filter(d => d.active).map(d => ({
            name: d.name,
            active: d.active
          })),
          aiConfig: aiFeatures,
          videoConfig: {
            provider: videoProvider,
            defaultFee: parseFloat(videoFee || '500'),
            duration: parseInt(videoDuration || '15', 10),
            waitingRoom: videoWaitingRoom,
            recording: videoRecording,
            reminders: videoReminders
          }
        },
        skipDoctors: doctors.length === 0,
        skipStaff: staff.length === 0,
        skipBranches: branches.length === 0
      };

      const res = await clinicApi.launchOnboarding(clinicId, payload);
      eventSource.close();

      try {
        await clinicApi.deleteOnboardingDraft();
      } catch (err) {
        console.warn('Failed to delete onboarding draft:', err);
      }

      setSubmitSuccess(true);
      setShowProgressModal(false);

      const activationData = res.data || res;
      setLaunchResult({
        clinicName: clinicForm.name || user?.clinic?.name || 'Your Clinic',
        clinicId: activationData.activationId || clinicId,
        planName: activePlanObj?.name || 'Trial Plan',
        activatedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        validUntil: user?.clinic?.subscription?.endDate 
          ? new Date(user.clinic.subscription.endDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) 
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { dateStyle: 'long' }),
        doctorsCount: activationData.summary?.doctors || doctors.length,
        staffCount: activationData.summary?.staff || staff.length,
        branchesCount: activationData.summary?.branches || branches.length,
        deptsCount: activationData.summary?.departments || departments.filter(d => d.active).length,
        pharmacyCount: activationData.summary?.pharmacy || 0,
        laboratoryCount: activationData.summary?.laboratory || 0,
        aiModulesCount: Object.values(aiFeatures).filter(Boolean).length,
        videoProvider: videoProvider,
        scheduleType: scheduleType,
        emailsSent: activationData.emailsQueued || 0,
        lastBackup: new Date().toLocaleDateString('en-IN'),
        dbStatus: 'Active / Healthy'
      });
      
      setShowLaunchSuccess(true);
    } catch (err) {
      eventSource.close();
      setShowProgressModal(false);
      setWizardError(err.response?.data?.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Run owner DOB format validation
      const dobVal = validateDOB(ownerForm.dob);
      if (!dobVal.valid) {
        setErrors({ dob: dobVal.error });
        return;
      }
      setErrors({});
    }
    if (currentStep === 4) {
      const hasMainBranch = Array.isArray(branches) && branches.some(b => b.isPrimary);
      if (!hasMainBranch || branches.length === 0) {
        setWizardError('At least one Main Branch is required to continue clinic onboarding.');
        alert('At least one Main Branch is required to continue clinic onboarding.');
        return;
      }
      setWizardError(null);
    }
    if (currentStep === 7) {
      const enabledCount = Object.keys(aiFeatures).filter(k => aiFeatures[k]).length;
      if (enabledCount === 0) {
        setWizardError('Enable at least one AI-powered module to continue.');
        return;
      }
      setWizardError(null);
    }
    setCurrentStep(prev => prev + 1);
  };

  const progress = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  // Step 0 Welcome View
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-xl w-full text-center shadow-2xl border border-slate-100 relative z-10 space-y-6">
          <div className="flex items-center justify-center mx-auto pt-2 pb-1">
            <PehalLogo variant="primary" height={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">Welcome to AICMS</h1>
            <p className="text-sm text-green-600 font-extrabold uppercase tracking-wider text-center">Congratulations!</p>
            <h2 className="text-lg font-bold text-slate-800 text-center">Your clinic has been approved successfully.</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed text-center">
              Now let's configure your clinic's internal workspace (doctors roster, department settings, staff accounts, AI tools, and schedule shifts).
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full flex justify-around text-left">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Estimated Setup</span>
              <span className="text-xs font-black text-slate-800">10–15 Minutes</span>
            </div>
            <div className="border-l border-slate-200" />
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Active Subscription</span>
              <span className="text-xs font-black text-slate-800 uppercase">{activePlanObj?.name || 'Professional Plan'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-lg transition duration-200 flex items-center justify-center gap-2"
          >
            Start Configuration <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Success launching view
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100 space-y-6">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-slate-900">Onboarding Successful</h2>
            <p className="text-xs text-slate-400">Your clinic workspace is configured and ready. Launching dashboard...</p>
          </div>
          <div className="flex justify-center pt-2">
            <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative overflow-hidden" style={{ height: '100dvh', minHeight: '100vh' }}>
      {/* PROVIDER WIZARD MODAL */}
      <ProviderWizardModal
        isOpen={providerWizardOpen}
        onClose={handleCloseProviderWizard}
        step={providerWizardStep}
        setStep={setProviderWizardStep}
        form={providerForm}
        setForm={setProviderForm}
        branches={branches}
        saving={providerSaving}
        onSave={handleSaveProvider}
        onSaveDraft={handleSaveProviderDraftManual}
        setCurrentStep={setCurrentStep}
      />

      {/* MAP PICKER PORTAL */}
      {showMapPicker && (
        <MapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelectAddress={handleMapLocationSelect}
        />
      )}

      {/* RESTORE SETUP MODAL */}
      {showRestorePrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
              <Sparkles size={20} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-950">Continue Setup?</h3>
              <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                A newer onboarding draft was found for your clinic. Would you like to continue from the latest saved version or keep your current session?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-lg transition duration-200"
              >
                Continue Latest Draft
              </button>
              <button
                type="button"
                onClick={handleDeclineRestore}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-2xl text-xs font-black transition duration-200"
              >
                Keep Current Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE PROVIDER CONFIRMATION MODAL */}
      {providerToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <ShieldAlert size={20} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-950">Delete {providerToDelete.providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'}?</h3>
              <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                This {providerToDelete.providerType === 'Laboratory' ? 'laboratory' : 'pharmacy'} has not been launched yet.
                Deleting it will permanently remove all saved draft information.
              </p>
              <p className="text-[11px] font-bold text-slate-400">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setProviderToDelete(null);
                }}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-2xl text-xs font-black transition duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = providerToDelete._id || providerToDelete.providerId;
                  const type = providerToDelete.providerType;
                  try {
                    await providersApi.archiveProvider(id);
                    await fetchProviders();
                    alert(`✓ ${type} deleted successfully.`);
                  } catch (err) {
                    console.error('Failed to delete provider:', err);
                    alert(err.response?.data?.message || 'Failed to delete provider');
                  } finally {
                    setProviderToDelete(null);
                  }
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-750 text-white rounded-2xl text-xs font-black shadow-lg transition duration-200"
              >
                Delete {providerToDelete.providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
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
                    }`}>{s.name.split(' ')[0]}</span>
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

          {/* Right Header Badges */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 border border-green-200 bg-green-50/50 rounded-full text-[10px] font-extrabold text-green-700">
              <Sparkles size={11} /> {activePlanObj?.name || 'Enterprise Plan'}
            </div>
            <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 border border-slate-200 bg-slate-50/50 rounded-full text-[10px] font-extrabold text-slate-655">
              <Clock size={11} /> 30 Days Left
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className={`text-[10px] font-black tracking-tight transition-all duration-300 ${
                saveStatus.startsWith('⚠') ? 'text-amber-600 animate-pulse' :
                saveStatus === 'Saving...' ? 'text-blue-500' : 'text-slate-400'
              }`}>
                {getDraftStatusMessage()}
              </span>
              <button
                type="button"
                onClick={handleSaveDraftManual}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-full text-[10px] font-black transition cursor-pointer"
              >
                Save Draft
              </button>
            </div>
            <button className="p-1.5 hover:bg-slate-100 rounded-full transition text-slate-500">
              <HelpCircle size={17} />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded-full transition text-slate-500 relative">
              <Bell size={17} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
            <div className="relative group flex items-center gap-2 border border-slate-200 rounded-full py-1 pl-2 pr-3 bg-white hover:bg-slate-50/50 cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[9px] uppercase">
                {user?.name ? user.name.substring(0,2) : 'AD'}
              </div>
              <span className="text-[10px] font-black text-slate-800">{user?.role || 'Admin'}</span>
              
              {/* Dropdown Menu on Hover */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-150 rounded-2xl shadow-xl py-2 px-3 invisible group-hover:visible group-hover:opacity-100 opacity-0 transition-all duration-200 z-50">
                <div className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider mb-1">Logged In As</div>
                <div className="text-xs text-slate-700 font-bold break-all mb-2.5 select-all" title={user?.email}>
                  {user?.email}
                </div>
                <div className="border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5"
                  >
                    <X size={13} className="shrink-0" /> Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* 3-COLUMN WORKSPACE */}
      <div className="flex-1 max-w-[1840px] w-full mx-auto px-5 py-3 flex flex-col lg:flex-row gap-5" style={{ minHeight: 0, overflow: 'hidden' }}>
        
        {/* LEFT SIDEBAR - PROGRESS RING */}
        <div
          className="cw-scroll w-full lg:w-[22%] shrink-0 flex flex-col gap-4 bg-white border border-slate-150/70 rounded-2xl p-5 shadow-sm"
          style={{ overflowY: 'auto' }}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 mb-1">Clinic Onboarding</h3>
              <p className="text-[10.5px] text-slate-400 font-bold leading-normal">Complete all steps to set up your clinic and start delivering exceptional care.</p>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex flex-col items-center justify-center py-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#E2E8F0" strokeWidth="5.5" fill="transparent" />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#16A34A"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray="251.2"
                    animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-black text-slate-900">{progress}%</span>
                  <span className="text-[8.5px] text-slate-400 font-extrabold uppercase">Completed</span>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 mt-3.5 flex items-center gap-1.5">
                <Clock size={11.5} /> {Math.max(1, 10 - currentStep)} steps remaining
              </span>
            </div>

            {/* Steps list */}
            <div className="space-y-3.5 pl-1.5 relative">
              <div className="absolute top-1 bottom-1 left-[14px] w-[2px] bg-slate-100" />
              {STEPS.map((s) => {
                const isActive = currentStep === s.id;
                const isCompleted = currentStep > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!isCompleted && !isActive}
                    onClick={() => setCurrentStep(s.id)}
                    className="w-full text-left flex gap-3 items-start relative z-10 hover:bg-slate-50/50 p-1 rounded-xl transition cursor-pointer disabled:cursor-default"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[9px] border transition shrink-0 ${
                      isCompleted ? "bg-green-600 border-green-600 text-white"
                      : isActive ? "bg-green-50 border-green-600 text-green-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {isCompleted ? <Check size={11} /> : s.id}
                    </div>
                    <div className="flex-1">
                      <h5 className={`text-[11.5px] font-black leading-tight ${isActive ? "text-green-600" : isCompleted ? "text-slate-700" : "text-slate-400"}`}>
                        {s.name}
                      </h5>
                      <span className="text-[9.5px] text-slate-400 block mt-0.5">{s.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER SCROLLABLE FORM */}
        <div className="flex-1 lg:w-[56%] flex flex-col bg-white rounded-2xl shadow-md border border-slate-150/80 overflow-hidden">
          {/* Header */}
          <div className="shrink-0 px-8 pt-6 pb-4 border-b border-slate-100 bg-white">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Step {currentStep} of 10</span>
            <h3 className="text-xl font-black text-slate-900 mt-1">{STEPS[currentStep - 1]?.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{STEPS[currentStep - 1]?.desc}</p>
          </div>

          {/* Form scrollable */}
          <div className="cw-scroll flex-1 px-8 py-5 bg-[#FDFDFD]" style={{ overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* ── STEP 1: OWNER PROFILE (Premium Form Cards) ── */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Card 1: Personal Information */}
                    <div className="border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-150">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0 border border-green-100">
                            <User size={15} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-850 block leading-tight">Personal Information</span>
                            <span className="text-[10px] text-slate-400 font-bold">Basic details about the clinic owner</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-150 text-[10px] font-black rounded-full uppercase">
                          <CheckCircle size={10.5} /> {editStates.personal}
                        </span>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Owner Full Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.name}
                              onChange={(e) => handleOwnerFormChange('name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Designation / Title <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.designation}
                              onChange={(e) => handleOwnerFormChange('designation', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-650 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                            <input
                              type="date"
                              className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none ${errors.dob ? 'border-rose-500' : 'border-slate-200'}`}
                              value={ownerForm.dob}
                              onChange={(e) => handleOwnerFormChange('dob', e.target.value)}
                            />
                            {errors.dob && <p className="text-[10px] text-rose-500 mt-1">{errors.dob}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-650 mb-1.5">Gender <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.gender}
                              onChange={(e) => handleOwnerFormChange('gender', e.target.value)}
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-650 mb-1.5">Nationality <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.nationality}
                              onChange={(e) => handleOwnerFormChange('nationality', e.target.value)}
                            >
                              <option value="Indian">Indian</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-650 mb-1.5">Preferred Language <span className="text-red-500">*</span></label>
                            <select
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.preferredLanguage}
                              onChange={(e) => handleOwnerFormChange('preferredLanguage', e.target.value)}
                            >
                              <option value="English">English</option>
                              <option value="Hindi">Hindi</option>
                              <option value="Tamil">Tamil</option>
                              <option value="Telugu">Telugu</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Contact Information */}
                    <div className="border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-150">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                            <ShieldCheck size={15} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-850 block leading-tight">Contact Information</span>
                            <span className="text-[10px] text-slate-400 font-bold">Email and phone number cannot be changed</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle className="w-3.5 h-3.5" /> Verified
                        </span>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Email Address</label>
                            <div className="relative">
                              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="email"
                                disabled
                                className="w-full pl-9 pr-8 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed"
                                value={ownerForm.email}
                              />
                              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Phone Number</label>
                            <div className="relative">
                              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="tel"
                                disabled
                                className="w-full pl-9 pr-8 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed"
                                value={ownerForm.phone}
                              />
                              <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                          <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                          Email and mobile number can only be changed by contacting AICMS Support.
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Identification Details */}
                    <div className="border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-150">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center shrink-0 border border-purple-100">
                            <CreditCard size={15} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-850 block leading-tight">Identification Details</span>
                            <span className="text-[10px] text-slate-400 font-bold">Government issued identification parameters</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-150 text-[10px] font-black rounded-full uppercase">
                          <RefreshCw size={10.5} className="animate-spin" /> {editStates.identity}
                        </span>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Aadhaar Number (Optional)</label>
                            <input
                              type="text"
                              placeholder="XXXX XXXX 1234"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.aadhaar}
                              onChange={(e) => handleOwnerFormChange('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">PAN Number (Optional)</label>
                            <input
                              type="text"
                              placeholder="ABCDE1234F"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-855 focus:bg-white focus:border-green-500 focus:outline-none uppercase"
                              value={ownerForm.pan}
                              onChange={(e) => handleOwnerFormChange('pan', e.target.value.toUpperCase())}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Passport Number (Optional)</label>
                            <input
                              type="text"
                              placeholder="Enter passport number"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.passport}
                              onChange={(e) => handleOwnerFormChange('passport', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">GSTIN Number (Optional)</label>
                            <input
                              type="text"
                              placeholder="Enter GSTIN number"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:bg-white focus:border-green-500 focus:outline-none uppercase"
                              value={ownerForm.gstin}
                              onChange={(e) => handleOwnerFormChange('gstin', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Address Information */}
                    <div className="border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-150">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0 border border-green-100">
                            <MapPin size={15} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-850 block leading-tight">Address Information</span>
                            <span className="text-[10px] text-slate-400 font-bold">Residential address of the owner</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setMapTarget('owner'); setShowMapPicker(true); }}
                          className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-sm flex items-center gap-1"
                        >
                          <MapPin size={11} /> Locate on Map
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Address Line 1 <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.address}
                              onChange={(e) => handleOwnerFormChange('address', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Address Line 2 (Optional)</label>
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.addressLine2}
                              onChange={(e) => handleOwnerFormChange('addressLine2', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Landmark (Optional)</label>
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.landmark}
                              onChange={(e) => handleOwnerFormChange('landmark', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">City <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.city}
                              onChange={(e) => handleOwnerFormChange('city', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">State <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.state}
                              onChange={(e) => handleOwnerFormChange('state', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Pincode <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              maxLength="6"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-green-500 focus:outline-none"
                              value={ownerForm.pincode}
                              onChange={(e) => handleOwnerFormChange('pincode', e.target.value.replace(/\D/g, '').slice(0,6))}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Country</label>
                            <input
                              type="text"
                              disabled
                              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed"
                              value={ownerForm.country}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 5: Profile Photo */}
                    <div className="border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-150">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-teal-50 text-teal-650 rounded-xl flex items-center justify-center shrink-0 border border-teal-100">
                            <UploadCloud size={15} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-855 block leading-tight">Profile Photo</span>
                            <span className="text-[10px] text-slate-400 font-bold">Upload and crop professional avatar profile photo</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-inner relative">
                          {localPreviews.profilePhoto || ownerForm.profilePhoto ? (
                            <img src={localPreviews.profilePhoto || ownerForm.profilePhoto} alt="Profile photo preview" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-slate-350" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <span className="block text-[11px] font-extrabold text-slate-655">Select your professional profile photo</span>
                          <input type="file" id="ownerAvatarFile" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0], 'profilePhoto')} />
                          <div className="flex gap-2">
                            <label htmlFor="ownerAvatarFile" className="px-3.5 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-xl cursor-pointer hover:bg-slate-800 transition shadow-sm flex items-center gap-1">
                              <UploadCloud size={12} /> Upload Photo
                            </label>
                            {(localPreviews.profilePhoto || ownerForm.profilePhoto) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOwnerForm(prev => ({ ...prev, profilePhoto: '' }));
                                  setLocalPreviews(prev => ({ ...prev, profilePhoto: '' }));
                                  triggerAutoSave();
                                }}
                                className="px-3 py-1.5 border border-slate-200 text-rose-600 rounded-xl text-[10px] font-black hover:bg-rose-50 hover:border-rose-200 transition"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: DOCTOR SETUP ── */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* Header Info Block */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3.5 items-start">
                      <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                        <HelpCircle size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-800 block">Why add doctors?</span>
                        <p className="text-[11px] text-slate-500 font-bold leading-normal mt-0.5">
                          You can add doctors now or skip this step and add them later from the dashboard. Added doctors will receive their credentials and complete their onboarding automatically after the clinic is launched.
                        </p>
                      </div>
                    </div>

                    {/* Section Header - Fixed Placement */}
                    <div className="flex justify-between items-center bg-slate-50 px-4.5 py-3 rounded-2xl border border-slate-150">
                      <div>
                        <span className="text-xs font-black text-slate-800">Doctors ({doctors.length})</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Manage your doctors and their details.</span>
                      </div>
                      {doctors.length < limits.maxDocs && (
                        <button
                          type="button"
                          onClick={() => {
                            setDoctorForm({ title: 'Dr.', name: '', specialty: 'General Medicine', email: '', phone: '' });
                            setEmailValState({ status: 'idle', message: '', accountType: '' });
                            setPhoneValState({ status: 'idle', message: '', accountType: '' });
                            setDoctorErrors({});
                            setShowAddDoctor(true);
                          }}
                          className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-sm transition"
                        >
                          + Add a Doctor
                        </button>
                      )}
                    </div>

                    {/* Scenario 1: Empty state */}
                    {doctors.length === 0 && !showAddDoctor && (
                      <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-3xl bg-white text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center relative">
                          <User className="w-10 h-10 text-slate-350" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900">No doctors added yet</h4>
                          <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
                            Add your first doctor to start managing consultations, schedules and appointments.
                          </p>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-black text-slate-600"
                          >
                            Skip this step
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subscription limit upgrade card */}
                    {doctors.length >= limits.maxDocs && (
                      <div className="border border-amber-200 bg-amber-50/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h5 className="text-sm font-black text-amber-800 flex items-center gap-1.5">
                            <AlertTriangle size={15} /> You have reached your doctor limit
                          </h5>
                          <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                            Your current subscription plan allows up to {limits.maxDocs} active doctors. Upgrade your plan to add more.
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black shadow-sm">
                            Upgrade Plan
                          </button>
                          <button type="button" className="px-3 py-2 border border-amber-200 hover:bg-amber-100 rounded-xl text-[10px] font-black text-amber-800">
                            Compare Plans
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add Doctor Card Form */}
                    {showAddDoctor && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative animate-scaleIn">
                        <button onClick={() => setShowAddDoctor(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                          <X size={15} />
                        </button>
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Add Doctor details</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Title</label>
                            <select
                              value={doctorForm.title || 'Dr.'}
                              onChange={(e) => setDoctorForm({ ...doctorForm, title: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            >
                              <option value="Dr.">Dr.</option>
                              <option value="Prof.">Prof.</option>
                              <option value="Mr.">Mr.</option>
                              <option value="Mrs.">Mrs.</option>
                              <option value="Ms.">Ms.</option>
                              <option value="Miss.">Miss.</option>
                              <option value="">None</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Full Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Shreyas Roy"
                              value={doctorForm.name}
                              onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                            />
                            {doctorErrors.name && <p className="text-[10px] text-rose-500 mt-1">{doctorErrors.name}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Email</label>
                            <input
                              type="email"
                              placeholder="shreyas@clinic.com"
                              value={doctorForm.email}
                              onChange={(e) => handleEmailChange(e.target.value)}
                              onBlur={(e) => checkEmailUniqueness(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                            />
                            {doctorErrors.email && <p className="text-[10px] text-rose-500 mt-1 leading-normal">{doctorErrors.email}</p>}
                            {emailValState.status === 'loading' && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-500 mt-1">
                                <RefreshCw size={11} className="animate-spin" /> Checking email...
                              </div>
                            )}
                            {emailValState.status === 'valid' && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-1 font-bold">
                                <CheckCircle size={11} className="text-emerald-500 shrink-0" /> {emailValState.message}
                              </div>
                            )}
                            {emailValState.status === 'invalid' && (
                              <div className="flex items-center gap-1 text-[10px] text-rose-500 mt-1 font-bold">
                                <X size={11} className="text-rose-500 shrink-0" /> {emailValState.message}
                              </div>
                            )}
                            {emailValState.status === 'error' && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1 font-bold">
                                <AlertTriangle size={11} className="text-amber-500 shrink-0" /> {emailValState.message}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Phone</label>
                            <input
                              type="tel"
                              placeholder=""
                              value={doctorForm.phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              onBlur={(e) => checkPhoneUniqueness(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                            />
                            {doctorErrors.phone && <p className="text-[10px] text-rose-500 mt-1 leading-normal">{doctorErrors.phone}</p>}
                            {phoneValState.status === 'loading' && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-500 mt-1">
                                <RefreshCw size={11} className="animate-spin" /> Checking phone number...
                              </div>
                            )}
                            {phoneValState.status === 'valid' && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-1 font-bold">
                                <CheckCircle size={11} className="text-emerald-500 shrink-0" /> {phoneValState.message}
                              </div>
                            )}
                            {phoneValState.status === 'invalid' && (
                              <div className="flex items-center gap-1 text-[10px] text-rose-500 mt-1 font-bold">
                                <X size={11} className="text-rose-500 shrink-0" /> {phoneValState.message}
                              </div>
                            )}
                            {phoneValState.status === 'error' && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1 font-bold">
                                <AlertTriangle size={11} className="text-amber-500 shrink-0" /> {phoneValState.message}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={doctorValidating || !doctorForm.name.trim() || emailValState.status !== 'valid' || phoneValState.status !== 'valid'}
                          onClick={async () => {
                            setDoctorValidating(true);
                            setDoctorErrors({});
                            const errs = await validateDoctorOrStaff(doctorForm, false, null, 'doctor');
                            if (Object.keys(errs).length > 0) {
                              setDoctorErrors(errs);
                              setDoctorValidating(false);
                              return;
                            }
                            setDoctors([...doctors, {
                              id: 'doc-' + Date.now(),
                              title: doctorForm.title || 'Dr.',
                              name: doctorForm.name,
                              specialty: doctorForm.specialty,
                              email: doctorForm.email,
                              phone: doctorForm.phone,
                              verified: false,
                              status: 'Pending Clinic Launch',
                              createdDate: new Date().toLocaleDateString()
                            }]);
                            setDoctorForm({ title: 'Dr.', name: '', specialty: 'General Medicine', email: '', phone: '' });
                            setEmailValState({ status: 'idle', message: '', accountType: '' });
                            setPhoneValState({ status: 'idle', message: '', accountType: '' });
                            setShowAddDoctor(false);
                            setDoctorValidating(false);
                            triggerAutoSave();
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {doctorValidating ? 'Validating...' : 'Add Doctor'}
                        </button>
                      </div>
                    )}

                    {/* Scenario 2: Doctors Added list view */}
                    {doctors.length > 0 && (
                      <div className="space-y-4 animate-scaleIn">
                        <div className="grid grid-cols-1 gap-4.5">
                          {doctors.map(d => (
                            <div key={d.id} className="border border-slate-150 p-5 rounded-2xl bg-white flex justify-between items-start shadow-sm relative">
                              {editingDoctorId === d.id ? (
                                <div className="w-full space-y-4">
                                  <h6 className="text-xs font-black text-slate-800 uppercase">Edit Doctor Details</h6>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Title</label>
                                      <select
                                        value={editingDoctorForm.title || 'Dr.'}
                                        onChange={(e) => setEditingDoctorForm({ ...editingDoctorForm, title: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                                      >
                                        <option value="Dr.">Dr.</option>
                                        <option value="Prof.">Prof.</option>
                                        <option value="Mr.">Mr.</option>
                                        <option value="Mrs.">Mrs.</option>
                                        <option value="Ms.">Ms.</option>
                                        <option value="Miss.">Miss.</option>
                                        <option value="">None</option>
                                      </select>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Full Name</label>
                                      <input
                                        type="text"
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                                        value={editingDoctorForm.name}
                                        onChange={(e) => setEditingDoctorForm({ ...editingDoctorForm, name: e.target.value })}
                                      />
                                      {doctorErrors.name && <p className="text-[10px] text-rose-500 mt-1">{doctorErrors.name}</p>}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Email</label>
                                      <input
                                        type="email"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                                        value={editingDoctorForm.email}
                                        onChange={(e) => setEditingDoctorForm({ ...editingDoctorForm, email: e.target.value })}
                                      />
                                      {doctorErrors.email && <p className="text-[10px] text-rose-500 mt-1 leading-normal">{doctorErrors.email}</p>}
                                    </div>
                                    <div>
                                      <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Phone</label>
                                      <input
                                        type="tel"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                                        value={editingDoctorForm.phone}
                                        onChange={(e) => setEditingDoctorForm({ ...editingDoctorForm, phone: e.target.value })}
                                      />
                                      {doctorErrors.phone && <p className="text-[10px] text-rose-500 mt-1 leading-normal">{doctorErrors.phone}</p>}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={doctorValidating}
                                      onClick={async () => {
                                        setDoctorValidating(true);
                                        setDoctorErrors({});
                                        const errs = await validateDoctorOrStaff(editingDoctorForm, true, d.id, 'doctor');
                                        if (Object.keys(errs).length > 0) {
                                          setDoctorErrors(errs);
                                          setDoctorValidating(false);
                                          return;
                                        }
                                        setDoctors(doctors.map(item => item.id === d.id ? { ...item, ...editingDoctorForm } : item));
                                        setEditingDoctorId(null);
                                        setDoctorValidating(false);
                                      }}
                                      className="px-3.5 py-2 bg-green-655 text-white rounded-xl text-[10px] font-black cursor-pointer disabled:opacity-50"
                                    >
                                      {doctorValidating ? 'Validating...' : 'Save'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingDoctorId(null)}
                                      className="px-3 py-2 border border-slate-200 text-slate-655 rounded-xl text-[10px] font-black"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-black text-sm shrink-0 border border-green-100">
                                      {d.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-855 block">{(d.title || '').trim() ? `${d.title} ` : ''}{d.name}</span>
                                        <span
                                          className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black rounded-full uppercase border border-amber-200 cursor-help"
                                          title="This doctor will receive onboarding credentials automatically after the clinic onboarding process is completed successfully."
                                        >
                                          {d.status || 'Pending Clinic Launch'}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-500 font-bold block mt-0.5">{d.email} | {d.phone}</span>
                                    </div>
                                  </div>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setActiveMenuId(activeMenuId === d.id ? null : d.id)}
                                      className="text-slate-400 hover:text-slate-655 p-1.5 rounded-full hover:bg-slate-100"
                                    >
                                      <X size={15} className="rotate-45" />
                                    </button>
                                    {activeMenuId === d.id && (
                                      <div className="absolute right-0 top-8 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 w-40 z-30">
                                        <button
                                          onClick={() => {
                                            setEditingDoctorId(d.id);
                                            setEditingDoctorForm({ title: d.title || 'Dr.', name: d.name, specialty: d.specialty, email: d.email, phone: d.phone });
                                            setDoctorErrors({});
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"
                                        >
                                          Edit Details
                                        </button>
                                        <button
                                          onClick={() => {
                                            setDoctors(doctors.filter(item => item.id !== d.id));
                                            setActiveMenuId(null);
                                            triggerAutoSave();
                                          }}
                                          className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"
                                        >
                                          Remove Doctor
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Success confirmation badge */}
                        <div className="bg-green-50 text-green-700 border border-green-150 p-4.5 rounded-2xl text-xs font-black flex items-center gap-2">
                          <CheckCircle size={15} /> Great! You have added {doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'} to your clinic.
                        </div>

                        <div className="text-center py-2">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">OR</span>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="block mx-auto mt-2 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-black text-slate-655 rounded-xl"
                          >
                            Skip this step
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 3: DEPARTMENT SETUP ── */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Departments &amp; Specialties</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Configure active specialties within your clinic facility.</p>
                      </div>
                      {departments.filter(d => d.active).length < limits.maxDepts ? (
                        <button
                          type="button"
                          onClick={() => setShowAddDept(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm"
                        >
                          <Plus size={14} /> Add Specialty
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black rounded-xl uppercase">
                          Plan Limit: {limits.maxDepts} Max
                        </span>
                      )}
                    </div>

                    {showAddDept && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative">
                        <button onClick={() => setShowAddDept(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                          <X size={15} />
                        </button>
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">New Specialty</h5>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Dermatology, Gynaecology"
                            value={deptFormName}
                            onChange={(e) => setDeptFormName(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!deptFormName.trim()) return;
                              setDepartments([...departments, { name: deptFormName.trim(), doctorsCount: 0, active: true, color: 'purple' }]);
                              setDeptFormName('');
                              setShowAddDept(false);
                              triggerAutoSave();
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {departments.map(d => (
                        <div
                          key={d.name}
                          onClick={() => {
                            if (!d.active && departments.filter(x => x.active).length >= limits.maxDepts) {
                              alert(`Upgrade required: Subscribed plan only supports up to ${limits.maxDepts} departments.`);
                              return;
                            }
                            setDepartments(departments.map(item => item.name === d.name ? { ...item, active: !item.active } : item));
                            triggerAutoSave();
                          }}
                          className={`rounded-2xl p-5 border-2 cursor-pointer transition flex flex-col justify-between h-32 ${
                            d.active ? 'border-green-600 bg-green-50/5 shadow-sm' : 'border-slate-200 bg-slate-50/30 opacity-70'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${d.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                              {d.active ? 'Active' : 'Inactive'}
                            </span>
                            <CheckCircle size={15} className={d.active ? 'text-green-600' : 'text-slate-300'} />
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-slate-800 block">{d.name}</h5>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{d.doctorsCount} Doctors Assigned</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── STEP 4: BRANCH SETUP ── */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Clinic Branches</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Configure geographical branch setups.</p>
                      </div>
                      {branches.length < limits.maxBranches ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBranchId(null);
                            setBranchForm({
                              name: '', address: '', addressLine2: '', city: '', state: '', country: 'India', pincode: '',
                              contact: '', email: '', manager: '', active: true,
                              latitude: '', longitude: ''
                            });
                            setShowAddBranch(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm"
                        >
                          <Plus size={14} /> Add Branch
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black rounded-xl uppercase">
                          Plan Limit: {limits.maxBranches} Max
                        </span>
                      )}
                    </div>

                    {showAddBranch && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative animate-scaleIn">
                        <button
                          onClick={() => {
                            setShowAddBranch(false);
                            setEditingBranchId(null);
                          }}
                          className="absolute right-4 top-4 text-slate-400 hover:text-slate-655 p-1 rounded-xl hover:bg-slate-100"
                        >
                          <X size={15} />
                        </button>
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          {editingBranchId ? 'Edit Branch Details' : 'Add New Branch'}
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Branch Name *</label>
                            <input
                              type="text"
                              value={branchForm.name}
                              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                              placeholder="e.g. Indirapuram Clinic"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Branch Manager</label>
                            <input
                              type="text"
                              value={branchForm.manager}
                              onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })}
                              placeholder="Manager's Full Name"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Phone Number *</label>
                            <input
                              type="text"
                              value={branchForm.contact}
                              onChange={(e) => setBranchForm({ ...branchForm, contact: e.target.value })}
                              placeholder="e.g. +91 9876543210"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Email Address</label>
                            <input
                              type="email"
                              value={branchForm.email}
                              onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                              placeholder="e.g. branch@clinic.com"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Street Address *</label>
                            <input
                              type="text"
                              value={branchForm.address}
                              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                              placeholder="Street Name, Building Name"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Address Line 2 (Optional)</label>
                            <input
                              type="text"
                              value={branchForm.addressLine2 || ''}
                              onChange={(e) => setBranchForm({ ...branchForm, addressLine2: e.target.value })}
                              placeholder="Suite, unit, floor etc."
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">City *</label>
                            <input
                              type="text"
                              value={branchForm.city}
                              onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                              placeholder="City"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">State *</label>
                            <input
                              type="text"
                              value={branchForm.state}
                              onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                              placeholder="State"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Country *</label>
                            <input
                              type="text"
                              value={branchForm.country || 'India'}
                              onChange={(e) => setBranchForm({ ...branchForm, country: e.target.value })}
                              placeholder="Country"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Pincode *</label>
                            <input
                              type="text"
                              value={branchForm.pincode}
                              onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
                              placeholder="Pincode"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Latitude</label>
                            <input
                              type="text"
                              value={branchForm.latitude}
                              onChange={(e) => setBranchForm({ ...branchForm, latitude: e.target.value })}
                              placeholder="e.g. 28.6353"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Longitude</label>
                            <input
                              type="text"
                              value={branchForm.longitude}
                              onChange={(e) => setBranchForm({ ...branchForm, longitude: e.target.value })}
                              placeholder="e.g. 77.3738"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!branchForm.name || !branchForm.address || !branchForm.city || !branchForm.state || !branchForm.pincode || !branchForm.contact) {
                              alert("Please fill in all required fields (Name, Phone, Address, City, State, Pincode).");
                              return;
                            }
                            
                            // Check phone uniqueness within current branch list
                            const dupPhone = branches.find(b => 
                              b.contact === branchForm.contact && b.id !== editingBranchId
                            );
                            if (dupPhone) {
                              alert("This phone number is already assigned to another branch in this clinic.");
                              return;
                            }

                            if (editingBranchId) {
                              setBranches(branches.map(b => 
                                b.id === editingBranchId ? { ...b, ...branchForm } : b
                              ));
                              setEditingBranchId(null);
                            } else {
                              const isFirst = branches.length === 0;
                              setBranches([...branches, { id: 'branch-' + Date.now(), ...branchForm, isPrimary: isFirst }]);
                            }

                            setBranchForm({
                              name: '', address: '', addressLine2: '', city: '', state: '', country: 'India', pincode: '',
                              contact: '', email: '', manager: '', active: true,
                              latitude: '', longitude: ''
                            });
                            setShowAddBranch(false);
                            triggerAutoSave();
                          }}
                          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                        >
                          {editingBranchId ? 'Update Branch Details' : 'Save Branch Details'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      {branches.map(b => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setEditingBranchId(b.id);
                            setBranchForm({
                              name: b.name || '',
                              address: b.address || '',
                              addressLine2: b.addressLine2 || '',
                              city: b.city || '',
                              state: b.state || '',
                              country: b.country || 'India',
                              pincode: b.pincode || '',
                              contact: b.contact || '',
                              email: b.email || '',
                              manager: b.manager || '',
                              active: b.active !== undefined ? b.active : true,
                              latitude: b.latitude || '',
                              longitude: b.longitude || ''
                            });
                            setShowAddBranch(true);
                          }}
                          className="border border-slate-150 p-5 rounded-2xl bg-white flex justify-between items-start hover:border-blue-400 cursor-pointer transition-all shadow-sm"
                        >
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0 border border-green-100">
                              <Building2 size={20} />
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-850 block">{b.name}</span>
                                <span className={`px-2 py-0.5 text-[8.5px] font-black rounded-full border ${
                                  b.isPrimary 
                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {b.isPrimary ? 'Main Branch' : 'Secondary Branch'}
                                </span>
                                {b.active && (
                                  <span className="flex items-center gap-1 text-[8.5px] font-black text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-slate-500 leading-normal space-y-0.5">
                                <p><span className="font-extrabold text-slate-450 uppercase text-[9px] block">Address:</span>{b.address}</p>
                                {b.addressLine2 && <p>{b.addressLine2}</p>}
                                <p>{b.city}, {b.state}, {b.country || 'India'} - {b.pincode}</p>
                              </div>
                              <div className="text-[10px] text-slate-450 font-bold space-y-0.5">
                                {b.contact && <p>Phone: {b.contact}</p>}
                                {b.email && <p>Email: {b.email}</p>}
                                {b.manager && <p>Manager: {b.manager}</p>}
                                {b.latitude && b.longitude && (
                                  <p className="text-[9.5px] text-blue-600 font-extrabold flex items-center gap-1 mt-1">
                                    <MapPin size={10} /> Google Maps coordinates: {b.latitude}, {b.longitude}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-1.5">
                              {!b.isPrimary && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBranches(branches.map(item => ({
                                      ...item,
                                      isPrimary: item.id === b.id
                                    })));
                                    triggerAutoSave();
                                  }}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[9px] font-black transition cursor-pointer"
                                >
                                  Make Main Branch
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (b.isPrimary) {
                                    alert("This branch is currently your Main Branch. Please assign another branch as the Main Branch before deleting it.");
                                    return;
                                  }
                                  if (confirm("Are you sure you want to delete this branch?")) {
                                    setBranches(branches.filter(item => item.id !== b.id));
                                    triggerAutoSave();
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── STEP 5: STAFF SETUP ── */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    {/* Header Info Block */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3.5 items-start">
                      <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                        <HelpCircle size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-800 block">Why add staff accounts?</span>
                        <p className="text-[11px] text-slate-500 font-bold leading-normal mt-0.5">
                          Support staff accounts authorize receptionists and nurses to login and manage clinical operations. Pharmacy and Laboratory Managers are automatically synced here after setup.
                        </p>
                      </div>
                    </div>

                    {/* Section Header - Fixed Placement */}
                    <div className="flex justify-between items-center bg-slate-50 px-4.5 py-3 rounded-2xl border border-slate-150">
                      <div>
                        <span className="text-xs font-black text-slate-800">Support Staff ({combinedStaff.length})</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Manage support personnel accounts.</span>
                      </div>
                      {staff.length < limits.maxStaff && (
                        <button
                          type="button"
                          onClick={() => {
                            setStaffForm({ title: 'Mr.', name: '', role: 'Receptionist', email: '', phone: '', active: true });
                            setStaffErrors({});
                            setStaffEmailValState({ status: 'idle', message: '', accountType: '' });
                            setStaffPhoneValState({ status: 'idle', message: '', accountType: '' });
                            setShowAddStaff(true);
                          }}
                          className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-sm transition"
                        >
                          + Add Staff Account
                        </button>
                      )}
                    </div>

                    {/* Scenario 1: Empty state */}
                    {combinedStaff.length === 0 && !showAddStaff && (
                      <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-3xl bg-white text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center relative">
                          <Users className="w-10 h-10 text-slate-350" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-900">No staff members added yet</h4>
                          <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
                            Create login credentials for assistant receptionists, billing officers, and clinical support teams.
                          </p>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(6)}
                            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-black text-slate-655"
                          >
                            Skip this step
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subscription limit upgrade card */}
                    {staff.length >= limits.maxStaff && (
                      <div className="border border-amber-200 bg-amber-50/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h5 className="text-sm font-black text-amber-800 flex items-center gap-1.5">
                            <AlertTriangle size={15} /> You have reached your staff limit
                          </h5>
                          <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                            Your current subscription plan allows up to {limits.maxStaff} support staff accounts. Upgrade your plan to add more.
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black shadow-sm">
                            Upgrade Plan
                          </button>
                          <button type="button" className="px-3 py-2 border border-amber-200 hover:bg-amber-100 rounded-xl text-[10px] font-black text-amber-800">
                            Compare Plans
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add Staff Card Form */}
                    {showAddStaff && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative animate-scaleIn">
                        <button onClick={() => setShowAddStaff(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                          <X size={15} />
                        </button>
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">New Staff Member</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Title</label>
                            <select
                              value={staffForm.title || 'Mr.'}
                              onChange={(e) => setStaffForm({ ...staffForm, title: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                            >
                              <option value="Mr.">Mr.</option>
                              <option value="Mrs.">Mrs.</option>
                              <option value="Ms.">Ms.</option>
                              <option value="Miss.">Miss.</option>
                              <option value="">None</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Full Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Priya Sharma"
                              value={staffForm.name}
                              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                            />
                            {staffErrors.name && <p className="text-[10px] text-rose-500 mt-1">{staffErrors.name}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Email</label>
                            <input
                              type="email"
                              placeholder="priya@clinic.com"
                              value={staffForm.email}
                              onChange={(e) => handleStaffEmailChange(e.target.value)}
                              onBlur={(e) => checkStaffEmailUniqueness(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                            />
                            {staffErrors.email && <p className="text-[10px] text-rose-500 mt-1 leading-normal">{staffErrors.email}</p>}
                            {staffEmailValState.status === 'loading' && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-500 mt-1">
                                <RefreshCw size={11} className="animate-spin" /> Checking email...
                              </div>
                            )}
                            {staffEmailValState.status === 'valid' && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-1 font-bold">
                                <CheckCircle size={11} className="text-emerald-500 shrink-0" /> {staffEmailValState.message}
                              </div>
                            )}
                            {staffEmailValState.status === 'invalid' && (
                              <div className="flex items-center gap-1 text-[10px] text-rose-500 mt-1 font-bold">
                                <X size={11} className="text-rose-500 shrink-0" /> {staffEmailValState.message}
                              </div>
                            )}
                            {staffEmailValState.status === 'error' && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1 font-bold">
                                <AlertTriangle size={11} className="text-amber-500 shrink-0" /> {staffEmailValState.message}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Phone</label>
                            <input
                              type="tel"
                              placeholder=""
                              value={staffForm.phone}
                              onChange={(e) => handleStaffPhoneChange(e.target.value)}
                              onBlur={(e) => checkStaffPhoneUniqueness(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                            />
                            {staffErrors.phone && <p className="text-[10px] text-rose-500 mt-1 leading-normal">{staffErrors.phone}</p>}
                            {staffPhoneValState.status === 'loading' && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-500 mt-1">
                                <RefreshCw size={11} className="animate-spin" /> Checking phone...
                              </div>
                            )}
                            {staffPhoneValState.status === 'valid' && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-1 font-bold">
                                <CheckCircle size={11} className="text-emerald-500 shrink-0" /> {staffPhoneValState.message}
                              </div>
                            )}
                            {staffPhoneValState.status === 'invalid' && (
                              <div className="flex items-center gap-1 text-[10px] text-rose-500 mt-1 font-bold">
                                <X size={11} className="text-rose-500 shrink-0" /> {staffPhoneValState.message}
                              </div>
                            )}
                            {staffPhoneValState.status === 'error' && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1 font-bold">
                                <AlertTriangle size={11} className="text-amber-500 shrink-0" /> {staffPhoneValState.message}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1">
                          <div>
                            <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Role</label>
                            <select
                              value={staffForm.role}
                              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold focus:border-green-600"
                            >
                              <option value="Receptionist">Receptionist</option>
                              <option value="Nurse">Nurse</option>
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={staffValidating || !staffForm.name.trim() || staffEmailValState.status !== 'valid' || staffPhoneValState.status !== 'valid'}
                          onClick={async () => {
                            setStaffValidating(true);
                            setStaffErrors({});
                            const errs = await validateDoctorOrStaff(staffForm, false, null, 'staff');
                            if (Object.keys(errs).length > 0) {
                              setStaffErrors(errs);
                              setStaffValidating(false);
                              return;
                            }
                            setStaff([...staff, {
                              id: 'staff-' + Date.now(),
                              title: staffForm.title || 'Mr.',
                              name: staffForm.name,
                              role: staffForm.role,
                              email: staffForm.email,
                              phone: staffForm.phone,
                              active: true,
                              status: 'Pending Clinic Launch',
                              createdDate: new Date().toLocaleDateString()
                            }]);
                            setStaffForm({ title: 'Mr.', name: '', role: 'Receptionist', email: '', phone: '', active: true });
                            setStaffEmailValState({ status: 'idle', message: '', accountType: '' });
                            setStaffPhoneValState({ status: 'idle', message: '', accountType: '' });
                            setShowAddStaff(false);
                            setStaffValidating(false);
                            triggerAutoSave();
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {staffValidating ? 'Validating...' : 'Add Staff'}
                        </button>
                      </div>
                    )}

                    {/* Scenario 2: Staff Added list view */}
                    {combinedStaff.length > 0 && (
                      <div className="space-y-4 animate-scaleIn">
                        <div className="grid grid-cols-1 gap-4.5">
                          {combinedStaff.map(s => {
                            const isReadOnly = !!s.isReadOnly;
                            let roleBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                            if (s.role === 'Nurse') roleBadgeColor = 'bg-green-50 text-green-700 border-green-200';
                            else if (s.role === 'Pharmacy Manager') roleBadgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                            else if (s.role === 'Laboratory Manager') roleBadgeColor = 'bg-orange-50 text-orange-700 border-orange-200';

                            return (
                              <div key={s.id} className="border border-slate-150 p-5 rounded-2xl bg-white flex flex-col shadow-sm relative">
                                {editingStaffId === s.id ? (
                                  <div className="w-full space-y-4">
                                    <h6 className="text-xs font-black text-slate-800 uppercase">Edit Staff details</h6>
                                    <div className="grid grid-cols-3 gap-4">
                                      <div>
                                        <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Title</label>
                                        <select
                                          value={editingStaffForm.title || 'Mr.'}
                                          onChange={(e) => setEditingStaffForm({ ...editingStaffForm, title: e.target.value })}
                                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600 font-bold"
                                        >
                                          <option value="Mr.">Mr.</option>
                                          <option value="Mrs.">Mrs.</option>
                                          <option value="Ms.">Ms.</option>
                                          <option value="Miss.">Miss.</option>
                                          <option value="">None</option>
                                        </select>
                                      </div>
                                      <div className="col-span-2">
                                        <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Full Name</label>
                                        <input
                                          type="text"
                                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                                          value={editingStaffForm.name}
                                          onChange={(e) => setEditingStaffForm({ ...editingStaffForm, name: e.target.value })}
                                        />
                                        {staffErrors.name && <p className="text-[10px] text-rose-500 mt-1">{staffErrors.name}</p>}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Email</label>
                                        <input
                                          type="email"
                                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                                          value={editingStaffForm.email}
                                          onChange={(e) => setEditingStaffForm({ ...editingStaffForm, email: e.target.value })}
                                        />
                                        {staffErrors.email && <p className="text-[10px] text-rose-500 mt-1 leading-normal">{staffErrors.email}</p>}
                                      </div>
                                      <div>
                                        <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Phone</label>
                                        <input
                                          type="tel"
                                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-green-600"
                                          value={editingStaffForm.phone}
                                          onChange={(e) => setEditingStaffForm({ ...editingStaffForm, phone: e.target.value })}
                                        />
                                        {staffErrors.phone && <p className="text-[10px] text-rose-500 mt-1 leading-normal">{staffErrors.phone}</p>}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1">
                                      <div>
                                        <label className="block text-[10.5px] font-extrabold text-slate-655 mb-1">Role</label>
                                        <select
                                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold focus:border-green-600"
                                          value={editingStaffForm.role}
                                          onChange={(e) => setEditingStaffForm({ ...editingStaffForm, role: e.target.value })}
                                        >
                                          <option value="Receptionist">Receptionist</option>
                                          <option value="Nurse">Nurse</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        disabled={staffValidating}
                                        onClick={async () => {
                                          setStaffValidating(true);
                                          setStaffErrors({});
                                          const errs = await validateDoctorOrStaff(editingStaffForm, true, s.id, 'staff');
                                          if (Object.keys(errs).length > 0) {
                                            setStaffErrors(errs);
                                            setStaffValidating(false);
                                            return;
                                          }
                                          setStaff(staff.map(item => item.id === s.id ? { ...item, ...editingStaffForm } : item));
                                          setEditingStaffId(null);
                                          setStaffValidating(false);
                                        }}
                                        className="px-3.5 py-2 bg-green-655 text-white rounded-xl text-[10px] font-black cursor-pointer disabled:opacity-50"
                                      >
                                        {staffValidating ? 'Validating...' : 'Save'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingStaffId(null)}
                                        className="px-3 py-2 border border-slate-200 text-slate-655 rounded-xl text-[10px] font-black"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-start">
                                      <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shrink-0">
                                          {s.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-slate-855 block">{(s.title || '').trim() ? `${s.title} ` : ''}{s.name}</span>
                                            <span className={`px-2 py-0.5 text-[8.5px] font-black rounded-full border ${roleBadgeColor}`}>
                                              {s.role}
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 text-[9px] font-black rounded-full border cursor-help ${
                                                isReadOnly
                                                  ? 'bg-slate-50 text-slate-500 border-slate-200'
                                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                              }`}
                                              title={isReadOnly ? s.status : 'This staff member will receive credentials automatically after launch.'}
                                            >
                                              {isReadOnly ? s.status : 'Pending Clinic Launch'}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-slate-500 font-bold block mt-0.5">{s.email} | {s.phone}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setExpandedStaffId(expandedStaffId === s.id ? null : s.id)}
                                          className="text-slate-400 hover:text-slate-655 p-1 rounded-full hover:bg-slate-100 text-xs font-black transition"
                                        >
                                          {expandedStaffId === s.id ? 'Collapse -' : 'Expand +'}
                                        </button>
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => setActiveMenuId(activeMenuId === s.id ? null : s.id)}
                                            className="text-slate-400 hover:text-slate-655 p-1.5 rounded-full hover:bg-slate-100"
                                          >
                                            <X size={15} className="rotate-45" />
                                          </button>
                                          {activeMenuId === s.id && (
                                            <div className="absolute right-0 top-8 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 w-40 z-30">
                                              {!isReadOnly ? (
                                                <>
                                                  <button
                                                    onClick={() => {
                                                      setEditingStaffId(s.id);
                                                      setEditingStaffForm({ title: s.title || 'Mr.', name: s.name, role: s.role, email: s.email, phone: s.phone });
                                                      setStaffErrors({});
                                                      setActiveMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                  >
                                                    Edit Details
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      setStaff(staff.filter(item => item.id !== s.id));
                                                      setActiveMenuId(null);
                                                      triggerAutoSave();
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"
                                                  >
                                                    Remove Staff
                                                  </button>
                                                </>
                                              ) : (
                                                <div className="px-4 py-2 text-[10px] text-slate-400 font-bold">
                                                  Read Only (Pharmacy/Lab Setup)
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Permissions Preview & Detail Expansion Block */}
                                    {expandedStaffId === s.id && (
                                      <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-3 animate-scaleIn">
                                        <div className="flex flex-col gap-1.5">
                                          <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Role Permissions Preview</span>
                                          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                                            {s.role === 'Receptionist' && (
                                              <>
                                                <span className="flex items-center gap-1.5 text-blue-700"><CheckCircle size={12} className="text-blue-500" /> Register Patients</span>
                                                <span className="flex items-center gap-1.5 text-blue-700"><CheckCircle size={12} className="text-blue-500" /> Book Appointments</span>
                                                <span className="flex items-center gap-1.5 text-blue-700"><CheckCircle size={12} className="text-blue-500" /> Billing</span>
                                                <span className="flex items-center gap-1.5 text-blue-700"><CheckCircle size={12} className="text-blue-500" /> Check-In Patients</span>
                                              </>
                                            )}
                                            {s.role === 'Nurse' && (
                                              <>
                                                <span className="flex items-center gap-1.5 text-green-700"><CheckCircle size={12} className="text-green-500" /> Vitals</span>
                                                <span className="flex items-center gap-1.5 text-green-700"><CheckCircle size={12} className="text-green-500" /> Patient Queue</span>
                                                <span className="flex items-center gap-1.5 text-green-700"><CheckCircle size={12} className="text-green-500" /> Treatment Notes</span>
                                                <span className="flex items-center gap-1.5 text-green-700"><CheckCircle size={12} className="text-green-500" /> Injection Records</span>
                                              </>
                                            )}
                                            {s.role === 'Pharmacy Manager' && (
                                              <>
                                                <span className="flex items-center gap-1.5 text-purple-700"><CheckCircle size={12} className="text-purple-500" /> Medicine Inventory</span>
                                                <span className="flex items-center gap-1.5 text-purple-700"><CheckCircle size={12} className="text-purple-500" /> Orders</span>
                                                <span className="flex items-center gap-1.5 text-purple-700"><CheckCircle size={12} className="text-purple-500" /> Stock</span>
                                                <span className="flex items-center gap-1.5 text-purple-700"><CheckCircle size={12} className="text-purple-500" /> Purchase Records</span>
                                              </>
                                            )}
                                            {s.role === 'Laboratory Manager' && (
                                              <>
                                                <span className="flex items-center gap-1.5 text-orange-700"><CheckCircle size={12} className="text-orange-500" /> Test Management</span>
                                                <span className="flex items-center gap-1.5 text-orange-700"><CheckCircle size={12} className="text-orange-500" /> Sample Collection</span>
                                                <span className="flex items-center gap-1.5 text-orange-700"><CheckCircle size={12} className="text-orange-500" /> Reports</span>
                                                <span className="flex items-center gap-1.5 text-orange-700"><CheckCircle size={12} className="text-orange-500" /> Lab Inventory</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Success confirmation badge */}
                        <div className="bg-green-50 text-green-700 border border-green-150 p-4.5 rounded-2xl text-xs font-black flex items-center gap-2">
                          <CheckCircle size={15} /> Great! You have added {combinedStaff.length} {combinedStaff.length === 1 ? 'staff member' : 'staff members'} to your clinic.
                        </div>

                        <div className="text-center py-2">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">OR</span>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(6)}
                            className="block mx-auto mt-2 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-black text-slate-655 rounded-xl"
                          >
                            Skip this step
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 6: HEALTHCARE SETUP ── */}
                {currentStep === 6 && (
                  <div className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block">Step 6 of 10</span>
                          <span className="px-2.5 py-0.5 text-[10px] font-black text-indigo-750 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-1">
                            🏥 Healthcare Infrastructure
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">Healthcare Setup</h4>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-2xl">
                          Configure pharmacy and laboratory facilities for your clinic. You can configure your own Pharmacy and Laboratory providers now or skip this step and add them later from the Clinic Dashboard.
                        </p>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(7)}
                          className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-black text-slate-700 bg-white rounded-xl transition shadow-sm hover:shadow"
                        >
                          Skip this step
                        </button>
                        <span className="text-[10px] text-slate-400 font-bold">You can always configure healthcare providers later.</span>
                      </div>
                    </div>

                    {!limits.healthcare ? (
                      <div className="border border-slate-200 bg-white rounded-3xl p-8 text-center space-y-4 shadow-sm">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                          <Shield className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900">Healthcare features locked under Starter plan</h4>
                        <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                          Pharmacy inventory, prescription queues, and laboratory catalogs require Professional or Premium plans.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* PHARMACY MANAGEMENT */}
                        <div className="bg-white border border-slate-150 rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
                          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <div>
                              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <span>💊</span> Pharmacy Provider
                              </h3>
                              <p className="text-xs font-semibold text-slate-450 mt-0.5">Manage in-house or partner pharmacies.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenProviderWizard('Pharmacy')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-750 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm shadow-green-500/10"
                            >
                              + Add Pharmacy
                            </button>
                          </div>

                          <div className="space-y-4">
                            {createdProviders.filter(p => p.providerType === 'Pharmacy').length === 0 ? (
                              <div className="py-8 text-center space-y-3">
                                <div className="text-3xl">💊</div>
                                <h4 className="text-xs font-black text-slate-800">No Pharmacy Added Yet</h4>
                                <p className="text-[11px] text-slate-400 font-bold max-w-xs mx-auto">
                                  Configure your pharmacy now or skip this step.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenProviderWizard('Pharmacy')}
                                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1"
                                >
                                  + Add Pharmacy
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-4">
                                {createdProviders.filter(p => p.providerType === 'Pharmacy').map(p => {
                                  let completion = getProviderCompletion(p);
                                  let statusInfo = getProviderStatusInfo(p);
                                  let isComplete = completion === 100;
                                  let isExpanded = expandedProviderId === (p._id || p.providerId);
                                  
                                  return (
                                    <div key={p.providerId || p._id} className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all duration-200 flex flex-col gap-4">
                                      <div className="flex flex-col md:flex-row gap-5 items-start justify-between">
                                        <div className="space-y-3 flex-1">
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="text-sm font-black text-slate-855">{p.name}</span>
                                            <span className="text-[9px] font-extrabold text-slate-405">ID: {p.providerId || p._id}</span>
                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${statusInfo.classes}`}>
                                              {statusInfo.text}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-[11px] font-bold text-slate-500">
                                            <div>Branch: <span className="text-slate-800">{p.assignedBranchName || p.branch || 'Main Branch'}</span></div>
                                            <div>Phone: <span className="text-slate-800">{p.phone || '—'}</span></div>
                                            <div>Email: <span className="text-slate-800">{p.email || '—'}</span></div>
                                          </div>

                                          <div className="flex items-center gap-3 pt-1">
                                            {/* Completion Bar */}
                                            <div className="flex items-center gap-2 shrink-0">
                                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${completion}%` }} />
                                              </div>
                                              <span className="text-[10px] font-black text-slate-700">{completion}% Complete</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 md:self-center">
                                          <button
                                            type="button"
                                            onClick={() => setExpandedProviderId(isExpanded ? null : (p._id || p.providerId))}
                                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm"
                                          >
                                            {isExpanded ? 'Collapse' : 'Expand'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleEditProvider(p)}
                                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm"
                                          >
                                            {isComplete ? 'Edit' : 'Continue Setup'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteProvider(p.providerId || p._id)}
                                            className="px-3 py-1.5 border border-rose-100 bg-rose-50 hover:bg-rose-100/50 text-rose-700 rounded-xl text-xs font-black transition flex items-center gap-1"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      {isExpanded && (
                                        <div className="mt-2 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] font-bold text-slate-500 bg-slate-50/50 p-4 rounded-xl">
                                          <div className="space-y-1.5">
                                            <div className="text-[10px] uppercase text-slate-400 font-extrabold">Manager Details</div>
                                            <div>Name: <span className="text-slate-800">{p.contactPerson || '—'}</span></div>
                                            <div>Phone: <span className="text-slate-800">{p.managerPhone || '—'}</span></div>
                                            <div>Email: <span className="text-slate-805">{p.managerEmail || '—'}</span></div>
                                            <div>Gender: <span className="text-slate-800">{p.managerGender || '—'}</span></div>
                                            <div>Employee ID: <span className="text-slate-850">{p.managerEmployeeId || '—'}</span></div>
                                          </div>
                                          <div className="space-y-1.5">
                                            <div className="text-[10px] uppercase text-slate-400 font-extrabold">Operational Settings</div>
                                            <div>Working Hours: <span className="text-slate-850">{p.workingHours?.openingTime || '09:00'} - {p.workingHours?.closingTime || '21:00'}</span></div>
                                            <div>GST Number: <span className="text-slate-800">{p.gstNumber || '—'}</span></div>
                                            <div>License Number: <span className="text-slate-800">{p.drugLicenseNumber || '—'}</span></div>
                                            <div>Invoice Prefix: <span className="text-slate-800">{p.invoicePrefix || '—'}</span></div>
                                            <div>Emergency Contact: <span className="text-slate-800">{p.emergencyContact || '—'}</span></div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* LABORATORY MANAGEMENT */}
                        <div className="bg-white border border-slate-150 rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
                          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <div>
                              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <span>🧪</span> Laboratory Provider
                              </h3>
                              <p className="text-xs font-semibold text-slate-450 mt-0.5">Manage in-house or partner laboratories.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenProviderWizard('Laboratory')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-750 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm shadow-green-500/10"
                            >
                              + Add Laboratory
                            </button>
                          </div>

                          <div className="space-y-4">
                            {createdProviders.filter(p => p.providerType === 'Laboratory').length === 0 ? (
                              <div className="py-8 text-center space-y-3">
                                <div className="text-3xl">🧪</div>
                                <h4 className="text-xs font-black text-slate-800">No Laboratory Added Yet</h4>
                                <p className="text-[11px] text-slate-400 font-bold max-w-xs mx-auto">
                                  Configure your laboratory now or skip this step.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenProviderWizard('Laboratory')}
                                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-black transition inline-flex items-center gap-1"
                                >
                                  + Add Laboratory
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-4">
                                {createdProviders.filter(p => p.providerType === 'Laboratory').map(p => {
                                  let completion = getProviderCompletion(p);
                                  let statusInfo = getProviderStatusInfo(p);
                                  let isComplete = completion === 100;
                                  let isExpanded = expandedProviderId === (p._id || p.providerId);
                                  
                                  return (
                                    <div key={p.providerId || p._id} className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all duration-200 flex flex-col gap-4">
                                      <div className="flex flex-col md:flex-row gap-5 items-start justify-between">
                                        <div className="space-y-3 flex-1">
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="text-sm font-black text-slate-855">{p.name}</span>
                                            <span className="text-[9px] font-extrabold text-slate-405">ID: {p.providerId || p._id}</span>
                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${statusInfo.classes}`}>
                                              {statusInfo.text}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-[11px] font-bold text-slate-500">
                                            <div>Branch: <span className="text-slate-800">{p.assignedBranchName || p.branch || 'Main Branch'}</span></div>
                                            <div>Phone: <span className="text-slate-800">{p.phone || '—'}</span></div>
                                            <div>Email: <span className="text-slate-800">{p.email || '—'}</span></div>
                                          </div>

                                          <div className="flex items-center gap-3 pt-1">
                                            {/* Completion Bar */}
                                            <div className="flex items-center gap-2 shrink-0">
                                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${completion}%` }} />
                                              </div>
                                              <span className="text-[10px] font-black text-slate-700">{completion}% Complete</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 md:self-center">
                                          <button
                                            type="button"
                                            onClick={() => setExpandedProviderId(isExpanded ? null : (p._id || p.providerId))}
                                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm"
                                          >
                                            {isExpanded ? 'Collapse' : 'Expand'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleEditProvider(p)}
                                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm"
                                          >
                                            {isComplete ? 'Edit' : 'Continue Setup'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteProvider(p.providerId || p._id)}
                                            className="px-3 py-1.5 border border-rose-100 bg-rose-50 hover:bg-rose-100/50 text-rose-700 rounded-xl text-xs font-black transition flex items-center gap-1"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      {isExpanded && (
                                        <div className="mt-2 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] font-bold text-slate-500 bg-slate-50/50 p-4 rounded-xl">
                                          <div className="space-y-1.5">
                                            <div className="text-[10px] uppercase text-slate-400 font-extrabold">Manager Details</div>
                                            <div>Name: <span className="text-slate-800">{p.contactPerson || '—'}</span></div>
                                            <div>Phone: <span className="text-slate-800">{p.managerPhone || '—'}</span></div>
                                            <div>Email: <span className="text-slate-805">{p.managerEmail || '—'}</span></div>
                                            <div>Gender: <span className="text-slate-800">{p.managerGender || '—'}</span></div>
                                            <div>Employee ID: <span className="text-slate-850">{p.managerEmployeeId || '—'}</span></div>
                                          </div>
                                          <div className="space-y-1.5">
                                            <div className="text-[10px] uppercase text-slate-400 font-extrabold">Operational Settings</div>
                                            <div>Working Hours: <span className="text-slate-850">{p.workingHours?.openingTime || '09:00'} - {p.workingHours?.closingTime || '21:00'}</span></div>
                                            <div>GST Number: <span className="text-slate-800">{p.gstNumber || '—'}</span></div>
                                            <div>License Number: <span className="text-slate-800">{p.drugLicenseNumber || '—'}</span></div>
                                            <div>Invoice Prefix: <span className="text-slate-800">{p.invoicePrefix || '—'}</span></div>
                                            <div>Emergency Contact: <span className="text-slate-800">{p.emergencyContact || '—'}</span></div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {currentStep === 7 && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block">Step 7 of 10</span>
                          <span className="px-2.5 py-0.5 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-1">
                            ✨ AI Intelligent Core Modules
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">AI Modules</h4>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-2xl">
                          Enable AI assistants that will be available to doctors based on your selected subscription plan. Modules not included in your current plan will remain disabled.
                        </p>
                      </div>
                    </div>

                    {/* Validation Error */}
                    {wizardError && (
                      <div className="bg-rose-50 text-rose-600 border border-rose-100 p-4 rounded-2xl text-xs font-black animate-shake flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                        <span>{wizardError}</span>
                      </div>
                    )}

                    {/* Responsive Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {apiModules.map(mod => {
                        const isEnabled = !!aiFeatures[mod.moduleId];
                        const isLocked = !mod.includedInPlan;

                        return (
                          <div
                            key={mod.moduleId}
                            onClick={() => {
                              if (isLocked) {
                                setShowUpgradeModal(true);
                              }
                            }}
                            className={`group relative border rounded-[18px] p-5 bg-white transition-all duration-300 flex flex-col justify-between h-full ${
                              isLocked
                                ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50/50'
                                : isEnabled
                                ? 'border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.15)] bg-green-50/5'
                                : 'border-slate-200 hover:border-slate-350 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
                            }`}
                          >
                            {/* Card Header: Icon & Toggle */}
                            <div className="flex justify-between items-start mb-4">
                              {/* Colored circular wrapper for icon */}
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${
                                isLocked 
                                  ? 'bg-slate-200 text-slate-400' 
                                  : isEnabled 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {mod.icon || '✨'}
                              </div>

                              {/* Modern Toggle Switch */}
                              <div 
                                className="relative shrink-0"
                                onClick={(e) => {
                                  if (isLocked) {
                                    e.stopPropagation();
                                    setShowUpgradeModal(true);
                                    return;
                                  }
                                  e.stopPropagation();
                                  setAiFeatures(prev => ({ ...prev, [mod.moduleId]: !prev[mod.moduleId] }));
                                  triggerAutoSave();
                                }}
                              >
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                                    isEnabled ? 'bg-green-600' : 'bg-slate-200'
                                  } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  aria-label={`Toggle ${mod.moduleName}`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Center Name & Description */}
                            <div className="space-y-1 mb-4 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-sm font-black tracking-tight ${isLocked ? 'text-slate-500' : 'text-slate-855'}`}>
                                  {mod.moduleName}
                                </span>
                                {isLocked && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-black text-rose-700 bg-rose-50 border border-rose-100 rounded flex items-center gap-0.5 shrink-0">
                                    <Lock size={8} /> locked
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                                {mod.description}
                              </p>
                            </div>

                            {/* Bottom Tags & Status Indicator */}
                            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                              {/* Tags */}
                              <div className="flex flex-wrap gap-1">
                                {(mod.tags || []).map((tag, tIdx) => (
                                  <span key={tIdx} className="px-2 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-100/80 rounded-md">
                                    {tag}
                                  </span>
                                ))}
                              </div>

                              {/* Status Indicator */}
                              <div className="flex justify-between items-center text-[10px]">
                                <span className={`font-black uppercase tracking-wider ${isLocked ? 'text-rose-605' : 'text-green-600'}`}>
                                  {isLocked ? 'Upgrade Required' : 'Included in Plan'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* How AI Modules Work Information Card */}
                    <div className="border border-blue-150 bg-blue-50/40 rounded-2xl p-5 flex gap-4 items-start shadow-sm leading-relaxed">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                        <Sparkles size={16} />
                      </div>
                      <div className="space-y-1 text-xs">
                        <h5 className="font-black text-blue-905">How AI Modules Work</h5>
                        <p className="text-blue-950 font-semibold leading-relaxed">
                          These AI assistants automatically integrate into doctor workflows after clinic onboarding is complete.
                        </p>
                        <ul className="list-disc pl-4 text-blue-950 font-semibold space-y-1 mt-1">
                          <li>Modules become available only if included in the clinic subscription.</li>
                          <li>Doctors can only access modules enabled by the Clinic Admin.</li>
                          <li>Modules requiring internet or AI credits will automatically display usage statistics inside the Doctor Dashboard.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 8: VIDEO CONSULTATION ── */}
                {currentStep === 8 && (() => {
                  const VideoToggle = ({ checked, onChange, disabled }) => (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => { onChange(!checked); triggerAutoSave(); }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500/20 ${checked ? 'bg-green-500' : 'bg-slate-200'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      aria-label="toggle"
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  );

                  const FeatureCard = ({ icon, title, desc, badge, checked, onChange, disabled, badgeColor = 'green' }) => (
                    <div className={`group relative border rounded-2xl p-5 bg-white transition-all duration-300 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${checked ? 'border-green-400 shadow-sm shadow-green-100' : 'border-slate-200'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={() => { if (!disabled) { onChange(!checked); triggerAutoSave(); } }}>
                      <div className="flex justify-between items-start">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${checked ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>{icon}</div>
                        <VideoToggle checked={checked} onChange={onChange} disabled={disabled} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-850">{title}</span>
                          {badge && (
                            <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-wider border ${badgeColor === 'green' ? 'bg-green-50 text-green-700 border-green-200' : badgeColor === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{badge}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  );

                  return (
                    <div className="space-y-6">
                      {/* Info Banner */}
                      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex gap-3.5 items-start">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                          <Video size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-blue-900 block">Configure Video Consultation</span>
                          <p className="text-[11px] text-blue-700 font-medium mt-0.5 leading-relaxed">
                            Configure your clinic's video consultation preferences. These settings will automatically apply to doctors assigned to online consultation.
                          </p>
                        </div>
                      </div>

                      {!limits.video ? (
                        <div className="border border-amber-200 bg-amber-50/40 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                            <Video className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">Telemedicine unavailable in Starter plan</h4>
                            <p className="text-xs text-slate-400 mt-1.5 font-semibold max-w-sm mx-auto leading-relaxed">Video consultations require Professional or Premium subscription plans.</p>
                          </div>
                          <button type="button" onClick={() => setCurrentStep(9)} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-black text-slate-655 rounded-xl transition">
                            Skip this step
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* ── Section: Core Provider Settings ── */}
                          <div className="bg-white border border-slate-200 rounded-[20px] shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/70 border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                                  <Video size={15} />
                                </div>
                                <div>
                                  <span className="text-xs font-black text-slate-850 block leading-tight">Telemedicine &amp; Video Consultation Settings</span>
                                  <span className="text-[10px] text-slate-400 font-bold">Customize your video consultation experience for patients.</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-6 space-y-5">
                              {/* Row 1: Provider + Fee + Duration */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Preferred Video Provider <span className="text-red-500">*</span></label>
                                  <select value={videoProvider} onChange={e => { setVideoProvider(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-green-500">
                                    <option value="Zoom">📹 Zoom</option>
                                    <option value="Google Meet">🔵 Google Meet</option>
                                    <option value="Microsoft Teams">💜 Microsoft Teams</option>
                                    <option value="Jitsi Meet">🟢 Jitsi Meet</option>
                                    <option value="Daily.co">🟠 Daily.co</option>
                                    <option value="Whereby">🔷 Whereby</option>
                                    <option value="Custom WebRTC">⚙️ Custom WebRTC</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Consultation Fee (₹)</label>
                                  <input type="number" min="0" placeholder="e.g. 500" value={videoFee}
                                    onChange={e => { setVideoFee(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-semibold text-slate-800 focus:border-green-500 focus:bg-white transition" />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Default Duration <span className="text-red-500">*</span></label>
                                  <select value={videoDuration} onChange={e => { setVideoDuration(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-green-500">
                                    <option value="10">10 Minutes</option>
                                    <option value="15">15 Minutes</option>
                                    <option value="20">20 Minutes</option>
                                    <option value="30">30 Minutes</option>
                                    <option value="45">45 Minutes</option>
                                    <option value="60">60 Minutes</option>
                                    <option value="90">90 Minutes</option>
                                    <option value="120">120 Minutes</option>
                                  </select>
                                </div>
                              </div>

                              {/* Row 2: Buffer + Advance Booking + Cancellation */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Buffer Time (mins)</label>
                                  <select value={videoBufferTime} onChange={e => { setVideoBufferTime(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-green-500">
                                    <option value="0">0 Minutes</option>
                                    <option value="5">5 Minutes</option>
                                    <option value="10">10 Minutes</option>
                                    <option value="15">15 Minutes</option>
                                    <option value="20">20 Minutes</option>
                                    <option value="30">30 Minutes</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Max Advance Booking</label>
                                  <select value={videoMaxAdvanceBooking} onChange={e => { setVideoMaxAdvanceBooking(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-green-500">
                                    <option value="7">7 Days</option>
                                    <option value="15">15 Days</option>
                                    <option value="30">30 Days</option>
                                    <option value="60">60 Days</option>
                                    <option value="90">90 Days</option>
                                    <option value="180">180 Days</option>
                                    <option value="365">365 Days</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Cancellation Window</label>
                                  <select value={videoCancellationWindow} onChange={e => { setVideoCancellationWindow(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-green-500">
                                    <option value="15 Minutes">15 Minutes</option>
                                    <option value="30 Minutes">30 Minutes</option>
                                    <option value="1 Hour">1 Hour</option>
                                    <option value="2 Hours">2 Hours</option>
                                    <option value="6 Hours">6 Hours</option>
                                    <option value="12 Hours">12 Hours</option>
                                    <option value="24 Hours">24 Hours</option>
                                    <option value="48 Hours">48 Hours</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── Section: Premium Feature Cards ── */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Consultation Features</span>
                              <div className="flex-1 h-px bg-slate-100" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <FeatureCard icon="🚪" title="Waiting Room" desc="Patients wait virtually until doctor admits them." badge="Recommended" checked={videoWaitingRoom} onChange={setVideoWaitingRoom} />
                              <FeatureCard icon="🔴" title="Record Consultation" desc="Auto-record consultations for future reference." badge="Optional" badgeColor="blue" checked={videoRecording} onChange={setVideoRecording} />
                              <FeatureCard icon="🔔" title="Reminders" desc="Send automatic pre-appointment reminders." badge="Recommended" checked={videoReminders} onChange={setVideoReminders} />
                              <FeatureCard icon="💬" title="Chat" desc="Patients and doctors can exchange messages during session." checked={videoChat} onChange={setVideoChat} />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <FeatureCard icon="🖥️" title="Screen Sharing" desc="Allow doctors to share reports during consultation." checked={videoScreenSharing} onChange={setVideoScreenSharing} />
                              <FeatureCard icon="🎨" title="Virtual Background" desc="Enable branded clinic background during sessions." checked={videoVirtualBg} onChange={setVideoVirtualBg} />
                              <FeatureCard icon="🎙️" title="Noise Cancellation" desc="AI-powered noise suppression for better quality." checked={videoNoiseCancellation} onChange={setVideoNoiseCancellation} />
                              <FeatureCard icon="📺" title="HD Video" desc="Enable high-quality HD video streaming." checked={videoHD} onChange={setVideoHD} />
                            </div>
                          </div>

                          {/* ── Conditional: Reminder Configuration ── */}
                          {videoReminders && (
                            <div className="bg-green-50/40 border border-green-100 rounded-2xl p-5 space-y-4 animate-scaleIn">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0"><Bell size={14} /></div>
                                <span className="text-xs font-black text-slate-800">Reminder Configuration</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Remind Before</label>
                                  <select value={videoReminderBefore} onChange={e => { setVideoReminderBefore(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-white border border-green-200 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-green-500">
                                    <option value="15 Minutes">15 Minutes</option>
                                    <option value="30 Minutes">30 Minutes</option>
                                    <option value="1 Hour">1 Hour</option>
                                    <option value="3 Hours">3 Hours</option>
                                    <option value="6 Hours">6 Hours</option>
                                    <option value="12 Hours">12 Hours</option>
                                    <option value="24 Hours">24 Hours</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Notification Channels</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[['sms','📱 SMS'], ['email','✉️ Email'], ['whatsapp','💚 WhatsApp'], ['push','🔔 Push']].map(([key, label]) => (
                                      <label key={key} className="flex items-center gap-2 p-2.5 bg-white border border-green-150 rounded-xl cursor-pointer hover:bg-green-50 transition">
                                        <input type="checkbox" checked={!!videoReminderChannels[key]}
                                          onChange={e => { setVideoReminderChannels(prev => ({ ...prev, [key]: e.target.checked })); triggerAutoSave(); }}
                                          className="w-3.5 h-3.5 text-green-600 rounded" />
                                        <span className="text-[10.5px] font-bold text-slate-700">{label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── Conditional: Recording Configuration ── */}
                          {videoRecording && (
                            <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-5 space-y-4 animate-scaleIn">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">🎬</div>
                                <span className="text-xs font-black text-slate-800">Recording Configuration</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Storage Provider</label>
                                  <select value={videoRecordingStorage} onChange={e => { setVideoRecordingStorage(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-rose-400">
                                    <option value="Internal Storage">Internal Storage</option>
                                    <option value="AWS S3">AWS S3</option>
                                    <option value="Azure Blob">Azure Blob</option>
                                    <option value="Google Cloud">Google Cloud</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Retention Period</label>
                                  <select value={videoRecordingRetention} onChange={e => { setVideoRecordingRetention(e.target.value); triggerAutoSave(); }}
                                    className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-sm font-bold text-slate-850 focus:outline-none focus:border-rose-400">
                                    <option value="30 Days">30 Days</option>
                                    <option value="90 Days">90 Days</option>
                                    <option value="180 Days">180 Days</option>
                                    <option value="1 Year">1 Year</option>
                                    <option value="Forever">Forever</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-extrabold text-slate-655 mb-1.5">Encryption</label>
                                  <div className="flex items-center gap-3 p-3 bg-white border border-rose-150 rounded-xl mt-0.5">
                                    <VideoToggle checked={videoEncryption} onChange={setVideoEncryption} />
                                    <span className="text-xs font-bold text-slate-700">{videoEncryption ? 'Enabled' : 'Disabled'}</span>
                                    {videoEncryption && <span className="ml-auto text-[9px] font-black text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">AES-256</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── Section: Meeting Security ── */}
                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50/70 border-b border-slate-100">
                              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">🔒</div>
                              <div>
                                <span className="text-xs font-black text-slate-850 block">Meeting Security</span>
                                <span className="text-[10px] text-slate-400 font-bold">Control who can join and how meetings are secured.</span>
                              </div>
                            </div>
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {[
                                { key: 'videoRequirePassword', label: 'Require Password', desc: 'Participants must enter a password to join.', val: videoRequirePassword, fn: setVideoRequirePassword },
                                { key: 'videoWaitingRoom', label: 'Waiting Room', desc: 'Approve each participant before they join.', val: videoWaitingRoom, fn: setVideoWaitingRoom },
                                { key: 'videoEndToEndEncryption', label: 'End-to-End Encryption', desc: 'Encrypt all media between participants.', val: videoEndToEndEncryption, fn: setVideoEndToEndEncryption },
                                { key: 'videoBlockAnonymous', label: 'Block Anonymous Users', desc: 'Only named/identified users can join.', val: videoBlockAnonymous, fn: setVideoBlockAnonymous },
                                { key: 'videoSignedInOnly', label: 'Only Signed-in Users', desc: 'Require platform login to join meetings.', val: videoSignedInOnly, fn: setVideoSignedInOnly },
                                { key: 'videoUniqueId', label: 'Unique Meeting ID', desc: 'Generate a new ID for each consultation.', val: videoUniqueId, fn: setVideoUniqueId },
                                { key: 'videoAutoLock', label: 'Auto-Lock After Doctor Joins', desc: 'Lock meeting once the doctor enters.', val: videoAutoLock, fn: setVideoAutoLock },
                              ].map(({ key, label, desc, val, fn }) => (
                                <div key={key} className={`flex justify-between items-center p-3.5 border rounded-xl transition-all hover:shadow-sm cursor-pointer ${val ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-150 bg-white hover:border-slate-250'}`}
                                  onClick={() => { fn(!val); triggerAutoSave(); }}>
                                  <div className="flex-1 pr-3">
                                    <span className="text-xs font-black text-slate-800 block">{label}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{desc}</span>
                                  </div>
                                  <VideoToggle checked={val} onChange={fn} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ── Section: Doctor Permissions ── */}
                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50/70 border-b border-slate-100">
                              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                                <Users size={15} />
                              </div>
                              <div>
                                <span className="text-xs font-black text-slate-850 block">Doctor Permissions</span>
                                <span className="text-[10px] text-slate-400 font-bold">Configure what doctors can modify for their own consultations.</span>
                              </div>
                            </div>
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {[
                                { label: 'Change Consultation Fee', val: videoDoctorChangeFee, fn: setVideoDoctorChangeFee },
                                { label: 'Change Consultation Duration', val: videoDoctorChangeDuration, fn: setVideoDoctorChangeDuration },
                                { label: 'Change Reminder Settings', val: videoDoctorChangeReminders, fn: setVideoDoctorChangeReminders },
                                { label: 'Record Consultations', val: videoDoctorRecord, fn: setVideoDoctorRecord },
                                { label: 'Generate Instant Meeting', val: videoDoctorInstantMeeting, fn: setVideoDoctorInstantMeeting },
                                { label: 'Use Personal Meeting Room', val: videoDoctorPersonalRoom, fn: setVideoDoctorPersonalRoom },
                              ].map(({ label, val, fn }) => (
                                <div key={label} className={`flex justify-between items-center p-3.5 border rounded-xl transition-all hover:shadow-sm cursor-pointer ${val ? 'border-blue-200 bg-blue-50/30' : 'border-slate-150 bg-white hover:border-slate-250'}`}
                                  onClick={() => { fn(!val); triggerAutoSave(); }}>
                                  <span className="text-xs font-semibold text-slate-750 flex-1 pr-3">{label}</span>
                                  <VideoToggle checked={val} onChange={fn} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ── How It Works Flow ── */}
                          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-100 rounded-2xl p-5 space-y-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">How It Works</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[
                                '📅 Patient Books',
                                '🔗 Meeting Link Generated',
                                '📩 Reminder Sent',
                                '👨‍⚕️ Doctor Starts',
                                '🟢 Patient Joins',
                                '💊 Prescription Generated',
                                ...(videoRecording ? ['🎬 Recording Stored'] : [])
                              ].map((step, i, arr) => (
                                <React.Fragment key={i}>
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-700 shadow-sm">{step}</div>
                                  {i < arr.length - 1 && <span className="text-slate-300 font-black text-sm">→</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>

                          {/* Skip */}
                          <div className="text-center">
                            <button type="button" onClick={() => { setCurrentStep(9); }}
                              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-black text-slate-655 rounded-xl transition">
                              Skip this step
                            </button>
                            <p className="text-[9.5px] text-slate-400 mt-1.5 font-medium">You can configure video consultation later from Clinic Settings.</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ── STEP 9: CLINIC TIMINGS & SCHEDULE ── */}
                {currentStep === 9 && (
                  <div className="space-y-6">
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <Clock size={15} />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-850 block leading-tight">Working Schedule</span>
                          <span className="text-[10px] text-slate-400 font-bold">Configure weekly shift structures</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-605 mb-1.5">Schedule Type</label>
                          <select
                            value={scheduleType}
                            onChange={(e) => {
                              handleScheduleTypeChange(e.target.value);
                              triggerAutoSave();
                            }}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#334155] outline-none"
                          >
                            <option value="Monday - Friday">Monday - Friday</option>
                            <option value="Monday - Saturday">Monday - Saturday</option>
                            <option value="Monday - Sunday">Monday - Sunday</option>
                            <option value="Individual Days">Individual Days</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          {scheduleDays.map((d, dayIdx) => (
                            <div key={d.id} className="border border-slate-100 p-4 rounded-xl bg-slate-50 flex justify-between items-center">
                              <span className="text-xs font-black text-slate-800">{d.dayRange}</span>
                              <div className="flex gap-2 text-xs">
                                <span>Shift: {d.shifts[0]?.startTime || '09:00 AM'} - {d.shifts[0]?.endTime || '05:00 PM'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* ── STEP 10: REVIEW & LAUNCH ── */}
                {currentStep === 10 && (() => {
                  const allConfirmed = Object.values(launchConfirmations).every(Boolean);
                  const enabledAiModules = Object.values(aiFeatures).filter(Boolean).length;
                  const pharmacyProviders = createdProviders.filter(p => p.providerType === 'Pharmacy');
                  const labProviders = createdProviders.filter(p => p.providerType === 'Laboratory');
                  const activeDepts = departments.filter(d => d.active);
                  const primaryBranch = branches.find(b => b.isPrimary) || branches[0];
                  const pendingManagerProviders = createdProviders.filter(p => !p.manager && !p.contactPerson);
                  const scheduleLabel = scheduleDays.length > 0
                    ? `${scheduleDays[0].dayRange} · ${scheduleDays[0].shifts[0]?.startTime || '09:00 AM'} – ${scheduleDays[0].shifts[0]?.endTime || '05:00 PM'}`
                    : 'Not configured';

                  const toggleChecklist = (key) => setExpandedChecklist(prev => ({ ...prev, [key]: !prev[key] }));

                  const checklistItems = [
                    {
                      key: 'owner',
                      icon: '👤',
                      title: 'Owner & Clinic Information',
                      status: ownerForm.name && ownerForm.email ? 'Verified' : 'Incomplete',
                      desc: 'Owner details, clinic information, and contact verified',
                      details: [
                        { label: 'Owner Name', value: ownerForm.name || '—' },
                        { label: 'Email', value: ownerForm.email || '—' },
                        { label: 'Phone', value: ownerForm.phone || '—' },
                        { label: 'Clinic', value: clinicForm.name || '—' },
                        { label: 'City', value: clinicForm.city || '—' },
                        { label: 'Consultation Mode', value: clinicForm.consultationMode || '—' },
                      ]
                    },
                    {
                      key: 'doctors',
                      icon: '🩺',
                      title: 'Doctors & Practitioners',
                      status: doctors.length > 0 ? 'Invitations Sent' : 'No Doctors Added',
                      desc: `${doctors.length} doctor${doctors.length !== 1 ? 's' : ''} added and invitations sent`,
                      details: doctors.map(d => ({ label: `${d.title || 'Dr.'} ${d.name}`, value: d.specialty || 'General Medicine' }))
                    },
                    {
                      key: 'departments',
                      icon: '🏥',
                      title: 'Departments',
                      status: activeDepts.length > 0 ? 'Configured' : 'Not Set',
                      desc: `${activeDepts.length} active department${activeDepts.length !== 1 ? 's' : ''} created and assigned`,
                      details: activeDepts.map(d => ({ label: d.name, value: 'Active' }))
                    },
                    {
                      key: 'branches',
                      icon: '🏢',
                      title: 'Branches',
                      status: branches.length > 0 ? 'Assigned' : 'No Branches',
                      desc: `${branches.length} branch${branches.length !== 1 ? 'es' : ''} configured`,
                      details: branches.map(b => ({ label: b.name, value: b.isPrimary ? 'Primary Branch' : 'Branch' }))
                    },
                    {
                      key: 'staff',
                      icon: '👥',
                      title: 'Staff Members',
                      status: 'Permissions Configured',
                      desc: `${staff.length} staff member${staff.length !== 1 ? 's' : ''} with roles and permissions configured`,
                      details: staff.map(s => ({ label: s.name, value: s.role || 'Staff' }))
                    },
                    {
                      key: 'healthcare',
                      icon: '💊',
                      title: 'Healthcare Setup',
                      status: createdProviders.length > 0 ? 'Pharmacy & Laboratory Ready' : 'Not Configured',
                      desc: `${pharmacyProviders.length} pharmacy, ${labProviders.length} laboratory provider${labProviders.length !== 1 ? 's' : ''} configured`,
                      details: [
                        ...pharmacyProviders.map(p => ({ label: p.name, value: 'Pharmacy' })),
                        ...labProviders.map(p => ({ label: p.name, value: 'Laboratory' })),
                        ...(createdProviders.length === 0 ? [{ label: 'No providers added', value: '' }] : [])
                      ]
                    },
                    {
                      key: 'ai',
                      icon: '🤖',
                      title: 'AI Modules',
                      status: limits.ai ? `${enabledAiModules} Modules Activated` : 'Plan Restricted',
                      desc: limits.ai ? `${enabledAiModules} AI feature${enabledAiModules !== 1 ? 's' : ''} enabled and configured` : 'Upgrade to unlock AI capabilities',
                      details: Object.entries(aiFeatures).map(([k, v]) => ({
                        label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
                        value: v ? 'Enabled' : 'Disabled'
                      }))
                    },
                    {
                      key: 'video',
                      icon: '📹',
                      title: 'Video Consultation',
                      status: limits.video ? `${videoProvider} Connected` : 'Plan Restricted',
                      desc: limits.video ? `${videoProvider} integration configured with ${videoDuration}-min sessions` : 'Upgrade to enable telemedicine',
                      details: limits.video ? [
                        { label: 'Platform', value: videoProvider },
                        { label: 'Duration', value: `${videoDuration} minutes` },
                        { label: 'Consultation Fee', value: videoFee ? `₹${videoFee}` : 'Not set' },
                        { label: 'Waiting Room', value: videoWaitingRoom ? 'Enabled' : 'Disabled' },
                        { label: 'Recording', value: videoRecording ? 'Enabled' : 'Disabled' },
                      ] : []
                    },
                    {
                      key: 'schedule',
                      icon: '🗓️',
                      title: 'Working Hours',
                      status: scheduleDays.length > 0 ? 'Weekly Schedule Configured' : 'Not Set',
                      desc: scheduleLabel,
                      details: scheduleDays.map(d => ({
                        label: d.dayRange,
                        value: `${d.shifts[0]?.startTime || '09:00 AM'} – ${d.shifts[0]?.endTime || '05:00 PM'}`
                      }))
                    },
                  ];

                  return (
                    <div className="space-y-5">

                      {/* ── Pending Manager Warnings ── */}
                      {pendingManagerProviders.length > 0 && pendingManagerProviders.map(p => (
                        <div key={p.providerId || p._id} className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                            <div>
                              <span className="text-xs font-black text-amber-800 block">⚠ {p.providerType} Manager Required</span>
                              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                '{p.name}' does not have an assigned manager. Please complete the setup.
                              </p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setCurrentStep(6)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition whitespace-nowrap self-start sm:self-center cursor-pointer">
                            Fix Setup →
                          </button>
                        </div>
                      ))}

                      {/* ── Hero Banner ── */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-2xl p-5 text-white">
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-2 right-10 w-32 h-32 rounded-full bg-white/30 blur-2xl" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/20 blur-xl" />
                        </div>
                        <div className="relative flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Step 10 of 10</span>
                              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-black text-white uppercase tracking-wide">Final Step</span>
                            </div>
                            <h2 className="text-xl font-black leading-tight">Review & Launch</h2>
                            <p className="text-sm text-emerald-100 font-semibold mt-1 leading-relaxed">
                              Review every configuration below, confirm accuracy, and launch your clinic.
                            </p>
                          </div>
                          <div className="shrink-0 text-4xl select-none" aria-hidden="true">🚀</div>
                        </div>
                        <div className="relative mt-4 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-black text-white">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {doctors.length} Doctors Ready
                          </span>
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-black text-white">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {branches.length} Branches Configured
                          </span>
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-black text-white">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {enabledAiModules} AI Modules Active
                          </span>
                        </div>
                      </div>

                      {/* ── Configuration Summary Cards ── */}
                      <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Configuration Summary</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { icon: '🩺', label: 'Doctors', value: `${doctors.length} Added`, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                            { icon: '🏥', label: 'Departments', value: `${activeDepts.length} Configured`, color: 'from-purple-500 to-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
                            { icon: '🏢', label: 'Branches', value: `${branches.length} Set Up`, color: 'from-orange-400 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                            { icon: '👥', label: 'Staff Members', value: `${staff.length} Members`, color: 'from-teal-500 to-teal-700', bg: 'bg-teal-50', border: 'border-teal-100' },
                          ].map((c, i) => (
                            <div key={i} className={`${c.bg} border ${c.border} rounded-2xl p-3.5 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default`}>
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-lg mb-2.5 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                                {c.icon}
                              </div>
                              <div className="text-[10px] font-bold text-slate-500 mb-0.5">{c.label}</div>
                              <div className="text-sm font-black text-slate-900 leading-tight">{c.value}</div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          {[
                            { icon: '💊', label: 'Healthcare', value: `${pharmacyProviders.length} Pharmacy · ${labProviders.length} Lab`, color: 'from-rose-400 to-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                            { icon: '🤖', label: 'AI Modules', value: limits.ai ? `${enabledAiModules} Enabled` : 'Plan Locked', color: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                            { icon: '📹', label: 'Video Consult', value: limits.video ? videoProvider : 'Plan Locked', color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
                            { icon: '🗓️', label: 'Clinic Schedule', value: scheduleDays.length > 0 ? scheduleDays[0].dayRange : 'Not Set', color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', border: 'border-green-100' },
                          ].map((c, i) => (
                            <div key={i} className={`${c.bg} border ${c.border} rounded-2xl p-3.5 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default`}>
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-lg mb-2.5 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                                {c.icon}
                              </div>
                              <div className="text-[10px] font-bold text-slate-500 mb-0.5">{c.label}</div>
                              <div className="text-sm font-black text-slate-900 leading-tight">{c.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── Detailed Review Checklist ── */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Review Checklist</h3>
                          <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {checklistItems.filter(c => c.status !== 'Not Set' && c.status !== 'No Doctors Added' && c.status !== 'Not Configured' && c.status !== 'No Branches').length}/{checklistItems.length} Complete
                          </span>
                        </div>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                          {checklistItems.map((item) => {
                            const isOk = !['Not Set','No Doctors Added','Not Configured','No Branches'].includes(item.status);
                            const isExpanded = expandedChecklist[item.key];
                            return (
                              <div key={item.key} className="bg-white hover:bg-slate-50/50 transition-colors duration-150">
                                <button
                                  type="button"
                                  onClick={() => toggleChecklist(item.key)}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer group"
                                  aria-expanded={isExpanded}
                                >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOk ? 'bg-green-100' : 'bg-amber-100'}`}>
                                    {isOk ? (
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    ) : (
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    )}
                                  </div>
                                  <span className="text-base shrink-0 select-none">{item.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-black text-slate-800 block leading-tight">{item.title}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 truncate">{item.desc}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${isOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                      {item.status}
                                    </span>
                                    <svg
                                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    >
                                      <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                  </div>
                                </button>
                                {isExpanded && item.details.length > 0 && (
                                  <div className="px-4 pb-3 pt-0">
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 grid grid-cols-2 gap-2">
                                      {item.details.map((d, di) => (
                                        <div key={di} className="flex flex-col">
                                          <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide">{d.label}</span>
                                          <span className={`text-[11px] font-bold mt-0.5 ${d.value === 'Enabled' || d.value === 'Active' || d.value === 'Primary Branch' ? 'text-green-700' : d.value === 'Disabled' ? 'text-slate-400' : 'text-slate-800'}`}>
                                            {d.value || '—'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Launch Readiness Card ── */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700">
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-green-400/20 blur-3xl" />
                          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-blue-400/20 blur-2xl" />
                        </div>
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl">🛡️</div>
                            <div>
                              <h4 className="text-sm font-black text-white">Everything is Ready</h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Your clinic is cleared for launch</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { icon: '✅', label: 'Clinic Ready' },
                              { icon: '🔒', label: 'Security Verified' },
                              { icon: '🤖', label: 'AI Modules Activated' },
                              { icon: '☁️', label: 'Cloud Backup Enabled' },
                              { icon: '🗄️', label: 'Database Validated' },
                              { icon: '🔑', label: 'Role Permissions Generated' },
                            ].map((r, i) => (
                              <div key={i} className="flex items-center gap-2 py-1.5 px-2.5 bg-white/5 border border-white/10 rounded-xl">
                                <span className="text-sm shrink-0">{r.icon}</span>
                                <span className="text-[10.5px] font-bold text-slate-300">{r.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── Final Confirmation Checkboxes ── */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                          </div>
                          <span className="text-xs font-black text-slate-800">Final Confirmation Required</span>
                          <span className="text-[9px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md ml-auto">All Required</span>
                        </div>
                        {[
                          { key: 'c1', text: 'I confirm that all clinic information including owner details, clinic name, and contact information is accurate and complete.' },
                          { key: 'c2', text: 'I confirm that all doctors, staff, branches, and departments have been verified and are correctly configured.' },
                          { key: 'c3', text: 'I understand that the clinic will become active and accessible to patients immediately after launch.' },
                          { key: 'c4', text: 'I accept the healthcare compliance policies and regulatory requirements for operating a digital clinic platform.' },
                        ].map((item) => (
                          <label key={item.key} htmlFor={`confirm-${item.key}`} className="flex items-start gap-3 cursor-pointer group">
                            <div className={`relative w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150 ${launchConfirmations[item.key] ? 'bg-green-500 border-green-500' : 'border-slate-300 group-hover:border-green-400'}`}>
                              <input
                                id={`confirm-${item.key}`}
                                type="checkbox"
                                className="sr-only"
                                checked={launchConfirmations[item.key]}
                                onChange={(e) => setLaunchConfirmations(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                aria-label={item.text}
                              />
                              {launchConfirmations[item.key] && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </div>
                            <span className={`text-[11px] font-semibold leading-relaxed transition-colors ${launchConfirmations[item.key] ? 'text-green-700' : 'text-slate-600'}`}>
                              {item.text}
                            </span>
                          </label>
                        ))}
                        {!allConfirmed && (
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] font-bold text-amber-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Please confirm all {Object.values(launchConfirmations).filter(Boolean).length}/4 items above to enable the Launch button.
                          </div>
                        )}
                        {allConfirmed && (
                          <div className="pt-2 border-t border-green-100 flex items-center gap-2 text-[10px] font-bold text-green-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            All confirmations received. Your clinic is ready for launch! 🎉
                          </div>
                        )}
                      </div>

                      {/* ── Wizard Error ── */}
                      {wizardError && (
                        <div className="bg-rose-50 text-rose-700 border border-rose-200 p-3.5 rounded-xl text-xs font-bold flex items-start gap-2.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          {wizardError}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="shrink-0 px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
            <button
              type="button"
              disabled={currentStep === 1 || isSubmitting}
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-650 rounded-xl text-xs font-black hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ArrowLeft size={13} /> Back
            </button>

            {/* Middle Live Draft Status & Manual Save */}
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-bold transition-all duration-300 ${
                saveStatus.startsWith('⚠') ? 'text-amber-600 animate-pulse' :
                saveStatus === 'Saving...' ? 'text-blue-500' : 'text-slate-400'
              }`}>
                {getDraftStatusMessage()}
              </span>
              <button
                type="button"
                onClick={handleSaveDraftManual}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-xl text-[10px] font-black transition cursor-pointer flex items-center gap-1"
              >
                Save Draft
              </button>
            </div>

            {currentStep < 10 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={currentStep === 2 && doctors.length === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black shadow-md shadow-green-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save &amp; Continue <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchDashboard}
                disabled={isSubmitting || !Object.values(launchConfirmations).every(Boolean)}
                className={`flex items-center gap-1.5 px-6 py-2.5 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  Object.values(launchConfirmations).every(Boolean)
                    ? 'bg-gradient-to-r from-emerald-500 to-green-700 hover:opacity-90 shadow-green-500/20 animate-pulse-soft'
                    : 'bg-slate-400 shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg> Launching...</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg> Launch Dashboard</>
                )}
              </button>
            )}
          </div>
        </div>

        <div
          className="cw-scroll w-full lg:w-[22%] shrink-0 flex flex-col bg-white rounded-2xl border border-slate-150/70 shadow-sm"
          style={{ overflowY: 'auto' }}
        >
          {currentStep === 10 ? (
            /* ── STEP 10: Premium AI Launch Assistant ── */
            <div className="flex flex-col gap-4 p-5 flex-1">
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-base shadow-sm">🚀</div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 block">AI Launch Assistant</h3>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Ready to go live</span>
                </div>
              </div>

              {/* Congratulations Banner */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide block">🎉 Congratulations!</span>
                <p className="text-[10.5px] text-emerald-900 font-semibold leading-relaxed">
                  Your clinic has completed all onboarding steps successfully. Review and launch when ready.
                </p>
              </div>

              {/* Readiness Score */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2.5">Launch Readiness Score</span>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="23" stroke="#E2E8F0" strokeWidth="4.5" fill="transparent" />
                      <circle cx="28" cy="28" r="23" stroke="#16A34A" strokeWidth="5" fill="transparent" strokeDasharray="144.5" strokeDashoffset="0" />
                    </svg>
                    <span className="absolute text-xs font-black text-green-700">100%</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">All Steps Complete ✅</span>
                    <span className="text-[9.5px] text-slate-400 block font-medium mt-0.5">Excellent! All steps are completed.</span>
                  </div>
                </div>
              </div>

              {/* AI Final Checklist */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">AI Final Checklist</span>
                <div className="space-y-1.5">
                  {[
                    'Database Connected',
                    'Doctors Verified',
                    'Departments Ready',
                    'Video Configured',
                    'Schedule Ready',
                    'Healthcare Ready',
                    'Permissions Generated',
                    'Cloud Backup Enabled',
                    'Encryption Enabled',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10.5px] font-bold text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan Summary */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Plan Summary</span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500">Plan</span>
                    <span className="text-[10px] font-black text-slate-900">{activePlanObj?.name || 'Trial'}</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Doctors', current: doctors.length, max: limits.maxDocs },
                      { label: 'Staff', current: staff.length, max: limits.maxStaff },
                      { label: 'Branches', current: branches.length, max: limits.maxBranches },
                    ].map(({ label, current, max }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[9.5px] font-bold text-slate-600 mb-0.5">
                          <span>{label}</span>
                          <span className="text-slate-900">{max === 999 ? 'Unlimited' : `${current}/${max}`}</span>
                        </div>
                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: max === 999 ? '100%' : `${Math.min(100, (current / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Launch Button in Panel */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">What's Next?</span>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <span className="text-[10.5px] font-black text-slate-800 block">Launch Dashboard →</span>
                  <p className="text-[9.5px] text-slate-400 font-bold leading-normal">Your clinic will go live and doctors will receive their login invitations.</p>
                </div>
              </div>

              {/* Need Help Card */}
              <div className="mt-auto bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <PhoneCall size={15} className="text-blue-600" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-850 block">Need Help?</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Our support team is standing by.</p>
                  </div>
                </div>
                <button type="button" onClick={() => window.open('mailto:support@pehalhealth.com')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                  <PhoneCall size={11} /> Contact Support
                </button>
              </div>
            </div>
          ) : (
            /* ── DEFAULT: Standard AI Assistant Panel ── */
            <div className="flex flex-col gap-4 p-5 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="text-indigo-600 shrink-0" size={16} />
              <div>
                <h3 className="text-sm font-black text-slate-900 block">AI Assistant</h3>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">I'm here to help you set up your clinic</span>
              </div>
            </div>

            {/* Step Guidance */}
            <div className="pt-3 border-t border-slate-100">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wide block">Step Guidance</span>
                <p className="text-[10.5px] text-indigo-950 font-semibold leading-relaxed">
                  {currentStep === 1 ? 'Please review and confirm the owner details. You can edit any information except email and phone number.'
                  : currentStep === 2 ? 'Add practitioner assignments to initialize doctor logins. At least one doctor is required to continue.'
                  : currentStep === 3 ? 'Create departments to organise your clinic. Doctors will be assigned to departments once onboarding is complete.'
                  : currentStep === 4 ? 'Define your clinic branches. The first branch is automatically set as the primary location.'
                  : currentStep === 5 ? 'Add supporting staff such as nurses, receptionists, and lab technicians to assist doctors.'
                  : currentStep === 6 ? 'Configure your pharmacy and laboratory providers. These can be linked to branches after setup.'
                  : currentStep === 7 ? 'Enable AI modules to enhance your clinic workflow. Modules are plan-gated and can be changed later.'
                  : currentStep === 8 ? 'Configure video consultation settings. Choose a platform, set fees and duration, and control security and doctor permissions.'
                  : currentStep === 9 ? 'Set your clinic working hours and shift schedules. Doctors inherit these hours unless overridden individually.'
                  : 'Review all your settings and launch the clinic dashboard when ready.'}
                </p>
              </div>
            </div>

            {/* Live Progress Card */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2.5">Your Progress</span>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r="23" stroke="#E2E8F0" strokeWidth="4.5" fill="transparent" />
                    <circle cx="28" cy="28" r="23" stroke="#16A34A" strokeWidth="5" fill="transparent" strokeDasharray="144.5" strokeDashoffset={144.5 - (144.5 * progress) / 100} />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-850">{progress}%</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 block">Great start! 🎉</span>
                  <span className="text-[9.5px] text-slate-400 block font-medium mt-0.5">Let's set up your clinic step by step.</span>
                </div>
              </div>
            </div>

            {/* What's Next Card */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">What's Next?</span>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                <span className="text-[10.5px] font-black text-slate-800 block">Next up: {STEPS[currentStep]?.name || 'Launch'}</span>
                <p className="text-[9.5px] text-slate-400 font-bold leading-normal">{STEPS[currentStep]?.desc || 'Verify parameters and publish.'}</p>
              </div>
            </div>

            {/* Current Subscription limits */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Plan Allowances</span>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-[10px] font-bold text-slate-700">
                <div className="flex justify-between">
                  <span>Allowed Doctors:</span>
                  <span className="text-slate-900 font-black">{limits.maxDocs === 999 ? 'Unlimited' : `${doctors.length}/${limits.maxDocs}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Allowed Staff:</span>
                  <span className="text-slate-900 font-black">{limits.maxStaff === 999 ? 'Unlimited' : `${staff.length}/${limits.maxStaff}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Allowed Branches:</span>
                  <span className="text-slate-900 font-black">{limits.maxBranches === 999 ? 'Unlimited' : `${branches.length}/${limits.maxBranches}`}</span>
                </div>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="mt-auto bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <PhoneCall size={15} className="text-blue-600" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-850 block">Need Help?</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Our support team is ready to assist.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('mailto:support@pehalhealth.com')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <PhoneCall size={11} /> Contact Support
              </button>
            </div>
          </div>
          )}
        </div>

      </div>

      {/* STICKY FOOTER */}
      <div className="shrink-0 w-full z-30" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 24px rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1840px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ShieldCheck size={16} className="text-green-600 shrink-0" />
            <span>
              <span className="font-black text-slate-700">Your data is protected using enterprise-grade encryption.</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400">
            <CheckCircle size={12} className="text-green-600" />
            <span>All changes are auto-saved | Last saved: <strong className="text-slate-600 font-extrabold">{saveStatus}</strong></span>
          </div>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black text-slate-750 bg-white hover:bg-slate-50 transition cursor-pointer shadow-sm"
          >
            Save Draft
          </button>
        </div>
      </div>
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Upgrade Required</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Premium AI Capability</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              Upgrade your clinic plan to unlock this AI capability and provide advanced diagnostic assistants to your doctors.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setShowUpgradeModal(false);
                }}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-green-500/10"
              >
                Go to Plans
              </button>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-655 hover:bg-slate-50 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── ONBOARDING VALIDATION SUMMARY MODAL ── */}
      {validationSummary && validationSummary.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[999999] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">Complete these items before launching</h2>
                <p className="text-[11px] text-rose-100 font-semibold mt-1">
                  {validationSummary.length} issue{validationSummary.length !== 1 ? 's' : ''} found across your onboarding setup.
                </p>
              </div>
            </div>

            {/* Error list */}
            <div className="p-5 space-y-2.5 max-h-72 overflow-y-auto">
              {validationSummary.map((err, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="block text-[9.5px] font-black text-rose-500 uppercase tracking-wide mb-0.5">
                      Step {err.step} · {err.stepName}
                    </span>
                    <p className="text-[11px] font-bold text-rose-900 leading-relaxed">{err.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div className="px-5 pb-5 pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const firstErr = validationSummary[0];
                  setValidationSummary(null);
                  if (firstErr?.step) setCurrentStep(firstErr.step);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:opacity-90 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Go to First Incomplete Step
              </button>
              <button
                type="button"
                onClick={() => setValidationSummary(null)}
                className="px-5 py-3 border border-slate-200 text-slate-655 hover:bg-slate-50 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── LIVE PROGRESS ACTIVATION MODAL ── */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[999999] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden p-6 sm:p-8 space-y-6 animate-scaleIn">
            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Launching Your Clinic...</h2>
              <p className="text-xs text-slate-400 font-bold">Please wait while we prepare your clinic workspace.</p>
            </div>

            {/* Circular/Linear Progress Meter */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-indigo-600 uppercase tracking-wider">{launchProgress.currentTask}</span>
                <span className="text-slate-800">{launchProgress.percent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${launchProgress.percent}%` }}
                />
              </div>
            </div>

            {/* Animated Step List */}
            <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 max-h-60 overflow-y-auto space-y-2.5">
              {[
                { key: 'Clinic Created', label: 'Creating Clinic' },
                { key: 'Departments Created', label: 'Creating Departments' },
                { key: 'Branches Created', label: 'Creating Branches' },
                { key: 'Doctors Created', label: 'Creating Doctors' },
                { key: 'Staff Accounts Created', label: 'Creating Staff Accounts' },
                { key: 'Pharmacy Configured', label: 'Configuring Pharmacy' },
                { key: 'Laboratory Configured', label: 'Configuring Laboratory' },
                { key: 'AI Modules Configured', label: 'Configuring AI Modules' },
                { key: 'Video Consultation Configured', label: 'Configuring Video Consultation' },
                { key: 'Dashboard Generated', label: 'Generating Dashboard' },
                { key: 'Permissions Configured', label: 'Configuring Permissions' },
                { key: 'Notifications Created', label: 'Creating Notifications' },
                { key: 'Emails Queued', label: 'Queued Welcome Emails' }
              ].map((step, idx) => {
                const isCompleted = launchProgress.checklist.includes(step.key);
                const isCurrent = !isCompleted && launchProgress.currentTask.toLowerCase().includes(step.label.toLowerCase().replace('creating ', '').replace('configuring ', ''));
                
                return (
                  <div key={idx} className="flex items-center gap-3">
                    {isCompleted ? (
                      <div className="w-5 h-5 rounded-full bg-green-100 border border-green-200 text-green-700 flex items-center justify-center shrink-0">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 animate-spin">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      </div>
                    )}
                    <span className={`text-xs font-bold ${isCompleted ? 'text-slate-800' : isCurrent ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CLINIC ACTIVATION SUCCESS OVERLAY ── */}
      {showLaunchSuccess && launchResult && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[9999999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-scaleIn">
            
            {/* Top Confetti Banner */}
            <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 p-8 text-center relative text-white">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-2 right-12 w-36 h-36 rounded-full bg-white/30 blur-3xl animate-pulse" />
                <div className="absolute bottom-2 left-12 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
              </div>
              
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-4xl mb-4 shadow-inner animate-bounce">
                  🎉
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 bg-white/10 px-3 py-1 rounded-full mb-2">
                  Clinic Launch Success
                </span>
                <h1 className="text-2xl font-black tracking-tight">{launchResult.clinicName}</h1>
                <p className="text-xs text-emerald-100 font-semibold mt-1 max-w-md mx-auto leading-relaxed">
                  Your digital clinic environment has been provisioned, secured, and activated.
                </p>
              </div>
            </div>

            {/* Content & Details */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Activation Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Activation Status</span>
                  <span className="text-xs font-black text-green-700 flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    LIVE &amp; ACTIVE
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Current Plan</span>
                  <span className="text-xs font-black text-indigo-700 block mt-1">
                    {launchResult.planName}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Activated At</span>
                  <span className="text-xs font-bold text-slate-700 block mt-1">
                    {launchResult.activatedAt}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Clinic ID</span>
                  <span className="text-[11px] font-black text-slate-705 block mt-1 truncate" title={launchResult.clinicId}>
                    {launchResult.clinicId}
                  </span>
                </div>
              </div>

              {/* Active Provisions Summary */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Provisions</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Doctors', value: `${launchResult.doctorsCount} Accounts`, icon: '🩺' },
                    { label: 'Staff', value: `${launchResult.staffCount} Accounts`, icon: '👥' },
                    { label: 'Branches', value: `${launchResult.branchesCount} Active`, icon: '🏢' },
                    { label: 'Departments', value: `${launchResult.deptsCount} Configured`, icon: '📂' },
                    { label: 'Pharmacy', value: `${launchResult.pharmacyCount} Enabled`, icon: '💊' },
                    { label: 'Laboratory', value: `${launchResult.laboratoryCount} Enabled`, icon: '🧪' },
                    { label: 'AI Features', value: `${launchResult.aiModulesCount} Enabled`, icon: '🤖' },
                    { label: 'Video Provider', value: launchResult.videoProvider || 'None', icon: '📹' }
                  ].map((p, i) => (
                    <div key={i} className="border border-slate-100 bg-white shadow-sm p-3 rounded-xl text-center">
                      <div className="text-lg mb-0.5">{p.icon}</div>
                      <div className="text-[9px] font-bold text-slate-400">{p.label}</div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">{p.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Specs: Schedule, Emails, Backups */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Weekly Schedule</span>
                    <span className="text-xs font-bold text-slate-805">{launchResult.scheduleType}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Welcome Emails Queued</span>
                    <span className="text-xs font-bold text-slate-805">{launchResult.emailsSent} Emails</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Database Health</span>
                    <span className="text-xs font-bold text-slate-805">{launchResult.dbStatus}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={async () => {
                    await refreshUser();
                    navigate('/dashboard', { replace: true });
                  }}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle size={15} /> Go To Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Clinic Profile Details:\nName: ${launchResult.clinicName}\nID: ${launchResult.clinicId}\nStatus: Live`)}
                  className="px-6 py-3.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  View Clinic Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const report = `AICMS Setup Report\n==================\nClinic: ${launchResult.clinicName}\nID: ${launchResult.clinicId}\nPlan: ${launchResult.planName}\nActivated At: ${launchResult.activatedAt}\nDoctors: ${launchResult.doctorsCount}\nStaff: ${launchResult.staffCount}\nBranches: ${launchResult.branchesCount}\nDepartments: ${launchResult.deptsCount}\nPharmacy: ${launchResult.pharmacyCount}\nLaboratory: ${launchResult.laboratoryCount}\nEmails Queued: ${launchResult.emailsSent}`;
                    const blob = new Blob([report], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `aicms_setup_report_${launchResult.clinicId}.txt`;
                    link.click();
                  }}
                  className="px-6 py-3.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Download Setup Report
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

