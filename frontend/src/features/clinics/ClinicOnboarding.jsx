import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { clinicApi, doctorApi, userApi, specializationApi, providersApi } from '../../lib/api';
import { ProviderWizardModal } from '../providers/ProviderWizardModal';
import { 
  Building2, User, Users, Calendar, DollarSign, 
  Settings, CheckCircle, ArrowRight, ArrowLeft, Plus, Trash2, Heart, ShieldCheck, Mail, Phone, Lock, Sparkles, Network, Code, Globe, Play, Clock, Check, LogOut
} from 'lucide-react';

const ClinicOnboarding = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const normalizeDoctorName = (name) => {
    if (!name) return '';
    return name.replace(/^(dr\.|dr|Dr\.|Dr|dR\.|dR|DR\.|DR)\s*/i, '');
  };
  // Real-time validation states
  const [doctorValidation, setDoctorValidation] = useState({});
  const [staffValidation, setStaffValidation] = useState({});
  const doctorTimeouts = useRef({});
  const doctorAbortControllers = useRef({});
  const staffTimeouts = useRef({});
  const staffAbortControllers = useRef({});

  const handleValidateDoctor = (idx, field, value) => {
    const timeoutKey = `${idx}_${field}`;
    if (doctorTimeouts.current[timeoutKey]) {
      clearTimeout(doctorTimeouts.current[timeoutKey]);
    }
    if (doctorAbortControllers.current[timeoutKey]) {
      doctorAbortControllers.current[timeoutKey].abort();
    }

    if (!value || !value.trim()) {
      setDoctorValidation(prev => ({
        ...prev,
        [timeoutKey]: null
      }));
      return;
    }

    setDoctorValidation(prev => ({
      ...prev,
      [timeoutKey]: { status: 'checking', message: '' }
    }));

    doctorTimeouts.current[timeoutKey] = setTimeout(async () => {
      const controller = new AbortController();
      doctorAbortControllers.current[timeoutKey] = controller;
      try {
        let isUnique = true;
        if (field === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setDoctorValidation(prev => ({
              ...prev,
              [timeoutKey]: { status: 'invalid', message: 'Invalid email address format' }
            }));
            return;
          }
          const res = await clinicApi.validateEmail({ email: value });
          isUnique = res.data?.isUnique;
        } else if (field === 'phone') {
          if (value.replace(/\D/g, '').length !== 10) {
            setDoctorValidation(prev => ({
              ...prev,
              [timeoutKey]: { status: 'invalid', message: 'Phone number must be exactly 10 digits' }
            }));
            return;
          }
          const res = await clinicApi.validatePhone({ phone: value });
          isUnique = res.data?.isUnique;
        }

        if (isUnique) {
          setDoctorValidation(prev => ({
            ...prev,
            [timeoutKey]: { status: 'valid', message: 'Available' }
          }));
        } else {
          setDoctorValidation(prev => ({
            ...prev,
            [timeoutKey]: { status: 'invalid', message: `${field === 'email' ? 'Email' : 'Phone number'} already exists` }
          }));
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setDoctorValidation(prev => ({
          ...prev,
          [timeoutKey]: { status: 'invalid', message: 'Validation failed' }
        }));
      }
    }, 500);
  };

  const triggerDoctorValidationImmediate = async (idx, field, value) => {
    const timeoutKey = `${idx}_${field}`;
    if (doctorTimeouts.current[timeoutKey]) {
      clearTimeout(doctorTimeouts.current[timeoutKey]);
    }
    if (doctorAbortControllers.current[timeoutKey]) {
      doctorAbortControllers.current[timeoutKey].abort();
    }

    if (!value || !value.trim()) return;

    setDoctorValidation(prev => ({
      ...prev,
      [timeoutKey]: { status: 'checking', message: '' }
    }));

    try {
      let isUnique = true;
      if (field === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setDoctorValidation(prev => ({
            ...prev,
            [timeoutKey]: { status: 'invalid', message: 'Invalid email address format' }
          }));
          return;
        }
        const res = await clinicApi.validateEmail({ email: value });
        isUnique = res.data?.isUnique;
      } else if (field === 'phone') {
        if (value.replace(/\D/g, '').length !== 10) {
          setDoctorValidation(prev => ({
            ...prev,
            [timeoutKey]: { status: 'invalid', message: 'Phone number must be exactly 10 digits' }
          }));
          return;
        }
        const res = await clinicApi.validatePhone({ phone: value });
        isUnique = res.data?.isUnique;
      }

      if (isUnique) {
        setDoctorValidation(prev => ({
          ...prev,
          [timeoutKey]: { status: 'valid', message: 'Available' }
        }));
      } else {
        setDoctorValidation(prev => ({
          ...prev,
          [timeoutKey]: { status: 'invalid', message: `${field === 'email' ? 'Email' : 'Phone number'} already exists` }
        }));
      }
    } catch (err) {
      setDoctorValidation(prev => ({
        ...prev,
        [timeoutKey]: { status: 'invalid', message: 'Validation failed' }
      }));
    }
  };

  const handleValidateStaff = (idx, field, value) => {
    const timeoutKey = `${idx}_${field}`;
    if (staffTimeouts.current[timeoutKey]) {
      clearTimeout(staffTimeouts.current[timeoutKey]);
    }
    if (staffAbortControllers.current[timeoutKey]) {
      staffAbortControllers.current[timeoutKey].abort();
    }

    if (!value || !value.trim()) {
      setStaffValidation(prev => ({
        ...prev,
        [timeoutKey]: null
      }));
      return;
    }

    setStaffValidation(prev => ({
      ...prev,
      [timeoutKey]: { status: 'checking', message: '' }
    }));

    staffTimeouts.current[timeoutKey] = setTimeout(async () => {
      const controller = new AbortController();
      staffAbortControllers.current[timeoutKey] = controller;
      try {
        let isUnique = true;
        if (field === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setStaffValidation(prev => ({
              ...prev,
              [timeoutKey]: { status: 'invalid', message: 'Invalid email address format' }
            }));
            return;
          }
          const res = await clinicApi.validateEmail({ email: value });
          isUnique = res.data?.isUnique;
        } else if (field === 'phone') {
          if (value.replace(/\D/g, '').length !== 10) {
            setStaffValidation(prev => ({
              ...prev,
              [timeoutKey]: { status: 'invalid', message: 'Phone number must be exactly 10 digits' }
            }));
            return;
          }
          const res = await clinicApi.validatePhone({ phone: value });
          isUnique = res.data?.isUnique;
        }

        if (isUnique) {
          setStaffValidation(prev => ({
            ...prev,
            [timeoutKey]: { status: 'valid', message: 'Available' }
          }));
        } else {
          setStaffValidation(prev => ({
            ...prev,
            [timeoutKey]: { status: 'invalid', message: `${field === 'email' ? 'Email' : 'Phone number'} already exists` }
          }));
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setStaffValidation(prev => ({
          ...prev,
          [timeoutKey]: { status: 'invalid', message: 'Validation failed' }
        }));
      }
    }, 500);
  };

  const triggerStaffValidationImmediate = async (idx, field, value) => {
    const timeoutKey = `${idx}_${field}`;
    if (staffTimeouts.current[timeoutKey]) {
      clearTimeout(staffTimeouts.current[timeoutKey]);
    }
    if (staffAbortControllers.current[timeoutKey]) {
      staffAbortControllers.current[timeoutKey].abort();
    }

    if (!value || !value.trim()) return;

    setStaffValidation(prev => ({
      ...prev,
      [timeoutKey]: { status: 'checking', message: '' }
    }));

    try {
      let isUnique = true;
      if (field === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setStaffValidation(prev => ({
            ...prev,
            [timeoutKey]: { status: 'invalid', message: 'Invalid email address format' }
          }));
          return;
        }
        const res = await clinicApi.validateEmail({ email: value });
        isUnique = res.data?.isUnique;
      } else if (field === 'phone') {
        if (value.replace(/\D/g, '').length !== 10) {
          setStaffValidation(prev => ({
            ...prev,
            [timeoutKey]: { status: 'invalid', message: 'Phone number must be exactly 10 digits' }
          }));
          return;
        }
        const res = await clinicApi.validatePhone({ phone: value });
        isUnique = res.data?.isUnique;
      }

      if (isUnique) {
        setStaffValidation(prev => ({
          ...prev,
          [timeoutKey]: { status: 'valid', message: 'Available' }
        }));
      } else {
        setStaffValidation(prev => ({
          ...prev,
          [timeoutKey]: { status: 'invalid', message: `${field === 'email' ? 'Email' : 'Phone number'} already exists` }
        }));
      }
    } catch (err) {
      setStaffValidation(prev => ({
        ...prev,
        [timeoutKey]: { status: 'invalid', message: 'Validation failed' }
      }));
    }
  };

  // Metadata States
  const [flowData, setFlowData] = useState(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Timings/Fees Configuration States
  const [workingTimings, setWorkingTimings] = useState({
    dayRange: 'Monday - Friday',
    startTime: '09:00',
    endTime: '20:00',
    lunchStart: '13:00',
    lunchEnd: '14:00'
  });

  // Doctor Form inputs
  const [doctors, setDoctors] = useState([
    { fullName: '', email: '', phone: '' }
  ]);

  // Staff Form inputs
  const [staffList, setStaffList] = useState([
    { name: '', email: '', phone: '', role: 'RECEPTIONIST' }
  ]);

  const [setupProgress, setSetupProgress] = useState({
    percent: 0,
    currentTask: 'Preparing onboarding completion...',
    checklist: [],
    emailsSent: [],
    status: 'IN_PROGRESS',
    error: null
  });

  // Departments List
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');

  // Branches List
  const [branches, setBranches] = useState([
    { name: '', code: '', phone: '', address: { street: '', city: '', state: '', country: 'India' } }
  ]);

  const [createdProviders, setCreatedProviders] = useState([]);
  const [providerWizardOpen, setProviderWizardOpen] = useState(false);
  const [providerWizardStep, setProviderWizardStep] = useState(1);
  const [providerSaving, setProviderSaving] = useState(false);
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

  const [skipPharmacy, setSkipPharmacy] = useState(false);
  const [skipLab, setSkipLab] = useState(false);
  const [skipTimings, setSkipTimings] = useState(false);
  const [skipDoctors, setSkipDoctors] = useState(false);
  const [skipStaff, setSkipStaff] = useState(false);
  const [skipBranches, setSkipBranches] = useState(false);
  const [pharmacyCollapsed, setPharmacyCollapsed] = useState(false);
  const [labCollapsed, setLabCollapsed] = useState(false);
  const [availableSpecializations, setAvailableSpecializations] = useState([]);

  // AI & Video Options
  const [enabledAiFeatures, setEnabledAiFeatures] = useState({
    symptom_checker: true,
    consultation_assistant: true,
    voice_to_text: true,
    ai_prescription_suggestions: true,
    ai_risk_scoring: true,
    lab_recommendations: true,
    ai_scheduling: true
  });
  const [videoConfig, setVideoConfig] = useState({
    provider: 'Zoom',
    defaultFee: 500,
    duration: 15
  });

  const loadFlow = async () => {
    try {
      if (!user?.clinicId) {
        navigate('/login');
        return;
      }
      const data = await clinicApi.getOnboardingFlow(user.clinicId);
      setFlowData(data.data);
      if (data.data.isOnboardingCompleted) {
        navigate('/dashboard', { replace: true });
      }

      // Fetch draft and pending providers
      try {
        const draftsRes = await providersApi.getProviders({ status: 'Draft' });
        const pendingRes = await providersApi.getProviders({ status: 'Pending Activation' });
        const drafts = draftsRes.data?.providers || draftsRes.data || draftsRes || [];
        const pending = pendingRes.data?.providers || pendingRes.data || pendingRes || [];
        setCreatedProviders([...drafts, ...pending]);
      } catch (pErr) {
        console.error('Failed to load draft providers:', pErr);
      }
    } catch (err) {
      setError('Failed to fetch onboarding plan details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlow();
    specializationApi.list().then(res => {
      setAvailableSpecializations(res.specializations || res.data?.specializations || []);
    }).catch(() => {});
  }, [user, navigate]);

  const handleActivateTrial = async (featureCode) => {
    setSaving(true);
    try {
      const data = await clinicApi.activateTrialFeature(user.clinicId, { featureCode });
      setFlowData(data.data);
      alert(`${featureCode.replace('_', ' ').toUpperCase()} Trial activated successfully! New steps loaded.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate trial feature.');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const steps = flowData?.steps || [];
    const activeStep = steps[currentStepIdx];

    // If we are on doctors step, validate all doctors
    if (activeStep?.id === 'doctors' && !skipDoctors) {
      let hasError = false;
      for (let idx = 0; idx < doctors.length; idx++) {
        const doc = doctors[idx];
        if (!doc.fullName?.trim() || !doc.email?.trim() || !doc.phone?.trim()) {
          alert(`Please fill all fields for Doctor #${idx + 1}`);
          return;
        }
        
        // Trigger immediate validation checks
        const emailKey = `${idx}_email`;
        const phoneKey = `${idx}_phone`;
        await triggerDoctorValidationImmediate(idx, 'email', doc.email);
        await triggerDoctorValidationImmediate(idx, 'phone', doc.phone);
      }

      // Read updated validation values from local state checks
      // Since setState is async, we can do a local check using validation functions directly
      for (let idx = 0; idx < doctors.length; idx++) {
        const doc = doctors[idx];
        try {
          const emailRes = await clinicApi.validateEmail({ email: doc.email });
          const phoneRes = await clinicApi.validatePhone({ phone: doc.phone });
          if (!emailRes.data?.isUnique || !phoneRes.data?.isUnique) {
            hasError = true;
          }
        } catch (err) {
          hasError = true;
        }
      }

      if (hasError) {
        alert('Please fix the duplicate or invalid fields under Doctor Setup before proceeding.');
        return;
      }
    }

    // If we are on staff step, validate all staff
    if (activeStep?.id === 'staff' && !skipStaff) {
      let hasError = false;
      for (let idx = 0; idx < staffList.length; idx++) {
        const st = staffList[idx];
        if (!st.name?.trim() || !st.email?.trim() || !st.phone?.trim()) {
          alert(`Please fill all fields for Staff #${idx + 1}`);
          return;
        }
        
        // Trigger immediate validation checks
        const emailKey = `${idx}_email`;
        const phoneKey = `${idx}_phone`;
        await triggerStaffValidationImmediate(idx, 'email', st.email);
        await triggerStaffValidationImmediate(idx, 'phone', st.phone);
      }

      for (let idx = 0; idx < staffList.length; idx++) {
        const st = staffList[idx];
        try {
          const emailRes = await clinicApi.validateEmail({ email: st.email });
          const phoneRes = await clinicApi.validatePhone({ phone: st.phone });
          if (!emailRes.data?.isUnique || !phoneRes.data?.isUnique) {
            hasError = true;
          }
        } catch (err) {
          hasError = true;
        }
      }

      if (hasError) {
        alert('Please fix the duplicate or invalid fields under Staff Setup before proceeding.');
        return;
      }
    }

    let nextIdx = currentStepIdx + 1;
    while (nextIdx < steps.length) {
      const nextStep = steps[nextIdx];
      if (nextStep?.id === 'healthcare' && !flowData?.features?.pharmacy && !flowData?.features?.labs) {
        nextIdx++;
      } else {
        break;
      }
    }
    if (nextIdx < steps.length) {
      setCurrentStepIdx(nextIdx);
    }
  };

  const handleBack = () => {
    let prevIdx = currentStepIdx - 1;
    while (prevIdx >= 0) {
      const prevStep = steps[prevIdx];
      if (prevStep?.id === 'healthcare' && !flowData?.features?.pharmacy && !flowData?.features?.labs) {
        prevIdx--;
      } else {
        break;
      }
    }
    if (prevIdx >= 0) {
      setCurrentStepIdx(prevIdx);
    }
  };

  const handleOpenProviderWizard = (type) => {
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
      workingHours: { openingTime: '09:00', closingTime: '21:00' },
      gstNumber: '',
      drugLicenseNumber: '',
      licenseExpiry: '',
      reorderThreshold: 10,
      barcodeEnabled: false,
      printerEnabled: false,
      invoicePrefix: type === 'Laboratory' ? 'LAB' : 'PHR',
      apiProviderName: 'Pathology',
      assignedBranches: []
    });
    setProviderWizardStep(1);
    setProviderWizardOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!providerForm.name) {
      alert('Provider name is required');
      return;
    }
    setProviderSaving(true);
    try {
      const payload = {
        ...providerForm,
        creationMode: 'ONBOARDING',
        deferInvitation: true,
        providerCategory: providerForm.providerSubtype === 'Internal' ? 'Own Provider' : 'Partner Provider',
        integrationType: 'None',
        integrationStatus: 'Not Configured',
      };
      
      const res = await providersApi.createProvider(payload);
      const newProvider = res.data?.provider || res.data || res;
      setCreatedProviders(prev => [...prev, newProvider]);
      setProviderWizardOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save provider');
    } finally {
      setProviderSaving(false);
    }
  };

  const handleSubmitOnboarding = async () => {
    setSaving(true);
    setError('');
    setSetupProgress({
      percent: 0,
      currentTask: 'Connecting to onboarding stream...',
      checklist: [],
      emailsSent: [],
      status: 'IN_PROGRESS',
      error: null
    });

    let eventSource;
    try {
      const token = localStorage.getItem('token') || '';
      eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}/clinics/${user.clinicId}/onboarding-progress?token=${token}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setSetupProgress(data);
      };
      
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };

      const updatedDetails = {
        timings: skipTimings ? [] : [
          {
            dayRange: workingTimings.dayRange,
            startTime: workingTimings.startTime,
            endTime: workingTimings.endTime
          }
        ],
        departments,
        aiConfig: enabledAiFeatures,
        videoConfig
      };

      await clinicApi.launchOnboarding(user.clinicId, {
        doctors,
        staffList,
        branches,
        clinicDetails: updatedDetails,
        skipDoctors,
        skipStaff,
        skipBranches
      });

      if (eventSource) eventSource.close();

      setSetupProgress(prev => ({
        ...prev,
        percent: 100,
        status: 'SUCCESS',
        currentTask: 'Redirecting to dashboard...'
      }));

      // Start a countdown
      let count = 3;
      const interval = setInterval(async () => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          await refreshUser();
          navigate('/dashboard', { replace: true });
          setSaving(false);
        }
      }, 1000);

    } catch (err) {
      if (eventSource) eventSource.close();
      console.error('Onboarding submission failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Error completing setup. Please try again.';
      setError(errMsg);
      setSetupProgress(prev => ({ ...prev, status: 'FAILED', error: errMsg }));
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-blue-150 text-blue-600 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
            <Heart className="w-7 h-7 animate-pulse text-blue-600" fill="currentColor" />
          </div>
          <p className="text-sm font-black text-slate-700">Loading plan configurations...</p>
        </div>
      </div>
    );
  }

  const steps = flowData?.steps || [];
  const activeStep = steps[currentStepIdx];
  const progressPercent = Math.round((currentStepIdx / (steps.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {saving && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col items-center py-12 px-4 md:px-8">
          <div className="max-w-2xl w-full flex flex-col items-center space-y-8">
            {/* Branding */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Heart size={20} fill="currentColor" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">AI-CMS</span>
            </div>

            {setupProgress.status === 'FAILED' ? (
              <div className="w-full bg-red-50 border border-red-200 rounded-3xl p-8 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-sm">
                  ✕
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">Setup could not be completed</h2>
                <p className="text-sm text-slate-600 max-w-md leading-relaxed">{setupProgress.error || 'An unexpected error occurred during clinic setup.'}</p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleSubmitOnboarding}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    Retry Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaving(false)}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : setupProgress.status === 'SUCCESS' ? (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-3xl p-8 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                  ✓
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Congratulations!</h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">Your clinic has been successfully configured.</p>
                </div>
                <div className="p-4 bg-white/60 border border-emerald-100 rounded-2xl max-w-sm w-full">
                  <p className="text-xs text-slate-455 font-bold">Welcome to AI-CMS</p>
                  <p className="text-sm font-extrabold text-emerald-800 mt-1">Redirecting to Dashboard...</p>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center space-y-8">
                {/* Heading */}
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-extrabold text-slate-800">Setting up your clinic...</h2>
                  <p className="text-xs text-slate-450 font-bold">Please don't close this window or navigate away.</p>
                </div>

                {/* Animated progress ring/indicator */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                    style={{ animationDuration: '1.5s' }}
                  ></div>
                  <span className="text-2xl font-black text-slate-800">{setupProgress.percent}%</span>
                </div>

                {/* Live task display */}
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700 animate-pulse">{setupProgress.currentTask}</p>
                </div>

                {/* Checklist */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs text-slate-455 font-bold tracking-wider uppercase">Setup Checklist</h3>
                  <div className="space-y-3">
                    {[
                      'Onboarding Data Validated',
                      'Doctors Configured',
                      'Staff Configured',
                      'Branches Configured',
                      'Clinic Configuration Saved',
                      'Providers Activated',
                      'Dashboard Prepared'
                    ].map((item, idx) => {
                      const isCompleted = setupProgress.checklist.includes(item);
                      const isCurrent = !isCompleted && (
                        (idx === 0 && setupProgress.percent < 15) ||
                        (idx === 1 && setupProgress.percent >= 15 && setupProgress.percent < 35) ||
                        (idx === 2 && setupProgress.percent >= 35 && setupProgress.percent < 50) ||
                        (idx === 3 && setupProgress.percent >= 50 && setupProgress.percent < 65) ||
                        (idx === 4 && setupProgress.percent >= 65 && setupProgress.percent < 75) ||
                        (idx === 5 && setupProgress.percent >= 75 && setupProgress.percent < 85) ||
                        (idx === 6 && setupProgress.percent >= 85)
                      );
                      
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className={`font-bold ${isCompleted ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : 'text-slate-400'}`}>
                            {item}
                          </span>
                          <span>
                            {isCompleted ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : isCurrent ? (
                              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping block"></span>
                            ) : (
                              <span className="text-slate-300 font-bold">⏳</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Email queue delivery status */}
                {setupProgress.emailsSent?.length > 0 && (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                    <h3 className="text-xs text-slate-455 font-bold tracking-wider uppercase">📧 Live Email Delivery Queue</h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {setupProgress.emailsSent.map((email, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl text-[11px] shadow-sm">
                          <div>
                            <p className="font-bold text-slate-800">{email.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{email.email} ({email.role})</p>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                            <span>✓</span>
                            <span>{email.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Heart size={18} fill="currentColor" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">AI-CMS Setup</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-600">
            {flowData?.planName}
          </span>
          {flowData?.subscriptionValidity && (
            <span className="text-xs text-slate-400 font-medium">
              Valid Till: {new Date(flowData.subscriptionValidity).toLocaleDateString()}
            </span>
          )}
          <button 
            type="button" 
            onClick={logout}
            className="px-4 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition ml-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Main setup interface */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Step Tracker sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-2">Setup Steps</h3>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="space-y-5 relative pl-2">
              <div className="absolute top-1 bottom-1 left-[19px] w-[2px] bg-slate-100" />
              {steps.map((step, idx) => {
                const isActive = currentStepIdx === idx;
                const isCompleted = currentStepIdx > idx;
                return (
                  <div key={step.id} className="flex gap-4 items-start relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border-2 transition ${
                      isCompleted 
                        ? "bg-emerald-50 border-emerald-500 text-emerald-500" 
                        : isActive 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div>
                      <h4 className={`font-bold text-xs leading-tight ${isActive ? "text-blue-600" : isCompleted ? "text-slate-700" : "text-slate-400"}`}>
                        {step.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trial features section */}
          {flowData?.availableTrials?.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Premium Trials Available</span>
              </div>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Activate these premium features for free during your trial setup.
              </p>
              <div className="space-y-3">
                {flowData.availableTrials.map(trial => (
                  <div key={trial.code} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-indigo-50">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{trial.name}</h5>
                      <span className="text-[10px] text-indigo-600 font-medium">Free for {trial.trialDays} days</span>
                    </div>
                    <button type="button" onClick={() => handleActivateTrial(trial.code)} disabled={saving}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition">
                      Try Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Trial Countdown indicators */}
          {flowData?.activeTrials?.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 space-y-3">
              <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" /> Active Trial Features
              </h4>
              <div className="space-y-2">
                {flowData.activeTrials.map(trial => (
                  <div key={trial.featureCode} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">{trial.featureCode.replace('_', ' ')}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                      {trial.daysRemaining} days left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic setup contents panel */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-xs font-bold">
              {error}
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 min-h-[520px] flex flex-col justify-between">
            <div>
              {/* Step 0: Welcome Screen */}
              {activeStep?.id === 'welcome' && (
                <div className="space-y-6 text-center py-12 max-w-lg mx-auto">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-md">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Welcome to AI-CMS</h2>
                    <p className="text-sm font-medium text-slate-400 mt-2">Congratulations! Your clinic has been successfully approved.</p>
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-150 rounded-3xl text-left space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Clinic Name</span>
                      <span className="font-bold text-slate-800">{flowData?.clinicName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Plan Subscribed</span>
                      <span className="font-bold text-blue-600">{flowData?.planName}</span>
                    </div>
                    {flowData?.activeTrials?.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Premium Trial Features Included</span>
                        <div className="flex flex-wrap gap-1.5">
                          {flowData.activeTrials.map(t => (
                            <span key={t.featureCode} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[9px] font-bold">
                              {t.featureCode.replace('_', ' ').toUpperCase()} ({t.daysRemaining}d)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={handleNext}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-100">
                    Start Setup <ArrowRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}

              {/* Doctors setup step */}
              {activeStep?.id === 'doctors' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Doctor Setup</h3>
                      <p className="text-xs text-slate-400 mt-1">Add medical practitioners up to your plan limit ({flowData?.limits?.maxDoctors} maximum).</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setSkipDoctors(!skipDoctors)} className="text-xs font-bold text-blue-600 hover:underline">
                        {skipDoctors ? 'Undo Skip' : 'Skip Setup'}
                      </button>
                      {!skipDoctors && doctors.length < flowData?.limits?.maxDoctors && (
                        <button onClick={() => setDoctors([...doctors, { fullName: '', email: '', phone: '' }])}
                          className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1 ">
                          <Plus className="w-4 h-4" /> Add Doctor
                        </button>
                      )}
                    </div>
                  </div>

                  {skipDoctors ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                      <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide">Doctor Setup Skipped</span>
                      <span className="block text-[11px] text-slate-450 mt-1">You can add your clinic's doctors later from the Dashboard.</span>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
                      {doctors.map((doc, idx) => (
                        <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-4">
                          {doctors.length > 1 && (
                            <button onClick={() => setDoctors(doctors.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Doctor #{idx + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Doctor Name *</label>
                              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:border-blue-600 transition">
                                <div className="px-3 py-2 bg-slate-100 border-r border-slate-200 text-xs font-bold text-slate-500 flex items-center select-none"
                                  aria-label="Doctor title, fixed prefix" role="img">
                                  Dr.
                                </div>
                                <input type="text" value={normalizeDoctorName(doc.fullName)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const normalized = normalizeDoctorName(val);
                                    const u = [...doctors];
                                    u[idx].fullName = normalized ? `Dr. ${normalized}` : '';
                                    setDoctors(u);
                                  }}
                                  placeholder="e.g. Rahul Sharma"
                                  className="flex-1 px-3 py-2 bg-white outline-none text-xs text-gray-800" required />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
                              <input type="email" value={doc.email}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const u = [...doctors];
                                  u[idx].email = val;
                                  setDoctors(u);
                                  handleValidateDoctor(idx, 'email', val);
                                }}
                                onBlur={(e) => triggerDoctorValidationImmediate(idx, 'email', e.target.value)}
                                placeholder="doctor@domain.com" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800" required />
                              {doctorValidation[`${idx}_email`]?.status === 'checking' && <p className="text-[10px] text-blue-500 mt-1">Checking email...</p>}
                              {doctorValidation[`${idx}_email`]?.status === 'valid' && <p className="text-[10px] text-emerald-600 mt-1">✓ Available</p>}
                              {doctorValidation[`${idx}_email`]?.status === 'invalid' && <p className="text-[10px] text-rose-600 mt-1">{doctorValidation[`${idx}_email`]?.message}</p>}
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                              <input type="tel" value={doc.phone}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  const u = [...doctors];
                                  u[idx].phone = val;
                                  setDoctors(u);
                                  handleValidateDoctor(idx, 'phone', val);
                                }}
                                onBlur={(e) => triggerDoctorValidationImmediate(idx, 'phone', e.target.value)}
                                placeholder="e.g. 9876543210" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-xs text-gray-800" required />
                              {doctorValidation[`${idx}_phone`]?.status === 'checking' && <p className="text-[10px] text-blue-500 mt-1">Checking phone...</p>}
                              {doctorValidation[`${idx}_phone`]?.status === 'valid' && <p className="text-[10px] text-emerald-600 mt-1">✓ Available</p>}
                              {doctorValidation[`${idx}_phone`]?.status === 'invalid' && <p className="text-[10px] text-rose-600 mt-1">{doctorValidation[`${idx}_phone`]?.message}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Department Setup */}
              {activeStep?.id === 'departments' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Clinic Departments</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure internal hospital sections (Limit: {flowData?.limits?.maxDepartments}).</p>
                  </div>

                  <div className="flex gap-3">
                    <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g. Cardiology" className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs" />
                    <button type="button" onClick={() => { if (newDeptName.trim() && departments.length < flowData?.limits?.maxDepartments) { setDepartments([...departments, newDeptName.trim()]); setNewDeptName(''); } }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {departments.map(dept => (
                      <span key={dept} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                        {dept}
                        <button type="button" onClick={() => setDepartments(departments.filter(d => d !== dept))} className="text-slate-400 hover:text-red-500 font-bold ml-1">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Branch Setup */}
              {activeStep?.id === 'branches' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Branch Offices Setup</h3>
                      <p className="text-xs text-slate-400 mt-1">Setup sub-branches supported by your plan (Limit: {flowData?.limits?.maxBranches}).</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setSkipBranches(!skipBranches)} className="text-xs font-bold text-blue-600 hover:underline">
                        {skipBranches ? 'Undo Skip' : 'Skip Setup'}
                      </button>
                      {!skipBranches && branches.length < flowData?.limits?.maxBranches && (
                        <button onClick={() => setBranches([...branches, { name: '', code: '', phone: '', address: { street: '', city: '', state: '', country: 'India' } }])}
                          className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1">
                          <Plus className="w-4 h-4" /> Add Branch
                        </button>
                      )}
                    </div>
                  </div>

                  {skipBranches ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                      <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide">Branch Setup Skipped</span>
                      <span className="block text-[11px] text-slate-450 mt-1">You can configure additional clinic branches later from the Dashboard.</span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                      {branches.map((b, idx) => (
                        <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-4">
                          {branches.length > 1 && (
                            <button onClick={() => setBranches(branches.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <h4 className="text-xs font-bold text-slate-650">Branch #{idx + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Branch Name *</label>
                              <input type="text" value={b.name} onChange={(e) => { const u = [...branches]; u[idx].name = e.target.value; setBranches(u); }}
                                placeholder="Name" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs" required />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Unique Branch Code *</label>
                              <input type="text" value={b.code} onChange={(e) => { const u = [...branches]; u[idx].code = e.target.value.toUpperCase(); setBranches(u); }}
                                placeholder="e.g. BR02" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs" required />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Staff Setup */}
              {activeStep?.id === 'staff' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Staff Accounts</h3>
                      <p className="text-xs text-slate-400 mt-1">Configure clinical desk staff, billing receptionists, etc (Limit: {flowData?.limits?.maxStaff}).</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setSkipStaff(!skipStaff)} className="text-xs font-bold text-blue-600 hover:underline">
                        {skipStaff ? 'Undo Skip' : 'Skip Setup'}
                      </button>
                      {!skipStaff && staffList.length < flowData?.limits?.maxStaff && (
                        <button onClick={() => setStaffList([...staffList, { name: '', email: '', phone: '', role: 'RECEPTIONIST' }])}
                          className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1 text-gray-800">
                          <Plus className="w-4 h-4" /> Add Staff
                        </button>
                      )}
                    </div>
                  </div>

                  {skipStaff ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                      <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide">Staff Setup Skipped</span>
                      <span className="block text-[11px] text-slate-450 mt-1">You can add your clinic's staff accounts later from the Dashboard.</span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                      {staffList.map((st, idx) => (
                        <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative grid grid-cols-1 md:grid-cols-2 gap-4">
                          {staffList.length > 1 && (
                            <button onClick={() => setStaffList(staffList.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                            <input type="text" value={st.name} onChange={(e) => { const u = [...staffList]; u[idx].name = e.target.value; setStaffList(u); }}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-gray-800" required />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Staff Role *</label>
                            <select value={st.role} onChange={(e) => { const u = [...staffList]; u[idx].role = e.target.value; setStaffList(u); }}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-gray-800">
                              <option value="RECEPTIONIST">Receptionist</option>
                              <option value="PHARMACIST">Pharmacist</option>
                              <option value="LAB_TECHNICIAN">Lab Technician</option>
                              <option value="NURSE">Nurse</option>
                              <option value="ACCOUNTANT">Accountant</option>
                              <option value="CLINIC_MANAGER">Clinic Manager</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
                            <input type="email" value={st.email}
                              onChange={(e) => {
                                const val = e.target.value;
                                const u = [...staffList];
                                u[idx].email = val;
                                setStaffList(u);
                                handleValidateStaff(idx, 'email', val);
                              }}
                              onBlur={(e) => triggerStaffValidationImmediate(idx, 'email', e.target.value)}
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-gray-800" required />
                            {staffValidation[`${idx}_email`]?.status === 'checking' && <p className="text-[10px] text-blue-500 mt-1">Checking email...</p>}
                            {staffValidation[`${idx}_email`]?.status === 'valid' && <p className="text-[10px] text-emerald-600 mt-1">✓ Available</p>}
                            {staffValidation[`${idx}_email`]?.status === 'invalid' && <p className="text-[10px] text-rose-600 mt-1">{staffValidation[`${idx}_email`]?.message}</p>}
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                            <input type="tel" value={st.phone}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                const u = [...staffList];
                                u[idx].phone = val;
                                setStaffList(u);
                                handleValidateStaff(idx, 'phone', val);
                              }}
                              onBlur={(e) => triggerStaffValidationImmediate(idx, 'phone', e.target.value)}
                              placeholder="Mobile number" className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-gray-800" required />
                            {staffValidation[`${idx}_phone`]?.status === 'checking' && <p className="text-[10px] text-blue-500 mt-1">Checking phone...</p>}
                            {staffValidation[`${idx}_phone`]?.status === 'valid' && <p className="text-[10px] text-emerald-600 mt-1">✓ Available</p>}
                            {staffValidation[`${idx}_phone`]?.status === 'invalid' && <p className="text-[10px] text-rose-600 mt-1">{staffValidation[`${idx}_phone`]?.message}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Healthcare Setup step (Pharmacy & Laboratory combined) */}
              {activeStep?.id === 'healthcare' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Healthcare Setup</h3>
                      <p className="text-xs text-slate-400 mt-1">Configure Pharmacy and/or Laboratory modules included in your plan.</p>
                    </div>
                    <button type="button" onClick={() => {
                      const bothSkipped = !skipPharmacy || !skipLab;
                      setSkipPharmacy(bothSkipped);
                      setSkipLab(bothSkipped);
                    }} className="text-xs font-bold text-blue-600 hover:underline">
                      {skipPharmacy && skipLab ? 'Undo Skip Entire Setup' : 'Skip Entire Setup'}
                    </button>
                  </div>

                  {/* Pharmacy section if active in plan */}
                  {flowData?.features?.pharmacy && (
                    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer select-none"
                        onClick={() => setPharmacyCollapsed(!pharmacyCollapsed)}>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800">Pharmacy Setup</span>
                          {skipPharmacy && <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">Skipped</span>}
                        </div>
                        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                          <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer font-bold">
                            <input type="checkbox" checked={skipPharmacy} onChange={(e) => setSkipPharmacy(e.target.checked)} />
                            <span>Skip Pharmacy</span>
                          </label>
                          <span className="text-slate-400 text-xs font-bold">{pharmacyCollapsed ? '▼' : '▲'}</span>
                        </div>
                      </div>

                      {!pharmacyCollapsed && !skipPharmacy && (
                        <div className="p-6 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-455 font-bold">Added Pharmacies</span>
                            <button
                              type="button"
                              onClick={() => handleOpenProviderWizard('Pharmacy')}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-750 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Pharmacy
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {createdProviders.filter(p => p.providerType === 'Pharmacy').map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                                <div>
                                  <p className="font-bold text-slate-800">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manager: {p.contactPerson} ({p.managerEmail || p.email})</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 font-bold text-[9px] rounded-full uppercase tracking-wider ${
                                    p.status === 'Draft'
                                      ? 'bg-slate-100 border border-slate-350 text-slate-650'
                                      : 'bg-amber-50 border border-amber-200 text-amber-700'
                                  }`}>
                                    {p.status === 'Draft' ? 'Draft' : 'Waiting for Clinic Launch'}
                                  </span>
                                  <span className="text-slate-455 text-[10px] font-bold">
                                    {p.status === 'Draft' ? 'Status: Draft' : 'Pending Activation'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {createdProviders.filter(p => p.providerType === 'Pharmacy').length === 0 && (
                              <p className="text-xs text-slate-400 text-center py-4">No pharmacies created yet. Click "+ Add Pharmacy" to configure.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Laboratory section if active in plan */}
                  {flowData?.features?.labs && (
                    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer select-none"
                        onClick={() => setLabCollapsed(!labCollapsed)}>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800">Laboratory Setup</span>
                          {skipLab && <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">Skipped</span>}
                        </div>
                        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                          <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer font-bold">
                            <input type="checkbox" checked={skipLab} onChange={(e) => setSkipLab(e.target.checked)} />
                            <span>Skip Laboratory</span>
                          </label>
                          <span className="text-slate-400 text-xs font-bold">{labCollapsed ? '▼' : '▲'}</span>
                        </div>
                      </div>

                      {!labCollapsed && !skipLab && (
                        <div className="p-6 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-455 font-bold">Added Laboratories</span>
                            <button
                              type="button"
                              onClick={() => handleOpenProviderWizard('Laboratory')}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-750 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Laboratory
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {createdProviders.filter(p => p.providerType === 'Laboratory').map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                                <div>
                                  <p className="font-bold text-slate-800">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manager: {p.contactPerson} ({p.managerEmail || p.email})</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 font-bold text-[9px] rounded-full uppercase tracking-wider ${
                                    p.status === 'Draft'
                                      ? 'bg-slate-100 border border-slate-350 text-slate-650'
                                      : 'bg-amber-50 border border-amber-200 text-amber-700'
                                  }`}>
                                    {p.status === 'Draft' ? 'Draft' : 'Waiting for Clinic Launch'}
                                  </span>
                                  <span className="text-slate-455 text-[10px] font-bold">
                                    {p.status === 'Draft' ? 'Status: Draft' : 'Pending Activation'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {createdProviders.filter(p => p.providerType === 'Laboratory').length === 0 && (
                              <p className="text-xs text-slate-400 text-center py-4">No laboratories created yet. Click "+ Add Laboratory" to configure.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* AI Config */}
              {activeStep?.id === 'ai' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">AI Modules Configurations</h3>
                    <p className="text-xs text-slate-400 mt-1">Enable smart clinical features matching your plan features.</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'voice_to_text', name: 'Voice Transcription', desc: 'Converts consultation audio to written notes' },
                      { key: 'consultation_assistant', name: 'AI Consultation Assistant', desc: 'Helps generating voice-to-prescription records' },
                      { key: 'symptom_checker', name: 'AI Symptom Checker', desc: 'Assists clinical check-ins with symptoms suggestions' },
                      { key: 'ai_prescription_suggestions', name: 'AI Prescription Suggestions', desc: 'Get smart drug and dosage recommendations' },
                      { key: 'ai_risk_scoring', name: 'AI Patient Risk Scoring', desc: 'Identify health risks and readmissions early' },
                      { key: 'lab_recommendations', name: 'AI Lab Recommendation', desc: 'Suggest relevant diagnostic tests based on symptoms' },
                      { key: 'ai_scheduling', name: 'Appointment Intelligence', desc: 'Optimize schedule slots using AI' }
                    ].filter(mod => flowData?.features?.activeList?.includes(mod.key)).map(mod => (
                      <label key={mod.key} className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-150 cursor-pointer transition">
                        <input type="checkbox" checked={!!enabledAiFeatures[mod.key]} onChange={(e) => setEnabledAiFeatures({ ...enabledAiFeatures, [mod.key]: e.target.checked })} />
                        <div>
                          <span className="block text-xs font-bold text-slate-800">{mod.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{mod.desc}</span>
                        </div>
                      </label>
                    ))}
                    {(!flowData?.features?.activeList || flowData?.features?.activeList.filter(k => ['voice_to_text', 'consultation_assistant', 'symptom_checker', 'ai_prescription_suggestions', 'ai_risk_scoring', 'lab_recommendations', 'ai_scheduling'].includes(k)).length === 0) && (
                      <p className="text-xs text-slate-400 font-medium">No AI modules are included in your plan features.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Online Consultation */}
              {activeStep?.id === 'online_consultation' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Video Consultations Setup</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure standard online consultation parameters.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Meeting Provider</label>
                      <select value={videoConfig.provider} onChange={(e) => setVideoConfig({ ...videoConfig, provider: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <option value="Zoom">Zoom Meetings</option>
                        <option value="GoogleMeet">Google Meet</option>
                        <option value="BuiltIn">AICMS Telehealth</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Default Consultation Fee</label>
                      <input type="number" value={videoConfig.defaultFee} onChange={(e) => setVideoConfig({ ...videoConfig, defaultFee: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration (Mins)</label>
                      <input type="number" value={videoConfig.duration} onChange={(e) => setVideoConfig({ ...videoConfig, duration: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                    </div>
                  </div>
                </div>
              )}

              {/* Working days schedule */}
              {activeStep?.id === 'working_days' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Working timings</h3>
                      <p className="text-xs text-slate-400 mt-1">Configure hospital standard operating timings.</p>
                    </div>
                    <button type="button" onClick={() => setSkipTimings(!skipTimings)} className="text-xs font-bold text-blue-600 hover:underline">
                      {skipTimings ? 'Undo Skip' : 'Skip For Now'}
                    </button>
                  </div>

                  {skipTimings ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                      <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide">Schedule Skipped</span>
                      <span className="block text-[11px] text-slate-450 mt-1">You can configure your clinic's operating schedule later in Settings {"->"} Clinic Schedule.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Working Days</label>
                        <select value={workingTimings.dayRange} onChange={(e) => setWorkingTimings({ ...workingTimings, dayRange: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800">
                          <option value="Monday - Friday">Monday - Friday</option>
                          <option value="Monday - Saturday">Monday - Saturday</option>
                          <option value="Everyday">Everyday</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Time</label>
                          <input type="time" value={workingTimings.startTime} onChange={(e) => setWorkingTimings({ ...workingTimings, startTime: e.target.value })}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">End Time</label>
                          <input type="time" value={workingTimings.endTime} onChange={(e) => setWorkingTimings({ ...workingTimings, endTime: e.target.value })}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Review & Launch */}
              {activeStep?.id === 'review' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">Review & Launch</h3>
                    <p className="text-xs text-slate-400 mt-1">Verify all configurations. Your setup will go live instantly.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Practitioners */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <span className="text-slate-450 block font-medium">Practitioners Configured</span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {skipDoctors ? 'Skipped, Configure Later' : `${doctors.filter(d => d.fullName?.trim() && d.email?.trim()).length} Doctors added`}
                      </span>
                    </div>

                    {/* Departments */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <span className="text-slate-450 block font-medium">Departments Configured</span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {departments.join(', ') || 'None'}
                      </span>
                    </div>

                    {/* Support Staff */}
                    {flowData?.limits?.maxStaff > 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Support Staff Configured</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {skipStaff ? 'Skipped, Configure Later' : `${staffList.filter(s => s.name?.trim() && s.email?.trim()).length} Staff accounts added`}
                        </span>
                      </div>
                    )}

                    {/* Branches */}
                    {flowData?.limits?.maxBranches > 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Branches Configured</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {skipBranches ? 'Skipped, Configure Later' : `${branches.filter(b => b.name?.trim() && b.code?.trim()).length} Sub-branches created`}
                        </span>
                      </div>
                    )}

                    {/* Operating hours */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <span className="text-slate-450 block font-medium">Standard Hours</span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {skipTimings ? 'Skipped, Configure Later' : `${workingTimings.dayRange} (${workingTimings.startTime} - {workingTimings.endTime})`}
                      </span>
                    </div>

                    {/* Pharmacy Setup */}
                    {flowData?.features?.pharmacy && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Pharmacy Integration</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {skipPharmacy || createdProviders.filter(p => p.providerType === 'Pharmacy').length === 0 
                            ? 'Skipped, Configure Later' 
                            : `${createdProviders.filter(p => p.providerType === 'Pharmacy').length} Pharmacy Providers added`}
                        </span>
                      </div>
                    )}

                    {/* Laboratory Setup */}
                    {flowData?.features?.labs && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Laboratory Integration</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {skipLab || createdProviders.filter(p => p.providerType === 'Laboratory').length === 0 
                            ? 'Skipped, Configure Later' 
                            : `${createdProviders.filter(p => p.providerType === 'Laboratory').length} Laboratory Providers added`}
                        </span>
                      </div>
                    )}

                    {/* AI Configuration */}
                    {flowData?.features?.ai_analytics && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">AI Clinical Modules</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {Object.entries(enabledAiFeatures)
                            .filter(([key, enabled]) => enabled && flowData?.features?.activeList?.includes(key))
                            .map(([key]) => key.replace('_', ' '))
                            .join(', ') || 'None enabled'}
                        </span>
                      </div>
                    )}

                    {/* Video Consultation */}
                    {flowData?.features?.telemedicine && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-slate-450 block font-medium">Video Consultation</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {videoConfig.provider} (Fee: ₹{videoConfig.defaultFee}, Duration: {videoConfig.duration} mins)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Step actions buttons */}
            {activeStep?.id !== 'welcome' && (
              <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-8">
                <button type="button" onClick={handleBack}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-800 font-bold text-xs transition flex items-center gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                {currentStepIdx < steps.length - 1 ? (
                  <button type="button" onClick={handleNext}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-50">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmitOnboarding} disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-50 disabled:opacity-50">
                    {saving ? 'Activating Portal...' : 'Finish & Go to Dashboard'} <Sparkles className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      {providerWizardOpen && (
        <ProviderWizardModal
          step={providerWizardStep}
          totalSteps={4}
          form={providerForm}
          setForm={setProviderForm}
          branches={[
            { _id: 'headquarters', name: 'Main Clinic / Headquarters' },
            ...branches.filter(b => b.name?.trim()).map((b, idx) => ({ _id: `branch_${idx}`, name: b.name }))
          ]}
          saving={providerSaving}
          onClose={() => setProviderWizardOpen(false)}
          onNext={() => setProviderWizardStep(prev => Math.min(prev + 1, 4))}
          onPrev={() => setProviderWizardStep(prev => Math.max(prev - 1, 1))}
          onSave={handleSaveProvider}
        />
      )}
      </div>
    </div>
  );
};

export default ClinicOnboarding;
